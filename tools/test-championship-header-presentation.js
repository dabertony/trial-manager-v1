'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
function check(ok, message) { if (!ok) throw new Error(message); }
check(app.includes('championship-ranking-heading'), 'championship tables should use a dedicated shared heading');
check(app.includes('getCategoryColor(title)'), 'championship category heading should reuse category colors');
check(app.includes('src="ufolep-logo-lockup.svg"'), 'championship heading should include the local UFOLEP logo');
check(css.includes('.championship-ranking-heading'), 'championship heading should have layout styles');
check(/\.championship-ranking-heading\s*\{[^}]*break-inside:avoid/s.test(css), 'print heading should be kept together to avoid splitting the logo');
check(index.includes('style.css?v=30') && index.includes('app.js?v=103'), 'index should request updated CSS and app');
check(sw.includes('trial-manager-cache-v114'), 'offline cache should be bumped');
console.log('PASS: championship header presentation checks passed (7 checks).');
