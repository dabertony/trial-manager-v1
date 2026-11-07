'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const generator = source.match(/let pilotIdSequence = 0;[\s\S]*?function findDuplicatePilotIds\(pilots\)\s*\{[\s\S]*?\n\}/);
if (!generator) throw new Error('Unique pilot ID generator and duplicate checker must exist');
const sandbox = {
  state: { pilots: [] },
  globalThis: { crypto: { randomUUID: () => 'same-test-uuid' } },
  Date,
  Math,
  Set,
  Array,
  Uint8Array
};
vm.runInNewContext(`${generator[0]}\nthis.createId = generatePilotId; this.findDuplicates = findDuplicatePilotIds;`, sandbox);
const ids = [];
for (let i = 0; i < 500; i++) {
  const id = sandbox.createId();
  if (ids.includes(id)) throw new Error(`Duplicate generated at item ${i}: ${id}`);
  ids.push(id);
  sandbox.state.pilots.push({ id });
}
if (sandbox.findDuplicates(sandbox.state.pilots).length) throw new Error('Generated pilot IDs are not unique');
const duplicates = sandbox.findDuplicates([{id:'A'}, {id:'B'}, {id:'A'}, {id:'B'}, {id:'C'}]);
if (duplicates.length !== 2 || !duplicates.includes('A') || !duplicates.includes('B')) throw new Error('Duplicate ID detector failed');
const importStart = source.indexOf('function processImportedPilots(pilots)');
const importEnd = source.indexOf('\nfunction ', importStart + 10);
const importCode = source.slice(importStart, importEnd < 0 ? source.length : importEnd);
if (!importCode.includes('generatePilotId()')) throw new Error('Excel import must use the unique ID generator');
const addStart = source.indexOf('function addPilot()');
const addEnd = source.indexOf('\nfunction ', addStart + 10);
const addCode = source.slice(addStart, addEnd < 0 ? source.length : addEnd);
if (!addCode.includes('generatePilotId()')) throw new Error('Manual pilot creation must use the unique ID generator');
const backupStart = source.indexOf('function handleBackupImport(event)');
const backupEnd = source.indexOf('\nfunction ', backupStart + 10);
const backupCode = source.slice(backupStart, backupEnd < 0 ? source.length : backupEnd);
if (!backupCode.includes('findDuplicatePilotIds(data.pilots)')) throw new Error('Backup restore must reject duplicate pilot IDs');
if (!backupCode.includes('INVALID_PILOT_IDS') || !backupCode.includes('typeof p.id !== \"string\"')) throw new Error('Backup restore must reject missing or invalid pilot IDs');
if (backupCode.indexOf('findDuplicatePilotIds(data.pilots)') > backupCode.indexOf('askConfirm(')) throw new Error('Duplicate IDs must be checked before replacing current data');
console.log('PASS: 500 sequential pilot creations with repeated UUID source, Excel/manual paths, duplicate detection and backup protection.');
