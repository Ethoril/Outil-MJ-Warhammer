import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L09.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D9 Temple of Spite : 38 profils et 15 gabarits V4 avec nom français', () => {
  assert.equal(book.profiles.length, 53);
  assert.equal(book.profiles.filter(profile => profile.kind === 'template').length, 15);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.ok(!book.profiles.some(profile => /Highborn|Lowborn|Sorceress|Beastmaster|Hag\b/.test(profile.nameFr)), 'plus de mots anglais dans les noms proposés');
});

test('D9 : valeurs imprimées de l’Elfe noir (p. 44), du Naggarothi (p. 46) et du Dragon des mers (p. 50)', () => {
  assert.deepEqual(byId('E0-P-311').stats, { M: 5, CC: 40, CT: 40, F: 30, E: 30, I: 50, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 30 });
  assert.equal(byId('E0-P-311').wounds, 13);
  const coldOne = byId('E0-P-317');
  assert.deepEqual([coldOne.wounds, coldOne.size, coldOne.stats.CT, coldOne.stats.E], [30, 'large', null, 45]);
  assert.equal(byId('E0-P-323').wounds, 232);
});

test('D9 : les entrées de l’inventaire classées « profil » aux modificateurs imprimés sont des gabarits', () => {
  const template = byId('E0-P-326');
  assert.equal(template.kind, 'template');
  assert.equal(template.inventoryKind, 'profile');
  assert.deepEqual(template.modifiers, { CC: 10, CT: 10, F: 5, I: 5, Ag: 10, FM: 10 });
  assert.ok(!template.stats);
});

test('D9 : espèces et natures', () => {
  assert.deepEqual(byId('E0-P-311').keywords, ['elfe-noir']);
  assert.deepEqual(byId('E0-P-317').keywords, ['bete'], 'le sang-froid est une monture, pas un Elfe noir');
  assert.deepEqual(byId('E0-P-336').keywords, ['elfe-noir']);
  assert.deepEqual(byId('E0-P-358').keywords, ['elfe-noir']);
  assert.deepEqual(byId('E0-P-322').keywords, ['monstre']);
  assert.deepEqual(byId('E0-P-315').keywords, ['cheval']);
});
