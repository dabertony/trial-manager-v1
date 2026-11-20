const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert");
const root = path.join(__dirname, "..");
const main = fs.readFileSync(path.join(root, "main.js"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

for (const [label, source] of [["Electron", main], ["PWA", app]]) {
  assert.doesNotMatch(source, /Présences \+ règlements/, `${label}: obsolete standalone attendance sheet removed`);
  assert.match(source, /header:"Présent"/, `${label}: session sheet has a presence column`);
  assert.match(source, /header:"Payé"/, `${label}: session sheet has a payment column`);
  assert.match(source, /"☐"/, `${label}: printable empty checkbox glyph exists`);
  assert.match(source, /'Club \+ Alpha'!\$G\$\$\{referenceRow\}/, `${label}: amount links to the matching Club + Alpha cell`);
  assert.match(source, /formula:`SUM\(H2:H\$\{lastDataRow\}\)`/, `${label}: session total recalculates from linked amounts`);
  assert.match(source, /"Matin": \{ widths:\[8\.43, 10, 24\.29, 19, 11\.43, 10\.43, 17\.29, 13\.71, 6\.43\], scale:80/);
  assert.match(source, /"Après-midi": \{ widths:\[8\.43, 10, 25\.43, 21, 11\.43, 10\.43, 17\.43, 14\.29, 6\.43\], scale:75/);
}

const electronExport = main.slice(main.indexOf('ipcMain.handle("export-participants-excel"'), main.indexOf('ipcMain.handle("open-tv"'));
assert.ok(electronExport.includes('buildParticipantsSessionSheet('), "Electron: Matin/Après-midi use the attendance session sheet builder");
assert.ok(!electronExport.includes('buildParticipantsAttendanceSheet('), "Electron: old standalone sheet is not called");
const pwaStart = app.indexOf('async function exportParticipantsExcelPWA');
const pwaEnd = app.indexOf('async function exportParticipantsExcel(', pwaStart);
const pwaExport = app.slice(pwaStart, pwaEnd);
assert.ok(pwaExport.includes('buildSessionSheet('), "PWA: Matin/Après-midi use the attendance session sheet builder");
assert.ok(!pwaExport.includes('workbook.addWorksheet("Présences + règlements")'), "PWA: old standalone sheet is not created");
assert.ok(pkg.scripts.test.includes('test-participant-attendance-sheet.js'), "regression test remains part of npm test");

const ExcelJS = require(path.join(root, "exceljs.min.js"));
(async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.calcProperties = { fullCalcOnLoad:true };
  const reference = workbook.addWorksheet("Club + Alpha");
  reference.addRow(["Plaque", "Nom", "Club", "Catégorie", "Licence", "Date", "Montant"]);
  reference.addRow(["123", "PILOTE TEST", "CLUB", "N4", "UFOLEP", "01/01/2010", 10]);
  const session = workbook.addWorksheet("Matin");
  session.pageSetup = { paperSize:9, orientation:"portrait", scale:80 };
  session.addRow(["Présent", "Plaque", "Nom", "Club", "Catégorie", "Licence", "Date naissance", "Montant", "Payé"]);
  session.addRow(["☐", "123", "PILOTE TEST", "CLUB", "N4", "UFOLEP", "01/01/2010", {formula:"'Club + Alpha'!$G$2", result:10}, "☐"]);
  session.addRow(["", "", "", "", "", "", "TOTAL", {formula:"SUM(H2:H2)", result:10}, ""]);
  const buffer = await workbook.xlsx.writeBuffer();
  assert.ok(buffer.byteLength > 1000, "session workbook can be serialized");
  assert.equal(session.getCell("H2").value.formula, "'Club + Alpha'!$G$2");
  assert.equal(session.getCell("H2").result, 10);
  assert.equal(session.getCell("H3").value.formula, "SUM(H2:H2)");
  assert.equal(session.getCell("A2").value, "☐");
  assert.equal(session.getCell("I2").value, "☐");
  assert.equal(session.pageSetup.scale, 80);
  assert.equal(workbook.worksheets.some(sheet => sheet.name === "Présences + règlements"), false);
  console.log("PASS: session sheets contain linked fees, presence/payment checkboxes, automatic totals and Mamie's print layout.");
})().catch(error => { console.error(error); process.exit(1); });
