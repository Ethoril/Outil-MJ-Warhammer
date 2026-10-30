import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecord, buildAttacks, buildArmour, assignKeywords, cleanSkills, isCatalogueTalent, canonicalTalentName, splitGluedTalent, isTrappingName, joinTrappings } from '../../../tools/lib/bestiary-record.mjs';
import { validateBestiaryRecord, BESTIARY_STAT_KEYS, buildParticipantFromBestiary, buildReserveProfileFromBestiary, bestiarySpellLines } from '../../../js/core/bestiary-profiles.js';
import { skillNameFr } from '../../../tools/lib/bestiary-glossary.mjs';
import { blockAfter, completenessGaps, normalizeBlockText, printedSkills, printedTalents, extendedGaps, printedAttacks, printedSpells, printedTraits, printedTrappings, trappingNoise, recordSpellKeys, findValueRow, stackedBlock, veryIncomplete, colonize, formatGaps, printedV5Attacks, printedRanges } from '../../../tools/lib/bestiary-completeness.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { pageBlocks, splitSections, splitSections as blockSections, splitList } from '../../../tools/lib/bestiary-blocks.mjs';
import { readAttacks, listTraits, readSkills, readTrappings, readSpells, canonicalSpellLabel, spellNames, readTalents, readTraitItem, readArmour } from '../../../tools/lib/bestiary-profile.mjs';
import { repairGlyphs } from '../../../tools/lib/bestiary-glyphs.mjs';
import { resolveTalent } from '../../../js/core/reference-catalog.js';
import { JUSTIFIED, JUSTIFIED_Q34 } from '../../../tools/lib/bestiary-justified.mjs';

const book = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const load = id => JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles;
const byId = (profiles, id) => profiles.find(profile => profile.id === id);
const HEAD = 'M WS BS S T I Ag Dex Int WP Fel W';
const names = list => (list || []).map(item => item.name);
class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.className = ''; }
  set textContent(value) { this.text = String(value); }
  get textContent() { return (this.text ?? '') + this.children.map(child => child.textContent).join(' '); }
  append(...nodes) { this.children.push(...nodes); }
}
const find = (book, id) => load(book).find(profile => profile.id === id);
const profile = (book, id) => JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')).profiles.find(item => item.id === id);
const skill = (record, name) => record.skills.find(item => item.name === name)?.value;
const empty = { skills: [], talents: [], traits: [], trappings: [], attacks: [] };

describe('modèle de profil — valeurs imprimées et format V4/Zoo', () => {
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
});

describe('extraction — blocs, compétences et talents imprimés', () => {
const CATALOGUE = new Set(['iron will', 'alley cat', 'break and enter', 'master of disguise', 'nose for trouble', 'suffuse with', 'luck', 'fast hands', 'shadow', 'small']);
const JAEGER = normalizeBlockText(' M WS BS S T I Ag Dex Int WP Fel W 5 56 34 33 33 78 78 68 76 66 62 15 Traits: Blessed (Ranald), Dark Vision Skills: Athletics 93, Entertain (Acting 92, Conjuring Tricks 87,Storytelling 92), Language (Thief 96), Melee (Basic 76), Secret Signs (Thief ) 91, Stealth (Urban) 88 Talents: Alley Cat, Break and Enter, Luck 5, Master of Disguise, Nose for Trouble, Shadow Count Jäger Wild-eyed, theatrical, and ostentatiously ragged, old M WS BS S T I Ag Dex Int WP Fel W 4 1 1 1 1 1 1 1 1 1 1 1 Skills: Dodge 40');

test('Q0 : le bloc du profil s’arrête à l’en-tête suivant', () => {
  const block = blockAfter(JAEGER, 0);
  assert.ok(block.includes('Shadow Count'));
  assert.ok(!block.includes('Dodge 40'));
});

test('Q0 : compétences imprimées, avec une ou plusieurs spécialisations', () => {
  const keys = printedSkills(blockAfter(JAEGER, 0)).map(skill => skill.key);
  assert.deepEqual(keys, ['athletics||93', 'entertain|acting|92', 'entertain|conjuringtricks|87', 'entertain|storytelling|92', 'language|thief|96', 'melee|basic|76', 'secretsigns|thief|91', 'stealth|urban|88']);
});

test('Q0 : talents du catalogue imprimés, texte voisin ignoré', () => {
  assert.deepEqual(printedTalents(blockAfter(JAEGER, 0), CATALOGUE), ['alley cat', 'break and enter', 'luck', 'master of disguise', 'nose for trouble', 'shadow']);
});

test('Q0 : manques d’un profil incomplet, et aucun pour un profil complet', () => {
  const block = blockAfter(JAEGER, 0);
  const partial = { skills: [{ name: 'Athletics', value: 93 }, { name: 'Secret Signs (Thief)', value: 91 }], talents: [{ name: 'Alley Cat' }, { name: 'Luck', rank: 5 }, { name: 'Shadow' }] };
  const gaps = completenessGaps(partial, block, CATALOGUE);
  assert.deepEqual(gaps.talents, ['break and enter', 'master of disguise', 'nose for trouble']);
  assert.ok(gaps.skills.includes('Melee (Basic 76)') && gaps.skills.includes('Language (Thief 96)'));
  const full = { skills: printedSkills(block).map(skill => { const [g, s, v] = skill.key.split('|'); return { name: `${g}${s ? ` (${s})` : ''}`, value: Number(v) }; }), talents: ['Alley Cat', 'Break and Enter', 'Luck', 'Master of Disguise', 'Nose for Trouble', 'Shadow'].map(name => ({ name })) };
  assert.deepEqual(completenessGaps(full, block, CATALOGUE), { talents: [], skills: [] });
});

test('Q0 : une césure « Two- handed » est recollée', () => {
  assert.equal(normalizeBlockText('Melee (Two- handed 50)'), 'Melee (Two-handed 50)');
});
});

describe('extraction — talents du catalogue à plusieurs mots', () => {
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
});

describe('contrôle — attaques, Traits et alias imprimés', () => {
const KRAKEN = normalizeBlockText(' M WS BS S T I Ag Dex Int WP Fel W 6 45 � 80 75 35 55 35 10 65 � 224 Traits: Cold-blooded, Constrictor, Dark Vision, Grim 3, Hungry, Marine Creature, Size (Monstrous), Stealthy, 8 � Tentacles +9, Weapon (Beak) +12 Attack');
const LITHARYS = normalizeBlockText(' M WS BS S T I Ag Dex Int WP Fel W 6 82 81 32 46 87 77 55 85 84 60 19 Gold 5 Traits: Armour 2 (7), Ranged (Elf Bow) +8 (150) (Accurate, Damaging), Weapon (Sword) +9 Skills: Athletics 102 Talents: Luck 3 Petty Spells: Bearings, Dazzle, Reveal Magic Lore of Heavens: Divination, Drop Trappings: Courtly Garb, Elf Bow with 12 Elf Arrows, Sword THE INCANDESCENT SPEAR Litharys bears a spear forged in the time of Aenarion.');
const CARRION = normalizeBlockText(' M WS BS S T I Ag Dex Int WP Fel W 4 43 - 30 30 40 30 - 10 30 - 21 Traits: Creature Weapons (Beak +9, 2 Claws +7), Fear 3, Fly 100, Size (Large), Undead the neighbour column prose');

test('Q11 : attaques imprimées, multiplicateur « 8 × » et parenthèse conservés', () => {
  assert.deepEqual(printedAttacks(blockAfter(KRAKEN, 0)).map(attack => attack.key), ['tentacles|9|8', 'beak|12|1']);
  assert.deepEqual(printedAttacks(blockAfter(LITHARYS, 0)).map(attack => attack.key), ['elfbow|8|1', 'sword|9|1']);
  assert.deepEqual(printedAttacks(blockAfter(CARRION, 0)).map(attack => attack.key), ['beak|9|1', 'claws|7|2']);
});

test('Q11 : manque d’attaque signalé, aucun manque pour un profil complet', () => {
  const kraken = { traits: [{ name: 'Cold-blooded' }, { name: 'Constrictor' }, { name: 'Dark Vision' }, { name: 'Grim' }, { name: 'Hungry' }, { name: 'Marine Creature' }, { name: 'Size' }, { name: 'Stealthy' }], attacks: [{ name: 'Beak', damage: 12 }] };
  assert.deepEqual(extendedGaps(kraken, blockAfter(KRAKEN, 0)).attacks, ['8 - Tentacles +9']);
  kraken.attacks.push({ name: 'Tentacles', damage: 9, count: 8 });
  const gaps = extendedGaps(kraken, blockAfter(KRAKEN, 0));
  assert.deepEqual([gaps.attacks, gaps.traits, gaps.trappings, gaps.spells], [[], [], [], []]);
});

test('Q11 : Traits imprimés sans attaque ni armure ; alias et intitulé « Attack » collé', () => {
  assert.deepEqual(printedTraits(blockAfter(KRAKEN, 0)).map(trait => trait.label), ['Cold-blooded', 'Constrictor', 'Dark Vision', 'Grim 3', 'Hungry', 'Marine Creature', 'Size (Monstrous)', 'Stealthy']);
  const flyer = { traits: [{ name: 'Fly' }, { name: 'Fear' }, { name: 'Size' }, { name: 'Undead' }], attacks: [{ name: 'Beak', damage: 9 }, { name: 'Claws', damage: 7, count: 2 }] };
  assert.deepEqual(extendedGaps(flyer, blockAfter(CARRION, 0)).traits, []);
  assert.deepEqual(printedTraits(blockAfter(CARRION, 0)).map(trait => trait.label), ['Fear 3', 'Fly 100', 'Size (Large)', 'Undead']);
});

test('Q11 : équipement imprimé, la phrase de la colonne voisine met fin à la liste', () => {
  assert.deepEqual(printedTrappings(blockAfter(LITHARYS, 0)).map(item => item.label), ['Courtly Garb', 'Elf Bow with 12 Elf Arrows', 'Sword THE INCANDESCENT SPEAR Litharys bears a spear forged in the time of Aenarion.'].slice(0, 2));
  const gaps = extendedGaps({ trappings: ['Courtly Garb'], attacks: [], traits: [] }, blockAfter(LITHARYS, 0));
  assert.deepEqual(gaps.trappings, ['Elf Bow with 12 Elf Arrows']);
});

test('Q11 : bruit d’équipement repéré (phrase, minuscule, intitulé de rubrique)', () => {
  assert.deepEqual(trappingNoise({ trappings: ['Dagger', 'a grey cloak', 'Skills: Dodge 40', 'The Count is old'] }), ['a grey cloak', 'Skills: Dodge 40', 'The Count is old']);
});

test('Q11 : sorts imprimés par liste (Petty, Lore of X), le texte suivant est ignoré', () => {
  assert.deepEqual(printedSpells(blockAfter(LITHARYS, 0)).map(spell => spell.label), ['Bearings', 'Dazzle', 'Reveal Magic', 'Divination', 'Drop']);
  const gaps = extendedGaps({ spells: [{ lore: 'Petty', spells: ['Bearings', 'Dazzle'] }, 'Reveal Magic'], attacks: [], traits: [], trappings: ['Courtly Garb', 'Elf Bow with 12 Elf Arrows'] }, blockAfter(LITHARYS, 0));
  assert.deepEqual(gaps.spells, ['Divination', 'Drop']);
});

test('Q11 : un talent à rang imprimé dans la ligne Skills n’est pas une compétence (Lokhir L07)', () => {
  const block = normalizeBlockText(' M WS 1 Skills: Ambidextrous, Athletics 70, Dual Wielder 2, Melee (Basic) 95 Talents: Iron Will');
  assert.deepEqual(printedSkills(block, new Set(['dual wielder'])).map(skill => skill.key), ['athletics||70', 'melee|basic|95']);
});
});

describe('profils en colonnes imbriquées (L01)', () => {
test('Q12a : lignes vides laissées par le titre du voisin avant le corps (L01 p. 14, Ugrik)', () => {
  const page = [
    `   LEFT TITLE ONE                  ${' '.repeat(40)}RIGHT TITLE`,
    `                                   ${' '.repeat(40)}${HEAD}`,
    `               ${HEAD}`,
    `   6 41 32 58 52 11 32 25 22 33 26 36${' '.repeat(40)}6 48 30 53 50 22 33 25 25 33 22 36`,
    '',
    '',
    `   Traits: Armour 2, Weapon (Club +9)${' '.repeat(38)}Traits: Armour 1, Weapon (Bow +8)`
  ].join('\n');
  const blocks = pageBlocks(page);
  assert.equal(blocks.length, 2);
  assert.ok(blocks.every(block => /^Traits: Armour/.test(block.body)), JSON.stringify(blocks.map(block => block.body)));
});

test('Q12a : Base/Adv./Total, la ligne Total fait foi et les étiquettes restent lues (L01 p. 26)', () => {
  const page = [
    `          ${HEAD}`,
    '   Base 6 29 19 58 51 3 21 26 25 36 19 36',
    '   Adv. - - - +10 +10 - - +10 - - +7 -',
    '  Total 6 29 19 68 61 3 21 36 25 36 26 42',
    '  Skills: Athletics 26, Dodge 26',
    '  Talents: Large'
  ].join('\n');
  const [block] = pageBlocks(page);
  assert.deepEqual(block.cells.slice(3, 5), ['68', '61']);
  assert.deepEqual(Object.keys(splitSections(block.bodyLines).sections), ['Skills', 'Talents']);
});

test('Q12a : « Traits*: » conditionnel, note à astérisque séparée de la liste (L01 p. 79)', () => {
  const { sections } = splitSections(['Traits*: Fear 1, Frenzy, Immunity to Psychology', '', '*These Traits only come into play when enraged.', '', 'Skills: Charm 52']);
  assert.equal(sections.Traits, 'Fear 1, Frenzy, Immunity to Psychology');
  assert.equal(sections.Skills, 'Charm 52');
});

test('Q12a : « Fate Points », « Armour by Location » et « Special Rules » ne ferment pas le bloc', () => {
  const { sections, mode } = splitSections(['Traits: Weapon (Dagger) +6', 'Fate Points: 2', 'Skills: Charm 46', 'Trappings: Rope, 5d10 gc', 'Armour by Location: Head 2, Body 4', 'Special Rules: Contemplation, Palanquin']);
  assert.equal(mode, 'v4');
  assert.equal(sections.Trappings, 'Rope, 5d10 gc');
  assert.equal(sections.Traits, 'Weapon (Dagger) +6');
});

test('Q12a : profils L01-L04 vides remplis (Ugrik, Nazzaalta, Artur, Isabella, Doc Ashfield, Pedragar, Brunner, Albrecht)', () => {
  const l01 = load('L01');
  const ugrik = byId(l01, 'E0-P-124');
  assert.equal(ugrik.armour.ap, 1);
  assert.ok(ugrik.talents.some(talent => talent.name === 'Strike to Stun'));
  assert.ok(ugrik.skills.some(skill => skill.name === 'Ranged (Bow)' && skill.value === 35));
  assert.equal(byId(l01, 'E0-P-125').skills.length, 11);
  assert.equal(byId(l01, 'E0-P-126').skills.length, 13);
  const isabella = byId(l01, 'E0-P-136');
  assert.equal(isabella.talents.length, 9);
  assert.ok(isabella.traits.length >= 3 && isabella.traits.every(trait => trait.conditional === true));
  assert.deepEqual(byId(l01, 'E0-P-134').trappings, ['Ragged Clothing']);
  assert.equal(byId(load('L03'), 'E0-P-150').skills.length, 12);
  const l04 = load('L04');
  assert.equal(byId(l04, 'E0-P-173').skills.length, 27);
  assert.equal(byId(l04, 'E0-P-179').skills.length, 28);
  assert.equal(byId(l04, 'E0-P-179').talents.length, 18);
  assert.ok(byId(l04, 'E0-P-171').talents.length >= 20, 'Doomed: « … » ne coupe plus la liste de talents');
  assert.ok(byId(l04, 'E0-P-163').trappings.includes('Shield'));
});

test('Q12a : Nazzaalta et Artur portent la ligne Total imprimée (Force 68, Résistance 61, 42 Blessures)', () => {
  const artur = byId(load('L01'), 'E0-P-126');
  assert.deepEqual([artur.stats.F, artur.stats.E, artur.stats.Soc, artur.wounds], [68, 61, 26, 42]);
  assert.equal(byId(load('L01'), 'E0-P-125').stats.I, 21);
});

test('Q12a : Master and Commander (Q10b) retrouvé dans les livres relus', () => {
  assert.ok(load('L07').some(profile => (profile.talents || []).some(talent => talent.name === 'Master and Commander')));
});
});

