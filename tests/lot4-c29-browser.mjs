import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Lot 4 · C29 / G-EMP-1 : « Nature du Test » affiche Corps à corps (nature déduite) mais la case
// « Déclarer une tentative d'empoignade » n'est proposée que si draft.v5Kind === 'melee' ou attr === 'CC'
// (js/ui/resolution-panel.js, ligne ~2407) : elle ignore la nature déduite affichée.
// Phase de reproduction : doit échouer aujourd'hui sur le cas « nature déduite ».
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
  const probe = async (name, { draft, action }) => {
    const out = await page.evaluate(({ draft, action }) => {
      const fighter = (id, camp) => ({ id, name: id, kind: 'PJ', camp, zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 50, F: 40, E: 30, Ag: 30 }, states: [], skills: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
      const actor = fighter('holder', 'pj'), target = fighter('held', 'npc');
      const handlers = new Proxy({}, { get: () => () => {} });
      const el = window.__panel.renderResolutionPanel({ draft, actor, participants: [actor, target], actions: [action], actionKey: action.id, type: 'attack', target,
        groups: { adversaries: [target], allies: [] }, defense: { options: [], value: 'CC', option: { value: 'CC', statLabel: 'CC', mod: 0, v5: { kind: 'melee', slModifier: 0 } } }, canCalculate: false, canApply: false, handlers });
      const host = document.createElement('div'); host.id = 'c29-probe'; host.append(el); document.body.append(host);
      const kind = host.querySelector('select[aria-label="Nature du Test"]');
      const check = [...host.querySelectorAll('input[type=checkbox]')].find(x => x.parentElement.textContent.includes('empoignade'));
      const result = { kindValue: kind?.value, hasGrappleCheckbox: Boolean(check) };
      host.remove();
      return result;
    }, { draft, action });
    return out;
  };
  const cases = [
    ['Nature affichée Corps à corps (déduite, attr absent)', { draft: { v5Kind: null }, action: { id: 'bagarre', type: 'attack', name: 'Bagarre', base: 25, damage: 3 } }],
    ['Nature déduite Corps à corps via extensions.v5.kind', { draft: { v5Kind: null }, action: { id: 'bagarre2', type: 'attack', name: 'Bagarre', attr: 'F', base: 25, damage: 3, extensions: { v5: { kind: 'melee' } } } }],
    ['Contrôle : nature choisie explicitement (v5Kind melee)', { draft: { v5Kind: 'melee' }, action: { id: 'bagarre3', type: 'attack', name: 'Bagarre', base: 25, damage: 3 } }]
  ];
  for (const [name, spec] of cases) {
    const r = await probe(name, spec);
    try {
      assert.equal(r.kindValue, 'melee', `${name} : la nature affichée doit être Corps à corps`);
      assert.equal(r.hasGrappleCheckbox, true, `${name} : la case d'empoignade doit être proposée quand Nature du Test affiche Corps à corps`);
      console.log('ok  -', name);
    } catch (error) { failures++; console.log('FAIL -', name, '\n   ', error.message); }
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); server.close(); }
if (failures) { console.log(`${failures} cas en échec`); process.exit(1); }
console.log('tous les cas passent');
