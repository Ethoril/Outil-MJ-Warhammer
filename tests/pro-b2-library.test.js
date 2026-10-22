import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBestiaryLoader, buildReserveProfileFromBestiary, filterBestiary } from '../js/core/bestiary-profiles.js';
import { keywordMatches } from '../js/core/creature-keywords.js';
import { Profile } from '../js/core/models.js';

const dataUrl = path => new URL(`../js/data/bestiary/${path}`, import.meta.url);
const makeFetch = () => {
  const calls = [];
  const fetchJson = async path => { calls.push(path); return JSON.parse(readFileSync(dataUrl(path.split('/').pop()), 'utf8')); };
  return { calls, fetchJson };
};

test('B2 chargeur — l’index seul au départ, un livre à la demande, jamais deux fois', async () => {
  const { calls, fetchJson } = makeFetch();
  const loader = createBestiaryLoader(fetchJson);
  const books = await loader.index();
  assert.ok(books.length >= 20);
  assert.deepEqual(calls, ['./js/data/bestiary/index.json']);
  const [a, b] = await Promise.all([loader.book('L06'), loader.book('L06')]);
  assert.equal(a, b);
  assert.equal(calls.filter(path => path.endsWith('L06.json')).length, 1);
  assert.equal(calls.filter(path => path.endsWith('index.json')).length, 1);
  assert.deepEqual(loader.loadedBooks(), ['L06']);
  assert.equal(a.length, books.find(book => book.book === 'L06').counts.profiles + books.find(book => book.book === 'L06').counts.templates + books.find(book => book.book === 'L06').counts.pregenerated);
});

test('B2 chargeur — livre inconnu refusé, échec non mémorisé', async () => {
  const loader = createBestiaryLoader(async () => { throw new Error('réseau'); });
  await assert.rejects(loader.index(), /réseau/);
  let ok = false;
  const retry = createBestiaryLoader(async path => { if (!ok) { ok = true; throw new Error('réseau'); } return JSON.parse(readFileSync(dataUrl(path.split('/').pop()), 'utf8')); });
  await assert.rejects(retry.index(), /réseau/);
  assert.ok((await retry.index()).length > 0);
  await assert.rejects(retry.book('L99'), /inconnu/);
});

test('B2 filtre par mot-clé avec descendants (Mort-vivant retrouve le Zombie)', async () => {
  const library = await createBestiaryLoader(makeFetch().fetchJson).load(['L06']);
  const matches = (profile, keyword) => keywordMatches(profile.keywords || [], keyword);
  const names = filterBestiary(library, { keyword: 'mort-vivant', kinds: ['profile'] }, { matches }).map(profile => profile.name);
  assert.ok(names.includes('Zombie'));
  assert.ok(!names.includes('Human'));
  assert.deepEqual(filterBestiary(library, { text: 'zombi' }, { matches }).map(p => p.name).includes('Zombie'), true);
});

test('B2 copie dans la réserve — valeurs imprimées, profil valide', async () => {
  const library = await createBestiaryLoader(makeFetch().fetchJson).load(['L06']);
  const zombie = library.find(profile => profile.name === 'Zombie' && profile.kind === 'profile');
  const fields = buildReserveProfileFromBestiary(zombie.id, { library, group: 'Bestiaire' });
  const profile = new Profile(fields);
  assert.equal(profile.name, 'Zombie');
  assert.equal(profile.kind, 'Créature');
  assert.equal(profile.hp, 12);
  assert.equal(profile.maxHp, 12);
  assert.equal(profile.group, 'Bestiaire');
  assert.deepEqual(profile.keywords, ['zombie']);
  assert.deepEqual(profile.diceLines.map(line => [line.note, line.base, line.damage]), [['Hand Weapon', 25, 7], ['Bite', 30, 6]]);
  assert.equal(profile.extensions.v5.bestiary.id, zombie.id);
  assert.ok(profile.traits.includes('Undead'));
  const template = library.find(profile => profile.kind === 'template');
  assert.throws(() => buildReserveProfileFromBestiary(template.id, { library }), /gabarit/);
});
