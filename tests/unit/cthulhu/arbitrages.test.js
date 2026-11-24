// Cthulhu 7e : les 12 règles laissées ouvertes par la maquette (spec §4, Q8), tranchées d'après le Manuel du Gardien.
// Chaque cas cite la page imprimée du Manuel du Gardien (USB_V7-GARDIEN.pdf ; page imprimée = page du PDF − 2).
// Règles 10 et 11 : le livre ne les tranche pas, le MJ a décidé (réponse du 18/11/2026, citée dans chaque cas).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  NIVEAU, TYPE_TEST, niveauDuJet, depenseChance, peutRedoubler, appliquerBlessure, ordreDex, distanceBoutPortant,
  preparerTir, resoudreMelee, calculerDegats, defensesPossibles, desBonusSurnombre, perteSan, appliquerPerteSan,
  nouvelleJourneeSan, foliePassagere, resoudreTestOppose, ISSUES_EGALITE
} from '../../../cthulhu/regles.js';

const fixe = valeurs => e => valeurs[e];

// --- 1. Maladresse sous 50 : le seuil de réussite de la difficulté demandée ---------------------------------------

test('Q8-1 · maladresse : le seuil de la difficulté demandée décide (96-100 sous 50), pas la valeur de la compétence', () => {
  // Gardien p. 79 : le plancher de maladresse se lit sur le seuil de réussite de la difficulté demandée ; exemple
  // p. 79 : Bibliothèque 55 % en test majeur (seuil 27), maladresse dès 96.
  assert.equal(niveauDuJet(96, 55, { difficulte: 'ordinaire' }), NIVEAU.ECHEC);
  assert.equal(niveauDuJet(100, 55, { difficulte: 'ordinaire' }), NIVEAU.MALADRESSE);
  assert.equal(niveauDuJet(96, 55, { difficulte: 'majeure' }), NIVEAU.MALADRESSE);
  // p. 80 (tests opposés) : le seuil doit être strictement inférieur à 50.
  assert.equal(niveauDuJet(96, 50), NIVEAU.ECHEC);
  assert.equal(niveauDuJet(96, 49), NIVEAU.MALADRESSE);
});

// --- 2. Chance : combat et tests opposés, achat Majeure/Extrême, interdite après un redoublement --------------------

test('Q8-2 · Chance : autorisée sur un jet de combat et un test opposé', () => {
  // p. 86-87 : la Chance s’applique à tout test de compétence ou de caractéristique, sauf Chance, SAN, dégâts et perte
  // de SAN ; l’exemple de la p. 87 dépense de la Chance sur une Esquive contre une attaque extrême.
  const base = { jet: 73, valeur: 60, niveau: NIVEAU.ECHEC, chance: 80 };
  assert.equal(depenseChance({ ...base, typeTest: TYPE_TEST.COMBAT }).autorise, true);
  assert.equal(depenseChance({ ...base, typeTest: TYPE_TEST.OPPOSE }).autorise, true);
});

test('Q8-2 · Chance : on peut acheter une réussite Majeure ou Extrême, au taux de 1 pour 1', () => {
  // p. 86 : on peut altérer le résultat au taux de 1 pour 1 ; p. 87 : jusqu'à la valeur actuelle de Chance.
  const majeure = depenseChance({ jet: 73, valeur: 60, difficulte: 'majeure', niveau: NIVEAU.ECHEC, chance: 80, typeTest: TYPE_TEST.COMBAT });
  assert.deepEqual([majeure.autorise, majeure.cout, majeure.nouveauJet, majeure.chanceRestante], [true, 43, 30, 37]);
  const extreme = depenseChance({ jet: 73, valeur: 60, difficulte: 'extreme', niveau: NIVEAU.ECHEC, chance: 80, typeTest: TYPE_TEST.COMBAT });
  assert.deepEqual([extreme.autorise, extreme.cout, extreme.nouveauJet], [true, 61, 12]);
  assert.equal(depenseChance({ jet: 73, valeur: 60, difficulte: 'extreme', niveau: NIVEAU.ECHEC, chance: 60 }).autorise, false);
});

