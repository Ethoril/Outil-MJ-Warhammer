import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));

test('E05 règles Firebase proposées isolent v2 par compte et figent les écritures v1', () => {
  const rules = JSON.parse(readFileSync(join(root, 'firebase.database.rules.v2.test.json'), 'utf8'));
  const v2 = rules.rules['wfrp-sessions-v2'].$uid.current;
  const v1 = rules.rules['wfrp-sessions'].$uid.current;
  assert.match(v2['.read'], /auth\.uid === \$uid/);
  assert.match(v2['.write'], /newData\.hasChildren/);
  assert.equal(v1['.write'], false);
});
