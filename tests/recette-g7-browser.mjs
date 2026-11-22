import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

// Passe G, lot G7 (R4, p. 163) : quitter une mêlée par un déplacement du MJ pose une décision « À décider »
// (Se désengager / Fuir / Sans règle). Fuir : les adversaires engagés gagnent l'Élan (attaque gratuite), le fuyard gagne un Brisé.
const root = fileURLToPath(new URL('..', import.meta.url));
const server = createStaticServer({ root, pages: { '/harness': '<!doctype html><html lang="fr"><head><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head><body><main id="mount"></main></body></html>' } });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 800 }, serviceWorkers: 'block' });
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
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [],
      combat: { round: 1, currentActorId: 'orc', order: ['orc', 'gunther', 'elsa', 'gob'], participants: [
        fighter('orc', 'Orc', 'ennemi', 60), fighter('gunther', 'Gunther', 'pj', 55), fighter('elsa', 'Elsa', 'pj', 50), fighter('gob', 'Gobelin', 'ennemi', 30)] } });
    await store.engageParticipants('orc', 'gunther');
    window.__store = store;
    const view = initWorkspaceView({ Store: store, mount: document.querySelector('#mount'), showNavigation: false, actions: { renderRules() {}, renderLog() {} } });
    window.__view = view;
    view.setSpace('play');
  });
  const decisions = () => page.locator('[data-zone="droite"] [data-decision-id="quitte:orc"]');
  const engaged = () => page.evaluate(() => window.__store.listEngagedWith('orc'));
  const person = id => page.evaluate(i => JSON.parse(JSON.stringify(window.__store.listParticipants().find(row => row.id === i))), id);
  await page.locator('[data-workspace-target="orc"]').first().waitFor();
  assert.deepEqual(await engaged(), ['gunther']);

  // G7-b : un déplacement qui ne quitte aucune mêlée ne crée rien.
  await page.getByLabel('Déplacer Orc', { exact: true }).selectOption('high:on');
  await page.waitForFunction(() => window.__store.listParticipants().find(row => row.id === 'orc').extensions.v5.position?.higherGround === true);
  assert.equal(await decisions().count(), 0, 'position haute : aucune décision');
  await page.getByLabel('Déplacer Orc', { exact: true }).selectOption('engage:elsa');
  await page.waitForFunction(() => window.__store.listEngagedWith('orc').includes('elsa'));
  assert.equal(await decisions().count(), 0, 'engager un second adversaire : aucune décision');
  await page.getByLabel('Déplacer Orc', { exact: true }).selectOption('free');
  await page.waitForFunction(() => !window.__store.listEngagedWith('orc').length);

  // G7-a : Libre → décision « Orc quitte la mêlée de … » avec les trois choix, sans attaque d'opportunité ni Brisé d'office.
  await decisions().waitFor();
  assert.match(await decisions().textContent(), /Orc quitte la mêlée de Gunther, Elsa/);
  assert.deepEqual(await decisions().locator('[data-decision-option]').allTextContents(), ['Se désengager', 'Fuir', 'Sans règle']);
  assert.equal((await person('gunther')).extensions.v5.hasMomentum ?? false, false, 'aucune attaque d’opportunité sur un simple déplacement');

  // « Sans règle » : rien ne change, la décision disparaît.
  await decisions().locator('[data-decision-option="none"]').click();
  await page.waitForFunction(() => !document.querySelector('[data-decision-id="quitte:orc"]'));
  assert.deepEqual(await engaged(), [], 'Sans règle ne change rien');
  assert.equal((await person('orc')).states.length, 0);

  // G7-b : réengagé avec les mêmes adversaires, la décision se retire d'elle-même.
  await page.getByLabel('Déplacer Orc', { exact: true }).selectOption('engage:gunther');
  await page.waitForFunction(() => document.querySelector('select[aria-label="Déplacer Orc"] option[value=free]'), null, { timeout: 5000 });
  await page.getByLabel('Déplacer Orc', { exact: true }).selectOption('free');
  await decisions().waitFor();
  await page.getByLabel('Déplacer Orc', { exact: true }).selectOption('engage:gunther');
  await page.waitForFunction(() => !document.querySelector('[data-decision-id="quitte:orc"]'), null, { timeout: 5000 });

  // « Fuir » : l'attaque gratuite est proposée aux adversaires engagés (Élan), le fuyard gagne un Brisé par engagé.
  await page.getByLabel('Déplacer Orc', { exact: true }).selectOption('engage:elsa');
  await page.waitForFunction(() => document.querySelector('select[aria-label="Déplacer Orc"] option[value=free]'), null, { timeout: 5000 });
  await page.getByLabel('Déplacer Orc', { exact: true }).selectOption('free');
  await decisions().waitFor();
  assert.equal(await page.locator('[data-zone="droite"] .workspace-decisions-count').textContent(), '1');
  await decisions().locator('[data-decision-option="flee"]').click();
  await page.waitForFunction(() => window.__store.listParticipants().find(row => row.id === 'gunther').extensions.v5.hasMomentum === true, null, { timeout: 5000 });
  assert.equal((await person('elsa')).extensions.v5.hasMomentum, true, 'chaque adversaire engagé gagne l’Élan');
  assert.equal((await person('orc')).states.find(row => row.key === 'brise')?.level, 2, 'un Brisé par ennemi engagé');
  assert.deepEqual(await engaged(), []);
  await page.waitForFunction(() => !document.querySelector('[data-decision-id="quitte:orc"]'));

  // « Se désengager » : le formulaire existant s'ouvre pour le combattant.
  await page.getByLabel('Déplacer Gobelin', { exact: true }).selectOption('engage:gunther');
  await page.waitForFunction(() => document.querySelector('select[aria-label="Déplacer Gobelin"] option[value=free]'), null, { timeout: 5000 });
  await page.getByLabel('Déplacer Gobelin', { exact: true }).selectOption('free');
  const gobDecision = page.locator('[data-decision-id="quitte:gob"]');
  await gobDecision.waitFor();
  await gobDecision.locator('[data-decision-option="disengage"]').click();
  await page.locator('.workspace-disengage').waitFor({ timeout: 5000 });
  assert.match(await page.locator('.workspace-disengage').textContent(), /Gobelin/);
  assert.deepEqual(errors, []);
  console.log('recette-g7 : OK');
} finally {
  await browser.close();
  server.close();
}
