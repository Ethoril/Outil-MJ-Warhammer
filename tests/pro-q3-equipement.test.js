import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readTrappings, readTraitItem } from '../tools/lib/bestiary-profile.mjs';
import { joinTrappings } from '../tools/lib/bestiary-record.mjs';

const find = (book, id) => JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')).profiles.find(profile => profile.id === id);

test('Q3 : une note à astérisque se sépare de la liste d’équipement', () => {
  const { items, notes } = readTrappings('Warpstone filling (15 GC), Piece of Warpstone (50 GC) *These fade away in 24 hours if Wuder discards all warpstone from his possession.');
  assert.deepEqual(items, ['Warpstone filling (15 GC)', 'Piece of Warpstone (50 GC)']);
  assert.deepEqual(notes, ['*These fade away in 24 hours if Wuder discards all warpstone from his possession.']);
});

test('Q3 : un Trait suivi d’un astérisque est conditionnel', () => {
  assert.equal(readTraitItem('Immunity (Fear)*').conditional, true);
  assert.equal(readTraitItem('Tough').conditional, undefined);
});

test('Q3 : un nom d’équipement à virgules internes se recolle', () => {
  assert.deepEqual(joinTrappings(['Notebook of Plans', 'Schemes', 'and Dirty Secrets', '2d0 Silver Shillings'], ['Notebook of Plans, Schemes, and Dirty Secrets']), ['Notebook of Plans, Schemes, and Dirty Secrets', '2d0 Silver Shillings']);
  assert.deepEqual(joinTrappings(['Cloak', 'Hat'], ['Notebook of Plans, Schemes, and Dirty Secrets']), ['Cloak', 'Hat']);
});

test('Q3 : Herveaux, Tyrkel, Helena et Wuder ont leur équipement', () => {
  const herveaux = find('L24', 'E0-P-818');
  assert.ok(herveaux.trappings.some(item => /^Poisoned Dagger \(.*Heartkill.*\)$/.test(item)));
  assert.ok(herveaux.trappings.includes("Servant's Clothing"));
  const tyrkel = find('L20', 'E0-P-628');
  assert.ok(tyrkel.trappings.some(item => /^Steam Powered Hydraulic Hook Prosthetic \(Counts as a Hand Weapon.*Entangle quality\)$/.test(item)));
  assert.ok(tyrkel.trappings.includes('Monocle') && tyrkel.trappings.includes('Leather Jack'));
  const helena = find('L20', 'E0-P-625');
  assert.ok(helena.trappings.includes('Notebook of Plans, Schemes, and Dirty Secrets'));
  assert.ok(!helena.trappings.includes('Schemes'));
  const wuder = find('L18', 'E0-P-564');
  assert.deepEqual(wuder.trappings, ['Warpstone filling (15 GC)', 'Piece of Warpstone (50 GC)']);
  assert.match(wuder.notes[0], /^\*These fade away in 24 hours/);
  assert.deepEqual(wuder.traits.filter(trait => trait.conditional).map(trait => trait.name), ['Immunity', 'Tough']);
});
