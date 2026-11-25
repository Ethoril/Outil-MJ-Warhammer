// Imperium Maledictum : combat — localisations, attaques de mêlée et à distance, esquive,
// critiques/maladresses sur les doubles, armure et traits d'arme.
// Exemples chiffrés du Core Book (page citée en commentaire).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  PORTEES, VITESSES, TAILLES, COUVERT, ROLES_PNJ, LOCALISATIONS,
  bonusCarac, prevoirTest, resoudreTestOppose, localisationDuJet,
  calculerArmureEffective, resoudreDegats, resoudreEsquiveDistance, verifierDesespere
} from '../../../imperium/regles.js';

test('constantes de combat : portées p. 201-202, vitesses p. 202, tailles p. 201, couvert p. 204/210, rôles p. 317, localisations p. 211', () => {
  assert.deepEqual([...PORTEES], ['immediate', 'courte', 'moyenne', 'longue', 'extreme']);
  assert.deepEqual([...VITESSES], ['lente', 'normale', 'rapide']);
  assert.deepEqual([...TAILLES], ['minuscule', 'petite', 'moyenne', 'grande', 'enorme', 'monstrueuse']);
  assert.deepEqual({ ...COUVERT }, { aucun: 0, leger: 2, moyen: 4, lourd: 6 }); // couvert léger/moyen/lourd +2/+4/+6, p. 204 et 210
  assert.deepEqual([...ROLES_PNJ], ['troupe', 'elite', 'chef']);
  assert.deepEqual([...LOCALISATIONS], ['tete', 'bras-g', 'bras-d', 'jambe-g', 'jambe-d', 'corps']);
});

test('localisation du jet d\'après le chiffre des unités, p. 211', () => {
  assert.equal(localisationDuJet(1), 'tete');
  assert.equal(localisationDuJet(2), 'bras-g');
  assert.equal(localisationDuJet(3), 'bras-d'); // Leo a fait 23 → bras droit, p. 212
  assert.equal(localisationDuJet(4), 'jambe-g');
  assert.equal(localisationDuJet(5), 'jambe-d');
  assert.equal(localisationDuJet(6), 'corps');
  assert.equal(localisationDuJet(17), 'corps'); // Helza a fait 17 → torse, p. 211
  assert.equal(localisationDuJet(10), 'corps'); // 0 → corps
  assert.equal(localisationDuJet(100), 'corps'); // 00 → unités 0 → corps
});

test('exemple p. 211 : sœur Helza (Melee 42, jet 17 → +3) bat le Cult Leader (Melee 60, jet 78 → -1) de +4 DR', () => {
  const helza = prevoirTest({ seuil: 42, jet: 17, kind: 'melee' });
  const leader = prevoirTest({ seuil: 60, jet: 78, kind: 'melee' });
  assert.equal(helza.dr, 3);
  assert.equal(leader.dr, -1);
  const r = resoudreTestOppose(helza, leader);
  assert.equal(r.gagnant, 'init');
  assert.equal(r.drNet, 4); // Helza remporte le test opposé de +4, p. 211
});

test('exemple p. 211 : dégâts = arme 3 + bonus F 3 (F 37) + DR 4 = 10, armure 2 du torse → 8 blessures', () => {
  assert.equal(bonusCarac(37), 3); // Force 37, p. 211
  assert.equal(localisationDuJet(17), 'corps');
  assert.equal(resoudreDegats({ degatsBase: 3 + 3, dr: 4, armureEffective: 2 }), 8); // dégâts finaux 8 (10 − 2), p. 211
});

test('exemple p. 212 : Leo (Ranged 40, jet 23 → +2) ; Autopistol 5 + 2 = 7 dégâts, bras droit (unités 3) armure 2 → 5', () => {
  const leo = prevoirTest({ seuil: 40, jet: 23, kind: 'tir' });
  assert.equal(leo.dr, 2); // jet de 23 = +2, p. 212
  assert.equal(localisationDuJet(23), 'bras-d'); // touche le bras droit, p. 212
  assert.equal(resoudreDegats({ degatsBase: 5, dr: 2, armureEffective: 0 }), 7); // l'attaque inflige 7 dégâts (5 + 2), p. 212
  assert.equal(resoudreDegats({ degatsBase: 5, dr: 2, armureEffective: 2 }), 5); // dégâts finaux 5 (7 − 2), p. 212
});

test('esquive à distance, p. 212 : le DR de l\'attaque est réduit du DR de l\'esquive ; à +0 ou moins, ça manque', () => {
  const attaque = prevoirTest({ seuil: 40, jet: 23, kind: 'tir' }); // DR +2, exemple Leo p. 212
  const esquiveFaible = prevoirTest({ seuil: 50, jet: 40 }); // DR +1, réussite
  const r1 = resoudreEsquiveDistance({ drAttaque: attaque.dr, testDefense: esquiveFaible });
  assert.deepEqual(r1, { touche: true, esquive: false, drAttaque: 2, drDefense: 1, drFinal: 1 });
  const esquiveForte = prevoirTest({ seuil: 50, jet: 20 }); // DR +3, réussite
  const r2 = resoudreEsquiveDistance({ drAttaque: attaque.dr, testDefense: esquiveForte });
  assert.equal(r2.touche, false); // DR de l'attaque réduit à +0 ou moins : l'attaque manque entièrement, p. 212
  assert.equal(r2.drFinal, 0);
  const esquiveRatee = prevoirTest({ seuil: 30, jet: 80 }); // échec
  const r3 = resoudreEsquiveDistance({ drAttaque: attaque.dr, testDefense: esquiveRatee });
  assert.equal(r3.touche, true);
  assert.equal(r3.drFinal, 2); // une esquive ratée n'augmente jamais les dégâts d'une attaque à distance, p. 212
});

