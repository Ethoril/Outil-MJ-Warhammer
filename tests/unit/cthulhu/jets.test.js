// Cthulhu 7e : jet d100 à niveaux, maladresse, dés bonus et malus (jets injectés, pas de hasard).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  NIVEAU, seuils, niveauDuJet, plancherMaladresse, desNets, combinerD100, valeurD100, lancerD100, testCompetence
} from '../../../cthulhu/regles.js';

test('seuils : entière, moitié, cinquième arrondis à l’inférieur', () => {
  assert.deepEqual(seuils(63), { ordinaire: 63, majeure: 31, extreme: 12 });
});

test('niveaux : 01 critique, ≤ 1/5 extrême, ≤ 1/2 majeure, ≤ valeur ordinaire, au-delà échec', () => {
  assert.equal(niveauDuJet(1, 60), NIVEAU.CRITIQUE);
  assert.equal(niveauDuJet(12, 60), NIVEAU.EXTREME);
  assert.equal(niveauDuJet(13, 60), NIVEAU.MAJEURE);
  assert.equal(niveauDuJet(30, 60), NIVEAU.MAJEURE);
  assert.equal(niveauDuJet(31, 60), NIVEAU.ORDINAIRE);
  assert.equal(niveauDuJet(60, 60), NIVEAU.ORDINAIRE);
  assert.equal(niveauDuJet(61, 60), NIVEAU.ECHEC);
});

test('01 reste critique même avec une valeur très basse', () => {
  assert.equal(niveauDuJet(1, 3), NIVEAU.CRITIQUE);
});

test('maladresse : 100 seul quand le seuil est ≥ 50', () => {
  assert.equal(niveauDuJet(99, 50), NIVEAU.ECHEC);
  assert.equal(niveauDuJet(100, 50), NIVEAU.MALADRESSE);
});

test('maladresse : 96 à 100 quand le seuil est < 50 (cas limite 49 / 50)', () => {
  assert.equal(niveauDuJet(95, 49), NIVEAU.ECHEC);
  assert.equal(niveauDuJet(96, 49), NIVEAU.MALADRESSE);
  assert.equal(plancherMaladresse(49), 96);
  assert.equal(plancherMaladresse(50), 100);
});

test('maladresse : le seuil effectif de la difficulté compte par défaut, la valeur entière sur option', () => {
  // Compétence 60 en difficulté majeure : on vise 30, donc maladresse dès 96.
  assert.equal(plancherMaladresse(60, { difficulte: 'majeure' }), 96);
  assert.equal(niveauDuJet(97, 60, { difficulte: 'majeure' }), NIVEAU.MALADRESSE);
  assert.equal(niveauDuJet(97, 60, { difficulte: 'majeure', maladresseSurValeur: true }), NIVEAU.ECHEC);
});

test('d100 : dizaine 0 et unité 0 font 100', () => {
  assert.equal(valeurD100(0, 0), 100);
  assert.equal(valeurD100(0, 5), 5);
  assert.equal(valeurD100(9, 0), 90);
});

test('dé bonus : on garde la dizaine la plus favorable', () => {
  assert.deepEqual(combinerD100({ unite: 3, dizaines: [7, 2], net: 1 }), { jet: 23, candidats: [73, 23], net: 1 });
});

test('dé malus : on garde la dizaine la plus défavorable, 00 + 0 = 100 compris', () => {
  assert.equal(combinerD100({ unite: 0, dizaines: [3, 0], net: -1 }).jet, 100);
  assert.equal(combinerD100({ unite: 4, dizaines: [1, 6, 2], net: -2 }).jet, 64);
});

test('compensation un pour un : 1 bonus + 2 malus = 1 malus net', () => {
  assert.equal(desNets(1, 2), -1);
  assert.equal(desNets(2, 2), 0);
});

test('2 dés nets au maximum, dans les deux sens', () => {
  assert.equal(desNets(3, 0), 2);
  assert.equal(desNets(0, 5), -2);
  assert.equal(desNets(4, 1), 2);
  // Trois dizaines fournies avec 3 bonus demandés : seules 1 + 2 servent.
  assert.equal(combinerD100({ unite: 5, dizaines: [8, 7, 6, 0], net: 3 }).jet, 65);
});

test('lancerD100 jette 1 + |net| dizaines avec le générateur injecté', () => {
  const suite = [0.35, 0.81, 0.12]; // unité 3, dizaines 8 et 1
  const rng = () => suite.shift();
  const r = lancerD100({ net: 1, rng });
  assert.deepEqual(r.dizaines, [8, 1]);
  assert.equal(r.jet, 13);
});

test('testCompetence : réussite selon la difficulté et dés nets appliqués', () => {
  const t = testCompetence({ valeur: 60, difficulte: 'majeure', bonus: 1, des: { unite: 5, dizaines: [6, 2] } });
  assert.equal(t.jet, 25);
  assert.equal(t.niveau, NIVEAU.MAJEURE);
  assert.equal(t.reussi, true);
  const echec = testCompetence({ valeur: 60, difficulte: 'extreme', des: 25 });
  assert.equal(echec.reussi, false);
  assert.equal(echec.seuil, 12);
});
