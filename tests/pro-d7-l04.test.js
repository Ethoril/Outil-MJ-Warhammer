import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L04.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D7 Deft Steps, Light Fingers : 22 profils V4 avec nom français', () => {
  assert.equal(book.profiles.length, 22);
  assert.ok(book.profiles.every(profile => profile.nameFr));
});

test('D7 : valeurs imprimées d’Albrecht (p. 64) et du chevalier de la Garde noire (p. 34)', () => {
  const albrecht = byId('E0-P-171');
  assert.deepEqual(albrecht.stats, { M: 4, CC: 62, CT: 33, F: 49, E: 51, I: 42, Ag: 44, Dex: 40, Int: 58, FM: 54, Soc: 51 });
  assert.equal(albrecht.wounds, 19);
  assert.deepEqual(albrecht.armour, { ap: 1, printedTotal: 6 });
  assert.deepEqual(albrecht.attacks.map(a => [a.name, a.damage]), [['Crossbow Pistol', 7], ['Boat Hook', 8], ['Sword', 8]]);
  assert.deepEqual(byId('E0-P-163').armour, { ap: 5, printedTotal: 8 });
});

test('D7 : le surnom « the Fish » ne donne pas le mot-clé poisson ; bêtes et hors-la-loi', () => {
  assert.deepEqual(byId('E0-P-171').keywords, ['humain']);
  assert.deepEqual(byId('E0-P-184').keywords, ['arabyen', 'bete']);
  assert.deepEqual(byId('E0-P-182').keywords, ['bete']);
  assert.deepEqual(byId('E0-P-176').keywords, ['hors-la-loi']);
});
