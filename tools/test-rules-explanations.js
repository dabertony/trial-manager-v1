const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');
const checks = [
  ['custom categories own ranking and historical penalty system', /catégories personnalisées[\s\S]*?son propre classement[\s\S]*?même système de pénalités/i],
  ['custom categories are not automatically official or championship eligible', /ne leur attribue pas automatiquement[\s\S]*?points[\s\S]*?championnat UFOLEP/i],
  ['custom categories explanation follows main categories and F/V rankings', /Les catégories principales sont[\s\S]*?<span>Elite<\/span>[\s\S]*?<span>N5<\/span>[\s\S]*?classements[\s\S]*?distinctes\.[\s\S]*?catégories personnalisées/i],
  ['season reference dates are explicit', /1er septembre[\s\S]*?31 août/i],
  ['N5 threshold uses January 1 reference', /nés avant le\s*<strong>1er janvier 2016<\/strong>/i],
  ['scratch-only rule and N5 FFC/NL treatment are explained', /Scratch uniquement[\s\S]*?points UFOLEP[\s\S]*?championnat UFOLEP[\s\S]*?FFC ou NL[\s\S]*?sans points UFOLEP/i],
  ['detection screen shows dynamic season start and end dates', /Du 1er septembre \$\{season\.seasonStartYear\} au 31 août \$\{season\.seasonEndYear\}/],
  ['application script cache version bumped', /app\.js\?v=117/],
  ['service worker cache version bumped', /trial-manager-cache-v128/]
];
for (const [name, pattern] of checks) {
  if (!pattern.test(app + '\n' + html + '\n' + sw)) throw new Error(`Échec : ${name}`);
  console.log(`✓ ${name}`);
}
console.log(`${checks.length} vérifications des explications réglementaires réussies.`);
