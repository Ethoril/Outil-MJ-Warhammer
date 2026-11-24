/**
 * Rencontre de Cthulhu 7e : état sérialisable et actions pures (état → nouvel état), d'après la maquette.
 * Les dés viennent d'un objet injecté `des = { d100(net) → { jet, candidats }, lancer(expression) → nombre }`, ce qui
 * permet des jets saisis par le MJ ou tirés au hasard. Aucune rencontre ni arme n'est codée ici : la rencontre se
 * compose depuis une réserve de profils (`profils.js`) dont elle copie les armes.
 *
 * Décisions du Manuel du Gardien reprises de `regles.js` : à 0 PV un PNJ ou une créature est inconscient ou mourant,
 * pas mort ; la mort immédiate exige des dégâts supérieurs aux PV max ; une égalité parfaite au test opposé n'a pas de
 * vainqueur et attend le choix du Gardien (voir `decisionEgalite`).
 */
import {
  NIVEAU, LIBELLE_NIVEAU, LIBELLE_DIFFICULTE, TYPE_TEST, DIFFICULTE, desNets, niveauDuJet, seuilDeDifficulte, estReussite,
  resoudreMelee, resoudreTestOppose, desBonusSurnombre, ordreDex, preparerTir, calculerDegats, appliquerBlessure,
  suiteJetConBlessure, suiteJetConMourant, perteSan, appliquerPerteSan, nouvelleJourneeSan, foliePassagere,
  depenseChance, peutRedoubler
} from './regles.js';
import { trouverProfil, valeursDerivees, modifierProfil } from './profils.js';

export const VERSION_RENCONTRE = 1;

const clone = v => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------------------
// Composition depuis la réserve, report sur la réserve
// ---------------------------------------------------------------------------

function participantDe(profil, id, nom, reserve) {
  const d = valeursDerivees(profil);
  const suivi = profil.kind === 'PJ' ? profil.suivi : null;
  const armeTir = profil.armeTir ? reserve.armes[profil.armeTir] : null;
  const p = {
    ...clone(profil), id, nom, profilId: profil.id, suivi: undefined,
    pv: suivi?.pv ?? d.pvMax, pvMax: d.pvMax, blessureGrave: suivi?.blessureGrave ?? false, etat: suivi?.etat ?? 'actif',
    armure: profil.armure, impact: d.impact, carrure: d.carrure, mvt: d.mvt, defensesRound: 0, attaquesRound: 0,
    munitions: armeTir ? armeTir.capacite : 0
  };
  delete p.suivi;
  if (profil.kind === 'PJ') {
    const san = suivi?.san ?? profil.carac.POU;
    Object.assign(p, { san, journeeSan: suivi?.journeeSan ?? nouvelleJourneeSan(san), folie: suivi?.folie ?? null,
      chance: suivi?.chance ?? profil.chance, aVu: {} });
  }
  return p;
}

/**
 * Compose une rencontre à partir de la réserve. `entrees` : ids de profils, ou `{ id, cachee }` pour surcharger le
 * départ caché. Un PNJ ou une créature peut figurer plusieurs fois (`goule`, `goule-2`, nom « Goule 2 ») ; un
 * investigateur une seule. Un investigateur reprend PV, SAN, Chance, folie et blessure grave de sa dernière rencontre.
 */
export function composerRencontre(reserve, entrees) {
  if (!entrees?.length) throw new RangeError('Une rencontre a besoin d’au moins un participant.');
  const vus = {};
  const participants = entrees.map(entree => {
    const { id: profilId, ...surcharge } = typeof entree === 'string' ? { id: entree } : entree;
    const profil = trouverProfil(reserve, profilId);
    if (!profil) throw new RangeError(`Profil introuvable : ${profilId}.`);
    for (const a of [profil.armeMelee, profil.armeTir]) {
      if (a && !reserve.armes[a]) throw new RangeError(`L’arme « ${a} » de ${profil.nom} n’existe pas dans la réserve.`);
    }
    const n = (vus[profilId] = (vus[profilId] ?? 0) + 1);
    if (n > 1 && profil.kind === 'PJ') throw new RangeError(`${profil.nom} ne peut figurer qu’une fois dans la rencontre.`);
    const p = participantDe({ ...profil, ...('cachee' in surcharge ? { cachee: surcharge.cachee === true } : {}) },
      n === 1 ? profilId : `${profilId}-${n}`, n === 1 ? profil.nom : `${profil.nom} ${n}`, reserve);
    return p;
  });
  const armes = {};
  for (const p of participants) for (const a of [p.armeMelee, p.armeTir]) if (a) armes[a] = clone(reserve.armes[a]);
  return { version: VERSION_RENCONTRE, round: 0, ordre: [], indexTour: 0, enAttente: null, dernierTest: null, dernierOppose: null,
    journal: [], participants, armes };
}

