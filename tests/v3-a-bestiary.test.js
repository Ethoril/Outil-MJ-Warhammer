import test from 'node:test';
import assert from 'node:assert/strict';
import book from '../js/data/bestiary/L06.json' with { type: 'json' };

// Livre de base V5 EN v3 : bestiaire pp.320-356.
const profile = name => book.profiles.find(row => row.name === name);
const attack = (name, attackName) => profile(name).attacks.find(row => row.name === attackName);
const trait = (name, traitName) => profile(name).traits.find(row => row.name === traitName);

test('v3 grands monstres : dégâts imprimés relevés, Morsure et Queue inchangées', () => {
  assert.equal(attack('Dragon', 'Claws').damage, 22);
  assert.equal(attack('Giant', 'Hand Weapon').damage, 22);
  assert.equal(attack('Griffon', 'Talons').damage, 19);
  assert.equal(attack('Manticore', 'Claws').damage, 19);
  assert.deepEqual([attack('Dragon', 'Bite').damage, attack('Dragon', 'Tail').damage, attack('Griffon', 'Bite').damage, attack('Manticore', 'Tail').damage], [9, 8, 8, 7]);
});

test('v3 gabarits : Lieutenant, Commandant et Seigneur lanceur', () => {
  const lieutenant = profile('Lieutenant');
  assert.equal(lieutenant.nameFr, 'Lieutenant');
  assert.deepEqual(lieutenant.modifiers, { CC: 20, CT: 20, F: 20, E: 20, I: 20, Ag: 20, FM: 20, Soc: 10 });
  assert.deepEqual(profile('Commander').modifiers, { CC: 30, CT: 30, F: 20, E: 20, I: 30, Ag: 20, FM: 30, Soc: 15 });
  assert.deepEqual(profile('Spellcaster Lord').modifiers, { CC: 10, I: 20, Ag: 15, Int: 30, FM: 20, Soc: 10 });
});

test('v3 Ungrakk : profil p.355, Dextérité 35 imprimée', () => {
  const ungrakk = book.profiles.find(row => row.name.startsWith('Ungrakk'));
  assert.deepEqual(ungrakk.stats, { M: 5, CC: 65, CT: 60, F: 55, E: 60, I: 60, Ag: 55, Dex: 35, Int: 20, FM: 60, Soc: 25 });
  assert.equal(ungrakk.wounds, 23);
  assert.equal(ungrakk.armour.toughnessBonus, 6);
  assert.deepEqual(ungrakk.attacks.map(row => [row.name, row.value, row.damage]), [['Hand Weapon', 85, 9], ['Horns', 65, 9]]);
  const skill = name => ungrakk.skills.find(row => row.name === name).value;
  assert.deepEqual(['Cool', 'Dodge', 'Intimidate', 'Leadership', 'Lore (Warfare)', 'Perception'].map(skill), [80, 75, 75, 55, 55, 80]);
  assert.deepEqual(ungrakk.skills.filter(row => row.name.startsWith('Melee')).map(row => row.value), [85, 85]);
});

test('v3 Ogre sans Trait Peur ; indices de Peur explicites', () => {
  assert.equal(trait('Ogre', 'Fear'), undefined);
  for (const name of ['Skeleton', 'Zombie', 'Dire Wolf', 'Ghost', 'Daemonette of Slaanesh']) assert.equal(trait(name, 'Fear').rating, '2', name);
  assert.equal(profile('Vampire').optionalTraits.find(row => row.name === 'Fear').rating, '2');
  assert.equal(trait('Bloodletter of Khorne', 'Fear').rating, '3');
});

test('v3 elfes et nains p.320 : arc long +8, arbalète à 40', () => {
  assert.equal(profile('High Elf or Wood Elf').attacks.find(row => row.name === 'Longbow and Elf Arrows').damage, 8);
  assert.equal(profile('Dwarf').attacks.find(row => row.name === 'Crossbow and Bolts').rangeYards, 40);
});

test('v3 Grim : Trait optionnel des neuf profils', () => {
  for (const name of ['Bog Octopus', 'Dragon', 'Giant', 'Griffon', 'Manticore', 'Troll', 'Vampire', 'Varghulf', 'Minotaur'])
    assert.ok(profile(name).optionalTraits.some(row => row.name === 'Grim' && row.ref === 'E0-T-026'), name);
});
