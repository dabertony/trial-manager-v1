'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

assert.match(app, /let scoreEntryListScrollTop = null;/,
  'score-entry list scroll position must have a dedicated state');
assert.match(app, /function captureScoreEntryListPosition\(\)[\s\S]*?scoreEntryListScrollTop = window\.scrollY \|\| document\.documentElement\.scrollTop/,
  'the page vertical scroll position must be captured before leaving the list');

const selectPilot = app.match(/function selectPilot\(i\)\{([\s\S]*?)\n\}\n\nfunction filterScoreEntryList/);
assert.ok(selectPilot, 'selectPilot must exist');
assert.match(selectPilot[1], /filterScoreEntryList\(scoreEntrySearchValue\)[\s\S]*?window\.scrollTo\(0, scoreEntryListScrollTop\)[\s\S]*?scoreEntryListScrollTop = null;/,
  'the exact scroll position must be restored after the list is rendered and filtered');

const pilotDetail = app.match(/function pilotDetail\(ci,id\)\{([\s\S]*?)\n\}\n\nfunction/);
assert.ok(pilotDetail && /captureScoreEntryListPosition\(\)/.test(pilotDetail[1]),
  'opening pilot details from the list must capture its scroll position');
const enterScore = app.match(/function enterScore\(ci,id,t\)\{([\s\S]*?)\n\}\n\nfunction updateScoreTourTotal/);
assert.ok(enterScore && /captureScoreEntryListPosition\(\)/.test(enterScore[1]),
  'opening a tour directly from the list must capture its scroll position');

const saveScore = app.match(/function saveScore\(ci,id,t\)\{([\s\S]*?)\n\}\n\n\/\/ ===== STATS =====/);
assert.ok(saveScore, 'saveScore must exist');
assert.match(saveScore[1], /if\(scoreEntrySearchValue\.trim\(\)\)\{\s*scoreEntrySearchValue = "";\s*scoreEntryListScrollTop = 0;\s*\}/,
  'after successful validation, an active search must clear and the full list must return to its top');
assert.ok(saveScore[1].indexOf('save();') < saveScore[1].indexOf('scoreEntrySearchValue = "";'),
  'search must not clear when validation fails');
console.log('PASS: score-entry search clears after validation; unfiltered list scroll position is preserved.');
