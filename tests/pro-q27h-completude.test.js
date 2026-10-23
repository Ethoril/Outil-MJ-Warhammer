import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { joinTrappings } from '../tools/lib/bestiary-record.mjs';

const profile = id => JSON.parse(readFileSync('js/data/bestiary/L23.json', 'utf8')).profiles.find(item => item.id === id);
const names = list => (list || []).map(item => item.name);

test('Q27h : Wolmar Rotte (L23 p.49) et Annalisa Kessler (p.102) ont leurs Trappings', () => {
  assert.equal(profile('E0-P-773').trappings.length, 6);
  assert.equal(profile('E0-P-773').trappings[5], '10d10 brass pennies');
  assert.deepEqual(profile('E0-P-802').trappings, ['Black Hood', 'Bow and 20 Black Arrows', 'Leather Jerkin', 'Sword', '8d10 brass pennies']);
});

test('Q27h : Albert Pförtner (L23 p.60) a ses six talents (Dirty Fighting 2) et ses huit objets', () => {
  const stevedore = profile('E0-P-783');
  assert.deepEqual(names(stevedore.talents), ['Criminal', 'Dirty Fighting', 'Strong Back', 'Sturdy', 'Tenacious', 'Very Strong']);
  assert.equal(stevedore.talents[1].rank, 2);
  assert.equal(stevedore.trappings.length, 8);
});

test('Q27h : Pink et Blue Horror (L23 p.87) ont Tzeentch’s Fire (apostrophe droite imprimée, courbe à l\'inventaire)', () => {
  for (const id of ['E0-P-789', 'E0-P-790']) assert.ok(profile(id).traits.some(trait => trait.name === 'Tzeentch’s Fire' && trait.ref === 'E0-T-270'));
});

test('Q27h : Urzo (L23 p.104) garde Animalistic Legs dans specialRules', () => {
  assert.deepEqual(profile('E0-P-803').specialRules, ['Animalistic Legs']);
});

test('Q27h : une virgule entre parenthèses ne coupe pas un objet recollé (« Granny » Haller, L23 p.111)', () => {
  const item = 'Potions and Charms, all fake (at the GM\'s discretion, some may have interesting but unplanned effects)';
  assert.deepEqual(joinTrappings(['Assorted Powders', 'Potions and Charms', 'all fake (at the GM\'s discretion, some may have interesting but unplanned effects)'], [item]).length, 2);
  assert.ok(profile('E0-P-812').trappings.includes(item));
});
