import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import corpus from '../docs/divin/DIVIN_CORPUS_LIVRES.json' with { type: 'json' };
import { blankPages } from '../docs/divin/sources/blank-pages.mjs';
import { auditEvidence } from '../tools/divine-audit-data.mjs';
import { buildDivineAudit } from '../tools/build-divine-audit.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const clone = value => structuredClone(value);
const build = (evidence = auditEvidence, sourceCorpus = corpus) => buildDivineAudit(sourceCorpus, evidence, { root });
const pageKey = row => `${row.bookId}:${row.physicalPage}`;
const expectedPageKeys = source => source.books.flatMap(book =>
  Array.from({ length: book.physicalPages }, (_, index) => `${book.id}:${index + 1}`));
const sourceNote = 'docs/divin/sources/DIVIN_L06_P217_229_LECTEUR.md';
const book = corpus.books.find(row => row.id === 'L06');

function oneClause(overrides = {}) {
  const identity = auditEvidence.identities[0];
  return {
    id: 'probe-clause', identityId: identity.id, kind: 'mechanical', summaryFr: 'Sonde de validation E1.',
    sourceRefs: clone(identity.sourceRefs), sourceStatus: 'read', developmentStatus: 'not-started',
    verificationStatus: 'not-run', executionMode: 'blocked',
    recordCompleteness: 'partial-e1', unresolvedFields: ['trigger', 'outcome'], ...overrides
  };
}

function evidenceWithClause(clause) {
  const evidence = clone(auditEvidence);
  evidence.clauses = [clause];
  return evidence;
}

function assertRejectsEvidence(evidence, pattern) {
  assert.throws(() => build(evidence), pattern);
}

test('E1 indépendant — les dispositions correspondent exactement aux 17 livres et 2694 pages physiques', () => {
  const output = build();
  const expected = expectedPageKeys(corpus);
  const actual = output.pages.map(pageKey);
  assert.equal(corpus.count, 17);
  assert.equal(corpus.physicalPages, 2694);
  assert.equal(output.pages.length, corpus.physicalPages);
  assert.deepEqual(new Set(actual), new Set(expected));
  assert.equal(new Set(actual).size, expected.length, 'une page physique apparaît plusieurs fois');
  for (const page of output.pages) {
    const sourceBook = corpus.books.find(row => row.id === page.bookId);
    assert.equal(page.file, sourceBook.file);
    assert.equal(page.fileSha256, sourceBook.sha256);
    assert.equal(page.textExtracted, !sourceBook.pagesWithoutExtractedText.includes(page.physicalPage));
  }
});

test('E1 indépendant — les seuls comptes de lecture viennent des 89 pages réellement consignées par rôle', () => {
  const output = build();
  assert.equal(output.summary.pagesFirstRead, 89);
  assert.equal(output.summary.pagesIndependentlyRead, 89);
  assert.equal(output.summary.pagesDoubleClassified, 89);
  const agreementCount = auditEvidence.readings.filter(reading => reading.role === 'first').filter(first =>
    auditEvidence.readings.some(independent => independent.bookId === first.bookId && independent.physicalPage === first.physicalPage &&
      independent.role === 'independent' && independent.classification === first.classification)).length;
  assert.equal(output.summary.pagesDoubleClassifiedSameClassification, agreementCount);
  assert.equal(output.summary.pagesWithClassificationDisagreement, 89 - agreementCount);
  assert.equal(agreementCount, 82, 'les lectures L06 déjà consignées et 10 pages du Grand Hospice concordent');
  assert.equal(output.summary.pagesWithClassificationDisagreement, 7);
  assert.equal(output.summary.pagesNotExplored, 2605);
  assert.equal(output.summary.booksClosed, 0);
  for (let page = 217; page <= 229; page++) {
    const row = output.pages.find(item => item.bookId === 'L06' && item.physicalPage === page);
    assert.equal(row?.status, 'double-classified', `L06 p.${page}`);
    assert.equal(row?.verified, true, `L06 p.${page}`);
  }
  assert.equal(output.summary.identitiesPartialE1, 133);
  assert.equal(output.summary.associations, 60);
  assert.equal(output.summary.clauses, 0, 'les identités et synthèses E1 ne sont pas une décomposition de clauses');
  assert.equal(output.summary.mechanicallyIntegratedClauses, 0);
  assert.equal(output.summary.clauseInventoryCompleteness, 'not-yet-decomposed');
  assert.match(output.summaryMarkdown, /ne vaut pas lecture/i);
  assert.match(output.summaryMarkdown, /ne certifient pas une décomposition complète/i);
  assert.equal(output.summary.pagesWithoutExtractedTextVisuallyReadByFirst, 26);
  assert.equal(output.summary.pagesWithoutExtractedTextVisuallyReadByIndependent, 26);
  assert.equal(output.summary.pagesWithoutExtractedTextVisuallyReadByBoth, 26);
});

