import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, relative, basename, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import corpus from '../../../docs/divin/DIVIN_CORPUS_LIVRES.json' with { type: 'json' };
import { blankPages } from '../../../docs/divin/sources/blank-pages.mjs';
import { auditEvidence } from '../../../tools/divine-audit-data.mjs';
import { buildDivineAudit } from '../../../tools/build-divine-audit.mjs';
import runtime from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };
import registry from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };
import e1 from '../../../docs/divin/DIVIN_AUDIT_CLAUSES.json' with { type: 'json' };
import pages from '../../../docs/divin/DIVIN_AUDIT_PAGES.json' with { type: 'json' };
import { blessingClauseSource } from '../../../docs/divin/sources/L06-blessing-clauses.mjs';
import { buildDivineClauses } from '../../../tools/build-divine-clauses.mjs';
import { previewDivineExecution, applyDivineExecution } from '../../../js/core/v5-divine-engine.js';
import { readFile } from 'node:fs/promises';
import { ficheSnapshot } from '../../../js/core/fiche-sync.js';
import { endStoreDivinePrayer, getDivineContract, previewStoreDivine, validateDivineSources } from '../../../js/core/v5-divine-store.js';
import { getReferenceCatalogue, refreshReferences } from '../../../js/core/reference-catalog.js';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const clone = value => structuredClone(value);
const expected = [
  ['Commander la Légion', 'Command the Legion'],
  ["Effrayer l'Ennemi", 'Dismay Foe'],
  ['En Bon Ordre', 'In Good Order'],
  ['Connaître son Ennemi', 'Know Your Enemy'],
  ['Sur un Terrain Mortel', 'On Deadly Ground'],
  ['Attaque Rapide', 'Quick Strike'],
  ['Dévotion de la Guerrière', 'Shieldmaiden’s Devotion'],
  ['Compétence Martiale', 'Skill of Combat'],
  ['Vindicte Vengeresse', 'Vengeful Wrath']
];

describe('audit E1 du corpus', () => {
const corpus = JSON.parse(readFileSync(resolve(root, 'docs/divin/DIVIN_CORPUS_LIVRES.json'), 'utf8'));

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
});

describe('audit E1 — contrôle indépendant', () => {
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
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
});

describe('corpus B00 (manifeste L19-L26)', () => {
test('B00 — les contrats prennent en compte le manifeste L19-L26 actuellement acquis',()=>{
 const manifest=readFileSync('docs/divin/DIVIN_CORPUS_LIVRES_COMPLEMENT.json');
 assert.equal(JSON.parse(manifest).books.at(-1).id,'L26');
 assert.equal(registry.sourceManifest.complementCorpusSha256,createHash('sha256').update(manifest).digest('hex'));
});
});

describe('couverture B19 du Courroux', () => {
const read=path=>JSON.parse(readFileSync(new URL('../../../'+path,import.meta.url),'utf8'));
const inventory=Object.values(read('docs/divin/COURROUX_INVENTAIRE.json')).filter(row=>row&&row.id),realisation=read('docs/divin/COURROUX_REALISATION.json');
test('B19 — les 89 entrées du Courroux ont une réalisation, un lot et une preuve existante, ou une exclusion motivée',()=>{
  assert.equal(inventory.length,89);assert.deepEqual(Object.keys(realisation.entries).sort(),inventory.map(row=>row.id).sort());
  for(const[id,row]of Object.entries(realisation.entries)){
    assert.ok(['automatisé','assisté','rappel','exclu'].includes(row.status),id);
    if(row.status==='exclu'){assert.ok(typeof row.reason==='string'&&row.reason.length>10,id);continue;}
    assert.match(row.lot,/^B(0[1-9]|1[0-8])$/,id);assert.ok(existsSync(new URL('../../../'+row.proof,import.meta.url)),id+' preuve absente : '+row.proof);assert.match(row.commit,/^[0-9a-f]{7}$/,id);
  }
});
test('B19 — la photographie B0 de l’inventaire est conservée (statuts historiques inchangés)',()=>{
  for(const row of inventory)assert.ok(['absent','assisted','engine','reminder'].includes(row.currentStatus),row.id+' '+row.currentStatus);
});
test('B19 — les arbitrages du MJ restent inchangés par la phase (empreinte de présence des décisions Q1–Q12)',()=>{
  const text=readFileSync(new URL('../../../docs/ARBITRAGES_MJ_21_10.md',import.meta.url),'utf8');for(const q of['Q1-5','Q6','Q7','Q8','Q9','Q10','Q11','Q12'])assert.ok(text.includes(q),q);
});
});