test('double en défense : Helza fait 33 en défendant → critique avec +1 DR même si elle perd le test opposé (p. 213)', () => {
  const helza = prevoirTest({ seuil: 40, jet: 33, kind: 'melee' });
  assert.equal(helza.dr, 1); // jet de 33 = double = critique, +1, p. 213
  assert.equal(helza.critique, true);
  assert.equal(helza.maladresse, false);
  const ganger = prevoirTest({ seuil: 45, jet: 23, kind: 'melee' }); // réussit avec +2 SL, p. 213
  assert.equal(ganger.dr, 2);
  const r = resoudreTestOppose(ganger, helza);
  assert.equal(r.gagnant, 'init'); // le Ganger remporte le test opposé, p. 213
  assert.equal(helza.critique, true); // mais Helza a réussi un double : elle porte un coup critique, p. 213
});

test('maladresse gagnante : Casseum fait 66 (double, -3 DR) contre 91 (-6 DR) → il gagne de +3 mais consulte la table de maladresse (p. 213)', () => {
  const casseum = prevoirTest({ seuil: 35, jet: 66, kind: 'melee' });
  const heretic = prevoirTest({ seuil: 35, jet: 91, kind: 'melee' });
  assert.equal(casseum.dr, -3); // maladresse à -3, p. 213
  assert.equal(casseum.maladresse, true);
  assert.equal(casseum.critique, false);
  assert.equal(heretic.dr, -6); // échec à -6, p. 213
  const r = resoudreTestOppose(casseum, heretic);
  assert.equal(r.gagnant, 'init');
  assert.equal(r.drNet, 3); // Casseum remporte le test de +3, p. 213
});

test('double à DR positif en attaque → critique (p. 213) ; 99-00 → maladresse même avec un succès', () => {
  const crit = prevoirTest({ seuil: 50, jet: 44, kind: 'tir' }); // double 44, DR +1
  assert.equal(crit.dr, 1);
  assert.equal(crit.reussi, true);
  assert.equal(crit.critique, true);
  assert.equal(crit.maladresse, false);
  const pasDouble = prevoirTest({ seuil: 50, jet: 43, kind: 'melee' });
  assert.equal(pasDouble.critique, false);
  assert.equal(pasDouble.maladresse, false);
  const nonCombat = prevoirTest({ seuil: 50, jet: 44 }); // kind 'test' : pas de critique/maladresse hors combat
  assert.equal(nonCombat.critique, false);
  assert.equal(nonCombat.maladresse, false);
  const j99 = prevoirTest({ seuil: 100, jet: 99, kind: 'melee' }); // 96-00 est toujours un échec (p. 188), et 99 est un double
  assert.equal(j99.reussi, false);
  assert.equal(j99.dr, 0); // échec marginal -0 (le seuil effectif 100 aurait permis +1 sans la règle 96-00)
  assert.equal(j99.maladresse, true); // « 99-00 → maladresse toujours », p. 188 et 213
  const j100 = prevoirTest({ seuil: 100, jet: 100, kind: 'tir' });
  assert.equal(j100.maladresse, true); // 00 = 100, maladresse automatique, p. 188
});

test('armure effective : couvert p. 204/210, ignoreCouvert (Flamer p. 124, Cibler localisation p. 210)', () => {
  assert.equal(calculerArmureEffective({ armureBase: 2 }).armureEffective, 2);
  assert.equal(calculerArmureEffective({ armureBase: 2, couvert: COUVERT.lourd }).armureEffective, 8); // Heavy +6, p. 204/210
  assert.equal(calculerArmureEffective({ armureBase: 2, couvert: COUVERT.leger }).armureEffective, 4);
  assert.equal(calculerArmureEffective({ armureBase: 2, couvert: COUVERT.moyen, ignoreCouvert: true }).armureEffective, 2); // couvert ignoré
});

test('traits d\'arme : Ineffective double toute l\'armure (p. 124), Penetrating(X) ignore X points d\'armure (p. 125)', () => {
  const inefficace = calculerArmureEffective({ armureBase: 2, couvert: COUVERT.leger, traitsArme: ['ineffective'] });
  assert.equal(inefficace.armureEffective, 8); // (2 + 2) × 2, p. 124
  assert.equal(inefficace.detail.ineffective, true);
  const pen4 = calculerArmureEffective({ armureBase: 5, traitsArme: [{ id: 'penetrating', valeur: 4 }] });
  assert.equal(pen4.armureEffective, 1); // 5 - 4, p. 125
  const pen9 = calculerArmureEffective({ armureBase: 5, traitsArme: ['penetrating(9)'] });
  assert.equal(pen9.armureEffective, 0); // minimum 0, p. 125
  const cumul = calculerArmureEffective({ armureBase: 3, couvert: COUVERT.moyen, traitsArme: ['ineffective', { id: 'penetrating', valeur: 2 }] });
  assert.equal(cumul.armureEffective, 12); // (3 + 4) × 2 - 2
});

test('resoudreDegats : dégâts + DR - armure, minimum 0 (p. 211-212)', () => {
  assert.equal(resoudreDegats({ degatsBase: 10, dr: 4, armureEffective: 2 }), 12);
  assert.equal(resoudreDegats({ degatsBase: 3, dr: 0, armureEffective: 5 }), 0);
  assert.equal(resoudreDegats({ degatsBase: 5, dr: 0 }), 5);
});

test('Désespéré : Supériorité du groupe strictement supérieure à la Résolution du PNJ (p. 197)', () => {
  assert.equal(verifierDesespere(4, 3), true);
  assert.equal(verifierDesespere(3, 3), false);
  assert.equal(verifierDesespere(2, 5), false);
});
