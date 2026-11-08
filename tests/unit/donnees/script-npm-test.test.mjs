import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ARCH-04 / TESTS-06 : sans motif, node --test ratisse les worktrees et archives de tmp/.
test('ARCH-04 — npm test est borné à tests/unit par deux motifs entre guillemets', () => {
  const { scripts } = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
  assert.equal(scripts.test, 'node --test "tests/unit/**/*.test.js" "tests/unit/**/*.test.mjs"');
});
