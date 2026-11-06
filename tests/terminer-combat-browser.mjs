import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';

// « Terminer le combat » dans les outils de séance : confirmation, Annuler laisse le combat, Confirmer le vide ; pas de débordement à 390 px.
const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    const file = resolve(root, '.' + decodeURIComponent(path === '/' ? '/index.html' : path));
    if (!file.startsWith(resolve(root) + sep) || !statSync(file).isFile()) throw new Error('missing');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const fighter = (id, name, camp, initiative) => ({ id, name, kind: camp === 'ennemi' ? 'PNJ' : 'PJ', camp, zone: 'active', initiative, hp: 14, maxHp: 14,
  caracs: { CC: 45, CT: 40, F: 35, E: 35, I: 40, Ag: 38, Dex: 35, Int: 30, FM: 35, Soc: 30, M: 4 }, skills: [], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 1, arms: 0, legs: 0 }, extensions: { v5: {} } });
const save = { schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [fighter('a', 'Gunther', 'pj', 60), fighter('b', 'Orc', 'ennemi', 50)] } };
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const dialogs = [];
  let accept = false;
  page.on('dialog', d => { dialogs.push(d.message()); accept ? d.accept() : d.dismiss(); });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.locator('#app-content').waitFor({ state: 'visible' });
  accept = true;
  await page.locator('#file-input').setInputFiles({ name: 'save.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(save)) });
  await page.locator('#tab-combat').click();
  const btn = page.locator('#workspace-end-combat');
  await btn.waitFor({ state: 'visible', timeout: 5000 });
  const tokens = () => page.locator('.workspace-token').count();
  assert.ok(await tokens() >= 2, 'le plateau montre les combattants');
  // Annuler : le combat reste.
  dialogs.length = 0; accept = false;
  await btn.click();
  assert.equal(dialogs.length, 1);
  assert.match(dialogs[0], /Retirer tous les combattants/);
  assert.ok(await tokens() >= 2, 'Annuler laisse le combat');
  // Mobile : pas de débordement horizontal, bouton visible.
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await btn.isVisible());
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'barre sans débordement à 390 px');
  if (process.env.TERMINER_SHOT) await page.screenshot({ path: process.env.TERMINER_SHOT });
  await page.setViewportSize({ width: 1440, height: 900 });
  // Confirmer : le combat est vidé.
  accept = true;
  await btn.click();
  await page.waitForFunction(() => document.querySelectorAll('.workspace-token').length === 0, null, { timeout: 5000 });
  await btn.waitFor({ state: 'hidden', timeout: 5000 });
  assert.deepEqual(errors, []);
  console.log('terminer-combat: OK');
} finally { await browser.close(); server.close(); }
