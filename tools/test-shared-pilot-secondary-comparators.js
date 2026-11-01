'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const declarations = source.match(/function comparePilotNames\(a, b, direction = 1\)\s*\{[\s\S]*?\n\}[\s\S]*?function comparePilotTextField\(a, b, field, direction = 1\)\s*\{[\s\S]*?\n\}[\s\S]*?function comparePilotCategories\(a, b, direction = 1\)\s*\{[\s\S]*?\n\}/);
if (!declarations) throw new Error('Shared pilot secondary comparators are missing');
const sandbox = { categories: ['N1', 'N2', 'N3'] };
const directionHelper = source.match(/function applySortDirection\(diff, direction = 1\)\s*\{[\s\S]*?\n\}/);
if (!directionHelper) throw new Error('Shared sort-direction application helper is missing');
vm.runInNewContext(`${directionHelper[0]}\n${declarations[0]}\nthis.text = comparePilotTextField; this.category = comparePilotCategories;`, sandbox);
const cases = [
  [sandbox.text({club:'Club A',name:'Zoé'}, {club:'Club B',name:'Alice'}, 'club'), -1],
  [sandbox.text({club:'Club B',name:'Zoé'}, {club:'Club A',name:'Alice'}, 'club'), 1],
  [sandbox.text({lic:'123',name:'Alice'}, {lic:'456',name:'Bob'}, 'lic'), -1],
  [sandbox.text({lic:'456',name:'Alice'}, {lic:'123',name:'Bob'}, 'lic', -1), -1],
  [sandbox.text({club:'Même',name:'Alice'}, {club:'Même',name:'Bob'}, 'club'), -1],
  [sandbox.text({lic:'Même',name:'Bob'}, {lic:'Même',name:'Alice'}, 'lic'), 1],
  [sandbox.category({cat:'N1',name:'Bob'}, {cat:'N2',name:'Alice'}), -1],
  [sandbox.category({cat:'N3',name:'Bob'}, {cat:'N2',name:'Alice'}, -1), -1],
  [sandbox.category({cat:'N2',name:'Alice'}, {cat:'N2',name:'Bob'}), -1]
];
for (const [actual, expected] of cases) if (Math.sign(actual) !== expected) throw new Error(`Expected sign ${expected}, got ${actual}`);
for (const fn of ['sortPilots', 'sortParticipants']) {
  const start = source.indexOf(`function ${fn}(`);
  const next = source.indexOf('\nfunction ', start + 10);
  const body = source.slice(start, next < 0 ? source.length : next);
  for (const field of ['club', 'lic']) if (!body.includes(`comparePilotTextField(a, b, "${field}", dir)`)) throw new Error(`${fn} missing shared ${field} comparator`);
  if (!body.includes('comparePilotCategories(a, b, dir)')) throw new Error(`${fn} missing shared category comparator`);
}
console.log(`PASS: ${cases.length} shared secondary comparator cases and 6 sort call sites passed.`);
