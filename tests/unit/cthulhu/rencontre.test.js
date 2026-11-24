// Cthulhu 7e : rencontre composée depuis la réserve, scénario de quatre rounds de la maquette, égalité au test opposé,
// report sur les investigateurs, décisions du Manuel du Gardien. Dés scriptés : aucun hasard.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  composerRencontre, reporterSurReserve, commencerRound, passerTour, basculerArmePrete, tirer, attaquerMelee, resoudreEnAttente,
  depenserChanceEnAttente, revelerCreature, jetSan, jetMourant, premiersSoins, testLibre, redoublerDernierTest, chanceSurDernierTest,
  testOppose, trancherEgalite, decisionEgalite, participant, acteurCourant, peutAgir, recharger
} from '../../../cthulhu/rencontre.js';
import { creerReserve, ajouterArme, ajouterProfil, trouverProfil, modifierProfil } from '../../../cthulhu/profils.js';
import { reserveDeDepart, ARMES_DEPART, CREATURES_DEPART } from '../../../cthulhu/donnees-depart.js';

/** Dés scriptés : `d100` = jets (nombre, ou `{ jet, candidats, net }` avec dés bonus/malus), `lancer` = [expression, valeur]. */
function desScriptes({ d100 = [], lancer = [] } = {}) {
  const jets = [...d100], valeurs = [...lancer];
  return {
    d100(net) {
      const e = jets.shift();
      assert.ok(e !== undefined, 'plus de d100 scripté');
      const o = typeof e === 'number' ? { jet: e, candidats: [e], net: 0 } : e;
      assert.equal(net, o.net, 'dés bonus/malus attendus');
      return { jet: o.jet, candidats: o.candidats };
    },
    lancer(expression) {
      if (/^[+-]?\d+$/.test(expression.trim())) return Number(expression);
      const e = valeurs.shift();
      assert.ok(e, `plus de lancer scripté (demandé ${expression})`);
      assert.equal(expression, e[0]);
      return e[1];
    },
    restants: () => ({ d100: jets.length, lancer: valeurs.length })
  };
}

const textes = s => s.journal.map(j => j.texte);

// --- Profils saisis : ceux de la maquette pour les investigateurs et la goule, pour comparer le journal règle par règle ---
// L'adversaire humain n'est plus celui de la maquette (valeurs de travail) : c'est le Disciple de Jacob Smith des Aventures
// effroyables p. 129, profil complet du livre ; les armes de poing viennent du tableau du Gardien (revolver .38 : 8 coups).
const ARMES_MAQUETTE = [
  { id: 'poing', nom: 'Coup de poing', competence: 'Corps à corps', des: '1D3', empalante: false, aImpact: true, type: 'melee' },
  { id: 'couteau', nom: 'Poignard', competence: 'Corps à corps', des: '1D4', empalante: true, aImpact: true, type: 'melee' },
  { id: 'batte', nom: 'Batte de baseball', competence: 'Corps à corps', des: '1D6', empalante: false, aImpact: true, type: 'melee' },
  { id: 'griffes', nom: 'Griffes et crocs', competence: 'Corps à corps', des: '1D6', empalante: false, aImpact: true, type: 'melee' },
];
const PROFILS_MAQUETTE = [
  { id: 'hale', nom: 'Margaret Hale', kind: 'PJ', carac: { FOR: 55, CON: 60, TAI: 55, DEX: 80, APP: 60, INT: 70, POU: 65, EDU: 65 }, chance: 70,
    competences: { 'Corps à corps': 45, 'Armes de poing': 60, Esquive: 50 }, armeMelee: 'couteau', armeTir: 'revolver-38' },
  { id: 'lindqvist', nom: 'Pr Arthur Lindqvist', kind: 'PJ', carac: { FOR: 30, CON: 40, TAI: 60, DEX: 40, APP: 70, INT: 75, POU: 50, EDU: 80 }, chance: 60,
    competences: { 'Corps à corps': 30, 'Armes de poing': 20, Esquive: 25, Bibliothèque: 70, 'Trouver Objet Caché': 55 }, armeMelee: 'batte' },
  { id: 'goule', nom: 'Goule', kind: 'CREATURE', camp: 'ennemi', carac: { FOR: 80, CON: 65, TAI: 65, DEX: 65, APP: 0, INT: 65, POU: 65, EDU: 0 },
    competences: { 'Corps à corps': 40, Esquive: 35 }, armeMelee: 'griffes', reductionFeu: 'moitie', coutSan: '1/1D6', cachee: true }
];
const DISCIPLE = 'disciple-jacob-smith';
function reserveMaquette() {
  let r = creerReserve();
  for (const a of ARMES_MAQUETTE) r = ajouterArme(r, a);
  for (const id of ['couteau-grand', 'revolver-32', 'revolver-38']) r = ajouterArme(r, ARMES_DEPART[id]);
  for (const p of PROFILS_MAQUETTE) r = ajouterProfil(r, p);
  // Situation du scénario (pas une donnée du livre) : le disciple a déjà son revolver en main, il agit donc en premier.
  return ajouterProfil(r, { ...CREATURES_DEPART.find(p => p.id === DISCIPLE), armeFeuPrete: true });
}

// --- Composition -------------------------------------------------------------------------------------------------------

test('composer une rencontre depuis la réserve : participants, valeurs dérivées, armes copiées, réserve intacte', () => {
  const reserve = reserveMaquette();
  const avant = JSON.stringify(reserve);
  const s = composerRencontre(reserve, ['hale', DISCIPLE, { id: 'goule', cachee: false }]);
  assert.equal(JSON.stringify(reserve), avant);
  assert.deepEqual(s.participants.map(p => p.id), ['hale', DISCIPLE, 'goule']);
  const hale = participant(s, 'hale');
  assert.deepEqual([hale.pv, hale.pvMax, hale.san, hale.chance, hale.impact, hale.munitions], [11, 11, 65, 70, '0', 8]);
  assert.equal(participant(s, 'goule').cachee, false);
  assert.equal(participant(s, DISCIPLE).pvMax, 12);
  assert.deepEqual(Object.keys(s.armes).sort(), ['couteau', 'couteau-grand', 'griffes', 'revolver-32', 'revolver-38']);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s, 'état sérialisable');
  assert.equal(s.round, 0);
});

