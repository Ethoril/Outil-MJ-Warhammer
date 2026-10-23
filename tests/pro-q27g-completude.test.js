import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalTalentName } from '../tools/lib/bestiary-record.mjs';

const profile = id => JSON.parse(readFileSync('js/data/bestiary/L22.json', 'utf8')).profiles.find(item => item.id === id);
const names = list => (list || []).map(item => item.name);

test('Q27g : « Doomed! » est le talent Doomed (Jan Guterwass, L22 p.62)', () => {
  assert.equal(canonicalTalentName('Doomed! (Find Thy Path and Stray Not)'), 'Doomed (Find Thy Path and Stray Not)');
  assert.deepEqual(names(profile('E0-P-739').talents), ['Doomed (Find Thy Path and Stray Not)', 'Flee!']);
});

test('Q27g : Blightking (L22 p.77) a ses cinq objets sans le texte de la colonne voisine et Melee (Two-Handed)', () => {
  const blightking = profile('E0-P-745');
  assert.equal(blightking.trappings.length, 5);
  assert.equal(blightking.trappings[4], 'A Thirst for Battle and the Diseased End of All Things');
  assert.ok(blightking.skills.some(skill => skill.name === 'Melee (Two-Handed)' && skill.value === 80));
});

test('Q27g : Behram Gundarson (L22 p.78) garde Tunnel Rat comme talent', () => {
  assert.ok(names(profile('E0-P-746').talents).includes('Tunnel Rat'));
});

test('Q27g : Wilhelm Koch (L22 p.103) a son équipement et sa Corruption mentale', () => {
  const koch = profile('E0-P-754');
  assert.deepEqual(koch.trappings, ['Roughspun Robes over Leather Jack', 'Dagger', 'Pick']);
  assert.ok(koch.traits.some(trait => trait.name === 'Mental Corruption' && trait.param === 'Erratic Fantasist, Suspicious Mind'));
});
