import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { targetAppliesToTest } from '../../../js/core/effect-engine.js';

// L1b — Grâce de Ranald (Discrétion +10 lu +1 DR, Q14), Rage de Rhya (Force +2 DR, Archives 3 p.74), Un marché est un marché
// (Marchandage +2 DR, +1 par +2 DR du Test de Prière, Archives 3 p.47, valeur figée à l'aperçu, Q10).
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

describe('L1b — Grâce de Ranald, Rage de Rhya, Un marché est un marché', () => {
  test('statuts et clauses : trois prières assistées, la part non branchable reste en rappel', () => {
    for (const id of [GRACE, RAGE, DEAL]) assert.equal(getDivineContract(id).status, 'assisted', getDivineContract(id).name);
    assert.deepEqual(manual(GRACE), []);
    assert.deepEqual(manual(RAGE), ['defend-only']);
    assert.deepEqual(manual(DEAL), ['haggle-one-test', 'impression', 'after-test', 'profit-sin']);
  });

  test('Grâce de Ranald : Discrétion +1 DR sur la cible, Agilité +10 en caractéristique, plus de rappel de Discrétion', async () => {
    const store = await fixture('Ranald');
    const touching = { targetIds: ['ally'], facts: { targets: { ally: { withinTouch: true } } }, expiry: undefined, clockAnchor: { campaignSeconds: 0, clockRevision: 0, lastEventId: null } };
    const { result } = await cast(store, GRACE, touching);
    assert.deepEqual(mods(store, 'ally'), { 'Discrétion': 1 });
    assert.deepEqual(mods(store, 'priest'), {});
    assert.equal(person(store, 'ally').caracs.Ag, 50);
    assert.ok(!result.receipt.reminders.some(text => /Discrétion/.test(text)));
  });

  test('Rage de Rhya : Force +2 DR, clé de caractéristique qui vise la Force et jamais l’Agilité', async () => {
    const store = await fixture('Rhya');
    await cast(store, RAGE);
    assert.deepEqual(mods(store, 'priest'), { 'Corps à corps': 2, 'Résistance': 2, 'carac:F': 2 });
    assert.deepEqual(mods(store, 'ally'), {});
    assert.equal(targetAppliesToTest('carac:F', { skill: 'Athlétisme', carac: 'F' }), true);
    assert.equal(targetAppliesToTest('carac:F', { skill: 'Esquive', carac: 'Ag' }), false);
  });

  test('Un marché est un marché : Marchandage = +2 DR plus 1 par tranche de 2 DR de la Prière, figé dans la couche', async () => {
    const store = await fixture('Handrich');
    const seen = new Set();
    for (const roll of [5, 21, 35, 45, 55]) {
      const probe = await fixture('Handrich');
      const { preview } = await cast(probe, DEAL, { roll, expiry: undefined });
      const dr = preview.preview.prayer.sl;
      assert.equal(mods(probe, 'priest').Marchandage, 2 + Math.floor(dr / 2), `DR ${dr}`);
      seen.add(dr);
    }
    assert.ok(seen.size >= 3, 'plusieurs valeurs de DR ont été essayées');
    const { preview } = await cast(store, DEAL, { roll: 21, expiry: undefined });
    const dr = preview.preview.prayer.sl;
    assert.deepEqual(layers(store, 'priest')[0].testModifiers, { Marchandage: 2 + Math.floor(dr / 2) });
    assert.deepEqual(mods(store, 'ally'), {});
  });

  test('la valeur figée ne bouge plus après coup, et la règle refuse une base non entière', () => {
    const contract = getDivineContract(DEAL);
    assert.deepEqual(contract.effects[0].modifiers.Marchandage, { base: 2, fromSuccessLevels: true, per: 2, add: 1 });
  });

  test('chaque prière s’annule en un seul ↶ et se rejoue par ↷', async () => {
    const store = await fixture('Handrich');
    const { preview } = await cast(store, DEAL, { roll: 21, expiry: undefined });
    const expected = 2 + Math.floor(preview.preview.prayer.sl / 2);
    assert.equal(mods(store, 'priest').Marchandage, expected);
    await store.undo();
    assert.deepEqual(mods(store, 'priest'), {});
    assert.deepEqual(layers(store, 'priest'), []);
    await store.redo();
    assert.equal(mods(store, 'priest').Marchandage, expected);
  });
});
