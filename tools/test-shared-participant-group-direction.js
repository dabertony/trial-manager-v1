'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const directionMatch = source.match(/function applySortDirection\(diff, direction = 1\)\s*\{[\s\S]*?\n\}/);
const plateMatch = source.match(/function getParticipantPlateSortData\(participant, competition\)\s*\{[\s\S]*?\n\}/);
if (!directionMatch || !plateMatch) throw new Error('Required shared sorting helpers are missing');
const sortStart = source.indexOf('function sortParticipants(');
const sortEnd = source.indexOf('\nfunction ', sortStart + 10);
const sortBody = source.slice(sortStart, sortEnd < 0 ? source.length : sortEnd);
if (!sortBody.includes('applySortDirection(aData.group - bData.group, dir)')) {
  throw new Error('Participant plate group sorting must use applySortDirection');
}
const sandbox = {};
vm.runInNewContext(`${directionMatch[0]}\nthis.applySortDirection = applySortDirection;`, sandbox);
const cases = [
  ['ascending: selected group before unselected', sandbox.applySortDirection(0 - 1, 1) < 0],
  ['descending: unselected group before selected', sandbox.applySortDirection(0 - 1, -1) > 0],
  ['equal groups remain equal', sandbox.applySortDirection(1 - 1, -1) === 0],
  ['default direction remains ascending', sandbox.applySortDirection(0 - 1) < 0]
];
for (const [label, passed] of cases) if (!passed) throw new Error(`Failed: ${label}`);
console.log(`PASS: ${cases.length} participant plate-group direction cases and shared-helper wiring passed.`);
