import test from 'node:test';
import assert from 'node:assert/strict';
import { defenseOptions, defaultDefenseValue } from '../js/ui/resolution-panel.js';

const target = { caracs: { CC: 41, Ag: 33 } };

test('défense : CC, Ag, jets à base numérique puis « Autre », dans cet ordre', () => {
  const options = defenseOptions(target, [
    { note: 'Épée', base: 45, mod: 5, type: 'attack' },
    { id: 'esq', name: 'Esquive', base: '38', type: 'defense' }
  ]);
  assert.deepEqual(options.map(option => option.value), ['CC', 'Ag', 'jet:index-0', 'jet:esq', 'Autre']);
  assert.deepEqual(options.map(option => option.label), ['CC · 41', 'Ag · 33', 'Épée · 50', 'Esquive · 38', 'Autre (valeur libre)']);
  assert.deepEqual(options.map(option => option.group), ['caracs', 'caracs', 'jets', 'jets', 'autre']);
  assert.equal(options[2].base, 50);
  assert.equal(options[2].statLabel, 'Épée');
  assert.equal(options[2].type, 'attack');
  assert.equal(options[3].type, 'defense');
  assert.equal(options[4].base, null);
});

test('défense : bases non numériques ignorées, l’index reste celui de la liste complète', () => {
  const options = defenseOptions({ caracs: { CC: null } }, [
    { note: 'Vide', base: '' },
    { note: 'Nul', base: null },
    { note: 'Caractéristique', base: 'Ag' },
    { base: 30 }
  ]);
  assert.deepEqual(options.map(option => option.value), ['CC', 'Ag', 'jet:index-3', 'Autre']);
  assert.equal(options[0].label, 'CC · —');
  assert.equal(options[0].base, null);
  assert.equal(options[2].statLabel, 'Jet');
});

test('défense : jet proposé d’office = premier jet défensif, sinon CC', () => {
  const plain = defenseOptions(target, [{ note: 'Épée', base: 45, type: 'attack' }]);
  assert.equal(defaultDefenseValue(plain), 'CC');
  assert.equal(defaultDefenseValue(defenseOptions(target)), 'CC');
  const withDefense = defenseOptions(target, [
    { note: 'Épée', base: 45, type: 'attack' },
    { note: 'Esquive', base: 38, type: 'defense' },
    { note: 'Parade', base: 50, type: 'defense' }
  ]);
  assert.equal(defaultDefenseValue(withDefense), 'jet:index-1');
});
