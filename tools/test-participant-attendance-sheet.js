const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert");
const root = path.join(__dirname, "..");
const main = fs.readFileSync(path.join(root, "main.js"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

for (const [label, source] of [["Electron", main], ["PWA", app]]) {
  assert.match(source, /Présences \+ règlements/, `${label}: new worksheet exists`);
  assert.match(source, /header:"Prés\.\\nmatin"/, `${label}: morning attendance column is first`);
  assert.match(source, /header:"Payé"/, `${label}: payment checkbox column exists`);
  assert.match(source, /"☐"/, `${label}: printable empty checkbox glyph exists`);
  assert.match(source, /fitToPage:true,\s*fitToWidth:1,\s*fitToHeight:0/, `${label}: fit to one page wide, multiple pages tall`);
  assert.match(source, /width:11\.5\s*\},\s*\{\s*header:"Licence"[^}]*width:10\.5/, `${label}: category and licence columns narrowed`);
}

const electronExport = main.slice(main.indexOf('ipcMain.handle("export-participants-excel"'), main.indexOf('ipcMain.handle("open-tv"'));
assert.ok(electronExport.indexOf('buildParticipantsClubSheet(') < electronExport.indexOf('buildParticipantsAttendanceSheet('), "Electron: attendance sheet follows fee sheet");
assert.ok(electronExport.indexOf('buildParticipantsAttendanceSheet(') < electronExport.indexOf('// CATÉGORIE + ALPHA'), "Electron: attendance sheet precedes category/alpha");
const pwaStart = app.indexOf('async function exportParticipantsExcelPWA');
const pwaEnd = app.indexOf('async function exportParticipantsExcel(', pwaStart);
const pwaExport = app.slice(pwaStart, pwaEnd);
assert.ok(pwaExport.indexOf('workbook.addWorksheet(\n          "Club + Alpha"') < pwaExport.indexOf('workbook.addWorksheet("Présences + règlements")'), "PWA: attendance sheet follows fee sheet");
assert.ok(pwaExport.indexOf('workbook.addWorksheet("Présences + règlements")') < pwaExport.indexOf('buildSimpleSheet(\n      \"Catégorie + Alpha\"'), "PWA: attendance sheet precedes category/alpha");
assert.ok(pwaExport.includes('getPilotEngagementFee(p)'), "PWA: attendance sheet reuses the same participant fee logic");
assert.ok(pkg.scripts.test.includes('test-participant-attendance-sheet.js'), "new regression test is part of npm test");

const ExcelJS = require(path.join(root, "exceljs.min.js"));
(async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Présences + règlements");
  sheet.pageSetup = { paperSize:9, orientation:"portrait", fitToPage:true, fitToWidth:1, fitToHeight:0 };
  sheet.addRow(["Prés.\nmatin", "Plaque", "Nom", "Club", "Catégorie", "Licence", "Date naissance", "Montant", "Payé"]);
  sheet.addRow(["☐", "123", "PILOTE TEST", "CLUB", "N4", "UFOLEP", "01/01/2010", 10, "☐"]);
  const buffer = await workbook.xlsx.writeBuffer();
  assert.ok(buffer.byteLength > 1000, "attendance workbook can be serialized");
  assert.equal(sheet.pageSetup.fitToWidth, 1);
  assert.equal(sheet.pageSetup.fitToHeight, 0);
  assert.equal(sheet.getCell("A2").value, "☐");
  assert.equal(sheet.getCell("I2").value, "☐");
  console.log("PASS: participant attendance and payment sheet, tab order, printable checkboxes and page width.");
})().catch(error => { console.error(error); process.exit(1); });
