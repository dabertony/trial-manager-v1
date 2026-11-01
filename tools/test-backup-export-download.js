const fs = require("node:fs");
const assert = require("node:assert/strict");
const app = fs.readFileSync("app.js", "utf8");
const match = app.match(/function exportBackup\(\)\s*\{[\s\S]*?\n\}/);
assert.ok(match, "exportBackup() must exist");
const fn = match[0];
assert.match(fn, /JSON\.stringify\(data,\s*null,\s*2\)/,
  "Backup export must remain readable JSON");
assert.match(fn, /downloadGeneratedBlob\(blob,\s*[\s\S]*?trial_manager_backup_/,
  "Backup export must use the shared download lifecycle and preserve its filename");
assert.ok(!/URL\.createObjectURL/.test(fn),
  "Backup export should delegate object URL handling to the shared helper");
console.log("PASS: backup export download lifecycle checks passed.");
