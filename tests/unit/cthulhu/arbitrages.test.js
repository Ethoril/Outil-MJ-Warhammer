// Cthulhu 7e : les 12 règles laissées ouvertes par la maquette (spec §4, Q8), tranchées d'après le Manuel du Gardien.
// Chaque cas cite la page imprimée du Manuel du Gardien (USB_V7-GARDIEN.pdf ; page imprimée = page du PDF − 2).
// Règles 10 et 11 : le livre ne les tranche pas, le MJ a décidé (réponse du 18/11/2026, citée dans chaque cas).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  NIVEAU, TYPE_TEST, niveauDuJet, depenseChance, peutRedoubler, appliquerBlessure, ordreDex, distanceBoutPortant,
  preparerTir, resoudreMelee, calculerDegats, defensesPossibles, desBonusSurnombre, perteSan, appliquerPerteSan,
  nouvelleJourneeSan, foliePassagere, resoudreTestOppose, ISSUES_EGALITE
} from '../../../cthulhu/regles.js';

const fixe = valeurs => e => valeurs[e];

// --- 1. Maladresse sous 50 : le seuil de réussite de la difficulté demandée ---------------------------------------

test('Q8-1 · maladresse : le seuil de la difficulté demandée décide (96-100 sous 50), pas la valeur de la compétence', () => {
  // Manuel du Gardien p. 79 : « seuil de réussite » ; exemple de Harvey, Bibliothèque 55 %, test majeur (seuil 27) : 96-100.
  assert.equal(niveauDuJet(96, 55, { difficulte: 'ordinaire' }), NIVEAU.ECHEC);
  assert.equal(niveauDuJet(100, 55, { difficulte: 'ordinaire' }), NIVEAU.MALADRESSE);
  assert.equal(niveauDuJet(96, 55, { difficulte: 'majeure' }), NIVEAU.MALADRESSE);
  // p. 80 (tests opposés) : « strictement inférieur à 50 ».
  assert.equal(niveauDuJet(96, 50), NIVEAU.ECHEC);
  assert.equal(niveauDuJet(96, 49), NIVEAU.MALADRESSE);
});

// --- 2. Chance : combat et tests opposés, achat Majeure/Extrême, interdite après un redoublement --------------------

test('Q8-2 · Chance : autorisée sur un jet de combat et un test opposé', () => {
  // p. 86-87 : « test de compétence ou de caractéristique », interdite seulement sur Chance, SAN, dégâts, perte de SAN ;
  // l'exemple de la p. 87 dépense de la Chance sur une Esquive contre une attaque extrême.
  const base = { jet: 73, valeur: 60, niveau: NIVEAU.ECHEC, chance: 80 };
  assert.equal(depenseChance({ ...base, typeTest: TYPE_TEST.COMBAT }).autorise, true);
  assert.equal(depenseChance({ ...base, typeTest: TYPE_TEST.OPPOSE }).autorise, true);
});

test('Q8-2 · Chance : on peut acheter une réussite Majeure ou Extrême, au taux de 1 pour 1', () => {
  // p. 86 : « altérer le résultat, au taux de 1 pour 1 » ; p. 87 : jusqu'à la valeur actuelle de Chance.
  const majeure = depenseChance({ jet: 73, valeur: 60, difficulte: 'majeure', niveau: NIVEAU.ECHEC, chance: 80, typeTest: TYPE_TEST.COMBAT });
  assert.deepEqual([majeure.autorise, majeure.cout, majeure.nouveauJet, majeure.chanceRestante], [true, 43, 30, 37]);
  const extreme = depenseChance({ jet: 73, valeur: 60, difficulte: 'extreme', niveau: NIVEAU.ECHEC, chance: 80, typeTest: TYPE_TEST.COMBAT });
  assert.deepEqual([extreme.autorise, extreme.cout, extreme.nouveauJet], [true, 61, 12]);
  assert.equal(depenseChance({ jet: 73, valeur: 60, difficulte: 'extreme', niveau: NIVEAU.ECHEC, chance: 60 }).autorise, false);
});

