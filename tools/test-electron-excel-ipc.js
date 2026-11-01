'use strict';
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
let checks = 0;
function check(ok, message) { checks += 1; if (!ok) throw new Error(message); }
for (const [channel, nextChannel] of [
  ['export-excel', 'function formatImportedBirthDate'],
  ['export-participants-excel', 'ipcMain.handle("open-tv"']
]) {
  const start = source.indexOf(`ipcMain.handle("${channel}"`);
  const end = source.indexOf(nextChannel, start + 1);
  check(start >= 0 && end > start, `${channel} handler should exist`);
  const handler = source.slice(start, end);
  check(handler.includes('try {') && handler.includes('catch (error)'), `${channel} should catch export failures`);
  check(handler.includes('showSaveDialogSync'), `${channel} should show a save dialog`);
  check(handler.includes('extensions: ["xlsx"]'), `${channel} should filter for Excel workbooks`);
  check(handler.includes('if (!filePath)') || handler.includes('if(!filePath)'), `${channel} should treat save-dialog cancellation normally`);
  check(/writeFile\s*\(\s*filePath/.test(handler), `${channel} should write the selected file`);
  check(handler.includes('showErrorBox('), `${channel} should report export failures visibly`);
  check(handler.includes('return false'), `${channel} should return a predictable failure/cancel result`);
}

const participantsStart = source.indexOf('ipcMain.handle("export-participants-excel"');
const deadLocalHelper = source.indexOf('function mainCat(cat)', participantsStart);
if (deadLocalHelper !== -1) throw new Error('unused local mainCat helper should not return');
if (source.includes('const cartonOrder = [') && source.indexOf('const cartonOrder = [') > participantsStart) {
  throw new Error('unused local cartonOrder should not return inside participant export');
}
console.log(`PASS: ${checks} Electron Excel export safety checks passed.`);
