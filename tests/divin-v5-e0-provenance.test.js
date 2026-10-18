import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const registry = JSON.parse(readFileSync('js/data/v5-divine-contracts.json', 'utf8'));
const inventory = JSON.parse(readFileSync('docs/divin/DIVIN_INVENTAIRE.json', 'utf8'));
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

test('nine supplemental miracles have their verified Up in Arms source and remain blocked for V5 adaptation', () => {
  const sourceHash = '0671b27d0e947c7c5387fd4b30cda0512f9182dc811cc0275a18acc96af5fa07';
  for (const [catalogueName, title] of expected) {
    const row = registry.contracts.find(item => item.type === 'miracle' && item.catalogueName === catalogueName);
    assert.ok(row, catalogueName);
    assert.equal(row.canonicalName, title);
    assert.equal(row.source.document, 'Up in arms.pdf');
    assert.equal(row.source.fileSha256, sourceHash);
    assert.equal(row.source.edition, 'V4');
    assert.equal(row.source.printedPage, 79);
    assert.equal(row.source.section, title);
    assert.equal(row.source.sourceStatus, 'found-adaptation-blocked');
    assert.equal(row.sourceReceipt.sourceBookSha256, sourceHash);
    assert.equal(row.status, 'blocked');
    assert.match(row.sourceDelta, /adaptation V4 vers V5/i);
    assert.equal(row.clauses.find(clause => clause.id === 'catalogue-entry').mode, 'source-checked');
    assert.equal(row.clauses.find(clause => clause.id === 'effect').mode, 'blocked');
    assert.deepEqual(row.effects, []);
  }
  assert.deepEqual(inventory.counts, {
    blessings: 6,
    miracles: 15,
    miraclesSourceFound: 15,
    miraclesSourceNotFound: 0,
    miraclesV5SourceFound: 6,
    miraclesSupplementSourceFound: 9,
    miraclesV4AdaptationBlocked: 9,
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