test('composer : plusieurs créatures du même profil, un investigateur une seule fois, profils et armes manquants refusés', () => {
  const reserve = reserveMaquette();
  const s = composerRencontre(reserve, ['hale', 'goule', 'goule', 'goule']);
  assert.deepEqual(s.participants.map(p => [p.id, p.nom]), [['hale', 'Margaret Hale'], ['goule', 'Goule'], ['goule-2', 'Goule 2'], ['goule-3', 'Goule 3']]);
  assert.throws(() => composerRencontre(reserve, ['hale', 'hale']), /une fois/);
  assert.throws(() => composerRencontre(reserve, ['absent']), /introuvable/);
  assert.throws(() => composerRencontre(reserve, []), /au moins un/);
  const armes = { ...reserve.armes };
  delete armes.couteau;
  assert.throws(() => composerRencontre({ ...reserve, armes }, ['hale']), /couteau/);
});

// --- Scénario de la maquette -------------------------------------------------------------------------------------------

function scenarioMaquette(des, reserve = reserveMaquette()) {
  let s = composerRencontre(reserve, ['hale', 'lindqvist', DISCIPLE, 'goule']);
  s = commencerRound(s);
  s = tirer(s, { tireurId: DISCIPLE, cibleId: 'hale', distance: 10 }, des);
  s = resoudreEnAttente(s, des);
  s = passerTour(s);
  s = basculerArmePrete(s, 'hale');
  s = tirer(s, { tireurId: 'hale', cibleId: DISCIPLE, distance: 3 }, des);
  s = resoudreEnAttente(s, des);
  s = revelerCreature(s, { id: 'goule' }, des);
  s = passerTour(s);
  s = testLibre(s, { id: 'lindqvist', competence: 'Bibliothèque' }, des);
  s = redoublerDernierTest(s, des);
  s = testLibre(s, { id: 'lindqvist', competence: 'Trouver Objet Caché' }, des);
  s = chanceSurDernierTest(s);
  s = passerTour(s); // round 2
  s = tirer(s, { tireurId: 'hale', cibleId: 'goule', distance: 12 }, des);
  s = resoudreEnAttente(s, des);
  s = passerTour(s);
  s = attaquerMelee(s, { attaquantId: 'goule', cibleId: 'lindqvist', mode: 'rendre' }, des);
  s = depenserChanceEnAttente(s, { role: 'defense', niveauVise: 'majeure' });
  s = resoudreEnAttente(s, des);
  s = passerTour(s);
  s = attaquerMelee(s, { attaquantId: 'lindqvist', cibleId: 'goule', mode: 'esquiver' }, des);
  s = resoudreEnAttente(s, des);
  s = passerTour(s); // round 3
  s = attaquerMelee(s, { attaquantId: 'hale', cibleId: 'goule', mode: 'esquiver' }, des);
  s = resoudreEnAttente(s, des);
  s = passerTour(s);
  s = attaquerMelee(s, { attaquantId: 'goule', cibleId: 'hale', mode: 'esquiver' }, des);
  s = resoudreEnAttente(s, des);
  s = passerTour(s);
  s = attaquerMelee(s, { attaquantId: 'lindqvist', cibleId: 'goule', mode: 'esquiver' }, des);
  s = resoudreEnAttente(s, des);
  s = passerTour(s); // round 4
  s = jetMourant(s, { id: 'hale' }, des);
  s = premiersSoins(s, { id: 'hale' });
  return s;
}

const desScenario = () => desScriptes({
  d100: [25, 30, { jet: 10, candidats: [10, 60], net: 1 }, 80, 20, 30, 85, 40, 60,
    30, 35, 50, 22, 12,
    40, 10, 15, 70, { jet: 8, candidats: [8, 38], net: 1 }, 60,
    40],
  lancer: [['1D8', 6], ['1D10', 4], ['1D6', 6], ['1D10', 8], ['1D6', 4], ['1D6', 5], ['+1D4', 3], ['1D6', 5]]
});

/*
 * Journal attendu des quatre rounds de la maquette rejoués avec les règles arbitrées de C1. Il est identique à celui de
 * la maquette (68 lignes) sauf quelques lignes, dues à des décisions du Manuel du Gardien :
 *  - « Disciple de Jacob Smith … est tué sur le coup » : le texte dit désormais « dégâts supérieurs aux PV max » (la mort immédiate
 *    exige des dégâts au-dessus du maximum de PV, et non plus égaux ; ici 14 contre 11, l'issue est la même) ;
 *  - « Goule s'effondre, mort » devient « Goule tombe inconscient (0 PV) » : un PNJ ou une créature à 0 PV est
 *    inconscient ou mourant, jamais mort ;
 *  - le jet de CON de blessure grave de Margaret Hale (5 → 0 PV) disparaît : à 0 PV le mourant sombre déjà dans
 *    l'inconscience, pas de jet de CON supplémentaire (Gardien p. 107-108) ;
 *  - « FOLIE PASSAGÈRE » devient « FOLIE TEMPORAIRE » (Gardien p. 140-141) ;
 *  - l'ordre du round 4 compte la goule (65), toujours en jeu puisqu'elle n'est pas morte.
 */
