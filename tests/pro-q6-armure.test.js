import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';

const book = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const library = ['L13', 'L18', 'L19', 'L20', 'L21', 'L23', 'L26'].flatMap(book);
const build = id => buildParticipantFromBestiary(id, { library });

test('Q6 : « Body » limite le PA au corps (E0-P-628)', () => {
  assert.deepEqual(build('E0-P-628').armor, { head: 0, body: 1, arms: 0, legs: 0 });
});

test('Q6 : zones nommées multiples, Headband, Chest, Rear Legs', () => {
  assert.deepEqual(build('E0-P-615').armor, { head: 0, body: 1, arms: 1, legs: 0 });
  assert.deepEqual(build('E0-P-550').armor, { head: 1, body: 0, arms: 0, legs: 0 });
  assert.deepEqual(build('E0-P-639').armor, { head: 0, body: 3, arms: 0, legs: 0 });
  assert.deepEqual(build('E0-P-459').armor, { head: 0, body: 0, arms: 0, legs: 1 });
});

test('Q6 : « Mail Coat 2 » prend les zones de la cotte de mailles du catalogue (corps et bras)', () => {
  const participant = build('E0-P-556');
  assert.deepEqual(participant.armor, { head: 0, body: 2, arms: 2, legs: 0 });
  assert.equal(participant.notes, '');
});

test('Q6 : « Helm 2, Plate 3 » : casque à la tête, plastron au corps', () => {
  assert.deepEqual(build('E0-P-575').armor, { head: 2, body: 3, arms: 0, legs: 0 });
});

test('Q6 : « Body 2 » nomme la zone sans catalogue', () => {
  assert.deepEqual(build('E0-P-627').armor, { head: 0, body: 2, arms: 0, legs: 0 });
});

test('Q6 : pièce inconnue ou sans valeur → PA à 0 et rappel visible', () => {
  for (const id of ['E0-P-593', 'E0-P-616', 'E0-P-704']) {
    const participant = build(id);
    assert.deepEqual(participant.armor, { head: 0, body: 0, arms: 0, legs: 0 }, id);
    assert.match(participant.notes, /Armure imprimée/, id);
  }
});

test('Q6 : la fiche de la bibliothèque affiche `detail`', () => {
  assert.match(readFileSync('js/ui/bestiary-library.js', 'utf8'), /armour\.detail/);
});
