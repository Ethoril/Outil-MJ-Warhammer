import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAGIC_DATA } from '../js/data/magic.js';

// Convention du projet : toute mesure affichée en yards s'écrit avec la même valeur en mètres.
const text = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('v3 mètres : plus de « yard » dans les textes affichés des données écrites à la main', () => {
  for (const path of ['js/data/creature-abilities.js', 'js/data/v5-combat-fumbles.js', 'js/data/rules.js', 'js/data/v5-rules.js'])
    assert.doesNotMatch(text(path), /\byards?\b/i, path);
  assert.doesNotMatch(JSON.stringify(MAGIC_DATA), /\byards?\b/i);
  assert.doesNotMatch(text('js/data/v5-spell-contracts.json'), /\byards?\b/i);
});

test('v3 mètres : contrats de prières — les textes affichés sont en mètres, les unités de paramètres restent codées', () => {
  const registry = JSON.parse(text('js/data/v5-divine-contracts.json'));
  const shown = [];
  for (const contract of registry.contracts) for (const row of [...(contract.clauses || []), ...(contract.needsInput || [])]) shown.push(row.text);
  assert.ok(shown.length > 100);
  assert.deepEqual(shown.filter(value => /\byards?\b/i.test(value || '')), []);
});
