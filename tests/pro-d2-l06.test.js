import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L06.json', import.meta.url), 'utf8'));
const byName = name => book.profiles.find(profile => profile.name === name);

test('D2 Livre de base V5 : 53 profils et 7 gabarits, noms français du livre FR ou proposés', () => {
  assert.equal(book.profiles.length, 60);
  assert.equal(book.profiles.filter(profile => profile.kind === 'template').length, 7);
  assert.equal(book.edition, 'V5');
  assert.equal(byName('Boar').nameFr, 'Sanglier');
  assert.equal(byName('Boar').nameFrSource, 'L05 p.316');
  assert.equal(byName('Human Watchman').nameFrSource, 'proposition');
  assert.equal(book.profiles.filter(profile => !profile.nameFr).length, 0, 'tous les profils ont un nom français');
});

test('D2 : valeurs imprimées du Sanglier, du Troll et du Dragon, relues sur les pages 325, 335 et 330', () => {
  const boar = byName('Boar');
  assert.deepEqual(boar.stats, { M: 7, CC: 35, CT: null, F: 35, E: 40, I: 35, Ag: 35, Dex: null, Int: 10, FM: 10, Soc: null });
  assert.equal(boar.wounds, 12);
  assert.deepEqual(boar.attacks.map(a => [a.name, a.value, a.damage, a.free ?? null]), [['Hooves and Tusks', 40, 6, null], ['Horns', 40, 7, 'charge']]);
  assert.deepEqual(boar.armour, { toughnessBonus: 4, parts: [{ name: 'Hide', ap: 1 }] });
  const troll = byName('Troll');
  assert.deepEqual([troll.wounds, troll.size, troll.stats.F, troll.stats.E], [30, 'large', 55, 45]);
  assert.deepEqual(troll.attacks.map(a => [a.name, a.value, a.damage]), [['Hand Weapon', 45, 14], ['Bite', 40, 8], ['Vomit', 55, 8]]);
  assert.deepEqual(troll.skills.map(s => [s.name, s.value]), [['Melee (Brawling)', 40], ['Melee (Basic)', 45], ['Endurance', 55]]);
  assert.deepEqual(troll.traits.map(t => t.name), ['Infected', 'Regeneration', 'Size', 'Stupid']);
  const dragon = byName('Dragon');
  assert.equal(dragon.wounds, 104);
  assert.deepEqual(dragon.traits.find(t => t.name === 'Fly'), { name: 'Fly', rating: '80', ref: 'E0-T-023' });
  assert.deepEqual(dragon.attacks.map(a => a.damage), [16, 9, 8]);
});

test('D2 : les natures (Mort-vivant, Démoniaque, Construct) sont des Traits liés à l’inventaire', () => {
  const skeleton = byName('Skeleton');
  assert.deepEqual(skeleton.traits.map(t => t.name), ['Construct', 'Dark Vision', 'Fear', 'Painless', 'Undead', 'Unstable']);
  assert.equal(skeleton.traits.find(t => t.name === 'Undead').ref, 'E0-T-061');
  assert.deepEqual(skeleton.keywords, ['squelette']);
  const bloodletter = byName('Bloodletter of Khorne');
  assert.equal(bloodletter.traits.find(t => t.name === 'Daemonic').rating, '8+');
  assert.deepEqual(bloodletter.keywords, ['demon-de-khorne']);
  assert.deepEqual(bloodletter.attacks.map(a => [a.name, a.qualities ?? null]), [['Hellblade', ['Damaging', 'Magical']], ['Horns', ['Magical']]]);
  // Q33 : la page 343 imprime Night Vision, Undead, Vampiric (le « Bite » lu avant n'était que l'attaque Bite, et Night Vision était perdu dans le titre).
  assert.deepEqual(byName('Vampire').traits.map(t => t.name), ['Night Vision', 'Undead', 'Vampiric']);
});

test('D2 : gabarits en modificateurs signés (cases vides = aucun modificateur)', () => {
  assert.deepEqual(byName('Soldier').modifiers, { CC: 10, F: 10, E: 10, FM: 10 });
  assert.deepEqual(byName('Commander').modifiers, { CC: 20, CT: 20, F: 20, E: 10, I: 20, Ag: 10, FM: 20, Soc: 15 });
  assert.deepEqual(byName('Spellcaster Lord').modifiers, { CC: 10, I: 20, Ag: 15, Int: 20, FM: 20, Soc: 10 });
  assert.equal(byName('Soldier').stats, undefined);
});

test('D2 : mots-clés d’espèce, de nature et d’allégeance assignés', () => {
  const keywords = name => byName(name).keywords;
  assert.deepEqual(keywords('Human Watchman').sort(), ['humain', 'milicien']);
  assert.deepEqual(keywords('Goblin'), ['gobelin']);
  assert.deepEqual(keywords('Orc'), ['orque']);
  assert.deepEqual(keywords('Giant Rat'), ['rat']);
  assert.deepEqual(keywords('Rat Ogre').sort(), ['bete', 'rat-ogre'], 'Skaven et Monstre par Rat-ogre, Bête par le Trait Bestial');
  assert.deepEqual(keywords('Daemonette of Slaanesh'), ['demon-de-slaanesh']);
  assert.deepEqual(keywords('Dwarf'), ['nain']);
});
