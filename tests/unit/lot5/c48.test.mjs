// Lot 5 · C48 (G-ARM-7) : une condition imposée par une Qualité d'arme est libellée avec sa vraie Qualité et son vrai État.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeResolutionDetail } from '../../../js/core/resolution.js';
import { describeWeaponCondition } from '../../../js/core/resolution/describe.js';

const condition = (keywordId, key, level, name) => ({ key, name, level, source: { kind: 'quality', keywordId } });

test('C48 libellé de la condition : Qualité et État réels', () => {
  assert.equal(describeWeaponCondition(condition('assommante', 'sonne', 1, 'Sonné')), 'Assommante : 1 état Sonné');
  assert.equal(describeWeaponCondition(condition('inflige', 'enchevetre', 1, 'Empêtré')), 'Inflige : 1 état Enchevêtré');
  assert.equal(describeWeaponCondition(condition('entaille', 'hemorragique', 2, 'Hémorragique')), 'Entaille : 2 états Hémorragique');
  assert.equal(describeWeaponCondition(condition('immobilisante', 'enchevetre', 3)), 'Immobilisante : 3 états Enchevêtré');
});

test('C48 le détail du journal nomme la Qualité et l’État, pas toujours « Assommante : Sonné »', () => {
  const text = describeResolutionDetail({ actionType: 'attack', hit: true, weaponConditions: { applied: [condition('inflige', 'enchevetre', 1, 'Empêtré'), condition('entaille', 'hemorragique', 1, 'Hémorragique')] } }).join(' ');
  assert.match(text, /Inflige : 1 état Enchevêtré appliqué/);
  assert.match(text, /Entaille : 1 état Hémorragique appliqué/);
  assert.doesNotMatch(text, /Assommante|Sonné/);
});
