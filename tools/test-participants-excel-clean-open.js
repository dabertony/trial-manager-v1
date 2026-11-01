const fs = require("fs");
const path = require("path");
const assert = require("assert");
const root = path.join(__dirname, "..");
const main = fs.readFileSync(path.join(root, "main.js"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

function section(source, start, end) {
  const a = source.indexOf(start);
  assert.notEqual(a, -1, `missing section: ${start}`);
  const b = source.indexOf(end, a + start.length);
  assert.notEqual(b, -1, `missing section end: ${end}`);
  return source.slice(a, b);
}

const electronExport = section(main, 'ipcMain.handle("export-participants-excel"', 'ipcMain.handle("open-tv"');
const pwaExport = section(app, 'async function exportParticipantsExcelPWA(', '\nasync function exportParticipantsExcel(');
for (const [label, source] of [["Electron", main], ["PWA", app]]) {
  const exportBlock = label === "Electron" ? electronExport : pwaExport;
  assert.match(exportBlock, /calcProperties\s*=\s*\{[\s\S]*?fullCalcOnLoad:\s*false/ , `${label}: Excel must not be forced to recalculate the whole workbook on open`);
  const clubSheet = label === "Electron"
    ? section(source, 'function buildParticipantsClubSheet(', 'function buildParticipantsSimpleSheet(')
    : section(source, 'async function exportParticipantsExcelPWA(', '\nasync function exportParticipantsExcel(');
  const formulaCount = (clubSheet.match(/formula:/g) || []).length;
  const cachedCount = (clubSheet.match(/result:\s*0/g) || []).length;
  assert.equal(formulaCount, 3, `${label}: expected 3 participant total formulas`);
  assert.equal(cachedCount, 3, `${label}: each participant total formula needs an initial cached result`);
}

// Confirm ExcelJS serializes a formula with a cached result and the no-full-recalc flag.
const ExcelJS = require(path.join(root, "exceljs.min.js"));
(async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.calcProperties = { fullCalcOnLoad: false };
  const sheet = workbook.addWorksheet("Club + Alpha");
  sheet.addRow(["Montant"]);
  sheet.addRow([{ formula: "SUM(A1:A1)", result: 0 }]);
  const buffer = await workbook.xlsx.writeBuffer();
  const formula = sheet.getCell("A2").value;
  assert.equal(formula.formula, "SUM(A1:A1)");
  assert.equal(sheet.getCell("A2").result, 0);
  assert.equal(workbook.calcProperties.fullCalcOnLoad, false);
  assert.ok(buffer.byteLength > 1000, "ExcelJS must produce a non-empty XLSX workbook");
  console.log("Participants Excel clean-open: 8 checks passed.");
})().catch(error => { console.error(error); process.exit(1); });
