import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../js/core/resolution.js';

const actor = { id: 'attacker', states: [] };
const target = { id: 'target', hp: 10, caracs: { E: 35 }, armor: { head: 2, body: 1, arms: 2, legs: 2 }, states: [] };

test('F2-G characterization — humanoid location and key remain the current reversed-d100 result', () => {
  const result = previewResolution({
    actor, target, action: { type: 'attack', base: 60, damage: 4, qualities: [] },
    roll: 54, baseRevision: 1
  });
  assert.deepEqual({ roll: result.location.roll, key: result.location.key, name: result.location.name, side: result.location.side }, {
    roll: 45, key: 'BODY', name: 'Corps', side: null
  });
});

test('F2-G characterization — explicitly targeted location keeps its current exact result', () => {
  const result = previewResolution({
    actor, target, action: { type: 'attack', base: 90, damage: 4, qualities: [] },
    v5: { kind: 'ranged', context: { calledShot: true, calledShotLocation: 'rightLeg' } },
    roll: 54, baseRevision: 1
  });
  assert.deepEqual({ roll: result.location.roll, key: result.location.key, name: result.location.name, side: result.location.side, calledShot: result.location.calledShot }, {
    roll: null, key: 'LEG', name: 'Jambe Droite', side: 'right', calledShot: true
  });
});
