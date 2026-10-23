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
  const trait = readTraitItemPlain(text);
  // Un astérisque final marque un Trait conditionnel (la note du bloc dit à quelle condition il tombe).
  return trait && /\*+\s*$/.test(text) ? { ...trait, conditional: true } : trait;
}

/** Équipement : la liste, et les notes à astérisque (« *These fade away… ») qui la suivent dans le bloc. */
export function readTrappings(rawText) {
  // L14 : « Whilst Dalroth could equip himself … he can be expected to have the following items to hand: Blade… » ; la phrase d'introduction n'est pas un objet.
  // « …his preferred attire consists of: Crown… » (L16 p. 32) et « …, add the following: Bandages » (L16 p. 45) : même chose en cours de liste.
  // « Trade Tools (Embalmer, Smith). Outside the hold, add the following: Bandages, Restorative Brew » (L16 p. 45) : variante de la liste, pas une phrase.
  const text = rawText.replace(/\.\s+Outside the hold(?=,\s*add the following:)/, '').replace(/^[A-Z][^:]{20,}\b(?:to hand|following items|equipped with|consists of):\s*/, '').replace(/(^|,\s*)(?:add )?the following:\s*/g, '$1');
  // « Sword * Adalbert is still… » (L02 p. 90) : l'astérisque peut être suivi d'une espace.
  const cut = /\s\*\s?(?=[A-Za-z])/.exec(text);
  // Titre en majuscules d'un profil voisin collé à la liste (« Zweihander, Dagger POWER FAMILIAR but familiars… », L17 p. 182) : la liste s'arrête avant.
  const neighbour = /\s[A-Z][A-Z'’-]{2,}(?:\s[A-Z][A-Z'’-]{2,})+\b/.exec(cut ? text.slice(0, cut.index) : text);
  const end = neighbour ? neighbour.index : (cut ? cut.index : text.length);
  // Descriptions d'objets collées à la liste (« …, Jewellery worth 1,750 GC Armour of Skaldour Master Rune of… », L16 p. 7) : un objet de la liste répété ensuite en intitulé coupe la liste.
  let listText = text.slice(0, end);
  const repeats = splitList(listText).filter(item => item.length >= 8).map(item => listText.indexOf(` ${item} `, listText.indexOf(item) + item.length)).filter(at => at > 0);
  if (repeats.length) listText = listText.slice(0, Math.min(...repeats));
  let items = splitList(listText);
  // Description d'un objet de la liste, collée à elle (« …, Throat Slitter, … Amulet of Thrice-Blessed Copper: A verdigris amulet… », L18 p. 60) :
  // l'élément qui contient « Nom : » répète un objet déjà listé ; il est coupé avant ce nom, la description n'est pas de l'équipement.
  const described = items.findIndex(item => /:\s/.test(item.replace(/\([^)]*\)/g, '')));
  if (described >= 0) {
    const before = clean(items[described].slice(0, items[described].indexOf(':')));
    const repeated = items.slice(0, described).filter(item => before.endsWith(item)).sort((a, b) => b.length - a.length)[0];
    const lead = repeated ? clean(before.slice(0, before.length - repeated.length)) : '';
    items = [...items.slice(0, described), ...(lead ? [lead] : [])];
  }
  return { items, notes: cut ? [clean(text.slice(cut.index))] : [] };
}

