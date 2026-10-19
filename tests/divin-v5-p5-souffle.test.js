import test from 'node:test';
import assert from 'node:assert/strict';
import { getDivineContract } from '../js/core/v5-divine-store.js';
import { contracts, encounter, cast, subject, level, endTurn } from './helpers/lot3-domain-fixture.js';

// P5 — Bénédiction de Souffle (V5 p.221) : « la cible n'a pas besoin de respirer et ignore les règles d'Étouffement ».
// Effet déclaratif `doesNotBreathe` (état spécial) lu par le lecteur d'étouffement des sorts ; critère écrit avant l'implémentation.
const BREATH = 'divine:blessing:manann:breath';
const SHADOWS = () => contracts.find(c => c.canonicalName === 'Choking Shadows');
const priest = { id: 'priest', name: 'priest', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 40, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Manann' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } } };
// Le Magister jette Ombres Étouffantes sur « foe » (1 B), le prêtre peut bénir.
async function fixture() {
  const { store, engine } = await encounter({ foe: { hp: 1, caracs: { CC: 50, CT: 50, F: 40, E: 10, I: 50, Ag: 50, Dex: 50, Int: 60, FM: 60, Soc: 50, M: 4 } } });
  await cast(store, SHADOWS());
  const state = JSON.parse(store.getFullJSON());
  state.combat.participants.push(structuredClone(priest)); state.combat.order = ['mage', 'priest', 'foe'];
  await store.loadFromJSON(state);
  return { store, engine };
}
const bless = async store => {
  const preview = store.previewDivineExecution(BREATH, { actorId: 'priest', targetIds: ['foe'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
    expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, facts: { targets: { foe: { withinRange: true } } } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(BREATH, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
};
const rounds = async (engine, count) => { for (let i = 0; i < count * 3; i++) await endTurn(engine); };

test('Souffle : le contrat n’est plus manuel et déclare « ne respire pas »', () => {
  const contract = getDivineContract(BREATH);
  assert.notEqual(contract.status, 'manual');
  assert.deepEqual(contract.effects.map(effect => effect.type), ['special-state']);
  assert.equal(contract.effects[0].doesNotBreathe, true);
  assert.match(contract.labels.effect, /noyade.*fumée/i, 'rappel MJ pour les situations non modélisées');
});

test('Souffle : la cible bénie ne s’étouffe pas ; à l’expiration l’étouffement reprend ; Undo restaure', async () => {
  const { store, engine } = await fixture();
  const result = await bless(store);
  assert.equal(subject(store, 'foe').extensions.v5.specialStates.doesNotBreathe, true);
  await rounds(engine, 3);
  assert.equal(subject(store, 'foe').hp, 1, 'aucune Blessure d’étouffement');
  assert.equal(level(subject(store, 'foe'), 'Inconscient'), 0);
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(subject(store, 'foe').extensions.v5.specialStates?.doesNotBreathe, undefined);
  await rounds(engine, 2);
  assert.equal(subject(store, 'foe').hp, 0, 'l’étouffement a repris');
});

test('Souffle : Undo retire la protection', async () => {
  const { store, engine } = await fixture();
  await bless(store);
  await store.undo();
  assert.equal(subject(store, 'foe').extensions.v5.specialStates?.doesNotBreathe, undefined);
  await rounds(engine, 1);
  assert.equal(subject(store, 'foe').hp, 0);
});

test('Non-régression : sans bénédiction, la cible s’étouffe comme avant', async () => {
  const { store, engine } = await fixture();
  await rounds(engine, 2);
  assert.equal(subject(store, 'foe').hp, 0);
  assert.equal(level(subject(store, 'foe'), 'Inconscient'), 1);
});
