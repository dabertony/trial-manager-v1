'use strict';

// Lightweight regression checks for Trial Manager. These checks are intentionally
// dependency-free; they complement, but do not replace, a full browser test.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

// Catch syntax regressions in the application's own JavaScript files.
for (const file of [
  'app.js', 'main.js', 'preload.js', 'state.js',
  'service-worker.js'
]) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], {
    encoding: 'utf8'
  });
  check(result.status === 0, `${file} syntax check failed: ${result.stderr || result.stdout}`);
}

// Check local script and stylesheet references in both application pages.
for (const page of ['index.html', 'tv.html']) {
  const html = read(page);
  const refs = [...html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)]
    .map(match => match[1].split('?')[0])
    .filter(ref => ref && !/^(?:[a-z]+:|#|\/\/)/i.test(ref));

  for (const ref of refs) {
    check(fs.existsSync(path.resolve(root, ref)), `${page} references missing local file: ${ref}`);
  }
}

// Exercise the offline fallback separately so query-string handling is regression-tested.
const swTest = spawnSync(process.execPath, [path.join(root, 'tools', 'test-service-worker.js')], {
  encoding: 'utf8'
});
check(swTest.status === 0, `service-worker offline test failed: ${swTest.stderr || swTest.stdout}`);
if (swTest.status === 0 && swTest.stdout.trim()) console.log(swTest.stdout.trim());

// Keep the two pages on the same stylesheet revision and invalidate the old PWA cache.
const indexHtml = read('index.html');
const tvHtml = read('tv.html');
const indexCss = indexHtml.match(/href=["']([^"']*style\.css\?v=\d+)["']/i)?.[1];
const tvCss = tvHtml.match(/href=["']([^"']*style\.css\?v=\d+)["']/i)?.[1];
check(Boolean(indexCss && indexCss === tvCss), 'index.html and tv.html must use the same versioned stylesheet URL');
check(/src=["']([^"']*app\.js\?v=\d+)["']/i.test(indexHtml), 'index.html must use a versioned app.js URL');
check((read('style.css').match(/\.home-header\s*\{/g) || []).length === 1, 'home-header base styles must be consolidated into one rule');
check(/\.home-header\s*\{[^}]*text-align\s*:\s*left\s*;/s.test(read('style.css')), 'home-header must retain its left-aligned content');
const plateHelperSource = read('app.js');
check(plateHelperSource.includes('function getCompetitionParticipantsWithPlates(c)'),
  'printed pointage sheets must share the participant/plate mapping helper');
check((plateHelperSource.match(/getCompetitionParticipantsWithPlates\(c\);/g) || []).length === 3,
  'all three printed pointage sheets must use the shared participant/plate mapping helper');
check(!plateHelperSource.includes('c.participantPlates?.[p.id]\n        ??'),
  'printed pointage sheets must not duplicate the participant-specific plate fallback');
const participantHelperMatch = plateHelperSource.match(/function getCompetitionParticipantsWithPlates\(c\)\s*\{[\s\S]*?\n\}/);
check(Boolean(participantHelperMatch), 'participant/plate helper could not be isolated for regression checks');
if (participantHelperMatch) {
  const sandbox = {
    state: { pilots: [
      { id: 'a', name: 'Pilot A', plaque: '10' },
      { id: 'b', name: 'Pilot B', plaque: '20' }
    ] }
  };
  const pilotLookup = plateHelperSource.match(/function getPilotById\(id\)\s*\{[\s\S]*?\n\}/);
  check(Boolean(pilotLookup), 'pilot lookup could not be isolated for participant/plate test');
  if (pilotLookup) {
    vm.runInNewContext(`${pilotLookup[0]}\n${participantHelperMatch[0]}\nthis.helper = getCompetitionParticipantsWithPlates;`, sandbox);
    const participants = sandbox.helper({
      participants: ['a', 'missing', 'b'],
      participantPlates: { a: '99' }
    });
    check(participants.length === 2, 'participant/plate helper must continue filtering missing pilot records');
    check(participants[0].plaque === '99', 'competition-specific plate override must take precedence');
    check(participants[1].plaque === '20', 'pilot plate must remain the fallback when no override exists');
    check(sandbox.state.pilots[0].plaque === '10', 'participant/plate helper must not mutate the stored pilot');
  }
}
check(/const CACHE_NAME\s*=\s*["']trial-manager-cache-v\d+["']/.test(read('service-worker.js')),
  'service-worker.js must declare a versioned cache name');

// The three double-pointage PDF actions share one export flow and preserve their filenames.
const pdfHelperMatch = plateHelperSource.match(/async function printDoublePointagePDF\(sheetName, landscape = false\)\s*\{[\s\S]*?\n\}/);
check(Boolean(pdfHelperMatch), 'shared double-pointage PDF export helper is missing');
for (const [name, sheetName] of [
  ['printDoublePointageMatinPDF', 'Matin'],
  ['printDoublePointageApresMidiPDF', 'Apres_Midi'],
  ['printDoublePointageToutesCategoriesPDF', 'Toutes_Categories']
]) {
  const wrapper = plateHelperSource.match(new RegExp(`async function ${name}\\(\\)\\s*\\{[\\s\\S]*?\\n\\}`));
  check(Boolean(wrapper && wrapper[0].includes(`printDoublePointagePDF("${sheetName}")`)),
    `${name} must delegate to the shared PDF export helper with the correct filename suffix`);
}
const pdfTest = spawnSync(process.execPath, [path.join(root, 'tools', 'test-pdf-helper.js')], {
  encoding: 'utf8'
});
check(pdfTest.status === 0, `double-pointage PDF helper test failed: ${pdfTest.stderr || pdfTest.stdout}`);
if (pdfTest.status === 0 && pdfTest.stdout.trim()) console.log(pdfTest.stdout.trim());

// Catch malformed CSS structure without introducing a runtime dependency.
const cssSource = read('style.css');
let cssDepth = 0;
let cssHasUnmatchedClosingBrace = false;
let cssInComment = false;
let cssQuote = '';
for (let i = 0; i < cssSource.length; i += 1) {
  const ch = cssSource[i];
  const next = cssSource[i + 1];
  if (cssInComment) {
    if (ch === '*' && next === '/') { cssInComment = false; i += 1; }
    continue;
  }
  if (cssQuote) {
    if (ch === '\\') { i += 1; continue; }
    if (ch === cssQuote) cssQuote = '';
    continue;
  }
  if (ch === '/' && next === '*') { cssInComment = true; i += 1; continue; }
  if (ch === '\"' || ch === "'") { cssQuote = ch; continue; }
  if (ch === '{') cssDepth += 1;
  if (ch === '}') { cssDepth -= 1; if (cssDepth < 0) cssHasUnmatchedClosingBrace = true; }
}
check(!cssHasUnmatchedClosingBrace, 'style.css has an unmatched closing brace');
check(!cssInComment, 'style.css has an unclosed comment');
check(!cssQuote, 'style.css has an unclosed quoted string');
check(cssDepth === 0, `style.css has ${cssDepth} unmatched opening braces`);

// Verify the effective (last declared) rules that replace the legacy CSS blocks
// removed during cleanup. Extract the rule body instead of searching the rest of
// the file, so an unrelated later declaration cannot make a broken check pass.
function cssRuleBodies(selector) {
  const bodies = [];
  let from = 0;
  while (from < cssSource.length) {
    const at = cssSource.indexOf(selector, from);
    if (at < 0) break;
    const open = cssSource.indexOf('{', at + selector.length - 1);
    if (open < 0) break;
    let depth = 0;
    let quote = '';
    let comment = false;
    for (let i = open; i < cssSource.length; i += 1) {
      const ch = cssSource[i];
      const next = cssSource[i + 1];
      if (comment) {
        if (ch === '*' && next === '/') { comment = false; i += 1; }
        continue;
      }
      if (quote) {
        if (ch === '\\\\') { i += 1; continue; }
        if (ch === quote) quote = '';
        continue;
      }
      if (ch === '/' && next === '*') { comment = true; i += 1; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '{') depth += 1;
      if (ch === '}' && --depth === 0) {
        bodies.push(cssSource.slice(open + 1, i));
        from = i + 1;
        break;
      }
    }
    if (from <= at) break;
  }
  return bodies;
}

// Print note classes are emitted by app.js and must keep their visual treatment.
const scoreButtonRules = cssRuleBodies('.score-btn{');
check(scoreButtonRules.some(body => body.includes('width:43px;') && body.includes('height:38px;')),
  'score-entry buttons must retain their compact 43x38px base dimensions');
check(!scoreButtonRules.some(body => body.includes('min-width:70px;') || body.includes('min-height:70px;')),
  'obsolete 70px minimums must not inflate the compact score-entry buttons');

for (const selector of ['.print-note,', '.print-note3{']) {
  check(cssSource.includes(selector), `style.css is missing the live print-note selector ${selector}`);
}
const printNoteRule = cssRuleBodies('.print-note,');
check(printNoteRule.some(body => ['margin-top:8px;', 'color:#7f1d1d;', 'font-size:10px;', 'font-weight:bold;']
  .every(declaration => body.includes(declaration))),
  'print notes must retain their compact red bold styling');

for (const [selector, declarations] of [
  ['.competition-card{', ['background:rgba(255,255,255,.92);', 'transition:box-shadow .12s, background .12s;']],
  ['.score-entry-page .cat-elite{', ['border-left:60px solid #facc15 !important;']],
  ['.score-entry-page .cat-n1{', ['border-left:60px solid #dc2626 !important;']],
  ['.score-entry-page .cat-n2{', ['border-left:60px solid #2563eb !important;']],
  ['.score-entry-page .cat-n3{', ['border-left:60px solid #16a34a !important;']],
  ['.score-entry-page .cat-n4{', ['border-left:60px solid #ffffff !important;']],
  ['.score-entry-page .cat-n5{', ['border-left:60px solid #ea580c !important;']],
  ['.score-entry-page .cat-f{', ['border-left:60px solid #ec4899 !important;']],
  ['.score-entry-page .cat-v{', ['border-left:60px solid #6b7280 !important;']],
  ['.score-btn{', ['background:#f8fafc;', 'color:#334155;']],
  ['.col-name{', ['width:200px;']],
  ['.col-club{', ['width:140px;']],
  ['.col-cat{', ['width:75px;']]
]) {
  const bodies = cssRuleBodies(selector);
  check(bodies.some(body => declarations.every(declaration => body.includes(declaration))),
    `style.css is missing expected declarations in the cleaned rule for ${selector}`);
}

// Pin down the existing core ranking behavior before future refactors touch it.
const appSource = read('app.js');
check(appSource.split('Gestion des pilotes • Compétitions • Classements').length - 1 === 1,
  'home subtitle should appear only once in the home template');
const rulesMatch = appSource.match(/const RULES = \{[\s\S]*?\n\};/);
const engineMatch = appSource.match(/const Engine = \{[\s\S]*?\n\};/);
check(Boolean(rulesMatch && engineMatch), 'ranking rules or engine could not be isolated for regression checks');
if (rulesMatch && engineMatch) {
  const sandbox = {};
  vm.runInNewContext(`${rulesMatch[0]}\n${engineMatch[0]}\nthis.RULES = RULES; this.Engine = Engine;`, sandbox);
  const Engine = sandbox.Engine;
  check(Engine.getUfolepPoints(1) === 30, 'UFOLEP first-place points must remain 30');
  check(Engine.getUfolepPoints(10) === 11, 'UFOLEP tenth-place points must remain 11');
  check(Engine.getUfolepPoints(999) === 5, 'UFOLEP fallback points must remain 5');
  check(Engine.getUfolepPoints(1, true) === 1, 'AB points must remain 1 regardless of rank');

  const make = (id, total, lic, status = 'OK', nb0 = 0) => ({
    id, total, lic, status, nb0, nb1: 0, nb2: 0, nb3: 0, nb5: 0, bestTour: total
  });
  const ranked = Engine.rank([
    make('ufo-10', 10, 'UFOLEP'),
    make('ffc-9', 9, 'FFC'),
    make('ab-1', 1, 'UFOLEP', 'AB')
  ]);
  check(ranked.map(p => p.id).join(',') === 'ffc-9,ufo-10,ab-1', 'scratch ranking must put AB last');
  check(ranked.map(p => p.rankScratch).join(',') === '1,2,3', 'scratch ranks must include all licences');
  check(ranked[0].rankUfolep === '-' && ranked[0].ufoPoints === 0, 'non-UFOLEP pilots must not receive UFOLEP rank or points');
  check(ranked[1].rankUfolep === 1 && ranked[1].ufoPoints === 30, 'UFOLEP rank must be calculated independently of scratch rank');
  check(ranked[2].rankUfolep === 2 && ranked[2].ufoPoints === 1, 'UFOLEP AB must retain AB points');
  const tieA = make('tie-a', 10, 'UFOLEP', 'OK', 1);
  const tieB = make('tie-b', 10, 'UFOLEP', 'OK', 2);
  check(Engine.compare(tieB, tieA) < 0, 'scratch tie-break must prefer the pilot with more zero scores');
}

// Protect the category-to-style mapping, especially female/veteran suffix precedence.
for (const [functionName, prefix] of [['getPilotTableCatClass', 'pilot-cat']]) {
  const match = appSource.match(new RegExp(`function ${functionName}\\(cat\\)\\s*\\{[\\s\\S]*?\\n\\}`));
  check(Boolean(match), `${functionName} could not be isolated for regression checks`);
  if (match) {
    const sandbox = {};
    vm.runInNewContext(`${match[0]}\nthis.mapping = ${functionName};`, sandbox);
    for (const [category, expected] of [
      ['Elite', `${prefix}-elite`], ['N1', `${prefix}-n1`], ['N2', `${prefix}-n2`],
      ['N3', `${prefix}-n3`], ['N4', `${prefix}-n4`], ['N5', `${prefix}-n5`],
      ['N3F', `${prefix}-f`], ['N5F', `${prefix}-f`], ['N2V', `${prefix}-v`], ['unknown', '']
    ]) {
      check(sandbox.mapping(category) === expected,
        `${functionName} changed the style mapping for ${category}`);
    }
  }
}

// Regression cases for the shared plate-number helper, including its legacy fallback difference.
const helperMatch = appSource.match(/function getTrialManagerPlateNumber\(p, fallback = 99999\) \{[\s\S]*?\n\}/);
check(Boolean(helperMatch), 'shared plate-number helper is missing');
if (helperMatch) {
  const sandbox = {};
  vm.runInNewContext(`${helperMatch[0]}\nthis.helper = getTrialManagerPlateNumber;`, sandbox);
  const cases = [
    [{ plaque: '12' }, undefined, 12],
    [{ plaque: 'N° 007' }, undefined, 7],
    [{ plaque: '' }, undefined, 99999],
    [{ plaque: '0' }, undefined, 99999],
    [{ plaque: 'abc' }, undefined, 99999],
    [{ plaque: '12bis' }, undefined, 12],
    [{ plaque: '0' }, 0, 0],
    [{ plaque: 'abc' }, 0, 0],
    [{ plaque: '0012' }, 0, 12]
  ];
  for (const [participant, fallback, expected] of cases) {
    const actual = fallback === undefined
      ? sandbox.helper(participant)
      : sandbox.helper(participant, fallback);
    check(actual === expected,
      `plate helper returned ${actual} instead of ${expected} for ${JSON.stringify(participant)} / fallback ${fallback}`);
  }
}

if (failures.length) {
  console.error(`FAIL: ${failures.length} of ${checks} checks failed.`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${checks} lightweight checks passed.`);
  console.log('Note: these are static/smoke checks, not a full interactive browser test.');
}
