import test from 'node:test';
import assert from 'node:assert/strict';
import { SL, isDouble, getReverseRoll, getLocationName, getCritEffect } from '../js/core/dice.js';

test('SL (Degrés de succès)', () => {
  assert.equal(SL(50, 23), 3); // 5 - 2 = 3
  assert.equal(SL(50, 50), 0); // 5 - 5 = 0
  assert.equal(SL(50, 51), 0); // 5 - 5 = 0
  assert.equal(SL(50, 60), -1); // 5 - 6 = -1
  assert.equal(SL(50, 100), -5); // 5 - 10 = -5
});

test('isDouble', () => {
  assert.equal(isDouble(11), true);
  assert.equal(isDouble(55), true);
  assert.equal(isDouble(99), true);
  assert.equal(isDouble(100), true); // 00 compte comme double (A-13 / Fix 6.6)
  assert.equal(isDouble(10), false);
  assert.equal(isDouble(42), false);
});

test('getReverseRoll', () => {
  assert.equal(getReverseRoll(23), 32);
  assert.equal(getReverseRoll(4), 40); // '04' -> '40'
  assert.equal(getReverseRoll(10), 1); // '10' -> '01' -> 1
  assert.equal(getReverseRoll(100), 100); // 100 traité comme '00' -> 100 (A-13 / Fix 6.6)
});

test('getLocationName', () => {
  assert.equal(getLocationName(9).name, 'Tête');
  assert.equal(getLocationName(10).name, 'Bras Gauche');
  assert.equal(getLocationName(24).name, 'Bras Gauche');
  assert.equal(getLocationName(25).name, 'Bras Droit');
  assert.equal(getLocationName(44).name, 'Bras Droit');
  assert.equal(getLocationName(45).name, 'Corps');
  assert.equal(getLocationName(79).name, 'Corps');
  assert.equal(getLocationName(80).name, 'Jambe Gauche');
  assert.equal(getLocationName(89).name, 'Jambe Gauche');
  assert.equal(getLocationName(90).name, 'Jambe Droite');
  assert.equal(getLocationName(100).name, 'Jambe Droite');
});

test('getCritEffect', () => {
  const head1 = getCritEffect('HEAD', 5);
  assert.equal(head1.name, 'Blessure spectaculaire');

  const head100 = getCritEffect('HEAD', 100);
  assert.equal(head100.name, 'Décapitation');

  const invalid = getCritEffect('INVALID_KEY', 50);
  assert.equal(invalid, null);
});
