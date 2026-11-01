const fs = require("fs");
const assert = require("assert");

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("app.js", "utf8");

assert.match(html, /id=["']backupFile["']/,
  "The hidden backup-file input must exist in index.html.");
assert.match(html, /onchange=["']handleBackupImport\(event\)["']/,
  "The backup-file input must call handleBackupImport(event).");
assert.match(app, /function\s+handleBackupImport\s*\(event\)/,
  "app.js must define the backup import handler.");
assert.match(app, /getElementById\(["']backupFile["']\)/,
  "importBackup() must target the same hidden file input.");

console.log("PASS: backup import input, handler and trigger are wired together.");
