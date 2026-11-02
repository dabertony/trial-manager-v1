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

for (const [name, label, printFunction, directFunction] of [
  ['Matin', 'showDoublePointageMatin', 'printDoublePointageMatinPDF', 'exportDoublePointageMatinPDF'],
  ['Après-midi', 'showDoublePointageApresMidi', 'printDoublePointageApresMidiPDF', 'exportDoublePointageApresMidiPDF'],
  ['Journée', 'showDoublePointageToutesCategories', 'printDoublePointageToutesCategoriesPDF', 'exportDoublePointageToutesCategoriesPDF']
]) {
  check(app.includes(`function ${label}(i)`), `${name}: document builder should exist`);
  check(app.includes('onclick="' + directFunction + '(${i})"'), `${name}: export menu should launch the PDF directly`);
  check(app.includes(`async function ${printFunction}()`), `${name}: shared PDF action should exist`);
  check(app.includes(`async function ${directFunction}(competitionIndex)`), `${name}: direct export wrapper should exist`);
}
check(!app.includes('Prévisualisation du document') && !app.includes('Aperçu →'), 'double-pointage export menu should not show preview cards');
check(app.includes('async function exportDoublePointageDirect(competitionIndex, showSheet, printSheet)'), 'direct export should prepare the sheet and launch the shared PDF flow');
check(/finally\s*\{\s*showExportParticipantsMenu\(competitionIndex\);\s*\}/.test(app), 'direct export should return to the export menu after the PDF dialog closes');
check(app.includes('window.addEventListener("afterprint", browserPrintHandler, { once: true })') && app.includes('if(waitForBrowserPrint) await waitForBrowserPrint;'), 'browser export must keep the double-pointage table visible until the print dialog has finished');
check(app.includes('async function printDoublePointagePDF(sheetName, landscape = false)'), 'double-pointage sheets should use the shared PDF export helper');
check(app.includes('return exportPDFDocument(fileName, landscape);'), 'shared helper should pass generated file name and orientation to PDF export');
check(!app.includes('async function exportDoublePointage(i, apiMethod, periodLabel)'), 'obsolete duplicate Electron export wrapper should be removed');
check(!preload.includes('export-double-pointage-matin'), 'preload should not expose an unregistered morning IPC channel');
check(!preload.includes('export-double-pointage-apres-midi'), 'preload should not expose an unregistered afternoon IPC channel');
check(!main.includes('export-double-pointage-matin') && !main.includes('export-double-pointage-apres-midi'), 'main process should not rely on nonexistent dedicated double-pointage IPC channels');
console.log(`PASS: ${checks} double-pointage export wiring checks passed.`);
