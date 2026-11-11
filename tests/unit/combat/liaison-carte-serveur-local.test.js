import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const script = join(root, 'tools/serve-liaison.mjs');
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 20000 });

test('MAP-01 — serve-liaison refuse un dossier de Map Display sans la liaison, avec un message clair', () => {
  const empty = mkdtempSync(join(tmpdir(), 'carte-sans-liaison-'));
  try {
    const result = run('--check', '0', empty);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /js[\\/]app[\\/]mjLink\.js/);
    assert.match(result.stderr, /liaison/i);
  } finally { rmSync(empty, { recursive: true, force: true }); }
});

test('MAP-01 — serve-liaison accepte un dossier de Map Display qui porte la liaison', () => {
  const carte = mkdtempSync(join(tmpdir(), 'carte-avec-liaison-'));
  try {
    mkdirSync(join(carte, 'js/app'), { recursive: true });
    writeFileSync(join(carte, 'js/app/mjLink.js'), '// liaison\n');
    const result = run('--check', '0', carte);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { rmSync(carte, { recursive: true, force: true }); }
});

test('MAP-04 — le contrat ne promet plus campaignName, que personne n’envoie ni ne lit', () => {
  const contract = readFileSync(join(root, 'docs/CONTRAT_LIAISON_MAP_DISPLAY.md'), 'utf8');
  assert.equal(contract.includes('campaignName }'), false);
  assert.match(contract, /la carte émet `map\.hello \{ v, sessionId \}`/);
});
