import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L23.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D21 Enemy in Shadows Companion : 55 profils, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 55);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-759').name, 'Donkey or Mule');
  assert.equal(byId('E0-P-768').name, 'Aleanora \'Al\' Shortbottom — Halfling Toll Keeper (Brass 5)');
  assert.equal(byId('E0-P-783').name, 'Albert Pförtner — Human Stevedore (Silver 1)');
});

test('D21 : valeurs imprimées (Cheval de trait p. 23, Furie du Chaos p. 84, Aleanora p. 41) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-761').stats, { M: 5, CC: 25, CT: null, F: 45, E: 45, I: 17, Ag: 25, Dex: null, Int: 10, FM: 10, Soc: 20 });
  assert.equal(byId('E0-P-761').wounds, 26);
  assert.deepEqual(byId('E0-P-788').stats, { M: 4, CC: 45, CT: 0, F: 45, E: 35, I: 45, Ag: 45, Dex: 20, Int: 25, FM: 25, Soc: 5 });
  assert.deepEqual(byId('E0-P-768').stats, { M: 3, CC: 22, CT: 54, F: 22, E: 38, I: 36, Ag: 35, Dex: 44, Int: 30, FM: 38, Soc: 44 });
  assert.equal(byId('E0-P-768').wounds, 9);
  assert.deepEqual(byId('E0-P-788').keywords, ['chaos', 'demon']);
  assert.deepEqual(byId('E0-P-765').keywords, ['cheval']);
  assert.deepEqual(byId('E0-P-768').keywords, ['halfling']);
  assert.equal(byId('E0-P-803').keywords, undefined);
});