test('E1 indépendant — L06/201–216 conserve les deux rôles, les folios attestés et Little Prayers partiel', () => {
  const output = build();
  const expectedClasses = new Map([
    [201, 'dependency'], [202, 'dependency'], [203, 'religious-candidate'], [204, 'dependency'],
    ...Array.from({ length: 11 }, (_, index) => [205 + index, 'religious-candidate']),
    [216, 'dependency'],
  ]);
  for (const [physicalPage, classification] of expectedClasses) {
    const row = output.pages.find(item => item.bookId === 'L06' && item.physicalPage === physicalPage);
    assert.ok(row, `L06/${physicalPage}: page absente`);
    assert.equal(row.status, 'double-classified', `L06/${physicalPage}: statut`);
    assert.equal(row.verified, true, `L06/${physicalPage}: vérification`);
    assert.equal(row.firstReading.classification, classification, `L06/${physicalPage}: premier lecteur`);
    assert.equal(row.independentReading.classification, classification, `L06/${physicalPage}: lecteur indépendant`);
    if (physicalPage === 204) {
      assert.equal(row.firstReading.printedPage, null);
      assert.equal(row.independentReading.printedPage, null);
      assert.match(row.firstReading.printedPageReason, /folio|en-tête|204.?205/i);
      assert.match(row.independentReading.printedPageReason, /folio|visible|204.?205/i);
    } else {
      assert.equal(row.firstReading.printedPage, physicalPage, `L06/${physicalPage}: folio first`);
      assert.equal(row.independentReading.printedPage, physicalPage, `L06/${physicalPage}: folio independent`);
    }
  }

  const littlePrayers = output.identities.find(item => item.id === 'L06:common-rule:little-prayers');
  assert.ok(littlePrayers, 'l’identité Little Prayers issue de L06/203 manque');
  assert.equal(littlePrayers.canonicalName, 'Little Prayers');
  assert.equal(littlePrayers.category, 'common-rule');
  assert.equal(littlePrayers.status, 'source-read');
  assert.equal(littlePrayers.recordCompleteness, 'partial-e1');
  assert.ok(littlePrayers.unresolvedFields.includes('clause-decomposition'));
  assert.ok(littlePrayers.unresolvedFields.includes('secret-d100-and-Pray-threshold'));
  assert.equal(littlePrayers.sourceRefs.length, 1);
  assert.deepEqual(littlePrayers.sourceRefs[0], {
    bookId: 'L06',
    fileSha256: '53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de',
    physicalPage: 203,
    printedPage: 203,
    section: 'Options: Little Prayers',
  });
  assert.equal(output.summary.clauses, 0, 'l’identité partielle ne certifie pas de clauses');
  assert.equal(output.summary.mechanicallyIntegratedClauses, 0);
});

