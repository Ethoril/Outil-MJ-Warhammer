// L3b : Baume pour un esprit blessé supprime les Traits psychologiques pendant la durée ; Engourdissement affiche « Tour perdu ».
import test from 'node:test';
import assert from 'node:assert/strict';
import { getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { psychologyTraits, psychologyReminders } from '../../../js/core/creature-psychology.js';

const contractOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && (row.canonicalName === name || row.name === name));

test('Baume : le contrat porte le drapeau, la clause remove-psychology est branchée', () => {
  const balm = contractOf('Balm to a Wounded Mind');
  assert.ok(balm.effects.some(effect => effect.type === 'special-state' && effect.psychologySuppressed === true));
  assert.equal(balm.clauses.find(clause => clause.id === 'remove-psychology').mode, 'engine');
});

test('Traits psychologiques lus vides sous le drapeau, intacts sans lui', () => {
  const person = extra => ({ id: 'p', traits: ['Peur (2)', 'Frénésie'], extensions: extra });
  assert.deepEqual(psychologyTraits(person({})).map(row => row.key).sort(), ['fear', 'frenzy']);
  const calm = person({ v5: { specialStates: { psychologySuppressed: true } } });
  assert.deepEqual(psychologyTraits(calm), []);
  assert.deepEqual(psychologyReminders(calm), []);
});

test('Engourdissement : issue libellée « Tour perdu »', () => {
  const imposed = contractOf('Engourdissement').effects.find(effect => effect.type === 'imposed-test');
  assert.deepEqual(imposed.onFailure, [{ type: 'lost-turn', cause: 'divine-defensive-only', label: 'Tour perdu' }]);
});
