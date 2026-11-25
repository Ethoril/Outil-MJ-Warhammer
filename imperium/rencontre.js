/**
 * Imperium Maledictum : moteur de rencontre pur (état -> nouvel état), chapitre VII Combat du Core Book.
 * Module sans DOM et sans hasard implicite : tous les dés viennent du fournisseur injecté
 * `des = { d100(meta) -> entier | { jet }, lancer(expression, meta) -> entier }`, un appel par dé demandé ;
 * un dé manquant lève un RangeError explicite (permet à une UI de prédire les dés nécessaires en sondant le moteur).
 *
 * Toutes les règles passent par regles.js / tables-critiques.js / profils.js (lots I1-I2) : aucune formule
 * n'est réimplémentée ici. Seuls imports autorisés : ./regles.js et ./profils.js.
 *
 * Conventions : interface et journal en français ; page du PDF = page imprimée du Core Book citée en commentaire ;
 * aucune donnée d'entrée mutée (état sérialisable en JSON) ; yards = mètres sans conversion.
 * Garde : tant que `enAttente` est non nul, toute action autre que choisirInversion / trancherEgalite /
 * resoudreEgaliteInitiative est refusée (note 'erreur' au journal, état inchangé par ailleurs).
 */
import {
  COUVERT, PORTEES, ETATS,
  bonusCarac, normaliserJet, prevoirTest, selectionnerOptionTest, resoudreTestOppose, localisationDuJet,
  calculerArmureEffective, resoudreDegats, appliquerDegats, resoudreEsquiveDistance,
  verifierDesespere, degatsEtatTour, consulterMaladresse, consulterCritique
} from './regles.js';
import { trouverProfil, valeursDerivees, armureDe, seuilCompetence, modifierProfil } from './profils.js';

export const VERSION_RENCONTRE = 1;

const clone = v => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------------------
// Dés injectés : un appel par dé, RangeError si le dé manque
// ---------------------------------------------------------------------------

function d100(des, meta) {
  if (!des || typeof des.d100 !== 'function') throw new RangeError(`Fournisseur de dés absent : d100(${JSON.stringify(meta)}) requis.`);
  const r = des.d100(meta);
  const jet = typeof r === 'number' ? r : r?.jet;
  return normaliserJet(jet); // RangeError si hors 1-100
}

function lancerDes(des, expression, meta) {
  if (!des || typeof des.lancer !== 'function') throw new RangeError(`Fournisseur de dés absent : lancer(${expression}) requis.`);
  const v = des.lancer(expression, meta);
  if (!Number.isFinite(v)) throw new RangeError(`Dé manquant pour « ${expression} » (${JSON.stringify(meta)}).`);
  return v;
}

/** Jet d'un acteur ; si Destin brûlé « Pour l'Empereur » (p. 220), le joueur a choisi le résultat. */
function jetActeur(s, p, des, meta) {
  if (p.destinPourEmpereur !== null && p.destinPourEmpereur !== undefined) return normaliserJet(p.destinPourEmpereur);
  return d100(des, meta);
}

// ---------------------------------------------------------------------------
// Outils d'état (aucune mutation : helpers de copie)
// ---------------------------------------------------------------------------

export const participant = (state, id) => state.participants.find(p => p.id === id);
const maj = (state, id, changement) => ({ ...state, participants: state.participants.map(p => (p.id === id ? { ...p, ...changement } : p)) });
const noter = (state, texte, type = 'info') => ({ ...state, journal: [...state.journal, { round: state.round, texte, type }] });
const armeDe = (state, id) => state.armes[id];
const traitDe = (arme, id) => (arme?.traits ?? []).find(t => t.id === id);
const aTrait = (arme, id) => Boolean(traitDe(arme, id));

/** En jeu : ni mort, ni vaincu, ni enfui. */
export const enJeu = p => p && !['mort', 'vaincu', 'fui'].includes(p.etat);
/** Seul un participant actif a un tour. */
export const peutAgir = p => p && p.etat === 'actif';
export const acteurCourant = state => (state.ordre.length > state.indexTour ? participant(state, state.ordre[state.indexTour]) : null);

/** Garde : bloque toute action tant qu'une décision est en attente. */
function refuserSiEnAttente(state) {
  return state.enAttente ? noter(state, 'Une décision est en attente : résolvez-la (choisirInversion / trancherEgalite / resoudreEgaliteInitiative) avant toute autre action.', 'erreur') : null;
}

const CAMP_SURPRENANT = surprise => (surprise === 'pj' ? 'pj' : 'ennemi');
const estCibleIncapable = c => c.etat === 'inconscient' || c.etats.some(e => e.id === 'neutralise' || e.id === 'surpris'); // p. 357, 199, 214

function seuilDe(p, competence, caracFallback = null) {
  // p. 92, 316 : compétence, sinon compétence parente « Parent (Spéc) », sinon caractéristique de repli
  return seuilCompetence(p, competence, caracFallback ?? competence);
}

function ajouterEngagement(s, a, b) {
  const paire = [a, b].sort();
  if (s.engages.some(e => e[0] === paire[0] && e[1] === paire[1])) return s;
  return { ...s, engages: [...s.engages, paire] };
}

function retirerEngagement(s, a, b) {
  const paire = [a, b].sort();
  return { ...s, engages: s.engages.filter(e => !(e[0] === paire[0] && e[1] === paire[1])) };
}

/** Nombre de participants d'un camp engagés avec un participant donné. */
function engagesAvec(state, id, camp) {
  return state.engages.filter(([a, b]) => a === id || b === id)
    .map(([a, b]) => (a === id ? b : a))
    .filter(other => participant(state, other)?.camp === camp && enJeu(participant(state, other))).length;
}

// ---------------------------------------------------------------------------
// Supériorité (p. 196-197)
// ---------------------------------------------------------------------------

function ajusterSuperioriteInterne(state, delta, motif = '') {
  const superiorite = Math.max(0, state.superiorite + (Number(delta) || 0)); // jamais sous 0, p. 197
  let s = { ...state, superiorite };
  if (motif) s = noter(s, `Supériorité ${state.superiorite} -> ${superiorite} (${motif}).`, 'superiorite');
  return s;
}

/** Ajuste la Supériorité du groupe (min 0, p. 197). */
export function ajusterSuperiorite(state, delta, motif = '') {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  return ajusterSuperioriteInterne(state, delta, motif);
}

/**
 * Résolution effective d'un PNJ : celle d'un Chef allié présent en jeu, sinon la sienne (p. 197, 318).
 * Un profil sans Résolution (Serviteur p. 323, « voir traits » lu comme null) ne devient jamais Désespéré.
 */
function resolutionEffective(state, p) {
  const chef = state.participants.find(q => q.camp === p.camp && q.role === 'chef' && enJeu(q) && q.resolution !== null && q.resolution !== undefined);
  if (chef) return chef.resolution; // p. 197, 318 : la Résolution du Chef s'applique au groupe
  return p.resolution ?? null; // p. 323 : null -> jamais Désespéré
}

/** Changement d'état avec gains/pertes automatiques de Supériorité (p. 197). */
function appliquerChangementEtat(s, id, etat) {
  const p = participant(s, id);
  if (!p || p.etat === etat) return s;
  if (etat === 'mort' && p.destinSurvie) {
    // p. 220 : Destin brûlé « Vivre un autre jour » — au lieu de mourir, hors de combat pour la rencontre
    let r = maj(s, id, { destinSurvie: false, etat: 'inconscient' });
    r = noter(r, `${p.nom} échappe à la mort (Destin brûlé « Vivre un autre jour », p. 220) et est mis hors de combat.`, 'destin');
    return r;
  }
  let r = maj(s, id, { etat });
  if (etat === 'vaincu' || etat === 'mort') {
    if (p.camp !== 'pj') {
      if (p.role === 'chef' || p.role === 'elite') {
        r = ajusterSuperioriteInterne(r, +1, `${p.nom} (${p.role === 'chef' ? 'Chef' : 'Élite'}) vaincu : +1 Supériorité (p. 197).`);
      } else if (p.role === 'troupe') {
        const res = resolutionEffective(r, p) ?? 0;
        const n = r.troupesVaincuesCeRound + 1;
        // p. 197 : vaincre un nombre de Troupes >= leur Résolution en un même tour -> +1
        // (choix : « tour » lu comme le round courant, voir troupesVaincuesCeRound)
        if (res > 0 && n >= res) {
          r = ajusterSuperioriteInterne(r, +1, `${n} Troupe(s) vaincue(s) (>= Résolution ${res}) ce round : +1 Supériorité (p. 197).`);
          r = { ...r, troupesVaincuesCeRound: 0 };
        } else {
          r = { ...r, troupesVaincuesCeRound: n };
        }
      }
    } else {
      r = ajusterSuperioriteInterne(r, -1, `${p.nom} (PJ) vaincu : -1 Supériorité (p. 197).`);
    }
  }
  return r;
}

// ---------------------------------------------------------------------------
// États (Conditions, annexe IV p. 356-357)
// ---------------------------------------------------------------------------

const ETAT_DEFS = Object.fromEntries(ETATS.map(e => [e.id, e]));

function appliquerEtatInterne(s, id, etatId, niveau = 'mineur') {
  const def = ETAT_DEFS[etatId];
  if (!def) throw new RangeError(`État inconnu : ${etatId}.`);
  const p = participant(s, id);
  let etats;
  if (def.niveaux) {
    const niv = niveau === 'majeur' ? 'majeur' : 'mineur';
    const existant = p.etats.find(e => e.id === etatId);
    if (existant) {
      // p. 356 : subir à nouveau la Condition fait passer à l'effet Majeur
      const nouveau = (existant.niveau === 'majeur' || niv === 'majeur') ? 'majeur' : 'mineur';
      etats = p.etats.map(e => (e.id === etatId ? { id: etatId, niveau: nouveau } : e));
    } else {
      etats = [...p.etats, { id: etatId, niveau: niv }];
    }
  } else {
    etats = p.etats.some(e => e.id === etatId) ? p.etats : [...p.etats, { id: etatId }];
  }
  return maj(s, id, { etats });
}

/** Applique une Condition à un participant (p. 356-357). */
export function appliquerEtat(state, { id, etat, niveau = 'mineur' }) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const p = participant(state, id);
  if (!p) return noter(state, `Participant introuvable : ${id}.`, 'erreur');
  const s = appliquerEtatInterne(state, id, etat, niveau);
  return noter(s, `${p.nom} subit la condition ${ETAT_DEFS[etat]?.libelle ?? etat}${ETAT_DEFS[etat]?.niveaux ? ` (${niveau})` : ''}.`, 'etat');
}

function retirerEtatInterne(s, id, etatId) {
  const p = participant(s, id);
  return maj(s, id, { etats: p.etats.filter(e => e.id !== etatId) });
}

/** Retire une Condition d'un participant. */
export function retirerEtat(state, { id, etat }) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const p = participant(state, id);
  if (!p) return noter(state, `Participant introuvable : ${id}.`, 'erreur');
  if (!p.etats.some(e => e.id === etat)) return noter(state, `${p.nom} n'a pas la condition « ${etat} ».`, 'erreur');
  return noter(retirerEtatInterne(state, id, etat), `${p.nom} n'est plus ${ETAT_DEFS[etat]?.libelle ?? etat}.`, 'etat');
}

// ---------------------------------------------------------------------------
// Blessures, critiques, mort (p. 214-216, 317, 355)
// ---------------------------------------------------------------------------

/** Blessures critiques non traitées d'un participant (p. 215 : celles dont le traitement n'a pas été fait). */
const critiquesNonTraitees = p => p.critiques.filter(c => c.traitementRequis && !c.traitee).length;

/**
 * Enregistre une blessure critique (p. 215, 358-361) : entrée de table, conditions, mort immédiate,
 * mort subite des Troupes/Élites (p. 216, 317), Mourant si critiques non traitées > max (p. 215),
 * -1 Supériorité à la première critique d'un PJ (p. 197).
 */
