import test from 'node:test';
import assert from 'node:assert/strict';
import corpus from '../docs/divin/DIVIN_CORPUS_LIVRES.json' with { type: 'json' };
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditEvidence } from '../tools/divine-audit-data.mjs';
import { buildDivineAudit } from '../tools/build-divine-audit.mjs';

const sourceModuleUrl = new URL('../docs/divin/sources/L06-strictures.mjs', import.meta.url);
const expectedHash = '53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de';
const cultPages = new Map([
  ['manann', 205], ['morr', 206], ['myrmidia', 207], ['ranald', 208], ['rhya', 209],
  ['shallya', 210], ['sigmar', 211], ['taal', 212], ['ulric', 213], ['verena', 214],
]);
const cultNames = new Map([
  ['manann', 'Manann'], ['morr', 'Morr'], ['myrmidia', 'Myrmidia'], ['ranald', 'Ranald'], ['rhya', 'Rhya'],
  ['shallya', 'Shallya'], ['sigmar', 'Sigmar'], ['taal', 'Taal'], ['ulric', 'Ulric'], ['verena', 'Verena'],
]);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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
