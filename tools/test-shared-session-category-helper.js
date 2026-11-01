'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const main = source.match(/function getDoublePointageMainCategory\(cat\)\s*\{[\s\S]*?\n\}/);
const orders = source.match(/const TRIAL_MANAGER_DOUBLE_POINTAGE_MORNING_ORDER = Object\.freeze\(\[[^\]]+\]\);\s*const TRIAL_MANAGER_DOUBLE_POINTAGE_AFTERNOON_ORDER = Object\.freeze\(\[[^\]]+\]\);/);
const customNames = source.match(/function getTrialManagerCustomCategoryNames\(\)\s*\{[\s\S]*?\n\}/);
const dynamicMorning = source.match(/function getTrialManagerDoublePointageMorningOrder\(\)\s*\{[\s\S]*?\n\}/);
const morning = source.match(/function isTrialManagerMorningCategory\(cat\)\s*\{[\s\S]*?\n\}/);
const afternoon = source.match(/function isTrialManagerAfternoonCategory\(cat\)\s*\{[\s\S]*?\n\}/);
if (!main || !orders || !customNames || !dynamicMorning || !morning || !afternoon) throw new Error('Shared session-category helpers/references are missing');
const sandbox = {};
vm.runInNewContext(`const state = { customCategories: [{ name: 'Draisienne', color: '#8b5cf6' }] };\n${main[0]}\n${orders[0]}\n${customNames[0]}\n${dynamicMorning[0]}\n${morning[0]}\n${afternoon[0]}\nthis.isMorning = isTrialManagerMorningCategory; this.isAfternoon = isTrialManagerAfternoonCategory;`, sandbox);
const cases = [
  ['N4', true, false], ['N4 F', true, false], ['N5 V', true, false],
  ['Elite', false, true], ['Elite F', false, true], ['N1 V', false, true],
  ['N2', false, true], ['N3 F', false, true], ['N1', false, true],
  ['Draisienne', true, false], ['Autre', false, false]
];
for (const [cat, expectedMorning, expectedAfternoon] of cases) {
  if (sandbox.isMorning(cat) !== expectedMorning) throw new Error(`${cat}: incorrect morning membership`);
  if (sandbox.isAfternoon(cat) !== expectedAfternoon) throw new Error(`${cat}: incorrect afternoon membership`);
}
for (const marker of ['function showDoublePointageMatin(', 'function showDoublePointageApresMidi(']) {
  if (!source.includes(marker)) throw new Error(`Expected existing caller not found: ${marker}`);
}
const repeatedChecks = [
  ['morning dashboard', 'let morningPilots = c.participants.filter(id=>', 'isTrialManagerMorningCategory(p.cat)'],
  ['afternoon dashboard', 'let afternoonPilots = c.participants.filter(id=>', 'isTrialManagerAfternoonCategory(p.cat)'],
  ['morning sort', 'if(mode==="morningAZ")', 'isTrialManagerMorningCategory(a.cat)'],
  ['afternoon sort', 'if(mode==="afternoonAZ")', 'isTrialManagerAfternoonCategory(a.cat)'],
  ['morning export', 'const matin =', 'isTrialManagerMorningCategory(p.cat)'],
  ['afternoon export', 'const apresMidi =', 'isTrialManagerAfternoonCategory(p.cat)']
];
for (const [label, startMarker, expected] of repeatedChecks) {
  const start = source.indexOf(startMarker);
  if (start < 0 || !source.slice(start, start + 1800).includes(expected)) throw new Error(`${label} does not use the shared session helper`);
}
console.log(`PASS: ${cases.length * 2} shared session-category checks and 6 call-site checks passed.`);
