/**
 * Conversion des profils WJDR V2 en V5 : la règle maison du MJ, à un seul endroit (docs/specs/images-pions/conversion-v2-v5.md).
 * - 11/11/2026 (L27, montures et Rapace) : caractéristiques reprises telles quelles, Blessures par la formule V5 selon la Taille,
 *   Perception sur l'Initiative V5 + bonus V2, Esquive sur l'Agilité.
 * - 14/11/2026 (réponses Q13 à Q19 de docs/specs/images-pions/questions-profils.md) : Tailles Énorme et Monstrueuse ; Dex = Ag et I = Ag
 *   hors animaux ; toute valeur 0 % ou « — » absente (Soc 0 → 10 réservé aux animaux) ; armes V2 → armes V5 de même nom ; armes naturelles
 *   en BF + n comme la créature V5 la plus proche ; Vol de la créature V5 proche, sinon valeur entre parenthèses ; homonymes sûrs seulement
 *   pour Traits, talents et compétences, le reste en règles spéciales (noms imprimés, jamais le texte du livre).
 * Module pur : aucune E/S.
 */

export const bonus = value => Math.floor((value ?? 0) / 10);

/** Livre de base V5 (L06) p. 360 : Blessures selon la Taille. */
export const SIZE_FACTOR = Object.freeze({ average: 1, large: 2, enormous: 4, monstrous: 8 });
export const SIZE_LABEL = Object.freeze({ small: 'Small', average: 'Average', large: 'Large', enormous: 'Enormous', monstrous: 'Monstrous' });
export function woundsV5(stats, size) {
  if (size === 'small') return 2 * bonus(stats.E);
  if (!SIZE_FACTOR[size]) throw new Error(`Taille inconnue : ${size}`);
  return (bonus(stats.F) + 2 * bonus(stats.E) + bonus(stats.FM)) * SIZE_FACTOR[size];
}

/** Valeur V2 imprimée (« 45% », « 0% », « — ») → nombre, ou null pour « — ». */
export const v2Value = text => {
  const found = /(\d+)/.exec(String(text ?? ''));
  return found ? Number(found[1]) : null;
};

/**
 * Caractéristiques V5 d'un profil V2 [CC, CT, F, E, Ag, Int, FM, Soc] (nombres, null pour « — »).
 * Animal (montures, bêtes de L27) : Dex absente, Soc 0 → 10, I = 15 pour un cheval (Cheval V5) sinon Ag.
 * Autre (humanoïde, démon, mort-vivant, monstre) : Dex = Ag, I = Ag. Toute autre valeur 0 ou « — » : absente.
 */
export function convertStats(v2, { M, animal = false, horse = false }) {
  const [CC, CT, F, E, Ag, Int, FM, Soc] = v2;
  const keep = value => (value === null || value === 0 ? null : value);
  return {
    M, CC: keep(CC), CT: keep(CT), F: keep(F), E: keep(E), I: horse ? 15 : keep(Ag), Ag: keep(Ag),
    Dex: animal ? null : keep(Ag), Int: keep(Int), FM: keep(FM), Soc: animal && !Soc ? 10 : keep(Soc)
  };
}

/** Mouvement V2 « 4 », « 1 (15) » : M au sol, et la valeur entre parenthèses (Vol) quand aucune créature V5 proche n'en donne. */
export function v2Movement(text) {
  const found = /^\s*(\d+)\s*(?:\((\d+)\))?/.exec(String(text ?? ''));
  return found ? { M: Number(found[1]), fly: found[2] ? Number(found[2]) : null } : { M: null, fly: null };
}

/** L06 p. 360 : dégâts de mêlée des grandes créatures (Grande et Énorme +BF, Monstrueuse +2 × BF), jamais pour les tirs. */
export function meleeDamage(strength, weaponBonus, size) {
  const sb = bonus(strength);
  const extra = size === 'large' || size === 'enormous' ? sb : size === 'monstrous' ? 2 * sb : 0;
  return sb + weaponBonus + extra;
}

