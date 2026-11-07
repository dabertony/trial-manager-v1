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
  assert.match(exportBlock, /calcProperties\s*=\s*\{[\s\S]*?fullCalcOnLoad:\s*true/ , `${label}: Excel must recalculate formulas on open`);
  const clubSheet = label === "Electron"
    ? section(source, 'function buildParticipantsClubSheet(', 'function buildParticipantsSimpleSheet(')
    : section(source, 'async function exportParticipantsExcelPWA(', '\nasync function exportParticipantsExcel(');
  const formulaCount = (clubSheet.match(/formula:/g) || []).length;
  assert.equal(formulaCount, 3, `${label}: expected 3 participant total formulas`);
  assert.match(clubSheet, /function sumParticipantAmounts\([\s\S]*?return Number\(total\.toFixed\(2\)\)/, `${label}: subtotal cached values must be calculated from participant amounts`);
  assert.match(clubSheet, /function sumSubtotalAmounts\([\s\S]*?return Number\(rowNumbers\.reduce\([\s\S]*?toFixed\(2\)\)/, `${label}: grand total cached value must be calculated from club subtotals`);
  assert.doesNotMatch(clubSheet, /result:\s*0\b/, `${label}: total formulas must not be initialized with zero`);
}

// Confirm ExcelJS serializes a formula with a cached result and requests recalculation on open.
const ExcelJS = require(path.join(root, "exceljs.min.js"));
(async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.calcProperties = { fullCalcOnLoad: true };
  const sheet = workbook.addWorksheet("Club + Alpha");
  sheet.addRow(["Montant"]);
  sheet.addRow([12]);
  sheet.addRow([{ formula: "SUM(A2:A2)", result: 12 }]);
  const buffer = await workbook.xlsx.writeBuffer();
  const formula = sheet.getCell("A3").value;
  assert.equal(formula.formula, "SUM(A2:A2)");
  assert.equal(sheet.getCell("A3").result, 12);
  assert.equal(workbook.calcProperties.fullCalcOnLoad, true);
  assert.ok(buffer.byteLength > 1000, "ExcelJS must produce a non-empty XLSX workbook");
  console.log("Participants Excel clean-open: 8 checks passed.");
})().catch(error => { console.error(error); process.exit(1); });
