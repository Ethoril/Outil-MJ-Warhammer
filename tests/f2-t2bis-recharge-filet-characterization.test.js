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
  assert.equal(atPlusTwo.progress.successes, 4, 'the displayed progress includes both Tests: 1 + (1 + 2)');
  const failed = advanceV5Reload(atPlusTwo.state, { success: false, testSl: -1 });
  assert.equal(failed.progress.successes, 4, 'progress.successes is cumulative; a failed Test adds zero');
  assert.equal(failed.state.accumulatedSuccesses, 4);
});

test('T2 bis — sortie de filet: victoire opposée, DR après le premier retirent un Empêtré supplémentaire', () => {
  const result = advanceV5NetEscape({ testSl: 2, opponentSl: 0, entangled: 3 });
  assert.equal(result.won, true);
  assert.equal(result.freed, true);
  assert.equal(result.removedEntangled, 2);
  assert.equal(result.remainingEntangled, 1);
});

test('T2 bis — décision MJ: échec de sortie de filet ne change rien', () => {
  const result = advanceV5NetEscape({ testSl: 0, opponentSl: 2, entangled: 1 });
  assert.equal(result.won, false);
  assert.equal(result.addEntangledOnFailure, false);
  assert.equal(result.remainingEntangled, 1);
});

test('T2 bis — Mancatcher à ressort: son bonus de +2 DR relève le résultat de la source', () => {
  const result = advanceV5NetEscape({ testSl: 2, opponentSl: 0, opponentBonus: 2, entangled: 2 });
  assert.equal(result.won, true, 'égalité d’opposition remportée par l’initiateur');
  assert.equal(result.opponentSl, 2);
  assert.equal(result.remainingEntangled, 1);
});