describe('profils vides L07 à L12', () => {
test('Q12b : un bloc V4 dont le Trait « Armour 3 (9) » ouvre une ligne reste V4 (L12 p. 36, Boggrub)', () => {
  const { mode, sections } = splitSections(['Traits: Afraid (Elves), Animosity (Greenskins),', 'Armour 3 (9), Infected, Night Vision, Weapon +9', 'Skills: Cool 80, Dodge 65', 'Trappings: Helmet, Mail Shirt']);
  assert.equal(mode, 'v4');
  assert.match(sections.Traits, /Armour 3 \(9\)/);
  assert.equal(sections.Skills, 'Cool 80, Dodge 65');
});

test('Q12b : Boggrub Legbiter est complet (Traits, attaque, 9 compétences, 8 talents, équipement)', () => {
  const boggrub = byId(load('L12'), 'E0-P-422');
  assert.deepEqual(boggrub.armour, { ap: 3, printedTotal: 9 });
  assert.deepEqual(names(boggrub.traits), ['Afraid', 'Animosity', 'Infected', 'Night Vision']);
  assert.equal(boggrub.attacks[0].damage, 9);
  assert.equal(boggrub.skills.length, 9);
  assert.ok(boggrub.skills.some(skill => skill.name === 'Melee (Polearm)' && skill.value === 80));
  assert.equal(boggrub.talents.length, 8);
  assert.deepEqual(boggrub.trappings, ['Helmet', 'Mail Shirt', 'Sword', 'Shield', 'Spear']);
});

test('Q12b : « Weapons (Spear) +8 » (coquille du livre) est une attaque (Gutbug, L12 p. 37)', () => {
  const gutbug = byId(load('L12'), 'E0-P-423');
  assert.equal((gutbug.attacks || []).length, 2);
  assert.ok(gutbug.skills.some(skill => skill.name === 'Melee (Polearm)'));
});

test('Q12b : un blanc isolé au milieu des Compétences ne coupe pas la liste (Harboth, L12 p. 48)', () => {
  const harboth = byId(load('L12'), 'E0-P-426');
  assert.ok(harboth.skills.some(skill => skill.name === 'Perception' && skill.value === 70));
  assert.ok(harboth.skills.some(skill => skill.name === 'Ranged (Bow)' && skill.value === 55));
  assert.equal(harboth.talents.length, 8);
  assert.ok(harboth.trappings.includes('Helmet'));
});

test('Q12b : les profils V5 de L10 (Skeletal Witch, Crypt Ghast, Graug) ont leurs Traits et leur armure', () => {
  const l10 = load('L10');
  const witch = byId(l10, 'E0-P-371');
  assert.deepEqual(witch.armour.parts, [{ name: 'Armour', ap: 3 }]);
  assert.ok(names(witch.traits).includes('Undead'));
  const ghast = byId(l10, 'E0-P-373');
  assert.deepEqual(names(ghast.traits).slice(0, 3), ['Bite', 'Fearless', 'Frenzy']);
  const graug = byId(l10, 'E0-P-372');
  assert.deepEqual(graug.armour.parts, [{ name: 'Armour', ap: 4 }]);
  assert.ok(names(graug.traits).includes('Territorial'));
});

test('Q12b : un libellé centré qui dépasse la fenêtre, au-dessus du titre du voisin, est repris (L10 p. 68)', () => {
  const page = [
    `${' '.repeat(70)}CRYPT GHAST`,
    `${' '.repeat(70)}${HEAD}`,
    `${' '.repeat(70)}4 40 - 55 40 50 45 25 20 35 5 16`,
    '',
    `${' '.repeat(102)}Traits`,
    `${' '.repeat(70)}Bite +7, Fearless, Frenzy, Hungry,`,
    `${' '.repeat(70)}Venom (Hard), Weapon (Claws) +8`,
    '',
    `${' '.repeat(110)}CRYPT HORROR`,
    `${' '.repeat(94)}${HEAD}`,
    `${' '.repeat(94)}6 40 - 45 40 20 30 25 20 20 5 28`
  ].join('\n');
  const [ghast] = pageBlocks(page);
  assert.equal(ghast.bodyLines[0], 'Traits');
});

test('Q12b : « Traits and Talents » V5 sépare les talents du catalogue (Niels Vorberren, Grimes)', () => {
  const niels = byId(load('L10'), 'E0-P-378');
  assert.deepEqual(names(niels.talents), ['Marksman', 'Night Vision', 'Nimble-fingered', 'Roughrider', 'Tunnel Fighter']);
  assert.equal(niels.attacks.length, 2);
  assert.equal(niels.attacks[0].rangeYards, 50);
  assert.equal(byId(load('L10'), 'E0-P-392').attacks.length, 1);
});

test('Q12b : attaque V5 sans deux-points, la phrase de qualité de la précédente n\'est pas un nom', () => {
  const attacks = readAttacks('Bow (50/+7) range of 50 yards with the Impale Quality Hand Weapon (42/+6)');
  assert.deepEqual(attacks.map(attack => [attack.name, attack.value, attack.damage]), [['Bow', 50, 7], ['Hand Weapon', 42, 6]]);
});

test('Q12b : en-tête à cheval sur la gouttière, corps lu dans la colonne de droite (L10 p. 81, Niels)', () => {
  const niels = byId(load('L10'), 'E0-P-378');
  assert.equal(niels.stats.CC, 37);
  assert.deepEqual(niels.armour.parts.map(part => part.ap), [2]);
  assert.equal(niels.skills.length, 11);
  assert.ok(niels.trappings.includes('Light Warhorse'));
});

test('Q12b : Gretchen Beirne et Ranolf Quickfingers, étiquettes réordonnées par l\'extraction (relus sur la page)', () => {
  const l10 = load('L10');
  const gretchen = byId(l10, 'E0-P-380');
  assert.equal(gretchen.attacks[0].value, 28);
  assert.equal(gretchen.skills.length, 10);
  assert.deepEqual(gretchen.spells['Lore of Hedgecraft'], ['Goodwill', 'Part the Branches', 'Protective Charm']);
  const ranolf = byId(l10, 'E0-P-386');
  assert.equal(ranolf.attacks[0].name, 'Crowbar');
  assert.ok(names(ranolf.talents).includes('Fast Hands'));
});

test('Q12b : les profils L09 qui étaient vides (War Hydra, Sea Dragon, Dockside Thug, Dark Steed) ont des données', () => {
  const l09 = load('L09');
  for (const id of ['E0-P-315', 'E0-P-319', 'E0-P-323', 'E0-P-347']) {
    const profile = byId(l09, id);
    const count = ['traits', 'attacks', 'skills', 'talents', 'trappings'].reduce((sum, key) => sum + (profile[key] || []).length, 0);
    assert.ok(count > 0, `${id} ${profile.name} vide`);
  }
});

test('Q12b : paragraphe de règle spéciale entre les Traits et les Compétences (Forest Dragons, Fantasma, River Troll Hag)', () => {
  const l11 = load('L11');
  assert.ok(byId(l11, 'E0-P-017').skills.some(skill => skill.name === 'Melee (Root-like Claws)' && skill.value === 75));
  assert.ok(byId(l11, 'E0-P-031').skills.some(skill => skill.name === 'Channelling' && skill.value === 80));
  assert.deepEqual(names(byId(l11, 'E0-P-059').talents), ['Enclosed Fighter', 'Reaction Strike', 'Shadow']);
});

test('Q12b : aucun profil de L07 à L12 sans la moindre donnée hors caractéristiques', () => {
  for (const id of ['L07', 'L09', 'L10', 'L11', 'L12']) {
    for (const profile of load(id)) {
      if (profile.kind !== 'profile') continue;
      const count = ['traits', 'attacks', 'skills', 'talents', 'trappings'].reduce((sum, key) => sum + (profile[key] || []).length, 0);
      assert.ok(count > 0, `${id} ${profile.id} ${profile.name}`);
    }
  }
});
});

describe('profils L13 à L26', () => {
test('Q12c : un « : » dans une parenthèse ne coupe pas la liste des Traits (Great Eagle, L22 p. 73)', () => {
  const { traits, specialRules } = listTraits('Acute Sense (Vision: as Character Talent), Beak +8, 2 � Claws +6, Fear 1, Skittish', 'v4', new Set(['Acute Sense', 'Fear', 'Skittish']), 'traits');
  assert.equal(specialRules, undefined);
  assert.equal(traits.length, 5);
  assert.equal(traits[2].count, 2);
});

test('Q12c : Great Eagle a ses attaques (Bec, 2 Griffes) et le Talent Acute Sense imprimé dans ses Traits', () => {
  const eagle = byId(load('L22'), 'E0-P-742');
  assert.equal(eagle.attacks.length, 2);
  assert.equal(eagle.attacks[1].count, 2);
  assert.ok(names(eagle.talents).some(name => name.startsWith('Acute Sense')));
  assert.ok(!names(eagle.traits).includes('Acute Sense'));
});

test('Q12c : Ogre Gorger (L16 p. 83) : la rubrique « Options: » ne coupe plus le bloc (11 compétences, 9 talents, Traits facultatifs)', () => {
  const gorger = byId(load('L16'), 'E0-P-506');
  assert.equal(gorger.skills.length, 11);
  assert.equal(gorger.talents.length, 9);
  assert.deepEqual(names(gorger.optionalTraits), ['Fury', 'Mutation', 'Painless', 'Territorial', 'Wallcrawler']);
  assert.equal(blockSections(['Traits: Bite +8', '', 'Options: Fury, Mutation', '', 'Skills: Dodge 45']).sections.Skills, 'Dodge 45');
});

test('Q12c : Murderous Altdorfer (L21 p. 22, Frenzy dans la prose) et Josef Aufwiegler (L24 p. 19, arme imprimée « Talents: ») ne sont plus vides', () => {
  assert.deepEqual(names(byId(load('L21'), 'E0-P-667').traits), ['Frenzy']);
  const josef = byId(load('L24'), 'E0-P-822');
  assert.deepEqual(josef.attacks, [{ name: 'Fist', damage: 3, trait: 'Weapon' }]);
  assert.equal(josef.talents, undefined);
});

test('Q12c : Runesmithing (L16) est une compétence non traduite, valeur conservée', () => {
  const forgemaster = byId(load('L16'), 'E0-P-501');
  const rune = forgemaster.skills.find(skill => skill.name === 'Runesmithing');
  assert.equal(rune.value, 61);
  assert.equal(rune.frUnverified, true);
});

test('Q12c : compétences collées par une coquille du livre (« Basic 61 Polearm 51 », « 73. Warfare 78 », « (Guilder)40 »)', () => {
  const skills = readSkills('Melee (Basic 61 Polearm 51), Lore (Politics 73. Warfare 78), Secret Signs (Guilder)40');
  assert.deepEqual(skills.map(skill => `${skill.name} ${skill.value}`), ['Melee (Basic) 61', 'Melee (Polearm) 51', 'Lore (Politics) 73', 'Lore (Warfare) 78', 'Secret Signs (Guilder) 40']);
});

test('Q12c : les valeurs imprimées des profils réparés sont celles de la page', () => {
  const gorger = byId(load('L16'), 'E0-P-506');
  assert.deepEqual([gorger.stats.M, gorger.stats.CC, gorger.stats.F, gorger.stats.E, gorger.wounds], [6, 30, 55, 55, 46]);
});
});

describe('cas nommés — compétences, équipement et sorts (L14, L17, L18)', () => {
test('Q13 outil : « Language (Magick 74, Reikspiel) 48 » donne deux compétences (Grey Seer, L18 p. 97)', () => {
  const skills = readSkills('Channelling 71, Melee (Polearm) 53, Language (Magick 74, Reikspiel) 48');
  assert.deepEqual(skills.map(skill => [skill.name, skill.value]), [['Channelling', 71], ['Melee (Polearm)', 53], ['Language (Magick)', 74], ['Language (Reikspiel)', 48]]);
});

test('Q13 outil : le titre d\'un profil voisin et la description d\'un objet ne sont pas de l\'équipement (Combat Familiar L17 p. 182, Nastassia L18 p. 60)', () => {
  assert.deepEqual(readTrappings('Zweihander, Dagger POWER FAMILIAR but familiars may be used').items, ['Zweihander', 'Dagger']);
  const { items } = readTrappings('Mail Coat, Throat Slitter, Amulet of Thrice-Blessed Copper, Potion, Amulet of Thrice-Blessed Copper: A verdigris amulet worn by spies');
  assert.ok(items.every(item => !/:/.test(item)));
});

test('Q13 L14 : Litharys a son équipement et ses sorts, Fialthra n\'a plus de talent parasite, Ceyluii a ses sorts et son équipement', () => {
  const sea = load('L14');
  const litharys = byId(sea, 'E0-P-475');
  assert.ok(litharys.trappings.includes('Elf Bow with 12 Elf Arrows'));
  assert.ok(litharys.spells['Lore of Heavens'].includes('Divination'));
  const fialthra = byId(sea, 'E0-P-481');
  assert.ok(!names(fialthra.talents).some(name => /Dirt|Reveal Magic/.test(name)));
  assert.ok(fialthra.spells.Petty.includes('Reveal Magic'));
  assert.ok(names(fialthra.talents).some(name => name.startsWith('Arcane Magic (Beasts')));
  const ceyluii = byId(sea, 'E0-P-483');
  assert.deepEqual(ceyluii.trappings, ['Twig Spear']);
  assert.equal(Object.keys(ceyluii.spells).length, 2);
  assert.equal(ceyluii.talents.length, 19);
});

test('Q13 L14 : Kraken (8 × Tentacles +9) et Prince Dalloran (équipement non coupé)', () => {
  const sea = load('L14');
  const kraken = byId(sea, 'E0-P-488');
  assert.equal(kraken.attacks[0].name, 'Tentacles');
  assert.equal(kraken.attacks[0].count, 8);
  assert.equal(kraken.attacks[0].damage, 9);
  const dalloran = byId(sea, 'E0-P-472');
  assert.ok(dalloran.trappings.includes('Vaults containing vast wealth of coin, rare minerals, and magical items'));
});

test('Q13 L11 : Amoebae 2 × Tentacles +6', () => {
  const amoebae = byId(load('L11'), 'E0-P-027');
  assert.equal(amoebae.attacks[0].count, 2);
  assert.equal(amoebae.attacks[0].damage, 6);
});

test('Q13 L09 : Kharibdyss (Traits complets, 3 attaques) et Duriath Helbane (armure, Sword 90/+8)', () => {
  const book = load('L09');
  const hydra = byId(book, 'E0-P-318');
  assert.equal(hydra.attacks.length, 3);
  for (const trait of ['Amphibious', 'Belligerent', 'Constrictor', 'Distracting', 'Many Heads', 'Regeneration', 'Tracker', 'Venom']) assert.ok(names(hydra.traits).includes(trait), trait);
  const duriath = byId(book, 'E0-P-361');
  assert.deepEqual(names(duriath.armour.parts), ['Medium Armour', 'Sea Dragon Cloak']);
  assert.equal(duriath.armour.parts[0].ap, 3);
  assert.deepEqual(duriath.attacks.map(attack => [attack.name, attack.value, attack.damage]), [['Sword', 90, 8], ['Repeater Handbow and Bolts', 90, 6]]);
});

test('Q13 L18 : Zombie (attaque, Possessions, pas de parasite), Grey Seer (deux Langues), Nastassia (talents et objets entiers)', () => {
  const book = load('L18');
  const zombie = byId(book, 'E0-P-566');
  assert.equal(zombie.attacks[0].damage, 7);
  assert.deepEqual(zombie.trappings, ['Mail coat', 'helmet', 'axe']);
  const seer = byId(book, 'E0-P-557');
  assert.deepEqual(names(seer.skills).filter(name => name.startsWith('Language')), ['Language (Magick)', 'Language (Reikspiel)']);
  const nastassia = byId(book, 'E0-P-545');
  assert.ok(names(nastassia.talents).includes('Master of Disguise'));
  assert.ok(nastassia.trappings.includes('3 GCs in assorted denominations, but can can lay her hands on 100 GCs within an hour'));
  assert.ok(nastassia.trappings.every(item => !/Fast Quality/.test(item)));
});

test('Q13 L17 : Combat Familiar a Dagger et Zweihander, sans texte de la colonne voisine', () => {
  const familiar = byId(load('L17'), 'E0-P-528');
  assert.deepEqual(familiar.trappings, ['Zweihander', 'Dagger']);
  assert.deepEqual(familiar.attacks.map(attack => attack.name), ['Dagger', 'Zweihander']);
});

test('Q13 L04 : Gunna von Sperren a ses 17 talents imprimés', () => {
  const gunna = byId(load('L04'), 'E0-P-172');
  assert.equal(gunna.talents.length, 17);
  assert.ok(names(gunna.talents).includes('Super Numerate'));
});
});

