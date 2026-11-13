/**
 * Livres V4 en français (L28, Le Pouvoir derrière le Trône) : le texte de page est mis au format anglais attendu par l'extraction,
 * sans toucher à la géométrie des colonnes, puis les noms des listes de chaque bloc sont rendus par leur nom anglais.
 * Seuls les livres déclarés `language: "fr"` passent ici : la sortie des autres livres est inchangée.
 *
 * - En-tête « M CC CT F E I Ag Dex Int FM Soc B » → « M WS BS S T I Ag Dex Int WP Fel W » : mêmes longueurs, colonnes intactes.
 * - Étiquettes « Compétences : », « Talents : », « Traits : »… → « Skills: »… complétées par des blancs à la même longueur.
 * - Filigrane de l'exemplaire (nom et adresse électronique en bas de page) : effacé, jamais lu ni conservé.
 * - Noms : compétences (glossaire du bestiaire, inversé), talents (catalogue : nom → englishName), Traits (inventaire : nameFr → name).
 *   Un nom inconnu reste tel qu'imprimé : la chaîne l'écarte et le signale (écarts de génération), jamais deviné.
 */
import { readFileSync } from 'node:fs';
import { SKILL_GROUP_FR, SKILL_SPEC_FR } from './bestiary-glossary.mjs';
import { splitList, clean } from './bestiary-blocks.mjs';

