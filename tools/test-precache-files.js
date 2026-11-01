'use strict';

// Guard against broken offline installs caused by stale or missing precache entries.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workerPath = path.join(root, 'service-worker.js');
const worker = fs.readFileSync(workerPath, 'utf8');
const cacheNameMatch = worker.match(/const\s+CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
const listMatch = worker.match(/const\s+urlsToCache\s*=\s*\[([\s\S]*?)\]\s*;/);

if (!cacheNameMatch) throw new Error('Could not find the service-worker cache name');
if (!listMatch) throw new Error('Could not find the service-worker precache list');

const entries = [...listMatch[1].matchAll(/["']([^"']+)["']/g)].map(match => match[1]);
if (entries.length === 0) throw new Error('The service-worker precache list is empty');

const normalizedEntries = entries.map(entry => {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(entry)) {
    throw new Error(`Precache entry must be a local relative path: ${entry}`);
  }
  const normalized = entry.split(/[?#]/, 1)[0].replace(/^\.\//, '') || '.';
  const resolved = path.resolve(root, normalized);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Precache entry escapes the application directory: ${entry}`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Precache entry does not exist on disk: ${entry}`);
  }
  return normalized;
});

const duplicates = normalizedEntries.filter((entry, index) => normalizedEntries.indexOf(entry) !== index);
if (duplicates.length) throw new Error(`Duplicate precache entries: ${[...new Set(duplicates)].join(', ')}`);

console.log(`PASS: ${entries.length} unique service-worker precache entries exist on disk (${cacheNameMatch[1]}).`);