describe('sorts — intitulés, listes et rendu de fiche', () => {
const library = ['L07', 'L14', 'L17', 'L19', 'L26'].flatMap(load);

// Faux DOM minimal : assez pour lire le texte rendu.

test('Q14 outil : intitulés canoniques (Petty, Arcane, Lore of X, Domaine seul)', () => {
  assert.equal(canonicalSpellLabel('Petty Magic Spells'), 'Petty');
  assert.equal(canonicalSpellLabel('Petty Spells'), 'Petty');
  assert.equal(canonicalSpellLabel('Arcane Spells'), 'Arcane');
  assert.equal(canonicalSpellLabel('Arcane Magic and Lore Spells'), 'Arcane and Lore');
  assert.equal(canonicalSpellLabel('Lore of Death Magic'), 'Lore of Death');
  assert.equal(canonicalSpellLabel('Lore of Dark Magic'), 'Lore of Dark Magic');
  assert.equal(canonicalSpellLabel('Lore of Life Spells'), 'Lore of Life');
  assert.equal(canonicalSpellLabel('Witchcraft'), 'Lore of Witchcraft');
});

test('Q14 outil : numéros de page, renvois et césures ne sont pas des sorts', () => {
  assert.deepEqual(spellNames('Bless with Filth (page 109), Creeping Menace, Curse of 110 Crippling Pain, Curse of Ill- Fortune 137.'), ['Bless with Filth', 'Creeping Menace', 'Curse of Crippling Pain', 'Curse of Ill-Fortune']);
  assert.deepEqual(spellNames('Aethyric Armour, Ygethmor\'s Flaming Blizzard (see page 137)'), ['Aethyric Armour', 'Ygethmor\'s Flaming Blizzard']);
});

test('Q14 outil : les listes collées sont séparées, la prose va dans notes, jamais dans une liste', () => {
  const spells = readSpells({ Spells: 'Petty: Dart, Drain Arcane: Blast, Ward Light: Banishment Witchcraft: Blight', Arcane: 'Bolt, Ward Lore of Metal: Enchant Weapon' });
  assert.deepEqual(spells.Petty, ['Dart', 'Drain']);
  assert.deepEqual(spells.Arcane, ['Blast', 'Ward', 'Bolt']);
  assert.deepEqual(spells['Lore of Light'], ['Banishment']);
  assert.deepEqual(spells['Lore of Witchcraft'], ['Blight']);
  assert.deepEqual(spells['Lore of Metal'], ['Enchant Weapon']);
  const prose = readSpells({ Spells: 'Choose up to 3 spells from the Petty Magic list and up to 3 from a suitable magical Lore.' });
  assert.deepEqual(Object.keys(prose), ['notes']);
  // Une phrase du texte voisin qui commence par « Spells » n'est pas une liste (Doomfire Warlock, L09 p. 52).
  assert.deepEqual(readSpells({ Spells: 'from Colour Magic Lores, the Lore of Witchcraft' }), {});
});

test('Q14 L26 : Eusapia (p. 48, intitulé SPELLS centré) a ses trois listes', () => {
  const eusapia = byId(library, 'E0-P-940');
  assert.deepEqual(eusapia.spells, {
    Petty: ['Bearings', 'Careful Step', 'Dart', 'Warning'],
    Arcane: ['Bolt', 'Dark Vision', 'Terrifying', 'Ward'],
    'Lore of Beasts': ['Beast Master', 'Beast Tongue', 'Flock of Doom', 'The Amber Spear']
  });
  assert.ok(!eusapia.trappings.some(item => /Bearings|Petty|SPELLS/.test(item)));
});

test('Q14 L14 : Litharys a Petty et Lore of Heavens', () => {
  const litharys = byId(library, 'E0-P-475');
  assert.equal(litharys.spells.Petty.length, 8);
  assert.ok(litharys.spells['Lore of Heavens'].includes('Divination'));
});

test('Q14 L07 : la Brine Wife a ses listes après un blanc (Witchcraft, Necromancy)', () => {
  const brine = byId(library, 'E0-P-251');
  assert.deepEqual(brine.spells['Lore of Necromancy'], ['Raise Dead', 'Reanimate', 'Vanhel\'s Call']);
  assert.ok(brine.spells['Lore of Witchcraft'].includes('The Evil Eye'));
});

test('Q14 L17 / L19 : un Lore collé à la liste Arcane en est séparé, « Arcane and Lore » reste une liste', () => {
  const gelt = byId(library, 'E0-P-517');
  assert.ok(!gelt.spells.Arcane.some(name => /Lore of/.test(name)));
  assert.ok(gelt.spells['Lore of Metal'].includes('Crucible of Chamon'));
  const flett = byId(library, 'E0-P-594');
  assert.deepEqual(flett.spells.Petty, ['Drain', 'Produce Small Animal', 'Rot']);
  assert.ok(flett.spells['Arcane and Lore'].includes('Bless with Filth'));
  assert.ok(!flett.talents.some(talent => /Petty Magic Petty Magic/.test(talent.name)));
});

test('Q14 : un sort n\'est jamais un talent ni un objet', () => {
  for (const profile of library) {
    const spellNamesOf = Object.values(profile.spells || {}).flat();
    const talentNames = (profile.talents || []).map(talent => talent.name);
    for (const name of ['Bearings', 'Careful Step', 'Dazzle']) {
      if (spellNamesOf.includes(name)) {
        assert.ok(!talentNames.includes(name), `${profile.id} ${name} talent`);
        assert.ok(!(profile.trappings || []).some(item => item.includes(name)), `${profile.id} ${name} équipement`);
      }
    }
  }
});

test('Q14 participant : les sorts du profil sont dans extensions.v5.bestiary.spells, pas dans participant.spells', () => {
  const participant = buildParticipantFromBestiary('E0-P-940', { library });
  assert.deepEqual(participant.extensions.v5.bestiary.spells.Petty, ['Bearings', 'Careful Step', 'Dart', 'Warning']);
  // participant.spells ouvrirait la Focalisation et le choix de sort avec des noms anglais sans contrat.
  assert.equal(participant.spells, undefined);
  assert.notEqual(participant.extensions.v5.bestiary.spells, byId(library, 'E0-P-940').spells);
  const reserve = buildReserveProfileFromBestiary('E0-P-940', { library });
  assert.deepEqual(reserve.extensions.v5.bestiary.spells['Lore of Beasts'].length, 4);
  assert.equal(buildParticipantFromBestiary('E0-P-475', { library }).extensions.v5.bestiary.spells.Petty.length, 8);
});

test('Q14 régénération : L06 (Dragon, Dog) et L16 (Brokk, Thurma, Nanna) gardent ce que Q13 leur avait fait perdre', () => {
  const core = load('L06');
  const dragon = byId(core, 'E0-P-082');
  assert.deepEqual(dragon.attacks.map(attack => attack.name), ['Claws', 'Bite', 'Tail']);
  assert.equal(dragon.attacks[1].free, 'momentum');
  const dog = byId(core, 'E0-P-074');
  assert.ok(dog.optionalTraits.some(trait => trait.name === 'Trained' && /Drive/.test(trait.param)));
  const dwarfs = load('L16');
  assert.ok(byId(dwarfs, 'E0-P-498').trappings.includes('Crown of Karak Norn'));
  assert.ok(byId(dwarfs, 'E0-P-499').trappings.includes('Bronze belt inscribed with 2 Runes of Warding'));
  assert.ok(byId(dwarfs, 'E0-P-502').trappings.includes('Bandages'));
});

test('Q14 contrôle : le champ spells par liste est lu, la prose de notes n\'est pas un sort', () => {
  const keys = recordSpellKeys({ spells: { Petty: ['Bearings'], 'Lore of Life': ['Barkskin'], spells: ['Dart'], notes: ['Choose up to 3 spells'] } });
  assert.deepEqual([...keys].sort(), ['barkskin', 'bearings', 'dart']);
  assert.deepEqual(printedSpells('Spells Petty: Bearings, Dart Trappings Dagger, Robes').map(spell => spell.label), ['Bearings', 'Dart']);
});

test('Q14 lecture : bestiarySpellLines écrit une ligne par liste', () => {
  assert.deepEqual(bestiarySpellLines({ Petty: ['A', 'B'], 'Lore of Life': ['C'], spells: ['D'], notes: ['Choose up to 3 spells.'], vide: [] }), ['Petty : A, B', 'Lore of Life : C', 'Sorts : D', 'Choose up to 3 spells.']);
  assert.deepEqual(bestiarySpellLines(undefined), []);
});

test('Q14 fiche de la bibliothèque et fiche du participant : les sorts sont affichés', async () => {
  const previous = globalThis.document;
  globalThis.document = { createElement: tag => new Node(tag) };
  try {
    const { renderBestiarySheet } = await import('../../../js/ui/bestiary-library.js');
    const sheet = renderBestiarySheet(byId(library, 'E0-P-940'), { terms: new Map() });
    assert.match(sheet.textContent, /Sorts : Petty : Bearings, Careful Step, Dart, Warning ; Arcane : Bolt/);
    const { renderFicheDetails } = await import('../../../js/ui/fiche-details.js');
    const participant = buildParticipantFromBestiary('E0-P-940', { library });
    const details = renderFicheDetails(participant);
    assert.match(details.textContent, /Sorts du profil \(bestiaire\) \(3\)/);
    assert.match(details.textContent, /Lore of Beasts/);
    assert.match(details.textContent, /Beast Master, Beast Tongue, Flock of Doom, The Amber Spear/);
  } finally {
    if (previous === undefined) delete globalThis.document; else globalThis.document = previous;
  }
});
});

describe('normalisation des noms et glyphes U+FFFD', () => {
test('Q15 : les glyphes U+FFFD sont rétablis d’après le glyphe réel du PDF (table par mot, rien de deviné)', () => {
  assert.equal(repairGlyphs('Language (Elth�rin 85)'), 'Language (Elthárin 85)');
  assert.equal(repairGlyphs('Map of Drakenh�henzug'), 'Map of Drakenhöhenzug');
  assert.equal(repairGlyphs('(counts as Zweih�nder)'), '(counts as Zweihänder)');
  assert.equal(repairGlyphs('Ph�\'s Protection'), 'Phâ\'s Protection');
  assert.equal(repairGlyphs('M�na\'s Marsh Magic, M�NA MIMN'), 'Mòna\'s Marsh Magic, MÒNA MIMN');
  assert.equal(repairGlyphs('Stolen Amulet of B�gen'), 'Stolen Amulet of Bögen');
  assert.equal(repairGlyphs('coins to a value of 22 GCs, 11/�'), 'coins to a value of 22 GCs, 11/–');
  assert.equal(repairGlyphs('(Chaos � Tzeentch)'), '(Chaos – Tzeentch)');
  assert.equal(repairGlyphs('d10 � 30 Gold Crown'), 'd10 × 30 Gold Crown');
  assert.equal(repairGlyphs('lists:\n� Petty Magic\n� The Lore of Nurgle'), 'lists:\n• Petty Magic\n• The Lore of Nurgle');
  // Un glyphe inconnu reste visible (jamais deviné).
  assert.equal(repairGlyphs('X�Y'), 'X�Y');
});

test('Q15 : aucun U+FFFD dans les 23 livres', () => {
  const files = readdirSync('js/data/bestiary').filter(name => /^L\d+\.json$/.test(name));
  assert.ok(files.length >= 23);
  for (const file of files) assert.ok(!readFileSync(`js/data/bestiary/${file}`, 'utf8').includes('�'), file);
});

test('Q15 : noms corrigés dans les profils', () => {
  const names = id => JSON.stringify(book(id));
  assert.ok(names('L10').includes('Language (Elthárin)'));
  assert.ok(names('L12').includes('Zweihänder'));
  assert.ok(names('L17').includes('Phâ\'s Protection'));
  assert.ok(names('L17').includes('Mòna\'s Marsh Magic'));
  assert.ok(names('L26').includes('Stolen Amulet of Bögen'));
});

test('Q15 : « Read/ Write » et les variantes de nom sont rattachés au nom du catalogue', () => {
  assert.equal(canonicalTalentName('Read/ Write'), 'Read/Write');
  assert.equal(canonicalTalentName('Warleader'), 'War Leader');
  assert.equal(canonicalTalentName('Fleet Footed'), 'Fleet-footed');
  assert.equal(canonicalTalentName('Public Speaking'), 'Public Speaker');
  assert.equal(canonicalTalentName('Resistance (Chaos)'), 'Resistant (Chaos)');
  assert.equal(canonicalTalentName('Strider (Coastal)'), 'Strider (Coastal)');
  assert.equal(canonicalTalentName('Iron Will'), 'Iron Will');
  // Nom collé au titre de la rubrique voisine (L19 p. 109 : « Warleader » puis « Stinging Tail: … »).
  assert.deepEqual(splitGluedTalent('Warleader Stinging Tail'), ['War Leader']);
  assert.deepEqual(splitGluedTalent('Flee! Noble Blood'), ['Flee!', 'Noble Blood']);
  assert.deepEqual(splitGluedTalent('War Wizard Slann'), ['War Wizard']);
  assert.deepEqual(splitGluedTalent('Iron Will'), ['Iron Will']);
  const all = ['L01', 'L02', 'L03', 'L04', 'L06', 'L07', 'L09', 'L10', 'L11', 'L12', 'L13', 'L14', 'L16', 'L17', 'L18', 'L19', 'L20', 'L21', 'L22', 'L23', 'L24', 'L25', 'L26'].flatMap(book);
  const talents = all.flatMap(profile => (profile.talents || []).map(talent => talent.name));
  for (const wrong of ['Read/ Write', 'Warleader', 'Fleet Footed', 'Public Speaking']) assert.ok(!talents.some(name => name.startsWith(wrong)), wrong);
  assert.ok(talents.includes('Read/Write'));
});

test('Q15 : « Read/Write » est reconnu par le résolveur', () => {
  assert.equal(resolveTalent('Read/Write')?.entry?.id, 'talent-read-write');
});
});

describe('extraction — compétences et spécialisations', () => {
const skill = (profile, name) => profile.skills?.find(entry => entry.name === name);

test('Q2 : une compétence à une seule spécialisation garde sa valeur', () => {
  assert.deepEqual(readSkills('Melee (Basic 76)').map(({ name, value }) => ({ name, value })), [{ name: 'Melee (Basic)', value: 76 }]);
  assert.deepEqual(readSkills('Entertain (Taunt) 27, Dodge +10').map(({ name, value }) => ({ name, value })), [{ name: 'Entertain (Taunt)', value: 27 }, { name: 'Dodge', value: 10 }]);
});

test('Q2 : les césures « Two- handed » et « Pole- arm » sont recollées', () => {
  const found = readSkills('Melee (Basic 65, Two- handed 50, Pole- arm 40)').map(({ name, value }) => `${name} ${value}`);
  assert.deepEqual(found, ['Melee (Basic) 65', 'Melee (Two-handed) 50', 'Melee (Polearm) 40']);
  assert.deepEqual(readSkills('Mêlée (Armes d’hast 40)').map(({ name }) => name), ['Mêlée (Armes d’hast)']);
});

test('Q2 : Count Jäger et le Combat Familiar ont leurs compétences', () => {
  const jager = book('L20').find(profile => profile.name === 'Count Jäger');
  assert.equal(skill(jager, 'Language (Thief)')?.value, 96);
  assert.equal(skill(jager, 'Melee (Basic)')?.value, 76);
  const familiar = book('L17').find(profile => profile.name === 'Combat Familiar');
  assert.equal(skill(familiar, 'Melee (Two-handed)')?.value, 50);
});
});

