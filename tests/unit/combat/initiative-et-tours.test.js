import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as TurnOrder from '../../../js/core/turn-order.js';
import { ORDER_MODES, effectiveOrder, insertReinforcement, moveInOrder, nextTurn, removeFromCombat, setOrderMode, nextTurn as nextOrderTurn, setOrderMode as pureSetOrderMode } from '../../../js/core/turn-order.js';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { v5StoreActionClock } from '../../../js/core/v5-store-action.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';
import { applyWeaponSkillRules, weaponHandsForParticipant } from '../../../js/core/equipment.js';
import { wrathActionSpent } from '../../../js/core/v5-divine-prayer-caps.js';
import { previewV5Turn } from '../../../js/core/v5-turn.js';
import { createV5TimedEffect } from '../../../js/core/v5-effects.js';
import { createHistory, recordCommand, MAX_HISTORY_COMMANDS, DEFAULT_HISTORY_MAX_BYTES } from '../../../js/core/history.js';
import { previewV5BrokenEscape, previewV5FleeTalentDisengageMove, resolveV5PursuitStep } from '../../../js/core/v5-broken-escape.js';

describe('Ordre des tours E08', () => {
const participants = [
  { id: 'a', name: 'A', initiative: 30, zone: 'active' },
  { id: 'b', name: 'B', initiative: 50, zone: 'active' },
  { id: 'bench', name: 'Bench', initiative: 99, zone: 'bench' }
];

test('E08 ordre — tri automatique exclut le banc et tranche les égalités', () => {
  assert.deepEqual(effectiveOrder(participants), ['b', 'a']);
  assert.deepEqual(effectiveOrder([
    { id: 'z', name: 'Z', initiative: 20, zone: 'active' },
    { id: 'a', name: 'A', initiative: 20, zone: 'active' }
  ]), ['a', 'z']);
});

test('E08 ordre — déplacement manuel devient l’ordre effectif sans fin de tour', () => {
  const moved = moveInOrder(['b', 'a'], 'a', 'b');
  assert.deepEqual(moved, ['a', 'b']);
  assert.deepEqual(effectiveOrder(participants, { mode: ORDER_MODES.MANUAL, order: moved }), moved);
  const mode = setOrderMode(participants, { mode: ORDER_MODES.MANUAL, order: moved, currentActorId: 'b' });
  assert.deepEqual(mode.order, moved);
  assert.equal(mode.currentActorId, 'b');
});

test('F2-E — agir en dernier réordonne le prochain Round, même en mode manuel', () => {
  const participants=[
    {id:'fast',name:'Rapide',initiative:50,zone:'active'},
    {id:'slow',name:'Lent',initiative:80,zone:'active',extensions:{v5:{combatEffects:[{id:'late',kind:'acts-last-next-round',round:2}]}}}
  ];
  assert.deepEqual(effectiveOrder(participants,{round:1}),['slow','fast']);
  assert.deepEqual(effectiveOrder(participants,{round:2}),['fast','slow']);
  assert.deepEqual(effectiveOrder(participants,{mode:ORDER_MODES.MANUAL,order:['slow','fast'],round:2}),['fast','slow']);
  assert.deepEqual(effectiveOrder(participants,{round:3}),['slow','fast']);
});

test('E08 ordre — renfort inséré après l’acteur courant', () => {
  assert.deepEqual(insertReinforcement(['a', 'b'], 'reinforcement', 'a'), ['a', 'reinforcement', 'b']);
  assert.deepEqual(insertReinforcement(['a', 'b'], 'reinforcement', 'missing'), ['a', 'b', 'reinforcement']);
});

test('E08 tours — boucle et round sont déterministes, sans effet périodique implicite', () => {
  const first = nextTurn({ participants, order: ['b', 'a'], currentActorId: 'b', round: 1 });
  assert.deepEqual(first, { order: ['b', 'a'], currentActorId: 'a', round: 1 });
  const wrapped = nextTurn({ participants, order: ['b', 'a'], currentActorId: 'a', round: 1 });
  assert.deepEqual(wrapped, { order: ['b', 'a'], currentActorId: 'b', round: 2 });
  const solo = nextTurn({ participants: [participants[0]], order: ['a'], currentActorId: 'a', round: 2 });
  assert.equal(solo.round, 3);
});

test('E08 tours — retrait de l’acteur sélectionne le prochain survivant avant retrait', () => {
  const result = removeFromCombat({
    participants, order: ['b', 'a'], currentActorId: 'b', participantId: 'b'
  });
  assert.deepEqual(result, { order: ['a'], currentActorId: 'a' });
  const nonCurrent = removeFromCombat({
    participants, order: ['b', 'a'], currentActorId: 'b', participantId: 'a'
  });
  assert.deepEqual(nonCurrent, { order: ['b'], currentActorId: 'b' });
  assert.deepEqual(removeFromCombat({ participants: [], order: [], currentActorId: 'x', participantId: 'x' }), {
    order: [], currentActorId: null
  });
});
});

describe('Initiative caractérisation', () => {
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
});

describe('Initiative et surprise', () => {
const clone = value => structuredClone(value);
function memoryPersistence() {
  let saved = null;
  return {
    async load() { return saved && clone(saved); },
    async saveAtomic({ state }) { saved = clone(state); return { ok: true }; },
    read() { return saved && clone(saved); }
  };
}
const person = (id, { kind = 'PNJ', I = 40, initiative = I, camp = kind === 'PJ' ? 'pj' : 'ennemi', zone = 'active' } = {}) => ({
  id, name: id, kind, camp, zone, initiative, hp: 10, maxHp: 10, states: [],
  caracs: I === undefined ? {} : { I }, extensions: { v5: {} }
});
const buildPlan = (participants, input) => {
  assert.equal(typeof TurnOrder.prepareCombatInitiative, 'function', 'le service pur de préparation doit exister');
  return TurnOrder.prepareCombatInitiative(participants, input);
};
const baseState = participants => ({
  schemaVersion: 3, reserve: [],
  combat: { round: 0, currentActorId: null, order: participants.filter(row => row.zone === 'active').map(row => row.id), orderMode: 'automatic', participants: clone(participants) },
  activeScene: null, encounters: [], suspendedScenes: [], persistentCharacters: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } }
});

async function fixture(participants) {
  const persistence = memoryPersistence();
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON(baseState(participants));
  return { store, persistence };
}

test('F2-A — trois PNJ et deux PJ : d10 + BI une seule fois, I conservée et score de combat distinct', () => {
  const participants = [
    person('npc-1', { I: 40, initiative: 40 }), person('npc-2', { I: 35, initiative: 35 }), person('npc-3', { I: 30, initiative: 30 }),
    person('pj-1', { kind: 'PJ', I: 42, initiative: 42 }), person('pj-2', { kind: 'PJ', I: 38, initiative: 38 })
  ];
  const plan = buildPlan(participants, { diceById: { 'npc-1': 1, 'npc-2': 10, 'npc-3': 4, 'pj-1': 10, 'pj-2': 1 } });
  assert.equal(plan.ready, true);
  assert.deepEqual(plan.participants.map(row => [row.id, row.extensions.v5.combatInitiative.die, row.extensions.v5.combatInitiative.characteristic, row.extensions.v5.combatInitiative.bonus, row.extensions.v5.combatInitiative.score]), [
    ['npc-1', 1, 40, 4, 5], ['npc-2', 10, 35, 3, 13], ['npc-3', 4, 30, 3, 7], ['pj-1', 10, 42, 4, 14], ['pj-2', 1, 38, 3, 4]
  ]);
  assert.deepEqual(plan.order, ['pj-1', 'npc-2', 'npc-3', 'npc-1', 'pj-2']);
  assert.deepEqual(participants.map(row => row.initiative), [40, 35, 30, 42, 38], 'ne jamais remplacer I historique par le d10 ou le score');
});

test('F2-A — effectiveOrder utilise le score initialisé 13 avant 5, pas I historique 40 avant 30', () => {
  const participants = [
    person('historique-40', { I: 40, initiative: 40 }),
    person('historique-30', { I: 30, initiative: 30 })
  ];
  participants[0].extensions.v5.combatInitiative = { die: 1, score: 5, characteristic: 40, initialized: true };
  participants[1].extensions.v5.combatInitiative = { die: 10, score: 13, characteristic: 30, initialized: true };
  assert.deepEqual(effectiveOrder(participants), ['historique-30', 'historique-40']);
});

test('F2-A — le mode manuel reste sous contrôle MJ même si un état imposerait normalement la dernière place', () => {
  const cold = person('cold', { I: 90 });
  cold.extensions.v5.combatInitiative = { die: 10, score: 19, characteristic: 90, initialized: true, orderIndex: 0 };
  cold.states = [{ key: 'fatigued', source: { coldBreath: true }, v5Timing: { acquiredRound: 1 } }];
  const other = person('other', { I: 40 });
  other.extensions.v5.combatInitiative = { die: 5, score: 9, characteristic: 40, initialized: true, orderIndex: 1 };
  assert.deepEqual(effectiveOrder([cold, other], { mode: 'manual', order: ['cold', 'other'], round: 2 }), ['cold', 'other']);
});

test('F2-A — d10 1 et 10 acceptés ; dé PJ, I absente ou acteur sans score requis bloquent sans zéro implicite', () => {
  const npc = person('npc');
  assert.equal(buildPlan([npc], { diceById: { npc: 1 } }).ready, true);
  assert.equal(buildPlan([npc], { diceById: { npc: 10 } }).ready, true);

  const pj = person('pj', { kind: 'PJ', I: 40 });
  const missingDie = buildPlan([pj], { diceById: {} });
  assert.equal(missingDie.ready, false);
  assert.ok(missingDie.needsInput.some(row => row.participantId === 'pj' && row.field === 'die'));

  const unknownI = { ...person('unknown', { initiative: 0 }), caracs: {} };
  const missingCharacteristic = buildPlan([unknownI], { diceById: { unknown: 5 } });
  assert.equal(missingCharacteristic.ready, false);
  assert.ok(missingCharacteristic.needsInput.some(row => row.participantId === 'unknown' && row.field === 'characteristic'));
});

test('F2-A — le Store refuse d’initialiser ou démarrer sans combattant actif', async () => {
  const {store}=await fixture([person('bench-only',{zone:'bench'})]);
  const revision=store.getLocalRevision(),preview=store.previewCombatInitialization({startCombat:true});
  assert.equal(preview.ready,false);
  assert.ok(preview.needsInput.some(row=>row.field==='activeCombatants'));
  const result=await store.applyCombatInitialization(preview);
  assert.equal(result.status,'requires-input');
  assert.equal(store.getLocalRevision(),revision);
  assert.equal(store.getCombat().round,0);
});

test('F2-A — après normalisation Store, I historique normalisée à zéro sans caracs.I demande encore une saisie', async () => {
  const unknown = { ...person('unknown', { initiative: 0 }), caracs: {} };
  const { store } = await fixture([unknown]);
  const normalized = store.listParticipants().find(row => row.id === 'unknown');
  assert.equal(normalized.initiative, 0);
  assert.equal(normalized.caracs.I, undefined);
  const preview = store.previewCombatInitialization({ diceById: { unknown: 5 } });
  assert.equal(preview.ready, false);
  assert.ok(preview.needsInput.some(row => row.participantId === 'unknown' && row.field === 'characteristic'));
});

test('F2-A — une préparation legacy ne fait jamais relire son score comme I si caracs.I a disparu', () => {
  const reflex = person('reflex', { I: 43, initiative: 6 });
  reflex.caracs = {};
  reflex.talents = [{ id: 'talent-combat-reflexes', status: 'resolved', rank: 1 }];
  reflex.extensions.v5.combatReflexesPreparation = {
    version: 1, participantId: 'reflex', originalInitiative: 43, characteristic: 43, dice: [9, 2], choice: 'second', selectedDie: 2,
    provenance: { kind: 'legacy-talent-activation', resolutionId: 'legacy-reflex' }
  };
  const preview = buildPlan([reflex], {});
  assert.equal(preview.ready, false);
  assert.ok(preview.needsInput.some(row => row.participantId === 'reflex' && row.field === 'characteristic'));
});

test('F2-A — une paire legacy périmée demande de nouveaux dés mais sa provenance restaure I brute', async () => {
  const reflex = person('reflex', { kind: 'PJ', I: 43, initiative: 43 });
  reflex.talents = [{ id: 'talent-combat-reflexes', status: 'resolved', rank: 1 }];
  const { store } = await fixture([reflex]);
  const activation = {
    resolutionId: 'legacy-reflex-stale-pair', actorId: 'reflex', action: { type: 'skill', base: 0 }, roll: '',
    v5: { kind: 'test', context: { talentAction: 'combat-reflexes', beginningOfCombat: true, initiativeFirst: 9, initiativeSecond: 2, initiativeChoice: 'second' } }
  };
  assert.equal((await store.applyResolution(store.previewResolution(activation))).status, 'applied');
  await store.updateParticipant('reflex', { caracs: { ...store.listParticipants()[0].caracs, I: 50 } });
  assert.equal(store.listParticipants()[0].initiative, 6, 'la valeur legacy reste inchangée avant A');
  const needsFreshDice = store.previewCombatInitialization({});
  assert.equal(needsFreshDice.ready, false);
  assert.ok(needsFreshDice.needsInput.some(row => row.participantId === 'reflex' && row.field === 'combatReflexesDice'));
  const current = store.previewCombatInitialization({ combatReflexesById: { reflex: { dice: [9, 2], choice: 'second' } } });
  assert.equal(current.ready, true, JSON.stringify(current.needsInput));
  assert.equal(current.participants[0].extensions.v5.combatInitiative.characteristic, 50);
  assert.equal(current.participants[0].extensions.v5.combatInitiative.score, 7);
  assert.equal(current.participants[0].initiative, 43, 'la provenance valide restaure I malgré la paire périmée');
});

test('F2-A — score égal puis I départage ; même score et même I exige un tournoi opposé explicite', () => {
  const participants = [person('lower-I', { I: 34 }), person('higher-I', { I: 39 })];
  const byCharacteristic = buildPlan(participants, { diceById: { 'lower-I': 6, 'higher-I': 6 } });
  assert.equal(byCharacteristic.ready, true);
  assert.deepEqual(byCharacteristic.order, ['higher-I', 'lower-I']);
  assert.deepEqual(byCharacteristic.oppositions, []);

  const tied = [person('first'), person('second')];
  const unresolved = buildPlan(tied, { diceById: { first: 4, second: 4 } });
  assert.equal(unresolved.ready, false);
  assert.ok(unresolved.tieGroups.some(group => group.participantIds.length === 2));
  assert.ok(unresolved.needsInput.some(row => row.field === 'tieOrder'));
});

test('F2-A — Combat instinctif garde les deux d10, laisse choisir le second, ajoute BI une fois et conserve I', () => {
  const reflex = person('reflex', { kind: 'PJ', I: 43 });
  reflex.talents = [{ id: 'talent-combat-reflexes', status: 'resolved', rank: 1 }];
  const plan = buildPlan([reflex], {
    combatReflexesById: { reflex: { dice: [9, 2], choice: 'second' } }
  });
  assert.equal(plan.ready, true, JSON.stringify(plan.needsInput));
  const row = plan.participants[0];
  assert.equal(row.initiative, 43);
  assert.deepEqual(row.extensions.v5.combatInitiative, {
    die: 2, characteristic: 43, characteristicSource: 'caracs.I', bonus: 4, score: 6,
    initialized: true, talentId: 'talent-combat-reflexes', dice: [9, 2], choice: 'second', orderIndex: 0
  });
});

test('F2-A — Combat instinctif exige une paire et un choix explicite; sans Talent reste un seul d10', () => {
  const reflex = person('reflex', { kind: 'PJ', I: 43 });
  reflex.talents = [{ id: 'talent-combat-reflexes', status: 'resolved', rank: 1 }];
  const missing = buildPlan([reflex], { diceById: { reflex: 2 } });
  assert.equal(missing.ready, false);
  assert.ok(missing.needsInput.some(row => row.participantId === 'reflex' && row.field === 'combatReflexesDice'));
  const noTalent = buildPlan([person('plain', { I: 43 })], { diceById: { plain: 2 } });
  assert.equal(noTalent.ready, true);
  assert.equal(noTalent.participants[0].extensions.v5.combatInitiative.die, 2);
  assert.equal(noTalent.participants[0].extensions.v5.combatInitiative.dice, undefined);
});

