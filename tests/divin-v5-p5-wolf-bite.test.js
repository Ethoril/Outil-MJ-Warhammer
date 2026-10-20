import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';

// P5 — Morsure du Loup (Ulric, Power Behind the Throne Companion p.50) : +20 au jet de gravité de toute Blessure Critique que le
// prêtre inflige pendant la durée (attaque ou défense). Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const WOLF = 'divine:miracle:ulric:wolf-s-bite';
const clone = value => structuredClone(value);
const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 20, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4 },
  equipment: [], traits: [], states: [], talents: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const priest = () => fighter('priest', { kind: 'PJ', camp: 'pj', initiative: 60, caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ulric' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ulric' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  extensions: { v5: { divine: { sin: 0 }, hasMomentum: false } } });
async function fixture() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'foe'], participants: [priest(), fighter('foe')] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'wolf' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
async function invoke(store) {
  const preview = store.previewDivineExecution(WOLF, { actorId: 'priest', targetIds: ['priest'], roll: 45, canSpeak: true, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' },
    choices: { range: 0, targets: 0, duration: 0, effect: 0 }, facts: { targets: { priest: { withinRange: true, withinTouch: true } } } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(WOLF, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
// Le prêtre attaque et inflige un critique (double 22), gravité saisie 50.
const priestAttack = store => store.previewResolution({ resolutionId: 'pa', actorId: 'priest', targetId: 'foe', roll: 22,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' },
  criticalRolls: { location: 2, effect: 50 } });
// L'ennemi attaque ; le prêtre défend avec un critique (double 22).
const foeAttack = (store, defenderCrit) => store.previewResolution({ resolutionId: 'fa', actorId: 'foe', targetId: 'priest', roll: defenderCrit ? 45 : 22,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 60, roll: defenderCrit ? 22 : 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' },
  criticalRolls: { location: 2, effect: 50 }, defenderCriticalRolls: { location: 2, effect: 50 } });

test('Morsure du Loup : le contrat n’est plus manuel', () => {
  assert.notEqual(getDivineContract(WOLF).status, 'manual');
});

test('Morsure du Loup : +20 à la gravité des critiques infligés en attaque et en défense, pas à ceux subis ; fin de prière et Undo', async () => {
  const store = await fixture();
  const baseAttack = priestAttack(store).critical.details;
  const baseDefense = foeAttack(store, true).defenderCritical.details;
  const baseSuffered = foeAttack(store, false).critical.details;
  assert.equal(baseAttack.effectRollBase, 50);
  const result = await invoke(store);
  assert.equal(priestAttack(store).critical.details.effectRoll, baseAttack.effectRoll + 20, 'critique infligé en attaque');
  assert.equal(foeAttack(store, true).defenderCritical.details.effectRoll, baseDefense.effectRoll + 20, 'critique infligé en défense');
  assert.equal(foeAttack(store, false).critical.details.effectRoll, baseSuffered.effectRoll, 'critique subi inchangé');
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(priestAttack(store).critical.details.effectRoll, baseAttack.effectRoll, 'fin de prière');
  await store.undo();
  assert.equal(priestAttack(store).critical.details.effectRoll, baseAttack.effectRoll + 20, 'Undo rétablit la prière');
  await store.undo();
  assert.equal(priestAttack(store).critical.details.effectRoll, baseAttack.effectRoll, 'Undo annule l’invocation');
});
