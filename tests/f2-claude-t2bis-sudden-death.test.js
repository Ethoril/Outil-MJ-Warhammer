import test from 'node:test';
import assert from 'node:assert/strict';
import { previewSuddenDeath } from '../js/core/v5-critical-aftermath.js';

const options = { tableOptionEnabled: true, secondaryNpcConfirmed: true };
const person = (talents = [], states = []) => ({ id: 'extra', kind: 'Créature', hp: 0, talents, states, extensions: { v5: {} } });

test('mort subite refuse Chanceux importé comme libellé ou objet de talent', () => {
  assert.equal(previewSuddenDeath(person(['Chanceux']), options).status, 'ineligible');
  assert.equal(previewSuddenDeath(person([{ name: 'Chanceux' }]), options).status, 'ineligible');
});

test('mort subite ne repropose pas un figurant déjà rendu Inconscient', () => {
  assert.equal(previewSuddenDeath(person([], [{ key: 'inconscient', name: 'Inconscient' }]), options).status, 'ineligible');
});
