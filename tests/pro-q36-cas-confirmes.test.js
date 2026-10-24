import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readArmour, readTraitItem } from '../tools/lib/bestiary-profile.mjs';
import { splitSections } from '../tools/lib/bestiary-blocks.mjs';
import { cleanSkills, splitGluedTalent } from '../tools/lib/bestiary-record.mjs';
import { printedAttacks } from '../tools/lib/bestiary-completeness.mjs';

const load = book => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${book}.json`, import.meta.url), 'utf8')).profiles;
const find = (book, id) => load(book).find(profile => profile.id === id);
const names = list => (list || []).map(item => (typeof item === 'string' ? item : item.name));

test('Q36 outil : « Ward 8+: » ouvre un paragraphe de Traits décrits', () => {
  const lines = ['Traits', 'Venom (Challenging): Wounded opponents.', '', 'Ward 8+: Roll 1d10 after any blow is received.'];
  const traits = splitSections(lines).sections.Traits;
  assert.match(traits, /Ward 8\+:/);
});

test('Q36 données : Doomfire Warlock (L09 p. 52) a le Trait Ward 8+, Kelrathi (p. 104) Arcane Magic (Beasts) et Bookish', () => {
  const warlock = find('L09', 'E0-P-325');
  assert.deepEqual(warlock.traits.filter(trait => trait.name === 'Ward').map(trait => trait.rating), ['8+']);
  const kelrathi = find('L09', 'E0-P-355');
  assert.ok(names(kelrathi.talents).includes('Arcane Magic (Beasts)'));
  assert.ok(names(kelrathi.talents).includes('Bookish'));
  assert.ok(!names(kelrathi.talents).some(name => /Magick/.test(name)));
});

test('Q36 outil : « Weapon +6 (Claws) » est une arme nommée, pas une qualité', () => {
  assert.deepEqual(readTraitItem('Weapon +6 (Claws)'), { name: 'Weapon', rating: '+6', param: 'Claws' });
  // Les qualités entre parenthèses derrière un nom d'arme restent des qualités (Hagdar, L16 p. 84).
  const hagdar = readTraitItem('Weapon (Obsidian Claws) +10 (Hack, Penetrating)');
  assert.equal(hagdar.param, 'Obsidian Claws');
  assert.deepEqual(hagdar.qualities, ['Hack', 'Penetrating']);
});

test('Q36 données : armes nommées de L17 (Claws, Quill, Bite) et de L23 (Claws)', () => {
  for (const [book, id, name] of [['L17', 'E0-P-532', 'Claws'], ['L17', 'E0-P-533', 'Quill'], ['L17', 'E0-P-534', 'Bite'], ['L23', 'E0-P-788', 'Claws'], ['L23', 'E0-P-789', 'Claws'], ['L23', 'E0-P-790', 'Claws']]) {
    const weapon = find(book, id).attacks.find(attack => attack.trait === 'Weapon');
    assert.equal(weapon.name, name, id);
    assert.equal(weapon.qualities, undefined, id);
  }
});

test('Q36 contrôle : une arme V4 « Weapon +6 (Claws) » est comptée sous le nom de l\'arme', () => {
  const block = 'Traits: Corruption (Moderate), Size (Small), Weapon +6 (Claws) Skills: Language (Magick) 95';
  assert.deepEqual(printedAttacks(block).map(attack => attack.key), ['claws|6|1']);
});

test('Q36 données : Outlaw (L04 p. 103) garde « 5 Matches » au bord du profil voisin', () => {
  assert.ok(find('L04', 'E0-P-176').trappings.includes('Sling Bag containing 2 Candles and 5 Matches'));
  assert.ok(find('L04', 'E0-P-177').trappings.includes('Sling Bag containing 2 Candles and 5 Matches'));
});

test('Q36 données : Gurniksson (L03 p. 63) garde ses compétences imprimées sans valeur', () => {
  const profile = find('L03', 'E0-P-161');
  assert.deepEqual(profile.unvaluedSkills, ['Leadership', 'Lore (Geology)', 'Stealth (Underground)']);
  assert.equal(profile.skills, undefined);
  // Une liste qui a des valeurs ne verse jamais ses compétences sans valeur dans unvaluedSkills (texte voisin).
  const mixed = cleanSkills([{ name: 'Dodge', value: 40 }, { name: 'Leadership', value: null }]);
  assert.deepEqual(mixed.unvalued, []);
});

test('Q36 outil : armure « Breastplate: +2 AP Body » et « Toughness Bonus: +3 »', () => {
  assert.deepEqual(readArmour('Toughness Bonus: +3'), { parts: [], toughnessBonus: 3 });
  assert.deepEqual(readArmour('Toughness Bonus: 3 Breastplate: +2 AP Body'), { parts: [{ name: 'Breastplate', ap: 2, optional: false, locations: 'Body' }], toughnessBonus: 3 });
  // Le nom du Dragon Cloak suivant n'est pas une zone.
  const cloaks = readArmour('Sea Dragon Cloak: +3 AP Sea Dragon Cloak: +1 AP Body');
  assert.deepEqual(cloaks.parts.map(part => part.locations), [undefined, 'Body']);
});

test('Q36 données : armure L10 (E0-P-382, 388, 390) et E0-P-368', () => {
  assert.deepEqual(find('L10', 'E0-P-382').armour, { toughnessBonus: 3, parts: [{ name: 'Breastplate', ap: 2, locations: 'Body' }] });
  assert.deepEqual(find('L10', 'E0-P-390').armour, { toughnessBonus: 4, parts: [{ name: 'Leather Jerkin', ap: 1, locations: 'Body' }] });
  // Erich Frohlich (p. 91) : le livre imprime « Toughness Bonus: » sans nombre ; le Bonus n'est pas inventé.
  assert.deepEqual(find('L10', 'E0-P-388').armour, { parts: [{ name: 'Leather Jerkin', ap: 1, locations: 'Body' }] });
  assert.equal(find('L10', 'E0-P-368').armour.toughnessBonus, 3);
});

test('Q36 outil : bouclier facultatif « +2 AP and +1 SL when Opposing… »', () => {
  const armour = readArmour('Toughness Bonus: 4 Optional Medium Armour: +3 AP Optional Shield: +2 AP and +1 SL when Opposing an attack with Dodge or Melee');
  assert.deepEqual(armour.parts[1], { name: 'Shield', ap: 2, optional: true, slBonus: 1, condition: 'when Opposing an attack with Dodge or Melee' });
  assert.equal(armour.parts[0].locations, undefined);
});

test('Q36 données : le bouclier facultatif est lu pour tous les profils de L06 qui l\'impriment', () => {
  const withShield = load('L06').filter(profile => (profile.armour?.parts || []).some(part => part.name === 'Shield'));
  assert.equal(withShield.length, 14);
  for (const profile of withShield) {
    const shield = profile.armour.parts.find(part => part.name === 'Shield');
    assert.deepEqual([shield.ap, shield.optional, shield.slBonus], [2, true, 1], profile.id);
  }
  assert.ok(withShield.some(profile => profile.id === 'E0-P-099'));
  assert.ok(withShield.some(profile => profile.id === 'E0-P-063'));
});

test('Q36 données : River Trolls (L26 p. 89) Stealth facultatif, Plague Monk (L16 p. 90) options, Zurn (L21 p. 84) note à astérisque', () => {
  assert.deepEqual(find('L26', 'E0-P-963').optionalSpecialRules, ['Stealth']);
  const monk = find('L16', 'E0-P-512');
  assert.ok(monk.notes.some(note => /^Options: Three of the Plague Monks are suffering from Foaming Lungrot/.test(note)));
  assert.equal(monk.optionalTraits, undefined);
  assert.deepEqual(find('L21', 'E0-P-705').notes, ['* Gain the Bite +3 Creature Trait.']);
  // Une liste de Traits facultatifs suivie de prose reste une liste (L19, Child of Ulric).
  assert.ok(load('L19').some(profile => (profile.optionalTraits || []).some(trait => trait.name === 'Blessed')));
});

test('Q36 outil : « Arcane Magick (Beasts) Bookish » donne deux talents', () => {
  assert.deepEqual(splitGluedTalent('Arcane Magick (Beasts) Bookish'), ['Arcane Magic (Beasts)', 'Bookish']);
});
