'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
if (/const\s+CATEGORY_COLORS\s*=/.test(source)) {
  throw new Error('Obsolete CATEGORY_COLORS map remains; use TRIAL_MANAGER_CATEGORY_COLORS');
}
const order = source.match(/const TRIAL_MANAGER_CATEGORY_ORDER = Object\.freeze\(\[[\s\S]*?\]\);/);
const matchOrder = source.match(/const TRIAL_MANAGER_CATEGORY_COLOR_MATCH_ORDER = Object\.freeze\([\s\S]*?\);/);
const colors = source.match(/const TRIAL_MANAGER_CATEGORY_COLORS = Object\.freeze\(\{[\s\S]*?\}\);/);
const helper = source.match(/function getCategoryColor\(cat\)\s*\{[\s\S]*?\n\}/);
if (!order || !matchOrder || !colors || !helper) throw new Error('Category color reference/helper missing');
const sandbox = {};
vm.runInNewContext(`${order[0]}\n${matchOrder[0]}\n${colors[0]}\n${helper[0]}\nthis.color = getCategoryColor; this.matchOrder = TRIAL_MANAGER_CATEGORY_COLOR_MATCH_ORDER;`, sandbox);
if (!Object.isFrozen(sandbox.matchOrder)) throw new Error('Category color match order must be immutable');
if (sandbox.matchOrder[0] !== 'Elite F' && sandbox.matchOrder[0] !== 'Elite V') throw new Error('Longest category labels must be matched first');
const cases = [
  ['Elite', '#FACC15'], ['Elite F', '#EC4899'], ['Elite V', '#6B7280'],
  ['N1', '#DC2626'], ['N1 F', '#EC4899'], ['N1 V', '#6B7280'],
  ['N2', '#2563EB'], ['N2 F', '#EC4899'], ['N2 V', '#6B7280'],
  ['N3', '#16A34A'], ['N3 F', '#EC4899'], ['N3 V', '#6B7280'],
  ['N4', '#FFFFFF'], ['N4 F', '#EC4899'], ['N4 V', '#6B7280'],
  ['N5', '#EA580C'], ['N5 F', '#EC4899'], ['N5 V', '#6B7280'],
  ['n4', '#FFFFFF'], ['N4 F féminine', '#EC4899'], ['N2 Vétéran', '#6B7280'],
  ['Draisienne', ''], ['N6', ''], ['', ''], [null, '']
];
for (const [input, expected] of cases) {
  const actual = sandbox.color(input);
  if (actual !== expected) throw new Error(`getCategoryColor(${String(input)}) expected ${expected}, got ${actual}`);
}
console.log(`PASS: ${cases.length} category color helper checks passed.`);
