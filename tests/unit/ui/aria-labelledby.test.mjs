import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// COMP-ACCESSIB-08 : chaque aria-labelledby de index.html désigne un id présent dans la page.
test('COMP-ACCESSIB-08 — aucun aria-labelledby de index.html ne pointe vers un id absent', () => {
  const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  const missing = [...html.matchAll(/aria-labelledby="([^"]+)"/g)]
    .flatMap(m => m[1].split(/\s+/))
    .filter(id => !ids.has(id));
  assert.deepEqual(missing, []);
});
