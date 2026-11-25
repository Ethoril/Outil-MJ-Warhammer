// Cthulhu 7e : test opposé, mêlée (Rendre les coups, Esquiver), surnombre, ordre DEX, tir.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  NIVEAU, testOppose, resoudreMelee, desBonusSurnombre, ordreDex, dexInitiative,
  difficulteDePortee, distanceBoutPortant, preparerTir
} from '../../../cthulhu/regles.js';

const { ECHEC, ORDINAIRE, MAJEURE, EXTREME, MALADRESSE } = NIVEAU;

test('test opposé : le meilleur niveau gagne', () => {
  assert.equal(testOppose({ niveau: MAJEURE, valeur: 30 }, { niveau: ORDINAIRE, valeur: 80 }), 'a');
});

test('test opposé : égalité de niveau, la plus haute valeur gagne', () => {
  assert.equal(testOppose({ niveau: ORDINAIRE, valeur: 40 }, { niveau: ORDINAIRE, valeur: 55 }), 'b');
});

test('test opposé : deux échecs, personne ne gagne ; même niveau et même valeur, égalité', () => {
  assert.equal(testOppose({ niveau: ECHEC, valeur: 40 }, { niveau: MALADRESSE, valeur: 55 }), 'aucun');
  assert.equal(testOppose({ niveau: MAJEURE, valeur: 50 }, { niveau: MAJEURE, valeur: 50 }), 'egalite');
});

test('Rendre les coups : égalité de niveau, l’attaquant gagne et touche', () => {
  const r = resoudreMelee({ attaque: { niveau: ORDINAIRE }, defense: { niveau: ORDINAIRE }, mode: 'rendre' });
  assert.deepEqual(r, { vainqueur: 'attaquant', touche: 'defenseur', niveauDegats: ORDINAIRE });
});

test('Rendre les coups : défense meilleure, le défenseur inflige ses dégâts (ordinaires : ni extrêmes ni empalement, Gardien p. 92)', () => {
  const r = resoudreMelee({ attaque: { niveau: ORDINAIRE }, defense: { niveau: EXTREME }, mode: 'rendre' });
  assert.deepEqual(r, { vainqueur: 'defenseur', touche: 'attaquant', niveauDegats: ORDINAIRE });
});

test('Rendre les coups : attaque ratée, défense réussie, l’attaquant est touché', () => {
  const r = resoudreMelee({ attaque: { niveau: ECHEC }, defense: { niveau: ORDINAIRE }, mode: 'rendre' });
  assert.equal(r.touche, 'attaquant');
});

test('Esquiver : égalité de niveau, le défenseur esquive sans infliger de dégâts', () => {
  const r = resoudreMelee({ attaque: { niveau: MAJEURE }, defense: { niveau: MAJEURE }, mode: 'esquiver' });
  assert.deepEqual(r, { vainqueur: 'defenseur', touche: null, niveauDegats: null });
});

test('Esquiver : attaque meilleure, le coup porte', () => {
  const r = resoudreMelee({ attaque: { niveau: EXTREME }, defense: { niveau: ORDINAIRE }, mode: 'esquiver' });
  assert.equal(r.touche, 'defenseur');
  assert.equal(r.niveauDegats, EXTREME);
});

test('mêlée : deux échecs, rien ne se passe', () => {
  assert.equal(resoudreMelee({ attaque: { niveau: ECHEC }, defense: { niveau: ECHEC }, mode: 'rendre' }).vainqueur, 'aucun');
});

test('surnombre : 1 dé bonus seulement après une première défense du round', () => {
  assert.equal(desBonusSurnombre({ defensesFaites: 0 }), 0);
  assert.equal(desBonusSurnombre({ defensesFaites: 1 }), 1);
  assert.equal(desBonusSurnombre({ defensesFaites: 2 }), 1);
  assert.equal(desBonusSurnombre({ defensesFaites: 1, defensesParRound: 3 }), 0);
});

test('ordre DEX : décroissant, +50 avec une arme à feu prête', () => {
  assert.equal(dexInitiative({ dex: 60, armeFeuPrete: true }), 110);
  const ordre = ordreDex([
    { id: 'goule', dex: 65 }, { id: 'edie', dex: 80 }, { id: 'cultiste', dex: 50, armeFeuPrete: true }, { id: 'erudit', dex: 40 }
  ]).map(r => r.id);
  assert.deepEqual(ordre, ['cultiste', 'edie', 'goule', 'erudit']);
});

test('ordre DEX : égalité départagée par la compétence de combat, puis l’ordre d’entrée', () => {
  const ordre = ordreDex([{ id: 'a', dex: 50, combat: 30 }, { id: 'b', dex: 50, combat: 60 }, { id: 'c', dex: 50, combat: 30 }]).map(r => r.id);
  assert.deepEqual(ordre, ['b', 'a', 'c']);
});

test('tir : portée base ordinaire, ×2 majeure, ×4 extrême, au-delà hors de portée', () => {
  assert.equal(difficulteDePortee(15, 15), 'ordinaire');
  assert.equal(difficulteDePortee(16, 15), 'majeure');
  assert.equal(difficulteDePortee(30, 15), 'majeure');
  assert.equal(difficulteDePortee(60, 15), 'extreme');
  assert.equal(difficulteDePortee(61, 15), null);
});

test('tir : bout portant (DEX/10 mètres, Gardien p. 100) donne 1 dé bonus', () => {
  assert.equal(distanceBoutPortant(60), 6);
  const t = preparerTir({ distance: 6, porteeBase: 15, dexTireur: 60 });
  assert.equal(t.boutPortant, true);
  assert.equal(t.bonus, 1);
  assert.equal(preparerTir({ distance: 7, porteeBase: 15, dexTireur: 60 }).bonus, 0);
});

test('tir : 1 dé malus dans la mêlée, 1 autre à couvert, cumulables', () => {
  assert.equal(preparerTir({ distance: 10, porteeBase: 15, dexTireur: 50, dansMelee: true }).malus, 1);
  assert.equal(preparerTir({ distance: 10, porteeBase: 15, dexTireur: 50, dansMelee: true, couvert: true }).malus, 2);
});
