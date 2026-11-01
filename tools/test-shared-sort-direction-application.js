'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const names = ['applySortDirection', 'compareBirthDates', 'comparePilotNames', 'comparePlateNumbers', 'compareParticipantSelection', 'comparePilotTextField', 'comparePilotCategories'];
const snippets = [];
for (const name of names) {
  const match = source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`));
  if (!match) throw new Error(`Missing shared comparator helper: ${name}`);
  snippets.push(match[0]);
}
const sandbox = { getBirthDateSortValue: value => value == null ? 0 : Number(value), categories: ['N1', 'N2', 'N3'] };
vm.runInNewContext(`${snippets.join('\n')}\nthis.helpers = {${names.join(',')}};`, sandbox);
const { applySortDirection, comparePilotNames, comparePlateNumbers, comparePilotTextField, comparePilotCategories } = sandbox.helpers;
const cases = [
  [applySortDirection(5, 1), 5], [applySortDirection(5, -1), -5],
  [applySortDirection(0, -1), 0], [applySortDirection(-3, 1), -3],
  [comparePilotNames({name:'A'}, {name:'B'}, 1) < 0, true],
  [comparePilotNames({name:'A'}, {name:'B'}, -1) > 0, true],
  [comparePlateNumbers('2', '10', 1) < 0, true],
  [comparePlateNumbers('2', '10', -1) > 0, true],
  [comparePilotTextField({club:'A',name:'A'}, {club:'B',name:'B'}, 'club', -1) > 0, true],
  [comparePilotCategories({cat:'N1',name:'A'}, {cat:'N2',name:'B'}, 1) < 0, true]
];
for (const [actual, expected] of cases) if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
for (const name of ['compareBirthDates','comparePilotNames','comparePlateNumbers','compareParticipantSelection','comparePilotTextField','comparePilotCategories']) {
  const match = source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`));
  if (!match || !match[0].includes('applySortDirection(')) throw new Error(`${name} does not use applySortDirection`);
}
console.log(`PASS: ${cases.length} direction-application cases and 6 comparator call sites passed.`);
