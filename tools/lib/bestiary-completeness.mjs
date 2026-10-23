/**
 * Contrôle de complétude d'un profil de bestiaire : ce que le bloc imprimé annonce (talents du catalogue, compétences « Nom (Spé) valeur »)
 * doit figurer dans le JSON du profil. Fonctions pures : le texte brut est fourni par tools/verify-bestiary-stats.mjs.
 */
import { SKILL_GROUP_ALIASES } from './bestiary-glossary.mjs';
import { TRAIT_ALIASES } from './bestiary-complement-data.mjs';

const LABEL = /\b(?:Traits|Skills|Talents|Trappings|Spells|Mutations|Special Rules|Optional Traits|Optional|Armour|Weapons|Equipment|Notes)\s*:/;
const HEADER = / M WS BS S T I Ag[i]? Dex Int WP Fel(?: W)?/;

/** Texte brut normalisé : tirets typographiques, césures « Two- handed » recollées, espaces simples. */
export const normalizeBlockText = text => text.replace(/[­−–—�]/g, '-').replace(/-{2,}/g, '-').replace(/(\w)- (?=[a-z])/g, '$1-').replace(/\s+/g, ' ');

/** Bloc imprimé du profil : du premier chiffre de la ligne de valeurs jusqu'à l'en-tête de caractéristiques suivant (ou la fin de page). */
export function blockAfter(pageText, index) {
  const rest = pageText.slice(index);
  const next = HEADER.exec(rest.slice(10));
  return next ? rest.slice(0, next.index + 10) : rest;
}

function segment(block, label) {
  const start = new RegExp(`\\b${label}\\s*:`).exec(block);
  if (!start) return null;
  const rest = block.slice(start.index + start[0].length);
  const end = LABEL.exec(rest);
  return end ? rest.slice(0, end.index) : rest;
}

/** Découpe sur les virgules hors parenthèses. */
export function splitTopLevel(text) {
  const items = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) { items.push(current.trim()); current = ''; } else current += char;
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

const letters = text => text.toLowerCase().replace(/[^a-z]/g, '');
const group = name => letters(SKILL_GROUP_ALIASES[name.trim()] || name.trim());