/** Armes V5 du Livre de base (L06 p. 293-295) : bonus ajouté au BF (`sb: true`) ou dégâts fixes, portée en mètres. */
export const V5_WEAPONS = Object.freeze({
  'Hand Weapon': { bonus: 4 }, Sword: { bonus: 4 }, Dagger: { bonus: 2 }, Knuckledusters: { bonus: 2 }, Flail: { bonus: 4 },
  'Military Flail': { bonus: 5 }, Halberd: { bonus: 5 }, Spear: { bonus: 4 }, Lance: { bonus: 6 }, Greataxe: { bonus: 6 },
  Warhammer: { bonus: 6 }, Zweihander: { bonus: 5 },
  // Décision du MJ du 14/11 : « arme à deux mains » sans précision = arme V5 à BF + 6.
  'Two-Handed Weapon': { bonus: 6 },
  Rapier: { bonus: 4 }, 'Main Gauche': { bonus: 2 }, Swordbreaker: { bonus: 1 },
  // Absente du Livre de base V5 (L06 p. 293-295) : valeurs imprimées de l'arbalète à répétition des elfes noirs (L09, « Repeater Crossbow and
  // Bolts » : dégâts 8, portée 45, Empaleuse, Répétition 3, Recharge 9), décision du MJ du 14/11 (Fatandira, L30 p. 15).
  'Repeater Crossbow': { ranged: true, bonus: 8, range: 45, qualities: ['Impale', 'Repeater 3', 'Reload 9'] },
  Bow: { ranged: true, bonus: 4, sb: true, range: 50 }, Longbow: { ranged: true, bonus: 4, sb: true, range: 60 },
  Shortbow: { ranged: true, bonus: 3, sb: true, range: 40 }, Crossbow: { ranged: true, bonus: 9, range: 50 },
  'Heavy Crossbow': { ranged: true, bonus: 10, range: 60 }, Sling: { ranged: true, bonus: 6, range: 40 },
  Javelin: { ranged: true, bonus: 3, sb: true, rangeSb: 3 }, 'Throwing Axe': { ranged: true, bonus: 3, sb: true, rangeSb: 2 }
});

/** Armes V2 (noms imprimés) → arme V5 de même nom. Une arme absente de la table reste en règle spéciale. */
export const V2_WEAPONS = Object.freeze({
  'arme à une main': 'Hand Weapon', épée: 'Sword', dague: 'Dagger', 'coup-de-poing': 'Knuckledusters', fléau: 'Flail',
  "fléau d'armes": 'Military Flail', hallebarde: 'Halberd', lance: 'Spear', 'lance de cavalerie': 'Lance', 'hache à deux mains': 'Greataxe',
  'grande hache': 'Greataxe', 'marteau de guerre': 'Warhammer', zweihänder: 'Zweihander', 'épée à deux mains': 'Zweihander',
  arc: 'Bow', 'arc long': 'Longbow', 'arc court': 'Shortbow', arbalète: 'Crossbow', 'arbalète lourde': 'Heavy Crossbow', fronde: 'Sling',
  'arbalète à répétition': 'Repeater Crossbow', javeline: 'Javelin', 'hache de lancer': 'Throwing Axe', 'arme à deux mains': 'Two-Handed Weapon',
  rapière: 'Rapier', 'main gauche': 'Main Gauche', 'brise-épée': 'Swordbreaker', "lance d'arçon": 'Lance'
});
const fold = text => String(text).normalize('NFC').toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();

/**
 * Attaque V5 d'une arme V2 imprimée (« arme à une main (couperet de boucher) », « deux javelines ») ; null si l'arme n'a pas d'équivalent.
 * La précision entre parenthèses est cherchée d'abord (« arme à deux mains (hache à deux mains) » → Greataxe).
 */
export function weaponAttack(printed, { stats, size, melee, ranged }) {
  const text = fold(printed).replace(/^(?:une?|deux|trois|quatre)\s+/, '');
  const inner = /\(([^)]*)\)/.exec(text)?.[1];
  const singular = name => name.replace(/s$/, '').replace(/s\b/g, '');
  const key = [inner, text.replace(/\s*\(.*\)\s*$/, '')].filter(Boolean).map(name => [name, singular(name)]).flat().find(name => V2_WEAPONS[name]);
  if (!key) return null;
  const weapon = V5_WEAPONS[V2_WEAPONS[key]];
  const sb = bonus(stats.F);
  if (weapon.ranged) {
    const damage = weapon.sb ? sb + weapon.bonus : weapon.bonus;
    return { name: V2_WEAPONS[key], value: ranged ?? stats.CT, damage, rangeYards: weapon.range ?? sb * weapon.rangeSb, ...(weapon.qualities ? { qualities: [...weapon.qualities] } : {}) };
  }
  return { name: V2_WEAPONS[key], value: melee ?? stats.CC, damage: meleeDamage(stats.F, weapon.bonus, size) };
}