/** Reporte sur la réserve ce qui reste aux investigateurs : PV, blessure grave, état, SAN, journée de SAN, folie, Chance. */
export function reporterSurReserve(reserve, rencontre) {
  let r = reserve;
  for (const p of rencontre.participants.filter(x => x.kind === 'PJ' && trouverProfil(r, x.profilId))) {
    r = modifierProfil(r, p.profilId, { suivi: {
      pv: p.pv, blessureGrave: p.blessureGrave, etat: p.etat, san: p.san, journeeSan: clone(p.journeeSan), folie: p.folie, chance: p.chance
    } });
  }
  return r;
}

// ---------------------------------------------------------------------------
// Outils d'état
// ---------------------------------------------------------------------------

export const participant = (state, id) => state.participants.find(p => p.id === id);
const maj = (state, id, changement) => ({ ...state, participants: state.participants.map(p => (p.id === id ? { ...p, ...changement } : p)) });
const noter = (state, texte, type = 'info') => ({ ...state, journal: [...state.journal, { round: state.round, texte, type }] });
const armeDe = (state, id) => state.armes[id];

/**
 * Seul un participant actif a un tour. Un mourant est inconscient (Manuel du Gardien p. 108 : il « sombre immédiatement
 * dans l'inconscience » et ne fait que son test de CON à la fin de chaque round) : comme un inconscient, il reste en jeu
 * dans l'ordre de DEX mais son tour est sauté.
 */
export const peutAgir = p => p && p.etat === 'actif' && !p.cachee;
export const enJeu = p => p && p.etat !== 'mort' && !p.cachee;

export const decisionEgalite = state => (state.enAttente?.type === 'egalite'
  ? { a: state.enAttente.a, b: state.enAttente.b, issues: state.enAttente.issues } : null);
const egaliteEnAttente = state => state.enAttente?.type === 'egalite';
const refuserSiEgalite = state => (egaliteEnAttente(state)
  ? noter(state, 'Une égalité attend la décision du Gardien (match nul ou relance).', 'erreur') : null);

/** Nouveau round : ordre DEX recalculé parmi ceux qui sont en jeu, défenses et attaques remises à zéro. */
export function commencerRound(state) {
  const round = state.round + 1;
  const vivants = state.participants.filter(enJeu);
  const ordre = ordreDex(vivants.map(p => ({ id: p.id, dex: p.carac.DEX, armeFeuPrete: p.armeFeuPrete, combat: p.competences['Corps à corps'] })));
  let next = { ...state, round, ordre, indexTour: 0, enAttente: null,
    participants: state.participants.map(p => ({ ...p, defensesRound: 0, attaquesRound: 0 })) };
  next = noter(next, `Round ${round} — ordre : ${ordre.map(o => `${participant(state, o.id).nom} (${o.dex})`).join(', ')}`, 'round');
  return sauterInactifs(next, true);
}

/**
 * Passe les participants qui ne peuvent pas agir. Fin d'ordre : nouveau round. Garde : si le round vient d'être ouvert
 * (`neuf`) et que personne ne peut agir (tous inconscients, mourants ou morts), il s'arrête là avec une note au lieu
 * de rouvrir un round sans fin ; passer le tour ouvre alors le round suivant, un à la fois.
 */
function sauterInactifs(state, neuf = false) {
  let s = state;
  while (s.indexTour < s.ordre.length && !peutAgir(participant(s, s.ordre[s.indexTour].id))) s = { ...s, indexTour: s.indexTour + 1 };
  if (s.indexTour < s.ordre.length || !s.ordre.length) return s;
  if (neuf && !s.ordre.some(o => peutAgir(participant(s, o.id)))) return noter(s, 'Aucun participant ne peut agir : le round est terminé.', 'round');
  return commencerRound(s);
}

export const acteurCourant = state => (state.ordre[state.indexTour] ? participant(state, state.ordre[state.indexTour].id) : null);

export function passerTour(state) {
  const refus = refuserSiEgalite(state);
  if (refus) return refus;
  if (!state.round) return commencerRound(state);
  return sauterInactifs({ ...state, indexTour: state.indexTour + 1, enAttente: null, dernierTest: null });
}

