import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countActiveCircumstances } from '../../../js/ui/resolution-panel/dom.js';

// C45 (recette 3.34.0, G-U1-5) : une case cochée par défaut (attribut de Vent sur un ennemi, cible du sort)
// n'est pas une circonstance du MJ ; seul un écart avec la valeur par défaut compte.
const box = (checked, defaultChecked) => ({ type: 'checkbox', checked, defaultChecked, value: 'on', defaultValue: 'on' });

test('C45 case cochée par défaut : non comptée ; décochée par le MJ : comptée', () => {
  assert.equal(countActiveCircumstances([box(true, true)]), 0);
  assert.equal(countActiveCircumstances([box(false, true)]), 1);
});

test('C45 case décochée par défaut : cochée par le MJ comptée', () => {
  assert.equal(countActiveCircumstances([box(false, false)]), 0);
  assert.equal(countActiveCircumstances([box(true, false)]), 1);
  assert.equal(countActiveCircumstances([box(true)]), 1, 'sans valeur par défaut déclarée : comportement historique');
});

test('C45 circumstanceControls lit data-default-checked sur les cases rendues', async () => {
  const { circumstanceControls } = await import('../../../js/ui/resolution-panel/dom.js');
  const field = (checked, defaults) => ({ tagName: 'INPUT', type: 'checkbox', checked, defaultChecked: false, value: 'on', defaultValue: 'on', dataset: defaults ? { defaultChecked: 'true' } : {}, getAttribute: () => 'Appliquer l’attribut de Vent à Brute', closest: () => null });
  const controls = circumstanceControls({ querySelectorAll: () => [field(true, true)] });
  assert.equal(controls[0].defaultChecked, true);
  assert.equal(countActiveCircumstances(controls), 0);
});
