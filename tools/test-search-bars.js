const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const checks = [
  ['participant search input', /id="participantSearch"/.test(app)],
  ['participant filtering function', /function filterParticipantList\(value\)/.test(app)],
  ['participant row searchable data', /class="participant-select-row"[\s\S]*?data-name=/.test(app)],
  ['score entry search input', /id="scoreEntrySearch"/.test(app)],
  ['score entry filtering function', /function filterScoreEntryList\(value\)/.test(app)],
  ['score rows searchable data', /class="score-entry-row \$\{isAB \? "pilot-ab-row" : ""\}"[\s\S]*?data-name=/.test(app)],
  ['search inputs styled', /#participantSearch,[\s\S]*?#scoreEntrySearch/.test(css)],
  ['search terms restored after rerender', /participantSearch\.value = participantSearchValue/.test(app) && /scoreSearch\.value = scoreEntrySearchValue/.test(app)],
];
for (const [name, pass] of checks) {
  if (!pass) { console.error(`FAIL: ${name}`); process.exitCode = 1; }
}
if (!process.exitCode) console.log(`PASS: ${checks.length} search-bar wiring checks passed.`);
