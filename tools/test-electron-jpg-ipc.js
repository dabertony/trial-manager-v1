'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const match = source.match(/ipcMain\.handle\("export-jpg", async \(event, options = \{\}\) => \{[\s\S]*?\n\}\);/);
if (!match) throw new Error('JPG IPC export handler was not found');
let checks = 0;
function check(ok, message) { checks++; if (!ok) throw new Error(message); }
async function run({ savePath = '/tmp/ranking.jpg', dataUrl = 'data:image/jpeg;base64,SlBH', writeError = null } = {}) {
  let handler;
  const errors = [];
  const written = [];
  const dialogs = [];
  const sandbox = {
    ipcMain: { handle: (name, callback) => { if (name !== 'export-jpg') throw new Error('Unexpected handler'); handler = callback; } },
    dialog: {
      showSaveDialogSync: (_window, options) => { dialogs.push(options); return savePath; },
      showErrorBox: (title, message) => errors.push({ title, message })
    },
    mainWindow: {},
    fs: { writeFileSync: (file, data) => { if (writeError) throw writeError; written.push({ file, data: data.toString() }); } },
    console: { error: () => {} },
    Buffer,
    sanitizeSuggestedFileName: (value, fallback = 'Document') => String(value || fallback).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
  };
  vm.runInNewContext(match[0], sandbox);
  const result = await handler({}, { fileName: 'Classement_N1.jpg', dataUrl });
  return { result, errors, written, dialogs };
}
(async () => {
  let r = await run();
  check(r.result === true, 'valid JPG export should return true');
  check(r.written.length === 1 && r.written[0].file === '/tmp/ranking.jpg', 'decoded JPG bytes should be written to the selected path');
  check(r.written[0].data === 'JPG', 'base64 JPEG data should be decoded');
  check(r.dialogs[0].filters[0].extensions.includes('jpg'), 'save dialog should offer JPG');

  r = await run({ savePath: null });
  check(r.result === false && r.errors.length === 0, 'cancelling JPG save should return false without an error');
  check(r.written.length === 0, 'cancelled JPG export must not write a file');

  r = await run({ dataUrl: 'data:image/png;base64,UE5H' });
  check(r.result === false && r.errors.length === 1, 'non-JPEG data must be rejected');
  check(r.written.length === 0, 'invalid image data must not be written');

  r = await run({ writeError: new Error('disk full') });
  check(r.result === false && r.errors.length === 1, 'write failure should be reported');
  console.log(`PASS: ${checks} Electron JPG IPC checks passed.`);
})().catch(error => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
