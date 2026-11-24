import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetRowModel } from '../../../js/ui/resolution-panel/target-row.js';

// LOT G11 (recette j-vingt) : la ligne « Cible » de la résolution ne défile jamais en largeur — au-delà de
// huit cibles, seules les prioritaires restent en puces et les autres passent dans « Autres cibles (…) ».

const person = id => ({ id, name: id.toUpperCase() });
const ids = list => list.map(entry => (entry.participant ? entry.participant.id : entry.id));

test('huit cibles ou moins : toutes affichées, rien de caché, ordre d’origine (Adversaires puis Alliés)', () => {
  const adversaries = Array.from({ length: 5 }, (_, index) => person(`e${index + 1}`));
  const allies = Array.from({ length: 3 }, (_, index) => person(`a${index + 1}`));
  const { shown, hidden } = targetRowModel({ adversaries, allies, targetId: 'e2', actorId: 'pj1', engagedIds: ['e3'] });
  assert.equal(shown.length, 8);
  assert.deepEqual(hidden, []);
  assert.deepEqual(ids(shown), ['e1', 'e2', 'e3', 'e4', 'e5', 'a1', 'a2', 'a3']);
  assert.deepEqual(shown.map(entry => entry.group), ['Adversaires', 'Adversaires', 'Adversaires', 'Adversaires', 'Adversaires', 'Alliés', 'Alliés', 'Alliés']);
});

test('vingt cibles : 4 affichées, la cible choisie d’abord puis les adversaires engagés, 16 cachées', () => {
  const adversaries = Array.from({ length: 15 }, (_, index) => person(`e${index + 1}`));
  const allies = Array.from({ length: 5 }, (_, index) => person(`a${index + 1}`));
  const { shown, hidden } = targetRowModel({ adversaries, allies, targetId: 'e7', actorId: 'pj1', engagedIds: ['e2', 'e5', 'e9', 'a1'] });
  assert.equal(shown.length, 4);
  assert.deepEqual(ids(shown), ['e7', 'e2', 'e5', 'e9']);
  assert.deepEqual(shown.map(entry => entry.group), ['Adversaires', 'Adversaires', 'Adversaires', 'Adversaires']);
  assert.equal(hidden.length, 16);
  // Les cachées gardent l’ordre d’origine (adversaires puis alliés).
  assert.deepEqual(ids(hidden), ['e1', 'e3', 'e4', 'e6', 'e8', 'e10', 'e11', 'e12', 'e13', 'e14', 'e15', 'a1', 'a2', 'a3', 'a4', 'a5']);
});

test('vingt cibles sans cible choisie : les engagés avec l’acteur en premier, aucun affiché et caché à la fois', () => {
  const adversaries = Array.from({ length: 12 }, (_, index) => person(`e${index + 1}`));
  const allies = Array.from({ length: 8 }, (_, index) => person(`a${index + 1}`));
  const engagedIds = ['e4', 'a2', 'e1', 'e7'];
  const { shown, hidden } = targetRowModel({ adversaries, allies, targetId: null, actorId: 'pj1', engagedIds });
  assert.equal(shown.length, 4);
  assert.deepEqual(ids(shown), ['e1', 'e4', 'e7', 'a2']);
  const shownIds = new Set(ids(shown));
  assert.equal(hidden.length, 16);
  assert.ok(hidden.every(participant => !shownIds.has(participant.id)), 'aucun participant affiché et caché à la fois');
  assert.deepEqual([...shownIds, ...ids(hidden)].sort(), [...adversaries, ...allies].map(p => p.id).sort(), 'chaque participant est exactement une fois dans shown ou hidden');
});

test('la cible choisie qui est une alliée est affichée en première', () => {
  const adversaries = Array.from({ length: 10 }, (_, index) => person(`e${index + 1}`));
  const allies = Array.from({ length: 10 }, (_, index) => person(`a${index + 1}`));
  const { shown, hidden } = targetRowModel({ adversaries, allies, targetId: 'a3', actorId: 'pj1', engagedIds: ['e1', 'e2', 'e3', 'e4'] });
  assert.equal(shown.length, 4);
  assert.equal(shown[0].participant.id, 'a3');
  assert.equal(shown[0].group, 'Alliés');
  assert.deepEqual(ids(shown.slice(1)), ['e1', 'e2', 'e3']);
  assert.ok(!hidden.some(participant => participant.id === 'a3'));
});

test('neuf cibles : max personnalisé à 9 affiche tout, max à 8 donne le sous-ensemble prioritaire', () => {
  const adversaries = Array.from({ length: 6 }, (_, index) => person(`e${index + 1}`));
  const allies = Array.from({ length: 3 }, (_, index) => person(`a${index + 1}`));
  const custom = targetRowModel({ adversaries, allies, targetId: null, actorId: 'pj1', engagedIds: [], max: 9 });
  assert.equal(custom.shown.length, 9);
  assert.deepEqual(custom.hidden, []);
  const over = targetRowModel({ adversaries, allies, targetId: 'e6', actorId: 'pj1', engagedIds: ['a1'] });
  assert.deepEqual(ids(over.shown), ['e6', 'a1']);
  assert.equal(over.hidden.length, 7);
  const engagedOnly = targetRowModel({ adversaries, allies, targetId: null, actorId: 'pj1', engagedIds: ['e2', 'e3'] });
  assert.deepEqual(ids(engagedOnly.shown), ['e2', 'e3']);
  assert.equal(engagedOnly.hidden.length, 7);
});
