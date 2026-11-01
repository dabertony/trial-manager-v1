'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const helper = source.match(/function getDoublePointageMainCategory\(cat\)\s*\{[\s\S]*?\n\}/);
if (!helper) throw new Error('Shared double-pointage category helper not found');
const sandbox = {};
vm.runInNewContext(`${helper[0]}\nthis.normalize = getDoublePointageMainCategory;`, sandbox);
let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(message);
}
const cases = [
  ['Elite', 'Elite'], ['EliteF', 'Elite'], ['N1', 'N1'], ['N1F', 'N1'],
  ['N2', 'N2'], ['N2F', 'N2'], ['N3', 'N3'], ['N3F', 'N3'],
  ['N4', 'N4'], ['N4F', 'N4'], ['N5', 'N5'], ['N5F', 'N5'],
  ['Draisienne', 'Draisienne'], ['Autre', 'Autre']
];
for (const [input, expected] of cases) {
  check(sandbox.normalize(input) === expected, `category ${input} should normalize to ${expected}`);
}
const screenNames = ['showDoublePointageMatin', 'showDoublePointageApresMidi', 'showDoublePointageToutesCategories'];
for (const name of screenNames) {
  const start = source.indexOf(`function ${name}(i)`);
  if (start < 0) throw new Error(`Screen ${name} not found`);
  const next = source.indexOf('\nfunction ', start + 1);
  const body = source.slice(start, next < 0 ? source.length : next);
  check(body.includes('getDoublePointageMainCategory('), `${name} should use shared category helper`);
  check(!/function mainCat\(/.test(body), `${name} should not define a duplicate local category helper`);
}
console.log(`PASS: ${checks} double-pointage category helper checks passed.`);
