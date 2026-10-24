import test from 'node:test';
import assert from 'node:assert/strict';
import { colonize, completenessGaps, extendedGaps, formatGaps, normalizeBlockText } from '../tools/lib/bestiary-completeness.mjs';

// Q38 : angles morts du contrôle. Rejeu sur les données de e49ea03 : Doomfire Warlock (L09 p.52) et Kelrathi (L09 p.104) sont signalés,
// Anointed (L09 p.51, liste de talents dans la description de Mark of Slaanesh) ne l'est pas à tort.
const TALENTS = new Set(['arcane magic', 'bookish', 'animal affinity', 'careful strike', 'blather', 'attractive', 'combat master']);
const TRAITS = new Set(['hatred', 'night vision', 'ward', 'venom', 'mark of slaanesh']);
const gaps = (record, raw) => {
  const block = colonize(normalizeBlockText(raw));
  const parts = [completenessGaps(record, block, TALENTS), extendedGaps(record, block), formatGaps(record, block, TALENTS, TRAITS)];
  const merged = {};
  for (const part of parts) for (const [key, list] of Object.entries(part)) merged[key] = [...new Set([...(merged[key] || []), ...list])];
  return merged;
};
const empty = { skills: [], talents: [], traits: [], trappings: [], attacks: [] };

test('Q38 « Ward 8+: » (nombre suivi de « + » avant les deux-points) est lu comme le Trait Ward', () => {
  const raw = ' Attacks Sword (40/+8) Armour Toughness Bonus: 3 Traits: Hatred (High Elves): See Hatred in the WFRP Core Rulebook. Night Vision: See clearly for 20 yards. Prey of the Dark Prince: they lose their Ward 8+ Trait. Ward 8+: Roll 1d10 after any blow is received: if the creature rolls 8 or higher, the blow is ignored. THE THANKLESS CHILD Supreme Sorceress';
  const record = { ...empty, attacks: [{ name: 'Sword', damage: 8 }], traits: [{ name: 'Hatred' }, { name: 'Night Vision' }] };
  assert.deepEqual(gaps(record, raw).traits, ['ward']);
  assert.deepEqual(gaps({ ...record, traits: [...record.traits, { name: 'Ward', param: '8+' }] }, raw).traits, []);
});

test('Q38 liste de talents après des descriptions, nom mal imprimé et virgule oubliée (« Arcane Magick (Beasts) Bookish »)', () => {
  const raw = ' Attacks Scalpel (52/+5) Armour Toughness Bonus: 3 Skills: Cool 80 Traits and Talents: Hatred (High Elves): See Hatred in the WFRP Core Rulebook. Venom (Difficult): Wounded opponents must pass an Endurance Test. Animal Affinity, Arcane Magick (Beasts) Bookish, Careful Strike Trappings: Book';
  const record = { ...empty, skills: [{ name: 'Cool', value: 80 }], attacks: [{ name: 'Scalpel', damage: 5 }], traits: [{ name: 'Hatred' }, { name: 'Venom' }], talents: [{ name: 'Animal Affinity' }, { name: 'Careful Strike' }], trappings: ['Book'] };
  assert.deepEqual(gaps(record, raw).talents, ['arcane magic', 'bookish']);
  assert.deepEqual(gaps({ ...record, talents: [...record.talents, { name: 'Arcane Magic (Beasts)' }, { name: 'Bookish' }] }, raw).talents, []);
});

test('Q38 une liste de talents incluse dans une description (Mark of Slaanesh) n’est pas un manque', () => {
  const raw = ' Attacks Sword (85/+9) Armour Toughness Bonus: 4 Traits: Mark of Slaanesh: Slaanesh has marked this creature. Additionally, they may purchase the following Talents as if they were Career Advances for the normal XP costs: Attractive, Blather, Careful Strike, Combat Master. Night Vision: See clearly for 20 yards. Optional Traits: Regenerate';
  const record = { ...empty, attacks: [{ name: 'Sword', damage: 9 }], traits: [{ name: 'Mark of Slaanesh' }, { name: 'Night Vision' }] };
  assert.deepEqual(gaps(record, raw).talents, []);
});
