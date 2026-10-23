import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L13.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);
const count = kind => book.profiles.filter(profile => profile.kind === kind).length;

test('D12 Up in Arms : 15 fiches, 9 profils et 6 gabarits, noms français proposés', () => {
  assert.equal(book.profiles.length, 15);
  assert.deepEqual([count('profile'), count('template'), count('pregenerated-character')], [9, 6, 0]);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.equal(byId('E0-P-459').nameFr, 'Monture demigriffon');
});

test('D12 : valeurs imprimées du Destrier (p. 29) et du Demigryph (p. 109), Dex absente = null', () => {
  assert.deepEqual(byId('E0-P-457').stats, { M: 4, CC: 35, CT: null, F: 50, E: 50, I: 20, Ag: 20, Dex: null, Int: 10, FM: 10, Soc: 30 });
  assert.equal(byId('E0-P-457').wounds, 32);
  assert.deepEqual(byId('E0-P-459').stats, { M: 7, CC: 55, CT: null, F: 55, E: 45, I: 40, Ag: 55, Dex: null, Int: 15, FM: 45, Soc: 15 });
  assert.equal(byId('E0-P-459').wounds, 34);
});

test('D12 : les gabarits sont des modificateurs signés, sans Blessures', () => {
  assert.deepEqual(byId('E0-P-467').modifiers, { M: -1, CC: -10, CT: -10, F: -5, E: -5, I: -10, Ag: -10, Dex: -10 });
  assert.deepEqual(byId('E0-P-470').modifiers, { F: 10, E: 10, Ag: 10 });
  assert.ok(!('stats' in byId('E0-P-470')) && !('wounds' in byId('E0-P-470')));
});