test('F2-A — activation legacy préalable garde I brute, suit la caractéristique courante puis consomme sa paire', async () => {
  const reflex = person('reflex', { kind: 'PJ', I: 43, initiative: 43 });
  reflex.talents = [{ id: 'talent-combat-reflexes', status: 'resolved', rank: 1 }];
  const { store, persistence } = await fixture([reflex]);
  const legacy = {
    resolutionId: 'legacy-reflex', actorId: 'reflex', action: { type: 'skill', base: 0 }, roll: '',
    v5: { kind: 'test', context: { talentAction: 'combat-reflexes', beginningOfCombat: true, initiativeFirst: 9, initiativeSecond: 2, initiativeChoice: 'second' } }
  };
  assert.equal((await store.applyResolution(store.previewResolution(legacy))).status, 'applied');
  const firstPrepared = store.listParticipants()[0].extensions.v5.combatReflexesPreparation;
  assert.equal(firstPrepared.originalInitiative, 43);
  assert.equal(firstPrepared.characteristic, 43);
  assert.equal(store.listParticipants()[0].initiative, 6, 'avant A, le comportement legacy reste inchangé');
  await store.updateParticipant('reflex', { caracs: { ...store.listParticipants()[0].caracs, I: 50 } });
  const replacement = { ...legacy, resolutionId: 'legacy-reflex-again' };
  assert.equal((await store.applyResolution(store.previewResolution(replacement))).status, 'applied');
  const prepared = store.listParticipants().find(row => row.id === 'reflex').extensions.v5.combatReflexesPreparation;
  assert.deepEqual(prepared, {
    version: 1, participantId: 'reflex', originalInitiative: 43, characteristic: 50, dice: [9, 2], choice: 'second', selectedDie: 2,
    provenance: { kind: 'legacy-talent-activation', resolutionId: 'legacy-reflex-again' }
  });
  const reloaded = createStore({ persistence, storage: null });
  await reloaded.ready;
  const init = reloaded.previewCombatInitialization({});
  assert.equal(init.ready, true, JSON.stringify(init.needsInput));
  assert.equal(init.participants[0].extensions.v5.combatInitiative.characteristic, 50);
  assert.equal(init.participants[0].extensions.v5.combatInitiative.score, 7);
  assert.equal(init.participants[0].initiative, 43, 'A restaure l’Initiative brute et garde le score séparé');
  await reloaded.applyCombatInitialization(init);
  assert.equal(reloaded.listParticipants()[0].extensions.v5.combatReflexesPreparation, undefined, 'la préparation est consommée une fois');
});

test('F2-A — après détermination, l’activation legacy et sa simulation sont bloquées sans modifier I', async () => {
  const reflex = person('reflex', { kind: 'PJ', I: 43 });
  reflex.talents = [{ id: 'talent-combat-reflexes', status: 'resolved', rank: 1 }];
  const { store } = await fixture([reflex]);
  const activation = {
    resolutionId: 'second-reflex', actorId: 'reflex', action: { type: 'skill', base: 0 }, roll: '',
    v5: { kind: 'test', context: { talentAction: 'combat-reflexes', beginningOfCombat: true, initiativeFirst: 9, initiativeSecond: 2, initiativeChoice: 'second' } }
  };
  const simulationPreparedBeforeA = store.simulateAction(activation);
  assert.ok(simulationPreparedBeforeA.preview, JSON.stringify(simulationPreparedBeforeA));
  await store.applyCombatInitialization(store.previewCombatInitialization({ combatReflexesById: { reflex: { dice: [3, 4], choice: 'second' } } }));
  const preview = store.previewResolution(activation);
  assert.equal(preview.status, 'requires-input');
  assert.match(preview.error, /déjà déterminé|déjà initialisé/i);
  const simulation = store.simulateAction(activation);
  assert.equal(simulation.status, 'requires-input');
  assert.match(simulation.error, /déjà déterminé|déjà initialisé/i);
  assert.throws(() => store.applySimulation(simulationPreparedBeforeA), /déjà déterminé|déjà initialisé/i);
  assert.equal(store.listParticipants()[0].initiative, 43);
});

test('F2-A — à trois ex aequo, le MJ choisit directement une permutation complète', () => {
  const participants = [person('a'), person('b'), person('c')];
  const initial = buildPlan(participants, { diceById: { a: 5, b: 5, c: 5 } });
  const group = initial.tieGroups[0];
  assert.ok(group, 'le triplet ex aequo doit être explicite');
  const ordered = buildPlan(participants, { diceById: { a: 5, b: 5, c: 5 }, tieChoices: { [group.key]: ['c', 'b', 'a'] } });
  assert.equal(ordered.ready, true);
  assert.deepEqual(ordered.order, ['c', 'b', 'a']);
  assert.equal(ordered.oppositions.length, 0);
  const missingChoice = buildPlan(participants, { diceById: { a: 5, b: 5, c: 5 } });
  assert.equal(missingChoice.ready, false, 'l’ordre choisi par le MJ est requis');
  assert.ok(missingChoice.needsInput.some(row => row.field === 'tieChoice' && row.direct));
  const incompleteChoice = buildPlan(participants, {
    diceById: { a: 5, b: 5, c: 5 }, tieOrders: { [group.key]: ['a', 'b', 'c'] },
    opposedRolls: { [`${group.key}:0`]: { initiatorRoll: 21, opponentRoll: 31 }, [`${group.key}:1`]: { initiatorRoll: 11, opponentRoll: 41 } },
    tieChoices: { [group.key]: ['a', 'b', 'b'] }
  });
  assert.equal(incompleteChoice.ready, false, 'le choix du MJ est une permutation complète, sans doublon');
});

test('F2-A — oppositions égales utilisent le départage V5 en faveur de l’initiateur déclaré', () => {
  const participants = [person('first'), person('second')];
  const group = buildPlan(participants, { diceById: { first: 4, second: 4 } }).tieGroups[0];
  const plan = buildPlan(participants, {
    diceById: { first: 4, second: 4 }, tieOrders: { [group.key]: ['first', 'second'] },
    opposedRolls: { [`${group.key}:first:second`]: { initiatorRoll: 44, opponentRoll: 44 } },
    tieChoices: { [group.key]: ['second', 'first'] }
  });
  assert.equal(plan.ready, true);
  assert.equal(plan.oppositions[0].initiatorId, 'first');
  assert.equal(plan.oppositions[0].winnerId, 'first');
  assert.deepEqual(plan.order, ['second', 'first'], 'le gagnant peut laisser le second acteur agir en premier');
});

test('F2-A — surprise acquise par service canonique seulement sur le camp actif choisi', async () => {
  const participants = [person('pj', { kind: 'PJ', camp: 'pj' }), person('ally', { kind: 'PNJ', camp: 'allie' }), person('foe', { camp: 'ennemi' }), person('reserve', { camp: 'ennemi', zone: 'bench' })];
  const { store } = await fixture(participants);
  assert.equal(typeof store.previewCombatInitialization, 'function');
  assert.equal(typeof store.applyCombatInitialization, 'function');
  const preview = store.previewCombatInitialization({ diceById: { pj: 5, ally: 6, foe: 7 }, surprisedCamp: 'ennemi' });
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput));
  await store.applyCombatInitialization(preview);
  assert.ok(store.listParticipants().find(row => row.id === 'foe').states.some(row => row.key === 'surpris'));
  assert.ok(!store.listParticipants().find(row => row.id === 'pj').states.some(row => row.key === 'surpris'));
  assert.ok(!store.listParticipants().find(row => row.id === 'ally').states.some(row => row.key === 'surpris'));
  assert.ok(!store.listParticipants().find(row => row.id === 'reserve').states.some(row => row.key === 'surpris'));
});

test('F2-A — annulation de surprise sans camp choisi ne pose aucun État', async () => {
  const { store } = await fixture([person('a'), person('b')]);
  const preview = store.previewCombatInitialization({ diceById: { a: 5, b: 6 }, surprisedCamp: null });
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput));
  await store.applyCombatInitialization(preview);
  assert.ok(store.listParticipants().every(row => !row.states.some(state => state.key === 'surpris')));
});

test('F2-A — commande finale unique, stale protégée, Undo/Redo et reload conservent jets, ordre et États', async () => {
  const participants = [person('npc', { I: 40 }), person('pj', { kind: 'PJ', I: 39 })];
  const { store, persistence } = await fixture(participants);
  const preview = store.previewCombatInitialization({ diceById: { npc: 10, pj: 1 }, surprisedCamp: 'ennemi' });
  assert.equal(preview.ready, true);
  await store.updateParticipant('npc', { name: 'changed' });
  const stale = await store.applyCombatInitialization(preview);
  assert.equal(stale.status, 'stale');

  const current = store.previewCombatInitialization({ diceById: { npc: 10, pj: 1 }, surprisedCamp: 'ennemi' });
  const before = JSON.parse(store.getFullJSON());
  const applied = await store.applyCombatInitialization(current);
  assert.equal(applied.status, 'applied');
  const after = JSON.parse(store.getFullJSON());
  assert.equal(after.localRevision, before.localRevision + 1);
  assert.equal(after.combat.participants.find(row => row.id === 'npc').initiative, 40);
  assert.equal(after.combat.participants.find(row => row.id === 'npc').extensions.v5.combatInitiative.die, 10);
  assert.equal(after.combat.participants.find(row => row.id === 'npc').extensions.v5.combatInitiative.score, 14);
  assert.deepEqual(after.combat.order, ['npc', 'pj']);

  const reloaded = createStore({ persistence, storage: null });
  await reloaded.ready;
  assert.deepEqual(reloaded.getCombat().order, after.combat.order);
  assert.equal(reloaded.listParticipants().find(row => row.id === 'npc').extensions.v5.combatInitiative.die, 10);
  assert.equal(await reloaded.undo(), true);
  assert.ok(reloaded.listParticipants().every(row => !row.extensions?.v5?.combatInitiative));
  assert.equal(await reloaded.redo(), true);
  assert.deepEqual(reloaded.getCombat().order, after.combat.order);
  assert.equal(reloaded.listParticipants().find(row => row.id === 'npc').extensions.v5.combatInitiative.die, 10);
});

test('F2-A — l’ordre automatique initialisé traite Souffle froid au Round suivant après le dernier acteur', async () => {
  const cold = person('cold', { I: 90 });
  cold.extensions.v5.combatInitiative = { die: 10, score: 19, characteristic: 90, initialized: true, orderIndex: 0 };
  cold.states = [{ key: 'fatigued', source: { coldBreath: true }, v5Timing: { acquiredRound: 1 } }];
  const middle = person('middle', { I: 60 });
  middle.extensions.v5.combatInitiative = { die: 5, score: 11, characteristic: 60, initialized: true, orderIndex: 1 };
  const last = person('last', { I: 40 });
  last.extensions.v5.combatInitiative = { die: 5, score: 9, characteristic: 40, initialized: true, orderIndex: 2 };
  const snapshot = baseState([cold, middle, last]);
  snapshot.combat.round = 1;
  snapshot.combat.currentActorId = 'last';
  snapshot.combat.order = ['cold', 'middle', 'last'];
  snapshot.extensions.v5.combatInitiativeInitialized = true;
  const { store } = await fixture([cold, middle, last]);
  await store.loadFromJSON(snapshot);
  assert.deepEqual(store.getEffectiveOrder(), ['cold', 'middle', 'last']);
  await store.nextTurn();
  assert.equal(store.getCombat().round, 2);
  assert.deepEqual(store.getCombat().order, ['middle', 'last', 'cold']);
  assert.equal(store.getCombat().currentActorId, 'middle');
  assert.deepEqual(store.getEffectiveOrder(), ['middle', 'last', 'cold']);
});

test('F2-A — lancement de rencontre est staged, identité stable et une Undo annule scène, jets et surprise', async () => {
  const { store } = await fixture([]);
  await store.addProfile({ id: 'foe-profile', name: 'Garde', kind: 'PNJ', hp: 12, initiative: 40, caracs: { I: 40 } });
  await store.addProfile({ id: 'pj-profile', name: 'PJ', kind: 'PJ', hp: 12, initiative: 0, caracs: { I: 0 } });
  await store.saveEncounter({ id: 'ambush', title: 'Embuscade', entries: [
    { id: 'foe-entry', profileId: 'foe-profile', quantity: 1, camp: 'ennemi', zone: 'active' },
    { id: 'pj-entry', profileId: 'pj-profile', quantity: 1, camp: 'pj', zone: 'active' }
  ] });
  const before = JSON.parse(store.getFullJSON()), sceneStage = store.previewEncounterLaunch('ambush');
  assert.equal(store.getActiveScene(), null, 'preview ne doit rien créer');
  const staged = store.previewCombatInitialization({ staging: sceneStage, diceById: Object.fromEntries(sceneStage.scene.participants.map((row, i) => [row.id, i + 5])), surprisedCamp: 'pj' });
  assert.equal(staged.ready, true, JSON.stringify(staged.needsInput));
  assert.equal(store.getActiveScene(), null, 'dialogue annulé: aucun lancement');
  const applied = await store.applyCombatInitialization(staged);
  assert.equal(applied.status, 'applied');
  const after = JSON.parse(store.getFullJSON());
  assert.equal(after.localRevision, before.localRevision + 1, 'une seule commande finale après la préparation du scénario');
  assert.equal(after.activeScene.encounterId, 'ambush');
  assert.deepEqual(after.activeScene.participants.map(row => row.id), sceneStage.scene.participants.map(row => row.id));
  assert.ok(after.combat.participants.find(row => row.camp === 'pj').states.some(row => row.key === 'surpris'));
  assert.equal(await store.undo(), true);
  assert.equal(store.getActiveScene(), null);
  assert.equal(store.getCombat().participants.size, 0);
});

test('F2-A — redémarrage staged: annulation conserve la scène; une application redémarre avec I/score et Undo atomique', async () => {
  const { store } = await fixture([]);
  await store.addProfile({ id: 'restart-foe', name: 'Garde', kind: 'PNJ', hp: 12, initiative: 40, caracs: { I: 40 } });
  await store.saveEncounter({ id: 'restart-enc', title: 'Cour', entries: [{ id: 'entry', profileId: 'restart-foe', quantity: 1, camp: 'ennemi', zone: 'active' }] });
  const launch = store.previewEncounterLaunch('restart-enc');
  await store.applyCombatInitialization(store.previewCombatInitialization({ staging: launch, diceById: { [launch.scene.participants[0].id]: 9 } }));
  const scoped=JSON.parse(store.getFullJSON());scoped.extensions.v5.combatScopeId='old-combat-scope';scoped.extensions.v5.combatActions={byActorId:{old:{kind:'aim'}},receipts:[{id:'old'}]};scoped.extensions.v5.standardTurnActions=[{actionId:'old-action'}];
  await store.loadFromJSON(scoped);
  const oldScene = store.getActiveScene(), revision = store.getLocalRevision();
  const beforeClock=JSON.parse(store.getFullJSON());beforeClock.combat.round=1;beforeClock.combat.currentActorId=beforeClock.combat.participants[0].id;beforeClock.activeScene.extensions.v5.turnIndex=1;
  const oldTurnId=v5StoreActionClock(beforeClock).turnId;
  const stagedRestart = store.previewCombatRestart();
  const restartPreview = store.previewCombatInitialization({ staging: stagedRestart, diceById: { [stagedRestart.scene.participants[0].id]: 3 } });
  assert.equal(restartPreview.ready, true);
  assert.deepEqual(store.getActiveScene(), oldScene, 'le preview/annulation ne doit pas toucher la scène active');
  const applied = await store.applyCombatInitialization(restartPreview);
  assert.equal(applied.status, 'applied');
  assert.equal(store.getLocalRevision(), revision + 1);
  assert.equal(store.getCombat().round, 0);
  assert.equal(store.listParticipants()[0].extensions.v5.combatInitiative.die, 3);
  assert.equal(store.listParticipants()[0].extensions.v5.combatInitiative.score, 7);
  assert.equal(store.getActiveScene().id,oldScene.id,'l’identité de scène reste celle du contrat existant');
  const restarted=JSON.parse(store.getFullJSON());
  assert.notEqual(restarted.extensions.v5.combatScopeId,'old-combat-scope');
  assert.equal(restarted.activeScene.extensions.v5.combatScopeId,restarted.extensions.v5.combatScopeId,'scène et enveloppe partagent la même portée de combat');
  const afterClock={...restarted,combat:{...restarted.combat,round:1,currentActorId:beforeClock.combat.currentActorId},activeScene:{...restarted.activeScene,extensions:{...restarted.activeScene.extensions,v5:{...restarted.activeScene.extensions.v5,turnIndex:1}}}};
  assert.notEqual(v5StoreActionClock(afterClock).turnId,oldTurnId);
  assert.equal(restarted.extensions.v5.combatActions,undefined);
  assert.equal(restarted.extensions.v5.standardTurnActions,undefined);
  assert.equal(await store.undo(), true);
  assert.deepEqual(store.getActiveScene(), oldScene);
});

