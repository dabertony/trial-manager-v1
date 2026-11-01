'use strict';

// Exercise the offline fallback with a cache-busted stylesheet URL.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function main() {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
  const listeners = {};
  const expectedResponse = { cached: true };
  let matchRequest;
  let matchOptions;
  let precachedUrls;

  const caches = {
    open: async () => ({ addAll: async urls => { precachedUrls = urls; }, put: async () => {} }),
    keys: async () => [],
    delete: async () => true,
    match: async (request, options) => {
      matchRequest = request;
      matchOptions = options;
      return expectedResponse;
    }
  };
  const self = {
    addEventListener: (name, callback) => { listeners[name] = callback; },
    skipWaiting: () => {},
    clients: { claim: async () => {} },
    location: { origin: 'https://trial-manager.test' }
  };

  vm.runInNewContext(source, {
    self,
    caches,
    URL,
    fetch: async () => { throw new Error('simulated offline state'); },
    Promise
  });

  if (typeof listeners.install !== 'function') throw new Error('install handler was not registered');
  let installPromise;
  listeners.install({ waitUntil: promise => { installPromise = promise; } });
  await installPromise;
  if (!precachedUrls?.includes('./tv.html')) throw new Error('TV page must be included in the initial offline cache');
  if (typeof listeners.fetch !== 'function') throw new Error('fetch handler was not registered');

  const request = { url: 'https://trial-manager.test/style.css?v=2', method: 'GET' };
  let responsePromise;
  listeners.fetch({ request, respondWith: promise => { responsePromise = promise; } });
  const response = await responsePromise;

  if (response !== expectedResponse) throw new Error('offline fallback did not return the cached response');
  if (matchRequest !== request) throw new Error('offline fallback searched for the wrong request');
  if (matchOptions?.ignoreSearch !== true) throw new Error('offline fallback must ignore cache-busting query strings');

  let intercepted = false;
  listeners.fetch({ request: { url: 'https://trial-manager.test/api/save', method: 'POST' }, respondWith: () => { intercepted = true; } });
  if (intercepted) throw new Error('service worker must not intercept POST requests');
  listeners.fetch({ request: { url: 'https://external.test/script.js', method: 'GET' }, respondWith: () => { intercepted = true; } });
  if (intercepted) throw new Error('service worker must not intercept cross-origin requests');

  console.log('PASS: service worker offline fallback, GET-only scope, and same-origin restrictions passed.');
}

main().catch(error => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
