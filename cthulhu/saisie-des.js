/**
 * Saisie des dés par le MJ (lot M7) : module pur, sans DOM, qui prédit quels dés une action va demander en
 * appelant les fonctions du moteur (`regles.js`, `rencontre.js`) sur l'état courant — jamais en ré-implémentant
 * une règle — puis valide les saisies et construit un `fournisseurStrict` qui LÈVE une erreur quand le moteur
 * demande un dé qui n'a pas été saisi (aucun repli vers le hasard).
 *
 * - `validerEntier(brut, { min, max, libelle })` : validation d'une saisie (entier dans ses bornes), message en français.
 * - `tirerCase(expression, random)` : valeur tirée au clic sur le bouton « Lancer » d'une case (lot M8) — `d100`
 *   rend un entier de 1 à 100, toute autre expression de dés est tirée par `lancerExpression` en une seule valeur.
 * - `fournisseurStrict({ d100, lancers })` : fournisseur de dés pour `seance.agir` ; `d100()` rend `{ jet, candidats }`
 *   à partir de la file des d100 saisis, `lancer(expression)` rend la valeur saisie suivante pour une expression à
 *   dés (les expressions constantes passent sans consommer) ; file épuisée → `RangeError`.
 * - `planResolution(rencontre)` : prédit les dégâts d'une action en attente (tir ou mêlée) en sondant le moteur :
 *   `calculerDegats` est appelé avec un `lancer` qui enregistre chaque expression demandée (on lit `d.empale` pour
 *   nommer le champ de l'empalement), et quand aucun dé n'est demandé, la résolution est rejouée sur une copie par
 *   `resoudreEnAttente` pour lire le total tel que le moteur le calcule (réduction de la cible et armure comprises).
 * - `evaluerJetConBlessure(plan, valeursDegats)` : rejoue la résolution sur une copie avec les saisies rangées dans
 *   l'ordre des champs prédits (`fournisseurStrict`) : le total se lit dans le journal rendu par le moteur et le
 *   jet de CON est prévu exactement quand le moteur réclame un d100.
 * - `planJetSan(pj, cout, { jetSan, perte })` : prédit la perte de SAN en sondant `perteSan` (le `lancer` enregistre
 *   l'expression demandée), puis demande au moteur via `appliquerPerteSan(...).jetIntRequis` si le jet d'INT suivra.
 */
import {
  analyserExpression, lancerExpression, resoudreMelee, calculerDegats, analyserCoutSan, niveauDuJet,
  perteSan, appliquerPerteSan
} from './regles.js';
import { participant, resoudreEnAttente } from './rencontre.js';

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
// Tirage d'une case de dé (bouton « Lancer », lot M8)
// ---------------------------------------------------------------------------

/**
 * Valeur tirée au clic sur « Lancer » à côté d'une case de dé : `'d100'` tire un entier de 1 à 100 ; toute autre
 * expression (« 1D6+1D4 », « +2D6 »…) est tirée par `lancerExpression` du moteur et rend une seule valeur.
 * `random` est injectable (tests) ; rend l'entier tiré.
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

/** Total lu dans la dernière ligne « degats » du journal rendu par le moteur (« … = 12. »). */
function totalDeDegats(journal) {
  for (let i = journal.length - 1; i >= 0; i--) {
    if (journal[i].type !== 'degats') continue;
    const m = /= (\d+)\.$/.exec(journal[i].texte);
    return m ? Number(m[1]) : null;
  }
  return null;
}

/**
 * Sonde du moteur : rejoue la résolution de l'action en attente sur une COPIE de `etat` en enregistrant chaque dé
 * demandé (`{ type: 'lancer' | 'const' | 'd100', expression? }`). `lancer` est le fournisseur de dés du sondage :
 * avec les saisies du MJ (`fournisseurStrict`), tout dé non prévu lève ; avec `e => lancerExpression(e)`, les dés
 * reçoivent une valeur quelconque (prédiction seule). Rend `{ demandes, apres }` ; l'état transmis n'est pas muté.
 */