describe('source calendrier — contrôle indépendant', () => {
const sourceUrl = new URL('../../../docs/divin/sources/L06-calendar-readings.mjs', import.meta.url);
const notePath = resolve(root, 'docs/divin/sources/DIVIN_L06_CALENDRIER_CONTROLE.md');
const hash = '53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de';
const imageRoot = 'C:/Users/arnot/.codex/visualizations/2026/10/18/01a14da8-877d-7ea0-a2d5-38e6a9590721';

async function loadCalendarSource() {
  try {
    return await import(sourceUrl.href);
  } catch (error) {
    assert.fail(`Le module source indépendant L06-calendar-readings.mjs manque: ${error.message}`);
  }
}

function expectedSourceRef(page, sectionPattern) {
  return {
    bookId: 'L06',
    fileSha256: hash,
    physicalPage: page,
    printedPage: page,
    sectionPattern,
  };
}

function assertSourceRef(actual, expected, label) {
  assert.equal(actual.bookId, expected.bookId, `${label}: livre`);
  assert.equal(actual.fileSha256.toLowerCase(), expected.fileSha256, `${label}: hash source`);
  assert.equal(actual.physicalPage, expected.physicalPage, `${label}: page physique`);
  assert.equal(actual.printedPage, expected.printedPage, `${label}: folio`);
  assert.match(actual.section, expected.sectionPattern, `${label}: section`);
}

test('E1 indépendant — p.177 et p.289 attestent huit jours impériaux, sans supposer sept jours', async () => {
  const { imperialWeek } = await loadCalendarSource();
  assert.deepEqual(imperialWeek, {
    value: 8,
    unit: 'days',
    sourceRefs: imperialWeek.sourceRefs,
  });
  assert.equal(imperialWeek.sourceRefs.length, 2);
  assertSourceRef(imperialWeek.sourceRefs.find(ref => ref.physicalPage === 177),
    expectedSourceRef(177, /healing times and downtime/i), 'p.177');
  assertSourceRef(imperialWeek.sourceRefs.find(ref => ref.physicalPage === 289),
    expectedSourceRef(289, /imperial calendar/i), 'p.289');
});

test('E1 indépendant — le résultat 06–10 conserve la durée source et la distingue des secondes de la clock', async () => {
  const { imperialWeek, thinkOverYourDeeds } = await loadCalendarSource();
  assertSourceRef(thinkOverYourDeeds.sourceRef,
    expectedSourceRef(218, /wrath of the gods.*06.?10|06.?10.*think over your deeds/i), 'p.218, 06–10');
  assert.deepEqual(thinkOverYourDeeds.wrathRange, { min: 6, max: 10 });
  assert.equal(thinkOverYourDeeds.successLevelsMaximum, 0);
  assert.deepEqual(thinkOverYourDeeds.duration, { value: 1, unit: 'imperial-week' });
  assert.equal(thinkOverYourDeeds.application, 'after-wrath-resolution');
  assert.equal(thinkOverYourDeeds.occurrences, 'independent-identical-caps');
  assert.equal(imperialWeek.value, 8);
  assert.equal(imperialWeek.unit, 'days');
  assert.doesNotMatch(JSON.stringify({ imperialWeek, thinkOverYourDeeds }), /seconds|secondes|604800|691200/i,
    'la source fixe une semaine impériale de huit jours; la clock fournit l’unité seconde/jour');
});

test('E1 indépendant — les quatre lectures documentent les folios, rôles et divergence p.289', async () => {
  const { calendarReadings } = await loadCalendarSource();
  assert.equal(calendarReadings.length, 4);
  assert.equal(new Set(calendarReadings.map(reading => reading.id)).size, 4);
  const expected = [
    [177, 'first', '/root', 'dependency', /healing times and downtime/i],
    [177, 'independent', '/root/e1_strictures_control', 'dependency', /healing times and downtime/i],
    [289, 'first', '/root', 'religious-candidate', /imperial calendar/i],
    [289, 'independent', '/root/e1_strictures_control', 'dependency', /imperial calendar/i],
  ];
  for (const [page, role, reader, classification, sectionPattern] of expected) {
    const reading = calendarReadings.find(item => item.physicalPage === page && item.role === role);
    assert.ok(reading, `lecture ${role} L06/${page} absente`);
    assert.equal(reading.bookId, 'L06');
    assert.equal(reading.fileSha256.toLowerCase(), hash);
    assert.equal(reading.printedPage, page);
    assert.equal(reading.reader, reader);
    assert.equal(reading.classification, classification);
    assert.match(reading.reason, /semaine|calendrier|blessures|guérison|culte|dépendance/i);
    assert.equal(reading.evidencePath, 'docs/divin/sources/DIVIN_L06_CALENDRIER_CONTROLE.md');
    assert.equal(reading.visualEvidencePath,
      `${imageRoot}/L06-p${page}-${page}.png`);
    assert.match(reading.section, sectionPattern);
  }
});

test('E1 indépendant — la note conserve la citation des deux pages et sépare source, clock et runtime', async () => {
  await loadCalendarSource();
  const note = readFileSync(notePath, 'utf8');
  assert.match(note, /Each Downtime.{0,180}8 days by the Imperial calendar/i);
  assert.match(note, /There are eight days in the Imperial week/i);
  assert.match(note, /seconde.{0,80}jour.{0,100}clock|clock.{0,100}seconde.{0,80}jour/i);
  assert.match(note, /aucun.{0,40}7 jours.{0,50}sourc/i);
  assert.match(note, /aucun nouvel effet runtime/i);
  assert.match(note, /pas d.ancre murale|sans ancre murale/i);
});
});

