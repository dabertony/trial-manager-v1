'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
function check(ok, message) { if (!ok) throw new Error(message); }
check(!/\bfunction\s+plaqueNumber\s*\(/.test(main), 'unused main-process plaqueNumber helper should stay removed');
check(/function\s+buildCartonsSheet\s*\(/.test(main), 'Electron carton workbook builder should remain available');
check(/function\s+buildCartonsSheetPWA\s*\(/.test(app), 'PWA carton workbook builder should remain available');
check(/participantPlates|plaque/.test(main), 'main process should retain actual plate-number handling');
console.log('PASS: unused Electron plaque helper removed; carton builders and plate handling retained (4 checks).');