test('F2-A — redémarrage staged sans scène renouvelle la portée et purge les reçus d’actions', async () => {
  const {store}=await fixture([person('solo',{I:40})]);
  await store.applyCombatInitialization(store.previewCombatInitialization({diceById:{solo:5}}));
  const state=JSON.parse(store.getFullJSON()),oldScope=state.extensions.v5.combatScopeId;
  state.extensions.v5.combatActions={byActorId:{solo:{kind:'aim'}},receipts:[{id:'stale'}]};
  state.extensions.v5.standardTurnActions=[{actionId:'stale'}];
  await store.loadFromJSON(state);
  const staging=store.previewCombatRestart(),preview=store.previewCombatInitialization({staging,diceById:{solo:3}});
  assert.equal(preview.ready,true);
  await store.applyCombatInitialization(preview);
  const restarted=JSON.parse(store.getFullJSON());
  assert.notEqual(restarted.extensions.v5.combatScopeId,oldScope);
  assert.equal(restarted.extensions.v5.combatActions,undefined);
  assert.equal(restarted.extensions.v5.standardTurnActions,undefined);
  assert.equal(store.getCombat().round,0);
});

test('F2-A — revenir du manuel à auto restaure le score résolu, avec Undo et reload', async () => {
  const { store, persistence } = await fixture([person('npc', { I: 40 }), person('pj', { kind: 'PJ', I: 30 })]);
  await store.applyCombatInitialization(store.previewCombatInitialization({ diceById: { npc: 3, pj: 10 } }));
  assert.deepEqual(store.getCombat().order, ['pj', 'npc']);
  await store.setOrderMode('manual');
  await store.moveInOrder('npc', 'pj');
  assert.deepEqual(store.getCombat().order, ['npc', 'pj']);
  await store.rebuildOrder();
  assert.deepEqual(store.getCombat().order, ['pj', 'npc'], 'la piste auto revient aux scores, sans comparer I historique aux scores');
  const reloaded = createStore({ persistence, storage: null }); await reloaded.ready;
  assert.deepEqual(reloaded.getCombat().order, ['pj', 'npc']);
  assert.equal(await reloaded.undo(), true);
  assert.deepEqual(reloaded.getCombat().order, ['npc', 'pj']);
});

test('F2-A — startCombat survit au preview et démarre Round 1 dans la commande d’initialisation', async () => {
  const { store } = await fixture([person('npc', { I: 40 }), person('pj', { kind: 'PJ', I: 35 })]);
  const preview = store.previewCombatInitialization({ diceById: { npc: 6, pj: 8 }, startCombat: true });
  assert.equal(preview.startCombat, true);
  const result = await store.applyCombatInitialization(preview);
  assert.equal(result.status, 'applied');
  assert.equal(store.getCombat().round, 1);
  assert.equal(store.getCombat().currentActorId, 'pj');
});

test('F2-A — la preuve tournoi complète est conservée après reload, suspension et reprise', async () => {
  const { store, persistence } = await fixture([]);
  for (const id of ['left-profile', 'right-profile']) await store.addProfile({ id, name: id, kind: 'PNJ', hp: 10, initiative: 40, caracs: { I: 40 } });
  await store.saveEncounter({ id: 'tie-scene', title: 'Égalité', entries: [
    { id: 'left-entry', profileId: 'left-profile', quantity: 1, camp: 'ennemi', zone: 'active' },
    { id: 'right-entry', profileId: 'right-profile', quantity: 1, camp: 'pj', zone: 'active' }
  ] });
  const staging = store.previewEncounterLaunch('tie-scene'), [left, right] = staging.scene.participants.map(row => row.id), groupKey = [left, right].join('|');
  const rollsKey = `${groupKey}:${left}:${right}`;
  const preview = store.previewCombatInitialization({ staging, diceById: { [left]: 5, [right]: 5 }, tieOrders: { [groupKey]: [left, right] },
    opposedRolls: { [rollsKey]: { initiatorRoll: 40, opponentRoll: 87 } }, tieChoices: { [groupKey]: [right, left] } });
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput));
  await store.applyCombatInitialization(preview);
  const proof = JSON.parse(store.getFullJSON()).activeScene.extensions.v5.combatInitiativeResolution;
  assert.deepEqual(proof.tieGroups[0].bracketOrder, [left, right]);
  assert.equal(proof.tieGroups[0].matches[0].initiatorRoll, 40);
  assert.equal(proof.tieGroups[0].matches[0].opponentRoll, 87);
  assert.equal(proof.tieGroups[0].matches[0].initiatorDR, 0);
  assert.equal(proof.tieGroups[0].matches[0].opponentDR, -4);
  assert.equal(proof.tieGroups[0].matches[0].winnerId, left);
  assert.equal(proof.tieGroups[0].winnerId, left);
  assert.deepEqual(proof.tieGroups[0].chosenOrder, [right, left]);
  assert.deepEqual(proof.order, [right, left]);
  const reloaded = createStore({ persistence, storage: null }); await reloaded.ready;
  assert.deepEqual(reloaded.getActiveScene().extensions.v5.combatInitiativeResolution, proof);
  assert.equal(await reloaded.undo(), true);
  assert.equal(reloaded.getActiveScene(), null);
  assert.equal(await reloaded.redo(), true);
  assert.deepEqual(reloaded.getActiveScene().extensions.v5.combatInitiativeResolution, proof);
  const sceneId = reloaded.getActiveScene().id;
  await reloaded.suspendActiveScene();
  const suspended = reloaded.listSuspendedScenes()[0];
  assert.deepEqual(suspended.extensions.v5.combatInitiativeResolution, proof);
  await reloaded.resumeScene(suspended.id);
  assert.deepEqual(reloaded.getActiveScene().extensions.v5.combatInitiativeResolution, proof);
  assert.deepEqual(JSON.parse(reloaded.getFullJSON()).extensions.v5.combatInitiativeResolution, proof);
  assert.equal(reloaded.getActiveScene().id, sceneId);
});

test('F2-A — renforts sans jet gardent leur insertion canonique; score initial survivant suit encore la piste', async () => {
  const { store, persistence } = await fixture([person('a', { I: 90 }), person('b', { I: 30 }), person('e', { I: 70, zone: 'bench' })]);
  await store.applyCombatInitialization(store.previewCombatInitialization({ diceById: { a: 9, b: 2 }, startCombat: true }));
  await store.addParticipant(person('c', { I: 99 }));
  await store.addParticipant(person('d', { I: 30 }));
  assert.deepEqual(store.getCombat().order, ['a', 'd', 'c', 'b']);
  assert.deepEqual(JSON.parse(store.getFullJSON()).extensions.v5.combatInitiativeResolution.order, ['a', 'd', 'c', 'b']);
  assert.deepEqual(store.getEffectiveOrder(), ['a', 'd', 'c', 'b'], 'I99 d’un renfort ne se compare jamais aux scores initiaux');
  await store.moveParticipant('e', 'active');
  assert.deepEqual(store.getEffectiveOrder(), ['a', 'e', 'd', 'c', 'b'], 'l’activation de banc insère sans jet au tour indiqué');
  await store.moveParticipant('a', 'bench');
  await store.moveParticipant('b', 'bench');
  await store.moveParticipant('e', 'bench');
  assert.deepEqual(store.getEffectiveOrder(), ['d', 'c'], 'les renforts restants conservent l’ordre canonique quand les initiateurs initiaux sortent');
  const reloaded = createStore({ persistence, storage: null }); await reloaded.ready;
  assert.deepEqual(reloaded.getEffectiveOrder(), ['d', 'c']);
  await reloaded.setOrderMode('manual');
  await reloaded.moveInOrder('c', 'd');
  await reloaded.setOrderMode('automatic');
  assert.deepEqual(reloaded.getCombat().order, ['d', 'c']);
});

test('F2-A — terminer le combat efface le marqueur de piste initialisée avant un nouveau combat libre', async () => {
  const { store } = await fixture([person('a', { I: 40 })]);
  await store.applyCombatInitialization(store.previewCombatInitialization({ diceById: { a: 3 } }));
  assert.equal(JSON.parse(store.getFullJSON()).extensions.v5.combatInitiativeInitialized, true);
  await store.resetCombat();
  const envelope=JSON.parse(store.getFullJSON());
  assert.equal(envelope.extensions.v5.combatInitiativeInitialized, undefined);
  assert.equal(envelope.extensions.v5.combatInitiativeResolution, undefined);
  assert.equal(envelope.combat.participants.length, 0);
});

test('F2-A — suspendre une scène efface le marqueur global avant le prochain combat libre', async () => {
  const { store } = await fixture([]);
  await store.addProfile({ id: 'suspend-profile', name: 'Garde', kind: 'PNJ', hp: 10, initiative: 40, caracs: { I: 40 } });
  await store.saveEncounter({ id: 'suspend-enc', title: 'Scène', entries: [{ id: 'suspend-entry', profileId: 'suspend-profile', quantity: 1, camp: 'ennemi', zone: 'active' }] });
  const staging=store.previewEncounterLaunch('suspend-enc'), actorId=staging.scene.participants[0].id;
  await store.applyCombatInitialization(store.previewCombatInitialization({ staging, diceById: { [actorId]: 5 } }));
  await store.suspendActiveScene();
  assert.equal(JSON.parse(store.getFullJSON()).extensions.v5.combatInitiativeInitialized, undefined);
  assert.ok(store.listSuspendedScenes()[0].participants[0].extensions.v5.combatInitiative.initialized);
});

test('F2-A — reprendre S1 après un combat libre restaure sa portée et garde ses reçus', async () => {
  const {store}=await fixture([]);
  await store.addProfile({id:'scope-profile',name:'Garde',kind:'PNJ',hp:10,initiative:40,caracs:{I:40}});
  await store.saveEncounter({id:'scope-enc',title:'S1',entries:[{id:'scope-entry',profileId:'scope-profile',quantity:1,camp:'ennemi',zone:'active'}]});
  const launch=store.previewEncounterLaunch('scope-enc'),sceneActor=launch.scene.participants[0].id;
  await store.applyCombatInitialization(store.previewCombatInitialization({staging:launch,diceById:{[sceneActor]:5}}));
  const first=JSON.parse(store.getFullJSON()),s1Scope=first.activeScene.extensions.v5.combatScopeId;
  first.extensions.v5.standardTurnActions=[{actionId:'s1-action',actorId:sceneActor}];first.extensions.v5.combatActions={byActorId:{[sceneActor]:{kind:'aim'}},receipts:[{id:'s1-receipt'}]};
  await store.loadFromJSON(first);await store.suspendActiveScene();
  await store.addParticipant(person('free-actor',{I:30}));
  await store.applyCombatInitialization(store.previewCombatInitialization({diceById:{'free-actor':7},startCombat:true}));
  const freeScope=JSON.parse(store.getFullJSON()).extensions.v5.combatScopeId;
  assert.notEqual(freeScope,s1Scope);
  const suspended=store.listSuspendedScenes()[0];await store.resumeScene(suspended.id);
  const resumed=JSON.parse(store.getFullJSON());
  assert.equal(resumed.extensions.v5.combatScopeId,s1Scope);
  assert.equal(resumed.activeScene.extensions.v5.combatScopeId,s1Scope);
  assert.deepEqual(resumed.extensions.v5.standardTurnActions,first.extensions.v5.standardTurnActions);
  assert.deepEqual(resumed.extensions.v5.combatActions,first.extensions.v5.combatActions);
  const clockState={...resumed,combat:{...resumed.combat,round:1,currentActorId:'free-actor'},activeScene:{...resumed.activeScene,extensions:{...resumed.activeScene.extensions,v5:{...resumed.activeScene.extensions.v5,turnIndex:1}}}};
  assert.ok(v5StoreActionClock(clockState).turnId.startsWith(`${s1Scope}:`));
});

test('F2-A — un participant déjà tiré remis du banc retrouve son rang au score', async () => {
  const returning=person('returning',{I:40,zone:'bench'}),fast=person('fast',{I:30}),slow=person('slow',{I:20});
  returning.extensions.v5.combatInitiative={die:9,score:13,characteristic:40,initialized:true,orderIndex:1};
  fast.extensions.v5.combatInitiative={die:10,score:13,characteristic:30,initialized:true,orderIndex:2};
  slow.extensions.v5.combatInitiative={die:1,score:3,characteristic:20,initialized:true,orderIndex:3};
  const {store}=await fixture([returning,fast,slow]);
  const state=baseState([returning,fast,slow]);state.extensions.v5.combatInitiativeInitialized=true;state.extensions.v5.combatInitiativeResolution={order:['returning','fast','slow']};
  await store.loadFromJSON(state);
  await store.moveParticipant('returning','active');
  assert.deepEqual(store.getEffectiveOrder(),['returning','fast','slow']);
});

test('F2-A — le retour du banc respecte l’ordre manuel déjà choisi', async () => {
  const returning=person('returning',{I:40,zone:'bench'}),first=person('first',{I:30}),second=person('second',{I:20});
  for(const [id,score] of [['returning',14],['first',8],['second',5]]){
    const row=[returning,first,second].find(item=>item.id===id);row.extensions.v5.combatInitiative={die:score-Math.floor(row.caracs.I/10),score,characteristic:row.caracs.I,initialized:true};
  }
  const {store}=await fixture([returning,first,second]);
  const state=baseState([returning,first,second]);state.combat.orderMode='manual';state.combat.order=['second','first'];state.combat.currentActorId='second';
  state.extensions.v5.combatInitiativeInitialized=true;state.extensions.v5.combatInitiativeResolution={order:['returning','first','second']};
  await store.loadFromJSON(state);await store.moveParticipant('returning','active');
  assert.deepEqual(store.getEffectiveOrder(),['second','returning','first']);
});

test('F2-A — activation après tirage et avant Round 1 exige un nouveau jet sans relancer les anciens', async () => {
  const active=person('already',{I:40}),bench=person('late',{I:30,zone:'bench'});
  active.extensions.v5.combatInitiative={die:8,score:12,characteristic:40,initialized:true,orderIndex:0};
  const {store}=await fixture([active,bench]);
  const state=baseState([active,bench]);state.extensions.v5.combatInitiativeInitialized=true;state.extensions.v5.combatInitiativeResolution={order:['already']};
  await store.loadFromJSON(state);
  assert.throws(()=>store.moveParticipant('late','active'),/doit recevoir son jet/,'Store interdit une activation Round 0 qui contourne le dialogue');
  const staging=store.previewCombatParticipantActivation('late');
  assert.equal(staging.kind,'activate-pre-round');
  const preview=store.previewCombatInitialization({staging,diceById:{late:3}});
  assert.equal(preview.ready,true,JSON.stringify(preview.needsInput));
  await store.applyCombatInitialization(preview);
  const rows=store.listParticipants();
  assert.equal(rows.find(row=>row.id==='already').extensions.v5.combatInitiative.die,8);
  assert.equal(rows.find(row=>row.id==='late').extensions.v5.combatInitiative.die,3);
  assert.deepEqual(store.getCombat().order,['already','late']);
});

test('F2-A — activation pré-Round 1 conserve les dés et départages d’une égalité déjà réglée', async () => {
  const {store}=await fixture([person('one',{I:40}),person('two',{I:40})]);
  const groupKey='one|two',matchId='one|two:one:two';
  await store.applyCombatInitialization(store.previewCombatInitialization({diceById:{one:1,two:1},tieOrders:{[groupKey]:['one','two']},opposedRolls:{[matchId]:{initiatorRoll:20,opponentRoll:80}},tieChoices:{[groupKey]:['two','one']}}));
  await store.addParticipant(person('late',{I:30,zone:'bench'}));
  const staging=store.previewCombatParticipantActivation('late');
  assert.deepEqual(staging.tieOrders[groupKey],['one','two']);
  assert.deepEqual(staging.tieChoices[groupKey],['two','one']);
  assert.equal(staging.opposedRolls[matchId].initiatorRoll,20);
  assert.equal(staging.opposedRolls[matchId].opponentRoll,80);
  const preview=store.previewCombatInitialization({staging,diceById:{late:10}});
  assert.equal(preview.ready,true,JSON.stringify(preview.needsInput));
  await store.applyCombatInitialization(preview);
  const proof=JSON.parse(store.getFullJSON()).extensions.v5.combatInitiativeResolution;
  assert.deepEqual(proof.tieGroups[0].chosenOrder,['two','one']);
  assert.equal(proof.tieGroups[0].matches[0].initiatorRoll,20);
  assert.deepEqual(store.getCombat().order,['late','two','one']);
});

