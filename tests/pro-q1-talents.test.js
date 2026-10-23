import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isCatalogueTalent } from '../tools/lib/bestiary-record.mjs';

const book = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const names = (profiles, id) => profiles.find(profile => profile.id === id)?.talents?.map(talent => talent.name) || [];
const byName = (profiles, name) => profiles.find(profile => profile.name === name);

test('Q1 : un nom du catalogue n’est jamais du bruit', () => {
  for (const name of ['Iron Will', 'Strike to Stun', 'Master of Disguise', 'Break and Enter', 'Suffuse With', 'Blood of Aenarion']) assert.ok(isCatalogueTalent(name), name);
  assert.ok(!isCatalogueTalent('The creature flees when hurt'));
});

test('Q1 : Nastassia, Count Jäger et le Combat Familiar gardent leurs talents à plusieurs mots', () => {
  const l18 = names(book('L18'), book('L18').find(profile => profile.name.startsWith('Nastassia')).id);
  assert.ok(l18.includes('Master of Disguise') && l18.includes('Tower of Memories'), l18.join(', '));
  const jager = byName(book('L20'), 'Count Jäger');
  const jagerNames = jager.talents.map(talent => talent.name);
  for (const name of ['Break and Enter', 'Master of Disguise', 'Nose for Trouble']) assert.ok(jagerNames.includes(name), name);
  const familiar = book('L17').find(profile => profile.name === 'Combat Familiar');
  assert.ok(familiar.talents.some(talent => /^Suffuse With/.test(talent.name)));
});
