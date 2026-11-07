const fs = require('node:fs');
const path = require('node:path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const state = fs.readFileSync(path.join(__dirname, '..', 'state.js'), 'utf8');
const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
function check(condition, message) {
  if (!condition) throw new Error(message);
}

check(state.includes('lastParticipantFees') && state.includes('{ ufolep: 10, ffc: 18, nl: 18 }'), 'default tariffs are initialized');
check(app.includes('renderParticipantFeeFields("comp", getParticipantFees())'), 'creation form exposes the three tariff inputs');
check(app.includes('renderParticipantFeeFields("editComp", getCompetitionParticipantFees(c))'), 'editing a competition shows its own stored tariffs');
check(app.includes('participantFees: fees') && app.includes('c.participantFees = fees'), 'each competition stores its own tariffs');
check(app.includes('state.lastParticipantFees = fees') && app.includes('localStorage.setItem("lastParticipantFees"'), 'last validated tariffs become defaults for the next competition');
check(app.includes('lastParticipantFees: getParticipantFees()') && app.includes('state.lastParticipantFees = getParticipantFees()'), 'tariff defaults are included in backup and restored');
check(app.includes('if(licence === "UFOLEP") return participantFees.ufolep') && app.includes('if(licence === "FFC") return participantFees.ffc') && app.includes('return participantFees.nl'), 'PWA export assigns fees by licence, independently of category');
check(main.includes('fees.ufolep') && main.includes('fees.ffc') && main.includes('fees.nl'), 'Electron export assigns fees by licence');
check(app.includes('fees: getCompetitionParticipantFees(c)'), 'Electron receives the competition-specific tariff values');
check(app.includes('amount:getPilotEngagementFee(p)') && main.includes('amount:(String(p.lic || "NL")'), 'only the participant amount column is prefilled');
check(app.includes('value < 0') && app.includes('value === ""'), 'negative and empty tariff inputs are rejected');
check(pkg.scripts.test.includes('test-participant-fees.js'), 'fee regression test is part of npm test');
console.log('PASS: participant fees, per-competition history, next-competition defaults, backup and both Excel exports.');