/** Arme naturelle (griffes, morsure, cornes…) : BF + n, n repris de la créature V5 la plus proche (`naturalBonus`, liste à valider). */
export function naturalAttack(name, { stats, size, naturalBonus, melee }) {
  return { name, value: melee ?? stats.CC, damage: meleeDamage(stats.F, naturalBonus, size) };
}

/** Talents ou règles V2 → Traits V5 homonymes sûrs (liste à valider par le MJ). Le reste : règles spéciales. */
export const V2_TRAITS = Object.freeze({
  effrayant: 'Fear', terrifiant: 'Terror', 'vision nocturne': 'Night Vision', vol: 'Fly', frénésie: 'Frenzy', 'mort-vivant': 'Undead',
  éthéré: 'Ethereal', instabilité: 'Unstable', nuée: 'Swarm', régénération: 'Regeneration', stupidité: 'Stupid'
});
export const traitOf = printed => V2_TRAITS[fold(printed).replace(/\s*\(.*\)\s*$/, '')] || null;

/** Compétences V2 homonymes d'une compétence V5, avec la caractéristique V5 qui la gouverne : valeur = caractéristique + bonus V2. */
export const V2_SKILLS = Object.freeze({
  perception: ['Perception', 'Perception', 'I'], esquive: ['Dodge', 'Esquive', 'Ag'], intimidation: ['Intimidate', 'Intimidation', 'F'],
  escalade: ['Climb', 'Escalade', 'F'], natation: ['Swim', 'Natation', 'F'], commandement: ['Leadership', 'Commandement', 'Soc'],
  marchandage: ['Haggle', 'Marchandage', 'Soc'], pistage: ['Track', 'Pistage', 'I'], évaluation: ['Evaluate', 'Évaluation', 'Int'],
  langue: ['Language', 'Langue', 'Int'], escamotage: ['Sleight of Hand', 'Escamotage', 'Dex'], orientation: ['Navigation', 'Orientation', 'I'],
  focalisation: ['Channelling', 'Focalisation', 'FM'], dressage: ['Animal Training', 'Dressage', 'Int'], crochetage: ['Pick Lock', 'Crochetage', 'Dex'],
  métier: ['Trade', 'Métier', 'Dex'], hypnotisme: ['Hypnotism', 'Hypnotisme', 'FM']
});

/**
 * Validation du MJ du 14/11 : compétences V2 qui existent en V5 sous un autre nom (compétence présente au glossaire du bestiaire,
 * `SKILL_GROUP_FR` de tools/lib/bestiary-glossary.mjs). Deux compétences V2 rendues par la même compétence V5 : la plus haute valeur reste.
 */
export const V2_SKILLS_RENAMED = Object.freeze({
  'déplacement silencieux': ['Stealth', 'Discrétion', 'Ag'], dissimulation: ['Stealth', 'Discrétion', 'Ag'], commérage: ['Gossip', 'Ragot', 'Soc'],
  charisme: ['Charm', 'Charme', 'Soc'], soins: ['Heal', 'Guérison', 'Int'], "conduite d'attelages": ['Drive', 'Conduite d’attelage', 'Ag'],
  équitation: ['Ride', 'Chevaucher', 'Ag'], survie: ['Outdoor Survival', 'Survie en extérieur', 'Int'],
  "résistance à l'alcool": ['Consume Alcohol', 'Résistance à l’alcool', 'E'], 'connaissances académiques': ['Lore', 'Savoir', 'Int'],
  'connaissances générales': ['Lore', 'Savoir', 'Int'], 'langage mystique': ['Language', 'Langue', 'Int'],
  'expression artistique': ['Entertain', 'Divertissement', 'Soc'], 'alphabet secret': ['Secret Signs', 'Signes secrets', 'Int'],
  'soins des animaux': ['Animal Care', 'Soin aux animaux', 'Int'], 'charme animal': ['Charm Animal', 'Emprise sur les animaux', 'FM'],
  jeu: ['Gamble', 'Pari', 'Int'], fouille: ['Perception', 'Perception', 'I'],
  // Validation du MJ du 14/11 : Préparation de poisons = Métier (Empoisonneur).
  'préparation de poisons': ['Trade (Poisoner)', 'Métier (Empoisonneur)', 'Dex']
});

