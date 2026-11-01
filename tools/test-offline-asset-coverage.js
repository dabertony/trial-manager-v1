'use strict';

// Ensure every local asset directly referenced by the main HTML pages is precached.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const cacheListMatch = serviceWorker.match(/const\s+urlsToCache\s*=\s*\[([\s\S]*?)\]\s*;/);
if (!cacheListMatch) throw new Error('Could not find the service-worker precache list');

const cachedAssets = new Set(
  [...cacheListMatch[1].matchAll(/["']([^"']+)["']/g)]
    .map(match => normalizeAsset(match[1]))
);

function normalizeAsset(value) {
  return value.split(/[?#]/, 1)[0].replace(/^\.\//, '');
}

const requiredAssets = new Set();
for (const page of ['index.html', 'tv.html']) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  for (const match of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    const reference = match[1].trim();
    if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|#|data:)/i.test(reference)) continue;
    requiredAssets.add(normalizeAsset(reference));
  }
}

const missing = [...requiredAssets].filter(asset => !cachedAssets.has(asset));
if (missing.length) {
  throw new Error(`HTML assets missing from the offline precache: ${missing.join(', ')}`);
}

console.log(`PASS: ${requiredAssets.size} local HTML asset references are covered by the offline precache.`);
