const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert");
const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "main.js"), "utf8");
const ExcelJS = require(path.join(root, "exceljs.min.js"));

const start = source.indexOf("function configureParticipantsPrintLayout(");
const end = source.indexOf("function buildParticipantsSimpleSheet(", start);
assert.ok(start >= 0 && end > start, "export sheet helpers are present");
const helpers = new Function(`${source.slice(start, end)}\nreturn { configureParticipantsPrintLayout, buildParticipantsClubSheet, buildParticipantsSessionSheet };`)();

(async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.calcProperties = { fullCalcOnLoad:true };
  const pilots = [
    { id:"pilot-1", plaque:"123", name:"ALPHA TEST", club:"CLUB A", cat:"N4", lic:"UFOLEP", birthDate:"2010-01-01" },
    { id:"pilot-2", plaque:"456", name:"BETA TEST", club:"CLUB B", cat:"N3", lic:"FFC", birthDate:"2011-02-02" },
    { id:"pilot-3", plaque:"789", name:"GAMMA TEST", club:"CLUB A", cat:"N5", lic:"NL", birthDate:"2012-03-03" }
  ];
  const fees = { ufolep:10, ffc:18, nl:22 };
  const amountRows = new Map();
  helpers.buildParticipantsClubSheet(workbook, pilots, {}, fees, amountRows);
  const morning = helpers.buildParticipantsSessionSheet(workbook, "Matin", [pilots[0], pilots[2]], {}, amountRows, fees);
  const afternoon = helpers.buildParticipantsSessionSheet(workbook, "Après-midi", [pilots[1]], {}, amountRows, fees);

  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ["Club + Alpha", "Matin", "Après-midi"]);
  assert.equal(morning.getCell("H2").value.formula, `'Club + Alpha'!$G$${amountRows.get("pilot-1")}`);
  assert.equal(morning.getCell("H3").value.formula, `'Club + Alpha'!$G$${amountRows.get("pilot-3")}`);
  assert.equal(afternoon.getCell("H2").value.formula, `'Club + Alpha'!$G$${amountRows.get("pilot-2")}`);
  assert.equal(morning.getCell("H2").result, 10);
  assert.equal(morning.getCell("H3").result, 22);
  assert.equal(morning.getCell("H4").value.formula, "SUM(H2:H3)");
  assert.equal(morning.getCell("H4").result, 32);
  assert.equal(afternoon.getCell("H3").value.formula, "SUM(H2:H2)");
  assert.equal(afternoon.getCell("H3").result, 18);
  assert.equal(morning.getCell("A2").value, "☐");
  assert.equal(morning.getCell("I2").value, "☐");
  assert.equal(morning.pageSetup.scale, 80);
  assert.equal(afternoon.pageSetup.scale, 75);

  // Simulate Mamie's change in the reference tab: formulas remain pointed at that exact source cell.
  const sourceAmountRow = amountRows.get("pilot-1");
  workbook.getWorksheet("Club + Alpha").getCell(sourceAmountRow, 7).value = 15;
  assert.equal(morning.getCell("H2").value.formula, `'Club + Alpha'!$G$${sourceAmountRow}`);

  const buffer = await workbook.xlsx.writeBuffer();
  const reopened = new ExcelJS.Workbook();
  await reopened.xlsx.load(buffer);
  assert.equal(reopened.getWorksheet("Matin").getCell("H2").value.formula, `'Club + Alpha'!$G$${sourceAmountRow}`);
  assert.equal(reopened.getWorksheet("Matin").getCell("H4").value.formula, "SUM(H2:H3)");
  console.log("PASS: session fee formulas point to the exact pilot row in Club + Alpha; totals and print settings survive XLSX serialization.");
})().catch(error => { console.error(error); process.exit(1); });
