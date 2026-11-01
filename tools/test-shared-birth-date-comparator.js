'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const key = source.match(/function getBirthDateSortValue\(value\)\s*\{[\s\S]*?\n\}/);
const comparator = source.match(/function compareBirthDates\(a, b, direction = 1\)\s*\{[\s\S]*?\n\}/);
if (!key || !comparator) throw new Error('Shared birth-date comparator is missing');
const sandbox = {};
const directionHelper = source.match(/function applySortDirection\(diff, direction = 1\)\s*\{[\s\S]*?\n\}/);
if (!directionHelper) throw new Error('Shared sort-direction application helper is missing');
vm.runInNewContext(`${directionHelper[0]}\n${key[0]}\n${comparator[0]}\nthis.compare = compareBirthDates;`, sandbox);
const cases = [
  [{birthDate:'2008-01-02'}, {birthDate:'03/01/2008'}, -1, 1],
  [{birthDate:'29/02/2024'}, {birthDate:'28/02/2024'}, 1, 1],
  [{birthDate:'31/02/2024'}, {birthDate:'01/01/2024'}, -20240101, 1],
  [{birthDate:''}, {birthDate:'01/01/2024'}, -20240101, 1],
  [null, {birthDate:'01/01/2024'}, -20240101, 1],
  [{birthDate:'01/01/2025'}, {birthDate:'01/01/2024'}, -10000, -1],
  [{birthDate:'01/01/2024'}, {birthDate:'01/01/2024'}, 0, 1]
];
for (const [a, b, expected, direction] of cases) {
  const actual = sandbox.compare(a, b, direction);
  if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual} for ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
}
for (const fn of ['sortPilots', 'sortParticipants']) {
  const start = source.indexOf(`function ${fn}(`);
  if (start < 0) throw new Error(`Missing ${fn}`);
  const next = source.indexOf('\nfunction ', start + 10);
  const body = source.slice(start, next < 0 ? source.length : next);
  if (!body.includes('compareBirthDates(a, b, dir)')) throw new Error(`${fn} does not use the shared comparator`);
}
console.log(`PASS: ${cases.length} shared birth-date comparator cases and 2 call sites passed.`);
