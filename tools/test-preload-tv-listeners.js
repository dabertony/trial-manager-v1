'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const preload = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');

assert.match(
  preload,
  /onTVContent:\s*\(callback\)\s*=>\s*\{\s*ipcRenderer\.on\("tv-content",\s*\(event,\s*html\)\s*=>\s*\{\s*callback\(html\);\s*\}\);\s*\}/s,
  'onTVContent must subscribe without returning the ipcRenderer emitter'
);
assert.match(
  preload,
  /onTVClosed:\s*\(callback\)\s*=>\s*\{\s*ipcRenderer\.on\("tv-closed",\s*\(\)\s*=>\s*\{\s*callback\(\);\s*\}\);\s*\}/s,
  'onTVClosed must subscribe without returning the ipcRenderer emitter'
);
assert.match(preload, /contextBridge\.exposeInMainWorld\("api",\s*\{/s, 'preload API must remain exposed');

console.log('PASS: TV IPC subscriptions no longer return the Electron emitter through contextBridge (3 checks).');
