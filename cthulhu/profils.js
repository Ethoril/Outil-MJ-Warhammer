/**
 * Réserve de profils de L'Appel de Cthulhu 7e : investigateurs persistants, PNJ, créatures et armes.
 * Module pur : un état sérialisable et des actions `réserve → nouvelle réserve`, aucun accès au DOM ni au hasard.
 * Une absence de champ facultatif (APP, ÉDU, image, notes…) se lit comme vide, sans réécrire les données.
 *
 * Réserve : `{ version: 1, profils: [profil], armes: { [id]: arme } }`.
 * Profil : `{ id, nom, kind: 'PJ' | 'PNJ' | 'CREATURE', camp, image, carac, chance, competences, armeMelee, armeTir,
 *   armeFeuPrete, attaquesParRound, armure, reductionFeu, coutSan, cachee, mvt, notes, suivi }`.
 * `suivi` (investigateurs seulement) : ce qui reste d'une rencontre à l'autre, `null` tant qu'aucune n'a eu lieu.
 */
import { impactEtCarrure, pvMax, analyserCoutSan } from './regles.js';

export const VERSION_RESERVE = 1;
export const KINDS = Object.freeze(['PJ', 'PNJ', 'CREATURE']);
export const CAMPS = Object.freeze(['pj', 'ennemi', 'neutre']);
export const CARACS = Object.freeze(['FOR', 'CON', 'TAI', 'DEX', 'APP', 'INT', 'POU', 'EDU']);
/** Caractéristiques obligatoires : APP et ÉDU ne servent pas au combat, absentes elles valent 0. */
const CARACS_REQUISES = Object.freeze(['FOR', 'CON', 'TAI', 'DEX', 'INT', 'POU']);
export const TYPES_ARME = Object.freeze(['melee', 'feu']);

const nombreOuNull = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const copie = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const EXPRESSION_DES = /^\s*\d*[dD]\d+(\s*[+-]\s*(\d*[dD]\d+|\d+))*\s*$/;

export const creerReserve = () => ({ version: VERSION_RESERVE, profils: [], armes: {} });

