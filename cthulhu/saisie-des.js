/**
 * Saisie des dés par le MJ (lot M7) : module pur, sans DOM, qui prédit quels dés une action va demander en
 * appelant les fonctions du moteur (`regles.js`, `rencontre.js`) sur l'état courant — jamais en ré-implémentant
 * une règle — puis valide les saisies et construit un `fournisseurStrict` qui LÈVE une erreur quand le moteur
 * demande un dé qui n'a pas été saisi (aucun repli vers le hasard).
 *
 * - `validerEntier(brut, { min, max, libelle })` : validation d'une saisie (entier dans ses bornes), message en français.
 * - `fournisseurStrict({ d100, lancers })` : fournisseur de dés pour `seance.agir` ; `d100()` rend `{ jet, candidats }`
 *   à partir de la file des d100 saisis, `lancer(expression)` rend la valeur saisie suivante pour une expression à
 *   dés (les expressions constantes passent sans consommer) ; file épuisée → `RangeError`.
 * - `planResolution(rencontre)` : prédit les dégâts d'une action en attente (tir ou mêlée) via `resoudreMelee` /
 *   `calculerDegats` / `empalementPossible`, sans muter l'état.
 * - `evaluerJetConBlessure(plan, valeursDegats)` : prédit le total de dégâts et si un jet de CON (blessure grave)
 *   sera demandé, via `calculerDegats` + `appliquerBlessure`.
 * - `planJetSan(pj, cout, { jetSan, perte })` : prédit la perte de SAN (champ à dés ou perte fixe) et si le jet
 *   d'INT (perte ≥ 5) sera demandé, via `analyserCoutSan` / `niveauDuJet` / `maxExpression`.
 */
import {
  NIVEAU, estReussite, analyserExpression, lancerExpression, maxExpression, resoudreMelee, empalementPossible,
  calculerDegats, appliquerBlessure, analyserCoutSan, niveauDuJet
} from './regles.js';
import { participant } from './rencontre.js';

// ---------------------------------------------------------------------------
// Validation d'une saisie
// ---------------------------------------------------------------------------

/**
 * Valide une saisie d'entier. Rejette la chaîne vide, les espaces seuls, les décimaux, NaN et le hors-bornes.
 * Rend `{ ok: true, valeur }` ou `{ ok: false, message }` (message en français, avec le libellé du champ).
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
// Fournisseur strict : aucun repli vers le hasard
// ---------------------------------------------------------------------------

/**
 * Fournisseur de dés alimenté par les saisies du MJ. `d100()` consomme la valeur suivante de `d100` et rend
 * `{ jet: v, candidats: [v] }` (le MJ a saisi le résultat final, dés bonus/malus déjà combinés) ; file épuisée →
 * `RangeError`. `lancer(expression)` : expression sans dé (constante, ex. `0`, `1`, `-2`) rendue telle quelle sans
 * rien consommer ; sinon consomme la valeur suivante de `lancers`, file épuisée → `RangeError`.
 */
export function fournisseurStrict({ d100 = [], lancers = [] } = {}) {
  const jets = [...d100];
  const valeurs = [...lancers];
  return {
    d100() {
      if (!jets.length) throw new RangeError('Jet de d100 manquant (saisie requise).');
      const v = jets.shift();
      return { jet: v, candidats: [v] };
    },
    lancer(expression) {
      if (!analyserExpression(expression).some(t => t.faces)) return lancerExpression(expression);
      if (!valeurs.length) throw new RangeError(`Jet manquant pour ${expression} (saisie requise).`);
      return valeurs.shift();
    }
  };
}

// ---------------------------------------------------------------------------
// Prédiction de la résolution (dégâts, blessure grave, jet de CON)
// ---------------------------------------------------------------------------

/** Réduction de dégâts propre à la cible, comme l applique `infligerDegats` du moteur. */
const reductionDe = (arme, victime) => (arme.type === 'feu' ? victime.reductionFeu ?? null : null);

/** Champs de dés de dégâts prédits pour un coup qui touche, d'après `calculerDegats` (mêmes branches). */
function planDegats({ auteur, victime, arme, niveau, tresLonguePortee }) {
  const extreme = niveau >= NIVEAU.EXTREME && !(tresLonguePortee && niveau === NIVEAU.EXTREME);
  const impact = auteur.impact;
  const impactADes = arme.aImpact === true && impact && impact !== '0' && analyserExpression(impact).some(t => t.faces);
  const champsDegats = [];
  let degatsFixes = null;
  if (!extreme) {
    champsDegats.push({ cle: 'arme', libelle: `Arme (${arme.des})`, expression: arme.des });
    if (impactADes) champsDegats.push({ cle: 'impact', libelle: `Impact (${impact})`, expression: impact });
  } else if (empalementPossible({ arme, niveau, tresLonguePortee })) {
    // Extrême empalant : maximum de l'arme et de l'Impact, plus un jet de l'arme (le seul dé demandé).
    champsDegats.push({ cle: 'empalement', libelle: `Empalement (${arme.des})`, expression: arme.des });
  } else {
    // Extrême non empalant : aucun dé (maximum de l'arme + Impact max), total calculé par le moteur.
    const d = calculerDegats({ arme, impact, niveau, armure: victime.armure, reduction: reductionDe(arme, victime), tresLonguePortee });
    degatsFixes = d.total;
  }
  return { touche: true, auteur, victime, arme, niveau, tresLonguePortee, champsDegats, degatsFixes };
}

