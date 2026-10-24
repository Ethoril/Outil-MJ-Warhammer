import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { JUSTIFIED } from '../tools/lib/bestiary-justified.mjs';

const CATEGORIES = ['talents', 'skills', 'attacks', 'traits', 'trappings', 'spells', 'trappingNoise', 'veryIncomplete'];
const books = readdirSync('js/data/bestiary').filter(name => /^L\d+\.json$/.test(name)).map(name => JSON.parse(readFileSync(`js/data/bestiary/${name}`, 'utf8')));
const profiles = new Map(books.flatMap(book => book.profiles.map(profile => [profile.id, profile])));

test('Q27a : chaque faux positif justifié a une raison, une catégorie du contrôle et un profil existant', () => {
  for (const [id, entries] of Object.entries(JUSTIFIED)) {
    assert.ok(profiles.has(id), `${id} absent des livres`);
    for (const [category, reason] of Object.entries(entries)) {
      assert.ok(CATEGORIES.includes(category), `${id} : catégorie ${category}`);
      assert.ok(reason.length > 20, `${id} ${category} : raison trop courte`);
    }
  }
});

test('Q27a : le Phénix flèche-de-flamme (L14 p.83) a son talent Acute Sense (Vision)', () => {
  const phoenix = profiles.get('E0-P-490');
  assert.ok(phoenix.talents.some(talent => talent.name.startsWith('Acute Sense')), JSON.stringify(phoenix.talents));
  assert.ok(phoenix.traits.some(trait => trait.name === 'Phoenix Reborn'));
});

test('Q27a : une justification ne masque que sa catégorie (E0-P-822 garde son attaque imprimée, E0-P-836 ses Traits)', () => {
  assert.deepEqual(Object.keys(JUSTIFIED['E0-P-832']), ['skills']);
  assert.ok(profiles.get('E0-P-822').attacks.some(attack => attack.name === 'Fist'));
  assert.ok(profiles.get('E0-P-836').traits.some(trait => trait.name === 'Venom'));
  assert.ok(profiles.get('E0-P-835').talents.length >= 13);
});