test('F2-A — Test opposé d’I applique Exténué au DR via le pipeline V5, sans pénalité d’Action', () => {
  const tired=person('tired',{I:40}),healthy=person('healthy',{I:40});
  tired.states=[{key:'extenue',level:1}];
  const ids=['tired','healthy'],groupKey=ids.join('|'),matchId=`${groupKey}:tired:healthy`;
  const plan=buildPlan([tired,healthy],{diceById:{tired:5,healthy:5},tieOrders:{[groupKey]:ids},
    opposedRolls:{[matchId]:{initiatorRoll:45,opponentRoll:45}},tieChoices:{[groupKey]:['tired','healthy']}});
  assert.equal(plan.ready,true,JSON.stringify(plan.needsInput));
  assert.equal(plan.oppositions[0].initiator.sl,-1);
  assert.equal(plan.oppositions[0].opponent.sl,0);
  assert.equal(plan.oppositions[0].winnerId,'healthy');
});

test('F2-A — ignoreConditionPenalties et ignoreFatiguePenalties annulent la pénalité uniquement pour le Test', () => {
  for(const special of ['ignoreConditionPenalties','ignoreFatiguePenalties']){
    const actor=person('tired',{I:40}),opponent=person('healthy',{I:40});
    actor.states=[{key:'extenue',level:2}];actor.extensions.v5.specialStates={[special]:true};
    const ids=['tired','healthy'],groupKey=ids.join('|'),matchId=`${groupKey}:tired:healthy`;
    const plan=buildPlan([actor,opponent],{diceById:{tired:5,healthy:5},tieOrders:{[groupKey]:ids},
      opposedRolls:{[matchId]:{initiatorRoll:45,opponentRoll:45}},tieChoices:{[groupKey]:['tired','healthy']}});
    assert.equal(plan.ready,true,JSON.stringify(plan.needsInput));
    assert.equal(plan.oppositions[0].initiator.sl,0,special);
    assert.equal(plan.oppositions[0].winnerId,'tired',special);
    assert.equal(plan.participants[0].extensions.v5.combatInitiative.score,9,'l’Exténué ne modifie pas le d10 + BI initial');
  }
});

test('F2-A — le Test obligatoire d’I connaît les contextes non pertinents Souillé/Brisé et garde les DR de Brisé', () => {
  const actor=person('afflicted',{I:40}),opponent=person('healthy',{I:40});
  actor.states=[{key:'souille',level:1},{key:'brise',level:1}];
  const ids=['afflicted','healthy'],groupKey=ids.join('|'),matchId=`${groupKey}:afflicted:healthy`;
  const plan=buildPlan([actor,opponent],{diceById:{afflicted:5,healthy:5},tieOrders:{[groupKey]:ids},
    opposedRolls:{[matchId]:{initiatorRoll:45,opponentRoll:45}},tieChoices:{[groupKey]:['afflicted','healthy']}});
  assert.equal(plan.ready,true,JSON.stringify(plan.needsInput));
  assert.equal(plan.oppositions[0].initiator.sl,-1,'Brisé pénalise bien ce Test non destiné à fuir');
  assert.equal(plan.oppositions[0].winnerId,'healthy');
});
});

describe('Renforts de scène et Initiative', () => {
// Corrections Claude après la contre-vérification T1 ter (27/10/2026).
const clone = value => structuredClone(value);
function persistence() { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; }
const person = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 40, hp: 10, maxHp: 10, caracs: { I: 40, CC: 50, CT: 50 }, skills: [], equipment: [], actions: [], states: [], extensions: { v5: {} }, ...extra });
const base = participants => ({ schemaVersion: 3, reserve: [], log: [], diceLines: [], activeScene: null, encounters: [], suspendedScenes: [], persistentCharacters: [],
  combat: { round: 0, currentActorId: null, order: participants.map(row => row.id), orderMode: 'automatic', participants: clone(participants) }, extensions: { v5: {} } });
async function setup(participants, mutate) {
  const store = createStore({ persistence: persistence(), storage: null }); await store.ready;
  const state = base(participants); if (mutate) mutate(state); await store.loadFromJSON(state); return store;
}

test('un renfort de scène avant le Round 1 exige le jet d’Initiative', async () => {
  const store = await setup([], state => { state.reserve = [
    { id: 'prof', name: 'Gobelin', kind: 'PNJ', initiative: 30, caracs: { I: 30 }, hp: 8, maxHp: 8 },
    { id: 'prof2', name: 'Renfort', kind: 'PNJ', initiative: 30, caracs: { I: 30 }, hp: 8, maxHp: 8 }]; });
  await store.saveEncounter({ id: 'enc', title: 'T', entries: [
    { id: 'e1', profileId: 'prof', quantity: 1, camp: 'ennemi', zone: 'active' },
    { id: 'e2', profileId: 'prof2', quantity: 1, camp: 'ennemi', zone: 'bench' }] });
  const staging = store.previewEncounterLaunch('enc');
  await store.applyCombatInitialization(store.previewCombatInitialization({ staging }));
  const dice = Object.fromEntries(staging.scene.participants.map((row, index) => [row.id, 3 + index]));
  await store.applyCombatInitialization(store.previewCombatInitialization({ staging, diceById: dice }));
  const bench = store.listParticipants().find(row => row.zone === 'bench');
  assert.ok(bench, 'participant au banc');
  const event = store.createSceneEvent({ id: 'ev1', condition: { type: 'manual' }, consequence: { type: 'reinforcement', participantId: bench.id } });
  await store.saveSceneEvent(event);
  const applied = await store.applySceneEvent(event, { manual: true, confirmed: true });
  assert.equal(applied.code, 'COMBAT_INIT_REQUIRED');
  assert.equal(store.listParticipants().find(row => row.id === bench.id).zone, 'bench', 'le renfort reste au banc');
});

test('la Visée reconnaît le nom de l’arme sans tenir compte de la casse', async () => {
  const store = await setup([person('archer', { kind: 'PJ', camp: 'pj' }), person('target')], state => {
    state.combat.round = 1; state.combat.currentActorId = 'archer'; state.extensions.v5.combatScopeId = 's';
  });
  await store.applyV5CombatAction(store.previewV5CombatAction({ actorId: 'archer', kind: 'aim', targetId: 'target', weaponName: 'arc', rangedWeaponConfirmed: true, rangedWeaponHeldConfirmed: true }));
  const engine = createCombatEngine(store); await engine.nextTurn(); await engine.nextTurn();
  const shot = store.previewResolution({ resolutionId: 'x', actorId: 'archer', targetId: 'target', action: { type: 'attack', note: 'Arc', attr: 'CT', base: 50, damage: 4 }, roll: 20, v5: { kind: 'ranged', choice: 'keep' } });
  assert.equal(shot.test?.details?.modifiers?.find(row => row.id === 'aim:target')?.amount, 1);
});
});

describe('Régressions T1 bis', () => {
const clone = value => structuredClone(value);
function persistence() {
  let state = null;
  return { async load() { return state && clone(state); }, async saveAtomic({ state: next }) { state = clone(next); return { ok: true }; }, read() { return state && clone(state); } };
}
const person = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 40,
  hp: 10, maxHp: 10, caracs: { I: 40, CC: 50, CT: 50 }, skills: [], equipment: [], actions: [], states: [], extensions: { v5: {} }, ...extra });
const base = participants => ({ schemaVersion: 3, reserve: [], log: [], diceLines: [], activeScene: null, encounters: [],
  suspendedScenes: [], persistentCharacters: [], combat: { round: 0, currentActorId: null, order: participants.map(row => row.id), orderMode: 'automatic', participants: clone(participants) }, extensions: { v5: { turnIndex: 1 } } });
async function setup(participants) {
  const saved = persistence(), store = createStore({ persistence: saved, storage: null });
  await store.ready; await store.loadFromJSON(base(participants)); return { store, saved };
}

test('T1 BIS 1 — Visée déclarée par nom est reconnue après normalisation de l’action', async () => {
  const saved=persistence(),store=createStore({persistence:saved,storage:null});await store.ready;
  const initial=base([person('archer', { kind: 'PJ', camp: 'pj' }), person('target')]);
  initial.combat.round=1;initial.combat.currentActorId='archer';initial.extensions.v5.combatScopeId='aim-scope';
  await store.loadFromJSON(initial);
  await store.applyV5CombatAction(store.previewV5CombatAction({ actorId: 'archer', kind: 'aim', targetId: 'target', weaponName: 'Arc', rangedWeaponConfirmed: true, rangedWeaponHeldConfirmed: true }));
  const engine=createCombatEngine(store);await engine.nextTurn();await engine.nextTurn();
  const shot = store.previewResolution({ resolutionId: 'aim-by-name', actorId: 'archer', targetId: 'target', action: { type: 'attack', name: 'Arc', note: 'Arc', attr: 'CT', base: 50, damage: 4 }, roll: 20, v5: { kind: 'ranged', choice: 'keep' } });
  assert.equal(shot.ready, true, JSON.stringify(shot.unresolved||shot));
  assert.equal(shot.test.details.modifiers.find(row => row.id === 'aim:target')?.amount, 1);
});

test('T1 BIS 2/5 — préparation de rencontre tout au banc permise, démarrage refusé et Store revérifie', async () => {
  const { store } = await setup([person('bench', { zone: 'bench' })]);
  const prepare = store.previewCombatInitialization();
  assert.equal(prepare.ready, true, JSON.stringify(prepare.needsInput));
  const start = store.previewCombatInitialization({ startCombat: true });
  assert.equal(start.ready, false);
  assert.ok(start.needsInput.some(row => row.field === 'activeCombatants'));
  const forged = { ...prepare, startCombat: true };
  const result = await store.applyCombatInitialization(forged);
  assert.equal(result.status, 'requires-input');
});

test('T1 BIS 3/4 — hastes des suppléments et armes de jet usuelles ont une prise à une main sauf (2M)', () => {
  const items = getReferenceCatalogue().items;
  for (const name of ['Hallebarde Haut Elfe', 'Lance longue Haut Elfe']) {
    const weapon = items.find(row => row.name === name);
    assert.ok(weapon, `arme catalogue: ${name}`);
    assert.equal(weaponHandsForParticipant(weapon), 2, name);
  }
  for (const name of ['Couteau de lancer', 'Fronde', 'Fouet', 'Lasso (2M)']) {
    const weapon = items.find(row => row.name === name);
    assert.ok(weapon, `arme catalogue: ${name}`);
    assert.equal(weaponHandsForParticipant(weapon), name === 'Lasso (2M)' ? 2 : 1, name);
  }
  const bomb = items.find(row => /bombe/i.test(row.name) && row.kind === 'weapon');
  if (bomb) assert.equal(weaponHandsForParticipant(bomb), 1, bomb.name);
});

test('T1 BIS 7 — l’initialisation défensive Store refuse un combat tout au banc', async () => {
  const { store } = await setup([person('bench', { zone: 'bench' })]);
  const plan = store.previewCombatInitialization();
  const result = await store.applyCombatInitialization({ ...plan, startCombat: true });
  assert.equal(result.status, 'requires-input');
  assert.equal(store.getCombat().round, 0);
});

test('T1 BIS 6 — arme aethyrique matérialisée sans clé demande son groupe, attaque naturelle reste hors contrôle', () => {
  const actor=person('mage');
  const ethereal={id:'ethereal',type:'attack',note:'Arme aethyrique',attr:'CC',base:50,qualities:[],extensions:{v5:{materialized:true}}};
  const unresolved=applyWeaponSkillRules(actor,ethereal);
  assert.ok(unresolved.unresolved.some(text=>/groupe d’arme manquant/i.test(text)));
  assert.equal(unresolved.receipt.missing,'group');
  const natural=applyWeaponSkillRules(actor,{...ethereal,id:'natural',note:'Dent et griffe'});
  assert.deepEqual(natural.unresolved,[]);
});

test('T1 BIS A — ajout direct actif refusé sans jet; activation avant Round 1 reçoit son jet et rejoint l’ordre', async () => {
  const { store } = await setup([person('first')]);
  const initial=store.previewCombatInitialization({diceById:{first:4}});
  assert.equal(initial.ready,true,JSON.stringify(initial.needsInput));
  await store.applyCombatInitialization(initial);
  assert.throws(()=>store.addParticipant(person('direct',{initiative:35,caracs:{I:35}})),error=>error.code==='COMBAT_INIT_REQUIRED');
  assert.equal(store.listParticipants().some(row=>row.id==='direct'),false,'un ajout actif direct ne se glisse pas sans jet');
  await store.addParticipant(person('reinforcement',{initiative:35,caracs:{I:35},zone:'bench'}));
  const staging=store.previewCombatParticipantActivation('reinforcement');
  assert.ok(staging,'l’entrée en jeu avant le Round 1 ouvre la saisie d’initiative');
  const plan=store.previewCombatInitialization({staging,diceById:{first:4,reinforcement:8}});
  assert.equal(plan.ready,true,JSON.stringify(plan.needsInput));
  const applied=await store.applyCombatInitialization(plan);
  assert.equal(applied.status,'applied');
  const added=store.listParticipants().find(row=>row.id==='reinforcement');
  assert.equal(added.extensions.v5.combatInitiative.die,8);
  assert.equal(added.extensions.v5.combatInitiative.score,11);
  assert.ok(store.getCombat().order.includes('reinforcement'));
});

test('T1 BIS A — addProfilesToCombat ne place pas un profil actif sans jet après initialisation', async () => {
  const { store } = await setup([person('first')]);
  await store.applyCombatInitialization(store.previewCombatInitialization({diceById:{first:4}}));
  await store.addProfile({id:'profile',name:'Nouvel ennemi',kind:'PNJ',initiative:30,caracs:{I:30},hp:10});
  assert.throws(()=>store.addProfilesToCombat(['profile'],{zone:'active'}),error=>error.code==='COMBAT_INIT_REQUIRED');
  assert.equal(store.listParticipants().some(row=>row.profileId==='profile'),false);
  const staging=store.previewCombatParticipantAddition('profile');
  assert.ok(staging);
  const plan=store.previewCombatInitialization({staging,diceById:{[staging.participant.id]:7}});
  assert.equal(plan.ready,true,JSON.stringify(plan.needsInput));
  assert.equal(store.listParticipants().some(row=>row.profileId==='profile'),false,'l’aperçu ne crée pas le participant avant confirmation');
  assert.equal((await store.applyCombatInitialization(plan)).status,'applied');
  const added=store.listParticipants().find(row=>row.profileId==='profile');
  assert.equal(added.zone,'active');assert.equal(added.extensions.v5.combatInitiative.die,7);
});

test('T1 BIS A — PJ ajouté actif avant le Round 1 doit saisir son d10 dans l’aperçu', async () => {
  const { store }=await setup([person('first')]);
  await store.applyCombatInitialization(store.previewCombatInitialization({diceById:{first:4}}));
  const staging=store.previewCombatParticipantAddition(person('new-pj',{kind:'PJ',camp:'pj',initiative:35,caracs:{I:35}}));
  const missing=store.previewCombatInitialization({staging});
  assert.equal(missing.ready,false);assert.ok(missing.needsInput.some(row=>row.participantId==='new-pj'&&row.field==='die'));
  const ready=store.previewCombatInitialization({staging,diceById:{'new-pj':6}});
  assert.equal(ready.ready,true,JSON.stringify(ready.needsInput));
  assert.equal(ready.participants.find(row=>row.id==='first').extensions.v5.combatInitiative.die,4);
  assert.equal(ready.participants.find(row=>row.id==='new-pj').extensions.v5.combatInitiative.die,6);
});
});

describe('Consommateurs de l horloge T1', () => {
const hero = () => ({id:'hero',name:'Héros',kind:'PJ',camp:'pj',zone:'active',initiative:40,hp:20,maxHp:20,
  caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},
  states:[{id:'broken',name:'Brisé',key:'brise',level:1}],skills:[],extensions:{v5:{}}});
const state = () => ({schemaVersion:3,reserve:[],log:[],diceLines:[],
  combat:{round:1,currentActorId:'hero',order:['hero'],participants:[hero()]},
  extensions:{v5:{combatId:'free',combatScopeId:'free-restart',turnIndex:1}}});

test('F2 T1 — les gardes de Prière reconnaissent les Actions enregistrées dans une occurrence redémarrée', () => {
  for (const scene of [null,{id:'scene',encounterId:'encounter',extensions:{v5:{combatScopeId:'scene-restart',turnIndex:1}}}]) {
    const envelope=state();if(scene)envelope.activeScene=scene;
    const clock=v5StoreActionClock(envelope);
    envelope.extensions.v5.standardTurnActions=[{actorId:'hero',actionId:'already-used',kind:'action',...clock}];
    assert.equal(wrathActionSpent(envelope,'hero'),true);
    assert.equal(wrathActionSpent(envelope,'other'),false);
  }
  const legacy=state();legacy.activeScene={id:'saved-scene',encounterId:'saved-encounter',extensions:{v5:{turnIndex:1}}};
  assert.equal(v5StoreActionClock(legacy).turnId,'saved-scene:1:hero','un scope libre ne modifie pas une ancienne scène chargée');
});

test('F2 T1 — Brisé peut finir son vrai Tour après attestation hors vue dans un combat redémarré', async () => {
  for (const scene of [null,{id:'scene',encounterId:'encounter',status:'active',round:1,currentActorId:'hero',order:['hero'],participants:[hero()],extensions:{v5:{combatScopeId:'scene-restart',turnIndex:1}}}]) {
    const store=createStore({storage:null});await store.ready;
    const envelope=state();if(scene)envelope.activeScene=scene;
    await store.loadFromJSON(envelope);
    assert.equal((await store.confirmBrokenEscapeVisibility({actorId:'hero',visibleToAnyEnemy:false})).status,'applied');
    const turn=previewV5Turn(JSON.parse(store.getFullJSON()));
    assert.equal(turn.ready,true,turn.error);
  }
});
});

