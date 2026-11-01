'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function extract(source, start, end, name) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error(`Cannot locate ${name}`);
  const context = {};
  vm.runInNewContext(`${source.slice(a, b)}\nglobalThis.convert = ${name};`, context);
  return context.convert;
}
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const electronConvert = extract(main, 'function formatImportedBirthDate(value){', '\nipcMain.handle("import-pilots-excel"', 'formatImportedBirthDate');
const browserConvert = extract(app, 'function formatImportedPilotBirthDate(value){', '\nasync function importPilotsExcel(){', 'formatImportedPilotBirthDate');
for (const [label, convert] of [['Electron', electronConvert], ['navigateur', browserConvert]]) {
  for (const [input, expected] of [
    [42054.95833333, '2015-02-19'],
    ['19/02/2015', '2015-02-19'],
    ['2015-02-19', '2015-02-19'],
    ['', '']
  ]) {
    const actual = convert(input);
    if (actual !== expected) throw new Error(`${label}: ${String(input)} => ${actual}, attendu ${expected}`);
  }
}
console.log('PASS: Excel serial 42054.95833333 and French/ISO birth dates import as 2015-02-19 in Electron and browser.');