function enregistrerCritique(s, id, localisation, severite) {
  const p = participant(s, id);
  const entree = consulterCritique(localisation, severite); // p. 358-361
  let r = s;
  const critique = {
    id: entree.id, nom: entree.nom, localisation, severite,
    traitementRequis: entree.traitementRequis, traitee: false,
    mortImmediate: entree.mortImmediate, blessure: entree.blessure, page: entree.page
  };
  r = maj(r, id, { critiques: [...p.critiques, critique] });
  r = noter(r, `${p.nom} subit une blessure critique (${localisation}, sévérité ${severite}) : ${entree.nom} (p. ${entree.page}).`, 'critique');
  for (const e of entree.etats) r = appliquerEtatInterne(r, id, e.id, e.niveau);
  let q = participant(r, id);
  if (q.kind === 'PJ' && !q.aSubiPremiereCritique) {
    r = maj(r, id, { aSubiPremiereCritique: true });
    r = ajusterSuperioriteInterne(r, -1, `première blessure critique de ${q.nom} (p. 197)`); // p. 197 : -1 la première fois
  }
  q = participant(r, id);
  if (entree.mortImmediate) {
    r = noter(r, `${q.nom} meurt sur le coup (p. ${entree.page}).`, 'alerte');
    r = appliquerChangementEtat(r, id, 'mort');
  } else if (q.role === 'troupe') {
    // p. 216, 317 : une seule blessure critique vainc une Troupe
    r = appliquerChangementEtat(r, id, 'vaincu');
    r = noter(r, `${q.nom} (Troupe) est vaincu par sa blessure critique (p. 216, 317).`, 'alerte');
  } else if (q.role === 'elite' && critiquesNonTraitees(q) >= 2) {
    // p. 317 : une Élite est vaincue par sa deuxième blessure critique
    r = appliquerChangementEtat(r, id, 'vaincu');
    r = noter(r, `${q.nom} (Élite) est vaincu par sa deuxième blessure critique (p. 317).`, 'alerte');
  } else if (q.etat === 'actif' && critiquesNonTraitees(q) > q.critiquesMax) {
    // p. 215 : Mourant si les critiques non traitées dépassent le bonus d'E (critiquesMax = bonus E pour PJ/Chef, p. 88)
    r = maj(r, id, { etat: 'mourant' });
    r = noter(r, `${q.nom} est Mourant (critiques non traitées ${critiquesNonTraitees(q)} > ${q.critiquesMax}, p. 215).`, 'alerte');
  }
  return r;
}

/**
 * Applique des dégâts à une cible via appliquerDegats (p. 214-215) : blessures plafonnées, excédent,
 * critique (localisation au 1d10 pour un coup critique p. 215, sinon localisation de l'attaque p. 211),
 * test d'Endurance (Douleur) si blessures au max (p. 214), Rend (p. 125), Inflict (p. 124).
 */
function appliquerDegatsCible(s, cibleId, { degats, coupCritique, retenirCoups = false, localisation = null, viaDouble = false, arme = null, des }) {
  const c = participant(s, cibleId);
  if (!enJeu(c)) return { state: s, res: null };
  let r = s;
  // p. 220 : Destin brûlé « L'Empereur vous protège » -> aucun dégât ni effet (critique compris)
  if (c.eviterDegatsActif) {
    r = maj(r, cibleId, { eviterDegatsActif: false });
    r = noter(r, `${c.nom} évite tous les dégâts et effets (Destin brûlé « L'Empereur vous protège », p. 220).`, 'destin');
    return { state: r, res: null };
  }
  const res = appliquerDegats({
    blessures: c.blessures, blessuresMax: c.blessuresMax,
    critiquesNonTraitees: critiquesNonTraitees(c), critiquesMax: c.critiquesMax,
    role: c.role ?? 'pj', degats, coupCritique, retenirCoups
  });
  r = maj(r, cibleId, { blessures: res.blessures });
  r = noter(r, `${c.nom} subit ${res.degats} dégâts (${res.blessuresAvant} -> ${res.blessures}/${c.blessuresMax} blessures).`, 'degats');
  const ignoreCritiques = c.ignoreCritiquesTour; // p. 220 : ignorer les effets des critiques jusqu'au prochain tour
  if (res.critiqueDeclenche && !ignoreCritiques) {
    // p. 215 : coup critique (double) -> localisation au 1d10 ; sinon localisation de l'attaque (unités du jet, p. 211)
    const locCrit = (viaDouble || !localisation) ? localisationDuJet(lancerDes(des, '1d10', { id: cibleId, motif: 'localisation-critique' })) : localisation;
    const sevJet = lancerDes(des, '1d10', { id: cibleId, motif: 'severite-critique' });
    r = enregistrerCritique(r, cibleId, locCrit, sevJet + res.severiteBonus); // p. 215 : 1d10 + excédent
  }
  // p. 125 : Rend(X) réduit l'armure de la localisation touchée quand l'attaque a infligé des blessures
  if (arme && res.degats > 0) {
    const rend = traitDe(arme, 'rend');
    if (rend && localisation) r = reduireArmure(r, cibleId, localisation, rend.valeur ?? 0);
    // p. 124 : Inflict(Condition) si l'attaque inflige des blessures
    const inflict = traitDe(arme, 'inflict');
    if (inflict) {
      r = appliquerEtatInterne(r, cibleId, String(inflict.valeur ?? 'sonne'), 'mineur'); // durée par défaut : 1 round, p. 124
      r = noter(r, `${participant(r, cibleId).nom} subit la condition ${inflict.valeur} (Inflict, p. 124).`, 'etat');
    }
  }
  // p. 214 : blessures au maximum -> test d'Endurance (Douleur) Challenging (+0) ou inconscient
  const c2 = participant(r, cibleId);
  // p. 214 : le test d'Endurance (Douleur) est dû dès que les blessures atteignent le maximum
  // (« Repeat this Test each time you receive further Wounds »), même si le même coup rend Mourant
  if (res.jetEnduranceRequis && enJeu(c2)) r = testEnduranceDouleur(r, cibleId, des);
  return { state: r, res };
}

/** Test d'Endurance (Douleur) à blessures max (p. 214) : E Challenging (+0) = Intermédiaire (p. 188). */
function testEnduranceDouleur(s, id, des) {
  const p = participant(s, id);
  const seuil = seuilDe(p, 'Endurance (Douleur)', 'E'); // p. 214, 316
  const jet = jetActeur(s, p, des, { id, competence: 'Endurance (Douleur)', motif: 'blessures-max' });
  const ap = prevoirTest({ seuil, jet, difficulte: 'intermediaire', kind: 'test' });
  let r = noter(s, `${p.nom} — Endurance (Douleur) ${seuil} : ${String(ap.jet).padStart(2, '0')} -> ${ap.reussi ? 'succès' : 'échec'} (DR ${ap.dr >= 0 ? '+' : ''}${ap.dr}, p. 214).`, 'test');
  if (!ap.reussi) {
    r = maj(r, id, { etat: 'inconscient' });
    r = appliquerEtatInterne(r, id, 'a-terre'); // p. 357 : Inconscient -> À terre + Incapacitated
    r = noter(r, `${p.nom} perd connaissance (p. 214, 357).`, 'alerte');
  }
  return r;
}

/** Dégâts d'état ignorant l'armure (p. 356) ; excédent -> critique puis arrêt du saignement (p. 356). */
function appliquerDegatsIgnorantArmure(s, id, degats, des, { arreterApresCritique = null } = {}) {
  const p = participant(s, id);
  if (!enJeu(p) || !(degats > 0)) return s;
  let r = s;
  const avant = p.blessures;
  const excedent = Math.max(0, avant + degats - p.blessuresMax);
  r = maj(r, id, { blessures: Math.min(p.blessuresMax, avant + degats) });
  r = noter(r, `${p.nom} subit ${degats} dégâts ignorant l'armure (${avant} -> ${Math.min(p.blessuresMax, avant + degats)}/${p.blessuresMax}).`, 'degats');
  if (excedent > 0) {
    // p. 356 : le saignement qui fait dépasser le max -> critique ; p. 211 : pas d'attaque -> localisation au 1d10
    const loc = localisationDuJet(lancerDes(des, '1d10', { id, motif: 'localisation-critique' }));
    const sevJet = lancerDes(des, '1d10', { id, motif: 'severite-critique' });
    r = enregistrerCritique(r, id, loc, sevJet + excedent); // p. 215 : 1d10 + excédent
    // p. 356 : une fois le critique subi, on ne souffre plus des dégâts de la condition
    if (arreterApresCritique) r = retirerEtatInterne(r, id, arreterApresCritique);
  }
  const q = participant(r, id);
  if (enJeu(q) && q.etat === 'actif' && critiquesNonTraitees(q) > q.critiquesMax) {
    r = maj(r, id, { etat: 'mourant' });
    r = noter(r, `${q.nom} est Mourant (critiques non traitées > ${q.critiquesMax}, p. 215).`, 'alerte');
  }
  return r;
}

/** Réduit l'armure d'une localisation (Rend p. 125, maladresse p. 355). */
function reduireArmure(s, id, loc, montant) {
  const p = participant(s, id);
  if (typeof p.armure === 'number') return maj(s, id, { armure: Math.max(0, p.armure - montant) }); // p. 316 : armure PNJ simplifiée
  const cle = { tete: 'tete', 'bras-g': 'brasG', 'bras-d': 'brasD', 'jambe-g': 'jambeG', 'jambe-d': 'jambeD', corps: 'corps' }[loc];
  if (!cle) return s;
  const armure = { ...p.armure };
  armure[cle] = Math.max(0, (armure[cle] ?? 0) - montant);
  return maj(s, id, { armure });
}

// ---------------------------------------------------------------------------
// Maladresse (p. 213, 355) et traits Reliable / Unstable (p. 125)
// ---------------------------------------------------------------------------

function appliquerMaladresse(s, id, arme, des) {
  const p = participant(s, id);
  const jet = lancerDes(des, '1d10', { id, motif: 'maladresse' }); // p. 355 : table 1d10
  let r = s;
  // p. 125 : Reliable — sur un Fumble, 1d10, sur 4+ la maladresse est ignorée
  if (aTrait(arme, 'reliable')) {
    const jetR = lancerDes(des, '1d10', { id, motif: 'reliable' });
    if (jetR >= 4) return noter(r, `Maladresse de ${p.nom} (1d10=${jet}) annulée par Reliable (1d10=${jetR} >= 4, p. 125).`, 'resultat');
  }
  // p. 125 : Unstable — 5+ sur la table, l'arme se détruit et inflige ses dégâts au bras qui la tient
  if (aTrait(arme, 'unstable') && jet >= 5) {
    r = noter(r, `Maladresse ${jet} + Unstable : ${arme.nom} se détruit (p. 125).`, 'alerte');
    r = maj(r, id, { armes: p.armes.filter(x => x !== arme.id) }); // l'arme est détruite
    // p. 125 : dégâts au bras qui tient l'arme, ou à un bras aléatoire si Deux mains
    const loc = aTrait(arme, 'two-handed') ? localisationDuJet(lancerDes(des, '1d10', { id, motif: 'bras-aleatoire' })) : 'bras-d';
    const degatsBase = (arme?.degatsBase ?? 0) + (arme?.ajouteBF ? bonusCarac(p.carac.F) : 0);
    const armure = armureDe(p, loc);
    const deg = resoudreDegats({ degatsBase, dr: 0, armureEffective: armure });
    return appliquerDegatsCible(r, id, { degats: deg, coupCritique: false, localisation: loc, arme: null, des }).state;
  }
  const entree = consulterMaladresse(jet); // p. 355
  r = noter(r, `Maladresse de ${p.nom} (1d10=${jet}) : ${entree.nom} (p. 355).`, 'maladresse');
  switch (entree.effet) {
    case 'initiativeBas': // p. 355 : bas de l'ordre d'Initiative au prochain round
      r = maj(r, id, { maladresseInitBas: true });
      break;
    case 'desavantageTour': // p. 355 : Désavantage à tous les tests jusqu'à la fin du prochain tour (effacé au début de son prochain tour)
      r = maj(r, id, { desavantageTour: true });
      break;
    case 'lacherArme': // p. 355 : lâche l'arme, ramassable en action gratuite -> journal seulement
      break;
    case 'aTerre': // p. 355, 357
      r = appliquerEtatInterne(r, id, 'a-terre');
      break;
    case 'vitesseLente': // p. 355 : vitesse Lente jusqu'à la fin de la rencontre
      r = maj(r, id, { vitesse: 'lente' });
      break;
    case 'armeInstable': // p. 355 + p. 125 : l'arme gagne le trait Unstable jusqu'à réparation
      r = { ...r, armes: { ...r.armes, [arme.id]: { ...arme, traits: [...arme.traits.filter(t => t.id !== 'unstable'), { id: 'unstable' }] } } };
      break;
    case 'aveugleOuAssourdi': // p. 355 : au choix du MJ ; défaut Aveuglé (choix noté)
      r = appliquerEtatInterne(r, id, 'aveugle');
      break;
    case 'armureMoins1': { // p. 355 : armure d'une localisation aléatoire -1, ou 1 blessure si aucune armure
      const loc = localisationDuJet(lancerDes(des, '1d10', { id, motif: 'armure-localisation' }));
      if (armureDe(p, loc) > 0) {
        r = reduireArmure(r, id, loc, 1);
        r = noter(r, `Armure de ${p.nom} en ${loc} réduite de 1 (p. 355).`, 'alerte');
      } else {
        r = appliquerDegatsCible(r, id, { degats: 1, coupCritique: false, localisation: loc, arme: null, des }).state;
      }
      break;
    }
    case 'sonneOuHemorragique': // p. 355 : au choix du MJ ; défaut Sonné (choix noté)
      r = appliquerEtatInterne(r, id, 'sonne');
      break;
    case 'toucheAllie': { // p. 355 : touche un allié à portée avec +0 SL, localisation aléatoire ; soi-même sinon
      const allies = s.participants.filter(q => q.id !== id && q.camp === p.camp && enJeu(q) && q.zoneId === p.zoneId);
      const cible = allies[0] ?? p; // allié déterministe (premier de la liste), soi-même s'il n'y en a pas
      const loc = localisationDuJet(lancerDes(des, '1d10', { id, motif: 'touche-allie' }));
      const degatsBase = (arme?.degatsBase ?? 0) + (arme?.ajouteBF ? bonusCarac(p.carac.F) : 0);
      const deg = resoudreDegats({ degatsBase, dr: 0, armureEffective: armureDe(cible, loc) });
      r = noter(r, `${p.nom} touche ${cible.nom} avec +0 SL (maladresse 10, p. 355).`, 'alerte');
      r = appliquerDegatsCible(r, cible.id, { degats: deg, coupCritique: false, retenirCoups: true, localisation: loc, arme: null, des }).state;
      break;
    }
  }
  return r;
}