describe('contrôle — lignes de valeurs et profils incomplets', () => {
const CATALOGUE = new Set(['luck', 'shadow']);
const ROW = ['0', '70', '60', '70', '80', '60', '25', '10', '55', '60', '25', '232'];

test('Q25 : la ligne de valeurs ne peut pas commencer au milieu d’un nombre (Sea Dragon L09, M 10 lu comme 0)', () => {
  assert.equal(findValueRow(' 10 70 60 70 80 60 25 10 55 60 25 232 Attacks', ROW), -1);
  assert.ok(findValueRow(' 0 70 60 70 80 60 25 10 55 60 25 232 Attacks', ROW) >= 0);
  // Même borne à droite : « 232 » n’est pas la tête de « 2321 ».
  assert.equal(findValueRow(' 0 70 60 70 80 60 25 10 55 60 25 2321', ROW), -1);
});

test('Q25 : deux profils à la même ligne de valeurs, on prend celle qui suit le nom', () => {
  const text = ' OGRE UN M WS 6 41 32 xx ZEBRE DEUX M WS 6 41 32 xx';
  const row = ['6', '41', '32'];
  assert.equal(findValueRow(text, row, 'Zebre deux — Ogre'), text.lastIndexOf('6 41 32'));
  assert.equal(findValueRow(text, row, 'Ogre un'), text.indexOf('6 41 32'));
});

test('Q25 : profil très incomplet, rubriques sans deux-points (mise en page L09)', () => {
  const empty = { skills: [], talents: [], traits: [], trappings: [] };
  assert.equal(veryIncomplete(empty, ' Attacks Boat Hook (40/+8) Armour Skills Climb 45, Dodge 35').length, 1);
  assert.equal(veryIncomplete({ ...empty, skills: [{ name: 'Climb', value: 45 }] }, ' Skills Climb 45').length, 0);
  assert.equal(veryIncomplete(empty, ' Attacks Boat Hook (40/+8) Armour').length, 0);
});

test('Q25 : profils empilés, le rang n reçoit le n-ième groupe de rubriques (L01 p.14)', () => {
  const header = ' M WS BS S T I Ag Dex Int WP Fel W ';
  const page = `${header}6 41 32 58 52 11 32 25 22 33 26 36 UGRIK${header}6 48 30 53 50 22 33 25 25 33 22 36 Skills: Athletics 45 Trappings: Club Skills: Athletics 43 Trappings: Bow`;
  const text = normalizeBlockText(page);
  const first = text.indexOf('6 41 32');
  const second = text.indexOf('6 48 30');
  assert.ok(stackedBlock(text, first).includes('Athletics 45'));
  assert.ok(stackedBlock(text, second).includes('Athletics 43'));
  assert.ok(!stackedBlock(text, second).includes('Athletics 45'));
  const record = { talents: [], skills: [{ name: 'Athletics', value: 43 }] };
  assert.deepEqual(completenessGaps(record, stackedBlock(text, second), CATALOGUE).skills, []);
  // Un seul en-tête : pas de pile, découpage simple.
  assert.equal(stackedBlock(normalizeBlockText(`${header}6 48 30 Skills: Athletics 43`), 10), null);
  assert.ok(blockAfter(text, first).length > 0);
});
});

