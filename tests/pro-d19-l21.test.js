import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L21.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D19 Empire in Ruins : 58 profils, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 58);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-665').name, 'Flamers of Tzeentch');
  assert.equal(byId('E0-P-666').name, 'Agitator — Brass 2');
  assert.equal(byId('E0-P-668').name, 'Animated Furniture, Large');
  assert.equal(byId('E0-P-684').name, 'Renia Grünewald — Human Envoy (Silver 2)');
  assert.equal(byId('E0-P-693').name, 'Necrofex Colossus');
});

test('D19 : valeurs imprimées (Flamers p. 21, Colosse nécrofex p. 64, Mobilier p. 24) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-665').stats, { M: 6, CC: 40, CT: 65, F: 40, E: 40, I: 40, Ag: 30, Dex: null, Int: 35, FM: 55, Soc: 10 });
  assert.equal(byId('E0-P-665').wounds, 17);
  assert.equal(byId('E0-P-693').wounds, 176);
  assert.equal(byId('E0-P-668').wounds, 28);
  assert.deepEqual(byId('E0-P-665').keywords, ['demon']);
  assert.deepEqual(byId('E0-P-693').keywords, ['mort-vivant']);
  assert.deepEqual(byId('E0-P-668').keywords, ['artificiel']);
  assert.equal(byId('E0-P-660').keywords, undefined);
});
