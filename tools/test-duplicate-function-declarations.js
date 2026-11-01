const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'app.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const declarations = new Map();
const pattern = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
let match;

while ((match = pattern.exec(source)) !== null) {
  const name = match[1];
  const line = source.slice(0, match.index).split('\n').length;
  const lines = declarations.get(name) || [];
  lines.push(line);
  declarations.set(name, lines);
}

const duplicates = [...declarations.entries()].filter(([, lines]) => lines.length > 1);
if (duplicates.length) {
  console.error('FAIL: duplicate top-level function declarations found:');
  for (const [name, lines] of duplicates) {
    console.error(`  ${name}: lines ${lines.join(', ')}`);
  }
  process.exit(1);
}

console.log(`PASS: ${declarations.size} top-level function declarations have unique names.`);
