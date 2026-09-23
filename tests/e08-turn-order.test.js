import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_MODES,
  effectiveOrder,
  insertReinforcement,
  moveInOrder,
  nextTurn,
  removeFromCombat,
  setOrderMode
} from '../js/core/turn-order.js';

const participants = [
  { id: 'a', name: 'A', initiative: 30, zone: 'active' },
  { id: 'b', name: 'B', initiative: 50, zone: 'active' },
  { id: 'bench', name: 'Bench', initiative: 99, zone: 'bench' }
];

test('E08 ordre — tri automatique exclut le banc et tranche les égalités', () => {
  assert.deepEqual(effectiveOrder(participants), ['b', 'a']);
  assert.deepEqual(effectiveOrder([
    { id: 'z', name: 'Z', initiative: 20, zone: 'active' },
    { id: 'a', name: 'A', initiative: 20, zone: 'active' }
  ]), ['a', 'z']);
});

test('E08 ordre — déplacement manuel devient l’ordre effectif sans fin de tour', () => {
  const moved = moveInOrder(['b', 'a'], 'a', 'b');
  assert.deepEqual(moved, ['a', 'b']);
  assert.deepEqual(effectiveOrder(participants, { mode: ORDER_MODES.MANUAL, order: moved }), moved);
  const mode = setOrderMode(participants, { mode: ORDER_MODES.MANUAL, order: moved, currentActorId: 'b' });
  assert.deepEqual(mode.order, moved);
  assert.equal(mode.currentActorId, 'b');
});

test('E08 ordre — renfort inséré après l’acteur courant', () => {
  assert.deepEqual(insertReinforcement(['a', 'b'], 'reinforcement', 'a'), ['a', 'reinforcement', 'b']);
  assert.deepEqual(insertReinforcement(['a', 'b'], 'reinforcement', 'missing'), ['a', 'b', 'reinforcement']);
});

test('E08 tours — boucle et round sont déterministes, sans effet périodique implicite', () => {
  const first = nextTurn({ participants, order: ['b', 'a'], currentActorId: 'b', round: 1 });
  assert.deepEqual(first, { order: ['b', 'a'], currentActorId: 'a', round: 1 });
  const wrapped = nextTurn({ participants, order: ['b', 'a'], currentActorId: 'a', round: 1 });
  assert.deepEqual(wrapped, { order: ['b', 'a'], currentActorId: 'b', round: 2 });
  const solo = nextTurn({ participants: [participants[0]], order: ['a'], currentActorId: 'a', round: 2 });
  assert.equal(solo.round, 3);
});

test('E08 tours — retrait de l’acteur sélectionne le prochain survivant avant retrait', () => {
  const result = removeFromCombat({
    participants, order: ['b', 'a'], currentActorId: 'b', participantId: 'b'
  });
  assert.deepEqual(result, { order: ['a'], currentActorId: 'a' });
  const nonCurrent = removeFromCombat({
    participants, order: ['b', 'a'], currentActorId: 'b', participantId: 'a'
  });
  assert.deepEqual(nonCurrent, { order: ['b'], currentActorId: 'b' });
  assert.deepEqual(removeFromCombat({ participants: [], order: [], currentActorId: 'x', participantId: 'x' }), {
    order: [], currentActorId: null
  });
});
