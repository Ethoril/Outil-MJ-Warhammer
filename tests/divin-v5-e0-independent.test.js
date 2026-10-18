import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { previewDivineExecution } from '../js/core/v5-divine-engine.js';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inventory = JSON.parse(readFileSync(resolve(root, 'docs/divin/DIVIN_INVENTAIRE.json'), 'utf8'));
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
    assert.equal(row.status, ['Commander la Légion', "Effrayer l'Ennemi", 'Compétence Martiale', 'Dévotion de la Guerrière'].includes(name) ? 'assisted' : 'manual');
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
