import test from 'node:test';
import assert from 'node:assert/strict';
import { acquireV5Conditions, recoverV5Condition } from '../js/core/v5-effects.js';

test('F2-N caractérisation — Enchevêtré est un état V5 cumulable et sa récupération attend une opposition de Force', () => {
  const participant = { id: 'cible', name: 'Cible', states: [] };
  const first = acquireV5Conditions(participant, [{ name: 'Enchevêtré', level: 1, source: { kind: 'weapon', id: 'filet' } }]);

  assert.equal(participant.states.length, 0, 'l’acquisition travaille sur une copie');
  assert.equal(first.participant.states.find(state => state.key === 'enchevetre')?.level, 1);

  const second = acquireV5Conditions(first.participant, [{ name: 'Enchevêtré', level: 2, source: { kind: 'grapple', id: 'empoignade' } }]);
  assert.equal(second.participant.states.filter(state => state.key === 'enchevetre').reduce((sum, state) => sum + state.level, 0), 3);

  const missingTest = recoverV5Condition(second.participant, 'enchevetre', { method: 'opposed-strength' });
  assert.ok(missingTest.needsInput.some(item => item.field === 'recoveryTest'), 'la sortie réclame le résultat du Test opposé');
  assert.equal(missingTest.participant.states.filter(state => state.key === 'enchevetre').reduce((sum, state) => sum + state.level, 0), 3);

  const passedTest = recoverV5Condition(second.participant, 'enchevetre', {
    method: 'opposed-strength',
    test: { success: true, sl: 2 }
  });
  assert.equal(passedTest.participant.states.filter(state => state.key === 'enchevetre').reduce((sum, state) => sum + state.level, 0), 1, 'les DR retirent autant de niveaux que le Test en a obtenu');
});

test('F2-N caractérisation — sans déclaration, une Bagarre reste une attaque ordinaire', async () => {
  const { previewResolution } = await import('../js/core/resolution.js');
  const preview = previewResolution({
    actor: { id: 'attaquant', name: 'Attaquant', states: [] },
    target: { id: 'cible', name: 'Cible', hp: 12, states: [] },
    action: { id: 'bagarre', type: 'attack', base: 50, damage: 4, qualities: [] },
    v5: { kind: 'melee' },
    roll: 25,
    baseRevision: 0
  });

  assert.equal(preview.success, true);
  assert.ok(preview.damage, 'sans déclaration, l’attaque suit le chemin ordinaire');
  assert.equal(preview.grapple, undefined, 'aucune déclaration ne déclenche de prise');
});
