import { test } from 'node:test';
import assert from 'node:assert/strict';
import { circumstanceGroup, countActiveCircumstances, circumstanceControls } from '../../../js/ui/resolution-panel/dom.js';

test('les champs identifiés rejoignent leur groupe, avec priorité aux saisies obligatoires', () => {
  assert.equal(circumstanceGroup('protection-calm', true), 'required');
  assert.equal(circumstanceGroup('v5-kind'), 'combat');
  assert.equal(circumstanceGroup('choice:weather'), 'combat');
  assert.equal(circumstanceGroup('context:targetEngaged'), 'combat');
  assert.equal(circumstanceGroup('defense-kind'), 'defense');
  assert.equal(circumstanceGroup('v5Advantages'), 'fortune');
  assert.equal(circumstanceGroup('talent-fields'), 'talents');
  assert.equal(circumstanceGroup('ammunition'), 'weapon');
  assert.equal(circumstanceGroup('choice:scatterDirectionRoll'), 'weapon');
  assert.equal(circumstanceGroup('magic-context'), 'magic');
  assert.equal(circumstanceGroup('unknown'), 'other');
});

test('le compteur ignore les valeurs par défaut et les cases décochées', () => {
  assert.equal(countActiveCircumstances([
    { type: 'checkbox', checked: false },
    { type: 'checkbox', checked: true },
    { type: 'number', value: '0', defaultValue: '0' },
    { type: 'number', value: '2', defaultValue: '0' },
    { type: 'select-one', value: '', defaultValue: '' },
    { type: 'select-one', value: 'pass', defaultValue: '' },
    { type: 'select-multiple', value: '["a","b"]', defaultValue: '["a"]' }
  ]), 4);
});

test('une sélection multiple prend en compte toutes les options choisies', () => {
  const element = {
    type: 'select-multiple', tagName: 'SELECT', dataset: {}, name: '', id: '',
    getAttribute: () => 'Cibles', closest: () => null,
    selectedOptions: [{ value: 'a' }, { value: 'b' }]
  };
  const [control] = circumstanceControls({ querySelectorAll: () => [element] });
  assert.equal(control.value, '["a","b"]');
  assert.equal(countActiveCircumstances([{ ...control, defaultValue: '["a"]' }]), 1);
});

test('les valeurs déjà renseignées sont comparées aux défauts déclarés dès le premier rendu', () => {
  const base = { name: '', id: '', getAttribute: () => 'Réglage', closest: () => null };
  const elements = [
    { ...base, tagName: 'INPUT', type: 'number', dataset: { defaultValue: '2' }, value: '3', defaultValue: '' },
    { ...base, tagName: 'SELECT', type: 'select-one', dataset: {}, options: [{ value: '' }, { value: 'true' }], value: 'true' },
    { ...base, tagName: 'INPUT', type: 'number', dataset: { defaultValue: '2' }, value: '2', defaultValue: '' }
  ];
  assert.equal(countActiveCircumstances(circumstanceControls({ querySelectorAll: () => elements })), 2);
});
