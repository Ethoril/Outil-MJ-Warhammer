// Cthulhu 7e : perte de SAN, folies temporaire et persistante, dépense de Chance, test redoublé.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  NIVEAU, TYPE_TEST, analyserCoutSan, perteSan, appliquerPerteSan, nouvelleJourneeSan, foliePassagere,
  depenseChance, peutRedoubler
} from '../../../cthulhu/regles.js';

const fixe = valeurs => e => valeurs[e];

test('coût x/y : réussite → x, échec → y, maladresse → maximum de y', () => {
  assert.deepEqual(analyserCoutSan('1/1D6'), { reussite: '1', echec: '1D6' });
  assert.equal(perteSan({ cout: '1/1D6', niveau: NIVEAU.MAJEURE, lancer: fixe({ 1: 1 }) }), 1);
  assert.equal(perteSan({ cout: '1/1D6', niveau: NIVEAU.ECHEC, lancer: fixe({ '1D6': 4 }) }), 4);
  assert.equal(perteSan({ cout: '1/1D6', niveau: NIVEAU.MALADRESSE, lancer: fixe({}) }), 6);
  assert.equal(perteSan({ cout: '0/1D3', niveau: NIVEAU.ORDINAIRE, lancer: fixe({ 0: 0 }) }), 0);
});

test('folie temporaire : ≥ 5 points d’un coup ET réussite au jet d’INT', () => {
  assert.equal(foliePassagere({ perte: 5, niveauINT: NIVEAU.ORDINAIRE }), true);
  assert.equal(foliePassagere({ perte: 5, niveauINT: NIVEAU.ECHEC }), false);
  assert.equal(foliePassagere({ perte: 4, niveauINT: NIVEAU.EXTREME }), false);
  assert.equal(appliquerPerteSan({ san: 60 }, 5).jetIntRequis, true);
  assert.equal(appliquerPerteSan({ san: 60 }, 4).jetIntRequis, false);
});

test('folie persistante : cumul journalier, perte en cours comprise, ≥ 1/5 de la SAN d’avant cette perte (arrondi inférieur)', () => {
  let etat = { san: 55, journee: nouvelleJourneeSan(55) };
  let r = appliquerPerteSan(etat, 6); // seuil floor(55/5) = 11 : 6, pas encore
  assert.equal(r.persistante, false);
  assert.equal(r.journee.perteJour, 6);
  etat = { san: r.san, journee: r.journee };
  r = appliquerPerteSan(etat, 2); // SAN 49, seuil 9 : cumul 8, pas encore
  assert.equal(r.persistante, false);
  etat = { san: r.san, journee: r.journee };
  r = appliquerPerteSan(etat, 1); // SAN 47, seuil 9 : cumul 9, atteint
  assert.equal(r.persistante, true);
  assert.equal(r.san, 46);
});

test('folie persistante : signalée une seule fois par journée, puis nouvelle journée remise à zéro', () => {
  const premiere = appliquerPerteSan({ san: 50, journee: nouvelleJourneeSan(50) }, 10);
  assert.equal(premiere.persistante, true);
  const encore = appliquerPerteSan({ san: premiere.san, journee: premiere.journee }, 3);
  assert.equal(encore.persistante, false);
  const lendemain = appliquerPerteSan({ san: encore.san, journee: nouvelleJourneeSan(encore.san) }, 2);
  assert.equal(lendemain.journee.perteJour, 2);
  assert.equal(lendemain.persistante, false);
});

test('folie permanente à 0 SAN', () => {
  assert.equal(appliquerPerteSan({ san: 4 }, 6).permanente, true);
  assert.equal(appliquerPerteSan({ san: 4 }, 6).san, 0);
});

test('Chance : 1 point par point manquant, jusqu’au seuil de la difficulté visée', () => {
  const r = depenseChance({ jet: 47, valeur: 40, niveau: NIVEAU.ECHEC, chance: 50 });
  assert.deepEqual(r, { autorise: true, cout: 7, nouveauJet: 40, chanceRestante: 43 });
  assert.equal(depenseChance({ jet: 47, valeur: 40, difficulte: 'majeure', niveau: NIVEAU.ECHEC, chance: 50 }).cout, 27);
  assert.equal(depenseChance({ jet: 47, valeur: 40, niveau: NIVEAU.ECHEC, chance: 5 }).autorise, false);
});

test('Chance : interdite sur maladresse, SAN, Chance, dégâts, perte de SAN et test redoublé', () => {
  const base = { jet: 97, valeur: 40, niveau: NIVEAU.MALADRESSE, chance: 99 };
  assert.equal(depenseChance(base).autorise, false);
  for (const typeTest of [TYPE_TEST.SAN, TYPE_TEST.CHANCE, TYPE_TEST.DEGATS, TYPE_TEST.PERTE_SAN]) {
    assert.equal(depenseChance({ jet: 45, valeur: 40, niveau: NIVEAU.ECHEC, chance: 99, typeTest }).autorise, false, typeTest);
  }
  assert.equal(depenseChance({ jet: 45, valeur: 40, niveau: NIVEAU.ECHEC, chance: 99, redouble: true }).autorise, false);
  assert.equal(depenseChance({ jet: 45, valeur: 40, niveau: NIVEAU.ECHEC, chance: 99, redouble: true, chanceSurRedouble: true }).autorise, true);
  assert.equal(depenseChance({ jet: 45, valeur: 40, niveau: NIVEAU.ECHEC, chance: 99, typeTest: TYPE_TEST.COMBAT }).autorise, true);
});

test('test redoublé : seulement un échec ordinaire, une fois', () => {
  assert.equal(peutRedoubler({ niveau: NIVEAU.ECHEC }).autorise, true);
  assert.equal(peutRedoubler({ niveau: NIVEAU.MALADRESSE }).autorise, false);
  assert.equal(peutRedoubler({ niveau: NIVEAU.ORDINAIRE }).autorise, false);
  assert.equal(peutRedoubler({ niveau: NIVEAU.ECHEC, dejaRedouble: true }).autorise, false);
  assert.equal(peutRedoubler({ niveau: NIVEAU.ECHEC, chanceDepensee: true }).autorise, false);
});

test('test redoublé : interdit en combat, SAN, Chance, poursuite et test opposé', () => {
  for (const typeTest of [TYPE_TEST.COMBAT, TYPE_TEST.SAN, TYPE_TEST.CHANCE, TYPE_TEST.POURSUITE, TYPE_TEST.OPPOSE]) {
    assert.equal(peutRedoubler({ niveau: NIVEAU.ECHEC, typeTest }).autorise, false, typeTest);
  }
});