describe('cas nommés — attaques, armes et règles spéciales', () => {
const load = book => JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${book}.json`, import.meta.url), 'utf8')).profiles;

test('Q26 outil : le titre qui suit une attaque imprimée (« Weapon (Claws) +11 Toxic Bile: … ») est une règle spéciale', () => {
  const troglodon = listTraits('Bite +11, Weapon (Claws) +11 Toxic Bile: Troglodons can project an acidic toxic bile', 'v4', new Set(['Bite', 'Weapon']), 'traits');
  assert.deepEqual(troglodon.traits.map(trait => [trait.name, trait.param, trait.rating]), [['Bite', undefined, '+11'], ['Weapon', 'Claws', '+11']]);
  assert.deepEqual(troglodon.specialRules, ['Toxic Bile']);
  const flamers = listTraits('Unstable, Weapon +8 Font of Flame: If, at the beginning of its turn', 'v4', new Set(['Weapon', 'Unstable']), 'traits');
  assert.deepEqual(flamers.specialRules, ['Font of Flame']);
  assert.equal(flamers.traits.at(-1).rating, '+8');
});

test('Q26 outil : astérisque final d\'un talent, « Blowpipe +1 (20) », césure d\'un nom d\'arme', () => {
  assert.deepEqual(readTalents('Berserk Charge 3, Strike Mighty Blow 2*'), [{ name: 'Berserk Charge', rank: 3 }, { name: 'Strike Mighty Blow', rank: 2 }]);
  assert.deepEqual(readTalents('Sixth Sense, Strike to Injure.').map(talent => talent.name), ['Sixth Sense', 'Strike to Injure']);
  assert.deepEqual(readTalents('Arcane Magic (Dark Magic, Lore of Beasts, Lore of Death), Attractive').map(talent => talent.name), ['Arcane Magic (Dark Magic, Lore of Beasts, Lore of Death)', 'Attractive']);
  assert.deepEqual(readTraitItem('Blowpipe +1 (20)'), { name: 'Ranged', param: 'Blowpipe', rating: '+1', printed: 20 });
  assert.equal(readTraitItem('Ranged (Repeater Pistol loaded with Aqshy- Infused Powder) +10 (10)').param, 'Repeater Pistol loaded with Aqshy-Infused Powder');
});

test('Q26 outil : une arme imprimée deux fois (« Horns (Tusks) +10 » et « Weapon (Tusks) +10 ») n\'est qu\'une attaque', () => {
  const twice = buildAttacks({ attacks: [] }, [
    { name: 'Horns', param: 'Tusks', rating: '+10' }, { name: 'Weapon', param: 'Tusks', rating: '+10' },
    { name: 'Horns', rating: '+13' }, { name: 'Weapon', param: 'Curling Horns', rating: '+13' },
    { name: 'Ranged', param: 'Warp Blade', rating: '+7' }, { name: 'Weapon', param: 'Warp Blade', rating: '+10' }
  ]);
  assert.deepEqual(twice.map(attack => [attack.name, attack.damage]), [['Tusks', 10], ['Horns', 13], ['Warp Blade', 7], ['Warp Blade', 10]]);
});

test('Q26 glyphe : « Mòna » prend l\'accent grave lu sur la page 216 de Winds of Magic', () => {
  assert.equal(repairGlyphs('M�na Mimn, M�NA MIMN'), 'Mòna Mimn, MÒNA MIMN');
  assert.ok(JSON.stringify(load('L17')).includes('Mòna\'s Marsh Magic'));
  assert.ok(!JSON.stringify(load('L17')).includes('Mána'));
});

test('Q26 L09 : Dark Steed, War Hydra, Sea Dragon, Dockside Thug (pages 45, 47, 50, 86)', () => {
  const steed = find('L09', 'E0-P-315');
  assert.deepEqual(steed.armour.parts.map(part => [part.name, part.ap, part.optional]), [['Light Armour', 1, true], ['Medium Armour', 3, true]]);
  assert.deepEqual(names(steed.traits), ['Bestial', 'Night Vision', 'Size', 'Skittish']);
  assert.equal(steed.optionalTraits[0].param, 'Broken, Drive, Magic, Mount, War');
  const hydra = find('L09', 'E0-P-319');
  assert.deepEqual(hydra.attacks.map(attack => [attack.name, attack.value, attack.damage]), [['Talons', 45, 14], ['Bite', 45, 8]]);
  assert.equal(hydra.armour.toughnessBonus, 5);
  assert.deepEqual(names(hydra.skills), ['Stealth (Rural)', 'Track']);
  for (const trait of ['Bestial', 'Constrictor', 'Many Heads', 'Night Vision', 'Regeneration', 'Size', 'Striding Gait', 'Tracker']) assert.ok(names(hydra.traits).includes(trait), trait);
  const dragon = find('L09', 'E0-P-323');
  assert.equal(dragon.stats.M, 10);
  assert.deepEqual(dragon.attacks.map(attack => [attack.name, attack.value, attack.damage]), [['Claws', 70, 25], ['Bite', 70, 10], ['Tail', 70, 9]]);
  assert.deepEqual(dragon.armour, { toughnessBonus: 8, parts: [{ name: 'Scales', ap: 3 }] });
  assert.ok(names(dragon.traits).includes('Marine Creature'));
  const thug = find('L09', 'E0-P-347');
  assert.deepEqual(thug.armour.parts, [{ name: 'Light Armour', ap: 1 }]);
  assert.deepEqual(names(thug.skills), ['Climb', 'Dodge', 'Melee (Basic)', 'Swim']);
});

test('Q26 L09 : Damina (attaque parasite, Bouclier, Strike to Injure) et Kernethar (Arcane Magic, Soul Pact, équipement)', () => {
  const damina = find('L09', 'E0-P-342');
  assert.deepEqual(damina.attacks.map(attack => attack.name), ['Razor-tipped Grand Cathayan Fan', 'Repeater Handbow and Bolts']);
  assert.equal(damina.attacks[0].qualities, undefined);
  // Le Bouclier (+2 PA seulement en Opposition avec Esquive ou Corps à corps) est facultatif et conditionnel : jamais ajouté d'office.
  assert.deepEqual(damina.armour.parts.map(part => [part.name, part.ap, part.optional]), [['Medium Armour', 3, undefined], ['Shield', 2, true]]);
  assert.equal(damina.armour.parts[1].condition, 'when Opposing an attack with Dodge or Melee');
  const worn = buildParticipantFromBestiary('E0-P-342', { library: load('L09') });
  assert.deepEqual(worn.armor, { head: 3, body: 3, arms: 3, legs: 3 });
  assert.ok(names(damina.talents).includes('Strike to Injure'));
  const kernethar = find('L09', 'E0-P-363');
  assert.ok(names(kernethar.talents).includes('Arcane Magic (Dark Magic, Lore of Beasts, Lore of Death)'));
  assert.ok(names(kernethar.talents).includes('Soul Pact (Unaligned Daemon)'));
  assert.ok(kernethar.trappings.includes('Forged Testimonials for \'Malforic Silverblade, Fencing Master\''));
  assert.ok(kernethar.trappings.includes('Traveller\'s Chest with Fine Clothes and Hidden Compartment for Diary'));
});

test('Q26 L11 : Forest Goblin (Trick Riding), Krag-Breaker (Strike Mighty Blow 2, une seule attaque de cornes)', () => {
  assert.deepEqual(names(find('L11', 'E0-P-005').talents), ['Trick Riding']);
  const krag = find('L11', 'E0-P-014');
  assert.deepEqual(krag.talents, [{ name: 'Berserk Charge', rank: 3 }, { name: 'Strike Mighty Blow', rank: 2 }]);
  assert.deepEqual(krag.attacks.map(attack => attack.name), ['Horns']);
  assert.deepEqual(find('L11', 'E0-P-009').attacks.map(attack => attack.name), ['Tusks']);
});

test('Q26 L07 : Chameleon Skink (Blowpipe), Troglodon (Claws, Venom, Toxic Bile), Lord Skrolk (équipement)', () => {
  const skink = find('L07', 'E0-P-263');
  assert.deepEqual(skink.attacks.map(attack => [attack.name, attack.ranged]), [['Blowpipe', true]]);
  const troglodon = find('L07', 'E0-P-306');
  assert.deepEqual(troglodon.attacks.map(attack => [attack.name, attack.damage]), [['Bite', 11], ['Claws', 11]]);
  assert.ok(names(troglodon.traits).includes('Venom'));
  assert.deepEqual(troglodon.specialRules, ['Toxic Bile']);
  assert.deepEqual(find('L07', 'E0-P-248').trappings, ['Filthy Robes', 'Liber Bubonicus', 'Rod of Corruption']);
});

test('Q26 L10 L24 L23 : Crypt Ghast, Allrella, Al Shortbottom', () => {
  const ghast = find('L10', 'E0-P-373');
  for (const trait of ['Bite', 'Fearless', 'Frenzy', 'Hungry', 'Infected', 'Night Vision', 'Venom']) assert.ok(names(ghast.traits).includes(trait), trait);
  assert.deepEqual(names(ghast.optionalTraits), ['Champion', 'Painless']);
  assert.deepEqual(find('L24', 'E0-P-827').attacks, [{ name: 'Dagger', damage: 5, trait: 'Weapon' }]);
  const toll = find('L23', 'E0-P-768');
  assert.deepEqual(toll.attacks.map(attack => [attack.name, attack.damage, attack.ranged]), [['Crossbow', 9, true], ['Dagger', 5, undefined]]);
});

test('Q26 L22 L21 L04 : Dricht (Engineering 71), Flamers (Weapon +8), Gunna (Aqshy-Infused)', () => {
  assert.ok(find('L22', 'E0-P-738').skills.some(skill => skill.name === 'Engineering' && skill.value === 71));
  const flamers = find('L21', 'E0-P-665');
  assert.deepEqual(flamers.attacks.map(attack => [attack.name, attack.damage]), [['Weapon', 8]]);
  assert.deepEqual(flamers.specialRules, ['Font of Flame']);
  assert.equal(find('L04', 'E0-P-172').attacks[0].name, 'Repeater Pistol loaded with Aqshy-Infused Powder');
});

test('Q26 L18 L06 : Grey Seer (« As above » résolu), Human Watchman et Merchant (équipement complet)', () => {
  const seer = find('L18', 'E0-P-557');
  assert.ok(!seer.trappings.includes('As above'));
  assert.ok(seer.trappings.includes('4 Doses of Mandrake Snuff') && seer.trappings.includes('enough Warpstone to double the SL of three Casting/Channelling Tests (WFRP 244)'));
  assert.deepEqual(seer.spells.spells, ['Aethyric Armour', 'Bolt', 'Silence', 'Chain Attack', 'Terrifying']);
  assert.deepEqual(names(seer.skills), ['Channelling', 'Melee (Polearm)', 'Language (Magick)', 'Language (Reikspiel)']);
  assert.ok(find('L06', 'E0-P-067').trappings.includes('Sling Bag containing Lunch') && find('L06', 'E0-P-067').trappings.includes('Uniform'));
  assert.ok(find('L06', 'E0-P-068').trappings.includes('Pouch containing 3d10 Shillings'));
});

test('Q26 participant : le Sea Dragon et la War Hydra donnent des actions utilisables, sans texte de la colonne voisine', () => {
  const library = load('L09');
  const dragon = buildParticipantFromBestiary('E0-P-323', { library });
  assert.deepEqual(dragon.actions.map(action => action.name), ['Claws', 'Bite', 'Tail']);
  const hydra = buildParticipantFromBestiary('E0-P-319', { library });
  assert.deepEqual(hydra.actions.map(action => action.name), ['Talons', 'Bite']);
});
});

describe('faux positifs justifiés', () => {
const CATEGORIES = ['talents', 'skills', 'attacks', 'traits', 'trappings', 'spells', 'trappingNoise', 'veryIncomplete'];
const books = readdirSync('js/data/bestiary').filter(name => /^L\d+\.json$/.test(name)).map(name => JSON.parse(readFileSync(`js/data/bestiary/${name}`, 'utf8')));
const profiles = new Map(books.flatMap(book => book.profiles.map(profile => [profile.id, profile])));

test('Q27a : chaque faux positif justifié a une raison, une catégorie du contrôle et un profil existant', () => {
  for (const [id, entries] of Object.entries(JUSTIFIED)) {
    assert.ok(profiles.has(id), `${id} absent des livres`);
    for (const [category, reason] of Object.entries(entries)) {
      assert.ok(CATEGORIES.includes(category), `${id} : catégorie ${category}`);
      assert.ok(reason.length > 20, `${id} ${category} : raison trop courte`);
    }
  }
});

test('Q27a : le Phénix flèche-de-flamme (L14 p.83) a son talent Acute Sense (Vision)', () => {
  const phoenix = profiles.get('E0-P-490');
  assert.ok(phoenix.talents.some(talent => talent.name.startsWith('Acute Sense')), JSON.stringify(phoenix.talents));
  assert.ok(phoenix.traits.some(trait => trait.name === 'Phoenix Reborn'));
});

test('Q27a : une justification ne masque que sa catégorie (E0-P-822 garde son attaque imprimée, E0-P-836 ses Traits)', () => {
  assert.deepEqual(Object.keys(JUSTIFIED['E0-P-832']), ['skills']);
  assert.ok(profiles.get('E0-P-822').attacks.some(attack => attack.name === 'Fist'));
  assert.ok(profiles.get('E0-P-836').traits.some(trait => trait.name === 'Venom'));
  assert.ok(profiles.get('E0-P-835').talents.length >= 13);
});
});

describe('complétude — cas nommés (L02)', () => {
test('Q27b : une compétence suivie d\'un astérisque garde sa valeur, la note à astérisque ne devient pas une compétence', () => {
  const skills = readSkills('Gossip 65*, Lore (Politics) 65*, Sail 47, Swim 35 *All Tests connected with his present situation, or anything else, are Very Hard (-30).');
  assert.deepEqual(skills.map(item => [item.name, item.value]), [['Gossip', 65], ['Lore (Politics)', 65], ['Sail', 47], ['Swim', 35]]);
  const adalmann = profile('L01', 'E0-P-135');
  assert.equal(skill(adalmann, 'Gossip'), 65);
  assert.equal(skill(adalmann, 'Swim'), 35);
  assert.equal(skill(profile('L02', 'E0-P-145'), 'Dodge'), 49);
});

test('Q27b : une note « * … » après l\'équipement devient une note du profil (Adalbert, L02 p.90)', () => {
  const { items, notes } = readTrappings('Hooded Cloak, Lance, Sword * Adalbert is still getting used to his prosthetic leg, and may not Dodge until he does so.');
  assert.deepEqual(items, ['Hooded Cloak', 'Lance', 'Sword']);
  assert.equal(notes.length, 1);
  assert.deepEqual(profile('L02', 'E0-P-145').trappings.slice(-1), ['Sword']);
});

test('Q27b : un contenant et son contenu sont un seul objet (Pouch containing…, L02 p.30)', () => {
  assert.ok(isTrappingName('Pouch containing Writing Kit and 10 sheets of Parchment and 200 GC'));
  assert.ok(!isTrappingName('many Bodyguards who follow her around and then some more words to be long enough here'));
  assert.ok(profile('L02', 'E0-P-138').trappings.includes('Pouch containing Writing Kit and 10 sheets of Parchment and 200 GC'));
});

test('Q27b : virgule oubliée entre deux talents, spécialisation sur le dernier (Pedragar, L04 p.83)', () => {
  assert.deepEqual(splitGluedTalent('Blather Bless (Taal)'), ['Blather', 'Bless (Taal)']);
  assert.deepEqual(splitGluedTalent('Arcane Magic (Fire)'), ['Arcane Magic (Fire)']);
  assert.deepEqual(names(profile('L04', 'E0-P-173').talents).slice(0, 2), ['Blather', 'Bless (Taal)']);
});

test('Q27b : Richter Kless (L01 p.80) a ses compétences, son Trait, ses talents et son équipement', () => {
  const kless = profile('L01', 'E0-P-137');
  assert.equal(skill(kless, 'Lore (Chaos)'), 79);
  assert.equal(skill(kless, 'Research'), 56);
  assert.equal(kless.traits[0].param, 'Chaotic Dreams');
  assert.equal(kless.talents.length, 9);
  assert.deepEqual(kless.trappings, ['Ragged Clothes']);
});

test('Q27b : traits V4 de L07 / L11 (Souffle, Corrupting, Swamp Strider, Coldblooded, Acute Sense sans clause)', () => {
  const breath = profile('L07', 'E0-P-298').traits.find(item => item.name === 'Breath');
  assert.deepEqual([breath.rating, breath.param], ['+12', 'Fire']);
  assert.ok(names(profile('L07', 'E0-P-251').traits).includes('Corruption'));
  assert.ok(names(profile('L07', 'E0-P-275').traits).includes('Swamp-strider'));
  assert.ok(names(profile('L11', 'E0-P-021').traits).includes('Cold-blooded'));
  for (const id of ['E0-P-263', 'E0-P-299', 'E0-P-300', 'E0-P-306']) {
    assert.ok(profile('L07', id).talents.every(talent => !/as Character Talent/.test(talent.name)), id);
  }
  assert.equal(profile('L07', 'E0-P-299').talents[0].name, 'Acute Sense (Vision)');
});

test('Q27b : le Forest Goblin Shaman (L11 p.15) a Pray 60 et garde sa règle « Not All There »', () => {
  const shaman = profile('L11', 'E0-P-006');
  assert.equal(skill(shaman, 'Pray'), 60);
  assert.deepEqual(shaman.specialRules, ['Not All There']);
});
});

describe('complétude — cas nommés (L13)', () => {
test('Q27c : un Souffle gardé comme Trait (rating) compte comme présent dans le contrôle des attaques', () => {
  const block = 'Traits: Armour 2, Bite +8, Breath +10 (Poison)';
  const record = { attacks: [{ name: 'Bite', damage: 8 }], traits: [{ name: 'Breath', rating: '+10', param: 'Poison' }] };
  assert.deepEqual(extendedGaps(record, block).attacks, []);
  assert.deepEqual(extendedGaps({ ...record, traits: [] }, block).attacks, ['Breath +10']);
});

test('Q27c : Breath avec des lettres du voisin (« Breath +17 nd (Brimstone Fire) ») et « 2 Tentacles +6 » sont lus', () => {
  assert.deepEqual(readTraitItem('Breath +17 nd (Brimstone Fire)'), { name: 'Breath', param: 'Brimstone Fire', rating: '+17' });
  assert.deepEqual(readTraitItem('2 Tentacles +6'), { name: 'Tentacles', rating: '+6', count: 2 });
  const hagdar = profile('L16', 'E0-P-508');
  assert.deepEqual(hagdar.traits.find(item => item.name === 'Breath').rating, '+17');
  const sogkog = profile('L12', 'E0-P-456');
  assert.equal(sogkog.attacks.find(item => item.name === 'Tentacles').count, 2);
  assert.equal(sogkog.traits.find(item => item.name === 'Tentacles').count, 2);
  assert.deepEqual(sogkog.trappings, ['Collection of the heads of his favourite victims', 'Two-Handed Stone Axe']);
});

test('Q27c : « Combat Traits: » prolonge la liste des Traits (Demigryph Mount, L13 p.109)', () => {
  const { sections } = splitSections(['Traits: Armour 2, Belligerent, Trained (Broken, Mount, Shock Cavalry, War) Combat Traits: Bite +9, Weapon (Talons) +9 Trappings: Barding (2 AP to Body, Head, Forelegs)']);
  assert.equal(sections.Traits, 'Armour 2, Belligerent, Trained (Broken, Mount, Shock Cavalry, War), Bite +9, Weapon (Talons) +9');
  const demigryph = profile('L13', 'E0-P-459');
  assert.ok(names(demigryph.traits).includes('Trained'));
  assert.deepEqual(demigryph.attacks.map(item => item.name), ['Bite', 'Talons']);
});

test('Q27c : séparateur de milliers (« Jewellery worth 1,750 GC ») et description d\'objets collée à la liste (Thorgrim, L16 p.7)', () => {
  assert.deepEqual(splitList('Axe, Jewellery worth 1,750 GC, Pouch'), ['Axe', 'Jewellery worth 1,750 GC', 'Pouch']);
  const { items } = readTrappings('Armour of Skaldour, Clothing, Jewellery worth 1,750 GC Armour of Skaldour Master Rune of Alaric the Mad -- This weapon ignores all benefits provided by armour.');
  assert.deepEqual(items, ['Armour of Skaldour', 'Clothing', 'Jewellery worth 1,750 GC']);
  assert.deepEqual(profile('L16', 'E0-P-492').trappings.slice(-1), ['Jewellery worth 1,750 GC']);
});

test('Q27c : rang avant la parenthèse d\'un talent et fragment de colonne voisine dans une compétence (Brokk, L16 p.32)', () => {
  assert.deepEqual(readTalents('Ancestral Grudge 2 (Orcs and Goblins, Skaven), Carouser'), [{ name: 'Ancestral Grudge (Orcs and Goblins, Skaven)', rank: 2 }, { name: 'Carouser' }]);
  assert.deepEqual(readSkills('Melee rd, (Basic 90, Two-handed 100), Perception 30').map(item => [item.name, item.value]), [['Melee (Basic)', 90], ['Melee (Two-handed)', 100], ['Perception', 30]]);
  const brokk = profile('L16', 'E0-P-498');
  assert.equal(skill(brokk, 'Melee (Basic)'), 90);
  assert.equal(skill(brokk, 'Melee (Two-handed)'), 100);
  assert.ok(names(brokk.talents).includes('Ancestral Grudge (Orcs and Goblins, Skaven)'));
});

test('Q27c : Gotrek (L16 p.79) garde son équipement après le paragraphe « Amputations »', () => {
  assert.deepEqual(profile('L16', 'E0-P-504').trappings, ['Clothing', 'Jewelry worth 200 GC', "Gotrek's Axe"]);
});

test('Q27c : Nanna (L16 p.45) et le Plague Monk (L16 p.90) n\'ont plus de texte voisin dans leur équipement', () => {
  const { items } = readTrappings('Beardling Initiate, Cult Medallion, Trade Tools (Embalmer, Smith). Outside the hold, add the following: Bandages, Restorative Brew');
  assert.deepEqual(items, ['Beardling Initiate', 'Cult Medallion', 'Trade Tools (Embalmer, Smith)', 'Bandages', 'Restorative Brew']);
  assert.deepEqual(profile('L16', 'E0-P-502').trappings.slice(-2), ['Bandages', 'Restorative Brew']);
  assert.ok(profile('L16', 'E0-P-512').trappings.includes('Pair of Swords'));
  assert.ok(!profile('L16', 'E0-P-512').trappings.includes('Pair of Swords y'));
});

test('Q27c : cas relus à la main (Helga L16 p.31, Porter L13 p.114, Gorfang L12 p.107)', () => {
  assert.equal(skill(profile('L16', 'E0-P-497'), 'Secret Signs (Guilder)'), 40);
  const porter = profile('L13', 'E0-P-464');
  assert.equal(skill(porter, 'Gamble'), 36);
  assert.equal(skill(porter, 'Gossip'), 46);
  assert.ok(profile('L12', 'E0-P-455').trappings.includes('Ramshackle armour incorporating plate, mail, and scale'));
});
});

describe('complétude — cas nommés (L17, L18)', () => {
test('Q27d : une parenthèse de Trait reste d\'un seul tenant dans le contrôle (Prejudice, Mutation, Spellcasting)', () => {
  const labels = printedTraits('Traits: Armour 1, Prejudice (Those she Presumes to be Weak), Mutation (Extra arm and tail), Weapon +7').map(item => item.label);
  assert.deepEqual(labels, ['Prejudice (Those she Presumes to be Weak)', 'Mutation (Extra arm and tail)']);
});

test('Q27d : renvoi de page, titre voisin et intitulé collé ne sont pas des sorts', () => {
  const labels = printedSpells('Spells: Bolt, Silence YELLOW FANG CULTISTS').map(item => item.label);
  assert.deepEqual(labels, ['Bolt', 'Silence']);
  assert.deepEqual(printedSpells('Spells: Petty: Drain, Rot Arcane Magic and Lore Spells: Bless with Filth (page 109)').map(item => item.label), ['Drain', 'Rot', 'Bless with Filth']);
});

test('Q27d : un talent du catalogue imprimé parmi les Traits compte comme présent', () => {
  const record = { talents: [{ name: 'Acute Sense (Smell)' }], traits: [] };
  assert.deepEqual(extendedGaps(record, 'Traits: Acute Sense (Smell), Infected').traits, ['Infected']);
});

test('Q27d : titre en majuscules et phrase du voisin collés au dernier talent', () => {
  assert.deepEqual(readTalents('Small, Suffuse With (Wind) (see page 186) SPELL FAMILIAR').map(item => item.name), ['Small', 'Suffuse With (Wind) (see page 186)']);
  assert.deepEqual(readTalents('Small, Suffuse With (Wind) (see page 186) The familiars formed in the halls of Altdorf').map(item => item.name), ['Small', 'Suffuse With (Wind) (see page 186)']);
  assert.ok(names(profile('L17', 'E0-P-529').talents).includes('Suffuse With (Wind) (see page 186)'));
});

test('Q27d : note à astérisque des talents (Parzival, L18 p.115) gardée en note, Read/Write conservé', () => {
  const parzival = profile('L18', 'E0-P-560');
  assert.ok(names(parzival.talents).includes('Read/Write'));
  assert.deepEqual(parzival.notes, ['Parzival\'s Status has been effectively reduced due to his current circumstances.']);
});

test('Q27d : ligne « Marks: » après un blanc (L17) devient une note ; Trappings après une Note de Balthasar Gelt', () => {
  assert.deepEqual(profile('L17', 'E0-P-516').notes, ['Marks: Mark of Hysh, Stoicism']);
  assert.deepEqual(profile('L17', 'E0-P-523').notes, ['Marks: Feral, Mark of Ghur']);
  const gelt = profile('L17', 'E0-P-517');
  assert.ok(gelt.trappings.includes('Amulet of Sea Gold') && gelt.trappings.includes('Private Library and Workshop at the Gold College'));
  assert.deepEqual(gelt.notes, ['Marks: Shining Orbs, Hardness, Mark of Chamon']);
  const { sections } = splitSections(['Talents: Savvy', 'Trappings: Staff', '', 'Marks: Mark of Hysh, Stoicism']);
  assert.equal(sections.Marks, 'Mark of Hysh, Stoicism');
});

test('Q27d : équipement décrit par une phrase (Library Disc) est une note ; « Large » seul est la Taille ; Spellcasting est Spellcaster', () => {
  assert.deepEqual(readTrappings('The Disc is piled high with all manner of grimoires. If a Character should acquire one, roll on the table.').items, []);
  assert.deepEqual(readTraitItem('Large'), { name: 'Size', param: 'Large' });
  const disc = profile('L17', 'E0-P-534');
  assert.equal(disc.size, 'large');
  assert.equal(disc.trappings, undefined);
  assert.match(disc.notes[0], /^The Disc is piled high/);
  const liche = profile('L19', 'E0-P-612');
  assert.deepEqual(liche.traits.find(item => item.name === 'Spellcaster').param, 'Death and Necromancy');
});

test('Q27d : « and » de tête retiré du dernier objet de la liste (Gerdon, L19 p.150)', () => {
  assert.ok(profile('L19', 'E0-P-608').trappings.includes('Stolen Goods worth 17 Shillings'));
});
});

describe('complétude — cas nommés (L20)', () => {
test('Q27e : arme V4 imprimée sans « Weapon » (Dagger +5, Unarmed +7, Melee (Crowbar) +9) = attaque', () => {
  assert.deepEqual(readTraitItem('Dagger +5'), { name: 'Weapon', param: 'Dagger', rating: '+5' });
  assert.deepEqual(readTraitItem('Melee (Crowbar) +9'), { name: 'Weapon', param: 'Crowbar', rating: '+9' });
  assert.deepEqual(profile('L20', 'E0-P-632').attacks, [{ name: 'Dagger', damage: 5, trait: 'Weapon' }]);
  assert.ok(profile('L20', 'E0-P-616').attacks.some(attack => attack.name === 'Unarmed' && attack.damage === 7));
  assert.ok(profile('L20', 'E0-P-642').attacks.some(attack => attack.name === 'Crowbar' && attack.damage === 9));
  assert.ok(profile('L21', 'E0-P-682').attacks.some(attack => attack.name === 'Sword' && attack.damage === 7));
});

test('Q27e : « Skills: » après les Talents est la ligne Trappings (Chancellor von Festschrift, L20 p.163)', () => {
  const { sections } = splitSections(['Skills: Melee (Fencing) 52, Research 90', 'Talents: Bookish, Savvy', 'Skills: Symbol of Verena, Somber Academic Robes']);
  assert.equal(sections.Skills, 'Melee (Fencing) 52, Research 90');
  assert.equal(sections.Trappings, 'Symbol of Verena, Somber Academic Robes');
  const chancellor = profile('L20', 'E0-P-648');
  assert.ok(names(chancellor.skills).includes('Research'));
  assert.deepEqual(chancellor.trappings, ['Symbol of Verena', 'Somber Academic Robes']);
});

test('Q27e : « Trappings: Ranged (Bow) +6 » avant les Skills est la ligne Traits (Thomas Fabhber, L20 p.109)', () => {
  const { sections } = splitSections(['Trappings: Ranged (Bow) +6', 'Skills: Cool 33', 'Talents: Luck', 'Trappings: Fine Clothing, 12 GC']);
  assert.equal(sections.Traits, 'Ranged (Bow) +6');
  assert.equal(sections.Trappings, 'Fine Clothing, 12 GC');
  const thomas = profile('L20', 'E0-P-637');
  assert.ok(thomas.attacks.some(attack => attack.name === 'Bow' && attack.damage === 6));
  assert.equal(thomas.trappings[0], 'Fine Clothing');
});

test('Q27e : l\'Encombrement ferme la liste d\'équipement, le texte du voisin qui le suit est écarté (Maren Mauer, L20 p.126)', () => {
  assert.deepEqual(readTrappings('Dagger, Lockpicks, Knuckledusters, 15/2 Morr has no say over the souls interred upon the hill. They are taken.').items, ['Dagger', 'Lockpicks', 'Knuckledusters', '15/2']);
  assert.deepEqual(printedTrappings('Trappings: Dagger, 15/2 Garden Hill Known simply as Garden Hill').map(item => item.label), ['Dagger']);
  assert.equal(profile('L20', 'E0-P-638').trappings.at(-1), '15/2');
});

test('Q27e : un objet décrit de plus de 60 caractères sans verbe est gardé (Maps of the City, L20 p.67), une parenthèse ouverte non', () => {
  assert.equal(isTrappingName('Maps of the City showing secret passages and poorly guarded homes'), true);
  assert.equal(isTrappingName('Blade of Corruption (any target taking damage from this weapon'), false);
  assert.ok(profile('L20', 'E0-P-623').trappings.includes('Maps of the City showing secret passages and poorly guarded homes'));
});

test('Q27e : « Armoured 5 » n\'est pas un Trait manquant du contrôle (PA gardés en armure)', () => {
  assert.deepEqual(printedTraits('Traits: Armoured 5, Champion, Weapon (Sword) +8').map(item => item.label), ['Champion']);
  assert.equal(profile('L20', 'E0-P-656').armour.ap, 5);
});

test('Q27e : mot de la colonne voisine collé à « Herbs Worth 12/5 » retiré (Hayfoot, L20 p.195)', () => {
  assert.deepEqual(profile('L20', 'E0-P-652').trappings, ['Coarst Clothing', 'Herbs Worth 12/5']);
});
});

describe('complétude — cas nommés (L21)', () => {
test('Q27f : « Ride Horse 42 » (parenthèses oubliées) est la compétence Ride (Horse) (Renia Grünewald, L21 p.41)', () => {
  assert.deepEqual(readSkills('Perception 37, Ride Horse 42').map(skill => [skill.name, skill.value]), [['Perception', 37], ['Ride (Horse)', 42]]);
  assert.deepEqual(printedSkills('Skills: Perception 37, Ride Horse 42').map(skill => skill.key), ['perception||37', 'ride|horse|42']);
  const renia = profile('L21', 'E0-P-684');
  assert.ok(renia.skills.some(skill => skill.name === 'Ride (Horse)' && skill.value === 42));
});

test('Q27f : « Weapon+13 Suffused with Death: … » : l\'attaque est un Trait, « Suffused with Death » la règle (Necrofex Colossus, L21 p.64)', () => {
  const out = listTraits('Construct, Weapon+13 Suffused with Death: The necromantic magics', 'v4', new Set(['Construct']), 'traits');
  assert.deepEqual(out.specialRules, ['Suffused with Death']);
  assert.ok(out.traits.some(trait => trait.name === 'Weapon' && trait.rating === '+13'));
  assert.deepEqual(profile('L21', 'E0-P-693').attacks, [{ name: 'Weapon', damage: 13, trait: 'Weapon' }]);
});

test('Q27f : Vanguard Soldier (L21 p.42) a Sword +7 et ses lignes « Optional » lues comme compétences, talents et équipement', () => {
  const soldier = profile('L21', 'E0-P-687');
  assert.ok(soldier.attacks.some(attack => attack.name === 'Sword' && attack.damage === 7));
  assert.equal(soldier.skills.length, 15);
  assert.deepEqual(names(soldier.talents), ['Combat Aware', 'Strider (Highlands)']);
  assert.deepEqual(soldier.trappings, ['Sword', 'Bow', 'Uniform', 'Grey surcoat', 'Cloak']);
  assert.equal(soldier.optionalTraits, undefined);
});

test('Q27f : Ulfhednar (L21 p.84) a ses 12 compétences, 3 talents et son équipement ; Zurn garde « Sword » seul', () => {
  const ulfhednar = profile('L21', 'E0-P-706');
  assert.equal(ulfhednar.skills.length, 12);
  assert.deepEqual(names(ulfhednar.talents), ['Furious Assault', 'Menacing', 'Strike Mighty Blow']);
  assert.deepEqual(ulfhednar.trappings, ['Chaos Armour (cannot be removed) decorated with the skin of a dire wolf', 'Hand Axe']);
  assert.deepEqual(profile('L21', 'E0-P-705').trappings, ['Chaos Armour (cannot be removed)', 'Sword']);
});

test('Q27f : Gerta Faernmaus (L21 p.78) garde le Book of Pressed Flowers décrit sur trois lignes', () => {
  assert.ok(profile('L21', 'E0-P-700').trappings.includes('Book of Pressed Flowers taken from every battlefield she has ever fought on (worth 5 GC to someone interested in botany)'));
});
});

describe('complétude — cas nommés (L22)', () => {
const profile = id => JSON.parse(readFileSync('js/data/bestiary/L22.json', 'utf8')).profiles.find(item => item.id === id);

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
});

describe('complétude — cas nommés (L23)', () => {
const profile = id => JSON.parse(readFileSync('js/data/bestiary/L23.json', 'utf8')).profiles.find(item => item.id === id);

test('Q27h : Wolmar Rotte (L23 p.49) et Annalisa Kessler (p.102) ont leurs Trappings', () => {
  assert.equal(profile('E0-P-773').trappings.length, 6);
  assert.equal(profile('E0-P-773').trappings[5], '10d10 brass pennies');
  assert.deepEqual(profile('E0-P-802').trappings, ['Black Hood', 'Bow and 20 Black Arrows', 'Leather Jerkin', 'Sword', '8d10 brass pennies']);
});

test('Q27h : Albert Pförtner (L23 p.60) a ses six talents (Dirty Fighting 2) et ses huit objets', () => {
  const stevedore = profile('E0-P-783');
  assert.deepEqual(names(stevedore.talents), ['Criminal', 'Dirty Fighting', 'Strong Back', 'Sturdy', 'Tenacious', 'Very Strong']);
  assert.equal(stevedore.talents[1].rank, 2);
  assert.equal(stevedore.trappings.length, 8);
});

test('Q27h : Pink et Blue Horror (L23 p.87) ont Tzeentch’s Fire (apostrophe droite imprimée, courbe à l\'inventaire)', () => {
  for (const id of ['E0-P-789', 'E0-P-790']) assert.ok(profile(id).traits.some(trait => trait.name === 'Tzeentch’s Fire' && trait.ref === 'E0-T-270'));
});

test('Q27h : Urzo (L23 p.104) garde Animalistic Legs dans specialRules', () => {
  assert.deepEqual(profile('E0-P-803').specialRules, ['Animalistic Legs']);
});

test('Q27h : une virgule entre parenthèses ne coupe pas un objet recollé (« Granny » Haller, L23 p.111)', () => {
  const item = 'Potions and Charms, all fake (at the GM\'s discretion, some may have interesting but unplanned effects)';
  assert.deepEqual(joinTrappings(['Assorted Powders', 'Potions and Charms', 'all fake (at the GM\'s discretion, some may have interesting but unplanned effects)'], [item]).length, 2);
  assert.ok(profile('E0-P-812').trappings.includes(item));
});
});

describe('complétude — cas nommés (L25)', () => {
test('Q27i : Officer (L25 p.127) a Language (Wastelander) 51 malgré les lettres du voisin', () => {
  assert.equal(skill(profile('L25', 'E0-P-900'), 'Language (Wastelander)'), 51);
  const parsed = readSkills('Intimidate 36, Language im (Wastelander) 51, Leadership 56');
  assert.deepEqual(parsed.map(item => `${item.name} ${item.value}`), ['Intimidate 36', 'Language (Wastelander) 51', 'Leadership 56']);
});

test('Q27i : Doktor (L25 p.127) a Sleight of Hand 51 (valeur du voisin coincée dans le nom)', () => {
  assert.equal(skill(profile('L25', 'E0-P-904'), 'Sleight of Hand'), 51);
  assert.deepEqual(readSkills('Perception 41, Sleight 61, of Hand 51, Trade (Barber) 46').map(item => `${item.name} ${item.value}`), ['Perception 41', 'Sleight of Hand 51', 'Trade (Barber) 46']);
});

test('Q27i : Triton (L25 p.149) a Lore (Elves) 59, Lore (Theology) 69 et Lore (Oceans) 99', () => {
  const triton = profile('L25', 'E0-P-918');
  assert.equal(skill(triton, 'Lore (Elves)'), 59);
  assert.equal(skill(triton, 'Lore (Theology)'), 69);
  assert.equal(skill(triton, 'Lore (Oceans)'), 99);
  assert.equal(skill(triton, 'Melee (Polearm)'), 83);
});

test('Q27i : Bella Hornwhistler (L26 p.58) a Resistant (Chaos) en talent, pas en Trait', () => {
  const bella = profile('L26', 'E0-P-950');
  assert.deepEqual(bella.talents.map(item => item.name), ['Read/Write', 'Resistant (Chaos)']);
  assert.ok(!(bella.traits || []).some(trait => /Resist/.test(trait.name)));
});

test('Q27i : Scorath (L09 E0-P-354) a Melee (Basic) 68 ; Kelrathi (L09) et Trevna Fane (L10) ont Resistant (Poison)', () => {
  const l09 = JSON.parse(readFileSync('js/data/bestiary/L09.json', 'utf8')).profiles;
  assert.ok(l09.some(item => (item.talents || []).some(talent => talent.name === 'Resistant (Poison)')));
  assert.ok(l09.some(item => (item.skills || []).some(entry => entry.name === 'Melee (Basic)' && entry.value === 68)));
  const l10 = JSON.parse(readFileSync('js/data/bestiary/L10.json', 'utf8')).profiles;
  assert.ok(l10.some(item => (item.talents || []).some(talent => talent.name === 'Resistant (Poison)')));
});
});

describe('extraction — équipement et Traits conditionnels', () => {
const find = (book, id) => JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')).profiles.find(profile => profile.id === id);

test('Q3 : une note à astérisque se sépare de la liste d’équipement', () => {
  const { items, notes } = readTrappings('Warpstone filling (15 GC), Piece of Warpstone (50 GC) *These fade away in 24 hours if Wuder discards all warpstone from his possession.');
  assert.deepEqual(items, ['Warpstone filling (15 GC)', 'Piece of Warpstone (50 GC)']);
  assert.deepEqual(notes, ['*These fade away in 24 hours if Wuder discards all warpstone from his possession.']);
});

test('Q3 : un Trait suivi d’un astérisque est conditionnel', () => {
  assert.equal(readTraitItem('Immunity (Fear)*').conditional, true);
  assert.equal(readTraitItem('Tough').conditional, undefined);
});

test('Q3 : un nom d’équipement à virgules internes se recolle', () => {
  assert.deepEqual(joinTrappings(['Notebook of Plans', 'Schemes', 'and Dirty Secrets', '2d0 Silver Shillings'], ['Notebook of Plans, Schemes, and Dirty Secrets']), ['Notebook of Plans, Schemes, and Dirty Secrets', '2d0 Silver Shillings']);
  assert.deepEqual(joinTrappings(['Cloak', 'Hat'], ['Notebook of Plans, Schemes, and Dirty Secrets']), ['Cloak', 'Hat']);
});

test('Q3 : Herveaux, Tyrkel, Helena et Wuder ont leur équipement', () => {
  const herveaux = find('L24', 'E0-P-818');
  assert.ok(herveaux.trappings.some(item => /^Poisoned Dagger \(.*Heartkill.*\)$/.test(item)));
  assert.ok(herveaux.trappings.includes("Servant's Clothing"));
  const tyrkel = find('L20', 'E0-P-628');
  assert.ok(tyrkel.trappings.some(item => /^Steam Powered Hydraulic Hook Prosthetic \(Counts as a Hand Weapon.*Entangle quality\)$/.test(item)));
  assert.ok(tyrkel.trappings.includes('Monocle') && tyrkel.trappings.includes('Leather Jack'));
  const helena = find('L20', 'E0-P-625');
  assert.ok(helena.trappings.includes('Notebook of Plans, Schemes, and Dirty Secrets'));
  assert.ok(!helena.trappings.includes('Schemes'));
  const wuder = find('L18', 'E0-P-564');
  assert.deepEqual(wuder.trappings, ['Warpstone filling (15 GC)', 'Piece of Warpstone (50 GC)']);
  assert.match(wuder.notes[0], /^\*These fade away in 24 hours/);
  assert.deepEqual(wuder.traits.filter(trait => trait.conditional).map(trait => trait.name), ['Immunity', 'Tough']);
});
});

describe('contrôle — rubriques sans deux-points (L06, L09, L10)', () => {
const TALENTS = new Set(['acute sense', 'attractive', 'combat reflexes', 'craftsman', 'etiquette', 'in-fighter', 'nose for trouble', 'read/write', 'briber', 'cardsharp']);
const TRAITS = new Set(['hatred', 'night vision', 'many heads', 'regeneration', 'size', 'bestial', 'breath']);
const gaps = (record, raw) => {
  const block = colonize(normalizeBlockText(raw));
  const parts = [completenessGaps(record, block, TALENTS), extendedGaps(record, block), formatGaps(record, block, TALENTS, TRAITS)];
  const merged = {};
  for (const part of parts) for (const [key, list] of Object.entries(part)) merged[key] = [...new Set([...(merged[key] || []), ...list])];
  return merged;
};

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
});

describe('cas confirmés — rubriques et compétences collées', () => {
const load = book => JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${book}.json`, import.meta.url), 'utf8')).profiles;
const names = list => (list || []).map(item => (typeof item === 'string' ? item : item.name));

