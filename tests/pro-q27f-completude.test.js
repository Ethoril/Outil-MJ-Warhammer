import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listTraits, readSkills } from '../tools/lib/bestiary-profile.mjs';
import { printedSkills } from '../tools/lib/bestiary-completeness.mjs';

const profile = (book, id) => JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')).profiles.find(item => item.id === id);
const names = list => (list || []).map(item => item.name);

test('Q27f : « Ride Horse 42 » (parenthèses oubliées) est la compétence Ride (Horse) (Renia Grünewald, L21 p.41)', () => {
  assert.deepEqual(readSkills('Perception 37, Ride Horse 42').map(skill => [skill.name, skill.value]), [['Perception', 37], ['Ride (Horse)', 42]]);
  assert.deepEqual(printedSkills('Skills: Perception 37, Ride Horse 42').map(skill => skill.key), ['perception||37', 'ride|horse|42']);
  const renia = profile('L21', 'E0-P-684');
  assert.ok(renia.skills.some(skill => skill.name === 'Ride (Horse)' && skill.value === 42));
});

test('Q27f : « Weapon+13 Suffused with Death: … » : l\'attaque est un Trait, « Suffused with Death » la règle (Necrofex Colossus, L21 p.64)', () => {
  const out = listTraits('Construct, Weapon+13 Suffused with Death: The necromantic magics', 'v4', new Set(['Construct']), 'traits');
  assert.deepEqual(out.specialRules, ['Suffused with Death']);
  assert.ok(out.traits.some(trait => trait.name === 'Weapon' && trait.rating === '+13'));
  assert.deepEqual(profile('L21', 'E0-P-693').attacks, [{ name: 'Weapon', damage: 13, trait: 'Weapon' }]);
});

test('Q27f : Vanguard Soldier (L21 p.42) a Sword +7 et ses lignes « Optional » lues comme compétences, talents et équipement', () => {
  const soldier = profile('L21', 'E0-P-687');
  assert.ok(soldier.attacks.some(attack => attack.name === 'Sword' && attack.damage === 7));
  assert.equal(soldier.skills.length, 15);
  assert.deepEqual(names(soldier.talents), ['Combat Aware', 'Strider (Highlands)']);
  assert.deepEqual(soldier.trappings, ['Sword', 'Bow', 'Uniform', 'Grey surcoat', 'Cloak']);
  assert.equal(soldier.optionalTraits, undefined);
});

test('Q27f : Ulfhednar (L21 p.84) a ses 12 compétences, 3 talents et son équipement ; Zurn garde « Sword » seul', () => {
  const ulfhednar = profile('L21', 'E0-P-706');
  assert.equal(ulfhednar.skills.length, 12);
  assert.deepEqual(names(ulfhednar.talents), ['Furious Assault', 'Menacing', 'Strike Mighty Blow']);
  assert.deepEqual(ulfhednar.trappings, ['Chaos Armour (cannot be removed) decorated with the skin of a dire wolf', 'Hand Axe']);
  assert.deepEqual(profile('L21', 'E0-P-705').trappings, ['Chaos Armour (cannot be removed)', 'Sword']);
});

test('Q27f : Gerta Faernmaus (L21 p.78) garde le Book of Pressed Flowers décrit sur trois lignes', () => {
  assert.ok(profile('L21', 'E0-P-700').trappings.includes('Book of Pressed Flowers taken from every battlefield she has ever fought on (worth 5 GC to someone interested in botany)'));
});
