// Poursuite V5 dans le Store (docs/specs/poursuite-v5, lot L3) : commandes, Action du Tour, historique, journal, fin.
// CA5, CA9, CA12 à CA20 ; D5, D6, D8, D9, D15, D17, D18.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { listEngagements } from '../../../js/core/engagements.js';
import { pursuitFreesBrokenPrey } from '../../../js/core/store/api-pursuit.js';

const memoryPersistence = () => { let state; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: value }) { state = structuredClone(value); return { ok: true }; } }; };
const athletics = (total = 50) => ({ id: 'athletisme', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total });
const fighter = (id, camp, extra = {}) => ({ id, name: id, kind: camp === 'ennemi' ? 'PNJ' : 'PJ', camp, zone: 'active', initiative: 50, hp: 20, maxHp: 20,
  caracs: { CC: 50, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, skills: [athletics()], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
// Ordre du Tour : gunther (60), aldric (40), orc (30).
async function fixture(extra = {}) {
  const store = createStore({ storage: null, persistence: memoryPersistence() }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'combat-1' } },
    combat: { round: 1, currentActorId: 'gunther', order: ['gunther', 'aldric', 'orc'], participants: [fighter('gunther', 'pj', { initiative: 60, ...extra.gunther }),
      fighter('aldric', 'pj', { initiative: 40, ...extra.aldric }), fighter('orc', 'ennemi', { initiative: 30, ...extra.orc })] } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return { store, engine: createCombatEngine(store) };
}
const chase = { preyIds: ['orc'], pursuerIds: ['gunther', 'aldric'], visibleToAnyEnemy: true };
const pairs = store => listEngagements({ participants: store.listParticipants() }).map(row => row.a + '-' + row.b);
const logTexts = store => store.getLog().map(row => row.text);
const refused = (fn, pattern) => assert.rejects(async () => fn(), pattern);
const testOf = async (store, participantId, roll, extra = {}) => {
  const plan = store.previewPursuitTest({ participantId, skill: 'Athlétisme', roll, ...extra });
  assert.equal(plan.ready, true, plan.error);
  return store.applyPursuitTest(plan);
};
const obstacleOf = async (store, participantId, roll, extra = {}) => {
  const plan = store.previewObstacleTest({ participantId, skill: 'Athlétisme', roll, ...extra });
  assert.equal(plan.ready, true, plan.error);
  return store.applyObstacleTest(plan);
};

test('lancement refusé si le fuyard est hors de vue (CA12) ; lancé avec Mouvements, paire et journal', async () => {
  const { store } = await fixture();
  await refused(() => store.startPursuit({ ...chase, visibleToAnyEnemy: false }), /vue/);
  await refused(() => store.startPursuit({ preyIds: ['orc'], pursuerIds: ['orc'], visibleToAnyEnemy: true }), /distincts|deux camps/);
  await store.startPursuit(chase);
  const pursuit = store.getPursuit();
  assert.equal(pursuit.status, 'active');
  assert.deepEqual(pursuit.movement, { orc: 4, gunther: 4, aldric: 4 });
  assert.deepEqual(pursuit.pair, { pursuerId: 'gunther', preyId: 'orc', forced: false });
  assert.equal(pursuit.obstacleSide, 'pursuers', 'D12 : le camp des PJ franchit les Obstacles');
  assert.match(logTexts(store)[0], /Poursuite lancée/);
  await refused(() => store.startPursuit(chase), /déjà/);
});

test('un Test consomme l’Action du Tour ; second Test refusé ; Action déjà utilisée refusée (CA13)', async () => {
  const { store } = await fixture();
  await store.startPursuit(chase);
  await testOf(store, 'gunther', 25);
  const again = store.previewPursuitTest({ participantId: 'gunther', skill: 'Athlétisme', roll: 25 });
  assert.equal(again.ready, false);
  assert.match(again.error, /Action/);
  assert.match(store.previewPursuitTest({ participantId: 'orc', skill: 'Athlétisme', roll: 25 }).error, /Tour/, 'D9 : chacun à son Tour');
  const spent = await fixture();
  await spent.store.startPursuit(chase);
  const attack = spent.store.previewResolution({ resolutionId: 'a1', actorId: 'gunther', targetId: 'aldric', roll: 20,
    action: { type: 'attack', base: 50, attr: 'CC', damage: 2 }, defense: { base: 30, attr: 'CC', roll: 80, v5: { kind: 'melee' } }, v5: { kind: 'melee' } });
  assert.equal((await spent.store.applyResolution(attack)).status, 'applied');
  assert.match(spent.store.previewPursuitTest({ participantId: 'gunther', skill: 'Athlétisme', roll: 25 }).error, /Action/);
});

test('paire comparée après les deux Tests, Obstacles sur deux Rounds, rattrapé puis « Engager » (CA14, CA16, CA17, CA18, D9)', async () => {
  const { store, engine } = await fixture();
  await store.startPursuit(chase);
  await testOf(store, 'gunther', 25);
  assert.equal(store.getPursuit().opposed.netSl, null, 'pas de comparaison tant que la proie n’a pas joué');
  await engine.nextTurn(); await engine.nextTurn();
  await testOf(store, 'orc', 45);
  const compared = store.getPursuit();
  assert.equal(compared.opposed.netSl, 2);
  assert.equal(compared.opposed.winner, 'pursuer');
  assert.deepEqual(compared.factors, { won: true, speed: false, terrain: false }, 'D13 : facteurs cochés par l’outil');
  assert.ok(logTexts(store).some(text => /Test opposé/.test(text)));
  await engine.nextTurn();
  assert.equal(store.getCombat().round, 2);
  await store.setPursuitObstacle('gunther', { d10: 6 });
  await obstacleOf(store, 'gunther', 80);
  assert.equal(store.getPursuit().outcome, null, 'un Obstacle raté, un autre à jouer : rien ne tranche');
  await engine.nextTurn();
  await store.setPursuitObstacle('aldric', { d10: 6 });
  await obstacleOf(store, 'aldric', 25);
  const ended = store.getPursuit();
  assert.equal(ended.status, 'ended');
  assert.equal(ended.outcome.kind, 'caught');
  assert.equal(ended.outcome.reason, 'obstacles');
  assert.match(logTexts(store)[0], /Fin de poursuite.*rattrapé/i);
  const before = JSON.stringify(store.listParticipants());
  await engine.nextTurn();
  assert.equal(JSON.stringify(store.listParticipants().map(row => row.extensions?.v5?.engagements)), JSON.stringify(JSON.parse(before).map(row => row.extensions?.v5?.engagements)), 'ne rien cliquer ne change rien');
  await refused(() => store.applyPursuitEnd('remove'), /rattrapé|échappé/);
  await store.applyPursuitEnd('engage');
  assert.deepEqual(pairs(store).sort(), ['aldric-orc', 'gunther-orc']);
});

test('↶ rend l’état, l’Action et Obstiné ; ↷ réapplique (CA15)', async () => {
  const { store } = await fixture({ gunther: { talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }] } });
  await store.startTalentSession();
  await store.startPursuit(chase);
  const revision = store.getLocalRevision();
  await testOf(store, 'gunther', 25, { context: { preRollTalent: 'strong-minded' } });
  assert.equal(store.getLocalRevision(), revision + 1, 'une seule entrée d’historique');
  assert.equal(store.getObstinateStatus('gunther').available, false);
  await store.undo();
  assert.equal(store.getPursuit().opposed.pursuer, null);
  assert.equal(store.getObstinateStatus('gunther').available, true);
  assert.equal(store.previewPursuitTest({ participantId: 'gunther', skill: 'Athlétisme', roll: 25 }).ready, true, 'l’Action est rendue');
  await store.redo();
  assert.equal(store.getPursuit().opposed.pursuer.sl, 3);
  assert.equal(store.getObstinateStatus('gunther').available, false);
});

