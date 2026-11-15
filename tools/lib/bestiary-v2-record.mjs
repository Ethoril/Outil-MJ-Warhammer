/**
 * Fiche V5 d'un profil V2 transcrit (noms et chiffres) par la règle de conversion unique (tools/lib/bestiary-v2.mjs). Partagée par
 * tools/build-bestiary-v2-books.mjs (L29, L30) et tools/build-bestiary-l27.mjs (profils non animaux de L27).
 */
import { readFileSync } from 'node:fs';
import { bonus, convertStats, v2Movement, v2Value, woundsV5, weaponAttack, naturalAttack, traitOf, skillsOf, talentRename, skillAsTalent, V2_SPELLS, SIZE_LABEL } from './bestiary-v2.mjs';
import { validateBestiaryRecord } from '../../js/core/bestiary-profiles.js';

const fold = text => String(text).normalize('NFC').toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
const list = text => (text && !/^aucune?s?$/i.test(text.trim()) ? text.split(/,(?![^(]*\))/).map(item => item.trim()).filter(Boolean) : []);

const inventory = JSON.parse(readFileSync('docs/BESTIAIRE_INVENTAIRE.json', 'utf8'));
const traitRef = new Map(inventory.traits.filter(trait => /^trait/.test(trait.kind)).map(trait => [trait.name.replace(/\s*\(.*\)\s*$/, '').trim(), trait.id]).reverse());
const trait = (name, extra = {}) => ({ name, ...extra, ref: traitRef.get(name) });
const snapshot = JSON.parse(readFileSync('js/data/reference-snapshot.json', 'utf8'));
const singular = text => fold(text).split(' ').map(word => word.replace(/s$/, '')).join(' ');
const TALENTS = new Map(snapshot.talents.entries.filter(entry => entry.nom && entry.englishName).map(entry => [singular(entry.nom), entry.englishName]));
const DOMAINS = { nurgle: 'Domaine de Nurgle', slaanesh: 'Domaine de Slaanesh', tzeentch: 'Domaine de Tzeentch', 'nécromancie': 'Domaine de la Nécromancie', 'démonologie': 'Domaine de la Démonologie' };
const spellsOf = type => snapshot.magic.spells.filter(spell => spell.type === type).map(spell => spell.nom);

/** Armes naturelles : n de la créature V5 la plus proche (liste à valider) ; un modificateur V2 imprimé « (BF–1) » s'y ajoute. */
const NATURAL = [
  [/morsure|dents|crocs|bec/, 3, 'Loup V5 (L06 p. 327) : morsure +6 à BF 3'],
  [/griffes|serres/, 3, 'Loup V5 (L06 p. 327) : griffes +6 à BF 3'],
  [/cornes|défenses|sabots/, 4, 'Sanglier V5 (L06 p. 325) : cornes +7 à BF 3'],
  [/pince/, 6, 'Démonette V5 (L06 p. 350) : griffes +9 à BF 3'],
  [/tentacule|pseudopode|langue|queue|dard|barbillon|aile|organe|poing|elle-même/, 3, 'par défaut, comme la morsure du Loup V5']
];
const PROPER = new Set(['khorne', 'nurgle', 'slaanesh', 'tzeentch', 'chaos', 'tchar', 'kurgan', 'marie', 'sanguinaire', 'herman', 'schmidt', 'knute', 'alsgaard', "zhthy'hl",
  'karitamen', 'scarabée', 'mort', 'artilli', 'levrellian', 'fatandira', 'mir', 'haflok', 'strykssen', 'ernst', 'helmuth', 'phrenesay']);
const displayFr = title => {
  const words = title.normalize('NFC').toLowerCase().split(' ');
  return words.map((word, index) => (index === 0 || PROPER.has(word.replace(/,$/, '')) ? word.charAt(0).toUpperCase() + word.slice(1) : word)).join(' ');
};

