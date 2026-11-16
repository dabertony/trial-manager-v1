'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const tv = fs.readFileSync(path.join(root, 'tv.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

const pageRule = css.match(/\.print-page\s*\{([^}]*)\}/);
if (!pageRule || !/background\s*:\s*#fff\s*;/i.test(pageRule[1])) {
  throw new Error('Ranking pages must have a pure white background on screen.');
}
if (!/body\.dark-mode\s+#app\s+\.print-page\s*\{[^}]*background\s*:\s*#fff\s*!important/s.test(css)) {
  throw new Error('Ranking pages must remain white in dark mode.');
}
if (!/@media\s+print\s*\{[\s\S]*?html\s*,\s*body\s*,\s*#app\s*,\s*#app\s+\.print-page\s*\{[^}]*background\s*:\s*#fff\s*!important[^}]*background-image\s*:\s*none\s*!important/s.test(css)) {
  throw new Error('The entire printed PDF page, including the area below the notes, must be pure white.');
}
if (!/\.ranking-non-ufolep\s*\{[^}]*background\s*:\s*#d7fcde/s.test(css)) {
  throw new Error('The non-UFOLEP row color must remain unchanged.');
}
if (!/clone\.style\.background\s*=\s*"#ffffff"/.test(app)) {
  throw new Error('JPG ranking export must retain its white capture background.');
}
if (!index.includes('style.css?v=44') || !tv.includes('style.css?v=44')) {
  throw new Error('Main and TV views must request the updated stylesheet.');
}
if (!sw.includes('trial-manager-cache-v152')) {
  throw new Error('Offline cache must be incremented for the stylesheet change.');
}
console.log('PASS: ranking pages use a white background on screen and preserve JPG/category styling.');
