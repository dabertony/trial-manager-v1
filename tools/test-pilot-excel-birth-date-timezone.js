const fs = require("fs");
const path = require("path");
const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const main = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
function check(condition, message) { if (!condition) throw new Error(message); }

// Both PWA and Electron pilot Excel exports must build birth dates at UTC midnight.
check(app.includes("return new Date(Date.UTC(\n          year,\n          month - 1,\n          day\n        ));"), "PWA pilot export uses UTC date construction");
check(main.includes("return new Date(Date.UTC(\n          year,\n          month - 1,\n          day\n        ));"), "Electron pilot export uses UTC date construction");

// Reproduce ExcelJS's timestamp-based serial conversion in the French timezone.
const previousTZ = process.env.TZ;
process.env.TZ = "Europe/Paris";
const localMidnight = new Date(2025, 1, 5);
const utcMidnight = new Date(Date.UTC(2025, 1, 5));
const excelSerial = date => date.getTime() / 86400000 + 25569;
const expectedSerial = Date.UTC(2025, 1, 5) / 86400000 + 25569;
check(excelSerial(localMidnight) !== expectedSerial, "regression fixture reproduces local-midnight offset");
check(excelSerial(utcMidnight) === expectedSerial, "UTC date keeps 05/02/2025 in Excel");
if (previousTZ === undefined) delete process.env.TZ; else process.env.TZ = previousTZ;
console.log("PASS: pilot Excel birth dates are timezone-safe in Electron and PWA exports.");