test('E1 indépendant — les 26 pages sans extraction exigent un contrôle visuel effectif', () => {
  const output = build();
  assert.equal(output.summary.pagesWithoutExtractedText, 26);
  assert.equal(output.summary.pagesWithoutExtractedTextVisuallyCovered, 24,
    'les 26 pages ont une preuve visuelle, mais les deux désaccords L01 restent non vérifiés');
  const noTextPages = corpus.books.flatMap(item => item.pagesWithoutExtractedText.map(physicalPage => `${item.id}:${physicalPage}`));
  assert.equal(noTextPages.length, 26);
  for (const key of noTextPages) {
    const row = output.pages.find(page => pageKey(page) === key);
    assert.ok(row, `disposition absente: ${key}`);
    assert.equal(row.textExtracted, false, key);
  }
  assert.equal(output.summary.pagesVisualPending, 0, 'une absence de lecture n’est pas une lecture classée en attente visuelle');
});

test('E1 indépendant — les 26 classements et folios du premier lecteur sont explicites et recopiés sans inférence', () => {
  assert.equal(blankPages.length, 26);
  const output = build();
  for (const source of blankPages) {
    assert.ok(Object.hasOwn(source, 'auditClassification'), `${source.bookId}/${source.physicalPage}: auditClassification absent`);
    assert.ok(Object.hasOwn(source, 'printedPage'), `${source.bookId}/${source.physicalPage}: printedPage absent`);
    assert.ok(['religious-candidate', 'dependency', 'out-of-scope', 'visual-pending'].includes(source.auditClassification),
      `${source.bookId}/${source.physicalPage}: classification explicite invalide`);
    if (source.printedPage === null) {
      assert.equal(typeof source.printedPageReason, 'string', `${source.bookId}/${source.physicalPage}: raison du folio nul absente`);
      assert.ok(source.printedPageReason.trim().length > 0, `${source.bookId}/${source.physicalPage}: raison du folio nul vide`);
    }
    const reading = auditEvidence.readings.find(item => item.bookId === source.bookId &&
      item.physicalPage === source.physicalPage && item.role === 'first');
    assert.ok(reading, `${source.bookId}/${source.physicalPage}: lecture first absente`);
    assert.equal(reading.classification, source.auditClassification,
      `${source.bookId}/${source.physicalPage}: classement first déduit ou différent de la source explicite`);
    assert.equal(reading.printedPage, source.printedPage,
      `${source.bookId}/${source.physicalPage}: folio first déduit ou différent du folio explicite`);
    const disposition = output.pages.find(item => item.bookId === source.bookId && item.physicalPage === source.physicalPage);
    assert.equal(disposition?.firstReading.classification, source.auditClassification);
    assert.equal(disposition?.firstReading.printedPage, source.printedPage);
  }
});

test('E1 indépendant — L03/43 ne confond pas l’échelle 40 avec un folio et conserve une divergence injectée', () => {
  const source = blankPages.find(item => item.bookId === 'L03' && item.physicalPage === 43);
  assert.ok(source);
  assert.equal(source.auditClassification, 'dependency');
  assert.equal(source.printedPage, null);
  assert.match(source.printedPageReason, /40.*(?:échelle|miles)/i);
  const first = auditEvidence.readings.find(item => item.bookId === 'L03' && item.physicalPage === 43 && item.role === 'first');
  const independent = auditEvidence.readings.find(item => item.bookId === 'L03' && item.physicalPage === 43 && item.role === 'independent');
  assert.equal(first?.printedPage, null);
  assert.equal(first?.classification, 'dependency');
  assert.equal(independent?.printedPage, null);
  assert.equal(independent?.classification, 'dependency');
  const result = build();
  const page = result.pages.find(item => item.bookId === 'L03' && item.physicalPage === 43);
  assert.equal(page?.firstReading.printedPage, null);
  assert.equal(page?.independentReading.printedPage, null);
  assert.equal(page?.classificationAgreed, true);
  assert.equal(page?.printedPageAgreed, true);
  assert.equal(page?.status, 'double-classified');
  assert.equal(page?.verified, true);
  assert.equal(result.summary.pagesWithPrintedPageDisagreement, 0);

  const forgedFolio = clone(auditEvidence);
  const forgedFirst = forgedFolio.readings.find(item => item.bookId === 'L03' && item.physicalPage === 43 && item.role === 'first');
  forgedFirst.printedPage = 43;
  forgedFirst.printedPageReason = 'Folio imprimé de test injecté.';
  const forgedResult = build(forgedFolio);
  const forgedPage = forgedResult.pages.find(item => item.bookId === 'L03' && item.physicalPage === 43);
  assert.equal(forgedPage?.classificationAgreed, true);
  assert.equal(forgedPage?.printedPageAgreed, false);
  assert.equal(forgedPage?.status, 'disagreement');
  assert.equal(forgedPage?.verified, false);
  assert.equal(forgedResult.summary.pagesWithPrintedPageDisagreement, 1);
  assert.equal(forgedResult.summary.pagesDoubleClassifiedSameClassification, result.summary.pagesDoubleClassifiedSameClassification);
  assert.equal(forgedResult.summary.pagesDoubleClassifiedSamePrintedPage, result.summary.pagesDoubleClassifiedSamePrintedPage - 1);
});