test('Q33 outil : une description qui commence par « Talents as if… » n\'ouvre pas la rubrique Talents', () => {
  const sections = blockSections(['Traits', 'Fear: The creature causes Fear.', 'Mark of Slaanesh: may purchase the following', 'Talents as if they were Career Advances: Attractive.', 'Night Vision: See clearly.']).sections;
  assert.equal(sections.Talents, undefined);
  assert.match(sections.Traits, /Night Vision/);
});

test('Q33 outil : « Traits and talents », « Blessings », « Miracles: » sont des rubriques', () => {
  const sections = blockSections(['Skills', 'Dodge 40', 'Traits and talents', 'Combat Reflexes: Initiative.', 'Blessings', 'Breath, Courage', 'Miracles:', 'Dooming, Last Rites']).sections;
  assert.ok(sections['Traits and Talents']);
  assert.equal(sections.Blessings, 'Breath, Courage');
  assert.equal(sections.Miracles, 'Dooming, Last Rites');
});

test('Q33 outil : compétences collées, entre parenthèses, lettre isolée, spécialisation sans valeur', () => {
  assert.deepEqual(readSkills('Language (Arabyan 90, Cathayan 95) Leadership 90, Haggle (45), Track 80 r').map(skill => [skill.name, skill.value]),
    [['Language (Arabyan)', 90], ['Language (Cathayan)', 95], ['Leadership', 90], ['Haggle', 45], ['Track', 80]]);
  const unvalued = readSkills('Language (Bretonnian 90, Elthárin, Magick 95)');
  assert.deepEqual(unvalued.filter(skill => skill.unvalued).map(skill => skill.name), ['Language (Elthárin)']);
  assert.deepEqual(cleanSkills(unvalued).unvalued, ['Language (Elthárin)']);
  assert.equal(cleanSkills(unvalued).kept.length, 2);
});

