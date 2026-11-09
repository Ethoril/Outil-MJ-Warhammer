import test from 'node:test';
import assert from 'node:assert/strict';
import { previewV5SecondaryTest } from '../../../js/core/v5-test-modifiers.js';

const actor = { id: 'a', states: [{ key: 'aterre', name: 'À terre', level: 1 }], talents: [],
  extensions: { v5: { sequelaEffects: { rows: [{ id: 'arm', type: 'loc-dr', loc: 'arm:left', amount: -1, label: 'Fracture (bras gauche)' }] } } } };
const preview = context => previewV5SecondaryTest(actor, { score: 40, roll: 20, test: { characteristic: 'Ag' }, context });

test('les questions applicables restent connues après réponse, sans bloquer le Test', () => {
  const pending = preview({});
  assert.deepEqual(pending.questions.map(row => row.field), ['involvesMovement', 'sequelaUses:arm:left']);
  assert.equal(pending.ready, false);
  const answered = preview({ involvesMovement: false, 'sequelaUses:arm:left': true });
  assert.equal(answered.ready, true);
  assert.deepEqual(answered.needsInput, []);
  assert.deepEqual(answered.questions.map(row => row.field), ['involvesMovement', 'sequelaUses:arm:left']);
});

test('un contexte où les pénalités d’État sont ignorées ne rend pas la question de mouvement', () => {
  const ignored = { ...actor, extensions: { v5: { specialStates: { ignoreConditionPenalties: true } } } };
  const result = previewV5SecondaryTest(ignored, { score: 40, roll: 20, test: { characteristic: 'Ag' }, context: { involvesMovement: false } });
  assert.deepEqual(result.questions, []);
});
