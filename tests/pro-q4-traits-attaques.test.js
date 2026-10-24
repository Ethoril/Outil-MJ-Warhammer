import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';

const book = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const L17 = book('L17');
const L20 = book('L20');
const L21 = book('L21');
const L22 = book('L22');
const L26 = book('L26');
const find = (list, id) => list.find(profile => profile.id === id);

test('Q4 : Carrion (L22) a des actions, dont 2 Griffes', () => {
  const participant = buildParticipantFromBestiary('E0-P-757', { library: L22 });
  assert.ok(participant.actions.length >= 2);
  const record = find(L22, 'E0-P-757');
  assert.ok(record.attacks.some(attack => attack.count === 2 && /claws/i.test(attack.name)), JSON.stringify(record.attacks));
});

test('Q4 : Hattie Adler (L20) et les carcasses (L21) ont une attaque', () => {
  assert.ok(find(L20, 'E0-P-641').attacks.length >= 1);
  const carcasses = L21.filter(profile => /CARCASS/i.test(profile.name));
  assert.ok(carcasses.length >= 2);
  for (const record of carcasses) assert.ok(record.attacks?.length >= 1, record.name);
});

test('Q4 : les trois Élémentaires incarnés ont une Immunité', () => {
  const elementals = L17.filter(profile => /Incarnate Elemental/.test(profile.name));
  assert.equal(elementals.length, 3);
  for (const record of elementals) assert.ok(record.traits.some(trait => trait.name === 'Immunity' && trait.param), record.name);
});

test('Q4 : la précision « see below » est nettoyée (Reik Eels, L26)', () => {
  for (const record of L26) for (const trait of record.traits || []) assert.ok(!/^see\b/i.test(trait.param || ''), `${record.name} ${trait.name}`);
});
