'use strict';

// Guard the service-worker install/activate lifecycle without a browser.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function main() {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
  const listeners = {};
  const deleted = [];
  let openedCacheName;
  let precachedUrls;
  let skippedWaiting = false;
  let clientsClaimed = false;

  const caches = {
    open: async name => {
      openedCacheName = name;
      return { addAll: async urls => { precachedUrls = urls; } };
    },
    keys: async () => ['old-cache', openedCacheName, 'another-old-cache'],
    delete: async name => { deleted.push(name); return true; }
  };
  const self = {
    addEventListener: (name, callback) => { listeners[name] = callback; },
    skipWaiting: () => { skippedWaiting = true; },
    clients: { claim: async () => { clientsClaimed = true; } }
  };

  vm.runInNewContext(source, { self, caches, Promise });

  if (typeof listeners.install !== 'function') throw new Error('install handler was not registered');
  let installPromise;
  listeners.install({ waitUntil: promise => { installPromise = promise; } });
  await installPromise;
  if (!openedCacheName || !/^trial-manager-cache-v\d+$/.test(openedCacheName)) {
    throw new Error('install did not open a versioned Trial Manager cache');
  }
  for (const required of ['./index.html', './tv.html', './style.css', './app.js']) {
    if (!precachedUrls?.includes(required)) throw new Error(`offline cache is missing ${required}`);
  }
  if (!skippedWaiting) throw new Error('install should call skipWaiting');

  if (typeof listeners.activate !== 'function') throw new Error('activate handler was not registered');
  let activatePromise;
  listeners.activate({ waitUntil: promise => { activatePromise = promise; } });
  await activatePromise;
  if (deleted.includes(openedCacheName)) throw new Error('activation deleted the current cache');
  if (!deleted.includes('old-cache') || !deleted.includes('another-old-cache')) {
    throw new Error('activation did not remove all obsolete caches');
  }
  if (!clientsClaimed) throw new Error('activation should claim existing clients');

  console.log('PASS: service worker install precache and activation lifecycle checks passed.');
}

main().catch(error => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
