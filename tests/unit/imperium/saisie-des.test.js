// Imperium Maledictum (lot I4) : prévision et saisie des dés par sondage du moteur.
// Module pur `imperium/saisie-des.js` : validation, tirage d'une case, fournisseur strict,
// et sondage dynamique (`sondeAction` / `planAction`) sur copie sans aucune règle recodée.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  validerEntier, tirerCase, fournisseurStrict, sondeAction, planAction
} from '../../../imperium/saisie-des.js';
import {
  composerRencontre, commencerRound, passerTour, attaquerMelee, attaquerDistance,
  choisirInversion, appliquerEtat, testLibre, testOppose, premiersSoins, depenserDestin,
  participant
} from '../../../imperium/rencontre.js';
import { reserveDeDepart } from '../../../imperium/donnees-depart.js';
import { ajouterProfil } from '../../../imperium/profils.js';

function reserveTest() {
  let r = reserveDeDepart();
  r = ajouterProfil(r, {
    id: 'helza', nom: 'Sœur Helza', kind: 'PJ', camp: 'pj',
    taille: 'moyenne', vitesse: 'normale',
    carac: { CC: 40, CT: 40, F: 37, E: 40, Ag: 40, Int: 40, Per: 40, FM: 51, Soc: 40 },
    competences: { Mêlée: 42, Tir: 40, Réflexes: 50, Endurance: 50, Médecine: 40, Discrétion: 40 },
    armure: 2, armes: ['epee', 'pistolet-laser'], resolution: 3, destinMax: 3
  });
  return r;
}

const rencontreBase = (opts = {}) =>
  commencerRound(composerRencontre(reserveTest(), opts.entrees ?? ['helza', 'executeur'], opts.options));

/** Vérifie que `fn(rencontre)` ne mute jamais `rencontre`. */
function sansMutation(rencontre, fn) {
  const avant = JSON.stringify(rencontre);
  const res = fn(rencontre);
  assert.equal(JSON.stringify(rencontre), avant, 'la rencontre source ne doit jamais être mutée');
  return res;
}

// --- validerEntier ---------------------------------------------------------------------------

test('validerEntier : accepte les entiers dans les bornes, rejette vide, espaces, décimaux, NaN et hors-bornes', () => {
  assert.deepEqual(validerEntier('25', { min: 1, max: 100, libelle: 'd100 attaque' }), { ok: true, valeur: 25 });
  assert.deepEqual(validerEntier('  7 ', { min: 1, max: 100, libelle: 'd100' }), { ok: true, valeur: 7 });
  assert.deepEqual(validerEntier('100', { min: 1, max: 100, libelle: 'd100' }), { ok: true, valeur: 100 });
  assert.deepEqual(validerEntier('0', { min: 0, max: Infinity, libelle: 'Sévérité' }), { ok: true, valeur: 0 });
  for (const brut of ['', '   ', '12.5', 'abc', '1e2', '0x10', '12 3']) {
    const r = validerEntier(brut, { min: 1, max: 100, libelle: 'd100 attaque' });
    assert.equal(r.ok, false, `« ${brut} » accepté`);
    assert.match(r.message, /^d100 attaque : /);
  }
  assert.equal(validerEntier('0', { min: 1, max: 100, libelle: 'd100' }).ok, false);
  assert.equal(validerEntier('101', { min: 1, max: 100, libelle: 'd100' }).ok, false);
  assert.match(validerEntier('101', { min: 1, max: 100, libelle: 'd100' }).message, /hors limites/);
});

// --- tirerCase -------------------------------------------------------------------------------

test('tirerCase : d100 tire dans [1, 100] et délègue les autres expressions à lancerExpression', () => {
  assert.equal(tirerCase('d100', () => 0), 1);
  assert.equal(tirerCase('d100', () => 0.999999999), 100);
  assert.equal(tirerCase('D100', () => 0.5), 51);
  for (let i = 0; i < 300; i++) {
    const v = tirerCase('d100', Math.random);
    assert.ok(Number.isInteger(v) && v >= 1 && v <= 100);
  }
  assert.equal(tirerCase('1d10', () => 0), 1);
  assert.equal(tirerCase('1d10', () => 0.999999999), 10);
  assert.equal(tirerCase('1d5', () => 0.999999999), 5);
});

// --- fournisseurStrict -----------------------------------------------------------------------

