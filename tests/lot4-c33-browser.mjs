import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
// Lot 4 · C33 : champs de saisie manuelle (data-blocking-field) d'une arme non reliée à un exemplaire d'inventaire (chargeur, pièce frappée, bande de portée, cibles).
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const mime = { '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8' };
const server = createServer((req, res) => { try { const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); const file = resolve(root, `.${pathname}`); assert.ok(file.startsWith(root + sep)); assert.ok(statSync(file).isFile()); res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file)); } catch { res.writeHead(404); res.end('Not found'); } });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const origin = `http://127.0.0.1:${server.address().port}`;
let failures = 0;
try {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } }), page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  await page.route('**/js/core/sync.js', route => route.fulfill({ contentType: 'text/javascript', body: `export function initFirebaseSync(onConnected){document.querySelector('#login-screen')?.style.setProperty('display','none');document.querySelector('#app-content')?.style.setProperty('display','block');onConnected({dbRef:'isolated-test',onValue(){},update(){return Promise.resolve();}});}` }));
  await page.goto(origin + '/index.html');
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
  await page.evaluate(async () => { window.__app = await import('./js/main.js'); await window.__app.Store.ready; window.__panel = await import('./js/ui/resolution-panel.js'); });
  // Les champs de saisie manuelle de l'arme non reliée existent et portent le marqueur data-blocking-field que la ligne « À saisir avant d'appliquer » vise.
  const fields = (quality, kind, v5Context = {}) => page.evaluate(({ quality, kind, v5Context }) => {
    const fighter = (id, camp) => ({ id, name: id, kind: 'PJ', camp, zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 50, CT: 50, F: 40, E: 30, Ag: 30 }, states: [], skills: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
    const actor = fighter('armurier', 'pj'), target = fighter('cible', 'npc');
    const action = { id: 'profil', type: 'attack', attr: kind === 'ranged' ? 'CT' : 'CC', name: 'Profil', base: 50, damage: 8, qualities: [quality] };
    const handlers = new Proxy({}, { get: () => () => {} });
    const el = window.__panel.renderResolutionPanel({ draft: { v5Kind: kind, v5Context }, actor, participants: [actor, target], actions: [action], actionKey: action.id, type: 'attack', target,
      groups: { adversaries: [target], allies: [] }, defense: { options: [], value: 'Ag', option: { value: 'Ag', statLabel: 'Ag', mod: 0, v5: { kind: 'test', slModifier: 0 } } }, canCalculate: false, canApply: false, handlers });
    const host = document.createElement('div'); host.append(el); document.body.append(host);
    const found = [...host.querySelectorAll('[data-blocking-field]')].map(x => x.dataset.blockingField);
    host.remove();
    return found;
  }, { quality, kind, v5Context });
  for (const [name, quality, kind, expected] of [
    ['Recharge : chargeur', { id: 'recharge', parameter: '2' }, 'ranged', 'reload-ammo'],
    ['À répétition : chargeur', { id: 'a-repetition', parameter: '3' }, 'ranged', 'reload-ammo'],
    ['Taille : pièce frappée', { id: 'taille' }, 'melee', 'hack-piece'],
    ['Dispersion : bande', { id: 'dispersion', rating: 3 }, 'ranged', 'spread-band'],
    ['Dispersion : cibles', { id: 'dispersion', rating: 3 }, 'ranged', 'spread-targets'],
    ['Explosion : cibles', { id: 'explosion', parameter: '2' }, 'ranged', 'explosion-targets']
  ]) {
    try {
      const found = await fields(quality, kind);
      assert.ok(found.includes(expected), `${name} : champ ${expected} absent (${found.join(', ')})`);
      console.log('ok  -', name);
    } catch (error) { failures++; console.log('FAIL -', name, '\n   ', error.message); }
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); server.close(); }
if (failures) { console.log(`${failures} cas en échec`); process.exit(1); }
console.log('tous les cas passent');