test('aperçu sans écriture (CA5) ; aperçu périmé refusé (« recalculez ») (CA15)', async () => {
  const { store } = await fixture();
  await store.startPursuit(chase);
  const revision = store.getLocalRevision(), log = store.getLog().length;
  const plan = store.previewPursuitTest({ participantId: 'gunther', skill: 'Athlétisme', roll: 25 });
  assert.equal(store.getLocalRevision(), revision);
  assert.equal(store.getLog().length, log);
  await store.setParticipantPosition('aldric', { cover: true });
  await refused(() => store.applyPursuitTest(plan), /recalculez/);
  await refused(() => store.applyPursuitTest({ ...plan, test: { ...plan.test, sl: 9 } }), /recalculez/);
});

test('l’état survit au Tour suivant et au rechargement (CA14)', async () => {
  const { store, engine } = await fixture();
  await store.startPursuit(chase);
  await testOf(store, 'gunther', 25);
  await engine.nextTurn();
  const reloaded = createStore({ storage: null, persistence: memoryPersistence() }); await reloaded.ready;
  await reloaded.loadFromJSON(JSON.parse(store.getFullJSON()));
  assert.deepEqual(reloaded.getPursuit(), store.getPursuit());
  assert.equal(reloaded.getPursuit().opposed.pursuer.sl, 3);
});

