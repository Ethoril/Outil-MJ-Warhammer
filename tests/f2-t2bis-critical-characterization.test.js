import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveOrder, nextTurn, ORDER_MODES } from '../js/core/turn-order.js';

const participants = [
  { id: 'a', name: 'A', initiative: 40, zone: 'active' },
  { id: 'b', name: 'B', initiative: 60, zone: 'active', extensions: { v5: { combatEffects: [{ id: 'late', kind: 'acts-last-next-round', round: 2 }] } } }
];

test('T2 bis characterization — acts-last on an uninitialized legacy combat does not skip a Turn', () => {
  // Old saves can have no initialized combat initiative and retain a cached order.
  // The first Round is B, A; only Round 2 should be A, B, then return to B, A.
  let order = ['b', 'a'];
  let actor = 'b';
  let round = 1;
  const observed = [];
  for (let i = 0; i < 6; i++) {
    observed.push(`${round}:${actor.toUpperCase()}`);
    const transition = nextTurn({ participants, order, currentActorId: actor, round });
    order = transition.order;
    actor = transition.currentActorId;
    round = transition.round;
    if (actor) order = effectiveOrder(participants, { mode: ORDER_MODES.MANUAL, order, round });
  }
  assert.deepEqual(observed, ['1:B', '1:A', '2:A', '2:B', '3:B', '3:A']);
});
