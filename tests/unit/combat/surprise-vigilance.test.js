// Lot G6 (recette du MJ du 22/11, R3) : Surprise et Vigilance.
// p. 161 : la Surprise se détermine avant le round 1 ; p. 187 : État Surpris ;
// p. 116 : Vigilance (Combat Aware) = Test de Perception Challenging (+0 DR) pour éviter Surpris.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareCombatInitiative } from '../../../js/core/turn-order.js';
import { createStore } from '../../../js/core/store.js';
import { situationActions } from '../../../js/core/v5-talent-situations.js';
import { availableV5TalentActions } from '../../../js/core/v5-talent-actions.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';

const clone = value => structuredClone(value);
const perceptionId = getReferenceCatalogue().skills.find(row => row.nom === 'Perception').id;
const aware = { id: 'talent-combat-aware', name: 'Vigilance', rank: 1, status: 'resolved' };
const person = (id, { kind = 'PNJ', camp = kind === 'PJ' ? 'pj' : 'ennemi', I = 40, talents = [], skills = [], states = [] } = {}) => ({
  id, name: id, kind, camp, zone: 'active', initiative: I, hp: 10, maxHp: 10, states, talents, skills,
  caracs: { I, CC: 40, Int: 40 }, extensions: { v5: {} }
});
const vigilant = (id, extra = {}) => person(id, { kind: 'PJ', talents: [aware], skills: [{ id: perceptionId, name: 'Perception', total: 50, status: 'resolved' }], ...extra });
const cast = () => [vigilant('vig'), person('pj2', { kind: 'PJ' }), person('foe')];
const dice = { vig: 5, pj2: 6, foe: 7 };

function memoryPersistence() {
  let saved = null;
  return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; }, read() { return saved && clone(saved); } };
}
async function fixture(participants) {
  const store = createStore({ persistence: memoryPersistence(), storage: null });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: participants.map(row => row.id), orderMode: 'automatic', participants: clone(participants) },
    activeScene: null, encounters: [], suspendedScenes: [], persistentCharacters: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const surprisedOf = (store, id) => store.listParticipants().find(row => row.id === id).states.some(row => row.key === 'surpris');

test('G6-b — camp surpris : un d100 de Vigilance est demandé pour chaque surpris qui a le talent, et pour lui seul', () => {
  const plan = prepareCombatInitiative(cast(), { diceById: dice, surprisedCamp: 'pj' });
  assert.equal(plan.ready, false);
  assert.deepEqual(plan.needsInput.filter(row => row.field === 'vigilanceRoll').map(row => row.participantId), ['vig']);
  const other = prepareCombatInitiative(cast(), { diceById: dice, surprisedCamp: 'ennemi' });
  assert.equal(other.ready, true, JSON.stringify(other.needsInput));
  assert.deepEqual(other.vigilance, []);
  const none = prepareCombatInitiative(cast(), { diceById: dice, surprisedCamp: '' });
  assert.equal(none.ready, true);
  assert.deepEqual(none.vigilance, []);
});

test('G6-b — Test de Perception Challenging (+0) : Perception 50, d100 32 = réussite +2 DR ; d100 77 = échec', () => {
  const won = prepareCombatInitiative(cast(), { diceById: dice, surprisedCamp: 'pj', vigilanceRolls: { vig: 32 } });
  assert.equal(won.ready, true, JSON.stringify(won.needsInput));
  assert.equal(won.vigilance.length, 1);
  assert.deepEqual({ ...won.vigilance[0] }, { participantId: 'vig', roll: 32, score: 50, success: true, sl: 2 });
  const lost = prepareCombatInitiative(cast(), { diceById: dice, surprisedCamp: 'pj', vigilanceRolls: { vig: 77 } });
  assert.equal(lost.vigilance[0].success, false);
  // Sans compétence Perception, le Test se fait sur l'Initiative (compétence de base).
  const bare = prepareCombatInitiative([person('nu', { talents: [aware], I: 33 }), person('pj', { kind: 'PJ' })], { diceById: { nu: 1, pj: 2 }, surprisedCamp: 'ennemi', vigilanceRolls: { nu: 30 } });
  assert.equal(bare.vigilance[0].score, 33);
  assert.equal(bare.vigilance[0].success, true);
});

test('G6-b — application : la Vigilance réussie évite Surpris, les autres du camp le reçoivent avant le round 1 ; Annuler rétablit tout', async () => {
  const store = await fixture(cast());
  const preview = store.previewCombatInitialization({ diceById: dice, surprisedCamp: 'pj', vigilanceRolls: { vig: 32 }, startCombat: true });
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput));
  assert.equal((await store.applyCombatInitialization(preview)).status, 'applied');
  assert.equal(surprisedOf(store, 'vig'), false);
  assert.equal(surprisedOf(store, 'pj2'), true);
  assert.equal(surprisedOf(store, 'foe'), false);
  const state = store.listParticipants().find(row => row.id === 'pj2').states.find(row => row.key === 'surpris');
  assert.equal(typeof state.source?.eventId, 'string', 'identifiant de la Surprise généré');
  assert.ok(state.source.eventId.length > 0);
  assert.ok(store.getLog().some(row => /Vigilance/.test(row.text || '') && /vig/.test(row.text || '')), 'jet de Vigilance au journal');
  assert.equal(await store.undo(), true);
  assert.ok(store.listParticipants().every(row => !row.states.some(s => s.key === 'surpris')));
  assert.equal(store.getCombat().round, 0);
});

test('G6-b — Vigilance ratée : le porteur du talent est Surpris comme les autres', async () => {
  const store = await fixture(cast());
  const preview = store.previewCombatInitialization({ diceById: dice, surprisedCamp: 'pj', vigilanceRolls: { vig: 77 }, startCombat: true });
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput));
  await store.applyCombatInitialization(preview);
  assert.equal(surprisedOf(store, 'vig'), true);
  assert.equal(surprisedOf(store, 'pj2'), true);
});

test('G6-b — sans jet de Vigilance, l’application est refusée (saisie incomplète)', async () => {
  const store = await fixture(cast());
  const preview = store.previewCombatInitialization({ diceById: dice, surprisedCamp: 'pj', startCombat: true });
  assert.equal(preview.ready, false);
  const result = await store.applyCombatInitialization(preview);
  assert.equal(result.status, 'requires-input');
  assert.ok(store.listParticipants().every(row => !row.states.some(s => s.key === 'surpris')));
});

test('G6-a — « Vigilance : éviter une Surprise identifiée » n’est proposée qu’au porteur du talent qui est Surpris', () => {
  const calm = vigilant('calm');
  assert.ok(!situationActions(calm).some(row => row.id === 'activate:combat-aware'));
  assert.ok(!availableV5TalentActions(calm).some(row => row.id === 'activate:combat-aware'));
  const caught = vigilant('caught', { states: [{ id: 's1', key: 'surpris', name: 'Surpris', level: 1, source: { kind: 'combat-ambush', eventId: 'amb-1' } }] });
  assert.ok(situationActions(caught).some(row => row.id === 'activate:combat-aware'));
  assert.ok(availableV5TalentActions(caught).some(row => row.id === 'activate:combat-aware'));
  const plain = person('plain', { states: [{ id: 's2', key: 'surpris', name: 'Surpris', level: 1 }] });
  assert.ok(!situationActions(plain).some(row => row.id === 'activate:combat-aware'));
});
