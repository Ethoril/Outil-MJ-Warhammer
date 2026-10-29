import test from 'node:test';
import assert from 'node:assert/strict';
import { V5_L17_ARCANE_MARKS, V5_L17_ARCANE_MARKS_COUNT, V5_L17_SOURCE_INCOMPLETE_IDS } from '../js/data/v5-corruption-mutations-l17.js';

test('F2-K2 L17 — eight printed d10 tables contain 80 uniquely identified marks', () => {
  assert.equal(V5_L17_ARCANE_MARKS.length, 8);
  assert.equal(V5_L17_ARCANE_MARKS_COUNT, 80);
  assert.deepEqual(V5_L17_ARCANE_MARKS.map(table => table.id), [
    'l17-marks-hysh', 'l17-marks-chamon', 'l17-marks-ghyran', 'l17-marks-azyr',
    'l17-marks-ulgu', 'l17-marks-shyish', 'l17-marks-aqshy', 'l17-marks-ghur'
  ]);
  const ids = V5_L17_ARCANE_MARKS.flatMap(table => table.entrees.map(entry => entry.id));
  assert.equal(new Set(ids).size, 80);
});

test('F2-K2 L17 — every d10 result is covered exactly once with source pages and no inferred mechanics', () => {
  for (const table of V5_L17_ARCANE_MARKS) {
    assert.equal(table.selection.type, 'd10');
    assert.equal(table.entrees.length, 10);
    assert.deepEqual(table.entrees.map(entry => [entry.selection.min, entry.selection.max]),
      Array.from({ length: 10 }, (_, index) => [index + 1, index + 1]));
    for (const entry of table.entrees) {
      assert.ok(entry.nom);
      assert.ok(entry.resume);
      assert.equal(entry.source.livre, 'L17 — Winds of Magic');
      assert.equal(entry.source.pageImprimee, table.source.pageImprimee);
      assert.equal(entry.source.pagePdf, table.source.pagePdf);
      assert.equal(entry.source.referenceFamilleF2, 'F-L17-0078');
      assert.equal(entry.statutMecanique, 'assiste');
      assert.deepEqual(entry.effets, []);
      assert.equal(entry.conversion.editionSource, 'V4');
      assert.equal(entry.conversion.statut, 'assiste');
      assert.deepEqual(entry.verification, { controleur: 'review_l17_final', date: '2026-10-28', pagePdf: table.source.pagePdf, statut: 'relue-indépendamment', observations: 'Ligne contrôlée dans la table complète; corrections ciblées finales comprises.' });
    }
  }
});

