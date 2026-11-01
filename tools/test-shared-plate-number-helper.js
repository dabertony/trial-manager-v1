'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const helper = source.match(/function getTrialManagerPlateNumber\(p, fallback = 99999\)\s*\{[\s\S]*?\n\}/);
if (!helper) throw new Error('Shared plate-number helper is missing');
const sandbox = {};
vm.runInNewContext(`${helper[0]}\nthis.getPlate = getTrialManagerPlateNumber;`, sandbox);
const cases = [
  [{ plaque: '12' }, 99999, 12],
  [{ plaque: 'N° 045' }, 99999, 45],
  [{ plaque: '' }, 99999, 99999],
  [{ plaque: 'ABC' }, 0, 0],
  [{ plaque: null }, 0, 0],
  [{ plaque: '0' }, 99999, 99999]
];
for (const [pilot, fallback, expected] of cases) {
  const actual = sandbox.getPlate(pilot, fallback);
  if (actual !== expected) throw new Error(`getTrialManagerPlateNumber(${JSON.stringify(pilot)}, ${fallback}) expected ${expected}, got ${actual}`);
}
const exportStart = source.indexOf('async function exportPilotsExcelPWA(');
const exportEnd = source.indexOf('\nasync function ', exportStart + 1);
const exportBody = source.slice(exportStart, exportEnd < 0 ? source.length : exportEnd);
if (!exportBody.includes('getTrialManagerPlateNumber(a)') || !exportBody.includes('getTrialManagerPlateNumber(b)')) {
  throw new Error('Pilot Excel plaque sort must use the shared helper');
}
if (/parseInt\([\s\S]{0,100}plaque/.test(exportBody)) {
  throw new Error('Pilot Excel export still duplicates plaque-number parsing');
}
console.log(`PASS: ${cases.length} shared plate-number helper checks passed.`);
