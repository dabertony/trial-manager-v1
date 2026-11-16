'use strict';
const fs = require('node:fs');
const path = require('node:path');
const tv = fs.readFileSync(path.join(__dirname, '..', 'tv.html'), 'utf8');
const finish = tv.match(/function finishTVCycle\(\)\s*\{([\s\S]*?)\n\}/);
if (!finish) throw new Error('finishTVCycle is missing');
const reset = finish[1].indexOf('tvCurrentPage = 0;');
const showFirst = finish[1].indexOf('showTVPage(0);');
const schedule = finish[1].indexOf('scheduleNextTVPage();');
if (reset < 0 || showFirst < 0 || schedule < 0 || !(reset < showFirst && showFirst < schedule)) {
  throw new Error('each TV cycle must reset, display page 0, then schedule the next page');
}
if (!/const TV_PAGE_DURATION = 14000;/.test(tv)) {
  throw new Error('each normal TV category page must remain visible for 14 seconds');
}
if (!/Math\.max\(\s*8000,\s*\(maxScroll \/ 40\) \* 1000/s.test(tv)) {
  throw new Error('long-table scrolling speed must remain at its original setting');
}
if (!/\}, 3000\);/.test(tv)) {
  throw new Error('long-table scrolling pauses must remain at their original 3-second setting');
}
console.log('PASS: TV cycle restarts on page 1, normal category pages last 14 seconds, and long-table scrolling remains unchanged.');