const JOURNAL_ATTENDU = [
  "Round 1 — ordre : Disciple de Jacob Smith (110), Margaret Hale (80), Pr Arthur Lindqvist (40)",
  "Disciple de Jacob Smith tire sur Margaret Hale (Revolver cal. 32 ; 10 m, difficulté ordinaire).",
  "Disciple de Jacob Smith — Armes de poing 40 % : 25 → Réussite ordinaire",
  "Le tir de Disciple de Jacob Smith touche Margaret Hale.",
  "Dégâts (Revolver cal. 32, 6) = 6.",
  "Margaret Hale : 11 → 5 PV — BLESSURE GRAVE.",
  "Margaret Hale — CON (blessure grave) 60 % : 30 → Réussite majeure",
  "Margaret Hale dégaine son arme (effet au prochain round).",
  "Margaret Hale tire sur Disciple de Jacob Smith (Revolver cal. 38 ; 3 m, difficulté ordinaire, bout portant).",
  "Margaret Hale — Armes de poing 60 % [1 dé(s) bonus : 10 / 60] : 10 → Réussite extrême",
  "Le tir de Margaret Hale touche Disciple de Jacob Smith.",
  "Dégâts (Revolver cal. 38, empalement : 10 max + 4) = 14.",
  "Disciple de Jacob Smith : 12 → 0 PV — BLESSURE GRAVE.",
  "Disciple de Jacob Smith est tué sur le coup (dégâts supérieurs aux PV max).",
  "Apparition : Goule ! Jets de SAN (1/1D6).",
  "Margaret Hale — SAN 65 % : 80 → Échec",
  "Margaret Hale perd 6 SAN (65 → 59 ; 6 perdus aujourd’hui sur un seuil de 13).",
  "Margaret Hale — INT (comprendre l’horreur) 70 % : 20 → Réussite majeure",
  "Margaret Hale comprend ce que ses yeux ont vu : FOLIE TEMPORAIRE (crise de 1D10 rounds).",
  "Pr Arthur Lindqvist — SAN 50 % : 30 → Réussite ordinaire",
  "Pr Arthur Lindqvist perd 1 SAN (50 → 49 ; 1 perdus aujourd’hui sur un seuil de 10).",
  "Pr Arthur Lindqvist — Bibliothèque 70 % : 85 → Échec",
  "Test redoublé — Pr Arthur Lindqvist — Bibliothèque 70 % : 40 → Réussite ordinaire",
  "Pr Arthur Lindqvist — Trouver Objet Caché 55 % : 60 → Échec",
  "Pr Arthur Lindqvist dépense 5 point(s) de Chance : Trouver Objet Caché réussi (Réussite ordinaire, Chance 55).",
  "Round 2 — ordre : Margaret Hale (130), Goule (65), Pr Arthur Lindqvist (40)",
  "Margaret Hale tire sur Goule (Revolver cal. 38 ; 12 m, difficulté ordinaire).",
  "Margaret Hale — Armes de poing 60 % : 30 → Réussite majeure",
  "Le tir de Margaret Hale touche Goule.",
  "Dégâts (Revolver cal. 38, 8) ÷ 2 (armes à feu) = 4.",
  "Goule : 13 → 9 PV.",
  "Goule attaque Pr Arthur Lindqvist (Griffes et crocs).",
  "Goule — Corps à corps 40 % : 35 → Réussite ordinaire",
  "Pr Arthur Lindqvist — Rendre les coups (Corps à corps) 30 % : 50 → Échec",
  "Pr Arthur Lindqvist dépense 35 point(s) de Chance : 50 devient 15 → Réussite majeure (Chance 20).",
  "Pr Arthur Lindqvist rend les coups et touche Goule !",
  "Dégâts (Batte de baseball, 4) = 4.",
  "Goule : 9 → 5 PV.",
  "Pr Arthur Lindqvist attaque Goule (Batte de baseball).",
  "Pr Arthur Lindqvist — Corps à corps 30 % : 22 → Réussite ordinaire",
  "Goule — Esquiver (Esquive) 35 % : 12 → Réussite majeure",
  "Goule esquive l’attaque de Pr Arthur Lindqvist.",
  "Round 3 — ordre : Margaret Hale (130), Goule (65), Pr Arthur Lindqvist (40)",
  "Margaret Hale attaque Goule (Poignard).",
  "Margaret Hale — Corps à corps 45 % : 40 → Réussite ordinaire",
  "Goule — Esquiver (Esquive) 35 % : 10 → Réussite majeure",
  "Goule esquive l’attaque de Margaret Hale.",
  "Goule attaque Margaret Hale (Griffes et crocs).",
  "Goule — Corps à corps 40 % : 15 → Réussite majeure",
  "Margaret Hale — Esquiver (Esquive) 50 % : 70 → Échec",
  "Goule touche Margaret Hale.",
  "Dégâts (Griffes et crocs, 5 + Impact 3) = 8.",
  "Margaret Hale : 5 → 0 PV — BLESSURE GRAVE.",
  "Margaret Hale est MOURANT : jet de CON à chaque round jusqu’aux premiers soins.",
  "Pr Arthur Lindqvist attaque Goule (Batte de baseball) — surnombre : +1 dé bonus.",
  "Pr Arthur Lindqvist — Corps à corps 30 % [1 dé(s) bonus : 8 / 38] : 08 → Réussite majeure",
  "Goule — Esquiver (Esquive) 35 % : 60 → Échec",
  "Pr Arthur Lindqvist touche Goule.",
  "Dégâts (Batte de baseball, 5) = 5.",
  "Goule : 5 → 0 PV.",
  "Goule tombe inconscient (0 PV).",
  "Round 4 — ordre : Margaret Hale (130), Goule (65), Pr Arthur Lindqvist (40)",
  "Margaret Hale — CON (mourant) 60 % : 40 → Réussite ordinaire",
  "Margaret Hale s’accroche à la vie.",
  "Margaret Hale est stabilisé (1 PV, inconscient)."
];

test('scénario de la maquette (quatre rounds), profils saisis : journal attendu et état final', () => {
  const des = desScenario();
  const s = scenarioMaquette(des);
  assert.deepEqual(textes(s), JOURNAL_ATTENDU);
  assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  assert.equal(s.round, 4);
  const etat = id => { const p = participant(s, id); return [p.etat, p.pv]; };
  assert.deepEqual(etat('hale'), ['inconscient', 1]);
  assert.deepEqual(etat('lindqvist'), ['actif', 10]);
  assert.deepEqual(etat(DISCIPLE), ['mort', 0]);
  assert.deepEqual(etat('goule'), ['inconscient', 0]);
  const hale = participant(s, 'hale');
  assert.deepEqual([hale.san, hale.folie, hale.chance], [59, 'temporaire', 70]);
  assert.deepEqual([participant(s, 'lindqvist').san, participant(s, 'lindqvist').chance], [49, 20]);
  assert.equal(hale.munitions, 6); // revolver .38 du tableau : 8 coups, deux tirs
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s, 'état sérialisable');
});

// --- Un investigateur garde son état d'une rencontre à l'autre -----------------------------------------------------------

test('un investigateur garde PV, SAN, Chance, folie et blessure grave d’une rencontre à l’autre ; les autres repartent à neuf', () => {
  const reserve = reserveMaquette();
  const fin = scenarioMaquette(desScenario(), reserve);
  const apres = reporterSurReserve(reserve, fin);
  assert.deepEqual(trouverProfil(apres, 'hale').suivi, {
    pv: 1, blessureGrave: true, etat: 'inconscient', san: 59, journeeSan: { sanDebut: 65, perteJour: 6, persistanteDeclenchee: false }, folie: 'temporaire', chance: 70
  });
  assert.equal(trouverProfil(apres, 'lindqvist').suivi.chance, 20);
  assert.equal(trouverProfil(apres, 'goule').suivi, null);
  assert.equal(trouverProfil(reserve, 'hale').suivi, null, 'réserve d’origine intacte');
  assert.deepEqual(JSON.parse(JSON.stringify(apres)), apres);

  const suite = composerRencontre(apres, ['hale', 'lindqvist', 'goule']);
  const h = participant(suite, 'hale'), l = participant(suite, 'lindqvist'), g = participant(suite, 'goule');
  assert.deepEqual([h.pv, h.pvMax, h.etat, h.blessureGrave, h.san, h.folie, h.chance], [1, 11, 'inconscient', true, 59, 'temporaire', 70]);
  assert.deepEqual([h.journeeSan.perteJour, l.san, l.chance, l.pv], [6, 49, 20, 10]);
  assert.deepEqual([g.pv, g.etat], [13, 'actif']);
});

