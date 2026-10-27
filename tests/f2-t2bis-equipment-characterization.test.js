import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../js/core/resolution.js';
import { locationProtection } from '../js/core/equipment.js';
import { calculateV5ArmorPenalty, canUseV5PowderAmmunition, parseV5Inflict, validateV5ShieldHands } from '../js/core/v5-weapon-qualities.js';

const participant = (id, equipment = []) => ({ id, name: id, kind: 'PJ', camp: id === 'a' ? 'pj' : 'foes', zone: 'active', hp: 20, maxHp: 20,
  caracs: { CC: 50, CT: 50, F: 30, E: 30, Ag: 40, I: 30 }, skills: [], talents: [], states: [], equipment, armor: {},
  extensions: { v5: { hasMomentum: false } } });
const shield = { id: 'buckler', kind: 'shield', name: 'Targe', ap: 1, locations: [], keywords: [{ id: 'bouclier', parameter: '' }] };

test('T2 bis characterization — Bolas: parameter parsing accepts combined state text and hit effects remain leg-location only', () => {
  const parsed = parseV5Inflict('Empêtré 35, À terre');
  assert.equal(parsed.ready, true, parsed.unresolved?.join('; '));
  const input = (location) => previewResolution({ actor: participant('a'), target: participant('b'), roll: 20,
    action: { type: 'attack', attr: 'CT', base: 50, damage: 0, qualities: [{ id: 'inflige', parameter: 'Empêtré 35, À terre' }] },
    attackContext: { ranged: true }, v5: { kind: 'ranged', context: { hitLocation: location } } });
  const legs = input({ key: 'LEGS' }), body = input({ key: 'BODY' });
  assert.deepEqual(legs.naturalHitStates?.map(row => row.key), ['enchevetre', 'a-terre']);
  assert.deepEqual(body.naturalHitStates?.map(row => row.key), []);
});

test('T2 bis characterization — bouclier attaché: PA limités à tête, corps et bras non directeur', () => {
  const target = participant('b', [shield]);
  const protection = location => locationProtection(target, { location, shieldId: 'buckler', shieldAvailable: true,
    opposedWithShield: true, defenseProvided: true, ranged: false, shieldAttached: true });
  assert.equal(protection({ key: 'HEAD' }).shieldAp, 1);
  assert.equal(protection({ key: 'BODY' }).shieldAp, 1);
  assert.equal(protection({ key: 'OFF_ARM' }).shieldAp, 1);
  assert.equal(protection({ key: 'MAIN_ARM' }).shieldAp, 0);
  assert.equal(protection({ key: 'LEGS' }).shieldAp, 0);
  const hands = validateV5ShieldHands({ shield, weaponHands: 2, attached: true, polearm: true });
  assert.equal(hands.allowed, true);
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
  const marked = calculateV5ArmorPenalty({ worn: [{ worn: true, category: 'mail' }] });
  const unmarked = calculateV5ArmorPenalty({ worn: [{ worn: true, category: 'Ithilmar haut elfe' }] });
  assert.equal(marked.stealthDr, -1);
  assert.equal(unmarked.stealthDr, 0);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre Noire', ammunitionType: 'grenaille', isBlunderbuss: true }).allowed, true);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre Noire', ammunitionType: 'projectile improvisé', isBlunderbuss: true }).allowed, true);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre Noire', ammunitionType: 'balle', isBlunderbuss: true }).allowed, false);
});

test('T2 bis characterization — Tromblon accepts grenaille and improvised shot, but not bullets', () => {
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre Noire', ammunitionType: 'grenaille', isBlunderbuss: true }).allowed, true);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre Noire', ammunitionType: 'projectile improvisé', isBlunderbuss: true }).allowed, true);
  assert.equal(canUseV5PowderAmmunition({ weaponGroup: 'Poudre Noire', ammunitionType: 'balle', isBlunderbuss: true }).allowed, false);
});
