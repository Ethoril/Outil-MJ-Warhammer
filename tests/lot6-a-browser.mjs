// Lot 6 · recette des partiels, groupe A : ligne « À saisir » du tir esquivé reliée à son champ (G-U1-1),
// coût en Chance avec le nom du payeur (G-DES-2), dé secondaire d'incident lancé avec les dés des PNJ (G-U1-2).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { launchBrowser } from './helpers/browser.mjs';
import { openU1Settings, openU1Types, clickU1Magic } from './helpers/u1-drawer.mjs';

const ROOT = resolve('.');
const MIME = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const file = resolve(join(ROOT, path));
    if (!file.startsWith(ROOT) || !(await stat(file)).isFile()) throw new Error('missing');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const caracs = { CC: 45, CT: 50, F: 40, E: 30, I: 40, Ag: 40, Dex: 30, Int: 50, FM: 50, Soc: 30 };
const person = (id, name, kind, camp, extra = {}) => ({ id, name, kind, camp, zone: 'active', init: 40, hp: 15, maxHp: 15, caracs,
  skills: [{ id: 'dodge', name: 'Esquive', status: 'resolved', total: 40, carac: 'Ag' }], actions: [], states: [], traits: [], talents: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const shooter = person('tireur', 'Tireur', 'PNJ', 'ennemi', {
  actions: [{ id: 'pshot', note: 'Tir au pistolet', type: 'attack', attr: 'CT', base: 50, damage: 4 }],
  extensions: { v5: { resources: { fortune: 2 } } } });
const mage = person('mage', 'Mage noir', 'PNJ', 'ennemi', {
  skills: [{ name: 'Focalisation', characteristic: 'FM', advances: 0, value: 50 }, { name: 'Langue (Magick)', characteristic: 'Int', advances: 10, value: 60 }],
  spells: [{ id: 'spell-tradition-brise-os', name: 'Brise-os' }], extensions: { v5: { magic: { lore: 'beasts' } } } });
const hero = person('heros', 'Héros', 'PJ', 'pj');
const state = current => ({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: current, order: ['tireur', 'mage', 'heros'], participants: [shooter, mage, hero] } });
const HARNESS = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head>
<body><div id="workspace-mount"></div><script type="module">
import { createStore } from '/js/core/store.js';
import { initWorkspaceView } from '/js/ui/workspace-view.js';
const store = createStore({ storage: null }); await store.ready;
await store.loadFromJSON(${JSON.stringify(state('tireur'))});
const view = initWorkspaceView({ mount: document.getElementById('workspace-mount'), Store: store, actions: { applyResolution: p => store.applyResolution(p) } });
view.setSpace('play'); window.__TEST__ = { Store: store, view };
</script></body></html>`;

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const pageErrors = []; page.on('pageerror', e => pageErrors.push(e.message));
  await page.route(`${baseUrl}/__lot6a__.html`, route => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HARNESS }));
  await page.goto(`${baseUrl}/__lot6a__.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.workspace-resolution');

  // G-U1-1 : tir d'un PNJ esquivé par un PJ, la ligne de confirmation mène au champ.
  await page.locator('[data-action-key="pshot"]').click();
  await openU1Types(page); await page.getByLabel('Type d’action').selectOption('attack');
  await openU1Settings(page); await page.getByLabel('Nature du Test').selectOption('ranged');
  // Chance → Avantage se choisit avant le jet.
  await page.getByLabel('Dépenser 1 Point de Chance pour obtenir Avantage avant le jet').check();
  await page.fill('[data-roll-input="attack"]', '31');
  if (await page.locator('[data-roll-input="defense"]').count()) await page.fill('[data-roll-input="defense"]', '45');
  await page.click('[data-focus-key="calculate"]');
  const link = page.locator('.workspace-field-error button', { hasText: 'Confirmer la règle autorisant cette défense contre un tir' });
  await link.waitFor({ timeout: 5000 });
  await link.click();
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.blockingField), 'ranged-opposition', 'le lien place le curseur sur la confirmation du tir esquivé');

  // G-DES-2 : le coût en Chance nomme le payeur et son solde.
  const live = await page.locator('.workspace-result-live').innerText();
  assert.match(live, /Coût proposé avant le jet : Tireur paie 1 Chance/, live);
  assert.doesNotMatch(live, /1 fortune/, live);

  // G-U1-2 : incident d'un mage PNJ, le d10 de Force de « Tenue indisciplinée » est lancé avec les dés des PNJ.
  await page.evaluate(async json => { await window.__TEST__.Store.loadFromJSON(json); }, state('mage'));
  await page.waitForTimeout(300);
  await clickU1Magic(page, 'channelling'); await openU1Settings(page);
  await page.fill('[data-roll-input="attack"]', '55');
  await page.click('[data-focus-key="calculate"]');
  const miscast = page.locator('[data-focus-key="magicMiscastRoll"]');
  await miscast.waitFor({ timeout: 5000 });
  await miscast.fill('30');
  await page.click('[data-focus-key="calculate"]');
  const secondary = page.locator('[data-focus-key="magicSecondaryDurationRoll"]');
  await secondary.waitFor({ timeout: 5000 });
  assert.equal(await secondary.getAttribute('data-blocking-field'), 'magic-secondary');
  assert.ok(await page.locator('.workspace-field-error button', { hasText: 'dé de Force de l’incident (1d10)' }).count(), 'la liste « À saisir » nomme le dé manquant, avec un lien');
  await page.getByRole('button', { name: 'Lancer tous les dés des PNJ' }).click();
  await page.waitForTimeout(500);
  const value = Number(await page.locator('[data-focus-key="magicSecondaryDurationRoll"]').inputValue());
  assert.ok(value >= 1 && value <= 10, `d10 de Force lancé : ${value}`);
  assert.equal(pageErrors.length, 0, pageErrors.join(' | '));
  console.log('lot6-a-browser: OK');
} finally { await browser.close(); await new Promise(r => server.close(r)); }
