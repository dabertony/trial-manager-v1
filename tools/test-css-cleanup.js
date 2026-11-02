'use strict';

// Guard the small CSS cleanup and ensure both pages request the current stylesheet.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const css = read('style.css');
const index = read('index.html');
const tv = read('tv.html');
const sw = read('service-worker.js');

const homeHeaderRules = [...css.matchAll(/(^|\n)\s*\.home-header\s*\{/g)];
if (homeHeaderRules.length !== 1) {
  throw new Error(`Expected one base .home-header rule, found ${homeHeaderRules.length}`);
}
if (!/\.home-header\s*\{[^}]*text-align\s*:\s*left\s*;/s.test(css)) {
  throw new Error('The base .home-header rule must preserve left alignment');
}
if (/\n\s*\.home-header\s*\{[^}]*text-align\s*:\s*left\s*;[^}]*\}\s*\n\s*\.home-header-subtitle/s.test(css)) {
  throw new Error('The old standalone .home-header alignment override has returned');
}
for (const [name, source] of [['index.html', index], ['tv.html', tv]]) {
  if (!source.includes('style.css?v=38')) {
    throw new Error(`${name} must request style.css?v=38 after the CSS change`);
  }
}
if (!sw.includes('trial-manager-cache-v130')) {
  throw new Error('Service-worker cache version must be bumped after the stylesheet update');
}
console.log('PASS: CSS consolidation and stylesheet cache-version checks passed.');