function sondeResolution(etat, lancer) {
  const demandes = [];
  const des = {
    d100(net) { demandes.push({ type: 'd100' }); return { jet: 50, candidats: [50] }; },
    lancer(expression) {
      const e = String(expression);
      demandes.push({ type: analyserExpression(e).some(t => t.faces) ? 'lancer' : 'const', expression: e });
      return lancer(e);
    }
  };
  const apres = resoudreEnAttente(JSON.parse(JSON.stringify(etat)), des);
  return { demandes, apres };
}

const LIBELLE_ROLE = { arme: 'Arme', impact: 'Impact', empalement: 'Empalement' };

/**
 * Champs de dés de dégâts prédits pour un coup qui touche, en sondant le moteur : `calculerDegats` est appelé avec
 * un `lancer` qui enregistre chaque expression demandée, et seules celles qui contiennent des dés deviennent des
 * champs (une expression constante est rendue telle quelle par le moteur, sans saisie). On ne lit de cet appel que
 * les demandes et `d.empale` (indépendants de l'armure et de la réduction de la cible) : `d.empale` nomme le champ
 * de l'empalement, sinon les demandes sont « arme » puis « impact », dans l'ordre. Quand aucun dé n'est demandé,
 * le total est lu en rejouant la résolution sur une copie (`resoudreEnAttente`) : le moteur y applique lui-même la
 * réduction de la cible et l'armure.
 */
function planDegats(etat, { auteur, victime, arme, niveau, tresLonguePortee }) {
  const demandes = [];
  const d = calculerDegats({
    arme, impact: auteur.impact, niveau, tresLonguePortee,
    lancer: expression => { demandes.push(String(expression)); return lancerExpression(expression); }
  });
  const champsDegats = demandes
    .map((expression, i) => ({ role: d.empale ? 'empalement' : (i === 0 ? 'arme' : 'impact'), expression }))
    .filter(c => analyserExpression(c.expression).some(t => t.faces))
    .map(c => ({ cle: c.role, libelle: `${LIBELLE_ROLE[c.role]} (${c.expression})`, expression: c.expression }));
  let degatsFixes = null;
  if (!champsDegats.length) degatsFixes = totalDeDegats(sondeResolution(etat, e => lancerExpression(e)).apres.journal);
  return { touche: true, auteur, victime, arme, niveau, tresLonguePortee, champsDegats, degatsFixes, etat };
}

/**
 * Prédit la résolution de l'action en attente (`rencontre.enAttente`, type `'tir'` ou `'melee'`), sans muter l'état :
 * `{ touche: false }` si le tir manque ou si `resoudreMelee` ne touche personne ; sinon
 * `{ touche: true, auteur, victime, arme, niveau, tresLonguePortee, champsDegats: [{ cle, libelle, expression }], degatsFixes, etat }`
 * (`etat` : la rencontre sondée, conservée pour `evaluerJetConBlessure`). En coup normal `champsDegats` vaut `arme`
 * puis `impact` si le moteur demande l'Impact ; en Extrême empalant, `empalement` ; en Extrême non empalant, `[]`
 * avec `degatsFixes` lu sur la copie rejouée par le moteur.
 */
export function planResolution(rencontre) {
  const e = rencontre.enAttente;
  if (!e || (e.type !== 'tir' && e.type !== 'melee')) return { touche: false };
  const a = participant(rencontre, e.attaquantId);
  const c = participant(rencontre, e.cibleId);
  if (e.type === 'tir') {
    if (!e.attaque.reussi) return { touche: false };
    return planDegats(rencontre, { auteur: a, victime: c, arme: rencontre.armes[a.armeTir], niveau: e.attaque.niveau, tresLonguePortee: e.tresLonguePortee === true });
  }
  const r = resoudreMelee({ attaque: e.attaque, defense: e.defense, mode: e.mode });
  if (!r.touche) return { touche: false };
  const auteur = r.touche === 'defenseur' ? a : c;
  const victime = r.touche === 'defenseur' ? c : a;
  return planDegats(rencontre, { auteur, victime, arme: rencontre.armes[auteur.armeMelee], niveau: r.niveauDegats, tresLonguePortee: false });
}

