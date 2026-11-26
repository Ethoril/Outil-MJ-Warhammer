/**
 * Règles d'Imperium Maledictum (moteur pur).
 * Module pur : aucun accès au DOM, aucun hasard non injectable (les fonctions qui jettent des dés
 * reçoivent un générateur `rng` (() => [0, 1[) ou un `lancer(expression)` injecté).
 *
 * Source : Imperium Maledictum Core Book, qui fait foi. Les commentaires citent la page imprimée
 * du livre (page du PDF = page imprimée). Yards = mètres, même valeur sans conversion.
 * Seul import autorisé : ./tables-critiques.js.
 */

import { TABLE_MALADRESSE, TABLES_CRITIQUES, consulterMaladresse, consulterCritique } from './tables-critiques.js';

export { TABLE_MALADRESSE, TABLES_CRITIQUES, consulterMaladresse, consulterCritique };

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Les neuf Caractéristiques (p. 50). */
export const CARACS = Object.freeze(['CC', 'CT', 'F', 'E', 'Ag', 'Int', 'Per', 'FM', 'Soc']);

/**
 * Difficultés d'un test (p. 188). Libellés français selon le vocabulaire Warhammer :
 * « Accessible » (+20), « Intermédiaire » (+0).
 */
export const DIFFICULTES = Object.freeze({
  'tres-facile': Object.freeze({ id: 'tres-facile', libelle: 'Très facile', modif: +60, page: 188 }),
  'facile': Object.freeze({ id: 'facile', libelle: 'Facile', modif: +40, page: 188 }),
  'accessible': Object.freeze({ id: 'accessible', libelle: 'Accessible', modif: +20, page: 188 }),
  'intermediaire': Object.freeze({ id: 'intermediaire', libelle: 'Intermédiaire', modif: 0, page: 188 }),
  'difficile': Object.freeze({ id: 'difficile', libelle: 'Difficile', modif: -10, page: 188 }),
  'ardu': Object.freeze({ id: 'ardu', libelle: 'Ardu', modif: -20, page: 188 }),
  'tres-ardu': Object.freeze({ id: 'tres-ardu', libelle: 'Très ardu', modif: -30, page: 188 })
});

/** Portées (p. 201-202). */
export const PORTEES = Object.freeze(['immediate', 'courte', 'moyenne', 'longue', 'extreme']);

/** Vitesses (p. 202). */
export const VITESSES = Object.freeze(['lente', 'normale', 'rapide']);

/** Tailles (p. 201). */
export const TAILLES = Object.freeze(['minuscule', 'petite', 'moyenne', 'grande', 'enorme', 'monstrueuse']);

/** Couvert : bonus d'armure contre les attaques à distance (p. 204, 210). */
export const COUVERT = Object.freeze({ aucun: 0, leger: 2, moyen: 4, lourd: 6 });

/** Rôles de PNJ (p. 317). */
export const ROLES_PNJ = Object.freeze(['troupe', 'elite', 'chef']);

/**
 * États (Conditions, Annexe IV p. 356-357 ; `desespere` p. 197 ; `surpris` p. 199).
 * `niveaux` : l'état existe en deux paliers (mineur / majeur), p. 356-357.
 */
export const ETATS = Object.freeze([
  Object.freeze({ id: 'enflamme', libelle: 'Enflammé', niveaux: true, page: 356 }),
  Object.freeze({ id: 'hemorragique', libelle: 'Hémorragique', niveaux: true, page: 356 }),
  Object.freeze({ id: 'aveugle', libelle: 'Aveuglé', niveaux: false, page: 356 }),
  Object.freeze({ id: 'assourdi', libelle: 'Assourdi', niveaux: false, page: 356 }),
  Object.freeze({ id: 'extenue', libelle: 'Exténué', niveaux: true, page: 356 }),
  Object.freeze({ id: 'effraye', libelle: 'Effrayé', niveaux: true, page: 357 }),
  Object.freeze({ id: 'neutralise', libelle: 'Neutralisé', niveaux: false, page: 357 }),
  Object.freeze({ id: 'surcharge', libelle: 'Surchargé', niveaux: false, page: 357 }),
  Object.freeze({ id: 'empoisonne', libelle: 'Empoisonné', niveaux: true, page: 357 }),
  Object.freeze({ id: 'a-terre', libelle: 'À terre', niveaux: false, page: 357 }),
  Object.freeze({ id: 'entrave', libelle: 'Entravé', niveaux: true, page: 357 }),
  Object.freeze({ id: 'sonne', libelle: 'Sonné', niveaux: true, page: 357 }),
  Object.freeze({ id: 'inconscient', libelle: 'Inconscient', niveaux: false, page: 357 }),
  Object.freeze({ id: 'desespere', libelle: 'Désespéré', niveaux: false, page: 197 }),
  Object.freeze({ id: 'surpris', libelle: 'Surpris', niveaux: false, page: 199 })
]);

