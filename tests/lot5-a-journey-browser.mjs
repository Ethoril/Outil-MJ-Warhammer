import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Lot 5 · A, parcours dans Jouer.
//  C47 (mineur) : après le premier tir d'un tir double À répétition, le second tir est préparé (case cochée, premier tir désigné).
const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/harness') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><html lang="fr"><head><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head><body><main id="mount"></main></body></html>');
      return;
    }
    const file = resolve(root, '.' + decodeURIComponent(path));
    if (!file.startsWith(resolve(root) + sep) || !statSync(file).isFile()) throw new Error('missing');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
let failures = 0;
const check = async (name, fn) => { try { await fn(); console.log('ok  -', name); } catch (error) { failures++; console.log('FAIL -', name, '\n   ', error.message.split('\n').slice(0, 5).join('\n    ')); } };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/harness`);
  await page.evaluate(async () => {
    const { createStore } = await import('/js/core/store.js');
    const { initWorkspaceView } = await import('/js/ui/workspace-view.js');
    const store = createStore({ storage: null });
    await store.ready;
    const shot = { id: 'a-tir', type: 'attack', note: 'Tir', name: 'Tir', attr: 'CT', base: 60, damage: 4, qualities: [{ id: 'a-repetition', parameter: '3' }] };
    const common = { zone: 'active', hp: 30, maxHp: 30, caracs: { CC: 50, CT: 60, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, FM: 40 }, skills: [], equipment: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } };
    const actor = { ...common, id: 'tireur', name: 'Tireur', kind: 'PNJ', camp: 'ennemi', initiative: 50, actions: [shot], equipment: [{ id: 'pistolet', kind: 'weapon', name: 'Pistolet', category: 'Poudre noire', damage: '+4', range: '20', keywords: [{ id: 'recharge', parameter: '1' }] }] };
    const target = { ...common, id: 'pj', name: 'Ulrike', kind: 'PJ', camp: 'pj', initiative: 40, actions: [] };
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'c47', turnIndex: 1 } }, combat: { round: 1, currentActorId: 'tireur', order: ['tireur', 'pj'], participants: [actor, target] } });
    window.__store = store;
    const view = initWorkspaceView({ Store: store, mount: document.querySelector('#mount'), showNavigation: false, actions: { renderRules() {}, renderLog() {}, applyResolution: preview => store.applyResolution(preview) } });
    view.setSpace('play');
    if (!view.openResolution({ ...shot, participantId: 'tireur', targetId: 'pj' })) throw new Error('résolution indisponible');
    window.__view = view;
  });
  const toggle = page.locator('[data-circumstances-toggle]'), drawer = page.locator('.workspace-resolution-drawer');
  const openDrawer = async () => { if (await drawer.isHidden()) await toggle.click(); };
  const dump = async label => { if (process.env.DUMP) console.log('---', label, (await page.locator('.workspace-resolution').innerText()).split(String.fromCharCode(10)).filter(Boolean).join(' | ')); };
  const field = key => page.locator(`.workspace-resolution [data-blocking-field="${key}"]`).first();
  await check('C47 : le second tir est préparé après le premier tir du tir double', async () => {
    await openDrawer();
    await page.getByRole('group', { name: /tir double/ }).getByRole('button', { name: 'Oui', exact: true }).click();
    await page.locator('input[aria-label^="Munitions restantes"]').fill('3'); await page.keyboard.press('Enter');
    await page.getByRole('group', { name: /Tir opposé par Esquive/ }).getByRole('button', { name: 'Oui', exact: true }).click();
    await drawer.getByRole('button', { name: 'Fermer' }).click();
    await page.locator('.workspace-resolution select:has(option[value="Ag"])').selectOption('Ag');
    await field('attack-roll').fill('25'); await page.keyboard.press('Enter');
    await field('defense-roll').fill('80'); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Calculer', exact: true }).click();
    await page.getByRole('button', { name: /^Appliquer/ }).click();
    await page.waitForFunction(() => window.__store.getFullJSON().includes('standardTurnActions'));
    await openDrawer();
    const doubleShot = page.getByRole('group', { name: /tir double/ });
    assert.equal(await doubleShot.getByRole('button', { name: 'Oui', exact: true }).getAttribute('aria-pressed'), 'true', 'la case tir double reste cochée');
    const firstShot = page.locator('select[aria-label^="Premier tir du tir double"]');
    assert.notEqual(await firstShot.inputValue(), '', 'le premier tir est déjà désigné');
    await drawer.getByRole('button', { name: 'Fermer' }).click();
    await field('attack-roll').fill('30'); await page.keyboard.press('Enter');
    await field('defense-roll').fill('80'); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Calculer', exact: true }).click();
    await page.getByRole('button', { name: /^Appliquer/ }).click();
    await page.waitForFunction(() => (JSON.parse(window.__store.getFullJSON()).extensions.v5.standardTurnActions || []).length === 2);
  });
  await check('C50 : recharge d’une arme jamais tirée refusée avec la raison en français ; compteur « chargée »', async () => {
    // U3 : le rechargement est une puce sur la fiche de l’acteur ; le MJ l’ouvre.
    const chip = page.locator('.workspace-sheet-actor details.workspace-equipment-chip > summary', { hasText: 'Rechargement' });
    if (!await chip.evaluate(el => el.parentElement.open)) await chip.click();
    const panel = page.locator('.workspace-weapon-reload');
    assert.match(await panel.innerText(), /Pistolet · chargée/);
    assert.doesNotMatch(await panel.innerText(), /0 tir\(s\) restant/);
    await panel.getByRole('button', { name: 'Commencer la recharge' }).click();
    const message = await panel.locator('.workspace-error').innerText();
    assert.match(message, /pas été tirée/);
    assert.doesNotMatch(message, /non enregistré|weapon-not-fired/);
  });
  assert.deepEqual(errors, []);
} finally { await browser.close(); server.close(); }
if (failures) { console.log(`${failures} cas en échec`); process.exit(1); }
console.log('tous les cas passent');
