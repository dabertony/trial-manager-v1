'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const helper = source.match(/function getDoublePointageMainCategory\(cat\)\s*\{[\s\S]*?\n\}/);
if (!helper) throw new Error('Shared main-category helper is missing');
const constants = source.match(/const TRIAL_MANAGER_DOUBLE_POINTAGE_MORNING_ORDER = Object\.freeze\(\[[^\]]+\]\);\s*const TRIAL_MANAGER_DOUBLE_POINTAGE_AFTERNOON_ORDER = Object\.freeze\(\[[^\]]+\]\);\s*const TRIAL_MANAGER_DOUBLE_POINTAGE_ALL_ORDER = Object\.freeze\(\[[^\]]+\]\);/);
if (!constants) throw new Error('Shared frozen double-pointage category orders are missing');
const sandbox = {};
vm.runInNewContext(`${helper}\n${constants[0]}\nthis.orders = { morning: TRIAL_MANAGER_DOUBLE_POINTAGE_MORNING_ORDER, afternoon: TRIAL_MANAGER_DOUBLE_POINTAGE_AFTERNOON_ORDER, all: TRIAL_MANAGER_DOUBLE_POINTAGE_ALL_ORDER }; this.main = getDoublePointageMainCategory;`, sandbox);
const expected = {
  morning: ['N4', 'N5'],
  afternoon: ['Elite', 'N1', 'N2', 'N3'],
  all: ['Elite', 'N1', 'N2', 'N3', 'N4', 'N5']
};
for (const [name, categories] of Object.entries(expected)) {
  const actual = Array.from(sandbox.orders[name]);
  if (JSON.stringify(actual) !== JSON.stringify(categories)) throw new Error(`${name} order mismatch: ${JSON.stringify(actual)}`);
  if (!Object.isFrozen(sandbox.orders[name])) throw new Error(`${name} order must be frozen`);
}
const viewNames = ['showDoublePointageMatin', 'showDoublePointageApresMidi', 'showDoublePointageToutesCategories'];
for (const name of viewNames) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf('\nfunction ', start + 1);
  const body = source.slice(start, end < 0 ? source.length : end);
  if (!body.includes('.filter(p => order.includes(getDoublePointageMainCategory(p.cat)))')) throw new Error(`${name} must filter with the shared category helper and order`);
  if (/p\.cat\.startsWith\(/.test(body)) throw new Error(`${name} still duplicates category-prefix filtering`);
}
if (!source.includes('const cartonOrder = getTrialManagerDoublePointageAllOrder();')) throw new Error('Carton export must use the shared dynamic all-category order');
if (!source.includes('function getTrialManagerDoublePointageMorningOrder()')) throw new Error('Dynamic morning order for custom categories is missing');
if (!source.includes('function getTrialManagerDoublePointageAllOrder()')) throw new Error('Dynamic all-category order for custom categories is missing');
console.log('PASS: shared double-pointage orders, filtering, and carton-order checks passed.');