test('fournisseurStrict : consomme dans l’ordre, laisse passer les constantes, lève RangeError si vide', () => {
  const f = fournisseurStrict({ d100: [35, 62], lancers: [4] });
  assert.equal(f.d100(), 35);
  assert.equal(f.d100(), 62);
  assert.throws(() => f.d100(), /RangeError|Jet de d100 manquant/);

  assert.equal(f.lancer('3'), 3); // constante : ne consomme pas
  assert.equal(f.lancer('1d10'), 4);
  assert.throws(() => f.lancer('1d5'), /Jet manquant pour 1d5/);
  assert.throws(() => fournisseurStrict().d100(), /Jet de d100 manquant/);
});

// --- sondeAction / planAction ----------------------------------------------------------------

test('planAction est un alias de sondeAction', () => {
  assert.equal(planAction, sondeAction);
});

test('sondeAction : attaque normale sans critique (mêlée et distance)', () => {
  const s = rencontreBase();
  const params = { id: 'helza', cibleId: 'executeur', armeId: 'epee' };

  // Sans saisie : détecte les deux d100 initiaux (attaque + défense)
  const p0 = sansMutation(s, st => sondeAction(st, { action: 'attaquerMelee', params }));
  assert.equal(p0.pretends, false);
  assert.equal(p0.apercuInversion, null);
  assert.equal(p0.champs.length, 2);
  assert.deepEqual(p0.champs.map(c => c.type), ['d100', 'd100']);

  // Avec deux d100 sans double ni critique ni maladresse : prêt à exécuter, aucun 1d10 demandé
  const p1 = sansMutation(s, st => sondeAction(st, { action: 'attaquerMelee', params }, { d100: [31, 45] }));
  assert.equal(p1.pretends, true);
  assert.equal(p1.apercuInversion, null);
  assert.equal(p1.champs.length, 2);
  assert.deepEqual(p1.champs.map(c => c.valeurSaisie), [31, 45]);

  // Exécution réelle avec fournisseurStrict
  const apres = attaquerMelee(s, params, fournisseurStrict({ d100: [31, 45] }));
  assert.equal(apres.enAttente, null);

  // Tir normal (pistolet-laser, esquive)
  const tirParams = { id: 'helza', cibleId: 'executeur', armeId: 'pistolet-laser', mode: 'normal' };
  const pTir = sansMutation(s, st => sondeAction(st, { action: 'attaquerDistance', params: tirParams }, { d100: [24, 61] }));
  assert.equal(pTir.pretends, true);
  assert.equal(pTir.champs.length, 2);
  const apresTir = attaquerDistance(s, tirParams, fournisseurStrict({ d100: [24, 61] }));
  assert.equal(apresTir.enAttente, null);
});

test('sondeAction : attaque déclenchant un Critique (1d10 sévérité, et 1d10 localisation sur double)', () => {
  const s = rencontreBase();
  // Double réussi 22 sur Mêlée 42 vs défense ratée 85 -> critique par double -> demande localisation-critique + severite-critique
  const params = { id: 'helza', cibleId: 'executeur', armeId: 'epee' };
  const p0 = sansMutation(s, st => sondeAction(st, { action: 'attaquerMelee', params }, { d100: [22, 85] }));
  assert.equal(p0.pretends, false);
  const lancersManquants = p0.champs.filter(c => c.valeurSaisie === undefined);
  assert.equal(lancersManquants.length, 2);
  assert.deepEqual(lancersManquants.map(c => c.des), ['1d10', '1d10']);
  assert.match(lancersManquants[0].libelle, /Localisation critique/);
  assert.match(lancersManquants[1].libelle, /Sévérité critique/);

  // Une fois les deux 1d10 saisis, pretends devient true et l'exécution passe avec fournisseurStrict
  const p1 = sansMutation(s, st => sondeAction(st, { action: 'attaquerMelee', params }, { d100: [22, 85], lancers: [4, 6] }));
  assert.equal(p1.pretends, true);
  const apres = attaquerMelee(s, params, fournisseurStrict({ d100: [22, 85], lancers: [4, 6] }));
  assert.equal(participant(apres, 'executeur').critiques.length, 1);
});

