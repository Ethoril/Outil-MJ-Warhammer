/**
 * Contrôle de complétude d'un profil de bestiaire : ce que le bloc imprimé annonce (talents du catalogue, compétences « Nom (Spé) valeur »)
 * doit figurer dans le JSON du profil. Fonctions pures : le texte brut est fourni par tools/verify-bestiary-stats.mjs.
 */
import { SKILL_GROUP_ALIASES } from './bestiary-glossary.mjs';
import { TRAIT_ALIASES } from './bestiary-complement-data.mjs';

const LABEL = /\b(?:Traits Continued|Traits|Skills|Talents|Trappings|Spells|Mutations|Special Rules|Optional Traits|Optional|Armour by Location|Armour|Weapons|Equipment|Notes|Fate Points?|Miracles|Marks)\s*:/;
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

/** Rubrique en description (L06, L09) : « Hatred (High Elves): See Hatred in… Night Vision: See clearly… » au lieu d'une liste à virgules. */
const isDescribed = text => /^\s*[A-Z](?:[^:,()]|\([^)]*\)){1,70}:\s/.test(text);

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
  for (const raw of splitTopLevel(text)) {
    // « Ride Horse 42 » (L21 p. 41) : parenthèses oubliées par le livre, même lecture que `readSkills`.
    const item = raw.replace(/^Ride ([A-Z][a-z]+) (?=\d)/, 'Ride ($1) ');
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

/**
 * Noms connus (minuscules) sous leurs variantes imprimées : « In-fighter » s'imprime « Infighter » quand la césure de fin de ligne perd le trait d'union.
 * Liste [variante, nom canonique], du plus long au plus court.
 */
const variantCache = new WeakMap();
function nameVariants(names) {
  if (variantCache.has(names)) return variantCache.get(names);
  const list = [];
  for (const name of names) {
    list.push([name, name]);
    if (name.includes('-')) list.push([name.replace(/-/g, ''), name]);
  }
  list.sort((a, b) => b[0].length - a[0].length);
  variantCache.set(names, list);
  return list;
}

/** Noms reconnus au début d'un élément de liste, l'un après l'autre : « Acute Sense (Taste) Attractive » (virgule oubliée par le livre) = deux noms. */
function chainNames(item, variants) {
  const found = [];
  let rest = item.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  while (rest) {
    const hit = variants.find(([variant]) => rest === variant || rest.startsWith(`${variant} `) || rest === `${variant}!`);
    if (!hit) break;
    found.push(hit[1]);
    rest = rest.slice(hit[0].length).replace(/^!/, '').trim();
  }
  return found;
}

/** Noms du catalogue (anglais) présents dans la rubrique « Talents » du bloc. Le texte voisin collé au dernier talent ne compte que par son début. */
export function printedTalents(block, catalogueNames) {
  const text = segment(block, 'Talents');
  if (text === null) return [];
  const variants = nameVariants(catalogueNames);
  const found = [];
  for (const item of splitTopLevel(text).slice(0, 60)) found.push(...chainNames(item, variants));
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
const SPELL_STOP = /\s(?:Trappings\b|(?:Beasts|Death|Fire|Heavens|Life|Light|Metal|Shadows|Hedgecraft|Necromancy|Daemonology|Witchcraft|Tzeentch|High Magic|Magic of [A-Z][a-z]+|Lore of the Big Waaagh!|\S+ Marsh Magic|Little Waaagh!):)/;
const TRAIT_ALIAS_KEYS = new Map(Object.entries(TRAIT_ALIASES).map(([from, to]) => [letters(from), letters(to.replace(/\(.*\)/, ''))]));
const traitKey = name => { const key = letters(name); return TRAIT_ALIAS_KEYS.get(key) || key; };
const ATTACK = /^(?:(\d+)\s*[×xX-]?\s*)?([A-Za-z][A-Za-z' -]*?)\s*(?:\(([^)]*)\))?\s*\+(\d+)\b/;

/** Attaques imprimées dans la rubrique « Traits » : « Bite +6 », « 2 Claws +7 », « 8 × Tentacles +9 », « Weapon (Sword) +9 (Impale) », « Creature Weapons (Beak +9, 2 Claws +7) ». */
export function printedAttacks(block) {
  const text = segment(block, 'Traits');
  if (text === null || isDescribed(text)) return [];
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
  if (text === null || isDescribed(text)) return [];
  const found = [];
  for (const raw of splitTopLevel(text).slice(0, 40)) {
    // Le texte de la colonne voisine (minuscule initiale, phrase longue) met fin à la liste ; un intitulé « Attack » collé au dernier Trait est retiré.
    if (/^[a-z]/.test(raw) || raw.length > 60) break;
    // Le dernier Trait peut être suivi directement de la prose voisine : on garde les mots à majuscule (et « of », « and »…).
    // Q27d : une parenthèse reste d'un seul tenant (« Prejudice (Those she Presumes to be Weak) »), seule la prose qui la suit est écartée.
    const words = raw.replace(/\s+Attack$/, '').match(/\([^()]*\)|\S+/g) || [];
    const stop = words.findIndex((word, index) => index > 0 && /^[a-z]/.test(word) && !/^(?:of|and|to|in|from|or)$/.test(word));
    const item = (stop > 0 ? words.slice(0, stop) : words).join(' ');
    if (/\+\d/.test(item) || /^Creature Weapons/i.test(item) || /^Armour(?:ed)?\b/i.test(item) || /^(?:Weapon|Ranged)\b/.test(item)) continue;
    const name = item.replace(/\(.*?\)/g, ' ').replace(/\*/g, '').replace(/[\d+]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (name.length < 3 || name.length > 40) continue;
    found.push({ label: item, key: traitKey(name) });
  }
  return found;
}

export function recordTraitKeys(record) {
  const keys = new Set();
  for (const trait of [...(record.traits || []), ...(record.optionalTraits || []), ...(record.abilities || []), ...(record.specialRules || [])]) {
    const name = typeof trait === 'string' ? trait : trait?.name;
    if (name) keys.add(traitKey(name));
    // « Large » seul (Trait V4) est gardé comme Size (Large).
    if (name === 'Size' && trait?.param) keys.add(traitKey(trait.param));
  }
  return keys;
}

/** Équipement imprimé (rubrique « Trappings »), élément par élément ; s'arrête à la première phrase de la colonne voisine. */
export function printedTrappings(block) {
  const text = segment(block, 'Trappings');
  if (text === null) return [];
  let items = splitTopLevel(text).map(item => item.replace(/\*/g, '').trim()).filter(Boolean);
  // Q27e : l'Encombrement « 15/2 » ferme la liste V4 ; ce qui le suit (titre en majuscules, prose, liste de sorts du voisin) n'est pas de l'équipement.
  const closing = items.findIndex(item => /\b\d+\/(?:\d+|-)\s+[A-Z]/.test(item));
  if (closing >= 0) items = [...items.slice(0, closing), items[closing].replace(/^(.*?\b\d+\/(?:\d+|-))\s.*$/, '$1')];
  const cut =items.findIndex(item => item.length > 70 || /\b(?:is|are|was|has|have|can|will)\b/.test(item));
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
    // V5 : « Trappings » sans deux-points ; Domaines nus (« Light: », « Witchcraft: »), « High Magic: », « Marsh Magic: » ouvrent aussi une autre liste.
    const other = SPELL_STOP.exec(rest);
    const stop = Math.min(end ? end.index : rest.length, next ? next.index : rest.length, other ? other.index : rest.length);
    const items = splitTopLevel(rest.slice(0, stop)).map(item => item.replace(/\*/g, '').replace(/\s*\((?:see )?page \d+\)/, '').replace(/\s+(?:[A-Z][A-Z'’-]+\s+)+[A-Z][A-Z'’-]+$/, '').replace(/\s+(?:Petty|Arcane)(?: Magic)?(?: and Lore)?$/, '').replace(/\s+\d{1,3}$/, '').trim()).filter(item => !/^(?:Petty Magic|As above)$|\b(?:knows|memorised)\b/.test(item));
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
    else if (value && typeof value === 'object') {
      if (value.name) names.push(value.name);
      // Q14 : { « Petty »: [...], « Lore of X »: [...], spells: [...], notes: [prose] } ; la prose n'est pas une liste de sorts.
      if (value.spells) walk(value.spells);
      for (const [key, list] of Object.entries(value)) if (key !== 'spells' && key !== 'notes' && key !== 'name') walk(list);
    }
  };
  walk(record.spells);
  return new Set(names.map(letters));
}

/** Manques étendus d'un profil (attaques, Traits, équipement, sorts) et bruit d'équipement. Comparaison hors ponctuation et casse. */
export function extendedGaps(record, block) {
  const haveAttacks = recordAttackKeys(record);
  // Q27d : un talent du catalogue imprimé dans la liste des Traits (« Acute Sense (Smell) ») est gardé comme talent.
  const haveTraits = new Set([...recordTraitKeys(record), ...(record.talents || []).map(talent => traitKey(String(talent?.name ?? '').replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim()))]);
  const attackNames = new Set((record.attacks || []).map(attack => letters(attack.name)));
  const haveTraitRatings = new Set((record.traits || []).filter(trait => trait?.rating).map(trait => `${letters(trait.name)}|${String(trait.rating).replace(/\D/g, '')}`));
  const trappings = (record.trappings || []).map(letters);
  const haveSpells = recordSpellKeys(record);
  return {
    // Q27c : un Souffle « Breath +10 (Poison) » est gardé comme Trait (rating +10), pas comme action : il compte comme présent.
    attacks: printedAttacks(block).filter(attack => !haveAttacks.has(attack.key) && !haveTraitRatings.has(attack.key.split('|').slice(0, 2).join('|'))).map(attack => attack.label),
    traits: printedTraits(block).filter(trait => !haveTraits.has(trait.key) && !attackNames.has(trait.key)).map(trait => trait.label),
    trappings: printedTrappings(block).filter(item => !trappings.some(have => have.includes(item.key) || (have.length >= 4 && item.key.includes(have)))).map(item => item.label),
    spells: printedSpells(block).filter(spell => !haveSpells.has(spell.key)).map(spell => spell.label),
    trappingNoise: trappingNoise(record)
  };
}

// ---- Q25 : recherche de la ligne de valeurs avec borne à gauche, profils très incomplets ----

/** Position de la ligne de valeurs dans le texte de la page, ou -1. Le premier chiffre ne doit pas être la fin d'un nombre plus long (« 10 70 60… » ne vaut pas « 0 70 60… »). */
export function findValueRow(text, tokens, name = '') {
  const exact = new RegExp(`(?<![0-9])${tokens.map(token => token.replace(/\*/g, '\\*')).join(' ')}(?![0-9])`, 'g');
  const hits = [...text.matchAll(exact)].map(hit => hit.index);
  // Deux profils d'une même page peuvent imprimer la même ligne de valeurs : on prend celle qui suit le nom du profil.
  if (hits.length > 1) {
    const word = name.toLowerCase().replace(/[^a-z ]/g, ' ').split(' ').find(part => part.length > 2);
    const near = word && hits.find(index => text.slice(Math.max(0, index - 250), index).toLowerCase().includes(word));
    return near ?? hits[0];
  }
  if (hits.length) return hits[0];
  // Une case vide perdue à l'extraction brute s'écrit parfois comme un blanc : on tolère l'absence d'un tiret.
  const loose = new RegExp(`(?:^|[^0-9])${tokens.filter(token => token !== '-').map(token => token.replace('*', '')).join('(?: -)* (?:- )*')}\\*?(?:[^0-9]|$)`);
  return loose.exec(text)?.index ?? -1;
}

const SECTION_WORD = /\b(?:Skills|Talents|Traits|Trappings)\s+[A-Z]/;

/**
 * Profil très incomplet : le JSON n'a ni compétence, ni talent, ni Trait, ni équipement alors que le bloc imprimé annonce une de ces rubriques,
 * y compris sans deux-points (mise en page « Traits Marine Creature: » de L09, que `segment` ne voit pas).
 */
export function veryIncomplete(record, block) {
  const empty = ['skills', 'talents', 'traits', 'trappings'].every(field => !(record[field] || []).length);
  if (!empty) return [];
  const hit = SECTION_WORD.exec(block.slice(0, 1500));
  return hit ? [hit[0]] : [];
}

/**
 * Profils empilés (colonnes imbriquées) : plusieurs en-têtes de caractéristiques se suivent sans rubrique entre eux, puis les rubriques des profils
 * arrivent l'une après l'autre dans l'ordre des profils (L01 p.14, L24 p.20). Le profil de rang n reçoit le n-ième groupe de rubriques.
 * Retourne null hors pile, ou si le nombre de groupes ne correspond pas au nombre de profils (on garde alors le découpage simple).
 */
export function stackedBlock(pageText, index) {
  const headers = [...pageText.matchAll(new RegExp(HEADER.source, 'g'))].map(hit => ({ start: hit.index, end: hit.index + hit[0].length }));
  let own = headers.findLastIndex(header => header.end <= index);
  if (own < 0) return null;
  const linked = i => i >= 0 && i + 1 < headers.length && !LABEL.test(pageText.slice(headers[i].end, headers[i + 1].start));
  let first = own;
  while (linked(first - 1)) first -= 1;
  let last = own;
  while (linked(last)) last += 1;
  const size = last - first + 1;
  if (size < 2) return null;
  const tail = pageText.slice(headers[last].end);
  const from = tail.search(LABEL);
  if (from < 0) return null;
  const groups = [];
  let seen = new Set();
  let start = from;
  for (const hit of tail.slice(from).matchAll(new RegExp(LABEL.source, 'g'))) {
    const label = hit[0].replace(/\s*:$/, '');
    if (seen.has(label)) { groups.push(tail.slice(start, from + hit.index)); start = from + hit.index; seen = new Set(); }
    seen.add(label);
  }
  groups.push(tail.slice(start));
  if (groups.length !== size) return null;
  return groups[own - first];
}

// ---- Q32 : tous les formats (rubriques sans deux-points, descriptions « Nom : texte », « Traits Continued », attaques V5, Souffle) ----

const BARE_HEADINGS = [
  ['Optional Traits', /\bOptional Traits (?=[A-Z])/],
  ['Traits and Talents', /\bTraits and Talents (?=[A-Z])/],
  ['Traits Continued', /\bTraits Continued (?=[A-Z])/],
  ['Skills', /\bSkills (?=[A-Z])/],
  ['Talents', /(?<!and )\bTalents (?=[A-Z])/],
  ['Traits', /(?<!Optional )\bTraits (?!Continued)(?=[A-Z])/],
  ['Trappings', /\bTrappings (?=[A-Z])/]
];

/**
 * Mise en page sans deux-points (L06 livre de base, L09, L10) : « Skills Charm 35 » devient « Skills: Charm 35 » (première occurrence de chaque rubrique),
 * pour que les contrôles de compétences, talents, Traits et équipement lisent ces blocs comme les autres. Un bloc qui a déjà une rubrique à deux-points est rendu tel quel.
 */
export function colonize(block) {
  if (/\b(?:Skills|Talents|Traits|Trappings)\s*:/.test(block)) return block;
  let text = block;
  for (const [label, pattern] of BARE_HEADINGS) text = text.replace(pattern, `${label}: `);
  return text;
}

const escapeRegex = value => value.replace(/[.*+?^$(){}|[\]\\/]/g, '\\$&');

// Alias imprimés lisibles comme nom (« Regenerate ») ; les alias d'attaques (Claws, Tentacles…) ne sont pas des noms de Trait.
const ALIAS_NAMES = Object.entries(TRAIT_ALIASES).filter(([from, to]) => /^[a-z -]+$/.test(from) && !/^Creature Weapons/.test(to)).map(([from]) => from);

/** Table des noms de Traits et de talents cherchés dans les rubriques : variante imprimée en minuscules -> { name, talent }. */
function nameTable(catalogueNames, traitNames) {
  const table = new Map();
  for (const [variant, name] of nameVariants(catalogueNames)) table.set(variant, { name, talent: true });
  for (const raw of [...traitNames, ...ALIAS_NAMES]) {
    const name = raw.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (name.length < 4 || /^(?:armou?r|weapon|ranged|optional)/.test(name)) continue;
    for (const variant of name.includes('-') ? [name, name.replace(/-/g, '')] : [name]) if (!table.has(variant)) table.set(variant, { name, talent: false });
  }
  return table;
}
const tableCache = new WeakMap();
const tableFor = (catalogueNames, traitNames) => {
  const cached = tableCache.get(catalogueNames);
  if (cached?.traitNames === traitNames) return cached.table;
  const table = nameTable(catalogueNames, traitNames);
  tableCache.set(catalogueNames, { traitNames, table });
  return table;
};

/** Textes des rubriques de Traits et de talents du bloc (« Traits », « Traits Continued », « Talents », « Traits and Talents »), hors Optional Traits. */
function traitSegments(block) {
  const texts = [];
  for (const start of block.matchAll(/(?<!Optional )\b(?:Traits and Talents|Traits Continued|Talents|Traits)\s*:/g)) {
    const rest = block.slice(start.index + start[0].length);
    const end = LABEL.exec(rest);
    texts.push(end ? rest.slice(0, end.index) : rest);
  }
  return texts;
}

/** Noms de Traits ou de talents imprimés dans une rubrique, au format description ou liste : { name, talent }. */
function printedNamed(text, table) {
  if (isDescribed(text)) {
    const hits = [];
    for (const [variant, info] of table) {
      for (const hit of text.matchAll(new RegExp(`(?<![A-Za-z'’-])${escapeRegex(variant).replace(/ /g, '\\s+')}(?:\\s*\\([^)]*\\))?(?:\\s+\\d+)?\\s*:`, 'gi'))) hits.push({ start: hit.index, end: hit.index + hit[0].length, info });
    }
    // Un nom contenu dans un nom plus long (« Vision » dans « Night Vision ») n'est pas lu à part.
    return hits.filter(hit => !hits.some(other => other !== hit && other.start <= hit.start && other.end >= hit.end && other.end - other.start > hit.end - hit.start)).map(hit => hit.info);
  }
  const variants = [...table.keys()].sort((a, b) => b.length - a.length).map(variant => [variant, table.get(variant)]);
  const found = [];
  for (const item of splitTopLevel(text).slice(0, 60)) {
    let rest = item.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    while (rest) {
      const hit = variants.find(([variant]) => rest === variant || rest.startsWith(`${variant} `) || rest === `${variant}!`);
      if (!hit) break;
      found.push(hit[1]);
      rest = rest.slice(hit[0].length).replace(/^!/, '').trim();
    }
  }
  return found;
}

/** Attaques V5 de la ligne « Attacks » (« Talons (45/+14) ») et Souffle imprimé dans cette ligne (« Breath (Fire or Poison): … »). */
export function printedV5Attacks(block) {
  const start = /\bAttacks\s/.exec(block);
  if (!start) return [];
  const rest = block.slice(start.index + start[0].length);
  const end = /\bArmour\b/.exec(rest);
  const text = end ? rest.slice(0, end.index) : rest;
  const found = [];
  for (const hit of text.matchAll(/([A-Za-z' -]*?):?\s*\((\d+)\s*\/\s*\+(\d+)\)/g)) {
    // Le nom est la fin du texte qui précède : jusqu'à quatre mots à majuscule (et « of », « and »…), pas la phrase du livre qui le précède (« Lose Momentum to make this free attack Tail »).
    const words = hit[1].trim().split(/\s+/);
    const name = [];
    for (let i = words.length - 1; i >= 0 && name.length < 4; i -= 1) {
      if (!/^[A-Z]/.test(words[i]) && !/^(?:of|and|the|with)$/.test(words[i])) break;
      name.unshift(words[i]);
    }
    while (name.length && /^(?:of|and|the|with)$/.test(name[0])) name.shift();
    if (name.length) found.push({ label: `${name.join(' ')} (${hit[2]}/+${hit[3]})`, name: letters(name.join(' ')), names: name.map((_, i) => letters(name.slice(i).join(' '))), damage: hit[3], breath: false });
  }
  for (const hit of text.matchAll(/\bBreath\s*\(([^)]*)\)/g)) found.push({ label: `Breath (${hit[1]})`, name: 'breath', damage: null, breath: true });
  return found;
}

/**
 * Manques propres aux autres formats : nom de Trait ou de talent (catalogue et inventaire des Traits) imprimé dans une rubrique de Traits ou de talents
 * (liste à virgules, « Nom : description », « Traits Continued ») et absent du profil ; attaque V5 ou Souffle de la ligne « Attacks » absent du profil.
 * `block` est le bloc déjà passé par `colonize`.
 */
export function formatGaps(record, block, catalogueNames, traitNames) {
  const table = tableFor(catalogueNames, traitNames);
  const have = new Set([...recordTraitKeys(record), ...(record.talents || []).map(talent => traitKey(String(talent?.name ?? '').replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim()))]);
  const gaps = { talents: [], traits: [] };
  for (const text of traitSegments(block)) {
    for (const info of printedNamed(text, table)) {
      if (have.has(traitKey(info.name))) continue;
      const list = info.talent ? gaps.talents : gaps.traits;
      if (!list.includes(info.name)) list.push(info.name);
    }
  }
  const attackKeys = new Set((record.attacks || []).map(attack => `${letters(attack.name)}|${attack.damage}`));
  const breathPresent = [...have].some(key => key.includes('breath')) || (record.attacks || []).some(attack => /breath/i.test(attack.name));
  const attacks = [];
  for (const attack of printedV5Attacks(block)) {
    // Une qualité imprimée avant le nom (« Optional Bow and Arrows », « Penetrating Tail », « Free Attack Tail ») ou la fin de la qualité de l'attaque précédente n'est pas le nom : un suffixe qui correspond suffit.
    if (attack.breath ? !breathPresent : !attack.names.some(name => attackKeys.has(`${name}|${attack.damage}`))) attacks.push(attack.label);
  }
  return { talents: gaps.talents.sort(), traits: gaps.traits.sort(), attacks };
}
