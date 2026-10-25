import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { effectiveOrder, nextTurn as nextOrderTurn } from '../js/core/turn-order.js';
import { createGameClock } from '../js/core/v5-game-time.js';

const clone = value => structuredClone(value);

function memoryPersistence() {
  let saved = null;
  return {
    async load() { return saved && clone(saved); },
    async saveAtomic({ state }) { saved = clone(state); return { ok: true }; },
    read() { return saved && clone(saved); }
  };
}

function actor(id, initiative, extra = {}) {
  return {
    id, name: id, kind: 'PNJ', camp: id === 'pj' ? 'pj' : 'ennemi', zone: 'active',
    initiative, hp: 12, maxHp: 12, states: [], equipment: [], caracs: { I: initiative },
    extensions: { v5: {} }, ...extra
  };
}

function baseState({ participants = [], order, round = 1, currentActorId = null, reserve = [], encounters = [], activeScene = null, suspendedScenes = [] } = {}) {
  const active = participants.filter(row => row.zone === 'active');
  const scene = activeScene && clone(activeScene);
  const snapshot = {
    schemaVersion: 3, reserve: clone(reserve), encounters: clone(encounters), suspendedScenes: clone(suspendedScenes),
    activeScene: scene,
    combat: {
      round, currentActorId,
      order: order ? [...order] : active.map(row => row.id),
      orderMode: 'automatic', participants: clone(participants)
    },
    log: [], diceLines: [], persistentCharacters: [],
    extensions: { v5: { turnIndex: 1 } }
  };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  return snapshot;
}

async function fixture(snapshot) {
  const persistence = memoryPersistence();
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON(snapshot);
  return { store, persistence, engine: createCombatEngine(store) };
}

const stateOf = store => JSON.parse(store.getFullJSON());

test('F2-A characterization — l’ordre legacy automatique exclut le banc, le mode manuel garde la piste et le Tour courant', async () => {
  const { store } = await fixture(baseState({
    participants: [actor('slow', 20), actor('fast', 50), actor('bench', 99, { zone: 'bench' })],
    order: ['fast', 'slow', 'bench'], currentActorId: 'slow'
  }));

  assert.deepEqual(store.getEffectiveOrder(), ['fast', 'slow']);
  assert.equal((await store.setOrderMode('manual')).ok, true);
  assert.deepEqual(store.getEffectiveOrder(), ['fast', 'slow']);
  assert.equal((await store.moveInOrder('slow', 'fast')).ok, true);
  assert.deepEqual(store.getEffectiveOrder(), ['slow', 'fast']);
  assert.equal(store.getCombat().currentActorId, 'slow', 'réordonner ne consomme pas et ne change pas le Tour courant');

  await store.nextTurn();
  assert.deepEqual([store.getCombat().round, store.getCombat().currentActorId], [1, 'fast']);
  await store.nextTurn();
  assert.deepEqual([store.getCombat().round, store.getCombat().currentActorId], [2, 'slow']);
  assert.deepEqual(store.getCombat().order, ['slow', 'fast']);
});

test('F2-A characterization — lancement, démarrage, reprise et recommencement conservent I historique et le flux legacy', async () => {
  const profiles = [
    { id: 'hero-profile', name: 'PJ', kind: 'PJ', initiative: 40, hp: 12, maxHp: 12, caracs: { I: 40 } },
    { id: 'foe-profile', name: 'Garde', kind: 'PNJ', initiative: 35, hp: 10, maxHp: 10, caracs: { I: 35 } }
  ];
  const encounter = { id: 'enc', title: 'Rencontre', status: 'prepared', entries: [
    { id: 'hero-entry', profileId: 'hero-profile', quantity: 1, camp: 'pj', zone: 'active' },
    { id: 'foe-entry', profileId: 'foe-profile', quantity: 1, camp: 'ennemi', zone: 'active' }
  ] };
  const { store, engine } = await fixture(baseState({ reserve: profiles, encounters: [encounter], participants: [] }));

  await store.launchEncounter('enc');
  const initial = stateOf(store);
  assert.equal(initial.activeScene.status, 'active');
  assert.deepEqual(initial.combat.order, initial.activeScene.order);
  assert.deepEqual(initial.combat.participants.map(row => row.initiative).sort((a, b) => a - b), [35, 40]);
  assert.ok(initial.combat.participants.every(row => row.extensions?.v5?.combatInitiative === undefined), 'le champ initiative historique reste I, pas un jet déjà lancé');

  await engine.start();
  const started = store.getCombat();
  assert.equal(started.round, 1);
  assert.equal(started.currentActorId, initial.combat.order[0]);
  await store.suspendActiveScene();
  const suspended = store.listSuspendedScenes()[0];
  const suspendedOrder = [...suspended.order];
  const suspendedInitiatives = suspended.participants.map(row => [row.id, row.initiative]);
  await store.resumeScene(suspended.id);
  assert.deepEqual(store.getCombat().order, suspendedOrder);
  assert.deepEqual(store.listParticipants().map(row => [row.id, row.initiative]), suspendedInitiatives);

  await store.moveInOrder(suspendedOrder[1], suspendedOrder[0]);
  assert.equal(store.getEffectiveOrder()[0], suspendedOrder[1]);
  await store.restartCombat();
  const restarted = stateOf(store);
  assert.equal(restarted.combat.round, 0);
  assert.equal(restarted.combat.currentActorId, null);
  const initialOrderByProfile = initial.combat.order.map(id => initial.combat.participants.find(row => row.id === id).profileId);
  const restartedOrderByProfile = restarted.combat.order.map(id => restarted.combat.participants.find(row => row.id === id).profileId);
  assert.deepEqual(restartedOrderByProfile, initialOrderByProfile, 'restart revient à l’ordre legacy de la rencontre');
  assert.deepEqual(restarted.combat.participants.map(row => [row.profileId, row.initiative]).sort(), [
    ['foe-profile', 35], ['hero-profile', 40]
  ]);
});

