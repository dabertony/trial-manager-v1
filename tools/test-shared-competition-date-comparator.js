'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const dateKey = source.match(/function getBirthDateSortValue\(value\)\s*\{[\s\S]*?\n\}/);
const parseDate = source.match(/function parseDateFR\(str\)\s*\{[\s\S]*?\n\}/);
const comparator = source.match(/function compareCompetitionDates\(a, b\)\s*\{[\s\S]*?\n\}/);
if (!dateKey || !parseDate || !comparator) throw new Error('Shared competition date comparator is missing');
const sandbox = {};
vm.runInNewContext(`${dateKey[0]}\n${parseDate[0]}\n${comparator[0]}\nthis.compare = compareCompetitionDates;`, sandbox);
const cases = [
  [{date:'01/01/2025'}, {date:'31/12/2024'}, 8870],
  [{date:'2024-02-29'}, {date:'28/02/2024'}, 1],
  [{date:'bad'}, {date:'01/01/2024'}, -20240101],
  [{date:''}, {date:''}, 0],
  [null, {date:'01/01/2024'}, -20240101],
  [{date:'01/01/2024'}, null, 20240101]
];
for (const [a,b,expected] of cases) {
  const actual = sandbox.compare(a,b);
  if (actual !== expected) throw new Error(`Comparator mismatch: expected ${expected}, got ${actual}`);
}
for (const fn of ['buildChampionship','buildFemaleChampionship','buildVeteranChampionship','buildClubChampionship']) {
  const start = source.indexOf(`function ${fn}(`);
  if (start < 0) throw new Error(`Missing ${fn}`);
  const next = source.indexOf('\nfunction ', start + 10);
  const body = source.slice(start, next < 0 ? source.length : next);
  if (!body.includes('compareCompetitionDates')) throw new Error(`${fn} does not use the shared comparator`);
  if (/parseDateFR\(a\.date\)\s*-\s*parseDateFR\(b\.date\)/.test(body)) throw new Error(`${fn} still has an inline date comparator`);
}
console.log('PASS: 6 shared competition date-comparator cases and 4 championship call sites passed.');