test('F2-K2 L17 — flagged source details, conversion proposals, and assisted questions retain their limits', () => {
  const row = (wind, result) => V5_L17_ARCANE_MARKS.find(table => table.id === `l17-marks-${wind.toLowerCase()}`).entrees[result - 1];
  const includes = (wind, result, ...fragments) => {
    const entry = row(wind, result);
    for (const fragment of fragments) assert.ok(entry.resume.includes(fragment), `${wind} ${result}: ${fragment}`);
    assert.equal(entry.conversion.statut, 'assiste');
    assert.ok(entry.conversion.valeurV5.includes(entry.resume));
    assert.ok(entry.conversion.justification.length > 20);
    assert.ok(entry.questionsMJ[0].includes(entry.nom));
  };
  includes('Hysh', 2, '20 yards', '+2 yards');
  includes('Hysh', 3, '2 yards', 'ajoute 2 yards');
  includes('Hysh', 5, '−10');
  includes('Hysh', 6, '3 Aveuglé', '−1 DR');
  includes('Hysh', 8, '+1 DR');
  includes('Hysh', 9, '−2 DR', '2d10 jours', '+1 DR');
  assert.ok(row('Hysh', 9).conversion.valeurSource.includes('−20'));
  assert.ok(row('Hysh', 3).resume.includes('presque impossibles à dissimuler'));
  assert.ok(row('Hysh', 3).conversion.valeurSource.includes('nearly impossible to conceal'));
  includes('Chamon', 2, '−2 DR');
  includes('Chamon', 3, '−1 DR');
  includes('Chamon', 5, '−1 DR');
  includes('Chamon', 7, '3 Aveuglé', '−1 DR');
  includes('Ghyran', 2, '−2 DR');
  includes('Ghyran', 3, '+6 DR');
  assert.ok(row('Ghyran', 3).conversion.valeurSource.includes('+60'));
  includes('Ghyran', 1, 'taillés chaque jour', 'repoussent dans la journée');
  assert.ok(row('Ghyran', 1).conversion.valeurSource.includes('Trim each day'));
  includes('Ghyran', 6, 'augmentent de 1');
  includes('Ghyran', 7, '10 yards', 'doublées');
  includes('Ghyran', 8, '+1 DR');
  includes('Ghyran', 5, 'tous les tests fondés sur la Sociabilité');
  assert.ok(row('Ghyran', 5).conversion.valeurSource.includes('all Fellowship-based Tests'));
  includes('Azyr', 1, 'Sous stress', '3 DR ou plus');
  includes('Azyr', 2, '−1 DR');
  includes('Azyr', 3, '+2 DR', 'Ouïe');
  assert.ok(row('Azyr', 3).conversion.valeurSource.includes('+20'));
  includes('Azyr', 4, '10 %', '−5 en Force');
  includes('Azyr', 6, '−1 DR');
  includes('Azyr', 8, '−2 DR');
  assert.ok(row('Azyr', 8).conversion.valeurSource.includes('Hard (−20)'));
  assert.ok(row('Azyr', 8).resume.includes('−2 DR'));
  includes('Azyr', 9, 'une heure', '−3 DR');
  assert.ok(row('Azyr', 9).conversion.valeurSource.includes('−30'));
  includes('Azyr', 7, 'Initiative −5');
  assert.ok(row('Azyr', 7).conversion.valeurSource.includes('−5 Initiative'));
  includes('Ulgu', 1, '−1 DR');
  includes('Ulgu', 2, '+1 DR', '−1 DR');
  includes('Ulgu', 4, '−1 DR');
  includes('Ulgu', 5, 'Vision nocturne', '−1 DR');
  includes('Ulgu', 6, '−1 DR', 'Menacing');
  includes('Ulgu', 8, '−1 DR', '20 yards');
  assert.ok(row('Ulgu', 8).conversion.valeurSource.includes('−10'));
  includes('Ulgu', 9, 'Ward (9)', 'bonus de Force Mentale');
  includes('Shyish', 1, 'Force −5');
  includes('Shyish', 2, '−1 DR');
  includes('Shyish', 3, 'contact tactile −1 DR');
  includes('Shyish', 5, '−1 DR');
  includes('Shyish', 6, 'charognards', '−1 DR');
  assert.ok(row('Shyish', 6).resume.includes('charognards plus gros et agressifs'));
  assert.ok(row('Shyish', 6).conversion.valeurV5.includes('charognards plus gros et agressifs'));
  assert.ok(row('Shyish', 6).resume.includes('si le personnage est à proximité'));
  assert.ok(row('Shyish', 6).conversion.valeurV5.includes('si le personnage est à proximité'));
  assert.ok(!row('Shyish', 6).resume.includes('prédateurs'));
  assert.ok(row('Shyish', 6).conversion.valeurSource.includes('larger, more aggressive scavengers'));
  assert.ok(!row('Shyish', 6).conversion.valeurSource.includes('predators'));
  includes('Shyish', 8, 'un Fumble entraîne une Exposition modérée');
  assert.ok(row('Shyish', 8).resume.includes('choisissant de se concentrer'));
  assert.ok(row('Shyish', 8).resume.includes('Normal (Challenging, +0 DR)'));
  assert.ok(row('Shyish', 8).resume.includes('Fumble'));
  assert.ok(row('Shyish', 8).conversion.valeurV5.includes('Normal (Challenging, +0 DR)'));
  assert.ok(row('Shyish', 8).conversion.valeurSource.includes('Challenging (+0)'));
  assert.ok(row('Shyish', 8).conversion.valeurSource.includes('Moderate Exposure'));
  assert.ok(row('Shyish', 8).conversion.valeurSource.includes('Fumble causes Moderate Exposure'));
  includes('Shyish', 9, 'Taille Petite ou plus', '1 Blessure');
  includes('Shyish', 4, 'rayon égal à sa Force Mentale en yards', 'trois quarts');
  assert.ok(row('Shyish', 4).conversion.valeurSource.includes('Willpower yards'));
  includes('Aqshy', 3, '+2 DR');
  includes('Aqshy', 4, 'Exposition au froid');
  includes('Aqshy', 5, '+2 DR');
  includes('Aqshy', 6, 'une heure', '−3 DR');
  assert.ok(row('Aqshy', 6).conversion.valeurSource.includes('−30'));
  includes('Aqshy', 7, '−1 DR');
  includes('Aqshy', 8, '4 yards', 'augmentent de 1');
  includes('Aqshy', 9, 'feu', 'souffles');
  includes('Aqshy', 1, 'forme de flammes', 'chaleur et lumière réelles', 'sans le blesser');
  assert.ok(row('Aqshy', 1).conversion.formulationSource.includes('flame-shaped'));
  includes('Ghur', 1, 'attaques de mêlée de loups, ours, sangliers et rats', 'critiques de tête');
  assert.ok(row('Ghur', 1).conversion.valeurV5.includes('attaques de mêlée'));
  assert.ok(row('Ghur', 1).conversion.valeurSource.includes('Melee attacks'));
  assert.ok(row('Ghur', 1).conversion.valeurSource.includes('wolves, bears, boars, or rats'));
  assert.ok(row('Ghur', 1).conversion.formulationSource.includes('melee attacks'));
  includes('Ghur', 2, '+4 DR');
  assert.ok(row('Ghur', 2).conversion.valeurSource.includes('+40'));
  includes('Ghur', 3, 'espace clos', 'grande ville');
  includes('Ghur', 5, 'Endurance', 'Froid');
  includes('Ghur', 6, '−1 DR');
  includes('Ghur', 7, '−1 DR', '5 yards');
  includes('Ghur', 8, '+1 DR');
  includes('Ghur', 9, 'fumble de Sociabilité', '20 yards');
});