test('Q8-2 · Chance : interdite sur un test redoublé, sur une maladresse, et sur Chance, SAN, dégâts, perte de SAN', () => {
  // p. 87 : pas de Chance sur un test redoublé ; maladresses et critiques non annulables ;
  // p. 86-87 : pas de Chance sur les tests de Chance ou de SAN, ni pour les jets de dégâts ou de perte de SAN.
  const base = { jet: 73, valeur: 60, niveau: NIVEAU.ECHEC, chance: 80 };
  assert.equal(depenseChance({ ...base, redouble: true }).autorise, false);
  assert.equal(depenseChance({ ...base, niveau: NIVEAU.MALADRESSE }).autorise, false);
  for (const typeTest of [TYPE_TEST.CHANCE, TYPE_TEST.SAN, TYPE_TEST.DEGATS, TYPE_TEST.PERTE_SAN]) {
    assert.equal(depenseChance({ ...base, typeTest }).autorise, false, typeTest);
  }
  // p. 87 : il faut choisir entre redoubler le test et dépenser de la Chance.
  assert.equal(peutRedoubler({ niveau: NIVEAU.ECHEC, chanceDepensee: true }).autorise, false);
});

// --- 3. 0 PV sans blessure grave : inconscient ; PNJ et créatures comme les autres ----------------------------------

test('Q8-3 · 0 PV sans blessure grave : inconscient ; avec blessure grave : mourant', () => {
  // p. 107 : à 0 PV le personnage sombre dans l'inconscience et ne meurt pas ;
  // blessure grave puis 0 PV : mourant (p. 107-108).
  const ordinaire = appliquerBlessure({ pv: 4, pvMax: 15, blessureGrave: false, etat: 'actif' }, 4);
  assert.equal(ordinaire.etat, 'inconscient');
  assert.equal(ordinaire.pv, 0);
  const grave = appliquerBlessure({ pv: 4, pvMax: 15, blessureGrave: true, etat: 'actif' }, 4);
  assert.equal(grave.etat, 'mourant');
});

test('Q8-3 · PNJ et créatures : inconscients ou mourants à 0 PV, pas morts', () => {
  // p. 107 : aucune exception pour les PNJ ; p. 284 : l'état d'une créature n'est fixé que par les Premiers
  // soins ou la Médecine. Décision du MJ : comme le livre.
  const creature = appliquerBlessure({ pv: 2, pvMax: 13, blessureGrave: false, etat: 'actif' }, 3);
  assert.equal(creature.etat, 'inconscient');
  assert.equal(appliquerBlessure({ pv: 5, pvMax: 13, blessureGrave: true, etat: 'actif' }, 5).etat, 'mourant');
});

// --- 4. Égalité de DEX : la plus haute compétence de combat agit d'abord -------------------------------------------

test('Q8-4 · égalité de DEX : la plus haute compétence de combat joue en premier', () => {
  // p. 90 : exemple de l'adorateur (Combat rapproché 70 %) et d'Harvey (25 %), tous deux DEX 55.
  const ordre = ordreDex([{ id: 'harvey', dex: 55, combat: 25 }, { id: 'adorateur', dex: 55, combat: 70 }]).map(r => r.id);
  assert.deepEqual(ordre, ['adorateur', 'harvey']);
});

// --- 5. Bout portant : un dixième de la DEX, en mètres, sans conversion --------------------------------------------

test('Q8-5 · bout portant : DEX/10 mètres (DEX 60 → 6 m), un dé bonus en deçà', () => {
  // p. 100 : bout portant = un dixième de la DEX du tireur, en mètres ; p. 104 : DEX 55, cible à environ 6 m : pas à bout portant.
  assert.equal(distanceBoutPortant(60), 6);
  assert.equal(distanceBoutPortant(55), 5.5);
  assert.equal(preparerTir({ distance: 6, porteeBase: 15, dexTireur: 60 }).bonus, 1);
  assert.equal(preparerTir({ distance: 7, porteeBase: 15, dexTireur: 60 }).bonus, 0);
  assert.equal(preparerTir({ distance: 6, porteeBase: 15, dexTireur: 55 }).boutPortant, false);
  assert.equal(preparerTir({ distance: 5, porteeBase: 15, dexTireur: 55 }).boutPortant, true);
});

// --- 6. Rendre les coups avec une réussite Extrême : pas d'empalement ----------------------------------------------

