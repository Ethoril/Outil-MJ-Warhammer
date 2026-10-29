import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCombatTest, v5ShieldDefense } from '../js/core/v5-combat-rules.js';
import { locationProtection } from '../js/core/equipment.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';

const shield = (ap = 2, id = 'shield') => ({ id, kind: 'shield', name: 'Bouclier V5', category: 'Bouclier',
  ap, locations: [], layer: 'none', keywords: [{ id: 'bouclier', parameter: '' }], custom: true });
const participant = id => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 30, Ag: 40 }, states: [], talents: [], skills: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } });
const normalized = ({ ap = 2, skill = 'Esquive', qualities = [], ranged = false, selected = true, available = true } = {}) => {
  const actor = participant('actor'), target = participant('target');
  target.equipment = [shield(ap)];
  return { actor, target, action: { type: 'attack', label: 'Attaque', attr: ranged ? 'CT' : 'CC', base: 40, qualities: [] },
    defense: { type: 'skill', label: skill, attr: skill === 'Esquive' ? 'Ag' : 'CC', base: 40, roll: 42, qualities,
      v5: { kind: skill === 'Esquive' ? 'test' : 'melee', context: {} } },
    attackContext: { ranged }, v5: { kind: ranged ? 'ranged' : 'melee', context: {} }, v5State: { participants: [actor, target] },
    combatPrelude: {}, weaponSkillUnresolved: [], protectionContext: { shieldId: selected ? 'shield' : '',
      shieldAvailable: available, opposedWithShield: selected, ranged, lineOfSight: false } };
};

test('Bouclier V5 — Esquive ou Corps à corps confirmé donne +1 DR, sans cumul avec Défensive', () => {
  for (const skill of ['Esquive', 'Corps à corps (Base)']) {
    const input = normalized({ skill, qualities: ['defensive'] });
    const status = v5ShieldDefense(input);
    assert.deepEqual(status, { confirmed: false, v5Bonus: true, rangedDodgeAllowed: false, rating: 2, unresolved: null });
    const plan = buildCombatTest(input, 'defender');
    const bonuses = plan.test.options[0].result.details.modifiers.filter(row => row.id === 'defensive-protection');
    assert.equal(bonuses.length, 1);
    assert.equal(bonuses[0].amount, 1);
    assert.match(bonuses[0].label, /Bouclier V5/);
  }
});

test('Bouclier V5 — 2 PA permettent l’Esquive contre tir à toute portée, sans ligne de vue', () => {
  const rangedDefense = normalized({ skill: 'Esquive', ranged: true, ap: 2 });
  const twoPa = v5ShieldDefense(rangedDefense);
  assert.equal(twoPa.confirmed, false);
  assert.equal(twoPa.v5Bonus, true);
  assert.equal(twoPa.rangedDodgeAllowed, true);
  assert.equal(twoPa.rating, 2);
  const rangedPlan = buildCombatTest(rangedDefense, 'defender');
  assert.ok(rangedPlan.test.options[0].result.details.modifiers.some(row => row.id === 'defensive-protection' && row.amount === 1));
  const onePa = v5ShieldDefense(normalized({ skill: 'Esquive', ranged: true, ap: 1 }));
  assert.equal(onePa.confirmed, false);
  assert.equal(onePa.rangedDodgeAllowed, false);
});

test('Bouclier V5 — tir opposé par Corps à corps et autres compétences ne reçoivent pas le bonus', () => {
  const melee = v5ShieldDefense(normalized({ skill: 'Corps à corps', ranged: true, ap: 3 }));
  assert.equal(melee.confirmed, false);
  assert.equal(melee.rangedDodgeAllowed, false);
  assert.match(melee.unresolved, /tir.*Esquive et 2 PA/u);
  const unrelated = v5ShieldDefense(normalized({ skill: 'Résistance', ranged: false, ap: 3 }));
  assert.equal(unrelated.confirmed, false);
  assert.equal(unrelated.unresolved, 'Bouclier V5 : opposition par Esquive ou Corps à corps requise.');
});

test('Bouclier V5 — non sélectionné, indisponible ou protection opposée non confirmée : aucun bonus', () => {
  assert.equal(v5ShieldDefense(normalized({ selected: false })).confirmed, false);
  assert.equal(v5ShieldDefense(normalized({ available: false })).confirmed, false);
  const input = normalized();
  input.protectionContext.opposedWithShield = false;
  assert.equal(v5ShieldDefense(input).confirmed, false);
  input.target.extensions.shieldUnavailable = ['shield'];
  input.protectionContext.opposedWithShield = true;
  assert.equal(v5ShieldDefense(input).confirmed, false);
});

test('Bouclier V5 — une source ou un effet modifié bloque le bonus', () => {
  const input = normalized();
  assert.equal(v5ShieldDefense(input).v5Bonus, true);
  const changed = structuredClone(getReferenceCatalogue());
  changed.keywords.find(row => row.id === 'bouclier').effect += ' Effet modifié.';
  const blocked = v5ShieldDefense(input, changed);
  assert.equal(blocked.v5Bonus, false);
  assert.match(blocked.unresolved, /source ou effet modifié/u);
});

test('Bouclier V5 — ses PA ne s’ajoutent qu’à la localisation touchée et seulement après opposition', () => {
  const target = participant('target');
  target.equipment = [shield(2)];
  const protectedHit = locationProtection(target, { location: 'body', shieldId: 'shield', shieldAvailable: true,
    opposedWithShield: true, defenseProvided: true, ranged: true, lineOfSight: false });
  assert.equal(protectedHit.ap, 2);
  assert.equal(protectedHit.shieldAp, 2);
  assert.deepEqual(protectedHit.manual, []);
  const otherLocation = locationProtection(target, { location: 'head', ranged: true });
  assert.equal(otherLocation.ap, 0);
  assert.equal(otherLocation.shieldAp, 0);
});
