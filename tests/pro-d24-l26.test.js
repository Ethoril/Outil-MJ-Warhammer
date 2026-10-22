import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L26.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D24 Death on the Reik Companion : 62 profils, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 62);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-927').name, 'Gertrud Schützenberger — Human River Recruit (Silver 1)');
  assert.equal(byId('E0-P-940').name, 'Eusapia Balacañon — Human Master Wizard (Gold 1)');
  assert.equal(byId('E0-P-946').name, 'Altgräfin Emelia Luneburg — Human Magnate (Gold 5)');
  assert.equal(byId('E0-P-984').name, 'Carrion');
});

test('D24 : valeurs imprimées (Roland, Carrion) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-935').stats, { M: 4, CC: 45, CT: 35, F: 53, E: 47, I: 33, Ag: 31, Dex: 33, Int: 32, FM: 36, Soc: 22 });
  assert.equal(byId('E0-P-935').wounds, 16);
  assert.deepEqual(byId('E0-P-984').stats, { M: 4, CC: 43, CT: null, F: 30, E: 30, I: 40, Ag: 30, Dex: null, Int: 10, FM: 30, Soc: null });
  assert.equal(byId('E0-P-984').wounds, 24);
  assert.deepEqual(byId('E0-P-984').keywords, ['mort-vivant']);
  assert.ok(!byId('E0-P-935').keywords.includes('cheval'));
  assert.ok(!byId('E0-P-960').keywords.includes('geant'));
});
