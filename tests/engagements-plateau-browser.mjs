import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

// Plateau des mêlées (spec docs/specs/engagements S1-S4) : zones, jetons, déplacement par le MJ, barre d'actions,
// Désengagement réglé et surnombre déduit dans le panneau de résolution.
const root = fileURLToPath(new URL('..', import.meta.url));
const server = createStaticServer({ root, pages: { '/harness': '<!doctype html><html lang="fr"><head><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head><body><main id="mount"></main></body></html>' } });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
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
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [],
      diceLines: [{ id: 'sword', participantId: 'gunther', type: 'attack', attr: 'CC', base: 48, note: 'Épée', damage: 'BF+4' }],
      combat: { round: 1, currentActorId: 'gunther', order: ['gunther', 'elsa', 'orc', 'aldric', 'gob'], participants: [
        fighter('gunther', 'Gunther', 'pj', 60), fighter('elsa', 'Elsa', 'pj', 55), fighter('orc', 'Orc', 'ennemi', 50, { skills: [{ name: 'Corps à corps (Base)', total: 55 }] }),
        fighter('aldric', 'Aldric', 'pj', 40), fighter('gob', 'Gobelin', 'ennemi', 30)] } });
    await store.engageParticipants('gunther', 'orc');
    await store.engageParticipants('aldric', 'orc');
    window.__store = store;
    const view = initWorkspaceView({ Store: store, mount: document.querySelector('#mount'), showNavigation: false, actions: { renderRules() {}, renderLog() {} } });
    window.__view = view;
    view.setSpace('play');
  });
  const zone = name => page.locator('.workspace-zone').filter({ has: page.locator('.workspace-zone-head', { hasText: name }) });
  // CA1-CA3 : une mêlée avec son rapport de forces, les Libres, jetons sélectionnables.
  await assert.doesNotReject(zone('Mêlée 1').waitFor({ timeout: 5000 }));
  assert.equal(await zone('Mêlée 1').locator('.workspace-zone-ratio').textContent(), '2 contre 1');
  assert.equal(await zone('Mêlée 1').locator('[data-workspace-select]').count(), 3);
  assert.equal(await zone('Libres').locator('[data-workspace-select]').count(), 2);
  assert.match(await page.locator('.workspace-token').filter({ has: page.locator('[data-workspace-select="orc"]') }).textContent(), /Engagé avec : Gunther, Aldric/);
  // CA10 : barre d'actions, conséquence annoncée.
  const bar = page.locator('.workspace-action-bar');
  assert.match(await bar.textContent(), /Attaquer · Orc/);
  assert.match(await bar.getByRole('button', { name: /^Attaquer · Orc/ }).textContent(), /surnombre/);
  assert.match(await bar.getByRole('button', { name: /^Se désengager/ }).textContent(), /Test opposé contre Orc/);
  // CA11 + CA15 : Attaquer prépare le panneau ; le surnombre est déduit, sans cases.
  await bar.getByRole('button', { name: /^Attaquer · Orc/ }).click();
  await page.waitForTimeout(200);
  if (await page.locator('.workspace-resolution-drawer').getAttribute('hidden') !== null) await page.locator('[data-circumstances-toggle]').click();
  assert.match(await page.locator('.workspace-engagement-derived').first().textContent(), /Déduit du plateau : 2 contre 1 : surnombre, \+1 DR/);
  assert.equal(await page.getByLabel(/Engagés avec la cible, du côté de l’attaquant/).count(), 0, 'pas de case à cocher tant que le MJ ne force pas');
  if (process.env.ENGAGEMENTS_SHOT) await page.screenshot({ path: process.env.ENGAGEMENTS_SHOT, fullPage: true });
  // CA18 : Forcer révèle les cases ; Revenir au plateau rétablit la déduction.
  await page.locator('.workspace-engagement-derived').first().getByRole('button', { name: 'Forcer' }).click();
  await page.getByRole('button', { name: 'Revenir au plateau' }).first().waitFor();
  assert.ok(await page.getByRole('button', { name: 'Revenir au plateau' }).count() > 0);
  await page.getByRole('button', { name: 'Revenir au plateau' }).first().click();
  await page.locator('.workspace-engagement-derived').first().waitFor();
  assert.ok(await page.locator('.workspace-engagement-derived').count() > 0);
  // CA6 : « Déplacer… » engage Elsa avec le Gobelin : une deuxième mêlée.
  await page.getByLabel('Déplacer Elsa').selectOption('engage:gob');
  await zone('Mêlée 2').waitFor({ timeout: 5000 });
  assert.equal(await zone('Mêlée 2').locator('[data-workspace-select]').count(), 2);
  // CA12 : Se désengager, Test opposé saisi, appliqué : Gunther redevient Libre.
  // Q6 T2 (CA3, CA5) : Gunther À terre, l'Orc Sonné ; le détail montre chaque source. MJ 09/11 CA15 : le désengagement compte
  // toujours comme un mouvement, plus de question de mouvement : le Désavantage d'À terre est là d'emblée.
  await page.evaluate(async () => {
    // MJ 09/11 CA22 : une main perdue pose sa question de circonstance au désengagé.
    const gunther = window.__store.listParticipants().find(row => row.id === 'gunther');
    await window.__store.updateParticipant('gunther', { states: [{ id: 'prone-1', key: 'aterre', name: 'À terre', level: 1 }],
      extensions: { ...gunther.extensions, v5: { ...gunther.extensions?.v5, sequelaEffects: { rows: [{ id: 'sq-hand', type: 'two-hands', label: 'Main perdue' }] } } } });
    await window.__store.updateParticipant('orc', { states: [{ id: 'stun-1', key: 'sonne', name: 'Sonné', level: 1 }] });
  });
  await page.waitForTimeout(200);
  await bar.getByRole('button', { name: /^Se désengager/ }).click();
  const form = page.locator('.workspace-disengage');
  await form.locator('.workspace-disengage-detail').waitFor({ timeout: 5000 });
  assert.equal(await form.getByLabel('Gunther : Préciser si le Test implique un mouvement.').count(), 0);
  const hands = form.getByLabel('Gunther : Séquelle : le Test repose-t-il normalement sur deux mains ?');
  await assert.doesNotReject(hands.waitFor({ timeout: 5000 }));
  assert.match(await form.textContent(), /À saisir avant d’appliquer/);
  await hands.selectOption('false');
  await page.waitForFunction(() => !/À saisir avant d’appliquer/.test(document.querySelector('.workspace-disengage')?.textContent || ''));
  assert.doesNotMatch(await form.textContent(), /À saisir avant d’appliquer/);
  const detail = await form.locator('.workspace-disengage-detail').textContent();
  assert.match(detail, /Gunther · À terre \(État\) : Désavantage/);
  assert.match(detail, /Orc · Plus forte pénalité d’État \(État\) : −1 DR/);
  await form.getByLabel(/d100 de Gunther/).fill('5');
  await form.getByLabel(/d100 de Gunther/).press('Tab');
  await form.getByLabel(/d100 de Orc/).fill('90');
  await form.getByLabel(/d100 de Orc/).press('Tab');
  await page.waitForFunction(() => /Gunther se désengage/.test(document.querySelector('.workspace-disengage')?.textContent || ''));
  assert.match(await form.textContent(), /Gunther se désengage/);
  await form.getByRole('button', { name: 'Appliquer le désengagement' }).click();
  await page.waitForFunction(() => !window.__store.listEngagedWith('gunther').length, null, { timeout: 5000 });
  assert.equal(await zone('Libres').locator('[data-workspace-select="gunther"]').count(), 1);
  // CA20-CA21 : scène réglée une fois (tiroir), position haute posée depuis le jeton.
  await page.getByLabel('Déplacer Aldric').selectOption('high:on');
  await page.waitForFunction(() => window.__store.listParticipants().find(row => row.id === 'aldric').extensions.v5.position?.higherGround === true, null, { timeout: 5000 });
  assert.match(await page.locator('.workspace-token').filter({ has: page.locator('[data-workspace-select="aldric"]') }).textContent(), /Position haute/);
  await page.locator('[data-workspace-select="gunther"]').click();
  if (await page.locator('.workspace-resolution-drawer').getAttribute('hidden') !== null) await page.locator('[data-circumstances-toggle]').click();
  await page.getByLabel('Éclairage de la scène').selectOption('dim');
  await page.waitForFunction(() => window.__store.getSceneCircumstances().lighting === 'dim', null, { timeout: 5000 });
  assert.equal(await page.getByLabel('Éclairage de la scène').inputValue(), 'dim');
  assert.equal(errors.length, 0, errors.join(' | '));
  console.log('engagements-plateau-browser: OK');
} finally { await browser.close(); server.close(); }
