/**
 * Fiche de jeu d'un profil de bestiaire : les valeurs imprimées telles quelles (aucun recalcul de BF, de Taille ni d'armure), les noms
 * reconnus de compétences, de Traits et de talents, les mots-clés. Aucune clause de règle n'est recopiée (voir l'inventaire).
 */
import { SKILL_GROUPS, SKILL_GROUP_ALIASES, skillNameFr } from './bestiary-glossary.mjs';
import { BASE_REFERENTIAL, keywordAncestors, normalizeKeywordText, resolveKeyword } from '../../js/core/creature-keywords.js';

const CARACS = ['M', 'CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'];
const ATTACK_TRAITS = new Set(['Weapon', 'Bite', 'Horns', 'Tail', 'Tail Attack', 'Claws', 'Claw', '2 Claws', 'Beak', 'Slam', 'Tongue Attack', 'Ranged']);
const SIZES = new Set(['tiny', 'little', 'small', 'average', 'large', 'enormous', 'monstrous']);

const isNoise = text => text.length > 40 || /\b(?:the|and|with|who|that|which|his|her|their|they|will|when|from)\b/i.test(text) || /\d/.test(text.replace(/\(.*\)/, ''));

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
    if (!name) { if (trait.name && !isNoise(trait.name)) kept.push({ name: trait.name, unrecognized: true }); else dropped.push(trait.name); continue; }
    kept.push({ name, ...(trait.rating !== undefined ? { rating: trait.rating } : {}), ...(trait.param ? { param: trait.param } : {}), ...(trait.printed !== undefined ? { printed: trait.printed } : {}), ...(traitRefs.get(name) ? { ref: traitRefs.get(name) } : {}) });
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
    if (flags.length) entry.qualities = flags;
    attacks.push(entry);
  }
  for (const trait of traitList) {
    if (!ATTACK_TRAITS.has(trait.name) && trait.name !== 'Weapon') continue;
    if (trait.weapons) { for (const weapon of trait.weapons) attacks.push({ name: weapon.name, damage: weapon.damage, trait: 'Weapon' }); continue; }
    const damage = number(trait.rating);
    if (damage === null || Number.isNaN(damage)) continue;
    attacks.push({ name: trait.param || trait.name, damage, trait: trait.name, ...(trait.name === 'Ranged' ? { ranged: true } : {}) });
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
  const attackSources = traits.kept.filter(trait => !trait.unrecognized);
  const record = {
    id: entry.id, book: entry.book, page: entry.page, physicalPage: entry.physicalPage, kind: entry.kind, blockKey: extracted.key,
    name: displayName(entry.name), nameFr: null,
    ...(entry.kind === 'template' ? { modifiers } : { stats, wounds: extracted.stats.W })
  };
  const size = traits.kept.find(trait => trait.name === 'Size')?.param;
  if (size && SIZES.has(size.toLowerCase())) record.size = size.toLowerCase();
  if (entry.kind !== 'template') {
    const armour = buildArmour(extracted, attackSources);
    if (armour) record.armour = armour;
    const attacks = buildAttacks(extracted, attackSources);
    if (attacks.length) record.attacks = attacks;
  }
  if (skills.kept.length) record.skills = skills.kept;
  // Armure, Armes et Tirs sont des données d'attaque et d'armure ; les attaques naturelles (Bite, Horns, Tail…) restent aussi des Traits.
  const structural = new Set(['Armour', 'Weapon', 'Ranged']);
  const listed = traits.kept.filter(trait => !structural.has(trait.name));
  if (listed.length) record.traits = listed;
  if (optional.kept.length) record.optionalTraits = optional.kept;
  if (extracted.talents?.length) record.talents = extracted.talents.filter(talent => talent.name && !isNoise(talent.name.replace(/\(.*\)/, ''))).map(talent => ({ name: talent.name, ...(talent.rank ? { rank: talent.rank } : {}) }));
  if (extracted.trappings?.length) record.trappings = extracted.trappings.filter(item => item.length <= 60);
  if (extracted.mutations?.length) record.mutations = extracted.mutations;
  if (extracted.spells) record.spells = extracted.spells;
  if (extracted.specialRules?.length) record.specialRules = extracted.specialRules;
  const abilities = [...(entry.abilityRefs || [])];
  if (abilities.length) record.abilities = abilities;
  const keywords = assignKeywords(entry.name, traits.kept, referential);
  if (keywords.length) record.keywords = keywords;
  record._dropped = { skills: skills.dropped, traits: traits.dropped };
  return record;
}
