import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pageBlocks, splitSections } from '../tools/lib/bestiary-blocks.mjs';
import { readAttacks } from '../tools/lib/bestiary-profile.mjs';

const load = id => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles;
const byId = (profiles, id) => profiles.find(profile => profile.id === id);
const names = list => (list || []).map(item => item.name);
const HEAD = 'M WS BS S T I Ag Dex Int WP Fel W';

test('Q12b : un bloc V4 dont le Trait « Armour 3 (9) » ouvre une ligne reste V4 (L12 p. 36, Boggrub)', () => {
  const { mode, sections } = splitSections(['Traits: Afraid (Elves), Animosity (Greenskins),', 'Armour 3 (9), Infected, Night Vision, Weapon +9', 'Skills: Cool 80, Dodge 65', 'Trappings: Helmet, Mail Shirt']);
  assert.equal(mode, 'v4');
  assert.match(sections.Traits, /Armour 3 \(9\)/);
  assert.equal(sections.Skills, 'Cool 80, Dodge 65');
});

test('Q12b : Boggrub Legbiter est complet (Traits, attaque, 9 compétences, 8 talents, équipement)', () => {
  const boggrub = byId(load('L12'), 'E0-P-422');
  assert.deepEqual(boggrub.armour, { ap: 3, printedTotal: 9 });
  assert.deepEqual(names(boggrub.traits), ['Afraid', 'Animosity', 'Infected', 'Night Vision']);
  assert.equal(boggrub.attacks[0].damage, 9);
  assert.equal(boggrub.skills.length, 9);
  assert.ok(boggrub.skills.some(skill => skill.name === 'Melee (Polearm)' && skill.value === 80));
  assert.equal(boggrub.talents.length, 8);
  assert.deepEqual(boggrub.trappings, ['Helmet', 'Mail Shirt', 'Sword', 'Shield', 'Spear']);
});

test('Q12b : « Weapons (Spear) +8 » (coquille du livre) est une attaque (Gutbug, L12 p. 37)', () => {
  const gutbug = byId(load('L12'), 'E0-P-423');
  assert.equal((gutbug.attacks || []).length, 2);
  assert.ok(gutbug.skills.some(skill => skill.name === 'Melee (Polearm)'));
});

test('Q12b : un blanc isolé au milieu des Compétences ne coupe pas la liste (Harboth, L12 p. 48)', () => {
  const harboth = byId(load('L12'), 'E0-P-426');
  assert.ok(harboth.skills.some(skill => skill.name === 'Perception' && skill.value === 70));
  assert.ok(harboth.skills.some(skill => skill.name === 'Ranged (Bow)' && skill.value === 55));
  assert.equal(harboth.talents.length, 8);
  assert.ok(harboth.trappings.includes('Helmet'));
});

test('Q12b : les profils V5 de L10 (Skeletal Witch, Crypt Ghast, Graug) ont leurs Traits et leur armure', () => {
  const l10 = load('L10');
  const witch = byId(l10, 'E0-P-371');
  assert.deepEqual(witch.armour.parts, [{ name: 'Armour', ap: 3 }]);
  assert.ok(names(witch.traits).includes('Undead'));
  const ghast = byId(l10, 'E0-P-373');
  assert.deepEqual(names(ghast.traits).slice(0, 3), ['Bite', 'Fearless', 'Frenzy']);
  const graug = byId(l10, 'E0-P-372');
  assert.deepEqual(graug.armour.parts, [{ name: 'Armour', ap: 4 }]);
  assert.ok(names(graug.traits).includes('Territorial'));
});

test('Q12b : un libellé centré qui dépasse la fenêtre, au-dessus du titre du voisin, est repris (L10 p. 68)', () => {
  const page = [
    `${' '.repeat(70)}CRYPT GHAST`,
    `${' '.repeat(70)}${HEAD}`,
    `${' '.repeat(70)}4 40 - 55 40 50 45 25 20 35 5 16`,
    '',
    `${' '.repeat(102)}Traits`,
    `${' '.repeat(70)}Bite +7, Fearless, Frenzy, Hungry,`,
    `${' '.repeat(70)}Venom (Hard), Weapon (Claws) +8`,
    '',
    `${' '.repeat(110)}CRYPT HORROR`,
    `${' '.repeat(94)}${HEAD}`,
    `${' '.repeat(94)}6 40 - 45 40 20 30 25 20 20 5 28`
  ].join('\n');
  const [ghast] = pageBlocks(page);
  assert.equal(ghast.bodyLines[0], 'Traits');
});

