import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';

// Lot 6 · recette des partiels, groupe C (G-BES-4, G-BES-5) : Régénération, têtes, Nuée et Venin n'existaient que sur
// les anciennes cartes de combat ; ils doivent se trouver sur la fiche du combattant actif de l'Espace de séance.
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
const browser = await launchBrowser();
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
    const common = { zone: 'active', caracs: { CC: 50, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, skills: [], equipment: [], states: [], talents: [], armor: { head: 0, body: 0, arms: 0, legs: 0 } };
    const troll = { ...common, id: 'troll', name: 'Troll', kind: 'Créature', camp: 'ennemi', initiative: 60, hp: 10, maxHp: 30, traits: ['Régénération'], extensions: { v5: {} } };
    const swarm = { ...common, id: 'swarm', name: 'Rats', kind: 'Créature', camp: 'ennemi', initiative: 40, hp: 20, maxHp: 20, traits: ['Nuée', 'Venin'], extensions: { v5: {} } };
    const hero = { ...common, id: 'hero', name: 'Héros', kind: 'PJ', camp: 'pj', initiative: 50, hp: 20, maxHp: 20, traits: [], extensions: { v5: {} } };
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: 'troll', order: ['troll', 'hero', 'swarm'], participants: [troll, hero, swarm] } });
    window.__store = store;
    const view = initWorkspaceView({ Store: store, mount: document.querySelector('#mount'), showNavigation: false, actions: { renderRules() {}, renderLog() {} } });
    window.__view = view;
    view.setSpace('play');
  });
  const sheet = page.locator('.workspace-sheet-actor');
  const regeneration = sheet.locator('.actor-regeneration');
  assert.equal(await regeneration.count(), 1, 'la fiche du Troll propose la Régénération');
  await regeneration.locator('input').first().fill('7');
  await regeneration.locator('.btn-regeneration').click();
  await page.waitForFunction(() => window.__store.listParticipants().find(row => row.id === 'troll').hp > 10, null, { timeout: 5000 });
  assert.ok(await page.evaluate(() => window.__store.listParticipants().find(row => row.id === 'troll').hp) > 10, 'Régénérer rend des Blessures');

  await page.evaluate(async () => { const state = JSON.parse(window.__store.getFullJSON()); state.combat.currentActorId = 'swarm'; await window.__store.loadFromJSON(state); window.__view.setSpace('prepare'); window.__view.setSpace('play'); });
  await page.waitForTimeout(300);
  const states = page.locator('.workspace-sheet-actor .actor-creature-states');
  assert.equal(await states.count(), 1, 'la fiche de la Nuée propose Fin de Round et Venin');
  assert.ok(await states.locator('.btn-swarm-end-round').count(), 'bouton de fin de Round de la Nuée');
  assert.equal(errors.length, 0, errors.join(' | '));
  console.log('lot6-c-browser: OK');
} finally { await browser.close(); server.close(); }
