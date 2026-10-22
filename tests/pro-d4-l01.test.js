import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L01.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D4 Archives of the Empire 2 : 15 profils V4 avec nom français', () => {
  assert.equal(book.profiles.length, 15);
  assert.equal(book.edition, 'V4');
  assert.ok(book.profiles.every(profile => profile.nameFr));
});

test('D4 : le Rhinox garde ses cases vides (CT, Dex) et ses valeurs imprimées (p. 34)', () => {
  const rhinox = byId('E0-P-127');
  assert.deepEqual(rhinox.stats, { M: 6, CC: 55, CT: null, F: 60, E: 55, I: 25, Ag: 20, Dex: null, Int: 10, FM: 40, Soc: 20 });
  assert.equal(rhinox.wounds, 50);
  assert.equal(rhinox.size, 'large');
  assert.equal(rhinox.armour.ap, 2);
  assert.deepEqual(rhinox.attacks.map(a => [a.name, a.damage]), [['Horns', 10], ['Weapon', 9]]);
});

test('D4 : mots-clés d’espèce et de condition des PNJ', () => {
  assert.deepEqual(byId('E0-P-123').keywords, ['ogre']);
  assert.deepEqual(byId('E0-P-124').keywords, ['ogre', 'hors-la-loi']);
  assert.deepEqual(byId('E0-P-135').keywords, ['noble', 'humain']);
  assert.deepEqual(byId('E0-P-130').keywords, ['humain']);
});
