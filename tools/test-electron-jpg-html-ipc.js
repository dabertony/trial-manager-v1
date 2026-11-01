'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const match = source.match(/ipcMain\.handle\("export-jpg-html", async \(event, options = \{\}\) => \{[\s\S]*?\n\}\);/);
if (!match) throw new Error('Electron HTML JPG capture handler was not found');
let checks = 0;
function check(ok, message) { checks++; if (!ok) throw new Error(message); }
async function run({ savePath = '/tmp/ranking.jpg', loadError = null, captureEmpty = false, writeError = null } = {}) {
  let handler;
  const errors = [];
  const written = [];
  const dialogs = [];
  const windows = [];
  class FakeBrowserWindow {
    constructor(options) {
      this.options = options;
      this.destroyed = false;
      this.webContents = {
        executeJavaScript: async () => true,
        capturePage: async rect => { this.rect = rect; return { isEmpty: () => captureEmpty, toJPEG: quality => Buffer.from(`jpeg-${quality}`) }; }
      };
      windows.push(this);
    }
    async loadURL(url) { this.url = url; if (loadError) throw loadError; }
    isDestroyed() { return this.destroyed; }
    destroy() { this.destroyed = true; }
  }
  const sandbox = {
    ipcMain: { handle: (name, callback) => { if (name !== 'export-jpg-html') throw new Error('Unexpected handler'); handler = callback; } },
    BrowserWindow: FakeBrowserWindow,
    dialog: {
      showSaveDialogSync: (_window, options) => { dialogs.push(options); return savePath; },
      showErrorBox: (title, message) => errors.push({ title, message })
    },
    mainWindow: {},
    fs: { writeFileSync: (file, data) => { if (writeError) throw writeError; written.push({ file, data: data.toString() }); } },
    console: { error: () => {} },
    Buffer,
    encodeURIComponent,
    sanitizeSuggestedFileName: (value, fallback = 'Document') => String(value || fallback).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
  };
  vm.runInNewContext(match[0], sandbox);
  const result = await handler({}, { fileName: 'Classement_N1.jpg', html: '<html><body>ranking</body></html>', width: 1200, height: 900 });
  return { result, errors, written, dialogs, windows };
}
(async () => {
  let r = await run();
  check(r.result === true, 'valid HTML capture should return true');
  check(r.written.length === 1 && r.written[0].file === '/tmp/ranking.jpg', 'JPEG bytes should be written to the chosen path');
  check(r.written[0].data === 'jpeg-94', 'capture should be encoded as high-quality JPEG');
  check(r.windows[0].destroyed, 'temporary capture window should be destroyed');
  check(r.windows[0].rect.width === 1200 && r.windows[0].rect.height === 900, 'capture should use requested dimensions');

  r = await run({ savePath: null });
  check(r.result === false && r.errors.length === 0, 'cancelled save should not report an error');

  r = await run({ captureEmpty: true });
  check(r.result?.ok === false && /vide/.test(r.result.error), 'empty capture should return a diagnostic');

  r = await run({ loadError: new Error('load failed') });
  check(r.result?.ok === false && r.result.error === 'load failed', 'HTML load failure should return its diagnostic');

  r = await run({ writeError: new Error('disk full') });
  check(r.result?.ok === false && r.result.error === 'disk full', 'file write failure should return its diagnostic');

  console.log(`PASS: ${checks} Electron HTML JPG capture IPC checks passed.`);
})().catch(error => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
