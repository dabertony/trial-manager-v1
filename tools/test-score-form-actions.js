const fs = require('fs');
const path = require('path');
const assert = require('assert');

const appPath = path.join(__dirname, '..', 'app.js');
const source = fs.readFileSync(appPath, 'utf8');
const start = source.indexOf('function enterScore(ci,id,t){');
assert.notStrictEqual(start, -1, 'enterScore() must exist');
const end = source.indexOf('\nfunction deleteScoreTour(', start);
assert.notStrictEqual(end, -1, 'enterScore() must end before deleteScoreTour()');
const enterScore = source.slice(start, end);

const backButtons = (enterScore.match(/← Retour/g) || []).length;
assert.strictEqual(backButtons, 1, `score form should have exactly one Retour button in the top bar, found ${backButtons}`);
assert(enterScore.includes('✓ Valider le tour'), 'score form must retain the validate-tour action');
assert(enterScore.includes('🗑 Effacer ce tour'), 'score form must retain the delete-tour action');
assert(enterScore.includes('onclick="selectPilot(${ci})"'), 'score form must retain navigation back to pilot selection');

console.log('PASS: score form has one Retour button and retains validate/delete actions.');
