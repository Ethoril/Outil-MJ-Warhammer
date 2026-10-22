import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L14.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);
const count = kind => book.profiles.filter(profile => profile.kind === kind).length;

test('D13 Sea Wardens of Cothique : 20 profils, noms français proposés, Cothiqui en Haut elfe', () => {
  assert.equal(book.profiles.length, 20);
  assert.deepEqual([count('profile'), count('template'), count('pregenerated-character')], [20, 0, 0]);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.equal(byId('E0-P-487').nameFr, 'Lion blanc');
  assert.ok(byId('E0-P-472').keywords.includes('haut-elfe'));
  assert.deepEqual(byId('E0-P-488').keywords, ['monstre-marin']);
});

test('D13 : valeurs imprimées du Prince Dalloran, de Ceyluii (p. 63) et du Kraken (p. 82)', () => {
  assert.deepEqual(byId('E0-P-472').stats, { M: 5, CC: 85, CT: 45, F: 44, E: 30, I: 88, Ag: 75, Dex: 65, Int: 88, FM: 83, Soc: 75 });
  assert.equal(byId('E0-P-472').wounds, 18);
  assert.deepEqual(byId('E0-P-483').stats, { M: 4, CC: 50, CT: 53, F: 19, E: 35, I: 60, Ag: 88, Dex: 56, Int: 45, FM: 83, Soc: 51 });
  assert.equal(byId('E0-P-483').wounds, 1);
  assert.deepEqual(byId('E0-P-488').stats, { M: 6, CC: 45, CT: null, F: 80, E: 75, I: 35, Ag: 55, Dex: 35, Int: 10, FM: 65, Soc: null });
  assert.equal(byId('E0-P-488').wounds, 224);
});
