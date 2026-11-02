import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// C42 (recette 3.34.0, G-U1-5) : la maladresse du défenseur est un blocage cliquable qui mène au champ du d10,
// et l’effet du d10 saisi apparaît dans le résultat (dont « vous agirez en dernier ») puis au journal.
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/harness`);
  await page.evaluate(async () => {
    const { createStore } = await import('/js/core/store.js');
    const { initWorkspaceView } = await import('/js/ui/workspace-view.js');
    const listeners = new Map();
    const bus = { on: (name, fn) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); }, emit: (name, ...args) => { for (const fn of listeners.get(name) || []) fn(...args); } };
    const store = createStore({ bus, storage: null });
    await store.ready;
    const attack = { id: 'blade', type: 'attack', note: 'Épée', attr: 'CC', base: 70, damage: 12 };
    const common = { zone: 'active', caracs: { CC: 50, CT: 40, F: 40, E: 40, I: 40, Ag: 40, FM: 40 }, skills: [], equipment: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
    const actor = { ...common, id: 'att', name: 'Attaquant', kind: 'PJ', camp: 'pj', initiative: 50, hp: 20, maxHp: 20, actions: [attack] };
    const target = { ...common, id: 'lent', name: 'Lent', kind: 'Créature', camp: 'ennemi', initiative: 30, hp: 20, maxHp: 20, actions: [] };
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: 'att', order: ['att', 'lent'], participants: [actor, target] } });
    const view = initWorkspaceView({ Store: store, Bus: bus, mount: document.querySelector('#mount'), showNavigation: false, actions: { renderRules() {}, renderLog() {}, applyResolution: preview => store.applyResolution(preview), adjustHp: ({ participantId, delta }) => store.adjustHp ? store.adjustHp(participantId, delta) : store.updateParticipant(participantId, { hp: store.listParticipants().find(row => row.id === participantId).hp + delta }) } });
    view.setSpace('play');
    if (!view.openResolution({ ...attack, participantId: 'att', targetId: 'lent' })) throw new Error('résolution indisponible');
    window.__c42 = { store, view };
  });
  await page.locator('[data-roll-input="attack"]').fill('30');
  await page.locator('[data-roll-input="defense"]').fill('66');
  await page.locator('[data-roll-input="defense"]').press('Enter');
  await page.locator('.workspace-result').waitFor();
  const link = page.locator('.workspace-field-error').getByRole('button', { name: /Maladresse du défenseur/ });
  await link.waitFor();
  await link.click();
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Maladresse du défenseur : résultat du d10 (V5 p. 165)', 'le blocage mène au champ du d10 du défenseur');
  await page.keyboard.type('3');
  await page.keyboard.press('Enter');
  const result = page.locator('.workspace-result');
  await page.getByRole('button', { name: 'Calculer', exact: true }).click();
  await page.waitForFunction(() => /Maladresse du défenseur 3/.test(document.querySelector('.workspace-result')?.textContent || ''));
  assert.match(await result.textContent(), /vous agirez en dernier/, 'l’effet de table (agit en dernier) est affiché');
  await page.getByRole('button', { name: /^Appliquer/ }).first().click();
  const journal = await page.evaluate(async () => { const { describeResolutionDetail } = await import('/js/core/resolution.js'); return window.__c42.store.getLog().filter(entry => entry.kind === 'resolution').flatMap(entry => describeResolutionDetail(entry.detail)).join(' | '); });
  assert.match(journal, /Table des maladresses du défenseur \(3\)/, 'effet du d10 au journal');
  assert.deepEqual(errors, []);
  console.log('lot4-c42-browser: OK');
} finally { await browser.close(); server.close(); }
