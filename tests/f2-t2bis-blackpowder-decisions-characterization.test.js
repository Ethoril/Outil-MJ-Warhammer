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
    context: { weaponName: 'Pistolet', weaponGroup: 'Poudre noire', powderIncidentRoll: 9, weaponExplosionArmSide: 'right' }
  });
  assert.deepEqual(preview.unresolved, []);
  const explosion = preview.effects.find(effect => effect.type === 'weapon-explosion');
  assert.ok(explosion, 'la catastrophe produit une explosion');
  assert.equal(explosion.damage, 7, 'le profil +7 est utilisé à +0 DR');
  assert.equal(explosion.damageMode, 'profile-at-zero-sl');
  assert.equal(explosion.sl, 0);
});

test('T2 bis — le double raté 99/100 du mortier de main pendant le rechargement privilégie son accident propre', () => {
  for (const roll of [99, 100]) {
    const preview = previewCombatFailure({
      ...base('Mortier de main', { type: 'test', damage: 4 }),
      fumble: { expanded: false },
      roll,
      context: { weaponName: 'Mortier de main', weaponGroup: 'Engineering', reloading: true, weaponDamageMaximum: 12,
        weaponExplosionArmSide: 'right', fumbleRoll: 1, powderIncidentRoll: 1 }
    });
    assert.deepEqual(preview.unresolved, []);
    assert.equal(preview.misfire, null, 'ne pas résoudre d’abord la table générique Misfire');
    assert.ok(preview.effects.some(effect => effect.reason === 'maladresse-au-rechargement-du-mortier-a-main'));
  }
});

test('T2 bis — le double raté 99/100 de la hache-fusil en mêlée privilégie la décharge propre', () => {
  for (const roll of [99, 100]) {
    const preview = previewCombatFailure({
      ...base('Hache-fusil', { type: 'attack', damage: 6 }),
      fumble: { expanded: false },
      roll,
      context: { weaponName: 'Hache-fusil', weaponGroup: 'Poudre noire', meleeUse: true, weaponLoaded: true,
        fumbleRoll: 2, powderIncidentRoll: 1 }
    });
    assert.deepEqual(preview.unresolved, []);
    assert.equal(preview.misfire, null);
    assert.ok(preview.effects.some(effect => effect.reason === 'hache-fusil-chargee'));
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
      normalized: { actor:{...actor,equipment:[{id:'salvo',name:'Arquebuse à salve',kind:'weapon',damage:4,keywords:[{id:'salve',parameter:'4'},{id:'a-poudre-noire'}]}]}, action:{type:'attack',note:'Arquebuse à salve',extensions:{fiche:{equipmentId:'salvo'}}} },
      context: { weaponName: 'Arquebuse à salve', weaponGroup: 'Engineering',
        remainingSalvo: 3, powderIncidentRoll: 1, salvoIncidentRoll: roll }
    });
    assert.equal(preview.misfire?.outcome?.id, 'misfire', `incident générique d10 1, Salve d10 ${roll}`);
    assert.equal(preview.misfire?.salvo?.table, 'salvo-artillery', `d10 Salve ${roll}`);
    assert.equal(preview.misfire?.salvo?.outcome?.id, expected[roll - 1], `d10 Salve ${roll}`);
  }
});
