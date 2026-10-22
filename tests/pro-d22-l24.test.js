import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L24.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D22 Rough Nights & Hard Days : 81 profils, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 81);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-823').name, 'Friedrich von Pfeifraucher — Magnate (Gold 5)');
  assert.equal(byId('E0-P-832').name, 'Mercinellin \'Seedling\' Thorncobble XIII — Hustler (Brass 1)');
  assert.equal(byId('E0-P-835').name, 'Eberhardt von Dammenblatz — Noble Lord (Gold 7)');
  assert.equal(byId('E0-P-861').name, 'Hubkind\'s Mob (Brass 4)');
});

test('D22 : valeurs imprimées (Vipère impériale, Videur de sang, Coureur des égouts) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-836').stats, { M: 4, CC: 40, CT: null, F: 25, E: 35, I: 35, Ag: 35, Dex: null, Int: 5, FM: 45, Soc: null });
  assert.equal(byId('E0-P-836').wounds, 10);
  assert.deepEqual(byId('E0-P-843').stats, { M: 4, CC: 55, CT: 35, F: 45, E: 35, I: 60, Ag: 40, Dex: 30, Int: 25, FM: 75, Soc: 15 });
  assert.equal(byId('E0-P-843').wounds, 17);
  assert.deepEqual(byId('E0-P-894').stats, { M: 5, CC: 77, CT: 64, F: 43, E: 46, I: 72, Ag: 71, Dex: 54, Int: 37, FM: 36, Soc: 21 });
  assert.deepEqual(byId('E0-P-894').keywords, ['skaven']);
  assert.deepEqual(byId('E0-P-838').keywords, ['fantome']);
});
