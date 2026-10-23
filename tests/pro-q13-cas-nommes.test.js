import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSkills, readTrappings } from '../tools/lib/bestiary-profile.mjs';

const load = id => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles;
const byId = (profiles, id) => profiles.find(profile => profile.id === id);
const names = list => (list || []).map(item => item.name);

test('Q13 outil : « Language (Magick 74, Reikspiel) 48 » donne deux compétences (Grey Seer, L18 p. 97)', () => {
  const skills = readSkills('Channelling 71, Melee (Polearm) 53, Language (Magick 74, Reikspiel) 48');
  assert.deepEqual(skills.map(skill => [skill.name, skill.value]), [['Channelling', 71], ['Melee (Polearm)', 53], ['Language (Magick)', 74], ['Language (Reikspiel)', 48]]);
});

test('Q13 outil : le titre d\'un profil voisin et la description d\'un objet ne sont pas de l\'équipement (Combat Familiar L17 p. 182, Nastassia L18 p. 60)', () => {
  assert.deepEqual(readTrappings('Zweihander, Dagger POWER FAMILIAR but familiars may be used').items, ['Zweihander', 'Dagger']);
  const { items } = readTrappings('Mail Coat, Throat Slitter, Amulet of Thrice-Blessed Copper, Potion, Amulet of Thrice-Blessed Copper: A verdigris amulet worn by spies');
  assert.ok(items.every(item => !/:/.test(item)));
});

test('Q13 L14 : Litharys a son équipement et ses sorts, Fialthra n\'a plus de talent parasite, Ceyluii a ses sorts et son équipement', () => {
  const sea = load('L14');
  const litharys = byId(sea, 'E0-P-475');
  assert.ok(litharys.trappings.includes('Elf Bow with 12 Elf Arrows'));
  assert.ok(litharys.spells['Lore of Heavens'].includes('Divination'));
  const fialthra = byId(sea, 'E0-P-481');
  assert.ok(!names(fialthra.talents).some(name => /Dirt|Reveal Magic/.test(name)));
  assert.ok(fialthra.spells['Petty Spells'].includes('Reveal Magic'));
  assert.ok(names(fialthra.talents).some(name => name.startsWith('Arcane Magic (Beasts')));
  const ceyluii = byId(sea, 'E0-P-483');
  assert.deepEqual(ceyluii.trappings, ['Twig Spear']);
  assert.equal(Object.keys(ceyluii.spells).length, 2);
  assert.equal(ceyluii.talents.length, 19);
});

test('Q13 L14 : Kraken (8 × Tentacles +9) et Prince Dalloran (équipement non coupé)', () => {
  const sea = load('L14');
  const kraken = byId(sea, 'E0-P-488');
  assert.equal(kraken.attacks[0].name, 'Tentacles');
  assert.equal(kraken.attacks[0].count, 8);
  assert.equal(kraken.attacks[0].damage, 9);
  const dalloran = byId(sea, 'E0-P-472');
  assert.ok(dalloran.trappings.includes('Vaults containing vast wealth of coin, rare minerals, and magical items'));
});

test('Q13 L11 : Amoebae 2 × Tentacles +6', () => {
  const amoebae = byId(load('L11'), 'E0-P-027');
  assert.equal(amoebae.attacks[0].count, 2);
  assert.equal(amoebae.attacks[0].damage, 6);
});

test('Q13 L09 : Kharibdyss (Traits complets, 3 attaques) et Duriath Helbane (armure, Sword 90/+8)', () => {
  const book = load('L09');
  const hydra = byId(book, 'E0-P-318');
  assert.equal(hydra.attacks.length, 3);
  for (const trait of ['Amphibious', 'Belligerent', 'Constrictor', 'Distracting', 'Many Heads', 'Regeneration', 'Tracker', 'Venom']) assert.ok(names(hydra.traits).includes(trait), trait);
  const duriath = byId(book, 'E0-P-361');
  assert.deepEqual(names(duriath.armour.parts), ['Medium Armour', 'Sea Dragon Cloak']);
  assert.equal(duriath.armour.parts[0].ap, 3);
  assert.deepEqual(duriath.attacks.map(attack => [attack.name, attack.value, attack.damage]), [['Sword', 90, 8], ['Repeater Handbow and Bolts', 90, 6]]);
});

test('Q13 L18 : Zombie (attaque, Possessions, pas de parasite), Grey Seer (deux Langues), Nastassia (talents et objets entiers)', () => {
  const book = load('L18');
  const zombie = byId(book, 'E0-P-566');
  assert.equal(zombie.attacks[0].damage, 7);
  assert.deepEqual(zombie.trappings, ['Mail coat', 'helmet', 'axe']);
  const seer = byId(book, 'E0-P-557');
  assert.deepEqual(names(seer.skills).filter(name => name.startsWith('Language')), ['Language (Magick)', 'Language (Reikspiel)']);
  const nastassia = byId(book, 'E0-P-545');
  assert.ok(names(nastassia.talents).includes('Master of Disguise'));
  assert.ok(nastassia.trappings.includes('3 GCs in assorted denominations, but can can lay her hands on 100 GCs within an hour'));
  assert.ok(nastassia.trappings.every(item => !/Fast Quality/.test(item)));
});

test('Q13 L17 : Combat Familiar a Dagger et Zweihander, sans texte de la colonne voisine', () => {
  const familiar = byId(load('L17'), 'E0-P-528');
  assert.deepEqual(familiar.trappings, ['Zweihander', 'Dagger']);
  assert.deepEqual(familiar.attacks.map(attack => attack.name), ['Dagger', 'Zweihander']);
});

test('Q13 L04 : Gunna von Sperren a ses 17 talents imprimés', () => {
  const gunna = byId(load('L04'), 'E0-P-172');
  assert.equal(gunna.talents.length, 17);
  assert.ok(names(gunna.talents).includes('Super Numerate'));
});
