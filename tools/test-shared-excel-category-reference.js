'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const orderMatch = source.match(/const TRIAL_MANAGER_CATEGORY_ORDER = Object\.freeze\(\[[\s\S]*?\]\);/);
const colorsMatch = source.match(/const TRIAL_MANAGER_CATEGORY_COLORS = Object\.freeze\(\{[\s\S]*?\}\);/);
if (!orderMatch) throw new Error('Shared Excel category order is missing');
if (!colorsMatch) throw new Error('Shared Excel category color map is missing');

const sandbox = {};
vm.runInNewContext(`${orderMatch[0]}\n${colorsMatch[0]}\nthis.order = TRIAL_MANAGER_CATEGORY_ORDER; this.colors = TRIAL_MANAGER_CATEGORY_COLORS;`, sandbox);
let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(message);
}

const expectedOrder = [
  'Elite', 'Elite F', 'Elite V', 'N1', 'N1 F', 'N1 V',
  'N2', 'N2 F', 'N2 V', 'N3', 'N3 F', 'N3 V',
  'N4', 'N4 F', 'N4 V', 'N5', 'N5 F', 'N5 V'
];
check(JSON.stringify(Array.from(sandbox.order)) === JSON.stringify(expectedOrder), 'Excel category order changed');
check(Object.isFrozen(sandbox.order), 'Excel category order must be immutable');
check(Object.isFrozen(sandbox.colors), 'Excel category color map must be immutable');

const expectedColors = {
  'Elite': 'FACC15', 'Elite F': 'EC4899', 'Elite V': '6B7280',
  'N1': 'DC2626', 'N1 F': 'EC4899', 'N1 V': '6B7280',
  'N2': '2563EB', 'N2 F': 'EC4899', 'N2 V': '6B7280',
  'N3': '16A34A', 'N3 F': 'EC4899', 'N3 V': '6B7280',
  'N4': 'FFFFFF', 'N4 F': 'EC4899', 'N4 V': '6B7280',
  'N5': 'EA580C', 'N5 F': 'EC4899', 'N5 V': '6B7280'
};
check(JSON.stringify(sandbox.colors) === JSON.stringify(expectedColors), 'Excel category colors changed');

for (const name of ['exportPilotsExcelPWA', 'exportParticipantsExcelPWA']) {
  const start = source.indexOf(`async function ${name}(`);
  if (start < 0) throw new Error(`${name} not found`);
  const next = source.indexOf('\nasync function ', start + 1);
  const body = source.slice(start, next < 0 ? source.length : next);
  check(body.includes('const categoryOrder = getTrialManagerCategoryOrder();'), `${name} must use shared dynamic category order`);
  check(body.includes('const colorMap = getTrialManagerCategoryColorMap();'), `${name} must use shared dynamic category colors`);
  check(!/const categoryOrder = \[/.test(body), `${name} still duplicates category order`);
  check(!/const colorMap = \{/.test(body), `${name} still duplicates category colors`);
}

console.log(`PASS: ${checks} shared Excel category-reference checks passed.`);
