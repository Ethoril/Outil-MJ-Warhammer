import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSkills, readTalents, readTrappings, readTraitItem } from '../tools/lib/bestiary-profile.mjs';
import { splitList, splitSections } from '../tools/lib/bestiary-blocks.mjs';
import { extendedGaps } from '../tools/lib/bestiary-completeness.mjs';

const profile = (book, id) => JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')).profiles.find(item => item.id === id);
const names = list => (list || []).map(item => item.name);
const skill = (record, name) => record.skills.find(item => item.name === name)?.value;

test('Q27c : un Souffle gardé comme Trait (rating) compte comme présent dans le contrôle des attaques', () => {
  const block = 'Traits: Armour 2, Bite +8, Breath +10 (Poison)';
  const record = { attacks: [{ name: 'Bite', damage: 8 }], traits: [{ name: 'Breath', rating: '+10', param: 'Poison' }] };
  assert.deepEqual(extendedGaps(record, block).attacks, []);
  assert.deepEqual(extendedGaps({ ...record, traits: [] }, block).attacks, ['Breath +10']);
});

test('Q27c : Breath avec des lettres du voisin (« Breath +17 nd (Brimstone Fire) ») et « 2 Tentacles +6 » sont lus', () => {
  assert.deepEqual(readTraitItem('Breath +17 nd (Brimstone Fire)'), { name: 'Breath', param: 'Brimstone Fire', rating: '+17' });
  assert.deepEqual(readTraitItem('2 Tentacles +6'), { name: 'Tentacles', rating: '+6', count: 2 });
  const hagdar = profile('L16', 'E0-P-508');
  assert.deepEqual(hagdar.traits.find(item => item.name === 'Breath').rating, '+17');
  const sogkog = profile('L12', 'E0-P-456');
  assert.equal(sogkog.attacks.find(item => item.name === 'Tentacles').count, 2);
  assert.equal(sogkog.traits.find(item => item.name === 'Tentacles').count, 2);
  assert.deepEqual(sogkog.trappings, ['Collection of the heads of his favourite victims', 'Two-Handed Stone Axe']);
});

test('Q27c : « Combat Traits: » prolonge la liste des Traits (Demigryph Mount, L13 p.109)', () => {
  const { sections } = splitSections(['Traits: Armour 2, Belligerent, Trained (Broken, Mount, Shock Cavalry, War) Combat Traits: Bite +9, Weapon (Talons) +9 Trappings: Barding (2 AP to Body, Head, Forelegs)']);
  assert.equal(sections.Traits, 'Armour 2, Belligerent, Trained (Broken, Mount, Shock Cavalry, War), Bite +9, Weapon (Talons) +9');
  const demigryph = profile('L13', 'E0-P-459');
  assert.ok(names(demigryph.traits).includes('Trained'));
  assert.deepEqual(demigryph.attacks.map(item => item.name), ['Bite', 'Talons']);
});

test('Q27c : séparateur de milliers (« Jewellery worth 1,750 GC ») et description d\'objets collée à la liste (Thorgrim, L16 p.7)', () => {
  assert.deepEqual(splitList('Axe, Jewellery worth 1,750 GC, Pouch'), ['Axe', 'Jewellery worth 1,750 GC', 'Pouch']);
  const { items } = readTrappings('Armour of Skaldour, Clothing, Jewellery worth 1,750 GC Armour of Skaldour Master Rune of Alaric the Mad -- This weapon ignores all benefits provided by armour.');
  assert.deepEqual(items, ['Armour of Skaldour', 'Clothing', 'Jewellery worth 1,750 GC']);
  assert.deepEqual(profile('L16', 'E0-P-492').trappings.slice(-1), ['Jewellery worth 1,750 GC']);
});

test('Q27c : rang avant la parenthèse d\'un talent et fragment de colonne voisine dans une compétence (Brokk, L16 p.32)', () => {
  assert.deepEqual(readTalents('Ancestral Grudge 2 (Orcs and Goblins, Skaven), Carouser'), [{ name: 'Ancestral Grudge (Orcs and Goblins, Skaven)', rank: 2 }, { name: 'Carouser' }]);
  assert.deepEqual(readSkills('Melee rd, (Basic 90, Two-handed 100), Perception 30').map(item => [item.name, item.value]), [['Melee (Basic)', 90], ['Melee (Two-handed)', 100], ['Perception', 30]]);
  const brokk = profile('L16', 'E0-P-498');
  assert.equal(skill(brokk, 'Melee (Basic)'), 90);
  assert.equal(skill(brokk, 'Melee (Two-handed)'), 100);
  assert.ok(names(brokk.talents).includes('Ancestral Grudge (Orcs and Goblins, Skaven)'));
});

test('Q27c : Gotrek (L16 p.79) garde son équipement après le paragraphe « Amputations »', () => {
  assert.deepEqual(profile('L16', 'E0-P-504').trappings, ['Clothing', 'Jewelry worth 200 GC', "Gotrek's Axe"]);
});

test('Q27c : Nanna (L16 p.45) et le Plague Monk (L16 p.90) n\'ont plus de texte voisin dans leur équipement', () => {
  const { items } = readTrappings('Beardling Initiate, Cult Medallion, Trade Tools (Embalmer, Smith). Outside the hold, add the following: Bandages, Restorative Brew');
  assert.deepEqual(items, ['Beardling Initiate', 'Cult Medallion', 'Trade Tools (Embalmer, Smith)', 'Bandages', 'Restorative Brew']);
  assert.deepEqual(profile('L16', 'E0-P-502').trappings.slice(-2), ['Bandages', 'Restorative Brew']);
  assert.ok(profile('L16', 'E0-P-512').trappings.includes('Pair of Swords'));
  assert.ok(!profile('L16', 'E0-P-512').trappings.includes('Pair of Swords y'));
});

test('Q27c : cas relus à la main (Helga L16 p.31, Porter L13 p.114, Gorfang L12 p.107)', () => {
  assert.equal(skill(profile('L16', 'E0-P-497'), 'Secret Signs (Guilder)'), 40);
  const porter = profile('L13', 'E0-P-464');
  assert.equal(skill(porter, 'Gamble'), 36);
  assert.equal(skill(porter, 'Gossip'), 46);
  assert.ok(profile('L12', 'E0-P-455').trappings.includes('Ramshackle armour incorporating plate, mail, and scale'));
});
