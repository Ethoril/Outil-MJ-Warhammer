import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JUSTIFIED_Q34 } from '../tools/lib/bestiary-justified.mjs';

const profile = (book, id) => JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')).profiles.find(item => item.id === id);

test('Q34c : les justifications L14-L26 citent la page du livre', () => {
  const pages = { 'E0-P-491': 'L14 p.84', 'E0-P-515': 'L17 p.30', 'E0-P-584': 'L19 p.89', 'E0-P-610': 'L19 p.152', 'E0-P-611': 'L19 p.153', 'E0-P-613': 'L20 p.21', 'E0-P-670': 'L21 p.24', 'E0-P-807': 'L23 p.108', 'E0-P-808': 'L23 p.108', 'E0-P-822': 'L24 p.20', 'E0-P-836': 'L24 p.34' };
  for (const [id, page] of Object.entries(pages)) assert.ok(Object.values(JUSTIFIED_Q34[id]).join(' ').includes(page), id);
});

test('Q34c : l\'élément justifié n\'est pas imprimé pour le profil (Kat Sperber, Imperial Viper, Imperial Beast)', () => {
  assert.ok(!profile('L19', 'E0-P-610').talents.some(talent => /^(Doomed|Menacing)$/.test(talent.name)));
  assert.ok(!profile('L24', 'E0-P-836').traits.some(trait => trait.name === 'Prejudice'));
  assert.ok(!profile('L23', 'E0-P-808').traits.some(trait => trait.name === 'Venom'));
  assert.ok(profile('L23', 'E0-P-807').traits.some(trait => trait.name === 'Venom'));
});

test('Q34c : les profils justifiés gardent leur liste imprimée (Thyrus Gormann, Construct, Frostheart Phoenix)', () => {
  assert.deepEqual(profile('L20', 'E0-P-613').traits.map(trait => trait.name), ['Animosity']);
  assert.ok(profile('L17', 'E0-P-515').traits.some(trait => trait.name === 'Unstable'));
  assert.ok(profile('L14', 'E0-P-491').traits.some(trait => trait.name === 'Freezing Aura'));
});
