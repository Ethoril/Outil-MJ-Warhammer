import test from 'node:test';
import assert from 'node:assert/strict';
import { L06_CORRUPTION_MUTATION_TABLES as catalogue } from '../js/core/v5-corruption-mutations-l06.js';

test('F2-K2 L06: source discrepancy is recorded and all 40 printed rows are retained', () => {
  const entries = catalogue.tables.flatMap(table => table.entries);
  assert.equal(catalogue.countExpectedFromBrief, 39);
  assert.equal(catalogue.countObservedOnSourcePage, 40);
  assert.match(catalogue.countDiscrepancy, /20 physical and 20 mental/);
  assert.deepEqual(catalogue.countVerification, { reviewer: 'review_k1', date: '2026-10-28', pdfPage: 189, rowsVerified: 40, rowsExpectedFromBrief: 39, observation: 'Les 40 plages imprimées ont été contrôlées; écart conservé sans suppression.' });
  assert.equal(entries.length, 40);
  assert.equal(new Set(entries.map(row => row.id)).size, 40);
  assert.deepEqual(catalogue.tables.map(table => [table.family, table.entries.length]), [['physical', 20], ['mental', 20]]);
});

test('F2-K2 L06: each d100 table covers 01–00 once, without overlap or gaps', () => {
  for (const table of catalogue.tables) {
    assert.deepEqual(table.selection, { type: 'd100-inclusive-range', min: 1, max: 100 });
    const sorted = [...table.entries].sort((left, right) => left.selection.min - right.selection.min);
    assert.equal(sorted[0].selection.min, 1);
    assert.equal(sorted.at(-1).selection.max, 100);
    for (let index = 0; index < sorted.length; index += 1) {
      const current = sorted[index];
      assert.equal(current.selection.min, index * 5 + 1);
      assert.equal(current.selection.max, index * 5 + 5);
      if (index) assert.equal(sorted[index - 1].selection.max + 1, current.selection.min);
    }
  }
});

test('F2-K2 L06: every row carries exact provenance, V5 conversion status and a short French summary', () => {
  for (const table of catalogue.tables) for (const row of table.entries) {
    assert.match(row.id, /^L06-(PHY|MEN)-\d{2}$/);
    assert.equal(row.source.book, 'L06');
    assert.equal(row.source.edition, 'V5');
    assert.equal(row.source.printedPage, 189);
    assert.equal(row.source.pdfPage, 189);
    assert.equal(row.source.referenceF2, 'F-L06-0500');
    assert.match(row.source.location, new RegExp(table.family === 'physical' ? 'Physical Corruption Table' : 'Mental Corruption Table'));
    assert.equal(row.conversion.status, 'not-required');
    assert.equal(row.verification.status, 'transcrit-sur-page');
    assert.deepEqual(row.verification.independentReview, { status: 'relue-indépendamment', reviewer: 'review_k1', date: '2026-10-28', pdfPage: 189 });
    assert.ok(row.summary.split(/\s+/u).length <= 12, `${row.id} exceeds twelve summary words`);
    assert.ok(Array.isArray(row.effects));
    assert.ok(Array.isArray(row.questionsMJ));
  }
});

test('F2-K2 L06: names, edge ranges, rerolls and ambiguous descriptions match the page transcription', () => {
  const find = (family, min) => catalogue.tables.find(table => table.family === family).entries.find(row => row.selection.min === min);
  assert.equal(find('physical', 1).selection.printed, '01–05');
  assert.equal(find('physical', 96).selection.printed, '96–00');
  assert.equal(find('mental', 1).selection.printed, '01–05');
  assert.equal(find('mental', 96).selection.printed, '96–00');
  assert.equal(find('physical', 31).effects[0].count, 1);
  assert.equal(find('physical', 66).effects[0].count, 2);
  assert.equal(find('physical', 76).effects[0].table, 'hit-locations');
  assert.equal(find('physical', 21).effects[0].talentId, 'talent-acute-sense');
  assert.equal(find('physical', 91).effects[0].talentId, 'talent-striding-gait');
  assert.equal(find('physical', 96).effects[0].specialization, 'Odorat');
  assert.equal(find('physical', 41).mechanicStatus, 'assiste');
  assert.equal(find('physical', 46).mechanicStatus, 'assiste');
  assert.deepEqual(find('mental', 86).effects.map(effect => effect.amount), [1, -1]);
});