// ---------------------------------------------------------------------------
// Composition depuis la réserve, report sur la réserve
// ---------------------------------------------------------------------------

/**
 * Compose une rencontre depuis la réserve. `entrees` : ids de profils ou `{ id, zoneId }`.
 * Un PJ ne figure qu'une fois ; un PNJ peut être multiplié (`ganger`, `ganger-2`, nom « Ganger 2 »).
 * `options.zones` : zones du champ de bataille (défaut une seule zone) ; `superioriteInitiale` plafonnée
 * entre 0 et 3 (p. 196) ; `surprise` : null | 'pj' | 'ennemi' — si non nul, ouvre un round de surprise
 * (roundSurprise, p. 199) où seul le camp surprenant agit et où le camp surpris gagne la condition 'surpris'.
 */
export function composerRencontre(reserve, entrees, { zones = [{ id: 'zone-1', nom: 'Zone 1', traits: [] }], superioriteInitiale = 0, surprise = null } = {}) {
  if (!Array.isArray(entrees) || !entrees.length) throw new RangeError('Une rencontre a besoin d’au moins un participant.');
  if (surprise !== null && surprise !== 'pj' && surprise !== 'ennemi') throw new RangeError(`Surprise inconnue : ${surprise} (attendu : null, 'pj' ou 'ennemi').`);
  if (!Array.isArray(zones) || !zones.length) throw new RangeError('La rencontre a besoin d’au moins une zone.');
  const vus = {};
  const participants = entrees.map(entree => {
    const { id: profilId, zoneId = null } = typeof entree === 'string' ? { id: entree } : entree;
    const profil = trouverProfil(reserve, profilId);
    if (!profil) throw new RangeError(`Profil introuvable : ${profilId}.`);
    for (const a of profil.armes ?? []) if (!reserve.armes[a]) throw new RangeError(`L’arme « ${a} » de ${profil.nom} n’existe pas dans la réserve.`);
    const n = (vus[profilId] = (vus[profilId] ?? 0) + 1);
    if (n > 1 && profil.kind === 'PJ') throw new RangeError(`${profil.nom} ne peut figurer qu’une fois dans la rencontre.`);
    const id = n === 1 ? profilId : `${profilId}-${n}`;
    const nom = n === 1 ? profil.nom : `${profil.nom} ${n}`;
    const d = valeursDerivees(profil);
    const suivi = profil.kind === 'PJ' ? profil.suivi : null;
    const zone = zoneId ?? zones[0].id;
    if (!zones.some(z => z.id === zone)) throw new RangeError(`Zone inconnue : ${zone}.`);
    return {
      id, profilId, nom,
      kind: profil.kind, role: profil.role, camp: profil.camp,
      taille: profil.taille, vitesse: profil.vitesse, image: profil.image ?? null,
      carac: { ...profil.carac }, competences: { ...profil.competences },
      armure: clone(profil.armure) ?? 0,
      armes: [...(profil.armes ?? [])],
      munitionsParArme: Object.fromEntries((profil.armes ?? []).map(a => [a, reserve.armes[a].chargeur ?? 0])), // chargeurs pleins au départ, p. 123
      resolution: profil.resolution,
      blessures: suivi?.blessures ?? 0,
      blessuresMax: d.blessuresMax,
      critiques: clone(suivi?.critiques ?? []),
      critiquesMax: d.critiquesMax,
      initiative: d.initiative,
      etats: clone(suivi?.etats ?? []),
      destin: suivi?.destin ?? profil.destinMax ?? 3, // p. 220 : 3 points de Destin au départ
      destinBrule: suivi?.destinBrule ?? 0,
      destinMax: profil.destinMax ?? 3,
      zoneId: zone,
      etat: 'actif',
      reactionUtilisee: false, superioriteUtiliseeCeTour: false, avantageProchainTest: false,
      ignoreCritiquesTour: false, chargeMalusDefense: false, viseeActive: false, esquiveActive: false,
      couvertActif: null, saisirInitProchainRound: false, maladresseInitBas: false,
      aSubiPremiereCritique: false, desavantageTour: false, eviterDegatsActif: false, destinPourEmpereur: null,
      destinSurvie: false
    };
  });
  // p. 199 : le camp surpris subit la condition 'surpris' pendant le round de surprise
  if (surprise !== null) {
    const campSurpris = CAMP_SURPRENANT(surprise) === 'pj' ? 'ennemi' : 'pj';
    for (const p of participants) {
      if (p.camp === campSurpris && !p.etats.some(e => e.id === 'surpris')) p.etats = [...p.etats, { id: 'surpris' }];
    }
  }
  const armes = {};
  for (const p of participants) for (const a of p.armes) armes[a] = clone(reserve.armes[a]);
  return {
    version: VERSION_RENCONTRE, round: 0, indexTour: 0, ordre: [], enAttente: null,
    journal: [{ round: 0, texte: 'Rencontre composée.', type: 'info' }],
    participants, armes,
    zones: clone(zones),
    superiorite: Math.max(0, Math.min(3, Number(superioriteInitiale) || 0)), // p. 196 : maximum +3 avant le combat
    surprise,
    surpriseJouee: false,
    roundSurprise: surprise !== null, // p. 199 : round de surprise
    troupesVaincuesCeRound: 0,
    dernierTest: null, dernierOppose: null,
    engages: []
  };
}

/** Reporte sur la réserve ce qui reste aux PJ : blessures, critiques, destin, destinBrule, etats. */
export function reporterSurReserve(reserve, rencontre) {
  let r = reserve;
  for (const p of rencontre.participants.filter(x => x.kind === 'PJ' && trouverProfil(r, x.profilId))) {
    r = modifierProfil(r, p.profilId, {
      suivi: {
        blessures: p.blessures,
        critiques: clone(p.critiques),
        destin: p.destin, destinBrule: p.destinBrule,
        etats: clone(p.etats)
      }
    });
  }
  return r;
}

// ---------------------------------------------------------------------------
// Ordre de tour (p. 198-199)
// ---------------------------------------------------------------------------

function cleReflexes(p) {
  return p.competences['Réflexes'] ?? p.carac.Ag ?? 0; // p. 198 : à Initiative égale, Réflexes décroissant
}

function trierOrdre(state, ids) {
  return [...ids].sort((a, b) => {
    const pa = participant(state, a), pb = participant(state, b);
    if (pa.saisirInitProchainRound !== pb.saisirInitProchainRound) return pa.saisirInitProchainRound ? -1 : 1; // p. 209 : Seize the Initiative en haut
    if (pa.maladresseInitBas !== pb.maladresseInitBas) return pa.maladresseInitBas ? 1 : -1; // p. 355 : maladresse 1 en bas
    if (pb.initiative !== pa.initiative) return pb.initiative - pa.initiative; // p. 198 : Initiative décroissante
    return cleReflexes(pb) - cleReflexes(pa); // p. 198 : Réflexes décroissant
  });
}

/** Détecte une égalité exacte d'Initiative et de Réflexes entre deux voisins de l'ordre (p. 198). */
function detecterEgaliteInit(state, ordre) {
  for (let i = 0; i + 1 < ordre.length; i++) {
    const a = participant(state, ordre[i]), b = participant(state, ordre[i + 1]);
    if (a.initiative === b.initiative && cleReflexes(a) === cleReflexes(b)) return { a: a.id, b: b.id };
  }
  return null;
}

function reordonnerEgalite(s, a, b, gagnant) {
  const ordre = [...s.ordre];
  const ia = ordre.indexOf(a), ib = ordre.indexOf(b);
  if (ia === -1 || ib === -1) return s;
  const autre = gagnant === a ? b : a;
  ordre.splice(Math.max(ia, ib), 1);
  ordre.splice(ia, 1);
  ordre.splice(Math.min(ia, ib), 0, gagnant, autre);
  return { ...s, ordre };
}

/**
 * Ouvre un round. Si la surprise n'a pas encore été jouée, c'est le round 0 de surprise : seul le camp
 * surprenant agit (p. 199). Sinon le round est incrémenté, les drapeaux de tour des participants en jeu
 * sont remis à zéro, `saisirInitProchainRound` place en haut (p. 209) et `maladresseInitBas` en bas (p. 355).
 * Égalité d'Initiative et de Réflexes exacte (p. 198) : `enAttente = { type: 'egalite-init', a, b }`,
 * ou résolution directe via `options.ordreEgalites` ({ 'a|b': gagnantId }).
 */
export function commencerRound(state, { ordreEgalites = {}, des = null } = {}) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  return commencerRoundInterne(state, ordreEgalites, des);
}

function commencerRoundInterne(state, ordreEgalites, des) {
  const surpriseEnCours = state.surprise !== null && !state.surpriseJouee;
  const round = surpriseEnCours ? 0 : state.round + 1; // p. 199 : le round de surprise est le round 0
  const campActif = surpriseEnCours ? CAMP_SURPRENANT(state.surprise) : null;
  let actifs = state.participants.filter(enJeu);
  if (campActif) actifs = actifs.filter(p => p.camp === campActif); // p. 199 : seul le camp surprenant agit
  const ordre = trierOrdre(state, actifs.map(p => p.id));
  let next = {
    ...state, round, ordre, indexTour: 0,
    surpriseJouee: state.surprise !== null ? true : state.surpriseJouee,
    roundSurprise: surpriseEnCours,
    troupesVaincuesCeRound: 0,
    enAttente: null,
    participants: state.participants.map(p => (enJeu(p)
      ? { ...p, reactionUtilisee: false, superioriteUtiliseeCeTour: false, chargeMalusDefense: false, esquiveActive: false, ignoreCritiquesTour: false, desavantageTour: false, saisirInitProchainRound: false, maladresseInitBas: false, destinPourEmpereur: null }
      : p))
  };
  next = noter(next, `Round ${round}${surpriseEnCours ? ' (surprise, p. 199)' : ''} — ordre : ${ordre.map(id => `${participant(next, id).nom} (Init ${participant(next, id).initiative})`).join(', ')}.`, 'round');
  const egalite = detecterEgaliteInit(next, ordre);
  if (egalite) {
    const cle = [egalite.a, egalite.b].sort().join('|');
    const g = ordreEgalites[cle];
    if (g === egalite.a || g === egalite.b) {
      next = reordonnerEgalite(next, egalite.a, egalite.b, g);
      next = noter(next, `Égalité d'Initiative et de Réflexes entre ${participant(next, egalite.a).nom} et ${participant(next, egalite.b).nom} : ${participant(next, g).nom} passe devant (choix du MJ, p. 198).`, 'resultat');
    } else {
      next = { ...next, enAttente: { type: 'egalite-init', a: egalite.a, b: egalite.b } };
      next = noter(next, `Égalité d'Initiative et de Réflexes entre ${participant(next, egalite.a).nom} et ${participant(next, egalite.b).nom} : en attente de resoudreEgaliteInitiative (p. 198).`, 'alerte');
      return next;
    }
  }
  return sauterInactifs(next, des, true);
}

