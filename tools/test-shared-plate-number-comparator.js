'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const match = source.match(/function comparePlateNumbers\(a, b, direction = 1\)\s*\{[\s\S]*?\n\}/);
if (!match) throw new Error('Shared plate-number comparator is missing');
const sandbox = {};
const directionHelper = source.match(/function applySortDirection\(diff, direction = 1\)\s*\{[\s\S]*?\n\}/);
if (!directionHelper) throw new Error('Shared sort-direction application helper is missing');
vm.runInNewContext(`${directionHelper[0]}\n${match[0]}\nthis.compare = comparePlateNumbers;`, sandbox);
const cases = [
  ['2', '10', 1, -1],
  ['10', '2', 1, 1],
  ['2', '10', -1, 1],
  ['', '2', 1, -1],
  [null, '2', 1, -1],
  ['12A', '12B', 1, -1],
  ['12', '12', 1, 0]
];
for (const [a, b, direction, expected] of cases) {
  const actual = Math.sign(sandbox.compare(a, b, direction));
  if (actual !== expected) throw new Error(`comparePlateNumbers(${a}, ${b}, ${direction}): expected ${expected}, got ${actual}`);
}
for (const fn of ['sortPilots', 'sortParticipants']) {
  const start = source.indexOf(`function ${fn}(`);
  const next = source.indexOf('\nfunction ', start + 10);
  const body = source.slice(start, next < 0 ? source.length : next);
  if (!body.includes('comparePlateNumbers(')) throw new Error(`${fn} does not use shared plate comparator`);
}
console.log(`PASS: ${cases.length} shared plate-number comparator cases and 2 sort call sites passed.`);