/** Arme à feu dégainée ou rengainée : change l'ordre au prochain round (+50 DEX). */
export function basculerArmePrete(state, id) {
  const p = participant(state, id);
  const s = maj(state, id, { armeFeuPrete: !p.armeFeuPrete });
  return noter(s, `${p.nom} ${p.armeFeuPrete ? 'rengaine' : 'dégaine'} son arme (effet au prochain round).`);
}

function jetTest(des, { valeur, difficulte = 'ordinaire', bonus = 0, malus = 0 }) {
  const net = desNets(bonus, malus);
  const { jet, candidats } = des.d100(net);
  const niveau = niveauDuJet(jet, valeur, { difficulte });
  return { valeur, difficulte, net, jet, candidats, niveau, reussi: niveau >= DIFFICULTE[difficulte] };
}

const decrireTest = (nom, competence, t) => `${nom} — ${competence} ${t.valeur} %${t.difficulte !== 'ordinaire' ? ` (difficulté ${LIBELLE_DIFFICULTE[t.difficulte]})` : ''}`
  + `${t.net ? ` [${t.net > 0 ? `${t.net} dé(s) bonus` : `${-t.net} dé(s) malus`} : ${t.candidats.join(' / ')}]` : ''} : ${String(t.jet).padStart(2, '0')} → ${LIBELLE_NIVEAU[t.niveau]}`;

/** Valeur d'une compétence ou d'une caractéristique du participant, `undefined` si elle n'existe pas. */
const valeurDe = (p, nom) => p.competences[nom] ?? p.carac[nom];

/** Alerte au journal quand un participant dépasse ses attaques par round (rien n'est refusé : le MJ décide). */
function compterAttaque(state, id) {
  const p = participant(state, id);
  const faites = (p.attaquesRound ?? 0) + 1;
  let s = maj(state, id, { attaquesRound: faites });
  if (faites > (p.attaquesParRound ?? 1)) s = noter(s, `${p.nom} dépasse ses ${p.attaquesParRound ?? 1} attaque(s) par round.`, 'alerte');
  return s;
}

// ---------------------------------------------------------------------------
// Mêlée
// ---------------------------------------------------------------------------

/**
 * Attaque de mêlée : jette l'attaque et la défense, puis attend la résolution (fenêtre pour la Chance).
 * `mode` : 'rendre' | 'esquiver' | 'aucune' (surprise). Surnombre : 1 dé bonus si la cible a déjà défendu autant de fois
 * qu'elle a d'attaques par round (1 pour un humain, 3 pour une goule) ; Gardien p. 96.
 */
export function attaquerMelee(state, { attaquantId, cibleId, mode = 'esquiver', bonus = 0, malus = 0 }, des) {
  const refus = refuserSiEgalite(state);
  if (refus) return refus;
  const a = participant(state, attaquantId), c = participant(state, cibleId);
  const arme = armeDe(state, a.armeMelee);
  if (!arme) return noter(state, `${a.nom} n’a pas d’arme de mêlée.`, 'erreur');
  const compAttaque = arme.competence || 'Corps à corps';
  if (!Number.isFinite(a.competences[compAttaque])) return noter(state, `${a.nom} n’a pas de valeur pour « ${compAttaque} ».`, 'erreur');
  const competenceDefense = mode === 'esquiver' ? 'Esquive' : 'Corps à corps';
  if (mode !== 'aucune' && !Number.isFinite(c.competences[competenceDefense])) return noter(state, `${c.nom} n’a pas de valeur pour « ${competenceDefense} ».`, 'erreur');
  const surnombre = desBonusSurnombre({ defensesFaites: c.defensesRound, defensesParRound: c.attaquesParRound ?? 1 });
  const attaque = { ...jetTest(des, { valeur: a.competences[compAttaque], bonus: bonus + surnombre, malus }), competence: compAttaque };
  let defense = null;
  if (mode !== 'aucune') defense = { ...jetTest(des, { valeur: c.competences[competenceDefense] }), competence: competenceDefense };
  let s = compterAttaque(state, attaquantId);
  s = maj(s, cibleId, { defensesRound: c.defensesRound + (mode === 'aucune' ? 0 : 1) });
  s = noter(s, `${a.nom} attaque ${c.nom} (${arme.nom})${surnombre ? ' — surnombre : +1 dé bonus' : ''}.`, 'action');
  s = noter(s, decrireTest(a.nom, compAttaque, attaque));
  if (defense) s = noter(s, decrireTest(c.nom, `${mode === 'rendre' ? 'Rendre les coups' : 'Esquiver'} (${competenceDefense})`, defense));
  return { ...s, enAttente: { type: 'melee', attaquantId, cibleId, mode, attaque, defense, chance: [] } };
}

