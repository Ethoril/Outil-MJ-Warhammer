import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listTraits, readSkills } from '../tools/lib/bestiary-profile.mjs';
import { splitSections as blockSections } from '../tools/lib/bestiary-blocks.mjs';

const load = id => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles;
const byId = (profiles, id) => profiles.find(profile => profile.id === id);
const names = list => (list || []).map(item => item.name);

test('Q12c : un « : » dans une parenthèse ne coupe pas la liste des Traits (Great Eagle, L22 p. 73)', () => {
  const { traits, specialRules } = listTraits('Acute Sense (Vision: as Character Talent), Beak +8, 2 � Claws +6, Fear 1, Skittish', 'v4', new Set(['Acute Sense', 'Fear', 'Skittish']), 'traits');
  assert.equal(specialRules, undefined);
  assert.equal(traits.length, 5);
  assert.equal(traits[2].count, 2);
});

test('Q12c : Great Eagle a ses attaques (Bec, 2 Griffes) et le Talent Acute Sense imprimé dans ses Traits', () => {
  const eagle = byId(load('L22'), 'E0-P-742');
  assert.equal(eagle.attacks.length, 2);
  assert.equal(eagle.attacks[1].count, 2);
  assert.ok(names(eagle.talents).some(name => name.startsWith('Acute Sense')));
  assert.ok(!names(eagle.traits).includes('Acute Sense'));
});

test('Q12c : Ogre Gorger (L16 p. 83) : la rubrique « Options: » ne coupe plus le bloc (11 compétences, 9 talents, Traits facultatifs)', () => {
  const gorger = byId(load('L16'), 'E0-P-506');
  assert.equal(gorger.skills.length, 11);
  assert.equal(gorger.talents.length, 9);
  assert.deepEqual(names(gorger.optionalTraits), ['Fury', 'Mutation', 'Painless', 'Territorial', 'Wallcrawler']);
  assert.equal(blockSections(['Traits: Bite +8', '', 'Options: Fury, Mutation', '', 'Skills: Dodge 45']).sections.Skills, 'Dodge 45');
});

test('Q12c : Murderous Altdorfer (L21 p. 22, Frenzy dans la prose) et Josef Aufwiegler (L24 p. 19, arme imprimée « Talents: ») ne sont plus vides', () => {
  assert.deepEqual(names(byId(load('L21'), 'E0-P-667').traits), ['Frenzy']);
  const josef = byId(load('L24'), 'E0-P-822');
  assert.deepEqual(josef.attacks, [{ name: 'Fist', damage: 3, trait: 'Weapon' }]);
  assert.equal(josef.talents, undefined);
});

test('Q12c : Runesmithing (L16) est une compétence non traduite, valeur conservée', () => {
  const forgemaster = byId(load('L16'), 'E0-P-501');
  const rune = forgemaster.skills.find(skill => skill.name === 'Runesmithing');
  assert.equal(rune.value, 61);
  assert.equal(rune.frUnverified, true);
});

test('Q12c : compétences collées par une coquille du livre (« Basic 61 Polearm 51 », « 73. Warfare 78 », « (Guilder)40 »)', () => {
  const skills = readSkills('Melee (Basic 61 Polearm 51), Lore (Politics 73. Warfare 78), Secret Signs (Guilder)40');
  assert.deepEqual(skills.map(skill => `${skill.name} ${skill.value}`), ['Melee (Basic) 61', 'Melee (Polearm) 51', 'Lore (Politics) 73', 'Lore (Warfare) 78', 'Secret Signs (Guilder) 40']);
});

test('Q12c : les valeurs imprimées des profils réparés sont celles de la page', () => {
  const gorger = byId(load('L16'), 'E0-P-506');
  assert.deepEqual([gorger.stats.M, gorger.stats.CC, gorger.stats.F, gorger.stats.E, gorger.wounds], [6, 30, 55, 55, 46]);
});
