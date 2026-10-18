import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const corpus = JSON.parse(readFileSync(resolve(root, 'docs/divin/DIVIN_CORPUS_LIVRES.json'), 'utf8'));
const { auditEvidence } = await import('../tools/divine-audit-data.mjs');
const { buildDivineAudit } = await import('../tools/build-divine-audit.mjs');

test('audit dispositions exactly cover the corpus; only doubly sourced pages count as explored', () => {
  const result = buildDivineAudit(corpus, auditEvidence, { root });
  assert.equal(result.pages.length, 2694);
  assert.equal(result.pages.length, corpus.physicalPages);
  assert.equal(result.summary.pagesNotExplored, 2605);
  assert.equal(result.summary.pagesFirstRead, 89);
  assert.equal(result.summary.pagesIndependentlyRead, 89);
  assert.equal(result.summary.pagesDoubleClassified, 89);
  assert.equal(result.summary.pagesWithClassificationDisagreement, 7);
  assert.equal(result.summary.pagesWithPrintedPageDisagreement, 0);
  assert.equal(result.summary.pagesDoubleClassifiedSameClassification, 82);
  assert.equal(result.summary.pagesDoubleClassifiedSamePrintedPage, 89);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyReadByFirst, 26);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyReadByIndependent, 26);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyReadByBoth, 26);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyCovered, 24);
  assert.equal(result.summary.booksFullyDoubleClassified, 0);
  assert.equal(result.summary.booksClosed, 0);
  const cultPageClassifications = ['dependency', 'dependency', 'religious-candidate', 'dependency',
    'religious-candidate', 'religious-candidate', 'religious-candidate', 'religious-candidate',
    'religious-candidate', 'religious-candidate', 'religious-candidate', 'religious-candidate',
    'religious-candidate', 'religious-candidate', 'religious-candidate', 'dependency'];
  for (let index = 0; index < cultPageClassifications.length; index += 1) {
    const physicalPage = 201 + index;
    const page = result.pages.find(row => row.bookId === 'L06' && row.physicalPage === physicalPage);
    assert.equal(page.status, 'double-classified');
    assert.equal(page.firstReading.classification, cultPageClassifications[index]);
    assert.equal(page.independentReading.classification, cultPageClassifications[index]);
    assert.equal(page.firstReading.reader, '/root');
    assert.equal(page.independentReading.reader, physicalPage <= 204 ? '/root/e0_provenance_dev' : '/root/e1_sources');
    assert.equal(page.printedPage, physicalPage === 204 ? null : physicalPage);
    assert.equal(Boolean(page.firstReading.visualEvidencePath), physicalPage >= 202);
    assert.equal(Boolean(page.independentReading.visualEvidencePath), physicalPage >= 202);
  }
  const page204 = result.pages.find(row => row.bookId === 'L06' && row.physicalPage === 204);
  assert.match(page204.firstReading.printedPageReason, /Aucun folio visible.*composite204205/i);
  assert.match(page204.independentReading.printedPageReason, /Aucun folio visible.*composite204205/i);
  const page216 = result.pages.find(row => row.bookId === 'L06' && row.physicalPage === 216);
  assert.equal(page216.firstReading.classification, 'dependency');
  assert.equal(page216.independentReading.classification, 'dependency');
  const page217 = result.pages.find(row => row.bookId === 'L06' && row.physicalPage === 217);
  assert.equal(page217.status, 'double-classified');
  assert.equal(page217.firstReading.reader, '/root/e1_sources');
  assert.equal(page217.independentReading.reader, '/root');
  assert.equal(page217.printedPage, 217);
  for (const physicalPage of [161, 162, 163, 169, 170, 266]) {
    const page = result.pages.find(row => row.bookId === 'L06' && row.physicalPage === physicalPage);
    assert.equal(page.status, 'double-classified');
    assert.equal(page.firstReading.reader, '/root/e1_sources');
    assert.equal(page.independentReading.reader, '/root');
    assert.equal(page.firstReading.classification, 'dependency');
    assert.equal(page.independentReading.classification, 'dependency');
    assert.equal(page.firstReading.printedPage, physicalPage);
    assert.equal(page.independentReading.printedPage, physicalPage);
    assert.equal(Boolean(page.firstReading.visualEvidencePath), physicalPage <= 163);
    assert.equal(Boolean(page.independentReading.visualEvidencePath), physicalPage <= 163);
  }
  const blank = result.pages.find(row => row.bookId === 'L06' && row.physicalPage === 8);
  assert.equal(blank.status, 'double-classified');
  assert.equal(blank.firstReading.classification, 'dependency');
  assert.equal(blank.printedPage, null, 'printed page stays unknown when no number is visible');
  assert.equal(result.pages.find(row => row.bookId === 'L07' && row.physicalPage === 106).printedPage, 106);
  const disputedPlan = result.pages.find(row => row.bookId === 'L01' && row.physicalPage === 93);
  assert.equal(disputedPlan.firstReading.classification, 'out-of-scope');
  assert.equal(disputedPlan.independentReading.classification, 'dependency');
  assert.equal(disputedPlan.status, 'disagreement');
  const mootlandMap = result.pages.find(row => row.bookId === 'L03' && row.physicalPage === 43);
  assert.equal(mootlandMap.firstReading.printedPage, null);
  assert.equal(mootlandMap.independentReading.printedPage, null);
  assert.match(mootlandMap.firstReading.printedPageReason, /40 visible.*scale|échelle/i);
  assert.equal(result.summaryMarkdown.includes('Désaccords de folio imprimé ouverts: 0'), true);
  assert.equal(result.summary.identitiesByCategory.blessing, 19);
  assert.equal(result.summary.identitiesByCategory.miracle, 60);
  assert.equal(result.summary.identitiesByCategory['common-rule'], 4);
  assert.equal(result.summary.identities, 133);
  assert.equal(result.summary.associations, 60);
  const littlePrayers = auditEvidence.identities.find(row => row.id === 'L06:common-rule:little-prayers');
  assert.equal(littlePrayers.category, 'common-rule');
  assert.equal(littlePrayers.recordCompleteness, 'partial-e1');
  assert.deepEqual(littlePrayers.sourceRefs.map(ref => ref.physicalPage), [203]);
  assert.equal(result.summary.anomaliesOpen, 8);
  assert.equal(result.anomalies.find(row => row.id === 'tenacity-duration-note').status, 'resolved');
  assert.equal(result.anomalies.find(row => row.id === 'eagles-eye-profile').status, 'resolved');
  assert.equal(result.anomalies.find(row => row.id === 'tenacity-duration-note').evidencePath, 'docs/divin/sources/DIVIN_L06_P217_229_LECTEUR.md');
  assert.equal(result.anomalies.find(row => row.id === 'eagles-eye-profile').evidencePath, 'docs/divin/DIVIN_OEIL_AIGLE_CONTROLE_INDEPENDANT.md');
  assert.equal(result.summary.clauses, 0);
  assert.equal(result.summary.clauseInventoryCompleteness, 'not-yet-decomposed');
});

