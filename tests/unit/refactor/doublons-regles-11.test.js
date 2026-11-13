// REGLES-11 : une seule comparaison de qualités d'armes, par identifiant canonique (`isQuality`, `hasQuality`), à la place des
// comparaisons de chaînes recopiées dans resolution.js et v5-combat-rules.js. Sur une liste déjà normalisée, même résultat que
// l'ancienne comparaison ; une liste brute (alias, nom affiché) est aussi reconnue.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isQuality, hasQuality, normalizeQualities } from '../../../js/core/quality-normalization.js';

const IDS = ['explosion', 'a-repetition', 'empaleuse', 'pistolet', 'devastatrice', 'dispersion', 'taille', 'incassable', 'entaille',
  'immobilisante', 'venin', 'a-enroulement', 'inoffensive', 'bouclier', 'magique', 'protectrice', 'salve', 'recharge', 'assommante'];
const old = (row, id) => (typeof row === 'string' ? row : row?.id) === id;

test('REGLES-11 identifiants canoniques : même verdict que l’ancienne comparaison', () => {
  const rows = [...IDS, ...IDS.map(id => ({ id })), ...normalizeQualities(IDS), { id: 'a-repetition', asterisk: true }, null, undefined, 3, {}];
  for (const id of IDS) for (const row of rows) assert.equal(isQuality(row, id), old(row, id), `${JSON.stringify(row)} / ${id}`);
});

test('REGLES-11 listes : absente ou invalide lue comme vide ; alias et noms reconnus', () => {
  assert.equal(hasQuality(undefined, 'bouclier'), false);
  assert.equal(hasQuality('bouclier', 'bouclier'), false);
  assert.equal(hasQuality([{ id: 'bouclier' }], 'bouclier'), true);
  assert.equal(hasQuality([{ name: 'À répétition' }], 'a-repetition'), true);
  assert.equal(hasQuality(['impact'], 'percutante'), true);
  // MJ 13/11 (option A) : Précise = Pointue partout.
  assert.equal(hasQuality(['precise'], 'pointue'), true);
  assert.deepEqual(normalizeQualities(['precise', 'pointue']).map(row => row.id), ['pointue']);
});

test('REGLES-11 plus de comparaison de chaîne recopiée dans resolution.js et v5-combat-rules.js', () => {
  const root = path.resolve(import.meta.dirname, '../../../js/core');
  for (const file of ['resolution.js', 'v5-combat-rules.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const copies = source.match(/typeof (row|q) ?=== ?'string' ?\? ?\1 ?: ?\1\?\.id\)? ?===? ?'/g) || [];
    assert.deepEqual(copies, [], file);
  }
});
