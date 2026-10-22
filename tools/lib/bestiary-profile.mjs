/**
 * Lecture structurée d'un bloc de profil (voir bestiary-blocks.mjs) : caractéristiques, Blessures, armure, attaques, compétences,
 * Traits, talents, sorts. Ne garde que des NOMS et des CHIFFRES imprimés ; le texte des clauses n'est jamais conservé.
 */
import { splitSections, splitList, cellValue, clean } from './bestiary-blocks.mjs';

const CARAC_ORDER = ['M', 'CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc', 'W'];

/** Caractéristiques imprimées (null = absente) ; pour un gabarit : modificateurs signés. */
export function readStats(cells) {
  const stats = {};
  CARAC_ORDER.forEach((key, index) => { stats[key] = cellValue(cells[index]); });
  return stats;
}

const RATING = /^(?<name>[^()]*?[A-Za-z!'’.\- ]+?)(?:\s*\((?<param>[^]*)\))?(?:\s+(?<rating>[+-]?\d+\+?))?(?:\s*\((?<printed>\d+)\))?$/;

/** Un élément de liste de Traits : « Armour 3 (7) », « Weapon (Spear) +8 », « Size (Large) », « Web 40 », « Bestial ». */
export function readTraitItem(text) {
  const item = clean(text.replace(/\*+$/, ''));
  if (!item) return null;
  const grouped = /^(Weapon|Ranged|Armour|Armor)\s*\((.+)\)$/.exec(item);
  const found = RATING.exec(item);
  if (!found) return { name: item, raw: item };
  const { name, param, rating, printed } = found.groups;
  const trait = { name: clean(name) };
  if (param) trait.param = clean(param);
  if (rating !== undefined) trait.rating = rating;
  if (printed !== undefined) trait.printed = Number(printed);
  // « Weapon (Warhammer +9, Sword +7) » : plusieurs armes dans les parenthèses.
  if (grouped && /\+\d/.test(grouped[2]) && rating === undefined) {
    trait.weapons = splitList(grouped[2]).map(part => {
      const weapon = /^(.*?)\s*([+-]\d+)$/.exec(part);
      return weapon ? { name: clean(weapon[1]), damage: Number(weapon[2]) } : { name: part, damage: null };
    });
    delete trait.param;
  }
  return trait;
}

/** Compétence : « Melee (Basic 65, Two-Handed 65) », « Entertain (Taunt) 27 », « Dodge +10 », « Cool 48 ». */
export function readSkills(text) {
  const skills = [];
  for (const item of splitList(text)) {
    const grouped = /^(.+?)\s*\(([^)]*\d[^)]*(?:,[^)]*)+)\)$/.exec(item);
    if (grouped) {
      for (const part of splitList(grouped[2])) {
        const sub = /^(.*?)\s+([+-]?\d+)$/.exec(part);
        if (sub) skills.push({ name: `${clean(grouped[1])} (${clean(sub[1])})`, value: Number(sub[2]), modifier: /^[+-]/.test(sub[2]) });
      }
      continue;
    }
    const single = /^(.*?)\s+([+-]?\d+)$/.exec(item);
    skills.push(single ? { name: clean(single[1]), value: Number(single[2]), modifier: /^[+-]/.test(single[2]) } : { name: item, value: null, modifier: false });
  }
  return skills;
}

/** Talents : noms (avec spécialisation entre parenthèses, rang entier final), sans clause. */
export function readTalents(text) {
  return splitList(text).map(item => {
    const base = clean(item.replace(/\s*\((?:[^()]*\s){7,}[^()]*\)\s*$/, ''));
    const ranked = /^(.*?)\s+(\d+)$/.exec(base);
    return ranked ? { name: clean(ranked[1]), rank: Number(ranked[2]) } : { name: base };
  });
}

