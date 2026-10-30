import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Lot v3-B : parcours navigateur sur l'application complète et son vrai Store (livre de base V5 v3) :
// tir sur un adversaire engagé avec le tireur (p.165), tir double À répétition (p.305), Peur qui retire l'Élan (p.183).
const root = fileURLToPath(new URL('../', import.meta.url)), base = '/Outil-MJ-Warhammer/';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    assert.ok(pathname.startsWith(base));
    const path = resolve(root, pathname.slice(base.length) || 'index.html');
    assert.ok(path.startsWith(resolve(root) + sep) && statSync(path).isFile());
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(path));
  } catch { res.writeHead(404); res.end('Not found'); }
});
const person = (id, name, camp, extra = {}) => ({ id, name, kind: id === 'm' || id === 'b' ? 'PNJ' : 'PJ', camp, zone: 'active', initiative: id === 'a' ? 60 : 30, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 60, F: 40, E: 30, BE: 3, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40 },
  skills: [{ id: 'dodge', name: 'Esquive', status: 'resolved', total: 40, carac: 'Ag' }], actions: [], equipment: [], traits: [], talents: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } }, ...extra });
const gun = { id: 'gun', kind: 'weapon', name: 'Arquebuse à répétition d’essai', category: 'Poudre noire', damage: '+4', range: '50', hands: 2,
  keywords: [{ id: 'a-repetition', parameter: '3' }], extensions: { v5: { reloadState: { revision: 1, repeaterRating: 3, shotsRemaining: 3, reloadSuccesses: 3,
    accumulatedSuccesses: 0, reloading: false, requiresReload: false } } } };
const shotAction = { id: 'shot', note: 'Tir à répétition', type: 'attack', attr: 'CT', base: 60, damage: 4, qualities: [{ id: 'a-repetition', parameter: '3' }],
  extensions: { fiche: { equipmentId: 'gun' } } };
const pistolAction = { ...shotAction, id: 'pshot', note: 'Tir au pistolet', qualities: [...shotAction.qualities, { id: 'pistolet' }] };
const fixture = () => ({ schemaVersion: 3, reserve: [], diceLines: [], log: [], extensions: { v5: { combatId: 'v3-b-browser', turnIndex: 1 } },
  combat: { round: 1, currentActorId: 'a', order: ['a', 'b', 'm'], participants: [
    person('a', 'Aline', 'pj', { equipment: [gun], actions: [shotAction, pistolAction], extensions: { v5: { hasMomentum: true } } }),
    person('b', 'Garde', 'ennemi'),
    person('m', 'Monstre', 'ennemi', { traits: ['Fear (1)'] })
  ] } });

await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined) });
try {
  const context = await browser.newContext({ serviceWorkers: 'block' }), page = await context.newPage(), errors = [];
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}${base}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
  await page.locator('#tab-combat').click();
  const load = state => page.evaluate(async value => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready; await Store.loadFromJSON(value); }, state);
  const read = () => page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready; return JSON.parse(Store.getFullJSON()); });
  const play = page.locator('#workspace-root');
  const settleChoices = async () => {
    const groups = play.locator('.workspace-v5-choice-group');
    for (let i = 0; i < await groups.count(); i++) { const radio = groups.nth(i).locator('input[type="radio"]').first(); if (await radio.isEnabled()) await radio.check(); }
  };
  const calculate = async () => { await play.getByRole('button', { name: 'Calculer', exact: true }).click(); await play.locator('.workspace-result-live').waitFor(); await page.waitForTimeout(400); await settleChoices(); await page.waitForTimeout(200); };
  const prepareShot = async (id = 'shot') => {
    await play.locator('[data-workspace-select="a"]').click();
    await play.locator(`[data-action-key="${id}"]`).click();
    await play.getByLabel('Type d’action').selectOption('attack');
    await play.getByLabel('Nature du Test').selectOption('ranged');
  };
  const noDefense = async () => { const roll = play.locator('[data-roll-input="defense"]'); if (await roll.count()) await roll.fill(''); };
  const details = async () => { await play.getByText('Détail des calculs et règles').click(); return play.locator('.workspace-v5-calculations').innerText(); };

  // 1. Tir sur un adversaire engagé avec le tireur : se résout comme une mêlée, sans Désavantage de tir dans la mêlée (p.165).
  await load(fixture());
  await prepareShot();
  await play.getByLabel('La cible est engagée au corps à corps (Désavantage au tir)').selectOption('true');
  await play.locator('[data-roll-input="attack"]').fill('31');
  await calculate();
  assert.match(await details(), /1 Désavantage/u, 'tir dans une mêlée : Désavantage affiché');
  await prepareShot('pshot');
  await play.getByLabel(/La cible est engagée avec le tireur/u).selectOption('true');
  await play.getByLabel(/Défense de Garde : caractéristique ou jet/u).selectOption('CC');
  await play.locator('[data-roll-input="defense"]').fill('45');
  await calculate();
  const engaged = await play.locator('.workspace-result-live').innerText() + await details();
  assert.match(engaged, /0 Désavantage/u, 'engagé avec le tireur : ne compte pas comme un tir dans la mêlée');
  assert.doesNotMatch(engaged, /Confirmer la règle autorisant cette défense contre un tir/u);

  // 2. Tir double À répétition : −1 DR, deux munitions consommées en deux tirs d'une seule Action (p.305).
  await load(fixture());
  await prepareShot();
  await noDefense();
  await play.getByLabel(/À répétition : tir double/u).selectOption('true');
  await play.locator('[data-roll-input="attack"]').fill('31');
  await calculate();
  assert.match(await details(), /À répétition : tir double/u, 'le −1 DR du tir double figure au détail');
  const apply = async () => {
    const button = play.locator('.workspace-result-live').getByRole('button', { name: /Appliquer|Enregistrer le résultat/ });
    assert.equal(await button.isEnabled(), true, await play.locator('.workspace-result-live').innerText());
    await button.click();
  };
  await apply();
  let state = await read();
  assert.equal(state.combat.participants.find(row => row.id === 'a').equipment[0].extensions.v5.reloadState.shotsRemaining, 2, 'premier tir : une munition');
  await prepareShot();
  await noDefense();
  await play.getByLabel(/À répétition : tir double/u).selectOption('true');
  await play.getByLabel(/Premier tir du tir double/u).selectOption({ index: 1 });
  await play.locator('[data-roll-input="attack"]').fill('31');
  await calculate();
  await apply();
  state = await read();
  assert.equal(state.combat.participants.find(row => row.id === 'a').equipment[0].extensions.v5.reloadState.shotsRemaining, 1, 'second tir : une munition de plus');

  // 3. Peur : l'Élan est perdu à l'instant où la Peur s'installe (p.183).
  await load(fixture());
  const result = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready; return Store.applyCreaturePsychology('m', 'fear', { targetId: 'a' }); });
  assert.equal(result.ok, true, result.message);
  state = await read();
  const hero = state.combat.participants.find(row => row.id === 'a');
  assert.ok(hero.states.some(row => row.key === 'fear-of-talent'), 'la Peur est posée');
  assert.equal(hero.extensions.v5.hasMomentum, false, 'l’Élan est perdu');
  assert.deepEqual(errors, []);
  console.log('v3-B navigateur : tir sur engagé avec le tireur, tir double À répétition, Peur qui retire l’Élan OK');
} finally {
  await browser.close();
  server.close();
}