// --- Égalité parfaite au test opposé -----------------------------------------------------------------------------------------

function pairePourOppose() {
  let r = reserveMaquette();
  r = modifierProfil(r, DISCIPLE, { carac: { FOR: 60 } });
  r = modifierProfil(r, 'lindqvist', { carac: { FOR: 60 } });
  return composerRencontre(r, ['lindqvist', DISCIPLE]);
}

test('égalité parfaite : pas de vainqueur, l’issue reste au Gardien et l’état l’expose', () => {
  const des = desScriptes({ d100: [40, 40] }); // FOR 60 contre FOR 60, même niveau, même valeur
  let s = testOppose(pairePourOppose(), { aId: 'lindqvist', aCompetence: 'FOR', bId: DISCIPLE, bCompetence: 'FOR' }, des);
  assert.equal(s.enAttente.type, 'egalite');
  assert.equal(s.dernierOppose.vainqueur, null);
  assert.equal(s.dernierOppose.egalite, true);
  const d = decisionEgalite(s);
  assert.deepEqual(d.issues.map(i => i.id), ['nul', 'relance']);
  assert.equal(d.a.id, 'lindqvist');
  assert.equal(d.b.jet, 40);
  assert.ok(textes(s).some(t => /Égalité parfaite : aucun vainqueur/.test(t)));
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s, 'l’attente est sérialisable');
  // tant que le Gardien n'a pas choisi, rien d'autre ne se joue
  const refuse = passerTour(s);
  assert.equal(refuse.indexTour, s.indexTour);
  assert.equal(refuse.enAttente.type, 'egalite');
  assert.equal(refuse.journal.at(-1).type, 'erreur');
  assert.equal(resoudreEnAttente(s, des).enAttente.type, 'egalite');
  assert.equal(trancherEgalite(passerTour(s), { issue: 'peut-etre' }, des).enAttente.type, 'egalite');
});

test('égalité parfaite, match nul : l’attente disparaît, personne ne gagne', () => {
  const des = desScriptes({ d100: [40, 40] });
  let s = testOppose(pairePourOppose(), { aId: 'lindqvist', aCompetence: 'FOR', bId: DISCIPLE, bCompetence: 'FOR' }, des);
  s = trancherEgalite(s, { issue: 'nul' }, des);
  assert.equal(s.enAttente, null);
  assert.equal(decisionEgalite(s), null);
  assert.equal(s.dernierOppose.vainqueur, null);
  assert.equal(s.dernierOppose.issue, 'nul');
  assert.match(s.journal.at(-1).texte, /match nul/);
  assert.equal(trancherEgalite(s, { issue: 'nul' }, des).journal.at(-1).type, 'erreur', 'plus d’égalité à trancher');
});

test('égalité parfaite, relance : les deux camps rejettent ; une nouvelle égalité attend encore le Gardien', () => {
  const des = desScriptes({ d100: [40, 40, 40, 40, 20, 50] });
  let s = testOppose(pairePourOppose(), { aId: 'lindqvist', aCompetence: 'FOR', bId: DISCIPLE, bCompetence: 'FOR' }, des);
  s = trancherEgalite(s, { issue: 'relance' }, des); // 40 / 40 : encore à égalité
  assert.equal(s.enAttente.type, 'egalite');
  assert.ok(textes(s).some(t => /Relance — Test opposé/.test(t)));
  s = trancherEgalite(s, { issue: 'relance' }, des); // 20 contre 50 : Lindqvist l'emporte
  assert.equal(s.enAttente, null);
  assert.equal(s.dernierOppose.vainqueur, 'lindqvist');
  assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
});

test('test opposé sans égalité : le meilleur niveau gagne, deux échecs sans vainqueur, valeur inconnue signalée', () => {
  let s = testOppose(pairePourOppose(), { aId: 'lindqvist', aCompetence: 'FOR', bId: DISCIPLE, bCompetence: 'FOR' }, desScriptes({ d100: [10, 40] }));
  assert.equal(s.dernierOppose.vainqueur, 'lindqvist');
  assert.equal(s.enAttente, null);
  s = testOppose(pairePourOppose(), { aId: 'lindqvist', aCompetence: 'FOR', bId: DISCIPLE, bCompetence: 'FOR' }, desScriptes({ d100: [90, 80] }));
  assert.equal(s.dernierOppose.vainqueur, null);
  assert.equal(s.dernierOppose.aucun, true);
  s = testOppose(pairePourOppose(), { aId: 'lindqvist', aCompetence: 'Pilotage', bId: DISCIPLE, bCompetence: 'FOR' }, desScriptes());
  assert.equal(s.journal.at(-1).type, 'erreur');
});

// --- Décisions du Manuel du Gardien dans la rencontre ----------------------------------------------------------------------

test('PNJ et créature à 0 PV : inconscients ou mourants, pas morts ; dégâts supérieurs aux PV max : mort immédiate', () => {
  const reserve = reserveMaquette();
  // Cible : le disciple ramené à 10 PV max. Hale (Armes de poing 60) lui tire dessus ; `degats` est le jet de 1D10 scripté.
  const tireSurDisciple = (degats, d100) => {
    const des = desScriptes({ d100, lancer: [['1D10', degats]] });
    let s = composerRencontre(reserve, ['hale', DISCIPLE]);
    s = { ...s, participants: s.participants.map(p => (p.id === DISCIPLE ? { ...p, pv: 10, pvMax: 10 } : p)) };
    s = tirer(s, { tireurId: 'hale', cibleId: DISCIPLE, distance: 12 }, des);
    return resoudreEnAttente(s, des);
  };
  // 10 dégâts sur 10 PV : 0 PV, blessure grave → mourant, sans jet de CON de plus (Gardien p. 107-108) ; jamais mort.
  const egal = participant(tireSurDisciple(10, [50]), DISCIPLE);
  assert.deepEqual([egal.pv, egal.etat, egal.blessureGrave], [0, 'mourant', true]);
  // 11 dégâts sur 10 PV max : mort sur le coup.
  const trop = tireSurDisciple(11, [50]);
  assert.equal(participant(trop, DISCIPLE).etat, 'mort');
  assert.match(trop.journal.at(-1).texte, /tué sur le coup \(dégâts supérieurs aux PV max\)/);
  // 4 dégâts sur 10 PV : blessé, pas de blessure grave, toujours actif.
  const leger = participant(tireSurDisciple(4, [50]), DISCIPLE);
  assert.deepEqual([leger.pv, leger.etat, leger.blessureGrave], [6, 'actif', false]);
});

