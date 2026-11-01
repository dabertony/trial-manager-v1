'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
function check(ok, message) { if (!ok) throw new Error(message); }
check(!/\bfunction\s+newCompetition\s*\(/.test(app), 'unused legacy competition creator should stay removed');
check(/\bfunction\s+showNewCompetition\s*\(/.test(app), 'current competition form should remain available');
check(/\bfunction\s+saveNewCompetition\s*\(/.test(app), 'current competition save handler should remain available');
check(app.includes('onclick="showNewCompetition()"'), 'home screen should still open the current competition form');
check(app.includes('onclick="saveNewCompetition()"'), 'current competition form should still save through its handler');
console.log('PASS: legacy competition-creation flow removed; current form and save path retained (5 checks).');