test('sondeAction : attaque atteignant blessuresMax demande d100 Endurance (Douleur)', () => {
  let s = rencontreBase();
  // On blesse l'exécuteur juste en dessous de blessuresMax pour qu'un coup normal l'atteigne sans excédent critique
  const exec = participant(s, 'executeur');
  s = {
    ...s,
    participants: s.participants.map(p => (p.id === 'executeur' ? { ...p, blessures: exec.blessuresMax - 2 } : p))
  };
  const params = { id: 'helza', cibleId: 'executeur', armeId: 'epee' };
  // 31 (DR +1) vs 61 (DR -1) -> drNet +2, 5 + 2 - armure 5 = 2 dégâts -> atteint blessuresMax pile
  const p0 = sansMutation(s, st => sondeAction(st, { action: 'attaquerMelee', params }, { d100: [31, 61] }));
  assert.equal(p0.pretends, false);
  const manquants = p0.champs.filter(c => c.valeurSaisie === undefined);
  assert.equal(manquants.length, 1);
  assert.equal(manquants[0].type, 'd100');
  assert.match(manquants[0].libelle, /Endurance \(Douleur\)/);

  const p1 = sansMutation(s, st => sondeAction(st, { action: 'attaquerMelee', params }, { d100: [31, 61, 70] }));
  assert.equal(p1.pretends, true);
  const apres = attaquerMelee(s, params, fournisseurStrict({ d100: [31, 61, 70] }));
  assert.equal(participant(apres, 'executeur').etat, 'inconscient');
});

test('sondeAction : maladresse avec arme Reliable et localisation aléatoire (#8)', () => {
  const s = rencontreBase();
  const params = { id: 'helza', cibleId: 'executeur', armeId: 'pistolet-laser', mode: 'normal', modeDefense: 'aucune' };
  // 99 = maladresse sur pistolet-laser (Reliable)
  const p0 = sansMutation(s, st => sondeAction(st, { action: 'attaquerDistance', params }, { d100: [99] }));
  assert.equal(p0.pretends, false);
  const manquants0 = p0.champs.filter(c => c.valeurSaisie === undefined);
  assert.equal(manquants0.length, 2);
  assert.match(manquants0[0].libelle, /Maladresse/);
  assert.match(manquants0[1].libelle, /Fiable \(Reliable\)/);

  // Si maladresse = 8 (armure -1 sur loc aléatoire) et Reliable = 2 (< 4, échec Reliable) -> demande 1d10 localisation
  const p1 = sansMutation(s, st => sondeAction(st, { action: 'attaquerDistance', params }, { d100: [99], lancers: [8, 2] }));
  assert.equal(p1.pretends, false);
  const manquants1 = p1.champs.filter(c => c.valeurSaisie === undefined);
  assert.equal(manquants1.length, 1);
  assert.equal(manquants1[0].des, '1d10');
  assert.match(manquants1[0].libelle, /Localisation d’armure/);

  const p2 = sansMutation(s, st => sondeAction(st, { action: 'attaquerDistance', params }, { d100: [99], lancers: [8, 2, 5] }));
  assert.equal(p2.pretends, true);
  const apres = attaquerDistance(s, params, fournisseurStrict({ d100: [99], lancers: [8, 2, 5] }));
  assert.equal(apres.enAttente, null);
});

test('sondeAction : passerTour avec Enflammé réclame 1d5 (mineur) ou 1d10 (majeur)', () => {
  let s = rencontreBase();
  // Enflammé mineur sur le second acteur (executeur)
  s = appliquerEtat(s, { id: 'executeur', etat: 'enflamme', niveau: 'mineur' });
  const pMineur = sansMutation(s, st => sondeAction(st, { action: 'passerTour' }));
  assert.equal(pMineur.pretends, false);
  assert.equal(pMineur.champs.length, 1);
  assert.equal(pMineur.champs[0].des, '1d5');
  assert.match(pMineur.champs[0].libelle, /enflamme/i);

  const pPret = sansMutation(s, st => sondeAction(st, { action: 'passerTour' }, { lancers: [3] }));
  assert.equal(pPret.pretends, true);
  const apres = passerTour(s, fournisseurStrict({ lancers: [3] }));
  assert.equal(participant(apres, 'executeur').blessures, 3);

  // Enflammé majeur -> 1d10
  let sMaj = rencontreBase();
  sMaj = appliquerEtat(sMaj, { id: 'executeur', etat: 'enflamme', niveau: 'majeur' });
  const pMajeur = sansMutation(sMaj, st => sondeAction(st, { action: 'passerTour' }));
  assert.equal(pMajeur.champs[0].des, '1d10');
});

