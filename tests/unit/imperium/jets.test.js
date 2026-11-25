// Imperium Maledictum : jets de pourcentage, DR, difficultés, Avantage/Désavantage, tests opposés.
// Tous les exemples chiffrés viennent du Core Book (page citée en commentaire ; page PDF = page imprimée).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  CARACS, DIFFICULTES, bonusCarac, blessuresMax, critiquesMax, initiativeDe,
  normaliserJet, inverserJet, resumerAvantage, palierResultat, prevoirTest, selectionnerOptionTest,
  resoudreTestOppose, analyserExpression, lancerExpression
} from '../../../imperium/regles.js';

test('CARACS : les neuf caractéristiques, p. 50', () => {
  assert.deepEqual([...CARACS], ['CC', 'CT', 'F', 'E', 'Ag', 'Int', 'Per', 'FM', 'Soc']);
});

test('DIFFICULTES : table des difficultés p. 188, libellés français (vocabulaire Warhammer)', () => {
  assert.deepEqual(Object.keys(DIFFICULTES),
    ['tres-facile', 'facile', 'accessible', 'intermediaire', 'difficile', 'ardu', 'tres-ardu']);
  assert.equal(DIFFICULTES['tres-facile'].modif, +60); // Très facile, p. 188
  assert.equal(DIFFICULTES['facile'].modif, +40); // Facile, p. 188
  assert.equal(DIFFICULTES['accessible'].modif, +20); // Accessible +20, p. 188
  assert.equal(DIFFICULTES['accessible'].libelle, 'Accessible');
  assert.equal(DIFFICULTES['intermediaire'].modif, 0); // Intermédiaire +0, p. 188
  assert.equal(DIFFICULTES['intermediaire'].libelle, 'Intermédiaire');
  assert.equal(DIFFICULTES['difficile'].modif, -10); // Difficile, p. 188
  assert.equal(DIFFICULTES['ardu'].modif, -20); // Ardu, p. 188
  assert.equal(DIFFICULTES['tres-ardu'].modif, -30); // Très ardu, p. 188
  assert.ok(Object.values(DIFFICULTES).every(d => d.page === 188));
});

test('bonusCarac : premier chiffre de la caractéristique, p. 50 (F 39 → 3, FM 51 → 5)', () => {
  assert.equal(bonusCarac(39), 3);
  assert.equal(bonusCarac(51), 5);
  assert.equal(bonusCarac(37), 3); // Force 37 de sœur Helza, p. 211
});

test('blessuresMax = bonus F + 2 × bonus E + bonus FM, p. 88', () => {
  // Formule p. 88 ; combinaison choisie pour illustrer le total de 16 blessures max du Gang Leader p. 215.
  assert.equal(blessuresMax({ F: 37, E: 40, FM: 51 }), 3 + 2 * 4 + 5);
});

test('critiquesMax : Troupe 0, Élite 1, sinon bonus d\'E (p. 88, 317 ; Leo a un bonus d\'E de 3, p. 215)', () => {
  assert.equal(critiquesMax({ E: 35 }, 'troupe'), 0);
  assert.equal(critiquesMax({ E: 35 }, 'elite'), 1);
  assert.equal(critiquesMax({ E: 35 }, 'chef'), 3);
  assert.equal(critiquesMax({ E: 35 }, 'pj'), 3);
});

test('initiativeDe = bonus Per + bonus Ag, p. 88 et 198', () => {
  // Valeurs d'exemple du livre : Intuition 45 du garde p. 190, Melee 42 de sœur Helza p. 211.
  assert.equal(initiativeDe({ Per: 45, Ag: 42 }), 4 + 4);
});

test('normaliserJet : 1..100, la chaîne "00" vaut 100', () => {
  assert.equal(normaliserJet('00'), 100);
  assert.equal(normaliserJet(5), 5);
  assert.equal(normaliserJet(100), 100);
  assert.throws(() => normaliserJet(0), RangeError);
  assert.throws(() => normaliserJet(101), RangeError);
});

test('inverserJet : échange dizaines et unités (p. 189 : 71 → 17, 72 → 27, 28 → 82 ; 100 reste 100)', () => {
  assert.equal(inverserJet(71), 17);
  assert.equal(inverserJet(72), 27);
  assert.equal(inverserJet(28), 82);
  assert.equal(inverserJet(27), 72);
  assert.equal(inverserJet(100), 100);
  assert.equal(inverserJet('00'), 100);
});

