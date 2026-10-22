import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecord, buildAttacks, buildArmour, assignKeywords, cleanSkills } from '../tools/lib/bestiary-record.mjs';
import { validateBestiaryRecord, BESTIARY_STAT_KEYS } from '../js/core/bestiary-profiles.js';
import { skillNameFr } from '../tools/lib/bestiary-glossary.mjs';

const context = {
  canonical: name => ({ Bestial: 'Bestial', Skittish: 'Skittish', Size: 'Size', Bite: 'Bite', Weapon: 'Weapon', Armour: 'Armour', Web: 'Web', Venom: 'Venom', Wallcrawler: 'Wallcrawler', Arboreal: 'Arboreal', 'Dark Vision': 'Dark Vision', Belligerent: 'Belligerent' })[name] || null,
  traitRefs: new Map([['Bestial', 'E0-T-005'], ['Bite', 'E0-T-006']]),
  displayName: name => name.replace(/\b([A-Z])([A-Z]+)\b/g, (_, first, rest) => first + rest.toLowerCase()),
  referential: undefined
};
const entry = (id, name, kind = 'profile') => ({ id, name, book: 'L06', page: 325, physicalPage: 325, kind, abilityRefs: [] });

// Sanglier du livre de base V5 (p. 325) : valeurs imprimées.
const boar = {
  key: 'L06:325:0', title: 'BOAR',
  stats: { M: 7, CC: 35, CT: null, F: 35, E: 40, I: 35, Ag: 35, Dex: null, Int: 10, FM: 10, Soc: null, W: 12 },
  attacks: [{ name: 'Hooves and Tusks', value: 40, damage: 6 }, { name: 'Horns', value: 40, damage: 7, detail: 'Tusks', tail: 'Free Attack only when Charging' }],
  armour: { toughnessBonus: 4, parts: [{ name: 'Hide', ap: 1, optional: false }] },
  skills: [{ name: 'Melee (Brawling)', value: 40 }, { name: 'Perception', value: 40 }, { name: 'Stealth (Rural)', value: 40 }],
  traits: [{ name: 'Bestial' }, { name: 'Skittish' }],
  optional: [{ name: 'Belligerent' }, { name: 'Size', param: 'Large' }]
};
// Araignée Arachnarok du Zoo (V4) : « Armour 3 (7) », « Bite +9 », « Weapon (Fangs) +9 ».
const arachnarok = {
  key: 'L11:13:0', title: 'ARACHNAROK SPIDER',
  stats: { M: 5, CC: 50, CT: 35, F: 55, E: 45, I: 20, Ag: 40, Dex: 30, Int: 35, FM: 45, Soc: 10, W: 136 },
  traits: [{ name: 'Armour', rating: '3', printed: 7 }, { name: 'Arboreal' }, { name: 'Dark Vision' }, { name: 'Size', param: 'Monstrous' }, { name: 'Wallcrawler' }],
  attackTraits: [{ name: 'Bite', rating: '+9' }, { name: 'Weapon', param: 'Fangs', rating: '+9' }, { name: 'Web', rating: '50' }, { name: 'Venom' }],
  specialRules: ['Vicious Webs']
};

test('D1 : les valeurs imprimées sont conservées telles quelles (aucun BF, Taille ni armure ajoutés)', () => {
  const record = buildRecord(boar, entry('E0-P-073', 'BOAR'), context);
  assert.equal(record.wounds, 12);
  const { W, ...printed } = boar.stats;
  assert.equal(W, record.wounds);
  assert.deepEqual(record.stats, printed, 'caractéristiques absentes = null, jamais 0');
  assert.deepEqual(record.attacks.map(a => [a.name, a.value, a.damage, a.free ?? null]), [['Hooves and Tusks', 40, 6, null], ['Horns', 40, 7, 'charge']]);
  assert.deepEqual(record.armour, { toughnessBonus: 4, parts: [{ name: 'Hide', ap: 1 }] });
  assert.equal(record.name, 'Boar');
  assert.deepEqual(record.traits.map(t => t.name), ['Bestial', 'Skittish']);
  assert.equal(record.traits[0].ref, 'E0-T-005');
  assert.deepEqual(record.optionalTraits.map(t => t.name), ['Belligerent', 'Size']);
  assert.deepEqual(record.keywords, ['sanglier'], 'le plus précis : Bestial (Bête) est déjà ancêtre de Sanglier');
  assert.equal(validateBestiaryRecord(record).length, 0, validateBestiaryRecord(record).join(' ; '));
});

