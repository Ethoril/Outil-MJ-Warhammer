import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getAllDivineContracts, getDivineContract } from '../js/core/v5-divine-store.js';
import { acquireV5Conditions } from '../js/core/v5-effects.js';
import { effectTypes } from '../js/core/v5-divine-grammar.js';

// P5 T5 — Sur un Terrain Mortel (Up in Arms p.79, décisions MJ Q6/Q7) : les alliés désignés, prêtre compris, ne reçoivent pas
// l'État Brisé tant que le miracle dure ; les Brisé déjà acquis restent. Nouveau type d'effet générique `grant-immunity`.
// Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const clone = value => structuredClone(value);
const TERRAIN = () => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === 'Sur un Terrain Mortel');
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'other'], participants: [
    actor('priest'), actor('ally', { initiative: 30, states: [{ id: 'st-b', key: 'brise', name: 'Brisé', level: 1 }] }), actor('other', { initiative: 20 })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const brokenLevel = participant => (participant.states || []).filter(row => row.key === 'brise').reduce((sum, row) => sum + (row.level || 1), 0);

test('grant-immunity : type déclaré, contrat assisté avec un effet d’immunité à Brisé', () => {
  assert.ok(effectTypes.has('grant-immunity'));
  const contract = TERRAIN();
  assert.ok(contract);
  assert.equal(contract.status, 'assisted');
  assert.deepEqual(contract.effects.map(effect => ({ type: effect.type, conditions: effect.conditions })), [{ type: 'grant-immunity', conditions: ['Brisé'] }]);
  assert.ok(contract.clauses.some(row => row.id === 'no-broken' && row.mode === 'engine'));
  assert.ok(contract.clauses.some(row => row.id === 'duration-unattested' && row.mode === 'manual'), 'la durée non attestée reste signalée');
});

test('Sur un Terrain Mortel : les cibles désignées (prêtre compris) n’acquièrent plus Brisé ; les Brisé existants restent ; fin et Undo', async () => {
  const store = await fixture();
  const contract = TERRAIN();
  const input = { actorId: 'priest', targetIds: ['priest', 'ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
    expiry: { phase: 'endOfTurn', round: 5, actorId: 'priest' }, facts: { targets: { priest: { withinRange: true }, ally: { withinRange: true } } } };
  const preview = store.previewDivineExecution(contract.id, input);
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(contract.id, { preview });
  assert.equal(result.ready, true, result.error);
  for (const id of ['priest', 'ally']) {
    const before = person(store, id);
    const after = acquireV5Conditions(before, ['Brisé']).participant;
    assert.equal(brokenLevel(after), brokenLevel(before), `${id} : aucun Brisé acquis`);
  }
  assert.equal(brokenLevel(person(store, 'ally')), 1, 'le Brisé déjà acquis reste');
  const other = person(store, 'other');
  assert.equal(brokenLevel(acquireV5Conditions(other, ['Brisé']).participant), 1, 'non-cible : Brisé acquis normalement');
  await store.undo();
  assert.equal(brokenLevel(acquireV5Conditions(person(store, 'priest'), ['Brisé']).participant), 1, 'Undo retire l’immunité');
  await store.redo();
  for (let i = 0; i < 15; i++) await store.nextTurn();
  assert.equal(brokenLevel(acquireV5Conditions(person(store, 'priest'), ['Brisé']).participant), 1, 'immunité retirée à l’échéance');
});

test('Non-régression : sans couche, acquérir Brisé fonctionne comme avant', async () => {
  const store = await fixture();
  assert.equal(brokenLevel(acquireV5Conditions(person(store, 'priest'), ['Brisé']).participant), 1);
});