test('F2-A characterization — un renfort actif suit l’insertion legacy après l’acteur courant sans le remplacer', async () => {
  const participants = [actor('first', 40), actor('current', 30), actor('last', 20)];
  const { store } = await fixture(baseState({ participants, order: ['first', 'current', 'last'], currentActorId: 'current' }));
  await store.addParticipant(actor('reinforcement', 50));
  assert.equal(store.getCombat().currentActorId, 'current');
  await store.insertReinforcement('reinforcement');
  assert.deepEqual(store.getCombat().order, ['first', 'current', 'reinforcement', 'last']);
  assert.equal(store.getCombat().currentActorId, 'current');

  await store.nextTurn();
  assert.deepEqual([store.getCombat().round, store.getCombat().currentActorId], [1, 'reinforcement']);
  await store.nextTurn();
  assert.deepEqual([store.getCombat().round, store.getCombat().currentActorId], [1, 'last']);
  await store.nextTurn();
  assert.deepEqual([store.getCombat().round, store.getCombat().currentActorId], [2, 'first']);
});

test('F2-A characterization — l’ordre manuel est sauvegardé, annulable et restauré au reload', async () => {
  const { store, persistence } = await fixture(baseState({
    participants: [actor('a', 40), actor('b', 30)], order: ['a', 'b'], currentActorId: 'b'
  }));
  const before = stateOf(store);
  await store.moveInOrder('b', 'a');
  const after = stateOf(store);
  assert.deepEqual(after.combat.order, ['b', 'a']);
  assert.equal(after.combat.currentActorId, 'b');

  const reloaded = createStore({ persistence, storage: null });
  await reloaded.ready;
  assert.deepEqual(reloaded.getCombat().order, after.combat.order);
  assert.equal(reloaded.getCombat().currentActorId, 'b');
  assert.equal(await reloaded.undo(), true);
  assert.deepEqual(reloaded.getCombat().order, before.combat.order);
  assert.equal(await reloaded.redo(), true);
  assert.deepEqual(reloaded.getCombat().order, ['b', 'a']);
  assert.equal(reloaded.getCombat().currentActorId, 'b');
  assert.deepEqual(before.combat.order, ['a', 'b']);
});

test('F2-A characterization — démarrer ne double pas le Tour d’une invocation liée ni son quota déjà enregistré', async () => {
  const master = actor('master', 50, { extensions: { v5: {
    divineEffects: [{ id: 'layer-1', executionId: 'exec-1', type: 'summon-creature', summon: { kind: 'creature', profileKey: 'wolf' } }]
  } } });
  const summon = actor('summon', 35, { extensions: { v5: {
    divineSummon: { executionId: 'exec-1', ownerId: 'master', layerId: 'layer-1', kind: 'creature', profileKey: 'wolf' }
  } } });
  const foe = actor('foe', 30);
  const snapshot = baseState({ participants: [master, summon, foe], order: ['master', 'summon', 'foe'], round: 0, currentActorId: null });
  snapshot.extensions.v5.actionLedger = { quotaUsage: [{ actorId: 'master', quotaId: 'prayer:turn', scope: 'turn', scopeKey: 'linked-invocation-turn', used: 1 }] };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  const { store, engine } = await fixture(snapshot);

  await engine.start();
  assert.deepEqual(store.getCombat().order, ['master', 'summon', 'foe']);
  assert.equal(store.getCombat().order.filter(id => id === 'summon').length, 1);
  assert.equal(store.getCombat().currentActorId, 'master');
  assert.deepEqual(stateOf(store).extensions.v5.actionLedger.quotaUsage, snapshot.extensions.v5.actionLedger.quotaUsage);
});

test('F2-A characterization — Souffle froid garde I au Round acquis puis place son Exténué en dernier au Round suivant', async () => {
  const participants = [
    actor('cold', 90, { states: [{ key: 'fatigued', source: { coldBreath: true }, v5Timing: { acquiredRound: 1 } }] }),
    actor('middle', 60),
    actor('last', 40)
  ];
  const roundOneOrder = effectiveOrder(participants, { round: 1 });
  assert.deepEqual(roundOneOrder, ['cold', 'middle', 'last']);
  const transition = nextOrderTurn({ participants, order: roundOneOrder, currentActorId: 'last', round: 1 });
  assert.equal(transition.round, 2, 'la transition n’intervient qu’après le dernier acteur');
  const roundTwoOrder = effectiveOrder(participants, { round: transition.round });
  assert.deepEqual(roundTwoOrder, ['middle', 'last', 'cold']);

  const { store } = await fixture(baseState({ participants, order: ['cold', 'middle', 'last'], round: 1, currentActorId: 'last' }));
  assert.deepEqual(store.getEffectiveOrder(), ['cold', 'middle', 'last']);
  await store.setRoundTurn(2, 'middle');
  assert.deepEqual(store.getEffectiveOrder(), ['middle', 'last', 'cold']);
});
