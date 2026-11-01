'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const app = fs.readFileSync('app.js', 'utf8');
const helperMatch = app.match(/function downloadGeneratedBlob\(blob, fileName\)\s*\{[\s\S]*?\n\}/);
assert.ok(helperMatch, 'shared generated-file download helper must exist');
const helper = helperMatch[0];
assert.match(helper, /URL\.createObjectURL\(blob\)/, 'helper must create an object URL');
assert.match(helper, /link\.download\s*=\s*fileName/, 'helper must preserve the requested filename');
assert.match(helper, /document\.body\.appendChild\(link\)[\s\S]*?link\.click\(\)[\s\S]*?link\.remove\(\)/, 'anchor must be attached before click and removed afterwards');
assert.match(helper, /setTimeout\(\(\)\s*=>\s*URL\.revokeObjectURL\(url\),\s*5000\)/, 'URL must remain valid briefly for mobile downloads');
for (const [name, start, end] of [
  ['pilot Excel export', 'async function exportPilotsExcelPWA()', 'async function exportPilotsExcel()'],
  ['participant Excel export', 'async function exportParticipantsExcelPWA(', 'async function exportParticipantsExcel('],
  ['backup export', 'function exportBackup()', 'function importBackup()']
]) {
  const from = app.indexOf(start);
  assert.notEqual(from, -1, `${name} function must exist`);
  const to = app.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `${name} function boundary must exist`);
  assert.match(app.slice(from, to), /downloadGeneratedBlob\(blob,/, `${name} must use the shared helper`);
}
console.log('PASS: shared generated-file download checks passed (10 checks).');
