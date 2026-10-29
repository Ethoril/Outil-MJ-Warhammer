import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';

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
