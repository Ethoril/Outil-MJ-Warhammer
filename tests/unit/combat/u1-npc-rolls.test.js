import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyNpcRolls } from '../../../js/ui/resolution-panel/dom.js';

test('sélectionne uniquement les dés PNJ vides et disponibles', () => {
  const rolls = [
    { field: 'attack', owner: 'PNJ', value: '' },
    { field: 'defense', owner: 'PJ', value: '' },
    { field: 'engaged:a', owner: 'PNJ', value: '42' },
    { field: 'engaged:b', owner: 'PNJ', value: '  ' },
    { field: 'engaged:c', owner: 'PNJ', value: '', disabled: true }
  ];
  assert.deepEqual(emptyNpcRolls(rolls).map(row => row.field), ['attack', 'engaged:b']);
});
import { rollMisfortuneDie } from '../../../js/ui/resolution-panel/dom.js';
test('relance les résultats 91–100 de Multiplication d’infortune', () => {
  const values = [100, 91, 90];
  assert.equal(rollMisfortuneDie(() => values.shift()), 90);
  assert.deepEqual(values, []);
});
import { isMiscastDistanceD100 } from '../../../js/ui/resolution-panel/dom.js';
test('distance d’incident : seul le d100 est proposé', () => {
  assert.equal(isMiscastDistanceD100('MINOR', 40), true);
  assert.equal(isMiscastDistanceD100('MINOR', 55), true);
  assert.equal(isMiscastDistanceD100('MAJOR', 35), true);
  assert.equal(isMiscastDistanceD100('MAJOR', 20), false);
  assert.equal(isMiscastDistanceD100(null, null), false);
});
