import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';
import { closeU1Drawer } from './helpers/u1-drawer.mjs';
import { engagedWith } from '../js/core/engagements.js';

// Poursuite de scène hors combat (Livre de base V5 p. 158-159 ; spec docs/specs/poursuite-v5, D8, D17, CA19, CA20) : la modale de l'écran
// Jouer, de l'ouverture à « Valider », sans Action ni Round. Entrée grisée avec son motif tant qu'il manque un participant ; « Fermer sans
// valider » n'écrit rien ; une fin à 6 DR (fuyard échappé, « Retirer de la rencontre ») puis un passage par les Obstacles (fuyard rattrapé,
// « Engager au plateau »). Tout passe par l'interface ; le Store ne prépare que la rencontre et ne sert qu'à lire l'état.
const root = fileURLToPath(new URL('..', import.meta.url));
const server = createStaticServer({ root, headers: { 'Cache-Control': 'no-store' } });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
try {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
  await blockExternalNetwork(context, server);
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { errors.push(`boîte native : ${dialog.message()}`); void dialog.dismiss(); });
  const state = () => page.evaluate(async () => { const { Store } = await import('/js/main.js'); await Store.whenIdle(); return JSON.parse(Store.getFullJSON()); });
  const until = async (check, what, timeout = 8000) => {
    const end = Date.now() + timeout;
    for (;;) {
      const value = await state();
      if (check(value)) return value;
      if (Date.now() > end) assert.fail(`attendu : ${what}`);
      await page.waitForTimeout(100);
    }
  };
  const logText = value => (value.log || []).map(row => row.text).join('\n');
  const engagedOf = (value, id) => engagedWith(value.combat, value.combat.participants, id);
  const idsOf = value => value.combat.participants.filter(row => row.zone === 'active').map(row => row.id);
  // Rencontre de départ : Prêtresse (PJ, Mouvement 4), Orc (Mouvement 5) et Gobelin, sans Brisé ni engagement ; `only` limite aux premiers.
  const prepare = only => page.evaluate(async count => {
    const { Store } = await import('/js/main.js');
    const fighter = (id, name, camp, initiative, M) => ({ id, name, kind: camp === 'pj' ? 'PJ' : 'PNJ', camp, zone: 'active', initiative, hp: 20, maxHp: 30,
      caracs: { CC: 45, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [], traits: [], equipment: [], talents: [], prayers: [],
      skills: [{ id: 'skill-athletics', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total: 60 }], actions: [{ id: 'blade', type: 'attack', base: 45, damage: 3 }], extensions: { v5: {} } });
    const rows = [fighter('priest', 'Prêtresse', 'pj', 60, 4), fighter('orc', 'Orc', 'ennemi', 50, 5), fighter('gob', 'Gobelin', 'ennemi', 30, 4)].slice(0, count);
    await Store.loadFromJSON({ schemaVersion: 3, reserve: [], diceLines: [], log: [], extensions: { v5: { turnIndex: 1, combatId: 'qa-poursuite-scene' } },
      combat: { round: 1, currentActorId: 'priest', order: rows.map(row => row.id), participants: rows } });
  }, only ?? 3);
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
  const open = page.locator('[data-pursuit-scene-open]');
  const reason = page.locator('[data-pursuit-scene-reason]');
  const dialog = page.locator('dialog[data-pursuit-dialog]');
  const pursuitTest = (id, kind) => dialog.locator(`[data-pursuit-test="${id}"][data-pursuit-test-kind="${kind}"]`);
  const rollOf = (id, kind, value) => pursuitTest(id, kind).locator(`[data-pursuit-test-roll="${id}"]`).fill(String(value));
  const closeBox = () => dialog.locator('[data-pursuit-scene-close]');
  const validate = dialog.locator('[data-pursuit-scene-validate]');

  // --- Entrée de l'écran Jouer : grisée avec son motif sans participant, puis avec un seul (D17) ------------------------------------------
  await page.getByRole('tab', { name: 'Jouer', exact: true }).click();
  await closeU1Drawer(page);
  await open.waitFor({ state: 'visible' });
  assert.equal(await open.isDisabled(), true, 'sans participant, l’entrée est grisée');
  assert.equal(await reason.innerText(), 'Aucun participant dans la rencontre en cours.');
  assert.equal(await open.getAttribute('aria-describedby'), await reason.getAttribute('id'), 'le bouton lit son motif');
  await prepare(1);
  await page.waitForFunction(() => /Un seul participant/.test(document.querySelector('[data-pursuit-scene-reason]')?.textContent || ''));
  assert.equal(await open.isDisabled(), true, 'un seul participant : encore grisée');
  assert.equal(await reason.innerText(), 'Un seul participant dans la rencontre en cours : il en faut deux pour une poursuite.');
  await prepare();
  await page.waitForFunction(() => document.querySelector('[data-pursuit-scene-open]') && !document.querySelector('[data-pursuit-scene-open]').disabled);
  assert.equal(await reason.count(), 0, 'avec deux participants, plus de motif');

  // --- Fermer sans valider n'écrit rien ------------------------------------------------------------------------------------------------------
  const untouched = await state();
  await open.click();
  await dialog.waitFor({ state: 'visible' });
  assert.equal(await validate.isDisabled(), true, 'sans poursuite saisie, « Valider » est inactif');
  await dialog.getByLabel('Rôle de Prêtresse', { exact: true }).selectOption('prey');
  await dialog.getByLabel('Rôle de Orc', { exact: true }).selectOption('pursuer');
  await rollOf('priest', 'pursuit', 5);
  await rollOf('orc', 'pursuit', 95);
  await dialog.locator('[data-pursuit-outcome="scene"]').waitFor();
  assert.equal(await validate.isDisabled(), false, 'la règle tranche : « Valider » est actif');
  assert.equal(await closeBox().innerText(), 'Fermer sans valider');
  await closeBox().click();
  await dialog.waitFor({ state: 'detached' });
  const closed = await state();
  assert.equal(closed.localRevision, untouched.localRevision, 'fermer sans valider ne change pas la révision');
  assert.deepEqual(closed.log, untouched.log, 'ni le journal');
  assert.deepEqual(closed.combat, untouched.combat, 'ni la rencontre');
  assert.equal(closed.extensions.v5.pursuit, undefined, 'aucune poursuite conservée');
  assert.equal(await open.evaluate(element => element === document.activeElement), true, 'le focus revient sur l’entrée');
  // Échap ferme aussi sans rien écrire.
  await open.click();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByLabel('Rôle de Prêtresse', { exact: true }).selectOption('prey');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  assert.equal((await state()).localRevision, untouched.localRevision, 'Échap n’écrit rien');

  // --- Fin à 6 DR : la Prêtresse (+6 DR) échappe à l'Orc (−3 DR) ; Valider, puis « Retirer de la rencontre » ----------------------------------
  await open.click();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByLabel('Rôle de Prêtresse', { exact: true }).selectOption('prey');
  await dialog.getByLabel('Rôle de Orc', { exact: true }).selectOption('pursuer');
  await rollOf('priest', 'pursuit', 5);
  assert.equal(await validate.isDisabled(), true, 'un seul Test saisi : la règle ne tranche pas encore');
  assert.equal(await dialog.locator('[data-pursuit-scene-status]').innerText(), 'Test de poursuite des deux côtés à saisir.');
  await rollOf('orc', 'pursuit', 95);
  await pursuitTest('orc', 'pursuit').locator('[data-pursuit-test-preview="orc"]').getByText(/Aperçu : rien n’est enregistré avant « Valider »/).waitFor();
  await dialog.getByText('Test opposé : les fuyards l’emportent (-9 DR).').waitFor();
  const outcome = dialog.locator('[data-pursuit-outcome="scene"]');
  await outcome.getByText('Fuyard échappé', { exact: true }).waitFor();
  assert.match(await outcome.innerText(), /Motif : Écart de 9 DR en faveur des fuyards\./);
  assert.equal(await dialog.locator('[data-pursuit-factors]').count(), 0, 'la fin à 6 DR ne passe ni par les facteurs ni par les Obstacles');
  assert.equal(await outcome.locator('[data-pursuit-end-apply]').count(), 0, 'avant « Valider », pas de bouton de fin');
  const before = await state();
  await validate.click();
  await dialog.getByText('Poursuite validée : une entrée au journal, annulable par ↶. Les boutons ci-dessus agissent sur le plateau.').waitFor();
  const validated = await state();
  assert.equal(validated.log.length, before.log.length + 1, 'une seule ligne de journal');
  assert.equal(validated.localRevision, before.localRevision + 1, 'une seule entrée d’historique');
  assert.match(validated.log[0].text, /Poursuite hors combat : Prêtresse poursuivi\(s\) par Orc\. Test opposé : -9 DR\. Issue : fuyard échappé \(Écart de 9 DR en faveur des fuyards\)\./);
  assert.equal(validated.combat.round, before.combat.round, 'aucun Round');
  assert.deepEqual(validated.extensions.v5.standardTurnActions, before.extensions.v5.standardTurnActions, 'aucune Action consommée');
  assert.deepEqual(validated.extensions.v5.actionLedger, before.extensions.v5.actionLedger);
  assert.equal(validated.extensions.v5.pursuit, undefined, 'rien de conservé hors de la modale');
  assert.deepEqual(idsOf(validated), ['priest', 'orc', 'gob'], 'valider ne retire personne');
  assert.equal(await validate.count(), 0, 'une fois validée, plus de « Valider »');
  assert.equal(await dialog.getByLabel('Rôle de Prêtresse', { exact: true }).isDisabled(), true, 'la saisie validée ne se modifie plus');
  await outcome.locator('[data-pursuit-end-apply="remove"]').click();
  const removed = await until(next => !idsOf(next).includes('priest'), '« Retirer de la rencontre » retire le fuyard échappé');
  assert.deepEqual(idsOf(removed), ['orc', 'gob']);
  await closeBox().click();
  await dialog.waitFor({ state: 'detached' });
  // ↶ annule le retrait (le journal, lui, garde ses lignes) ; ↷ le rejoue.
  await page.locator('#btn-undo').click();
  await until(next => idsOf(next).includes('priest'), '↶ rend le fuyard');
  await page.locator('#btn-menu').click();
  await page.locator('#btn-redo').click();
  await until(next => !idsOf(next).includes('priest'), '↷ retire de nouveau le fuyard');

  // --- Passage par les Obstacles : Test opposé serré, obstacle tiré, Test raté, fuyard rattrapé ; « Engager au plateau » --------------------
  await prepare();
  await page.waitForFunction(() => document.querySelector('[data-pursuit-scene-open]') && !document.querySelector('[data-pursuit-scene-open]').disabled);
  await open.click();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByLabel('Rôle de Prêtresse', { exact: true }).selectOption('prey');
  await dialog.getByLabel('Rôle de Orc', { exact: true }).selectOption('pursuer');
  assert.equal(await dialog.locator('[data-pursuit-factors]').count(), 0, 'les facteurs viennent après le Test opposé');
  await rollOf('priest', 'pursuit', 30);
  await rollOf('orc', 'pursuit', 40);
  await dialog.getByText('Test opposé : les fuyards l’emportent (-1 DR).').waitFor();
  const factors = dialog.locator('[data-pursuit-factors]');
  await factors.waitFor({ state: 'visible' });
  assert.equal(await factors.getByLabel('Test de poursuite gagné', { exact: true }).isChecked(), true, 'l’outil coche le Test gagné');
  assert.equal(await factors.getByLabel(/^Terrain dense ou bondé/).isChecked(), false, 'le terrain reste au MJ');
  assert.match(await factors.innerText(), /1\/3 facteur\(s\) : 1 Obstacle\(s\) à franchir sur 1 personnage\(s\)\./);
  assert.equal(await validate.isDisabled(), true, 'aucun Obstacle tenté : la règle ne tranche pas');
  await factors.getByLabel(/^Terrain dense ou bondé/).check();
  assert.match(await factors.innerText(), /2\/3 facteur\(s\)/);
  const obstacle = dialog.locator('[data-pursuit-obstacle="priest"]');
  await obstacle.locator('[data-pursuit-draw="priest"]').evaluate(button => { const random = Math.random; Math.random = () => 0.55; try { button.click(); } finally { Math.random = random; } });
  await obstacle.getByText(/Terrain découvert.*\(d10 = 6\)/).waitFor();
  assert.match(await obstacle.innerText(), /Compétences possibles : Athlétisme/);
  await rollOf('priest', 'obstacle', 99);
  await pursuitTest('priest', 'obstacle').locator('[data-pursuit-test-preview="priest"]').getByText(/jet 99.*échec/).waitFor();
  await dialog.getByText('Ne franchit pas son Obstacle', { exact: false }).waitFor();
  const outcome2 = dialog.locator('[data-pursuit-outcome="scene"]');
  await outcome2.getByText('Fuyard rattrapé', { exact: true }).waitFor();
  assert.match(await outcome2.innerText(), /Motif : 0 Obstacle\(s\) franchi\(s\) sur 1 exigé\(s\)\./);
  assert.equal(await validate.isDisabled(), false);
  const before2 = await state();
  await validate.click();
  await dialog.getByText('Poursuite validée', { exact: false }).waitFor();
  const validated2 = await state();
  assert.equal(validated2.log.length, before2.log.length + 1);
  assert.equal(validated2.localRevision, before2.localRevision + 1, 'une seule entrée d’historique');
  assert.match(validated2.log[0].text, /Issue : fuyard rattrapé \(0 Obstacle\(s\) franchi\(s\) sur 1 exigé\(s\)\)\./);
  assert.deepEqual(engagedOf(validated2, 'priest'), [], 'ne rien cliquer ne change aucune donnée : rien n’est engagé');
  assert.equal(validated2.combat.round, before2.combat.round, 'aucun Round');
  assert.deepEqual(validated2.extensions.v5.actionLedger, before2.extensions.v5.actionLedger, 'aucune Action consommée');
  await outcome2.locator('[data-pursuit-end-apply="engage"]').click();
  const engaged = await until(next => engagedOf(next, 'priest').length > 0, '« Engager au plateau » engage le fuyard rattrapé');
  assert.deepEqual(engagedOf(engaged, 'priest'), ['orc']);
  assert.match(logText(engaged), /Poursuite · Prêtresse engagé\(s\) avec Orc \(MJ\)/);
  assert.equal(await outcome2.locator('[data-pursuit-end-apply="engage"]').isDisabled(), true, 'on n’engage pas deux fois');
  await closeBox().click();
  await dialog.waitFor({ state: 'detached' });
  assert.deepEqual(errors, [], 'aucune erreur JS ni boîte native');
  console.log('poursuite-hors-combat-browser: OK');
} finally { await browser.close(); server.close(); }
