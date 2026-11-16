import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';
import { closeU1Drawer } from './helpers/u1-drawer.mjs';
import { engagedWith } from '../js/core/engagements.js';

// Poursuite en combat selon le Livre de base V5 p. 158-159 (spec docs/specs/poursuite-v5, CA25) : un Brisé engagé fuit (attaques gratuites
// jouées ou passées, Élan dépensé par l'une), la poursuite se lance depuis son panneau, le poursuivant fait son Test à son Tour et le fuyard
// Brisé au sien (D21 : poursuite en cours, son Tour peut se terminer), le Test opposé est serré donc un Obstacle est tiré et tenté au Round suivant, la poursuite
// finit, « Engager au plateau » engage le fuyard rattrapé. ↶ et ↷ sur un Test appliqué, journal, rechargement en cours de poursuite.
// Tout passe par l'interface ; le Store ne prépare que la rencontre et ne sert qu'à lire l'état.
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
  const person = (value, id) => value.combat.participants.find(row => row.id === id);
  const engagedOf = (value, id) => engagedWith(value.combat, value.combat.participants, id);
  const logText = value => (value.log || []).map(row => row.text).join('\n');
  const turnOf = value => ({ round: value.combat.round, actor: value.combat.currentActorId });
  // Action du Tour d'un personnage : actions standard du Tour et quota « system:turn-action » (le quota propre à l'attaque gratuite ne compte pas).
  const actionRows = (value, id) => JSON.stringify([(value.extensions.v5.standardTurnActions || []).filter(row => row.actorId === id),
    (value.extensions.v5.actionLedger?.quotaUsage || []).filter(row => row.actorId === id && row.quotaId === 'system:turn-action')]);
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
  // Prêtresse (PJ, Brisée) engagée avec un Orc (Mouvement 5) et un Gobelin ; l'Orc est le poursuivant le plus rapide.
  await page.evaluate(async () => {
    const { Store } = await import('/js/main.js');
    const fighter = (id, name, camp, initiative, M, states = []) => ({ id, name, kind: camp === 'pj' ? 'PJ' : 'PNJ', camp, zone: 'active', initiative, hp: 20, maxHp: 30,
      caracs: { CC: 45, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states, traits: [], equipment: [], talents: [], prayers: [],
      skills: [{ id: 'skill-athletics', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total: 60 }], actions: [{ id: 'blade', type: 'attack', base: 45, damage: 3 }], extensions: { v5: {} } });
    await Store.loadFromJSON({ schemaVersion: 3, reserve: [], diceLines: [], log: [], extensions: { v5: { turnIndex: 1, combatId: 'qa-poursuite' } },
      combat: { round: 1, currentActorId: 'priest', order: ['priest', 'orc', 'gob'], participants: [
        fighter('priest', 'Prêtresse', 'pj', 60, 4, [{ id: 'qa-broken', key: 'brise', name: 'Brisé', level: 1, source: { type: 'browser-fixture' } }]),
        fighter('orc', 'Orc', 'ennemi', 50, 5), fighter('gob', 'Gobelin', 'ennemi', 30, 4)] } });
    await Store.engageParticipants('priest', 'orc');
    await Store.engageParticipants('priest', 'gob');
  });
  await page.getByRole('tab', { name: 'Jouer', exact: true }).click();
  await closeU1Drawer(page);
  const root$ = page.locator('#workspace-root');
  const actor = page.locator('[data-broken-escape-actor="priest"]');
  await actor.waitFor({ state: 'visible' });
  const advance = () => page.locator('.combat-banner-primary').click();

  // --- Attaques gratuites : l'Orc joue la sienne (Élan dépensé), le Gobelin passe la sienne -----------------------------------------
  assert.equal(await actor.locator('[data-pursuit-launch]').count(), 0, 'visibilité non précisée : pas de lancement');
  const orcActionBefore = actionRows(await state(), 'orc');
  await actor.getByLabel('Visibilité par rapport aux ennemis', { exact: true }).selectOption('false');
  assert.equal(await actor.locator('[data-pursuit-launch]').count(), 0, 'hors de vue de tous les ennemis : le lancement est absent');
  await actor.getByLabel('Visibilité par rapport aux ennemis', { exact: true }).selectOption('true');
  assert.equal(await actor.locator('[data-pursuit-launch]').count(), 1, 'visible d’un ennemi : le lancement est proposé');
  assert.match(await actor.locator('[data-broken-escape-free-attacks]').innerText(), /Orc : en attente[\s\S]*Gobelin : en attente/);
  await actor.locator('[data-broken-escape-free-attack="orc"]').click();
  // L'attaque de l'Orc contre la Prêtresse s'ouvre dans le panneau de résolution, hors du Tour de l'Orc.
  await root$.locator('[data-roll-input="attack"]').fill('30');
  await root$.locator('[data-roll-input="defense"]').fill('90');
  await root$.locator('[data-focus-key="calculate"]').click();
  await page.waitForFunction(() => !document.querySelector('#workspace-root [data-focus-key="apply"]')?.disabled);
  await root$.locator('[data-focus-key="apply"]').click();
  await until(value => /\n?.*Orc/.test(logText(value)) && value.extensions.v5.brokenEscape?.freeAttacksByActorId?.priest, 'l’attaque gratuite de l’Orc est enregistrée');
  await actor.getByText('Orc : jouée', { exact: true }).waitFor();
  assert.equal(actionRows(await state(), 'orc'), orcActionBefore, 'l’Action de l’Orc est inchangée par son attaque gratuite');
  assert.equal(await actor.getByLabel('Attaques gratuites résolues pour Orc, Gobelin', { exact: true }).isChecked(), false, 'une seule attaque jouée : pas encore résolues');
  await actor.locator('[data-broken-escape-free-attack-pass="gob"]').click();
  await actor.getByText('Gobelin : passée', { exact: true }).waitFor();
  assert.equal(await actor.getByLabel('Attaques gratuites résolues pour Orc, Gobelin', { exact: true }).isChecked(), true, '« Attaques gratuites résolues » se coche seule');
  assert.equal(actionRows(await state(), 'gob'), actionRows({ extensions: { v5: {} } }, 'gob'), 'l’Action du Gobelin n’est pas touchée');
  assert.equal(await actor.locator('[data-broken-escape-free-attack="orc"]').isDisabled(), true, 'l’attaque jouée ne se rejoue pas');
  assert.equal(await actor.locator('[data-broken-escape-free-attack="gob"]').isDisabled(), true, 'l’attaque passée ne se joue plus');

  // --- Fuite engagée : l'Orc a dépensé son Élan ---------------------------------------------------------------------------------------
  await actor.getByLabel('Visibilité par rapport aux ennemis', { exact: true }).selectOption('true');
  await actor.getByLabel('Déplacement Flee', { exact: true }).selectOption('walk');
  await actor.getByLabel('Visibilité après cette étape', { exact: true }).selectOption('true');
  await actor.getByLabel('Orc a dépensé son Élan', { exact: true }).check();
  await actor.getByLabel('Fuite engagée confirmée avec Orc, Gobelin', { exact: true }).check();
  assert.equal(await actor.getByLabel('Attaques gratuites résolues pour Orc, Gobelin', { exact: true }).isChecked(), true);
  await actor.getByRole('button', { name: 'Calculer l’aperçu', exact: true }).click();
  await actor.locator('[data-broken-escape-preview="priest"]').getByText('Aperçu : aucun effet appliqué.').waitFor();
  await actor.getByRole('button', { name: 'Appliquer Move (Flee)', exact: true }).click();
  const fled = await until(value => (value.extensions.v5.brokenEscape?.receipts || []).some(row => row.actorId === 'priest' && row.action === 'flee'), 'Move (Flee) appliqué');
  const effects = fled.extensions.v5.brokenEscape.receipts.find(row => row.actorId === 'priest' && row.action === 'flee').engagedEscapeEffects;
  assert.deepEqual(effects.freeAttackSpentMomentumIds, ['orc'], 'le moteur reçoit la liste des adversaires qui ont dépensé leur Élan');
  assert.deepEqual(effects.momentumRetainedEnemyIds, ['gob']);
  assert.deepEqual(engagedOf(fled, 'priest'), [], 'le fuyard n’est plus engagé');

  // --- Lancement de la poursuite ---------------------------------------------------------------------------------------------------------
  const launch = actor.locator('[data-pursuit-launch="priest"]');
  await launch.waitFor({ state: 'visible' });
  assert.equal(await launch.getByLabel('Rôle de Prêtresse', { exact: true }).inputValue(), 'prey');
  assert.equal(await launch.getByLabel('Rôle de Orc', { exact: true }).inputValue(), 'pursuer');
  assert.equal(await launch.getByLabel('Rôle de Gobelin', { exact: true }).inputValue(), 'pursuer');
  await launch.locator('[data-pursuit-start="priest"]').click();
  const panel = page.locator('[data-pursuit-panel]');
  await panel.waitFor({ state: 'visible' });
  let value = await state();
  const pursuit = value.extensions.v5.pursuit;
  assert.equal(pursuit.status, 'active');
  assert.deepEqual([pursuit.pair.pursuerId, pursuit.pair.preyId], ['orc', 'priest'], 'le plus rapide poursuivant contre le fuyard');
  assert.equal(pursuit.obstacleSide, 'prey', 'le camp des PJ franchit les Obstacles');
  assert.equal(await actor.locator('[data-pursuit-launch]').count(), 0, 'plus de lancement une fois la poursuite en cours');
  assert.match(logText(value), /Poursuite lancée : Prêtresse poursuivi\(s\) par Orc, Gobelin ; Test opposé de Orc contre Prêtresse/);

  // --- Round 1, Tour de la Prêtresse (fuyard Brisé) : poursuite en cours, plus de fuite ni de Sprint à faire, Test fait ou non (D21) ----
  const freed = 'Fuyard d’une poursuite en cours : la poursuite vaut pour la fuite et le Sprint, le Tour peut se terminer, Test fait ou non.';
  await actor.getByText(freed).waitFor();
  const preyTest = panel.locator('[data-pursuit-test="priest"][data-pursuit-test-kind="pursuit"]');
  await preyTest.getByLabel('Compétence du Test', { exact: true }).selectOption('Athlétisme');
  await preyTest.locator('[data-pursuit-test-roll="priest"]').fill('30');
  await preyTest.locator('[data-pursuit-test-calculate="priest"]').click();
  assert.match(await preyTest.locator('[data-pursuit-test-preview="priest"]').innerText(), /Aperçu : aucun effet appliqué[\s\S]*Athlétisme 60 · jet 30 · \+3 DR · réussite/);
  assert.equal((await state()).extensions.v5.pursuit.opposed.prey, null, 'l’aperçu n’écrit rien');
  await preyTest.locator('[data-pursuit-test-apply="priest"]').click();
  value = await until(next => next.extensions.v5.pursuit.opposed.prey, 'le Test du fuyard est enregistré');
  assert.equal(value.extensions.v5.pursuit.opposed.prey.sl, 3);
  assert.equal(value.extensions.v5.pursuit.opposed.netSl, null, 'la paire n’est comparée qu’une fois les deux Tests faits');
  await actor.getByText(freed).waitFor();
  await advance();
  await until(next => turnOf(next).actor === 'orc', 'le Tour du Brisé se termine après son Test de poursuite');

  // --- Round 1, Tour de l'Orc (poursuivant) --------------------------------------------------------------------------------------------
  const pursuerTest = panel.locator('[data-pursuit-test="orc"][data-pursuit-test-kind="pursuit"]');
  await pursuerTest.waitFor({ state: 'visible' });
  await pursuerTest.locator('[data-pursuit-test-roll="orc"]').fill('40');
  await pursuerTest.locator('[data-pursuit-test-calculate="orc"]').click();
  await pursuerTest.locator('[data-pursuit-test-preview="orc"]').getByText(/jet 40 · \+2 DR · réussite/).waitFor();
  await pursuerTest.locator('[data-pursuit-test-apply="orc"]').click();
  value = await until(next => next.extensions.v5.pursuit.opposed.netSl !== null, 'le Test opposé est comparé');
  assert.equal(value.extensions.v5.pursuit.opposed.netSl, -1);
  assert.equal(value.extensions.v5.pursuit.opposed.winner, 'prey');
  assert.equal(value.extensions.v5.pursuit.status, 'active', '1 DR d’écart : la poursuite continue par les Obstacles');
  assert.deepEqual(value.extensions.v5.pursuit.factors, { won: true, speed: false, terrain: false }, 'l’outil coche le Test gagné, pas le terrain');
  const factors = panel.locator('[data-pursuit-factors]');
  assert.equal(await factors.getByLabel('Test de poursuite gagné', { exact: true }).isChecked(), true);
  // Le terrain est un jugement du MJ : il le coche, l'outil le consigne.
  await factors.getByLabel(/^Terrain dense ou bondé/).check();
  value = await until(next => next.extensions.v5.pursuit.factors.terrain === true, 'le terrain coché est consigné');
  assert.match(logText(value), /facteurs favorables : Test gagné, terrain \(2\/3\)/);
  // Tirage de l'obstacle de la Prêtresse (d10 forcé à 6 le temps du clic : « Terrain découvert »).
  const obstacle = panel.locator('[data-pursuit-obstacle="priest"]');
  await obstacle.locator('[data-pursuit-draw="priest"]').evaluate(button => { const random = Math.random; Math.random = () => 0.55; try { button.click(); } finally { Math.random = random; } });
  value = await until(next => next.extensions.v5.pursuit.obstacles.length === 1, 'l’obstacle est tiré');
  assert.equal(value.extensions.v5.pursuit.obstacles[0].d10, 6);
  await obstacle.getByText(/Terrain découvert.*\(d10 = 6\)/).waitFor();
  assert.match(await obstacle.innerText(), /Compétences possibles : Athlétisme/);
  assert.match(logText(value), /Obstacle de Prêtresse : .*d10 = 6/);
  assert.equal(await panel.locator('[data-pursuit-test="priest"]').count(), 0, 'pas de Test d’Obstacle pendant le Tour de l’Orc');
  await advance();
  await until(next => turnOf(next).actor === 'gob', 'Tour du Gobelin');
  await panel.getByText('Aucun Test à jouer pendant le Tour de Gobelin.').waitFor();
  assert.equal(actionRows(await state(), 'gob'), actionRows({ extensions: { v5: {} } }, 'gob'), 'le Gobelin, hors paire, ne dépense rien');
  await advance();
  await until(next => turnOf(next).round === 2 && turnOf(next).actor === 'priest', 'Round 2, Tour de la Prêtresse');

  // --- Rechargement en cours de poursuite ------------------------------------------------------------------------------------------------
  const beforeReload = (await state()).extensions.v5.pursuit;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
  assert.deepEqual((await state()).extensions.v5.pursuit, beforeReload, 'la poursuite survit au rechargement');
  await page.getByRole('tab', { name: 'Jouer', exact: true }).click();
  await closeU1Drawer(page);
  await panel.waitFor({ state: 'visible' });
  await panel.locator('[data-pursuit-obstacle="priest"]').getByText(/Terrain découvert.*\(d10 = 6\)/).waitFor();
  assert.equal(await panel.locator('[data-pursuit-factors] input[type="checkbox"]:checked').count(), 2, 'les facteurs sont retrouvés');

  // --- Round 2 : Test d'Obstacle de la Prêtresse (jet raté : le groupe perd, le fuyard est rattrapé) -----------------------------------
  const obstacleTest = panel.locator('[data-pursuit-test="priest"][data-pursuit-test-kind="obstacle"]');
  await obstacleTest.waitFor({ state: 'visible' });
  assert.equal(await panel.locator('[data-pursuit-test="priest"][data-pursuit-test-kind="pursuit"]').count(), 0, 'son Test de poursuite est déjà joué');
  await obstacleTest.getByLabel('Compétence du Test', { exact: true }).selectOption('Athlétisme');
  await obstacleTest.locator('[data-pursuit-test-roll="priest"]').fill('99');
  await obstacleTest.locator('[data-pursuit-test-calculate="priest"]').click();
  // Un Obstacle n'est pas toujours une fuite : l'État Brisé pose sa question au MJ, qui y répond avant l'aperçu.
  assert.equal(await obstacleTest.locator('[data-pursuit-test-apply="priest"]').isDisabled(), true, 'question d’État sans réponse : Appliquer reste inactif');
  await obstacleTest.getByLabel('Préciser si le Test sert à fuir ou se cacher.', { exact: true }).selectOption('true');
  await obstacleTest.locator('[data-pursuit-test-preview="priest"]').getByText(/jet 99.*échec/).waitFor();
  await obstacleTest.locator('[data-pursuit-test-apply="priest"]').click();
  const ended = await until(next => next.extensions.v5.pursuit.status === 'ended', 'la poursuite est finie');
  assert.equal(ended.extensions.v5.pursuit.outcome.kind, 'caught');
  assert.equal(ended.extensions.v5.pursuit.outcome.reason, 'obstacles');
  assert.match(logText(ended), /Prêtresse ne franchit pas son Obstacle/);
  assert.match(logText(ended), /Fin de poursuite : fuyard rattrapé \(0 Obstacle\(s\) franchi\(s\) sur 1 exigé\(s\)\)/);
  const outcome = panel.locator('[data-pursuit-outcome]');
  await outcome.getByText('Fuyard rattrapé', { exact: true }).waitFor();
  assert.deepEqual(engagedOf(ended, 'priest'), [], 'ne rien cliquer ne change aucune donnée : rien n’est engagé');
  await actor.getByText('Son Test de poursuite de ce Tour vaut pour la fuite et le Sprint : le Tour peut se terminer.').waitFor();

  // --- ↶ puis ↷ sur le Test appliqué -------------------------------------------------------------------------------------------------------
  const spentAfter = actionRows(ended, 'priest');
  await page.locator('#btn-undo').click();
  const undone = await until(next => next.extensions.v5.pursuit.status === 'active', '↶ rend la poursuite en cours');
  assert.equal(undone.extensions.v5.pursuit.obstacles[0].test, null, '↶ retire le Test d’Obstacle');
  assert.notEqual(actionRows(undone, 'priest'), spentAfter, '↶ rend l’Action du Tour');
  await obstacleTest.waitFor({ state: 'visible' });
  await page.locator('#btn-menu').click();
  await page.locator('#btn-redo').click();
  const redone = await until(next => next.extensions.v5.pursuit.status === 'ended', '↷ réapplique le Test');
  assert.equal(redone.extensions.v5.pursuit.obstacles[0].test.roll, 99);
  assert.equal(actionRows(redone, 'priest'), spentAfter, '↷ reprend l’Action du Tour');

  // --- Bouton de fin ---------------------------------------------------------------------------------------------------------------------------
  await panel.locator('[data-pursuit-outcome]').waitFor();
  await panel.locator('[data-pursuit-end-apply="engage"]').click();
  const engaged = await until(next => engagedOf(next, 'priest').length === 2, '« Engager au plateau » engage le fuyard avec ses poursuivants');
  assert.deepEqual(engagedOf(engaged, 'priest').sort(), ['gob', 'orc']);
  assert.match(logText(engaged), /Poursuite · Prêtresse engagé\(s\) avec Orc, Gobelin \(MJ\)/);
  assert.equal(await panel.locator('[data-pursuit-end-apply="engage"]').isDisabled(), true, 'on n’engage pas deux fois');
  // Le Tour de la Prêtresse peut se terminer : son Test d'Obstacle vaut pour la fuite et le Sprint (D20).
  await advance();
  await until(next => turnOf(next).actor === 'orc', 'Tour de l’Orc après celui du Brisé');
  assert.deepEqual(errors, [], 'aucune erreur JS ni boîte native');
  console.log('poursuite-v5-browser: OK');
} finally { await browser.close(); server.close(); }
