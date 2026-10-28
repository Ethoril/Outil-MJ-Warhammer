import test from 'node:test';
import assert from 'node:assert/strict';
import { previewV5Test } from '../js/core/v5-roll.js';
import { previewCombatFailure } from '../js/core/v5-combat-fumbles.js';

const normalized = {
  actor: { id: 'gunner', extensions: { v5: {} } },
  action: { type: 'attack', note: 'Arquebuse à salve' },
  resolutionId: 'volley-recoil-roll-characterization'
};

function recoil(base, roll) {
  const result = previewCombatFailure({
    normalized,
    context: {
      firing: true,
      crewCount: 2,
      weaponName: 'Arquebuse à salve',
      recoilTestBase: base,
      recoilTestRoll: roll,
      recoilCriticalRolls: 20,
      blackpowderStockInitial: { confirmed: true, projectiles: 1, powderCharges: 1 }
    }
  });
  return { result, effect: result.effects.find(row => row.type === 'volley-recoil') };
}

test('T2 bis caractérisation — le recul reprend les automatiques V5 01–05 et 96–100', () => {
  const automaticOutcomes = [];
  for (const roll of [1, 2, 3, 4, 5]) {
    const { effect } = recoil(1, roll);
    const v5 = previewV5Test({ score: 21, roll }).options[0].result;
    assert.equal(v5.details.automatic, 'success');
    automaticOutcomes.push({ roll, actual: [effect.success, effect.sl], expected: [v5.success, v5.sl] });
  }

  for (const roll of [96, 97, 98, 99, 100]) {
    const { effect } = recoil(80, roll); // Résistance +20 atteint 100.
    const v5 = previewV5Test({ score: 100, roll }).options[0].result;
    assert.equal(v5.details.automatic, 'failure');
    automaticOutcomes.push({ roll, actual: [effect.success, effect.sl, effect.astoundingFailure], expected: [v5.success, v5.sl, v5.sl <= -5] });
  }
  assert.deepEqual(automaticOutcomes.filter(row => JSON.stringify(row.actual) !== JSON.stringify(row.expected)), []);
});

test('T2 bis caractérisation — un double raté 99 ou 100 donne un fumble à -5 DR au recul', () => {
  const doubleOutcomes = [];
  for (const roll of [99, 100]) {
    const { effect } = recoil(80, roll);
    const v5 = previewV5Test({ score: 100, roll }).options[0].result;
    assert.equal(v5.fumble, true);
    assert.equal(v5.sl, -5);
    doubleOutcomes.push({ roll, actual: [effect.success, effect.sl, effect.astoundingFailure, Boolean(effect.armCritical)], expected: [false, -5, true, true] });
  }
  assert.deepEqual(doubleOutcomes.filter(row => JSON.stringify(row.actual) !== JSON.stringify(row.expected)), []);
});