test('E1 indépendant — les désaccords L01/93-94 conservent séparément les catégories first et independent', () => {
  const result = build();
  for (const physicalPage of [93, 94]) {
    const first = auditEvidence.readings.find(item => item.bookId === 'L01' && item.physicalPage === physicalPage && item.role === 'first');
    const independent = auditEvidence.readings.find(item => item.bookId === 'L01' && item.physicalPage === physicalPage && item.role === 'independent');
    assert.equal(first?.classification, 'out-of-scope', `L01/${physicalPage}: classement first`);
    assert.equal(independent?.classification, 'dependency', `L01/${physicalPage}: classement independent`);
    const page = result.pages.find(item => item.bookId === 'L01' && item.physicalPage === physicalPage);
    assert.equal(page?.classificationAgreed, false, `L01/${physicalPage}`);
    assert.equal(page?.printedPageAgreed, true, `L01/${physicalPage}: les deux folios sont null et motivés`);
    assert.equal(page?.status, 'disagreement', `L01/${physicalPage}`);
    assert.equal(page?.verified, false, `L01/${physicalPage}`);
  }
  assert.equal(result.summary.pagesWithClassificationDisagreement, 7);
  assert.equal(result.summary.pagesWithPrintedPageDisagreement, 0);
});

test('E1 indépendant — p.177/289 conserve les rôles et la divergence de classement p.289', () => {
  const result = build();
  const p177 = result.pages.find(page => page.bookId === 'L06' && page.physicalPage === 177);
  assert.equal(p177?.status, 'double-classified');
  assert.equal(p177?.verified, true);
  assert.equal(p177?.printedPage, 177);
  assert.equal(p177?.firstReading.classification, 'dependency');
  assert.equal(p177?.independentReading.classification, 'dependency');
  assert.equal(p177?.firstReading.reader, '/root');
  assert.equal(p177?.independentReading.reader, '/root/e1_strictures_control');

  const p289 = result.pages.find(page => page.bookId === 'L06' && page.physicalPage === 289);
  assert.equal(p289?.status, 'disagreement');
  assert.equal(p289?.verified, false);
  assert.equal(p289?.printedPage, 289);
  assert.equal(p289?.classificationAgreed, false);
  assert.equal(p289?.firstReading.classification, 'religious-candidate');
  assert.equal(p289?.independentReading.classification, 'dependency');
  assert.equal(p289?.firstReading.reader, '/root');
  assert.equal(p289?.independentReading.reader, '/root/e1_strictures_control');
  assert.equal(result.summary.pagesWithClassificationDisagreement, 7);
});

