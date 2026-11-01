'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const match = source.match(/ipcMain\.handle\("export-pdf", async \(event, options = \{\}\) => \{[\s\S]*?\n\}\);/);
if (!match) throw new Error('PDF IPC export handler was not found');
let checks = 0;
function check(ok, message) { checks++; if (!ok) throw new Error(message); }
async function run({ savePath = '/tmp/result.pdf', printError = null, writeError = null } = {}) {
  let handler;
  const errors = [];
  const written = [];
  const calls = { print: [], dialog: [] };
  const sandbox = {
    ipcMain: { handle: (name, callback) => { if (name !== 'export-pdf') throw new Error('Unexpected handler'); handler = callback; } },
    dialog: {
      showSaveDialogSync: (_window, options) => { calls.dialog.push(options); return savePath; },
      showErrorBox: (title, message) => errors.push({ title, message })
    },
    mainWindow: { webContents: { printToPDF: async options => { calls.print.push(options); if (printError) throw printError; return Buffer.from('PDF'); } } },
    fs: { writeFileSync: (file, data) => { if (writeError) throw writeError; written.push({ file, data: data.toString() }); } },
    console: { error: () => {} },
    Buffer,
    sanitizeSuggestedFileName: (value, fallback = "Document") => {
      const raw = String(value ?? "");
      if (!raw.trim()) return fallback;
      return raw.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\s+/g, "_").replace(/[. _]+$/g, "").slice(0, 180) || fallback;
    }
  };
  vm.runInNewContext(match[0], sandbox);
  const result = await handler({}, { fileName: 'Classement.pdf', landscape: false });
  return { result, errors, written, calls };
}
(async () => {
  let r = await run();
  check(r.result === true, 'successful PDF export should return true');
  check(r.written.length === 1 && r.written[0].file === '/tmp/result.pdf', 'PDF bytes should be written to the chosen path');
  check(r.calls.print[0].landscape === false, 'requested orientation should be preserved');
  check(r.calls.dialog[0].filters[0].extensions.includes('pdf'), 'save dialog should offer a PDF filter');

  r = await run({ savePath: null });
  check(r.result === false, 'cancelling the save dialog should return false');
  check(r.errors.length === 0 && r.calls.print.length === 0, 'cancel should not print or show an error');

  r = await run({ printError: new Error('print failed') });
  check(r.result === false, 'printToPDF failure should return false');
  check(r.errors.length === 1 && r.errors[0].title === 'Export PDF impossible', 'print failure should show a user-facing error');
  check(r.written.length === 0, 'failed PDF generation must not write a file');

  r = await run({ writeError: new Error('disk full') });
  check(r.result === false, 'file-write failure should return false');
  check(r.errors.length === 1, 'file-write failure should show a user-facing error');
  check(r.errors[0].message.includes('dossier est accessible'), 'file-write error should offer a useful next step');
  console.log(`PASS: ${checks} Electron PDF IPC checks passed.`);
})().catch(error => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