test('Q8-6 · Rendre les coups avec une réussite Extrême : coup ordinaire, ni dégâts extrêmes ni empalement', () => {
  // p. 92 : les dégâts extrêmes et l'empalement n'arrivent que pendant le tour d'initiative normal, pas en rendant les coups.
  const r = resoudreMelee({ attaque: { niveau: NIVEAU.ORDINAIRE }, defense: { niveau: NIVEAU.EXTREME }, mode: 'rendre' });
  assert.equal(r.touche, 'attaquant');
  assert.equal(r.niveauDegats, NIVEAU.ORDINAIRE);
  const couteau = { des: '1D4', empalante: true, aImpact: true };
  const d = calculerDegats({ arme: couteau, impact: '+1D4', niveau: r.niveauDegats, lancer: fixe({ '1D4': 2, '+1D4': 3 }) });
  assert.equal(d.empale, false);
  assert.equal(d.total, 5);
  // Le critique (01) en rendant les coups est traité de même.
  const critique = resoudreMelee({ attaque: { niveau: NIVEAU.ECHEC }, defense: { niveau: NIVEAU.CRITIQUE }, mode: 'rendre' });
  assert.equal(critique.niveauDegats, NIVEAU.ORDINAIRE);
  // Au tour normal, l'attaque Extrême empale toujours (p. 92).
  const normal = resoudreMelee({ attaque: { niveau: NIVEAU.EXTREME }, defense: { niveau: NIVEAU.ECHEC }, mode: 'rendre' });
  assert.equal(normal.niveauDegats, NIVEAU.EXTREME);
});

// --- 7. Goule : attaques, défenses avant surnombre, SAN, armes à feu ----------------------------------------------

test('Q8-7 · goule : 3 attaques, donc 3 défenses avant que le surnombre donne un dé bonus', () => {
  // p. 96 (sous-nombre) : une goule à trois attaques rend les coups trois fois ; p. 293 : 3 attaques par round.
  assert.equal(desBonusSurnombre({ defensesFaites: 2, defensesParRound: 3 }), 0);
  assert.equal(desBonusSurnombre({ defensesFaites: 3, defensesParRound: 3 }), 1);
});

test('Q8-7 · goule : perte de SAN 0/1D6, maladresse au maximum', () => {
  // p. 138 et p. 293 : la goule fait perdre 0 SAN sur une réussite, 1D6 sur un échec.
  assert.equal(perteSan({ cout: '0/1D6', niveau: NIVEAU.ORDINAIRE, lancer: fixe({ 0: 0, '1D6': 4 }) }), 0);
  assert.equal(perteSan({ cout: '0/1D6', niveau: NIVEAU.ECHEC, lancer: fixe({ 0: 0, '1D6': 4 }) }), 4);
  assert.equal(perteSan({ cout: '0/1D6', niveau: NIVEAU.MALADRESSE, lancer: fixe({ 0: 0, '1D6': 4 }) }), 6);
});

test('Q8-7 · goule : armes à feu et projectiles à demi-dégâts (arrondi à l’inférieur)', () => {
  // p. 293 : les armes à feu et les projectiles ne causent que la moitié des dégâts, arrondie à l'entier inférieur.
  const revolver = { des: '1D10', empalante: true, aImpact: false };
  const d = calculerDegats({ arme: revolver, niveau: NIVEAU.ORDINAIRE, reduction: 'moitie', lancer: fixe({ '1D10': 7 }) });
  assert.equal(d.brut, 7);
  assert.equal(d.total, 3);
});

// --- 8. Folie passagère : déclenchée par un jet d'INT réussi -------------------------------------------------------

test('Q8-8 · folie temporaire : au moins 5 points perdus ET jet d’INT réussi (un échec refoule le souvenir, Gardien p. 140-141)', () => {
  // p. 140-141 : perte d’au moins 5 SAN et jet d’INT réussi → folie temporaire (la phase passagère n’est que la première
  // phase commune aux folies temporaire et persistante).
  assert.equal(foliePassagere({ perte: 5, niveauINT: NIVEAU.ORDINAIRE }), true);
  assert.equal(foliePassagere({ perte: 5, niveauINT: NIVEAU.ECHEC }), false);
  assert.equal(foliePassagere({ perte: 4, niveauINT: NIVEAU.ORDINAIRE }), false);
  assert.equal(appliquerPerteSan({ san: 45, journee: nouvelleJourneeSan(45) }, 5).jetIntRequis, true);
});

// --- 9. Maladresse au jet de SAN : perte maximale -------------------------------------------------------------------

