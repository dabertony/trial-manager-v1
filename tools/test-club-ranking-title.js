const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const titleBlock = css.match(/\.club-season-info\s*\{([^}]*)\}/);
if (!titleBlock) throw new Error('club season title style is missing');
const rules = titleBlock[1];
for (const [property, value] of [['font-size', '18px'], ['font-weight', '700'], ['text-align', 'center'], ['color', '#1e293b']]) {
  if (!new RegExp(`${property}\\s*:\\s*${value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`).test(rules)) {
    throw new Error(`club season title should use ${property}: ${value}`);
  }
}
if (!app.includes('CHAMPIONNAT UFOLEP') || !app.includes('SAISON ${startYear}-${endYear}')) {
  throw new Error('club season title content should remain unchanged');
}
console.log('PASS: club ranking season title typography is harmonized; wording unchanged.');