test('un mourant n’a plus de tour : il sombre dans l’inconscience (Gardien p. 107 et p. 108), seul son jet de CON se joue', () => {
  // Le livre : à 0 PV le personnage « sombre dans l’inconscience » ; mourant, il « sombre immédiatement dans
  // l’inconscience » et ne fait qu’un test de CON à la fin de chaque round. Il n'a donc pas d'action à jouer.
  const avecMourant = reserve => {
    const s = composerRencontre(reserve, ['hale', 'lindqvist']);
    return { ...s, participants: s.participants.map(p => (p.id === 'hale' ? { ...p, pv: 0, blessureGrave: true, etat: 'mourant' } : p)) };
  };
  const hale = avecMourant(reserveMaquette()).participants[0];
  assert.equal(peutAgir(hale), false, 'un mourant ne peut pas agir');
  assert.equal(peutAgir({ ...hale, etat: 'inconscient' }), false, 'pas plus qu’un inconscient');
  assert.equal(peutAgir({ ...hale, etat: 'actif' }), true);
  // Hale (DEX 80) passerait la première : mourante, elle est sautée et c'est Lindqvist (DEX 40) qui joue.
  let s = commencerRound(avecMourant(reserveMaquette()));
  assert.equal(acteurCourant(s).id, 'lindqvist');
  assert.match(textes(s)[0], /^Round 1 — ordre : Margaret Hale \(80\), Pr Arthur Lindqvist \(40\)$/, 'elle reste en jeu : son jet de CON se fait à la fin du round');
  // Fin du round : le round suivant recommence de la même façon, et le jet de CON du mourant reste possible hors tour.
  s = passerTour(s);
  assert.equal(s.round, 2);
  assert.equal(acteurCourant(s).id, 'lindqvist');
  s = jetMourant(s, { id: 'hale' }, desScriptes({ d100: [40] }));
  assert.equal(participant(s, 'hale').etat, 'mourant');
  s = jetMourant(s, { id: 'hale' }, desScriptes({ d100: [90] }));
  assert.equal(participant(s, 'hale').etat, 'mort', 'un jet de CON raté : le mourant meurt sur-le-champ');
});

test('bout portant en mètres (DEX ÷ 10) : DEX 80 donne un dé bonus à 8 m, pas à 8,5 m', () => {
  const reserve = reserveMaquette();
  const a = tirer(commencerRound(composerRencontre(reserve, ['hale', DISCIPLE])), { tireurId: 'hale', cibleId: DISCIPLE, distance: 8 },
    desScriptes({ d100: [{ jet: 30, candidats: [30, 50], net: 1 }] }));
  assert.match(textes(a).at(-2), /bout portant/);
  const b = tirer(commencerRound(composerRencontre(reserve, ['hale', DISCIPLE])), { tireurId: 'hale', cibleId: DISCIPLE, distance: 8.5 },
    desScriptes({ d100: [30] }));
  assert.doesNotMatch(textes(b).at(-2), /bout portant/);
});

test('très longue portée : l’empalement exige un 01, une réussite extrême donne seulement le maximum', () => {
  const reserve = reserveDeDepart();
  let r = ajouterProfil(reserve, { nom: 'Cible', kind: 'PNJ', carac: { FOR: 50, CON: 150, TAI: 150, DEX: 50, INT: 50, POU: 50 }, competences: {} });
  // Disciple de Jacob Smith : Armes de poing 40 %, revolver .32 (1D8), portée 15 m ; à 40 m (entre ×2 et ×4) seule une réussite extrême (≤ 8) touche.
  // Réussite extrême (5 ≤ 8) qui n'est pas un 01 : dégâts ordinaires, le 1D8 est jeté (Gardien p. 404 ; empalement sur 01, p. 100).
  const extreme = desScriptes({ d100: [5], lancer: [['1D8', 4]] });
  let s = tirer(composerRencontre(r, [DISCIPLE, 'cible']), { tireurId: DISCIPLE, cibleId: 'cible', distance: 40 }, extreme);
  s = resoudreEnAttente(s, extreme);
  assert.ok(textes(s).some(x => /Dégâts \(Revolver cal\. 32, 4\) = 4/.test(x)));
  assert.equal(participant(s, 'cible').pv, participant(s, 'cible').pvMax - 4);
  assert.deepEqual(extreme.restants(), { d100: 0, lancer: 0 });
  const critique = desScriptes({ d100: [1, 10], lancer: [['1D8', 7]] }); // 01 : empalement, puis jet de CON (blessure grave)
  let t = tirer(composerRencontre(r, [DISCIPLE, 'cible']), { tireurId: DISCIPLE, cibleId: 'cible', distance: 40 }, critique);
  t = resoudreEnAttente(t, critique);
  assert.ok(textes(t).some(x => /empalement : 8 max \+ 7\) = 15/.test(x)));
});

test('folie persistante : le cumul de la journée se mesure sur la SAN d’avant chaque perte', () => {
  let r = reserveMaquette();
  r = modifierProfil(r, 'lindqvist', { suivi: { pv: 10, blessureGrave: false, etat: 'actif', san: 50, journeeSan: { sanDebut: 50, perteJour: 0, persistanteDeclenchee: false }, folie: null, chance: 60 } });
  let s = composerRencontre(r, ['lindqvist']);
  // Première perte : 6 (seuil 10, pas de folie persistante) ; le jet d'INT (≥ 5 d'un coup) est raté.
  s = jetSan(s, { id: 'lindqvist', cout: '1/1D6' }, desScriptes({ d100: [90, 90], lancer: [['1D6', 6]] }));
  assert.equal(participant(s, 'lindqvist').folie, null);
  // Seconde perte : 2 ; cumul 8 contre 1/5 de la SAN d'avant la perte (44 → 8) : folie persistante.
  s = jetSan(s, { id: 'lindqvist', cout: '1/1D6' }, desScriptes({ d100: [90], lancer: [['1D6', 2]] }));
  const p = participant(s, 'lindqvist');
  assert.deepEqual([p.san, p.folie, p.journeeSan.perteJour, p.journeeSan.persistanteDeclenchee], [42, 'persistante', 8, true]);
  assert.match(s.journal.at(-1).texte, /FOLIE PERSISTANTE/);
  // Le seuil affiché est 1/5 de la SAN juste avant la perte (44 → 8), pas 1/5 de la SAN de début de journée (50 → 10).
  assert.ok(textes(s).some(t => /perd 2 SAN \(44 → 42 ; 8 perdus aujourd’hui sur un seuil de 8\)\./.test(t)), textes(s).at(-2));
});