/** Résout une égalité d'Initiative (p. 198) : le gagnant passe devant l'autre. */
export function resoudreEgaliteInitiative(state, gagnantId, des = null) {
  const e = state.enAttente;
  if (!e || e.type !== 'egalite-init') return noter(state, 'Aucune égalité d’Initiative en attente.', 'erreur');
  if (gagnantId !== e.a && gagnantId !== e.b) return noter(state, `Gagnant inconnu : ${gagnantId} (attendu : ${e.a} ou ${e.b}).`, 'erreur');
  let s = reordonnerEgalite(state, e.a, e.b, gagnantId);
  s = { ...s, enAttente: null };
  s = noter(s, `Égalité d'Initiative résolue : ${participant(s, gagnantId).nom} agit avant ${participant(s, gagnantId === e.a ? e.b : e.a).nom} (p. 198).`, 'resultat');
  return sauterInactifs(s, des, true);
}

/** Avance jusqu'au prochain participant pouvant agir ; applique les effets de début de tour. */
function sauterInactifs(state, des, neuf = false) {
  let s = state;
  while (s.indexTour < s.ordre.length && !peutAgir(participant(s, s.ordre[s.indexTour]))) s = { ...s, indexTour: s.indexTour + 1 };
  if (s.indexTour < s.ordre.length) return debutTour(s, s.ordre[s.indexTour], des);
  s = finDeRound(s);
  if (neuf && (!s.ordre.length || !s.ordre.some(id => peutAgir(participant(s, id))))) {
    return noter(s, 'Aucun participant ne peut agir : le round est terminé.', 'round');
  }
  return commencerRoundInterne(s, {}, des);
}

/** Fin de round : les Mourants meurent (p. 215) ; fin du round de surprise -> ±1 Supériorité (p. 199). */
function finDeRound(s) {
  let r = s;
  for (const p of r.participants.filter(p => p.etat === 'mourant')) {
    // p. 215 : critiques non traitées > bonus d'E -> mort en fin de round
    r = appliquerChangementEtat(r, p.id, 'mort');
    r = noter(r, `${p.nom} succombe à ses blessures en fin de round (p. 215).`, 'alerte');
  }
  if (r.roundSurprise) {
    // p. 199 : fin du round de surprise, +1 Supériorité si le PJ surprend, -1 (min 0) s'il est surpris
    r = ajusterSuperioriteInterne(r, r.surprise === 'pj' ? +1 : -1, 'fin du round de surprise (p. 199)');
    r = { ...r, roundSurprise: false };
    r = { ...r, participants: r.participants.map(p => (p.etats.some(e => e.id === 'surpris') ? { ...p, etats: p.etats.filter(e => e.id !== 'surpris') } : p)) };
  }
  return r;
}

/** Début du tour d'un acteur : drapeaux remis à zéro, Enflammé (p. 356), Désespéré (p. 197, 318). */
function debutTour(s, id, des) {
  let r = maj(s, id, {
    reactionUtilisee: false, superioriteUtiliseeCeTour: false, chargeMalusDefense: false,
    esquiveActive: false, ignoreCritiquesTour: false, desavantageTour: false, destinPourEmpereur: null
  });
  const p = participant(r, id);
  const enflamme = p.etats.find(e => e.id === 'enflamme');
  if (enflamme) {
    // p. 356 : Enflammé fait 1d5 (mineur) / 1d10 (majeur) au début du tour, ignorant l'armure
    const expr = enflamme.niveau === 'majeur' ? '1d10' : '1d5';
    const deg = lancerDes(des, expr, { id, etat: 'enflamme', phase: 'debut-tour' });
    r = appliquerDegatsIgnorantArmure(r, id, deg, des);
  }
  const q = participant(r, id);
  if (q.kind === 'PNJ' && enJeu(q)) {
    const res = resolutionEffective(r, q);
    // p. 197 : au début du tour, Supériorité > Résolution -> Désespéré (Condition des PNJ uniquement, p. 197)
    // p. 323 : un profil sans Résolution (Serviteur, « voir traits ») ne devient jamais Désespéré
    if (res !== null && verifierDesespere(r.superiorite, res) && !q.etats.some(e => e.id === 'desespere')) {
      r = maj(r, id, { etats: [...q.etats, { id: 'desespere' }] });
      r = noter(r, `${q.nom} est Désespéré (Supériorité ${r.superiorite} > Résolution ${res}, p. 197, 318).`, 'alerte');
    }
  }
  return r;
}

/** Fin du tour de l'acteur courant : Hémorragique (1 ou 3 dégâts ignorant l'armure, p. 356). */
function finDeTour(s, id, des) {
  const p = participant(s, id);
  if (!enJeu(p)) return s;
  const hem = p.etats.find(e => e.id === 'hemorragique');
  if (!hem) return s;
  const deg = degatsEtatTour('hemorragique', hem.niveau, e => lancerDes(des, e, { id, etat: 'hemorragique', phase: 'fin-tour' })); // p. 356 : fin de tour, ignore l'armure
  return appliquerDegatsIgnorantArmure(s, id, deg, des, { arreterApresCritique: 'hemorragique' });
}

/**
 * Passe le tour de l'acteur courant : applique Hémorragique en fin de tour (p. 356), puis en fin de round
 * les Mourants meurent (p. 215) et le round de surprise se termine (±1 Supériorité, p. 199) ; enfin début
 * de tour de l'acteur suivant (drapeaux, Enflammé p. 356, Désespéré p. 197). `des` sert aux jets d'état.
 */
export function passerTour(state, des = null) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  if (!state.round && !state.ordre.length) return commencerRoundInterne(state, {}, des);
  let s = state;
  const acteur = acteurCourant(s);
  if (acteur) s = finDeTour(s, acteur.id, des);
  s = { ...s, indexTour: s.indexTour + 1, enAttente: null, dernierTest: null };
  return sauterInactifs(s, des, false);
}

// ---------------------------------------------------------------------------
// Zones, engagements
// ---------------------------------------------------------------------------

/** Déplace un participant vers une autre zone (p. 199-200) : perd couvert et visée (p. 207, 210), et les engagements inter-zones. */
export function deplacerZone(state, id, zoneId) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const p = participant(state, id);
  if (!p) return noter(state, `Participant introuvable : ${id}.`, 'erreur');
  if (!state.zones.some(z => z.id === zoneId)) return noter(state, `Zone inconnue : ${zoneId}.`, 'erreur');
  let s = maj(state, id, { zoneId, couvertActif: null, viseeActive: false });
  s = { ...s, engages: s.engages.filter(([a, b]) => participant(s, a)?.zoneId === zoneId && participant(s, b)?.zoneId === zoneId) };
  return noter(s, `${p.nom} se déplace vers ${state.zones.find(z => z.id === zoneId).nom} (p. 199-200).`, 'action');
}

/** Définit les traits environnementaux d'une zone (p. 204). */
export function definirTraitsZone(state, zoneId, traits) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  if (!state.zones.some(z => z.id === zoneId)) return noter(state, `Zone inconnue : ${zoneId}.`, 'erreur');
  const s = { ...state, zones: state.zones.map(z => (z.id === zoneId ? { ...z, traits: clone(traits) } : z)) };
  return noter(s, `Traits de la zone ${zoneId} : ${traits.map(t => t.id).join(', ') || 'aucun'} (p. 204).`, 'zone');
}

/** Engage deux participants (p. 212). */
export function engager(state, idA, idB) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  if (!participant(state, idA) || !participant(state, idB)) return noter(state, 'Participant introuvable.', 'erreur');
  return noter(ajouterEngagement(state, idA, idB), `${participant(state, idA).nom} et ${participant(state, idB).nom} sont Engagés (p. 212).`, 'action');
}

/** Met fin à un engagement (p. 207, 212). */
export function desengager(state, idA, idB) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  return noter(retirerEngagement(state, idA, idB), `${participant(state, idA)?.nom ?? idA} et ${participant(state, idB)?.nom ?? idB} ne sont plus Engagés (p. 207).`, 'action');
}

// ---------------------------------------------------------------------------
// Avantage/Désavantage et Supériorité (p. 189, 196)
// ---------------------------------------------------------------------------

/** Avantages d'un acteur (aide p. 189/208, Destin p. 220). */
function collecterAvantages(p, base = []) {
  const avantages = [...base];
  if (p.avantageProchainTest) avantages.push('aide'); // p. 189, 208 : Help -> Avantage
  return avantages;
}

/** Désavantages d'un acteur (maladresse 2, p. 355). */
function collecterDesavantages(p, base = []) {
  const desavantages = [...base];
  if (p.desavantageTour) desavantages.push('maladresse-2'); // p. 355
  return desavantages;
}

/** Bonus de DR de Supériorité, une fois par tour, égal à la Supériorité totale (p. 196). */
function bonusSuperiorite(s, p, params) {
  if (params.utiliserSuperiorite && !p.superioriteUtiliseeCeTour && s.superiorite > 0) {
    return { bonusDR: s.superiorite, marquer: true };
  }
  return { bonusDR: 0, marquer: false };
}

// ---------------------------------------------------------------------------
// Attaques : helpers communs
// ---------------------------------------------------------------------------

/**
 * Distance entre deux participants (p. 201-202, 212) : engagés -> 'immediate' ; sinon selon l'écart
 * d'index des zones (même zone = courte, adjacente = moyenne, 2 zones = longue, 3+ = extreme).
 */
function distanceEntre(state, a, b) {
  if (state.engages.some(([x, y]) => (x === a.id && y === b.id) || (x === b.id && y === a.id))) return 'immediate'; // p. 212 : engagé
  const za = state.zones.findIndex(z => z.id === a.zoneId), zb = state.zones.findIndex(z => z.id === b.zoneId);
  return PORTEES[Math.min(1 + Math.abs(za - zb), PORTEES.length - 1)]; // p. 201-202, 212
}

/** Première arme de mêlée d'un participant (p. 211). */
function armeMeleeDe(state, p) {
  const a = (p.armes ?? []).map(id => state.armes[id]).find(x => x && x.type === 'melee');
  return a ?? null;
}

/** Portée effective de l'arme (p. 207 : Viser augmente la portée d'un cran au prochain tir). */
function porteeArmeEffective(p, arme) {
  const i = PORTEES.indexOf(arme.portee ?? 'courte');
  return PORTEES[Math.min(i + (p.viseeActive ? 1 : 0), PORTEES.length - 1)];
}

/**
 * Coût en munitions et effets d'un mode de tir (p. 123-125).
 * - normal : 1 mun, sauf arme Burst/Rapid Fire (p. 123 : ne consomme que si l'on utilise ces traits) ;
 * - rafale (Burst) : +1 DR, +1 mun (p. 124) ; Rapid Fire vaut toujours Burst (p. 124-125) ;
 * - rapide-spread / rapide-degats (Rapid Fire X) : X mun, Avantage ou +X dégâts (p. 125) ;
 * - surcharger (Supercharge X) : +X dégâts, munitions doublées (p. 125).
 */
function coutMode(arme, mode) {
  const aBurst = aTrait(arme, 'burst') || aTrait(arme, 'rapid-fire'); // p. 124-125
  const base = aBurst ? 0 : 1; // p. 123
  switch (mode) {
    case 'normal':
      return { cout: base, bonusDR: 0, bonusDegats: 0, avantages: [] };
    case 'rafale': {
      if (!aBurst) return null; // Burst requis (p. 124)
      return { cout: base + 1, bonusDR: 1, bonusDegats: 0, avantages: [] }; // +1 SL, -1 mun, p. 124
    }
    case 'rapide-spread':
    case 'rapide-degats': {
      const rf = traitDe(arme, 'rapid-fire');
      if (!rf) return null; // Rapid Fire requis (p. 125)
      const x = Number(rf.valeur) || 0;
      // p. 125 : -X munitions (magazine >= X exigé, vérifié par le test munitions) ; au choix Spread ou +X dégâts
      return mode === 'rapide-degats'
        ? { cout: x, bonusDR: 0, bonusDegats: x, avantages: [] }
        : { cout: x, bonusDR: 0, bonusDegats: 0, avantages: ['rapid-fire'] };
    }
    case 'surcharger': {
      const sc = traitDe(arme, 'supercharge');
      if (!sc) return null; // Supercharge requis (p. 125)
      // p. 125 : « doubling the ammunition expended » ; une attaque surchargée est un tir réel (min 1 mun), doublé.
      // (choix : 2 munitions même pour une arme Burst/Rapid Fire dont le tir normal est gratuit, p. 123)
      return { cout: 2 * Math.max(1, base), bonusDR: 0, bonusDegats: Number(sc.valeur) || 0, avantages: [] };
    }
    default:
      return null;
  }
}

/** Entrées d'un aperçu pour re-jouer prevoirTest (relancer de dés / +1 SL, p. 220). */
function inputsDe(ap) {
  return {
    seuil: ap.seuil, jet: ap.jet, difficulte: ap.difficulte, kind: ap.kind, bonusDR: ap.bonusDR,
    avantages: Array.from({ length: Math.max(0, ap.avantage.net) }, () => 'avantage'),
    desavantages: Array.from({ length: Math.max(0, -ap.avantage.net) }, () => 'desavantage')
  };
}