describe('clauses E2 — contrôle indépendant', () => {
const root = fileURLToPath(new URL('../../../', import.meta.url));
const build = (source = clone(blessingClauseSource), e1Input = e1, pageInput = pages, runtimeInput = runtime) =>
  buildDivineClauses(corpus, e1Input, pageInput, source, runtimeInput, { root });

test('E2 indépendant — la sortie contient exactement les 19 identités et 60 associations E1', () => {
  const result = build();
  assert.equal(result.counts.blessings, 19);
  assert.equal(result.counts.associations, 60);
  assert.deepEqual(result.json, build().json, 'deux exécutions pures sont déterministes');
  assert.equal(result.markdown, build().markdown);
  const output = JSON.parse(result.json);
  const expected = e1.identities.filter(row => row.category === 'blessing' && row.bookId === 'L06').map(row => row.id).sort();
  assert.deepEqual(output.identities.map(row => row.id).sort(), expected);
  assert.equal(output.associations.length, 60);
});

test('E2 indépendant — source E2 ne déclare aucune clause intégrée, vérifiée ou développée', () => {
  const output = JSON.parse(build().json);
  assert.equal(output.counts.runtimeValidatedClauses, 0);
  for (const identity of output.identities) {
    assert.equal(identity.runtimeCoverage.validatedClauses, 0);
    for (const clause of identity.clauses) {
      assert.equal(clause.developmentStatus, 'not-started');
      assert.equal(clause.verificationStatus, 'not-run');
    }
  }
  for (const clause of output.commonClauses) {
    assert.equal(clause.developmentStatus, 'not-started');
    assert.equal(clause.verificationStatus, 'not-run');
  }
});

test('E2 indépendant — strictures et perception des prières sont deux règles communes distinctes', () => {
  const output = JSON.parse(build().json);
  assert.equal(output.commonClauses.length, 11,
    'les règles communes de strictures et perception ne doivent pas être absorbées dans Petty Concerns ou l’accès');
  const strictures = output.commonClauses.find(row => row.id === 'L06:common:stricture-sin');
  assert.ok(strictures, 'p.217 distingue les Sin Points dus aux violations de strictures');
  assert.equal(strictures.kind, 'mechanical');
  assert.ok(strictures.sourceRefs.some(ref => ref.physicalPage === 217));
  assert.match(`${strictures.summaryFr} ${strictures.operation} ${strictures.limitations}`, /strict|stricture|règle.*dieu/i);
  assert.match(`${strictures.summaryFr} ${strictures.operation} ${strictures.limitations}`, /Sin|Péché/i);

  const perception = output.commonClauses.find(row => row.id === 'L06:common:blessing-perception');
  assert.ok(perception, 'p.220 distingue bénédictions imperceptibles des miracles à signes visibles');
  assert.equal(perception.kind, 'mechanical');
  assert.ok(perception.sourceRefs.some(ref => ref.physicalPage === 220));
  assert.match(`${perception.summaryFr} ${perception.operation} ${perception.limitations}`, /bénédiction.*imperceptible/i);
  assert.match(`${perception.summaryFr} ${perception.operation} ${perception.limitations}`, /Holy Visions/i);
  assert.match(`${perception.summaryFr} ${perception.operation} ${perception.limitations}`, /miracle.*sign/i);
  assert.equal(output.counts.runtimeValidatedClauses, 0, 'l’extension source ne certifie aucun effet runtime');
});

test('E2 indépendant — doublon, identité manquante ou association inventée sont rejetés', () => {
  const duplicateBlessing = clone(blessingClauseSource);
  duplicateBlessing.blessings[1].id = duplicateBlessing.blessings[0].id;
  assert.throws(() => build(duplicateBlessing), /ensemble différent|doublon/i);

  const missingBlessing = clone(blessingClauseSource);
  missingBlessing.blessings.pop();
  assert.throws(() => build(missingBlessing), /ensemble différent/i);

  const inventedAssociation = clone(blessingClauseSource);
  inventedAssociation.associations[0].id = 'association:forged';
  assert.throws(() => build(inventedAssociation), /ensemble différent/i);
});

test('E2 indépendant — hash, page physique, folio et lecture E1 effectifs sont recoupés', () => {
  const wrongHash = clone(blessingClauseSource);
  wrongHash.fileSha256 = '0'.repeat(64);
  assert.throws(() => build(wrongHash), /empreinte/i);

  for (const mutate of [
    ref => { ref.physicalPage = 0; },
    ref => { ref.physicalPage = 99999; },
    ref => { ref.printedPage += 1; },
    ref => { ref.fileSha256 = '0'.repeat(64); }
  ]) {
    const source = clone(blessingClauseSource);
    mutate(source.blessings[0].sourceRefs[0]);
    assert.throws(() => build(source), /page|folio|empreinte|invalide/i);
  }

  const source = clone(blessingClauseSource);
  const ref = source.blessings[0].sourceRefs[0];
  const alteredPages = clone(pages);
  const page = alteredPages.pages.find(row => row.bookId === ref.bookId && row.physicalPage === ref.physicalPage);
  page.firstReading.status = 'not-explored';
  assert.throws(() => build(source, e1, alteredPages), /sans lecture E1 effective/i);
});

test('E2 indépendant — unResolved n’est pas promu à une décomposition examinée', () => {
  const source = clone(blessingClauseSource);
  const identity = source.blessings[0];
  identity.openQuestions.push({ status: 'unresolved', reason: 'Paramètre source non tranché' });
  const output = JSON.parse(build(source).json);
  const row = output.identities.find(item => item.id === identity.id);
  assert.equal(row.sourceDecomposition, 'open-questions');

  const unresolvedClause = clone(blessingClauseSource);
  unresolvedClause.blessings[0].clauses[0].operation = {
    status: 'unresolved', reason: 'La clause demande une décision de règle'
  };
  const outputWithClause = JSON.parse(build(unresolvedClause).json);
  assert.equal(outputWithClause.identities.find(item => item.id === identity.id).sourceDecomposition, 'open-questions');

  const forgedCertification = clone(blessingClauseSource);
  forgedCertification.blessings[0].sourceComplete = true;
  assert.throws(() => build(forgedCertification), /champ sourceComplete inconnu/i);
});

test('E2 indépendant — une preuve hors checkout par chemin absolu ou traversal est refusée', () => {
  const outside = mkdtempSync(join(tmpdir(), 'divin-e2-independent-'));
  const proof = join(outside, 'outside-evidence.md');
  writeFileSync(proof, 'Preuve temporaire hors du checkout de clauses.\n', 'utf8');
  try {
    const absolute = clone(blessingClauseSource);
    absolute.readers[0].evidencePath = proof;
    assert.throws(() => build(absolute), /preuve.*(checkout|racine|relative|hors)/i,
      'un chemin absolu ne sort pas du périmètre du checkout');

    const traversal = clone(blessingClauseSource);
    traversal.readers[0].evidencePath = relative(root, proof);
    assert.ok(traversal.readers[0].evidencePath.startsWith('..'));
    assert.throws(() => build(traversal), /preuve.*(checkout|racine|relative|hors)/i,
      'un chemin relatif parent ne peut pas fournir de preuve extérieure');
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test('E2 indépendant — les rôles de lecteur et de contrôleur restent distincts', () => {
  const sameReader = clone(blessingClauseSource);
  sameReader.readers.push({ ...sameReader.readers[0], role: 'independent' });
  assert.throws(() => build(sameReader), /lecteurs.*doublon/i);

  const sameRole = clone(blessingClauseSource);
  sameRole.readers.push({ ...sameRole.readers[0], reader: '/root/independent-controller' });
  assert.throws(() => build(sameRole), /rôles.*doublon/i);
});

test('E2 indépendant — CLI --check refuse un cwd externe avant toute lecture ou mutation', () => {
  const outside = mkdtempSync(join(tmpdir(), 'divin-e2-cwd-'));
  try {
    const result = spawnSync(process.execPath, [resolve(root, 'tools/build-divine-clauses.mjs'), '--check'], {
      cwd: outside, encoding: 'utf8', timeout: 5000
    });
    assert.notEqual(result.status, 0, 'la commande exige le cwd du checkout prévu');
    assert.match(result.stderr + result.stdout, /outside clause checkout|Refusing outside clause checkout/i);
    assert.deepEqual(readdirSync(outside), [], '--check ne crée aucun fichier dans le cwd externe');
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});
});

describe('recette E0 — contrôle indépendant', () => {
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const inventory = JSON.parse(readFileSync(resolve(root, 'docs/divin/DIVIN_INVENTAIRE.json'), 'utf8'));
const sourceHash = '0671b27d0e947c7c5387fd4b30cda0512f9182dc811cc0275a18acc96af5fa07';

function supplemental(name) {
  const row = registry.contracts.find(contract => contract.type === 'miracle' && contract.catalogueName === name);
  assert.ok(row, `miracle manquant: ${name}`);
  return row;
}

test('E0 indépendant — les 15 miracles ont une source exacte, les neuf Up in Arms sont raccordés (ids du catalogue conservés)', () => {
  const miracles = registry.contracts.filter(row => row.type === 'miracle' && row.catalogueEntry);
  assert.equal(miracles.length, 15);
  for (const [name, title] of expected) {
    const row = supplemental(name);
    assert.equal(row.canonicalName, title);
    assert.equal(row.source.document, 'Up in arms.pdf');
    assert.equal(row.source.fileSha256, sourceHash);
    assert.equal(row.sourceReceipt.sourceBookSha256, sourceHash);
    assert.equal(row.source.edition, 'V4 EN');
    assert.equal(row.source.printedPage, 79);
    assert.equal(row.source.sourceStatus, 'read-and-page-checked');
    assert.equal(row.source.section, 'Miracles de Myrmidia - ' + title);
    assert.equal(row.status, ['Commander la Légion', "Effrayer l'Ennemi", 'Compétence Martiale', 'Dévotion de la Guerrière', 'Sur un Terrain Mortel', 'En Bon Ordre', 'Attaque Rapide'].includes(name) ? 'assisted' : 'manual');
    assert.equal(row.clauses.find(clause => clause.id === 'catalogue-entry')?.mode, 'source-checked');
    assert.notEqual(row.clauses.find(clause => clause.id === 'effect')?.mode, 'blocked');
    assert.doesNotMatch(row.sourceDelta, /source (?:not found|non retrouvée)/i);
  }
  const base = miracles.filter(row => !expected.some(([name]) => name === row.catalogueName));
  assert.equal(base.length, 6);
  for (const row of base) {
    assert.equal(row.source.edition, 'V5 EN', row.catalogueName);
    assert.equal(row.source.document, 'Livre de base V5 EN v2.pdf', row.catalogueName);
    assert.equal(row.status === 'blocked' && row.effects.length > 0, false, row.catalogueName);
  }
  assert.equal(inventory.counts.miraclesSourceFound, 15);
  assert.equal(inventory.counts.miraclesSourceNotFound, 0);
  assert.equal(inventory.counts.miraclesV5SourceFound, 6);
  assert.equal(inventory.counts.miraclesSupplementSourceFound, 9);
  assert.equal(inventory.counts.miraclesV4AdaptationBlocked, 0);
});

test('E0 indépendant — aucune confirmation client ne transforme un contrat bloqué en prière exécutable', () => {
  for (const [name] of expected) {
    const row = supplemental(name);
    for (const input of [
      { confirmed: true, adaptationConfirmed: true, force: true, sourceFingerprint: registry.sourceFingerprint },
      { confirmed: true, clientConfirmation: 'V5', roll: 1, sourceFingerprint: registry.sourceFingerprint }
    ]) {
      const result = previewDivineExecution({}, row, [], input);
      assert.equal(result.ready, false, `${name}: prêt malgré confirmation client`);
      assert.equal(result.status, 'blocked', `${name}: statut avec confirmation client`);
      assert.equal(result.preview, null, `${name}: aperçu créé malgré le blocage`);
    }
    const forged = { ...row, status: 'implemented' };
    const forgedResult = previewDivineExecution({}, forged, [], { sourceFingerprint: registry.sourceFingerprint, roll: 1 });
    assert.equal(forgedResult.ready, false, `${name}: contrat local forgé accepté`);
    assert.equal(forgedResult.status, 'blocked');
  }
});

test('E0 indépendant — génération contrôlée et garde cwd refusent une exécution hors checkout', () => {
  const check = spawnSync(process.execPath, ['tools/build-v5-divine-contracts.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(check.status, 0, `${check.stdout}\n${check.stderr}`);
  const outside = spawnSync(process.execPath, [resolve(root, 'tools/build-v5-divine-contracts.mjs')], { cwd: process.env.TEMP || process.cwd(), encoding: 'utf8' });
  assert.notEqual(outside.status, 0, 'générateur accepté depuis un cwd externe');
  assert.match(outside.stderr, /Refusing to read or write outside the generator checkout/);
});

test('E0 indépendant — la recette refuse un cwd externe avant de créer un reçu', () => {
  const externalRoot = mkdtempSync(join(tmpdir(), 'divine-recipe-cwd-'));
  const receiptPath = resolve(root, 'tmp/divin/recipe-receipt.json');
  const before = createHash('sha256').update(readFileSync(receiptPath)).digest('hex');
  try {
    const result = spawnSync(process.execPath, [resolve(root, 'tools/run-divine-recipe.mjs')], {
      cwd: externalRoot, encoding: 'utf8', timeout: 5000
    });
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /Refusing to read or write outside the recipe checkout/);
    assert.deepEqual(readdirSync(externalRoot), [], 'la recette a créé des fichiers dans le cwd externe');
    assert.equal(createHash('sha256').update(readFileSync(receiptPath)).digest('hex'), before,
      'la recette a modifié son reçu avant de refuser le cwd');
  } finally {
    rmSync(externalRoot, { recursive: true, force: true });
  }
});

test('Source indépendante p.224 — Œil de l’aigle décrit l’aigle spectral et les capacités employées ; seule la création du capteur est automatisée', () => {
  const eagle = registry.contracts.find(row => row.type === 'miracle' && row.canonicalName === "Eagle's Eye");
  assert.ok(eagle);
  assert.equal(eagle.source.document, 'Livre de base V5 EN v2.pdf');
  assert.equal(eagle.source.printedPage, 224);
  assert.equal(eagle.status, 'assisted');
  assert.deepEqual(eagle.effects.map(effect => [effect.type, effect.kind, effect.appliesTo]), [['summon-creature', 'sensor', 'caster']]);
  assert.deepEqual(eagle.params, {
    range: { kind: 'characteristic', characteristic: 'Soc', unit: 'yards' },
    targets: { kind: 'self' },
    duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' }
  });
  assert.match(eagle.labels.effect, /aigle spectral/i);
  assert.match(eagle.labels.effect, /Perception\s*55/i);
  assert.match(eagle.labels.effect, /Sens aiguisé\s*\(Vue\)/i);
  assert.match(eagle.labels.effect, /Vol\s*80/i);
  assert.match(eagle.labels.effect, /ne peut pas (?:physiquement affecter|affecter physiquement)|ne peut physiquement rien affecter/i);
  assert.match(eagle.labels.effect, /ne peut pas être blessé|invulnérable/i);
  assert.match(eagle.labels.effect, /contr[oô]l\w* (?:son|le) vol/i);
  assert.match(eagle.labels.effect, /(?:capacités de l’aigle.*(?:au lieu|plutôt que).*v[oô]tres|utilisez ses capacités à la place des v[oô]tres)/i);
  assert.match(eagle.labels.effect, /(?:sans voir par les v[oô]tres|sans (?:voir|vision).*propres yeux|ne (?:pouvez pas|voyez plus|peut pas) (?:voir |par )?.*propres yeux)/i);
  assert.match(eagle.labels.effect, /vulnérable/i);
  assert.doesNotMatch(eagle.labels.effect, /sans accès à ses autres sens|sans accès à ses talents/i);
  assert.doesNotMatch(eagle.sourceDelta, /sans accès à ses autres sens|sans accès à ses talents/i);
  assert.equal(eagle.clauses.find(clause => clause.id === 'effect')?.mode, 'assisted');
  assert.equal(eagle.clauses.find(clause => clause.id === 'eagle-sight')?.mode, 'manual');
});
});

describe('provenance E0 et recette', () => {
const registry = JSON.parse(readFileSync('js/data/v5-divine-contracts.json', 'utf8'));
const inventory = JSON.parse(readFileSync('docs/divin/DIVIN_INVENTAIRE.json', 'utf8'));

test('nine supplemental miracles have their verified Up in Arms source and are connected to the Myrmidia module', () => {
  const sourceHash = '0671b27d0e947c7c5387fd4b30cda0512f9182dc811cc0275a18acc96af5fa07';
  for (const [catalogueName, title] of expected) {
    const row = registry.contracts.find(item => item.type === 'miracle' && item.catalogueName === catalogueName);
    assert.ok(row, catalogueName);
    assert.equal(row.canonicalName, title);
    assert.equal(row.source.document, 'Up in arms.pdf');
    assert.equal(row.source.fileSha256, sourceHash);
    assert.equal(row.source.edition, 'V4 EN');
    assert.equal(row.source.printedPage, 79);
    assert.equal(row.source.section, 'Miracles de Myrmidia - ' + title);
    assert.equal(row.source.sourceStatus, 'read-and-page-checked');
    assert.equal(row.sourceReceipt.sourceBookSha256, sourceHash);
    assert.notEqual(row.status, 'blocked');
    assert.match(row.sourceDelta, /décision MJ|Aucun type d’effet|Page 79|Le Talent Sans peur/i);
    assert.equal(row.clauses.find(clause => clause.id === 'catalogue-entry').mode, 'source-checked');
  }
  const { moduleMiracles, ...counts } = inventory.counts;
  assert.equal(typeof moduleMiracles, 'number');
  assert.deepEqual(counts, {
    blessings: 60,
    miracles: 15,
    miraclesSourceFound: 15,
    miraclesSourceNotFound: 0,
    miraclesV5SourceFound: 6,
    miraclesSupplementSourceFound: 9,
    miraclesV4AdaptationBlocked: 0,
    talents: 1
  });
});

test('divine recipe refuses an external cwd before creating its output directory', () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'divine-recipe-cwd-'));
  try {
    const recipe = resolve(process.cwd(), 'tools/run-divine-recipe.mjs');
    const result = spawnSync(process.execPath, [recipe], { cwd: temporaryRoot, encoding: 'utf8', windowsHide: true });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing to read or write outside the recipe checkout/);
    assert.equal(existsSync(join(temporaryRoot, 'tmp')), false, 'external cwd must remain untouched');
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
});

describe('Œil de l’aigle — résumé V5', () => {
const generated = JSON.parse(readFileSync(resolve(root, 'js/data/v5-divine-contracts.json'), 'utf8'));
const sourceAuthor = readFileSync(resolve(root, 'docs/divin/sources/DIVIN_L06_P217_229_LECTEUR.md'), 'utf8');
const sourcePrincipal = readFileSync(resolve(root, 'docs/divin/sources/DIVIN_L06_P217_229_CONTROLE_PRINCIPAL.md'), 'utf8');

test('Œil de l’aigle — résumé et delta correspondent aux lectures V5 p.224', () => {
  assert.match(sourceAuthor, /Eagle’s Eye.*aigle spectral.*invulnérable.*incapable d’effet physique/s);
  assert.match(sourcePrincipal, /L'Œil de l'aigle est intangible et invulnérable.*sa propre Perception 55.*cesse de voir par ses propres yeux/s);

  const eagle = generated.contracts.find(row => row.canonicalName === "Eagle's Eye");
  assert.ok(eagle);
  for (const [label, text] of [['summary', eagle.labels.effect], ['delta', eagle.sourceDelta]]) {
    assert.match(text, /aigle spectral/i, `${label}: aigle spectral`);
    assert.match(text, /intangible/i, `${label}: intangible`);
    assert.match(text, /(?:ne peut pas affecter|incapable d’affecter) physiquement le monde/i, `${label}: impossibilité physique`);
    assert.match(text, /invulnérable/i, `${label}: invulnérable`);
    assert.match(text, /Perception 55/i, `${label}: Perception 55`);
    assert.match(text, /Sens aiguisé \(Vue\)/i, `${label}: Sens aiguisé (Vue)`);
    assert.match(text, /Vol 80/i, `${label}: Vol 80`);
    assert.match(text, /contr[oô]le(?:z)? son vol/i, `${label}: contrôle`);
    assert.match(text, /capacit[eé]s .*à la place des v[oô]tres|capacit[eé]s de l’aigle à la place des siennes/i, `${label}: capacités utilisées en remplacement des siennes`);
    assert.match(text, /(?:voyez|voit) par ses yeux/i, `${label}: vision par les yeux de l’aigle`);
    assert.match(text, /(?:ne pouvez pas voir par les v[oô]tres|sans voir par les v[oô]tres|sans voir par les siens)/i, `${label}: perte de la vue propre`);
    assert.match(text, /potentiellement vuln[eé]rable/i, `${label}: vulnérabilité pendant l’utilisation`);
    assert.doesNotMatch(text, /sans acc[eè]der [àa] ses autres sens/i, `${label}: aucune confusion avec Yeux du chat`);
  }

  assert.equal(eagle.status, 'assisted');
  assert.deepEqual(eagle.params, {
    range: { kind: 'characteristic', characteristic: 'Soc', unit: 'yards' },
    targets: { kind: 'self' },
    duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' },
  });
  assert.deepEqual(eagle.effects.map(effect => [effect.type, effect.kind]), [['summon-creature', 'sensor']]);
});
});

describe('source Hospice — contrôle indépendant', () => {
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const sourceUrl = new URL('../../../docs/divin/sources/L01-hospice-readings.mjs', import.meta.url);
const hash = '925cf38a31ffa3561c63df3a9a1c2e2c18034ff0ed1e1d90571965a068434c5e';
const visualRoot = 'C:/Users/arnot/.codex/visualizations/2026/10/18/01a14da8-877d-7ea0-a2d5-38e6a9590721';
const lectureNote = `${visualRoot}/DIVIN_L01_GRAND_HOSPICE_68_81_LECTURE.md`;
const principalNote = `${visualRoot}/DIVIN_L01_GRAND_HOSPICE_CONTROLE_PRINCIPAL.md`;
const expectedClassifications = new Map([
  [68, ['religious-candidate', 'religious-candidate']],
  [69, ['religious-candidate', 'religious-candidate']],
  [70, ['religious-candidate', 'dependency']],
  [71, ['dependency', 'dependency']],
  [72, ['dependency', 'religious-candidate']],
  [73, ['religious-candidate', 'religious-candidate']],
  [74, ['religious-candidate', 'religious-candidate']],
  [75, ['religious-candidate', 'religious-candidate']],
  [76, ['dependency', 'religious-candidate']],
  [77, ['dependency', 'religious-candidate']],
  [78, ['out-of-scope', 'out-of-scope']],
  [79, ['religious-candidate', 'religious-candidate']],
  [80, ['religious-candidate', 'religious-candidate']],
  [81, ['religious-candidate', 'religious-candidate']],
]);
const auditReadingFields = [
  'bookId', 'classification', 'evidencePath', 'fileSha256', 'id', 'physicalPage', 'printedPage',
  'printedPageReason', 'reader', 'reason', 'role', 'visualEvidencePath',
];

async function loadHospiceSource() {
  try {
    return await import(sourceUrl.href);
  } catch (error) {
    assert.fail(`Le module source indépendant L01-hospice-readings.mjs manque: ${error.message}`);
  }
}

function evidencePath(path) {
  return isAbsolute(path) ? path : resolve(root, path);
}

test('E1 indépendant — les 28 lectures couvrent une fois chaque rôle des pages physiques 68–81', async () => {
  const { hospiceReadings, auditHospiceReadings } = await loadHospiceSource();
  assert.equal(hospiceReadings.length, 28);
  assert.equal(auditHospiceReadings.length, 28);
  assert.equal(new Set(hospiceReadings.map(row => row.id)).size, 28);

  for (let page = 68; page <= 81; page += 1) {
    const first = hospiceReadings.find(row => row.physicalPage === page && row.role === 'first');
    const independent = hospiceReadings.find(row => row.physicalPage === page && row.role === 'independent');
    assert.ok(first, `L01 p.${page}: first absente`);
    assert.ok(independent, `L01 p.${page}: independent absente`);
    assert.equal(first.bookId, 'L01');
    assert.equal(independent.bookId, 'L01');
    assert.equal(first.fileSha256.toLowerCase(), hash);
    assert.equal(independent.fileSha256.toLowerCase(), hash);
    assert.equal(first.reader, '/root/e1_strictures_dev');
    assert.equal(independent.reader, '/root');
    assert.deepEqual([first.classification, independent.classification], expectedClassifications.get(page));
    for (const reading of [first, independent]) {
      assert.ok(typeof reading.reason === 'string' && reading.reason.trim().length > 0);
      assert.ok(typeof reading.section === 'string' && reading.section.trim().length > 0);
      assert.ok(typeof reading.evidencePath === 'string' && reading.evidencePath.trim().length > 0);
      assert.ok(typeof reading.visualEvidencePath === 'string' && reading.visualEvidencePath.trim().length > 0);
      assert.ok(existsSync(evidencePath(reading.evidencePath)), `${reading.id}: preuve texte absente`);
      assert.ok(existsSync(evidencePath(reading.visualEvidencePath)), `${reading.id}: rendu absent`);
      assert.match(basename(reading.visualEvidencePath), new RegExp(`L01-great-hospice-${page}\\.png$`));
      if ([68, 70].includes(page)) {
        assert.equal(reading.printedPage, null, `L01 p.${page}: folio non visible`);
        assert.match(reading.printedPageReason, /folio|visible|établi/i);
      } else {
        assert.equal(reading.printedPage, page, `L01 p.${page}: folio visible`);
      }
    }
    for (const [rich, audit] of [[first, auditHospiceReadings.find(row => row.id === first.id)],
      [independent, auditHospiceReadings.find(row => row.id === independent.id)]]) {
      assert.ok(audit, `${rich.id}: projection audit absente`);
      assert.deepEqual(Object.keys(audit).sort(), auditReadingFields);
      assert.equal(Object.hasOwn(audit, 'section'), false, 'section documentaire exclue du schéma validé');
      for (const field of auditReadingFields) assert.equal(audit[field], rich[field], `${rich.id}: projection ${field}`);
    }
  }
});

test('E1 indépendant — les quatre divergences de classement restent explicites, sans les masquer', async () => {
  const { hospiceReadings } = await loadHospiceSource();
  const disagreements = [...expectedClassifications.entries()]
    .filter(([, [first, independent]]) => first !== independent)
    .map(([page]) => page);
  assert.deepEqual(disagreements, [70, 72, 76, 77]);
  assert.equal(hospiceReadings.filter(row => row.role === 'first').length, 14);
  assert.equal(hospiceReadings.filter(row => row.role === 'independent').length, 14);

  for (const page of disagreements) {
    const first = hospiceReadings.find(row => row.physicalPage === page && row.role === 'first');
    const independent = hospiceReadings.find(row => row.physicalPage === page && row.role === 'independent');
    assert.notEqual(first.classification, independent.classification, `L01 p.${page}`);
  }
});

test('E1 indépendant — les crédits V4 restent une preuve ciblée et les plans attribués ne résolvent pas le classement', async () => {
  const { editionEvidence, mapAttribution, auditHospiceReadings } = await loadHospiceSource();
  assert.equal(editionEvidence.bookId, 'L01');
  assert.equal(editionEvidence.fileSha256.toLowerCase(), hash);
  assert.equal(editionEvidence.edition, 'V4');
  assert.equal(editionEvidence.physicalPage, 3);
  assert.equal(editionEvidence.printedPage, 3);
  assert.equal(editionEvidence.kind, 'targeted-editorial-metadata');
  assert.ok(existsSync(evidencePath(editionEvidence.evidencePath)));
  assert.equal(basename(editionEvidence.visualEvidencePath), 'L01-editorial-credits-03.png');
  assert.ok(existsSync(evidencePath(editionEvidence.visualEvidencePath)));
  assert.equal(auditHospiceReadings.some(row => row.physicalPage === 3), false,
    'la consultation éditoriale V4 n’ajoute pas une lecture E1 p.3');

  assert.equal(mapAttribution.status, 'direct-visual-correspondence');
  assert.equal(mapAttribution.classificationResolution, 'not-resolved');
  assert.deepEqual(mapAttribution.maps, [
    { physicalPage: 93, correspondingPhysicalPage: 70 },
    { physicalPage: 94, correspondingPhysicalPage: 73 },
  ]);
});

test('E1 indépendant — les nouveaux relevés restent source-only, sans identité/pouvoir ajouté ni clôture', async () => {
  const { auditHospiceReadings } = await loadHospiceSource();
  const lecture = readFileSync(lectureNote, 'utf8');
  const principal = readFileSync(principalNote, 'utf8');
  assert.match(lecture, /Marie.{0,80}Invoke \(Shallya\)/i);
  assert.match(lecture, /Anna-Lise.{0,100}(ne comprennent pas|do not include).{0,30}Invoke/i);
  assert.doesNotMatch(lecture, /Anna-Lise.{0,80}Invoke \(Shallya\)/i);
  assert.match(principal, /aucun nouveau compteur ni identité runtime/i);
  assert.equal(auditHospiceReadings.length, 28);

  const { auditEvidence } = await import('../../../tools/divine-audit-data.mjs');
  const { buildDivineAudit } = await import('../../../tools/build-divine-audit.mjs');
  const corpus = JSON.parse(readFileSync(resolve(root, 'docs/divin/DIVIN_CORPUS_LIVRES.json'), 'utf8'));
  const result = buildDivineAudit(corpus, auditEvidence, { root });
  assert.equal(result.summary.pagesFirstRead, 89);
  assert.equal(result.summary.pagesIndependentlyRead, 89);
  assert.equal(result.summary.pagesDoubleClassified, 89);
  assert.equal(result.summary.pagesDoubleClassifiedSameClassification, 82);
  assert.equal(result.summary.pagesWithClassificationDisagreement, 7);
  assert.equal(result.summary.pagesNotExplored, 2605);
  assert.equal(result.summary.identitiesPartialE1, 133);
  assert.equal(result.summary.booksClosed, 0);
  assert.equal(result.summary.clauses, 0);
  assert.equal(result.summary.mechanicallyIntegratedClauses, 0);

  for (const physicalPage of [93, 94]) {
    const row = result.pages.find(page => page.bookId === 'L01' && page.physicalPage === physicalPage);
    assert.equal(row?.status, 'disagreement');
    assert.equal(row?.verified, false);
    assert.equal(row?.firstReading.classification, 'out-of-scope');
    assert.equal(row?.independentReading.classification, 'dependency');
  }
});
});

describe('recoupement des sources', () => {
const contract = id => getDivineContract(id);
const battleId = 'divine:blessing:myrmidia:battle';
const shieldId = 'divine:miracle:bouclier-de-myrmidia';
const sunId = 'divine:miracle:soleil-flamboyant';
const fingerprint = registry.sourceFingerprint;

test('fiche réelle issue de ficheSnapshot établit Pray, Invocation, miracle appris et durée de Bouclier', () => {
  const shield = contract(shieldId);
  const snapshot = ficheSnapshot('priest-real-shape', { nom: 'Prêtre', race: 'humain', carac: { soc: { base: 80 } },
    skillsAdvanced: [{ nom: 'Prière', adv: 0 }], talentsAcq: [{ nom: 'Invocation (Myrmidia)' }],
    prieres: [{ nom: shield.catalogueName }] });
  const priest = { ...snapshot, id: 'priest-real-shape', zone: 'active', extensions: { v5: { divine: { sin: 0 } } } };
  const preview = previewDivineExecution(priest, shield, [priest], { canSpeak: true, roll: 23, sourceFingerprint: fingerprint,
    round: 1, expiry: { phase: 'endOfRound', round: 8 }, facts: { targets: { [priest.id]: { withinRange: true, ally: true } } } });
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.preview.resolvedParams.duration.value, 8);
});

test('les jets hors d100 et les extensions au-delà des DR sont rejetés; le Péché V5 n’a pas de maximum', () => {
  const actor = { id: 'priest', skills: [{ name: 'Prière', status: 'resolved', total: 50 }],
    talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
    caracs: { Soc: 60 }, extensions: { v5: { divine: { sin: 1000 } } } };
  const battle = contract(battleId);
  const base = { canSpeak: true, sourceFingerprint: fingerprint, round: 1, targetIds: ['priest'],
    facts: { targets: { priest: { withinRange: true } } } };
  const invalidRoll = previewDivineExecution(actor, battle, [actor], { ...base, roll: 101 });
  assert.equal(invalidRoll.ready, false);
  assert.equal(invalidRoll.status, 'invalid');
  const overBudget = previewDivineExecution(actor, battle, [actor], { ...base, roll: 23, choices: { range: 2 } });
  assert.equal(overBudget.ready, false);
  assert.match(overBudget.error, /paliers/);
  const highSin = previewDivineExecution(actor, battle, [actor], { ...base, roll: 99, wrathRoll: 1,
    wrathConsequences: 'Résolution MJ', choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    expiry: { phase: 'endOfRound', round: 6 } });
  assert.equal(highSin.ready, true, highSin.error);
  assert.equal(highSin.preview.wrath.modifiedRoll, 10001);
  assert.equal(highSin.preview.wrath.outcome.id, 'wrath:151-plus');
});

test('DIV-05 bloque le même bonus stat divin+magique et le cumul PA au calcul Store', () => {
  const priest = { id: 'priest', zone: 'active', skills: [{ name: 'Prière', status: 'resolved', total: 60 }],
    caracs: { Soc: 60 }, talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
    extensions: { v5: { divine: { sin: 0 } } } };
  const ally = { id: 'ally', zone: 'active', caracs: { Soc: 60 }, extensions: { v5: { spellEffects: [{ id: 'magic-stat', statModifiers: { CC: 5 } }], divine: {} } } };
  const battleState = { localRevision: 1, combat: { round: 1, participants: [priest, ally] } };
  const battle = previewStoreDivine(battleState, battleId, { actorId: 'priest', targetIds: ['ally'], canSpeak: true,
    roll: 23, choices: { range: 0, targets: 0, duration: 0 }, expiry: { phase: 'endOfRound', round: 6 },
    facts: { targets: { ally: { withinRange: true } } } });
  assert.equal(battle.ready, false);
  assert.match(battle.error, /DIV-05/);

  const invoker = { ...priest, talents: [{ id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
    prayers: [{ name: contract(shieldId).catalogueName }] };
  const armoredAlly = { ...ally, extensions: { v5: { spellEffects: [{ id: 'magic-ap', apModifiers: { all: 2 } }] } } };
  const shield = previewStoreDivine({ localRevision: 1, combat: { round: 1, participants: [invoker, armoredAlly] } }, shieldId,
    { actorId: 'priest', targetIds: ['ally'], canSpeak: true, roll: 23, choices: { range: 0, targets: 0, duration: 0 },
      expiry: { phase: 'endOfRound', round: 6 }, facts: { targets: { ally: { withinRange: true, ally: true } } } });
  assert.equal(shield.ready, false);
  assert.match(shield.error, /DIV-05/);
});

test('fin manuelle de sun-a retire son seul état Aveuglé et préserve sun-b', () => {
  const state = { combat: { participants: [{ id: 'target', states: [
    { id: 'sun-a-state', key: 'aveugle', level: 1, divineExecutionId: 'sun-a' },
    { id: 'sun-b-state', key: 'aveugle', level: 1, divineExecutionId: 'sun-b' }
  ], extensions: { v5: { divineEffects: [
    { id: 'sun-a-layer', executionId: 'sun-a', conditionStateIds: ['sun-a-state'] },
    { id: 'sun-b-layer', executionId: 'sun-b', conditionStateIds: ['sun-b-state'] }
  ] } } }] }, extensions: { v5: { divineExecutions: [] } } };
  const result = endStoreDivinePrayer(state, 'sun-a', { reason: 'Contrôle de suppression ciblée' });
  const target = result.combat.participants[0];
  assert.deepEqual(target.extensions.v5.divineEffects.map(row => row.executionId), ['sun-b']);
  assert.deepEqual(target.states.map(row => row.id), ['sun-b-state']);
});

test('fin manuelle préserve un état commun encore référencé par une autre couche', () => {
  const state = { combat: { participants: [{ id: 'target', states: [
    { id: 'shared-state', key: 'aveugle', level: 1 }
  ], extensions: { v5: { divineEffects: [
    { id: 'sun-a-layer', executionId: 'sun-a', conditionStateIds: ['shared-state'] },
    { id: 'sun-b-layer', executionId: 'sun-b', conditionStateIds: ['shared-state'] }
  ] } } }] }, extensions: { v5: { divineExecutions: [] } } };
  const result = endStoreDivinePrayer(state, 'sun-a', { reason: 'État partagé' });
  const target = result.combat.participants[0];
  assert.deepEqual(target.extensions.v5.divineEffects.map(row => row.executionId), ['sun-b']);
  assert.deepEqual(target.states.map(row => row.id), ['shared-state']);
});

test('des sources de miracle et talent périmées sont bloquées après un rafraîchissement réel', async () => {
  const shield = contract(shieldId);
  const battle = contract(battleId);
  assert.equal(validateDivineSources(shield), null);
  assert.equal(validateDivineSources(battle), null);
  const current = getReferenceCatalogue().magic.miracles.find(row => row.nom === shield.catalogueEntry.nom);
  const pinnedBless = registry.sourceTalentDescriptions['talent-bless'];
  assert.ok(current);
  const sheetNames = ['Mots Clés Armes et Armures', 'Armes Corps à Corps', 'Armes à Distance', 'Armures', 'Talents', 'Magie', 'Miracles'];
  const refreshed = await refreshReferences({ storage: null, forceRefresh: true, fetchImpl: async url => {
    const sheet = new URL(url).searchParams.get('sheet');
    assert.ok(sheetNames.includes(sheet), sheet);
    let csv = await readFile(resolve('js/data/reference-source-csv', `${sheet}.csv`), 'utf8');
    if (sheet === 'Miracles') csv = csv.replace(current.nom, `${current.nom} actualisé`);
    if (sheet === 'Talents') {
      assert.ok(csv.includes(pinnedBless), 'la source de talent épinglée doit exister dans le CSV local de fixture');
      csv = csv.replace(pinnedBless, 'Description de Béni modifiée pour la sonde');
    }
    return { ok: true, text: async () => csv };
  } });
  assert.equal(refreshed.ok, true, refreshed.status.error);
  assert.equal(validateDivineSources(shield)?.includes('description publique'), true);
  assert.equal(validateDivineSources(battle)?.includes('source du talent divin a changé'), true);
});
});

describe('commandements — contrôle indépendant', () => {
const sourceModuleUrl = new URL('../../../docs/divin/sources/L06-strictures.mjs', import.meta.url);
const expectedHash = '53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de';
const cultPages = new Map([
  ['manann', 205], ['morr', 206], ['myrmidia', 207], ['ranald', 208], ['rhya', 209],
  ['shallya', 210], ['sigmar', 211], ['taal', 212], ['ulric', 213], ['verena', 214],
]);
const cultNames = new Map([
  ['manann', 'Manann'], ['morr', 'Morr'], ['myrmidia', 'Myrmidia'], ['ranald', 'Ranald'], ['rhya', 'Rhya'],
  ['shallya', 'Shallya'], ['sigmar', 'Sigmar'], ['taal', 'Taal'], ['ulric', 'Ulric'], ['verena', 'Verena'],
]);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const strictIdentityKeys = [
  'actorKinds', 'aliases', 'bookId', 'canonicalName', 'category', 'frenchName', 'id',
  'recordCompleteness', 'sourceRefs', 'status', 'tradition', 'unresolvedFields',
].sort();
const unresolvedFields = identity => identity.unresolvedFields;

async function loadSource() {
  try {
    return await import(sourceModuleUrl.href);
  } catch (error) {
    assert.fail(`Le module source L06-strictures.mjs n’est pas raccordé: ${error.message}`);
  }
}

test('contrôle indépendant — 50 commandements représentent une puce chacun, cinq par culte, folios exacts', async () => {
  const { strictureIdentities, auditIdentities } = await loadSource();
  assert.equal(strictureIdentities.length, 50);
  assert.equal(auditIdentities.length, 53);
  assert.equal(new Set(strictureIdentities.map(row => row.id)).size, 50, 'identité de puce dupliquée');

  for (const [cultId, page] of cultPages) {
    const rows = strictureIdentities.filter(row => row.id.startsWith(`L06:stricture:${cultId}:`));
    assert.equal(rows.length, 5, `${cultId}: cinq puces source attendues`);
    assert.deepEqual(rows.map(row => row.id), Array.from({ length: 5 }, (_, i) =>
      `L06:stricture:${cultId}:${String(i + 1).padStart(2, '0')}`));
    for (const [index, row] of rows.entries()) {
      assert.equal(row.category, 'stricture');
      assert.equal(row.status, 'source-read');
      assert.equal(row.recordCompleteness, 'partial-e1');
      assert.equal(row.tradition, cultNames.get(cultId));
      assert.equal(row.sourceRefs.length, 1);
      assert.deepEqual(row.sourceRefs[0], {
        bookId: 'L06', fileSha256: expectedHash, physicalPage: page, printedPage: page,
        section: `The Cult of ${cultNames.get(cultId)} — Strictures, item ${index + 1}`,
      });
      assert.ok(unresolvedFields(row).includes('frenchName'));
      assert.ok(unresolvedFields(row).includes('aliases'));
      assert.ok(unresolvedFields(row).includes('actorKinds'));
      assert.ok(!unresolvedFields(row).includes('tradition'));
      assert.equal(row.notRuntimeRule, true);
      assert.equal(row.subClauses.length > 0, true);
    }
  }
});

test('contrôle indépendant — exceptions et paraphrases sensibles restent fidèles et non exécutables', async () => {
  const { strictureIdentities } = await loadSource();
  const byId = new Map(strictureIdentities.map(row => [row.id, row]));
  const rhya3 = byId.get('L06:stricture:rhya:03');
  assert.match(rhya3.summaryFr, /protéger une autre vie déjà en danger/i);
  assert.match(rhya3.subClauses.map(part => part.summaryFr).join(' '), /autre vie déjà en danger/i);

  const taal1 = byId.get('L06:stricture:taal:01');
  assert.match(taal1.summaryFr, /animal (pris|prélevé)/i);
  assert.doesNotMatch(taal1.summaryFr, /capturé/i);
  const sigmar5 = byId.get('L06:stricture:sigmar:05');
  assert.match(sigmar5.summaryFr, /sorciers malfaisants visés par la source/i);
  assert.doesNotMatch(sigmar5.summaryFr, /dénoncé|dénonciation/i);

  for (const row of strictureIdentities) {
    assert.equal(row.notRuntimeRule, true, row.id);
    assert.ok(Array.isArray(row.subClauses) && row.subClauses.length > 0, row.id);
    assert.equal(row.subClauses.some(part => /développement|exécution runtime/i.test(part.summaryFr)), false, row.id);
  }
});

test('contrôle indépendant — trois accès non humains p.215, sans restriction globale halfling ni doublon Little Prayers', async () => {
  const { nonHumanAccessIdentities, auditIdentities } = await loadSource();
  assert.equal(nonHumanAccessIdentities.length, 3);
  const expected = [
    ['L06:common-rule:access:dwarf-ancestor-gods', 'Dwarf Priests', ['dwarf']],
    ['L06:common-rule:access:elven-priests', 'Elven Priests', ['high-elf', 'wood-elf']],
    ['L06:common-rule:access:halfling-priests', 'Halfling Priests', ['halfling']],
  ];
  for (const [id, section, actorKinds] of expected) {
    const row = nonHumanAccessIdentities.find(item => item.id === id);
    assert.ok(row, `${id} absent`);
    assert.equal(row.category, 'common-rule');
    assert.equal(row.status, 'source-read');
    assert.equal(row.recordCompleteness, 'partial-e1');
    assert.deepEqual(row.actorKinds, actorKinds);
    assert.equal(row.sourceRefs.length, 1);
    assert.deepEqual(row.sourceRefs[0], {
      bookId: 'L06', fileSha256: expectedHash, physicalPage: 215, printedPage: 215, section,
    });
    assert.ok(unresolvedFields(row).includes('frenchName'));
    assert.ok(unresolvedFields(row).includes('aliases'));
    assert.ok(!unresolvedFields(row).includes('tradition'));
    assert.ok(!unresolvedFields(row).includes('actorKinds'));
    assert.deepEqual(row.relatedIdentityIds, ['L06:common-rule:little-prayers']);
  }
  const halfling = nonHumanAccessIdentities.find(row => row.id.endsWith('halfling-priests'));
  assert.match(halfling.summaryFr, /ancien local/i);
  assert.doesNotMatch(halfling.summaryFr, /interdiction|aucun effet divin|bannissement/i);
  assert.equal(auditIdentities.filter(row => row.id === 'L06:common-rule:little-prayers').length, 0,
    'les notices d’accès ne dupliquent pas Little Prayers');
  assert.equal(auditIdentities.length, 53);
});

test('contrôle indépendant — l’intégration E1 porte le registre à 133 sans nouvelle identité ni clause runtime', () => {
  const output = buildDivineAudit(corpus, auditEvidence, { root });
  const sourceIds = [
    ...output.identities.filter(row => row.id.startsWith('L06:stricture:')),
    ...output.identities.filter(row => row.id.startsWith('L06:common-rule:access:')),
  ];
  assert.equal(sourceIds.length, 53);
  assert.equal(output.identities.length, 133, '80 identités antérieures + 53 identités source');
  assert.equal(new Set(output.identities.map(row => row.id)).size, 133, 'identifiants du registre uniques');
  assert.equal(output.summary.identitiesPartialE1, 133);
  assert.equal(output.summary.pagesFirstRead, 89);
  assert.equal(output.summary.pagesIndependentlyRead, 89);
  assert.equal(output.summary.clauses, 0);
  assert.equal(output.summary.mechanicallyIntegratedClauses, 0);
  assert.equal(output.summary.associations, 60);
  assert.equal(output.identities.filter(row => row.id === 'L06:common-rule:little-prayers').length, 1);
  for (const row of sourceIds) {
    assert.deepEqual(Object.keys(row).sort(), strictIdentityKeys, `${row.id}: schéma d’identité strict`);
    assert.equal(row.status, 'source-read');
    assert.equal(row.recordCompleteness, 'partial-e1');
  }
});
});
