import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, parseCSV, getKeywordList, fetchKeywords } from '../js/core/keywords.js';
import { computeDamage } from '../js/core/damage.js';

test('Keywords — Normalisation des slugs', () => {
  assert.equal(slugify('Poudre Noire'), 'poudre-noire');
  assert.equal(slugify('Explosion X'), 'explosion');
  assert.equal(slugify('Percutante (Impact)'), 'percutante-impact');
  assert.equal(slugify('Épuisante'), 'epuisante');
});

test('Keywords — Parsing CSV Google Sheets', () => {
  const sampleCSV = `"Mot Clé","Effet"\n"Poudre Noire","Oblige à tester le Sang-Froid."\n"Taille X","Réduit l'armure de X."`;
  const parsed = parseCSV(sampleCSV);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].slug, 'poudre-noire');
  assert.equal(parsed[1].hasRating, true);
});

test('Keywords — Instantané local de repli (Fallback)', () => {
  const list = getKeywordList();
  assert.ok(list.length >= 25);
  assert.ok(list.some(k => k.slug === 'percutante'));
});

test('Keywords — Calcul des dégâts Palier 1 (Percutante & Dévastatrice)', () => {
  // 1. Jet de 35 (unité = 5), SL = 2, arme 4, cible PA = 2, BE = 3
  // Sans percutante: 4 + 2 - (3 + 2) = 1
  const res1 = computeDamage({ weaponDamage: 4, sl: 2, roll: 35, targetToughnessBonus: 3, targetArmour: 2, qualities: [] });
  assert.equal(res1.finalDamage, 1);

  // Avec percutante: 4 + 5 (dé d'unités) + 2 - (3 + 2) = 6
  const res2 = computeDamage({ weaponDamage: 4, sl: 2, roll: 35, targetToughnessBonus: 3, targetArmour: 2, qualities: [{ id: 'percutante' }] });
  assert.equal(res2.bonusPercutante, 5);
  assert.equal(res2.finalDamage, 6);

  // Avec dévastatrice et SL = 1, jet 38 (unité = 8) -> utilise SL effectif = 8
  const res3 = computeDamage({ weaponDamage: 4, sl: 1, roll: 38, targetToughnessBonus: 3, targetArmour: 2, qualities: [{ id: 'devastatrice' }] });
  assert.equal(res3.sl, 8);
});

test('Keywords — Calcul des dégâts Palier 1 (Pointue, Imprécise & Inoffensive)', () => {
  // Pointue (+1 dégât)
  const resPointue = computeDamage({ weaponDamage: 5, sl: 2, qualities: [{ id: 'pointue' }] });
  assert.equal(resPointue.weaponDamage, 6);

  // Imprécise (-1 dégât)
  const resImprecise = computeDamage({ weaponDamage: 5, sl: 2, qualities: [{ id: 'imprecise' }] });
  assert.equal(resImprecise.weaponDamage, 4);

  // Inoffensive (PA x 2, plancher 0)
  const resInof = computeDamage({ weaponDamage: 2, sl: 0, targetArmour: 2, qualities: [{ id: 'inoffensive' }] });
  assert.equal(resInof.paEffectif, 4);
  assert.equal(resInof.finalDamage, 0);
});
