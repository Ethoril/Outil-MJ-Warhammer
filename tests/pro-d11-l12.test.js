import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L12.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);
const count = kind => book.profiles.filter(profile => profile.kind === kind).length;

test('D11 Tribes and Tribulations : 64 fiches, 49 profils et 15 gabarits, genre d\'inventaire conservé', () => {
  assert.equal(book.profiles.length, 64);
  assert.deepEqual([count('profile'), count('template'), count('pregenerated-character')], [49, 15, 0]);
  assert.equal(byId('E0-P-449').inventoryKind, 'profile');
  assert.ok(book.profiles.every(profile => profile.nameFr));
});

test('D11 : la Mégère troll des rivières est un gabarit en modificateurs, sans Blessures inventées', () => {
  const hag = byId('E0-P-449');
  assert.equal(hag.kind, 'template');
  assert.deepEqual(hag.modifiers, { F: 10, E: 10, I: 5, Int: 30, FM: 20 });
  assert.ok(!('stats' in hag) && !('wounds' in hag));
});

test('D11 : valeurs imprimées de Gorfang (p. 107) et de Matthogg (p. 78, titre rétabli)', () => {
  assert.deepEqual(byId('E0-P-455').stats, { M: 4, CC: 65, CT: 40, F: 65, E: 65, I: 45, Ag: 25, Dex: 20, Int: 40, FM: 60, Soc: 30 });
  assert.equal(byId('E0-P-455').wounds, 30);
  assert.deepEqual(byId('E0-P-455').keywords, ['orque']);
  assert.equal(byId('E0-P-438').name, 'Matthogg — Ogre Bruiser');
  assert.equal(byId('E0-P-438').wounds, 46);
  assert.deepEqual(byId('E0-P-438').keywords, ['ogre']);
});

test('D11 : aucune valeur recalculée sur le Gnoblar de base (p. 9)', () => {
  assert.deepEqual(byId('E0-P-393').stats, { M: 4, CC: 25, CT: 35, F: 25, E: 30, I: 30, Ag: 35, Dex: 30, Int: 25, FM: 18, Soc: 15 });
  assert.equal(byId('E0-P-393').wounds, 9);
});