// ---------------------------------------------------------------------------
// Tir
// ---------------------------------------------------------------------------

export function tirer(state, { tireurId, cibleId, distance, couvert = false, dansMelee = false, bonus = 0, malus = 0 }, des) {
  const refus = refuserSiEgalite(state);
  if (refus) return refus;
  const t = participant(state, tireurId), c = participant(state, cibleId);
  const arme = armeDe(state, t.armeTir);
  if (!arme) return noter(state, `${t.nom} n’a pas d’arme à feu.`, 'erreur');
  if (t.munitions <= 0) return noter(state, `${t.nom} n’a plus de munitions.`, 'erreur');
  const prep = preparerTir({ distance, porteeBase: arme.portee, dexTireur: t.carac.DEX, dansMelee, couvert });
  if (prep.horsPortee) return noter(state, `${c.nom} est hors de portée (${distance} m, portée ${arme.portee} m ×4).`, 'erreur');
  if (!Number.isFinite(t.competences[arme.competence])) return noter(state, `${t.nom} n’a pas de valeur pour « ${arme.competence} ».`, 'erreur');
  const attaque = { ...jetTest(des, { valeur: t.competences[arme.competence], difficulte: prep.difficulte, bonus: bonus + prep.bonus, malus: malus + prep.malus }),
    competence: arme.competence };
  const details = [`${distance} m`, `difficulté ${LIBELLE_DIFFICULTE[prep.difficulte]}`, prep.boutPortant && 'bout portant',
    dansMelee && 'tir dans la mêlée', couvert && 'cible à couvert'].filter(Boolean).join(', ');
  let s = compterAttaque(state, tireurId);
  s = maj(s, tireurId, { munitions: t.munitions - 1, armeFeuPrete: true });
  s = noter(s, `${t.nom} tire sur ${c.nom} (${arme.nom} ; ${details}).`, 'action');
  s = noter(s, decrireTest(t.nom, arme.competence, attaque));
  return { ...s, enAttente: { type: 'tir', attaquantId: tireurId, cibleId, attaque, defense: null, chance: [], tresLonguePortee: prep.tresLonguePortee } };
}

// ---------------------------------------------------------------------------
// Recharger
// ---------------------------------------------------------------------------

/**
 * Recharge une arme à feu (Manuel du Gardien p. 100) : au plus deux munitions par appel (1 round pour deux balles),
 * sans dépasser la capacité de l'arme ; le MJ appelle l'action une fois par round. `chargeur: true` : changement de
 * chargeur (1 round, p. 100), qui remet l'arme à pleine capacité.
 */
export function recharger(state, { id, chargeur = false } = {}) {
  const refus = refuserSiEgalite(state);
  if (refus) return refus;
  const p = participant(state, id);
  if (!p) return noter(state, `Participant introuvable : ${id}.`, 'erreur');
  if (p.etat === 'mort') return noter(state, `${p.nom} est mort.`, 'erreur');
  const arme = armeDe(state, p.armeTir);
  if (!arme) return noter(state, `${p.nom} n’a pas d’arme à feu.`, 'erreur');
  if (p.munitions >= arme.capacite) return noter(state, `${p.nom} a déjà le chargeur plein (${p.munitions}/${arme.capacite}).`, 'erreur');
  const nouveau = chargeur ? arme.capacite : Math.min(arme.capacite, p.munitions + 2);
  const s = maj(state, id, { munitions: nouveau });
  const maniere = chargeur ? 'changement de chargeur' : 'deux balles';
  return noter(s, `${p.nom} recharge ${arme.nom} (${nouveau}/${arme.capacite}) — ${maniere}, 1 round (Gardien p. 100).`, 'action');
}

// ---------------------------------------------------------------------------
// Chance pendant la fenêtre de résolution
// ---------------------------------------------------------------------------

/**
 * Dépense de Chance sur le jet d'attaque ou de défense en attente, pour un PJ, jusqu'au niveau visé.
 * Rend l'état inchangé avec une ligne de journal si c'est interdit.
 */