/**
 * Prédit la résolution de l'action en attente (`rencontre.enAttente`, type `'tir'` ou `'melee'`), sans muter l'état :
 * `{ touche: false }` si le tir manque ou si `resoudreMelee` ne touche personne ; sinon
 * `{ touche: true, auteur, victime, arme, niveau, tresLonguePortee, champsDegats: [{ cle, libelle, expression }], degatsFixes }`.
 * En coup normal `champsDegats` vaut `arme` puis `impact` si l'Impact de l'auteur porte des dés ; en Extrême
 * empalant, `empalement` ; en Extrême non empalant, `[]` avec `degatsFixes` calculé via `calculerDegats`.
 */
export function planResolution(rencontre) {
  const e = rencontre.enAttente;
  if (!e || (e.type !== 'tir' && e.type !== 'melee')) return { touche: false };
  const a = participant(rencontre, e.attaquantId);
  const c = participant(rencontre, e.cibleId);
  if (e.type === 'tir') {
    if (!e.attaque.reussi) return { touche: false };
    return planDegats({ auteur: a, victime: c, arme: rencontre.armes[a.armeTir], niveau: e.attaque.niveau, tresLonguePortee: e.tresLonguePortee === true });
  }
  const r = resoudreMelee({ attaque: e.attaque, defense: e.defense, mode: e.mode });
  if (!r.touche) return { touche: false };
  const auteur = r.touche === 'defenseur' ? a : c;
  const victime = r.touche === 'defenseur' ? c : a;
  return planDegats({ auteur, victime, arme: rencontre.armes[auteur.armeMelee], niveau: r.niveauDegats, tresLonguePortee: false });
}

/**
 * Prédit le total de dégâts d'un plan qui touche et si un jet de CON (blessure grave) sera demandé :
 * `calculerDegats` (avec les valeurs saisies, dans l'ordre des champs prédits) puis `appliquerBlessure`.
 * `valeursDegats` : `{ [cle]: entier ≥ 0 }` saisi par le MJ. Rend `{ pret, total, jetCON, victime }` ;
 * `pret: false` tant qu'un champ de dégâts manque ou est invalide.
 */
export function evaluerJetConBlessure(plan, valeursDegats = {}) {
  if (!plan || plan.touche !== true) return { pret: false, total: null, jetCON: false, victime: plan?.victime ?? null };
  if (plan.champsDegats.some(c => !Number.isInteger(valeursDegats[c.cle]) || valeursDegats[c.cle] < 0)) {
    return { pret: false, total: null, jetCON: false, victime: plan.victime };
  }
  const parExpression = new Map(plan.champsDegats.map(c => [c.expression, c.cle]));
  const lancer = expression => {
    const cle = parExpression.get(expression);
    if (cle !== undefined) return valeursDegats[cle];
    if (analyserExpression(expression).some(t => t.faces)) throw new RangeError(`Jet manquant pour ${expression} (saisie requise).`);
    return lancerExpression(expression); // constante (Impact fixe, ex. « -1 »)
  };
  const d = calculerDegats({
    arme: plan.arme, impact: plan.auteur.impact, niveau: plan.niveau, armure: plan.victime.armure,
    reduction: reductionDe(plan.arme, plan.victime), tresLonguePortee: plan.tresLonguePortee === true, lancer
  });
  const apres = appliquerBlessure(plan.victime, d.total);
  return { pret: true, total: d.total, jetCON: apres.jetCON === true, victime: plan.victime };
}

// ---------------------------------------------------------------------------
// Prédiction d'un jet de SAN (perte, jet d'INT)
// ---------------------------------------------------------------------------

/**
 * Prédit le déroulement d'un jet de SAN : `analyserCoutSan(cout)` est vérifié (lève si le coût est invalide) ;
 * si `jetSan` est un entier de 1 à 100, `niveau = niveauDuJet(jetSan, pj.san)` et :
 * - `champPerte` : `{ expression }` si la branche retenue contient des dés (hors maladresse, qui prend
 *   `maxExpression(echec)`), sinon `null` avec `perteFixe` ;
 * - `jetIntRequis` : `perteEffective >= 5`, où `perteEffective` vaut `perteFixe` si la perte est fixe, ou `perte`
 *   si elle a été saisie (entier ≥ 0).
 * Sans `jetSan` valide, rend `{ jetValide: false, … }` (aucune prédiction de branche).
 */
export function planJetSan(pj, cout, { jetSan = null, perte = null } = {}) {
  const { reussite, echec } = analyserCoutSan(cout);
  const jetValide = Number.isInteger(jetSan) && jetSan >= 1 && jetSan <= 100;
  if (!jetValide) return { jetValide: false, niveau: null, champPerte: null, perteFixe: null, perteEffective: null, jetIntRequis: false, cout: { reussite, echec } };
  const niveau = niveauDuJet(jetSan, pj.san);
  let champPerte = null;
  let perteFixe = null;
  let expression = null;
  if (estReussite(niveau)) expression = reussite;
  else if (niveau === NIVEAU.MALADRESSE) perteFixe = Math.max(0, maxExpression(echec));
  else expression = echec;
  if (expression !== null) {
    if (analyserExpression(expression).some(t => t.faces)) champPerte = { expression };
    else perteFixe = Math.max(0, lancerExpression(expression));
  }
  const perteSaisie = Number.isInteger(perte) && perte >= 0 ? perte : null;
  const perteEffective = perteFixe !== null ? perteFixe : perteSaisie;
  return {
    jetValide: true, niveau, champPerte, perteFixe, perteEffective,
    jetIntRequis: perteEffective !== null && perteEffective >= 5,
    cout: { reussite, echec }
  };
}
