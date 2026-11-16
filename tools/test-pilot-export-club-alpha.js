'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function verify(file, variable, label) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const escaped = variable === 'activePilots' ? 'activePilots' : 'pilots';
  const re = new RegExp('const club = \\[\\.\\.\\.' + escaped + '\\]\\s*\\.sort\\(\\(a,b\\)=>\\{[\\s\\S]*?\\}\\);');
  const match = source.match(re);
  if (!match) throw new Error(`${label}: club sort missing`);
  const code = match[0];
  if (!code.includes('a.club') || !code.includes('b.club') || !code.includes('a.name') || !code.includes('b.name')) {
    throw new Error(`${label}: club/name sort keys missing`);
  }
  const sandbox = {};
  const rows = [
    {club:'Zèbres',name:'Alice'},
    {club:'Alpha',name:'Zoé'},
    {club:'Alpha',name:'Bernard'},
    {club:'Alpha',name:'alice'},
    {club:'Zèbres',name:'Bernard'}
  ];
  sandbox.rows = rows;
  vm.runInNewContext(`const ${variable} = rows; ${code} this.result = club.map(p => p.club + '|' + p.name);`, sandbox);
  const got = sandbox.result.join(';');
  const expected = 'Alpha|alice;Alpha|Bernard;Alpha|Zoé;Zèbres|Alice;Zèbres|Bernard';
  if (got !== expected) throw new Error(`${label}: unexpected order ${got}`);
}
verify('app.js', 'activePilots', 'PWA');
verify('main.js', 'pilots', 'Electron');
console.log('PASS: pilot export club sheets sort by club, then pilot name (PWA + Electron).');
