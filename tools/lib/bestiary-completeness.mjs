/**
 * Contrôle de complétude d'un profil de bestiaire : ce que le bloc imprimé annonce (talents du catalogue, compétences « Nom (Spé) valeur »)
 * doit figurer dans le JSON du profil. Fonctions pures : le texte brut est fourni par tools/verify-bestiary-stats.mjs.
 */
import { SKILL_GROUP_ALIASES } from './bestiary-glossary.mjs';

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
export function printedSkills(block) {
  const text = segment(block, 'Skills');
  if (text === null) return [];
  const found = [];
  for (const item of splitTopLevel(text)) {
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
    skills: printedSkills(block).filter(skill => !haveSkills.has(skill.key)).map(skill => skill.label)
  };
}
