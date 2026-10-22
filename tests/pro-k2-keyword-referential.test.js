import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { referentialFromExtensions, resolveKeyword, keywordMatches } from '../js/core/creature-keywords.js';

const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
const revision = store => JSON.parse(store.getFullJSON()).localRevision;
const saved = store => JSON.parse(store.getFullJSON()).extensions?.v5?.keywordReferential?.terms || [];

test('K2 : le MJ ajoute un terme nouveau, annulable, conservé à l’export et au rechargement', () => {
  const store = createStore({ storage: storage() });
  const result = store.addCreatureKeyword({ nameFr: 'Ulricain', nameEn: 'Ulrican', parents: ['humain'], aliases: ['fidèle d’Ulric'] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.term.id, 'ulricain');
  assert.equal(saved(store).length, 1);
  assert.equal(saved(store)[0].addedByMj, true);
  const referential = store.getKeywordReferential();
  assert.equal(resolveKeyword('fidèle d’Ulric', referential).id, 'ulricain');
  assert.equal(keywordMatches(['ulricain'], 'humain', referential), true);
  const copy = createStore({ storage: storage() });
  copy.loadFromJSON(store.getFullJSON());
  assert.equal(resolveKeyword('Ulricain', copy.getKeywordReferential()).id, 'ulricain');
  assert.equal(store.undo(), true);
  assert.equal(saved(store).length, 0);
  assert.equal(resolveKeyword('Ulricain', store.getKeywordReferential()), null);
  assert.equal(store.redo(), true);
  assert.equal(saved(store).length, 1);
});

test('K2 : un doublon ou un quasi-doublon est refusé avec le terme existant, sans révision ni historique', () => {
  const store = createStore({ storage: storage() });
  const before = revision(store);
  for (const [input, existing] of [[{ nameFr: 'Orques' }, 'orque'], [{ nameFr: 'peau verte' }, 'peaux-vertes'], [{ nameFr: 'Zombi' }, 'zombie'], [{ nameFr: 'Nouveau', aliases: ['greenskin'] }, 'peaux-vertes']]) {
    const result = store.addCreatureKeyword(input);
    assert.equal(result.ok, false, JSON.stringify(input));
    assert.equal(result.existing.id, existing);
    assert.match(result.message, /utiliser/i);
  }
  assert.equal(revision(store), before);
  assert.equal(store.canUndo(), false);
  assert.equal(store.addCreatureKeyword({ nameFr: 'Ulricain', parents: ['inconnu'] }).ok, false);
});

test('K2 : les ajouts s’empilent sur le référentiel étendu (alias et quasi-doublons des termes du MJ aussi refusés)', () => {
  const store = createStore({ storage: storage() });
  assert.equal(store.addCreatureKeyword({ nameFr: 'Ulricain', parents: ['humain'], aliases: ['fidèle d’Ulric'] }).ok, true);
  const again = store.addCreatureKeyword({ nameFr: 'Ulricains' });
  assert.equal(again.ok, false);
  assert.equal(again.existing.id, 'ulricain');
  assert.equal(store.addCreatureKeyword({ nameFr: 'Autre', aliases: ['fidèle d’Ulric'] }).reason, 'alias');
  assert.equal(store.addCreatureKeyword({ nameFr: 'Taalite', parents: ['ulricain'] }).ok, true, 'un terme du MJ peut être parent');
  assert.equal(saved(store).length, 2);
});

test('K2 : aucun retrait ni renommage d’un terme ; une sauvegarde qui en usurpe un est ignorée proprement', () => {
  const store = createStore({ storage: storage() });
  assert.equal(store.removeCreatureKeyword, undefined);
  assert.equal(store.renameCreatureKeyword, undefined);
  const { referential, rejected } = referentialFromExtensions({ v5: { keywordReferential: { terms: [
    { id: 'orque', nameFr: 'Orque modifié', nameEn: 'Orc', parents: [] },
    { id: 'ulricain', nameFr: 'Ulricain', nameEn: 'Ulrican', parents: ['humain'], addedByMj: true },
    { id: 'orphelin', nameFr: 'Orphelin', nameEn: 'Orphan', parents: ['absent'], addedByMj: true }
  ] } } });
  assert.equal(resolveKeyword('Orque', referential).nameFr, 'Orque');
  assert.equal(resolveKeyword('Ulricain', referential).id, 'ulricain');
  assert.equal(resolveKeyword('Orphelin', referential), null);
  assert.deepEqual(rejected.map(item => item.id).sort(), ['orphelin', 'orque']);
});
