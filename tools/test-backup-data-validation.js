'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const match = source.match(/function isValidBackupData\(data\)\s*\{[\s\S]*?\n\}/);
if (!match) throw new Error('Backup data validator is missing');
const sandbox = {};
vm.runInNewContext(`${match[0]}\nthis.validate = isValidBackupData;`, sandbox);
const valid = { pilots: [], clubs: [], competitions: [] };
const cases = [
  ['complete empty backup', valid, true],
  ['legacy backup without clubs', { pilots: [], competitions: [] }, true],
  ['null data', null, false],
  ['array root', [], false],
  ['missing pilots', { competitions: [] }, false],
  ['pilots must be an array', { pilots: {}, competitions: [] }, false],
  ['competitions must be an array', { pilots: [], competitions: {} }, false],
  ['clubs must be an array when present', { pilots: [], clubs: {}, competitions: [] }, false],
  ['sort mode must be text', { pilots: [], competitions: [], sortPilotsMode: 2 }, false],
  ['optional sort modes remain optional', { pilots: [], competitions: [], sortEntryMode: 'name' }, true]
];
for (const [label, data, expected] of cases) {
  const actual = sandbox.validate(data);
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}
const handlerStart = source.indexOf('function handleBackupImport(event)');
const handlerEnd = source.indexOf('\nfunction ', handlerStart + 10);
const handler = source.slice(handlerStart, handlerEnd < 0 ? source.length : handlerEnd);
if (!handler.includes('isValidBackupData(data)')) throw new Error('Backup import handler must validate data before confirmation and state replacement');
if (handler.indexOf('isValidBackupData(data)') > handler.indexOf('askConfirm(')) throw new Error('Backup validation must run before asking to replace current data');
console.log(`PASS: ${cases.length} backup validation cases and import-order checks passed.`);
