import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readTalents, readTrappings, readTraitItem } from '../tools/lib/bestiary-profile.mjs';
import { splitSections } from '../tools/lib/bestiary-blocks.mjs';
import { printedTraits, printedSpells, extendedGaps } from '../tools/lib/bestiary-completeness.mjs';

const profile = (book, id) => JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')).profiles.find(item => item.id === id);
const names = list => (list || []).map(item => item.name);

test('Q27d : une parenthèse de Trait reste d\'un seul tenant dans le contrôle (Prejudice, Mutation, Spellcasting)', () => {
  const labels = printedTraits('Traits: Armour 1, Prejudice (Those she Presumes to be Weak), Mutation (Extra arm and tail), Weapon +7').map(item => item.label);
  assert.deepEqual(labels, ['Prejudice (Those she Presumes to be Weak)', 'Mutation (Extra arm and tail)']);
});

test('Q27d : renvoi de page, titre voisin et intitulé collé ne sont pas des sorts', () => {
  const labels = printedSpells('Spells: Bolt, Silence YELLOW FANG CULTISTS').map(item => item.label);
  assert.deepEqual(labels, ['Bolt', 'Silence']);
  assert.deepEqual(printedSpells('Spells: Petty: Drain, Rot Arcane Magic and Lore Spells: Bless with Filth (page 109)').map(item => item.label), ['Drain', 'Rot', 'Bless with Filth']);
});

test('Q27d : un talent du catalogue imprimé parmi les Traits compte comme présent', () => {
  const record = { talents: [{ name: 'Acute Sense (Smell)' }], traits: [] };
  assert.deepEqual(extendedGaps(record, 'Traits: Acute Sense (Smell), Infected').traits, ['Infected']);
});

test('Q27d : titre en majuscules et phrase du voisin collés au dernier talent', () => {
  assert.deepEqual(readTalents('Small, Suffuse With (Wind) (see page 186) SPELL FAMILIAR').map(item => item.name), ['Small', 'Suffuse With (Wind) (see page 186)']);
  assert.deepEqual(readTalents('Small, Suffuse With (Wind) (see page 186) The familiars formed in the halls of Altdorf').map(item => item.name), ['Small', 'Suffuse With (Wind) (see page 186)']);
  assert.ok(names(profile('L17', 'E0-P-529').talents).includes('Suffuse With (Wind) (see page 186)'));
});

test('Q27d : note à astérisque des talents (Parzival, L18 p.115) gardée en note, Read/Write conservé', () => {
  const parzival = profile('L18', 'E0-P-560');
  assert.ok(names(parzival.talents).includes('Read/Write'));
  assert.deepEqual(parzival.notes, ['Parzival\'s Status has been effectively reduced due to his current circumstances.']);
});

test('Q27d : ligne « Marks: » après un blanc (L17) devient une note ; Trappings après une Note de Balthasar Gelt', () => {
  assert.deepEqual(profile('L17', 'E0-P-516').notes, ['Marks: Mark of Hysh, Stoicism']);
  assert.deepEqual(profile('L17', 'E0-P-523').notes, ['Marks: Feral, Mark of Ghur']);
  const gelt = profile('L17', 'E0-P-517');
  assert.ok(gelt.trappings.includes('Amulet of Sea Gold') && gelt.trappings.includes('Private Library and Workshop at the Gold College'));
  assert.deepEqual(gelt.notes, ['Marks: Shining Orbs, Hardness, Mark of Chamon']);
  const { sections } = splitSections(['Talents: Savvy', 'Trappings: Staff', '', 'Marks: Mark of Hysh, Stoicism']);
  assert.equal(sections.Marks, 'Mark of Hysh, Stoicism');
});

test('Q27d : équipement décrit par une phrase (Library Disc) est une note ; « Large » seul est la Taille ; Spellcasting est Spellcaster', () => {
  assert.deepEqual(readTrappings('The Disc is piled high with all manner of grimoires. If a Character should acquire one, roll on the table.').items, []);
  assert.deepEqual(readTraitItem('Large'), { name: 'Size', param: 'Large' });
  const disc = profile('L17', 'E0-P-534');
  assert.equal(disc.size, 'large');
  assert.equal(disc.trappings, undefined);
  assert.match(disc.notes[0], /^The Disc is piled high/);
  const liche = profile('L19', 'E0-P-612');
  assert.deepEqual(liche.traits.find(item => item.name === 'Spellcaster').param, 'Death and Necromancy');
});

test('Q27d : « and » de tête retiré du dernier objet de la liste (Gerdon, L19 p.150)', () => {
  assert.ok(profile('L19', 'E0-P-608').trappings.includes('Stolen Goods worth 17 Shillings'));
});