function readTraitItemPlain(text) {
  const item = clean(text.replace(/\*+$/, ''));
  if (!item) return null;
  // « Breath +12 (Fire) » (Salamander, L07 p. 175) : le Souffle V4 porte ses dégâts imprimés, le type est la précision.
  // Quelques lettres de la colonne voisine peuvent s'intercaler (« Breath +17 nd (Brimstone Fire) », Hagdar L16 p. 84) : écartées.
  const breath = /^Breath\s*([+-]\d+)(?:\s+[a-z]{1,3})?\s*\(([^()]*)\)$/.exec(item) || /^Breath\s*([+-]\d+)\s*\(([^()]*)\)$/i.exec(item);
  if (breath) return { name: 'Breath', param: clean(breath[2]), rating: breath[1] };
  // Attaque (« Weapon (Fangs) +7 », « 2x Weapon (Claws) +10 », « Bite +9 ») suivie du nom d'une capacité collée dans la liste : on ne garde que l'attaque.
  const natural = /^(?:(\d+)\s*[x×\uFFFD]?\s*)?(Weapon|Ranged|Bite|Horns|Tail Attack|Tail|Claws?|Tentacles?|Beak|Slam|Tongue Attack)\b\s*(?:d\s*)?(?:\(([^()]*)\))?\s*([+-]\s?\d+)(?:\s*\((\d+)\))?/i.exec(item);
  if (natural && !/[+-]\d/.test(natural[3] || '')) {
    const trait = { name: natural[2].replace(/^./, letter => letter.toUpperCase()), rating: natural[4].replace(/\s+/g, '') };
    if (natural[3]) trait.param = clean(natural[3]).replace(/([a-z])- (?=[A-Z])/g, '$1-');
    if (natural[1]) trait.count = Number(natural[1]);
    if (natural[5]) trait.printed = Number(natural[5]);
    return trait;
  }
  // « Ranged (Dwarf Crossbow) (80) +10 (Damaging, Impale, Reload 1) » : portée imprimée avant les dégâts, qualités entre parenthèses.
  const ranged = /^(Ranged|Weapon)\s*\(([^()]*)\)\s*\((\d+)\)\s*([+-]\d+)\s*(?:\([^()]*\))?$/i.exec(item);
  // « Blowpipe +1 (20) » (Chameleon Skink, L07 p. 142) : arme à distance imprimée sans « Ranged ( ) » ; portée imprimée entre parenthèses.
  const pipe = /^(Blowpipe)\s*([+-]\d+)\s*\((\d+)\)$/i.exec(item);
  if (pipe) return { name: 'Ranged', param: 'Blowpipe', rating: pipe[2], printed: Number(pipe[3]) };
  // Césure de mise en page dans un nom d'arme (« Aqshy- Infused Powder », Gunna von Sperren L04 p. 65).
  if (ranged) return { name: ranged[1].replace(/^./, letter => letter.toUpperCase()), param: clean(ranged[2]).replace(/([a-z])- (?=[A-Z])/g, '$1-'), rating: ranged[4], printed: Number(ranged[3]) };
  const worn = /^(Armour|Armor)\s*\(([^()]*)\)\s*(\d+)\s*\((\d+)\)$/i.exec(item);
  if (worn) return { name: 'Armour', param: clean(worn[2]), rating: worn[3], printed: Number(worn[4]) };
  const grouped = /^(Weapon|Ranged|Armour|Armor)\s*\((.+)\)$/.exec(item);
  const found = RATING.exec(item);
  if (!found) return { name: item, raw: item };
  const { name, param, rating, printed } = found.groups;
  const trait = { name: clean(name) };
  if (param) trait.param = clean(param);
  if (rating !== undefined) trait.rating = rating;
  if (printed !== undefined) trait.printed = Number(printed);
  // « Fly (80) », « Vol (80) » : une précision purement numérique est la valeur du Trait.
  if (trait.param && /^\d+\+?$/.test(trait.param) && trait.rating === undefined) { trait.rating = trait.param; delete trait.param; }
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
  // Césures de mise en page (« Two- handed », « Pole- arm ») recollées ; « Pole-arm » et « Pole Arm » sont la spécialisation Polearm.
  // Fragment de la colonne voisine entre un nom et sa parenthèse (« Melee rd, (Basic 90, Two-handed 100) », Brokk Ironpick L16 p. 32) : écarté.
  const joined = text.replace(/([\wà-ÿ])- (?=[a-zà-ÿ])/g, '$1-').replace(/\bPole[- ]arm\b/gi, 'Polearm').replace(/(\p{L}) [a-z]{1,3},(?= \()/gu, '$1');
  // Note à astérisque collée à la dernière compétence (« Swim 35 *All Tests connected with… », L01 p. 78) : la liste s'arrête avant.
  for (const rawItem of splitList(joined.replace(/\s\*\s?[A-Z][\s\S]*$/, '')).map(entry => entry.replace(/\s*\*+$/, ''))) {
    // « Language (Magick 74, Reikspiel) 48 » (L18 p. 97) : la dernière spécialisation a sa valeur après la parenthèse.
    const item = rawItem.replace(/\s*\(\+\d+ SL[^)]*\)\s*$/, '').trim().replace(/^(.+?)\s*\(([^)]*\d[^)]*[^\d\s)])\)\s*(\d+)$/, '$1 ($2 $3)');
    // Une ou plusieurs spécialisations avec leur valeur dans la parenthèse : « Melee (Basic 76) », « Melee (Basic 65, Two-Handed 65) ».
    const grouped = /^(.+?)\s*\(([^)]*\d[^)]*)\)$/.exec(item);
    if (grouped) {
      // Valeurs collées sans virgule (« Basic 61 Polearm 51 ») ou séparées par un point (« Politics 73. Warfare 78 ») : coquilles du livre.
      for (const part of splitList(grouped[2].replace(/(\d)\.\s+(?=[A-Z])/g, '$1, ').replace(/(\d)\s+(?=[A-Z][a-z])/g, '$1, '))) {
        const sub = /^(.*?)\s+([+-]?\d+)$/.exec(part);
        if (sub) skills.push({ name: `${clean(grouped[1])} (${clean(sub[1])})`, value: Number(sub[2]), modifier: /^[+-]/.test(sub[2]) });
      }
      continue;
    }
    // « Secret Signs (Guilder)40 » : espace oublié par le livre après la parenthèse.
    const single = /^(.*?)\s+([+-]?\d+)$/.exec(item) || /^(.*\))([+-]?\d+)$/.exec(item);
    skills.push(single ? { name: clean(single[1]), value: Number(single[2]), modifier: /^[+-]/.test(single[2]) } : { name: item, value: null, modifier: false });
  }
  return skills;
}

