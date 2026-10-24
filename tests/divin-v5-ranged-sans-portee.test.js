import test from 'node:test';
import assert from 'node:assert/strict';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import L20 from '../js/data/bestiary/L20.json' with { type: 'json' };

test('attaque à distance imprimée sans portée (L20 E0-P-630, « Ranged (Pistol) +9 ») : action à distance en CT, sans portée inventée', () => {
  const participant = buildParticipantFromBestiary('E0-P-630', { library: L20.profiles });
  const pistol = participant.actions.find(action => /pistol/i.test(action.name));
  assert.ok(pistol);
  assert.equal(pistol.attr, 'CT');
  assert.equal(pistol.extensions.v5.kind, 'ranged');
  assert.equal(pistol.rangeYards, undefined);
});