test('D1 : format V4/Zoo — Armour 3 (7) garde ses deux chiffres, les attaques sont des dégâts imprimés', () => {
  const record = buildRecord(arachnarok, entry('E0-P-024', 'ARACHNAROK SPIDER'), context);
  assert.deepEqual(record.armour, { ap: 3, printedTotal: 7 });
  assert.deepEqual(record.attacks.map(a => [a.name, a.damage, a.trait]), [['Bite', 9, 'Bite'], ['Fangs', 9, 'Weapon']]);
  assert.equal(record.size, 'monstrous');
  assert.deepEqual(record.traits.map(t => t.name), ['Arboreal', 'Dark Vision', 'Size', 'Wallcrawler', 'Bite', 'Web', 'Venom']);
  assert.equal(record.traits.find(t => t.name === 'Web').rating, '50');
  assert.deepEqual(record.specialRules, ['Vicious Webs']);
  assert.equal(validateBestiaryRecord(record).length, 0);
});

test('D1 : attaques, armure et mots-clés — cas limites', () => {
  assert.deepEqual(buildAttacks({ attacks: [{ name: 'Bow and Arrows', value: 35, damage: 7, optional: true, tail: '50 yards, Impale, Reload 1' }] }, []),
    [{ name: 'Bow and Arrows', value: 35, damage: 7, optional: true, rangeYards: 50, qualities: ['Impale', 'Reload 1'] }]);
  assert.deepEqual(buildAttacks({}, [{ name: 'Weapon', weapons: [{ name: 'Warhammer', damage: 9 }, { name: 'Sword', damage: 7 }] }]).map(a => [a.name, a.damage]), [['Warhammer', 9], ['Sword', 7]]);
  assert.deepEqual(buildAttacks({}, [{ name: 'Weapon', rating: '+8' }]).map(a => [a.name, a.damage]), [['Weapon', 8]]);
  assert.equal(buildArmour({}, []), null);
  assert.deepEqual(assignKeywords('GIANT RAT', []), ['rat'], 'n-gramme le plus long : jamais « Géant »');
  assert.deepEqual(assignKeywords('HUMAN HONOUR GUARD (SILVER 3)', []), ['humain']);
  assert.deepEqual(assignKeywords('HIGH ELF OR WOOD ELF', []).sort(), ['elfe-sylvain', 'haut-elfe']);
  assert.deepEqual(assignKeywords('DRUCHII ELITE WARRIOR', []), ['elfe-noir']);
  assert.deepEqual(assignKeywords('Skaven Gutter Runner', []), ['skaven']);
  assert.deepEqual(assignKeywords('Wolfgard Hohmann', [{ name: 'Mark of Chaos', param: 'Khorne' }]), ['khorne']);
});

test('D1 : compétences — seules les compétences connues et chiffrées sont gardées, noms français du livre FR', () => {
  const { kept, dropped } = cleanSkills([{ name: 'Melee (Basic)', value: 65 }, { name: 'Consume Alcohol', value: 55 }, { name: 'Language (Magick)', value: 72 }, { name: 'Reduce all Skills by', value: 10 }, { name: 'Lore (Politics 65', value: 65 }, { name: 'Dodge', value: null }]);
  assert.deepEqual(kept.map(s => [s.name, s.nameFr, s.value]), [['Melee (Basic)', 'Corps à corps (Base)', 65], ['Consume Alcohol', 'Résistance à l’alcool', 55], ['Language (Magick)', 'Langue (Magick)', 72]]);
  assert.equal(dropped.length, 3);
  assert.equal(skillNameFr('Stealth (Rural)').nameFr, 'Discrétion (Rurale)');
  assert.equal(skillNameFr('Lore (Zorglub)').verified, false);
});

test('D1 : le validateur refuse un profil incohérent', () => {
  const good = buildRecord(boar, entry('E0-P-073', 'BOAR'), context);
  const mutate = patch => validateBestiaryRecord({ ...structuredClone(good), ...patch });
  assert.ok(mutate({ id: 'x' }).some(m => /identifiant/.test(m)));
  assert.ok(mutate({ wounds: 0 }).some(m => /Blessures/.test(m)));
  assert.ok(mutate({ stats: { ...good.stats, CT: 0.5 } }).some(m => /CT/.test(m)));
  assert.ok(mutate({ stats: { ...good.stats, Dex: undefined } }).some(m => /Dex/.test(m)));
  assert.ok(mutate({ attacks: [{ name: 'x', damage: 'BF+4' }] }).some(m => /dégâts/.test(m)));
  assert.ok(mutate({ keywords: ['inconnu'] }).some(m => /mot-clé/.test(m)));
  assert.ok(mutate({ kind: 'dragon' }).some(m => /genre/.test(m)));
  assert.deepEqual(BESTIARY_STAT_KEYS, ['M', 'CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc']);
  const template = { id: 'E0-P-112', book: 'L06', page: 353, physicalPage: 353, kind: 'template', name: 'Soldier', nameFr: null, modifiers: { CC: 10, E: 10 }, skills: [{ name: 'Cool', nameFr: 'Calme', value: 10, modifier: true }] };
  assert.deepEqual(validateBestiaryRecord(template), []);
  assert.ok(validateBestiaryRecord({ ...template, modifiers: { CC: 'x' } }).length > 0);
});
