import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

// Contre-vérification U1 (Claude) : ouverture par défaut du tiroir et mémorisation, compteur et Échap hors de Jouer.
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
    const weapon = { id: 'hal', kind: 'weapon', name: 'Hallebarde', category: 'Arme d’hast' };
    const attack = { id: 'blade', type: 'attack', note: 'Hallebarde', attr: 'CC', base: 50, damage: 5, extensions: { equipment: weapon } };
    const skill = { id: 'perception', type: 'skill', note: 'Perception', attr: 'I', base: 40 };
    const common = { zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 50, CT: 40, F: 40, E: 40, I: 40, Ag: 40, FM: 40 }, skills: [], equipment: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 } };
    const actor = { ...common, id: 'npc', name: 'Garde', kind: 'PNJ', camp: 'ennemi', initiative: 50, equipment: [weapon], actions: [skill, attack], extensions: { v5: {} } };
    const target = { ...common, id: 'pj', name: 'Ulrike', kind: 'PJ', camp: 'pj', initiative: 40, actions: [], extensions: { v5: {} } };
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: 'npc', order: ['npc', 'pj'], participants: [actor, target] } });
    const view = initWorkspaceView({ Store: store, mount: document.querySelector('#mount'), showNavigation: false, actions: { renderRules() {}, renderLog() {}, applyResolution: preview => store.applyResolution(preview) } });
    view.setSpace('play');
    if (!view.openResolution({ ...skill, participantId: 'npc', targetId: 'pj' })) throw new Error('résolution indisponible');
    window.__u1 = { view };
  });
  const drawer = page.locator('.workspace-resolution-drawer');
  assert.equal(await drawer.isVisible(), true, 'tiroir ouvert par défaut sur une compétence, comme l’ancienne zone Test V5');
  await page.getByRole('button', { name: /^Hallebarde/ }).first().click();
  assert.equal(await drawer.isVisible(), true, 'toujours ouvert après le passage à une attaque');
  await drawer.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: /^Perception/ }).first().click();
  assert.equal(await drawer.isHidden(), true, 'la fermeture par le MJ est mémorisée d’une action à l’autre');
  await page.locator('[data-circumstances-toggle]').click();

  const toggle = page.locator('[data-circumstances-toggle]');
  assert.match(await toggle.textContent(), /Circonstances · 0 active/, 'une valeur déduite de l’arme ne compte pas comme circonstance active');
  assert.doesNotMatch(await page.locator('.workspace-circumstances-line').textContent(), /Attaque à distance/);

  await page.evaluate(() => window.__u1.view.setSpace('prepare'));
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__u1.view.setSpace('play'));
  assert.equal(await page.locator('.workspace-resolution-drawer').isVisible(), true, 'Échap hors de Jouer ne ferme pas le tiroir');
  assert.deepEqual(errors, []);
  console.log('u1-contre-verification-browser: OK');
} finally {
  await browser.close();
  server.close();
}
