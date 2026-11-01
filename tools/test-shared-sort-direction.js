'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const match = source.match(/function getSortDirection\(value\)\s*\{[\s\S]*?\n\}/);
if (!match) throw new Error('Shared sort-direction helper is missing');
const sandbox = {};
vm.runInNewContext(`${match[0]}\nthis.getSortDirection = getSortDirection;`, sandbox);
const cases = [
  ['desc', -1], ['asc', 1], ['', 1], [undefined, 1], [null, 1], ['DESC', 1]
];
for (const [value, expected] of cases) {
  const actual = sandbox.getSortDirection(value);
  if (actual !== expected) throw new Error(`Expected ${expected} for ${String(value)}, got ${actual}`);
}
for (const [name, startMarker] of [['sortPilots', 'function sortPilots('], ['sortParticipants', 'function sortParticipants(']]) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf('\nfunction ', start + 10);
  const body = source.slice(start, end < 0 ? source.length : end);
  if (!body.includes('getSortDirection(')) throw new Error(`${name} does not use the shared direction helper`);
}
console.log(`PASS: ${cases.length} sort-direction cases and 2 shared call sites passed.`);
