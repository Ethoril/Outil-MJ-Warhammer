import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { colonize, completenessGaps, extendedGaps, normalizeBlockText } from '../tools/lib/bestiary-completeness.mjs';

const load = id => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles;
const byId = (profiles, id) => profiles.find(profile => profile.id === id);
const names = list => (list || []).map(item => item.name);
const skill = (profile, name) => (profile.skills || []).find(item => item.name === name);

// Q40 : rubriques au singulier, listes facultatives complètes, alternatives « or Ranged (…) » ; chaque cas relu sur sa page.

test('Q40 L11 : « Skill: » / « Talent: » au singulier (Raukos p.17, Corpse Render p.54, Wild Cat p.52, War Lion p.53)', () => {
  const book = load('L11');
  assert.equal(skill(byId(book, 'E0-P-008'), 'Melee (Fangs)').value, 75);
  const render = byId(book, 'E0-P-034');
  assert.equal(skill(render, 'Melee (Teeth)').value, 75);
  assert.deepEqual(render.talents, [{ name: 'Berserk Charge', rank: 3 }]);
  assert.ok(render.attacks.some(attack => attack.name === 'Teeth' && attack.damage === 10));
  assert.equal(skill(byId(book, 'E0-P-052'), 'Stealth (Rural)').value, 75);
  const lion = byId(book, 'E0-P-053');
  assert.equal(skill(lion, 'Melee (Claws)').value, 65);
  assert.equal(skill(lion, 'Stealth (Rural)').value, 62);
  assert.ok(lion.attacks.some(attack => attack.name === 'Claws' && attack.damage === 10));
});

test('Q40 L11 : dernier élément d\'une liste facultative (Razorgor « Territorial », Leviathan, Siren, Fen Worm)', () => {
  const book = load('L11');
  assert.ok(names(byId(book, 'E0-P-009').optionalTraits).includes('Territorial'));
  const leviathan = byId(book, 'E0-P-054');
  assert.deepEqual(names(leviathan.optionalTraits), ['Magic Resistance', 'Painless']);
  assert.deepEqual(leviathan.optionalSpecialRules, ['Cult (Fanatical or Chaos)']);
  const siren = byId(book, 'E0-P-056');
  assert.deepEqual(siren.optionalTraits.filter(trait => ['Armour', 'Fear'].includes(trait.name)).map(trait => `${trait.name} ${trait.rating}`), ['Armour 1-3', 'Fear 1-2']);
  assert.equal(siren.optionalTraits.find(trait => trait.name === 'Tentacles').count, 2);
  assert.deepEqual(byId(book, 'E0-P-033').optionalSpecialRules, ['Fanatical Cultists']);
});

test('Q40 L11 : ligne « Optional Traits » après les paragraphes de règle (Dread Maw p.23)', () => {
  const maw = byId(load('L11'), 'E0-P-012');
  assert.deepEqual(names(maw.optionalTraits), ['Corrosive Blood', 'Horns', 'Infected', 'Size']);
  assert.equal(maw.optionalTraits.find(trait => trait.name === 'Horns').rating, '+9');
  assert.deepEqual(maw.specialRules, ['Slime']);
  // Les Traits imprimés restent ceux de la ligne « Traits » : les paragraphes de règle ne sont pas des Traits.
  assert.ok(names(maw.traits).includes('Burrow'));
});

test('Q40 L11 : « Optional: Swarm » suivi du titre de sa règle (L07 Fireleech p.168, Brainfluke, Bloodwasp, Blue-Ringed Asp)', () => {
  const book = load('L07');
  for (const id of ['E0-P-275', 'E0-P-276', 'E0-P-279', 'E0-P-288']) {
    const swarm = names(byId(book, id).optionalTraits);
    assert.ok(swarm.includes('Swarm'), id);
    assert.ok(swarm.every(name => name.length < 30), `${id} : plus de prose dans les options`);
  }
});

test('Q40 L26 : Carrion « Trained (War). » sans le point ni les notes (E0-P-984 p.118)', () => {
  const carrion = byId(load('L26'), 'E0-P-984');
  assert.deepEqual(carrion.optionalTraits.at(-1), { name: 'Trained', param: 'War', ref: 'E0-T-060' });
});

test('Q40 L11 : alternative « or Ranged (…) » et options d\'attaque (Warlock Engineer p.95, Night Goblins p.28)', () => {
  const book = load('L11');
  const engineer = byId(book, 'E0-P-061');
  const pistol = engineer.attacks.find(attack => attack.name === 'Warplock Pistol');
  assert.deepEqual([pistol.damage, pistol.optional, pistol.ranged], [9, true, true]);
  assert.ok(engineer.attacks.find(attack => attack.name === 'Warp Blade' && attack.ranged) && !engineer.attacks.find(attack => attack.name === 'Warp Blade' && attack.ranged).optional);
  assert.ok(names(engineer.optionalTraits).includes('Mutation'));
  const goblins = byId(book, 'E0-P-016');
  assert.ok(names(goblins.optionalTraits).includes('Stealthy'));
  assert.deepEqual(goblins.notes, ['Option: Ranged (Net 3) (6)']);
});