test('sondeAction : inversion Avantage expose apercuInversion puis choisirInversion sonde les suites', () => {
  // Surprise PJ -> helza a Avantage contre ganger
  const s = rencontreBase({ entrees: ['helza', 'ganger'], options: { surprise: 'pj' } });
  const params = { id: 'helza', cibleId: 'ganger', armeId: 'epee' };
  // 72 inversible en 27 (Avantage) -> s'arrête en enAttente.type === 'inversion'
  const pInv = sansMutation(s, st => sondeAction(st, { action: 'attaquerMelee', params }, { d100: [72] }));
  assert.equal(pInv.pretends, false);
  assert.ok(pInv.apercuInversion);
  assert.equal(pInv.apercuInversion.type, 'inversion');
  assert.equal(pInv.apercuInversion.inversions[0].cote, 'attaque');

  // On exécute jusqu'à l'attente d'inversion, puis on sonde choisirInversion('reverse') :
  // ganger est Surpris -> critique automatique -> demande severite-critique (1d10)
  const sAttente = attaquerMelee(s, params, fournisseurStrict({ d100: [72] }));
  const pChoix = sansMutation(sAttente, st => sondeAction(st, { action: 'choisirInversion', optionId: 'reverse' }));
  assert.equal(pChoix.pretends, false);
  assert.equal(pChoix.apercuInversion, null);
  assert.equal(pChoix.champs.length, 1);
  assert.equal(pChoix.champs[0].des, '1d10');
  assert.match(pChoix.champs[0].libelle, /Sévérité critique/);

  const pChoixPret = sansMutation(sAttente, st => sondeAction(st, { action: 'choisirInversion', optionId: 'reverse' }, { lancers: [3] }));
  assert.equal(pChoixPret.pretends, true);
  const apres = choisirInversion(sAttente, 'reverse', fournisseurStrict({ lancers: [3] }));
  assert.equal(participant(apres, 'ganger').critiques[0].severite, 3);
});

test('sondeAction : testLibre, testOppose, premiersSoins et depenserDestin (relancer)', () => {
  const s = rencontreBase();

  // testLibre échoué -> puis relance Destin
  const pTest = sansMutation(s, st => sondeAction(st, { action: 'testLibre', params: { id: 'helza', competence: 'Discrétion' } }));
  assert.equal(pTest.pretends, false);
  assert.equal(pTest.champs.length, 1);
  assert.equal(pTest.champs[0].type, 'd100');

  const sEchec = testLibre(s, { id: 'helza', competence: 'Discrétion' }, fournisseurStrict({ d100: [85] }));
  const pDestin = sansMutation(sEchec, st => sondeAction(st, { action: 'depenserDestin', id: 'helza', effet: 'relancer' }));
  assert.equal(pDestin.pretends, false);
  assert.equal(pDestin.champs.length, 1);
  assert.equal(pDestin.champs[0].type, 'd100');
  assert.match(pDestin.champs[0].libelle, /Destin/);

  const pDestinPret = sansMutation(sEchec, st => sondeAction(st, { action: 'depenserDestin', id: 'helza', effet: 'relancer' }, { d100: [20] }));
  assert.equal(pDestinPret.pretends, true);
  const sRelance = depenserDestin(sEchec, 'helza', 'relancer', {}, fournisseurStrict({ d100: [20] }));
  assert.equal(sRelance.dernierTest.ap.reussi, true);

  // testOppose -> deux d100
  const pOpp = sansMutation(s, st => sondeAction(st, { action: 'testOppose', params: { idA: 'helza', competenceA: 'Discrétion', idB: 'executeur', competenceB: 'Perception' } }));
  assert.equal(pOpp.champs.length, 2);
  assert.deepEqual(pOpp.champs.map(c => c.type), ['d100', 'd100']);

  // premiersSoins -> un d100
  const pSoins = sansMutation(s, st => sondeAction(st, { action: 'premiersSoins', params: { id: 'helza', cibleId: 'helza' } }, { d100: [25] }));
  assert.equal(pSoins.pretends, true);
  const sSoins = premiersSoins(s, { id: 'helza', cibleId: 'helza' }, fournisseurStrict({ d100: [25] }));
  assert.equal(sSoins.dernierTest.ap.reussi, true);
});
