// Taille des PJ selon l'espèce lue sur la fiche (rappel du MJ, passation H point 5, 07/11/2026) :
// Halfelin/Halfling et Gnome Petits, Ogre Grand ; un Trait ou un champ explicite prime toujours.
import test from 'node:test';
import assert from 'node:assert/strict';
import { creatureSizeOf, planCreatureSize } from '../../../js/core/creature-size.js';

test('espèce de la fiche : Halfelin, Halfling et Gnome Petits, Ogre Grand, sans être « supposés »', () => {
  for (const race of ['Halfelin', 'halfling', 'Gnome', 'HALFELIN']) {
    const size = creatureSizeOf({ race });
    assert.equal(size.key, 'small', race);
    assert.equal(size.rank, 2, race);
    assert.equal(size.assumed, false, race);
  }
  const ogre = creatureSizeOf({ race: 'Ogre' });
  assert.equal(ogre.key, 'large');
  assert.equal(ogre.assumed, false);
});

test('les autres espèces et une espèce absente restent Moyennes supposées', () => {
  for (const race of ['Nain', 'Humain', 'Haut Elfe', '', undefined]) {
    const size = creatureSizeOf({ race });
    assert.equal(size.key, 'average', String(race));
    assert.equal(size.assumed, true, String(race));
  }
});

test('un Trait de Taille ou un champ explicite prime sur l’espèce', () => {
  assert.equal(creatureSizeOf({ race: 'Halfelin', traits: ['Taille (Moyenne)'] }).key, 'average');
  assert.equal(creatureSizeOf({ race: 'Ogre', size: 'enormous' }).key, 'enormous');
});

test('le plan de Taille d’un PJ Halfelin face à un Humain voit un écart d’un cran', () => {
  const plan = planCreatureSize({ race: 'Halfelin' }, { opponent: { race: 'Humain' } });
  assert.equal(plan.size.label, 'Petite');
  assert.equal(plan.versus.gap, 1);
  assert.equal(plan.versus.larger, 'opponent');
});
