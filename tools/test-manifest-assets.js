'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
for (const icon of manifest.icons || []) {
  const file = path.resolve(root, icon.src);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) throw new Error(`Manifest icon is missing or unsafe: ${icon.src}`);
}
for (const shot of manifest.screenshots || []) {
  const file = path.resolve(root, shot.src);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) throw new Error(`Manifest screenshot is missing or unsafe: ${shot.src}`);
}
if (fs.existsSync(path.join(root, 'export-manager.js'))) throw new Error('Empty unreferenced export-manager.js placeholder should not be shipped');
if (fs.existsSync(path.join(root, 'sw.js'))) throw new Error('Obsolete legacy sw.js should not be shipped alongside the maintained service worker');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!index.includes('service-worker.js')) throw new Error('Main page must continue registering the maintained service worker');
console.log(`PASS: manifest references ${[...(manifest.icons || []), ...(manifest.screenshots || [])].length} existing assets; unused empty placeholder absent.`);
