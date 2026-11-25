/**
 * Réserve de profils d'Imperium Maledictum : PJ persistants, PNJ et armes.
 * Module pur : un état sérialisable et des actions `réserve → nouvelle réserve`, aucun accès au DOM ni au hasard.
 * Une absence de champ facultatif (image, notes, resolution, valeurs fixes…) se lit comme vide, sans réécrire les données.
 *
 * Réserve : `{ version: 1, profils: [profil], armes: { [id]: arme } }`.
 * Profil : `{ id, nom, kind: 'PJ' | 'PNJ', role: 'troupe' | 'elite' | 'chef' | null, camp, taille, vitesse, image,
 *   carac: { CC, CT, F, E, Ag, Int, Per, FM, Soc }, competences: { [nom]: valeur },
 *   armure: nombre | { tete, brasG, brasD, corps, jambeG, jambeD }, armes: [idArme],
 *   resolution, destinMax, blessuresMaxFixe, critiquesMaxFixe, initiativeFixe,
 *   traitsTexte, notes, source, suivi }`.
 * Arme : `{ id, nom, type: 'melee' | 'tir', specialisation, degatsBase, ajouteBF, portee, chargeur, traits, source }`.
 * `suivi` (PJ seulement, `null` par défaut) : `{ blessures, critiques, destin, destinBrule, etats }`.
 *
 * Source : Imperium Maledictum Core Book, qui fait foi. Les commentaires citent la page imprimée
 * du livre (page du PDF = page imprimée). Yards = mètres, même valeur sans conversion.
 * Seul import autorisé : ./regles.js.
 */
import {
  CARACS, PORTEES, VITESSES, TAILLES, ROLES_PNJ,
  bonusCarac, blessuresMax, critiquesMax, initiativeDe
} from './regles.js';

export const VERSION_RESERVE = 1;
export const KINDS = Object.freeze(['PJ', 'PNJ']);
export const CAMPS = Object.freeze(['pj', 'ennemi', 'neutre']);
export const TYPES_ARME = Object.freeze(['melee', 'tir']);
/** Portée d'une arme de mêlée (p. 201-202 : Immédiate = contact). */
const PORTEE_MELEE = 'immediate';

const nombreOuNull = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const entierOuNull = v => (v === null || v === undefined || v === '' ? null : (Number.isInteger(Number(v)) ? Number(v) : NaN));
const copie = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

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
// Armes
// ---------------------------------------------------------------------------

/**
 * Arme normalisée. `degatsBase` est le dégâts de base de l'arme (sans le bonus de F) ; `ajouteBF` dit si le
 * bonus de Force s'ajoute (armes de mêlée, p. 128 : « 2+StrB »). `chargeur` : `null` pour une arme de mêlée
 * ou à usage unique (grenade). `traits` : `[{ id, valeur? }]`, ex. `{ id: 'rend', valeur: 2 }`.
 */
export function normaliserArme(donnees = {}) {
  const type = donnees.type ?? 'melee';
  return {
    id: donnees.id ?? null,
    nom: String(donnees.nom ?? '').trim(),
    type,
    specialisation: String(donnees.specialisation ?? '').trim(),
    degatsBase: nombreOuNull(donnees.degatsBase) ?? 0,
    ajouteBF: donnees.ajouteBF === true,
    portee: donnees.portee ?? (type === 'melee' ? PORTEE_MELEE : 'moyenne'),
    chargeur: donnees.chargeur === undefined ? null : entierOuNull(donnees.chargeur),
    traits: (donnees.traits ?? []).map(t => ({
      id: String(t?.id ?? '').toLowerCase(),
      ...(t?.valeur !== undefined ? { valeur: t.valeur } : {})
    })),
    source: String(donnees.source ?? '')
  };
}

