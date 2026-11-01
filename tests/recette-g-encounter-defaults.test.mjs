import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { defaultEncounterCamp } from '../js/ui/prepare-view.js';
test('new encounter profiles default to the expected camps', () => {
  assert.equal(defaultEncounterCamp('PJ'), 'pj');
  assert.equal(defaultEncounterCamp('PNJ'), 'ennemi');
  assert.equal(defaultEncounterCamp('Créature'), 'ennemi');
});