test('E1 indépendant — une image jointe à visual-pending ne compte pas comme lecture visuelle effective', () => {
  const baseline = build();
  const eligiblePage = baseline.pages.find(page => !page.textExtracted && page.verified);
  assert.ok(eligiblePage, 'une des 26 pages visuelles doit être concordante avant le déclassement adversarial');
  const first = auditEvidence.readings.find(reading => reading.bookId === eligiblePage.bookId &&
    reading.physicalPage === eligiblePage.physicalPage && reading.role === 'first');
  assert.ok(first, 'une des 26 pages sans texte doit avoir son relevé visuel de première lecture');
  const independent = auditEvidence.readings.find(reading => reading.bookId === first.bookId &&
    reading.physicalPage === first.physicalPage && reading.role === 'independent');
  assert.ok(independent?.visualEvidencePath, `${first.bookId}/${first.physicalPage}: seconde preuve visuelle absente`);

  const pending = clone(auditEvidence);
  const downgraded = pending.readings.find(reading => reading.id === first.id);
  downgraded.classification = 'visual-pending';
  assert.ok(downgraded.visualEvidencePath, 'le scénario garde volontairement un PNG réel joint');
  const result = build(pending);
  assert.equal(result.summary.pagesVisualPending, baseline.summary.pagesVisualPending + 1);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyReadByFirst,
    baseline.summary.pagesWithoutExtractedTextVisuallyReadByFirst - 1);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyReadByIndependent,
    baseline.summary.pagesWithoutExtractedTextVisuallyReadByIndependent);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyReadByBoth,
    baseline.summary.pagesWithoutExtractedTextVisuallyReadByBoth - 1);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyCovered,
    baseline.summary.pagesWithoutExtractedTextVisuallyCovered - 1);
});

test('E1 indépendant — disposer les pages sans relevés ne crée aucune lecture implicite', () => {
  const empty = { schemaVersion: 1, readings: [], identities: [], associations: [], clauses: [], decisions: [], anomalies: [] };
  const output = build(empty);
  assert.equal(output.pages.length, 2694);
  assert.equal(output.summary.pagesNotExplored, 2694);
  assert.equal(output.summary.pagesFirstRead, 0);
  assert.equal(output.summary.pagesIndependentlyRead, 0);
  assert.equal(output.summary.pagesDoubleClassified, 0);
  assert.equal(output.summary.pagesWithoutExtractedTextVisuallyCovered, 0);
  assert.equal(output.summary.booksClosed, 0);
});

test('E1 indépendant — hash, page physique, rôle, lecteur partagé et preuve falsifiés sont refusés', () => {
  const badHash = clone(auditEvidence);
  badHash.readings[0].fileSha256 = '0'.repeat(64);
  assertRejectsEvidence(badHash, /hash differs from corpus manifest/i);

  const badPage = clone(auditEvidence);
  badPage.readings[0].physicalPage = 0;
  assertRejectsEvidence(badPage, /page is outside/i);

  const duplicateId = clone(auditEvidence);
  duplicateId.readings[1].id = duplicateId.readings[0].id;
  assertRejectsEvidence(duplicateId, /duplicate reading id/i);

  const duplicatePageRole = clone(auditEvidence);
  duplicatePageRole.readings.push({ ...duplicatePageRole.readings[0], id: 'duplicate-page-role' });
  assertRejectsEvidence(duplicatePageRole, /duplicate reading for .* role first/i);

  const badRole = clone(auditEvidence);
  badRole.readings[0].role = 'principal';
  assertRejectsEvidence(badRole, /invalid role/i);

  const sharedReader = clone(auditEvidence);
  const first = sharedReader.readings.find(row => row.bookId === 'L06' && row.physicalPage === 217 && row.role === 'first');
  const independent = sharedReader.readings.find(row => row.bookId === 'L06' && row.physicalPage === 217 && row.role === 'independent');
  independent.reader = first.reader;
  assertRejectsEvidence(sharedReader, /readers must differ/i);

  const blankReader = clone(auditEvidence);
  blankReader.readings[0].reader = '  ';
  assertRejectsEvidence(blankReader, /reader must be a non-empty string/i);

  const missingProof = clone(auditEvidence);
  missingProof.readings[0].evidencePath = 'docs/divin/preuve-absente.md';
  assertRejectsEvidence(missingProof, /readable file/i);
});