describe('Caractérisation critique T2 bis', () => {
const participant = (id, initiative, extra = {}) => ({
  id, name: id.toUpperCase(), kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative,
  hp: 10, maxHp: 10, states: [], extensions: { v5: {}, ...extra }
});

async function runLegacyFumbleOrder(orderMode) {
  let saved;
  const persistence = {
    async load() { return saved && structuredClone(saved); },
    async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; }
  };
  const store = createStore({ persistence, storage: null });
  await store.ready;
  const fixture=orderMode==='manual'
    ?{order:['B','A'],currentActorId:'B',initiativeA:90,initiativeB:50,effectedId:'B',roundTwoActor:'A',roundFourActor:'B',undoActor:'A'}
    :{order:['B','A'],currentActorId:'A',initiativeA:80,initiativeB:60,effectedId:'A',roundTwoActor:'B',roundFourActor:'A',undoActor:'B'};
  await store.loadFromJSON({
    schemaVersion: 3, reserve: [], log: [], diceLines: [],
    combat: {
      round: 1, currentActorId: fixture.currentActorId, order: fixture.order, orderMode,
      participants: [
        participant('A', fixture.initiativeA, fixture.effectedId==='A'?{ v5: { combatEffects: [{ id: 'late', kind: 'acts-last-next-round', round: 2 }] } }:{}),
        participant('B', fixture.initiativeB, fixture.effectedId==='B'?{ v5: { combatEffects: [{ id: 'late', kind: 'acts-last-next-round', round: 2 }] } }: {})
      ]
    },
    extensions: { v5: {} }
  });
  const observed = [];
  for (let i = 0; i < 6; i++) {
    const combat = store.getCombat();
    observed.push(`${combat.round}:${combat.currentActorId}`);
    await store.nextTurn();
  }
  return {store, observed, sourceOrder:orderMode==='automatic'?['A','B']:fixture.order, fixture};
}

test('T2 bis — Store legacy automatic: la projection temporaire ne remplace pas le tri canonique', async () => {
  const {store, observed, sourceOrder}=await runLegacyFumbleOrder('automatic');
  assert.deepEqual(observed, ['1:A', '1:B', '2:B', '2:A', '3:A', '3:B']);
  assert.deepEqual(store.getCombat().order,sourceOrder);
});

test('T2 bis — Store legacy manual: la projection Round 2 ne remplace pas un ordre distinct de l’initiative', async () => {
  const {store, observed, sourceOrder}=await runLegacyFumbleOrder('manual');
  assert.deepEqual(observed, ['1:B', '1:A', '2:A', '2:B', '3:B', '3:A']);
  assert.deepEqual(store.getCombat().order,sourceOrder);
});

for (const orderMode of ['automatic','manual']) {
  test(`T2 bis — reload après le reorder ${orderMode} conserve position et ordre source`, async () => {
    let saved;
    const persistence={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
    const store=createStore({persistence,storage:null});await store.ready;
    const fixture=orderMode==='manual'?{order:['B','A'],currentActorId:'B',initiativeA:90,initiativeB:50,effectedId:'B',roundTwoActor:'A'}:{order:['B','A'],currentActorId:'A',initiativeA:80,initiativeB:60,effectedId:'A',roundTwoActor:'B'};
    await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:fixture.currentActorId,order:fixture.order,orderMode,participants:[participant('A',fixture.initiativeA,fixture.effectedId==='A'?{v5:{combatEffects:[{id:'late',kind:'acts-last-next-round',round:2}]}}:{}),participant('B',fixture.initiativeB,fixture.effectedId==='B'?{v5:{combatEffects:[{id:'late',kind:'acts-last-next-round',round:2}]}}:{})]},extensions:{v5:{}}});
    await store.nextTurn();await store.nextTurn();
    assert.equal(store.getCombat().round,2);
    assert.equal(store.getCombat().currentActorId,fixture.roundTwoActor);
    assert.deepEqual(store.getCombat().order,fixture.order);
    const reloaded=createStore({persistence,storage:null});await reloaded.ready;
    assert.equal(reloaded.getCombat().round,2);
    assert.equal(reloaded.getCombat().currentActorId,fixture.roundTwoActor);
    assert.deepEqual(reloaded.getCombat().order,fixture.order);
  });
}

for(const orderMode of ['automatic','manual'])test(`T2 bis — Undo/Redo du retour au Round 3 (${orderMode}) conserve l’ordre source`,async()=>{
  const {store,fixture}=await runLegacyFumbleOrder(orderMode);
  assert.equal(store.getCombat().round,4);
  await store.undo();assert.equal(store.getCombat().round,3);assert.equal(store.getCombat().currentActorId,fixture.undoActor);assert.deepEqual(store.getCombat().order,orderMode==='automatic'?['A','B']:fixture.order);
  await store.redo();assert.equal(store.getCombat().round,4);assert.equal(store.getCombat().currentActorId,fixture.roundFourActor);assert.deepEqual(store.getCombat().order,orderMode==='automatic'?['A','B']:fixture.order);
});
});

describe('Tour V5 lot2', () => {
function memory() {
  let state;
  return { load: async () => state && structuredClone(state), saveAtomic: async ({ state: next }) => { state = structuredClone(next); return { ok: true }; } };
}
const actor = (id, initiative, states = [], hp = 20) => ({ id, name: id, zone: 'active', initiative, hp, maxHp: 20, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states });
const state = participants => ({ localRevision: 8, combat: { round: 1, currentActorId: 'a', participants, order: ['a', 'b'] }, log: [], extensions: { v5: { turnIndex: 1 } } });

async function live(participants) {
  const persistence = memory(), store = createStore({ persistence }); await store.ready;
  for (const participant of participants) await store.addParticipant(participant);
  const engine = createCombatEngine(store); await engine.start();
  return { store, engine, persistence };
}

test('Lot2 Tour V5 — Hémorragique attend la fin du Round, pas chaque Tour', () => {
  const input = state([actor('a', 50, [{ name: 'Hémorragique', level: 2 }]), actor('b', 20)]);
  const first = previewV5Turn(input);
  assert.equal(first.ready, true);
  assert.equal(first.state.combat.participants[0].hp, 20);
  const second = previewV5Turn({ ...first.state, localRevision: 9 });
  assert.equal(second.ready, true);
  assert.equal(second.state.combat.participants[0].hp, 18);
  assert.equal(second.state.combat.round, 2);
  assert.equal(input.combat.participants[0].hp, 20);
});

test('Lot2 Tour V5 — échéance de l’auteur retire un effet de sa cible, durée historique reste sur son propre Tour', () => {
  const effect = createV5TimedEffect({ id: 'effect-author', name: 'Battement', level: 1 }, { authorId: 'a', targetId: 'b', expiry: { phase: 'endOfTurn', round: 1, turn: 1, actorId: 'a' } });
  const input = state([actor('a', 50), actor('b', 20, [effect, { id: 'legacy-target', name: 'Maison', duration: 2 }])]);
  const first = previewV5Turn(input);
  assert.equal(first.state.combat.participants[1].states.some(item => item.id === 'effect-author'), false);
  assert.equal(first.state.combat.participants[1].states.find(item => item.id === 'legacy-target').duration, 2);
  const second = previewV5Turn({ ...first.state, localRevision: 9 });
  assert.equal(second.state.combat.participants[1].states.find(item => item.id === 'legacy-target').duration, 1);
});

test('Lot2 Tour V5 — Aperçu déterministe sans tirage ni mutation, feu+poison en fin de Round', () => {
  const input = state([actor('a', 50, [{ name: 'Enflammé', level: 2 }, { name: 'Empoisonné', level: 1 }]), actor('b', 20)]);
  input.combat.currentActorId = 'b';
  const saved = Math.random; Math.random = () => { throw new Error('Aucun tirage dans le plan'); };
  try {
    const options = { inputs: { a: { fireRoll: 6 } } };
    const first = previewV5Turn(input, options), second = previewV5Turn(input, options);
    assert.deepEqual(first, second);
    assert.equal(first.state.combat.participants[0].hp, 15, '6+2-1-BE3 =4, puis poison1');
    assert.equal(input.combat.participants[0].hp, 20);
  } finally { Math.random = saved; }
});

test('Lot2 Tour V5 — jet manquant suspend toute transition, puis critique feu explicite >100 sans PV négatifs', async () => {
  const { store, engine } = await live([actor('a', 50, [{ name: 'Enflammé', level: 1 }], 1), actor('b', 20)]);
  await engine.nextTurn();
  const revision = store.getLocalRevision(), before = store.getFullJSON();
  const pending = await engine.nextTurn();
  assert.equal(pending.status, 'requires-input');
  assert.equal(pending.requests[0].field, 'fireRoll');
  assert.equal(store.getLocalRevision(), revision);
  assert.deepEqual(JSON.parse(store.getFullJSON()).combat, JSON.parse(before).combat);
  const critical = await engine.nextTurn({ baseRevision: revision, inputs: { a: { fireRoll: 8 } } });
  assert.equal(critical.status, 'requires-input');
  assert.ok(critical.requests.some(item => item.field === 'fireCriticalRoll' && item.bonus === 40));
  assert.equal(store.listParticipants().find(item => item.id === 'a').hp, 1);
  const applied = await engine.nextTurn({ baseRevision: revision, inputs: { a: { fireRoll: 8, fireCriticalRoll: 80 } } });
  assert.equal(applied.status, 'applied');
  assert.equal(store.listParticipants().find(item => item.id === 'a').hp, 0);
  assert.equal(store.getCombat().round, 2);
  const receipt = store.getLog().find(entry => entry.detail?.fireCritical);
  assert.equal(receipt.detail.fireCritical.severity, 120);
  assert.equal(receipt.detail.death, true);
});

test('Lot2 Tour V5 — un résultat de saignement à0 est explicite, annulation/rechargement restaurent horloge et Élan', async () => {
  const { store, engine, persistence } = await live([actor('a', 50, [{ name: 'Hémorragique', level: 1 }], 1), actor('b', 20)]);
  await store.updateParticipant('a', { extensions: { v5: { hasMomentum: true } } });
  await engine.nextTurn();
  const pending = await engine.nextTurn();
  assert.ok(pending.requests.some(item => item.field === 'bleedingEnduranceTest'));
  await engine.nextTurn({ baseRevision: pending.baseRevision, inputs: { a: { bleedingEnduranceTest: { success: false, sl: -1 } } } });
  assert.equal(store.listParticipants()[0].hp, 0);
  assert.ok(store.listParticipants()[0].states.some(item => item.key === 'inconscient'));
  assert.equal(store.listParticipants()[0].extensions.v5.hasMomentum, false);
  await store.undo();
  assert.equal(store.listParticipants()[0].hp, 1);
  assert.equal(store.listParticipants()[0].extensions.v5.hasMomentum, true);
  assert.equal(store.getCombat().round, 1);
  const reloaded = createStore({ persistence }); await reloaded.ready;
  assert.equal(reloaded.getCombat().round, 1);
  await reloaded.redo();
  assert.equal(reloaded.listParticipants()[0].hp, 0);
  assert.equal(reloaded.getCombat().round, 2);
});

test('Lot2 Tour V5 — contexte périmé n’applique aucun effet ni avancement', async () => {
  const { store, engine } = await live([actor('a', 50, [{ name: 'Enflammé', level: 1 }]), actor('b', 20)]);
  await engine.nextTurn(); const pending = await engine.nextTurn();
  await store.updateParticipant('b', { hp: 18 });
  assert.equal((await engine.nextTurn({ baseRevision: pending.baseRevision, inputs: { a: { fireRoll: 4 } } })).status, 'stale');
  assert.equal(store.getCombat().round, 1);
  assert.equal(store.listParticipants()[0].hp, 20);
});

test('Lot2 Store V5 — acquisition et récupération explicites, guérison réelle retire saignements ensemble', async () => {
  const { store } = await live([actor('a', 50), actor('b', 20)]);
  await store.acquireConditions('a', [{ name: 'À Terre' }, { name: 'À Terre' }]);
  assert.equal(store.listParticipants()[0].states.length, 1);
  await store.acquireConditions('a', [{ name: 'Sonné', level: 4 }]);
  assert.ok(store.listParticipants()[0].states.some(item => item.key === 'inconscient'));
  assert.ok(!store.listParticipants()[0].states.some(item => item.key === 'sonne'));
  await store.undo();
  const recovered = await store.recoverCondition('a', 'a-terre', { method: 'stand-up' });
  assert.equal(recovered.status, 'applied');
  await store.acquireConditions('a', [{ name: 'Hémorragique', level: 3 }]);
  await store.updateParticipant('a', { hp: 18 });
  await store.healWounds('a', 10);
  assert.equal(store.listParticipants()[0].hp, 20);
  assert.equal(store.listParticipants()[0].states.find(item => item.key === 'hemorragique').level, 1);
  await store.undo();
  assert.equal(store.listParticipants()[0].hp, 18);
  assert.equal(store.listParticipants()[0].states.find(item => item.key === 'hemorragique').level, 3);
});
});

describe('Tours P4c caractérisation', () => {
// Caractérisation (P4c) : ordre d'initiative, Tours et retraits de participants.
// Ces tests épinglent le comportement ACTUEL de la production ; aucun ne corrige le code.

function memoryPersistence() {
  let saved = null;
  return { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
}
const person = (id, initiative, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20, initiative,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 },
  skills: [], talents: [], traits: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: {} }, ...extra
});
// A(60) B(40) C(20) ; N(50) est ajouté en cours de Round.
async function fixture({ mode, current = 'A', round = 1 } = {}) {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round, currentActorId: current, order: ['A', 'B', 'C'], ...(mode ? { orderMode: mode } : {}), participants: [person('A', 60), person('B', 40), person('C', 20)] } });
  return store;
}
// Ajout « à la magie » : push direct, sans toucher à order ni à orderMode.
const summon = (store, participant) => store.executeCommand('summon-test', draft => ({ ...draft, combat: { ...draft.combat, participants: [...draft.combat.participants, participant] } }));
const full = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
const view = store => { const c = full(store).combat; return { round: c.round, current: c.currentActorId, order: c.order, mode: c.orderMode, ids: c.participants.map(p => p.id) }; };
const world = store => { const v = full(store); return { combat: v.combat, diceLines: v.diceLines }; };
const byId = (store, id) => full(store).combat.participants.find(p => p.id === id);
// Joue n Tours avec le moteur V5 ou le chemin legacy ; renvoie « round:acteur ».
async function play(store, engineName, n) {
  const engine = createCombatEngine(store), seq = [];
  for (let i = 0; i < n; i++) {
    if (engineName === 'v5') { const r = await engine.nextTurn(); assert.equal(r?.status, 'applied', JSON.stringify(r)); }
    else await store.nextTurn();
    const c = store.getCombat(); seq.push(`${c.round}:${c.currentActorId}`);
  }
  return seq;
}
async function scenario(mode, engineName, { current = 'A', before = 0, init = 50, turns = 5 } = {}) {
  const store = await fixture({ mode, current });
  await play(store, engineName, before);
  await summon(store, person('N', init));
  return { store, seq: await play(store, engineName, turns) };
}
// Créature auxiliaire X liée à son auteur B (même marquage que la magie : couche d'effet + summon*).
const AUX_LAYER = { id: 'fx1', castExecutionId: 'cast1', spellId: 'spell-x', casterId: 'B', name: 'Invocation' };
const auxiliary = (id, init) => person(id, init, { extensions: { v5: { summonCastExecutionId: 'cast1', summonOwnerId: 'B', summonedBySpellId: 'spell-x' } } });
const summonAux = store => store.executeCommand('summon-aux-test', draft => ({ ...draft, combat: { ...draft.combat,
  participants: draft.combat.participants.map(p => p.id === 'B' ? { ...p, extensions: { ...p.extensions, v5: { ...p.extensions.v5, spellEffects: [AUX_LAYER] } } } : p).concat([auxiliary('X', 50)]) } }));