test('Q8-2 · Chance : interdite sur un test redoublé, sur une maladresse, et sur Chance, SAN, dégâts, perte de SAN', () => {
  // p. 87 : « Il ne pourra pas dépenser de chance pour un test redoublé » ; maladresses et critiques non annulables ;
  // p. 86-87 : pas de Chance sur les tests de Chance ou de SAN, ni pour les jets de dégâts ou de perte de SAN.
  const base = { jet: 73, valeur: 60, niveau: NIVEAU.ECHEC, chance: 80 };
  assert.equal(depenseChance({ ...base, redouble: true }).autorise, false);
  assert.equal(depenseChance({ ...base, niveau: NIVEAU.MALADRESSE }).autorise, false);
  for (const typeTest of [TYPE_TEST.CHANCE, TYPE_TEST.SAN, TYPE_TEST.DEGATS, TYPE_TEST.PERTE_SAN]) {
    assert.equal(depenseChance({ ...base, typeTest }).autorise, false, typeTest);
  }
  // p. 87 : « choisir entre le redoubler ou dépenser de la chance ».
  assert.equal(peutRedoubler({ niveau: NIVEAU.ECHEC, chanceDepensee: true }).autorise, false);
});

// --- 3. 0 PV sans blessure grave : inconscient ; PNJ et créatures comme les autres ----------------------------------

test('Q8-3 · 0 PV sans blessure grave : inconscient ; avec blessure grave : mourant', () => {
  // p. 107 : « À zéro point de vie, le personnage sombre dans l'inconscience » ; « dégâts ordinaires » : il ne meurt pas ;
  // blessure grave puis 0 PV : mourant (p. 107 et p. 108).
  const ordinaire = appliquerBlessure({ pv: 4, pvMax: 15, blessureGrave: false, etat: 'actif' }, 4);
  assert.equal(ordinaire.etat, 'inconscient');
  assert.equal(ordinaire.pv, 0);
  const grave = appliquerBlessure({ pv: 4, pvMax: 15, blessureGrave: true, etat: 'actif' }, 4);
  assert.equal(grave.etat, 'mourant');
});

test('Q8-3 · PNJ et créatures : inconscients ou mourants à 0 PV, pas morts', () => {
  // p. 107 : aucune exception pour les PNJ ; p. 284 : l'état d'une créature « n'a rien d'évident », seuls les Premiers
  // soins ou la Médecine le fixent. Décision du MJ : comme le livre.
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
  // p. 100 : « à un dixième de la DEX du tireur en mètres » ; p. 104 : DEX 55, cible à environ 6 m : pas à bout portant.
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
  // p. 96 (En sous-nombre) : « une goule ayant trois attaques rend les coups trois fois » ; p. 293 : Attaques par round 3.
  assert.equal(desBonusSurnombre({ defensesFaites: 2, defensesParRound: 3 }), 0);
  assert.equal(desBonusSurnombre({ defensesFaites: 3, defensesParRound: 3 }), 1);
});

test('Q8-7 · goule : perte de SAN 0/1D6, maladresse au maximum', () => {
  // p. 138 et p. 293 : « Perte de Santé Mentale : 0/1D6 ».
  assert.equal(perteSan({ cout: '0/1D6', niveau: NIVEAU.ORDINAIRE, lancer: fixe({ 0: 0, '1D6': 4 }) }), 0);
  assert.equal(perteSan({ cout: '0/1D6', niveau: NIVEAU.ECHEC, lancer: fixe({ 0: 0, '1D6': 4 }) }), 4);
  assert.equal(perteSan({ cout: '0/1D6', niveau: NIVEAU.MALADRESSE, lancer: fixe({ 0: 0, '1D6': 4 }) }), 6);
});

test('Q8-7 · goule : armes à feu et projectiles à demi-dégâts (arrondi à l’inférieur)', () => {
  // p. 293 : « la moitié de leurs dégâts ordinaires (arrondie à l'entier inférieur) ».
  const revolver = { des: '1D10', empalante: true, aImpact: false };
  const d = calculerDegats({ arme: revolver, niveau: NIVEAU.ORDINAIRE, reduction: 'moitie', lancer: fixe({ '1D10': 7 }) });
  assert.equal(d.brut, 7);
  assert.equal(d.total, 3);
});

// --- 8. Folie passagère : déclenchée par un jet d'INT réussi -------------------------------------------------------

test('Q8-8 · folie passagère : au moins 5 points perdus ET jet d’INT réussi (un échec refoule le souvenir)', () => {
  // p. 140 : « si le test d'INT réussit, l'investigateur comprend [...] et devient temporairement fou ».
  assert.equal(foliePassagere({ perte: 5, niveauINT: NIVEAU.ORDINAIRE }), true);
  assert.equal(foliePassagere({ perte: 5, niveauINT: NIVEAU.ECHEC }), false);
  assert.equal(foliePassagere({ perte: 4, niveauINT: NIVEAU.ORDINAIRE }), false);
  assert.equal(appliquerPerteSan({ san: 45, journee: nouvelleJourneeSan(45) }, 5).jetIntRequis, true);
});

