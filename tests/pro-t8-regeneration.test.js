import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRegenerationTrait, hasRegeneration, planRegeneration, regenerationReminders } from '../js/core/creature-regeneration.js';

const crit = (id, name = 'Bras brisé') => ({ id, name });
const make = (traits, extra = {}) => ({ id: 'x', name: 'Troll', traits, hp: 12, maxHp: 20, caracs: {}, camp: 'monstres', ...extra });
const withCrits = (list, extra = {}) => make(['Regeneration'], { extensions: { v5: { criticalWounds: list } }, ...extra });

test('T8 lecture du Trait, anglais ou français, Regenerate inclus', () => {
  assert.equal(parseRegenerationTrait('Regeneration').key, 'regeneration');
  assert.equal(parseRegenerationTrait('Regenerate').key, 'regeneration');
  assert.equal(parseRegenerationTrait('Régénération').key, 'regeneration');
  assert.equal(parseRegenerationTrait('Bite'), null);
  assert.equal(hasRegeneration(make(['Infected', 'Regeneration'])), true);
  assert.equal(hasRegeneration(make(['Infected'])), false);
});

test('T8 début de Round, Blessures positives : soin du d10 saisi, plafonné aux Blessures manquantes', () => {
  const plan = planRegeneration(make(['Regeneration']), { roll: 6 });
  assert.equal(plan.available, true);
  assert.deepEqual(plan.heal, { amount: 6, roll: 6, cause: 'Régénération' });
  assert.equal(planRegeneration(make(['Regeneration']), { roll: 9 }).heal.amount, 8);
  assert.equal(planRegeneration(make(['Regeneration'], { hp: 20 }), { roll: 4 }).heal.amount, 0);
});

test('T8 un 10 soigne une Blessure Critique : la proposée, ou celle qui est choisie', () => {
  const target = withCrits([crit('a'), crit('b')]);
  const first = planRegeneration(target, { roll: 10 });
  assert.equal(first.heal.amount, 8);
  assert.deepEqual(first.criticalHeal, { id: 'a', name: 'Bras brisé', proposed: true });
  assert.equal(planRegeneration(target, { roll: 10, criticalId: 'b' }).criticalHeal.id, 'b');
  assert.equal(planRegeneration(target, { roll: 9 }).criticalHeal, null);
  const none = planRegeneration(make(['Regeneration']), { roll: 10 });
  assert.equal(none.criticalHeal, null);
  assert.match(none.reminders.join(' '), /aucune Blessure Critique/);
});

test('T8 à zéro Blessure : 8 ou plus rend une Blessure, sinon rien', () => {
  const down = make(['Regeneration'], { hp: 0 });
  assert.equal(planRegeneration(down, { roll: 7 }).heal.amount, 0);
  assert.deepEqual(planRegeneration(down, { roll: 8 }).heal, { amount: 1, roll: 8, cause: 'Régénération (à zéro Blessure)' });
  const ten = planRegeneration({ ...withCrits([crit('a')]), hp: 0 }, { roll: 10 });
  assert.equal(ten.heal.amount, 1);
  assert.equal(ten.criticalHeal.id, 'a');
});

test('T8 le feu est exclu : Blessures de feu non régénérées, critique de feu jamais proposé', () => {
  const hurt = make(['Regeneration'], { hp: 10, maxHp: 20 });
  assert.equal(planRegeneration(hurt, { roll: 9, fireWounds: 6 }).heal.amount, 4);
  assert.equal(planRegeneration(hurt, { roll: 9, fireWounds: 10 }).heal.amount, 0);
  const target = withCrits([crit('a', 'Brûlure'), crit('b')]);
  assert.equal(planRegeneration(target, { roll: 10, fireCriticalIds: ['a'] }).criticalHeal.id, 'b');
  const only = planRegeneration(withCrits([crit('a')]), { roll: 10, fireCriticalIds: ['a'] });
  assert.equal(only.criticalHeal, null);
  assert.match(only.reminders.join(' '), /feu/);
  const refused = planRegeneration(target, { roll: 10, criticalId: 'a', fireCriticalIds: ['a'] });
  assert.equal(refused.criticalHeal, null);
  assert.equal(refused.available, false);
});

test('T8 points non résolus : d10 absent ou invalide, critique inconnu, Trait absent, Blessures inconnues', () => {
  assert.equal(planRegeneration(make(['Regeneration']), {}).available, false);
  assert.equal(planRegeneration(make(['Regeneration']), { roll: 11 }).available, false);
  assert.equal(planRegeneration(make(['Regeneration']), { roll: 0 }).available, false);
  assert.equal(planRegeneration(make(['Regeneration']), { roll: 2.5 }).available, false);
  assert.equal(planRegeneration(withCrits([crit('a')]), { roll: 10, criticalId: 'zz' }).available, false);
  const absent = planRegeneration(make(['Bite']), { roll: 5 });
  assert.equal(absent.available, false);
  assert.equal(absent.heal, null);
  assert.equal(planRegeneration(make(['Regeneration'], { hp: undefined, maxHp: undefined }), { roll: 5 }).available, false);
  assert.equal(planRegeneration({ id: 'y', traits: ['Regeneration'], hp: 'x', maxHp: 20 }, { roll: 5 }).available, false);
});

test('T8 Regenerate (sort) : même plan, reçu lisible, rappels sans doublon', () => {
  const plan = planRegeneration(make(['Regenerate']), { roll: 3 });
  assert.equal(plan.heal.amount, 3);
  assert.match(plan.receipt.ability, /Régénération/);
  assert.deepEqual(plan.receipt.blocked, []);
  assert.equal(regenerationReminders(make(['Regeneration', 'Regenerate'])).length, 1);
  assert.deepEqual(regenerationReminders(make(['Bite'])), []);
});
