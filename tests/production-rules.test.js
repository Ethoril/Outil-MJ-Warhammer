import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rules = JSON.parse(readFileSync(new URL('../firebase.database.rules.json', import.meta.url), 'utf8')).rules;

test('règles de production isolent v1 et v2 par UID et valident les enveloppes v2', () => {
  const v1 = rules['wfrp-sessions'].$uid;
  assert.match(v1['.read'], /auth != null && auth\.uid === \$uid/);
  assert.match(v1['.write'], /auth != null && auth\.uid === \$uid/);

  const v2 = rules['wfrp-sessions-v2'].$uid.current;
  assert.match(v2['.read'], /auth != null && auth\.uid === \$uid/);
  assert.match(v2['.write'], /auth != null && auth\.uid === \$uid/);
  assert.match(v2['.write'], /newData\.hasChildren\(\['revision', 'state', 'receipts'\]\)/);
  assert.match(v2['.write'], /newData\.child\('revision'\)\.isNumber\(\)/);
  assert.match(v2['.write'], /newData\.child\('revision'\)\.val\(\) >= data\.child\('revision'\)\.val\(\)/);
  assert.equal(rules['.read'], undefined);
  assert.equal(rules['.write'], undefined);
});
