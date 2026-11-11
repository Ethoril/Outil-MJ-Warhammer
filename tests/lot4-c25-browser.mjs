import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

// C25 (recette 3.34.0, « Aperçu d’attaque et modification de PV ») : après un changement de PV de la cible,
// un aperçu déjà calculé ne doit pas garder son critique d’excédent sans être marqué périmé (ou être recalculé).
const root = fileURLToPath(new URL('..', import.meta.url));
const server = createStaticServer({ root, pages: { '/harness': '<!doctype html><html lang="fr"><head><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head><body><main id="mount"></main></body></html>' } });
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
    const listeners = new Map();
    const bus = { on: (name, fn) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); }, emit: (name, ...args) => { for (const fn of listeners.get(name) || []) fn(...args); } };
    const store = createStore({ bus, storage: null });
    await store.ready;
    const attack = { id: 'blade', type: 'attack', note: 'Épée', attr: 'CC', base: 70, damage: 12 };
    const common = { zone: 'active', caracs: { CC: 50, CT: 40, F: 40, E: 40, I: 40, Ag: 40, FM: 40 }, skills: [], equipment: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
    const actor = { ...common, id: 'att', name: 'Attaquant', kind: 'PJ', camp: 'pj', initiative: 50, hp: 20, maxHp: 20, actions: [attack] };
    const target = { ...common, id: 'lent', name: 'Lent', kind: 'Créature', camp: 'ennemi', initiative: 30, hp: 2, maxHp: 20, actions: [] };
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: 'att', order: ['att', 'lent'], participants: [actor, target] } });
    const view = initWorkspaceView({ Store: store, Bus: bus, mount: document.querySelector('#mount'), showNavigation: false, actions: { renderRules() {}, renderLog() {}, applyResolution: preview => store.applyResolution(preview), adjustHp: ({ participantId, delta }) => store.adjustHp ? store.adjustHp(participantId, delta) : store.updateParticipant(participantId, { hp: store.listParticipants().find(row => row.id === participantId).hp + delta }) } });
    view.setSpace('play');
    if (!view.openResolution({ ...attack, participantId: 'att', targetId: 'lent' })) throw new Error('résolution indisponible');
    window.__c25 = { store, view };
  });
  const attackRoll = page.locator('[data-roll-input="attack"]');
  await attackRoll.fill('20');
  await attackRoll.press('Enter');
  const result = page.locator('.workspace-result');
  await result.waitFor();
  assert.match(await result.textContent(), /Critique d’excédent/, 'point de départ : l’aperçu à 2 PV annonce un critique d’excédent');
  await page.evaluate(() => window.__c25.store.updateParticipant('lent', { hp: 20 }));
  await page.waitForTimeout(300);
  const after = await page.locator('.workspace-resolution').textContent();
  const stillThere = /Critique d’excédent/.test(after);
  const marked = /périm|recalcul|a changé|obsolète/i.test(after);
  assert.ok(!stillThere || marked, `après +18 PV (20 PV), l’aperçu garde « Critique d’excédent » sans être marqué périmé. Extrait : ${after.match(/.{0,80}Critique d’excédent.{0,80}/)?.[0]}`);
  assert.deepEqual(errors, []);
  console.log('lot4-c25-browser: OK');
} finally { await browser.close(); server.close(); }