function attacksOf(entry, stats, rules) {
  const attacks = [];
  // Choix du MJ propres à un profil : armes lues à la place des armes imprimées (`weaponsV5`), attaques de mêlée à BF + n (`customAttacks`),
  // règles qui disent ce choix (`weaponRules`), les armes imprimées restant citées.
  for (const custom of entry.customAttacks || []) attacks.push(naturalAttack(custom.name, { stats, size: entry.size, naturalBonus: custom.bonus, melee: stats.CC ?? stats.CT }));
  rules.push(...(entry.weaponRules || []));
  // Les munitions (« 10 carreaux », « 10 flèches ») accompagnent l'arme : ce ne sont pas des attaques.
  // Le malus imprimé « (BF–2) » ou « (dégâts BF–1) » vaut pour tout le groupe (« griffes et dents (BF–2) », Nurglings L29 p. 242) :
  // lu sur l'élément entier avant de le couper en « et » / « ou ».
  const groups = list(entry.weaponsV5 ?? entry.weapons).flatMap(item => {
    const modifier = /\((?:dégâts\s+)?BF\s*[–-]\s*(\d)\)/.exec(item)?.[1];
    return item.replace(/\s*\((?:dégâts\s+)?BF\s*[–-]\s*\d\)/, '').split(/\s+(?:et|ou)\s+(?![^(]*\))/).map(part => ({ part, modifier: Number(modifier || 0) }));
  });
  for (const { part, modifier } of groups.filter(({ part }) => !/^\d+\s+(?:carreaux|flèches|balles|traits)\b/i.test(part))) {
    const text = part.replace(/\s*\((?:dégâts[^)]*)\)/, '');
    let attack = weaponAttack(text, { stats, size: entry.size });
    for (let words = text.split(' '); !attack && words.length > 1; words = words.slice(0, -1)) attack = weaponAttack(words.slice(0, -1).join(' '), { stats, size: entry.size });
    if (attack) { attacks.push(attack); continue; }
    const natural = NATURAL.find(([pattern]) => pattern.test(fold(text)));
    if (natural && !/bouclier/.test(fold(text))) {
      const name = text.replace(/\s*\(.*\)\s*$/, '').trim();
      // Sans CC (Vers fouettards : 0 %), l'arme naturelle frappe à la CT imprimée.
      attacks.push(naturalAttack(name.charAt(0).toUpperCase() + name.slice(1), { stats, size: entry.size, naturalBonus: natural[1] - modifier, melee: stats.CC ?? stats.CT }));
      continue;
    }
    rules.push(`Arme V2 : ${part}`);
  }
  return attacks;
}

