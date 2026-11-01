'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const comparator = source.match(/function comparePilotNames\(a, b, direction = 1\)\s*\{[\s\S]*?\n\}/);
if (!comparator) throw new Error('Shared pilot-name comparator is missing');
const sandbox = {};
const directionHelper = source.match(/function applySortDirection\(diff, direction = 1\)\s*\{[\s\S]*?\n\}/);
if (!directionHelper) throw new Error('Shared sort-direction application helper is missing');
vm.runInNewContext(`${directionHelper[0]}\n${comparator[0]}\nthis.compare = comparePilotNames;`, sandbox);
const cases = [
  [{name:'Alice'}, {name:'Bob'}, -1, 1],
  [{name:'Bob'}, {name:'Alice'}, 1, 1],
  [{name:'Alice'}, {name:'Bob'}, 1, -1],
  [{name:'Alice'}, {name:'Alice'}, 0, 1],
  [{name:''}, {name:'Alice'}, -1, 1],
  [null, {name:'Alice'}, -1, 1],
  [{name:'Bob'}, {name:'Alice'}, -1, -1]
];
for (const [a, b, expected, direction] of cases) {
  const actual = Math.sign(sandbox.compare(a, b, direction));
  if (actual !== expected) throw new Error(`Expected sign ${expected}, got ${actual} for ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
}
for (const fn of ['sortPilots', 'sortParticipants']) {
  const start = source.indexOf(`function ${fn}(`);
  if (start < 0) throw new Error(`Missing ${fn}`);
  const next = source.indexOf('\nfunction ', start + 10);
  const body = source.slice(start, next < 0 ? source.length : next);
  if (!body.includes('comparePilotNames(a, b, dir)')) throw new Error(`${fn} does not use the shared name comparator`);
}
console.log(`PASS: ${cases.length} shared pilot-name comparator cases and 2 call sites passed.`);
