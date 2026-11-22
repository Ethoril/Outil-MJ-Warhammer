import test from 'node:test';
import assert from 'node:assert/strict';
import { visionDimOf, tokenStateOf } from '../../../js/core/map-link-state.js';

// G8-b (R10, p. 123 et 360) : le talent Vision nocturne d'un PJ vaut le Trait (10 cases) ; Infravision 20 ; rien 1.
const pj = extra => ({ id: 'p', kind: 'PJ', persistentCharacterId: 'c1', name: 'Ulrika', hp: 10, maxHp: 10, states: [], movement: 4, talents: [], traits: [], ...extra });
const nocturne = { id: 'talent-night-vision', status: 'resolved', rank: 1 };

test('PJ avec le talent Vision nocturne : visionDim 10', () => {
  assert.equal(visionDimOf(pj({ talents: [nocturne] })), 10);
  assert.equal(tokenStateOf(pj({ talents: [nocturne] })).visionDim, 10);
});

test('talent non résolu ou rang nul : ignoré (même lecture que le moteur)', () => {
  assert.equal(visionDimOf(pj({ talents: [{ id: 'talent-night-vision', status: 'unresolved', rank: 1 }] })), 1);
});

test('Infravision l’emporte sur la Vision nocturne du talent : 20 ; rien : 1', () => {
  assert.equal(visionDimOf(pj({ talents: [nocturne], traits: ['Dark Vision'] })), 20);
  assert.equal(visionDimOf(pj()), 1);
});

test('PNJ : Traits inchangés', () => {
  assert.equal(visionDimOf({ id: 'n', kind: 'PNJ', traits: ['Night Vision'] }), 10);
  assert.equal(visionDimOf({ id: 'n', kind: 'PNJ', traits: ['Dark Vision'] }), 20);
  assert.equal(visionDimOf({ id: 'n', kind: 'PNJ', traits: [] }), 1);
});
