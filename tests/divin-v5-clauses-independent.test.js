import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import corpus from '../docs/divin/DIVIN_CORPUS_LIVRES.json' with { type: 'json' };
import e1 from '../docs/divin/DIVIN_AUDIT_CLAUSES.json' with { type: 'json' };
import pages from '../docs/divin/DIVIN_AUDIT_PAGES.json' with { type: 'json' };
import runtime from '../js/data/v5-divine-contracts.json' with { type: 'json' };
import { blessingClauseSource } from '../docs/divin/sources/L06-blessing-clauses.mjs';
import { buildDivineClauses } from '../tools/build-divine-clauses.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const clone = value => structuredClone(value);
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