// --- Données de départ : la goule du Manuel du Gardien ---------------------------------------------------------------------

test('goule du livre : trois défenses avant le surnombre, alerte au-delà de trois attaques, SAN 0/1D6', () => {
  let r = reserveDeDepart();
  r = ajouterProfil(r, { nom: 'Harvey', kind: 'PJ', carac: { FOR: 60, CON: 60, TAI: 60, DEX: 55, APP: 50, INT: 70, POU: 60, EDU: 60 }, chance: 50,
    competences: { 'Corps à corps': 40, Esquive: 50 }, armeMelee: 'gourdin-grand' });
  let s = commencerRound(composerRencontre(r, ['harvey', 'goule']));
  const attaquer = (de, vers, d100) => attaquerMelee(s, { attaquantId: de, cibleId: vers, mode: 'esquiver' }, desScriptes({ d100 }));
  // Harvey attaque trois fois la goule (3 défenses par round) : pas de surnombre aux deux premières, dé bonus à la quatrième.
  for (let i = 0; i < 3; i++) {
    s = attaquer('harvey', 'goule', [90, 5]);
    assert.doesNotMatch(s.journal.at(-3).texte, /surnombre/, `attaque ${i + 1}`);
    s = { ...s, enAttente: null };
  }
  assert.equal(participant(s, 'goule').defensesRound, 3);
  s = attaquer('harvey', 'goule', [{ jet: 90, candidats: [90, 95], net: 1 }, 5]);
  assert.match(s.journal.at(-3).texte, /surnombre : \+1 dé bonus/);
  // La goule a trois attaques par round : la quatrième est signalée, pas refusée.
  s = { ...s, enAttente: null };
  // (Harvey, qui n'a qu'une défense par round, donne dès la deuxième attaque un dé bonus à la goule.)
  for (let i = 0; i < 4; i++) {
    s = attaquer('goule', 'harvey', [i === 0 ? 90 : { jet: 90, candidats: [90, 95], net: 1 }, 5]);
    s = { ...s, enAttente: null };
  }
  assert.equal(s.journal.filter(j => /dépasse ses 3 attaque/.test(j.texte)).length, 1);
  // Jet de SAN réussi à la vue d'une goule : 0 perdu.
  const avecCache = composerRencontre(r, ['harvey', { id: 'goule', cachee: true }]);
  const vu = revelerCreature(avecCache, { id: 'goule' }, desScriptes({ d100: [30] }));
  assert.equal(participant(vu, 'harvey').san, 60);
  assert.match(vu.journal.at(-1).texte, /perd 0 SAN/);
  // Armes à feu : moitié des dégâts.
  const feu = desScriptes({ d100: [50], lancer: [['1D10', 9]] });
  let t = composerRencontre(ajouterProfil(r, { nom: 'Tireur', kind: 'PNJ', carac: { FOR: 50, CON: 50, TAI: 50, DEX: 50, INT: 50, POU: 50 },
    competences: { 'Armes de poing': 60 }, armeTir: 'revolver-38' }), ['tireur', 'goule']);
  t = tirer(t, { tireurId: 'tireur', cibleId: 'goule', distance: 10 }, feu);
  t = resoudreEnAttente(t, feu);
  assert.equal(participant(t, 'goule').pv, 13 - 4);
});

test('une rencontre de départ se joue : disciple de Jacob Smith (Aventures effroyables p. 129) contre un investigateur, tour par tour', () => {
  let r = reserveDeDepart();
  r = ajouterProfil(r, { nom: 'Harvey', kind: 'PJ', carac: { FOR: 60, CON: 60, TAI: 60, DEX: 55, APP: 50, INT: 70, POU: 60, EDU: 60 }, chance: 50,
    competences: { 'Corps à corps': 40, Esquive: 50 }, armeMelee: 'gourdin-grand' });
  let s = commencerRound(composerRencontre(r, ['harvey', DISCIPLE]));
  assert.equal(acteurCourant(s).id, DISCIPLE); // DEX 60 contre 55 (revolver non prêt : pas de +50)
  const des = desScriptes({ d100: [30, 40], lancer: [['1D8', 7]] });
  s = tirer(s, { tireurId: DISCIPLE, cibleId: 'harvey', distance: 8 }, des);
  s = resoudreEnAttente(s, des);
  assert.equal(participant(s, 'harvey').pv, 5); // PV max (60 + 60) ÷ 10 = 12, moins 7
  assert.equal(participant(s, DISCIPLE).munitions, 5); // revolver .32 : 6 coups
});

test('apparition d’une créature : seuls les investigateurs conscients jettent la SAN (un inconscient ou un mourant ne voit rien, Gardien p. 107-108)', () => {
  const carac = { FOR: 50, CON: 50, TAI: 50, DEX: 50, APP: 50, INT: 50, POU: 60, EDU: 50 };
  let r = reserveDeDepart();
  for (const nom of ['Alice', 'Bruno', 'Cécile']) r = ajouterProfil(r, { nom, kind: 'PJ', carac, chance: 50, competences: { 'Corps à corps': 40, Esquive: 40 } });
  let s = composerRencontre(r, ['alice', 'bruno', 'cecile', { id: 'goule', cachee: true }]);
  const etat = (id, etat) => { s = { ...s, participants: s.participants.map(p => (p.id === id ? { ...p, etat } : p)) }; };
  etat('bruno', 'inconscient');
  etat('cecile', 'mourant');
  const des = desScriptes({ d100: [30] }); // un seul jet de SAN scripté : tout autre jet ferait échouer le test
  const vu = revelerCreature(s, { id: 'goule' }, des);
  assert.deepEqual(des.restants(), { d100: 0, lancer: 0 });
  assert.equal(vu.journal.filter(j => /— SAN /.test(j.texte)).length, 1);
  assert.match(vu.journal.find(j => /— SAN /.test(j.texte)).texte, /^Alice — SAN/);
  for (const id of ['bruno', 'cecile']) assert.equal(participant(vu, id).san, participant(s, id).san, `${id} ne perd rien`);
  assert.deepEqual(participant(vu, 'bruno').aVu, {}, 'il n’a pas vu la créature');
});

