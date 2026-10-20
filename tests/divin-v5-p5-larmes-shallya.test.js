import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';

// Étape 6 du plan — Larmes de Shallya (Livre de base V5 p.226) : guérit 1 Blessure Critique de la cible,
// +1 par tranche de +2 DR. Les Blessures Critiques du registre (étape 5) sont retirées, les États qu'elles
// avaient posés restent. Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const TEARS = 'divine:miracle:shallya:shallya-s-tears';
const clone = value => structuredClone(value);
const base = (id, extra = {}) => ({ id, name: id, kind: id === 'foe' ? 'PNJ' : 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 }, hasMomentum: false } }, ...extra });
const priest = () => base('priest', { initiative: 70,
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Shallya' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })) });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const records = (store, id) => person(store, id).extensions?.v5?.criticalWounds || [];
async function fixture() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [priest(), base('ally', { initiative: 50 }), base('foe', { initiative: 30 })] }, log: [], diceLines: [],
    extensions: { v5: { turnIndex: 1, combatId: 'larmes-shallya' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
// L'ennemi porte deux coups critiques à l'allié : deux enregistrements au registre (étape 5), avec leurs États.
const critAttack = (resolutionId, effectRoll) => ({ resolutionId, actorId: 'foe', targetId: 'ally', roll: 22,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' },
  criticalRolls: { location: 2, effect: effectRoll } });
async function woundAllyTwice(store) {
  const ids = [];
  for (const [index, effectRoll] of [80, 45].entries()) {
    const preview = store.previewResolution(critAttack(`w${index + 1}`, effectRoll));
    assert.ok(preview.critical?.details, 'critique attendu');
    const result = await store.applyResolution(preview);
    assert.notEqual(result.status, 'manual', result.reason);
    ids.push(records(store, 'ally').at(-1).id);
  }
  assert.equal(records(store, 'ally').length, 2, 'deux Blessures Critiques au registre');
  return ids;
}
const invokeInput = (ids, roll) => ({ actorId: 'priest', targetIds: ['ally'], roll, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
  criticalHeals: { first: { ally: ids[0] ?? '' }, second: { ally: ids[1] ?? '' }, third: { ally: ids[2] ?? '' } },
  facts: { targets: { ally: { withinTouch: true } } } });

test('Larmes de Shallya : contrat assisté (non manuel) portant l’effet heal-critical', () => {
  const contract = getDivineContract(TEARS);
  assert.ok(contract);
  assert.notEqual(contract.status, 'manual', 'le contrat ne doit plus être manuel');
  assert.deepEqual(contract.effects.map(effect => ({ type: effect.type, count: effect.count, perSuccessLevels: effect.perSuccessLevels })),
    [{ type: 'heal-critical', count: 1, perSuccessLevels: { every: 2, add: 1, field: 'count' } }]);
});

test('Larmes de Shallya : +2 DR guérit les deux Blessures Critiques ; les États des critiques restent', async () => {
  const store = await fixture();
  const ids = await woundAllyTwice(store);
  const statesBefore = person(store, 'ally').states.length;
  assert.ok(statesBefore > 0, 'des États posés par les critiques');
  const preview = store.previewDivineExecution(TEARS, invokeInput(ids, 45));
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(TEARS, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(records(store, 'ally').length, 0, 'les deux enregistrements sont retirés');
  assert.equal(person(store, 'ally').states.length, statesBefore, 'les États posés par les critiques restent');
  const receipt = result.receipt.effectReceipts.find(row => row.type === 'heal-critical');
  assert.ok(receipt, 'reçu heal-critical');
  assert.deepEqual(receipt.result.healedIds, ids, 'le reçu liste les Blessures guéries');
  assert.ok(receipt.result.reminders.includes('Prière de (10 − Bonus de Sociabilité) Rounds avant l’effet ; interrompue, aucun effet.'), 'rappel des Rounds de prière');
  assert.ok(receipt.result.reminders.includes('Ne rattache pas les membres amputés.'), 'rappel des membres amputés');
});

test('Larmes de Shallya : à +1 DR, choisir deux Blessures Critiques est refusé', async () => {
  const store = await fixture();
  const ids = await woundAllyTwice(store);
  const preview = store.previewDivineExecution(TEARS, invokeInput(ids, 58));
  assert.equal(preview.ready, false, 'une seule Blessure guérie à +1 DR');
  assert.ok(preview.needsInput.some(row => /Blessures Critiques choisies que guéries/.test(row.label)),
    `besoin attendu : ${JSON.stringify(preview.needsInput)}`);
});

test('Larmes de Shallya : identifiant inconnu ou répété refusé', async () => {
  const store = await fixture();
  const ids = await woundAllyTwice(store);
  const unknown = store.previewDivineExecution(TEARS, invokeInput([ids[0], 'w0:crit:ally:9'], 45));
  assert.equal(unknown.ready, false, 'une Blessure inexistante ne peut être guérie');
  assert.ok(unknown.needsInput.some(row => /introuvable/.test(row.label)), JSON.stringify(unknown.needsInput));
  const repeated = store.previewDivineExecution(TEARS, invokeInput([ids[0], ids[0]], 45));
  assert.equal(repeated.ready, false, 'la même Blessure ne peut être guérie deux fois');
  assert.ok(repeated.needsInput.some(row => /distinctes/.test(row.label)), JSON.stringify(repeated.needsInput));
});

test('Larmes de Shallya : cible sans Blessure Critique — aucune saisie exigée, aucun retrait', async () => {
  const store = await fixture();
  const statesBefore = person(store, 'ally').states.length;
  const preview = store.previewDivineExecution(TEARS, invokeInput([], 45));
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(TEARS, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(records(store, 'ally').length, 0, 'aucun enregistrement à retirer');
  assert.equal(person(store, 'ally').states.length, statesBefore, 'aucun État touché');
});

test('Larmes de Shallya : l’Undo rétablit les enregistrements guéris', async () => {
  const store = await fixture();
  const ids = await woundAllyTwice(store);
  const preview = store.previewDivineExecution(TEARS, invokeInput(ids, 45));
  const result = await store.applyDivineExecution(TEARS, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(records(store, 'ally').length, 0);
  await store.undo();
  assert.equal(records(store, 'ally').length, 2, 'l’Undo rétablit les deux enregistrements');
  assert.deepEqual(records(store, 'ally').map(row => row.id), ids, 'les identifiants stables sont restaurés');
});
