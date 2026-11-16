const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

const start = app.indexOf('function showPilots(){');
if (start < 0) throw new Error('showPilots() screen was not found');
const nextFunction = app.indexOf('\nfunction ', start + 1);
const screen = app.slice(start, nextFunction < 0 ? app.length : nextFunction);
if (!screen.includes('class="pilots-header pilots-header-sticky"')) {
  throw new Error('Pilots list header should use the sticky-only class');
}

const sticky = css.match(/\.pilots-header-sticky\s*\{([^}]*)\}/);
if (!sticky) throw new Error('Sticky header CSS rule is missing');
for (const [property, value] of [['position', 'sticky'], ['top', '0'], ['z-index', '100']]) {
  if (!new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*${value}(?:;|$)`).test(sticky[1].trim())) {
    throw new Error(`Sticky header should set ${property}: ${value}`);
  }
}

const otherHeaders = (app.match(/class="pilots-header"/g) || []).length;
if (otherHeaders < 1) throw new Error('Other pilot-management headers should remain unchanged');
console.log('PASS: only the Pilots list header is sticky; other screens retain their existing headers.');
