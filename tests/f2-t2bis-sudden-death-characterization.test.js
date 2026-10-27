import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decideSuddenDeath,
  previewSuddenDeath
} from '../js/core/v5-critical-aftermath.js';

const npc = (overrides = {}) => ({
  id: 'extra', name: 'Figurant', kind: 'PNJ', hp: 0, states: [],
  extensions: { v5: {} }, talents: [], ...overrides
});

test('T2 bis — mort subite inactive par défaut et réservée au choix MJ d’un figurant éligible', () => {
  const target = npc();
  assert.equal(previewSuddenDeath(target).status, 'disabled');
  const eligible = previewSuddenDeath(target, { tableOptionEnabled: true, secondaryNpcConfirmed: true });
  assert.equal(eligible.status, 'choice-required');
  assert.deepEqual(eligible.outcomes, ['dead', 'unconscious']);
  assert.equal(decideSuddenDeath(target, eligible, undefined).status, 'confirmation-required');
});

test('T2 bis — PJ, Chanceux, PNJ non confirmé et figurant au-dessus de 0 B sont exclus', () => {
  const cases = [
    [npc({ kind: 'PJ' }), true],
    [npc({ talents: [{ id: 'talent-luck' }] }), true],
    [npc(), false],
    [npc({ hp: 1 }), true]
  ];
  for (const [target, secondaryNpcConfirmed] of cases) {
    assert.notEqual(previewSuddenDeath(target, { tableOptionEnabled: true, secondaryNpcConfirmed }).status, 'choice-required');
  }
});

test('T2 bis — résolution refusée sans choix explicite, morte ou inconsciente après choix MJ', () => {
  const target = npc();
  const plan = previewSuddenDeath(target, { tableOptionEnabled: true, secondaryNpcConfirmed: true });
  assert.equal(decideSuddenDeath(target, plan, 'other').status, 'confirmation-required');
  const dead = decideSuddenDeath(target, plan, 'dead');
  assert.equal(dead.status, 'dead');
  assert.equal(dead.participant.hp, 0);
  assert.equal(dead.participant.extensions.v5.dead, true);
  const unconscious = decideSuddenDeath(target, plan, 'unconscious');
  assert.equal(unconscious.status, 'unconscious');
  assert.equal(unconscious.participant.hp, 0);
  assert.ok(unconscious.participant.states.some(state => state.key === 'inconscient'));
});
