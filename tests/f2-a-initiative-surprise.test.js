import test from 'node:test';
import assert from 'node:assert/strict';
import * as TurnOrder from '../js/core/turn-order.js';
import { createStore } from '../js/core/store.js';
import { effectiveOrder } from '../js/core/turn-order.js';
import { v5StoreActionClock } from '../js/core/v5-store-action.js';

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
