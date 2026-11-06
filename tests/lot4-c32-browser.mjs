import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';

// Lot 4 · C32 / G-ARM-4 : le rappel de Dispersion lit seulement quality.parameter
// (js/ui/resolution-panel.js:1490) alors que les qualités d'action des profils importés sont stockées { id, name, rating }
// (js/core/json-profile-import.js:199) : « jusqu'à 0 cibles », « 0 m » pour une Dispersion 3.
// Phase de reproduction : doit échouer aujourd'hui sur le cas { rating: 3 }.
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const mime = { '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8' };
const server = createServer((req, res) => { try { const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); const file = resolve(root, `.${pathname}`); assert.ok(file.startsWith(root + sep)); assert.ok(statSync(file).isFile()); res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file)); } catch { res.writeHead(404); res.end('Not found'); } });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
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
  const reminder = quality => page.evaluate(quality => {
    const fighter = (id, camp) => ({ id, name: id, kind: 'PJ', camp, zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 50, CT: 50, F: 40, E: 30, Ag: 30 }, states: [], skills: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
    const actor = fighter('armurier', 'pj'), target = fighter('cible', 'npc');
    const action = { id: 'tromblon', type: 'attack', attr: 'CT', name: 'Tromblon', base: 50, damage: 8, qualities: [quality] };
    const handlers = new Proxy({}, { get: () => () => {} });
    const el = window.__panel.renderResolutionPanel({ draft: { v5Kind: 'ranged', v5Context: { spreadRangeBand: 'short' } }, actor, participants: [actor, target], actions: [action], actionKey: action.id, type: 'attack', target,
      groups: { adversaries: [target], allies: [] }, defense: { options: [], value: 'Ag', option: { value: 'Ag', statLabel: 'Ag', mod: 0, v5: { kind: 'test', slModifier: 0 } } }, canCalculate: false, canApply: false, handlers });
    const host = document.createElement('div'); host.append(el); document.body.append(host);
    const text = [...host.querySelectorAll('p')].map(p => p.textContent).find(t => /Bout portant : une cible/.test(t)) || null;
    host.remove();
    return text;
  }, quality);
  for (const [name, quality] of [
    ['qualité de profil { id, name, rating: 3 }', { id: 'dispersion', name: 'Dispersion', rating: 3 }],
    ['contrôle : qualité de catalogue { id, parameter: "3" }', { id: 'dispersion', parameter: '3' }]
  ]) {
    const text = await reminder(quality);
    try {
      assert.ok(text, `${name} : rappel de Dispersion absent`);
      assert.doesNotMatch(text, /\b0 cibles|\b0 m\b|dégâts \+0/, `${name} : ${text}`);
      assert.match(text, /jusqu’à 3 cibles/);
      assert.match(text, /ne dépasse 3 m/);
      console.log('ok  -', name);
    } catch (error) { failures++; console.log('FAIL -', name, '\n   ', error.message); }
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); server.close(); }
if (failures) { console.log(`${failures} cas en échec`); process.exit(1); }
console.log('tous les cas passent');