/** Validations communes aux attaques. */
function validerAttaquant(state, params, typeAttendu) {
  const p = participant(state, params.id);
  if (!p) return { erreur: `Participant introuvable : ${params.id}.` };
  if (acteurCourant(state)?.id !== p.id) return { erreur: `${p.nom} n'est pas l'acteur courant.` };
  if (!peutAgir(p)) return { erreur: `${p.nom} ne peut pas agir.` };
  const cible = participant(state, params.cibleId);
  if (!cible) return { erreur: `Cible introuvable : ${params.cibleId}.` };
  if (!enJeu(cible)) return { erreur: `${cible.nom} est hors de combat.` };
  if (cible.camp === p.camp) return { erreur: `On n'attaque pas un membre de son camp (${cible.nom}).` };
  const arme = armeDe(state, params.armeId);
  if (!arme || !p.armes.includes(arme.id)) return { erreur: `Arme inconnue pour ${p.nom} : ${params.armeId}.` };
  if (arme.type !== typeAttendu) return { erreur: `« ${arme.nom} » n'est pas une arme ${typeAttendu === 'melee' ? 'de mêlée' : 'de tir'}.` };
  return { p, cible, arme };
}

function enAttenteInversion(s, action, params, apercus, inversions) {
  let r = { ...s, enAttente: { type: 'inversion', action, params: clone(params), apercus, inversions } };
  return noter(r, `Choix d'inversion des dés en attente (${inversions.map(i => i.cote).join(', ')}, p. 189) : choisirInversion.`, 'alerte');
}

// ---------------------------------------------------------------------------
// Attaque de mêlée (p. 211-213)
// ---------------------------------------------------------------------------

/**
 * Attaque de mêlée (p. 211) : test de Mêlée opposé (ou Réflexes (Esquive), ou aucune opposition),
 * engagement automatique (p. 212), Charge (Avantage + malus de défense, p. 207), surnombre 2:1
 * (Avantage, p. 214), cible incapable (surprise/inconscient/neutralisé : pas d'opposition, critique
 * auto, p. 199, 214, 357), critique/maladresse (p. 213), dégâts = arme + BF + différence de SL - armure.
 * params : { id, cibleId, armeId, modeDefense = 'opposition'|'esquive'|'aucune', cibleLocalisation,
 *           utiliserSuperiorite, charge, retenirCoups, avantages, desavantages }.
 */
export function attaquerMelee(state, params, des) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const v = validerAttaquant(state, params, 'melee');
  if (v.erreur) return noter(state, v.erreur, 'erreur');
  const { p, cible, arme } = v;
  if (cible.zoneId !== p.zoneId) return noter(state, `${cible.nom} n'est pas dans la zone de ${p.nom} : mêlée impossible (portée immédiate, p. 207, 211).`, 'erreur');
  if (!['opposition', 'esquive', 'aucune'].includes(params.modeDefense ?? 'opposition')) throw new RangeError(`modeDefense inconnu : ${params.modeDefense} (p. 211).`);
  const modeDefense = estCibleIncapable(cible) ? 'aucune' : (params.modeDefense ?? 'opposition'); // p. 199, 357 : la cible ne peut opposer
  const avantages = collecterAvantages(p, params.avantages ?? []);
  const desavantages = collecterDesavantages(p, params.desavantages ?? []);
  if (params.charge) avantages.push('charge'); // p. 207 : Charge -> Avantage à l'attaque
  if (cible.etats.some(e => e.id === 'surpris')) avantages.push('surprise'); // p. 199 : le camp surprenant a Avantage aux tests de Mêlée
  if (estCibleIncapable(cible) || modeDefense === 'aucune') avantages.push('non-oppose'); // p. 211 : pas d'opposition -> Avantage
  if (engagesAvec(state, cible.id, p.camp) >= 2) avantages.push('surnombre'); // p. 214 : 2 contre 1 -> Avantage
  if (params.cibleLocalisation) desavantages.push('cible-localisation'); // p. 210 : viser une localisation -> Désavantage
  const sup = bonusSuperiorite(state, p, params); // p. 196
  const seuilA = seuilDe(p, arme.specialisation ?? 'Mêlée', 'CC');
  const jetA = jetActeur(state, p, des, { id: p.id, competence: arme.specialisation ?? 'Mêlée', motif: 'attaque-melee', cible: cible.id, arme: arme.id });
  const apA = prevoirTest({ seuil: seuilA, jet: jetA, difficulte: 'intermediaire', avantages, desavantages, bonusDR: sup.bonusDR, kind: 'melee' }); // p. 188, 211
  let apD = null;
  if (modeDefense !== 'aucune') {
    const defAv = collecterAvantages(cible, []);
    const defDes = collecterDesavantages(cible, []);
    const defArme = armeMeleeDe(state, cible);
    const aBouclier = (cible.armes ?? []).map(a => state.armes[a]).some(a => a && (a.traits ?? []).some(t => t.id === 'shield'));
    if (modeDefense === 'opposition') {
      if (!defArme && !aBouclier) defDes.push('sans-arme-melee'); // p. 211 : sans arme de mêlée ni bouclier -> Désavantage
      if (defArme && aTrait(defArme, 'defensive')) defAv.push('defensive'); // p. 124 : Defensive -> Avantage en défense
      if (cible.esquiveActive) defAv.push('esquive'); // p. 208
      if (cible.chargeMalusDefense) defDes.push('charge'); // p. 207 : a chargé -> Désavantage en défense
      const seuilD = seuilDe(cible, defArme?.specialisation ?? 'Mêlée', 'CC');
      const jetD = jetActeur(state, cible, des, { id: cible.id, competence: defArme?.specialisation ?? 'Mêlée', motif: 'defense-melee', attaquant: p.id });
      apD = prevoirTest({ seuil: seuilD, jet: jetD, difficulte: 'intermediaire', avantages: defAv, desavantages: defDes, bonusDR: 0, kind: 'melee' }); // p. 211, 213 : critique en défense = riposte
    } else { // 'esquive' : p. 211, la cible peut utiliser Réflexes (Esquive)
      if (cible.esquiveActive) defAv.push('esquive'); // p. 208
      const seuilD = seuilDe(cible, 'Réflexes (Esquive)', 'Ag');
      const jetD = jetActeur(state, cible, des, { id: cible.id, competence: 'Réflexes (Esquive)', motif: 'esquive-melee', attaquant: p.id });
      apD = prevoirTest({ seuil: seuilD, jet: jetD, difficulte: 'intermediaire', avantages: defAv, desavantages: defDes, bonusDR: 0, kind: 'test' });
    }
  }
  let s = noter(state, `Attaque de mêlée : ${p.nom} (${arme.nom}) contre ${cible.nom}${params.charge ? ' (Charge, p. 207)' : ''}.`, 'action');
  const inversions = [];
  if (apA.choixRequis) inversions.push({ cote: 'attaque', apercu: apA });
  if (apD && apD.choixRequis) inversions.push({ cote: 'defense', apercu: apD });
  if (inversions.length) return enAttenteInversion(s, 'attaquerMelee', params, { attaque: apA, defense: apD }, inversions);
  return finaliserAttaqueMelee(s, params, apA, apD, des);
}

function finaliserAttaqueMelee(s, params, apA, apD, des, gagnantForce = null) {
  const p = participant(s, params.id), cible = participant(s, params.cibleId), arme = armeDe(s, params.armeId);
  const modeDefense = estCibleIncapable(cible) ? 'aucune' : (params.modeDefense ?? 'opposition');
  const critiqueAuto = estCibleIncapable(cible); // p. 199 (surpris), 214 (attaque cachée), 357 (inconscient)
  let r = s;
  let touche = false, drNet = 0;
  if (modeDefense === 'opposition' && apD) {
    const res = gagnantForce ? { gagnant: gagnantForce, drNet: 0, egaliteParfaite: false } : resoudreTestOppose(apA, apD); // p. 190, 211
    if (res.egaliteParfaite && !gagnantForce) {
      // p. 190 : égalité parfaite -> le MJ tranche via trancherEgalite
      const e = { ...r, enAttente: { type: 'egalite', action: 'attaquerMelee', params: clone(params), apercus: { attaque: apA, defense: apD }, inputs: { attaque: inputsDe(apA), defense: inputsDe(apD) } } };
      return noter(e, `Égalité parfaite du test opposé entre ${p.nom} et ${cible.nom} : trancherEgalite requis (p. 190).`, 'alerte');
    }
    touche = res.gagnant === 'init'; // p. 211 : le vainqueur du test opposé touche (même avec un SL négatif, p. 213)
    drNet = res.drNet; // p. 211 : dégâts = arme + différence de SL
    r = noter(r, `Test opposé : ${p.nom} DR ${apA.dr >= 0 ? '+' : ''}${apA.dr} vs ${cible.nom} DR ${apD.dr >= 0 ? '+' : ''}${apD.dr} -> ${res.gagnant === 'init' ? p.nom : cible.nom} gagne, diff. ${drNet >= 0 ? '+' : ''}${drNet} (p. 190, 211).`, 'test');
  } else if (modeDefense === 'esquive' && apD) {
    // p. 211 : la cible peut tenter d'éviter avec Réflexes (Esquive) ; (choix : esquive réussie = attaque évitée)
    touche = apA.reussi && !apD.reussi;
    drNet = apA.dr;
    r = noter(r, `${cible.nom} — Réflexes (Esquive) ${apD.jet} : ${apD.reussi ? 'esquive réussie' : 'échec'} (p. 211).`, 'test');
  } else {
    touche = apA.reussi; // p. 211 : cible qui n'oppose pas
    drNet = apA.dr;
  }
  const sup = bonusSuperiorite(r, p, params);
  if (sup.marquer) r = maj(r, p.id, { superioriteUtiliseeCeTour: true }); // p. 196 : une fois par tour
  if (params.charge) r = maj(r, p.id, { chargeMalusDefense: true }); // p. 207 : Charge -> Désavantage en défense jusqu'au prochain tour
  r = ajouterEngagement(r, p.id, cible.id); // p. 212 : attaquer au corps à corps -> engagé
  if (modeDefense === 'esquive' && apD && participant(r, cible.id).esquiveActive) r = maj(r, cible.id, { esquiveActive: false }); // p. 208 : consommée
  const loc = params.cibleLocalisation ?? localisationDuJet(apA.jet); // p. 210, 211 : unités du jet
  const degatsBase = (arme.degatsBase ?? 0) + (arme.ajouteBF ? bonusCarac(p.carac.F) : 0); // p. 211 : mêlée = dégâts de l'arme + BF
  // p. 204 : le couvert ne protège que contre les attaques à distance ; p. 210 : localisation ciblée ignore le couvert
  const { armureEffective } = calculerArmureEffective({ armureBase: armureDe(cible, loc), couvert: 0, traitsArme: arme.traits, ignoreCouvert: true });
  const degats = touche ? resoudreDegats({ degatsBase, dr: drNet, armureEffective }) : 0; // p. 211
  const coupCritique = critiqueAuto || apA.critique; // p. 213 (double + SL positif), 214, 357
  r = noter(r, `${p.nom} — attaque de mêlée (${arme.specialisation ?? 'Mêlée'}) ${apA.jet} : ${apA.reussi ? 'succès' : 'échec'} DR ${apA.dr >= 0 ? '+' : ''}${apA.dr}${touche ? `, touche (${loc})` : ', rate'} (p. 211).`, 'test');
  if (touche || coupCritique) {
    // p. 213 : un critique touche même en perdant le test opposé
    r = appliquerDegatsCible(r, cible.id, { degats, coupCritique, retenirCoups: params.retenirCoups ?? false, localisation: loc, viaDouble: apA.critique, arme, des }).state;
  }
  // p. 213 : défense avec la compétence Mêlée et critique -> riposte par un coup critique
  if (modeDefense === 'opposition' && apD && apD.critique) {
    const defArme = armeMeleeDe(r, participant(r, cible.id));
    const locD = localisationDuJet(apD.jet);
    const degatsBaseD = (defArme?.degatsBase ?? 0) + (defArme?.ajouteBF ? bonusCarac(participant(r, cible.id).carac.F) : 0);
    const { armureEffective: aeD } = calculerArmureEffective({ armureBase: armureDe(p, locD), couvert: 0, traitsArme: defArme?.traits ?? [], ignoreCouvert: true });
    const degD = resoudreDegats({ degatsBase: degatsBaseD, dr: 0, armureEffective: aeD });
    r = noter(r, `${cible.nom} riposte par un coup critique (p. 213).`, 'critique');
    r = appliquerDegatsCible(r, p.id, { degats: degD, coupCritique: true, localisation: locD, viaDouble: true, arme: defArme, des }).state;
  }
  if (apA.maladresse) r = appliquerMaladresse(r, p.id, arme, des); // p. 213, 355 (même en gagnant le test opposé, p. 213)
  if (apD && apD.maladresse && modeDefense === 'opposition') r = appliquerMaladresse(r, cible.id, armeMeleeDe(r, participant(r, cible.id)), des); // p. 213, 355
  return r;
}

