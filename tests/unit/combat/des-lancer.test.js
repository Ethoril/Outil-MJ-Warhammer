import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diceFormulasOf, rollFormula } from '../../../js/ui/dice-buttons.js';

// Recette du 04/11/2026 : toute saisie de dé reçoit un bouton « Lancer » ; le libellé dit quel dé tirer.
test('dés lus dans le libellé', () => {
  assert.deepEqual(diceFormulasOf('d100 de Taureau (score 38)').map(row => row.text), ['d100']);
  assert.deepEqual(diceFormulasOf('Tempête : déplacement 2d10 mètres').map(row => row.text), ['2d10']);
  assert.deepEqual(diceFormulasOf('Dé secondaire : Durée / États (1d10 ou 2d10)').map(row => row.text), ['d10', '2d10']);
  assert.deepEqual(diceFormulasOf('Modificateur V5 (DR)'), []);
});

test('tirage dans les bornes', () => {
  assert.equal(rollFormula({ count: 2, sides: 10 }, () => 0), 2);
  assert.equal(rollFormula({ count: 2, sides: 10 }, () => 0.999), 20);
  assert.equal(rollFormula({ count: 1, sides: 100 }, () => 0.5), 51);
});
