import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import { effectHandlers } from '../js/core/v5-divine-effect-handlers.js';

// P4b T1 : les six miracles reclassés, contre les vrais contrats générés (à lancer après `node tools/build-v5-divine-contracts.mjs`).
const clone = value => structuredClone(value);
const idOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name).id;
const AUROCHS = idOf('Cœur d’aurochs'), RALLY = idOf('Tous ensemble'), HEAT = idOf('La pression retombe'), TRICKLE = idOf('Ruissellement'),
  RAGE = idOf('Rage de Rhya'), WIND = idOf('Vent sauvage');

const actor = (id, extra = {}, cult = 'Taal') => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture(cult) {
  const persistence = memory();
  const store = createStore({ persistence, storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [actor('priest', {}, cult), actor('ally', { initiative: 30 }, cult)] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  store.persistence = persistence;
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
const touching = { targetIds: ['ally'], facts: { targets: { ally: { withinTouch: true } } } };

test('statuts : les six miracles sont assistés, avec un effet test-modifier et les clauses restantes en rappel', () => {
  for (const id of [AUROCHS, RALLY, HEAT, TRICKLE, RAGE, WIND]) {
    const contract = getDivineContract(id);
    assert.equal(contract.status, 'assisted', contract.name);
    assert.ok(contract.effects.some(effect => effect.type === 'test-modifier'), contract.name);
    assert.ok(contract.effects.every(effect => effectHandlers[effect.type]), contract.name);
  }
  const manual = id => getDivineContract(id).clauses.filter(clause => clause.mode === 'manual').map(clause => clause.id);
  assert.deepEqual(manual(AUROCHS), []);
  assert.deepEqual(manual(RALLY), ['status-exclusion']);
  assert.ok(manual(HEAT).includes('watch-minus-3') && manual(HEAT).includes('ends-on-crime') && !manual(HEAT).includes('fellowship-penalty'));
  assert.ok(manual(TRICKLE).includes('beneficiary') && manual(TRICKLE).includes('charm-condition'));
  assert.deepEqual(manual(RAGE).filter(id => id.includes('test') || id.includes('force')), ['force-test']);
  assert.ok(manual(WIND).includes('prone-each-round') && !manual(WIND).includes('test-penalty'));
});

test('Cœur d’aurochs : Résistance +6 (Bonus de Sociabilité) sur la cible touchée, 9 Rounds', async () => {
  const store = await fixture('Taal');
  const { preview } = await cast(store, AUROCHS, { ...touching, expiry: { phase: 'endOfTurn', round: 9, actorId: 'priest' } });
  assert.deepEqual(preview.preview.effects[0].modifiers, { 'Résistance': 6 });
  assert.deepEqual(mods(store, 'ally'), { 'Résistance': 6 });
  assert.deepEqual(mods(store, 'priest'), {});
  await store.undo();
  assert.deepEqual(mods(store, 'ally'), {});
});

test('Tous ensemble : +2 Résistance et Calme, +1 par tranche de 10 (foule saisie), Statut en rappel', async () => {
  const store = await fixture('Ranald');
  const facts = { targets: { priest: { ally: true, withinRange: true }, ally: { ally: true, withinRange: true } } };
  const blocked = store.previewDivineExecution(RALLY, input({ targetIds: ['priest', 'ally'], facts }));
  assert.equal(blocked.ready, false);
  assert.ok(JSON.stringify(blocked.needsInput).includes('crowdSize'), JSON.stringify(blocked.needsInput));
  await cast(store, RALLY, { targetIds: ['priest', 'ally'], facts, crowdSize: 30 });
  for (const id of ['priest', 'ally']) assert.deepEqual(mods(store, id), { 'Résistance': 5, 'Calme': 5 });
});

test('La pression retombe : -3 sur les compétences de Sociabilité du prêtre, Prière exclue', async () => {
  const store = await fixture('Ranald');
  await cast(store, HEAT, { expiry: undefined });
  const applied = mods(store, 'priest');
  assert.equal(applied.Charme, -3);
  assert.ok(!Object.keys(applied).some(key => /^pri[eè]re/i.test(key)));
  assert.ok(Object.values(applied).every(value => value === -3));
});

test('Ruissellement : Charme = DR du Test de Prière, sur le prêtre seul', async () => {
  const store = await fixture('Handrich');
  const { preview } = await cast(store, TRICKLE, { roll: 21 });
  const dr = preview.preview.prayer.sl;
  assert.ok(dr >= 1);
  assert.equal(mods(store, 'priest').Charme, dr);
  assert.deepEqual(layers(store, 'ally'), []);
});

test('Rage de Rhya : +2 Corps à corps et Résistance en plus des Traits, la Force reste un rappel', async () => {
  const store = await fixture('Rhya');
  await cast(store, RAGE);
  assert.deepEqual(mods(store, 'priest'), { 'Corps à corps': 2, 'Résistance': 2 });
  assert.ok(person(store, 'priest').traits.includes('Impassible'));
});

test('Vent sauvage : -2 sur Corps à corps et sur les compétences d’Agilité, jamais sur Prière', async () => {
  const store = await fixture('Taal');
  await cast(store, WIND, { targetIds: ['ally'] });
  const applied = mods(store, 'ally');
  assert.equal(applied['Corps à corps'], -2);
  assert.equal(applied.Athlétisme, -2);
  assert.ok(Object.values(applied).every(value => value === -2));
  assert.ok(!Object.keys(applied).some(key => /^pri[eè]re/i.test(key)));
});
