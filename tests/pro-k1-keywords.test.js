import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_KEYWORDS } from '../js/data/creature-keywords.js';
import {
  BASE_REFERENTIAL, buildReferential, normalizeKeywordText, resolveKeyword, keywordAncestors, keywordDescendants,
  keywordMatches, expandKeywords, proposeNewKeyword
} from '../js/core/creature-keywords.js';

const id = text => resolveKeyword(text)?.id ?? null;

test('K1 : alias, casse, accents, pluriel et tirets mènent à une seule entrée', () => {
  const greenskins = id('Peaux-vertes');
  assert.ok(greenskins);
  for (const text of ['peau verte', 'PEAUX VERTES', 'greenskin', 'Greenskins', 'peaux  vertes', 'orques et gobelins']) assert.equal(id(text), greenskins, text);
  assert.equal(id('Mort-vivant'), id('morts vivants'));
  assert.equal(id('undead'), id('Mort vivant'));
  assert.equal(id('Elfe'), id('elves'));
  assert.equal(id('Nain'), id('dwarfs'));
  assert.equal(id('Nain'), id('Dwarves'));
  assert.equal(resolveKeyword('mot inconnu'), null);
  assert.equal(normalizeKeywordText('  Démon-de  Nurgle '), normalizeKeywordText('demon de nurgle'));
});

test('K1 : la hiérarchie est un graphe orienté sans cycle, plusieurs parents permis', () => {
  const nurgleDemon = BASE_REFERENTIAL.terms.get('demon-de-nurgle');
  assert.deepEqual([...nurgleDemon.parents].sort(), ['chaos', 'demon', 'nurgle']);
  const ancestors = keywordAncestors('demon-de-nurgle');
  for (const expected of ['demon-de-nurgle', 'demon', 'chaos', 'nurgle']) assert.ok(ancestors.has(expected), expected);
  assert.ok(!ancestors.has('slaanesh'));
  assert.deepEqual([...keywordAncestors('orque')].sort(), ['orque', 'peaux-vertes']);
  const descendants = keywordDescendants('peaux-vertes');
  for (const expected of ['orque', 'gobelin', 'snotling']) assert.ok(descendants.has(expected), expected);
  assert.ok(!descendants.has('nain'));
});

test('K1 : un effet « contre X » vise la cible porteuse de X ou d’un descendant', () => {
  assert.equal(keywordMatches(['orque'], 'peaux-vertes'), true);
  assert.equal(keywordMatches(['gobelin', 'humain'], 'peaux-vertes'), true);
  assert.equal(keywordMatches(['nain'], 'peaux-vertes'), false);
  assert.equal(keywordMatches(['demon-de-nurgle'], 'chaos'), true);
  assert.equal(keywordMatches(['demon-de-nurgle'], 'demon'), true);
  assert.equal(keywordMatches(['demon'], 'demon-de-nurgle'), false, 'la généralisation ne descend pas');
  assert.equal(keywordMatches([], 'peaux-vertes'), false);
  assert.equal(keywordMatches(['orque'], 'inconnu'), false);
  const expanded = expandKeywords(['squelette']);
  assert.ok(expanded.has('mort-vivant'));
});

test('K1 : le garde-fou refuse doublons et quasi-doublons et propose le terme existant', () => {
  const refuse = (input, reason, existingId) => {
    const result = proposeNewKeyword(input);
    assert.equal(result.ok, false, JSON.stringify(input));
    if (reason) assert.equal(result.reason, reason, JSON.stringify(input));
    if (existingId) assert.equal(result.existing.id, existingId, JSON.stringify(input));
  };
  refuse({ nameFr: 'Orque' }, 'identique', 'orque');
  refuse({ nameFr: 'ORQUE' }, 'identique', 'orque');
  refuse({ nameFr: 'Orques' }, 'identique', 'orque');
  refuse({ nameFr: 'Démon de Nurgle' }, 'identique', 'demon-de-nurgle');
  refuse({ nameFr: 'Peau verte' }, 'identique', 'peaux-vertes');
  refuse({ nameFr: 'Nouveau', aliases: ['greenskin'] }, 'alias', 'peaux-vertes');
  refuse({ nameFr: 'Gobelins' }, null, 'gobelin');
  refuse({ nameFr: 'Skavens' }, null, 'skaven');
  refuse({ nameFr: 'Squelettes' }, null, 'squelette');
  refuse({ nameFr: 'Zombi' }, 'proche', 'zombie');
  refuse({ nameFr: 'Halflings' }, null, 'halfling');
  assert.equal(proposeNewKeyword({ nameFr: '' }).reason, 'nom-vide');
  assert.equal(proposeNewKeyword({ nameFr: 'Gobelin', parents: ['inexistant'] }).ok, false);
  const accepted = proposeNewKeyword({ nameFr: 'Ulricain', nameEn: 'Ulricain', parents: [], aliases: ['fidèle d’Ulric'] });
  assert.equal(accepted.ok, true, JSON.stringify(accepted));
  assert.equal(accepted.term.id, 'ulricain');
  assert.deepEqual(accepted.term.aliases, ['fidèle d’Ulric']);
});

test('K1 : cohérence du référentiel de base (ids et libellés uniques, parents connus, aucun cycle)', () => {
  assert.ok(BASE_KEYWORDS.length >= 60);
  const ids = BASE_KEYWORDS.map(term => term.id);
  assert.equal(new Set(ids).size, ids.length);
  const labels = new Map();
  for (const term of BASE_KEYWORDS) for (const label of [term.nameFr, term.nameEn, ...(term.aliases || [])]) {
    const key = normalizeKeywordText(label);
    assert.ok(!labels.has(key) || labels.get(key) === term.id, `libellé en double : ${label}`);
    labels.set(key, term.id);
  }
  for (const term of BASE_KEYWORDS) for (const parent of term.parents || []) assert.ok(ids.includes(parent), `${term.id} → ${parent}`);
  for (const term of BASE_KEYWORDS) assert.ok(keywordAncestors(term.id).has(term.id));
  assert.throws(() => buildReferential([{ id: 'a', nameFr: 'A', nameEn: 'A', parents: ['b'] }, { id: 'b', nameFr: 'B', nameEn: 'B', parents: ['a'] }]), /cycle/i);
  assert.throws(() => buildReferential([{ id: 'orque', nameFr: 'Autre', nameEn: 'Other', parents: [] }]), /existe déjà/);
});

test('K1 : le référentiel étendu se construit sans muter la base', () => {
  const size = BASE_REFERENTIAL.terms.size;
  const extended = buildReferential([{ id: 'ulricain', nameFr: 'Ulricain', nameEn: 'Ulricain', parents: ['humain'], aliases: ['fidèle d’Ulric'] }]);
  assert.equal(extended.terms.size, size + 1);
  assert.equal(BASE_REFERENTIAL.terms.size, size);
  assert.equal(resolveKeyword('fidèle d’Ulric', extended).id, 'ulricain');
  assert.equal(resolveKeyword('fidèle d’Ulric'), null);
  assert.equal(keywordMatches(['ulricain'], 'humain', extended), true);
  assert.throws(() => { BASE_KEYWORDS.push({}); }, TypeError);
});