/** Localisations de touche (p. 211). */
export const LOCALISATIONS = Object.freeze(['tete', 'bras-g', 'bras-d', 'jambe-g', 'jambe-d', 'corps']);

// ---------------------------------------------------------------------------
// Caractéristiques dérivées
// ---------------------------------------------------------------------------

/** Bonus de caractéristique = premier chiffre (dizaines), p. 50 (ex. F 39 → 3, FM 51 → 5). */
export const bonusCarac = v => Math.floor((Number(v) || 0) / 10);

/** Blessures max = bonus de F + 2 × bonus d'E + bonus de FM (p. 88). */
export function blessuresMax(carac) {
  return bonusCarac(carac.F) + 2 * bonusCarac(carac.E) + bonusCarac(carac.FM);
}

/** Blessures critiques max : 0 pour une Troupe, 1 pour une Élite, sinon bonus d'E (p. 88, 317). */
export function critiquesMax(carac, role = 'pj') {
  if (role === 'troupe') return 0;
  if (role === 'elite') return 1;
  return bonusCarac(carac.E);
}

/** Initiative = bonus de Per + bonus d'Agi (p. 88, 198). */
export const initiativeDe = carac => bonusCarac(carac.Per) + bonusCarac(carac.Ag);

// ---------------------------------------------------------------------------
// Jets de pourcentage (d100)
// ---------------------------------------------------------------------------

/** Jet 1..100 ; la chaîne '00' vaut 100. */
export function normaliserJet(v) {
  const n = typeof v === 'string' && v.trim() === '00' ? 100 : Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 100) throw new RangeError(`Jet hors de 1-100 : ${v}`);
  return n;
}

/** Inverse dizaines et unités (Avantage/Désavantage, p. 189) : 100 reste 100, 72 → 27, 28 → 82. */
export function inverserJet(v) {
  const n = normaliserJet(v);
  return n === 100 ? 100 : (n % 10) * 10 + Math.floor(n / 10);
}

/**
 * Avantage / Désavantage (p. 189) : les sources s'annulent une pour une ; chaque source
 * restante au-delà de la première ajoute ±10 au seuil avant le DR.
 */
export function resumerAvantage({ avantages = [], desavantages = [] } = {}) {
  const net = avantages.length - desavantages.length;
  if (net > 0) return { net, inversion: 'facultative', modifSeuil: (net - 1) * 10 };
  if (net < 0) return { net, inversion: 'imposee', modifSeuil: (1 - Math.abs(net)) * 10 };
  return { net: 0, inversion: 'aucune', modifSeuil: 0 };
}

/** Palier de résultat d'après le DR (table des résultats, p. 187). */
export function palierResultat(dr, reussi) {
  if (reussi) {
    if (dr >= 5) return { id: '+5', libelle: 'Réussite éclatante' };
    if (dr >= 3) return { id: '+3', libelle: 'Réussite impressionnante' };
    if (dr >= 1) return { id: '+1', libelle: 'Réussite' };
    return { id: '+0', libelle: 'Réussite marginale' };
  }
  if (dr === 0) return { id: '-0', libelle: 'Échec marginal' };
  if (dr >= -2) return { id: '-1', libelle: 'Échec' };
  if (dr >= -4) return { id: '-3', libelle: 'Échec impressionnant' };
  return { id: '-5', libelle: 'Échec éclatant' };
}

