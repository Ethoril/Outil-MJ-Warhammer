import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L03.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D6 Archives of the Empire Volume 1 : 13 profils V4 avec nom français', () => {
  assert.equal(book.profiles.length, 13);
  assert.ok(book.profiles.every(profile => profile.nameFr));
});

test('D6 : valeurs imprimées du soldat halfling (p. 23) et de l’inquisiteur nain (p. 56)', () => {
  assert.deepEqual(byId('E0-P-150').stats, { M: 3, CC: 30, CT: 54, F: 21, E: 36, I: 35, Ag: 28, Dex: 44, Int: 27, FM: 53, Soc: 40 });
  assert.equal(byId('E0-P-150').wounds, 11);
  assert.deepEqual(byId('E0-P-157').stats.E, 72);
  assert.equal(byId('E0-P-157').wounds, 24);
});

test('D6 : espèces halfling (pp. 23-31) et nain (pp. 56-63)', () => {
  assert.deepEqual(byId('E0-P-150').keywords, ['soldat', 'halfling']);
  for (const id of ['E0-P-151', 'E0-P-156']) assert.deepEqual(byId(id).keywords, ['halfling'], id);
  for (const id of ['E0-P-157', 'E0-P-162']) assert.deepEqual(byId(id).keywords, ['nain'], id);
});
