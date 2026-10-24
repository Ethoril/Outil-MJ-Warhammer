import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { printedV5Attacks, formatGaps } from '../tools/lib/bestiary-completeness.mjs';
import { JUSTIFIED_Q34 } from '../tools/lib/bestiary-justified.mjs';

const profile = (book, id) => JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')).profiles.find(item => item.id === id);

// L06 p.330 : « Bite: (70/+9) Lose Momentum to make this Free Attack, Penetrating Tail: (70/+8) … » — la qualité de la ligne précédente précède le nom suivant.
const DRAGON_ATTACKS = 'Attacks Claws: (70/+16) Bite: (70/+9) Lose Momentum to make this Free Attack, Penetrating Tail: (70/+8) Lose Momentum to make this Free Attack Armour';

test('Q34a : le contrôle lit « Penetrating Tail » comme la qualité puis l\'attaque Tail', () => {
  const dragon = profile('L06', 'E0-P-082');
  assert.deepEqual(formatGaps(dragon, DRAGON_ATTACKS, new Set(), new Set()).attacks, []);
  assert.ok(printedV5Attacks(DRAGON_ATTACKS).some(attack => attack.names.includes('tail')));
});

test('Q34a : une attaque réellement absente reste signalée malgré les suffixes', () => {
  const dragon = { ...profile('L06', 'E0-P-082'), attacks: [{ name: 'Claws', damage: 16 }, { name: 'Bite', damage: 9 }] };
  assert.deepEqual(formatGaps(dragon, DRAGON_ATTACKS, new Set(), new Set()).attacks, ['Penetrating Tail (70/+8)']);
});

test('Q34a : le chien (L06 p.325) garde la note du chien de ratier en note du profil', () => {
  const dog = profile('L06', 'E0-P-074');
  assert.ok(dog.notes.some(note => /Rat Catchers/.test(note) && /Trained \(Broken, Fetch, War\)/.test(note)));
  assert.ok(dog.optionalTraits.some(trait => trait.name === 'Trained' && trait.param === 'Broken, Drive, Entertain, Fetch, Guard, Magic, War'));
});

test('Q34a : les talents du voisin sont justifiés par page, pas retirés des profils', () => {
  for (const id of ['E0-P-158', 'E0-P-161', 'E0-P-069']) assert.match(JUSTIFIED_Q34[id].talents, /L0[36] p\.\d+/);
  const karstin = profile('L03', 'E0-P-158').talents.map(item => item.name);
  assert.ok(!karstin.includes('Relentless') && karstin.includes('Gregarious'));
  const thug = profile('L06', 'E0-P-069').talents.map(item => item.name);
  assert.deepEqual(thug, ['Briber', 'Cardsharp', 'Iron Jaw', 'Very Strong']);
});