/** Liste des erreurs d'une arme normalisée (vide si valide), en français. */
export function validerArme(arme) {
  const erreurs = [];
  if (!arme.nom) erreurs.push('Le nom de l’arme est obligatoire.');
  if (!TYPES_ARME.includes(arme.type)) erreurs.push(`Type d’arme inconnu : ${arme.type} (attendu : melee ou tir).`);
  if (!Number.isInteger(arme.degatsBase) || arme.degatsBase < 0) erreurs.push('Les dégâts de base sont un entier supérieur ou égal à 0.');
  if (!PORTEES.includes(arme.portee)) erreurs.push(`Portée inconnue : ${arme.portee}.`);
  if (arme.chargeur !== null && (!Number.isInteger(arme.chargeur) || arme.chargeur < 1)) erreurs.push('Le chargeur est null ou un entier d’au moins 1.');
  for (const t of arme.traits ?? []) if (!t.id) erreurs.push('Chaque trait d’arme a un id.');
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

/**
 * Suppression refusée tant qu'un profil de la réserve utilise l'arme (comme cthulhu/profils.js) :
 * on ne retire jamais proprement une arme encore équipée, le message liste les utilisateurs.
 */
export function supprimerArme(reserve, id) {
  if (!reserve.armes[id]) throw new RangeError(`Arme introuvable : ${id}.`);
  const utilisateurs = reserve.profils.filter(p => (p.armes ?? []).includes(id)).map(p => p.nom);
  if (utilisateurs.length) throw new RangeError(`L’arme « ${id} » sert encore à ${utilisateurs.join(', ')}.`);
  const { [id]: _retiree, ...reste } = reserve.armes;
  return { ...reserve, armes: reste };
}

// ---------------------------------------------------------------------------
// Profils
// ---------------------------------------------------------------------------

/** Localisations d'armure d'un profil : `{ tete, brasG, brasD, corps, jambeG, jambeD }` (p. 211, 316). */
const CLES_ARMURE = Object.freeze({ tete: 'tete', 'bras-g': 'brasG', 'bras-d': 'brasD', 'jambe-g': 'jambeG', 'jambe-d': 'jambeD', corps: 'corps' });

function normaliserArmureLocalisations(v) {
  if (v === null || v === undefined || typeof v === 'number') return nombreOuNull(v) ?? 0;
  const a = {};
  for (const [src, dst] of [['tete', 'tete'], ['bras', 'bras'], ['brasG', 'brasG'], ['brasD', 'brasD'], ['jambe', 'jambe'], ['jambeG', 'jambeG'], ['jambeD', 'jambeD'], ['corps', 'corps']]) {
    const n = nombreOuNull(v[src]);
    if (n !== null) a[dst] = n;
  }
  return a;
}

/** Profil complet à partir de données saisies : champs facultatifs absents remplacés par leur valeur vide. */
export function normaliserProfil(donnees = {}) {
  const kind = donnees.kind ?? 'PNJ';
  const carac = {};
  for (const c of CARACS) carac[c] = nombreOuNull(donnees.carac?.[c]);
  const competences = {};
  for (const [nom, valeur] of Object.entries(donnees.competences ?? {})) competences[nom] = nombreOuNull(valeur);
  return {
    id: donnees.id ?? null,
    nom: String(donnees.nom ?? '').trim(),
    kind,
    role: donnees.role ?? null,
    camp: donnees.camp ?? (kind === 'PJ' ? 'pj' : 'ennemi'),
    taille: donnees.taille ?? 'moyenne',
    vitesse: donnees.vitesse ?? 'normale',
    image: donnees.image ?? null,
    carac,
    competences,
    armure: normaliserArmureLocalisations(donnees.armure),
    armes: (donnees.armes ?? []).map(String),
    resolution: nombreOuNull(donnees.resolution),
    destinMax: nombreOuNull(donnees.destinMax),
    blessuresMaxFixe: nombreOuNull(donnees.blessuresMaxFixe),
    critiquesMaxFixe: nombreOuNull(donnees.critiquesMaxFixe),
    initiativeFixe: nombreOuNull(donnees.initiativeFixe),
    traitsTexte: String(donnees.traitsTexte ?? ''),
    notes: String(donnees.notes ?? ''),
    source: String(donnees.source ?? ''),
    suivi: kind === 'PJ' ? copie(donnees.suivi) ?? null : null
  };
}

/** Liste des erreurs d'un profil normalisé (vide si valide), en français. */
export function validerProfil(profil) {
  const erreurs = [];
  if (!String(profil.nom ?? '').trim()) erreurs.push('Le nom est obligatoire.');
  if (!KINDS.includes(profil.kind)) erreurs.push(`Type de profil inconnu : ${profil.kind}.`);
  if (profil.role !== null && !ROLES_PNJ.includes(profil.role)) erreurs.push(`Rôle inconnu : ${profil.role} (troupe, elite ou chef).`);
  if (!CAMPS.includes(profil.camp)) erreurs.push(`Camp inconnu : ${profil.camp}.`);
  if (!TAILLES.includes(profil.taille)) erreurs.push(`Taille inconnue : ${profil.taille}.`);
  if (!VITESSES.includes(profil.vitesse)) erreurs.push(`Vitesse inconnue : ${profil.vitesse}.`);
  for (const c of CARACS) {
    const v = profil.carac?.[c];
    if (!Number.isFinite(v) || v < 0 || v > 999) erreurs.push(`La caractéristique ${c} est obligatoire (nombre de 0 à 999).`);
  }
  for (const [nom, valeur] of Object.entries(profil.competences ?? {})) {
    if (!Number.isFinite(valeur) || valeur < 0 || valeur > 999) erreurs.push(`La compétence ${nom} doit être un nombre de 0 à 999.`);
  }
  if (typeof profil.armure === 'number') {
    if (!(profil.armure >= 0)) erreurs.push('L’armure est un nombre positif ou nul.');
  } else {
    for (const [loc, v] of Object.entries(profil.armure ?? {})) {
      if (!Number.isFinite(v) || v < 0) erreurs.push(`L’armure de la localisation ${loc} est un nombre positif ou nul.`);
    }
  }
  if (!Array.isArray(profil.armes) || profil.armes.some(a => typeof a !== 'string')) erreurs.push('Les armes du profil sont une liste d’ids.');
  for (const champ of ['resolution', 'destinMax', 'blessuresMaxFixe', 'critiquesMaxFixe', 'initiativeFixe']) {
    const v = profil[champ];
    if (v !== null && (!Number.isFinite(v) || v < 0)) erreurs.push(`Le champ ${champ} est un nombre positif ou nul, ou null.`);
  }
  return erreurs;
}

function verifierArmes(reserve, profil) {
  for (const id of profil.armes ?? []) {
    if (!reserve.armes[id]) throw new RangeError(`L’arme « ${id} » de ${profil.nom} n’existe pas dans la réserve.`);
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
 * Valeurs dérivées d'un profil (p. 88, 317). Piège du Core Book : certains statblocks de PNJ impriment des
 * valeurs différentes de la formule PJ (ex. Enforcer p. 327 : Per 40 + Ag 30 mais Initiative 6 imprimée ;
 * Chaos Spawn p. 345 : 14 blessures imprimées au lieu de 28). Les champs `blessuresMaxFixe`,
 * `critiquesMaxFixe` et `initiativeFixe` priment alors sur la formule.
 */
export function valeursDerivees(profil) {
  const bonus = {};
  for (const c of CARACS) bonus[c] = bonusCarac(profil.carac?.[c]);
  return {
    bonus,
    blessuresMax: profil.blessuresMaxFixe ?? blessuresMax(profil.carac),
    critiquesMax: profil.critiquesMaxFixe ?? critiquesMax(profil.carac, profil.role ?? 'pj'),
    initiative: profil.initiativeFixe ?? initiativeDe(profil.carac),
    armure: profil.armure ?? 0
  };
}

/**
 * Armure d'une localisation (p. 211, 316). Si `armure` est un nombre, cette valeur s'applique à toutes les
 * localisations (p. 316 : armure des PNJ simplifiée en une seule valeur) ; si c'est un objet, on lit la
 * localisation (`bras-g` → `brasG`, ou `bras` à défaut, idem pour les jambes), 0 si absente.
 */
export function armureDe(profil, localisation) {
  const cle = CLES_ARMURE[localisation];
  if (!cle) throw new RangeError(`Localisation inconnue : ${localisation}.`);
  const armure = profil.armure ?? 0;
  if (typeof armure === 'number') return armure;
  const generique = cle.startsWith('bras') ? 'bras' : cle.startsWith('jambe') ? 'jambe' : null;
  return nombreOuNull(armure[cle]) ?? (generique ? nombreOuNull(armure[generique]) : null) ?? 0;
}

/**
 * Seuil d'un test de compétence (p. 92, 316) : la valeur de la compétence, ou à défaut celle de la
 * compétence parente si le nom est « Parent (Spécialisation) », sinon la caractéristique de repli
 * (p. 316 : un PNJ sans la compétence utilise la caractéristique correspondante).
 */
export function seuilCompetence(profil, nomCompetence, caracFallback) {
  const c = profil.competences ?? {};
  const direct = nombreOuNull(c[nomCompetence]);
  if (direct !== null) return direct;
  const m = String(nomCompetence).match(/^(.+)\s*\((.+)\)$/);
  if (m) {
    const parent = nombreOuNull(c[m[1].trim()]);
    if (parent !== null) return parent;
  }
  return nombreOuNull(profil.carac?.[caracFallback]) ?? 0;
}
