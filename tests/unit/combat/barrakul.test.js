import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { locationProtection } from '../../../js/core/equipment.js';
import { v5ShieldDefense, buildCombatTest } from '../../../js/core/v5-combat-rules.js';
import { v5QualityMechanicalStatus } from '../../../js/core/v5-talent-qualities.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';

// Barrakul (Dwarf Player's Guide p.115, feuille « Mots Clés Armes et Armures ») : « Ignore les PA et boucliers non magique ».
// Décision du MJ (05/11) : face à une attaque Barrakul, les PA des armures non magiques sont ignorés, ceux d'un bouclier
// non magique aussi, et ce bouclier perd son +1 DR en défense. Une armure ou un bouclier portant `magique` garde tout.

const magic = [{ id: 'magique', parameter: '' }];
const armour = (id, ap, keywords = []) => ({ id, kind: 'armour', name: id, category: 'Mailles', ap, locations: ['body'], keywords });
const shieldItem = (keywords = []) => ({ id: 'shield', kind: 'shield', name: 'Bouclier', ap: 2,
  locations: ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'], keywords: [{ id: 'bouclier', parameter: '' }, ...keywords] });
const target = equipment => ({ equipment, extensions: { v5: {} } });
const shieldContext = { shieldId: 'shield', shieldAvailable: true, defenseProvided: true, opposedWithShield: true, ranged: false };

describe('Barrakul', () => {
  test('le catalogue porte la ligne de la feuille et le contrat la couvre', () => {
    const word = getReferenceCatalogue().keywords.find(row => row.id === 'barrakul');
    assert.equal(word?.effect, 'Ignore les PA et boucliers non magique');
    assert.equal(v5QualityMechanicalStatus('barrakul').status, 'covered');
  });

  test('PA d’une armure non magique ignorés', () => {
    const t = target([armour('mail', 2)]);
    assert.equal(locationProtection(t, { location: 'body' }).ap, 2);
    const hit = locationProtection(t, { location: 'body', qualities: ['barrakul'] });
    assert.equal(hit.ap, 0);
    assert.ok(hit.ignored.some(row => row.item.id === 'mail' && /Barrakul/.test(row.reason)));
  });

  test('armure magique conservée, pièce par pièce', () => {
    // Maille Flexible sous une pièce magique : les deux comptent normalement (2 + 3).
    const t = target([armour('mail', 2, [{ id: 'flexible', parameter: '' }]), armour('gromril', 3, magic)]);
    assert.equal(locationProtection(t, { location: 'body' }).ap, 5);
    assert.equal(locationProtection(t, { location: 'body', qualities: ['barrakul'] }).ap, 3);
  });

  test('PA d’un bouclier non magique ignorés', () => {
    const t = target([shieldItem()]);
    assert.equal(locationProtection(t, { ...shieldContext, location: 'body' }).shieldAp, 2);
    const hit = locationProtection(t, { ...shieldContext, location: 'body', qualities: ['barrakul'] });
    assert.equal(hit.shieldAp, 0);
    assert.equal(hit.ap, 0);
  });

  test('bouclier magique conservé', () => {
    const hit = locationProtection(target([shieldItem(magic)]), { ...shieldContext, location: 'body', qualities: ['barrakul'] });
    assert.equal(hit.shieldAp, 2);
    assert.equal(hit.ap, 2);
  });

  test('pavois planté non magique : plus de plancher de 5 PA ; magique : plancher conservé', () => {
    const pavise = keywords => ({ equipment: [{ id: 'pavise', kind: 'shield', name: 'Pavois', ap: 5, locations: [], keywords: [{ id: 'bouclier', parameter: '' }, ...keywords] }],
      extensions: { v5: { paviseDeploymentByItemId: { pavise: { status: 'planted', facing: 'north' } } } } });
    const context = { location: 'body', paviseId: 'pavise', attackDirection: 'north', paviseDistanceYards: 1, ranged: true };
    assert.equal(locationProtection(pavise([]), context).ap, 5);
    assert.equal(locationProtection(pavise([]), { ...context, qualities: ['barrakul'] }).ap, 0);
    assert.equal(locationProtection(pavise(magic), { ...context, qualities: ['barrakul'] }).ap, 5);
  });

  test('PA sans pièce identifiée : le MJ précise si l’armure est magique', () => {
    const hit = locationProtection({ armor: { body: 2 }, extensions: { v5: {} } }, { location: 'body', qualities: ['barrakul'] });
    assert.equal(hit.ap, null);
    assert.ok(hit.manual.includes('barrakul-magie-armure-a-preciser'));
  });

  const defenseInput = (shieldKeywords, attackQualities) => {
    const participant = id => ({ id, name: id, camp: id, kind: 'PNJ', hp: 10, maxHp: 10, caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 30, Ag: 40 },
      states: [], talents: [], skills: [], equipment: [], armor: {}, extensions: { v5: { hasMomentum: false } } });
    const actor = participant('actor'), defender = participant('target');
    defender.equipment = [shieldItem(shieldKeywords)];
    return { actor, target: defender,
      action: { type: 'attack', label: 'Épée runique', attr: 'CC', base: 40, qualities: attackQualities },
      defense: { type: 'skill', label: 'Corps à corps (Base)', attr: 'CC', base: 40, roll: 42, qualities: [], v5: { kind: 'melee', context: {} } },
      attackContext: { ranged: false }, v5: { kind: 'melee', context: {} }, v5State: { participants: [actor, defender] },
      combatPrelude: {}, weaponSkillUnresolved: [],
      protectionContext: { shieldId: 'shield', shieldAvailable: true, opposedWithShield: true, ranged: false } };
  };
  const shieldBonus = input => buildCombatTest(input, 'defender').test.options[0].result.details.modifiers
    .filter(row => row.id === 'defensive-protection');

  test('bouclier non magique : plus de +1 DR en défense', () => {
    assert.equal(shieldBonus(defenseInput([], [])).length, 1);
    const input = defenseInput([], [{ id: 'barrakul' }]);
    assert.equal(v5ShieldDefense(input).barrakulIgnored, true);
    assert.equal(shieldBonus(input).length, 0);
  });

  test('bouclier magique : +1 DR conservé', () => {
    const input = defenseInput(magic, [{ id: 'barrakul' }]);
    assert.equal(v5ShieldDefense(input).barrakulIgnored, undefined);
    assert.equal(shieldBonus(input).length, 1);
  });

  test('Défensive de l’arme du défenseur n’est pas un bouclier : son +1 DR reste', () => {
    const input = defenseInput([], [{ id: 'barrakul' }]);
    input.defense.qualities = ['defensive'];
    const bonuses = shieldBonus(input);
    assert.equal(bonuses.length, 1);
    assert.equal(bonuses[0].label, 'Défensive');
  });
});
