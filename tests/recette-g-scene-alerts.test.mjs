import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { newlyProposedSceneEvents } from '../js/core/scene-events.js';
test('health threshold produces one alert per occurrence', () => {
  const event = { id: 'danger', condition: { type: 'hpBelow', participantId: 'p', hp: 5 }, consequence: { type: 'note', text: 'Danger' } };
  const scene = hp => ({ id: 's', round: 1, events: [event], participants: [{ id: 'p', hp }], resolvedOccurrences: [] });
  const seen = new Set();
  assert.equal(newlyProposedSceneEvents(scene(8), scene(4), seen).length, 1);
  assert.equal(newlyProposedSceneEvents(scene(4), scene(2), seen).length, 0);
  assert.equal(newlyProposedSceneEvents(scene(8), scene(2), seen).length, 0);
});
