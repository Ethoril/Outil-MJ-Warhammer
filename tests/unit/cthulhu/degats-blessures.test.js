// Cthulhu 7e : dégâts (Impact, armure, empalement), blessure grave, Mourant, mort immédiate.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  NIVEAU, analyserExpression, maxExpression, impactEtCarrure, pvMax, calculerDegats,
  estBlessureGrave, appliquerBlessure, suiteJetConBlessure, suiteJetConMourant
} from '../../../cthulhu/regles.js';

/** Lanceur injecté : une valeur fixe par expression. */
const lanceur = valeurs => expression => {
  if (!(expression in valeurs)) throw new Error(`jet inattendu : ${expression}`);
  return valeurs[expression];
};

const couteau = { des: '1D4', empalante: true, aImpact: true };
const batte = { des: '1D6', empalante: false, aImpact: true };
const revolver = { des: '1D10', empalante: true, aImpact: false };

test('expressions de dés : maximum avec constantes et dés négatifs', () => {
  assert.equal(maxExpression('1D10+2'), 12);
  assert.equal(maxExpression('+1D4'), 4);
  assert.equal(maxExpression('-1'), -1);
  assert.equal(maxExpression('2D6-1D4'), 11);
  assert.deepEqual(analyserExpression('0'), []);
});

test('Impact et Carrure selon FOR + TAI, paliers au-delà de 284', () => {
  assert.deepEqual(impactEtCarrure(30, 30), { impact: '-2', carrure: -2 });
  assert.deepEqual(impactEtCarrure(55, 55), { impact: '0', carrure: 0 });
  assert.deepEqual(impactEtCarrure(80, 65), { impact: '+1D4', carrure: 1 });
  assert.deepEqual(impactEtCarrure(150, 135), { impact: '+3D6', carrure: 4 });
  assert.equal(pvMax(60, 55), 11);
});

test('dégâts ordinaires : arme + Impact en mêlée, armure soustraite', () => {
  const d = calculerDegats({ arme: couteau, impact: '+1D4', niveau: NIVEAU.ORDINAIRE, armure: 1, lancer: lanceur({ '1D4': 3, '+1D4': 2 }) });
  assert.equal(d.brut, 5);
  assert.equal(d.total, 4);
});

test('arme à feu : pas d’Impact', () => {
  const d = calculerDegats({ arme: revolver, impact: '+1D4', niveau: NIVEAU.MAJEURE, lancer: lanceur({ '1D10': 7 }) });
  assert.equal(d.total, 7);
});

test('empalement sur réussite Extrême : maximum + un jet de l’arme + Impact maximal en mêlée', () => {
  const d = calculerDegats({ arme: couteau, impact: '+1D4', niveau: NIVEAU.EXTREME, lancer: lanceur({ '1D4': 2 }) });
  assert.equal(d.total, 4 + 2 + 4);
  assert.equal(d.empale, true);
});

test('empalement d’une arme à feu : maximum + un jet, sans Impact ; le critique compte comme Extrême', () => {
  const d = calculerDegats({ arme: revolver, impact: '+1D4', niveau: NIVEAU.CRITIQUE, lancer: lanceur({ '1D10': 6 }) });
  assert.equal(d.total, 16);
});

test('arme non empalante sur Extrême : maximum de l’arme + Impact maximal, sans jet supplémentaire', () => {
  const d = calculerDegats({ arme: batte, impact: '+1D4', niveau: NIVEAU.EXTREME, lancer: lanceur({}) });
  assert.equal(d.total, 10);
  assert.equal(d.empale, false);
});

test('demi-dégâts (goule contre armes à feu) avant l’armure, arrondi à l’inférieur ; jamais négatif', () => {
  assert.equal(calculerDegats({ arme: revolver, niveau: NIVEAU.ORDINAIRE, reduction: 'moitie', lancer: lanceur({ '1D10': 7 }) }).total, 3);
  assert.equal(calculerDegats({ arme: batte, impact: '-2', niveau: NIVEAU.ORDINAIRE, armure: 2, lancer: lanceur({ '1D6': 1, '-2': -2 }) }).total, 0);
});

test('blessure grave : au moins la moitié des PV max en un coup (11 PV : 6 oui, 5 non)', () => {
  assert.equal(estBlessureGrave(6, 11), true);
  assert.equal(estBlessureGrave(5, 11), false);
  assert.equal(estBlessureGrave(5, 10), true);
});

test('blessure grave : jet de CON demandé, échec → inconscient', () => {
  const apres = appliquerBlessure({ pv: 11, pvMax: 11, blessureGrave: false, etat: 'actif' }, 6);
  assert.equal(apres.pv, 5);
  assert.equal(apres.grave, true);
  assert.equal(apres.jetCON, true);
  assert.equal(suiteJetConBlessure(apres, NIVEAU.ECHEC).etat, 'inconscient');
  assert.equal(suiteJetConBlessure(apres, NIVEAU.ORDINAIRE).etat, 'actif');
});

test('0 PV avec une blessure grave (même ancienne) → mourant ; sans → inconscient', () => {
  const blesse = { pv: 3, pvMax: 11, blessureGrave: true, etat: 'actif' };
  assert.equal(appliquerBlessure(blesse, 4).etat, 'mourant');
  const egratigne = { pv: 3, pvMax: 11, blessureGrave: false, etat: 'actif' };
  assert.equal(appliquerBlessure(egratigne, 4).etat, 'inconscient');
});

test('mourant : jet de CON chaque round, échec → mort', () => {
  const mourant = { pv: 0, pvMax: 11, blessureGrave: true, etat: 'mourant' };
  assert.equal(suiteJetConMourant(mourant, NIVEAU.ORDINAIRE).etat, 'mourant');
  assert.equal(suiteJetConMourant(mourant, NIVEAU.ECHEC).etat, 'mort');
});

test('mort immédiate : un coup supérieur aux PV max (égal : mourant, Gardien p. 107)', () => {
  const r = appliquerBlessure({ pv: 11, pvMax: 11, blessureGrave: false, etat: 'actif' }, 12);
  assert.equal(r.etat, 'mort');
  assert.equal(r.mortImmediate, true);
  const egal = appliquerBlessure({ pv: 11, pvMax: 11, blessureGrave: false, etat: 'actif' }, 11);
  assert.equal(egal.etat, 'mourant');
  assert.equal(egal.mortImmediate, false);
  assert.equal(appliquerBlessure({ pv: 11, pvMax: 11, blessureGrave: false, etat: 'actif' }, 10).mortImmediate, false);
});
