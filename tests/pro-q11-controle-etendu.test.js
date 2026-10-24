import test from 'node:test';
import assert from 'node:assert/strict';
import { blockAfter, extendedGaps, normalizeBlockText, printedAttacks, printedSkills, printedSpells, printedTraits, printedTrappings, trappingNoise } from '../tools/lib/bestiary-completeness.mjs';

const KRAKEN = normalizeBlockText(' M WS BS S T I Ag Dex Int WP Fel W 6 45 � 80 75 35 55 35 10 65 � 224 Traits: Cold-blooded, Constrictor, Dark Vision, Grim 3, Hungry, Marine Creature, Size (Monstrous), Stealthy, 8 � Tentacles +9, Weapon (Beak) +12 Attack');
const LITHARYS = normalizeBlockText(' M WS BS S T I Ag Dex Int WP Fel W 6 82 81 32 46 87 77 55 85 84 60 19 Gold 5 Traits: Armour 2 (7), Ranged (Elf Bow) +8 (150) (Accurate, Damaging), Weapon (Sword) +9 Skills: Athletics 102 Talents: Luck 3 Petty Spells: Bearings, Dazzle, Reveal Magic Lore of Heavens: Divination, Drop Trappings: Courtly Garb, Elf Bow with 12 Elf Arrows, Sword THE INCANDESCENT SPEAR Litharys bears a spear forged in the time of Aenarion.');
const CARRION = normalizeBlockText(' M WS BS S T I Ag Dex Int WP Fel W 4 43 - 30 30 40 30 - 10 30 - 21 Traits: Creature Weapons (Beak +9, 2 Claws +7), Fear 3, Fly 100, Size (Large), Undead the neighbour column prose');

test('Q11 : attaques imprimées, multiplicateur « 8 × » et parenthèse conservés', () => {
  assert.deepEqual(printedAttacks(blockAfter(KRAKEN, 0)).map(attack => attack.key), ['tentacles|9|8', 'beak|12|1']);
  assert.deepEqual(printedAttacks(blockAfter(LITHARYS, 0)).map(attack => attack.key), ['elfbow|8|1', 'sword|9|1']);
  assert.deepEqual(printedAttacks(blockAfter(CARRION, 0)).map(attack => attack.key), ['beak|9|1', 'claws|7|2']);
});

test('Q11 : manque d’attaque signalé, aucun manque pour un profil complet', () => {
  const kraken = { traits: [{ name: 'Cold-blooded' }, { name: 'Constrictor' }, { name: 'Dark Vision' }, { name: 'Grim' }, { name: 'Hungry' }, { name: 'Marine Creature' }, { name: 'Size' }, { name: 'Stealthy' }], attacks: [{ name: 'Beak', damage: 12 }] };
  assert.deepEqual(extendedGaps(kraken, blockAfter(KRAKEN, 0)).attacks, ['8 - Tentacles +9']);
  kraken.attacks.push({ name: 'Tentacles', damage: 9, count: 8 });
  const gaps = extendedGaps(kraken, blockAfter(KRAKEN, 0));
  assert.deepEqual([gaps.attacks, gaps.traits, gaps.trappings, gaps.spells], [[], [], [], []]);
});

test('Q11 : Traits imprimés sans attaque ni armure ; alias et intitulé « Attack » collé', () => {
  assert.deepEqual(printedTraits(blockAfter(KRAKEN, 0)).map(trait => trait.label), ['Cold-blooded', 'Constrictor', 'Dark Vision', 'Grim 3', 'Hungry', 'Marine Creature', 'Size (Monstrous)', 'Stealthy']);
  const flyer = { traits: [{ name: 'Fly' }, { name: 'Fear' }, { name: 'Size' }, { name: 'Undead' }], attacks: [{ name: 'Beak', damage: 9 }, { name: 'Claws', damage: 7, count: 2 }] };
  assert.deepEqual(extendedGaps(flyer, blockAfter(CARRION, 0)).traits, []);
  assert.deepEqual(printedTraits(blockAfter(CARRION, 0)).map(trait => trait.label), ['Fear 3', 'Fly 100', 'Size (Large)', 'Undead']);
});

test('Q11 : équipement imprimé, la phrase de la colonne voisine met fin à la liste', () => {
  assert.deepEqual(printedTrappings(blockAfter(LITHARYS, 0)).map(item => item.label), ['Courtly Garb', 'Elf Bow with 12 Elf Arrows', 'Sword THE INCANDESCENT SPEAR Litharys bears a spear forged in the time of Aenarion.'].slice(0, 2));
  const gaps = extendedGaps({ trappings: ['Courtly Garb'], attacks: [], traits: [] }, blockAfter(LITHARYS, 0));
  assert.deepEqual(gaps.trappings, ['Elf Bow with 12 Elf Arrows']);
});

test('Q11 : bruit d’équipement repéré (phrase, minuscule, intitulé de rubrique)', () => {
  assert.deepEqual(trappingNoise({ trappings: ['Dagger', 'a grey cloak', 'Skills: Dodge 40', 'The Count is old'] }), ['a grey cloak', 'Skills: Dodge 40', 'The Count is old']);
});

test('Q11 : sorts imprimés par liste (Petty, Lore of X), le texte suivant est ignoré', () => {
  assert.deepEqual(printedSpells(blockAfter(LITHARYS, 0)).map(spell => spell.label), ['Bearings', 'Dazzle', 'Reveal Magic', 'Divination', 'Drop']);
  const gaps = extendedGaps({ spells: [{ lore: 'Petty', spells: ['Bearings', 'Dazzle'] }, 'Reveal Magic'], attacks: [], traits: [], trappings: ['Courtly Garb', 'Elf Bow with 12 Elf Arrows'] }, blockAfter(LITHARYS, 0));
  assert.deepEqual(gaps.spells, ['Divination', 'Drop']);
});

test('Q11 : un talent à rang imprimé dans la ligne Skills n’est pas une compétence (Lokhir L07)', () => {
  const block = normalizeBlockText(' M WS 1 Skills: Ambidextrous, Athletics 70, Dual Wielder 2, Melee (Basic) 95 Talents: Iron Will');
  assert.deepEqual(printedSkills(block, new Set(['dual wielder'])).map(skill => skill.key), ['athletics||70', 'melee|basic|95']);
});
