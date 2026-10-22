import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L22.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D20 The Horned Rat Companion : 43 profils, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 43);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-740').name, 'Mila Raast — Yellow Fang Senior Cultist');
  assert.equal(byId('E0-P-747').name, 'Gimbrin Flintbeard — Dwarf King\'s Ghost');
});

test('D20 : valeurs imprimées (Seer p. 14, Hellbeast p. 28, Abyssal Terror p. 120) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-716').stats, { M: 5, CC: 55, CT: 30, F: 32, E: 58, I: 65, Ag: 38, Dex: 35, Int: 65, FM: 55, Soc: 43 });
  assert.equal(byId('E0-P-716').wounds, 18);
  assert.deepEqual(byId('E0-P-729').stats, { M: 6, CC: 45, CT: null, F: 55, E: 55, I: 35, Ag: 45, Dex: null, Int: 10, FM: 25, Soc: 15 });
  assert.equal(byId('E0-P-729').wounds, 68);
  assert.equal(byId('E0-P-756').wounds, 84);
  assert.deepEqual(byId('E0-P-716').keywords, ['skaven']);
  assert.deepEqual(byId('E0-P-733').keywords, ['rat']);
  assert.deepEqual(byId('E0-P-756').keywords, ['mort-vivant']);
  assert.deepEqual(byId('E0-P-758').keywords, ['mort-vivant', 'artificiel']);
  assert.equal(byId('E0-P-729').keywords, undefined);
});
