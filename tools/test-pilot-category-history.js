'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
function check(value, message) { if (!value) throw new Error(message); }
function extract(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing ${name}`);
  const end = nextName ? source.indexOf(`\nfunction ${nextName}(`, start + 10) : -1;
  return source.slice(start, end < 0 ? source.length : end);
}
const helperStart = source.indexOf('function getPilotById(id)');
const helperEnd = source.indexOf('\nfunction getUfolepSeasonContext', helperStart);
check(helperStart >= 0 && helperEnd > helperStart, 'pilot lifecycle helpers must be grouped before season helpers');
const helperSource = source.slice(helperStart, helperEnd);
const sandbox = {
  state: {
    pilots: [
      { id: 'old', name: 'DUPONT JEAN', cat: 'N2', plaque: '125' },
      { id: 'other', name: 'MARTIN PAUL', cat: 'N1', plaque: '126' }
    ],
    competitions: [
      { locked: true, participants: ['old'], scores: { 'old-1': [1, 2] }, status: { old: 'AB' }, participantPlates: { old: '125' }, tiebreaks: { 'N2-old-other': ['old', 'other'] } },
      { locked: false, participants: ['old'], scores: { 'old-1': [3, 4], 'old-2': [0, 1] }, status: { old: 'OK' }, participantPlates: { old: '125' }, tiebreaks: { 'N2-old-other': ['old', 'other'] } },
      { locked: false, participants: [], scores: { 'old-1': [2, 2] }, status: { old: 'AB' }, participantPlates: {}, tiebreaks: {} }
    ]
  },
  Object,
  Array,
  Set
};
vm.createContext(sandbox);
vm.runInContext(`${helperSource}\nthis.api = { getPilotById, getAllPilotRecords, getActivePilots, isHistoricalPilot, hasValidatedPilotHistory, isPilotCategoryChangePending, migratePilotToNewIdInEditableCompetitions, clearPilotTieBreaksInEditableCompetitions };`, sandbox);
const api = sandbox.api;
check(api.hasValidatedPilotHistory('old') === true, 'locked competition should count as validated history');
check(api.hasValidatedPilotHistory('other') === false, 'unrelated pilot should not inherit validated history');
check(api.getActivePilots().length === 2, 'ordinary pilots should be active');
const oldPilot = api.getPilotById('old');
oldPilot.archived = false;
oldPilot.isHistoricalVersion = true;
oldPilot.replacedByPilotId = 'new';
sandbox.state.pilots.push({ id: 'new', name: 'DUPONT JEAN', cat: 'N1', plaque: '225', categoryChangePending: true });
api.migratePilotToNewIdInEditableCompetitions('old', 'new');
const [locked, editable, editableDeselected] = sandbox.state.competitions;
check(locked.participants[0] === 'old', 'validated competition participant ID must remain unchanged');
check(locked.scores['old-1'][0] === 1 && !locked.scores['new-1'], 'validated competition scores must remain unchanged');
check(locked.status.old === 'AB' && locked.participantPlates.old === '125', 'validated status and plate must remain unchanged');
check(editable.participants[0] === 'new', 'editable competition participant must move to new ID');
check(editable.scores['new-1'][0] === 3 && editable.scores['new-2'][1] === 1 && !editable.scores['old-1'], 'editable scores must move to new ID');
check(editable.status.new === 'OK' && !Object.prototype.hasOwnProperty.call(editable.status, 'old'), 'editable status must move to new ID');
check(!Object.prototype.hasOwnProperty.call(editable.participantPlates, 'old'), 'old competition plate override must be removed');
check(Object.keys(editable.tiebreaks).length === 0, 'tiebreaks involving the old ID must be recalculated');
check(editableDeselected.scores['new-1'][0] === 2 && editableDeselected.status.new === 'AB', 'editable stored results must migrate even if pilot was deselected');
check(api.getActivePilots().length === 2 && api.getActivePilots().some(p => p.id === 'new') && !api.getActivePilots().some(p => p.id === 'old'), 'historical record must be excluded from active pilot choices');
check(api.getAllPilotRecords().some(p => p.id === 'old') && api.isHistoricalPilot(api.getPilotById('old')), 'historical record must remain visible and identifiable');
check(api.getPilotById('old').archived === false, 'newly replaced historical record must not be archived');
check(api.isPilotCategoryChangePending(api.getPilotById('new')), 'new category record should carry its warning');
api.getPilotById('new').categoryChangePending = false;
check(!api.isPilotCategoryChangePending(api.getPilotById('new')), 'warning should be removable after first validated competition');
const listSource = extract('showPilots', 'filterPilotList');
const participantsSource = extract('manageParticipants', 'filterParticipantList');
const duplicateSource = extract('showPilotDuplicates', 'showPilots');
check(listSource.includes('getAllPilotRecords()') && listSource.includes('pilot-historical-row') && listSource.includes('Ancienne fiche – historique'), 'Pilots screen must show historical records in red');
check(listSource.includes('isPilotCategoryChangePending(p)') && listSource.includes('Changement récent'), 'Pilots screen must show the red new-record warning');
check(listSource.includes('Un simple changement de plaque ne crée pas de nouvelle fiche'), 'edit banner must clarify that plate-only changes do not create a new record');
check(participantsSource.includes('getAllPilotRecords()') && participantsSource.includes('pilot-historical-row') && participantsSource.includes('Ancienne fiche – non sélectionnable') && participantsSource.includes('isHistoricalPilot(p)'), 'Participants screen must show historical records in red but not offer them for selection');
check(duplicateSource.includes('findPilotDuplicateGroups(getActivePilots())'), 'duplicate detector must ignore historical versions');
const toggleParticipantSource = extract('toggleP', 'selectPilot');
check(toggleParticipantSource.includes('if(isHistoricalPilot(getPilotById(id))) return;'), 'historical pilot selection must be blocked even if a row handler is triggered');
check(extract('editPilot', 'savePilotEdit').includes('if(!p || isHistoricalPilot(p)) return;'), 'historical pilot record must not be editable');
const pwaExport = extract('exportPilotsExcelPWA', 'exportPilotsExcel');
const electronExport = extract('exportPilotsExcel', 'exportBackup');
check(pwaExport.includes('const activePilots = getActivePilots()'), 'PWA pilot export must use active records only');
check(electronExport.includes('pilots: getActivePilots()'), 'Electron pilot export must use active records only');
const lockSource = extract('confirmLockCompetition', 'unlockCompetition');
check(lockSource.includes('pilot.categoryChangePending = false'), 'locking the first competition should clear the new-record warning');
const backupSource = extract('exportBackup', 'importBackup');
check(backupSource.includes('pilots: state.pilots'), 'JSON backup must retain archived pilot history');

// A plate-only replacement must retain an unlocked competition's valid tie-break,
// with only the pilot ID rewritten; category changes intentionally invalidate it.
const plateOnlySandbox = {
  state: { pilots: [{ id: 'before', name: 'PILOT', cat: 'N2', plaque: '10' }], competitions: [
    { locked: false, participants: ['before'], scores: {}, status: {}, participantPlates: {}, tiebreaks: { 'N2-before-other': ['before', 'other'] } }
  ] },
  Object, Array, Set
};
vm.createContext(plateOnlySandbox);
vm.runInContext(`${helperSource}\nthis.migrate = migratePilotToNewIdInEditableCompetitions;`, plateOnlySandbox);
plateOnlySandbox.migrate('before', 'after', false);
const plateOnlyTie = plateOnlySandbox.state.competitions[0].tiebreaks;
check(plateOnlyTie['N2-after-other'][0] === 'after' && !plateOnlyTie['N2-before-other'], 'plate-only replacement must preserve tie-break order with the new ID');

// Exercise the actual edit handler: validated history duplicates, while an
// unvalidated preparation keeps the same ID and updates its live record.
const saveEditMatch = source.match(/async function savePilotEdit\(\)\s*\{[\s\S]*?\n\}/);
if (!saveEditMatch) throw new Error('Missing async savePilotEdit handler');
const saveEditSource = saveEditMatch[0];
function makeEditSandbox({ locked = true, cat = 'N1', plaque = '225' } = {}) {
  const values = { name: 'DUPONT JEAN', club: 'CLUB A', lic: 'UFOLEP', cat, plaque, licenceNumber: 'LIC-1', birthDate: '2000-01-01' };
  const nodes = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, { value, style: {}, focus() {} }]));
  const state = {
    pilots: [{ id: 'old', name: 'DUPONT JEAN', cat: 'N2', plaque: '125', club: 'CLUB A', lic: 'UFOLEP', licenceNumber: 'LIC-1', birthDate: '2000-01-01' }],
    clubs: ['CLUB A'],
    competitions: [
      { locked, participants: ['old'], scores: { 'old-1': [1, 2] }, status: { old: 'OK' }, participantPlates: {}, tiebreaks: {} },
      { locked: false, participants: ['old'], scores: { 'old-1': [3, 4] }, status: { old: 'OK' }, participantPlates: { old: '125' }, tiebreaks: {} }
    ]
  };
  const helperBox = { state, Object, Array, Set };
  vm.createContext(helperBox);
  vm.runInContext(`${helperSource}\nthis.run = migratePilotToNewIdInEditableCompetitions; this.clear = clearPilotTieBreaksInEditableCompetitions;`, helperBox);
  const box = {
    state, Object, Array, Set, String,
    document: { getElementById(id) { return nodes[id] || null; } },
    editingPilotId: 'old', editingPilotCat: 'N2',
    getPilotById(id) { return state.pilots.find(p => p.id === id); },
    isHistoricalPilot(p) { return !!(p && (p.isHistoricalVersion === true || p.archived === true || p.replacedByPilotId)); },
    hasValidatedPilotHistory(id) { return state.competitions.some(c => c.locked === true && c.participants.includes(id)); },
    generatePilotId() { return 'new'; },
    migratePilotToNewIdInEditableCompetitions: helperBox.run,
    clearPilotTieBreaksInEditableCompetitions: helperBox.clear,
    format(value) { return String(value || '').toUpperCase().trim(); },
    addCustomCategoryFromForm() { return null; },
    async askConfirm() { return true; },
    save() {}, showPilots() {},
  };
  vm.createContext(box);
  vm.runInContext(`${saveEditSource}\nthis.run = savePilotEdit;`, box);
  return box;
}
(async () => {
  const duplicateBox = makeEditSandbox({ locked: true, cat: 'N1', plaque: '225' });
  await duplicateBox.run();
  check(duplicateBox.state.pilots.length === 2, 'validated category change must create a second version');
  check(duplicateBox.state.pilots[0].archived === false && duplicateBox.state.pilots[0].isHistoricalVersion === true && duplicateBox.state.pilots[0].replacedByPilotId === 'new' && duplicateBox.state.pilots[0].cat === 'N2' && duplicateBox.state.pilots[0].plaque === '125', 'old version must remain unarchived, visibly historical, and retain category and plate');
  check(duplicateBox.state.pilots[1].id === 'new' && duplicateBox.state.pilots[1].cat === 'N1' && duplicateBox.state.pilots[1].plaque === '225', 'new category version must receive a new ID and updated category/plate');
  check(duplicateBox.state.competitions[0].participants[0] === 'old' && duplicateBox.state.competitions[0].scores['old-1'][0] === 1, 'locked historical competition must remain attached to old ID');
  check(duplicateBox.state.competitions[1].participants[0] === 'new' && duplicateBox.state.competitions[1].scores['new-1'][0] === 3, 'unlocked competition and its scores must move to new ID');

  const plateOnlyBox = makeEditSandbox({ locked: true, cat: 'N2', plaque: '999' });
  await plateOnlyBox.run();
  check(plateOnlyBox.state.pilots.length === 1 && plateOnlyBox.state.pilots[0].id === 'old', 'plate-only change after validated history must not create a duplicate');
  check(plateOnlyBox.state.pilots[0].cat === 'N2' && plateOnlyBox.state.pilots[0].plaque === '999', 'plate-only change must update the existing master record');
  check(plateOnlyBox.state.competitions[0].participantPlates.old === '125', 'locked historical competition must retain the old plate snapshot');
  check(plateOnlyBox.state.competitions[1].participantPlates.old === '999', 'editable competition must use the replacement plate');

  const directBox = makeEditSandbox({ locked: false, cat: 'N1', plaque: '225' });
  await directBox.run();
  check(directBox.state.pilots.length === 1 && directBox.state.pilots[0].id === 'old' && directBox.state.pilots[0].cat === 'N1', 'unvalidated competition category change must update the existing ID directly');
  check(directBox.state.competitions[0].participants[0] === 'old', 'unlocked preparation must retain the same participant ID on direct edit');
  console.log('PASS: validated category change creates a new pilot version; plate-only change updates the existing pilot.');
  console.log('PASS: locked competitions preserve their historical plate; editable competitions receive the new plate.');
  console.log('PASS: historical records stay visible and unarchived, are excluded from new selections, and remain in backups.');
  console.log('PASS: active exports, warning lifecycle, and duplicate detection remain protected.');
})().catch(error => { console.error(error); process.exitCode = 1; });
