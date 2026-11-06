// L5-MJ : bande de portée préremplie depuis la distance mesurée sur la carte (mètres = yards).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeV5WeaponRangeBands, v5RangeBandForMeters } from '../../../js/core/v5-talent-combat.js';

test('arc de 30 m : chaque distance tombe dans sa bande, bornes incluses', () => {
  const bands = computeV5WeaponRangeBands(30);
  assert.deepEqual([4, 5, 15, 16, 30, 31, 60, 61, 90].map(m => v5RangeBandForMeters(m, bands)),
    ['point-blank', 'short', 'short', 'medium', 'medium', 'long', 'long', 'extreme', 'extreme']);
});

test('au-delà de l’Extrême : pas de bande, le MJ décide', () => {
  assert.equal(v5RangeBandForMeters(91, computeV5WeaponRangeBands(30)), null);
});

test('portée courte de 4 m ou moins : jamais de bout portant', () => {
  assert.equal(v5RangeBandForMeters(1, computeV5WeaponRangeBands(8)), 'short');
});

test('sans portée connue ou sans mesure : pas de bande', () => {
  assert.equal(v5RangeBandForMeters(10, null), null);
  assert.equal(v5RangeBandForMeters(Number.NaN, computeV5WeaponRangeBands(30)), null);
});