export function v2Record(entry, id, blockKey, book) {
  const movement = v2Movement(entry.secondary[4]);
  // Mouvement imprimé aléatoire (« 1–10 », Squigs des tombes) : M de la créature V5 la plus proche (`M` du choix de conversion).
  const stats = convertStats(entry.main.map(v2Value), { M: entry.M ?? movement.M, animal: Boolean(entry.animal) });
  const rules = [];
  // Mouvement imprimé aléatoire (« 1–10 », Squigs des tombes) : rappelé en règle spéciale, M restant celui du choix de conversion.
  if (/^\s*\d+\s*[-–]\s*\d+/.test(entry.secondary[4])) rules.push(`Mouvement aléatoire imprimé : ${String(entry.secondary[4]).trim().replace('-', '–')}`);
  const traits = [];
  const talents = [];
  const spells = {};
  for (const item of list(entry.talents)) {
    const base = item.replace(/\*+$/, '').replace(/\s*\(.*\)\s*$/, '').trim();
    // « Armes naturelles » : déjà rendues par les attaques (griffes, morsure…).
    if (fold(base) === 'armes naturelles') continue;
    const spec = /\(([^)]*)\)/.exec(item)?.[1];
    const traitName = traitOf(base);
    if (traitName === 'Fly') { traits.push(trait('Fly', { rating: String(entry.fly ?? movement.fly ?? '') || undefined })); continue; }
    if (traitName) { traits.push(trait(traitName)); continue; }
    // Sombre savoir (Chaos) : le domaine du dieu de la créature (`god` du choix de conversion), sinon la Démonologie (MJ, 14/11).
    const loreKey = fold(spec || '') === 'chaos' ? (entry.god || 'démonologie') : fold(spec || '');
    const lore = fold(base) === 'sombre savoir' && DOMAINS[loreKey];
    if (lore) { traits.push(trait('Spellcaster', { param: spec })); spells[lore] = spellsOf(lore); continue; }
    // Magie mineure « au choix » : lanceur de sorts avec les sorts mineurs du catalogue, à choisir en séance (MJ, 14/11).
    if (fold(base) === 'magie mineure' && /au choix/.test(spec || '')) {
      traits.push(trait('Spellcaster', { param: `Magie mineure, ${spec}` }));
      spells['Sort Mineur'] = spellsOf('Sort Mineur');
      continue;
    }
    // Magie mineure aux sorts nommés (Karitamen : dissipation, silence) : lanceur de ces sorts, rapprochés du catalogue (MJ, 14/11).
    const named = fold(base) === 'magie mineure' && spec ? spec.split(/,\s*/).map(name => V2_SPELLS[fold(name)]) : [];
    if (named.length && named.every(Boolean)) {
      traits.push(trait('Spellcaster', { param: `Magie mineure (${spec})` }));
      for (const name of named) {
        const spell = snapshot.magic.spells.find(item => item.nom === name);
        spells[spell.type] = [...(spells[spell.type] || []), spell.nom];
      }
      continue;
    }
    const renamed = talentRename(base);
    const talent = renamed ? TALENTS.get(singular(renamed[0])) : TALENTS.get(singular(base));
    // Un renvoi de page imprimé (« (cf. page 117) ») n'est pas une précision du talent.
    const talentSpec = renamed ? renamed[1] : (spec && !/^cf./.test(spec) ? spec : null);
    if (talent) talents.push({ name: talentSpec ? `${talent} (${talentSpec})` : talent });
    else rules.push(item.replace(/\*+$/, ''));
  }
  for (const title of entry.rules.filter(rule => !/^Perspective d.Éradication/i.test(rule))) {
    const traitName = traitOf(title);
    if (traitName && !traits.some(item => item.name === traitName)) traits.push(trait(traitName));
    else if (!traitName) rules.push(title);
  }
  traits.push(trait('Size', { param: SIZE_LABEL[entry.size] }));
  const skills = new Map();
  for (const item of list(entry.skills)) {
    const found = skillsOf(item, stats);
    // Compétence V2 qui est un talent V5 (Baratin, Lire/écrire, Déguisement…) : le talent, une seule fois.
    const asTalent = found.length ? null : skillAsTalent(item);
    const talentName = asTalent && TALENTS.get(singular(asTalent));
    if (talentName) { if (!talents.some(talent => talent.name === talentName)) talents.push({ name: talentName }); continue; }
    if (!found.length) rules.push(`Compétence V2 : ${item}`);
    for (const skill of found) if (!skills.has(skill.name) || skills.get(skill.name).value < skill.value) skills.set(skill.name, skill);
  }
  const ap = [...String(entry.armourPoints || '').matchAll(/(\d+)/g)].map(found => Number(found[1]));
  const armour = { toughnessBonus: bonus(stats.E), ...(ap.length && ap.some(value => value > 0) ? (new Set(ap).size === 1 ? { ap: ap[0] } : { detail: entry.armourPoints }) : {}) };
  const attacks = attacksOf(entry, stats, rules);
  const fate = v2Value(entry.secondary[7]);
  const nameFr = displayFr(entry.printedTitle);
  const out = {
    id, book, page: entry.page, physicalPage: entry.physicalPage, kind: 'profile', blockKey, name: nameFr, nameFr, stats, wounds: woundsV5(stats, entry.size), size: entry.size,
    armour, attacks, skills: [...skills.values()], traits: traits.map(item => Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined))), optionalTraits: [],
    ...(talents.length ? { talents } : {}), ...(rules.length ? { specialRules: [...new Set(rules)] } : {}), ...(Object.keys(spells).length ? { spells } : {}),
    ...(fate ? { fatePoints: fate } : {}), keywords: entry.keywords, nameFrSource: `${book} p.${entry.page}`, sourceEdition: 'V2',
    conversion: { size: entry.size, animal: Boolean(entry.animal), ...(entry.ref ? { reference: entry.ref } : {}) }
  };
  const problems = validateBestiaryRecord(out);
  if (problems.length) throw new Error(`${id} ${nameFr} : ${problems.join(' ; ')}`);
  return out;
}
