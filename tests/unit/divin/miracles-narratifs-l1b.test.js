import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { targetAppliesToTest } from '../../../js/core/effect-engine.js';

// L1c — seule Rage de Rhya (Force +2 DR, Archives 3 p.74) reste branchée ; Grâce de Ranald et Un marché est un marché
// repassent en rappel (hors combat, tri du MJ du 17/11/2026, spec §8).
const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const idOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name).id;
const GRACE = idOf('Grâce de Ranald'), RAGE = idOf('Rage de Rhya'), DEAL = idOf('Un marché est un marché');

const actor = (id, cult, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
async function fixture(cult) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [actor('priest', cult), actor('ally', cult, { initiative: 30 })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, ...more });
async function cast(store, contractId, more) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const layers = (store, id) => person(store, id).extensions.v5.divineEffects || [];
const mods = (store, id) => person(store, id).extensions.v5.testModifiers ?? {};
const manual = id => getDivineContract(id).clauses.filter(clause => clause.mode === 'manual').map(clause => clause.id);

describe('L1c — Rage de Rhya branchée, Grâce de Ranald et Un marché est un marché en rappel', () => {
  test('statuts et clauses : Rage assistée, la Discrétion de Grâce et le Marchandage restent des rappels', () => {
    assert.equal(getDivineContract(RAGE).status, 'assisted');
    assert.deepEqual(manual(RAGE), ['defend-only']);
    assert.equal(getDivineContract(DEAL).status, 'manual');
    assert.ok(manual(GRACE).includes('stealth'));
    assert.ok(!getDivineContract(GRACE).effects.some(effect => effect.type === 'test-modifier'));
  });

  test('Rage de Rhya : Force +2 DR, clé de caractéristique qui vise la Force et jamais l’Agilité', async () => {
    const store = await fixture('Rhya');
    await cast(store, RAGE);
    assert.deepEqual(mods(store, 'priest'), { 'Corps à corps': 2, 'Résistance': 2, 'carac:F': 2 });
    assert.deepEqual(mods(store, 'ally'), {});
    assert.equal(targetAppliesToTest('carac:F', { skill: 'Athlétisme', carac: 'F' }), true);
    assert.equal(targetAppliesToTest('carac:F', { skill: 'Esquive', carac: 'Ag' }), false);
  });

  test('Rage de Rhya s’annule en un seul ↶ et se rejoue par ↷', async () => {
    const store = await fixture('Rhya');
    await cast(store, RAGE);
    assert.equal(mods(store, 'priest')['carac:F'], 2);
    await store.undo();
    assert.deepEqual(mods(store, 'priest'), {});
    assert.deepEqual(layers(store, 'priest'), []);
    await store.redo();
    assert.equal(mods(store, 'priest')['carac:F'], 2);
  });
});