test('personne ne peut agir : le round commence puis s’arrête avec une note, sans boucle ni récursion sans fin', () => {
  const sombres = reserve => {
    const s = composerRencontre(reserve, ['hale', 'lindqvist']);
    return { ...s, participants: s.participants.map(p => ({ ...p, pv: 0, etat: p.id === 'hale' ? 'mourant' : 'inconscient' })) };
  };
  let s;
  assert.doesNotThrow(() => { s = commencerRound(sombres(reserveMaquette())); }, 'aucune récursion sans fin au début du round');
  assert.equal(s.round, 1, 'un seul round est ouvert');
  assert.equal(acteurCourant(s), null, 'personne n’a la main');
  assert.equal(s.indexTour, s.ordre.length, 'le round est terminé');
  assert.match(textes(s).at(-1), /^Aucun participant ne peut agir/);
  // Passer le tour fait avancer d'un seul round à la fois : le jet de CON d'un mourant reste possible, les rounds restent comptés.
  assert.doesNotThrow(() => { s = passerTour(s); });
  assert.equal(s.round, 2);
  assert.equal(acteurCourant(s), null);
  // Quelqu'un se réveille : le round suivant le met à la main.
  s = { ...s, participants: s.participants.map(p => (p.id === 'lindqvist' ? { ...p, etat: 'actif', pv: 3 } : p)) };
  s = passerTour(s);
  assert.equal(s.round, 3);
  assert.equal(acteurCourant(s)?.id, 'lindqvist');
}, { timeout: 5000 });

// --- M2 : compétences d'arme requises, gardes d'état, recharger, redoublement avec dés nets ----------------------

const CARAC_HUMAIN = { FOR: 50, CON: 60, TAI: 60, DEX: 60, APP: 50, INT: 70, POU: 60, EDU: 60 };

function reserveCompetences() {
  let r = creerReserve();
  r = ajouterArme(r, { id: 'machette', nom: 'Machette', competence: 'Machette', des: '1D8', empalante: true, aImpact: true, type: 'melee' });
  r = ajouterArme(r, ARMES_DEPART['revolver-32']);
  r = ajouterProfil(r, { nom: 'Alice', kind: 'PJ', carac: CARAC_HUMAIN, chance: 50,
    competences: { Machette: 50, Esquive: 40, 'Armes de poing': 60 }, armeMelee: 'machette', armeTir: 'revolver-32' });
  r = ajouterProfil(r, { nom: 'Bruno', kind: 'PNJ', carac: CARAC_HUMAIN, competences: { Esquive: 30 }, armeMelee: 'machette' }); // pas de Machette
  r = ajouterProfil(r, { nom: 'Cécile', kind: 'PNJ', carac: CARAC_HUMAIN, competences: { Machette: 40, 'Armes de poing': 30 }, armeMelee: 'machette' }); // pas d'Esquive
  r = ajouterProfil(r, { nom: 'David', kind: 'PNJ', carac: CARAC_HUMAIN, competences: { Machette: 40 }, armeMelee: null, armeTir: 'revolver-32' }); // pas d'Armes de poing
  return r;
}

test('mêlée : la compétence de l’arme (champ arme.competence) est jetée et nommée dans le journal', () => {
  let s = composerRencontre(reserveCompetences(), ['alice', 'cecile']);
  s = attaquerMelee(s, { attaquantId: 'alice', cibleId: 'cecile', mode: 'aucune' }, desScriptes({ d100: [30] }));
  assert.match(textes(s).at(-1), /Alice — Machette 50 % : 30 →/);
  assert.equal(participant(s, 'alice').attaquesRound, 1);
});

test('mêlée : compétence d’attaque ou de défense absente → erreur, sans consommer d’attaque ni de défense', () => {
  let s = composerRencontre(reserveCompetences(), ['bruno', 'cecile']);
  s = attaquerMelee(s, { attaquantId: 'bruno', cibleId: 'cecile', mode: 'esquiver' }, desScriptes());
  assert.equal(s.journal.at(-1).type, 'erreur');
  assert.equal(s.journal.at(-1).texte, 'Bruno n’a pas de valeur pour « Machette ».');
  assert.equal(s.enAttente, null);
  assert.equal(participant(s, 'bruno').attaquesRound, 0, 'aucune attaque consommée');
  assert.equal(participant(s, 'cecile').defensesRound, 0, 'aucune défense consommée');
  // Côté défense : Cécile n'a pas Esquive.
  let s2 = composerRencontre(reserveCompetences(), ['alice', 'cecile']);
  s2 = attaquerMelee(s2, { attaquantId: 'alice', cibleId: 'cecile', mode: 'esquiver' }, desScriptes());
  assert.equal(s2.journal.at(-1).type, 'erreur');
  assert.equal(s2.journal.at(-1).texte, 'Cécile n’a pas de valeur pour « Esquive ».');
  assert.equal(participant(s2, 'alice').attaquesRound, 0, 'aucune attaque consommée');
  assert.equal(participant(s2, 'cecile').defensesRound, 0, 'aucune défense consommée');
});

test('tir : compétence de l’arme requise ; sans elle, erreur sans consommer de munition ni d’attaque', () => {
  let s = composerRencontre(reserveCompetences(), ['david', 'alice']);
  s = tirer(s, { tireurId: 'david', cibleId: 'alice', distance: 10 }, desScriptes());
  assert.equal(s.journal.at(-1).type, 'erreur');
  assert.equal(s.journal.at(-1).texte, 'David n’a pas de valeur pour « Armes de poing ».');
  assert.equal(s.enAttente, null);
  assert.equal(participant(s, 'david').munitions, 6, 'munitions intactes');
  assert.equal(participant(s, 'david').attaquesRound, 0, 'aucune attaque consommée');
});

