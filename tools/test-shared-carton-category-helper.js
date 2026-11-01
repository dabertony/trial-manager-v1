'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const helper = source.match(/function getDoublePointageMainCategory\(cat\)\s*\{[\s\S]*?\n\}/);
if (!helper) throw new Error('Shared main-category helper is missing');
const sandbox = {};
vm.runInNewContext(`${helper[0]}\nthis.getMainCategory = getDoublePointageMainCategory;`, sandbox);
const cases = [
  ['Elite', 'Elite'],
  ['Elite F', 'Elite'],
  ['Elite V', 'Elite'],
  ['N1', 'N1'],
  ['N2 F', 'N2'],
  ['N3 V', 'N3'],
  ['N4 F', 'N4'],
  ['N5 V', 'N5'],
  ['Draisienne', 'Draisienne']
];
for (const [category, expected] of cases) {
  const actual = sandbox.getMainCategory(category);
  if (actual !== expected) throw new Error(`getDoublePointageMainCategory(${JSON.stringify(category)}) expected ${expected}, got ${actual}`);
}
const exportStart = source.indexOf('async function exportParticipantsExcelPWA(');
const exportEnd = source.indexOf('\nasync function ', exportStart + 1);
const exportBody = source.slice(exportStart, exportEnd < 0 ? source.length : exportEnd);
if (!exportBody.includes('getDoublePointageMainCategory(a.cat)') || !exportBody.includes('getDoublePointageMainCategory(b.cat)')) {
  throw new Error('All-category carton sorting must use the shared category helper');
}
if (/function mainCat\s*\(/.test(exportBody)) {
  throw new Error('All-category carton export still contains its own duplicate mainCat helper');
}
console.log(`PASS: ${cases.length} shared carton-category helper checks passed.`);