test('Q33 outil : talents collés après une parenthèse, graphies imprimées', () => {
  assert.deepEqual(splitGluedTalent('Acute Sense (Taste) Attractive'), ['Acute Sense (Taste)', 'Attractive']);
  assert.deepEqual(splitGluedTalent('Fearless (Paupers) Read/Write'), ['Fearless (Paupers)', 'Read/Write']);
  assert.equal(canonicalTalentName('Infighter'), 'In-fighter');
  assert.equal(canonicalTalentName('Cat tongued'), 'Cat-tongued');
});

test('Q33 outil : qualités entre parenthèses derrière un Trait d\'attaque', () => {
  assert.deepEqual(readTraitItem('Tail +9 (Pummel)').qualities, ['Pummel']);
  assert.deepEqual(readTraitItem('Weapon (Obsidian Claws) +10 (Hack, Penetrating)').qualities, ['Hack', 'Penetrating']);
  assert.equal(readTraitItem('Bite +9 (see below)').qualities, undefined);
});

test('Q33 Souffle : War Hydra, Sea Dragon, Dragon (L06) l\'ont comme Trait, Hagdar garde ses qualités', () => {
  const breath = profile => profile.traits.find(trait => trait.name === 'Breath');
  assert.equal(breath(find('L09', 'E0-P-319')).param, 'Fire or Poison');
  assert.equal(breath(find('L09', 'E0-P-323')).param, 'Any One');
  assert.equal(breath(find('L06', 'E0-P-082')).param, 'Any One');
  const hagdar = find('L16', 'E0-P-508');
  assert.equal(breath(hagdar).param, 'Brimstone Fire');
  assert.equal(breath(hagdar).rating, '+17');
  assert.deepEqual(hagdar.attacks.find(attack => attack.name === 'Tail').qualities, ['Pummel']);
  assert.deepEqual(hagdar.attacks.find(attack => attack.name === 'Obsidian Claws').qualities, ['Hack', 'Penetrating']);
});

test('Q33 L09 « Traits and Talents » : Demeth, Valerion, Hulreth, Selthira, Haidrath', () => {
  const demeth = find('L09', 'E0-P-345');
  assert.deepEqual(names(demeth.talents), ['Hatred (High Elves)', 'Night Vision', 'Accurate Shot', 'Combat Reflexes', 'Dual Wielder', 'Old Salt', 'Read/Write', 'Sharpshooter', 'Sniper']);
  assert.deepEqual(names(find('L09', 'E0-P-341').talents), ['Hatred (High Elves, Morandors)', 'Night Vision', 'Combat Aware', 'Combat Reflexes', 'Inspiring', 'Menacing', 'Read/Write', 'Shieldsman', 'War Leader']);
  const hulreth = find('L09', 'E0-P-360');
  assert.ok(names(hulreth.talents).includes('In-fighter'));
  assert.deepEqual(names(hulreth.traits), ['Hatred', 'Night Vision', 'Fearless']);
  assert.ok(names(hulreth.skills).includes('Language (Elthárin)') || hulreth.skills.some(skill => skill.name === 'Language (Elthárin)'));
  assert.ok(names(hulreth.skills).includes('Leadership'));
  assert.ok(names(find('L09', 'E0-P-358').talents).includes('Battle Rage'));
  assert.ok(find('L09', 'E0-P-358').skills.some(skill => skill.name === 'Perform (Dance)' && skill.value === 60));
  assert.ok(names(find('L09', 'E0-P-359').talents).includes('Gifts of Khaine'));
});

test('Q33 L09 : Anointed (Mark of Slaanesh, Night Vision, Ward), Doomfire Warlock (7 Traits, dont Ward 8+), Samuril (Dagger), Scorath', () => {
  const anointed = find('L09', 'E0-P-324');
  for (const name of ['Mark of Slaanesh', 'Night Vision', 'Ward']) assert.ok(names(anointed.traits).includes(name), name);
  assert.deepEqual(names(find('L09', 'E0-P-325').traits), ['Afraid', 'Coven Sorcerer', 'Hatred', 'Night Vision', 'Prey of the Dark Prince', 'Venom', 'Ward']);
  assert.deepEqual(find('L09', 'E0-P-353').attacks.map(attack => [attack.name, attack.value, attack.damage]), [['Dagger', 60, 5]]);
  const scorath = find('L09', 'E0-P-354');
  assert.ok(scorath.skills.some(skill => skill.name === 'Melee (Basic)' && skill.value === 68));
  assert.ok(scorath.skills.some(skill => skill.name === 'Track' && skill.value === 80));
  assert.ok(names(scorath.talents).includes('Trick Riding'));
});

test('Q33 L09 : Damina inflige 1 Bleeding par ses coups, Kernethar garde Language (Elthárin) sans valeur', () => {
  const fan = find('L09', 'E0-P-342').attacks.find(attack => /Fan/.test(attack.name));
  assert.deepEqual(fan.inflicts, [{ condition: 'Bleeding', count: 1 }]);
  assert.deepEqual(find('L09', 'E0-P-363').unvaluedSkills, ['Language (Elthárin)']);
  assert.ok(!find('L09', 'E0-P-363').skills.some(skill => skill.value === null));
});

test('Q33 L10 : Cacciatore, Blattner, Jimmi, Trevna, Seiren, Gabriella, Matthias, Emil', () => {
  assert.ok(names(find('L10', 'E0-P-367').talents).includes('Sharpshooter'));
  assert.match(find('L10', 'E0-P-367').notes.join(' '), /Blessings: Breath/);
  assert.ok(names(find('L10', 'E0-P-368').talents).includes('Read/Write'));
  assert.ok(names(find('L10', 'E0-P-377').talents).includes('Acute Sense (Taste)'));
  assert.ok(names(find('L10', 'E0-P-377').talents).includes('Attractive'));
  assert.equal(names(find('L10', 'E0-P-381').talents).filter(name => name === 'Resistant (Poison)').length, 1);
  const seiren = find('L10', 'E0-P-389');
  assert.equal(names(seiren.talents).filter(name => name === 'Resistant (Poison)').length, 1);
  assert.match(seiren.notes.join(' '), /Miracles: Destroy Undead, Dooming, Last Rites/);
  assert.ok(names(find('L10', 'E0-P-383').talents).includes('Fearless (Paupers)'));
  assert.ok(names(find('L10', 'E0-P-383').talents).includes('Read/Write'));
  const matthias = find('L10', 'E0-P-384');
  assert.ok(matthias.skills.some(skill => skill.name === 'Athletics' && skill.value === 40));
  assert.ok(matthias.skills.some(skill => skill.name === 'Haggle' && skill.value === 45));
  assert.ok(matthias.skills.some(skill => skill.name === 'Pick Lock' && skill.value === 42));
  assert.ok(names(matthias.talents).includes('Break and Enter'));
  assert.ok(matthias.trappings.includes('Mercenary Guards'));
  const emil = find('L10', 'E0-P-390');
  assert.deepEqual(emil.attacks.map(attack => attack.name), ['Boat Hook']);
  assert.deepEqual(names(emil.talents).slice(0, 4), ['Criminal', 'Dealmaker', 'Etiquette (Criminals)', 'Gregarious']);
});

test('Q33 L06 : Thug, Vampire, Varghulf, Fenbeast, Halfling Thief', () => {
  assert.ok(find('L06', 'E0-P-069').trappings.includes('Leather Jack'));
  assert.ok(!find('L06', 'E0-P-069').trappings.some(item => /^2 /.test(item)));
  assert.ok(names(find('L06', 'E0-P-070').talents).includes('Resistant (Chaos)'));
  const vampire = find('L06', 'E0-P-099');
  assert.ok(names(vampire.traits).includes('Night Vision'));
  assert.ok(vampire.skills.some(skill => skill.name === 'Track' && skill.value === 40));
  assert.ok(names(find('L06', 'E0-P-100').traits).includes('Hungry'));
  assert.deepEqual(find('L06', 'E0-P-083').attacks[0].qualities, ['Magical']);
});

test('Q33 césures et parasites : In-fighter, Cat-tongued, Plague Monk, Zurn, Porter', () => {
  assert.ok(names(find('L01', 'E0-P-123').talents).includes('In-fighter'));
  assert.ok(names(find('L14', 'E0-P-485').talents).includes('Cat-tongued'));
  assert.ok(find('L16', 'E0-P-512').trappings.includes('Pair of Swords'));
  assert.ok(find('L21', 'E0-P-705').trappings.includes('Sword'));
  const porter = find('L13', 'E0-P-464');
  assert.ok(porter.skills.some(skill => skill.name === 'Gamble' && skill.value === 36));
  assert.ok(porter.skills.some(skill => skill.name === 'Gossip' && skill.value === 46));
});

test('Q33 justifications abusives retirées : Harkon (Vampiric Gaze, Zweihander), Dread Saurian (Hunger)', () => {
  const harkon = find('L07', 'E0-P-250');
  assert.deepEqual(harkon.specialRules, ['Vampiric Gaze']);
  assert.deepEqual(harkon.attacks.filter(attack => attack.trait === 'Weapon').map(attack => [attack.name, attack.damage]), [['Rapier', 10], ['Zweihander', 11]]);
  assert.ok(find('L07', 'E0-P-307').specialRules.includes('Hunger'));
  const justified = readFileSync(new URL('../../../tools/lib/bestiary-justified.mjs', import.meta.url), 'utf8');
  assert.ok(!/'E0-P-250'/.test(justified));
  assert.ok(!/'E0-P-307'/.test(justified));
});
});