test('E1 indépendant — toute page sans texte classée exige une image probante valide', () => {
  const tinyCorpus = {
    schemaVersion: 1, count: 1, physicalPages: 1, pagesWithoutExtractedText: 1,
    books: [{ id: 'T1', file: 'Probe.pdf', sha256: 'a'.repeat(64), physicalPages: 1, pagesWithoutExtractedText: [1] }]
  };
  const physicalPage = 1;
  const missingVisual = { schemaVersion: 1, readings: [], identities: [], associations: [], clauses: [], decisions: [], anomalies: [] };
  missingVisual.readings.push({
    id: `T1-visual-required`, bookId: 'T1', fileSha256: tinyCorpus.books[0].sha256,
    physicalPage, printedPage: null, reader: 'independent-probe', role: 'first',
    classification: 'religious-candidate', reason: 'Page candidat réellement examinée.',
    evidencePath: sourceNote, visualEvidencePath: null
  });
  assert.throws(() => buildDivineAudit(tinyCorpus, missingVisual, { root }), /requires visual evidence/i);

  const wrongImage = clone(missingVisual);
  wrongImage.readings.at(-1).visualEvidencePath = sourceNote;
  assert.throws(() => buildDivineAudit(tinyCorpus, wrongImage, { root }), /PNG or JPEG image/i);

  const pending = clone(missingVisual);
  pending.readings[0].classification = 'visual-pending';
  pending.readings.push({ ...missingVisual.readings.at(-1), id: 'T1-visual-pending-independent', role: 'independent',
    reader: 'second-reader', classification: 'visual-pending' });
  const result = buildDivineAudit(tinyCorpus, pending, { root });
  assert.equal(result.summary.pagesVisualPending, 1);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyCovered, 0);
});

test('E1 indépendant — références de source et associations ne peuvent pas pointer vers un hash, livre ou page forgé', () => {
  const wrongRefHash = clone(auditEvidence);
  wrongRefHash.identities[0].sourceRefs[0].fileSha256 = 'f'.repeat(64);
  assertRejectsEvidence(wrongRefHash, /hash differs from the corpus manifest/i);

  const wrongRefBook = clone(auditEvidence);
  wrongRefBook.identities[0].sourceRefs[0].bookId = 'UNKNOWN';
  assertRejectsEvidence(wrongRefBook, /references unknown book/i);

  const wrongRefPage = clone(auditEvidence);
  wrongRefPage.identities[0].sourceRefs[0].physicalPage = book.physicalPages + 1;
  assertRejectsEvidence(wrongRefPage, /outside the book/i);

  const wrongPrintedPage = clone(auditEvidence);
  wrongPrintedPage.identities[0].sourceRefs[0].printedPage = 9999;
  assertRejectsEvidence(wrongPrintedPage, /printedPage contradicts the page reading/i);

  const brokenAssociation = clone(auditEvidence);
  brokenAssociation.associations[0].identityId = 'missing-identity';
  assertRejectsEvidence(brokenAssociation, /references unknown identity/i);
});

test('E1 indépendant — le désaccord ne réduit pas la couverture visuelle mais reste non vérifié', () => {
  const baseline = build();
  const disagreement = clone(auditEvidence);
  const eligiblePage = baseline.pages.find(page => !page.textExtracted && page.verified);
  assert.ok(eligiblePage, 'une page blank visuelle concordante existe avant fabrication du désaccord');
  const first = disagreement.readings.find(row => row.bookId === eligiblePage.bookId && row.physicalPage === eligiblePage.physicalPage && row.role === 'first');
  assert.ok(first);
  const independent = disagreement.readings.find(row => row.bookId === first.bookId && row.physicalPage === first.physicalPage && row.role === 'independent');
  assert.ok(independent?.visualEvidencePath);
  independent.classification = ['religious-candidate', 'dependency', 'out-of-scope'].find(value => value !== first.classification);
  const result = build(disagreement);
  const page = result.pages.find(row => row.bookId === first.bookId && row.physicalPage === first.physicalPage);
  assert.equal(page.status, 'disagreement');
  assert.equal(page.classificationAgreed, false);
  assert.equal(page.verified, false);
  assert.equal(result.summary.pagesWithClassificationDisagreement, baseline.summary.pagesWithClassificationDisagreement + 1);
  assert.equal(result.summary.pagesDoubleClassifiedSameClassification, baseline.summary.pagesDoubleClassifiedSameClassification - 1);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyReadByBoth, 26);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyCovered, baseline.summary.pagesWithoutExtractedTextVisuallyCovered - 1);
  assert.equal(result.summary.booksClosed, 0);
});