// ---------------------------------------------------------------- C4 : ajout en milieu de Round
test('C4 — push direct : N reste hors de order ; ordre effectif automatique = rang d’initiative, manuel = fin de piste', async () => {
  const auto = await fixture({ current: 'B' }); await summon(auto, person('N', 50));
  assert.deepEqual(auto.getCombat().order, ['A', 'B', 'C']);
  assert.deepEqual(auto.getEffectiveOrder(), ['A', 'N', 'B', 'C']);
  assert.equal(auto.getOrderMode(), 'automatic');
  assert.deepEqual(auto.listParticipants().map(p => p.id), ['A', 'B', 'C', 'N'], 'listParticipants : ordre stocké puis hors-ordre');
  const manual = await fixture({ mode: 'manual', current: 'B' }); await summon(manual, person('N', 50));
  assert.deepEqual(manual.getCombat().order, ['A', 'B', 'C']);
  assert.deepEqual(manual.getEffectiveOrder(), ['A', 'B', 'C', 'N']);
  assert.equal(manual.getOrderMode(), 'manual');
});

for (const engineName of ['v5', 'legacy']) {
  test(`C4 ${engineName} — automatique, N(50) ajouté pendant le Tour de B (déjà passé) : N rate le Round, agit au suivant à son rang`, async () => {
    const { store, seq } = await scenario('automatic', engineName, { current: 'B', turns: 5 });
    assert.deepEqual(seq, ['1:C', '2:A', '2:N', '2:B', '2:C']);
    assert.deepEqual(store.getCombat().order, ['A', 'N', 'B', 'C'], 'le premier Tour matérialise l’ordre effectif dans order');
    assert.equal(store.getOrderMode(), 'automatic');
  });
  test(`C4 ${engineName} — automatique, N(50) ajouté pendant le Tour de A (premier) : N joue juste après A, au même Round`, async () => {
    const { seq } = await scenario('automatic', engineName, { current: 'A', turns: 5 });
    assert.deepEqual(seq, ['1:N', '1:B', '1:C', '2:A', '2:N']);
  });
  test(`C4 ${engineName} — automatique, N(10) plus lent que tous : fin de Round`, async () => {
    const { seq } = await scenario('automatic', engineName, { init: 10, turns: 5 });
    assert.deepEqual(seq, ['1:B', '1:C', '1:N', '2:A', '2:B']);
  });
  test(`C4 ${engineName} — automatique, N(70) ajouté pendant le dernier Tour (C) : N ouvre le Round suivant`, async () => {
    const { store, seq } = await scenario('automatic', engineName, { current: 'C', init: 70, turns: 4 });
    assert.deepEqual(seq, ['2:N', '2:A', '2:B', '2:C']);
    assert.deepEqual(store.getCombat().order, ['N', 'A', 'B', 'C']);
  });
  test(`C4 ${engineName} — manuel : N s’ajoute en fin de piste, quel que soit son rang d’initiative`, async () => {
    for (const [current, init, expected] of [['A', 50, ['1:B', '1:C', '1:N', '2:A', '2:B']], ['C', 70, ['1:N', '2:A', '2:B', '2:C']]]) {
      const { store, seq } = await scenario('manual', engineName, { current, init, turns: expected.length });
      assert.deepEqual(seq, expected);
      assert.deepEqual(store.getCombat().order, ['A', 'B', 'C', 'N']);
      assert.equal(store.getOrderMode(), 'manual', 'le mode manuel n’est pas modifié par les Tours');
    }
  });
}

test('C4 DIFFÉRENCE V5/legacy — N ajouté après un Tour déjà joué du Round (automatique) : V5 gèle l’ordre du Round, legacy recalcule à chaque Tour', async () => {
  const v5 = await scenario('automatic', 'v5', { current: 'A', before: 1, turns: 5 });
  const legacy = await scenario('automatic', 'legacy', { current: 'A', before: 1, turns: 5 });
  assert.deepEqual(v5.seq, ['1:C', '1:N', '2:A', '2:N', '2:B'], 'V5 : N(50) est placé en fin de Round 1 (ordre gelé, piste manuelle du Round)');
  assert.deepEqual(legacy.seq, ['1:C', '2:A', '2:N', '2:B', '2:C'], 'legacy : N(50) est au-dessus de B déjà passé, donc raté au Round 1');
  assert.deepEqual(v5.store.getCombat().order, ['A', 'N', 'B', 'C'], 'le recalcul au changement de Round réintègre N à son rang');
});

test('C4 DIFFÉRENCE V5/legacy — N ajouté en plein Round 2 : V5 après C (ordre gelé), legacy tout de suite à son rang', async () => {
  const v5 = await scenario('automatic', 'v5', { current: 'A', before: 3, turns: 5 });
  const legacy = await scenario('automatic', 'legacy', { current: 'A', before: 3, turns: 5 });
  assert.deepEqual(v5.seq, ['2:B', '2:C', '2:N', '3:A', '3:N']);
  assert.deepEqual(legacy.seq, ['2:N', '2:B', '2:C', '3:A', '3:N']);
});

test('C4 V5 — orderRound : le Tour V5 marque le Round de l’ordre ; legacy ne le pose pas', async () => {
  const v5 = await fixture({ current: 'A' });
  assert.equal(full(v5).extensions.v5.orderRound, undefined);
  await play(v5, 'v5', 1); assert.equal(full(v5).extensions.v5.orderRound, 1);
  await play(v5, 'v5', 2); assert.equal(full(v5).extensions.v5.orderRound, 2, 'orderRound suit le Round de la transition');
  const legacy = await fixture({ current: 'A' }); await play(legacy, 'legacy', 4);
  assert.equal(full(legacy).extensions.v5.orderRound, undefined);
});

test('C4 V5 — l’ordre effectif du Store suit orderRound : une fois posé pour le Round courant, il est manuel (N en fin) ; au Round suivant, par initiative', async () => {
  const store = await fixture({ current: 'A' });
  await play(store, 'v5', 1); // A -> B, orderRound = 1, order = A,B,C
  await summon(store, person('N', 50));
  assert.equal(store.getOrderMode(), 'automatic');
  assert.deepEqual(store.getEffectiveOrder(), ['A', 'B', 'C', 'N']);
  assert.deepEqual(await play(store, 'v5', 3), ['1:C', '1:N', '2:A']);
  assert.deepEqual(store.getEffectiveOrder(), ['A', 'N', 'B', 'C']);
});

test('C4 previewV5Turn pur — transition calculée sur l’état fourni sans le muter ; N (automatique, courant A) est le prochain acteur', async () => {
  const store = await fixture({ current: 'A' }); await summon(store, person('N', 50));
  const state = full(store), frozen = structuredClone(state);
  const preview = previewV5Turn(state);
  assert.equal(preview.ready, true, JSON.stringify(preview.requests));
  assert.equal(preview.transition.currentActorId, 'N');
  assert.equal(preview.transition.round, 1);
  assert.deepEqual(preview.transition.order, ['A', 'N', 'B', 'C']);
  assert.deepEqual(state, frozen, 'l’état passé n’est pas muté');
  assert.equal(preview.baseRevision, state.localRevision);
  assert.equal(preview.state.combat.currentActorId, 'N');
  assert.equal(preview.state.extensions.v5.turnIndex, 2);
  assert.equal(preview.state.extensions.v5.orderRound, 1);
});

test('C4 previewV5Turn — Round 0 : idle, rien n’est calculé', async () => {
  const store = await fixture({ round: 0, current: null });
  const preview = previewV5Turn(full(store));
  assert.equal(preview.status, 'idle'); assert.equal(preview.ready, false); assert.deepEqual(preview.requests, []);
});

test('C4 previewV5Turn — au changement de Round, N rapide ouvre le Round (ordre recalculé, acteur = premier)', async () => {
  const store = await fixture({ current: 'C' }); await summon(store, person('N', 99));
  const preview = previewV5Turn(full(store));
  assert.equal(preview.transition.round, 2);
  assert.equal(preview.transition.currentActorId, 'N');
  assert.deepEqual(preview.transition.order, ['N', 'A', 'B', 'C']);
});

test('C4 nextTurnV5 — une baseRevision périmée est refusée sans rien appliquer', async () => {
  const store = await fixture({ current: 'A' }); await summon(store, person('N', 50));
  const engine = createCombatEngine(store), stale = store.getLocalRevision();
  await store.updateParticipant('B', { hp: 19 });
  const afterUpdate = world(store);
  assert.deepEqual(await engine.nextTurn({ baseRevision: stale }), { status: 'stale', requiresPreview: true });
  assert.deepEqual(world(store), afterUpdate);
  const ok = await engine.nextTurn({ baseRevision: store.getLocalRevision() });
  assert.equal(ok.status, 'applied'); assert.equal(store.getCombat().currentActorId, 'N');
});

test('C4 journal — le Tour V5 écrit « ▶ Tour de … », le chemin legacy n’écrit aucune entrée de gestion', async () => {
  const v5 = await fixture({ current: 'A' }); await play(v5, 'v5', 1);
  assert.match(full(v5).log[0].text, /^▶ Tour de B$/);
  const legacy = await fixture({ current: 'A' }); await play(legacy, 'legacy', 1);
  assert.equal(full(legacy).log.some(entry => /Tour de/.test(entry.text || '')), false);
});

// ---------------------------------------------------------------- removeFromCombat / setOrderMode / moveParticipant / insertReinforcement
test('removeFromCombat pur — acteur courant retiré : la main passe au suivant de order (circulaire), sans changer de Round', () => {
  const participants = [person('A', 60), person('B', 40), person('C', 20)];
  assert.deepEqual(removeFromCombat({ participants, order: ['A', 'B', 'C'], currentActorId: 'B', participantId: 'B' }), { order: ['A', 'C'], currentActorId: 'C' });
  assert.deepEqual(removeFromCombat({ participants, order: ['A', 'B', 'C'], currentActorId: 'C', participantId: 'C' }), { order: ['A', 'B'], currentActorId: 'A' }, 'dernier de la piste : retour au premier');
  assert.deepEqual(removeFromCombat({ participants, order: ['A', 'B', 'C'], currentActorId: 'A', participantId: 'C' }), { order: ['A', 'B'], currentActorId: 'A' });
  assert.deepEqual(removeFromCombat({ participants: [person('A', 60)], order: ['A'], currentActorId: 'A', participantId: 'A' }), { order: [], currentActorId: null });
  assert.deepEqual(removeFromCombat({ participants, order: ['A', 'B', 'C'], currentActorId: 'B', participantId: 'ghost' }), { order: ['A', 'B', 'C'], currentActorId: 'B' });
});

for (const mode of ['automatic', 'manual']) {
  test(`removeParticipant (${mode}) — l’acteur courant retiré passe la main au suivant de order ; N (hors order) n’est jamais choisi`, async () => {
    const store = await fixture({ mode, current: 'B' }); await summon(store, person('N', 50));
    await store.removeParticipant('B');
    assert.deepEqual(view(store), { round: 1, current: 'C', order: ['A', 'C'], mode, ids: ['A', 'C', 'N'] });
    assert.match(full(store).log[0].text, /Combat: retiré B/);
  });
  test(`removeParticipant (${mode}) — dernier acteur retiré : retour au premier, Round inchangé`, async () => {
    const store = await fixture({ mode, current: 'C' }); await summon(store, person('N', 50));
    await store.removeParticipant('C');
    assert.deepEqual(view(store), { round: 1, current: 'A', order: ['A', 'B'], mode, ids: ['A', 'B', 'N'] });
  });
  test(`removeParticipant (${mode}) — retirer N ne touche ni order, ni acteur courant, ni mode`, async () => {
    const store = await fixture({ mode, current: 'B' }); await summon(store, person('N', 50));
    await store.removeParticipant('N');
    assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'B', 'C'], mode, ids: ['A', 'B', 'C'] });
  });
}

test('removeParticipant — identifiant inconnu : aucune commande, état et révision inchangés', async () => {
  const store = await fixture({ current: 'B' }); const before = world(store), rev = store.getLocalRevision();
  assert.equal(await store.removeParticipant('ghost'), undefined);
  assert.deepEqual(world(store), before); assert.equal(store.getLocalRevision(), rev);
});

test('removeParticipant d’un participant du banc : order nettoyé, acteur courant inchangé', async () => {
  const store = await fixture({ current: 'B' });
  await store.moveParticipant('C', 'bench');
  await store.removeParticipant('C');
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'B'], mode: 'automatic', ids: ['A', 'B'] });
});

test('removeParticipant — retire ses lignes de dés et vide la cible des lignes qui le visaient', async () => {
  const store = await fixture({ current: 'A' });
  await store.addDiceLine({ id: 'own', participantId: 'B', type: 'attack', attr: 'CC', base: 40 });
  await store.addDiceLine({ id: 'aimed', participantId: 'A', type: 'attack', attr: 'CC', base: 40, targetId: 'B' });
  await store.removeParticipant('B');
  const lines = full(store).diceLines;
  assert.deepEqual(lines.map(l => l.id), ['aimed']);
  assert.equal(lines[0].targetId, null);
});

test('setOrderMode — passer en manuel fige order = ancien order + hors-ordre en fin : N, 2e en automatique, passe dernier (surprenant)', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  assert.deepEqual(store.getEffectiveOrder(), ['A', 'N', 'B', 'C']);
  assert.deepEqual(await store.setOrderMode('manual'), { ok: true });
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'B', 'C', 'N'], mode: 'manual', ids: ['A', 'B', 'C', 'N'] });
  await store.setOrderMode('automatic');
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'N', 'B', 'C'], mode: 'automatic', ids: ['A', 'B', 'C', 'N'] });
});

test('setOrderMode — ne passe pas le Tour : round, acteur courant et turnIndex inchangés', async () => {
  const store = await fixture({ current: 'B' }); const turnIndex = full(store).extensions.v5.turnIndex;
  await store.setOrderMode('manual'); await store.setOrderMode('automatic');
  assert.equal(store.getCombat().round, 1); assert.equal(store.getCombat().currentActorId, 'B');
  assert.equal(full(store).extensions.v5.turnIndex, turnIndex);
});

test('setOrderMode pur — acteur courant absent de la piste : bascule sur le premier ; piste vide : null', () => {
  const participants = [person('A', 60), person('B', 40)];
  assert.deepEqual(pureSetOrderMode(participants, { mode: 'automatic', order: ['B', 'A'], currentActorId: 'ghost' }), { mode: 'automatic', order: ['A', 'B'], currentActorId: 'A' });
  assert.deepEqual(pureSetOrderMode([], { mode: 'manual', order: [], currentActorId: 'A' }), { mode: 'manual', order: [], currentActorId: null });
});

test('moveParticipant — banc puis retour actif sans beforeId, automatique : rang d’initiative, mode conservé', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  await store.moveParticipant('N', 'bench');
  assert.deepEqual(view(store).order, ['A', 'B', 'C', 'N']);
  await store.moveParticipant('N', 'active');
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'N', 'B', 'C'], mode: 'automatic', ids: ['A', 'B', 'C', 'N'] });
});

test('moveParticipant — retour actif avec beforeId : place choisie et bascule persistante en MANUEL', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  await store.moveParticipant('N', 'bench');
  await store.moveParticipant('N', 'active', 'C');
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'B', 'N', 'C'], mode: 'manual', ids: ['A', 'B', 'C', 'N'] });
  assert.equal(store.getOrderMode(), 'manual');
  assert.deepEqual(await play(store, 'v5', 2), ['1:N', '1:C']);
});

test('moveParticipant — en manuel sans beforeId, le participant activé va en fin de piste active', async () => {
  const store = await fixture({ mode: 'manual', current: 'B' });
  await store.moveParticipant('A', 'bench');
  await store.moveParticipant('A', 'active');
  assert.deepEqual(view(store).order, ['B', 'C', 'A']);
  assert.equal(view(store).mode, 'manual');
});

test('moveParticipant — mettre l’acteur courant au banc ne recalcule pas currentActorId (surprenant)', async () => {
  const store = await fixture({ current: 'B' });
  await store.moveParticipant('B', 'bench');
  const v = view(store);
  assert.equal(v.current, 'B', 'currentActorId reste sur un participant du banc');
  assert.deepEqual(v.order, ['A', 'C', 'B']);
});

test('moveInOrder sur N hors de order : order inchangé mais bascule quand même en MANUEL (surprenant)', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  assert.deepEqual(await store.moveInOrder('N', 'A'), { ok: true });
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'B', 'C'], mode: 'manual', ids: ['A', 'B', 'C', 'N'] });
  assert.deepEqual(store.getEffectiveOrder(), ['A', 'B', 'C', 'N']);
});

