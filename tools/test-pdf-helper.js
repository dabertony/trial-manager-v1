'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const sharedMatch = source.match(/async function exportPDFDocument\(fileName, landscape = false\)\s*\{[\s\S]*?\n\}/);
const appleHelperMatch = source.match(/function isAppleMobilePrintBrowser\(\)\s*\{[\s\S]*?\n\}/);
const pwaPrintMatch = source.match(/function printPDFPWA\(fileName, forceLight = false\)\s*\{[\s\S]*?\n\}/);
const pointageMatch = source.match(/async function printDoublePointagePDF\(sheetName, landscape = false\)\s*\{[\s\S]*?\n\}/);
if (!sharedMatch) throw new Error('Shared PDF document export flow not found');
if (!pointageMatch) throw new Error('Shared double-pointage PDF helper not found');
if (!pwaPrintMatch) throw new Error('PWA print helper not found');
let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(message);
}
async function runExport(environment, fileName = 'Test.pdf', landscape = false) {
  const sandbox = {
    window: environment.window,
    printPDFPWA: environment.printPDFPWA || (() => {}),
    showAppNotice: environment.showAppNotice || (() => {})
  };
  vm.runInNewContext(`${sharedMatch[0]}\nthis.runHelper = exportPDFDocument;`, sandbox);
  return sandbox.runHelper(fileName, landscape);
}
(async () => {
  const calls = [];
  const result = await runExport({ window: { api: { exportPDF: async options => calls.push(options) }, print: () => {} } }, 'Classement.pdf', true);
  check(calls.length === 1, 'Electron export should be called once');
  check(calls[0].fileName === 'Classement.pdf', 'Electron filename should be preserved');
  check(calls[0].landscape === true, 'landscape preference should be passed through');
  check(result === true, 'successful Electron dispatch should report handled');

  const cancelledResult = await runExport({
    window: { api: { exportPDF: async () => false }, print: () => {} }
  }, 'Annule.pdf', true);
  check(cancelledResult === false, 'cancelling the Electron save dialog must not be reported as a successful export');

  const legacyResult = await runExport({
    window: { api: { exportPDF: async () => undefined }, print: () => {} }
  }, 'Legacy.pdf', true);
  check(legacyResult === true, 'an API implementation without an explicit result should remain compatible');

  let browserPrint = '';
  const browserResult = await runExport({ window: { print: () => {} }, printPDFPWA: fileName => { browserPrint = fileName; } }, 'Resultats.pdf', false);
  check(browserPrint === 'Resultats.pdf', 'browser print fallback should preserve filename');
  check(browserResult === true, 'browser fallback should report handled');

  // Chrome/Edge must retain the requested double-pointage filename; only iOS
  // uses an empty title to avoid overriding the name in its system print sheet.
  const printCases = [
    { apple: false, expected: 'Double_Pointage_Matin_Test_26-10-2026' },
    { apple: true, expected: '' }
  ];
  for (const item of printCases) {
    const listeners = {};
    const document = { title: 'index.html', body: { classList: { contains: () => false, remove: () => {}, add: () => {} } }, getElementById: () => null };
    const nav = item.apple ? { userAgent: 'iPhone' } : { userAgent: 'Chrome' };
    const sandbox = { document, navigator: nav, window: { print: () => {}, addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener: () => {} } };
    vm.runInNewContext(`${appleHelperMatch[0]}\n${pwaPrintMatch[0]}\nthis.runPrint = printPDFPWA;`, sandbox);
    sandbox.runPrint('Double_Pointage_Matin_Test_26-10-2026.pdf', false);
    check(document.title === item.expected, `${item.apple ? 'iOS' : 'Chrome/Edge'} double-pointage print title should be correct`);
  }

  let noticeMessage = '';
  const unavailableResult = await runExport({ window: {}, showAppNotice: message => { noticeMessage = message; } });
  check(noticeMessage.includes("n'est pas disponible"), 'unavailable export should show a non-blocking notice');
  check(unavailableResult === false, 'unavailable export should report not handled');

  let pointageCalls = [];
  const pointageSandbox = {
    window: {
      currentExportInfo: { competitionName: 'Test', competitionDate: '2026-10-26' },
      api: { exportPDF: async options => pointageCalls.push(options) },
      print: () => {}
    },
    formatDateForFile: date => date === '2026-10-26' ? '26-10-2026' : 'date',
    exportPDFDocument: async (fileName, landscape) => {
      pointageCalls.push({ fileName, landscape, delegated: true });
    }
  };
  vm.runInNewContext(`${appleHelperMatch[0]}\n${pointageMatch[0]}\nthis.runPointage = printDoublePointagePDF;`, pointageSandbox);
  await pointageSandbox.runPointage('Matin');
  check(pointageCalls.length === 1, 'double-pointage should delegate to shared PDF flow once');
  check(pointageCalls[0].fileName === 'Double_Pointage_Matin_Test_26-10-2026.pdf', 'double-pointage filename should remain unchanged');
  check(pointageCalls[0].landscape === false, 'double-pointage should remain portrait by default');

  let missingInfoCalls = 0;
  const missingInfoSandbox = {
    window: {},
    formatDateForFile: () => 'date',
    exportPDFDocument: async () => { missingInfoCalls += 1; }
  };
  vm.runInNewContext(`${appleHelperMatch[0]}\n${pointageMatch[0]}\nthis.runPointage = printDoublePointagePDF;`, missingInfoSandbox);
  await missingInfoSandbox.runPointage('Matin');
  check(missingInfoCalls === 0, 'missing export metadata should not start an export');
  console.log(`PASS: ${checks} shared PDF export checks passed.`);
})().catch(error => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