/** Évalue un jet donné contre le seuil effectif (p. 186-188, 213). */
function evaluerJet({ seuilEffectif, jet, bonusDR = 0, kind = 'test' }) {
  const drBase = Math.floor(seuilEffectif / 10) - Math.floor(jet / 10); // p. 187 : dizaines du seuil - dizaines du jet
  let dr = drBase + bonusDR; // ajustements de DR (Ex. : Supériorité), p. 187
  let reussi;
  if (jet <= 5) {
    // p. 188 : 01-05 toujours un succès, même si le seuil effectif est < 05 (ex. Casseum) ;
    // si le jet dépasse le seuil et qu'aucun ajustement ne relève le DR, c'est une réussite marginale +0.
    reussi = true;
    if (dr < 0) dr = 0;
  } else if (jet >= 96) {
    // p. 188 : 96-00 toujours un échec, même si le seuil effectif est >= 96 ;
    // si le jet est sous le seuil, c'est au pire un échec marginal -0.
    reussi = false;
    if (dr >= 0) dr = 0;
  } else if (dr > 0) {
    reussi = true;
  } else if (dr === 0) {
    // p. 187 : un ajustement portant le DR à 0 donne une réussite marginale (+0) ; sans ajustement,
    // DR 0 réussit si le jet est sous le seuil, sinon échec marginal (-0).
    reussi = bonusDR !== 0 ? true : jet <= seuilEffectif;
  } else {
    reussi = false;
  }
  const combat = kind === 'melee' || kind === 'tir';
  const double = jet === 100 || jet % 11 === 0; // p. 213 : 11, 22, ... 99, 100
  const maladresseAuto = jet >= 99; // p. 188 : 99-00 est toujours une maladresse
  return {
    jet, dr, reussi,
    palier: palierResultat(dr, reussi),
    maladresseAuto,
    // p. 213 : double à DR positif (+0 compris) et succès → critique ; double à DR négatif
    // (-0 compris) ou échec → maladresse ; 99-00 → maladresse même en cas de succès.
    critique: combat && double && reussi,
    maladresse: combat && (maladresseAuto || (double && !reussi))
  };
}

/**
 * Prépare/évalue un test (p. 186-189, 213). `seuil` = compétence/caractéristique de base,
 * `difficulte` (défaut 'intermediaire'), `avantages`/`desavantages` (tableaux de sources, p. 189),
 * `bonusDR` = ajustement de DR (Ex. : Supériorité, p. 187), `kind` = 'test' | 'melee' | 'tir'.
 * Retourne un aperçu avec les options légales d'inversion des dés (p. 189) : `choixRequis` si
 * l'Avantage permet de choisir, `inversionForcee` si le Désavantage impose d'inverser.
 */
export function prevoirTest({ seuil, jet, difficulte = 'intermediaire', avantages = [], desavantages = [], bonusDR = 0, kind = 'test' } = {}) {
  const diff = DIFFICULTES[difficulte];
  if (!diff) throw new RangeError(`Difficulté inconnue : ${difficulte}`);
  const j = normaliserJet(jet);
  const avantage = resumerAvantage({ avantages, desavantages });
  // p. 188 : la difficulté s'ajoute au seuil ; on peut lancer même si le seuil effectif est <= 0
  // grâce au succès automatique des 01-05 (ex. Casseum, p. 188).
  const seuilEffectif = Math.max(0, (Number(seuil) || 0) + diff.modif + avantage.modifSeuil);
  const inverse = inverserJet(j);
  let options;
  let choixRequis = false;
  let inversionForcee = false;
  let optionAppliquee = 'keep';
  if (avantage.net > 0 && inverse < j) {
    // p. 189 : avec Avantage, on PEUT inverser si cela profite (ex. 72 → 27).
    options = [
      { id: 'keep', ...evaluerJet({ seuilEffectif, jet: j, bonusDR, kind }) },
      { id: 'reverse', ...evaluerJet({ seuilEffectif, jet: inverse, bonusDR, kind }) }
    ];
    choixRequis = true;
  } else if (avantage.net < 0 && inverse > j) {
    // p. 189 : avec Désavantage, on DOIT inverser si cela aggrave (ex. 28 → 82).
    options = [{ id: 'reverse', ...evaluerJet({ seuilEffectif, jet: inverse, bonusDR, kind }) }];
    inversionForcee = true;
    optionAppliquee = 'reverse';
  } else {
    options = [{ id: 'keep', ...evaluerJet({ seuilEffectif, jet: j, bonusDR, kind }) }];
  }
  const appliquee = options.find(o => o.id === optionAppliquee);
  return {
    seuil: Number(seuil) || 0, jetLance: j, difficulte, kind, bonusDR,
    avantage, seuilEffectif,
    choixRequis, inversionForcee, optionAppliquee,
    options,
    ...appliquee // `jet` du résultat = jet effectivement évalué (inversé si option 'reverse')
  };
}

/** Retourne le résultat figé de l'option choisie ('keep' ou 'reverse') d'un aperçu de test. */
export function selectionnerOptionTest(apercu, optionId) {
  const opt = apercu.options.find(o => o.id === optionId);
  if (!opt) throw new RangeError(`Option inconnue : ${optionId}`);
  return { ...apercu, ...opt, optionAppliquee: optionId, choixRequis: false };
}

/**
 * Test opposé (p. 190) : DR le plus haut l'emporte, `drNet` = différence ; à DR égal, la compétence
 * effective la plus haute l'emporte (`drNet` 0) ; sinon égalité parfaite laissée au MJ.
 * p. 187, 190, 213 : +0 (réussite marginale) est un DR positif, -0 (échec marginal) un DR négatif ;
 * si les deux camps ont un DR de 0 et qu'un seul a réussi, ce camp gagne avec `drNet` 0.
 */
