import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('générateur de couverture : --check détecte un écart sans écrire', () => {
  const temp = mkdtempSync(join(tmpdir(), 'coverage-check-'));
  try {
    mkdirSync(join(temp, 'js'), { recursive: true });
    mkdirSync(join(temp, 'docs'), { recursive: true });
    cpSync('js/data', join(temp, 'js/data'), { recursive: true });
    cpSync('docs/lot2', join(temp, 'docs/lot2'), { recursive: true });
    const target = join(temp, 'js/data/v5-talent-coverage.json');
    const script = resolve('tools/build-v5-talent-coverage.mjs');
    const run = () => spawnSync(process.execPath, [script, '--check'], { cwd: temp, encoding: 'utf8' });
    const before = readFileSync(target, 'utf8');
    assert.equal(run().status, 0);
    assert.equal(readFileSync(target, 'utf8'), before);
    const changed = before + ' ';
    writeFileSync(target, changed);
    assert.equal(run().status, 1);
    assert.equal(readFileSync(target, 'utf8'), changed);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
import { v5TalentCoverage } from '../js/core/v5-talent-coverage.js';
test('Maître à bord : la couverture expose le calcul assisté déjà raccordé', () => {
  const clause = v5TalentCoverage('talent-master-and-commander').clauses.find(row => row.id === 'tri:0');
  assert.equal(clause.mode, 'assisted');
});
test('couverture divine : Haine sacrée automatique et accès divin documenté', () => {
  const hatred = v5TalentCoverage('talent-holy-hatred');
  assert.equal(hatred.clauses.find(row => row.id === 'magic:0').mode, 'automatic');
  for (const id of ['talent-bless', 'talent-invoke']) {
    const clause = v5TalentCoverage(id).clauses.find(row => row.id === 'magic:1');
    assert.match(clause.text, /moteur divin/);
    assert.notEqual(clause.mode, 'deferred');
  }
  const changedCatalogue = { talents: [{ id: 'talent-master-and-commander', description: 'source modifiée' }] };
  assert.equal(v5TalentCoverage('talent-master-and-commander', changedCatalogue).clauses[0].mode, 'reminder');
});
