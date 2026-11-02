'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const match = source.match(/function printPDFPWA\(fileName, forceLight = false\)\s*\{[\s\S]*?\n\}/);
if (!match) throw new Error('PWA print lifecycle helper not found');
let checks = 0;
function check(ok, message) { checks++; if (!ok) throw new Error(message); }
const listeners = new Map();
let printCalls = 0;
const document = {
  title: 'Trial Manager',
  body: { classList: { contains: () => false, add() {}, remove() {} } }
};
const window = {
  addEventListener(name, fn) { listeners.set(name, fn); },
  removeEventListener(name, fn) { if (listeners.get(name) === fn) listeners.delete(name); },
  print() { printCalls++; }
};
const sandbox = { document, window, showAppNotice() {} };
vm.runInNewContext(`${match[0]}\nthis.runPrint = printPDFPWA;`, sandbox);
(async () => {
  const pending = sandbox.runPrint('Classement.pdf');
  let settled = false;
  pending.then(() => { settled = true; });
  await Promise.resolve();
  check(printCalls === 1, 'window.print must be invoked synchronously from the export click path');
  check(!settled, 'PWA export must remain pending while the native print sheet is open');
  check(document.title === 'Classement', 'document title must be prepared for printing');
  const afterprint = listeners.get('afterprint');
  check(typeof afterprint === 'function', 'afterprint cleanup listener must be registered');
  afterprint();
  const result = await pending;
  check(result === true && settled, 'export must complete after the native print sheet closes');
  check(document.title === 'Trial Manager', 'document title must be restored after printing');
  check(!listeners.has('afterprint'), 'afterprint listener must be removed after cleanup');

  const direct = source.match(/async function exportDoublePointageDirect\(competitionIndex, showSheet, printSheet\)\s*\{[\s\S]*?\n\}/);
  check(!!direct, 'direct double-pointage export helper must exist');
  check(/window\.api\s*&&\s*typeof window\.api\.exportPDF\s*===\s*"function"\s*&&\s*typeof requestAnimationFrame/.test(direct[0]), 'only Electron may wait for an animation frame before printing');
  check(/return await printSheet\(\);/.test(direct[0]), 'menu restoration must wait for print completion');
  console.log(`PASS: ${checks} iOS/PWA PDF print lifecycle checks passed.`);
})().catch(error => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