export function resoudreTestOppose(init, adv) {
  if (init.dr === 0 && adv.dr === 0 && init.reussi !== adv.reussi) {
    return { gagnant: init.reussi ? 'init' : 'adv', drNet: 0, egaliteParfaite: false };
  }
  if (init.dr !== adv.dr) {
    return { gagnant: init.dr > adv.dr ? 'init' : 'adv', drNet: init.dr - adv.dr, egaliteParfaite: false };
  }
  if (init.seuilEffectif !== adv.seuilEffectif) {
    return { gagnant: init.seuilEffectif > adv.seuilEffectif ? 'init' : 'adv', drNet: 0, egaliteParfaite: false };
  }
  return { gagnant: null, egaliteParfaite: true, drNet: 0 };
}

/** Localisation de touche d'après le chiffre des unités du jet (p. 211) : 1 tête, 2 bras G, 3 bras D, 4 jambe G, 5 jambe D, 6-0 corps. */
export function localisationDuJet(jet) {
  const unite = normaliserJet(jet) % 10; // 100 → 0 → corps
  switch (unite) {
    case 1: return 'tete';
    case 2: return 'bras-g';
    case 3: return 'bras-d';
    case 4: return 'jambe-g';
    case 5: return 'jambe-d';
    default: return 'corps';
  }
}

// ---------------------------------------------------------------------------
// Armure, dégâts, blessures
// ---------------------------------------------------------------------------

function traitNormalise(t) {
  if (typeof t === 'string') {
    const m = t.match(/^penetrating\D*(\d+)\D*$/i);
    if (m) return { id: 'penetrating', valeur: Number(m[1]) };
    return { id: t.toLowerCase(), valeur: 0 };
  }
  return { id: String(t?.id ?? '').toLowerCase(), valeur: Number(t?.valeur) || 0 };
}

/**
 * Armure effective contre une attaque (p. 124-125, 204, 210). `Ineffective` double l'armure totale
 * (p. 124) ; `Penetrating(X)` ignore X points d'armure (min 0, p. 125) ; `ignoreCouvert` (Flamer p. 124,
 * action Cibler une localisation p. 210) ignore le couvert.
 */
export function calculerArmureEffective({ armureBase = 0, couvert = 0, traitsArme = [], ignoreCouvert = false } = {}) {
  const traits = traitsArme.map(traitNormalise);
  const couvertApplique = ignoreCouvert ? 0 : (Number(couvert) || 0);
  let total = (Number(armureBase) || 0) + couvertApplique;
  const ineffective = traits.some(t => t.id === 'ineffective');
  if (ineffective) total *= 2; // p. 124 : toute l'armure est doublée contre une arme Ineffective
  const penetration = traits.filter(t => t.id === 'penetrating').reduce((s, t) => s + t.valeur, 0);
  const armureEffective = Math.max(0, total - penetration); // p. 125 : Penetrating ignore de l'armure
  return { armureEffective, detail: { armureBase: Number(armureBase) || 0, couvertApplique, ineffective, penetration } };
}

/** Dégâts finaux = dégâts de base + DR - armure effective, minimum 0 (p. 211-212). */
export function resoudreDegats({ degatsBase, dr = 0, armureEffective = 0 } = {}) {
  return Math.max(0, (Number(degatsBase) || 0) + (Number(dr) || 0) - (Number(armureEffective) || 0));
}

/**
 * Applique des dégâts à une cible (p. 214-216, 317).
 * - Blessures plafonnées au maximum (p. 214) ; l'excédent sert de bonus de sévérité (1d10 + excédent, p. 215).
 * - Atteindre le maximum de blessures avec un coup qui fait des dégâts → test d'Endurance (Douleur)
 *   (caractéristique E) Intermédiaire ou inconscient (p. 214), et tout coup suivant qui blesse est critique.
 * - Blessure critique si coup critique (double, p. 213) ou excédent > 0, sauf coup retenu (p. 215).
 * - Troupe : toute blessure critique la met hors combat (p. 317) ; Élite : idem dès sa deuxième
 *   blessure critique non traitée (p. 317) ; PJ/Chef : mort en fin de round si les blessures
 *   critiques non traitées dépassent le bonus d'E (p. 88, 214-215).
 */
