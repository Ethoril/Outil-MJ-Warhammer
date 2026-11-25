/**
 * Saisie des dés par le MJ pour Imperium Maledictum (lot I4) : module pur, sans DOM, qui prédit
 * les dés demandés par une action en sondant directement les fonctions du moteur (`regles.js`,
 * `rencontre.js`) sur une copie de l'état — jamais en ré-implémentant une règle ni un seuil —
 * puis valide les saisies et fournit un `fournisseurStrict` qui lève `RangeError` si un dé manque.
 *
 * - `validerEntier(brut, { min, max, libelle })` : validation d'une saisie entière dans [min, max].
 * - `tirerCase(expression, random)` : tirage d'une case au bouton « Lancer » (`d100` -> [1, 100],
 *   autre expression -> `lancerExpression`).
 * - `fournisseurStrict({ d100, lancers })` : fournisseur de dés strict sans repli vers le hasard.
 * - `sondeAction(rencontre, requete, saisies)` / `planAction(...)` : sonde le moteur sur copie
 *   pour lister les champs de dés attendus, exposer `apercuInversion` si une inversion est en
 *   attente, et indiquer `pretends` (prêt à exécuter).
 */
import { analyserExpression, lancerExpression } from './regles.js';
import {
  participant,
  commencerRound, resoudreEgaliteInitiative, passerTour,
  attaquerMelee, attaquerDistance, choisirInversion, trancherEgalite,
  premiersSoins, traiterCritique, testLibre, testOppose, depenserDestin
} from './rencontre.js';

// ---------------------------------------------------------------------------
// Validation d'une saisie
// ---------------------------------------------------------------------------

/**
 * Valide une saisie d'entier. Rejette la chaîne vide, les espaces seuls, les décimaux, NaN et le hors-bornes.
 * Retourne `{ ok: true, valeur }` ou `{ ok: false, message }` en français avec le libellé du champ.
 */
export function validerEntier(brut, { min, max, libelle }) {
  const borne = max === Infinity ? `un entier d’au moins ${min}` : `un entier de ${min} à ${max}`;
  const t = String(brut ?? '').trim();
  if (!t) return { ok: false, message: `${libelle} : aucune valeur saisie (${borne} attendu).` };
  if (!/^[+-]?\d+$/.test(t)) return { ok: false, message: `${libelle} : « ${t} » n’est pas un entier (${borne} attendu).` };
  const valeur = Number(t);
  if (valeur < min || valeur > max) return { ok: false, message: `${libelle} : ${valeur} est hors limites (${borne} attendu).` };
  return { ok: true, valeur };
}

// ---------------------------------------------------------------------------
// Tirage d'une case de dé (bouton « Lancer »)
// ---------------------------------------------------------------------------

/**
 * Valeur tirée au clic sur « Lancer » à côté d'une case de dé : `'d100'` tire un entier de 1 à 100 ;
 * toute autre expression (`'1d10'`, `'1d5'`…) est déléguée à `lancerExpression` de `regles.js`.
 */
export function tirerCase(expression, random = Math.random) {
  const e = String(expression ?? '').trim();
  if (e.toLowerCase() === 'd100') return 1 + Math.floor(random() * 100);
  return lancerExpression(e, random);
}

// ---------------------------------------------------------------------------
// Fournisseur strict : aucun repli vers le hasard
// ---------------------------------------------------------------------------

/**
 * Fournisseur de dés alimenté par les saisies du MJ.
 * - `d100()` consomme la valeur suivante de `d100` (file épuisée -> `RangeError`).
 * - `lancer(expression)` rend une constante sans consommer, sinon consomme la valeur suivante de `lancers`
 *   (file épuisée -> `RangeError`). Aucun repli vers le hasard.
 */
export function fournisseurStrict({ d100 = [], lancers = [] } = {}) {
  const jets = [...d100];
  const valeurs = [...lancers];
  return {
    d100() {
      if (!jets.length) throw new RangeError('Jet de d100 manquant (saisie requise).');
      return jets.shift();
    },
    lancer(expression) {
      if (!analyserExpression(expression).some(t => t.faces)) return lancerExpression(expression);
      if (!valeurs.length) throw new RangeError(`Jet manquant pour ${expression} (saisie requise).`);
      return valeurs.shift();
    }
  };
}

// ---------------------------------------------------------------------------
// Sondage du moteur sur copie
// ---------------------------------------------------------------------------

const LIBELLES_MOTIF = {
  'attaque-melee': m => `Attaque de mêlée (${m.competence ?? 'Mêlée'})`,
  'defense-melee': m => `Défense de mêlée (${m.competence ?? 'Mêlée'})`,
  'esquive-melee': m => `Esquive en mêlée (${m.competence ?? 'Réflexes (Esquive)'})`,
  'attaque-tir': m => `Attaque à distance (${m.competence ?? 'Tir'})`,
  'esquive-tir': m => `Esquive au tir (${m.competence ?? 'Réflexes (Esquive)'})`,
  'egalite-relancer': m => `Relance d’égalité (${m.cote ?? 'test'})`,
  'premiers-soins': m => `Premiers soins (${m.competence ?? 'Médecine'})`,
  'test': m => `Test (${m.competence ?? 'Compétence'})`,
  'test-oppose': m => `Test opposé (${m.competence ?? 'Compétence'})`,
  'destin-relancer': () => 'Relance (Destin)',
  'blessures-max': () => 'Endurance (Douleur)',
  'localisation-critique': () => 'Localisation critique',
  'severite-critique': () => 'Sévérité critique',
  'maladresse': () => 'Maladresse',
  'reliable': () => 'Fiable (Reliable)',
  'bras-aleatoire': () => 'Bras aléatoire',
  'armure-localisation': () => 'Localisation d’armure',
  'touche-allie': () => 'Localisation (touche allié)'
};

