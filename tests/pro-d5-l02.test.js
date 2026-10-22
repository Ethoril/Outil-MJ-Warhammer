import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L02.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D5 Archives of the Empire 3 : 12 profils V4 avec nom français', () => {
  assert.equal(book.profiles.length, 12);
  assert.ok(book.profiles.every(profile => profile.nameFr));
});

test('D5 : valeurs imprimées du Blaireau (p. 76) et de la Grafina (p. 30)', () => {
  const badger = byId('E0-P-139');
  assert.deepEqual(badger.stats, { M: 4, CC: 35, CT: null, F: 15, E: 25, I: 35, Ag: 30, Dex: null, Int: 15, FM: 15, Soc: 15 });
  assert.equal(badger.wounds, 5);
  assert.equal(byId('E0-P-138').wounds, 11);
  assert.equal(byId('E0-P-138').stats.Dex, 51);
});

test('D5 : familiers et petits animaux = Bêtes, PNJ = espèce', () => {
  for (const id of ['E0-P-139', 'E0-P-140', 'E0-P-141', 'E0-P-142', 'E0-P-143', 'E0-P-144']) assert.deepEqual(byId(id).keywords, ['bete'], id);
  assert.deepEqual(byId('E0-P-149').keywords, ['nain']);
  assert.deepEqual(byId('E0-P-146').keywords, ['humain']);
});