test('F2-K2 L17 — individual F2 references are separated from ambiguous family reference', () => {
  const lookup = (wind, result) => V5_L17_ARCANE_MARKS.find(table => table.id === `l17-marks-${wind.toLowerCase()}`).entrees[result - 1];
  assert.equal(lookup('Hysh', 3).source.referenceF2, 'F-L17-0082');
  assert.equal(lookup('Chamon', 6).source.referenceF2, 'F-L17-0094');
  assert.equal(lookup('Ghyran', 1).source.referenceF2, null);
  assert.equal(lookup('Azyr', 7).source.referenceF2, 'F-L17-0116');
  assert.equal(lookup('Shyish', 4).source.referenceF2, 'F-L17-0135');
  assert.equal(lookup('Aqshy', 1).source.referenceF2, 'F-L17-0145');
  assert.equal(lookup('Aqshy', 3).source.referenceF2, 'F-L17-0153');
  for (const table of V5_L17_ARCANE_MARKS) assert.equal(table.source.referenceFamilleF2, 'F-L17-0078');
});

test('F2-K2 L17 — every source formulation and value is separately captured from the PDF', () => {
  const allEntries = V5_L17_ARCANE_MARKS.flatMap(table => table.entrees);
  const captured = allEntries.filter(entry => entry.conversion.captureSourceStatut === 'capturée-depuis-pdf');
  assert.equal(captured.length, 80);
  assert.deepEqual(V5_L17_SOURCE_INCOMPLETE_IDS, []);
  for (const entry of captured) {
    assert.ok(entry.conversion.valeurSource);
    assert.ok(entry.conversion.formulationSource);
    assert.ok(entry.conversion.valeurV5);
    assert.notEqual(entry.conversion.formulationSource, entry.conversion.valeurV5);
    assert.ok(entry.conversion.noteValeurSource.includes('table PDF'));
  }
  for (const entry of allEntries.filter(item => item.conversion.captureSourceStatut !== 'capturée-depuis-pdf')) {
    assert.equal(entry.conversion.valeurSource, null);
    assert.ok(entry.conversion.noteValeurSource.includes('incomplète') || entry.conversion.noteValeurSource.includes('non isolée'));
  }
});