test('facteurs : trois cases booléennes ; obstacle libre tracé ; abandon du MJ (CA4, CA9, CA17)', async () => {
  const { store, engine } = await fixture();
  await store.startPursuit(chase);
  await testOf(store, 'gunther', 25);
  await engine.nextTurn(); await engine.nextTurn();
  await testOf(store, 'orc', 45);
  assert.throws(() => store.setPursuitFactors({ terrain: 2 }), /case/);
  assert.throws(() => store.setPursuitFactors({ vent: true }), /case/);
  await store.setPursuitFactors({ terrain: true });
  assert.deepEqual(store.getPursuit().factors, { won: true, speed: false, terrain: true });
  assert.match(logTexts(store)[0], /facteurs favorables.*2\/3/);
  await store.setPursuitObstacle('aldric', { label: 'Pont effondré', skills: ['Escalade'] });
  assert.equal(store.getPursuit().obstacles.find(row => row.participantId === 'aldric').obstacle.free, true);
  assert.match(logTexts(store)[0], /Pont effondré.*libre/);
  await store.endPursuit({ reason: 'gm' });
  assert.equal(store.getPursuit().status, 'ended');
  assert.equal(store.getPursuit().outcome.reason, 'gm');
  assert.match(logTexts(store)[0], /abandon du MJ/);
});

test('fuyard échappé à 6 DR puis « Retirer de la rencontre » (CA2, CA18)', async () => {
  const { store, engine } = await fixture();
  await store.startPursuit(chase);
  await testOf(store, 'gunther', 95);
  await engine.nextTurn(); await engine.nextTurn();
  await testOf(store, 'orc', 5);
  const pursuit = store.getPursuit();
  assert.equal(pursuit.outcome.kind, 'escaped');
  assert.equal(pursuit.outcome.reason, 'dr6');
  assert.match(logTexts(store)[0], /échappé.*DR/);
  assert.ok(store.listParticipants().some(row => row.id === 'orc'), 'ne rien cliquer ne retire personne');
  await refused(() => store.applyPursuitEnd('engage'), /rattrapé/);
  await store.applyPursuitEnd('remove');
  assert.ok(!store.listParticipants().some(row => row.id === 'orc'));
});

test('issue partielle : le journal nomme ceux qui ont franchi et rappelle l’occasion du poursuivant seul (D15)', async () => {
  const { store, engine } = await fixture();
  await store.startPursuit(chase);
  await testOf(store, 'gunther', 25);
  await engine.nextTurn(); await engine.nextTurn();
  await testOf(store, 'orc', 45);
  await store.setPursuitFactors({ won: false });
  await engine.nextTurn();
  await store.setPursuitObstacle('gunther', { d10: 6 });
  await obstacleOf(store, 'gunther', 25);
  await engine.nextTurn();
  await store.setPursuitObstacle('aldric', { d10: 6 });
  await obstacleOf(store, 'aldric', 90);
  const pursuit = store.getPursuit();
  assert.equal(pursuit.outcome.kind, 'escaped');
  assert.deepEqual(pursuit.outcome.partial.crossedIds, ['gunther']);
  assert.match(logTexts(store)[0], /gunther/);
  assert.match(logTexts(store)[0], /seule occasion/);
});

