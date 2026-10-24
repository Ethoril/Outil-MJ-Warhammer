/**
 * Fiche de jeu d'un profil de bestiaire : les valeurs imprimées telles quelles (aucun recalcul de BF, de Taille ni d'armure), les noms
 * reconnus de compétences, de Traits et de talents, les mots-clés. Aucune clause de règle n'est recopiée (voir l'inventaire).
 */
import { readFileSync } from 'node:fs';
import { SKILL_GROUPS, SKILL_GROUP_ALIASES, skillNameFr } from './bestiary-glossary.mjs';
import { BASE_REFERENTIAL, keywordAncestors, normalizeKeywordText, resolveKeyword } from '../../js/core/creature-keywords.js';
import { OPTIONAL_NOTES, OPTIONAL_RULES_KEPT, TRAITS_KEPT_AS_RULES, TRAPPING_JOINS, TRAPPING_TRIMS } from './bestiary-overrides.mjs';

const CARACS = ['M', 'CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'];
const ATTACK_TRAITS = new Set(['Weapon', 'Bite', 'Horns', 'Tail', 'Tail Attack', 'Claws', 'Claw', '2 Claws', 'Beak', 'Slam', 'Tongue Attack', 'Tentacles', 'Ranged', 'Creature Weapons']);
const SIZES = new Set(['tiny', 'little', 'small', 'average', 'large', 'enormous', 'monstrous']);

const CATALOGUE_TALENTS = new Set(JSON.parse(readFileSync('js/data/reference-snapshot.json', 'utf8')).talents.entries.map(entry => String(entry.englishName || '').toLowerCase()).filter(Boolean));
/** Un nom présent au catalogue des talents n'est jamais du bruit (« Iron Will », « Strike to Stun »…). */
export const isCatalogueTalent = text => CATALOGUE_TALENTS.has(text.replace(/\(.*\)/, '').replace(/\s+/g, ' ').trim().toLowerCase());