test('Q8-9 · maladresse au jet de SAN : perte maximale de la partie échec', () => {
  // p. 79 (exemple de la goule) et p. 138 : une maladresse au jet de SAN coûte la perte maximale de la partie échec.
  assert.equal(perteSan({ cout: '1/1D6+1', niveau: NIVEAU.MALADRESSE, lancer: fixe({ '1D6+1': 2 }) }), 7);
});

// --- 10. Test opposé à égalité parfaite : le Gardien choisit entre match nul et relance ---------------------------

test('Q8-10 · égalité parfaite au test opposé : aucun vainqueur, le Gardien choisit match nul ou relance', () => {
  // p. 80 : à égalité de niveau, la valeur la plus élevée l'emporte ; si les valeurs sont aussi égales, match nul ou
  // relance des deux camps. Décision du MJ : l'outil lui laisse le choix.
  const r = resoudreTestOppose({ niveau: NIVEAU.MAJEURE, valeur: 50 }, { niveau: NIVEAU.MAJEURE, valeur: 50 });
  assert.equal(r.egalite, true);
  assert.equal(r.vainqueur, null);
  assert.deepEqual(r.issues.map(i => i.id), ['nul', 'relance']);
  assert.equal(r.issues, ISSUES_EGALITE);
  // Pas d'égalité : un vainqueur, aucun choix à faire (p. 80 : valeur la plus haute à niveau égal).
  const plusHaute = resoudreTestOppose({ niveau: NIVEAU.MAJEURE, valeur: 60 }, { niveau: NIVEAU.MAJEURE, valeur: 50 });
  assert.deepEqual([plusHaute.vainqueur, plusHaute.egalite, plusHaute.issues.length], ['a', false, 0]);
  const deuxEchecs = resoudreTestOppose({ niveau: NIVEAU.ECHEC, valeur: 50 }, { niveau: NIVEAU.ECHEC, valeur: 50 });
  assert.deepEqual([deuxEchecs.vainqueur, deuxEchecs.egalite, deuxEchecs.aucun], [null, false, true]);
});

// --- 11. Folie persistante : un cinquième de la SAN d'avant la perte, cumul de la journée ---------------------------

test('Q8-11 · folie persistante : cumul de la journée, perte en cours comprise, ≥ 1/5 de la SAN d’avant cette perte', () => {
  // p. 140 : folie persistante si le cumul de la journée atteint un cinquième de la SAN actuelle. Décision du MJ :
  // actuelle = juste avant la perte ; arrondi à l'inférieur (le livre n'arrondit pas ce cinquième), signalé au rapport.
  const journee = nouvelleJourneeSan(50);
  assert.equal(appliquerPerteSan({ san: 50, journee }, 9).persistante, false); // seuil floor(50/5) = 10
  assert.equal(appliquerPerteSan({ san: 50, journee }, 10).persistante, true);
  // Arrondi inférieur : SAN 47 → seuil 9 (et non 9,4).
  assert.equal(appliquerPerteSan({ san: 47, journee: nouvelleJourneeSan(47) }, 9).persistante, true);
  // Cumul avec une perte précédente : SAN 40 (début de journée 50, perdu 10 : déjà signalé), puis 8 → 18 ≥ 8 mais une seule fois.
  const deja = { ...journee, perteJour: 10, persistanteDeclenchee: true };
  assert.equal(appliquerPerteSan({ san: 40, journee: deja }, 8).persistante, false);
  // Cumul sans déclenchement préalable : SAN 40 après 6 perdus, puis 2 → cumul 8 ≥ floor(40/5) = 8.
  const partielle = { sanDebut: 46, perteJour: 6, persistanteDeclenchee: false };
  assert.equal(appliquerPerteSan({ san: 40, journee: partielle }, 2).persistante, true);
  assert.equal(appliquerPerteSan({ san: 40, journee: partielle }, 1).persistante, false);
});

// --- Hors des 12 règles, décidées par le MJ : suivre le livre -------------------------------------------------------

test('hors Q8 · mort immédiate seulement au-dessus du maximum de PV ; à exactement le maximum : mourant', () => {
  // p. 107 : au-dessus du maximum de PV, la mort est inévitable ; à exactement le maximum, le personnage tombe, mourant.
  const plein = { pv: 12, pvMax: 12, blessureGrave: false, etat: 'actif' };
  assert.equal(appliquerBlessure(plein, 13).etat, 'mort');
  const exact = appliquerBlessure(plein, 12);
  assert.deepEqual([exact.etat, exact.mortImmediate, exact.pv], ['mourant', false, 0]);
});