test('Q12b : « Traits and Talents » V5 sépare les talents du catalogue (Niels Vorberren, Grimes)', () => {
  const niels = byId(load('L10'), 'E0-P-378');
  assert.deepEqual(names(niels.talents), ['Marksman', 'Night Vision', 'Nimble-fingered', 'Roughrider', 'Tunnel Fighter']);
  assert.equal(niels.attacks.length, 2);
  assert.equal(niels.attacks[0].rangeYards, 50);
  assert.equal(byId(load('L10'), 'E0-P-392').attacks.length, 1);
});

test('Q12b : attaque V5 sans deux-points, la phrase de qualité de la précédente n\'est pas un nom', () => {
  const attacks = readAttacks('Bow (50/+7) range of 50 yards with the Impale Quality Hand Weapon (42/+6)');
  assert.deepEqual(attacks.map(attack => [attack.name, attack.value, attack.damage]), [['Bow', 50, 7], ['Hand Weapon', 42, 6]]);
});

test('Q12b : en-tête à cheval sur la gouttière, corps lu dans la colonne de droite (L10 p. 81, Niels)', () => {
  const niels = byId(load('L10'), 'E0-P-378');
  assert.equal(niels.stats.CC, 37);
  assert.deepEqual(niels.armour.parts.map(part => part.ap), [2]);
  assert.equal(niels.skills.length, 11);
  assert.ok(niels.trappings.includes('Light Warhorse'));
});

test('Q12b : Gretchen Beirne et Ranolf Quickfingers, étiquettes réordonnées par l\'extraction (relus sur la page)', () => {
  const l10 = load('L10');
  const gretchen = byId(l10, 'E0-P-380');
  assert.equal(gretchen.attacks[0].value, 28);
  assert.equal(gretchen.skills.length, 10);
  assert.deepEqual(gretchen.spells['Lore of Hedgecraft'], ['Goodwill', 'Part the Branches', 'Protective Charm']);
  const ranolf = byId(l10, 'E0-P-386');
  assert.equal(ranolf.attacks[0].name, 'Crowbar');
  assert.ok(names(ranolf.talents).includes('Fast Hands'));
});

test('Q12b : les profils L09 qui étaient vides (War Hydra, Sea Dragon, Dockside Thug, Dark Steed) ont des données', () => {
  const l09 = load('L09');
  for (const id of ['E0-P-315', 'E0-P-319', 'E0-P-323', 'E0-P-347']) {
    const profile = byId(l09, id);
    const count = ['traits', 'attacks', 'skills', 'talents', 'trappings'].reduce((sum, key) => sum + (profile[key] || []).length, 0);
    assert.ok(count > 0, `${id} ${profile.name} vide`);
  }
});

test('Q12b : paragraphe de règle spéciale entre les Traits et les Compétences (Forest Dragons, Fantasma, River Troll Hag)', () => {
  const l11 = load('L11');
  assert.ok(byId(l11, 'E0-P-017').skills.some(skill => skill.name === 'Melee (Root-like Claws)' && skill.value === 75));
  assert.ok(byId(l11, 'E0-P-031').skills.some(skill => skill.name === 'Channelling' && skill.value === 80));
  assert.deepEqual(names(byId(l11, 'E0-P-059').talents), ['Enclosed Fighter', 'Reaction Strike', 'Shadow']);
});

test('Q12b : aucun profil de L07 à L12 sans la moindre donnée hors caractéristiques', () => {
  for (const id of ['L07', 'L09', 'L10', 'L11', 'L12']) {
    for (const profile of load(id)) {
      if (profile.kind !== 'profile') continue;
      const count = ['traits', 'attacks', 'skills', 'talents', 'trappings'].reduce((sum, key) => sum + (profile[key] || []).length, 0);
      assert.ok(count > 0, `${id} ${profile.id} ${profile.name}`);
    }
  }
});
