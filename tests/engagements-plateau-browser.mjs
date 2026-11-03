import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Plateau des mêlées (spec docs/specs/engagements S1-S4) : zones, jetons, déplacement par le MJ, barre d'actions,
// Désengagement réglé et surnombre déduit dans le panneau de résolution.
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
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/harness`);
  await page.evaluate(async () => {
    const { createStore } = await import('/js/core/store.js');
    const { initWorkspaceView } = await import('/js/ui/workspace-view.js');
    const store = createStore({ storage: null });
    await store.ready;
    const fighter = (id, name, camp, initiative, extra = {}) => ({ id, name, kind: camp === 'ennemi' ? 'PNJ' : 'PJ', camp, zone: 'active', initiative, hp: 14, maxHp: 14,
      caracs: { CC: 45, CT: 40, F: 35, E: 35, I: 40, Ag: 38, Dex: 35, Int: 30, FM: 35, Soc: 30, M: 4 }, skills: [], talents: [], equipment: [], traits: [], states: [],
      armor: { head: 0, body: 1, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [],
      diceLines: [{ id: 'sword', participantId: 'gunther', type: 'attack', attr: 'CC', base: 48, note: 'Épée', damage: 'BF+4' }],
      combat: { round: 1, currentActorId: 'gunther', order: ['gunther', 'elsa', 'orc', 'aldric', 'gob'], participants: [
        fighter('gunther', 'Gunther', 'pj', 60), fighter('elsa', 'Elsa', 'pj', 55), fighter('orc', 'Orc', 'ennemi', 50, { skills: [{ name: 'Corps à corps (Base)', total: 55 }] }),
        fighter('aldric', 'Aldric', 'pj', 40), fighter('gob', 'Gobelin', 'ennemi', 30)] } });
    await store.engageParticipants('gunther', 'orc');
    await store.engageParticipants('aldric', 'orc');
    window.__store = store;
    const view = initWorkspaceView({ Store: store, mount: document.querySelector('#mount'), showNavigation: false, actions: { renderRules() {}, renderLog() {} } });
    window.__view = view;
    view.setSpace('play');
  });
  const zone = name => page.locator('.workspace-zone').filter({ has: page.locator('.workspace-zone-head', { hasText: name }) });
  // CA1-CA3 : une mêlée avec son rapport de forces, les Libres, jetons sélectionnables.
  await assert.doesNotReject(zone('Mêlée 1').waitFor({ timeout: 5000 }));
  assert.equal(await zone('Mêlée 1').locator('.workspace-zone-ratio').textContent(), '2 contre 1');
  assert.equal(await zone('Mêlée 1').locator('[data-workspace-select]').count(), 3);
  assert.equal(await zone('Libres').locator('[data-workspace-select]').count(), 2);
  assert.match(await page.locator('.workspace-token').filter({ has: page.locator('[data-workspace-select="orc"]') }).textContent(), /Engagé avec : Gunther, Aldric/);
  // CA10 : barre d'actions, conséquence annoncée.
  const bar = page.locator('.workspace-action-bar');
  assert.match(await bar.textContent(), /Attaquer · Orc/);
  assert.match(await bar.getByRole('button', { name: /^Attaquer · Orc/ }).textContent(), /surnombre/);
  assert.match(await bar.getByRole('button', { name: /^Se désengager/ }).textContent(), /Test opposé contre Orc/);
  // CA11 + CA15 : Attaquer prépare le panneau ; le surnombre est déduit, sans cases.
  await bar.getByRole('button', { name: /^Attaquer · Orc/ }).click();
  await page.waitForTimeout(200);
  if (await page.locator('.workspace-resolution-drawer').getAttribute('hidden') !== null) await page.locator('[data-circumstances-toggle]').click();
  assert.match(await page.locator('.workspace-engagement-derived').first().textContent(), /Déduit du plateau : 2 contre 1 : surnombre, \+1 DR/);
  assert.equal(await page.getByLabel(/Engagés avec la cible, du côté de l’attaquant/).count(), 0, 'pas de case à cocher tant que le MJ ne force pas');
  if (process.env.ENGAGEMENTS_SHOT) await page.screenshot({ path: process.env.ENGAGEMENTS_SHOT, fullPage: true });
  // CA18 : Forcer révèle les cases ; Revenir au plateau rétablit la déduction.
  await page.locator('.workspace-engagement-derived').first().getByRole('button', { name: 'Forcer' }).click();
  await page.waitForTimeout(200);
  assert.ok(await page.getByRole('button', { name: 'Revenir au plateau' }).count() > 0);
  await page.getByRole('button', { name: 'Revenir au plateau' }).first().click();
  await page.waitForTimeout(200);
  assert.ok(await page.locator('.workspace-engagement-derived').count() > 0);
  // CA6 : « Déplacer… » engage Elsa avec le Gobelin : une deuxième mêlée.
  await page.getByLabel('Déplacer Elsa').selectOption('engage:gob');
  await zone('Mêlée 2').waitFor({ timeout: 5000 });
  assert.equal(await zone('Mêlée 2').locator('[data-workspace-select]').count(), 2);
  // CA12 : Se désengager, Test opposé saisi, appliqué : Gunther redevient Libre.
  await bar.getByRole('button', { name: /^Se désengager/ }).click();
  const form = page.locator('.workspace-disengage');
  await form.getByLabel(/d100 de Gunther/).fill('5');
  await form.getByLabel(/d100 de Gunther/).press('Tab');
  await form.getByLabel(/d100 de Orc/).fill('90');
  await form.getByLabel(/d100 de Orc/).press('Tab');
  await page.waitForTimeout(200);
  assert.match(await form.textContent(), /Gunther se désengage/);
  await form.getByRole('button', { name: 'Appliquer le désengagement' }).click();
  await page.waitForFunction(() => !window.__store.listEngagedWith('gunther').length, null, { timeout: 5000 });
  assert.equal(await zone('Libres').locator('[data-workspace-select="gunther"]').count(), 1);
  assert.equal(errors.length, 0, errors.join(' | '));
  console.log('engagements-plateau-browser: OK');
} finally { await browser.close(); server.close(); }