/**
 * Prédit le total de dégâts d'un plan qui touche et si un jet de CON (blessure grave) sera demandé : la résolution
 * est rejouée sur une copie de l'état du plan avec les saisies (`fournisseurStrict`, consommées dans l'ordre des
 * champs prédits — tout dé non prévu lève). Le total se lit dans le journal rendu par le moteur (réduction de la
 * cible et armure appliquées par lui) et le jet de CON est prévu exactement quand le moteur réclame un d100.
 * `valeursDegats` : `{ [cle]: entier au moins nul }` saisi par le MJ. Rend `{ pret, total, jetCON, victime }` ;
 * `pret: false` tant qu'un champ de dégâts manque ou est invalide.
 */
export function evaluerJetConBlessure(plan, valeursDegats = {}) {
  if (!plan || plan.touche !== true) return { pret: false, total: null, jetCON: false, victime: plan?.victime ?? null };
  if (plan.champsDegats.some(c => !Number.isInteger(valeursDegats[c.cle]) || valeursDegats[c.cle] < 0)) {
    return { pret: false, total: null, jetCON: false, victime: plan.victime };
  }
  const lancer = fournisseurStrict({ lancers: plan.champsDegats.map(c => valeursDegats[c.cle]) }).lancer;
  const { demandes, apres } = sondeResolution(plan.etat, lancer);
  return {
    pret: true,
    total: totalDeDegats(apres.journal),
    jetCON: demandes.some(x => x.type === 'd100'),
    victime: plan.victime
  };
}

// ---------------------------------------------------------------------------
// Prédiction d'un jet de SAN (perte, jet d'INT)
// ---------------------------------------------------------------------------

/**
 * Prédit le déroulement d'un jet de SAN : `analyserCoutSan(cout)` est vérifié (lève si le coût est invalide) ;
 * si `jetSan` est un entier de 1 à 100, `niveau = niveauDuJet(jetSan, pj.san)` et le moteur est sondé par
 * `perteSan({ cout, niveau, lancer })` avec un `lancer` qui enregistre l'expression demandée (aucune en cas de
 * maladresse : le moteur prend lui-même le maximum de la branche échec) :
 * - `champPerte` : `{ expression }` si la branche demandée contient des dés, sinon `null` avec `perteFixe` ;
 * - `jetIntRequis` : lu dans `appliquerPerteSan({ san, journee }, perteEffective).jetIntRequis` (seuil du moteur,
 *   pas une constante recopiée ici), où `perteEffective` vaut `perteFixe` si la perte est fixe, ou `perte` si elle
 *   a été saisie (entier au moins nul).
 * Sans `jetSan` valide, rend `{ jetValide: false, … }` (aucune prédiction de branche).
 */
export function planJetSan(pj, cout, { jetSan = null, perte = null } = {}) {
  const { reussite, echec } = analyserCoutSan(cout);
  const jetValide = Number.isInteger(jetSan) && jetSan >= 1 && jetSan <= 100;
  if (!jetValide) return { jetValide: false, niveau: null, champPerte: null, perteFixe: null, perteEffective: null, jetIntRequis: false, cout: { reussite, echec } };
  const niveau = niveauDuJet(jetSan, pj.san);
  const demandes = [];
  const perteSonde = perteSan({ cout, niveau, lancer: expression => { demandes.push(String(expression)); return lancerExpression(expression); } });
  const demande = demandes[0] ?? null;
  const champPerte = demande !== null && analyserExpression(demande).some(t => t.faces) ? { expression: demande } : null;
  const perteFixe = champPerte ? null : perteSonde;
  const perteSaisie = Number.isInteger(perte) && perte >= 0 ? perte : null;
  const perteEffective = perteFixe !== null ? perteFixe : perteSaisie;
  const jetIntRequis = perteEffective !== null
    ? appliquerPerteSan({ san: pj.san, journee: pj.journeeSan }, perteEffective).jetIntRequis
    : false;
  return {
    jetValide: true, niveau, champPerte, perteFixe, perteEffective,
    jetIntRequis,
    cout: { reussite, echec }
  };
}
