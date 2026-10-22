import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L20.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D18 Altdorf : 45 profils, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 45);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-613').name, 'Thyrus Gormann — Wizard Lord (Gold 2)');
  assert.equal(byId('E0-P-632').name, 'Freya Husslhaus — Human Priest (Silver 1)');
  assert.equal(byId('E0-P-651').name, 'Count Jäger');
});

test('D18 : valeurs imprimées (Eckstein p. 65, Brochet p. 132, Honoria p. 137) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-621').stats, { M: 4, CC: 44, CT: 34, F: 31, E: 34, I: 43, Ag: 31, Dex: 47, Int: 63, FM: 34, Soc: 62 });
  assert.equal(byId('E0-P-621').wounds, 12);
  assert.deepEqual(byId('E0-P-640').stats, { M: 4, CC: 65, CT: 5, F: 62, E: 54, I: 35, Ag: 40, Dex: 5, Int: 18, FM: 45, Soc: 4 });
  assert.equal(byId('E0-P-640').wounds, 40);
  assert.equal(byId('E0-P-640').skills[0].value, 68);
  assert.deepEqual(byId('E0-P-643').stats, { M: 5, CC: 49, CT: 25, F: 45, E: 30, I: 55, Ag: 55, Dex: 35, Int: 22, FM: 35, Soc: 15 });
  assert.deepEqual(byId('E0-P-654').keywords, ['skaven']);
  assert.deepEqual(byId('E0-P-620').keywords, ['nain']);
});