// ---------------------------------------------------------------------------
// Attaque à distance (p. 212)
// ---------------------------------------------------------------------------

/**
 * Attaque à distance (p. 212) : test de Tir Challenging (+0) ; dégâts = arme + SL du test - armure ;
 * esquive (Réflexes (Esquive)) retranche le DR (consomme la Réaction, ou esquiveActive p. 208) ;
 * portée (Viser +1 cran p. 207, hors portée = Désavantage p. 212, immédiate sans Close = Désavantage p. 212) ;
 * modes de tir et munitions (p. 123-125) ; couvert (p. 204, ignoré si localisation ciblée p. 210 ou Flamer p. 124).
 * params : { id, cibleId, armeId, mode = 'normal'|'rafale'|'rapide-spread'|'rapide-degats'|'surcharger',
 *            modeDefense = 'esquive'|'aucune', cibleLocalisation, utiliserSuperiorite, retenirCoups }.
 */
export function attaquerDistance(state, params, des) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const v = validerAttaquant(state, params, 'tir');
  if (v.erreur) return noter(state, v.erreur, 'erreur');
  const { p, cible, arme } = v;
  const mode = params.mode ?? 'normal';
  const cout = coutMode(arme, mode);
  if (!cout) return noter(state, `Mode « ${mode} » inutilisable avec « ${arme.nom} » (traits requis, p. 123-125).`, 'erreur');
  const mun = p.munitionsParArme[arme.id] ?? 0;
  if (mun < cout.cout) return noter(state, `Munitions insuffisantes pour « ${arme.nom} » : ${mun}/${cout.cout} (p. 123, 125).`, 'erreur');
  if (p.viseeActive && mode !== 'normal' && mode !== 'surcharger') return noter(state, 'Un tir visé (Viser) ne se combine pas avec Rafale ou Tir rapide (p. 207).', 'erreur');
  if (params.modeDefense !== undefined && !['esquive', 'aucune'].includes(params.modeDefense)) throw new RangeError(`modeDefense inconnu : ${params.modeDefense} (p. 212 : esquive ou aucune).`);
  const modeDefense = estCibleIncapable(cible) ? 'aucune' : (params.modeDefense ?? 'esquive'); // p. 199, 357
  const distance = distanceEntre(state, p, cible); // p. 201-202, 212
  const porteeEff = porteeArmeEffective(p, arme); // p. 207
  const avantages = collecterAvantages(p, [...(params.avantages ?? []), ...cout.avantages]);
  const desavantages = collecterDesavantages(p, params.desavantages ?? []);
  if (estCibleIncapable(cible)) avantages.push('cible-incapable'); // p. 199, 214
  if (PORTEES.indexOf(distance) > PORTEES.indexOf(porteeEff)) desavantages.push('hors-portee'); // p. 212 : au-delà de la portée -> Désavantage
  if (distance === 'immediate' && !aTrait(arme, 'close')) desavantages.push('immediate-sans-close'); // p. 212
  const heavy = traitDe(arme, 'heavy');
  if (heavy && bonusCarac(p.carac.F) < (Number(heavy.valeur) || 0)) desavantages.push('heavy'); // p. 124 : Heavy -> Désavantage aux tests de Tir si BF < rating
  if (params.cibleLocalisation) desavantages.push('cible-localisation'); // p. 210
  const sup = bonusSuperiorite(state, p, params); // p. 196
  const seuilA = seuilDe(p, arme.specialisation ?? 'Tir', 'CT');
  const jetA = jetActeur(state, p, des, { id: p.id, competence: arme.specialisation ?? 'Tir', motif: 'attaque-tir', cible: cible.id, arme: arme.id, mode });
  const apA = prevoirTest({ seuil: seuilA, jet: jetA, difficulte: 'intermediaire', avantages, desavantages, bonusDR: sup.bonusDR + cout.bonusDR, kind: 'tir' }); // p. 212 : Challenging (+0)
  let apD = null;
  if (modeDefense === 'esquive' && (!cible.reactionUtilisee || cible.esquiveActive)) {
    // p. 212 : la cible peut tenter d'esquiver (Réaction, ou esquiveActive p. 208 sans Réaction)
    const defAv = collecterAvantages(cible, []);
    if (cible.esquiveActive) defAv.push('esquive'); // p. 208 : Avantage au prochain test d'esquive
    const seuilD = seuilDe(cible, 'Réflexes (Esquive)', 'Ag');
    const jetD = jetActeur(state, cible, des, { id: cible.id, competence: 'Réflexes (Esquive)', motif: 'esquive-tir', attaquant: p.id });
    apD = prevoirTest({ seuil: seuilD, jet: jetD, difficulte: 'intermediaire', avantages: defAv, desavantages: collecterDesavantages(cible, []), bonusDR: 0, kind: 'test' });
  }
  let s = noter(state, `Attaque à distance : ${p.nom} (${arme.nom}${mode !== 'normal' ? `, ${mode}` : ''}) contre ${cible.nom} (${distance}).`, 'action');
  const inversions = [];
  if (apA.choixRequis) inversions.push({ cote: 'attaque', apercu: apA });
  if (apD && apD.choixRequis) inversions.push({ cote: 'defense', apercu: apD });
  if (inversions.length) return enAttenteInversion(s, 'attaquerDistance', params, { attaque: apA, defense: apD }, inversions);
  return finaliserAttaqueDistance(s, params, apA, apD, des);
}

function finaliserAttaqueDistance(s, params, apA, apD, des) {
  const p = participant(s, params.id), cible = participant(s, params.cibleId), arme = armeDe(s, params.armeId);
  const mode = params.mode ?? 'normal';
  const cout = coutMode(arme, mode);
  const modeDefense = estCibleIncapable(cible) ? 'aucune' : (params.modeDefense ?? 'esquive');
  const critiqueAuto = estCibleIncapable(cible); // p. 199, 214
  let r = s;
  let touche = apA.reussi, drFinal = apA.dr;
  if (modeDefense === 'esquive' && apD) {
    const esq = resoudreEsquiveDistance({ drAttaque: apA.dr, testDefense: apD }); // p. 212 : esquive retranche le DR, <= +0 -> rate
    touche = apA.reussi && esq.touche;
    drFinal = esq.drFinal;
    r = noter(r, `${cible.nom} — Réflexes (Esquive) ${apD.jet} : ${apD.reussi ? `réussie, DR ${apD.dr >= 0 ? '+' : ''}${apD.dr}` : 'échouée'} ; attaque ${touche ? `touche (DR final ${drFinal >= 0 ? '+' : ''}${drFinal})` : 'rate'} (p. 212).`, 'test');
    if (participant(r, cible.id).esquiveActive) r = maj(r, cible.id, { esquiveActive: false }); // p. 208 : consommée, sans Réaction
    else r = maj(r, cible.id, { reactionUtilisee: true }); // p. 199, 212 : la Réaction est consommée
  }
  const sup = bonusSuperiorite(r, p, params);
  if (sup.marquer) r = maj(r, p.id, { superioriteUtiliseeCeTour: true }); // p. 196
  const distance = distanceEntre(r, participant(r, p.id), participant(r, cible.id));
  if (distance === 'immediate') r = ajouterEngagement(r, p.id, cible.id); // p. 212 : tirer à portée immédiate -> engagé
  r = maj(r, p.id, { viseeActive: false }); // p. 207 : la visée est perdue après le tir
  const loc = params.cibleLocalisation ?? localisationDuJet(apA.jet); // p. 210, 211
  const c = participant(r, cible.id);
  const couvert = c.couvertActif ? (COUVERT[c.couvertActif] ?? 0) : 0; // p. 204 : léger +2, moyen +4, lourd +6
  const ignoreCouvert = Boolean(params.cibleLocalisation) || aTrait(arme, 'flamer'); // p. 210, 124 : Flamer ignore le couvert
  const { armureEffective } = calculerArmureEffective({ armureBase: armureDe(c, loc), couvert, traitsArme: arme.traits, ignoreCouvert });
  const degats = touche ? resoudreDegats({ degatsBase: (arme.degatsBase ?? 0) + cout.bonusDegats, dr: drFinal, armureEffective }) : 0; // p. 212 : arme + SL du test - armure
  const coupCritique = critiqueAuto || apA.critique; // p. 213, 214
  r = noter(r, `${p.nom} — tir (${arme.nom}, ${mode}) ${apA.jet} : ${apA.reussi ? 'succès' : 'échec'} DR ${apA.dr >= 0 ? '+' : ''}${apA.dr}${touche ? `, touche (${loc})` : ', rate'} (p. 212).`, 'test');
  if (touche || coupCritique) {
    r = appliquerDegatsCible(r, cible.id, { degats, coupCritique, retenirCoups: params.retenirCoups ?? false, localisation: loc, viaDouble: apA.critique, arme, des }).state;
  }
  if (apA.maladresse) r = appliquerMaladresse(r, p.id, arme, des); // p. 213, 355
  // p. 212 : les munitions sont notées même si le tir rate ; p. 123-125 : coût du mode
  const mun = Math.max(0, (participant(r, p.id).munitionsParArme[arme.id] ?? 0) - cout.cout);
  r = maj(r, p.id, { munitionsParArme: { ...participant(r, p.id).munitionsParArme, [arme.id]: mun } });
  r = noter(r, `Munitions de « ${arme.nom} » : ${mun} (p. 123-125).`, 'info');
  return r;
}

// ---------------------------------------------------------------------------
// Choix d'inversion (Avantage, p. 189) et égalités (p. 190)
// ---------------------------------------------------------------------------

/**
 * Choisit l'option d'inversion d'un test en attente (p. 189) : optionId = 'keep' | 'reverse',
 * ou 'cote:option' ('attaque:reverse', 'defense:keep', ...) si plusieurs choix sont en attente.
 * Quand tous les choix sont faits, finalise l'action avec les dés nécessaires via `des`.
 */
export function choisirInversion(state, optionId, des) {
  const e = state.enAttente;
  if (!e || e.type !== 'inversion') return noter(state, 'Aucune inversion en attente.', 'erreur');
  let cote = null, option = String(optionId);
  if (option.includes(':')) [cote, option] = option.split(':');
  else if (e.inversions.length === 1) cote = e.inversions[0].cote;
  else throw new RangeError(`Plusieurs inversions en attente : précisez « cote:option » (${e.inversions.map(i => i.cote).join(', ')}).`);
  const entry = e.inversions.find(i => i.cote === cote);
  if (!entry) throw new RangeError(`Aucune inversion en attente pour « ${cote} ».`);
  const resolved = selectionnerOptionTest(entry.apercu, option); // RangeError si l'option n'est pas légale
  const apercus = { ...e.apercus, [cote]: resolved };
  const inversions = e.inversions.filter(i => i.cote !== cote);
  if (inversions.length) {
    return noter({ ...state, enAttente: { ...e, apercus, inversions } }, `Inversion « ${cote}:${option} » choisie (p. 189) ; ${inversions.length} autre(s) en attente.`, 'resultat');
  }
  let s = noter({ ...state, enAttente: null }, `Inversion « ${cote}:${option} » choisie (p. 189).`, 'resultat');
  switch (e.action) {
    case 'attaquerMelee': return finaliserAttaqueMelee(s, e.params, apercus.attaque, apercus.defense ?? null, des);
    case 'attaquerDistance': return finaliserAttaqueDistance(s, e.params, apercus.attaque, apercus.defense ?? null, des);
    case 'testLibre': return finaliserTestLibre(s, e.params, apercus.test, des);
    case 'testOppose': return finaliserTestOppose(s, e.params, apercus.a, apercus.b, des);
    case 'premiersSoins': return finaliserPremiersSoins(s, e.params, apercus.test, des);
    default: throw new RangeError(`Action inconnue en attente : ${e.action}.`);
  }
}

/**
 * Tranche une égalité parfaite (p. 190) : 'a' ou 'b' désigne le gagnant, 'relancer' rejoue les deux
 * tests (exige `des`). Puis finalise l'action en attente.
 */
