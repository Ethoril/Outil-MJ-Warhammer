import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pageBlocks, splitSections } from '../tools/lib/bestiary-blocks.mjs';

const load = id => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles;
const byId = (profiles, id) => profiles.find(profile => profile.id === id);
const HEAD = 'M WS BS S T I Ag Dex Int WP Fel W';

test('Q12a : lignes vides laissées par le titre du voisin avant le corps (L01 p. 14, Ugrik)', () => {
  const page = [
    `   LEFT TITLE ONE                  ${' '.repeat(40)}RIGHT TITLE`,
    `                                   ${' '.repeat(40)}${HEAD}`,
    `               ${HEAD}`,
    `   6 41 32 58 52 11 32 25 22 33 26 36${' '.repeat(40)}6 48 30 53 50 22 33 25 25 33 22 36`,
    '',
    '',
    `   Traits: Armour 2, Weapon (Club +9)${' '.repeat(38)}Traits: Armour 1, Weapon (Bow +8)`
  ].join('\n');
  const blocks = pageBlocks(page);
  assert.equal(blocks.length, 2);
  assert.ok(blocks.every(block => /^Traits: Armour/.test(block.body)), JSON.stringify(blocks.map(block => block.body)));
});

test('Q12a : Base/Adv./Total, la ligne Total fait foi et les étiquettes restent lues (L01 p. 26)', () => {
  const page = [
    `          ${HEAD}`,
    '   Base 6 29 19 58 51 3 21 26 25 36 19 36',
    '   Adv. - - - +10 +10 - - +10 - - +7 -',
    '  Total 6 29 19 68 61 3 21 36 25 36 26 42',
    '  Skills: Athletics 26, Dodge 26',
    '  Talents: Large'
  ].join('\n');
  const [block] = pageBlocks(page);
  assert.deepEqual(block.cells.slice(3, 5), ['68', '61']);
  assert.deepEqual(Object.keys(splitSections(block.bodyLines).sections), ['Skills', 'Talents']);
});

test('Q12a : « Traits*: » conditionnel, note à astérisque séparée de la liste (L01 p. 79)', () => {
  const { sections } = splitSections(['Traits*: Fear 1, Frenzy, Immunity to Psychology', '', '*These Traits only come into play when enraged.', '', 'Skills: Charm 52']);
  assert.equal(sections.Traits, 'Fear 1, Frenzy, Immunity to Psychology');
  assert.equal(sections.Skills, 'Charm 52');
});

test('Q12a : « Fate Points », « Armour by Location » et « Special Rules » ne ferment pas le bloc', () => {
  const { sections, mode } = splitSections(['Traits: Weapon (Dagger) +6', 'Fate Points: 2', 'Skills: Charm 46', 'Trappings: Rope, 5d10 gc', 'Armour by Location: Head 2, Body 4', 'Special Rules: Contemplation, Palanquin']);
  assert.equal(mode, 'v4');
  assert.equal(sections.Trappings, 'Rope, 5d10 gc');
  assert.equal(sections.Traits, 'Weapon (Dagger) +6');
});

test('Q12a : profils L01-L04 vides remplis (Ugrik, Nazzaalta, Artur, Isabella, Doc Ashfield, Pedragar, Brunner, Albrecht)', () => {
  const l01 = load('L01');
  const ugrik = byId(l01, 'E0-P-124');
  assert.equal(ugrik.armour.ap, 1);
  assert.ok(ugrik.talents.some(talent => talent.name === 'Strike to Stun'));
  assert.ok(ugrik.skills.some(skill => skill.name === 'Ranged (Bow)' && skill.value === 35));
  assert.equal(byId(l01, 'E0-P-125').skills.length, 11);
  assert.equal(byId(l01, 'E0-P-126').skills.length, 13);
  const isabella = byId(l01, 'E0-P-136');
  assert.equal(isabella.talents.length, 9);
  assert.ok(isabella.traits.length >= 3 && isabella.traits.every(trait => trait.conditional === true));
  assert.deepEqual(byId(l01, 'E0-P-134').trappings, ['Ragged Clothing']);
  assert.equal(byId(load('L03'), 'E0-P-150').skills.length, 12);
  const l04 = load('L04');
  assert.equal(byId(l04, 'E0-P-173').skills.length, 27);
  assert.equal(byId(l04, 'E0-P-179').skills.length, 28);
  assert.equal(byId(l04, 'E0-P-179').talents.length, 18);
  assert.ok(byId(l04, 'E0-P-171').talents.length >= 20, 'Doomed: « … » ne coupe plus la liste de talents');
  assert.ok(byId(l04, 'E0-P-163').trappings.includes('Shield'));
});

test('Q12a : Nazzaalta et Artur portent la ligne Total imprimée (Force 68, Résistance 61, 42 Blessures)', () => {
  const artur = byId(load('L01'), 'E0-P-126');
  assert.deepEqual([artur.stats.F, artur.stats.E, artur.stats.Soc, artur.wounds], [68, 61, 26, 42]);
  assert.equal(byId(load('L01'), 'E0-P-125').stats.I, 21);
});

test('Q12a : Master and Commander (Q10b) retrouvé dans les livres relus', () => {
  assert.ok(load('L07').some(profile => (profile.talents || []).some(talent => talent.name === 'Master and Commander')));
});
