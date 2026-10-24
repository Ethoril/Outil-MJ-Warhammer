import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSkills } from '../tools/lib/bestiary-profile.mjs';

const profile = (book, id) => JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')).profiles.find(item => item.id === id);
const skill = (record, name) => record.skills.find(item => item.name === name)?.value;

test('Q27i : Officer (L25 p.127) a Language (Wastelander) 51 malgré les lettres du voisin', () => {
  assert.equal(skill(profile('L25', 'E0-P-900'), 'Language (Wastelander)'), 51);
  const parsed = readSkills('Intimidate 36, Language im (Wastelander) 51, Leadership 56');
  assert.deepEqual(parsed.map(item => `${item.name} ${item.value}`), ['Intimidate 36', 'Language (Wastelander) 51', 'Leadership 56']);
});

test('Q27i : Doktor (L25 p.127) a Sleight of Hand 51 (valeur du voisin coincée dans le nom)', () => {
  assert.equal(skill(profile('L25', 'E0-P-904'), 'Sleight of Hand'), 51);
  assert.deepEqual(readSkills('Perception 41, Sleight 61, of Hand 51, Trade (Barber) 46').map(item => `${item.name} ${item.value}`), ['Perception 41', 'Sleight of Hand 51', 'Trade (Barber) 46']);
});

test('Q27i : Triton (L25 p.149) a Lore (Elves) 59, Lore (Theology) 69 et Lore (Oceans) 99', () => {
  const triton = profile('L25', 'E0-P-918');
  assert.equal(skill(triton, 'Lore (Elves)'), 59);
  assert.equal(skill(triton, 'Lore (Theology)'), 69);
  assert.equal(skill(triton, 'Lore (Oceans)'), 99);
  assert.equal(skill(triton, 'Melee (Polearm)'), 83);
});

test('Q27i : Bella Hornwhistler (L26 p.58) a Resistant (Chaos) en talent, pas en Trait', () => {
  const bella = profile('L26', 'E0-P-950');
  assert.deepEqual(bella.talents.map(item => item.name), ['Read/Write', 'Resistant (Chaos)']);
  assert.ok(!(bella.traits || []).some(trait => /Resist/.test(trait.name)));
});

test('Q27i : Scorath (L09 E0-P-354) a Melee (Basic) 68 ; Kelrathi (L09) et Trevna Fane (L10) ont Resistant (Poison)', () => {
  const l09 = JSON.parse(readFileSync('js/data/bestiary/L09.json', 'utf8')).profiles;
  assert.ok(l09.some(item => (item.talents || []).some(talent => talent.name === 'Resistant (Poison)')));
  assert.ok(l09.some(item => (item.skills || []).some(entry => entry.name === 'Melee (Basic)' && entry.value === 68)));
  const l10 = JSON.parse(readFileSync('js/data/bestiary/L10.json', 'utf8')).profiles;
  assert.ok(l10.some(item => (item.talents || []).some(talent => talent.name === 'Resistant (Poison)')));
});
