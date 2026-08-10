import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDamage, PLANCHER_TOUCHE, FACTEUR_INOFFENSIVE } from '../js/core/damage.js';

test('computeDamage — Cas nominal', () => {
  // Dégâts 6, SL 2, BE 3, PA 2 -> net = 6 + 2 - (3 + 2) = 3
  const res = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 2, qualities: [] });
  assert.equal(res.net, 3);
  assert.equal(res.finalDamage, 3);
  assert.equal(res.isPlancher, false);
});

test('computeDamage — Absorption totale -> Plancher (1)', () => {
  // Dégâts 4, SL 1, BE 3, PA 4 -> net = 5 - 7 = -2 -> finalDamage = 1 (plancher)
  const res = computeDamage({ weaponDamage: 4, sl: 1, targetToughnessBonus: 3, targetArmour: 4, qualities: [] });
  assert.equal(res.net, -2);
  assert.equal(res.finalDamage, PLANCHER_TOUCHE);
  assert.equal(res.isPlancher, true);
});

test('computeDamage — Absorption égale au brut (net = 0) -> Plancher (1)', () => {
  // Dégâts 5, SL 0, BE 3, PA 2 -> net = 5 - 5 = 0 -> finalDamage = 1 (plancher)
  const res = computeDamage({ weaponDamage: 5, sl: 0, targetToughnessBonus: 3, targetArmour: 2, qualities: [] });
  assert.equal(res.net, 0);
  assert.equal(res.finalDamage, PLANCHER_TOUCHE);
  assert.equal(res.isPlancher, true);
});

test('computeDamage — Qualité Inoffensive (PA doublés, pas de plancher)', () => {
  // Dégâts 6, SL 2, BE 3, PA 2 x 2 = 4 -> net = 8 - 7 = 1
  const res1 = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 2, qualities: [{ id: 'inoffensive' }] });
  assert.equal(res1.paEffectif, 4);
  assert.equal(res1.finalDamage, 1);
  assert.equal(res1.isPlancher, false);

  // Dégâts 4, SL 0, BE 3, PA 2 x 2 = 4 -> net = 4 - 7 = -3 -> finalDamage = 0 (pas de plancher !)
  const res2 = computeDamage({ weaponDamage: 4, sl: 0, targetToughnessBonus: 3, targetArmour: 2, qualities: [{ id: 'inoffensive' }] });
  assert.equal(res2.net, -3);
  assert.equal(res2.finalDamage, 0);
  assert.equal(res2.isPlancher, false);
});

test('computeDamage — Inoffensive sur cible sans armure (2 x 0 = 0)', () => {
  const res = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 0, qualities: [{ id: 'inoffensive' }] });
  assert.equal(res.paEffectif, 0);
  assert.equal(res.finalDamage, 5);
});

test('computeDamage — SL négatif sur réussite marginale', () => {
  // Dégâts 8, SL -1, BE 3, PA 2 -> net = 7 - 5 = 2
  const res = computeDamage({ weaponDamage: 8, sl: -1, targetToughnessBonus: 3, targetArmour: 2 });
  assert.equal(res.finalDamage, 2);
});

test('computeDamage — Qualité inconnue ignorée', () => {
  const resNominal = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 2, qualities: [] });
  const resUnknown = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 2, qualities: [{ id: 'magique' }] });
  assert.deepEqual(resNominal, resUnknown);
});

test('computeDamage — Qualité avec rating inconnue ignorée', () => {
  const resNominal = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 2, qualities: [] });
  const resUnknownRating = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 2, qualities: [{ id: 'explosion', rating: 3 }] });
  assert.deepEqual(resNominal, resUnknownRating);
});

test('computeDamage — Cible sans E ou sans armure (pas de crash)', () => {
  assert.doesNotThrow(() => {
    const res = computeDamage({ weaponDamage: 5, sl: 1 });
    assert.equal(res.be, 0);
    assert.equal(res.targetArmour, 0);
    assert.equal(res.finalDamage, 6);
  });
});
