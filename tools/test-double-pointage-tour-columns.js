const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert");
const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");

const helperStart = app.indexOf("function getDoublePointageTourCount(");
const helperEnd = app.indexOf("function showDoublePointageMatin(", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "dynamic tour helpers are present");
const helpers = new Function(`${app.slice(helperStart, helperEnd)}\nreturn { getDoublePointageTourCount, buildDoublePointageColumnGroup, buildDoublePointageTourHeaders, buildDoublePointageTourCells };`)();

for (const tours of [1, 2, 3, 4, 5, 6]) {
  const count = helpers.getDoublePointageTourCount({ tours });
  const colgroup = helpers.buildDoublePointageColumnGroup(count);
  const headers = helpers.buildDoublePointageTourHeaders(count);
  const cells = helpers.buildDoublePointageTourCells(count);
  assert.equal((colgroup.match(/<col /g) || []).length, 3 + tours, `${tours} tours should create fixed identity columns plus one column per tour`);
  const colWidths = [...colgroup.matchAll(/width:([0-9.]+)%/g)].map(match => Number(match[1]));
  assert.deepEqual(colWidths.slice(0, 3), [10, 38, 16], `${tours} tours must not change Plaque, Nom or Catégorie widths`);
  assert.equal((headers.match(/<th /g) || []).length, tours, `${tours} tours should create ${tours} headers`);
  assert.equal((headers.match(/Tour \d+/g) || []).length, tours, `${tours} tours should be numbered consecutively`);
  assert.equal((cells.match(/<td><\/td>/g) || []).length, tours, `${tours} tours should create ${tours} blank score cells`);
  const widths = [...headers.matchAll(/width:([0-9.]+)%/g)].map(match => Number(match[1]));
  assert.ok(Math.abs(widths.reduce((sum, width) => sum + width, 0) - 36) < 0.01, `${tours} tour columns should use the same reserved 36% of page width`);
  assert.deepEqual(colWidths.slice(3), Array(tours).fill(Number((36 / tours).toFixed(4))), `${tours} tours share only the reserved tour area`);
}

for (const fn of ["showDoublePointageMatin", "showDoublePointageApresMidi", "showDoublePointageToutesCategories"]) {
  const start = app.indexOf(`function ${fn}(i){`);
  const end = app.indexOf("\nfunction ", start + 12);
  const section = app.slice(start, end < 0 ? app.length : end);
  assert.match(section, /const tourCount = getDoublePointageTourCount\(c\)/, `${fn} reads the competition's configured tour count`);
  assert.match(section, /columnCount:3 \+ tourCount/, `${fn} gives the repeating print header the correct colspan`);
  assert.match(section, /buildDoublePointageColumnGroup\(tourCount\)/, `${fn} applies fixed first-three column widths and dynamic tour widths`);
  assert.match(section, /buildDoublePointageTourHeaders\(tourCount\)/, `${fn} creates dynamic tour headings`);
  assert.equal((section.match(/buildDoublePointageTourCells\(tourCount\)/g) || []).length, 2, `${fn} creates dynamic score cells for pilots and blank rows`);
  assert.doesNotMatch(section, /Tour 1|Tour 2|Tour 3/, `${fn} has no hard-coded tour headings`);
}
assert.match(app, /<th colspan="\$\{columnCount\}">/, "repeating print header uses dynamic colspan");
assert.match(css, /\.double-pointage\s*\{\s*width:100%;\s*table-layout:fixed;/, "double-pointage table stays within page width");
console.log("PASS: double-pointage columns follow competition tours (1–6 tested), with matching blank rows and page-width layout.");
