/**
 * Fiche de jeu d'un profil de bestiaire : les valeurs imprimées telles quelles (aucun recalcul de BF, de Taille ni d'armure), les noms
 * reconnus de compétences, de Traits et de talents, les mots-clés. Aucune clause de règle n'est recopiée (voir l'inventaire).
 */
import { readFileSync } from 'node:fs';
import { SKILL_GROUPS, SKILL_GROUP_ALIASES, skillNameFr } from './bestiary-glossary.mjs';
import { BASE_REFERENTIAL, keywordAncestors, normalizeKeywordText, resolveKeyword } from '../../js/core/creature-keywords.js';
import { TRAPPING_JOINS } from './bestiary-overrides.mjs';

const CARACS = ['M', 'CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'];
const ATTACK_TRAITS = new Set(['Weapon', 'Bite', 'Horns', 'Tail', 'Tail Attack', 'Claws', 'Claw', '2 Claws', 'Beak', 'Slam', 'Tongue Attack', 'Tentacles', 'Ranged', 'Creature Weapons']);
const SIZES = new Set(['tiny', 'little', 'small', 'average', 'large', 'enormous', 'monstrous']);

const CATALOGUE_TALENTS = new Set(JSON.parse(readFileSync('js/data/reference-snapshot.json', 'utf8')).talents.entries.map(entry => String(entry.englishName || '').toLowerCase()).filter(Boolean));
/** Un nom présent au catalogue des talents n'est jamais du bruit (« Iron Will », « Strike to Stun »…). */
export const isCatalogueTalent = text => CATALOGUE_TALENTS.has(text.replace(/\(.*\)/, '').replace(/\s+/g, ' ').trim().toLowerCase());