/** Noms de talents imprimés autrement que le catalogue (coquilles, tirets, V4 → V5) : même talent, nom du catalogue. « Strider » n'a pas d'équivalent au catalogue : inchangé. */
const TALENT_ALIASES = new Map(Object.entries({
  'read/ write': 'Read/Write', warleader: 'War Leader', 'war leader': 'War Leader', 'fleet footed': 'Fleet-footed', 'public speaking': 'Public Speaker', 'public-speaking': 'Public Speaker',
  resistance: 'Resistant', 'nimble fingered': 'Nimble-fingered', 'stout-hearted': 'Stout-hearted', 'stout- hearted': 'Stout-hearted', unshakable: 'Unshakeable',
  'strong-minded': 'Strong-minded', 'strong minded': 'Strong-minded', 'strong-minded.': 'Strong-minded', 'strong back': 'Strong Back', 'magic resistant': 'Magic Resistance',
  // « Arcane Magick (Beasts) Bookish » (Kelrathi, L09 p. 104) : coquille du livre (Magick), virgule oubliée avant Bookish.
  'arcane magick': 'Arcane Magic',
  // « Doomed! (Find Thy Path and Stray Not) » (Jan Guterwass, L22 p. 62) : point d'exclamation de trop, le talent est Doomed.
  'doomed!': 'Doomed', infighter: 'In-fighter', 'in fighter': 'In-fighter', 'cat tongued': 'Cat-tongued', 'cat- tongued': 'Cat-tongued', 'in- fighter': 'In-fighter', etiqutte: 'Etiquette', ettiquette: 'Etiquette', 'instrinctive diction': 'Instinctive Diction'
}));
export function canonicalTalentName(rawName) {
  // « Acute Sense (Vision: as Character Talent) » (L07) : la précision est « Vision », le reste renvoie au livre de base.
  const name = String(rawName).replace(/:\s*as Character Talent/i, '');
  const found = /^([^(]*?)(\s*\(.*)?$/.exec(String(name).trim());
  const alias = TALENT_ALIASES.get(found[1].replace(/\s+/g, ' ').trim().toLowerCase());
  return alias ? `${alias}${found[2] || ''}` : String(name).trim();
}

/**
 * Un nom de talent suivi du début de la rubrique voisine (« Warleader Stinging Tail: … », « War Wizard Slann Special Rules: … », « Flee! Noble Blood ») :
 * le nom du catalogue reste, le reste est un second talent s'il est au catalogue, sinon le titre de la rubrique voisine (écarté).
 */
export function splitGluedTalent(name) {
  const text = canonicalTalentName(name);
  // « Acute Sense (Taste) Attractive », « Etiquette (Criminals) Gregarious » (L10 pp. 80, 93) : virgule oubliée après une parenthèse, le second nom est un talent du catalogue.
  const afterParen = /^(.+?\([^()]*\))\s+([A-Z][A-Za-z' /-]+)$/.exec(text);
  if (afterParen && isCatalogueTalent(canonicalTalentName(afterParen[2]))) return [...splitGluedTalent(afterParen[1]), canonicalTalentName(afterParen[2])];
  // « Blather Bless (Taal) » (L04 p. 83, virgule oubliée) : la spécialisation finale appartient au dernier talent.
  const specialised = /^([^(\d]+?)(\s*\([^()]*\))$/.exec(text);
  if (specialised && !isCatalogueTalent(specialised[1])) {
    const parts = splitGluedTalent(specialised[1]);
    if (parts.length > 1) return [...parts.slice(0, -1), `${parts[parts.length - 1]}${specialised[2]}`];
  }
  if (/[(\d]/.test(text) || isCatalogueTalent(text)) return [text];
  const words = text.split(' ');
  for (let cut = words.length - 1; cut >= 1; cut -= 1) {
    const head = canonicalTalentName(words.slice(0, cut).join(' '));
    const tail = words.slice(cut).join(' ');
    if (isCatalogueTalent(head) && /^[A-Z]/.test(tail)) return isCatalogueTalent(canonicalTalentName(tail)) ? [head, canonicalTalentName(tail)] : [head];
  }
  return [text];
}

const isNoise = text => !isCatalogueTalent(text) && (text.length > 40 || /(?:^|\s)[a-z.']/.test(text.replace(/\(.*\)/, '')) || /\b(?:the|and|with|who|that|which|his|her|their|they|will|when|from)\b/i.test(text) || /\d/.test(text.replace(/\(.*\)/, '')));

/** Compétences : seules celles dont le groupe est connu et la valeur chiffrée sont gardées ; le reste est du texte voisin (liste `dropped`). */
export function cleanSkills(skills = []) {
  const kept = [];
  const dropped = [];
  const unvalued = [];
  // Liste entière imprimée sans aucune valeur (Gurniksson Hammerback, L03 p. 63 : « Leadership, Lore (Geology), Stealth (Underground) ») : gardée à part, jamais avec une valeur inventée.
  const noValues = skills.length > 0 && skills.every(skill => skill.value === null);
  for (const skill of skills) {
    if (noValues && !skill.unvalued) {
      const found = /^([A-Z][A-Za-z' ]+?)(?:\s*\(([^()]{1,40})\))?$/.exec(skill.name.trim());
      if (found && SKILL_GROUPS.has(found[1].trim()) && !/\d/.test(found[2] || '')) { unvalued.push(skill.name.trim()); continue; }
    }
    // Compétence imprimée sans valeur (« Language (Elthárin) ») : gardée à part, jamais avec une valeur inventée.
    if (skill.unvalued) { if (/^Language \(/.test(skill.name)) unvalued.push(skill.name); else dropped.push(skill.name); continue; }
    const found = /^([A-Z][A-Za-z' ]+?)(?:\s*\(([^()]{1,40})\))?$/.exec(skill.name.trim());
    const group = found && (SKILL_GROUP_ALIASES[found[1].trim()] || found[1].trim());
    const specificationOk = !found?.[2] || !/\d/.test(found[2]) && found[2].split(/\s+/).length <= 4;
    if (!found || !SKILL_GROUPS.has(found[1].trim()) || !specificationOk || !Number.isFinite(skill.value)) { dropped.push(skill.name); continue; }
    const fr = skillNameFr(`${group}${found[2] ? ` (${found[2].trim()})` : ''}`);
    kept.push({ name: `${group}${found[2] ? ` (${found[2].trim()})` : ''}`, nameFr: fr.nameFr, ...(fr.verified ? {} : { frUnverified: true }), value: skill.value, ...(skill.modifier ? { modifier: true } : {}) });
  }
  return { kept, dropped, unvalued };
}

/** Traits : nom canonique (alias V4 → V5), valeur et précision imprimées, lien d'inventaire ; une ligne de texte voisin est écartée. */
export function cleanTraits(traits = [], { canonical, traitRefs }) {
  const kept = [];
  const dropped = [];
  for (const trait of traits) {
    const name = canonical(trait.name);
    if (!name) { dropped.push(trait.name); continue; }
    // « Claws +6 », « 2 Claws +4 », « Slam +6 » (V4) sont des Creature Weapons : l'arme nommée devient la précision, le multiplicateur est gardé.
    const weapon = name === 'Creature Weapons' && !trait.param ? /^(?:(\d+)\s*[x×\uFFFD]?\s*)?([A-Za-z][A-Za-z ]*)$/.exec(String(trait.name).trim()) : null;
    const named = weapon && weapon[2].toLowerCase() !== 'creature weapons' ? weapon : null;
    // Une précision « see below » renvoie à un texte voisin : ce n'est pas une valeur.
    const seeElsewhere = /^see\s/i.test(trait.param || '');
    const param = named ? named[2].replace(/^./, letter => letter.toUpperCase()) : (trait.param && !seeElsewhere ? trait.param : null);
    const count = trait.count || (named?.[1] ? Number(named[1]) : 0);
    kept.push({ name, ...(trait.rating !== undefined ? { rating: trait.rating } : {}), ...(param ? { param } : {}), ...(trait.printed !== undefined ? { printed: trait.printed } : {}), ...(count ? { count } : {}), ...(trait.weapons ? { weapons: trait.weapons } : {}), ...(trait.qualities?.length ? { qualities: trait.qualities } : {}), ...(trait.conditional ? { conditional: true } : {}), ...(trait.alternative ? { alternative: true } : {}), ...(traitRefs.get(name) ? { ref: traitRefs.get(name) } : {}) });
  }
  return { kept, dropped };
}

const number = text => (text == null ? null : Number(String(text).replace(/\s+/g, '')));

/** Attaques : lignes « Nom : (valeur/+dégâts) » du format V5, ou Traits « Weapon (X) +n », « Bite +n »… du format V4. Dégâts imprimés, déjà totaux. */
export function buildAttacks(extracted, traitList) {
  const attacks = [];
  for (const attack of extracted.attacks || []) {
    const entry = { name: attack.name, value: attack.value, damage: attack.damage, ...(attack.detail ? { detail: attack.detail } : {}), ...(attack.optional ? { optional: true } : {}) };
    const tail = attack.tail || '';
    const range = /(\d+)\s*yards?/i.exec(tail);
    if (range) entry.rangeYards = Number(range[1]);
    // « hits that do Damage inflict 1 Bleeding Condition » (Damina Hroska, L09 p. 73) : état infligé par les coups qui blessent.
    const inflicted = /\binflict\s+(\d+)\s+([A-Z][a-z]+)\s+Conditions?/.exec(tail);
    if (inflicted) entry.inflicts = [{ condition: inflicted[2], count: Number(inflicted[1]) }];
    if (/free attack only when charging/i.test(tail)) entry.free = 'charge';
    else if (/lose momentum to make this free attack/i.test(tail)) entry.free = 'momentum';
    const flags = tail.replace(/free attack only when charging|lose momentum to make this free attack/ig, '').replace(/\d+\s*yards?/i, '').split(',').map(part => part.trim()).filter(part => part && /^[A-Z]/.test(part) && part.split(/\s+/).length <= 3 && !/[.:;]/.test(part));
    // « with the Impale, Pistol, and Repeater 3 Qualities, and the Reload 9 Flaw » (L09 p. 122) : qualités et défauts nommés, un par un.
    const listed = /\bwith the (.+?) Qualit(?:y|ies)\b(?:,? and the (.+?) Flaws?\b)?/i.exec(tail);
    const named = listed ? [listed[1], listed[2]].filter(Boolean).flatMap(part => part.split(/,\s*(?:and\s+)?|\s+and\s+/)).map(part => part.trim()).filter(Boolean) : [];
    if (named.length) entry.qualities = [...new Set([...named, ...flags])];
    else if (flags.length) entry.qualities = flags;
    attacks.push(entry);
  }
  for (const trait of traitList) {
    if (!ATTACK_TRAITS.has(trait.name) && trait.name !== 'Weapon') continue;
    if (trait.weapons) { for (const weapon of trait.weapons) attacks.push({ name: weapon.name, damage: weapon.damage, trait: 'Weapon' }); continue; }
    const damage = number(trait.rating);
    if (damage === null || Number.isNaN(damage)) continue;
    // « Ranged (Bow) +7 (50) », « Ranged (Dwarf Crossbow) (80) +10 » : le nombre entre parenthèses d'une arme à distance V4 est sa portée en yards (Q41).
    const rangeYards = trait.name === 'Ranged' && Number.isInteger(trait.printed) && trait.printed > 0 ? trait.printed : null;
    attacks.push({ name: trait.param || trait.name, damage, trait: trait.name, ...(rangeYards ? { rangeYards } : {}), ...(trait.count ? { count: trait.count } : {}), ...(trait.qualities?.length ? { qualities: trait.qualities } : {}), ...(trait.name === 'Ranged' ? { ranged: true } : {}), ...(trait.alternative ? { optional: true } : {}) });
  }
  // Le livre imprime parfois la même attaque deux fois (« Horns (Tusks) +10 » et « Weapon (Tusks) +10 », Krag-Breaker « Horns +13 » et « Weapon (Curling Horns) +13 ») :
  // une arme de même dégâts dont le nom est celui d'une attaque naturelle (ou finit par lui) n'est pas une seconde attaque.
  const twin = (weapon, other) => other !== weapon && other.trait !== 'Weapon' && other.damage === weapon.damage && (weapon.name.toLowerCase() === other.name.toLowerCase() || weapon.name.toLowerCase().endsWith(` ${other.name.toLowerCase()}`));
  return attacks.filter(attack => attack.trait !== 'Weapon' || !attacks.some(other => twin(attack, other)));
}

/** Armure : PA imprimés (jamais additionnés à l'Endurance) ; V5 : parties et Bonus d'Endurance imprimé, V4 : Trait « Armour n (total) ». */
export function buildArmour(extracted, traitList) {
  const armour = {};
  if (extracted.armour) {
    if (extracted.armour.toughnessBonus !== undefined) armour.toughnessBonus = extracted.armour.toughnessBonus;
    if (extracted.armour.parts?.length) armour.parts = extracted.armour.parts.map(part => ({ name: part.name, ap: part.ap, ...(part.optional ? { optional: true } : {}), ...(part.locations ? { locations: part.locations } : {}), ...(part.slBonus ? { slBonus: part.slBonus } : {}), ...(part.condition ? { condition: part.condition } : {}) }));
  }
  const trait = traitList.find(item => item.name === 'Armour');
  if (trait) {
    const ap = number(trait.rating);
    if (Number.isFinite(ap)) armour.ap = ap;
    if (trait.printed !== undefined) armour.printedTotal = trait.printed;
    if (trait.param) armour.detail = trait.param;
  }
  return Object.keys(armour).length ? armour : null;
}

/** Mots-clés : n-grammes du nom imprimé (le plus long d'abord, sans recouvrement), nature Bestial et Marque du Chaos ; spécificité maximale. */
export function assignKeywords(name, traits, referential = BASE_REFERENTIAL) {
  const words = normalizeKeywordText(name.replace(/\(.*?\)/g, ' ')).split(' ').filter(Boolean);
  const found = [];
  const used = new Set();
  for (let size = Math.min(4, words.length); size >= 1; size -= 1) {
    for (let start = 0; start + size <= words.length; start += 1) {
      if ([...Array(size).keys()].some(offset => used.has(start + offset))) continue;
      const term = resolveKeyword(words.slice(start, start + size).join(' '), referential);
      if (!term) continue;
      for (let offset = 0; offset < size; offset += 1) used.add(start + offset);
      found.push(term.id);
    }
  }
  for (const trait of traits) {
    if (trait.name === 'Bestial') found.push('bete');
    if (trait.name === 'Mark of Chaos' && trait.param) { const god = resolveKeyword(trait.param, referential); if (god) found.push(god.id); }
  }
  const unique = [...new Set(found)];
  return unique.filter(id => !unique.some(other => other !== id && keywordAncestors(other, referential).has(id)));
}

/**
 * Un nom d'équipement n'a plus de longueur maximale : un nom long est gardé s'il se termine par sa parenthèse (« Poisoned Dagger (la première
 * Blessure…) ») ; une phrase collée à la liste par la mise en page ne se termine pas ainsi et reste écartée.
 */
export function isTrappingName(item) {
  if (item.length <= 60) return true;
  // Un contenant et son contenu (« Pouch containing Writing Kit and 10 sheets of Parchment and 200 GC », L02 p. 30) est un seul objet.
  if (item.length <= 120 && /^[A-Z][A-Za-z' -]{2,30} containing [A-Z0-9a-z]/.test(item) && !/[.:;]\s|\s--\s/.test(item)) return true;
  // « Maps of the City showing secret passages and poorly guarded homes » (L20 p. 67) : un objet décrit sans verbe conjugué ni ponctuation de phrase est un seul objet.
  if (item.length <= 90 && /^[A-Z]/.test(item) && !/[.:;]\s|\s--\s/.test(item) && !item.includes('(') && !/\b(?:is|are|was|were|has|have|will|can|wishes|remains)\b/.test(item)) return true;
  if (!item.endsWith(')') ||/^(?:as|or|and|but|which|that|when|if)\s/i.test(item)) return false;
  const open = item.indexOf('(');
  return open > 0 && item.slice(0, open).trim().length <= 60 && !/[.:;]\s|\s--\s/.test(item.slice(0, open)) && item.lastIndexOf('(') >= open && [...item].reduce((depth, char) => (char === '(' ? depth + 1 : char === ')' ? depth - 1 : depth), 0) === 0;
}

/** Recolle les noms d'équipement imprimés avec des virgules internes (liste `names` du profil) que le découpage à virgules a séparés. */
export function joinTrappings(items, names = []) {
  let list = [...items];
  for (const name of names) {
    // Les virgules entre parenthèses ne séparent pas deux objets (« all fake (at the GM's discretion, some may… ») ».
    const parts = name.split(/,(?![^()]*\))/).map(part => part.trim());
    const at = list.findIndex((_, start) => parts.every((part, offset) => list[start + offset] === part));
    if (at >= 0) list.splice(at, parts.length, name);
  }
  return list;
}

/** Fiche d'un profil extrait, rattaché à son entrée d'inventaire. */
export function buildRecord(extracted, entry, context) {
  const { canonical, traitRefs, displayName, referential } = context;
  const allTraits = [...(extracted.traits || []), ...(extracted.attackTraits || [])];
  const trimmed = allTraits.filter(trait => trait?.name);
  const traits = cleanTraits(trimmed, { canonical, traitRefs });
  const skills = cleanSkills(extracted.skills || []);
  const optional = cleanTraits(extracted.optional || [], { canonical, traitRefs });
  const stats = {};
  const modifiers = {};
  for (const key of CARACS) {
    const value = extracted.stats[key];
    if (entry.kind === 'template') { if (value !== null) modifiers[key] = value; } else stats[key] = value;
  }
  // Gabarit : le modificateur de Blessures imprimé (colonne W) est conservé (E-D25).
  if (entry.kind === 'template' && extracted.stats.W !== null && extracted.stats.W !== undefined) modifiers.W = extracted.stats.W;
  const attackSources = traits.kept.filter(trait => !trait.unrecognized);
  const record = {
    id: entry.id, book: entry.book, page: entry.page, physicalPage: entry.physicalPage, kind: entry.kind, blockKey: extracted.key,
    name: displayName(entry.name), nameFr: null,
    ...(entry.kind === 'template' ? { modifiers } : { stats, wounds: extracted.stats.W })
  };
  const size = traits.kept.find(trait => trait.name === 'Size')?.param;
  if (size && SIZES.has(size.toLowerCase())) record.size = size.toLowerCase();
  {
    const armour = buildArmour(extracted, attackSources);
    if (armour) record.armour = armour;
    // Gabarit : « Weapon (SB +4) » est un bonus de Force, pas un dégât fixe ; aucune attaque n'est émise (E-D25).
    const attacks = entry.kind === 'template' ? [] : buildAttacks(extracted, attackSources);
    if (attacks.length) record.attacks = attacks;
  }
  if (skills.kept.length) record.skills = skills.kept;
  if (skills.unvalued.length) record.unvaluedSkills = skills.unvalued;
  // Armure, Armes et Tirs sont des données d'attaque et d'armure ; les attaques naturelles (Bite, Horns, Tail…) restent aussi des Traits.
  const structural = new Set(['Armour', 'Weapon', 'Ranged']);
  const listed = traits.kept.filter(trait => !structural.has(trait.name));
  if (listed.length) record.traits = listed;
  if (optional.kept.length) record.optionalTraits = optional.kept;
  // Q40 : la précision imprimée est gardée avec le nom (« Cult (Fanatical or Chaos) »).
  const optionalRules = (extracted.optional || []).filter(trait => trait?.name && !canonical(trait.name) && OPTIONAL_RULES_KEPT.has(trait.name)).map(trait => (trait.param ? `${trait.name} (${trait.param})` : trait.name));
  if (optionalRules.length) record.optionalSpecialRules = optionalRules;
  // Un Talent du catalogue dans la liste facultative (« Trained (…), Sixth Sense », Drakenhund L10 p. 38) n'est pas un Trait : gardé à part, jamais perdu.
  const optionalTalents = (extracted.optional || []).filter(trait => trait?.name && !canonical(trait.name) && isCatalogueTalent(canonicalTalentName(trait.name)))
    .map(trait => ({ name: `${canonicalTalentName(trait.name)}${trait.param ? ` (${trait.param})` : ''}` }));
  if (optionalTalents.length) record.optionalTalents = optionalTalents;
  // Un Talent du catalogue imprimé dans la liste des Traits d'un profil V4 (« Acute Sense (Vision: as Character Talent) ») est un Talent, pas un Trait ; de même « Resistance (Chaos) » (Bella Hornwhistler, L26 p. 58), nom rattaché à Resistant.
  const baseName = name => String(name).replace(/\s*\(.*\)\s*$/, '').toLowerCase();
  const listedTalents = new Set((extracted.talents || []).map(talent => baseName(talent.name)));
  const traitTalents = trimmed.filter(trait => !canonical(trait.name) && trait.param && isCatalogueTalent(canonicalTalentName(trait.name)) && !listedTalents.has(baseName(canonicalTalentName(trait.name)))).map(trait => ({ name: `${canonicalTalentName(trait.name)}${trait.param ? ` (${trait.param.replace(/:\s*as Character Talent/i, '')})` : ''}` }));
  const talents = [...(extracted.talents || []).filter(talent => talent.name).flatMap(talent => splitGluedTalent(talent.name).map((name, index, parts) => ({ name, rank: index === parts.length - 1 ? talent.rank : undefined }))).filter(talent => !isNoise(talent.name.replace(/\(.*\)/, ''))).map(talent => ({ name: talent.name, ...(talent.rank ? { rank: talent.rank } : {}) })), ...traitTalents];
  // Le même talent lu deux fois (liste imprimée et Trait « Resistance (Poison) ») n'est gardé qu'une fois.
  const uniqueTalents = talents.filter((talent, index) => talents.findIndex(other => other.name === talent.name && other.rank === talent.rank) === index);
  if (extracted.talents?.length || traitTalents.length) record.talents = uniqueTalents;
  const trims = TRAPPING_TRIMS[entry.id] || [];
  if (extracted.trappings?.length) record.trappings = joinTrappings(extracted.trappings, TRAPPING_JOINS[entry.id]).map(item => item.replace(/^and\s+(?=[A-Z])/, '')).map(item => trims.find(name => item.startsWith(`${name} `)) ?? item).filter(item => isTrappingName(item) || (TRAPPING_JOINS[entry.id] || []).includes(item));
  const printedNotes = [...(extracted.notes || []), ...(OPTIONAL_NOTES[entry.id] || []).map(text => `Option: ${text}`)];
  if (printedNotes.length) record.notes = printedNotes;
  if (Number.isInteger(extracted.fatePoints)) record.fatePoints = extracted.fatePoints;
  if (extracted.mutations?.length) record.mutations = extracted.mutations;
  if (extracted.spells) record.spells = extracted.spells;
  const rules = [...(extracted.specialRules || []).filter(rule => rule.split(/\s+/).length <= 5 && /^[A-Z]/.test(rule) && !/[.;]/.test(rule)), ...traits.dropped.filter(name => TRAITS_KEPT_AS_RULES.has(name)).map(name => { const printed = trimmed.find(trait => trait.name === name); return printed?.param ? `${name} (${printed.param})` : name; })];
  if (rules.length) record.specialRules = rules;
  if (extracted.starred?.length) record.starred = extracted.starred.map(key => (key === 'W' ? 'wounds' : key));
  const abilities = [...(entry.abilityRefs || [])];
  if (abilities.length) record.abilities = abilities;
  const keywords = assignKeywords(entry.name, traits.kept, referential);
  if (keywords.length) record.keywords = keywords;
  record._dropped = { skills: skills.dropped, traits: traits.dropped };
  return record;
}