/** Liste « Nom : clause Nom : clause » (format V5) : noms reconnus d'après un dictionnaire, dans l'ordre d'apparition. */
export function readDescribedNames(text, dictionary) {
  const names = [];
  const escaped = [...dictionary].sort((a, b) => b.length - a.length).map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!escaped.length) return names;
  const pattern = new RegExp(`(?:^|\\s)(${escaped.join('|')})(\\s*\\([^)]*\\))?(\\s+[+\\d][\\d+]*)?\\s*:`, 'g');
  for (const found of text.matchAll(pattern)) names.push(clean(`${found[1]}${found[2] || ''}${found[3] || ''}`));
  return names;
}

/** Attaques V5 : « Hooves and Tusks: (40/+6) Free Attack only when Charging » → { name, value, damage, note }. */
// Qualités, défauts et clauses qui suivent la valeur d'une attaque (le nom de la suivante vient juste après, sans séparateur).
const QUALITY_START = /^(?:Accurate|Blackpowder|Blast|Damaging|Defensive|Distract|Entangle|Fast|Hack|Impact|Impale|Penetrating|Pistol|Precise|Pummel|Repeater(?: \d+)?|Shield|Trap Blade|Unbreakable|Wrap|Dangerous|Imprecise|Reload(?: \d+)?|Slow|Tiring|Undamaging|Partial|Ugly|Magical|Unbalanced|Slashing|\d+ yards?|Free Attack only when Charging|Lose Momentum to make this Free Attack)\b,?\s*/i;

export function readAttacks(text) {
  const attacks = [];
  const pattern = /(?:^|\s)([A-Z][^:()]*?)(?:\s*\(([^()]*)\))?\s*:\s*\(\s*(\d+)\s*\/\s*([+-]?\d+)\s*\)/g;
  const marks = [...text.matchAll(pattern)];
  marks.forEach((mark, index) => {
    const end = index + 1 < marks.length ? marks[index + 1].index : text.length;
    const tail = clean(text.slice(mark.index + mark[0].length, end));
    let name = clean(mark[1]);
    const peeled = [];
    for (let found = QUALITY_START.exec(name); found && found[0].length < name.length; found = QUALITY_START.exec(name)) { peeled.push(found[0].replace(/,\s*$/, '').trim()); name = name.slice(found[0].length); }
    if (peeled.length && attacks.length) { const previous = attacks[attacks.length - 1]; previous.tail = clean(`${previous.tail || ''} ${peeled.join(', ')}`); }
    const attack = { name: clean(name), value: Number(mark[3]), damage: Number(mark[4]) };
    if (mark[2]) attack.detail = clean(mark[2]);
    if (/^Optional/i.test(attack.name)) { attack.optional = true; attack.name = clean(attack.name.replace(/^Optional\s*/i, '')); }
    if (tail) attack.tail = tail;
    attacks.push(attack);
  });
  return attacks;
}

/** Armure V5 : « Toughness Bonus: 4 Hide: +1 AP Optional Light Armour: +1 AP » ; V4 : trait Armour. */
export function readArmour(text) {
  const result = { parts: [] };
  const tb = /Toughness Bonus:\s*(\d+)/.exec(text);
  if (tb) result.toughnessBonus = Number(tb[1]);
  for (const part of text.matchAll(/(Optional\s+)?([A-Z][A-Za-z' -]*?):\s*\+(\d+)\s*AP(?:\s+to\s+([A-Za-z ,and]+?))?(?=\s+(?:Optional|[A-Z][A-Za-z' -]*:)|$)/g)) {
    if (/^Toughness Bonus/.test(part[2])) continue;
    result.parts.push({ name: clean(part[2]), ap: Number(part[3]), optional: Boolean(part[1]), ...(part[4] ? { locations: clean(part[4]) } : {}) });
  }
  return result;
}