export function depenserChanceEnAttente(state, { role, niveauVise = 'ordinaire' }) {
  const e = state.enAttente;
  if (!e || egaliteEnAttente(state)) return state;
  const test = e[role];
  const p = participant(state, role === 'attaque' ? e.attaquantId : e.cibleId);
  if (!test || p.kind !== 'PJ') return noter(state, 'Seul un investigateur dépense de la Chance.', 'erreur');
  const difficulte = DIFFICULTE[niveauVise] > DIFFICULTE[test.difficulte] ? niveauVise : test.difficulte;
  const r = depenseChance({ jet: test.jet, valeur: test.valeur, difficulte, niveau: test.niveau, chance: p.chance, typeTest: TYPE_TEST.COMBAT });
  if (!r.autorise) return noter(state, `Chance refusée (${p.nom}) : ${r.raison}`, 'erreur');
  const nouveau = { ...test, jet: r.nouveauJet, niveau: niveauDuJet(r.nouveauJet, test.valeur, { difficulte: test.difficulte }), chanceDepensee: r.cout };
  nouveau.reussi = nouveau.niveau >= DIFFICULTE[test.difficulte];
  let s = maj(state, p.id, { chance: r.chanceRestante });
  s = noter(s, `${p.nom} dépense ${r.cout} point(s) de Chance : ${String(test.jet).padStart(2, '0')} devient ${String(r.nouveauJet).padStart(2, '0')} → ${LIBELLE_NIVEAU[nouveau.niveau]} (Chance ${r.chanceRestante}).`, 'chance');
  return { ...s, enAttente: { ...e, [role]: nouveau } };
}

/** Coût en Chance pour atteindre un niveau (affichage), ou null si interdit / inutile. */
export function coutChance(state, role, niveauVise = 'ordinaire') {
  const e = state.enAttente;
  const test = e?.[role];
  if (!test || egaliteEnAttente(state)) return null;
  const p = participant(state, role === 'attaque' ? e.attaquantId : e.cibleId);
  if (p.kind !== 'PJ') return null;
  const difficulte = DIFFICULTE[niveauVise] > DIFFICULTE[test.difficulte] ? niveauVise : test.difficulte;
  const r = depenseChance({ jet: test.jet, valeur: test.valeur, difficulte, niveau: test.niveau, chance: p.chance, typeTest: TYPE_TEST.COMBAT });
  return r.autorise ? r.cout : null;
}

// ---------------------------------------------------------------------------
// Résolution : dégâts, blessure grave, jet de CON
// ---------------------------------------------------------------------------

function infligerDegats(state, { auteurId, cibleId, arme, niveau, tresLonguePortee = false }, des) {
  const auteur = participant(state, auteurId), cible = participant(state, cibleId);
  const reduction = arme.type === 'feu' ? cible.reductionFeu ?? null : null;
  const d = calculerDegats({ arme, impact: auteur.impact, niveau, armure: cible.armure, reduction, tresLonguePortee, lancer: des.lancer });
  const forme = d.extreme ? (d.empale ? ` empalement : ${d.arme} max + ${d.empalement}${d.impact ? ` + Impact max ${d.impact}` : ''}`
    : ` maximum : ${d.arme}${d.impact ? ` + Impact max ${d.impact}` : ''}`) : ` ${d.arme}${d.impact ? ` + Impact ${d.impact}` : ''}`;
  let s = noter(state, `Dégâts (${arme.nom},${forme})${reduction ? ` ÷ 2 (armes à feu)` : ''}${cible.armure ? ` − armure ${cible.armure}` : ''} = ${d.total}.`, 'degats');
  const apres = appliquerBlessure(cible, d.total);
  const { grave, mortImmediate, jetCON, ...reste } = apres;
  s = maj(s, cibleId, reste);
  s = noter(s, `${cible.nom} : ${cible.pv} → ${apres.pv} PV${grave ? ' — BLESSURE GRAVE' : ''}.`, grave ? 'alerte' : 'info');
  if (mortImmediate) return noter(s, `${cible.nom} est tué sur le coup (dégâts supérieurs aux PV max).`, 'alerte');
  if (jetCON) {
    const con = jetTest(des, { valeur: cible.carac.CON });
    s = noter(s, decrireTest(cible.nom, 'CON (blessure grave)', con));
    const suite = suiteJetConBlessure(participant(s, cibleId), con.niveau);
    s = maj(s, cibleId, { etat: suite.etat });
    if (suite.etat === 'inconscient') s = noter(s, `${cible.nom} perd connaissance.`, 'alerte');
  }
  if (apres.etat === 'mourant') s = noter(s, `${cible.nom} est MOURANT : jet de CON à chaque round jusqu’aux premiers soins.`, 'alerte');
  if (apres.etat === 'inconscient' && !jetCON) s = noter(s, `${cible.nom} tombe inconscient (0 PV).`, 'alerte');
  return s;
}

