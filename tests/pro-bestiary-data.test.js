import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const inventory = read('docs/BESTIAIRE_INVENTAIRE.json');
const index = read('js/data/bestiary/index.json');

test('Bestiaire : l’index décrit exactement les fichiers de livre présents, avec leurs décomptes', () => {
  const files = readdirSync(new URL('../js/data/bestiary/', import.meta.url)).filter(name => /^L\d\d\.json$/.test(name)).sort();
  assert.deepEqual(index.books.map(item => item.file), files);
  for (const item of index.books) {
    const data = read(`js/data/bestiary/${item.file}`);
    assert.equal(data.book, item.book);
    assert.equal(data.profiles.length, item.counts.profiles + item.counts.templates + item.counts.pregenerated);
  }
});

for (const item of index.books) {
  test(`Bestiaire ${item.book} : un profil par entrée d’inventaire, tous conformes, valeurs imprimées`, () => {
    const data = read(`js/data/bestiary/${item.file}`);
    const expected = inventory.profiles.filter(entry => entry.book === item.book);
    assert.deepEqual(data.profiles.map(profile => profile.id).sort(), expected.map(entry => entry.id).sort(), 'identifiants = inventaire');
    for (const profile of data.profiles) {
      const entry = expected.find(row => row.id === profile.id);
      assert.equal(profile.kind, entry.kind, profile.id);
      assert.equal(profile.page, entry.page, profile.id);
      assert.deepEqual(validateBestiaryRecord(profile), [], `${profile.id} ${profile.name}`);
      for (const ability of profile.abilities || []) assert.ok(inventory.traits.some(trait => trait.id === ability), `${profile.id} → ${ability}`);
      if (profile.nameFr) assert.ok(['proposition'].includes(profile.nameFrSource) || /^L05 p\.\d+$/.test(profile.nameFrSource), `${profile.id} source du nom français`);
      assert.ok(!('_dropped' in profile), 'aucun résidu de génération');
    }
    const counts = { profile: 0, template: 0, 'pregenerated-character': 0 };
    for (const entry of expected) counts[entry.kind] += 1;
    assert.deepEqual([item.counts.profiles, item.counts.templates, item.counts.pregenerated], [counts.profile, counts.template, counts['pregenerated-character']]);
  });
}