test('moveInOrder sur un participant de la piste : déplacement avant la cible et MANUEL', async () => {
  const store = await fixture({ current: 'B' });
  await store.moveInOrder('C', 'A');
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['C', 'A', 'B'], mode: 'manual', ids: ['A', 'B', 'C'] });
  assert.equal(await store.moveInOrder('ghost', 'A'), false);
});

test('insertReinforcement — N va juste après l’acteur courant ; la bascule en MANUEL est persistante (Tours et Rounds suivants)', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  assert.equal(store.getOrderMode(), 'automatic');
  await store.insertReinforcement('N');
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'B', 'N', 'C'], mode: 'manual', ids: ['A', 'B', 'C', 'N'] });
  assert.deepEqual(await play(store, 'v5', 6), ['1:N', '1:C', '2:A', '2:B', '2:N', '2:C']);
  assert.equal(store.getOrderMode(), 'manual', 'ne revient jamais seul en automatique');
});

test('insertReinforcement — legacy : même résultat que V5 une fois en manuel', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  await store.insertReinforcement('N');
  assert.deepEqual(await play(store, 'legacy', 6), ['1:N', '1:C', '2:A', '2:B', '2:N', '2:C']);
});

test('insertReinforcement — sans acteur courant : ajouté en fin de piste ; identifiant inconnu : refusé', async () => {
  const store = await fixture({ round: 0, current: null }); await summon(store, person('N', 50));
  await store.insertReinforcement('N');
  assert.deepEqual(view(store).order, ['A', 'B', 'C', 'N']);
  assert.equal(view(store).mode, 'manual');
  assert.equal(await store.insertReinforcement('ghost'), false);
});

test('insertReinforcement — un participant déjà en piste est déplacé (pas dupliqué) après l’acteur courant', async () => {
  const store = await fixture({ current: 'A' });
  await store.insertReinforcement('C');
  assert.deepEqual(view(store).order, ['A', 'C', 'B']);
});

test('setOrderMode automatique après insertReinforcement : retrie par initiative, N repasse à son rang', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 10));
  await store.insertReinforcement('N');
  assert.deepEqual(view(store).order, ['A', 'B', 'N', 'C']);
  await store.setOrderMode('automatic');
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'B', 'C', 'N'], mode: 'automatic', ids: ['A', 'B', 'C', 'N'] });
});

// ---------------------------------------------------------------- C5 : retraits, reset, restart, scènes
test('C5 removeParticipant d’une créature auxiliaire : retirée seule, la couche d’effet de l’auteur reste (orpheline)', async () => {
  const store = await fixture({ current: 'A' }); await summonAux(store);
  assert.deepEqual(view(store).ids, ['A', 'B', 'C', 'X']);
  await store.removeParticipant('X');
  assert.deepEqual(view(store), { round: 1, current: 'A', order: ['A', 'B', 'C'], mode: 'automatic', ids: ['A', 'B', 'C'] });
  assert.deepEqual(byId(store, 'B').extensions.v5.spellEffects.map(e => e.id), ['fx1'], 'aucun nettoyage de la couche de l’auteur');
});

test('C5 removeParticipant de l’auteur : la créature auxiliaire disparaît dans la même commande (une seule annulation la ramène)', async () => {
  const store = await fixture({ current: 'A' }); await summonAux(store);
  const before = world(store);
  await store.removeParticipant('B');
  assert.deepEqual(view(store).ids, ['A', 'C']);
  assert.deepEqual(view(store).order, ['A', 'C']);
  await store.undo();
  assert.deepEqual(world(store), before);
  assert.deepEqual(view(store).ids, ['A', 'B', 'C', 'X']);
});

test('C5 removeParticipant de l’auteur qui est l’acteur courant : la main passe à C, X (hors order) n’hérite pas du Tour', async () => {
  const store = await fixture({ current: 'B' }); await summonAux(store);
  await store.removeParticipant('B');
  assert.deepEqual(view(store), { round: 1, current: 'C', order: ['A', 'C'], mode: 'automatic', ids: ['A', 'C'] });
});

test('C5 une créature auxiliaire sans couche d’auteur est supprimée dès la commande suivante (nettoyage automatique)', async () => {
  const store = await fixture({ current: 'A' });
  await summon(store, auxiliary('X', 50)); // marquée summon*, mais B n’a aucune couche
  assert.deepEqual(view(store).ids, ['A', 'B', 'C'], 'removeExpiredSummons est appliqué dans la commande même');
});

test('C5 resetCombat — vide combat et lignes de dés, journalise ; orderMode et turnIndex ne sont PAS réinitialisés (surprenant) ; annulable', async () => {
  const store = await fixture({ mode: 'manual', current: 'A' }); await summon(store, person('N', 50));
  await store.addDiceLine({ id: 'd1', participantId: 'N', type: 'attack', attr: 'CC', base: 40 });
  await play(store, 'v5', 2);
  const before = world(store), turnIndex = full(store).extensions.v5.turnIndex;
  assert.equal(turnIndex, 3);
  await store.resetCombat();
  assert.deepEqual(view(store), { round: 0, current: null, order: [], mode: 'manual', ids: [] });
  assert.deepEqual(full(store).diceLines, []);
  assert.equal(full(store).extensions.v5.turnIndex, 3);
  assert.equal(full(store).log[0].text, 'Combat terminé.');
  await store.undo();
  assert.deepEqual(world(store), before);
});

test('C5 resetCombat sans combat : commande valide, journal « Combat terminé. »', async () => {
  const store = await fixture({ round: 0, current: null });
  await store.resetCombat(); await store.resetCombat();
  assert.deepEqual(view(store).ids, []);
  assert.equal(full(store).log.filter(e => e.text === 'Combat terminé.').length, 2);
});

test('C5 restartCombat SANS scène — participants (dont N) et leurs extensions CONSERVÉS ; PV max, états vidés, Round 0, order et mode inchangés', async () => {
  const store = await fixture({ mode: 'manual', current: 'B' });
  await summon(store, person('N', 50, { hp: 3, states: [{ key: 'sonne', name: 'Sonné', level: 1 }], extensions: { v5: { marqueur: 'conserve', spellEffects: [{ id: 'fxN', spellId: 'spell-y' }] } } }));
  await play(store, 'v5', 2);
  await store.restartCombat();
  const v = view(store);
  assert.equal(v.round, 0); assert.equal(v.current, null);
  assert.deepEqual(v.ids, ['A', 'B', 'C', 'N'], 'N survit au redémarrage sans scène');
  assert.equal(v.mode, 'manual', 'orderMode conservé');
  assert.deepEqual(v.order, ['A', 'B', 'C', 'N'], 'les Tours joués avaient matérialisé N dans order ; restart ne le touche pas');
  const n = byId(store, 'N');
  assert.equal(n.hp, 20); assert.deepEqual(n.states, []);
  assert.equal(n.extensions.v5.marqueur, 'conserve');
  assert.deepEqual(n.extensions.v5.spellEffects.map(e => e.id), ['fxN'], 'les effets magiques ne sont pas purgés');
  assert.equal(full(store).extensions.v5.turnIndex, 1);
  assert.match(full(store).log[0].text, /Combat recommencé : PV remis au maximum\./);
});

test('C5 restartCombat sans scène — annulable ; combat vide : erreur explicite', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50, { hp: 4 }));
  const before = world(store);
  await store.restartCombat();
  assert.equal(byId(store, 'N').hp, 20);
  await store.undo();
  assert.deepEqual(world(store), before);
  const empty = await fixture({ round: 0, current: null });
  await empty.resetCombat();
  assert.throws(() => empty.restartCombat(), /Aucun combat à recommencer/);
});

async function sceneFixture() {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'garde', name: 'Garde', hp: 12, initiative: 30 });
  await store.addProfile({ id: 'archer', name: 'Archer', hp: 8, initiative: 50 });
  await store.saveEncounter({ id: 'rencontre', title: 'Cour', entries: [
    { id: 'e1', profileId: 'garde', quantity: 1, zone: 'active' }, { id: 'e2', profileId: 'archer', quantity: 1, zone: 'active' }] });
  await store.launchEncounter('rencontre');
  const ids = store.listParticipants().map(p => p.id);
  await store.setRoundTurn(1, ids[0]);
  return { store, ids };
}

test('C5 restartCombat AVEC scène — tout est reconstruit : N et ses extensions disparaissent, ordre et mode remis au lancement', async () => {
  const { store, ids } = await sceneFixture();
  await summon(store, person('N', 99, { extensions: { v5: { marqueur: 'conserve' } } }));
  await store.moveInOrder(ids[0], null); // bascule en MANUEL
  assert.equal(store.getOrderMode(), 'manual');
  assert.ok(store.listParticipants().some(p => p.id === 'N'));
  const sceneId = store.getActiveScene().id, before = world(store);
  await store.restartCombat();
  assert.equal(store.listParticipants().some(p => p.id === 'N'), false);
  assert.deepEqual(store.listParticipants().map(p => p.profileId).sort(), ['archer', 'garde']);
  assert.equal(view(store).ids.some(id => ids.includes(id)), false, 'les participants sont recréés avec de NOUVEAUX identifiants');
  assert.equal(view(store).round, 0); assert.equal(view(store).current, null);
  assert.equal(store.getOrderMode(), 'automatic');
  assert.equal(store.getActiveScene().id, sceneId);
  assert.deepEqual(store.getCombat().order, store.getActiveScene().order);
  await store.undo();
  assert.deepEqual(world(store), before);
  assert.ok(store.listParticipants().some(p => p.id === 'N'), 'l’annulation ramène N et son état');
});

test('C5 suspension puis reprise de scène avec N ajouté : N part avec la scène et revient, combat vidé entre-temps', async () => {
  const { store, ids } = await sceneFixture();
  await summon(store, person('N', 99, { extensions: { v5: { marqueur: 'conserve' } } }));
  await store.updateParticipant(ids[1], { hp: 5 }); // force la synchronisation scène <- combat
  assert.ok(store.getActiveScene().participants.some(p => p.id === 'N'), 'la scène suit les participants du combat');
  await store.suspendActiveScene();
  assert.equal(store.getActiveScene(), null);
  assert.deepEqual(view(store), { round: 0, current: null, order: [], mode: view(store).mode, ids: [] });
  const suspended = store.listSuspendedScenes();
  assert.equal(suspended.length, 1);
  assert.ok(suspended[0].participants.some(p => p.id === 'N'));
  assert.equal(store.listEncounters()[0].status, 'suspended');
  await store.resumeScene(suspended[0].id);
  assert.equal(store.listSuspendedScenes().length, 0);
  assert.equal(store.listEncounters()[0].status, 'active');
  assert.ok(view(store).ids.includes('N'));
  assert.equal(byId(store, 'N').extensions.v5.marqueur, 'conserve');
  assert.equal(byId(store, ids[1]).hp, 5);
  assert.equal(store.getCombat().round, 1);
});

test('C5 suspendActiveScene sans scène : erreur ; resumeScene inconnue : erreur', async () => {
  const store = await fixture({ current: 'A' });
  assert.throws(() => store.suspendActiveScene(), /Aucune scène active/);
  assert.throws(() => store.resumeScene('fantome'), /Scène suspendue introuvable/);
});

test('C5 deleteEncounter — purge lignes de dés (et cibles) des participants de la scène, journal de la rencontre, vide le combat ; le journal étranger reste', async () => {
  const { store, ids } = await sceneFixture();
  await store.addDiceLine({ id: 'own', participantId: ids[0], type: 'attack', attr: 'CC', base: 40 });
  await store.addDiceLine({ id: 'aimed', participantId: 'etranger', type: 'attack', attr: 'CC', base: 40, targetId: ids[1] });
  await store.log({ id: 'l-scene', kind: 'management', actorId: ids[0], actorName: 'Garde', text: 'dans la scène' });
  await store.log({ id: 'l-autre', kind: 'management', actorId: 'etranger', actorName: 'Autre', encounterId: 'autre-rencontre', text: 'hors scène' });
  await store.log({ id: 'l-orphelin', kind: 'management', actorId: 'etranger', actorName: 'Autre', text: 'écrit pendant la scène sans étiquette' });
  await store.deleteEncounter('rencontre');
  const state = full(store);
  assert.equal(store.getActiveScene(), null);
  assert.deepEqual(store.listEncounters(), []);
  assert.deepEqual(view(store).ids, []);
  assert.deepEqual(state.diceLines.map(l => l.id), ['aimed']);
  assert.equal(state.diceLines[0].targetId, null);
  assert.equal(state.log.some(e => e.text === 'dans la scène'), false);
  assert.equal(state.log.some(e => e.text === 'hors scène'), true, 'une entrée étiquetée d’une autre rencontre reste');
  assert.equal(state.log.some(e => /sans étiquette/.test(e.text)), false, 'toute entrée écrite pendant la scène est étiquetée de sa rencontre (tagNewEncounterLogs), donc purgée (surprenant)');
});

test('C5 deleteEncounter d’une rencontre non lancée : seule la rencontre part, le combat en cours est intact', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  await store.saveEncounter({ id: 'libre', title: 'Libre', entries: [] });
  const before = view(store);
  await store.deleteEncounter('libre');
  assert.deepEqual(store.listEncounters(), []);
  assert.deepEqual(view(store), before);
});

// ---------------------------------------------------------------- C6 : Undo / Redo / historique
test('C6 Undo/Redo en chaîne sur 3 commandes (ajout de N, retrait de B, passage en manuel) : état identique à chaque étape', async () => {
  const store = await fixture({ current: 'B' });
  const s0 = world(store);
  await summon(store, person('N', 50)); const s1 = world(store);
  await store.removeParticipant('B'); const s2 = world(store);
  await store.setOrderMode('manual'); const s3 = world(store);
  assert.deepEqual(view(store), { round: 1, current: 'C', order: ['A', 'C', 'N'], mode: 'manual', ids: ['A', 'C', 'N'] });
  assert.notDeepEqual(s1, s2); assert.notDeepEqual(s2, s3);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s2);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s1);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s0);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s1);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s2);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s3);
  assert.equal(await store.redo(), false, 'plus rien à rejouer');
  // Undo/Redo entremêlés
  await store.undo(); await store.undo(); await store.redo(); assert.deepEqual(world(store), s2);
});

test('C6 le journal est hors Undo/Redo : l’entrée « retiré B » survit à l’annulation du retrait', async () => {
  const store = await fixture({ current: 'B' });
  await store.removeParticipant('B');
  await store.undo();
  assert.deepEqual(view(store).ids, ['A', 'B', 'C']);
  assert.match(full(store).log[0].text, /Combat: retiré B/);
  await store.redo();
  assert.equal(full(store).log.filter(e => /Combat: retiré B/.test(e.text)).length, 1, 'le Redo n’ajoute pas de doublon');
});

test('C6 Undo/Redo — la révision locale avance à chaque Undo/Redo, jamais en arrière', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  const r0 = store.getLocalRevision();
  await store.undo(); const r1 = store.getLocalRevision();
  await store.redo(); const r2 = store.getLocalRevision();
  assert.ok(r1 > r0); assert.ok(r2 > r1);
});

test('C6 une nouvelle commande après Undo purge le Redo', async () => {
  const store = await fixture({ current: 'B' });
  await summon(store, person('N', 50));
  await store.removeParticipant('B');
  await store.undo(); await store.undo();
  assert.deepEqual(view(store).ids, ['A', 'B', 'C']);
  await store.updateParticipant('A', { hp: 7 });
  assert.equal(await store.redo(), false);
  assert.deepEqual(view(store).ids, ['A', 'B', 'C'], 'N, annulé puis écrasé, ne revient pas');
  assert.equal(byId(store, 'A').hp, 7);
});

test('C6 Undo sans historique (rien après le chargement) : jamais d’exception, et on ne remonte pas avant le chargement', async () => {
  const store = await fixture({ current: 'B' });
  while (await store.undo());
  assert.equal(await store.undo(), false);
  assert.equal(await store.redo() === true, true, 'le chargement initial est lui-même une commande annulable');
});

test('C6 Undo d’un Tour V5 après ajout de N : retour à l’acteur et au turnIndex précédents', async () => {
  const store = await fixture({ current: 'A' }); await summon(store, person('N', 50));
  const before = world(store), ext = full(store).extensions.v5.turnIndex;
  await play(store, 'v5', 1);
  assert.equal(store.getCombat().currentActorId, 'N');
  await store.undo();
  assert.deepEqual(world(store), before);
  assert.equal(full(store).extensions.v5.turnIndex, ext);
  assert.equal(full(store).extensions.v5.orderRound, undefined);
});