export function trancherEgalite(state, decision, des = null) {
  const e = state.enAttente;
  if (!e || e.type !== 'egalite') return noter(state, 'Aucune égalité en attente.', 'erreur');
  if (!['a', 'b', 'relancer'].includes(decision)) throw new RangeError(`Décision inconnue : ${decision} (attendu : 'a', 'b' ou 'relancer').`);
  let s = { ...state, enAttente: null };
  if (decision === 'relancer') {
    if (!des) throw new RangeError('« relancer » exige le fournisseur de dés (nouveaux jets, p. 190).');
    const reroll = (cote) => {
      const inp = e.inputs[cote];
      const actorId = cote === 'attaque' || cote === 'a' ? (e.params.id ?? e.params.idA) : (e.params.cibleId ?? e.params.idB);
      const actor = participant(state, actorId);
      const jet = jetActeur(state, actor, des, { id: actorId, motif: 'egalite-relancer', cote });
      // p. 189 : l'inversion facultative éventuelle reste sur l'option par défaut ('keep')
      return prevoirTest({ ...inp, jet });
    };
    if (e.action === 'testOppose') {
      const apA = reroll('a'), apB = reroll('b');
      return finaliserTestOppose(noter(s, 'Égalité relancée (p. 190).', 'resultat'), e.params, apA, apB, des);
    }
    const apA = reroll('attaque'), apD = e.apercus.defense ? reroll('defense') : null;
    if (e.action === 'attaquerMelee') return finaliserAttaqueMelee(noter(s, 'Égalité relancée (p. 190).', 'resultat'), e.params, apA, apD, des);
    return finaliserAttaqueDistance(noter(s, 'Égalité relancée (p. 190).', 'resultat'), e.params, apA, apD, des);
  }
  if (e.action === 'testOppose') {
    const gagnant = decision === 'a' ? e.params.idA : e.params.idB;
    const res = { gagnant, drNet: 0, egaliteParfaite: false };
    s = noter(s, `Égalité parfaite tranchée par le MJ : ${participant(s, gagnant).nom} l'emporte (p. 190).`, 'resultat');
    return { ...s, dernierOppose: { idA: e.params.idA, idB: e.params.idB, res, apA: e.apercus.a, apB: e.apercus.b } };
  }
  const gagnantForce = decision === 'a' ? 'init' : 'adv'; // 'a' = l'attaquant gagne le test opposé
  s = noter(s, `Égalité parfaite tranchée par le MJ : ${decision === 'a' ? 'l’attaquant' : 'le défenseur'} l'emporte (p. 190).`, 'resultat');
  if (e.action === 'attaquerMelee') return finaliserAttaqueMelee(s, e.params, e.apercus.attaque, e.apercus.defense ?? null, des, gagnantForce);
  if (e.action === 'attaquerDistance') return finaliserAttaqueDistance(s, e.params, e.apercus.attaque, e.apercus.defense ?? null, des);
  throw new RangeError(`Action inconnue en attente : ${e.action}.`);
}

// ---------------------------------------------------------------------------
// Actions simples (p. 207-209)
// ---------------------------------------------------------------------------

/** Garde des actions de tour : acteur courant et capable d'agir. */
function acteurAgissant(state, id) {
  const p = participant(state, id);
  if (!p) return { erreur: `Participant introuvable : ${id}.` };
  if (acteurCourant(state)?.id !== id) return { erreur: `${p.nom} n'est pas l'acteur courant.` };
  if (!peutAgir(p)) return { erreur: `${p.nom} ne peut pas agir.` };
  return { p };
}

/** Viser (p. 207) : au prochain tir, portée +1 cran et localisation ciblable sans pénalité ; perdu après le tir ou un déplacement. */
export function viser(state, { id }) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const v = acteurAgissant(state, id);
  if (v.erreur) return noter(state, v.erreur, 'erreur');
  return noter(maj(state, id, { viseeActive: true }), `${v.p.nom} vise (portée +1 cran au prochain tir, p. 207).`, 'action');
}

/** Esquiver (p. 208) : Avantage au prochain test de Mêlée ou Réflexes (Esquive) défensif ; esquive les attaques à distance sans Réaction. */
export function esquiver(state, { id }) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const v = acteurAgissant(state, id);
  if (v.erreur) return noter(state, v.erreur, 'erreur');
  return noter(maj(state, id, { esquiveActive: true }), `${v.p.nom} se met à esquiver (Avantage défensif, esquive à distance sans Réaction, p. 208).`, 'action');
}

/** Se mettre à couvert (p. 204, 210) : couvert léger +2, moyen +4, lourd +6 contre les attaques à distance. */
export function seMettreACouvert(state, { id, couvert = 'leger' }) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const v = acteurAgissant(state, id);
  if (v.erreur) return noter(state, v.erreur, 'erreur');
  if (!(couvert in COUVERT)) throw new RangeError(`Couvert inconnu : ${couvert} (attendu : ${Object.keys(COUVERT).join(', ')}, p. 204).`);
  return noter(maj(state, id, { couvertActif: couvert }), `${v.p.nom} se met à couvert (${couvert}, +${COUVERT[couvert]} armure contre le tir, p. 204).`, 'action');
}

/** Se désengager (p. 207) : met fin à un engagement (ou à tous ceux du participant si cibleId absent). */
export function seDesengager(state, { id, cibleId = null }) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const v = acteurAgissant(state, id);
  if (v.erreur) return noter(state, v.erreur, 'erreur');
  let s = state;
  if (cibleId) {
    if (!participant(state, cibleId)) return noter(state, `Cible introuvable : ${cibleId}.`, 'erreur');
    s = retirerEngagement(s, id, cibleId);
  } else {
    s = { ...s, engages: s.engages.filter(([a, b]) => a !== id && b !== id) };
  }
  return noter(s, `${v.p.nom} se désengage${cibleId ? ` de ${participant(s, cibleId)?.nom ?? cibleId}` : ''} (p. 207).`, 'action');
}

/** Prendre l'initiative (p. 209) : agit en haut de l'ordre au prochain round. */
export function prendreInitiative(state, { id }) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const v = acteurAgissant(state, id);
  if (v.erreur) return noter(state, v.erreur, 'erreur');
  return noter(maj(state, id, { saisirInitProchainRound: true }), `${v.p.nom} saisit l'initiative au prochain round (p. 209).`, 'action');
}

/** Recharger (p. 207) : remplit le chargeur de l'arme. */
export function recharger(state, { id, armeId }) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const v = acteurAgissant(state, id);
  if (v.erreur) return noter(state, v.erreur, 'erreur');
  const arme = armeDe(state, armeId);
  if (!arme || !v.p.armes.includes(armeId)) return noter(state, `Arme inconnue pour ${v.p.nom} : ${armeId}.`, 'erreur');
  if (arme.chargeur === null || arme.chargeur === undefined) return noter(state, `« ${arme.nom} » n'a pas de chargeur à recharger (p. 123).`, 'erreur');
  const s = maj(state, id, { munitionsParArme: { ...v.p.munitionsParArme, [armeId]: arme.chargeur } });
  return noter(s, `${v.p.nom} recharge « ${arme.nom} » (chargeur ${arme.chargeur}, p. 207, 123).`, 'action');
}

/** Aider (p. 208, 189) : un allié gagne Avantage à son prochain test. */
export function aider(state, { id, cibleId }) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const v = acteurAgissant(state, id);
  if (v.erreur) return noter(state, v.erreur, 'erreur');
  const cible = participant(state, cibleId);
  if (!cible || !enJeu(cible)) return noter(state, `Allié introuvable ou hors de combat : ${cibleId}.`, 'erreur');
  const s = maj(state, cibleId, { avantageProchainTest: true });
  return noter(s, `${v.p.nom} aide ${cible.nom} (Avantage au prochain test, p. 208, 189).`, 'action');
}

/** Fuir (p. 208) : hors de combat, retiré des engagements, -1 Supériorité (p. 197, 208). */
export function fuir(state, { id }) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const v = acteurAgissant(state, id);
  if (v.erreur) return noter(state, v.erreur, 'erreur');
  let r = maj(state, id, { etat: 'fui' });
  r = { ...r, engages: r.engages.filter(([a, b]) => a !== id && b !== id) };
  r = ajusterSuperioriteInterne(r, -1, `fuite de ${v.p.nom} (p. 208, 197)`);
  return noter(r, `${v.p.nom} fuit le combat (p. 208).`, 'alerte');
}

// ---------------------------------------------------------------------------
// Premiers soins et traitement des critiques (p. 219)
// ---------------------------------------------------------------------------

/**
 * Premiers soins en combat (p. 219) : test de Médecine Challenging (+0) ; soigne DR + bonus d'Int
 * blessures (mode 'soin') ou traite une blessure critique non traitée (mode 'critique').
 * `traiterCritique` est un raccourci pour le mode 'critique'.
 */
export function premiersSoins(state, params, des) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const v = acteurAgissant(state, params.id);
  if (v.erreur) return noter(state, v.erreur, 'erreur');
  const { p } = v;
  const cible = participant(state, params.cibleId);
  if (!cible || !enJeu(cible)) return noter(state, `Cible introuvable ou hors de combat : ${params.cibleId}.`, 'erreur');
  const mode = params.mode ?? 'soin';
  if (!['soin', 'critique'].includes(mode)) throw new RangeError(`mode inconnu : ${mode} (attendu : 'soin' ou 'critique', p. 219).`);
  if (mode === 'critique' && !cible.critiques.some(c => c.traitementRequis && !c.traitee)) return noter(state, `${cible.nom} n'a pas de blessure critique à traiter (p. 219).`, 'erreur');
  const competence = params.competence ?? 'Médecine';
  const seuil = seuilDe(p, competence, 'Int');
  const jet = jetActeur(state, p, des, { id: p.id, competence, motif: 'premiers-soins', cible: cible.id });
  const ap = prevoirTest({ seuil, jet, difficulte: 'intermediaire', avantages: collecterAvantages(p, params.avantages ?? []), desavantages: collecterDesavantages(p, params.desavantages ?? []), bonusDR: 0, kind: 'test' }); // p. 219 : Challenging (+0) en combat
  let s = noter(state, `${p.nom} prodigue des premiers soins à ${cible.nom} (${competence}, p. 219).`, 'action');
  if (ap.choixRequis) return enAttenteInversion(s, 'premiersSoins', params, { test: ap }, [{ cote: 'test', apercu: ap }]);
  return finaliserPremiersSoins(s, params, ap, des);
}

/** Traite une blessure critique non traitée de la cible (p. 219). */
export function traiterCritique(state, params, des) {
  return premiersSoins(state, { ...params, mode: 'critique' }, des);
}

function finaliserPremiersSoins(s, params, ap, des) {
  const p = participant(s, params.id), cible = participant(s, params.cibleId);
  let r = noter(s, `${p.nom} — ${params.competence ?? 'Médecine'} ${ap.jet} : ${ap.reussi ? 'succès' : 'échec'} (DR ${ap.dr >= 0 ? '+' : ''}${ap.dr}, p. 219).`, 'test');
  r = { ...r, dernierTest: { id: p.id, competence: params.competence ?? 'Médecine', inputs: inputsDe(ap), ap } };
  if (!ap.reussi) return r; // p. 219 : échec -> aucun soin, aucun effet négatif
  const mode = params.mode ?? 'soin';
  if (mode === 'critique') {
    const c = participant(r, cible.id).critiques.find(x => x.traitementRequis && !x.traitee);
    r = maj(r, cible.id, { critiques: participant(r, cible.id).critiques.map(x => (x === c ? { ...x, traitee: true } : x)) });
    r = noter(r, `Blessure critique « ${c.nom} » de ${cible.nom} traitée (p. 219).`, 'soin');
  } else {
    const soins = Math.max(0, ap.dr) + bonusCarac(p.carac.Int); // p. 219 : SL + bonus d'Int
    const avant = participant(r, cible.id).blessures;
    r = maj(r, cible.id, { blessures: Math.max(0, avant - soins) });
    const cApres = participant(r, cible.id);
    if (cApres.etat === 'mourant') { // p. 215 : un Mourant soigné est stabilisé
      r = maj(r, cible.id, { etat: 'actif' });
      r = noter(r, `${cible.nom} est stabilisé (p. 215, 219).`, 'soin');
    }
    r = noter(r, `${cible.nom} récupère ${Math.min(soins, avant)} blessure(s) (${avant} -> ${Math.max(0, avant - soins)}, p. 219).`, 'soin');
  }
  return r;
}

// ---------------------------------------------------------------------------
// Tests libres et opposés (p. 186-190)
// ---------------------------------------------------------------------------

/**
 * Test libre (p. 186-189). params : { id, competence, caracFallback, difficulte = 'intermediaire',
 * avantages, desavantages, bonusDR, utiliserSuperiorite, kind = 'test' }.
 * Le résultat est mémorisé dans `dernierTest` (relancer / +1 SL du Destin, p. 220).
 */
