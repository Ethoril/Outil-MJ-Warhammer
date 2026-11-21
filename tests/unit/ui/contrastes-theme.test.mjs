import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

// Refonte de l'interface, CA21 : police système partout, aucune police décorative chargée, thèmes clair et sombre
// conservés, contrastes de texte au moins AA (4,5:1) pour les couples texte/fond des jetons de couleur des deux thèmes.
const read = path => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');
const mj = read('MJ.css'), workspace = read('js/ui/workspace.css'), campaign = read('js/ui/campaign-workspace.css');

/** Déclarations `--nom: valeur` du premier bloc dont l'en-tête correspond à `header` (bloc imbriqué compris). */
function tokens(css, header) {
  const at = css.search(header);
  assert.ok(at >= 0, `bloc introuvable : ${header}`);
  const open = css.indexOf('{', at);
  let depth = 0, end = open;
  for (; end < css.length; end += 1) { if (css[end] === '{') depth += 1; else if (css[end] === '}' && --depth === 0) break; }
  const body = css.slice(open + 1, end).replace(/\/\*[\s\S]*?\*\//g, '');
  const inner = body.indexOf('{');
  const flat = inner >= 0 ? body.slice(inner + 1) : body;
  return Object.fromEntries([...flat.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
}

function resolve(map, value, seen = new Set()) {
  const ref = /^var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)$/.exec(value || '');
  if (!ref) return value;
  if (seen.has(ref[1])) throw new Error(`boucle sur ${ref[1]}`);
  seen.add(ref[1]);
  return resolve(map, map[ref[1]] ?? ref[2], seen);
}

function luminance(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  assert.ok(m, `couleur hexadécimale attendue : ${hex}`);
  const full = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

function checkPairs(map, pairs, theme) {
  const failures = [];
  for (const [fg, bg] of pairs) {
    const a = fg.startsWith('#') ? fg : resolve(map, map[fg]), b = bg.startsWith('#') ? bg : resolve(map, map[bg]);
    assert.ok(a && b, `${theme} : jeton manquant (${fg} sur ${bg})`);
    const value = ratio(a, b);
    if (value < 4.5) failures.push(`${fg} (${a}) sur ${bg} (${b}) : ${value.toFixed(2)}`);
  }
  assert.deepEqual(failures, [], `${theme} : contrastes sous 4,5:1`);
}

// Couples texte/fond de l'application (MJ.css) : texte courant, atténué, titres, accent, camps, PV, sémantique, puces.
const APP_PAIRS = [
  ...['--text', '--muted', '--heading-color', '--accent-text', '--camp-pj', '--camp-allie', '--camp-ennemi', '--camp-neutre',
    '--hp-ok', '--hp-warn', '--hp-crit', '--success', '--danger', '--info-fg'].flatMap(fg => [[fg, '--bg'], [fg, '--panel']]),
  ['--text', '--panel-2'], ['--chip-text', '--chip'],
  ['#ffffff', '--accent'] // bouton principal (Tour suivant, Commencer)
];
// Couples de l'espace Jouer (js/ui/workspace.css).
const PLAY_PAIRS = [
  ...['--j-paper', '--j-panel', '--j-wash', '--j-token-bg', '--j-input-bg', '--j-free'].map(bg => ['--j-ink', bg]),
  ...['--j-paper', '--j-panel'].flatMap(bg => [['--j-soft', bg], ['--j-red', bg]]),
  ['--j-darkbar-text', '--j-darkbar'], ['--j-chip-selected-text', '--j-chip-selected-bg'], ['--button-text', '--accent'],
  ['--j-outcome-success-text', '--j-outcome-success-bg'], ['--j-outcome-failure-text', '--j-outcome-failure-bg'], ['--j-outcome-crit-text', '--j-outcome-crit-bg']
];

const appLight = tokens(mj, /^:root\s*\{/m), appDark = tokens(mj, /^:root\[data-theme="dark"\]\s*\{/m), appSystemDark = tokens(mj, /@media \(prefers-color-scheme: dark\)/);
const playLight = tokens(workspace, /^#workspace-play\s*\{/m);
const playDark = { ...playLight, ...tokens(workspace, /^:root\[data-theme="dark"\] #workspace-play\s*\{/m) };
const playSystemDark = { ...playLight, ...tokens(workspace, /@media \(prefers-color-scheme: dark\)/) };

test('CA21 — contrastes AA des couples texte/fond, thème clair', () => {
  checkPairs(appLight, APP_PAIRS, 'application, clair');
  checkPairs(playLight, PLAY_PAIRS, 'Jouer, clair');
});

test('CA21 — contrastes AA des couples texte/fond, thème sombre (choisi ou système)', () => {
  checkPairs({ ...appLight, ...appDark }, APP_PAIRS, 'application, sombre');
  checkPairs(playDark, PLAY_PAIRS, 'Jouer, sombre');
  // Le sombre du système et le sombre choisi sont le même thème.
  assert.deepEqual(appSystemDark, appDark, 'MJ.css : sombre système = sombre choisi');
  for (const [key, value] of Object.entries(playSystemDark)) assert.equal(value, playDark[key], `Jouer : ${key} identique en sombre système et choisi`);
});

test('CA21 — police système partout : aucune @font-face, aucune police décorative, aucun fichier de police mis en cache', () => {
  for (const [name, css] of [['MJ.css', mj], ['workspace.css', workspace]]) {
    assert.ok(!/@font-face/.test(css), `${name} ne déclare aucune police`);
    assert.ok(!/Grenze|Alegreya|\.woff2?\b/i.test(css), `${name} ne nomme aucune police décorative`);
  }
  assert.ok(!/assets\/fonts|\.woff2?\b/.test(read('sw.js')), 'sw.js ne met aucune police en cache');
  assert.equal(existsSync(new URL('../../../assets/fonts', import.meta.url)), false, 'assets/fonts/ retiré');
  const system = /-apple-system[^;]*BlinkMacSystemFont[^;]*"Segoe UI"[^;]*system-ui/;
  assert.match(appLight['--font-ui'], system, 'MJ.css : --font-ui = police système');
  for (const token of ['--font-display', '--font-text']) assert.equal(appLight[token], 'var(--font-ui)', `MJ.css : ${token} suit la police système`);
  for (const token of ['--j-serif', '--j-sans']) assert.equal(playLight[token], 'var(--font-ui)', `workspace.css : ${token} suit la police système`);
  assert.ok(!/@font-face|\.woff2?\b/.test(campaign), 'campaign-workspace.css ne charge aucune police');
});
