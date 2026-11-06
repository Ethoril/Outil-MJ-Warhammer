import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';

// C40 (G-DIV-17) : un capteur divin (Œil de l'aigle : Aigle spectral) est « hors de l'ordre du combat » ; il est au banc
// par construction (tests/unit/divin/invocations.test.js, « capteur : participant hors ordre, au banc »),
// mais l'interface ne doit pas lui proposer « Faire entrer » comme à un combattant ordinaire.
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
    const common = { zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 50, CT: 40, F: 40, E: 40, I: 40, Ag: 40, FM: 40 }, skills: [], equipment: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, actions: [] };
    const priest = { ...common, id: 'priest', name: 'Prêtre', kind: 'PJ', camp: 'pj', initiative: 50, extensions: { v5: {} } };
    const renfort = { ...common, id: 'renfort', name: 'Renfort', kind: 'Créature', camp: 'ennemi', zone: 'bench', initiative: 0, extensions: { v5: {} } };
    const eagle = { id: 'eagle', name: 'Aigle spectral', kind: 'Créature', camp: 'pj', zone: 'bench', initiative: 0, hp: 0, maxHp: null, caracs: {}, skills: [], equipment: [], states: [], actions: [], traits: ['Invisible', 'Vol (120)'],
      extensions: { sensor: true, v5: { divineSummon: { kind: 'sensor' } } } };
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: 'priest', order: ['priest'], participants: [priest, renfort, eagle] } });
    const view = initWorkspaceView({ Store: store, mount: document.querySelector('#mount'), showNavigation: false, actions: { renderRules() {}, renderLog() {}, enterParticipant() {} } });
    view.setSpace('play');
  });
  const bench = page.locator('.workspace-bench');
  assert.ok(await bench.getByRole('button', { name: 'Faire entrer Renfort' }).isVisible(), 'témoin : un renfort ordinaire au banc garde « Faire entrer »');
  assert.ok(await bench.locator('.combatant-name', { hasText: 'Aigle spectral' }).isVisible(), 'le capteur reste visible au banc');
  assert.equal(await bench.getByRole('button', { name: 'Faire entrer Aigle spectral' }).count(), 0, 'un capteur hors de l’ordre ne doit pas proposer « Faire entrer »');
  assert.deepEqual(errors, []);
  console.log('lot4-c40-capteur-browser: OK');
} finally { await browser.close(); server.close(); }
