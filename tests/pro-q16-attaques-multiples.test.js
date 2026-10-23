import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary, buildReserveProfileFromBestiary } from '../js/core/bestiary-profiles.js';

const book = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const L14 = book('L14');
const L22 = book('L22');

// Livre de base V5 (L06) p. 362 : « 8 Tentacles : la créature peut faire 8 attaques gratuites » ; p. 168 : une seule attaque
// supplémentaire par Tour en dépensant de l'Élan, mais les attaques gratuites de la créature sont celles que son profil imprime.

test('Q16 : Carrion (E0-P-757) a le Bec et deux attaques de Griffes sur le participant', () => {
  const participant = buildParticipantFromBestiary('E0-P-757', { library: L22 });
  const claws = participant.actions.filter(action => /^Claws/i.test(action.name));
  assert.equal(claws.length, 2, participant.actions.map(action => action.name).join(', '));
  assert.deepEqual(claws.map(action => action.name), ['Claws 1', 'Claws 2']);
  assert.ok(claws.every(action => action.damage === 7 && action.extensions.v5.multiAttack.of === 2));
  assert.deepEqual(claws.map(action => action.extensions.v5.multiAttack.index), [1, 2]);
  assert.equal(participant.actions.filter(action => /^Beak$/i.test(action.name)).length, 1);
});

test('Q16 : le Kraken (E0-P-488) a 8 attaques de Tentacles', () => {
  const participant = buildParticipantFromBestiary('E0-P-488', { library: L14 });
  const tentacles = participant.actions.filter(action => /^Tentacles/i.test(action.name));
  assert.equal(tentacles.length, 8);
  assert.equal(new Set(tentacles.map(action => action.name)).size, 8);
});

test('Q16 : une attaque seule garde son nom et n’a pas de marque multiple', () => {
  const participant = buildParticipantFromBestiary('E0-P-757', { library: L22 });
  const beak = participant.actions.find(action => action.name === 'Beak');
  assert.ok(beak);
  assert.equal(beak.extensions.v5.multiAttack, undefined);
});

test('Q16 : la copie dans la Réserve garde les attaques multiples', () => {
  const profile = buildReserveProfileFromBestiary('E0-P-488', { library: L14 });
  assert.equal(profile.diceLines.filter(action => /^Tentacles/i.test(action.name)).length, 8);
});
