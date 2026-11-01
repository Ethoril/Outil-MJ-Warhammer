import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { legacyModifierMessage } from '../../../js/ui/action-editor.js';
test('legacy percentage modifier has a single clear V5 message', () => {
  assert.equal(legacyModifierMessage(-10), 'Modificateur de l’ancienne version (−10 %) : indiquez le modificateur en DR');
  assert.equal(legacyModifierMessage(10), 'Modificateur de l’ancienne version (+10 %) : indiquez le modificateur en DR');
});
