import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpellContract, validateSpellTargets } from '../js/core/v5-spell-contracts.js';

// Lot v3-C : talents, magie et créatures du livre de base V5 EN v3.

test('v3 Souffle (p.243) : le lanceur est immunisé à son propre Souffle, il ne peut pas être touché', () => {
  const contract = getSpellContract('Souffle');
  const caster = { id: 'mage', camp: 'pj' }, foe = { id: 'foe', camp: 'ennemi' };
  assert.equal(validateSpellTargets(contract, caster, [foe]).valid, true);
  const own = validateSpellTargets(contract, caster, [foe, caster]);
  assert.equal(own.valid, false);
  assert.equal(own.status, 'invalid-target-admissibility');
});
