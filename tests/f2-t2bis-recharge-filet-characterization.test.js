import test from 'node:test';
import assert from 'node:assert/strict';
import { createV5ReloadState, advanceV5Reload } from '../js/core/v5-reloading.js';
import { advanceV5NetEscape } from '../js/core/v5-weapon-qualities.js';

test('T2 bis — recharge: chaque réussite ajoute 1 + DR positifs, un échec ajoute zéro', () => {
  const initial = createV5ReloadState({ repeaterRating: 0, reloadSuccesses: 5 }).state;
  const begun = { ...initial, reloading: true, requiresReload: true, requiredSuccesses: 5 };
  const atZero = advanceV5Reload(begun, { success: true, testSl: 0 });
  assert.equal(atZero.progress.successes, 1);
  const atPlusTwo = advanceV5Reload(atZero.state, { success: true, testSl: 2 });
  assert.equal(atPlusTwo.progress.successes, 3);
  const failed = advanceV5Reload(atPlusTwo.state, { success: false, testSl: -1 });
  assert.equal(failed.progress.successes, 0);
  assert.equal(failed.state.accumulatedSuccesses, 4);
});

test('T2 bis — sortie de filet: Test opposé à la Force du filet et DR après le premier réduisent les états', () => {
  const result = advanceV5NetEscape({ actorStrength: 40, netStrength: 35, testSl: 2, netTestSl: 0, entangled: 3 });
  assert.equal(result.opposed, true);
  assert.equal(result.freed, false);
  assert.equal(result.remainingEntangled, 1);
});

test('T2 bis — sortie de filet: échec opposé ajoute un état Empêtré', () => {
  const result = advanceV5NetEscape({ actorStrength: 30, netStrength: 50, testSl: 0, netTestSl: 2, entangled: 1 });
  assert.equal(result.success, false);
  assert.equal(result.addEntangledOnFailure, true);
});