test('C6 historique pur — rognage à 50 commandes, le plus récent est conservé', () => {
  let history = createHistory();
  const command = i => ({ id: 'c' + i, type: 'x', inverse: { state: { i: i - 1 } }, result: { state: { i } } });
  for (let i = 1; i <= 60; i++) history = recordCommand(history, command(i));
  assert.equal(MAX_HISTORY_COMMANDS, 50);
  assert.equal(history.past.length, 50);
  assert.equal(history.past.at(-1).result.state.i, 60);
  assert.equal(history.past[0].result.state.i, 11);
});

test('C6 historique pur — rognage par octets (2 Mo) : les plus anciennes commandes partent d’abord ; une commande seule trop grosse est refusée', () => {
  assert.equal(DEFAULT_HISTORY_MAX_BYTES, 2 * 1024 * 1024);
  const blob = 'x'.repeat(400000);
  let history = createHistory();
  for (let i = 1; i <= 6; i++) history = recordCommand(history, { id: 'c' + i, type: 'x', inverse: { state: { i: i - 1 } }, result: { state: { i, blob } } });
  assert.ok(history.past.length < 6 && history.past.length >= 1);
  assert.equal(history.past.at(-1).result.state.i, 6);
  assert.ok(Buffer.byteLength(JSON.stringify(history.past)) <= DEFAULT_HISTORY_MAX_BYTES);
  assert.throws(() => recordCommand(createHistory(), { id: 'big', type: 'x', inverse: { state: {} }, result: { state: { blob: 'x'.repeat(2 * 1024 * 1024) } } }), /trop volumineuse/);
});

test('C6 Store — 60 commandes : seules les 50 dernières sont annulables, la 51e Undo renvoie false', async () => {
  const store = await fixture({ current: 'B' });
  for (let i = 1; i <= 60; i++) await store.updateParticipant('A', { hp: 1 + (i % 15) });
  let undone = 0;
  while (await store.undo()) undone++;
  assert.equal(undone, 50);
  assert.equal(byId(store, 'A').hp, 1 + (10 % 15), 'on s’arrête à l’état de la 10e commande');
  assert.equal(await store.undo(), false);
  let redone = 0;
  while (await store.redo()) redone++;
  assert.equal(redone, 50);
  assert.equal(byId(store, 'A').hp, 1 + (60 % 15));
});

test('C6 Store — participant volumineux (~100 Ko) : l’historique est rogné par octets, les plus anciennes commandes (dont l’ajout) ne sont plus annulables', async () => {
  const store = await fixture({ current: 'A' });
  await summon(store, person('N', 50, { notes: 'x'.repeat(100000), extensions: { v5: { blob: 'x'.repeat(100000) } } }));
  for (let i = 1; i <= 5; i++) await store.updateParticipant('A', { hp: 19 - i });
  let undone = 0;
  while (await store.undo()) undone++;
  assert.ok(undone < 7 && undone >= 1, `rognage par octets attendu, ${undone} Undo possibles`);
  assert.ok(view(store).ids.includes('N'), 'l’ajout de N, trop ancien, a été rogné : N reste après tous les Undo');
  assert.equal(byId(store, 'N').extensions.v5.blob.length, 100000);
});

test('C6 Store — une commande dont l’état dépasse 2 Mo est refusée, l’état reste celui d’avant', async () => {
  const store = await fixture({ current: 'A' });
  const before = world(store);
  await assert.rejects(async () => summon(store, person('N', 50, { notes: 'x'.repeat(1200000), extensions: { v5: { blob: 'x'.repeat(1200000) } } })), /trop volumineuse/);
  assert.deepEqual(world(store), before);
  assert.deepEqual(view(store).ids, ['A', 'B', 'C']);
});

test('C6 Store — un participant de 900 Ko ajouté puis une mise à jour (inverse + résultat > 2 Mo) : la mise à jour est refusée, l’état est intact', async () => {
  const store = await fixture({ current: 'A' });
  await summon(store, person('N', 50, { notes: 'x'.repeat(900000), extensions: { v5: { blob: 'x'.repeat(900000) } } }));
  const before = world(store);
  await assert.rejects(async () => store.updateParticipant('A', { hp: 3 }), /trop volumineuse/);
  assert.deepEqual(world(store), before);
  assert.equal(byId(store, 'A').hp, 20);
});
});

describe('Caractérisation C02', () => {
function memoryPersistence() {
  let saved = null;
  return {
    async load() {
      return saved ? structuredClone(saved) : null;
    },
    async saveAtomic({ state }) {
      saved = structuredClone(state);
      return { ok: true };
    }
  };
}

function makeActor(id, { camp = 'pj', states = [], talents = [] } = {}) {
  return {
    id,
    name: id,
    kind: camp === 'pj' ? 'PJ' : 'PNJ',
    camp,
    zone: 'active',
    initiative: id === 'runner' ? 50 : 30,
    hp: 15,
    maxHp: 15,
    caracs: { CC: 40, CT: 35, F: 35, E: 35, I: 40, Ag: 40, Dex: 35, Int: 35, FM: 40, Soc: 35, M: 4 },
    armor: { head: 0, body: 0, arms: 0, legs: 0 },
    states: structuredClone(states),
    traits: [],
    equipment: [],
    talents: structuredClone(talents),
    prayers: [],
    skills: [
      { id: 'skill-41_74_68_6c_e9_74_69_73_6d_65-base', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total: 55 }
    ],
    actions: [{ id: 'sword', type: 'attack', base: 40, damage: 4, note: 'Épée' }],
    extensions: { v5: { hasMomentum: false } }
  };
}

async function setupBrokenStore() {
  const persistence = memoryPersistence();
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3,
    reserve: [],
    combat: {
      round: 1,
      currentActorId: 'runner',
      order: ['runner', 'foe'],
      participants: [
        makeActor('runner', {
          camp: 'pj',
          states: [{ id: 'b1', key: 'brise', name: 'Brisé', level: 1 }]
        }),
        makeActor('foe', { camp: 'ennemi' })
      ]
    },
    diceLines: [],
    log: [],
    extensions: { v5: { turnIndex: 1, combatId: 'char-c02-encounter' } }
  });
  return { store };
}

test('Caractérisation C02 (store.js) — Flee non engagée puis Sprint débitent Move et Action et bloquent une seconde Flee', async () => {
  const { store } = await setupBrokenStore();

  const unconfirmedEngaged = store.previewBrokenEscape({
    actorId: 'runner',
    action: 'flee',
    facts: {
      visibleToAnyEnemy: true,
      engagedEnemyIds: ['foe'],
      moveMode: 'run',
      visibleToAnyEnemyAfter: true
    }
  });
  assert.equal(unconfirmedEngaged.ready, false);

  const fleePreview = store.previewBrokenEscape({
    actorId: 'runner',
    action: 'flee',
    facts: {
      visibleToAnyEnemy: true,
      engagedEnemyIds: [],
      moveMode: 'run',
      visibleToAnyEnemyAfter: true
    }
  });
  assert.equal(fleePreview.ready, true);
  assert.equal(fleePreview.moveDistance, 16);

  const fleeApplied = await store.applyBrokenEscape(fleePreview);
  assert.equal(fleeApplied.status, 'applied');

  const sprintPreview = store.previewBrokenEscape({
    actorId: 'runner',
    action: 'sprint',
    facts: {
      visibleToAnyEnemy: true,
      engagedEnemyIds: [],
      visibleToAnyEnemyAfter: false
    },
    roll: 25
  });
  assert.equal(sprintPreview.ready, true);
  const sprintApplied = await store.applyBrokenEscape(sprintPreview);
  assert.equal(sprintApplied.status, 'applied');

  const state = JSON.parse(store.getFullJSON());
  const quotas = state.extensions?.v5?.actionLedger?.quotaUsage || [];
  assert.equal(quotas.some(q => q.actorId === 'runner' && q.quotaId === 'system:turn-move' && q.used === 1), true);
  assert.equal(quotas.some(q => q.actorId === 'runner' && q.quotaId === 'system:turn-action' && q.used === 1), true);
});
});

describe('Fuite engagée C02', () => {
function memoryPersistence() {
  let saved = null;
  return {
    async load() {
      return saved ? structuredClone(saved) : null;
    },
    async saveAtomic({ state }) {
      saved = structuredClone(state);
      return { ok: true };
    }
  };
}

function makeActor(id, { camp = 'pj', states = [], talents = [], hasMomentum = false, M = 4, athletics = 55 } = {}) {
  return {
    id,
    name: id,
    kind: camp === 'pj' ? 'PJ' : 'PNJ',
    camp,
    zone: 'active',
    initiative: id === 'runner' ? 50 : 30,
    hp: 15,
    maxHp: 15,
    caracs: { CC: 40, CT: 35, F: 35, E: 35, I: 40, Ag: 40, Dex: 35, Int: 35, FM: 40, Soc: 35, M },
    armor: { head: 0, body: 0, arms: 0, legs: 0 },
    states: structuredClone(states),
    traits: [],
    equipment: [],
    talents: structuredClone(talents),
    prayers: [],
    skills: [
      { id: 'skill-41_74_68_6c_e9_74_69_73_6d_65-base', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total: athletics }
    ],
    actions: [{ id: 'sword', type: 'attack', base: 40, damage: 4, note: 'Épée' }],
    extensions: { v5: { hasMomentum } }
  };
}

const brokenLevel = actor =>
  (actor?.states || [])
    .filter(s => ['brise', 'broken'].includes(String(s.key || s.name || '').toLowerCase()))
    .reduce((sum, s) => sum + Number(s.level ?? 1), 0);

test('C02 — Fuite engagée (C0-L06-014) : confirmée avec ennemis engagés donne Élan aux ennemis et +1 Brisé par ennemi engagé, même encerclé', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3,
    reserve: [],
    combat: {
      round: 1,
      currentActorId: 'runner',
      order: ['runner', 'foe1', 'foe2'],
      participants: [
        makeActor('runner', {
          camp: 'pj',
          hasMomentum: true,
          states: [{ id: 'b1', key: 'brise', name: 'Brisé', level: 1 }]
        }),
        makeActor('foe1', { camp: 'ennemi', hasMomentum: false }),
        makeActor('foe2', { camp: 'ennemi', hasMomentum: false })
      ]
    },
    diceLines: [],
    log: [],
    extensions: { v5: { turnIndex: 1, combatId: 'c02-engaged-flee' } }
  });

  // Sans confirmation explicite des attaques gratuites / fuite engagée : bloqué
  const blocked = store.previewBrokenEscape({
    actorId: 'runner',
    action: 'flee',
    facts: {
      visibleToAnyEnemy: true,
      engagedEnemyIds: ['foe1', 'foe2'],
      moveMode: 'run',
      visibleToAnyEnemyAfter: true
    }
  });
  assert.equal(blocked.ready, false);

  // Avec confirmation explicite MJ (foe1 dépense son Élan pour l'attaque gratuite, foe2 conserve son Élan, fuyard encerclé)
  const preview = store.previewBrokenEscape({
    actorId: 'runner',
    action: 'flee',
    facts: {
      visibleToAnyEnemy: true,
      engagedEnemyIds: ['foe1', 'foe2'],
      engagedEscapeConfirmed: true,
      freeAttacksResolved: true,
      freeAttackSpentMomentumIds: ['foe1'],
      surrounded: true,
      moveMode: 'run',
      visibleToAnyEnemyAfter: true
    }
  });
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.engagedEscapeEffects.addedBrokenCount, 2);
  assert.deepEqual(preview.engagedEscapeEffects.momentumGainedEnemyIds, ['foe1', 'foe2']);
  assert.deepEqual(preview.engagedEscapeEffects.momentumRetainedEnemyIds, ['foe2']);

  const applied = await store.applyBrokenEscape(preview);
  assert.equal(applied.status, 'applied');

  const participants = store.listParticipants();
  const runner = participants.find(p => p.id === 'runner');
  const foe1 = participants.find(p => p.id === 'foe1');
  const foe2 = participants.find(p => p.id === 'foe2');
  assert.equal(brokenLevel(runner), 3, '1 Brisé initial + 2 Brisé pour les 2 ennemis engagés');
  assert.equal(Boolean(runner.extensions?.v5?.hasMomentum), false, 'Acquisition de Brisé retire Élan');
  assert.equal(Boolean(foe1.extensions?.v5?.hasMomentum), false, 'foe1 a dépensé son Élan en attaque gratuite');
  assert.equal(Boolean(foe2.extensions?.v5?.hasMomentum), true, 'foe2 conserve l’Élan gagné lors de la fuite');
});

test('C02 — Talent Fuite ! (C0-L06-025) : exempte le fuyard des États Brisé supplémentaires lors d’une fuite engagée', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3,
    reserve: [],
    combat: {
      round: 1,
      currentActorId: 'runner',
      order: ['runner', 'foe1'],
      participants: [
        makeActor('runner', {
          camp: 'pj',
          states: [{ id: 'b1', key: 'brise', name: 'Brisé', level: 1 }],
          talents: [{ id: 'talent-flee', name: 'Fuite !', status: 'resolved', rank: 1 }]
        }),
        makeActor('foe1', { camp: 'ennemi', hasMomentum: false })
      ]
    },
    diceLines: [],
    log: [],
    extensions: { v5: { turnIndex: 1, combatId: 'c02-flee-talent' } }
  });

  const preview = store.previewBrokenEscape({
    actorId: 'runner',
    action: 'flee',
    facts: {
      visibleToAnyEnemy: true,
      engagedEnemyIds: ['foe1'],
      engagedEscapeConfirmed: true,
      freeAttacksResolved: true,
      moveMode: 'run',
      visibleToAnyEnemyAfter: false
    }
  });
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.engagedEscapeEffects.brokenExempt, true);
  assert.equal(preview.engagedEscapeEffects.addedBrokenCount, 0);

  const applied = await store.applyBrokenEscape(preview);
  assert.equal(applied.status, 'applied');
  const runner = store.listParticipants().find(p => p.id === 'runner');
  assert.equal(brokenLevel(runner), 1, 'Fuite ! empêche l’ajout de Brisé lors de la fuite engagée');
});

test('C02 — Talent Fuite ! (C0-L06-024) : Mouvement supplémentaire en courant après Désengagement confirmé', () => {
  const actorWithFlee = makeActor('runner', {
    M: 4,
    talents: [{ id: 'talent-flee', name: 'Fuite !', status: 'resolved', rank: 1 }]
  });
  const actorWithoutFlee = makeActor('walker', { M: 4 });

  const denied = previewV5FleeTalentDisengageMove({
    actor: actorWithoutFlee,
    disengagedConfirmed: true
  });
  assert.equal(denied.ready, false);

  const missingDisengage = previewV5FleeTalentDisengageMove({
    actor: actorWithFlee,
    disengagedConfirmed: false
  });
  assert.equal(missingDisengage.ready, false);

  const allowed = previewV5FleeTalentDisengageMove({
    actor: actorWithFlee,
    disengagedConfirmed: true
  });
  assert.equal(allowed.ready, true);
  assert.equal(allowed.extraMoveDistance, 16, 'Course = 4 × M (16 yards)');
  assert.equal(allowed.moveMode, 'run');
});

test('C02 — Poursuite V5 (C0-L06-074, C0-L06-023, C0-L06-044) : échelle 1-10, bonus Fuite ! proie et Acharné poursuivant', () => {
  const quarry = makeActor('quarry', {
    athletics: 50,
    talents: [{ id: 'talent-flee', name: 'Fuite !', status: 'resolved', rank: 1 }]
  });
  const pursuer = makeActor('pursuer', {
    athletics: 50,
    talents: [{ id: 'talent-relentless', name: 'Impitoyable', status: 'resolved', rank: 1 }]
  });

  // Proie réussit avec 21 (DR +3 + 1 Fuite ! = +4), poursuivant rate avec 72 (DR -2 + 1 Impitoyable = -1) -> écart +5
  const escaped = resolveV5PursuitStep({
    quarry,
    pursuer,
    initialDistance: 7,
    quarryRoll: 21,
    pursuerRoll: 72
  });
  assert.equal(escaped.ready, true);
  assert.equal(escaped.quarrySlBonus, 1);
  assert.equal(escaped.pursuerSlBonus, 1);
  assert.equal(escaped.nextDistance, 12);
  assert.equal(escaped.outcome, 'escaped', 'Distance > 10 met fin à la poursuite par évasion');

  // Proie rattrapée si distance tombe à 0 ou moins
  const caught = resolveV5PursuitStep({
    quarry: makeActor('slow-quarry', { athletics: 40 }),
    pursuer,
    initialDistance: 2,
    quarryRoll: 85,
    pursuerRoll: 15
  });
  assert.equal(caught.ready, true);
  assert.equal(caught.nextDistance, 0);
  assert.equal(caught.outcome, 'caught');
});
});
