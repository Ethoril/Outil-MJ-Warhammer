import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L19.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D17 Middenheim : 41 profils dont un gabarit, tous valides, noms français proposés', () => {
  assert.equal(book.profiles.length, 41);
  assert.equal(book.profiles.filter(profile => profile.kind === 'template').length, 1);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.deepEqual(book.profiles.flatMap(profile => validateBestiaryRecord(profile)), []);
  assert.equal(byId('E0-P-600').nameFr, 'Loup blanc');
  assert.equal(byId('E0-P-585').name, 'Emmille Münzstätter — Human Artisan (Silver 1)');
});

test('D17 : valeurs imprimées (Valgeir p. 52, Skrray p. 109, Liche p. 157) et mots-clés', () => {
  assert.deepEqual(byId('E0-P-575').stats, { M: 4, CC: 60, CT: 46, F: 48, E: 45, I: 48, Ag: 33, Dex: 45, Int: 39, FM: 40, Soc: 42 });
  assert.equal(byId('E0-P-575').wounds, 16);
  assert.deepEqual(byId('E0-P-575').armour, { detail: 'Helm 2, Plate 3' });
  assert.deepEqual(byId('E0-P-592').stats, { M: 5, CC: 54, CT: 36, F: 47, E: 45, I: 60, Ag: 45, Dex: 41, Int: 45, FM: 42, Soc: 45 });
  assert.equal(byId('E0-P-592').armour.ap, 4);
  assert.deepEqual(byId('E0-P-592').keywords, ['skaven']);
  assert.deepEqual(byId('E0-P-612').keywords, ['mort-vivant']);
  assert.equal(byId('E0-P-612').wounds, 22);
  assert.deepEqual(byId('E0-P-597').keywords, ['elementaire']);
});

test('D17 : l’Enfant d’Ulric est un gabarit en modificateurs signés (Blessures +4), sans dégâts fixes inventés', () => {
  const child = byId('E0-P-598');
  assert.equal(child.kind, 'template');
  assert.deepEqual(child.modifiers, { M: 1, CC: 10, F: 10, E: 10, I: 10, Ag: 10, Dex: -10, Int: -10, Soc: -20, W: 4 });
  assert.equal(child.armour.detail, 'Hide 2');
  assert.equal(child.attacks, undefined);
  assert.equal(child.stats, undefined);
});