/** Identifiant tiré du nom : minuscules sans accents, tirets ; un suffixe `-2`, `-3`… évite les doublons. */
export function idDepuisNom(nom, existants = []) {
  const base = String(nom ?? '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'profil';
  if (!existants.includes(base)) return base;
  let n = 2;
  while (existants.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// ---------------------------------------------------------------------------
// Profils
// ---------------------------------------------------------------------------

/** Profil complet à partir de données saisies : champs facultatifs absents remplacés par leur valeur vide. */
export function normaliserProfil(donnees = {}) {
  const kind = donnees.kind ?? 'PNJ';
  const carac = {};
  for (const c of CARACS) carac[c] = nombreOuNull(donnees.carac?.[c]) ?? (CARACS_REQUISES.includes(c) ? null : 0);
  const competences = {};
  for (const [nom, valeur] of Object.entries(donnees.competences ?? {})) competences[nom] = nombreOuNull(valeur);
  return {
    id: donnees.id ?? null,
    nom: String(donnees.nom ?? '').trim(),
    kind,
    camp: donnees.camp ?? (kind === 'PJ' ? 'pj' : 'ennemi'),
    image: donnees.image ?? null,
    carac,
    chance: kind === 'PJ' ? nombreOuNull(donnees.chance) ?? 0 : null,
    competences,
    armeMelee: donnees.armeMelee === undefined ? 'poing' : donnees.armeMelee,
    armeTir: donnees.armeTir ?? null,
    armeFeuPrete: donnees.armeFeuPrete === true,
    attaquesParRound: nombreOuNull(donnees.attaquesParRound) ?? 1,
    armure: nombreOuNull(donnees.armure) ?? 0,
    reductionFeu: donnees.reductionFeu ?? null,
    coutSan: donnees.coutSan ?? null,
    cachee: donnees.cachee === true,
    mvt: nombreOuNull(donnees.mvt),
    notes: String(donnees.notes ?? ''),
    suivi: copie(donnees.suivi) ?? null
  };
}

/** Liste des erreurs d'un profil normalisé (vide si valide), en français. */
export function validerProfil(profil) {
  const erreurs = [];
  if (!String(profil.nom ?? '').trim()) erreurs.push('Le nom est obligatoire.');
  if (!KINDS.includes(profil.kind)) erreurs.push(`Type de profil inconnu : ${profil.kind}.`);
  if (!CAMPS.includes(profil.camp)) erreurs.push(`Camp inconnu : ${profil.camp}.`);
  for (const c of CARACS_REQUISES) {
    const v = profil.carac?.[c];
    if (!Number.isFinite(v) || v < 0 || v > 999) erreurs.push(`La caractéristique ${c} est obligatoire (nombre de 0 à 999).`);
  }
  for (const [nom, valeur] of Object.entries(profil.competences ?? {})) {
    if (!Number.isFinite(valeur) || valeur < 0 || valeur > 999) erreurs.push(`La compétence ${nom} doit être un nombre de 0 à 999.`);
  }
  if (profil.kind === 'PJ' && !(profil.chance >= 0)) erreurs.push('La Chance d’un investigateur est un nombre positif.');
  if (!Number.isInteger(profil.attaquesParRound) || profil.attaquesParRound < 1) erreurs.push('Le nombre d’attaques par round est un entier d’au moins 1.');
  if (!(profil.armure >= 0)) erreurs.push('L’armure est un nombre positif ou nul.');
  if (profil.reductionFeu !== null && profil.reductionFeu !== 'moitie') erreurs.push('La réduction des armes à feu ne peut être que « moitié ».');
  if (profil.coutSan !== null) {
    try { analyserCoutSan(profil.coutSan); } catch { erreurs.push(`Le coût de SAN « ${profil.coutSan} » est invalide (forme attendue : 1/1D6).`); }
  }
  return erreurs;
}

function verifierArmes(reserve, profil) {
  for (const id of [profil.armeMelee, profil.armeTir]) {
    if (id && !reserve.armes[id]) throw new RangeError(`L’arme « ${id} » de ${profil.nom} n’existe pas dans la réserve.`);
  }
}

export const trouverProfil = (reserve, id) => reserve.profils.find(p => p.id === id) ?? null;

export function ajouterProfil(reserve, donnees) {
  const profil = normaliserProfil(donnees);
  const erreurs = validerProfil(profil);
  if (erreurs.length) throw new RangeError(erreurs.join(' '));
  const ids = reserve.profils.map(p => p.id);
  if (profil.id !== null && ids.includes(profil.id)) throw new RangeError(`Un profil porte déjà l’id « ${profil.id} ».`);
  profil.id = profil.id ?? idDepuisNom(profil.nom, ids);
  verifierArmes(reserve, profil);
  return { ...reserve, profils: [...reserve.profils, profil] };
}

/** Fusionne `changements` (les caractéristiques et les compétences se fusionnent une à une). L'id ne change pas. */
export function modifierProfil(reserve, id, changements) {
  const ancien = trouverProfil(reserve, id);
  if (!ancien) throw new RangeError(`Profil introuvable : ${id}.`);
  if (changements.id !== undefined && changements.id !== id) throw new RangeError('L’id d’un profil ne se modifie pas.');
  const profil = normaliserProfil({
    ...ancien, ...changements, id,
    carac: { ...ancien.carac, ...changements.carac },
    competences: { ...ancien.competences, ...changements.competences }
  });
  const erreurs = validerProfil(profil);
  if (erreurs.length) throw new RangeError(erreurs.join(' '));
  verifierArmes(reserve, profil);
  return { ...reserve, profils: reserve.profils.map(p => (p.id === id ? profil : p)) };
}

export function supprimerProfil(reserve, id) {
  if (!trouverProfil(reserve, id)) throw new RangeError(`Profil introuvable : ${id}.`);
  return { ...reserve, profils: reserve.profils.filter(p => p.id !== id) };
}

// ---------------------------------------------------------------------------
// Valeurs dérivées
// ---------------------------------------------------------------------------

/**
 * Mouvement (Manuel du Gardien p. 30) : 7 si la FOR et la DEX sont strictement inférieures à la TAI, 9 si elles la
 * dépassent toutes les deux, 8 sinon (l'une l'égale ou la dépasse, ou les trois sont égales).
 */
export function mouvementDe({ FOR, DEX, TAI }) {
  if (FOR < TAI && DEX < TAI) return 7;
  if (FOR > TAI && DEX > TAI) return 9;
  return 8;
}

/** Impact, Carrure, PV max, MVT, PM et SAN de départ. Un `mvt` saisi (valeur du livre pour une créature) prime. */
export function valeursDerivees(profil) {
  const { FOR, CON, TAI, DEX, POU } = profil.carac;
  const { impact, carrure } = impactEtCarrure(FOR, TAI);
  return {
    impact, carrure, pvMax: pvMax(CON, TAI), mvt: profil.mvt ?? mouvementDe({ FOR, DEX, TAI }),
    pm: Math.floor((Number(POU) || 0) / 5), sanDepart: POU
  };
}

// ---------------------------------------------------------------------------
// Armes
// ---------------------------------------------------------------------------

/**
 * Arme : `{ id, nom, competence, des, empalante, aImpact, type: 'melee' | 'feu', portee, capacite }`.
 * `des` ne contient pas l'Impact : `aImpact` dit s'il s'ajoute (mêlée et lancer).
 */
export function normaliserArme(donnees = {}) {
  const arme = {
    id: donnees.id ?? null, nom: String(donnees.nom ?? '').trim(), competence: String(donnees.competence ?? '').trim(),
    des: String(donnees.des ?? '').trim(), empalante: donnees.empalante === true, aImpact: donnees.aImpact === true,
    type: donnees.type ?? 'melee'
  };
  if (arme.type === 'feu') Object.assign(arme, { portee: nombreOuNull(donnees.portee), capacite: nombreOuNull(donnees.capacite) });
  return arme;
}

export function validerArme(arme) {
  const erreurs = [];
  if (!arme.nom) erreurs.push('Le nom de l’arme est obligatoire.');
  if (!arme.competence) erreurs.push('La compétence de l’arme est obligatoire.');
  if (!EXPRESSION_DES.test(arme.des)) erreurs.push(`Les dés de dégâts « ${arme.des} » sont invalides (forme attendue : 1D6+2).`);
  if (!TYPES_ARME.includes(arme.type)) erreurs.push(`Type d’arme inconnu : ${arme.type}.`);
  if (arme.type === 'feu') {
    if (!(arme.portee > 0)) erreurs.push('Une arme à feu a une portée de base en mètres, supérieure à 0.');
    if (!Number.isInteger(arme.capacite) || arme.capacite < 1) erreurs.push('Une arme à feu a une capacité d’au moins 1 coup.');
  }
  return erreurs;
}

export function ajouterArme(reserve, donnees) {
  const arme = normaliserArme(donnees);
  if (!arme.id) throw new RangeError('L’id de l’arme est obligatoire.');
  if (reserve.armes[arme.id]) throw new RangeError(`Une arme porte déjà l’id « ${arme.id} ».`);
  const erreurs = validerArme(arme);
  if (erreurs.length) throw new RangeError(erreurs.join(' '));
  return { ...reserve, armes: { ...reserve.armes, [arme.id]: arme } };
}

export function modifierArme(reserve, id, changements) {
  const ancienne = reserve.armes[id];
  if (!ancienne) throw new RangeError(`Arme introuvable : ${id}.`);
  if (changements.id !== undefined && changements.id !== id) throw new RangeError('L’id d’une arme ne se modifie pas.');
  const arme = normaliserArme({ ...ancienne, ...changements, id });
  const erreurs = validerArme(arme);
  if (erreurs.length) throw new RangeError(erreurs.join(' '));
  return { ...reserve, armes: { ...reserve.armes, [id]: arme } };
}

export function supprimerArme(reserve, id) {
  if (!reserve.armes[id]) throw new RangeError(`Arme introuvable : ${id}.`);
  const utilisateurs = reserve.profils.filter(p => p.armeMelee === id || p.armeTir === id).map(p => p.nom);
  if (utilisateurs.length) throw new RangeError(`L’arme « ${id} » sert encore à ${utilisateurs.join(', ')}.`);
  const { [id]: _retiree, ...reste } = reserve.armes;
  return { ...reserve, armes: reste };
}

// ---------------------------------------------------------------------------
// Journée de jeu
// ---------------------------------------------------------------------------

/** Nouvelle journée : le cumul des pertes de SAN repart de la SAN actuelle de chaque investigateur ; le reste demeure. */
export function nouvelleJournee(reserve) {
  return {
    ...reserve,
    profils: reserve.profils.map(p => (p.suivi
      ? { ...p, suivi: { ...p.suivi, journeeSan: { sanDebut: p.suivi.san, perteJour: 0, persistanteDeclenchee: false } } }
      : p))
  };
}