test('E1 indépendant — une clause mécanique ne peut pas être déclassée en rappel narratif', () => {
  const clause = oneClause({ executionMode: 'narrative-reminder' });
  assertRejectsEvidence(evidenceWithClause(clause), /Mechanical clause .* cannot use narrative-reminder/i);
  assertRejectsEvidence(evidenceWithClause(oneClause({ kind: 'mixed' })), /mixed|invalid|unsupported|decomposed/i);
});

test('E1 indépendant — le verdict principal exige lecteur, motif et preuve distincts de l’auteur', () => {
  const absent = oneClause({ verificationStatus: 'principal-validated', developer: 'author' });
  assertRejectsEvidence(evidenceWithClause(absent), /principalVerdict must be an object/i);

  const authorVerdict = oneClause({
    verificationStatus: 'principal-validated', developer: 'author',
    principalVerdict: { reviewer: 'author', evidencePath: sourceNote, reason: 'Verdict auto-attribué.' }
  });
  assertRejectsEvidence(evidenceWithClause(authorVerdict), /author cannot issue the principal verdict/i);

  const missingVerdictProof = oneClause({
    verificationStatus: 'principal-validated', developer: 'author',
    principalVerdict: { reviewer: 'principal', evidencePath: 'docs/divin/absent.md', reason: 'Contrôle.' }
  });
  assertRejectsEvidence(evidenceWithClause(missingVerdictProof), /readable file/i);
});

test('E1 indépendant — les clauses intégrées ne comptent pas sans contrat, raccordements et preuves distinctes', () => {
  const incomplete = oneClause({ developmentStatus: 'integrated', verificationStatus: 'independently-tested', developer: 'author', verifier: 'author' });
  assertRejectsEvidence(evidenceWithClause(incomplete), /author cannot independently verify/i);
  const noContract = oneClause({
    developmentStatus: 'integrated', verificationStatus: 'independently-tested', developer: 'author', verifier: 'reviewer',
    integrationPoints: ['real-event'], proofs: ['tests/example.test.js']
  });
  assertRejectsEvidence(evidenceWithClause(noContract), /contractId must be a non-empty string/i);
});

test('E1 indépendant — manifeste incohérent et root relatif sont refusés', () => {
  const wrongTotal = clone(corpus);
  wrongTotal.physicalPages++;
  assert.throws(() => buildDivineAudit(wrongTotal, auditEvidence, { root }), /physicalPages total does not match manifest/i);

  const wrongDeclaredVisualCount = clone(corpus);
  wrongDeclaredVisualCount.pagesWithoutExtractedText++;
  assert.throws(() => buildDivineAudit(wrongDeclaredVisualCount, auditEvidence, { root }), /pagesWithoutExtractedText total does not match manifest/i);

  assert.throws(() => buildDivineAudit(corpus, auditEvidence, { root: 'relative/project' }), /root must be an absolute checkout path/i);
});

