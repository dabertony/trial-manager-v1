'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const names = ['applySortDirection', 'comparePilotNames', 'comparePilotTextField', 'comparePilotCategories'];
const snippets = names.map(name => {
  const match = source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`));
  if (!match) throw new Error(`Missing helper: ${name}`);
  return match[0];
});
const sandbox = { categories: ['N1', 'N2'] };
vm.runInNewContext(`${snippets.join('\n')}\nthis.helpers = {${names.join(',')}};`, sandbox);
const { comparePilotTextField, comparePilotCategories } = sandbox.helpers;
const checks = [
  ['club tie-break ascending', comparePilotTextField({club:'Club',name:'Alice'}, {club:'Club',name:'Zoé'}, 'club', 1) < 0],
  ['club tie-break descending', comparePilotTextField({club:'Club',name:'Alice'}, {club:'Club',name:'Zoé'}, 'club', -1) > 0],
  ['licence tie-break descending', comparePilotTextField({lic:'123',name:'Alice'}, {lic:'123',name:'Zoé'}, 'lic', -1) > 0],
  ['category tie-break ascending', comparePilotCategories({cat:'N1',name:'Alice'}, {cat:'N1',name:'Zoé'}, 1) < 0],
  ['category tie-break descending', comparePilotCategories({cat:'N1',name:'Alice'}, {cat:'N1',name:'Zoé'}, -1) > 0]
];
for (const [label, passed] of checks) if (!passed) throw new Error(`Failed: ${label}`);
for (const name of ['comparePilotTextField', 'comparePilotCategories']) {
  const match = source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`));
  if (!match || !/comparePilotNames\(a, b, direction\)/.test(match[0])) throw new Error(`${name} must pass the direction to its name tie-break`);
}
console.log(`PASS: ${checks.length} secondary-sort tie-break direction cases passed.`);
