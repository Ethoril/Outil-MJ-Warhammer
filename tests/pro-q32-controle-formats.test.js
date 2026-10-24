import test from 'node:test';
import assert from 'node:assert/strict';
import { colonize, completenessGaps, extendedGaps, formatGaps, normalizeBlockText } from '../tools/lib/bestiary-completeness.mjs';

const TALENTS = new Set(['acute sense', 'attractive', 'combat reflexes', 'craftsman', 'etiquette', 'in-fighter', 'nose for trouble', 'read/write', 'briber', 'cardsharp']);
const TRAITS = new Set(['hatred', 'night vision', 'many heads', 'regeneration', 'size', 'bestial', 'breath']);
const gaps = (record, raw) => {
  const block = colonize(normalizeBlockText(raw));
  const parts = [completenessGaps(record, block, TALENTS), extendedGaps(record, block), formatGaps(record, block, TALENTS, TRAITS)];
  const merged = {};
  for (const part of parts) for (const [key, list] of Object.entries(part)) merged[key] = [...new Set([...(merged[key] || []), ...list])];
  return merged;
};
const empty = { skills: [], talents: [], traits: [], trappings: [], attacks: [] };

test('Q32 : rubriques sans deux-points (L06, L09, L10), compétences et équipement contrôlés', () => {
  const raw = ' Attacks Dagger: (50/+6) Armour Toughness Bonus: 4 Skills Charm 35, Dodge 35 Talents Briber: Advantage on Bribery Tests Trappings Dagger, Leather Jack';
  const found = gaps({ ...empty, skills: [{ name: 'Dodge', value: 35 }] }, raw);
  assert.deepEqual(found.skills, ['Charm 35']);
  assert.deepEqual(found.trappings, ['Dagger', 'Leather Jack']);
  assert.deepEqual(found.talents, ['briber']);
});

test('Q32 : « Nom : description » (L09 « Traits and Talents ») : chaque nom du catalogue ou des Traits doit être gardé', () => {
  const raw = ' Attacks Sword (85/+8) Armour Toughness Bonus: 3 Skills Athletics 60 Traits and Talents Hatred (High Elves, Morandors): See Hatred in the WFRP Core Rulebook. Night Vision: See clearly for 20 yards. Combat Reflexes: Combat Initiative counts as 70. Read/Write: Can read and write. Trappings Sword';
  const record = { ...empty, skills: [{ name: 'Athletics', value: 60 }], traits: [{ name: 'Hatred' }, { name: 'Night Vision' }], attacks: [{ name: 'Sword', damage: 8 }], trappings: ['Sword'] };
  const found = gaps(record, raw);
  assert.deepEqual(found.talents, ['combat reflexes', 'read/write']);
  assert.deepEqual(found.traits, []);
  assert.deepEqual(gaps({ ...record, talents: [{ name: 'Combat Reflexes' }, { name: 'Read/Write' }] }, raw).talents, []);
});

test('Q32 : « Traits Continued » est aussi lu', () => {
  const raw = ' Attacks Bite (60/+8) Armour Toughness Bonus: 4 Skills Climb 60 Traits Bestial: Animal behaviour. Traits Continued Regenerate: Regain 1d10 Wounds. Size (Large): See the Core Rulebook. Trappings None';
  const found = gaps({ ...empty, skills: [{ name: 'Climb', value: 60 }], traits: [{ name: 'Bestial' }], attacks: [{ name: 'Bite', damage: 8 }] }, raw);
  assert.deepEqual(found.traits, ['regenerate', 'size']);
});

test('Q32 : liste à virgule oubliée (« Acute Sense (Taste) Attractive » = deux talents) et césure (« Infighter » = In-fighter)', () => {
  const raw = ' Attacks Walking Stick (21/+3) Armour Toughness Bonus: 3 Skills Athletics 40 Traits and Talents Acute Sense (Taste) Attractive, Craftsman (Cook), Infighter, Nose for Trouble Trappings Walking Stick';
  const record = { ...empty, skills: [{ name: 'Athletics', value: 40 }], attacks: [{ name: 'Walking Stick', damage: 3 }], trappings: ['Walking Stick'], talents: [{ name: 'Acute Sense (Taste)' }, { name: 'Craftsman (Cook)' }, { name: 'Nose for Trouble' }] };
  assert.deepEqual(gaps(record, raw).talents, ['attractive', 'in-fighter']);
  assert.deepEqual(gaps({ ...record, talents: [...record.talents, { name: 'Attractive' }, { name: 'In-fighter' }] }, raw).talents, []);
});

test('Q32 : attaques de la ligne Attacks (V5) et Souffle imprimé dans cette ligne', () => {
  const raw = ' Attacks Talons (45/+14) Bite (45/+8) Lose Momentum to make this free attack Breath (Fire or Poison): See the WFRP Core Rulebook for details of Breath attacks Armour Toughness Bonus: 5 Skills Track 25';
  const record = { ...empty, skills: [{ name: 'Track', value: 25 }], attacks: [{ name: 'Talons', value: 45, damage: 14 }, { name: 'Bite', value: 45, damage: 8 }] };
  assert.deepEqual(gaps(record, raw).attacks, ['Breath (Fire or Poison)']);
  assert.deepEqual(gaps({ ...record, traits: [{ name: 'Breath', param: 'Fire or Poison' }] }, raw).attacks, []);
  assert.deepEqual(gaps({ ...record, attacks: [record.attacks[0]], traits: [{ name: 'Breath' }] }, raw).attacks, ['Bite (45/+8)']);
});

test('Q32 : le nom d’une attaque V5 est la fin du texte qui précède, pas la phrase du livre (Sea Dragon L09 p.84)', () => {
  const raw = ' Attacks Lose Momentum to make this free attack Tail (70/+9) Repeater Handbow and Bolts: (75/+7) range of 10 yards Armour Toughness Bonus: 3 Skills Track 25';
  const record = { ...empty, skills: [{ name: 'Track', value: 25 }] };
  assert.deepEqual(gaps(record, raw).attacks, ['Tail (70/+9)', 'Repeater Handbow and Bolts (75/+7)']);
});

test('Q32 : un bloc au format à deux-points n’est pas modifié par colonize', () => {
  const raw = ' Traits: Armour 2 Skills: Athletics 45 Talents: Combat Reflexes Trappings: Club';
  assert.equal(colonize(raw), raw);
});
