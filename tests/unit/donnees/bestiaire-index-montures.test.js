// Index du bestiaire : `counts.mounts` dit quels livres contiennent une monture (critère de l'onglet Monture de la Réserve).
// Charger seulement les livres signalés doit retrouver exactement les montures de tout le bestiaire.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isMountCandidate, mountBookIds, mountCountOf } from '../../../js/core/mounts.js';

const read = path => JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8'));
const index = read('js/data/bestiary/index.json');
const livres = new Map(index.books.map(item => [item.book, read(`js/data/bestiary/${item.file}`).profiles]));
// Même filtre que l'onglet : profils seulement, puis critère de monture.
const montures = ids => ids.flatMap(id => livres.get(id)).filter(row => (row.kind === 'profile' || !row.kind) && isMountCandidate(row)).map(row => row.id).sort();

test('index : counts.mounts correspond au contenu réel de chaque livre', () => {
  for (const item of index.books) assert.equal(item.counts.mounts, mountCountOf(livres.get(item.book)), item.book);
});

test('index : les livres signalés donnent exactement les montures de tous les livres', () => {
  const signales = mountBookIds(index.books);
  assert.ok(signales.length > 0 && signales.length < index.books.length);
  const toutes = montures([...livres.keys()]);
  assert.ok(toutes.length > 0);
  assert.deepEqual(montures(signales), toutes);
});

test('index : une entrée sans le champ est chargée comme avant', () => {
  const ancien = [{ book: 'A', counts: { profiles: 1 } }, { book: 'B' }, { book: 'C', counts: { mounts: 0 } }, { book: 'D', counts: { mounts: 3 } }];
  assert.deepEqual(mountBookIds(ancien), ['A', 'B', 'D']);
});
