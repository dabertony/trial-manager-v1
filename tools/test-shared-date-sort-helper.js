'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const birth = source.match(/function getBirthDateSortValue\(value\)\s*\{[\s\S]*?\n\}/);
const competition = source.match(/function parseDateFR\(str\)\s*\{[\s\S]*?\n\}/);
if (!birth || !competition) throw new Error('Shared date sorting helpers are missing');
if (!/return\s+getBirthDateSortValue\(str\);/.test(competition[0])) {
  throw new Error('Competition date sorting does not reuse the shared date-key helper');
}
const sandbox = {};
vm.runInNewContext(`${birth[0]}\n${competition[0]}\nthis.birthKey = getBirthDateSortValue; this.competitionKey = parseDateFR;`, sandbox);
const cases = [
  ['2026-10-26', 20261026],
  ['26/10/2026', 20261026],
  ['7/2/2024', 20240207],
  ['', 0],
  [null, 0],
  ['not a date', 0],
  ['31/02/2024', 0],
  ['29/02/2024', 20240229],
  ['29/02/2023', 0],
  ['2024-13-01', 0],
  ['2024-04-31', 0],
  [' 01/01/2025 ', 20250101]
];
for (const [value, expected] of cases) {
  const birthActual = sandbox.birthKey(value);
  const competitionActual = sandbox.competitionKey(value);
  if (birthActual !== expected) throw new Error(`Birth date ${value}: expected ${expected}, got ${birthActual}`);
  if (competitionActual !== expected) throw new Error(`Competition date ${value}: expected ${expected}, got ${competitionActual}`);
}
if (!(sandbox.competitionKey('31/12/2024') < sandbox.competitionKey('01/01/2025'))) {
  throw new Error('Competition date keys do not sort chronologically across years');
}
console.log(`PASS: ${cases.length * 2 + 1} shared date-sort checks passed.`);