test('E1 refuses unsupported clause kinds, missing mechanical labels, and E2 completion claims', () => {
  const base = {
    id: 'test-clause', identityId: auditEvidence.identities[0].id, kind: 'mechanical',
    summaryFr: 'Effet test', sourceRefs: [auditEvidence.identities[0].sourceRefs[0]],
    sourceStatus: 'read', developmentStatus: 'not-started', verificationStatus: 'not-run',
    executionMode: 'automatic', recordCompleteness: 'partial-e1', unresolvedFields: ['outcome'],
  };
  for (const clause of [
    { ...base, kind: 'mechanical', executionMode: 'narrative-reminder' },
    { ...base, kind: 'unrestricted-kind', mechanical: false },
    { ...base, kind: 'mechanical', mechanical: true, developmentStatus: 'integrated', verificationStatus: 'independently-tested', developer: 'author', verifier: 'reviewer', contractId: 'fake-contract', integrationPoints: ['fake point'], proofs: ['fake proof'] },
  ]) {
    const evidence = { ...auditEvidence, clauses: [clause] };
    assert.throws(() => buildDivineAudit(corpus, evidence, { root }), /kind|mechanical|E2|integrated|completion/i);
  }
});

test('E1 identities have a fixed source-read status and cult associations target unique blessings', () => {
  const badIdentity = structuredClone(auditEvidence);
  badIdentity.identities[0].status = 'verified';
  assert.throws(() => buildDivineAudit(corpus, badIdentity, { root }), /status.*partial-e1/i);

  const miracleAssociation = structuredClone(auditEvidence);
  miracleAssociation.associations[0].identityId = miracleAssociation.identities.find(item => item.category === 'miracle').id;
  assert.throws(() => buildDivineAudit(corpus, miracleAssociation, { root }), /must reference a blessing/i);

  const duplicatePair = structuredClone(auditEvidence);
  duplicatePair.associations.push({ ...duplicatePair.associations[0], id: 'duplicate-id-but-same-pair' });
  assert.throws(() => buildDivineAudit(corpus, duplicatePair, { root }), /Duplicate cult\/identity association/i);
});

