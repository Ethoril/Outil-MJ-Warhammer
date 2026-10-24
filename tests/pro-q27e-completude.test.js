import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readTraitItem, readTrappings } from '../tools/lib/bestiary-profile.mjs';
import { splitSections } from '../tools/lib/bestiary-blocks.mjs';
import { isTrappingName } from '../tools/lib/bestiary-record.mjs';
import { printedTrappings, printedTraits } from '../tools/lib/bestiary-completeness.mjs';

const profile = (book, id) => JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')).profiles.find(item => item.id === id);
const names = list => (list || []).map(item => item.name);

test('Q27e : arme V4 imprimée sans « Weapon » (Dagger +5, Unarmed +7, Melee (Crowbar) +9) = attaque', () => {
  assert.deepEqual(readTraitItem('Dagger +5'), { name: 'Weapon', param: 'Dagger', rating: '+5' });
  assert.deepEqual(readTraitItem('Melee (Crowbar) +9'), { name: 'Weapon', param: 'Crowbar', rating: '+9' });
  assert.deepEqual(profile('L20', 'E0-P-632').attacks, [{ name: 'Dagger', damage: 5, trait: 'Weapon' }]);
  assert.ok(profile('L20', 'E0-P-616').attacks.some(attack => attack.name === 'Unarmed' && attack.damage === 7));
  assert.ok(profile('L20', 'E0-P-642').attacks.some(attack => attack.name === 'Crowbar' && attack.damage === 9));
  assert.ok(profile('L21', 'E0-P-682').attacks.some(attack => attack.name === 'Sword' && attack.damage === 7));
});

test('Q27e : « Skills: » après les Talents est la ligne Trappings (Chancellor von Festschrift, L20 p.163)', () => {
  const { sections } = splitSections(['Skills: Melee (Fencing) 52, Research 90', 'Talents: Bookish, Savvy', 'Skills: Symbol of Verena, Somber Academic Robes']);
  assert.equal(sections.Skills, 'Melee (Fencing) 52, Research 90');
  assert.equal(sections.Trappings, 'Symbol of Verena, Somber Academic Robes');
  const chancellor = profile('L20', 'E0-P-648');
  assert.ok(names(chancellor.skills).includes('Research'));
  assert.deepEqual(chancellor.trappings, ['Symbol of Verena', 'Somber Academic Robes']);
});

test('Q27e : « Trappings: Ranged (Bow) +6 » avant les Skills est la ligne Traits (Thomas Fabhber, L20 p.109)', () => {
  const { sections } = splitSections(['Trappings: Ranged (Bow) +6', 'Skills: Cool 33', 'Talents: Luck', 'Trappings: Fine Clothing, 12 GC']);
  assert.equal(sections.Traits, 'Ranged (Bow) +6');
  assert.equal(sections.Trappings, 'Fine Clothing, 12 GC');
  const thomas = profile('L20', 'E0-P-637');
  assert.ok(thomas.attacks.some(attack => attack.name === 'Bow' && attack.damage === 6));
  assert.equal(thomas.trappings[0], 'Fine Clothing');
});

test('Q27e : l\'Encombrement ferme la liste d\'équipement, le texte du voisin qui le suit est écarté (Maren Mauer, L20 p.126)', () => {
  assert.deepEqual(readTrappings('Dagger, Lockpicks, Knuckledusters, 15/2 Morr has no say over the souls interred upon the hill. They are taken.').items, ['Dagger', 'Lockpicks', 'Knuckledusters', '15/2']);
  assert.deepEqual(printedTrappings('Trappings: Dagger, 15/2 Garden Hill Known simply as Garden Hill').map(item => item.label), ['Dagger']);
  assert.equal(profile('L20', 'E0-P-638').trappings.at(-1), '15/2');
});

test('Q27e : un objet décrit de plus de 60 caractères sans verbe est gardé (Maps of the City, L20 p.67), une parenthèse ouverte non', () => {
  assert.equal(isTrappingName('Maps of the City showing secret passages and poorly guarded homes'), true);
  assert.equal(isTrappingName('Blade of Corruption (any target taking damage from this weapon'), false);
  assert.ok(profile('L20', 'E0-P-623').trappings.includes('Maps of the City showing secret passages and poorly guarded homes'));
});

test('Q27e : « Armoured 5 » n\'est pas un Trait manquant du contrôle (PA gardés en armure)', () => {
  assert.deepEqual(printedTraits('Traits: Armoured 5, Champion, Weapon (Sword) +8').map(item => item.label), ['Champion']);
  assert.equal(profile('L20', 'E0-P-656').armour.ap, 5);
});

test('Q27e : mot de la colonne voisine collé à « Herbs Worth 12/5 » retiré (Hayfoot, L20 p.195)', () => {
  assert.deepEqual(profile('L20', 'E0-P-652').trappings, ['Coarst Clothing', 'Herbs Worth 12/5']);
});