export function testLibre(state, params, des) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const p = participant(state, params.id);
  if (!p || !enJeu(p)) return noter(state, `Participant introuvable ou hors de combat : ${params.id}.`, 'erreur');
  if (!params.competence) throw new RangeError('testLibre exige params.competence.');
  const competence = params.competence;
  const seuil = seuilDe(p, competence, params.caracFallback ?? competence);
  const sup = bonusSuperiorite(state, p, params); // p. 196
  const jet = jetActeur(state, p, des, { id: p.id, competence, motif: 'test', difficulte: params.difficulte ?? 'intermediaire' });
  const ap = prevoirTest({
    seuil, jet, difficulte: params.difficulte ?? 'intermediaire',
    avantages: collecterAvantages(p, params.avantages ?? []), desavantages: collecterDesavantages(p, params.desavantages ?? []),
    bonusDR: (params.bonusDR ?? 0) + sup.bonusDR, kind: params.kind ?? 'test'
  });
  let s = noter(state, `${p.nom} — test de ${competence} (${params.difficulte ?? 'intermediaire'}).`, 'action');
  if (ap.choixRequis) return enAttenteInversion(s, 'testLibre', params, { test: ap }, [{ cote: 'test', apercu: ap }]);
  return finaliserTestLibre(s, params, ap, des);
}

function finaliserTestLibre(s, params, ap, des) {
  const p = participant(s, params.id);
  let r = s;
  const sup = bonusSuperiorite(r, p, params);
  if (sup.marquer) r = maj(r, p.id, { superioriteUtiliseeCeTour: true }); // p. 196 : une fois par tour
  r = noter(r, `${p.nom} — ${params.competence} ${ap.jet} : ${ap.reussi ? 'succès' : 'échec'} (DR ${ap.dr >= 0 ? '+' : ''}${ap.dr}, seuil effectif ${ap.seuilEffectif}, p. 186-188).`, 'test');
  r = { ...r, dernierTest: { id: p.id, competence: params.competence, inputs: inputsDe(ap), ap } };
  return r;
}

/**
 * Test opposé (p. 190). params : { idA, competenceA, caracFallbackA, idB, competenceB, caracFallbackB,
 * difficulte = 'intermediaire', bonusDRA, bonusDRB }. Gagnant et DR net journalisés ; égalité parfaite
 * -> enAttente résolue par trancherEgalite.
 */
export function testOppose(state, params, des) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const a = participant(state, params.idA), b = participant(state, params.idB);
  if (!a || !enJeu(a) || !b || !enJeu(b)) return noter(state, 'Participants du test opposé introuvables ou hors de combat.', 'erreur');
  const mk = (p, competence, fb, bonusDR) => {
    const seuil = seuilDe(p, competence, fb ?? competence);
    const jet = jetActeur(state, p, des, { id: p.id, competence, motif: 'test-oppose' });
    return prevoirTest({ seuil, jet, difficulte: params.difficulte ?? 'intermediaire', avantages: collecterAvantages(p, []), desavantages: collecterDesavantages(p, []), bonusDR: bonusDR ?? 0, kind: 'test' });
  };
  const apA = mk(a, params.competenceA, params.caracFallbackA, params.bonusDRA ?? 0);
  const apB = mk(b, params.competenceB, params.caracFallbackB, params.bonusDRB ?? 0);
  let s = noter(state, `Test opposé : ${a.nom} (${params.competenceA}) vs ${b.nom} (${params.competenceB}) (p. 190).`, 'action');
  const inversions = [];
  if (apA.choixRequis) inversions.push({ cote: 'a', apercu: apA });
  if (apB.choixRequis) inversions.push({ cote: 'b', apercu: apB });
  if (inversions.length) return enAttenteInversion(s, 'testOppose', params, { a: apA, b: apB }, inversions);
  return finaliserTestOppose(s, params, apA, apB, des);
}

function finaliserTestOppose(s, params, apA, apB, des) {
  const res = resoudreTestOppose(apA, apB); // p. 190
  const a = participant(s, params.idA), b = participant(s, params.idB);
  if (res.egaliteParfaite) {
    const e = { ...s, enAttente: { type: 'egalite', action: 'testOppose', params: clone(params), apercus: { a: apA, b: apB }, inputs: { a: inputsDe(apA), b: inputsDe(apB) } } };
    return noter(e, `Égalité parfaite entre ${a.nom} et ${b.nom} : trancherEgalite requis (p. 190).`, 'alerte');
  }
  let r = noter(s, `Test opposé : ${a.nom} DR ${apA.dr >= 0 ? '+' : ''}${apA.dr} vs ${b.nom} DR ${apB.dr >= 0 ? '+' : ''}${apB.dr} -> ${res.gagnant === 'init' ? a.nom : b.nom} gagne (diff. ${res.drNet >= 0 ? '+' : ''}${res.drNet}, p. 190).`, 'test');
  // on stocke le gagnant sous forme d'id de participant (comme trancherEgalite), pas 'init'/'adv'
  const resStocke = { ...res, gagnant: res.gagnant === 'init' ? params.idA : res.gagnant === 'adv' ? params.idB : null };
  r = { ...r, dernierOppose: { idA: params.idA, idB: params.idB, res: resStocke, apA, apB } };
  return r;
}

// ---------------------------------------------------------------------------
// Destin (p. 220)
// ---------------------------------------------------------------------------

/**
 * Dépense un point de Destin (p. 220) : effet parmi 'relancer' (relance le dernier test échoué de `id`,
 * exige `des`), 'avantage' (Avantage au prochain test de la cible), 'plus1DR' (+1 SL au dernier test
 * de `id`), 'agirPremier' (agit en premier dans le round), 'ignorerCritiques' (ignore les effets des
 * critiques jusqu'au prochain tour), 'retirerEtat' (retire une condition ; À terre -> +1 blessure).
 */
export function depenserDestin(state, id, effet, params = {}, des = null) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const p = participant(state, id);
  if (!p || !enJeu(p)) return noter(state, `Participant introuvable ou hors de combat : ${id}.`, 'erreur');
  if (!['relancer', 'avantage', 'plus1DR', 'agirPremier', 'ignorerCritiques', 'retirerEtat'].includes(effet)) throw new RangeError(`Effet de Destin inconnu : ${effet} (p. 220).`);
  if ((p.destin ?? 0) <= 0) return noter(state, `${p.nom} n'a plus de point de Destin à dépenser (p. 220).`, 'erreur');
  let r = maj(state, id, { destin: p.destin - 1 }); // p. 220 : -1 point de Destin
  switch (effet) {
    case 'relancer': {
      const dt = r.dernierTest;
      if (!dt || dt.id !== id || dt.ap.reussi) return noter(r, 'Aucun test échoué de ce personnage à relancer (p. 220).', 'erreur');
      if (!des) throw new RangeError('« relancer » exige le fournisseur de dés (p. 220).');
      const jet = jetActeur(r, participant(r, id), des, { id, motif: 'destin-relancer' });
      // p. 189 : l'inversion facultative du nouveau jet reste sur l'option par défaut ('keep')
      const ap2 = prevoirTest({ ...dt.inputs, jet });
      r = noter(r, `${p.nom} relance son test de ${dt.competence} : ${jet} -> ${ap2.reussi ? 'succès' : 'échec'} (DR ${ap2.dr >= 0 ? '+' : ''}${ap2.dr}, p. 220).`, 'destin');
      return { ...r, dernierTest: { ...dt, inputs: { ...dt.inputs, jet: ap2.jet }, ap: ap2 } };
    }
    case 'avantage': {
      const cid = params.cibleId ?? id;
      const c = participant(r, cid);
      if (!c || !enJeu(c)) return noter(r, `Cible introuvable ou hors de combat : ${cid}.`, 'erreur');
      return noter(maj(r, cid, { avantageProchainTest: true }), `${c.nom} gagne Avantage à son prochain test (Destin, p. 220, 189).`, 'destin');
    }
    case 'plus1DR': {
      const dt = r.dernierTest;
      if (!dt || dt.id !== id) return noter(r, 'Aucun test de ce personnage à bonifier (p. 220).', 'erreur');
      const ap2 = prevoirTest({ ...dt.inputs, bonusDR: dt.inputs.bonusDR + 1 }); // p. 220 : +1 SL après le jet
      r = noter(r, `${p.nom} gagne +1 SL sur son test de ${dt.competence} (DR ${ap2.dr >= 0 ? '+' : ''}${ap2.dr}, p. 220).`, 'destin');
      return { ...r, dernierTest: { ...dt, ap: ap2 } };
    }
    case 'agirPremier': {
      const ordre = [...r.ordre];
      const i = ordre.indexOf(id);
      if (i > 0) { ordre.splice(i, 1); ordre.unshift(id); r = { ...r, ordre }; } // p. 220 : agit en premier, ignorant l'Initiative
      return noter(r, `${p.nom} agira en premier à ce round (Destin, p. 220).`, 'destin');
    }
    case 'ignorerCritiques': {
      const cid = params.cibleId ?? id;
      const c = participant(r, cid);
      if (!c || !enJeu(c)) return noter(r, `Cible introuvable ou hors de combat : ${cid}.`, 'erreur');
      return noter(maj(r, cid, { ignoreCritiquesTour: true }), `${c.nom} ignore les effets des blessures critiques jusqu'à son prochain tour (Destin, p. 220).`, 'destin');
    }
    case 'retirerEtat': {
      const etat = params.etat;
      const cid = params.cibleId ?? id;
      const c = participant(r, cid);
      if (!c || !c.etats.some(x => x.id === etat)) return noter(r, `${c?.nom ?? cid} n'a pas la condition « ${etat} ».`, 'erreur');
      r = retirerEtatInterne(r, cid, etat);
      if (etat === 'a-terre') r = maj(r, cid, { blessures: Math.max(0, (participant(r, cid).blessures ?? 0) - 1) }); // p. 220 : retirer À terre -> regagne 1 blessure
      return noter(r, `Condition « ${etat} » retirée de ${c.nom} (Destin, p. 220).`, 'destin');
    }
    default:
      throw new RangeError(`Effet de Destin inconnu : ${effet} (p. 220).`);
  }
}

/**
 * Brûle un point de Destin (p. 220, réduction permanente) : effet parmi 'survie' (« Vivre un autre
 * jour » : consommé à la place de la mort), 'eviterDegats' (« L'Empereur vous protège » : prochain
 * dégâts annulés), 'pourEmpereur' (« Pour l'Empereur » : params.jet = résultat choisi d'un jet),
 * 'renverserCours' (« Renverser le cours » : +1 Supériorité, +2 si elle est à 0).
 */
export function brulerDestin(state, id, effet, params = {}) {
  const refus = refuserSiEnAttente(state);
  if (refus) return refus;
  const p = participant(state, id);
  if (!p || !enJeu(p)) return noter(state, `Participant introuvable ou hors de combat : ${id}.`, 'erreur');
  if (!['survie', 'eviterDegats', 'pourEmpereur', 'renverserCours'].includes(effet)) throw new RangeError(`Effet de Destin brûlé inconnu : ${effet} (p. 220).`);
  const destinBrule = (p.destinBrule ?? 0) + 1;
  if (destinBrule > (p.destinMax ?? 3)) return noter(state, `${p.nom} ne peut plus brûler de point de Destin (p. 220).`, 'erreur');
  let r = maj(state, id, { destinBrule, destin: Math.min(p.destin ?? 0, (p.destinMax ?? 3) - destinBrule) }); // p. 220 : réduction permanente
  switch (effet) {
    case 'survie':
      r = maj(r, id, { destinSurvie: true }); // p. 220 : consommé à la place de la mort (voir appliquerChangementEtat)
      break;
    case 'eviterDegats':
      r = maj(r, id, { eviterDegatsActif: true }); // p. 220 : consommé aux prochains dégâts (voir appliquerDegatsCible)
      break;
    case 'pourEmpereur':
      if (params.jet === undefined) throw new RangeError('« pourEmpereur » exige params.jet (résultat choisi du jet, p. 220).');
      r = maj(r, id, { destinPourEmpereur: normaliserJet(params.jet) }); // p. 220 : le joueur choisit le résultat du jet
      break;
    case 'renverserCours':
      r = ajusterSuperioriteInterne(r, r.superiorite === 0 ? 2 : 1, `Destin brûlé « Renverser le cours » par ${p.nom} (p. 220)`); // p. 220 : +1 Supériorité, +2 si 0
      break;
  }
  const q = participant(r, id);
  return noter(r, `${p.nom} brûle un point de Destin (${effet}, p. 220) : Destin ${q.destin}/${q.destinMax}, brûlé ${q.destinBrule}.`, 'destin');
}
