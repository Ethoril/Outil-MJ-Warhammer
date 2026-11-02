import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { buildDivineForm, describeEffectResult, emptyDivineForm, setFieldValue, toEngineInput } from '../../../js/ui/v5-divine-form-model.js';

// Lot 5 · C51 / G-DIV-13 : Larmes de Shallya avec « Retirer aussi les États liés » coché ; la ligne de journal et le reçu
// doivent nommer les États retirés avec le critique, pas seulement le critique.
const clone = value => structuredClone(value);
const TEARS = 'divine:miracle:shallya:shallya-s-tears';
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
    extensions: { v5: { turnIndex: 1, combatId: 'c51' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const critAttack = (resolutionId, effectRoll) => ({ resolutionId, actorId: 'foe', targetId: 'ally', roll: 22,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' },
  criticalRolls: { location: 2, effect: effectRoll } });

test('C51 : les États retirés avec le critique sont nommés dans la ligne de journal et le reçu lisible', async () => {
  const store = await fixture();
  const attack = store.previewResolution(critAttack('c51', 45));
  assert.equal((await store.applyResolution(attack)).status, 'applied');
  const wound = records(store, 'ally')[0], before = clone(person(store, 'ally').states);
  const stateNames = wound.stateIds.map(id => before.find(state => state.id === id).name);
  assert.ok(stateNames.length && stateNames.every(Boolean));
  const form = emptyDivineForm(), contract = getDivineContract(TEARS);
  const model = buildDivineForm(contract, { actor: person(store, 'priest'), targets: [person(store, 'ally')], form });
  setFieldValue(form, model.effectFields.find(field => field.engineField === 'criticalHealStates.ally'), true);
  const input = { actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
    ...toEngineInput(form, { targetIds: ['ally'], contract, actor: person(store, 'priest') }),
    criticalHeals: { first: { ally: wound.id } }, facts: { targets: { ally: { withinTouch: true } } } };
  const preview = store.previewDivineExecution(TEARS, input);
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput));
  const result = await store.applyDivineExecution(TEARS, { preview });
  assert.equal(result.ready, true, result.error);
  const row = result.receipt.effectReceipts.find(item => item.type === 'heal-critical');
  for (const name of stateNames) {
    assert.ok(row.log.includes(name), `journal : « ${name} » absent de « ${row.log} »`);
    assert.ok(describeEffectResult(row, { contract, participants: store.listParticipants() })?.includes(name), `reçu : « ${name} » absent`);
  }
});

test('C51 : sans retrait des États, ni la ligne ni le reçu n’en annoncent', () => {
  const row = { targetId: 'ally', type: 'heal-critical', result: { healed: ['Oreille mutilée'], removedStates: [], remaining: 0 } };
  assert.ok(!/État/.test(describeEffectResult(row, { participants: [{ id: 'ally', name: 'ally' }] })));
});
