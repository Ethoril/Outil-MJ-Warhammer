// Décision du MJ (06/11) : une ligne incomplète de la feuille des mots-clés est écartée et signalée,
// elle ne bloque plus « Actualiser les références ». Doublons d'identifiant et feuille vide restent bloquants.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { refreshReferences, getReferenceCatalogue, getReferenceStatus, parseKeywordCSV, parseReferenceCSV } from '../../../js/core/reference-catalog.js';

const KEYWORDS = 'Mots Clés Armes et Armures';
const cache = {};
const fixture = async name => (cache[name] ??= await readFile(new URL(`../../../js/data/reference-source-csv/${name}.csv`, import.meta.url), 'utf8'));
const rowFor = (csv, values) => { const [headers] = parseReferenceCSV(csv); return headers.map(h => values[h] ?? '').map(v => `"${v}"`).join(','); };
const fetchWith = extraRow => async url => {
  const name = new URL(url).searchParams.get('sheet');
  let csv = await fixture(name);
  if (name === KEYWORDS) csv = `${csv.trimEnd()}\n${rowFor(csv, extraRow)}\n`;
  return { ok: true, text: async () => csv };
};

test('une ligne sans Effet est écartée, signalée, et l’actualisation réussit', async () => {
  const result = await refreshReferences({ storage: null, forceRefresh: true, fetchImpl: fetchWith({ Identifiant: 'kw-test-incomplet', Nom: 'Mot Test Incomplet', Source: 'Test', 'Version retenue': 'V5' }) });
  assert.equal(result.ok, true, result.status.error);
  assert.match(getReferenceStatus().warning || '', /Mot Test Incomplet/);
  assert.ok(!getReferenceCatalogue().keywords.some(k => k.name === 'Mot Test Incomplet'));
});

test('un identifiant en double reste bloquant', async () => {
  const csv = await fixture(KEYWORDS);
  const [, first] = parseReferenceCSV(csv);
  const [headers] = parseReferenceCSV(csv);
  const dup = `${csv.trimEnd()}\n${rowFor(csv, { ...Object.fromEntries(headers.map((h, i) => [h, first[i]])), Nom: 'Doublon' })}\n`;
  assert.throws(() => parseKeywordCSV(dup), /ambigu/);
});
