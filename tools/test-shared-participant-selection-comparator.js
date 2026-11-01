'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const match = source.match(/function compareParticipantSelection\(a, b, competition, direction = 1\)\s*\{[\s\S]*?\n\}/);
if (!match) throw new Error('Shared participant-selection comparator is missing');
const sandbox = {};
const directionHelper = source.match(/function applySortDirection\(diff, direction = 1\)\s*\{[\s\S]*?\n\}/);
if (!directionHelper) throw new Error('Shared sort-direction application helper is missing');
vm.runInNewContext(`${directionHelper[0]}\n${match[0]}\nthis.compare = compareParticipantSelection;`, sandbox);
const competition = { participants: ['selected-a', 'selected-b'] };
const cases = [
  [{id:'selected-a'}, {id:'unselected'}, 1, 1],
  [{id:'unselected'}, {id:'selected-a'}, 1, -1],
  [{id:'selected-a'}, {id:'selected-b'}, 1, 0],
  [{id:'selected-a'}, {id:'unselected'}, -1, -1],
  [{id:'unselected'}, {id:'selected-b'}, -1, 1]
];
for (const [a, b, direction, expected] of cases) {
  const actual = Math.sign(sandbox.compare(a, b, competition, direction));
  if (actual !== expected) throw new Error(`Expected sign ${expected}, got ${actual}`);
}
const start = source.indexOf('function sortParticipants(');
const end = source.indexOf('\nfunction ', start + 10);
const body = source.slice(start, end < 0 ? source.length : end);
if (!body.includes('compareParticipantSelection(a, b, c, dir)')) {
  throw new Error('Participant selected-status sorting does not use the shared comparator');
}
console.log(`PASS: ${cases.length} participant-selection comparator cases and shared sort call site passed.`);