export function appliquerDegats({ blessures, blessuresMax, critiquesNonTraitees = 0, critiquesMax = 0, role = 'pj', degats, coupCritique = false, retenirCoups = false } = {}) {
  const avant = Number(blessures) || 0;
  const max = Number(blessuresMax) || 0;
  const deg = Number(degats) || 0;
  const nouvellesBlessures = Math.min(max, avant + deg); // p. 214 : jamais plus que le maximum
  const excedent = Math.max(0, avant + deg - max); // p. 215 : bonus de sévérité du jet de critique
  const seuilAtteint = avant + deg >= max && deg > 0; // p. 214
  const critiqueDeclenche = !retenirCoups && (coupCritique || excedent > 0); // p. 215 (coup retenu : pas de critique)
  const nonTraitees = Number(critiquesNonTraitees) || 0;
  const critiquesApres = nonTraitees + (critiqueDeclenche ? 1 : 0);
  const mortSubiteRole = critiqueDeclenche && (role === 'troupe' || (role === 'elite' && nonTraitees >= 1)); // p. 317
  return {
    blessuresAvant: avant,
    blessures: nouvellesBlessures,
    degats: deg,
    excedent,
    jetEnduranceRequis: seuilAtteint, // p. 214 : test d'Endurance (Douleur) (E) Intermédiaire ou inconscient
    blesseCritiquementSeuil: seuilAtteint,
    critiqueDeclenche,
    severiteBonus: excedent, // p. 215 : la sévérité se lance à 1d10 + excédent
    critiquesNonTraiteesApres: critiquesApres,
    mourant: critiquesApres > (Number(critiquesMax) || 0), // p. 88, 214-215 : mort en fin de round
    mortSubiteRole,
    role
  };
}

/**
 * Esquive d'une attaque à distance (p. 212) : si le test d'esquive réussit, le DR de l'attaque est
 * réduit du DR de l'esquive ; à +0 ou moins, l'attaque manque entièrement.
 */
export function resoudreEsquiveDistance({ drAttaque, testDefense } = {}) {
  const attaque = Number(drAttaque) || 0;
  if (testDefense && testDefense.reussi) {
    const drDefense = Math.max(0, Number(testDefense.dr) || 0);
    const drFinal = attaque - drDefense;
    if (drFinal <= 0) return { touche: false, esquive: true, drAttaque: attaque, drDefense, drFinal: 0 };
    return { touche: true, esquive: false, drAttaque: attaque, drDefense, drFinal };
  }
  return { touche: true, esquive: false, drAttaque: attaque, drDefense: 0, drFinal: attaque };
}

/** Désespéré : au début du tour, Supériorité du groupe > Résolution du PNJ (p. 197). */
export const verifierDesespere = (superiorite, resolution) => (Number(superiorite) || 0) > (Number(resolution) || 0);

// ---------------------------------------------------------------------------
// Expressions de dés
// ---------------------------------------------------------------------------

const TERME = /([+-]?)\s*(?:(\d*)\s*[dD]\s*(\d+)|(\d+))/g;

/** « 1d10+2 », « 2d10 », « -1 », « 0 » → termes `{ signe, n, faces }` (faces 0 = constante n). */
export function analyserExpression(expr) {
  const texte = String(expr ?? '0').replace(/\s+/g, '');
  if (!texte || texte === '0') return [];
  const termes = [];
  for (const m of texte.matchAll(TERME)) {
    const signe = m[1] === '-' ? -1 : 1;
    if (m[3]) termes.push({ signe, n: m[2] ? Number(m[2]) : 1, faces: Number(m[3]) });
    else termes.push({ signe, n: Number(m[4]), faces: 0 });
  }
  return termes;
}

/** Jette une expression de dés avec `rng` (() => [0, 1[). */
export function lancerExpression(expr, rng = Math.random) {
  return analyserExpression(expr).reduce((s, t) => {
    if (!t.faces) return s + t.signe * t.n;
    let total = 0;
    for (let i = 0; i < t.n; i++) total += 1 + Math.floor(rng() * t.faces);
    return s + t.signe * total;
  }, 0);
}

/**
 * Dégâts subis par tour à cause d'un état (p. 356) : `enflamme` fait 1d5 (mineur) ou 1d10 (majeur)
 * au début du tour, `hemorragique` fait 1 (mineur) ou 3 (majeur) à la fin du tour, 0 sinon.
 * `lancer(expression)` est injecté (par défaut `lancerExpression`).
 */
export function degatsEtatTour(etat, niveau = 'mineur', lancer = null) {
  const jette = lancer || (e => lancerExpression(e));
  if (etat === 'enflamme') return jette(niveau === 'majeur' ? '1d10' : '1d5'); // début de tour, p. 356
  if (etat === 'hemorragique') return niveau === 'majeur' ? 3 : 1; // fin de tour, p. 356
  return 0;
}
