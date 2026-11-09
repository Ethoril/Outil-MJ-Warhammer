import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { openU1Settings } from './helpers/u1-drawer.mjs';

const root = fileURLToPath(new URL('..', import.meta.url)), base = '/Outil-MJ-Warhammer/';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css; charset=utf-8' };
const server = createServer((req, res) => {
  try { const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); assert.ok(pathname.startsWith(base));
    const path = resolve(root, pathname.slice(base.length) || 'index.html'); assert.ok(path.startsWith(resolve(root) + sep) && statSync(path).isFile());
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(readFileSync(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  page.setDefaultTimeout(8000);
  await page.goto(`http://127.0.0.1:${server.address().port}${base}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
  await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready;
    const person = (id, camp, extra = {}) => ({ id, name: id === 'a' ? 'Aline' : 'Garde', kind: camp === 'pj' ? 'PJ' : 'PNJ', camp, zone: 'active', initiative: id === 'a' ? 60 : 30, hp: 30, maxHp: 30,
      caracs: { CC: 50, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, skills: [], equipment: [], traits: [], talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
    const a = person('a', 'pj', { actions: [{ id: 'strike', name: 'Frappe', note: 'Frappe', type: 'attack', attr: 'CC', base: 60, damage: 5, qualities: [] }] });
    const b = person('b', 'ennemi', { talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }], states: [{ id: 'stun', key: 'sonne', name: 'Sonné', level: 1 }] });
    await Store.loadFromJSON({ schemaVersion: 3, reserve: [], diceLines: [], log: [], extensions: { v5: { combatId: 'defense-test', turnIndex: 1 } }, combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [a, b] } });
    await Store.startTalentSession();
  });
  await page.locator('#tab-combat').click();
  const combat = page.locator('#workspace-root');
  await combat.locator('[data-workspace-select="a"]').click();
  await openU1Settings(combat);
  const choice = combat.locator('[data-focus-key="defense-pre-roll-talent"]');
  await choice.selectOption('strong-minded');
  await combat.getByRole('textbox', { name: /Attaque/ }).fill('30');
  await combat.getByRole('textbox', { name: /Jet de défense/ }).fill('50');
  await combat.getByRole('button', { name: 'Calculer', exact: true }).click();
  await combat.locator('.workspace-resolution-footer').getByRole('button', { name: /Appliquer|Enregistrer le résultat/ }).click();
  await page.waitForFunction(async () => !(await import('/Outil-MJ-Warhammer/js/main.js')).Store.getObstinateStatus('b').available);
  const beforeUndo = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return [Store.getObstinateStatus('a'), Store.getObstinateStatus('b')]; });
  assert.equal(beforeUndo[1].available, false);
  await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.undo(); });
  assert.equal(await page.evaluate(async () => (await import('/Outil-MJ-Warhammer/js/main.js')).Store.getObstinateStatus('b').available), true);
  console.log('Défense : choix, application au défenseur et undo OK');
} finally { await browser.close(); await new Promise(done => server.close(done)); }