test('Q40 : options qui modifient le profil gardées en note (Great Wolf, Griffon, Wyvern, River Troll) ; consigne du MJ (Mutant L06 p.347)', () => {
  const book = load('L11');
  assert.deepEqual(byId(book, 'E0-P-007').notes, ['Option: Remove Bestial, Territorial, & Trained — Add 15 Fel']);
  assert.deepEqual(byId(book, 'E0-P-011').notes, ['Option: Remove Bestial — Add +20 Fel']);
  assert.ok(byId(book, 'E0-P-019').notes[0].includes('Change W to 42'));
  assert.deepEqual(byId(book, 'E0-P-030').notes, ['Option: Remove Stupid — Add Stealthy']);
  assert.ok(names(byId(book, 'E0-P-019').optionalTraits).includes('Trained'));
  assert.deepEqual(byId(load('L06'), 'E0-P-105').notes, ['Optional Traits: Any Creature Traits the GM feels appropriate']);
});

test('Q40 L06 : le paragraphe d\'ambiance qui suit les Traits facultatifs n\'en fait pas partie (Bog Octopus p.328)', () => {
  const octopus = byId(load('L06'), 'E0-P-079');
  assert.deepEqual(names(octopus.optionalTraits), ['Grim', 'Size', 'Territorial']);
});

// ---- Contrôle de complétude : les trois angles morts de Q40, sur des blocs imprimés réduits à l'essentiel ----

const TALENTS = new Set(['reactive strike']);
const gaps = (record, raw) => {
  const block = colonize(normalizeBlockText(raw));
  return { ...completenessGaps(record, block, TALENTS), ...extendedGaps(record, block) };
};
const base = { skills: [], talents: [], traits: [], trappings: [], attacks: [] };

test('Q40 contrôle : « Skill: » et « Talent: » au singulier sont lus (Raukos)', () => {
  const raw = ' 4 55 - 45 40 35 30 - 25 35 20 30 Traits: Armour 1 (5), Night Vision Attack Traits: Weapon (Fangs) +8 Skill: Melee (Fangs) 75 Talent: Reactive Strike (2)';
  const record = { ...base, traits: [{ name: 'Night Vision' }], attacks: [{ name: 'Fangs', damage: 8 }] };
  const found = gaps(record, raw);
  assert.deepEqual(found.skills, ['Melee (Fangs) 75']);
  assert.deepEqual(found.talents, ['reactive strike']);
  const complete = { ...record, skills: [{ name: 'Melee (Fangs)', value: 75 }], talents: [{ name: 'Reactive Strike (2)' }] };
  assert.deepEqual([gaps(complete, raw).skills, gaps(complete, raw).talents], [[], []]);
});

test('Q40 contrôle : le dernier élément d\'une liste « Optional: » absent du profil est signalé (Razorgor)', () => {
  const raw = ' 7 45 - 55 45 33 35 - 5 30 - 32 Traits: Armour 1 (5), Bestial Attack Traits: Horns (Tusks) +10 Optional: Corruption (Minor), Infected, Territorial';
  const record = { ...base, traits: [{ name: 'Bestial' }], attacks: [{ name: 'Tusks', damage: 10, trait: 'Horns' }], optionalTraits: [{ name: 'Corruption' }, { name: 'Infected' }] };
  assert.deepEqual(gaps(record, raw).optional, ['Territorial']);
  assert.deepEqual(gaps({ ...record, optionalTraits: [...record.optionalTraits, { name: 'Territorial' }] }, raw).optional, []);
});

test('Q40 contrôle : une ligne « Optional Traits » entière absente est signalée, la prose voisine ne l\'est pas (Dread Maw)', () => {
  const raw = ' 3 45 30 55 55 15 20 - 15 35 - 36 Traits: Armour 3 (8), Bestial Attack Traits: Bite (Cavernous Maw) +10 Slime: Wounds caused ignore Armour Points. Optional Traits: Corrosive Blood, Horns (Hooked Spines) +9, Size (Enormous, Monstrous)';
  const record = { ...base, traits: [{ name: 'Bestial' }], attacks: [{ name: 'Cavernous Maw', damage: 10, trait: 'Bite' }] };
  assert.deepEqual(gaps(record, raw).optional, ['Corrosive Blood', 'Horns (Hooked Spines) +9', 'Size (Enormous, Monstrous)']);
});

test('Q40 contrôle : l\'arme après « or » de la ligne « Attack Traits » est une attaque imprimée (Warlock Engineer)', () => {
  const raw = ' 5 40 30 30 30 35 40 30 25 20 15 11 Traits: Armour 2 (6), Night Vision Attack Traits: Ranged (Warp Blade) +7 (48) or Ranged (Warplock Pistol) +9 (20), Weapon (Warp Blade) +10';
  const record = { ...base, traits: [{ name: 'Night Vision' }], attacks: [{ name: 'Warp Blade', damage: 7, rangeYards: 48 }, { name: 'Warp Blade', damage: 10 }] };
  assert.deepEqual(gaps(record, raw).attacks, ['Ranged (Warplock Pistol) +9', 'portée de Ranged (Warplock Pistol) +9 (20)']);
});
