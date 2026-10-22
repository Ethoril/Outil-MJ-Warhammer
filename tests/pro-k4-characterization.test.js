import test from 'node:test';
import assert from 'node:assert/strict';
import { isPsychologyImmune } from '../js/core/v5-talent-psychology.js';
import { previewV5TalentTestModifiers } from '../js/core/v5-talent-tests.js';

const talent = (id, specialization) => ({ id, status: 'resolved', rank: 1, ...(specialization ? { specialization } : {}) });
const person = (...talents) => ({ id: 'p', name: 'P', talents, states: [], traits: [] });
const attack = { id: 'a', type: 'attack', base: 50, note: 'Épée', extensions: {} };

test('K4 caractérisation : Sans peur et Haine ne jouent que sur l’égalité de texte de la spécialisation', () => {
  assert.equal(isPsychologyImmune(person(talent('talent-fearless', 'Orques')), { kind: 'fear', enemyGroup: 'Orques' }), true);
  assert.equal(isPsychologyImmune(person(talent('talent-fearless', 'Orques')), { kind: 'fear', enemyGroup: 'Nains' }), false);
  assert.equal(isPsychologyImmune(person(talent('talent-fearless', 'Orques')), { kind: 'fear' }), false);
  assert.equal(isPsychologyImmune(person(talent('talent-fearless', 'Tout')), { kind: 'fear', enemyGroup: 'Nains' }), true);
  assert.equal(isPsychologyImmune(person(talent('talent-fearless')), { kind: 'fear', enemyGroup: 'Nains' }), true);
  assert.equal(isPsychologyImmune(person(talent('talent-hatred', 'Orques')), { kind: 'fear', enemyGroup: 'Orques' }), true);
  assert.equal(isPsychologyImmune(person(talent('talent-hatred', 'Orques')), { kind: 'fear', enemyGroup: 'Gobelins' }), false);
  assert.equal(isPsychologyImmune(person(talent('talent-fearless', 'Orques')), { kind: 'terror', enemyGroup: 'Orques' }), false, 'la Terreur n’est pas couverte par Sans peur');
});

test('K4 caractérisation : le +1 DR de la Haine exige le groupe en contexte et l’égalité avec la spécialisation', () => {
  const run = enemyGroup => previewV5TalentTestModifiers(person(talent('talent-hatred', 'Orques')), { action: attack, kind: 'melee', role: 'attacker', settings: { context: enemyGroup === undefined ? {} : { enemyGroup } } });
  assert.equal(run('Orques').slModifiers.length, 1);
  assert.equal(run('Orques').slModifiers[0].amount, 1);
  assert.equal(run('Nains').slModifiers.length, 0);
  const missing = run(undefined);
  assert.equal(missing.slModifiers.length, 0);
  assert.ok(missing.plan.unresolved.some(row => row.fields.includes('enemyGroup')), 'groupe manquant : saisie MJ demandée');
});