test('hors Q8 · à très longue portée : empalement seulement sur un 01, et l’extrême non critique donne les dégâts ordinaires (Gardien p. 100 et p. 404)', () => {
  // p. 100 : à très longue portée, l’empalement exige un succès critique (01) ; p. 404 : une réussite extrême qui n’est
  // pas un 01 n’inflige que les dégâts ordinaires. Exemple p. 104 : critique à 40 m.
  const revolver = { des: '1D10', empalante: true, aImpact: false };
  const lancer = fixe({ '1D10': 4 });
  assert.equal(preparerTir({ distance: 40, porteeBase: 15, dexTireur: 55 }).tresLonguePortee, true);
  assert.equal(preparerTir({ distance: 20, porteeBase: 15, dexTireur: 55 }).tresLonguePortee, false);
  const extreme = calculerDegats({ arme: revolver, niveau: NIVEAU.EXTREME, tresLonguePortee: true, lancer });
  assert.deepEqual([extreme.empale, extreme.total], [false, 4]); // 1D10 tiré à 4 : dégâts ordinaires, pas le maximum
  const critique = calculerDegats({ arme: revolver, niveau: NIVEAU.CRITIQUE, tresLonguePortee: true, lancer });
  assert.deepEqual([critique.empale, critique.total], [true, 14]);
  // Hors très longue portée, l'Extrême empale (p. 92 et p. 404).
  assert.equal(calculerDegats({ arme: revolver, niveau: NIVEAU.EXTREME, lancer }).empale, true);
});

// --- 12. Arme à feu : ni Esquiver ni Rendre les coups, seulement se mettre à couvert --------------------------------

test('Q8-12 · arme à feu ou de trait : ni Esquiver ni Rendre les coups, seulement se mettre à couvert', () => {
  // p. 100 : face à une attaque par arme à distance, on ne peut ni rendre les coups ni esquiver, seulement se mettre à
  // couvert ; p. 96 : idem pour une arme de trait.
  assert.deepEqual(defensesPossibles({ type: 'distance' }), ['couvert']);
  assert.deepEqual(defensesPossibles({ type: 'melee' }), ['rendre', 'esquiver']);
  // p. 96 : arme de jet, on esquive ; on ne rend les coups qu'au corps à corps avec le lanceur.
  assert.deepEqual(defensesPossibles({ type: 'jet' }), ['esquiver']);
  assert.deepEqual(defensesPossibles({ type: 'jet', auCorpsACorps: true }), ['rendre', 'esquiver']);
});

test('riposte (Gardien p. 404) : jamais de dégâts extrêmes pour celui qui rend les coups, quel que soit son niveau de succès', () => {
  // p. 404 : les dégâts extrêmes ne visent que l’attaquant d’origine, jamais celui qui rend les coups.
  const riposte = resoudreMelee({ attaque: { niveau: NIVEAU.ECHEC }, defense: { niveau: NIVEAU.CRITIQUE }, mode: 'rendre' });
  assert.deepEqual([riposte.touche, riposte.niveauDegats], ['attaquant', NIVEAU.ORDINAIRE]);
  const riposteFaceExtreme = resoudreMelee({ attaque: { niveau: NIVEAU.EXTREME }, defense: { niveau: NIVEAU.CRITIQUE }, mode: 'rendre' });
  assert.deepEqual([riposteFaceExtreme.touche, riposteFaceExtreme.niveauDegats], ['attaquant', NIVEAU.ORDINAIRE]);
  // L’attaquant d’origine, lui, peut porter des dégâts extrêmes au tour normal (p. 404).
  const attaque = resoudreMelee({ attaque: { niveau: NIVEAU.EXTREME }, defense: { niveau: NIVEAU.ECHEC }, mode: 'rendre' });
  assert.equal(attaque.niveauDegats, NIVEAU.EXTREME);
});

test('aucune phrase du livre recopiée entre guillemets dans ce fichier : paraphrase courte + page seulement', () => {
  const code = readFileSync(new URL(import.meta.url), 'utf8');
  assert.doesNotMatch(code, /«[^»\n]{10,}»/);
});
