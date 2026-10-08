import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rules = JSON.parse(readFileSync(new URL('../firebase.database.rules.json', import.meta.url), 'utf8')).rules;

test('règles de production isolent v1 et v2 en lecture seule, v3 par UID et schéma', () => {
  const v1 = rules['wfrp-sessions'].$uid;
  assert.match(v1['.read'], /auth != null && auth\.uid === \$uid/);
  assert.equal(v1['.write'], false);

  const v2 = rules['wfrp-sessions-v2'].$uid.current;
  assert.match(v2['.read'], /auth != null && auth\.uid === \$uid/);
  assert.equal(v2['.write'], false);
  const v3 = rules['wfrp-sessions-v3'].$uid.current;
  assert.match(v3['.write'], /auth != null && auth\.uid === \$uid/);
  assert.match(v3['.write'], /newData\.hasChildren\(\['revision', 'state'\]\)/);
  assert.match(v3['.write'], /newData\.child\('revision'\)\.isNumber\(\)/);
  assert.match(v3['.write'], /newData\.child\('revision'\)\.val\(\) >= data\.child\('revision'\)\.val\(\)/);
  assert.equal(rules['.read'], undefined);
  assert.equal(rules['.write'], undefined);
});
