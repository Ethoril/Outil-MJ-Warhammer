import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L17.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);
const count = kind => book.profiles.filter(profile => profile.kind === kind).length;

test('D15 Winds of Magic : 21 profils, noms français proposés, mots-clés', () => {
  assert.equal(book.profiles.length, 21);
  assert.deepEqual([count('profile'), count('template'), count('pregenerated-character')], [21, 0, 0]);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.equal(byId('E0-P-524').nameFr, 'Élémentaire incarné de feu');
  assert.deepEqual(byId('E0-P-524').keywords, ['elementaire']);
  assert.deepEqual(byId('E0-P-532').keywords, ['demon']);
  assert.deepEqual(byId('E0-P-534').keywords, ['tzeentch', 'demon']);
  assert.deepEqual(byId('E0-P-521').keywords, ['humain']);
});

test('D15 : valeurs imprimées de l’Élémentaire de feu (p. 174), d’Egrimm van Horstmann (p. 210) et du Disque (p. 213)', () => {
  assert.deepEqual(byId('E0-P-524').stats, { M: 7, CC: 55, CT: null, F: 55, E: 55, I: 55, Ag: 55, Dex: 31, Int: null, FM: null, Soc: null });
  assert.equal(byId('E0-P-524').wounds, 80);
  assert.deepEqual(byId('E0-P-531').stats, { M: 4, CC: 62, CT: 31, F: 54, E: 62, I: 68, Ag: 70, Dex: 58, Int: 77, FM: 85, Soc: 45 });
  assert.equal(byId('E0-P-531').wounds, 25);
  assert.deepEqual(byId('E0-P-531').armour, { ap: 6, printedTotal: 12 });
  assert.equal(byId('E0-P-534').wounds, 26);
  assert.equal(byId('E0-P-534').stats.M, 1);
});

test('D15 : le Construct (p. 30) n’imprime aucune Blessures ; lectures corrigées par relecture de page', () => {
  const construct = byId('E0-P-515');
  assert.equal(construct.wounds, null);
  assert.equal(construct.woundsAbsent, true);
  assert.deepEqual(validateBestiaryRecord(construct), []);
  assert.notEqual(construct.wounds, 0);
  assert.deepEqual(validateBestiaryRecord({ ...construct, woundsAbsent: undefined }), ['Blessures invalides']);
  const lores = id => byId(id).skills.filter(skill => /^Lore/.test(skill.name)).map(skill => skill.name);
  assert.deepEqual(lores('E0-P-522'), ['Lore (Magic)', 'Lore (Reikland)', 'Lore (Warfare)']);
  assert.ok(lores('E0-P-531').includes('Lore (Tzeentch)'));
  assert.ok(!byId('E0-P-531').traits.some(trait => /Corruption y/.test(trait.name)));
});
