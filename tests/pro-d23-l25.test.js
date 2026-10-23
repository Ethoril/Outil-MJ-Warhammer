import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L25.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D23 Sea of Claws : 28 profils, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 28);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-895').name, 'Ludolf Köhler — Imperial Sea Lord (Gold 3)');
  assert.equal(byId('E0-P-902').name, 'Huffer — Silver 1');
  assert.equal(byId('E0-P-904').name, 'Doktor — Silver 5');
});

test('D23 : valeurs imprimées (Köhler, Huffer, Syreen) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-895').stats, { M: 4, CC: 59, CT: 34, F: 37, E: 40, I: 49, Ag: 48, Dex: 54, Int: 44, FM: 32, Soc: 51 });
  assert.equal(byId('E0-P-895').wounds, 12);
  assert.deepEqual(byId('E0-P-902').stats, { M: 4, CC: 41, CT: 31, F: 31, E: 41, I: 41, Ag: 31, Dex: 31, Int: 31, FM: 36, Soc: 36 });
  assert.equal(byId('E0-P-902').wounds, 14);
  assert.deepEqual(byId('E0-P-912').keywords, ['mort-vivant']);
  assert.deepEqual(byId('E0-P-913').keywords, ['monstre-marin']);
});
