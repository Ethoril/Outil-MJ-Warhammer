import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract } from '../js/core/v5-divine-store.js';

// P5 — Bénédiction de Protection (V5 p.221) : « pour attaquer la cible, chaque ennemi doit réussir un Test de Calme Accessible (+2 DR) ;
// sinon il choisit une autre cible ou Action ». Modèle (comme la Capuche Vengeresse) : le MJ saisit le résultat du Test de l’attaquant
// (`v5.context.protectionCalm = { success }`) ; absent ou échoué, l’attaque n’est pas applicable. Critère écrit avant l’implémentation.
const CULTS = ['myrmidia', 'ranald', 'rhya', 'shallya', 'sigmar', 'handrich'];
const ID = 'divine:blessing:sigmar:protection';
const clone = value => structuredClone(value);
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Sigmar' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 }, hasMomentum: false } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
async function fixture() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'foe', 'ally'],
    participants: [actor('priest'), actor('ally', { initiative: 20 }), actor('foe', { initiative: 30, talents: [] }), actor('foe2', { camp: 'ennemi', initiative: 10, talents: [] })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'prot' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  const preview = store.previewDivineExecution(ID, { actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
    expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, facts: { targets: { ally: { withinRange: true } } } });
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(ID, { preview });
  assert.equal(result.ready, true, result.error);
  await store.nextTurn();
  return { store, result };
}
const hit = (store, targetId, calm, id = 'h', actorId = 'foe') => store.previewResolution({ resolutionId: id, actorId, targetId, roll: 25,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
  v5: { kind: 'melee', ...(calm === undefined ? {} : { context: { protectionCalm: { success: calm } } }) } });
const protectionNotes = preview => (preview.unresolved || []).filter(text => /Protection/.test(text));

test('Protection : les six contrats ne sont plus manuels', () => {
  for (const cult of CULTS) assert.notEqual(getDivineContract(`divine:blessing:${cult}:protection`).status, 'manual', cult);
});

test('Protection : sans Test de Calme saisi ou sur un échec, l’attaque contre la cible bénie n’est pas applicable', async () => {
  const { store } = await fixture();
  const missing = hit(store, 'ally');
  assert.equal(protectionNotes(missing).length, 1, 'Test de Calme demandé');
  assert.notEqual((await store.applyResolution(missing)).status, 'applied');
  const failed = hit(store, 'ally', false, 'h2');
  assert.match(protectionNotes(failed)[0] || '', /autre cible|autre Action/i);
  assert.notEqual((await store.applyResolution(failed)).status, 'applied');
  assert.equal(person(store, 'ally').hp, 40, 'aucun dégât');
});

test('Protection : Test de Calme réussi, l’attaque passe ; une cible non bénie n’exige rien ; fin de prière', async () => {
  const { store, result } = await fixture();
  const passed = hit(store, 'ally', true);
  assert.equal(protectionNotes(passed).length, 0);
  assert.equal((await store.applyResolution(passed)).status, 'applied');
  assert.ok(person(store, 'ally').hp < 40);
  assert.equal(protectionNotes(hit(store, 'priest', undefined, 'h3')).length, 0, 'prêtre non béni');
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(protectionNotes(hit(store, 'ally', undefined, 'h4')).length, 0, 'fin de prière');
});

// Arbitrage MJ (20 oct., R31) : un Test de Calme RÉUSSI vaut pour cet ennemi pendant toute la durée ; un échec ne l’engage pas.
test('Protection : un Test réussi vaut pour cet ennemi jusqu’à la fin de la prière, pas pour un autre ; Undo l’oublie', async () => {
  const { store } = await fixture();
  assert.equal((await store.applyResolution(hit(store, 'ally', false, 'f1'))).status !== 'applied', true);
  assert.equal(protectionNotes(hit(store, 'ally', undefined, 'f2')).length, 1, 'un échec n’est pas retenu');
  assert.equal((await store.applyResolution(hit(store, 'ally', true, 'p1'))).status, 'applied');
  assert.equal(protectionNotes(hit(store, 'ally', undefined, 'p2')).length, 0, 'même ennemi : plus de Test');
  assert.equal(protectionNotes(hit(store, 'ally', undefined, 'o1', 'foe2')).length, 1, 'autre ennemi : Test exigé');
  await store.undo();
  assert.equal(protectionNotes(hit(store, 'ally', undefined, 'p3')).length, 1, 'Undo : le Test redevient nécessaire');
});
