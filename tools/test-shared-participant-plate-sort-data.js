'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const match = source.match(/function getParticipantPlateSortData\(participant, competition\)\s*\{[\s\S]*?\n\}/);
if (!match) throw new Error('Shared participant plate-sort helper is missing');
const sandbox = {};
vm.runInNewContext(`${match[0]}\nthis.getData = getParticipantPlateSortData;`, sandbox);
const competition = {
  participants: ['selected'],
  participantPlates: { selected: '12', custom: '3' }
};
const cases = [
  [{id:'selected', plaque:'8'}, {selected:true, plate:'12', group:0}],
  [{id:'custom', plaque:'4'}, {selected:false, plate:'3', group:1}],
  [{id:'other', plaque:'7'}, {selected:false, plate:'7', group:1}],
  [{id:'blank', plaque:''}, {selected:false, plate:'', group:2}],
  [{id:'missing'}, {selected:false, plate:'', group:2}],
  [{id:'selected', plaque:'8'}, {selected:true, plate:'12', group:0}]
];
for (const [participant, expected] of cases) {
  const actual = sandbox.getData(participant, competition);
  for (const key of ['selected', 'plate', 'group']) {
    if (actual[key] !== expected[key]) throw new Error(`Expected ${key}=${expected[key]}, got ${actual[key]}`);
  }
}
const start = source.indexOf('function sortParticipants(');
const end = source.indexOf('\nfunction ', start + 10);
const body = source.slice(start, end < 0 ? source.length : end);
if (!body.includes('getParticipantPlateSortData(a, c)') || !body.includes('getParticipantPlateSortData(b, c)')) {
  throw new Error('Participant plaque sorting does not use the shared helper');
}
console.log(`PASS: ${cases.length} participant plate-sort data cases and shared-helper call sites passed.`);
