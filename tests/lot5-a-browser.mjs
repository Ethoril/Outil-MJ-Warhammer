import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';

// Lot 5 · A : rendu du panneau de résolution.
//  C47 : case « À répétition : tir double » pour une arme non liée (qualité portée par l'action) ;
//  C49 : Explosion et Dispersion choisissent leurs cibles par cases à cocher nommées sur les participants actifs.
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const server = createStaticServer({ root });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
const origin = `http://127.0.0.1:${server.address().port}`;
let failures = 0;
try {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } }), page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await blockExternalNetwork(page, origin);
  await page.route('**/js/core/sync.js', route => route.fulfill({ contentType: 'text/javascript', body: `export function initFirebaseSync(onConnected){document.querySelector('#login-screen')?.style.setProperty('display','none');document.querySelector('#app-content')?.style.setProperty('display','block');onConnected({dbRef:'isolated-test',onValue(){},update(){return Promise.resolve();}});}` }));
  await page.goto(origin + '/index.html');
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
  await page.evaluate(async () => { window.__app = await import('./js/main.js'); await window.__app.Store.ready; window.__panel = await import('./js/ui/resolution-panel.js'); });
  // Rend le panneau dans #lot5a-host ; window.__selected collecte les appels handlers.select.
  const render = ({ qualities, v5Context = {}, previous = [] }) => page.evaluate(({ qualities, v5Context, previous }) => {
    const fighter = (id, name, camp, zone = 'active') => ({ id, name, kind: 'PJ', camp, zone, hp: 20, maxHp: 20, caracs: { CC: 50, CT: 50, F: 40, E: 30, Ag: 30 }, states: [], skills: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
    const actor = fighter('armurier', 'Armurier', 'pj'), target = fighter('cible', 'Brigand', 'npc'), other = fighter('voisin', 'Voisin', 'npc'), away = fighter('banc', 'Absent', 'npc', 'bench');
    const action = { id: 'profil', type: 'attack', attr: 'CT', name: 'Profil', base: 50, damage: 8, qualities };
    window.__selected = [];
    const handlers = new Proxy({}, { get: (_, key) => key === 'select' ? patch => window.__selected.push(patch) : () => {} });
    const draft = { v5Kind: 'ranged', v5Context };
    const el = window.__panel.renderResolutionPanel({ draft, actor, participants: [actor, target, other, away], actions: [action], actionKey: action.id, type: 'attack', target,
      groups: { adversaries: [target, other], allies: [] }, previousWeaponAttacks: previous, defense: { options: [], value: 'Ag', option: { value: 'Ag', statLabel: 'Ag', mod: 0, v5: { kind: 'test', slModifier: 0 } } }, canCalculate: false, canApply: false, handlers });
    document.getElementById('lot5a-host')?.remove();
    const host = document.createElement('div'); host.id = 'lot5a-host'; host.append(el); document.body.append(host);
  }, { qualities, v5Context, previous });
  const check = async (name, fn) => { try { await fn(); console.log('ok  -', name); } catch (error) { failures++; console.log('FAIL -', name, '\n   ', error.message); } };
  const doubleShotBoxes = () => page.locator('#lot5a-host [aria-label*="À répétition : tir double"]').count();

  await check('C47 arme non liée À répétition : la case tir double est proposée', async () => {
    await render({ qualities: [{ id: 'a-repetition', parameter: '3' }] });
    assert.equal(await doubleShotBoxes(), 1);
  });
  await check('C47 sans qualité À répétition : pas de case tir double', async () => {
    await render({ qualities: [{ id: 'recharge', parameter: '2' }] });
    assert.equal(await doubleShotBoxes(), 0);
  });
  await check('C47 arme non liée : le premier tir (weaponId null) est proposé comme « Premier tir du tir double »', async () => {
    await render({ qualities: [{ id: 'a-repetition', parameter: '3' }], v5Context: { repeaterDoubleShot: true },
      previous: [{ actionId: 'u-1', weaponId: null, targetId: 'cible', actionType: 'attack', hit: true, weaponName: 'Action' }] });
    const options = await page.locator('#lot5a-host select[aria-label^="Premier tir du tir double"] option').allTextContents();
    assert.equal(options.length, 2, options.join(' | '));
  });

  for (const [label, quality, key] of [['Explosion', { id: 'explosion', parameter: '2' }, 'explosionTargetIds'], ['Dispersion', { id: 'dispersion', rating: 3 }, 'spreadTargetIds']]) {
    await check(`C49 ${label} : cases à cocher nommées sur les participants actifs, sans champ d'identifiants`, async () => {
      await render({ qualities: [quality] });
      assert.equal(await page.locator('#lot5a-host input[aria-label*="identifiants"]').count(), 0, 'plus de champ texte d’identifiants');
      const names = await page.locator(`#lot5a-host fieldset[aria-label^="${label}"] label`).allTextContents();
      assert.deepEqual(names.map(x => x.trim()), ['Armurier', 'Brigand (cible initiale)', 'Voisin']);
    });
    await check(`C49 ${label} : cocher un nom écrit son identifiant dans le contexte`, async () => {
      await render({ qualities: [quality], v5Context: { [key]: ['cible'] } });
      const boxes = page.locator(`#lot5a-host fieldset[aria-label^="${label}"] input[type=checkbox]`);
      assert.equal(await boxes.nth(1).isChecked(), true);
      await boxes.nth(2).check();
      assert.deepEqual(await page.evaluate(k => window.__selected.at(-1).v5Context[k], key), ['cible', 'voisin']);
    });
  }
  await check('G-ATT-5 carte « Inverser » d’un tir dans la mêlée : annonce la déviation, pas « Touché »', async () => {
    const text = await page.evaluate(async () => {
      const { previewResolution } = await import('./js/core/resolution.js');
      const { renderV5Decisions } = await import('./js/ui/resolution-panel/critical.js');
      const fighter = (id, name, camp) => ({ id, name, kind: 'PJ', camp, zone: 'active', hp: 30, maxHp: 30, caracs: { CC: 50, CT: 60, F: 30, E: 30, I: 40, Ag: 40 }, skills: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
      const archer = fighter('archer', 'Archer', 'pj'), alpha = fighter('alpha', 'Alpha', 'pj'), sorcier = fighter('sorcier', 'Sorcier', 'ennemi');
      const preview = previewResolution({ actor: archer, target: alpha, roll: 35, action: { type: 'attack', attr: 'CT', base: 60, damage: 9 },
        v5: { kind: 'ranged', context: { weather: 'rain-wind', cover: true, targetEngaged: true, engagedTargetIds: ['alpha', 'sorcier'], engagedTargetRoll: 25 } }, v5State: { participants: [archer, alpha, sorcier] } });
      return renderV5Decisions(preview, { v5Choice: null }, { select() {}, choose() {} }).textContent;
    });
    assert.match(text, /Inverser en/);
    assert.match(text, /dévie vers Sorcier/);
    assert.doesNotMatch(text, /Touché ·/);
  });
  assert.deepEqual(errors, []);
} finally { await browser.close(); server.close(); }
if (failures) { console.log(`${failures} cas en échec`); process.exit(1); }
console.log('tous les cas passent');
