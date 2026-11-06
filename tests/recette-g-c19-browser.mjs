import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync, mkdirSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';

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
await new Promise(resolveServer => server.listen(0, '127.0.0.1', resolveServer));
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
    const action = { id: 'blade', type: 'attack', note: 'Hallebarde', attr: 'CC', base: 50, damage: 5, extensions: { v5: { slModifier: 2 } } };
    const common = { zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 50, CT: 40, F: 40, E: 40, Ag: 40, FM: 40 }, skills: [], equipment: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 } };
    const actor = { ...common, id: 'npc', name: 'Garde', kind: 'PNJ', camp: 'ennemi', initiative: 50, actions: [action], extensions: { v5: {} } };
    const target = { ...common, id: 'pj', name: 'Ulrike', kind: 'PJ', camp: 'pj', initiative: 40, actions: [], extensions: { v5: { divineEffects: [{ id: 'protection', attackDeterrent: { skill: 'Calme', slBonus: 2 } }] } } };
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: 'npc', order: ['npc', 'pj'], participants: [actor, target] } });
    const view = initWorkspaceView({ Store: store, mount: document.querySelector('#mount'), showNavigation: false, actions: { renderRules() {}, renderLog() {}, applyResolution: preview => store.applyResolution(preview) } });
    view.setSpace('play');
    if (!view.openResolution({ ...action, participantId: 'npc', targetId: 'pj' })) throw new Error('résolution indisponible');
    window.__u1 = { view, store };
  });
  assert.equal(await page.locator('.workspace-resolution-footer').getByRole('button',{name:'Ignorer',exact:true}).count(),0,'un jet principal ne peut être ignoré');
  await page.locator('[data-roll-input="attack"]').fill('34');
  await page.locator('[data-roll-input="defense"]').fill('82');
  await page.locator('[data-focus-key="calculate"]').click();
  const footer=page.locator('.workspace-resolution-footer');
  const row=footer.locator('li').filter({hasText:'Bénédiction de Protection'});
  await row.getByRole('button',{name:'Ignorer',exact:true}).click();
  assert.equal(await footer.locator('[data-focus-key="apply"]').isEnabled(),true);
  await page.locator('[data-focus-key="target-none"]').click();
  assert.deepEqual(await page.evaluate(()=>window.__u1.view.getViewState().resolution.ignoredConditions),[]);
  await page.locator('[data-focus-key="target-pj"]').click();
  await page.locator('[data-focus-key="calculate"]').click();
  await footer.locator('li').filter({hasText:'Bénédiction de Protection'}).getByRole('button',{name:'Ignorer',exact:true}).click();
  assert.equal(await footer.locator('[data-focus-key="apply"]').isEnabled(),true);
  await footer.locator('[data-focus-key="apply"]').click();
  const state=await page.evaluate(()=>JSON.parse(window.__u1.store.getFullJSON()));
  assert.ok(state.combat.participants.find(p=>p.id==='pj').hp<20);
  assert.match(state.log.map(x=>x.text).join(' '),/Condition ignorée par le MJ : .*Protection/);
  assert.deepEqual(errors, []);
} finally { await browser.close(); await new Promise(resolveClose=>server.close(resolveClose)); }
