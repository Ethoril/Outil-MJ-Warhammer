import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import corpus from '../docs/divin/DIVIN_CORPUS_LIVRES.json' with { type: 'json' };
import complement from '../docs/divin/DIVIN_CORPUS_LIVRES_COMPLEMENT.json' with { type: 'json' };
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };
import { supplementCults } from '../js/core/v5-divine-grammar.js';

const generator = directory => spawnSync(process.execPath, ['tools/build-v5-divine-contracts.mjs', '--dry-run', `--miracle-modules=${directory}`],
  { cwd: process.cwd(), encoding: 'utf8', windowsHide: true });
const shieldParams = { range: { kind: 'characteristic', characteristic: 'Soc', unit: 'yards' }, targets: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'allies' }, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' } };
const sample = (more = {}) => ({ name: 'Bouclier d’essai', canonicalName: 'Test Shield', printedPage: 223, summary: 'Les alliés ciblés gagnent +1 PA.', params: shieldParams, status: 'implemented',
  effect: { type: 'armor-bonus', value: 1, locations: 'all' }, clauses: [{ id: 'effect', mode: 'engine', text: '+1 PA.' }], ...more });
const moduleSource = (cult, miracles, { source, aspect } = {}) => `export const cult = ${JSON.stringify(cult)};\n${source ? `export const source = ${JSON.stringify(source)};\n` : ''}${aspect ? `export const aspect = ${JSON.stringify(aspect)};\n` : ''}export const miracles = ${JSON.stringify(miracles)};\n`;
function run(files) {
  const directory = mkdtempSync(join(tmpdir(), 'divine-wave-b-'));
  try {
    for (const [name, body] of Object.entries(files)) writeFileSync(join(directory, name), body);
    const result = generator(directory);
    return { ...result, contracts: result.status === 0 ? JSON.parse(result.stdout).moduleContracts : null };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
const aote3 = corpus.books.find(book => book.id === 'L02');
const deft = corpus.books.find(book => book.id === 'L04');
const lustria = corpus.books.find(book => book.id === 'L07');
const pbtt = complement.books[0];
const aote3Source = { bookId: 'AotE3', document: aote3.file, fileSha256: aote3.sha256, edition: 'V4 EN' };

test('complément de corpus : le PDF Power Behind the Throne Companion est enregistré sans toucher au manifeste de 17 livres', () => {
  assert.equal(corpus.count, 17);
  assert.equal(corpus.books.length, 17);
  assert.equal(corpus.books.some(book => book.file === pbtt.file), false);
  assert.equal(pbtt.file, 'WFRP_Power_Behind_the_Throne_Companion.pdf');
  assert.equal(pbtt.physicalPages, 128);
  assert.match(pbtt.sha256, /^[0-9a-f]{64}$/);
  assert.equal(corpus.books.some(book => book.id === pbtt.id || book.sha256 === pbtt.sha256), false);
});

test('chargeur : sans `source` ni `aspect`, un module de base garde la source du livre de base V5 EN v2', () => {
  const { status, stderr, contracts } = run({ 'morr.mjs': moduleSource('Morr', [sample()]) });
  assert.equal(status, 0, stderr);
  const [contract] = contracts;
  const base = registry.contracts.find(row => row.canonicalName === 'Shield of Myrmidia');
  assert.equal(contract.source.document, base.source.document);
  assert.equal(contract.source.fileSha256, base.source.fileSha256);
  assert.equal(contract.source.edition, 'V5 EN');
  assert.equal(contract.source.sourceStatus, 'read-and-page-checked');
  assert.equal(contract.source.printedPage, 223);
  assert.equal(contract.sourceReceipt.sourceBookSha256, base.source.fileSha256);
  assert.deepEqual(Object.keys(contract.sourceReceipt), ['referenceSnapshotSha256', 'catalogueSnapshotVersion', 'sourceBookSha256']);
  assert.equal(contract.labels.sourceStatus, 'V5 base source checked');
  assert.equal('aspect' in contract, false);
  assert.equal('reminders' in contract, false);
});

test('chargeur : un module déclarant le livre de base comme source reste identique à un module sans `source`', () => {
  const plain = run({ 'morr.mjs': moduleSource('Morr', [sample()]) });
  const declared = run({ 'morr.mjs': moduleSource('Morr', [sample()], { source: { bookId: 'L06', document: 'Livre de base V5 EN v2.pdf', fileSha256: '53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de', edition: 'V5 EN' } }) });
  assert.equal(declared.status, 0, declared.stderr);
  assert.deepEqual(declared.contracts, plain.contracts);
});

test('chargeur : source de supplément (Archives of the Empire 3) reflétée dans source, sourceReceipt et libellé', () => {
  const { status, stderr, contracts } = run({ 'handrich.mjs': moduleSource('Handrich', [sample({ printedPage: 47 })], { source: aote3Source }) });
  assert.equal(status, 0, stderr);
  const [contract] = contracts;
  assert.deepEqual(contract.source, { document: 'Archives of the Empire 3.pdf', fileSha256: aote3.sha256, edition: 'V4 EN', sourceStatus: 'read-and-page-checked', printedPage: 47, section: 'Miracles de Handrich - Test Shield', clauses: [] });
  assert.equal(contract.sourceReceipt.sourceBookSha256, aote3.sha256);
  assert.equal(contract.sourceReceipt.sourceBookId, 'L02', 'identifiant du manifeste, indépendant de l’étiquette bookId du module');
  assert.equal(contract.sourceReceipt.sourceDocument, 'Archives of the Empire 3.pdf');
  assert.equal(contract.sourceReceipt.sourceEdition, 'V4 EN');
  assert.equal(contract.labels.sourceStatus, 'V4 EN supplement L02 source checked');
  assert.equal(contract.id, 'divine:miracle:handrich:test-shield');
});

test('chargeur : le document ou l’empreinte seuls suffisent, et le PDF du complément est résolu comme un livre du manifeste', () => {
  const { status, stderr, contracts } = run({
    'a.mjs': moduleSource('Ranald', [sample()], { source: { document: deft.file, edition: 'V4 EN', sourceStatus: 'read-and-page-checked' } }),
    'b.mjs': moduleSource('Ulric', [sample({ canonicalName: 'Other Shield' })], { source: { bookId: 'PBTT', fileSha256: pbtt.sha256.toUpperCase(), edition: 'V4 EN' } }),
    'c.mjs': moduleSource('Mathlann', [sample({ canonicalName: 'Third Shield' })], { source: { bookId: 'L07', document: lustria.file, fileSha256: lustria.sha256, edition: 'V4 EN' } })
  });
  assert.equal(status, 0, stderr);
  assert.deepEqual(contracts.map(row => [row.sourceReceipt.sourceBookId, row.source.document, row.source.fileSha256]),
    [['L04', deft.file, deft.sha256], ['L18', pbtt.file, pbtt.sha256], ['L07', lustria.file, lustria.sha256]]);
});

test('chargeur : un `source` incomplet, inconnu ou contradictoire est refusé avec le fichier et le motif', () => {
  const cases = [
    [{ bookId: 'AotE3', edition: 'V4 EN' }, /doit identifier le livre \(document ou fileSha256\)/],
    [{ ...aote3Source, edition: undefined }, /edition est requise/],
    [{ ...aote3Source, fileSha256: '0'.repeat(64) }, /livre absent des manifestes/],
    [{ ...aote3Source, document: deft.file }, /livre absent des manifestes/],
    [{ ...aote3Source, bookId: 'L04' }, /livre absent des manifestes/],
    [{ ...aote3Source, sourceStatus: 3 }, /sourceStatus doit être un texte non vide/],
    [{ document: 'Livre de base V5 EN v2.pdf', edition: 'V4' }, /désigne le livre de base : edition doit valoir V5 EN/],
    ['Archives of the Empire 3.pdf', /doit être un objet/]
  ];
  for (const [source, pattern] of cases) {
    const { status, stderr } = run({ 'a.mjs': moduleSource('Handrich', [sample()], { source }) });
    assert.notEqual(status, 0, pattern.source);
    assert.match(stderr, /Module miracle a\.mjs : `source`/);
    assert.match(stderr, pattern);
  }
});

test('chargeur : l’aspect d’un module est stocké dans chaque contrat, l’accès requis reste Invocation (culte)', () => {
  const { status, stderr, contracts } = run({ 'ranald-nuit.mjs': moduleSource('Ranald', [sample(), sample({ canonicalName: 'Other Shield', name: 'Autre' })], { source: { ...aote3Source, document: deft.file, fileSha256: deft.sha256 }, aspect: 'Night Prowler' }),
    'ranald.mjs': moduleSource('Ranald', [sample({ canonicalName: 'Plain Shield' })]) });
  assert.equal(status, 0, stderr);
  assert.deepEqual(contracts.map(row => row.aspect), ['Night Prowler', 'Night Prowler', undefined]);
  for (const row of contracts) {
    assert.equal(row.requiredTalent.id, 'talent-invoke');
    assert.equal(row.requiredTalent.name, 'Invocation (Ranald)');
    assert.equal(row.requiredTalent.specialization, 'Ranald');
  }
  const bad = run({ 'a.mjs': 'export const cult = "Ranald";\nexport const aspect = "  ";\nexport const miracles = [];\n' });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /a\.mjs : `aspect` doit être un texte non vide/);
});

test('chargeur : Handrich, Solkan et Mathlann sont acceptés, un autre culte reste refusé', () => {
  assert.deepEqual([...supplementCults], ['Handrich', 'Solkan', 'Mathlann']);
  for (const cult of supplementCults) {
    const { status, stderr, contracts } = run({ 'a.mjs': moduleSource(cult, [sample()]) });
    assert.equal(status, 0, stderr);
    const [contract] = contracts;
    assert.equal(contract.deity, cult);
    assert.equal(contract.id, `divine:miracle:${cult.toLowerCase()}:test-shield`);
    assert.deepEqual({ ...contract.requiredTalent, catalogueTalentId: undefined }, { id: 'talent-invoke', catalogueTalentId: undefined, name: `Invocation (${cult})`, specialization: cult });
    assert.equal(contract.requiredTalent.catalogueTalentId, `talent-${[...`Invocation (${cult})`].map(char => char.charCodeAt(0).toString(16)).join('_')}`);
  }
  const refused = run({ 'a.mjs': moduleSource('Khorne', [sample()]) });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /`cult` doit être l’un de .*Handrich, Solkan, Mathlann/);
});