test('fuyards PJ perdants : celui qui a franchi peut quand même être retiré (D15)', async () => {
  const { store, engine } = await fixture();
  await store.startPursuit({ preyIds: ['gunther', 'aldric'], pursuerIds: ['orc'], visibleToAnyEnemy: true });
  assert.equal(store.getPursuit().obstacleSide, 'prey');
  await testOf(store, 'gunther', 45);
  await engine.nextTurn(); await engine.nextTurn();
  await testOf(store, 'orc', 25);
  assert.equal(store.getPursuit().opposed.winner, 'pursuer');
  await engine.nextTurn();
  await store.setPursuitObstacle('gunther', { d10: 6 });
  await obstacleOf(store, 'gunther', 25);
  await engine.nextTurn();
  await store.setPursuitObstacle('aldric', { d10: 6 });
  await obstacleOf(store, 'aldric', 90);
  const pursuit = store.getPursuit();
  assert.equal(pursuit.outcome.kind, 'caught');
  assert.deepEqual(pursuit.outcome.partial, { crossedIds: ['gunther'], canEscapeAnyway: true, canContinueAlone: false });
  await refused(() => store.applyPursuitEnd('remove', { participantId: 'aldric' }), /franchi/);
  await store.applyPursuitEnd('remove', { participantId: 'gunther' });
  assert.ok(!store.listParticipants().some(row => row.id === 'gunther'));
});

test('Réussite éclatante : le bénéficiaire est choisi parmi les alliés de la poursuite (D11)', async () => {
  const { store, engine } = await fixture({ gunther: { skills: [athletics(90)] } });
  await store.startPursuit(chase);
  await testOf(store, 'gunther', 65);
  await engine.nextTurn(); await engine.nextTurn();
  await testOf(store, 'orc', 45);
  await engine.nextTurn();
  await store.setPursuitObstacle('gunther', { d10: 6 });
  const wrong = store.previewObstacleTest({ participantId: 'gunther', skill: 'Athlétisme', roll: 11, beneficiaryId: 'orc' });
  assert.equal(wrong.ready, false);
  assert.match(wrong.error, /alliés/);
  await obstacleOf(store, 'gunther', 11, { beneficiaryId: 'aldric' });
  const row = store.getPursuit().obstacles.find(item => item.participantId === 'gunther');
  assert.equal(row.test.astonishing, true);
  assert.equal(row.beneficiaryId, 'aldric');
  assert.ok(logTexts(store).some(text => /Réussite éclatante.*aldric/.test(text)));
});

test('hors combat : participants de la rencontre seulement, aperçu sans écriture, validation d’un bloc sans Action ni Round (CA19, CA20, D8, D17)', async () => {
  const { store } = await fixture();
  assert.equal(store.scenePursuitAvailability().available, true);
  const input = { preyIds: ['orc'], pursuerIds: ['gunther', 'aldric'],
    tests: { pursuer: { skill: 'Athlétisme', roll: 95 }, prey: { skill: 'Athlétisme', roll: 5 } } };
  assert.match(store.previewScenePursuit({ ...input, preyIds: ['inconnu'] }).error, /rencontre/);
  const revision = store.getLocalRevision(), log = store.getLog().length, round = store.getCombat().round;
  const plan = store.previewScenePursuit(input);
  assert.equal(plan.ready, true, plan.error);
  assert.equal(plan.evaluation.outcome.kind, 'escaped');
  assert.equal(store.getLocalRevision(), revision, 'fermer sans valider n’écrit rien');
  assert.equal(store.getLog().length, log);
  await store.applyScenePursuit(plan);
  assert.equal(store.getLocalRevision(), revision + 1, 'une entrée d’historique');
  assert.equal(store.getLog().length, log + 1, 'une ligne de journal');
  assert.match(logTexts(store)[0], /Poursuite hors combat/);
  assert.equal(store.getCombat().round, round);
  assert.equal(store.getPursuit(), null, 'rien de conservé');
  assert.equal(store.previewPursuitTest({ participantId: 'gunther', skill: 'Athlétisme', roll: 25 }).error.includes('Action'), false, 'aucune Action consommée');
  await store.applyPursuitEnd('remove', { scenePlan: plan });
  assert.ok(!store.listParticipants().some(row => row.id === 'orc'));
  const empty = createStore({ storage: null, persistence: memoryPersistence() }); await empty.ready;
  assert.equal(empty.scenePursuitAvailability().available, false);
  assert.match(empty.scenePursuitAvailability().reason, /participant/);
});

const noMove = { caracs: { CC: 50, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40 } };