test('double classification has its own book count and cannot close an undecomposed audit', () => {
  const miniCorpus = {
    schemaVersion: 1, count: 1, physicalPages: 1, pagesWithoutExtractedText: 0,
    books: [{ ...corpus.books[0], physicalPages: 1, pagesWithoutExtractedText: [] }],
  };
  const note = auditEvidence.readings[0].evidencePath;
  const readings = ['first', 'independent'].map((role, index) => ({
    id: `mini-${role}`, bookId: miniCorpus.books[0].id, fileSha256: miniCorpus.books[0].sha256,
    physicalPage: 1, printedPage: 1, reader: `reader-${index}`, role, classification: 'out-of-scope',
    reason: 'Fixture de test du compte de clôture.', evidencePath: note, visualEvidencePath: null,
  }));
  const evidence = { schemaVersion: 1, readings, identities: [], associations: [], clauses: [], decisions: [], anomalies: [] };
  const result = buildDivineAudit(miniCorpus, evidence, { root });
  assert.equal(result.summary.booksFullyDoubleClassified, 1);
  assert.equal(result.summary.booksClosed, 0);
});

test('visual reads of no-text pages are counted by role independently from classification agreement', () => {
  const miniCorpus = {
    schemaVersion: 1, count: 1, physicalPages: 2, pagesWithoutExtractedText: 2,
    books: [{ ...corpus.books[0], physicalPages: 2, pagesWithoutExtractedText: [1, 2] }],
  };
  const note = auditEvidence.readings[0].evidencePath;
  const image = auditEvidence.readings[0].visualEvidencePath;
  const row = (id, physicalPage, role, classification, printedPage) => ({
    id, bookId: miniCorpus.books[0].id, fileSha256: miniCorpus.books[0].sha256,
    physicalPage, printedPage, reader: `${role}-reader`, role, classification,
    reason: 'Sonde de comptage des lectures visuelles par rôle.', evidencePath: note, visualEvidencePath: image,
  });
  const evidence = {
    schemaVersion: 1,
    readings: [
      row('p1-first', 1, 'first', 'dependency', null),
      row('p1-independent', 1, 'independent', 'out-of-scope', 1),
      row('p2-first', 2, 'first', 'religious-candidate', null),
    ],
    identities: [], associations: [], clauses: [], decisions: [], anomalies: [],
  };
  const result = buildDivineAudit(miniCorpus, evidence, { root });
  assert.equal(result.summary.pagesWithClassificationDisagreement, 1);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyReadByFirst, 2);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyReadByIndependent, 1);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyReadByBoth, 1);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyCovered, 0);
  assert.match(result.summaryMarkdown, /Pages sans texte vues par les deux lecteurs: 1/);
  assert.match(result.summaryMarkdown, /Parmi elles, pages dont classement et folio concordent: 0/);
});

test('visual-pending classifications do not count as completed visual readings', () => {
  const miniCorpus = {
    schemaVersion: 1, count: 1, physicalPages: 1, pagesWithoutExtractedText: 1,
    books: [{ ...corpus.books[0], physicalPages: 1, pagesWithoutExtractedText: [1] }],
  };
  const note = auditEvidence.readings[0].evidencePath;
  const image = auditEvidence.readings[0].visualEvidencePath;
  const evidence = {
    schemaVersion: 1,
    readings: ['first', 'independent'].map((role, index) => ({
      id: `pending-${role}`, bookId: miniCorpus.books[0].id, fileSha256: miniCorpus.books[0].sha256,
      physicalPage: 1, printedPage: null, reader: `reader-${index}`, role,
      classification: 'visual-pending', reason: 'La lecture visuelle reste inachevée.',
      evidencePath: note, visualEvidencePath: image,
    })),
    identities: [], associations: [], clauses: [], decisions: [], anomalies: [],
  };
  const result = buildDivineAudit(miniCorpus, evidence, { root });
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyReadByFirst, 0);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyReadByIndependent, 0);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyReadByBoth, 0);
  assert.equal(result.summary.pagesWithoutExtractedTextVisuallyCovered, 0);
});

test('printed-page disagreement is tracked separately from classification agreement', () => {
  const miniCorpus = {
    schemaVersion: 1, count: 1, physicalPages: 1, pagesWithoutExtractedText: 1,
    books: [{ ...corpus.books[0], physicalPages: 1, pagesWithoutExtractedText: [1] }],
  };
  const note = auditEvidence.readings[0].evidencePath;
  const image = auditEvidence.readings[0].visualEvidencePath;
  const evidence = {
    schemaVersion: 1,
    readings: ['first', 'independent'].map((role, index) => ({
      id: `folio-${role}`, bookId: miniCorpus.books[0].id, fileSha256: miniCorpus.books[0].sha256,
      physicalPage: 1, printedPage: role === 'first' ? 43 : null, printedPageReason: role === 'first' ? null : 'Folio non visible.',
      reader: `reader-${index}`, role, classification: 'dependency', reason: 'Même classement, folio distinct.',
      evidencePath: note, visualEvidencePath: image,
    })),
    identities: [], associations: [], clauses: [], decisions: [], anomalies: [],
  };
  const result = buildDivineAudit(miniCorpus, evidence, { root });
  const page = result.pages[0];
  assert.equal(page.classificationAgreed, true);
  assert.equal(page.printedPageAgreed, false);
  assert.equal(page.status, 'disagreement');
  assert.equal(page.verified, false);
  assert.equal(result.summary.pagesWithClassificationDisagreement, 0);
  assert.equal(result.summary.pagesWithPrintedPageDisagreement, 1);
});