/** Clés « groupe|spécialisation|valeur » des compétences imprimées : « Melee (Basic 76) », « Lore (Art 91, Law 96) », « Dodge 98 », « Stealth (Urban) 88 ». */
export function printedSkills(block, catalogueNames = new Set()) {
  const text = segment(block, 'Skills');
  if (text === null) return [];
  const found = [];
  for (const item of splitTopLevel(text)) {
    // Un talent à rang imprimé dans la ligne des compétences (« Dual Wielder 2 », Lokhir L07) n'est pas une compétence.
    const ranked = /^(.+?)\s+(\d)$/.exec(item);
    if (ranked && catalogueNames.has(ranked[1].toLowerCase())) continue;
    let match = /^(.+?)\s*\((.+)\)\s*(\d+)?$/.exec(item);
    if (match && match[3]) { found.push({ label: item, key: `${group(match[1])}|${letters(match[2])}|${match[3]}` }); continue; }
    if (match) {
      // « Group (Spé valeur, Spé valeur) » : le dernier élément de la liste porte la parenthèse fermante ; on a déjà coupé hors parenthèses.
      for (const part of splitTopLevel(match[2])) {
        const inner = /^(.+?)\s+(\d+)$/.exec(part.trim());
        if (inner) found.push({ label: `${match[1]} (${part.trim()})`, key: `${group(match[1])}|${letters(inner[1])}|${inner[2]}` });
      }
      continue;
    }
    match = /^([A-Z][A-Za-z' ]+?)\s+(\d+)$/.exec(item);
    if (match) found.push({ label: item, key: `${group(match[1])}||${match[2]}` });
  }
  return found;
}

/** Clés des compétences du JSON, comparables à celles de printedSkills. */
export function recordSkillKeys(record) {
  return new Set((record.skills || []).map(skill => {
    const match = /^(.+?)\s*\((.+)\)$/.exec(skill.name);
    return `${group(match ? match[1] : skill.name)}|${match ? letters(match[2]) : ''}|${skill.value}`;
  }));
}

/** Noms du catalogue (anglais) présents dans la rubrique « Talents » du bloc. Le texte voisin collé au dernier talent ne compte que par son début. */
export function printedTalents(block, catalogueNames) {
  const text = segment(block, 'Talents');
  if (text === null) return [];
  const names = [...catalogueNames].sort((a, b) => b.length - a.length);
  const found = [];
  for (const item of splitTopLevel(text).slice(0, 60)) {
    const plain = item.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const hit = names.find(name => plain === name || plain.startsWith(`${name} `) || plain === `${name}!`);
    if (hit) found.push(hit);
  }
  return [...new Set(found)];
}

export const recordTalentNames = record => new Set((record.talents || []).map(talent => talent.name.replace(/\(.*\)/, '').replace(/\s+/g, ' ').trim().toLowerCase()));

/** Manques d'un profil : talents du catalogue et compétences imprimés mais absents du JSON. */
export function completenessGaps(record, block, catalogueNames) {
  const haveTalents = recordTalentNames(record);
  const haveSkills = recordSkillKeys(record);
  return {
    talents: printedTalents(block, catalogueNames).filter(name => !haveTalents.has(name)),
    skills: printedSkills(block, catalogueNames).filter(skill => !haveSkills.has(skill.key)).map(skill => skill.label)
  };
}

// ---- Q11 : contrôle étendu (attaques, Traits, équipement, sorts) ----

const SPELL_LABEL = /\b(?:(?:Petty|Arcane|Chaos|Daemonic|Witchcraft)(?: Spells| Magic)?|Spells|Lore of [A-Z][A-Za-z' ]+?)\s*:/g;
const TRAIT_ALIAS_KEYS = new Map(Object.entries(TRAIT_ALIASES).map(([from, to]) => [letters(from), letters(to.replace(/\(.*\)/, ''))]));
const traitKey = name => { const key = letters(name); return TRAIT_ALIAS_KEYS.get(key) || key; };
const ATTACK = /^(?:(\d+)\s*[×xX-]?\s*)?([A-Za-z][A-Za-z' -]*?)\s*(?:\(([^)]*)\))?\s*\+(\d+)\b/;

/** Attaques imprimées dans la rubrique « Traits » : « Bite +6 », « 2 Claws +7 », « 8 × Tentacles +9 », « Weapon (Sword) +9 (Impale) », « Creature Weapons (Beak +9, 2 Claws +7) ». */
export function printedAttacks(block) {
  const text = segment(block, 'Traits');
  if (text === null) return [];
  const found = [];
  const add = (count, name, damage, label) => found.push({ label, key: `${letters(name)}|${damage}|${count || 1}` });
  for (const item of splitTopLevel(text)) {
    const creature = /^Creature Weapons\s*\((.*)\)$/.exec(item);
    if (creature) {
      for (const part of splitTopLevel(creature[1])) { const m = ATTACK.exec(part); if (m) add(Number(m[1]), m[2], m[4], m[0]); }
      continue;
    }
    const m = ATTACK.exec(item);
    if (m) add(Number(m[1]), m[3] ? m[3] : m[2].replace(/ Attack$/, ''), m[4], m[0]);
  }
  return found;
}

export const recordAttackKeys = record => new Set((record.attacks || []).map(attack => `${letters(attack.name)}|${attack.damage}|${attack.count || 1}`));

/** Traits imprimés (hors attaques « +N » et armure) sous la forme { label, key }. */
export function printedTraits(block) {
  const text = segment(block, 'Traits');
  if (text === null) return [];
  const found = [];
  for (const raw of splitTopLevel(text).slice(0, 40)) {
    // Le texte de la colonne voisine (minuscule initiale, phrase longue) met fin à la liste ; un intitulé « Attack » collé au dernier Trait est retiré.
    if (/^[a-z]/.test(raw) || raw.length > 60) break;
    // Le dernier Trait peut être suivi directement de la prose voisine : on garde les mots à majuscule (et « of », « and »…).
    const words = raw.replace(/\s+Attack$/, '').split(' ');
    const stop = words.findIndex((word, index) => index > 0 && /^[a-z]/.test(word) && !/^(?:of|and|to|in|from|or)$/.test(word));
    const item = (stop > 0 ? words.slice(0, stop) : words).join(' ');
    if (/\+\d/.test(item) || /^Creature Weapons/i.test(item) || /^Armour\b/i.test(item) || /^(?:Weapon|Ranged)\b/.test(item)) continue;
    const name = item.replace(/\(.*?\)/g, ' ').replace(/\*/g, '').replace(/[\d+]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (name.length < 3 || name.length > 40) continue;
    found.push({ label: item, key: traitKey(name) });
  }
  return found;
}

export function recordTraitKeys(record) {
  const keys = new Set();
  for (const trait of [...(record.traits || []), ...(record.optionalTraits || []), ...(record.abilities || [])]) {
    const name = typeof trait === 'string' ? trait : trait?.name;
    if (name) keys.add(traitKey(name));
  }
  return keys;
}

/** Équipement imprimé (rubrique « Trappings »), élément par élément ; s'arrête à la première phrase de la colonne voisine. */
export function printedTrappings(block) {
  const text = segment(block, 'Trappings');
  if (text === null) return [];
  const items = splitTopLevel(text).map(item => item.replace(/\*/g, '').trim()).filter(Boolean);
  const cut = items.findIndex(item => item.length > 70 || /\b(?:is|are|was|has|have|can|will)\b/.test(item));
  return (cut >= 0 ? items.slice(0, cut) : items).map(item => ({ label: item, key: letters(item) })).filter(item => item.key.length >= 3);
}

/** Texte de la colonne voisine glissé dans l'équipement du JSON : minuscule initiale, intitulés de rubrique, phrase avec verbe. */
export const trappingNoise = record => (record.trappings || []).filter(item => /^[a-zà-ÿ]/.test(item) || /\b(?:Skills|Talents|Traits)\b|\b(?:is|are|was|has|have|will|can)\b/.test(item));

/** Sorts imprimés : listes « Petty Spells », « Arcane Spells », « Lore of X », « Spells ». */
export function printedSpells(block) {
  const found = [];
  for (const start of block.matchAll(SPELL_LABEL)) {
    const rest = block.slice(start.index + start[0].length);
    const end = LABEL.exec(rest);
    const next = [...rest.matchAll(SPELL_LABEL)][0];
    const stop = Math.min(end ? end.index : rest.length, next ? next.index : rest.length);
    const items = splitTopLevel(rest.slice(0, stop)).map(item => item.replace(/\*/g, '').trim());
    const cut = items.findIndex(item => !item || item.length > 45);
    for (const item of cut >= 0 ? items.slice(0, cut) : items) found.push({ label: item, key: letters(item) });
  }
  return found;
}

export function recordSpellKeys(record) {
  const names = [];
  const walk = value => {
    if (typeof value === 'string') names.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') { if (value.name) names.push(value.name); if (value.spells) walk(value.spells); }
  };
  walk(record.spells);
  return new Set(names.map(letters));
}

/** Manques étendus d'un profil (attaques, Traits, équipement, sorts) et bruit d'équipement. Comparaison hors ponctuation et casse. */
export function extendedGaps(record, block) {
  const haveAttacks = recordAttackKeys(record);
  const haveTraits = recordTraitKeys(record);
  const attackNames = new Set((record.attacks || []).map(attack => letters(attack.name)));
  const trappings = (record.trappings || []).map(letters);
  const haveSpells = recordSpellKeys(record);
  return {
    attacks: printedAttacks(block).filter(attack => !haveAttacks.has(attack.key)).map(attack => attack.label),
    traits: printedTraits(block).filter(trait => !haveTraits.has(trait.key) && !attackNames.has(trait.key)).map(trait => trait.label),
    trappings: printedTrappings(block).filter(item => !trappings.some(have => have.includes(item.key) || (have.length >= 4 && item.key.includes(have)))).map(item => item.label),
    spells: printedSpells(block).filter(spell => !haveSpells.has(spell.key)).map(spell => spell.label),
    trappingNoise: trappingNoise(record)
  };
}