test('Mouvement inconnu ou nul : la poursuite ne se clôt pas au lancement, l’état le signale et attend la saisie du MJ (D22)', async () => {
  // Poursuivant Surpris (Mouvement nul) contre un orc M4 : la poursuite finissait au lancement (« échappé »).
  const surprised = await fixture({ gunther: { states: [{ id: 's1', key: 'surpris', name: 'Surpris', level: 1 }] } });
  await surprised.store.startPursuit({ preyIds: ['orc'], pursuerIds: ['gunther'], visibleToAnyEnemy: true });
  assert.equal(surprised.store.getPursuit().status, 'active');
  assert.equal(surprised.store.getPursuit().outcome, null);
  assert.equal(surprised.store.getPursuit().movement.gunther, 0);
  assert.match(logTexts(surprised.store)[0], /gunther.*Mouvement nul/);
  // Fuyards { gunther: inconnu, aldric: 8 } contre { orc: 4 } : rendait « échappé ».
  const { store, engine } = await fixture({ gunther: noMove, aldric: { caracs: { ...noMove.caracs, M: 8 } } });
  await store.startPursuit({ preyIds: ['gunther', 'aldric'], pursuerIds: ['orc'], visibleToAnyEnemy: true });
  const pursuit = store.getPursuit();
  assert.equal(pursuit.status, 'active');
  assert.equal(pursuit.movement.gunther, null);
  assert.equal(pursuit.pair, null, 'pas de paire automatique');
  assert.match(logTexts(store)[0], /gunther.*Mouvement inconnu/);
  const waiting = store.previewPursuitTest({ participantId: 'gunther', skill: 'Athlétisme', roll: 25 });
  assert.equal(waiting.ready, false);
  assert.match(waiting.error, /Mouvement/);
  await store.setPursuitMovement('gunther', 4);
  assert.deepEqual(store.getPursuit().pair, { pursuerId: 'orc', preyId: 'gunther', forced: false });
  assert.equal(store.getPursuit().status, 'active');
  await engine.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'aldric');
});

test('facteur « Mouvement » : recalculé quand le MJ corrige un Mouvement, sauf s’il a touché la case (D13)', async () => {
  const { store, engine } = await fixture();
  await store.startPursuit(chase);
  await testOf(store, 'gunther', 25);
  await engine.nextTurn(); await engine.nextTurn();
  await testOf(store, 'orc', 45);
  assert.equal(store.getPursuit().factors.speed, false);
  await store.setPursuitMovement('orc', 3);
  assert.equal(store.getPursuit().factors.speed, true, 'case déduite recalculée');
  await store.setPursuitMovement('orc', 4);
  assert.equal(store.getPursuit().factors.speed, false);
  await store.setPursuitFactors({ speed: true });
  await store.setPursuitMovement('orc', 4.5);
  assert.equal(store.getPursuit().factors.speed, true, 'case du MJ conservée');
});

test('hors combat : après ↶ de la validation, les boutons de fin sont refusés ; ↷ les rend', async () => {
  const { store } = await fixture();
  const plan = store.previewScenePursuit({ preyIds: ['orc'], pursuerIds: ['gunther', 'aldric'],
    tests: { pursuer: { skill: 'Athlétisme', roll: 95 }, prey: { skill: 'Athlétisme', roll: 5 } } });
  await store.applyScenePursuit(plan);
  await store.undo();
  await refused(() => store.applyPursuitEnd('remove', { scenePlan: plan }), /annulée|non validée/);
  assert.ok(store.listParticipants().some(row => row.id === 'orc'));
  await store.redo();
  await store.applyPursuitEnd('remove', { scenePlan: plan });
  assert.ok(!store.listParticipants().some(row => row.id === 'orc'));
});

test('scène mise en pause : la poursuite est rangée avec elle, rendue à la reprise, sans gêner une autre rencontre (D24)', async () => {
  const { store } = await fixture();
  const data = JSON.parse(store.getFullJSON());
  data.activeScene = { id: 'scene-1', encounterId: 'enc-1', status: 'active', round: 1, currentActorId: 'gunther', order: ['gunther', 'aldric', 'orc'],
    participants: structuredClone(data.combat.participants), extensions: { v5: { turnIndex: 1 } } };
  data.encounters = [{ id: 'enc-1', status: 'active' }];
  data.suspendedScenes = [];
  await store.loadFromJSON(data);
  await store.startPursuit(chase);
  const before = store.getPursuit();
  await store.suspendActiveScene();
  assert.equal(store.getPursuit(), null, 'rangée avec la scène');
  assert.deepEqual(JSON.parse(store.getFullJSON()).suspendedScenes[0].extensions.v5.pursuit, before);
  await store.resumeScene('scene-1');
  assert.deepEqual(store.getPursuit(), before, 'rendue à la reprise');
  assert.equal(JSON.parse(store.getFullJSON()).activeScene.extensions?.v5?.pursuit, undefined, 'une seule copie, dans l’enveloppe');
});

