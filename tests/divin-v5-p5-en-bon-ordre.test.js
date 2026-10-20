import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getAllDivineContracts } from '../js/core/v5-divine-store.js';

// P5 T5 — En Bon Ordre (Myrmidia, Up in Arms p.79) : tant que le miracle dure, les alliés désignés portent « En bon ordre »
// (drapeau special-state orderlyDisengage) : Désengagement sans Élan ni attaque gratuite adverse, à appliquer par le MJ
// (le moteur ne gère pas le Désengagement). Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const clone = value => structuredClone(value);
const ORDER = () => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === 'En Bon Ordre');
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
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally1', 'ally2', 'other'], participants: [
    actor('priest'), actor('ally1', { initiative: 40 }), actor('ally2', { initiative: 30 }), actor('other', { initiative: 20 })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const flag = (store, id) => person(store, id).extensions.v5.specialStates?.orderlyDisengage === true;

test('En Bon Ordre : contrat assisté (non manuel) portant l’effet special-state orderlyDisengage', () => {
  const contract = ORDER();
  assert.ok(contract);
  assert.notEqual(contract.status, 'manual', 'le contrat ne doit plus être manuel');
  assert.deepEqual(contract.effects.map(effect => ({ type: effect.type, orderlyDisengage: effect.orderlyDisengage })),
    [{ type: 'special-state', orderlyDisengage: true }]);
  assert.ok(contract.clauses.some(row => row.mode === 'engine' && /En bon ordre/.test(row.text)), 'clause moteur du Désengagement');
});

test('En Bon Ordre : drapeau sur les deux alliés désignés seulement ; « Terminer la prière » le retire ; Undo le restaure', async () => {
  const store = await fixture();
  const contract = ORDER();
  const input = { actorId: 'priest', targetIds: ['ally1', 'ally2'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
    expiry: { phase: 'endOfTurn', round: 5, actorId: 'priest' }, facts: { targets: { ally1: { withinRange: true }, ally2: { withinRange: true } } } };
  const preview = store.previewDivineExecution(contract.id, input);
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(contract.id, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(flag(store, 'ally1'), true, 'ally1 porte « En bon ordre »');
  assert.equal(flag(store, 'ally2'), true, 'ally2 porte « En bon ordre »');
  assert.equal(flag(store, 'other'), false, 'un participant non désigné ne porte pas le drapeau');
  assert.equal(flag(store, 'priest'), false, 'le prêtre non désigné ne porte pas le drapeau');
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(flag(store, 'ally1'), false, 'fin de prière : drapeau retiré');
  assert.equal(flag(store, 'ally2'), false, 'fin de prière : drapeau retiré');
  await store.undo();
  assert.equal(flag(store, 'ally1'), true, 'Undo restaure le drapeau');
  assert.equal(flag(store, 'ally2'), true, 'Undo restaure le drapeau');
});
