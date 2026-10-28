import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../js/core/resolution.js';
import { ammunitionCompatibility, locationProtection } from '../js/core/equipment.js';
import { calculateV5ArmorPenalty, canUseV5PowderAmmunition, parseV5Inflict, validateV5ShieldHands } from '../js/core/v5-weapon-qualities.js';
import referenceSnapshot from '../js/data/reference-snapshot.json' with { type: 'json' };

const participant = (id, equipment = []) => ({ id, name: id, kind: 'PJ', camp: id === 'a' ? 'pj' : 'foes', zone: 'active', hp: 20, maxHp: 20,
  caracs: { CC: 50, CT: 50, F: 30, E: 30, Ag: 40, I: 30 }, skills: [], talents: [], states: [], equipment, armor: {},
  extensions: { v5: { hasMomentum: false } } });
const shield = { id: 'buckler', kind: 'shield', name: 'Targe', ap: 1, locations: [], keywords: [{ id: 'bouclier', parameter: '' }] };

test('T2 bis characterization — Bolas: parameter parsing accepts combined state text and hit effects remain leg-location only', () => {
  const weapon = referenceSnapshot.equipment.items.find(item => item.baseId === 'weapon-armes-a-distance-entraves-bolas');
  const parsed = parseV5Inflict(weapon.keywords.find(word => word.id === 'inflige').parameter);
  assert.equal(parsed.ready, true, parsed.unresolved?.join('; '));
  assert.deepEqual(parsed.conditions.map(row => row.key), ['enchevetre', 'a-terre']);
  const input = calledShotLocation => previewResolution({ actor: participant('a', [weapon]), target: participant('b'), roll: 20,
    action: { type: 'attack', attr: 'CT', base: 50, damage: 0, qualities: weapon.keywords,
      extensions: { fiche: { equipmentId: weapon.id } } },
    attackContext: { ranged: true }, v5: { kind: 'ranged', context: { calledShot: true, calledShotLocation } } });
  const legs = input('leftLeg'), body = input('body');
  assert.deepEqual(legs.targetConditionApplication?.map(row => row.key), ['enchevetre', 'a-terre']);
  assert.deepEqual(body.targetConditionApplication?.map(row => row.key), []);
});

test('T2 bis characterization — bouclier attaché: PA limités à tête, corps et bras non directeur', () => {
  const target = participant('b', [shield]);
  const protection = (location, nonDominantArmSide) => locationProtection(target, { location, shieldId: 'buckler', shieldAvailable: true,
    opposedWithShield: true, defenseProvided: true, ranged: false, shieldAttached: true, nonDominantArmSide });
  assert.equal(protection({ key: 'HEAD' }, undefined).shieldAp, 1);
  assert.equal(protection({ key: 'BODY' }, undefined).shieldAp, 1);
  assert.equal(protection({ key: 'ARM', side: 'left' }, 'left').shieldAp, 1);
  assert.equal(protection({ key: 'ARM', side: 'right' }, 'left').shieldAp, 0);
  assert.equal(protection({ key: 'LEGS' }, undefined).shieldAp, 0);
  const hands = validateV5ShieldHands({ shield, weaponHands: 2, weaponEncumbrance: 3, attached: true, polearm: true });
  assert.equal(hands.allowed, true);
  const buckler = validateV5ShieldHands({ shield, weaponHands: 1, weaponEncumbrance: 0, attached: true, offHandWeaponEncumbrance: 0 });
  assert.equal(buckler.allowed, true);
  const missingSide = protection({ key: 'ARM', side: 'right' }, undefined);
  assert.equal(missingSide.shieldAp, 0);
  assert.ok(missingSide.manual.includes('bras-non-directeur-requis:bouclier-attache'));
});

test('T2 bis integration — attached shield side selection reaches hit protection and missing side blocks only an arm hit', () => {
  const actor = participant('a', [referenceSnapshot.equipment.items.find(item => item.kind === 'weapon')]);
  const target = participant('b', [shield]);
  const make = nonDominantArmSide => previewResolution({ actor, target, roll: 20,
    action: { type: 'attack', attr: 'CC', base: 50, damage: 4, qualities: [], extensions: { fiche: { equipmentId: actor.equipment[0].id } } },
    v5: { kind: 'melee', context: { calledShot: true, calledShotLocation: 'rightArm' } },
    protectionContext: { shieldId: 'buckler', shieldAvailable: true, opposedWithShield: true, defenseProvided: true,
      ranged: false, shieldAttached: true, ...(nonDominantArmSide ? { nonDominantArmSide } : {}) },
    defense: { type: 'skill', label: 'Esquive', attr: 'Ag', base: 40, roll: 60, v5: { kind: 'test', context: {} } } });
  const unknown = make(undefined);
  assert.ok(unknown.protection.manual.includes('bras-non-directeur-requis:bouclier-attache'));
  const known = make('right');
  assert.equal(known.protection.shieldAp, 1);
  assert.equal(known.unresolved.some(row => row.includes('bras-non-directeur-requis:bouclier-attache')), false);
});

test('T2 bis characterization — pistolet au contact: Esquive remains a valid opposition', () => {
  const actor = participant('a'), target = participant('b');
  const plan = previewResolution({ actor, target, roll: 40,
    action: { type: 'attack', label: 'Pistolet', attr: 'CT', base: 50, damage: 9, qualities: [{ id: 'pistol' }] },
    attackContext: { ranged: true, range: 'contact' },
    defense: { type: 'skill', label: 'Esquive', attr: 'Ag', base: 40, roll: 25, v5: { kind: 'test', context: {} } },
    v5: { kind: 'ranged', context: { rangeBand: 'contact' } } });
  assert.equal(plan.unresolved.some(row => /Esquive.*refus|Esquive.*impossible/i.test(String(row))), false);
});

test('T2 bis characterization — Discrétion penalty follows only catalogue-marked armor; blunderbuss rejects bullets', () => {
  const marked = calculateV5ArmorPenalty({ worn: [{ worn: true, category: 'mail', notes: 'Flexible (-1 DR en Discrétion si une ou plusieurs pièces de mailles sont portées)' }] });
  const unmarked = calculateV5ArmorPenalty({ worn: [{ worn: true, category: 'Ithilmar haut elfe', notes: '' }] });
  assert.equal(marked.stealthDr, -1);
  assert.equal(unmarked.stealthDr, 0);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre Noire', ammunitionType: 'grenaille', isBlunderbuss: true }).allowed, true);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre Noire', ammunitionType: 'projectile improvisé', isBlunderbuss: true }).allowed, true);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre Noire', ammunitionType: 'balle', isBlunderbuss: true }).allowed, false);
});

test('T2 bis characterization — Tromblon profile accepts shot and improvised ammo, but not bullets', () => {
  const weapon = referenceSnapshot.equipment.items.find(item => item.baseId === 'weapon-armes-a-distance-poudre-noire-tromblon-2m');
  const ammunition = name => referenceSnapshot.equipment.items.find(item => item.kind === 'ammunition' && item.name.startsWith(name));
  assert.equal(ammunitionCompatibility(weapon, ammunition('Grenaille et poudre')).status, 'compatible');
  assert.equal(ammunitionCompatibility(weapon, ammunition('Munitions improvisées et poudre')).status, 'compatible');
  assert.equal(ammunitionCompatibility(weapon, ammunition('Balles et poudre')).status, 'incompatible');
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: weapon.category, ammunitionType: 'balle', isBlunderbuss: true }).allowed, false);
});