// --- 9. Maladresse au jet de SAN : perte maximale -------------------------------------------------------------------

test('Q8-9 · maladresse au jet de SAN : perte maximale de la partie échec', () => {
  // p. 79 (exemple de la goule) et p. 138 : « la perte de Santé Mentale maximale ».
  assert.equal(perteSan({ cout: '1/1D6+1', niveau: NIVEAU.MALADRESSE, lancer: fixe({ '1D6+1': 2 }) }), 7);
});

// --- 10. Test opposé à égalité parfaite : le Gardien choisit entre match nul et relance ---------------------------

test('Q8-10 · égalité parfaite au test opposé : aucun vainqueur, le Gardien choisit match nul ou relance', () => {
  // p. 80 : « En cas d'égalité, le camp ayant la valeur la plus élevée l'emporte. Si elles sont toujours à égalité, c'est
  // un match nul, ou les deux camps doivent relancer les dés. » Décision du MJ : l'outil lui laisse le choix.
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
  // p. 140 : « au moins un cinquième de ses points de Santé Mentale actuels en une seule journée ». Décision du MJ :
  // « actuelle » = juste avant la perte ; arrondi à l'inférieur (le livre n'arrondit pas ce cinquième), signalé au rapport.
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
  // p. 107 : « Plus du maximum des points de vie [...] la mort est inévitable » ; dégâts « exactement égaux à son maximum
  // de points de vie, il tombe, mourant ».
  const plein = { pv: 12, pvMax: 12, blessureGrave: false, etat: 'actif' };
  assert.equal(appliquerBlessure(plein, 13).etat, 'mort');
  const exact = appliquerBlessure(plein, 12);
  assert.deepEqual([exact.etat, exact.mortImmediate, exact.pv], ['mourant', false, 0]);
});

test('hors Q8 · à très longue portée, l’empalement n’arrive que sur un succès critique (01)', () => {
  // p. 100 : « un empalement ne peut être obtenu que sur un succès critique (un jet de 01) » ; exemple p. 104 : critique à
  // 40 m, 1D10+10. Sans empalement, la réussite Extrême ne donne que les dégâts maximaux : lecture retenue.
  const revolver = { des: '1D10', empalante: true, aImpact: false };
  const lancer = fixe({ '1D10': 4 });
  assert.equal(preparerTir({ distance: 40, porteeBase: 15, dexTireur: 55 }).tresLonguePortee, true);
  assert.equal(preparerTir({ distance: 20, porteeBase: 15, dexTireur: 55 }).tresLonguePortee, false);
  const extreme = calculerDegats({ arme: revolver, niveau: NIVEAU.EXTREME, tresLonguePortee: true, lancer });
  assert.deepEqual([extreme.empale, extreme.total], [false, 10]);
  const critique = calculerDegats({ arme: revolver, niveau: NIVEAU.CRITIQUE, tresLonguePortee: true, lancer });
  assert.deepEqual([critique.empale, critique.total], [true, 14]);
  // Hors très longue portée, l'Extrême empale (p. 92).
  assert.equal(calculerDegats({ arme: revolver, niveau: NIVEAU.EXTREME, lancer }).empale, true);
});

// --- 12. Arme à feu : ni Esquiver ni Rendre les coups, seulement se mettre à couvert --------------------------------

test('Q8-12 · arme à feu ou de trait : ni Esquiver ni Rendre les coups, seulement se mettre à couvert', () => {
  // p. 100 : « Une cible ne peut néanmoins pas rendre les coups ou esquiver face à une attaque par arme à distance » ;
  // p. 96 : arme de trait, « se mettre à couvert, mais ne peut pas esquiver ».
  assert.deepEqual(defensesPossibles({ type: 'distance' }), ['couvert']);
  assert.deepEqual(defensesPossibles({ type: 'melee' }), ['rendre', 'esquiver']);
  // p. 96 : arme de jet, on esquive ; on ne rend les coups qu'au corps à corps avec le lanceur.
  assert.deepEqual(defensesPossibles({ type: 'jet' }), ['esquiver']);
  assert.deepEqual(defensesPossibles({ type: 'jet', auCorpsACorps: true }), ['rendre', 'esquiver']);
});