export function resoudreEnAttente(state, des) {
  const refus = refuserSiEgalite(state);
  if (refus) return refus;
  const e = state.enAttente;
  if (!e) return state;
  let s = { ...state, enAttente: null };
  const a = participant(s, e.attaquantId), c = participant(s, e.cibleId);
  if (e.type === 'tir') {
    if (!e.attaque.reussi) return noter(s, `Le tir de ${a.nom} manque ${c.nom}.`, 'resultat');
    s = noter(s, `Le tir de ${a.nom} touche ${c.nom}.`, 'resultat');
    return infligerDegats(s, { auteurId: a.id, cibleId: c.id, arme: armeDe(s, a.armeTir), niveau: e.attaque.niveau, tresLonguePortee: e.tresLonguePortee }, des);
  }
  const r = resoudreMelee({ attaque: e.attaque, defense: e.defense, mode: e.mode });
  if (!r.touche) {
    return noter(s, r.vainqueur === 'defenseur' ? `${c.nom} esquive l’attaque de ${a.nom}.` : `Personne ne touche (${a.nom} contre ${c.nom}).`, 'resultat');
  }
  const auteur = r.touche === 'defenseur' ? a : c, victime = r.touche === 'defenseur' ? c : a;
  s = noter(s, r.touche === 'defenseur' ? `${a.nom} touche ${c.nom}.` : `${c.nom} rend les coups et touche ${a.nom} !`, 'resultat');
  return infligerDegats(s, { auteurId: auteur.id, cibleId: victime.id, arme: armeDe(s, auteur.armeMelee), niveau: r.niveauDegats }, des);
}

export function annulerEnAttente(state) {
  return state.enAttente ? noter({ ...state, enAttente: null }, 'Action en attente abandonnée.') : state;
}

// ---------------------------------------------------------------------------
// Mourant
// ---------------------------------------------------------------------------

export function jetMourant(state, { id }, des) {
  const refus = refuserSiEgalite(state);
  if (refus) return refus;
  const p = participant(state, id);
  if (!p) return noter(state, `Participant introuvable : ${id}.`, 'erreur');
  if (p.etat !== 'mourant') return noter(state, `${p.nom} n’est pas mourant.`, 'erreur');
  const con = jetTest(des, { valeur: p.carac.CON });
  let s = noter(state, decrireTest(p.nom, 'CON (mourant)', con));
  const suite = suiteJetConMourant(p, con.niveau);
  s = maj(s, id, { etat: suite.etat });
  return noter(s, suite.etat === 'mort' ? `${p.nom} succombe à ses blessures.` : `${p.nom} s’accroche à la vie.`, 'alerte');
}

/** Premiers soins réussis : un mourant est stabilisé (inconscient), sinon +1 PV. */
export function premiersSoins(state, { id }) {
  const refus = refuserSiEgalite(state);
  if (refus) return refus;
  const p = participant(state, id);
  if (!p) return noter(state, `Participant introuvable : ${id}.`, 'erreur');
  if (p.etat === 'mort') return noter(state, `${p.nom} est mort : plus rien à soigner.`, 'erreur');
  if (p.etat === 'mourant') return noter(maj(state, id, { etat: 'inconscient', pv: 1 }), `${p.nom} est stabilisé (1 PV, inconscient).`, 'info');
  return noter(maj(state, id, { pv: Math.min(p.pvMax, p.pv + 1) }), `${p.nom} récupère 1 PV.`, 'info');
}

// ---------------------------------------------------------------------------
// Santé mentale
// ---------------------------------------------------------------------------

/**
 * La créature se révèle : elle entre dans l'ordre au prochain round et chaque investigateur conscient fait son jet de
 * SAN. Un inconscient ou un mourant (inconscient, Gardien p. 107-108) ne voit rien : il ne jette pas. Sans coût de SAN
 * renseigné, la créature apparaît sans jet.
 */
export function revelerCreature(state, { id }, des) {
  const refus = refuserSiEgalite(state);
  if (refus) return refus;
  const monstre = participant(state, id);
  let s = maj(state, id, { cachee: false });
  if (!monstre.coutSan) return noter(s, `Apparition : ${monstre.nom} !`, 'alerte');
  s = noter(s, `Apparition : ${monstre.nom} ! Jets de SAN (${monstre.coutSan}).`, 'alerte');
  for (const pj of s.participants.filter(p => p.kind === 'PJ' && p.etat === 'actif')) {
    if (pj.aVu[id]) continue;
    s = jetSan(s, { id: pj.id, cout: monstre.coutSan, source: id }, des);
  }
  return s;
}