test('resumerAvantage : annulation 1 à 1, puis ±10 par source restante au-delà de la première, p. 189', () => {
  // Exemple Leo p. 189 : 1 Avantage (caché) + 2 Désavantages (Longue portée, pénombre) → il reste 1 Désavantage, aucun ±10.
  assert.deepEqual(resumerAvantage({ avantages: ['cache'], desavantages: ['loin', 'sombre'] }),
    { net: -1, inversion: 'imposee', modifSeuil: 0 });
  assert.deepEqual(resumerAvantage({ avantages: ['a', 'b'] }), { net: 2, inversion: 'facultative', modifSeuil: +10 });
  assert.deepEqual(resumerAvantage({ avantages: ['a'], desavantages: ['b', 'c', 'd'] }), { net: -2, inversion: 'imposee', modifSeuil: -10 });
  assert.deepEqual(resumerAvantage({ avantages: ['a'], desavantages: ['b'] }), { net: 0, inversion: 'aucune', modifSeuil: 0 });
  assert.deepEqual(resumerAvantage({}), { net: 0, inversion: 'aucune', modifSeuil: 0 });
});

test('palierResultat : table des résultats p. 187', () => {
  assert.deepEqual(palierResultat(5, true), { id: '+5', libelle: 'Réussite éclatante' });
  assert.deepEqual(palierResultat(3, true), { id: '+3', libelle: 'Réussite impressionnante' });
  assert.deepEqual(palierResultat(1, true), { id: '+1', libelle: 'Réussite' });
  assert.deepEqual(palierResultat(0, true), { id: '+0', libelle: 'Réussite marginale' });
  assert.deepEqual(palierResultat(0, false), { id: '-0', libelle: 'Échec marginal' });
  assert.deepEqual(palierResultat(-2, false), { id: '-1', libelle: 'Échec' });
  assert.deepEqual(palierResultat(-4, false), { id: '-3', libelle: 'Échec impressionnant' });
  assert.deepEqual(palierResultat(-5, false), { id: '-5', libelle: 'Échec éclatant' });
});

test('DR = dizaines du seuil - dizaines du jet (p. 187 : compétence 72, jet 26 → +5 ; compétence 54, jet 94 → -4)', () => {
  const r1 = prevoirTest({ seuil: 72, jet: 26 });
  assert.equal(r1.dr, 5);
  assert.equal(r1.palier.id, '+5');
  assert.equal(r1.reussi, true);
  const r2 = prevoirTest({ seuil: 54, jet: 94 });
  assert.equal(r2.dr, -4);
  assert.equal(r2.palier.id, '-3'); // -3 à -4 = Échec impressionnant, p. 187
  assert.equal(r2.reussi, false);
});

test('ajustement de DR amenant à 0 → réussite marginale +0 (p. 187 : Leo -3 SL + 3 Supériorité = +0)', () => {
  const r = prevoirTest({ seuil: 40, jet: 73, bonusDR: 3 }); // 4 - 7 = -3, +3 → +0
  assert.equal(r.dr, 0);
  assert.equal(r.reussi, true);
  assert.equal(r.palier.id, '+0');
});

test('DR 0 sans ajustement : réussite si jet <= seuil, sinon échec marginal -0 (p. 187)', () => {
  const ok = prevoirTest({ seuil: 54, jet: 54 });
  assert.equal(ok.dr, 0);
  assert.equal(ok.reussi, true);
  assert.equal(ok.palier.id, '+0');
  const ko = prevoirTest({ seuil: 54, jet: 58 }); // mêmes dizaines, jet au-delà du seuil
  assert.equal(ko.dr, 0);
  assert.equal(ko.reussi, false);
  assert.equal(ko.palier.id, '-0');
});

test('difficulté : Wilkus Linguistics 35 en Accessible (+20) → seuil effectif 55, jet 42 = +1 SL (p. 188)', () => {
  const r = prevoirTest({ seuil: 35, jet: 42, difficulte: 'accessible' });
  assert.equal(r.seuilEffectif, 55);
  assert.equal(r.dr, 1);
  assert.equal(r.reussi, true);
  assert.equal(r.palier.id, '+1');
});

