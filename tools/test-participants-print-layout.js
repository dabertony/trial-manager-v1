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

for (const [label, source, start, end] of [
  ["Electron", main, "function configureParticipantsPrintLayout(", "function buildParticipantsClubSheet("],
  ["PWA", app, "function configureParticipantsPrintLayout(", "function styleHeader("]
]) {
  const helper = section(source, start, end);
  assert.match(helper, /"Club \+ Alpha":\s*\{\s*widths:\[10, 30\.14, 24\.71, 17\.71, 15\.71, 20, 18\],\s*scale:70/);
  assert.match(helper, /"Catégorie \+ Alpha":\s*\{\s*widths:\[10, 28\.57, 26\.285, 15, 14\.855, 17\.57\],\s*scale:85/);
  assert.match(helper, /"Matin":\s*\{\s*widths:\[10, 26\.14, 25, 15, 15\.14, 21\],\s*scale:85/);
  assert.match(helper, /"Après-midi":\s*\{\s*widths:\[10, 30\.855, 25\.14, 15\.71, 9\.14, 19\.285\],\s*scale:85/);
  assert.match(helper, /paperSize:\s*9/);
  assert.match(helper, /orientation:\s*["']portrait["']/);
  assert.match(helper, /scale:\s*layout\.scale/);
  assert.match(helper, /left:0\.315, right:0\.315, top:0\.748, bottom:0\.748/);
}

for (const [label, source] of [["Electron", main], ["PWA", app]]) {
  assert.match(source, /row\.height = row\.number === 1 \? 30 : 18\.75/ , `${label}: Mamie's row heights`);
  assert.match(source, /cell\.font = \{ \.\.\.cell\.font, size:12 \}/, `${label}: 12pt font`);
  assert.match(source, /pageSetup\.printArea = `A1:/, `${label}: explicit print area`);
}

const ExcelJS = require(path.join(root, "exceljs.min.js"));
(async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Club + Alpha");
  sheet.getColumn(1).width = 10;
  sheet.pageSetup = { paperSize:9, orientation:"portrait", scale:70, margins:{left:0.315,right:0.315,top:0.748,bottom:0.748,header:0.315,footer:0.315} };
  sheet.pageSetup.printArea = "A1:G12";
  const buffer = await workbook.xlsx.writeBuffer();
  assert.equal(sheet.pageSetup.scale, 70);
  assert.equal(sheet.pageSetup.orientation, "portrait");
  assert.equal(sheet.pageSetup.printArea, "A1:G12");
  assert.ok(buffer.byteLength > 1000);
  console.log("Participants print layout: checks passed.");
})().catch(error => { console.error(error); process.exit(1); });