test('E1 indépendant — calcul déterministe, --check sans mutation et CLI interdite hors checkout', () => {
  const first = build();
  const second = build();
  assert.deepEqual(second, first);

  const generated = [
    'docs/divin/DIVIN_AUDIT_PAGES.json',
    'docs/divin/DIVIN_AUDIT_CLAUSES.json',
    'docs/divin/DIVIN_AUDIT_SYNTHESE.md'
  ];
  const hashes = generated.map(path => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex'));
  const check = spawnSync(process.execPath, ['tools/build-divine-audit.mjs', '--check'], { cwd: root, encoding: 'utf8', timeout: 10000 });
  assert.equal(check.status, 0, `${check.stdout}\n${check.stderr}`);
  assert.deepEqual(generated.map(path => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex')), hashes);

  const externalRoot = mkdtempSync(join(tmpdir(), 'divine-audit-cwd-'));
  try {
    const outside = spawnSync(process.execPath, [resolve(root, 'tools/build-divine-audit.mjs'), '--check'], {
      cwd: externalRoot, encoding: 'utf8', timeout: 5000
    });
    assert.equal(outside.status, 1, `${outside.stdout}\n${outside.stderr}`);
    assert.match(outside.stderr, /Refusing to read or write outside the audit checkout/);
    assert.deepEqual(readdirSync(externalRoot), [], 'la CLI a créé des fichiers dans le cwd externe');
  } finally {
    rmSync(externalRoot, { recursive: true, force: true });
  }
});

test('E1 indépendant — le kind mécanique interdit le rappel narratif même sans drapeau mechanical', () => {
  const bypass = oneClause({ executionMode: 'narrative-reminder' });
  assert.throws(() => build(evidenceWithClause(bypass)), /mechanical clause .* cannot use narrative-reminder/i);
  assert.throws(() => build(evidenceWithClause(oneClause({ kind: 'unrecognized-kind' }))), /invalid .*kind|unsupported .*kind/i);
});

test('E1 indépendant — une clause E1 partielle ne peut pas certifier une intégration runtime', () => {
  const forgedIntegrated = oneClause({
    developmentStatus: 'integrated', verificationStatus: 'independently-tested', executionMode: 'automatic',
    contractId: 'contract-does-not-exist', integrationPoints: ['hook-does-not-exist'], proofs: ['invented-proof'],
    developer: 'author', verifier: 'independent-reviewer', recordCompleteness: 'partial-e1', unresolvedFields: ['trigger']
  });
  assert.throws(() => build(evidenceWithClause(forgedIntegrated)), /partial-e1 .* cannot .*integrat|integrat.* requires .*complete/i);
});

test('E1 indépendant — une association culte/bénédiction ne peut pas viser un miracle', () => {
  const miracleId = auditEvidence.identities.find(identity => identity.category === 'miracle').id;
  const wrongCategory = clone(auditEvidence);
  wrongCategory.associations[0].identityId = miracleId;
  assert.throws(() => build(wrongCategory), /association .* blessing|blessing .* association/i);
});

test('E1 indépendant — un couple culte/identité ne peut pas être compté deux fois sous des IDs différents', () => {
  const duplicatePair = clone(auditEvidence);
  duplicatePair.associations.push({ ...duplicatePair.associations[0], id: `${duplicatePair.associations[0].id}-duplicate` });
  assert.throws(() => build(duplicatePair), /duplicate cult.*identity|duplicate association pair/i);
});

test('E1 indépendant — une identité partielle E1 ne peut pas se déclarer validée ou intégrée', () => {
  for (const status of ['verified', 'principal-validated', 'integrated']) {
    const forged = clone(auditEvidence);
    forged.identities[0].status = status;
    assert.throws(() => build(forged), /invalid identity .*status|status .*partial-e1/i, `statut accepté à tort: ${status}`);
  }
});

test('E1 indépendant — la double classification d’une page ne suffit pas à fermer un livre', () => {
  const tinyCorpus = {
    schemaVersion: 1, count: 1, physicalPages: 1, pagesWithoutExtractedText: 0,
    books: [{ id: 'T1', file: 'Probe.pdf', sha256: 'a'.repeat(64), physicalPages: 1, pagesWithoutExtractedText: [] }]
  };
  const tinyEvidence = {
    schemaVersion: 1,
    readings: ['first', 'independent'].map(role => ({
      id: `T1-p1-${role}`, bookId: 'T1', fileSha256: 'a'.repeat(64), physicalPage: 1, printedPage: 1,
      reader: role === 'first' ? 'reader-a' : 'reader-b', role, classification: 'out-of-scope',
      reason: 'Sonde minimale; la seule page est classée, le contenu du livre n’est pas audité.',
      evidencePath: sourceNote, visualEvidencePath: null
    })),
    identities: [], associations: [], clauses: [], decisions: [], anomalies: []
  };
  const result = build(tinyEvidence, tinyCorpus);
  assert.equal(result.summary.pagesDoubleClassifiedSameClassification, 1);
  assert.equal(result.summary.booksClosed, 0, 'une couverture de classification seule a fermé le livre');
});
