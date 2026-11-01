'use strict';

// Double-pointage sheets are rendered in-app, then exported through the shared
// PDF flow. Guard against the return of the obsolete IPC wrappers that called
// channels never registered in main.js.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(message);
}

for (const [name, label, printFunction] of [
  ['Matin', 'showDoublePointageMatin', 'printDoublePointageMatinPDF'],
  ['Après-midi', 'showDoublePointageApresMidi', 'printDoublePointageApresMidiPDF'],
  ['Toutes catégories', 'showDoublePointageToutesCategories', 'printDoublePointageToutesCategoriesPDF']
]) {
  check(app.includes(`function ${label}(i)`), `${name}: preview screen should exist`);
  check(app.includes(`onclick="${printFunction}()`), `${name}: preview should offer its PDF export action`);
  check(app.includes(`async function ${printFunction}()`), `${name}: shared PDF action should exist`);
}
check(app.includes('async function printDoublePointagePDF(sheetName, landscape = false)'), 'double-pointage sheets should use the shared PDF export helper');
check(app.includes('return exportPDFDocument(fileName, landscape);'), 'shared helper should pass generated file name and orientation to PDF export');
check(!app.includes('async function exportDoublePointage(i, apiMethod, periodLabel)'), 'obsolete duplicate Electron export wrapper should be removed');
check(!preload.includes('export-double-pointage-matin'), 'preload should not expose an unregistered morning IPC channel');
check(!preload.includes('export-double-pointage-apres-midi'), 'preload should not expose an unregistered afternoon IPC channel');
check(!main.includes('export-double-pointage-matin') && !main.includes('export-double-pointage-apres-midi'), 'main process should not rely on nonexistent dedicated double-pointage IPC channels');
console.log(`PASS: ${checks} double-pointage export wiring checks passed.`);