export function jetSan(state, { id, cout, source = null }, des) {
  const refus = refuserSiEgalite(state);
  if (refus) return refus;
  const pj = participant(state, id);
  const test = jetTest(des, { valeur: pj.san });
  let s = noter(state, decrireTest(pj.nom, 'SAN', test));
  const perte = perteSan({ cout, niveau: test.niveau, lancer: des.lancer });
  const r = appliquerPerteSan({ san: pj.san, journee: pj.journeeSan }, perte);
  let folie = pj.folie;
  s = noter(s, `${pj.nom} perd ${perte} SAN (${pj.san} → ${r.san} ; ${r.journee.perteJour} perdus aujourd’hui sur un seuil de ${Math.max(1, Math.floor(pj.san / 5))}).`, perte ? 'san' : 'info');
  if (r.jetIntRequis) {
    const int = jetTest(des, { valeur: pj.carac.INT });
    s = noter(s, decrireTest(pj.nom, 'INT (comprendre l’horreur)', int));
    if (foliePassagere({ perte, niveauINT: int.niveau })) { folie = 'temporaire'; s = noter(s, `${pj.nom} comprend ce que ses yeux ont vu : FOLIE TEMPORAIRE (crise de 1D10 rounds).`, 'alerte'); }
    else s = noter(s, `${pj.nom} refoule l’horreur (jet d’INT raté) : pas de folie temporaire.`);
  }
  if (r.persistante) { folie = 'persistante'; s = noter(s, `${pj.nom} a perdu 1/5 de sa SAN aujourd’hui : FOLIE PERSISTANTE.`, 'alerte'); }
  if (r.permanente) { folie = 'permanente'; s = noter(s, `${pj.nom} sombre dans la folie permanente.`, 'alerte'); }
  return maj(s, id, { san: r.san, journeeSan: r.journee, folie, aVu: source ? { ...pj.aVu, [source]: true } : pj.aVu });
}

// ---------------------------------------------------------------------------
// Test de compétence libre, Chance et redoublement
// ---------------------------------------------------------------------------

export function testLibre(state, { id, competence, difficulte = 'ordinaire', bonus = 0, malus = 0 }, des, { redouble = false } = {}) {
  const refus = refuserSiEgalite(state);
  if (refus) return refus;
  const p = participant(state, id);
  const valeur = valeurDe(p, competence);
  if (!Number.isFinite(valeur)) return noter(state, `${p.nom} n’a pas de valeur pour « ${competence} ».`, 'erreur');
  const t = jetTest(des, { valeur, difficulte, bonus, malus });
  const s = noter(state, `${redouble ? 'Test redoublé — ' : ''}${decrireTest(p.nom, competence, t)}`, redouble ? 'action' : 'info');
  return { ...s, dernierTest: { id, competence, ...t, redouble, chanceDepensee: false, typeTest: TYPE_TEST.COMPETENCE } };
}

export function redoublerDernierTest(state, des) {
  const refus = refuserSiEgalite(state);
  if (refus) return refus;
  const d = state.dernierTest;
  if (!d) return state;
  const ok = peutRedoubler({ niveau: d.niveau, typeTest: d.typeTest, dejaRedouble: d.redouble, chanceDepensee: d.chanceDepensee });
  if (!ok.autorise) return noter(state, `Redoublement refusé : ${ok.raison}`, 'erreur');
  return testLibre(state, { id: d.id, competence: d.competence, difficulte: d.difficulte,
    bonus: Math.max(0, d.net ?? 0), malus: Math.max(0, -(d.net ?? 0)) }, des, { redouble: true });
}

export function chanceSurDernierTest(state) {
  const refus = refuserSiEgalite(state);
  if (refus) return refus;
  const d = state.dernierTest;
  if (!d) return state;
  const p = participant(state, d.id);
  const r = depenseChance({ jet: d.jet, valeur: d.valeur, difficulte: d.difficulte, niveau: d.niveau, chance: p.chance, typeTest: d.typeTest, redouble: d.redouble });
  if (!r.autorise) return noter(state, `Chance refusée : ${r.raison}`, 'erreur');
  const niveau = niveauDuJet(r.nouveauJet, d.valeur, { difficulte: d.difficulte });
  const s = noter(maj(state, d.id, { chance: r.chanceRestante }),
    `${p.nom} dépense ${r.cout} point(s) de Chance : ${d.competence} réussi (${LIBELLE_NIVEAU[niveau]}, Chance ${r.chanceRestante}).`, 'chance');
  return { ...s, dernierTest: { ...d, jet: r.nouveauJet, niveau, reussi: true, chanceDepensee: true } };
}