describe('complétude — cas nommés (L06)', () => {
// L06 p.330 : « Bite: (70/+9) Lose Momentum to make this Free Attack, Penetrating Tail: (70/+8) … » — la qualité de la ligne précédente précède le nom suivant.
const DRAGON_ATTACKS = 'Attacks Claws: (70/+22) Bite: (70/+9) Lose Momentum to make this Free Attack, Penetrating Tail: (70/+8) Lose Momentum to make this Free Attack Armour';

test('Q34a : le contrôle lit « Penetrating Tail » comme la qualité puis l\'attaque Tail', () => {
  const dragon = profile('L06', 'E0-P-082');
  assert.deepEqual(formatGaps(dragon, DRAGON_ATTACKS, new Set(), new Set()).attacks, []);
  assert.ok(printedV5Attacks(DRAGON_ATTACKS).some(attack => attack.names.includes('tail')));
});

test('Q34a : une attaque réellement absente reste signalée malgré les suffixes', () => {
  const dragon = { ...profile('L06', 'E0-P-082'), attacks: [{ name: 'Claws', damage: 22 }, { name: 'Bite', damage: 9 }] };
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
});

describe('complétude — cas nommés (L10)', () => {
test('Q34b : le comte Alberich (L10 p.9) garde l\'épée « The Stirland Runefang, Orc Hewer » en un objet et ses titres entiers', () => {
  const trappings = profile('L10', 'E0-P-364').trappings;
  assert.ok(trappings.includes('The Stirland Runefang, Orc Hewer'));
  assert.ok(trappings.includes('Wardenship of the River Stir') && trappings.includes('Royal Garb (Best Quality)'));
  assert.ok(!trappings.includes('Orc Hewer') && !trappings.includes('Wardenship of the'));
});

test('Q34b : le Drakenhund (L10 p.38) a ses Traits facultatifs et le Talent Sixth Sense à part', () => {
  const drakenhund = profile('L10', 'E0-P-369');
  assert.ok(drakenhund.optionalTraits.some(trait => trait.name === 'Trained' && /Heel/.test(trait.param)));
  assert.deepEqual(drakenhund.optionalTalents, [{ name: 'Sixth Sense' }]);
  assert.ok(!drakenhund.optionalTraits.some(trait => trait.name === 'Sixth Sense'));
});

test('Q34b : « Optional » seul sur sa ligne ouvre les Traits facultatifs (Crypt Ghast p.68, Patchwork Man p.74)', () => {
  assert.deepEqual(profile('L10', 'E0-P-373').optionalTraits.map(trait => trait.name), ['Champion', 'Painless']);
  assert.deepEqual(profile('L10', 'E0-P-371').optionalTraits.map(trait => trait.name), ['Champion', 'Hatred', 'Spellcaster', 'Fear']);
  const patchwork = profile('L10', 'E0-P-375').optionalTraits.map(trait => trait.name);
  assert.ok(patchwork.includes('Infestation') && patchwork.includes('Stealthy'));
});

test('Q34b : Mancatcher (L11 p.13) garde Venom, la règle Spiteful et son Trait Dressé sans la prose voisine', () => {
  const spider = profile('L11', 'E0-P-003');
  assert.ok(spider.traits.some(trait => trait.name === 'Venom'));
  assert.deepEqual(spider.specialRules, ['Spiteful']);
  assert.deepEqual(spider.optionalTraits.find(trait => trait.name === 'Trained').param, 'Broken, Guard, Magic, Mount, War');
});

test('Q34b : les listes Trained (Griffon L11, Roc L07) sont complètes', () => {
  assert.equal(profile('L07', 'E0-P-253').optionalTraits.find(trait => trait.name === 'Trained').param, 'Broken, Drive, Magic, War');
  assert.ok(profile('L11', 'E0-P-011').optionalTraits.some(trait => trait.name === 'Trained'));
});

test('Q34b : les justifications citent la page du livre', () => {
  for (const id of ['E0-P-271', 'E0-P-287', 'E0-P-311', 'E0-P-312', 'E0-P-313', 'E0-P-315', 'E0-P-318', 'E0-P-354', 'E0-P-364', 'E0-P-368', 'E0-P-373', 'E0-P-386', 'E0-P-052']) {
    const reason = Object.values(JUSTIFIED_Q34[id]).join(' ');
    assert.match(reason, /L(?:07|09|10|11) p\.\d+/, id);
  }
});

test('Q34b : Venom Spiteful (L11 p.13) : le tiret de la règle ne coupe pas les Traits des autres profils', () => {
  const wolf = profile('L11', 'E0-P-052');
  assert.ok(wolf.traits.some(trait => trait.name === 'Disruption'));
  assert.ok(!wolf.traits.some(trait => trait.name === 'Unstable'));
});
});

describe('complétude — justifications L14 à L26', () => {
test('Q34c : les justifications L14-L26 citent la page du livre', () => {
  const pages = { 'E0-P-491': 'L14 p.84', 'E0-P-515': 'L17 p.30', 'E0-P-584': 'L19 p.89', 'E0-P-610': 'L19 p.152', 'E0-P-611': 'L19 p.153', 'E0-P-613': 'L20 p.21', 'E0-P-670': 'L21 p.24', 'E0-P-807': 'L23 p.108', 'E0-P-808': 'L23 p.108', 'E0-P-822': 'L24 p.20', 'E0-P-836': 'L24 p.34' };
  for (const [id, page] of Object.entries(pages)) assert.ok(Object.values(JUSTIFIED_Q34[id]).join(' ').includes(page), id);
});

test('Q34c : l\'élément justifié n\'est pas imprimé pour le profil (Kat Sperber, Imperial Viper, Imperial Beast)', () => {
  assert.ok(!profile('L19', 'E0-P-610').talents.some(talent => /^(Doomed|Menacing)$/.test(talent.name)));
  assert.ok(!profile('L24', 'E0-P-836').traits.some(trait => trait.name === 'Prejudice'));
  assert.ok(!profile('L23', 'E0-P-808').traits.some(trait => trait.name === 'Venom'));
  assert.ok(profile('L23', 'E0-P-807').traits.some(trait => trait.name === 'Venom'));
});

test('Q34c : les profils justifiés gardent leur liste imprimée (Thyrus Gormann, Construct, Frostheart Phoenix)', () => {
  assert.deepEqual(profile('L20', 'E0-P-613').traits.map(trait => trait.name), ['Animosity']);
  assert.ok(profile('L17', 'E0-P-515').traits.some(trait => trait.name === 'Unstable'));
  assert.ok(profile('L14', 'E0-P-491').traits.some(trait => trait.name === 'Freezing Aura'));
});
});

describe('cas confirmés — Ward et armes nommées', () => {
const load = book => JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${book}.json`, import.meta.url), 'utf8')).profiles;
const names = list => (list || []).map(item => (typeof item === 'string' ? item : item.name));

test('Q36 outil : « Ward 8+: » ouvre un paragraphe de Traits décrits', () => {
  const lines = ['Traits', 'Venom (Challenging): Wounded opponents.', '', 'Ward 8+: Roll 1d10 after any blow is received.'];
  const traits = splitSections(lines).sections.Traits;
  assert.match(traits, /Ward 8\+:/);
});

test('Q36 données : Doomfire Warlock (L09 p. 52) a le Trait Ward 8+, Kelrathi (p. 104) Arcane Magic (Beasts) et Bookish', () => {
  const warlock = find('L09', 'E0-P-325');
  assert.deepEqual(warlock.traits.filter(trait => trait.name === 'Ward').map(trait => trait.rating), ['8+']);
  const kelrathi = find('L09', 'E0-P-355');
  assert.ok(names(kelrathi.talents).includes('Arcane Magic (Beasts)'));
  assert.ok(names(kelrathi.talents).includes('Bookish'));
  assert.ok(!names(kelrathi.talents).some(name => /Magick/.test(name)));
});

test('Q36 outil : « Weapon +6 (Claws) » est une arme nommée, pas une qualité', () => {
  assert.deepEqual(readTraitItem('Weapon +6 (Claws)'), { name: 'Weapon', rating: '+6', param: 'Claws' });
  // Les qualités entre parenthèses derrière un nom d'arme restent des qualités (Hagdar, L16 p. 84).
  const hagdar = readTraitItem('Weapon (Obsidian Claws) +10 (Hack, Penetrating)');
  assert.equal(hagdar.param, 'Obsidian Claws');
  assert.deepEqual(hagdar.qualities, ['Hack', 'Penetrating']);
});

test('Q36 données : armes nommées de L17 (Claws, Quill, Bite) et de L23 (Claws)', () => {
  for (const [book, id, name] of [['L17', 'E0-P-532', 'Claws'], ['L17', 'E0-P-533', 'Quill'], ['L17', 'E0-P-534', 'Bite'], ['L23', 'E0-P-788', 'Claws'], ['L23', 'E0-P-789', 'Claws'], ['L23', 'E0-P-790', 'Claws']]) {
    const weapon = find(book, id).attacks.find(attack => attack.trait === 'Weapon');
    assert.equal(weapon.name, name, id);
    assert.equal(weapon.qualities, undefined, id);
  }
});

test('Q36 contrôle : une arme V4 « Weapon +6 (Claws) » est comptée sous le nom de l\'arme', () => {
  const block = 'Traits: Corruption (Moderate), Size (Small), Weapon +6 (Claws) Skills: Language (Magick) 95';
  assert.deepEqual(printedAttacks(block).map(attack => attack.key), ['claws|6|1']);
});

test('Q36 données : Outlaw (L04 p. 103) garde « 5 Matches » au bord du profil voisin', () => {
  assert.ok(find('L04', 'E0-P-176').trappings.includes('Sling Bag containing 2 Candles and 5 Matches'));
  assert.ok(find('L04', 'E0-P-177').trappings.includes('Sling Bag containing 2 Candles and 5 Matches'));
});

test('Q36 données : Gurniksson (L03 p. 63) garde ses compétences imprimées sans valeur', () => {
  const profile = find('L03', 'E0-P-161');
  assert.deepEqual(profile.unvaluedSkills, ['Leadership', 'Lore (Geology)', 'Stealth (Underground)']);
  assert.equal(profile.skills, undefined);
  // Une liste qui a des valeurs ne verse jamais ses compétences sans valeur dans unvaluedSkills (texte voisin).
  const mixed = cleanSkills([{ name: 'Dodge', value: 40 }, { name: 'Leadership', value: null }]);
  assert.deepEqual(mixed.unvalued, []);
});

test('Q36 outil : armure « Breastplate: +2 AP Body » et « Toughness Bonus: +3 »', () => {
  assert.deepEqual(readArmour('Toughness Bonus: +3'), { parts: [], toughnessBonus: 3 });
  assert.deepEqual(readArmour('Toughness Bonus: 3 Breastplate: +2 AP Body'), { parts: [{ name: 'Breastplate', ap: 2, optional: false, locations: 'Body' }], toughnessBonus: 3 });
  // Le nom du Dragon Cloak suivant n'est pas une zone.
  const cloaks = readArmour('Sea Dragon Cloak: +3 AP Sea Dragon Cloak: +1 AP Body');
  assert.deepEqual(cloaks.parts.map(part => part.locations), [undefined, 'Body']);
});

test('Q36 données : armure L10 (E0-P-382, 388, 390) et E0-P-368', () => {
  assert.deepEqual(find('L10', 'E0-P-382').armour, { toughnessBonus: 3, parts: [{ name: 'Breastplate', ap: 2, locations: 'Body' }] });
  assert.deepEqual(find('L10', 'E0-P-390').armour, { toughnessBonus: 4, parts: [{ name: 'Leather Jerkin', ap: 1, locations: 'Body' }] });
  // Erich Frohlich (p. 91) : le livre imprime « Toughness Bonus: » sans nombre ; le Bonus n'est pas inventé.
  assert.deepEqual(find('L10', 'E0-P-388').armour, { parts: [{ name: 'Leather Jerkin', ap: 1, locations: 'Body' }] });
  assert.equal(find('L10', 'E0-P-368').armour.toughnessBonus, 3);
});

test('Q36 outil : bouclier facultatif « +2 AP and +1 SL when Opposing… »', () => {
  const armour = readArmour('Toughness Bonus: 4 Optional Medium Armour: +3 AP Optional Shield: +2 AP and +1 SL when Opposing an attack with Dodge or Melee');
  assert.deepEqual(armour.parts[1], { name: 'Shield', ap: 2, optional: true, slBonus: 1, condition: 'when Opposing an attack with Dodge or Melee' });
  assert.equal(armour.parts[0].locations, undefined);
});

test('Q36 données : le bouclier facultatif est lu pour tous les profils de L06 qui l\'impriment', () => {
  const withShield = load('L06').filter(profile => (profile.armour?.parts || []).some(part => part.name === 'Shield'));
  assert.equal(withShield.length, 14);
  for (const profile of withShield) {
    const shield = profile.armour.parts.find(part => part.name === 'Shield');
    assert.deepEqual([shield.ap, shield.optional, shield.slBonus], [2, true, 1], profile.id);
  }
  assert.ok(withShield.some(profile => profile.id === 'E0-P-099'));
  assert.ok(withShield.some(profile => profile.id === 'E0-P-063'));
});

test('Q36 données : River Trolls (L26 p. 89) Stealth facultatif, Plague Monk (L16 p. 90) options, Zurn (L21 p. 84) note à astérisque', () => {
  assert.deepEqual(find('L26', 'E0-P-963').optionalSpecialRules, ['Stealth']);
  const monk = find('L16', 'E0-P-512');
  assert.ok(monk.notes.some(note => /^Options: Three of the Plague Monks are suffering from Foaming Lungrot/.test(note)));
  assert.equal(monk.optionalTraits, undefined);
  assert.deepEqual(find('L21', 'E0-P-705').notes, ['* Gain the Bite +3 Creature Trait.']);
  // Une liste de Traits facultatifs suivie de prose reste une liste (L19, Child of Ulric).
  assert.ok(load('L19').some(profile => (profile.optionalTraits || []).some(trait => trait.name === 'Blessed')));
});

test('Q36 outil : « Arcane Magick (Beasts) Bookish » donne deux talents', () => {
  assert.deepEqual(splitGluedTalent('Arcane Magick (Beasts) Bookish'), ['Arcane Magic (Beasts)', 'Bookish']);
});
});

describe('contrôle — Ward et listes de talents', () => {
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
});

describe('extraction — L11', () => {
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
});

describe('portées des attaques', () => {
const BOOKS = ['L01', 'L02', 'L03', 'L04', 'L07', 'L11', 'L12', 'L13', 'L14', 'L16', 'L17', 'L18', 'L19', 'L20', 'L21', 'L22', 'L23', 'L24', 'L25', 'L26'];
const library = BOOKS.flatMap(id => JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles);
const byId = id => library.find(profile => profile.id === id);

// Q41 : « Ranged (Bow) +7 (50) » (V4) : le nombre entre parenthèses est la portée en yards.

test('Q41 lecture : portée après les dégâts, avant les dégâts, astérisque', () => {
  assert.deepEqual(readTraitItem('Ranged (Bow) +7 (50)'), { name: 'Ranged', rating: '+7', param: 'Bow', printed: 50 });
  assert.equal(readTraitItem('Ranged (Dwarf Crossbow) (80) +10 (Damaging, Impale, Reload 1)').printed, 80);
  assert.equal(readTraitItem('Ranged (Longbow) +10* (100)').printed, 100);
});

test('Q41 L04 E0-P-176 et L03 E0-P-157 : portée sur le profil et sur le participant (action à distance, CT)', () => {
  const bow = byId('E0-P-176').attacks.find(attack => attack.name === 'Bow');
  assert.equal(bow.rangeYards, 50);
  const outlaw = buildParticipantFromBestiary('E0-P-176', { library });
  const action = outlaw.actions.find(item => item.name === 'Bow');
  assert.equal(action.rangeYards, 50);
  assert.equal(action.attr, 'CT');
  assert.equal(outlaw.actions.find(item => item.name === 'Dagger').rangeYards ?? null, null);
  assert.equal(byId('E0-P-157').attacks.find(attack => attack.name === 'Pistol').rangeYards, 20);
  assert.equal(buildParticipantFromBestiary('E0-P-157', { library }).actions.find(item => item.name === 'Pistol').rangeYards, 20);
});

test('Q41 L11 E0-P-044 : « Longbow +10* (100) » avec astérisque', () => {
  assert.equal(byId('E0-P-044').attacks.find(attack => attack.name === 'Longbow').rangeYards, 100);
});

test('Q41 : toute arme à distance dont la portée est imprimée la garde (la ligne du livre fait foi, 39 sans portée imprimée)', () => {
  const ranged = library.flatMap(profile => (profile.attacks || []).filter(attack => attack.trait === 'Ranged').map(attack => ({ profile, attack })));
  const withRange = ranged.filter(item => item.attack.rangeYards > 0);
  assert.ok(withRange.length >= 80, `portées gardées : ${withRange.length}`);
  assert.ok(withRange.every(item => Number.isInteger(item.attack.rangeYards)));
});

test('Q41 contrôle : printedRanges lit les trois formes imprimées', () => {
  const block = normalizeBlockText('Traits: Armour (Leather) 1, Ranged (Bow) +7 (50), Ranged (Dwarf Crossbow) (80) +10 (Impale), Ranged (Longbow) +10* (100), Weapon (Sword) +8 Skills: Dodge 40');
  assert.deepEqual(printedRanges(block).map(item => [item.name, item.range]), [['Bow', 50], ['Dwarf Crossbow', 80], ['Longbow', 100]]);
});

// Faux DOM minimal : assez pour lire le texte rendu.

test('Q41 Points de Destin imprimés (Brunner L04 p.111, Gotrek L16 p.79) gardés et affichés sur la fiche', async () => {
  assert.equal(byId('E0-P-179').fatePoints, 2);
  assert.equal(byId('E0-P-504').fatePoints, 3);
  assert.equal(byId('E0-P-176').fatePoints, undefined);
  const previous = globalThis.document;
  globalThis.document = { createElement: tag => new Node(tag) };
  try {
    const { renderBestiarySheet } = await import('../../../js/ui/bestiary-library.js');
    const text = renderBestiarySheet(byId('E0-P-179'), { terms: new Map() }).textContent;
    assert.match(text, /Points de Destin imprimés : 2/);
    assert.match(text, /portée 10 m/);
  } finally {
    if (previous === undefined) delete globalThis.document; else globalThis.document = previous;
  }
});
});

describe('Sea Wardens (L14)', () => {
const profiles = JSON.parse(readFileSync('js/data/bestiary/L14.json', 'utf8')).profiles;
const byId = id => profiles.find(profile => profile.id === id);
const SEA_WARDENS = [472, 473, 474, 475, 476, 477, 479, 480, 482, 484, 485, 486].map(n => `E0-P-${n}`);

test('Q5 : les 12 profils des Sea Wardens ont attaques, compétences et talents', () => {
  for (const id of SEA_WARDENS) {
    const profile = byId(id);
    assert.ok(profile.attacks?.length, `${id} attaques`);
    assert.ok(profile.skills?.length >= 14, `${id} compétences`);
    assert.ok(profile.talents?.length >= 9, `${id} talents`);
  }
});

test('Q5 : Prince Dalroth (L14 p.45) est complet', () => {
  const dalroth = byId('E0-P-476');
  assert.deepEqual(dalroth.attacks.map(({ name, damage }) => `${name} +${damage}`), ['Elf Bow +8', 'Blade of Darting Steel +8']);
  assert.equal(dalroth.skills.length, 30);
  assert.equal(dalroth.talents.length, 12);
  assert.equal(dalroth.skills.find(skill => skill.name === 'Melee (Fencing)').value, 88);
  assert.equal(dalroth.skills.find(skill => skill.name === 'Intuition').value, 86);
  assert.ok(dalroth.talents.some(talent => talent.name === 'Warrior Born'));
  assert.equal(dalroth.trappings[0], 'Blade of Darting Steel');
  assert.equal(dalroth.stats.CC, 73);
});

test('Q5 : la ligne « Obsession » et l\'état Yenlui ne coupent plus le bloc (Dalloran)', () => {
  const dalloran = byId('E0-P-472');
  assert.ok(dalloran.skills.length >= 30);
  assert.ok(dalloran.talents.some(talent => talent.name === 'Wealthy'));
  assert.ok(dalloran.trappings.includes('Shield'));
});

test('Q5 : fin de mot sur la gouttière et listes de Lores (Revna, Torrelain)', () => {
  assert.ok(byId('E0-P-485').trappings.includes('Sling with Stone Bullets'));
  const torrelain = byId('E0-P-480');
  assert.ok(torrelain.trappings.includes('Sultry Clothing'));
  assert.deepEqual(torrelain.spells['Lore of Shadows'], ['Doppelganger', 'Illusion', 'Mindslip', 'Shadowstep']);
});

test('Q5 : la phrase d\'introduction de l\'équipement n\'est pas un objet', () => {
  const { items } = readTrappings('Whilst Dalroth could equip himself with any assets available from the palace, he can be expected to have the following items to hand: Blade of Darting Steel, Lance');
  assert.deepEqual(items, ['Blade of Darting Steel', 'Lance']);
  assert.deepEqual(readTrappings('Sword, Shield').items, ['Sword', 'Shield']);
});

test('Q5 / Q14 : « Petty: » ouvre la liste des sorts mineurs (plus un sort « Petty: Bearings »)', () => {
  const spells = readSpells({ Spells: 'Petty: Bearings, Dazzle Lore of Light: Pierce the Veil' });
  assert.deepEqual(spells.Petty, ['Bearings', 'Dazzle']);
  assert.deepEqual(spells['Lore of Light'], ['Pierce the Veil']);
  assert.equal(spells.spells, undefined);
});

test('Q5 : un bloc dont la richesse suit un blanc garde son corps', () => {
  const page = [
    ' PRINCE TEST -- NOBLE',
    ' M WS BS S T I Ag Dex Int WP Fel W',
    '  5 73 41 31 31 76 42 55 34 40 42 13',
    '',
    'Gold 3',
    'Traits: Weapon (Sword) +7',
    '',
    'Yenlui State: Dark (-1 SL to Toughness)',
    '',
    'Skills: Cool 50, Dodge 52',
    '',
    'Talents: Luck, Noble Blood'
  ].join('\n');
  const [block] = pageBlocks(page);
  assert.match(block.body, /^Gold 3 Traits: Weapon \(Sword\) \+7 Yenlui State/);
  assert.match(block.body, /Skills: Cool 50, Dodge 52 Talents: Luck, Noble Blood$/);
});
});