/** Talents : noms (avec spécialisation entre parenthèses, rang entier final), sans clause. */
export function readTalents(text) {
  return splitList(text).map(item => {
    // Une longue parenthèse est une clause de règle, sauf liste de spécialisations (« Arcane Magic (Beasts, Death, Fire, Heavens, Light, Life, Metal, Shadow) »).
    // Un astérisque final (« Strike Mighty Blow 2* », Krag-Breaker L11 p. 25) marque une valeur conditionnelle : le talent et son rang restent.
    const base = clean(item.replace(/[.*]+$/, '').replace(/\s*\((?:[^()]*\s){7,}[^()]*\)\s*$/, group => (/^\s*\((?:[A-Z][\w'’-]*(?: (?:of )?[A-Z][\w'’-]*){0,2})(?:, (?:[A-Z][\w'’-]*(?: (?:of )?[A-Z][\w'’-]*){0,2}))+\)\s*$/.test(group) ? group : '')).replace(/:.*$/, ''));
    const ranked = /^(.*?)\s+(\d+)$/.exec(base);
    // « Ancestral Grudge 2 (Orcs and Goblins, Skaven) » (Brokk Ironpick, L16 p. 32) : le rang précède la parenthèse de spécialisation.
    const rankedBefore = ranked ? null : /^(.*?)\s+(\d+)\s*(\([^()]*\))$/.exec(base);
    if (rankedBefore) return { name: clean(`${rankedBefore[1]} ${rankedBefore[3]}`), rank: Number(rankedBefore[2]) };
    return ranked ?{ name: clean(ranked[1]), rank: Number(ranked[2]) } : { name: base };
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
const QUALITY_START = /^(?:Accurate|Blackpowder|Blast|Damaging|Defensive|Distract|Entangle|Fast|Hack|Impact|Impale|Penetrating|Pistol|Precise|Pummel|Repeater \d+|Repeater(?!\s+[A-Z])|Shield|Trap Blade|Unbreakable|Wrap|Dangerous|Imprecise|Reload(?: \d+)?|Slow|Tiring|Undamaging|Partial|Ugly|Magical|Unbalanced|Slashing|\d+ yards?|Damage inflict \d+ [A-Z][a-z]+ Conditions?|Free Attack only when Charging|Lose Momentum to make this Free Attack)\b,?\s*/i;

export function readAttacks(text) {
  const attacks = [];
  // Le deux-points est facultatif (L10 V5 : « Bow (50/+7) range of 50 yards with the Impale Quality Hand Weapon (42/+6) »).
  const pattern = /(?:^|\s)([A-Z][^:()]*?)(?:\s*\(([^()]*)\))?\s*(?::\s*)?\(\s*(\d+)\s*\/\s*([+-]?\d+)\s*\)/g;
  const marks = [...text.matchAll(pattern)];
  marks.forEach((mark, index) => {
    const end = index + 1 < marks.length ? marks[index + 1].index : text.length;
    const tail = clean(text.slice(mark.index + mark[0].length, end));
    let name = clean(mark[1]);
    // Sans deux-points, le nom suit la fin de la phrase de l'attaque précédente (« … Impale Quality Hand Weapon ») : coupé après « Quality ».
    // « Repeater Handbow and Bolts: (90/+6) » (L09 p. 122) est un nom d'attaque : « Repeater » n'est une qualité que seul ou suivi d'un nombre.
    const afterQuality = /^.*\b(?:Qualit(?:y|ies)|Flaws?)\s+(?=[A-Z])/.exec(name);
    if (afterQuality && attacks.length) { const previous = attacks[attacks.length - 1]; previous.tail = clean(`${previous.tail || ''} ${afterQuality[0]}`); name = name.slice(afterQuality[0].length); }
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
  // « Shield: +2 AP when Opposing an attack with Dodge or Melee » (Damina Hroska, L09 p. 73) : PA conditionnels, jamais ajoutés d'office (partie facultative avec sa condition).
  for (const part of text.matchAll(/(Optional\s+)?([A-Z][A-Za-z' -]*?):\s*\+(\d+)\s*AP(?:\s+to\s+([A-Za-z ,and]+?))?(?:\s+(when\s+[A-Za-z ,]+?))?(?=\s+(?:Optional|[A-Z][A-Za-z' -]*:)|$)/g)) {
    if (/^Toughness Bonus/.test(part[2])) continue;
    result.parts.push({ name: clean(part[2]), ap: Number(part[3]), optional: Boolean(part[1]) || Boolean(part[5]), ...(part[4] ? { locations: clean(part[4]) } : {}), ...(part[5] ? { condition: clean(part[5]) } : {}) });
  }
  return result;
}

// Intitulés de listes de sorts : « Petty », « Petty Magic Spells », « Arcane and Lore », « Lore of Light », « Light » (Domaine seul), « Lore of Death Magic »… (sans deux-points).
const BARE_LORES = 'Beasts|Death|Fire|Heavens|Life|Light|Metal|Shadows|Hedgecraft|Necromancy|Daemonology|Witchcraft|Tzeentch|Nurgle|Slaanesh|Khorne|Dark Magic';
const SPELL_LABELS = String.raw`Petty(?: Magic(?: Spells)?| Spells)?|Arcane(?: Magic)?(?: and Lore)?(?: Spells)?|Lore of the Big Waaagh!|Lore of [A-Z][^:,]*?|Magic of [A-Z][a-z]+|High Magic|Chaos Magic|(?:${BARE_LORES})(?: Spells)?|[^\s:,]+ Marsh Magic|Little Waaagh!`;
const SPELL_LABEL_ONLY = new RegExp(`^(?:${SPELL_LABELS})$`);
const SPELL_PIECE = new RegExp(`(?:^|\\s)(${SPELL_LABELS}):`);
// Prose à la place d'une liste (« Choose up to 3 spells… », « All Lore of Death spells, at GM's discretion », « As above, plus… »).
const SPELL_PROSE = /\b(?:spells?|knows|Choose|memorised|discretion)\b|^As above/;

/** Intitulé canonique : « Petty Magic Spells » → « Petty », « Lore of Death Magic » → « Lore of Death », « Light » → « Lore of Light ». */
export function canonicalSpellLabel(label) {
  const text = clean(label);
  if (/^Petty\b/.test(text)) return 'Petty';
  if (/^Arcane\b.*\bLore\b/.test(text)) return 'Arcane and Lore';
  if (/^Arcane\b/.test(text)) return 'Arcane';
  const bare = new RegExp(`^(${BARE_LORES})(?: Spells)?$`).exec(text);
  if (bare) return bare[1] === 'Dark Magic' ? 'Lore of Dark Magic' : `Lore of ${bare[1]}`;
  return text.replace(/ Spells$/, '').replace(/^(Lore of (?!Dark Magic$)[A-Z][a-z]+) Magic$/, '$1');
}

/** Noms de sorts d'une liste imprimée : numéros de page, renvois « (see page 137) », césures et point final retirés. */
export function spellNames(text) {
  const sentence = String(text).search(/\.\s/);
  const list = (sentence >= 0 ? text.slice(0, sentence) : text).replace(/\.\s*$/, '');
  return splitList(list.replace(/\(?(?:see )?page \d+\)?/gi, ' ').replace(/(?<=[a-z])-\s+(?=[A-Z])/g, '-').replace(/\s\d{1,3}(?=\s|,|$)/g, ' ').replace(/\*/g, ''))
    .map(item => clean(item)).filter(Boolean);
}

/**
 * Sorts : { « Petty »: [...], « Arcane »: [...], « Lore of X »: [...], spells: [liste sans intitulé], notes: [prose] }.
 * Les intitulés viennent de sections propres (V4) ou du texte d'une section (« Petty Magic: A, B Lore of Death: C », V5 ou liste collée à la précédente).
 */
export function readSpells(sections) {
  const spells = {};
  const addList = (label, text) => {
    const value = clean(text);
    // Une phrase du texte voisin qui commence par « Spells » (« Spells from Colour Magic Lores… », L09 p. 52) n'est pas une liste.
    if (!value || /^[a-z]/.test(value)) return;
    if (SPELL_PROSE.test(value)) { (spells.notes ||= []).push(value.split(/(?<=\.)\s+(?=[A-Z])/).slice(0, 2).join(' ').replace(/\s+\d{1,3}$/, '')); return; }
    const names = spellNames(value);
    if (!names.length) return;
    const key = label === null ? 'spells' : canonicalSpellLabel(label);
    spells[key] = [...(spells[key] || []), ...names.filter(name => !(spells[key] || []).includes(name))];
  };
  const addText = (label, text) => {
    const pieces = String(text).split(SPELL_PIECE);
    addList(label, pieces[0]);
    for (let i = 1; i + 1 < pieces.length; i += 2) addList(pieces[i], pieces[i + 1]);
  };
  for (const [label, text] of Object.entries(sections)) {
    if (label === 'Spells') addText(null, text);
    else if (SPELL_LABEL_ONLY.test(label)) addText(label, text);
  }
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
    // Un « : » dans une parenthèse (« Acute Sense (Vision: as Character Talent) ») fait partie du Trait, pas d'une règle spéciale.
    const colon = item.replace(/\([^)]*\)/g, group => ' '.repeat(group.length)).indexOf(':');
    if (colon >= 0) {
      const head = clean(item.slice(0, colon));
      // « Weapon (Claws) +11 Toxic Bile: … », « Weapon +8 Font of Flame: … » : l'attaque imprimée est un Trait, le titre qui la suit est la règle spéciale.
      const attackHead = /^((?:Weapon|Ranged|Bite|Horns|Tail(?: Attack)?|Claws?|Tentacles?|Beak|Slam|Tongue Attack)\b.*?[+-]\s?\d+(?:\s*\(\d+\))?)\s+([A-Z][A-Za-z'’-]*(?:\s+(?:(?:of|the|and|in|to)\s+)?[A-Z][A-Za-z'’-]*){0,3})$/.exec(head);
      if (attackHead) { const attack = readTraitItem(attackHead[1]); if (attack) out[key].push(attack); rules.push(attackHead[2]); break; }
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
  // Valeurs suivies d'un astérisque (note de bas de bloc, valeur conditionnelle) : signalées, la valeur imprimée reste celle du tableau.
  const starred = CARAC_ORDER.filter((key, index) => /\*/.test(String(block.cells[index] ?? '')));
  if (starred.length) profile.starred = starred;
  const warnings = [];
  if (sections.Attacks) profile.attacks = readAttacks(sections.Attacks);
  if (sections.Armour) profile.armour = readArmour(sections.Armour);
  if (sections.Traits !== undefined) Object.assign(profile, listTraits(sections.Traits, mode, traitDictionary, 'traits'));
  // L10 (V5) : « Armour +3 AP All Locations » ouvre la liste des Traits ; c'est l'armure du profil, sur toutes les zones.
  const traitArmour = /^Armour\s+\+(\d+)\s+AP\b/.exec(sections.Traits || '');
  if (traitArmour && !profile.armour?.parts?.length) profile.armour = { parts: [{ name: 'Armour', ap: Number(traitArmour[1]) }] };
  // « Traits*: » : tous les Traits de la rubrique sont conditionnels (la note à astérisque dit à quelle condition).
  if (profile.traits && /\bTraits\*\s*:/.test(block.body || '')) profile.traits = profile.traits.map(trait => ({ ...trait, conditional: true }));
  if (sections.Traits === undefined && mode === 'v5' && traitDictionary.size) {
    const scanned = readDescribedNames(block.body, traitDictionary).map(readTraitItem).filter(Boolean);
    if (scanned.length) profile.traits = scanned;
  }
  // L10 (V5) : rubrique « Traits and Talents » ; un nom du catalogue des talents est un talent, le reste un Trait.
  if (sections['Traits and Talents']) {
    // Traits décrits (« Nom : clause. ») suivis de la liste des talents sur la ligne suivante (L09 p. 122) : la liste ne reste pas collée à la dernière clause.
    const mixed = sections['Traits and Talents'];
    const cut = /:/.test(mixed) ? mixed.lastIndexOf('. ') : -1;
    const items = cut >= 0 && !/:/.test(mixed.slice(cut + 2)) ? [...splitList(mixed.slice(0, cut + 1)), ...splitList(mixed.slice(cut + 2))] : splitList(mixed);
    const baseName = item => clean(item.replace(/\.$/, '').replace(/\s*\(.*\)\s*$/, '').replace(/\s+\d+$/, ''));
    const flat = name => name.toLowerCase().replace(/[-\s]+/g, ' ');
    const talentNames = new Set([...talentDictionary].map(flat));
    const isTalent = item => talentNames.has(flat(baseName(item)));
    // Un nom connu des deux dictionnaires (Night Vision, Fearless) reste aussi un Trait, comme avant la lecture de cette rubrique.
    // Tous les éléments passent aussi par la lecture des Traits : l'étape suivante (`cleanTraits`) ne garde que les noms de Trait connus.
    const traits = items.map(readTraitItem).filter(Boolean);
    if (traits.length) profile.traits = [...(profile.traits || []), ...traits];
    const talents = readTalents(items.filter(isTalent).join(', '));
    if (talents.length) profile.talents = [...(profile.talents || []), ...talents];
  }
  if (sections['Attack Traits'] !== undefined) Object.assign(profile, listTraits(sections['Attack Traits'], mode, traitDictionary, 'attackTraits'));
  const optional = sections['Optional Traits'] ?? sections.Optional ?? sections.Options;
  // « … Trained (Broken, Drive) Note: The small but vicious dog… » (L06 p. 325) : la note qui suit la liste n'en fait pas partie.
  if (optional !== undefined) profile.optional = splitList(optional.replace(/\s+Note:.*$/, '')).map(readTraitItem).filter(Boolean);
  if (sections.Skills) profile.skills = readSkills(sections.Skills);
  // Liste décrite (V5) : le premier deux-points précède la première virgule. Liste simple avec une clause (« Criminal, …, Doomed: "…", … », L04 p. 64) : lue comme liste.
  const describedTalents = sections.Talents && /:/.test(sections.Talents) && talentDictionary.size && !(sections.Talents.indexOf(',') >= 0 && sections.Talents.indexOf(',') < sections.Talents.indexOf(':'));
  if (sections.Talents) profile.talents = describedTalents ? readDescribedNames(sections.Talents, talentDictionary).map(name => ({ name })) : readTalents(sections.Talents);
  // « Possessions: Mail coat, helmet, axe » (L18 p. 117) : l'équipement d'un mort-vivant.
  const trappingsText = sections.Trappings || sections.Possessions;
  if (trappingsText) {
    const { items, notes } = readTrappings(trappingsText);
    profile.trappings = items;
    if (notes.length) profile.notes = notes;
  }
  if (sections.Mutations) profile.mutations = splitList(sections.Mutations);
  const spells = readSpells(sections);
  if (Object.keys(spells).length) profile.spells = spells;
  if (lead && !/^M\b/.test(lead)) profile.hasLead = true;
  return { profile, warnings, sections };
}
