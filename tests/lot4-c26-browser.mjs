import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

// C26 (G-U1-3, décision MJ du 02/11) : les circonstances cochées sont gardées quand on passe d'une action
// à une autre puis qu'on revient (même acteur, même cible).
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
    const store = createStore({ storage: null });
    await store.ready;
    const sword = { id: 'sword', kind: 'weapon', name: 'Épée', category: 'Épée' };
    const dagger = { id: 'dagger', kind: 'weapon', name: 'Dague', category: 'Dague' };
    const swordAction = { id: 'a-sword', type: 'attack', note: 'Épée', attr: 'CC', base: 50, damage: 5, extensions: { equipment: sword } };
    const daggerAction = { id: 'a-dagger', type: 'attack', note: 'Dague', attr: 'CC', base: 50, damage: 3, extensions: { equipment: dagger } };
    const common = { zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 50, CT: 40, F: 40, E: 40, I: 40, Ag: 40, FM: 40 }, skills: [], equipment: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
    const actor = { ...common, id: 'npc', name: 'Garde', kind: 'PNJ', camp: 'ennemi', initiative: 50, equipment: [sword, dagger], actions: [swordAction, daggerAction] };
    const target = { ...common, id: 'pj', name: 'Ulrike', kind: 'PJ', camp: 'pj', initiative: 40, actions: [] };
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: 'npc', order: ['npc', 'pj'], participants: [actor, target] } });
    const view = initWorkspaceView({ Store: store, mount: document.querySelector('#mount'), showNavigation: false, actions: { renderRules() {}, renderLog() {}, applyResolution: preview => store.applyResolution(preview) } });
    view.setSpace('play');
    if (!view.openResolution({ ...swordAction, participantId: 'npc', targetId: 'pj' })) throw new Error('résolution indisponible');
  });
  const toggle = page.locator('[data-circumstances-toggle]');
  const drawer = page.locator('.workspace-resolution-drawer');
  if (await drawer.isHidden()) await toggle.click();
  const terrain = () => page.locator('.workspace-resolution-drawer').getByRole('group', { name: 'Terrain difficile (−1 DR)', exact: true });
  await terrain().getByRole('button', { name: 'Oui', exact: true }).click();
  assert.match(await toggle.textContent(), /Circonstances · 1 active/, 'point de départ : une circonstance active');
  await page.getByRole('button', { name: /^Dague/ }).first().click();
  await page.getByRole('button', { name: /^Épée/ }).first().click();
  assert.match(await toggle.textContent(), /Circonstances · 1 active/, 'le compteur ne doit pas retomber à 0 après un aller-retour Épée → Dague → Épée');
  if (await drawer.isHidden()) await toggle.click();
  assert.equal(await terrain().getByRole('button', { name: 'Oui', exact: true }).getAttribute('aria-pressed'), 'true', 'Terrain difficile reste « Oui »');
  assert.deepEqual(errors, []);
  console.log('lot4-c26-browser: OK');
} finally { await browser.close(); server.close(); }