test('gardes d’état : jetMourant exige un participant mourant, premiersSoins refuse un mort ou un inconnu', () => {
  let s = composerRencontre(reserveMaquette(), ['hale', 'lindqvist']);
  let r = jetMourant(s, { id: 'hale' }, desScriptes());
  assert.equal(r.journal.at(-1).type, 'erreur');
  assert.match(r.journal.at(-1).texte, /pas mourant/);
  assert.equal(participant(r, 'hale').etat, 'actif');
  assert.equal(jetMourant(s, { id: 'inconnu' }, desScriptes()).journal.at(-1).type, 'erreur');
  assert.equal(premiersSoins(s, { id: 'inconnu' }).journal.at(-1).type, 'erreur');
  const mort = { ...s, participants: s.participants.map(p => (p.id === 'hale' ? { ...p, etat: 'mort' } : p)) };
  r = premiersSoins(mort, { id: 'hale' });
  assert.equal(r.journal.at(-1).type, 'erreur');
  assert.match(r.journal.at(-1).texte, /mort/);
  assert.equal(participant(r, 'hale').etat, 'mort');
});

test('une égalité en attente bloque aussi jetMourant, premiersSoins, revelerCreature, jetSan, testLibre, redoublerDernierTest et chanceSurDernierTest', () => {
  const des = desScriptes({ d100: [40, 40] });
  const s = testOppose(pairePourOppose(), { aId: 'lindqvist', aCompetence: 'FOR', bId: DISCIPLE, bCompetence: 'FOR' }, des);
  assert.equal(s.enAttente.type, 'egalite');
  const actions = [
    ['jetMourant', () => jetMourant(s, { id: 'lindqvist' }, desScriptes())],
    ['premiersSoins', () => premiersSoins(s, { id: 'lindqvist' })],
    ['revelerCreature', () => revelerCreature(s, { id: DISCIPLE }, desScriptes())],
    ['jetSan', () => jetSan(s, { id: 'lindqvist', cout: '1/1D6' }, desScriptes())],
    ['testLibre', () => testLibre(s, { id: 'lindqvist', competence: 'Bibliothèque' }, desScriptes())],
    ['redoublerDernierTest', () => redoublerDernierTest(s, desScriptes())],
    ['chanceSurDernierTest', () => chanceSurDernierTest(s)]
  ];
  for (const [nom, action] of actions) {
    const r = action();
    assert.equal(r.enAttente?.type, 'egalite', `${nom} laisse l’égalité en attente`);
    assert.equal(r.journal.at(-1).type, 'erreur', `${nom} note une erreur`);
    assert.match(r.journal.at(-1).texte, /égalité/i, nom);
  }
});

test('recharger : au plus deux munitions par appel, sans dépasser la capacité ; changement de chargeur à pleine capacité (Gardien p. 100)', () => {
  // p. 100 : charger deux balles prend 1 round ; changer un chargeur prend 1 round.
  let s = composerRencontre(reserveMaquette(), ['hale', DISCIPLE]);
  s = { ...s, participants: s.participants.map(p => (p.id === 'hale' ? { ...p, munitions: 5 } : p)) };
  s = recharger(s, { id: 'hale' });
  assert.equal(participant(s, 'hale').munitions, 7);
  assert.match(s.journal.at(-1).texte, /Margaret Hale recharge Revolver cal\. 38 \(7\/8\) — deux balles, 1 round \(Gardien p\. 100\)\./);
  s = recharger(s, { id: 'hale' });
  assert.equal(participant(s, 'hale').munitions, 8, 'sans dépasser la capacité (8)');
  assert.equal(recharger(s, { id: 'hale' }).journal.at(-1).type, 'erreur', 'chargeur plein : refus');
  // 2 munitions manquantes, une seule restante : on complète sans dépasser.
  s = { ...s, participants: s.participants.map(p => (p.id === 'hale' ? { ...p, munitions: 7 } : p)) };
  s = recharger(s, { id: 'hale' });
  assert.equal(participant(s, 'hale').munitions, 8);
  // Changement de chargeur : pleine capacité en un appel, 1 round (p. 100).
  s = { ...s, participants: s.participants.map(p => (p.id === 'hale' ? { ...p, munitions: 2 } : p)) };
  s = recharger(s, { id: 'hale', chargeur: true });
  assert.equal(participant(s, 'hale').munitions, 8);
  assert.match(s.journal.at(-1).texte, /changement de chargeur, 1 round \(Gardien p\. 100\)\./);
});

test('recharger : refus (note « erreur ») si participant inconnu, mort, sans arme à feu, ou pendant une égalité en attente', () => {
  let s = composerRencontre(reserveMaquette(), ['hale', 'lindqvist']);
  assert.equal(recharger(s, { id: 'inconnu' }).journal.at(-1).type, 'erreur');
  let r = recharger(s, { id: 'lindqvist' }); // lindqvist n'a pas d'arme à feu
  assert.equal(r.journal.at(-1).type, 'erreur');
  assert.match(r.journal.at(-1).texte, /pas d’arme à feu/);
  const mort = { ...s, participants: s.participants.map(p => (p.id === 'lindqvist' ? { ...p, etat: 'mort' } : p)) };
  assert.equal(recharger(mort, { id: 'lindqvist' }).journal.at(-1).type, 'erreur');
  const eg = testOppose(pairePourOppose(), { aId: 'lindqvist', aCompetence: 'FOR', bId: DISCIPLE, bCompetence: 'FOR' }, desScriptes({ d100: [40, 40] }));
  r = recharger(eg, { id: DISCIPLE });
  assert.equal(r.journal.at(-1).type, 'erreur');
  assert.equal(r.enAttente.type, 'egalite', 'l’égalité reste en attente');
  assert.equal(participant(r, DISCIPLE).munitions, 6, 'rien n’a changé');
});

test('redoubler conserve les dés bonus/malus du test d’origine', () => {
  let s = composerRencontre(reserveMaquette(), ['lindqvist']);
  s = testLibre(s, { id: 'lindqvist', competence: 'Bibliothèque', bonus: 1 }, desScriptes({ d100: [{ jet: 90, candidats: [90, 95], net: 1 }] }));
  assert.equal(s.dernierTest.reussi, false);
  assert.equal(s.dernierTest.net, 1);
  s = redoublerDernierTest(s, desScriptes({ d100: [{ jet: 40, candidats: [40, 10], net: 1 }] })); // le d100 repart avec 1 dé bonus
  assert.equal(s.dernierTest.reussi, true);
  assert.equal(s.dernierTest.redouble, true);
  assert.match(textes(s).at(-1), /Test redoublé — Pr Arthur Lindqvist — Bibliothèque 70 % \[1 dé\(s\) bonus : 40 \/ 10\]/);
});