const isNoise = text => !isCatalogueTalent(text) && (text.length > 40 || /(?:^|\s)[a-z.']/.test(text.replace(/\(.*\)/, '')) || /\b(?:the|and|with|who|that|which|his|her|their|they|will|when|from)\b/i.test(text) || /\d/.test(text.replace(/\(.*\)/, '')));

/** Compétences : seules celles dont le groupe est connu et la valeur chiffrée sont gardées ; le reste est du texte voisin (liste `dropped`). */
export function cleanSkills(skills = []) {
  const kept = [];
  const dropped = [];
  for (const skill of skills) {
    const found = /^([A-Z][A-Za-z' ]+?)(?:\s*\(([^()]{1,40})\))?$/.exec(skill.name.trim());
    const group = found && (SKILL_GROUP_ALIASES[found[1].trim()] || found[1].trim());
    const specificationOk = !found?.[2] || !/\d/.test(found[2]) && found[2].split(/\s+/).length <= 4;
    if (!found || !SKILL_GROUPS.has(found[1].trim()) || !specificationOk || !Number.isFinite(skill.value)) { dropped.push(skill.name); continue; }
    const fr = skillNameFr(`${group}${found[2] ? ` (${found[2].trim()})` : ''}`);
    kept.push({ name: `${group}${found[2] ? ` (${found[2].trim()})` : ''}`, nameFr: fr.nameFr, ...(fr.verified ? {} : { frUnverified: true }), value: skill.value, ...(skill.modifier ? { modifier: true } : {}) });
  }
  return { kept, dropped };
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
    kept.push({ name, ...(trait.rating !== undefined ? { rating: trait.rating } : {}), ...(param ? { param } : {}), ...(trait.printed !== undefined ? { printed: trait.printed } : {}), ...(count ? { count } : {}), ...(trait.weapons ? { weapons: trait.weapons } : {}), ...(trait.conditional ? { conditional: true } : {}), ...(traitRefs.get(name) ? { ref: traitRefs.get(name) } : {}) });
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
    if (/free attack only when charging/i.test(tail)) entry.free = 'charge';
    else if (/lose momentum to make this free attack/i.test(tail)) entry.free = 'momentum';
    const flags = tail.replace(/free attack only when charging|lose momentum to make this free attack/ig, '').replace(/\d+\s*yards?/i, '').split(',').map(part => part.trim()).filter(part => part && part.split(/\s+/).length <= 3 && !/[.:;]/.test(part));
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
    attacks.push({ name: trait.param || trait.name, damage, trait: trait.name, ...(trait.count ? { count: trait.count } : {}), ...(trait.name === 'Ranged' ? { ranged: true } : {}) });
  }
  return attacks;
}

/** Armure : PA imprimés (jamais additionnés à l'Endurance) ; V5 : parties et Bonus d'Endurance imprimé, V4 : Trait « Armour n (total) ». */
export function buildArmour(extracted, traitList) {
  const armour = {};
  if (extracted.armour) {
    if (extracted.armour.toughnessBonus !== undefined) armour.toughnessBonus = extracted.armour.toughnessBonus;
    if (extracted.armour.parts?.length) armour.parts = extracted.armour.parts.map(part => ({ name: part.name, ap: part.ap, ...(part.optional ? { optional: true } : {}), ...(part.locations ? { locations: part.locations } : {}) }));
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
  if (!item.endsWith(')') || /^(?:as|or|and|but|which|that|when|if)\s/i.test(item)) return false;
  const open = item.indexOf('(');
  return open > 0 && item.slice(0, open).trim().length <= 60 && !/[.:;]\s|\s--\s/.test(item.slice(0, open)) && item.lastIndexOf('(') >= open && [...item].reduce((depth, char) => (char === '(' ? depth + 1 : char === ')' ? depth - 1 : depth), 0) === 0;
}

/** Recolle les noms d'équipement imprimés avec des virgules internes (liste `names` du profil) que le découpage à virgules a séparés. */
export function joinTrappings(items, names = []) {
  let list = [...items];
  for (const name of names) {
    const parts = name.split(',').map(part => part.trim());
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
  // Armure, Armes et Tirs sont des données d'attaque et d'armure ; les attaques naturelles (Bite, Horns, Tail…) restent aussi des Traits.
  const structural = new Set(['Armour', 'Weapon', 'Ranged']);
  const listed = traits.kept.filter(trait => !structural.has(trait.name));
  if (listed.length) record.traits = listed;
  if (optional.kept.length) record.optionalTraits = optional.kept;
  // Un Talent du catalogue imprimé dans la liste des Traits d'un profil V4 (« Acute Sense (Vision: as Character Talent) ») est un Talent, pas un Trait.
  const baseName = name => String(name).replace(/\s*\(.*\)\s*$/, '').toLowerCase();
  const listedTalents = new Set((extracted.talents || []).map(talent => baseName(talent.name)));
  const traitTalents = trimmed.filter(trait => !canonical(trait.name) && trait.param && isCatalogueTalent(trait.name) && !listedTalents.has(baseName(trait.name))).map(trait => ({ name: `${trait.name}${trait.param ? ` (${trait.param})` : ''}` }));
  const talents = [...(extracted.talents || []).filter(talent => talent.name && !isNoise(talent.name.replace(/\(.*\)/, ''))).map(talent => ({ name: talent.name, ...(talent.rank ? { rank: talent.rank } : {}) })), ...traitTalents];
  if (extracted.talents?.length || traitTalents.length) record.talents = talents;
  if (extracted.trappings?.length) record.trappings = joinTrappings(extracted.trappings, TRAPPING_JOINS[entry.id]).filter(item => isTrappingName(item) || (TRAPPING_JOINS[entry.id] || []).includes(item));
  if (extracted.notes?.length) record.notes = extracted.notes;
  if (extracted.mutations?.length) record.mutations = extracted.mutations;
  if (extracted.spells) record.spells = extracted.spells;
  const rules = (extracted.specialRules || []).filter(rule => rule.split(/\s+/).length <= 5 && /^[A-Z]/.test(rule) && !/[.;]/.test(rule));
  if (rules.length) record.specialRules = rules;
  if (extracted.starred?.length) record.starred = extracted.starred.map(key => (key === 'W' ? 'wounds' : key));
  const abilities = [...(entry.abilityRefs || [])];
  if (abilities.length) record.abilities = abilities;
  const keywords = assignKeywords(entry.name, traits.kept, referential);
  if (keywords.length) record.keywords = keywords;
  record._dropped = { skills: skills.dropped, traits: traits.dropped };
  return record;
}