test('succès automatique des 01-05 même si le seuil effectif est < 05 (p. 188 : Casseum Tech 29 en Très ardu, jet 03)', () => {
  const r = prevoirTest({ seuil: 29, jet: 3, difficulte: 'tres-ardu' }); // 29 - 30 = -1 → seuil effectif 0
  assert.equal(r.seuilEffectif, 0);
  assert.equal(r.reussi, true);
  assert.equal(r.dr, 0); // réussite marginale +0
  assert.equal(r.palier.id, '+0');
});

test('échec automatique des 96-00 (p. 188) : -0 marginal si le seuil effectif est >= 96, sinon DR calculé', () => {
  const haut = prevoirTest({ seuil: 70, jet: 96, difficulte: 'tres-facile' }); // seuil effectif 130
  assert.equal(haut.reussi, false);
  assert.equal(haut.dr, 0);
  assert.equal(haut.palier.id, '-0');
  assert.equal(haut.maladresseAuto, false); // 96 n'est pas 99-00
  const bas = prevoirTest({ seuil: 40, jet: 96 });
  assert.equal(bas.reussi, false);
  assert.equal(bas.dr, -5); // 4 - 9
  assert.equal(bas.palier.id, '-5');
});

test('99-00 = maladresse automatique (p. 188), signalée même hors combat', () => {
  const r = prevoirTest({ seuil: 50, jet: 99 });
  assert.equal(r.maladresseAuto, true);
  assert.equal(r.maladresse, false); // le champ maladresse ne concerne que le combat (p. 213)
  assert.equal(r.dr, -4); // 5 - 9
  assert.equal(prevoirTest({ seuil: 50, jet: 100 }).maladresseAuto, true);
});

test('Avantage facultatif : Leo Stealth 56, jet 72 → 27 inversé est proposé et réussit (p. 189)', () => {
  const a = prevoirTest({ seuil: 56, jet: 72, avantages: ['alcove'] });
  assert.equal(a.avantage.net, 1);
  assert.equal(a.choixRequis, true);
  assert.equal(a.inversionForcee, false);
  assert.deepEqual(a.options.map(o => o.id), ['keep', 'reverse']);
  const keep = a.options.find(o => o.id === 'keep');
  assert.equal(keep.jet, 72);
  assert.equal(keep.dr, -2); // 5 - 7
  assert.equal(keep.reussi, false);
  const choisi = selectionnerOptionTest(a, 'reverse');
  assert.equal(choisi.jet, 27);
  assert.equal(choisi.dr, 3); // 5 - 2
  assert.equal(choisi.reussi, true);
  assert.equal(choisi.palier.id, '+3');
});

test('assistance = Avantage (p. 189 : Leo Athletics 43, jet 61 → 16 inversé, +3 SL avec l\'aide de Casseum)', () => {
  const a = prevoirTest({ seuil: 43, jet: 61, avantages: ['aide'] });
  const choisi = selectionnerOptionTest(a, 'reverse');
  assert.equal(choisi.jet, 16);
  assert.equal(choisi.dr, 3); // 4 - 1
  assert.equal(choisi.palier.id, '+3');
});

test('Avantage non bénéfique : pas d\'option d\'inversion (p. 189 : on inverse seulement si cela profite)', () => {
  const a = prevoirTest({ seuil: 56, jet: 27, avantages: ['alcove'] }); // 27 → 72 serait pire
  assert.equal(a.choixRequis, false);
  assert.deepEqual(a.options.map(o => o.id), ['keep']);
  assert.equal(a.optionAppliquee, 'keep');
});

test('Désavantage imposé : jet 28 → 82 inversé obligatoire (p. 189)', () => {
  const a = prevoirTest({ seuil: 50, jet: 28, desavantages: ['x'] });
  assert.equal(a.inversionForcee, true);
  assert.equal(a.optionAppliquee, 'reverse');
  assert.equal(a.jetLance, 28); // jet réellement lancé
  assert.equal(a.jet, 82); // jet effectivement évalué après inversion obligatoire
  assert.equal(a.dr, -3); // 5 - 8 avec le jet inversé 82
  assert.equal(a.reussi, false);
  assert.deepEqual(a.options.map(o => o.id), ['reverse']);
});

test('sources d\'Avantage multiples : +10 au seuil par source au-delà de la première (p. 189)', () => {
  const a = prevoirTest({ seuil: 35, jet: 42, avantages: ['a', 'b'] });
  assert.equal(a.avantage.modifSeuil, +10);
  assert.equal(a.seuilEffectif, 45); // 35 + 10
  assert.equal(a.dr, 0); // 4 - 4
  assert.equal(a.reussi, true); // jet 42 <= 45
});

