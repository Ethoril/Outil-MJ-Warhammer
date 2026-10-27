import test from 'node:test';
import assert from 'node:assert/strict';
import { previewCombatFailure } from '../js/core/v5-combat-fumbles.js';

const actor = { id: 'shooter', equipment: [] };
const base = (weapon, action = {}) => ({
  normalized: { actor, action: { type: 'attack', note: weapon, ...action } },
  roll: 99,
  context: { weaponName: weapon, powderIncidentRoll: 9, weaponExplosionArmSide: 'right' }
});

test('T2 bis — catastrophe de poudre : dégâts d’arme au profil à +0 DR, sans valeur maximum parallèle', () => {
  const preview = previewCombatFailure({
    ...base('Pistolet', { damage: 7, extensions: { equipment: { damage: 7 } } }),
    context: { weaponName: 'Pistolet', powderIncidentRoll: 9, weaponExplosionArmSide: 'right' }
  });
  assert.deepEqual(preview.unresolved, []);
  const explosion = preview.effects.find(effect => effect.type === 'weapon-explosion');
  assert.ok(explosion, 'la catastrophe produit une explosion');
  assert.equal(explosion.damage, 7, 'le profil +7 est utilisé à +0 DR');
  assert.equal(explosion.damageMode, 'profile-plus-zero-dr');
  assert.equal(explosion.sl, 0);
});

test('T2 bis — le double raté 99/100 du mortier de main pendant le rechargement privilégie son accident propre', () => {
  for (const roll of [99, 100]) {
    const preview = previewCombatFailure({
      ...base('Mortier de main', { type: 'test', damage: 4 }),
      roll,
      context: { weaponName: 'Mortier de main', reloading: true, powderIncidentRoll: 1 }
    });
    assert.deepEqual(preview.unresolved, []);
    assert.equal(preview.misfire, null, 'ne pas résoudre d’abord la table générique Misfire');
    assert.ok(preview.effects.some(effect => effect.reason === 'hand-mortar-reload-accident'));
  }
});

test('T2 bis — le double raté 99/100 de la hache-fusil en mêlée privilégie la décharge propre', () => {
  for (const roll of [99, 100]) {
    const preview = previewCombatFailure({
      ...base('Hache-fusil', { type: 'attack', damage: 6 }),
      roll,
      context: { weaponName: 'Hache-fusil', melee: true, powderIncidentRoll: 1 }
    });
    assert.deepEqual(preview.unresolved, []);
    assert.equal(preview.misfire, null);
    assert.ok(preview.effects.some(effect => effect.reason === 'rifle-axe-melee-accident'));
  }
});

test('T2 bis — l’incident d’une arme Salve utilise la table dédiée d10 de L13 p.126', () => {
  const expected = [
    'primary-arm', 'primary-arm', 'primary-arm', 'primary-arm',
    'random-location', 'random-location', 'random-location',
    'remaining-salvo-random-locations', 'remaining-salvo-random-locations',
    'remaining-salvo-random-direction'
  ];
  for (let roll = 1; roll <= 10; roll++) {
    const preview = previewCombatFailure({
      ...base('Arquebuse à salve'),
      context: { weaponName: 'Arquebuse à salve', weaponGroup: 'Engineering', isSalvo: true,
        remainingSalvo: 3, powderIncidentRoll: roll }
    });
    assert.equal(preview.misfire?.table, 'salvo-artillery', `d10 ${roll}`);
    assert.equal(preview.misfire?.outcome?.id, expected[roll - 1], `d10 ${roll}`);
  }
});