test('final recipe checks generated audit outputs after the divine-contract generation check', () => {
  const recipe = readFileSync(resolve(root, 'tools/run-divine-recipe.mjs'), 'utf8');
  const contractsCheck = recipe.indexOf("['generation',node,['tools/build-v5-divine-contracts.mjs','--check']]");
  const auditCheck = recipe.indexOf("['audit-check',node,['tools/build-divine-audit.mjs','--check']]");
  assert.notEqual(contractsCheck, -1, 'recipe must retain the divine-contract generation check');
  assert.notEqual(auditCheck, -1, 'recipe must check generated E1 audit outputs');
  assert.ok(auditCheck > contractsCheck, 'audit output check must follow the contract generation check');
});

test('invalid corpus, duplicate readings, absent proof files and empty reasons are rejected', () => {
  assert.throws(() => buildDivineAudit({ ...corpus, physicalPages: 2693 }, auditEvidence, { root }), /physicalPages|manifest total/i);
  assert.throws(() => buildDivineAudit({ ...corpus, pagesWithoutExtractedText: 27 }, auditEvidence, { root }), /pagesWithoutExtractedText total/i);
  assert.throws(() => buildDivineAudit(corpus, auditEvidence, { root: 'relative/project' }), /absolute checkout path/i);
  const duplicated = { ...auditEvidence, readings: [...auditEvidence.readings, auditEvidence.readings[0]] };
  assert.throws(() => buildDivineAudit(corpus, duplicated, { root }), /duplicate reading/i);
  const wrongHash = structuredClone(auditEvidence);
  wrongHash.readings[0].fileSha256 = '0'.repeat(64);
  assert.throws(() => buildDivineAudit(corpus, wrongHash, { root }), /hash/i);
  const noReason = structuredClone(auditEvidence);
  noReason.readings[0].reason = '  ';
  assert.throws(() => buildDivineAudit(corpus, noReason, { root }), /reason/i);
  const badProof = structuredClone(auditEvidence);
  badProof.readings[0].evidencePath = 'missing/divine-note.md';
  assert.throws(() => buildDivineAudit(corpus, badProof, { root }), /evidencePath|proof/i);
  const blankWithoutVisual = structuredClone(auditEvidence);
  blankWithoutVisual.readings.push({
    id: 'bad-blank', bookId: 'L06', fileSha256: corpus.books.find(book => book.id === 'L06').sha256,
    physicalPage: 8, printedPage: 8, reader: '/root/e1_sources', role: 'first', classification: 'religious-candidate',
    reason: 'Test page disposition without required visual evidence.', evidencePath: 'docs/divin/sources/DIVIN_L06_P217_229_LECTEUR.md', visualEvidencePath: null
  });
  assert.throws(() => buildDivineAudit(corpus, blankWithoutVisual, { root }), /visual/i);
});

test('different reader classifications persist as a disagreement and block page verification', () => {
  const altered = structuredClone(auditEvidence);
  const second = altered.readings.find(row => row.bookId === 'L06' && row.physicalPage === 217 && row.role === 'independent');
  second.classification = 'dependency';
  const page = buildDivineAudit(corpus, altered, { root }).pages.find(row => row.bookId === 'L06' && row.physicalPage === 217);
  assert.equal(page.status, 'disagreement');
  assert.equal(page.classificationAgreed, false);
  assert.equal(page.verified, false);
});

test('audit CLI refuses an external cwd before creating output and --check never mutates', () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'divine-audit-cwd-'));
  try {
    const cli = resolve(root, 'tools/build-divine-audit.mjs');
    const outside = spawnSync(process.execPath, [cli], { cwd: temporaryRoot, encoding: 'utf8', windowsHide: true });
    assert.notEqual(outside.status, 0);
    assert.match(outside.stderr, /Refusing to read or write outside the audit checkout/);
    assert.equal(existsSync(join(temporaryRoot, 'docs')), false);
    const outputs = ['docs/divin/DIVIN_AUDIT_PAGES.json', 'docs/divin/DIVIN_AUDIT_CLAUSES.json', 'docs/divin/DIVIN_AUDIT_SYNTHESE.md'].map(path => resolve(root, path));
    const before = outputs.map(path => readFileSync(path));
    const check = spawnSync(process.execPath, [cli, '--check'], { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(check.status, 0, check.stderr);
    assert.deepEqual(outputs.map(path => readFileSync(path)), before);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