export const etatsDernierTest = state => {
  const d = state.dernierTest;
  if (!d) return null;
  const p = participant(state, d.id);
  return {
    redoubler: peutRedoubler({ niveau: d.niveau, typeTest: d.typeTest, dejaRedouble: d.redouble, chanceDepensee: d.chanceDepensee }),
    chance: p.kind === 'PJ' ? depenseChance({ jet: d.jet, valeur: d.valeur, difficulte: d.difficulte, niveau: d.niveau, chance: p.chance, typeTest: d.typeTest, redouble: d.redouble })
      : { autorise: false, raison: 'PNJ' }
  };
};

// ---------------------------------------------------------------------------
// Test opposé libre et égalité parfaite
// ---------------------------------------------------------------------------

/**
 * Test opposé entre deux participants, chacun avec sa compétence ou sa caractéristique (par exemple FOR contre FOR pour
 * se dégager d'une prise). Une égalité parfaite (même niveau, même valeur) n'a pas de vainqueur : l'état reste en
 * attente (`enAttente.type === 'egalite'`, lisible par `decisionEgalite`) jusqu'au choix du Gardien, voir
 * `trancherEgalite`. Les autres actions de la rencontre sont refusées tant que ce choix n'est pas fait.
 */
export function testOppose(state, params, des, { relance = false } = {}) {
  const refus = refuserSiEgalite(state);
  if (refus) return refus;
  const { aId, aCompetence, bId, bCompetence, bonusA = 0, malusA = 0, bonusB = 0, malusB = 0 } = params;
  const a = participant(state, aId), b = participant(state, bId);
  const valeurA = valeurDe(a, aCompetence), valeurB = valeurDe(b, bCompetence);
  if (!Number.isFinite(valeurA)) return noter(state, `${a.nom} n’a pas de valeur pour « ${aCompetence} ».`, 'erreur');
  if (!Number.isFinite(valeurB)) return noter(state, `${b.nom} n’a pas de valeur pour « ${bCompetence} ».`, 'erreur');
  const ta = { ...jetTest(des, { valeur: valeurA, bonus: bonusA, malus: malusA }), competence: aCompetence };
  const tb = { ...jetTest(des, { valeur: valeurB, bonus: bonusB, malus: malusB }), competence: bCompetence };
  let s = noter(state, `${relance ? 'Relance — ' : ''}Test opposé : ${a.nom} (${aCompetence}) contre ${b.nom} (${bCompetence}).`, 'action');
  s = noter(s, decrireTest(a.nom, aCompetence, ta));
  s = noter(s, decrireTest(b.nom, bCompetence, tb));
  const r = resoudreTestOppose(ta, tb);
  if (r.egalite) {
    s = noter(s, 'Égalité parfaite : aucun vainqueur. Au Gardien de choisir : match nul, ou les deux camps relancent les dés.', 'alerte');
    return { ...s, dernierOppose: { aId, bId, vainqueur: null, egalite: true, aucun: false },
      enAttente: { type: 'egalite', ...params, a: { id: aId, ...ta }, b: { id: bId, ...tb }, issues: r.issues } };
  }
  const gagnant = r.vainqueur === 'a' ? a : r.vainqueur === 'b' ? b : null;
  s = noter(s, gagnant ? `${gagnant.nom} l’emporte.` : 'Les deux échouent : personne ne l’emporte.', 'resultat');
  return { ...s, enAttente: null, dernierOppose: { aId, bId, vainqueur: gagnant ? gagnant.id : null, egalite: false, aucun: r.aucun } };
}

/** Choix du Gardien devant une égalité parfaite : `issue` vaut 'nul' (match nul) ou 'relance' (les deux camps relancent). */
export function trancherEgalite(state, { issue }, des) {
  const e = state.enAttente;
  if (!egaliteEnAttente(state)) return noter(state, 'Aucune égalité n’attend de décision.', 'erreur');
  const choix = e.issues.find(i => i.id === issue);
  if (!choix) return noter(state, `Issue inconnue : ${issue} (attendu : ${e.issues.map(i => i.id).join(' ou ')}).`, 'erreur');
  const sans = { ...state, enAttente: null };
  if (!choix.relance) return noter({ ...sans, dernierOppose: { ...state.dernierOppose, issue: choix.id } }, `Égalité parfaite : ${choix.libelle.toLowerCase()} (décision du Gardien).`, 'resultat');
  const { type: _type, a: _a, b: _b, issues: _issues, ...params } = e;
  return testOppose(noter(sans, `Égalité parfaite : ${choix.libelle.toLowerCase()} (décision du Gardien).`, 'resultat'), params, des, { relance: true });
}

export { NIVEAU, LIBELLE_NIVEAU, estReussite, seuilDeDifficulte };
