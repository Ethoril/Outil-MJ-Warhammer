import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = createStaticServer({ root, pages: { '/harness': '<!doctype html><html lang="fr"><head><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head><body><main id="mount"></main></body></html>' } });
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
    const action = { id: 'blade', type: 'attack', note: 'Hallebarde', attr: 'CC', base: 50, damage: 5, extensions: { v5: { slModifier: 0 } } };
    const common = { zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 50, CT: 40, F: 40, E: 40, Ag: 40, FM: 40 }, skills: [], equipment: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 } };
    const actor = { ...common, id: 'npc', name: 'Garde', kind: 'PNJ', camp: 'ennemi', initiative: 50, actions: [action], extensions: { v5: {} } };
    const target = { ...common, id: 'pj', name: 'Ulrike', kind: 'PJ', camp: 'pj', initiative: 40, actions: [], extensions: { v5: {} } };
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: 'npc', order: ['npc', 'pj'], participants: [actor, target] } });
    const view = initWorkspaceView({ Store: store, mount: document.querySelector('#mount'), showNavigation: false, actions: { renderRules() {}, renderLog() {}, applyResolution: preview => store.applyResolution(preview) } });
    view.setSpace('play');
    if (!view.openResolution({ ...action, participantId: 'npc', targetId: 'pj' })) throw new Error('résolution indisponible');
    window.__u1 = { view, store };
  });
  await page.locator('[data-roll-input="attack"]').fill('61');
  await page.locator('[data-roll-input="defense"]').fill('91');
  await page.locator('[data-focus-key="calculate"]').click();
  const result = await page.locator('.workspace-result-live').innerText();
  assert.match(result, /Attaque ratée.*Test opposé gagné.*touché/i);
  assert.match(result, /Blessures proposées/);
  assert.deepEqual(errors, []);
  console.log('C16 : opposition gagnée après attaque ratée et dégâts visibles.');
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
