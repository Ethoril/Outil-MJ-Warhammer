import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';

// C41 : Peur/Terreur « Au contact ou à la vue » et « Création de familier » n'existaient que sur les anciennes cartes (card.js) ;
// elles doivent se trouver sur la fiche du personnage actif de l'Espace de séance, avec le même effet qu'avant.
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
    const common = { zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 50, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, skills: [], equipment: [], states: [], talents: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, actions: [] };
    const wraith = { ...common, id: 'wraith', name: 'Spectre', kind: 'Créature', camp: 'ennemi', initiative: 60, traits: ['Peur (2)'], extensions: { v5: {} } };
    const hero = { ...common, id: 'hero', name: 'Héros', kind: 'PJ', camp: 'pj', initiative: 50, traits: [], fate: 1, extensions: { v5: { fate: 1 } } };
    const imp = { ...common, id: 'imp', name: 'Diablotin', kind: 'PNJ', camp: 'pj', initiative: 30, traits: [], extensions: { v5: {} } };
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: 'wraith', order: ['wraith', 'hero', 'imp'], participants: [wraith, hero, imp] } });
    window.__store = store;
    const view = initWorkspaceView({ Store: store, mount: document.querySelector('#mount'), showNavigation: false, actions: { renderRules() {}, renderLog() {} } });
    window.__view = view;
    view.setSpace('play');
  });
  const stateKeys = id => page.evaluate(i => window.__store.listParticipants().find(row => row.id === i).states.map(state => state.key), id);
  // Peur (2) : la commande est sur la fiche du combattant actif, pas chez un combattant sans le Trait.
  const sheet = page.locator('.workspace-sheet-actor');
  const psychology = sheet.locator('.actor-psychology');
  assert.equal(await psychology.count(), 1, 'la fiche du combattant avec Peur (2) doit proposer « Au contact ou à la vue »');
  assert.match(await psychology.innerText(), /Au contact ou à la vue/);
  assert.deepEqual(await stateKeys('hero'), []);
  await psychology.locator('.btn-creature-psychology').click();
  await page.waitForFunction(() => window.__store.listParticipants().find(row => row.id === 'hero').states.some(state => state.key === 'fear-of-talent'));
  assert.ok((await stateKeys('hero')).includes('fear-of-talent'), 'le clic applique la Peur à l’adversaire (même effet que l’ancienne carte)');
  assert.equal(await page.evaluate(() => window.__store.listParticipants().find(row => row.id === 'hero').states.find(state => state.key === 'fear-of-talent').rating), 2);
  // Familier : plus de création dans le cartouche (déclaré par la fiche du site ou le profil) ; un lien existant reste affiché.
  await page.evaluate(() => { window.__store.setCurrentActor?.('hero'); });
  await page.evaluate(async () => { await window.__store.updateParticipant('wraith', { zone: 'bench' }); });
  assert.equal(await page.locator('.btn-create-familiar').count(), 0, 'le cartouche du PJ ne propose plus la création de familier');
  const created = await page.evaluate(async () => window.__store.createFamiliar('hero', 'imp', { system: 'homunculus', kind: 'power', wind: 'aqshy', resource: 'fate' }));
  assert.equal(created?.ok, true, JSON.stringify(created));
  await page.evaluate(() => window.__view.setSpace('play'));
  await page.waitForFunction(() => (window.__store.listParticipants().find(row => row.id === 'hero').extensions.v5.familiarLinks || []).length === 1);
  await page.locator('.actor-familiar .familiar-link').first().waitFor({ state: 'attached', timeout: 5000 });
  assert.deepEqual(errors, []);
  console.log('lot4-c41-browser: OK');
} finally { await browser.close(); server.close(); }