/**
 * « Perception +20% », « Langue (reikspiel) », « Connaissances académiques (démonologie +20%, magie +20%) » → compétences V5 (une par
 * spécialisation) ; [] si la compétence n'a pas d'équivalent (elle reste en règle spéciale). Une spécialisation « au choix » est écartée.
 */
export function skillsOf(printed, stats) {
  const found = /^(.+?)(?:\s*\(([^)]*)\))?\s*(?:\+(\d+)\s?%)?$/.exec(String(printed).normalize('NFC').trim());
  if (!found) return [];
  const entry = V2_SKILLS[fold(found[1])] || V2_SKILLS_RENAMED[fold(found[1])];
  if (!entry || stats[entry[2]] === null) return [];
  const [name, nameFr, carac] = entry;
  const base = Number(found[3] || 0);
  const specs = found[2] ? found[2].split(/,\s*/).filter(spec => !/au choix|autres?\b/.test(spec)) : [null];
  return specs.map(spec => {
    const part = spec === null ? null : /^(.*?)\s*(?:\+(\d+)\s?%)?$/.exec(spec.trim());
    const label = part ? ` (${part[1]})` : '';
    return { name: `${name}${label}`, nameFr: `${nameFr}${label}`, value: stats[carac] + base + Number(part?.[2] || 0) };
  });
}

/**
 * Validation du MJ du 14/11 (listes de T16) : talents V2 rendus par un talent V5 du catalogue sous un autre nom (équivalents sûrs), et
 * compétences V2 sans compétence V5 qui sont des talents V5. Valeur : [nom du catalogue (nom français), précision imposée ou null].
 */
export const V2_TALENTS_RENAMED = Object.freeze({
  'coups précis': ['Frappe blessante', null], 'coups assommants': ['Frappe assommante', null], 'acuité auditive': ['Sens aiguisé', 'Ouïe'],
  'acuité visuelle': ['Sens aiguisé', 'Vue'], 'résistance accrue': ['Très résistant', null], 'force accrue': ['Très fort', null],
  'réflexes éclair': ['Réflexes foudroyants', null], 'dur en affaires': ['Négociateur', null], étiquette: ['Savoir-vivre', null],
  'sang-froid': ['Imperturbable', null], 'grimpeur chevronné': ['Grimpeur', null], éloquence: ['Orateur', null], 'orateur né': ['Grand orateur', null],
  'calcul mental': ['Doué en calcul', null], intelligent: ['Perspicace', null], 'résistance aux maladies': ['Résistance', 'Maladie'],
  'résistance aux poisons': ['Résistance', 'Poison'], 'résistance au poison': ['Résistance', 'Poison'], 'course à pied': ['Véloce', null],
  'grand voyageur': ['Voyageur aguerri', null], chance: ['Chanceux', null], 'camouflage rural': ['Nomade', null], fuite: ['Fuite !', null]
});
export const V2_SKILLS_AS_TALENTS = Object.freeze({
  baratin: 'Baratiner', 'lire/écrire': 'Lire/Écrire', 'sens de la magie': 'Perception de la Magie', déguisement: 'Maître en déguisement', filature: 'Discret'
});
/** Sorts mineurs V2 nommés → sort du catalogue de l'outil le plus proche (validation du MJ du 14/11, Karitamen). */
export const V2_SPELLS = Object.freeze({ dissipation: 'Drain de Magie', silence: 'Silence' });

export const talentRename = printed => V2_TALENTS_RENAMED[fold(printed).replace(/\s*\(.*\)\s*$/, '')] || null;
export const skillAsTalent = printed => V2_SKILLS_AS_TALENTS[fold(printed).replace(/\s*\(.*\)\s*$/, '').replace(/\s*\+\d+\s?%$/, '')] || null;

/** Une seule compétence (premier élément de `skillsOf`), ou null. */
export const skillOf = (printed, stats) => skillsOf(printed, stats)[0] || null;
