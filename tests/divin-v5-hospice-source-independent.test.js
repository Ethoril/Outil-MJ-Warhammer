import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceUrl = new URL('../docs/divin/sources/L01-hospice-readings.mjs', import.meta.url);
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

  const { auditEvidence } = await import('../tools/divine-audit-data.mjs');
  const { buildDivineAudit } = await import('../tools/build-divine-audit.mjs');
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