test('participant retiré en cours de poursuite : il sort du compte de son camp ; camp vide : poursuite abandonnée sans issue', async () => {
  const { store, engine } = await fixture();
  await store.startPursuit(chase);
  await testOf(store, 'gunther', 25);
  await engine.nextTurn(); await engine.nextTurn();
  await testOf(store, 'orc', 45);
  await engine.nextTurn();
  await store.setPursuitObstacle('gunther', { d10: 6 });
  await obstacleOf(store, 'gunther', 80);
  assert.equal(store.getPursuit().outcome, null, 'aldric doit encore franchir le sien');
  await store.removeParticipant('aldric');
  const pursuit = store.getPursuit();
  assert.deepEqual(pursuit.pursuerIds, ['gunther']);
  assert.ok(logTexts(store).some(text => /aldric.*retiré.*poursuite|poursuite.*aldric/i.test(text)));
  assert.equal(pursuit.status, 'ended', 'le seul poursuivant restant a échoué : l’issue tombe');
  assert.equal(pursuit.outcome.kind, 'escaped');
  const empty = await fixture();
  await empty.store.startPursuit(chase);
  await empty.store.removeParticipant('orc');
  assert.equal(empty.store.getPursuit(), null);
  assert.ok(logTexts(empty.store).some(text => /Poursuite abandonnée sans issue/.test(text)));
  const bench = await fixture();
  await bench.store.startPursuit(chase);
  await bench.store.moveParticipant('aldric', 'bench');
  assert.deepEqual(bench.store.getPursuit().pursuerIds, ['gunther'], 'mis au banc : sorti de la poursuite');
});

test('entrée de l’écran Jouer : seuls les participants actifs comptent (D17)', async () => {
  const { store } = await fixture({ aldric: { zone: 'bench' }, orc: { zone: 'bench' } });
  assert.equal(store.scenePursuitAvailability().available, false);
});

const broken = { states: [{ id: 'b1', key: 'brise', name: 'Brisé', level: 1 }] };
const turnBlocked = (result, code) => { assert.equal(result.ready, false); assert.equal(result.code, code); };

test('fuyard Brisé : son Test de poursuite ou d’Obstacle du Tour vaut pour la fuite, le Tour se termine (D20)', async () => {
  const { store, engine } = await fixture({ orc: broken });
  await store.startPursuit(chase);
  await testOf(store, 'gunther', 25);
  await engine.nextTurn(); await engine.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'orc');
  await testOf(store, 'orc', 45);
  const ended = await engine.nextTurn();
  assert.equal(ended.status, 'applied', ended.error);
  assert.equal(store.getCombat().round, 2);
  // Fuyards PJ : Test de poursuite au Round 1, Test d'Obstacle au Round 2.
  const prey = await fixture({ gunther: broken });
  await prey.store.startPursuit({ preyIds: ['gunther', 'aldric'], pursuerIds: ['orc'], visibleToAnyEnemy: true });
  await testOf(prey.store, 'gunther', 45);
  assert.equal((await prey.engine.nextTurn()).status, 'applied');
  await prey.engine.nextTurn();
  await testOf(prey.store, 'orc', 25);
  await prey.engine.nextTurn();
  await prey.store.setPursuitObstacle('gunther', { d10: 6 });
  await obstacleOf(prey.store, 'gunther', 25, { context: { runningOrHiding: true } });
  assert.equal((await prey.engine.nextTurn()).status, 'applied');
  // Même garde par la commande du Store.
  const direct = await fixture({ gunther: broken });
  await direct.store.startPursuit({ preyIds: ['gunther'], pursuerIds: ['orc'], visibleToAnyEnemy: true });
  await testOf(direct.store, 'gunther', 45);
  await direct.store.nextTurn();
  assert.equal(direct.store.getCombat().currentActorId, 'aldric');
});