test('test opposé p. 190 : Wilkus Rapport 41 jet 57 (-1) contre garde Intuition 45 jet 23 (+2) → le garde gagne', () => {
  const init = prevoirTest({ seuil: 41, jet: 57 });
  const adv = prevoirTest({ seuil: 45, jet: 23 });
  assert.equal(init.dr, -1);
  assert.equal(adv.dr, 2);
  const r = resoudreTestOppose(init, adv);
  assert.equal(r.gagnant, 'adv');
  assert.equal(r.drNet, -3); // -1 - 2
  assert.equal(r.egaliteParfaite, false);
});

test('test opposé p. 190 : Melee 54 jet 35 (+2) contre parade Melee 60 jet 29 (+4) → échec final de -2 SL', () => {
  const init = prevoirTest({ seuil: 54, jet: 35 });
  const adv = prevoirTest({ seuil: 60, jet: 29 });
  assert.equal(init.dr, 2);
  assert.equal(adv.dr, 4);
  const r = resoudreTestOppose(init, adv);
  assert.equal(r.gagnant, 'adv');
  assert.equal(r.drNet, -2); // 2 - 4 = -2, résultat final du test opposé, p. 190
});

test('test opposé p. 190 : DR égaux → la compétence effective la plus haute gagne ; égalité parfaite sinon', () => {
  const init = prevoirTest({ seuil: 60, jet: 30 }); // +3, seuil 60
  const adv = prevoirTest({ seuil: 40, jet: 10 }); // +3, seuil 40
  const r = resoudreTestOppose(init, adv);
  assert.equal(r.gagnant, 'init'); // à DR égal, la compétence la plus haute gagne, p. 190
  assert.equal(r.drNet, 0);
  const a = prevoirTest({ seuil: 50, jet: 25 });
  const b = prevoirTest({ seuil: 50, jet: 25 });
  const tie = resoudreTestOppose(a, b);
  assert.deepEqual(tie, { gagnant: null, egaliteParfaite: true, drNet: 0 }); // égalité parfaite : le MJ tranche, p. 190
});

test('test opposé p. 187, 190, 213 : +0 bat -0 quand les deux DR sont nuls (le camp réussi gagne, drNet 0)', () => {
  const init = prevoirTest({ seuil: 54, jet: 54 }); // DR 0, réussite marginale +0 (jet <= seuil)
  const adv = prevoirTest({ seuil: 54, jet: 58 }); // DR 0, échec marginal -0 (mêmes dizaines, jet au-delà du seuil)
  assert.equal(init.dr, 0);
  assert.equal(init.reussi, true);
  assert.equal(init.palier.id, '+0');
  assert.equal(adv.dr, 0);
  assert.equal(adv.reussi, false);
  assert.equal(adv.palier.id, '-0');
  // +0 est un DR positif, strictement supérieur au DR négatif -0 (p. 187, 190, 213)
  assert.deepEqual(resoudreTestOppose(init, adv), { gagnant: 'init', drNet: 0, egaliteParfaite: false });
  assert.deepEqual(resoudreTestOppose(adv, init), { gagnant: 'adv', drNet: 0, egaliteParfaite: false });
});

test('analyserExpression : constantes et NdX±M', () => {
  assert.deepEqual(analyserExpression('2d10'), [{ signe: 1, n: 2, faces: 10 }]);
  assert.deepEqual(analyserExpression('1d10+2'), [{ signe: 1, n: 1, faces: 10 }, { signe: 1, n: 2, faces: 0 }]);
  assert.deepEqual(analyserExpression('1d5-1'), [{ signe: 1, n: 1, faces: 5 }, { signe: -1, n: 1, faces: 0 }]);
  assert.deepEqual(analyserExpression('0'), []);
});

test('lancerExpression jette avec le générateur injecté', () => {
  assert.equal(lancerExpression('2d10', () => 0.5), 12); // chaque dé : 1 + floor(0.5 × 10) = 6
  assert.equal(lancerExpression('1d5', () => 0.99), 5);
  assert.equal(lancerExpression('1d5-1', () => 0), 0);
  assert.equal(lancerExpression('7'), 7);
});