test('chargeur : Solkan n’accepte ni Péché ni Corruption, en rappel et en clause manuelle des miracles de module', () => {
  const { status, stderr, contracts } = run({ 'a.mjs': moduleSource('Solkan', [sample()]), 'b.mjs': moduleSource('Handrich', [sample()]) });
  assert.equal(status, 0, stderr);
  const [solkan, handrich] = contracts;
  assert.match(solkan.reminders[0], /Péché ou de Corruption/);
  assert.deepEqual(solkan.clauses.map(row => [row.id, row.mode]), [['effect', 'engine'], ['solkan-purity', 'manual']]);
  assert.equal('reminders' in handrich, false);
});

test('chargeur : un identifiant déjà défini est refusé, avec mention du livre de base le cas échéant', () => {
  const cases = [
    [{ 'a.mjs': moduleSource('Handrich', [sample()], { source: aote3Source }), 'b.mjs': moduleSource('Handrich', [sample()], { source: aote3Source }) }, /b\.mjs .*identifiant dupliqué divine:miracle:handrich:test-shield \(déjà défini par le module a\.mjs\)/],
    [{ 'a.mjs': moduleSource('Rhya', [sample()]), 'b.mjs': moduleSource('Rhya', [sample()], { source: aote3Source }) }, /b\.mjs .*identifiant dupliqué divine:miracle:rhya:test-shield : ce miracle est déjà présent dans le livre de base \(module a\.mjs\)/],
    [{ 'a.mjs': moduleSource('Rhya', [sample()], { source: aote3Source }), 'b.mjs': moduleSource('Rhya', [sample()]) }, /ce miracle est déjà présent dans un supplément \(module a\.mjs\)/],
    [{ 'a.mjs': moduleSource('Myrmidia', [sample({ canonicalName: 'Shield of Myrmidia' })], { source: aote3Source }) }, /déjà défini par le livre de base Myrmidia/]
  ];
  for (const [files, pattern] of cases) {
    const { status, stderr } = run(files);
    assert.notEqual(status, 0, pattern.source);
    assert.match(stderr, pattern);
  }
  // Le même nom dans deux cultes distincts n’est pas un doublon.
  const ok = run({ 'a.mjs': moduleSource('Solkan', [sample()], { source: aote3Source }), 'b.mjs': moduleSource('Handrich', [sample()], { source: aote3Source }) });
  assert.equal(ok.status, 0, ok.stderr);
});

test('registre : les livres de supplément cités par un contrat sont déclarés au moteur, empreinte du complément incluse', () => {
  const books = registry.sourceManifest.supplementBooks;
  assert.ok(books.some(book => book.bookId === 'L02' && book.document === aote3.file && book.fileSha256 === aote3.sha256));
  for (const contract of registry.contracts.filter(row => row.source?.document && row.source.fileSha256 !== registry.sourceManifest.v5EnglishBaseSha256 && row.source.sourceStatus !== 'found-adaptation-blocked'))
    assert.ok(books.some(book => book.document === contract.source.document && book.fileSha256 === contract.source.fileSha256), contract.id);
  assert.equal(registry.sourceManifest.complementCorpusSha256, createHash('sha256').update(readFileSync('docs/divin/DIVIN_CORPUS_LIVRES_COMPLEMENT.json', 'utf8'), 'utf8').digest('hex'));
  assert.equal(registry.generatorVersion, 'divine-contracts-0.4.0');
});