test('fuyard Brisé d’une poursuite en cours : son Tour se termine librement, Test fait ou non ; abandonnée, l’obligation revient (D21)', async () => {
  const late = await fixture({ orc: broken });
  await late.store.startPursuit(chase);
  await testOf(late.store, 'gunther', 25);
  await late.engine.nextTurn(); await late.engine.nextTurn();
  assert.equal(late.store.getCombat().currentActorId, 'orc');
  assert.equal((await late.engine.nextTurn()).status, 'applied', 'Round 1, sans Test joué');
  await late.engine.nextTurn(); await late.engine.nextTurn();
  assert.equal(late.store.getCombat().currentActorId, 'orc');
  assert.equal(late.store.getCombat().round, 2);
  await late.store.nextTurn();
  assert.equal(late.store.getCombat().round, 3, 'Round 2, aucun Test à jouer : la commande du Store laisse aussi finir le Tour');
  const dropped = await fixture({ orc: broken });
  await dropped.store.startPursuit(chase);
  await dropped.store.endPursuit({ reason: 'gm' });
  await dropped.engine.nextTurn(); await dropped.engine.nextTurn();
  turnBlocked(await dropped.engine.nextTurn(), 'BROKEN_ESCAPE_REQUIRED');
  assert.throws(() => dropped.store.nextTurn(), /Brisé/);
  const pursuer = await fixture({ gunther: broken });
  await pursuer.store.startPursuit(chase);
  await testOf(pursuer.store, 'gunther', 25);
  turnBlocked(await pursuer.engine.nextTurn(), 'DIV-BROKEN-MIDTURN-01');
  assert.throws(() => pursuer.store.nextTurn(), /DIV-BROKEN-MIDTURN-01/);
  const none = await fixture({ gunther: broken });
  turnBlocked(await none.engine.nextTurn(), 'BROKEN_ESCAPE_REQUIRED');
});

test('D20/D21 : le Test d’un autre participant ne libère pas le Brisé ; son propre Test qui termine la poursuite, si', () => {
  const state = (status, participantId) => ({ extensions: { v5: { pursuit: { status, preyIds: ['gunther', 'aldric'], pursuerIds: ['orc'],
    opposed: { pursuer: null, prey: { participantId, turnId: 't1' } }, obstacles: [] } } } });
  assert.equal(pursuitFreesBrokenPrey(state('ended', 'aldric'), 'gunther', 't1'), false, 'Test d’un autre fuyard, poursuite terminée');
  assert.equal(pursuitFreesBrokenPrey(state('ended', 'gunther'), 'gunther', 't1'), true, 'son Test vient de terminer la poursuite');
  assert.equal(pursuitFreesBrokenPrey(state('ended', 'gunther'), 'gunther', 't2'), false, 'Test d’un Tour précédent');
  assert.equal(pursuitFreesBrokenPrey(state('active', 'aldric'), 'gunther', 't1'), true, 'fuyard d’une poursuite en cours');
  assert.equal(pursuitFreesBrokenPrey(state('active', 'gunther'), 'orc', 't1'), false, 'le poursuivant reste tenu');
});

test('rencontre terminée ou recommencée : la poursuite en cours est abandonnée sans issue, avec une ligne au journal (D18)', async () => {
  const ending = await fixture();
  await ending.store.startPursuit(chase);
  await ending.store.endEncounter();
  assert.equal(ending.store.getPursuit(), null);
  assert.ok(logTexts(ending.store).some(text => /Poursuite abandonnée sans issue/.test(text)));
  const restart = await fixture();
  await restart.store.startPursuit(chase);
  await restart.store.restartCombat();
  assert.equal(restart.store.getPursuit(), null);
  assert.ok(logTexts(restart.store).some(text => /Poursuite abandonnée sans issue/.test(text)));
  const initiative = await fixture();
  await initiative.store.startPursuit(chase);
  const staging = initiative.store.previewCombatRestart();
  const ready = initiative.store.previewCombatInitialization({ staging, diceById: { gunther: 5, aldric: 3, orc: 1 } });
  const applied = await initiative.store.applyCombatInitialization({ ...ready, staging });
  assert.equal(applied.status, 'applied', JSON.stringify(applied));
  assert.equal(initiative.store.getPursuit(), null);
  assert.ok(logTexts(initiative.store).some(text => /Poursuite abandonnée sans issue/.test(text)));
});