const fold = text => String(text).normalize('NFC').replace(/[’‘`]/g, '\'').replace(/[‐-]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
const foldLoose = text => fold(text).replace(/[-\s]+/g, '');

const HEADER_FR = /\bM(\s+)CC(\s+)CT(\s+)F(\s+)E(\s+)I(\s+)Ag(\s+)Dex(\s+)Int(\s+)FM(\s+)Soc(?:(\s+)B\b)?/g;
const LABELS = [['Compétences', 'Skills'], ['Talents', 'Talents'], ['Traits', 'Traits'], ['Possessions', 'Possessions'], ['Mutations', 'Mutations']];
const LABEL_RE = new RegExp(`(^|\\s)(${LABELS.map(([fr]) => fr).join('|')})(\\s?:)`, 'g');
const WATERMARK = /\S+(?: \S+){0,3} - [\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

/** Page d'un livre français, au format anglais, même géométrie (chaque ligne garde sa longueur). */
export function frenchPage(page) {
  return page
    .replace(WATERMARK, found => ' '.repeat(found.length))
    .replace(HEADER_FR, (all, ...gaps) => {
      const [g1, g2, g3, g4, g5, g6, g7, g8, g9, g10, g11] = gaps;
      return `M${g1}WS${g2}BS${g3}S${g4}T${g5}I${g6}Ag${g7}Dex${g8}Int${g9}WP${g10}Fel${g11 !== undefined && typeof g11 === 'string' ? `${g11}W` : ''}`;
    })
    .replace(LABEL_RE, (all, before, label, colon) => {
      const english = `${LABELS.find(([fr]) => fr === label)[1]}:`;
      return `${before}${english.padEnd(label.length + colon.length, ' ')}`;
    })
    // Intitulé « SORTS » de l'encadré, seul dans sa colonne : effacé, pour que l'encadré prolonge le bloc de son PNJ.
    .replace(/(^|\s{2})SORTS(?=\s{2}|\s*$)/gm, (all, before) => `${before}     `)
    .replace(SPELL_LABEL_RE, (all, before, label) => `${before}${spellLabel(label).padEnd(all.length - before.length, ' ')}`);
}

// Encadrés « SORTS » et miracles : « Magie mineure : » → « Petty: », « Sorts d’Arcane : » → « Arcane: », « Domaine de Tzeentch : » et
// « Sorts du domaine de Tzeentch : » → « Tzeentch: », « Sorts de Domaine : » et « Sorts d’Arcane et de Domaine : » → « Spells: »,
// « Miracles d’Ulric : » → « Miracles: ».
const SPELL_LABEL_RE = /(^|\s)((?:Sorts de )?Magie mineure|Sorts d['’]Arcane et de Domaine|Sorts d['’]Arcane|Sorts du domaine de Tzeentch|Domaine de Tzeentch|Sorts de Domaine|Miracles d['’][A-Z][a-z]+)\s?:/g;
const spellLabel = label => {
  if (/Magie mineure$/.test(label)) return 'Petty:';
  if (/^Sorts d.Arcane$/.test(label)) return 'Arcane:';
  if (/Tzeentch$/.test(label)) return 'Tzeentch:';
  if (/^Miracles/.test(label)) return 'Miracles:';
  return 'Spells:';
};

// Compétences : groupe et spécialisation français → anglais (glossaire inversé ; variantes d'écriture du livre).
const SKILL_GROUP_EN = new Map(Object.entries(SKILL_GROUP_FR).map(([en, fr]) => [foldLoose(fr), en]));
const SKILL_SPEC_EN = new Map(Object.entries(SKILL_SPEC_FR).map(([group, specs]) => [group, new Map(Object.entries(specs).reverse().map(([en, fr]) => [foldLoose(fr), en]))]));
// Variantes imprimées par L28 : « Arme d’hast » (singulier), « À deux mains ».
SKILL_SPEC_EN.get('Melee').set(foldLoose('Arme d’hast'), 'Polearm');
SKILL_SPEC_EN.get('Melee').set(foldLoose('À deux mains'), 'Two-Handed');

/** Note à astérisque collée à un élément (« 45** », « Doppelgänger* (voir ci-dessous) », « Peur 2** *Doppelgänger: … ») : gardée telle quelle. */
const withNote = translate => (item, index, all) => {
  const found = /^(.*?)(\s*\*+(?:\s.*|\(.*|\p{Lu}.*)?)?$/su.exec(clean(item));
  const out = translate(found[1]);
  // « Peur 2* (Sort : Effrayant actif) » en fin de liste (dernier élément, ou suivi de la note à astérisque du bloc) : la condition devient cette note (« * Sort : … »).
  const condition = found[2] && /^\s*(\*+)\s*\(([^()]*)\)(\s*\*.*|)$/s.exec(found[2]);
  const applies = condition && (condition[3] || index === all.length - 1);
  if (applies) return `${out}${condition[1]} * ${condition[2].replace(/^./, letter => letter.toUpperCase())}${condition[3]}`;
  // « Doppelgänger* (voir ci-dessous) » au milieu de la liste : la précision reste au Trait, l'astérisque en fin (« Doppelgänger (voir ci-dessous)* »).
  if (condition && !condition[3]) return `${out} (${condition[2]})${condition[1]}`;
  return found[2] ? `${out}${found[2]}` : out;
};

function skillEnglish(item) {
  const found = /^(.+?)\s*(?:\((.*)\))?\s*([+-]?\d+)?$/.exec(clean(item));
  if (!found) return item;
  const group = SKILL_GROUP_EN.get(foldLoose(found[1]));
  if (!group) return item;
  const spec = text => {
    const part = /^(.*?)\s*([+-]?\d+)?$/.exec(clean(text));
    const english = SKILL_SPEC_EN.get(group)?.get(foldLoose(part[1])) || part[1];
    return part[2] !== undefined ? `${english} ${part[2]}` : english;
  };
  const specs = found[2] !== undefined ? ` (${splitList(found[2]).map(spec).join(', ')})` : '';
  return `${group}${specs}${found[3] !== undefined ? ` ${found[3]}` : ''}`;
}

// Talents : catalogue (nom français → nom anglais).
const TALENT_EN = new Map(JSON.parse(readFileSync('js/data/reference-snapshot.json', 'utf8')).talents.entries.filter(entry => entry.nom && entry.englishName).map(entry => [foldLoose(entry.nom), entry.englishName]));

function talentEnglish(item) {
  const found = /^(.+?)(\s*\(.*\))?(\s+\d+)?(\*?)$/.exec(clean(item));
  if (!found) return item;
  const english = TALENT_EN.get(foldLoose(found[1]));
  return english ? `${english}${found[2] || ''}${found[3] || ''}${found[4] || ''}` : item;
}

// Traits : nom français de l'inventaire → nom anglais (Traits V4 d'abord, le livre étant V4), précisions de Taille et de Corruption.
const baseName = name => String(name).replace(/\s*\(.*\)\s*$/, '').replace(/\s+—.*$/, '').trim();
const TRAIT_EN = (() => {
  const traits = JSON.parse(readFileSync('docs/BESTIAIRE_INVENTAIRE.json', 'utf8')).traits.filter(entry => entry.nameFr && /^trait/.test(entry.kind));
  const map = new Map();
  for (const entry of [...traits.filter(item => item.kind === 'trait-V4'), ...traits.filter(item => item.kind !== 'trait-V4')]) {
    const key = foldLoose(baseName(entry.nameFr));
    if (!map.has(key)) map.set(key, baseName(entry.name));
  }
  // Pluriel et coquille imprimés par le livre (« Armes (Coup-de-poing +5, Matraque +7) », « Amure 4 », L28).
  map.set(foldLoose('Armes'), 'Weapon');
  map.set(foldLoose('Amure'), 'Armour');
  return map;
})();
const SIZE_EN = { minuscule: 'Tiny', 'très petite': 'Little', petite: 'Small', moyenne: 'Average', grande: 'Large', énorme: 'Enormous', monstrueuse: 'Monstrous' };
const CORRUPTION_EN = { faible: 'Minor', modérée: 'Moderate', forte: 'Major' };

function traitEnglish(item) {
  // « Armure 2 (Bras 4, Corps 2, Tête 2) » : valeur imprimée avant la précision, rendue dans l'ordre anglais « Armour (…) 2 ».
  const before = /^(.+?)\s+([+-]?\d+\+?)\s*\((.*)\)$/.exec(clean(item));
  const found = before && TRAIT_EN.has(foldLoose(before[1])) ? [null, before[1], null, before[3], ` ${before[2]}`]
    : /^(.+?)(\s*\((.*)\))?((?:\s*[+-]?\d+\+?)?(?:\s*\(\d+\))?)$/.exec(clean(item));
  if (!found) return item;
  const english = TRAIT_EN.get(foldLoose(found[1]));
  if (!english) return item;
  let param = found[3];
  // « À distance (Arbalète +9 (60), Filet +0) » (L28 p. 28) : une arme à distance par élément, à sa portée imprimée.
  const ranged = english === 'Ranged' && param !== undefined && !found[4]?.trim() ? splitList(param).map(part => /^(.*?)\s*([+-]\d+)(?:\s*\((\d+)\))?$/.exec(part)) : null;
  if (ranged?.length && ranged.every(Boolean)) return ranged.map(([, weapon, damage, range]) => `Ranged (${weapon}) ${damage}${range ? ` (${range})` : ''}`).join(', ');
  if (param !== undefined && english === 'Size') param = SIZE_EN[fold(param)] || param;
  if (param !== undefined && english === 'Corruption') param = CORRUPTION_EN[fold(param)] || param;
  return `${english}${param !== undefined ? ` (${param})` : ''}${found[4] || ''}`;
}

const SECTION = /(^|\s)(Skills|Talents|Traits|Possessions|Mutations|Petty|Arcane|Tzeentch|Spells|Miracles):/g;

/** Lignes du corps d'un bloc français, rendues en une ligne aux noms anglais (compétences, talents, Traits) ; le reste tel quel. */
export function translateFrenchBody(bodyLines) {
  const joined = clean(bodyLines.join(' ')).replace(/([a-zà-ÿ])- (?=[a-zà-ÿ])/g, '$1-');
  const marks = [...joined.matchAll(SECTION)];
  if (!marks.length) return bodyLines;
  const parts = [joined.slice(0, marks[0].index)];
  marks.forEach((mark, index) => {
    const start = mark.index + mark[0].length;
    const text = clean(joined.slice(start, index + 1 < marks.length ? marks[index + 1].index : joined.length));
    const label = mark[2];
    const translate = { Skills: withNote(skillEnglish), Talents: withNote(talentEnglish), Traits: withNote(traitEnglish) }[label];
    parts.push(`${label}: ${translate ? splitList(text).map(translate).join(', ') : text}`);
  });
  return [clean(parts.join(' '))];
}