function libelleDeMeta(rencontre, expr, meta = {}) {
  const acteur = meta.id ? participant(rencontre, meta.id)?.nom : null;
  let detail;
  if (meta.motif && LIBELLES_MOTIF[meta.motif]) {
    detail = LIBELLES_MOTIF[meta.motif](meta);
  } else if (meta.etat) {
    detail = `État ${meta.etat}`;
  } else {
    detail = expr;
  }
  return acteur ? `${acteur} — ${detail} (${expr})` : `${detail} (${expr})`;
}

function executerActionSurCopie(copie, requete, des) {
  const { action, params = {} } = requete ?? {};
  switch (action) {
    case 'attaquerMelee': return attaquerMelee(copie, params, des);
    case 'attaquerDistance': return attaquerDistance(copie, params, des);
    case 'choisirInversion': return choisirInversion(copie, requete.optionId ?? params.optionId, des);
    case 'trancherEgalite': return trancherEgalite(copie, requete.decision ?? params.decision, des);
    case 'passerTour': return passerTour(copie, des);
    case 'commencerRound': return commencerRound(copie, { ...params, des });
    case 'resoudreEgaliteInitiative': return resoudreEgaliteInitiative(copie, requete.gagnantId ?? params.gagnantId, des);
    case 'premiersSoins': return premiersSoins(copie, params, des);
    case 'traiterCritique': return traiterCritique(copie, params, des);
    case 'testLibre': return testLibre(copie, params, des);
    case 'testOppose': return testOppose(copie, params, des);
    case 'depenserDestin': return depenserDestin(copie, requete.id ?? params.id, requete.effet ?? params.effet, params, des);
    default: throw new RangeError(`Action inconnue pour le sondage : ${action}.`);
  }
}

/**
 * Sonde le moteur sur une copie de `rencontre` pour déterminer exactement les dés demandés par `requete`,
 * en injectant d'abord les valeurs déjà saisies (`d100`, `lancers`). Ne mute jamais `rencontre`.
 * Retourne `{ champs: [{ cle, type, des, libelle, valeurSaisie? }], apercuInversion, pretends, erreur? }`.
 */
export function sondeAction(rencontre, requete, { d100 = [], lancers = [] } = {}) {
  const copie = JSON.parse(JSON.stringify(rencontre));
  const jets = [...d100];
  const valeurs = [...lancers];
  const champs = [];
  const clesVues = new Map();
  let manquants = 0;

  const nouvelleCle = (type, meta = {}) => {
    const base = [meta.motif ?? meta.etat ?? type, meta.id ?? ''].filter(Boolean).join(':');
    const n = (clesVues.get(base) ?? 0) + 1;
    clesVues.set(base, n);
    return n === 1 ? base : `${base}#${n}`;
  };

  const des = {
    d100(meta = {}) {
      const cle = nouvelleCle('d100', meta);
      const libelle = libelleDeMeta(copie, 'd100', meta);
      if (jets.length) {
        const valeurSaisie = jets.shift();
        champs.push({ cle, type: 'd100', des: 'd100', libelle, valeurSaisie });
        return valeurSaisie;
      }
      manquants += 1;
      champs.push({ cle, type: 'd100', des: 'd100', libelle });
      return 50;
    },
    lancer(expression, meta = {}) {
      const expr = String(expression);
      if (!analyserExpression(expr).some(t => t.faces)) return lancerExpression(expr, () => 0);
      const cle = nouvelleCle('lancer', meta);
      const libelle = libelleDeMeta(copie, expr, meta);
      if (valeurs.length) {
        const valeurSaisie = valeurs.shift();
        champs.push({ cle, type: 'lancer', des: expr, libelle, valeurSaisie });
        return valeurSaisie;
      }
      manquants += 1;
      champs.push({ cle, type: 'lancer', des: expr, libelle });
      return lancerExpression(expr, () => 0);
    }
  };

  let apres;
  try {
    apres = executerActionSurCopie(copie, requete, des);
  } catch (err) {
    return { champs, apercuInversion: null, pretends: false, erreur: err.message };
  }

  const journalAjoute = apres.journal.slice(copie.journal.length);
  const errJournal = journalAjoute.find(j => j.type === 'erreur');
  if (errJournal) {
    return { champs, apercuInversion: null, pretends: false, erreur: errJournal.texte };
  }

  const apercuInversion = apres.enAttente?.type === 'inversion' ? apres.enAttente : null;
  return {
    champs,
    apercuInversion,
    pretends: manquants === 0 && !apercuInversion
  };
}

export const planAction = sondeAction;
