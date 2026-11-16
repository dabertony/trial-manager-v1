'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

assert.match(app, /<div class="print-page" data-intermediaire="\$\{provisional \? "true" : "false"\}">/,
  'each competition ranking page must retain its own provisional status');
assert.match(app, /intermediaire:\s*element\.dataset\.intermediaire === "true"/,
  'the export page model must expose the category-level provisional status');
assert.match(app, /const intermediate = page\s*\?\s*page\.intermediaire\s*:\s*getRankingJpgPages\(type\)\.some\(item => item\.intermediaire\);/,
  'PDF category export must use its own status, while all-category export checks every category');
assert.match(app, /const suffix = page\.intermediaire \? "_INTERMEDIAIRE" : "";/,
  'JPG category export must use only the exported category status');
assert.match(app, /const suffix =\s*info\.intermediaire\s*\?\s*"_INTERMEDIAIRE"\s*:\s*"";/,
  'the direct full-competition PDF export must retain the aggregate competition status');
assert.match(app, /const provisional =\s*tieResult\.unresolved\s*\|\|\s*list\.some\(p\s*=>\s*!p\.completed\s*&&\s*p\.status\s*!==\s*"AB"\)/,
  'a category is provisional when a score is incomplete or a tie-break remains unresolved');
console.log('PASS: INTERMEDIAIRE is scoped to the exported category, or any category for a full export.');
