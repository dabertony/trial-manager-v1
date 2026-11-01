'use strict';

// Guard against a changed application script being served under a stale URL
// while the service worker keeps an older offline cache.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const scriptMatch = html.match(/<script\s+src=["']app\.js\?v=(\d+)["']/i);
const cacheMatch = worker.match(/const\s+CACHE_NAME\s*=\s*["']trial-manager-cache-v(\d+)["']/);
if (!scriptMatch) throw new Error('index.html must version the main app.js script');
if (!cacheMatch) throw new Error('service worker must use a versioned application cache');
if (!worker.includes('"./app.js"')) throw new Error('service worker must precache app.js');
if (!app.includes('function showAppNotice(')) throw new Error('main application script is missing expected current content');
if (/\bconsole\.log\s*\(/.test(app)) throw new Error('temporary console.log diagnostics should not remain in app.js');
if (Number(cacheMatch[1]) < Number(scriptMatch[1])) {
  throw new Error(`offline cache v${cacheMatch[1]} is older than app.js?v=${scriptMatch[1]}`);
}
console.log(`PASS: application script version (${scriptMatch[1]}) and offline cache (v${cacheMatch[1]}) are consistent.`);