/** Sorts : « Petty Magic: A, B Arcane Magic: C » ou liste simple. */
export function readSpells(sections) {
  const spells = {};
  const raw = [sections.Spells, sections['Petty Magic'] && `Petty Magic: ${sections['Petty Magic']}`, sections['Arcane Magic'] && `Arcane Magic: ${sections['Arcane Magic']}`].filter(Boolean).join(' ');
  if (!raw) return spells;
  const parts = raw.split(/(?:^|\s)((?:Petty Magic|Arcane Magic|Lore of [A-Za-z ]+|Chaos Magic|Witchcraft|Daemonology|Necromancy|Hedgecraft|[A-Z][A-Za-z' ]+ Magic|[A-Z][A-Za-z' ]*(?:Lore|Spells))):/).filter(Boolean);
  if (parts.length < 2) return { spells: splitList(raw) };
  for (let i = 0; i + 1 < parts.length; i += 2) spells[clean(parts[i])] = splitList(parts[i + 1]);
  return spells;
}

/**
 * Liste de Traits d'une section : V4 = liste à virgules (une règle spéciale « Nom : clause » arrête la liste et n'est gardée que par son
 * nom) ; V5 = « Nom : clause Nom : clause », noms reconnus d'après le dictionnaire.
 */
export function listTraits(text, mode, dictionary, key) {
  const out = { [key]: [] };
  if (mode === 'v5' && dictionary.size && /:/.test(text)) {
    out[key] = readDescribedNames(text, dictionary).map(readTraitItem).filter(Boolean);
    return out;
  }
  const rules = [];
  for (const item of splitList(text)) {
    const colon = item.indexOf(':');
    if (colon >= 0) {
      const head = clean(item.slice(0, colon));
      const known = [...dictionary].filter(name => head === name || head.startsWith(`${name} `)).sort((a, b) => b.length - a.length)[0];
      if (known && head !== known) { out[key].push(readTraitItem(known)); rules.push(clean(head.slice(known.length))); } else rules.push(head);
      break;
    }
    const trait = readTraitItem(item);
    if (trait) out[key].push(trait);
  }
  if (rules.length) out.specialRules = rules;
  return out;
}

/** Profil structuré d'un bloc : { stats, sections… } (aucune clause recopiée). */
export function parseBlock(block, { traitDictionary = new Set(), talentDictionary = new Set() } = {}) {
  const { sections, lead, mode } = splitSections(block.bodyLines);
  const profile = { title: block.title, stats: readStats(block.cells) };
  const warnings = [];
  if (sections.Attacks) profile.attacks = readAttacks(sections.Attacks);
  if (sections.Armour) profile.armour = readArmour(sections.Armour);
  if (sections.Traits !== undefined) Object.assign(profile, listTraits(sections.Traits, mode, traitDictionary, 'traits'));
  if (sections.Traits === undefined && mode === 'v5' && traitDictionary.size) {
    const scanned = readDescribedNames(block.body, traitDictionary).map(readTraitItem).filter(Boolean);
    if (scanned.length) profile.traits = scanned;
  }
  if (sections['Attack Traits'] !== undefined) Object.assign(profile, listTraits(sections['Attack Traits'], mode, traitDictionary, 'attackTraits'));
  const optional = sections['Optional Traits'] ?? sections.Optional;
  if (optional !== undefined) profile.optional = splitList(optional).map(readTraitItem).filter(Boolean);
  if (sections.Skills) profile.skills = readSkills(sections.Skills);
  if (sections.Talents) profile.talents = /:/.test(sections.Talents) && talentDictionary.size ? readDescribedNames(sections.Talents, talentDictionary).map(name => ({ name })) : readTalents(sections.Talents);
  if (sections.Trappings) profile.trappings = splitList(sections.Trappings);
  if (sections.Mutations) profile.mutations = splitList(sections.Mutations);
  const spells = readSpells(sections);
  if (Object.keys(spells).length) profile.spells = spells;
  if (lead && !/^M\b/.test(lead)) profile.hasLead = true;
  return { profile, warnings, sections };
}
