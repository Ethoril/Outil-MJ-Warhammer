import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L18.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D16 Power Behind the Throne Companion : 30 profils valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 30);
  assert.ok(book.profiles.every(profile => profile.kind === 'profile' && profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-544').nameFr, 'Hausmeister Breugal — Gouverneur humain, ancien conseiller (Or 3)');
  assert.equal(byId('E0-P-570').nameFr, 'Champions squelettes sans tête');
});

test('D16 : valeurs imprimées (Golthog p. 31, squelettes sans tête p. 119) et mots-clés', () => {
  assert.equal(byId('E0-P-542').wounds, 34);
  assert.deepEqual(byId('E0-P-542').keywords, ['ogre', 'soldat']);
  assert.deepEqual(byId('E0-P-571').stats, { M: 4, CC: 25, CT: 25, F: 30, E: 30, I: 20, Ag: 20, Dex: 25, Int: null, FM: null, Soc: null });
  assert.equal(byId('E0-P-571').wounds, 12);
  assert.equal(byId('E0-P-570').wounds, 13);
  assert.deepEqual(byId('E0-P-565').keywords, ['mort-vivant']);
  assert.deepEqual(byId('E0-P-567').keywords, ['mort-vivant']);
  assert.equal(byId('E0-P-565').stats.M, null);
});
