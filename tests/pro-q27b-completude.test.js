import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSkills, readTrappings } from '../tools/lib/bestiary-profile.mjs';
import { isTrappingName, splitGluedTalent } from '../tools/lib/bestiary-record.mjs';

const profile = (book, id) => JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')).profiles.find(item => item.id === id);
const names = list => (list || []).map(item => item.name);
const skill = (record, name) => record.skills.find(item => item.name === name)?.value;

test('Q27b : une compétence suivie d\'un astérisque garde sa valeur, la note à astérisque ne devient pas une compétence', () => {
  const skills = readSkills('Gossip 65*, Lore (Politics) 65*, Sail 47, Swim 35 *All Tests connected with his present situation, or anything else, are Very Hard (-30).');
  assert.deepEqual(skills.map(item => [item.name, item.value]), [['Gossip', 65], ['Lore (Politics)', 65], ['Sail', 47], ['Swim', 35]]);
  const adalmann = profile('L01', 'E0-P-135');
  assert.equal(skill(adalmann, 'Gossip'), 65);
  assert.equal(skill(adalmann, 'Swim'), 35);
  assert.equal(skill(profile('L02', 'E0-P-145'), 'Dodge'), 49);
});

test('Q27b : une note « * … » après l\'équipement devient une note du profil (Adalbert, L02 p.90)', () => {
  const { items, notes } = readTrappings('Hooded Cloak, Lance, Sword * Adalbert is still getting used to his prosthetic leg, and may not Dodge until he does so.');
  assert.deepEqual(items, ['Hooded Cloak', 'Lance', 'Sword']);
  assert.equal(notes.length, 1);
  assert.deepEqual(profile('L02', 'E0-P-145').trappings.slice(-1), ['Sword']);
});

test('Q27b : un contenant et son contenu sont un seul objet (Pouch containing…, L02 p.30)', () => {
  assert.ok(isTrappingName('Pouch containing Writing Kit and 10 sheets of Parchment and 200 GC'));
  assert.ok(!isTrappingName('many Bodyguards who follow her around and then some more words to be long enough here'));
  assert.ok(profile('L02', 'E0-P-138').trappings.includes('Pouch containing Writing Kit and 10 sheets of Parchment and 200 GC'));
});

test('Q27b : virgule oubliée entre deux talents, spécialisation sur le dernier (Pedragar, L04 p.83)', () => {
  assert.deepEqual(splitGluedTalent('Blather Bless (Taal)'), ['Blather', 'Bless (Taal)']);
  assert.deepEqual(splitGluedTalent('Arcane Magic (Fire)'), ['Arcane Magic (Fire)']);
  assert.deepEqual(names(profile('L04', 'E0-P-173').talents).slice(0, 2), ['Blather', 'Bless (Taal)']);
});

test('Q27b : Richter Kless (L01 p.80) a ses compétences, son Trait, ses talents et son équipement', () => {
  const kless = profile('L01', 'E0-P-137');
  assert.equal(skill(kless, 'Lore (Chaos)'), 79);
  assert.equal(skill(kless, 'Research'), 56);
  assert.equal(kless.traits[0].param, 'Chaotic Dreams');
  assert.equal(kless.talents.length, 9);
  assert.deepEqual(kless.trappings, ['Ragged Clothes']);
});

test('Q27b : traits V4 de L07 / L11 (Souffle, Corrupting, Swamp Strider, Coldblooded, Acute Sense sans clause)', () => {
  const breath = profile('L07', 'E0-P-298').traits.find(item => item.name === 'Breath');
  assert.deepEqual([breath.rating, breath.param], ['+12', 'Fire']);
  assert.ok(names(profile('L07', 'E0-P-251').traits).includes('Corruption'));
  assert.ok(names(profile('L07', 'E0-P-275').traits).includes('Swamp-strider'));
  assert.ok(names(profile('L11', 'E0-P-021').traits).includes('Cold-blooded'));
  for (const id of ['E0-P-263', 'E0-P-299', 'E0-P-300', 'E0-P-306']) {
    assert.ok(profile('L07', id).talents.every(talent => !/as Character Talent/.test(talent.name)), id);
  }
  assert.equal(profile('L07', 'E0-P-299').talents[0].name, 'Acute Sense (Vision)');
});

test('Q27b : le Forest Goblin Shaman (L11 p.15) a Pray 60 et garde sa règle « Not All There »', () => {
  const shaman = profile('L11', 'E0-P-006');
  assert.equal(skill(shaman, 'Pray'), 60);
  assert.deepEqual(shaman.specialRules, ['Not All There']);
});
