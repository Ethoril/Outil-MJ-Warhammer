import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getAllDivineContracts, getDivineContract } from '../js/core/v5-divine-store.js';

// P5 T2 — Bénédiction de Ténacité (p.221) : « la cible retire 1 État (sauf Souillé) ».
// Arbitrage MJ (19 oct.) : tout État sauf Souillé et les États verrouillés / à cause persistante (comme Secours de Rhya).
// Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const clone = value => structuredClone(value);
const TENACITY = ['manann', 'morr', 'shallya', 'ulric', 'solkan'].map(cult => `divine:blessing:${cult}:tenacity`);
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Morr' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const states = [{ id: 'st-souille', key: 'souille', name: 'Souillé', level: 1 }, { id: 'st-aveugle', key: 'aveugle', name: 'Aveuglé', level: 1 }];
async function fixture() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [
    actor('priest'), actor('ally', { initiative: 30, states: clone(states) })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const input = (stateId, more = {}) => ({ actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0 },
  facts: { targets: { ally: { withinRange: true } } }, removals: { ally: { stateId } }, ...more });
const keys = participant => (participant.states || []).map(row => row.key).sort();

test('Ténacité : les cinq contrats retirent 1 État choisi, Souillé exclu, libellé « Souillé »', () => {
  for (const id of TENACITY) {
    const contract = getDivineContract(id);
    assert.ok(contract, id);
    assert.notEqual(contract.status, 'manual', id);
    assert.deepEqual(contract.effects.map(effect => ({ type: effect.type, chosen: effect.chosen, amount: effect.amount, excludeKeys: effect.excludeKeys })),
      [{ type: 'remove-condition', chosen: true, amount: 1, excludeKeys: ['souille'] }], id);
    assert.match(contract.labels.effect, /Souillé/, id);
    assert.doesNotMatch(contract.labels.effect, /Entaché/, id);
  }
});

test('Ténacité : choisir Souillé est refusé à l’aperçu ; aucun choix est demandé', async () => {
  const store = await fixture();
  const refused = store.previewDivineExecution(TENACITY[1], input('st-souille'));
  assert.equal(refused.ready, false);
  assert.ok(refused.needsInput.some(row => row.field === 'removals.ally.stateId'), JSON.stringify(refused.needsInput));
  const missing = store.previewDivineExecution(TENACITY[1], input(undefined, { removals: {} }));
  assert.equal(missing.ready, false);
  assert.ok(missing.needsInput.some(row => row.field === 'removals.ally.stateId'));
  assert.deepEqual(keys(person(store, 'ally')), ['aveugle', 'souille'], 'aucune mutation à l’aperçu');
});

test('Ténacité : Aveuglé retiré, Souillé conservé ; Undo/Redo', async () => {
  const store = await fixture();
  const preview = store.previewDivineExecution(TENACITY[1], input('st-aveugle'));
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(TENACITY[1], { preview });
  assert.equal(result.ready, true, result.error);
  assert.deepEqual(keys(person(store, 'ally')), ['souille']);
  await store.undo();
  assert.deepEqual(keys(person(store, 'ally')), ['aveugle', 'souille']);
  await store.redo();
  assert.deepEqual(keys(person(store, 'ally')), ['souille']);
});

test('Non-régression : Secours de Rhya (sans exclusion) peut toujours retirer un État quelconque', () => {
  const succour = getAllDivineContracts().find(row => row.type === 'miracle' && row.effects?.some(effect => effect.type === 'remove-condition' && effect.chosen && effect.onAllRemoved));
  assert.ok(succour, 'Secours de Rhya présent');
  assert.equal(succour.effects.find(effect => effect.type === 'remove-condition').excludeKeys, undefined);
});
