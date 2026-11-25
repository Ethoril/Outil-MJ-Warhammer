// Cthulhu 7e (lot M7) : saisie des dés par le MJ. Module pur `saisie-des.js` : validation des saisies, fournisseur
// strict (qui lève au lieu de tirer au hasard), et prédictions (planResolution, evaluerJetConBlessure, planJetSan)
// faites en appelant les fonctions du moteur sur l'état courant. Chaque prédiction est rejouée dans l'action réelle
// du moteur avec les mêmes dés : les champs prédits correspondent exactement aux dés consommés par le moteur.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validerEntier, fournisseurStrict, planResolution, evaluerJetConBlessure, planJetSan } from '../../../cthulhu/saisie-des.js';
import {
  composerRencontre, commencerRound, tirer, attaquerMelee, resoudreEnAttente, jetSan, participant
} from '../../../cthulhu/rencontre.js';
import { creerReserve, ajouterArme, ajouterProfil } from '../../../cthulhu/profils.js';
import { ARMES_DEPART, CREATURES_DEPART } from '../../../cthulhu/donnees-depart.js';

// --- Réserve de test (profils de la maquette + ogre au fusil pour un Impact à dés) --------------------------------

const ARMES_TEST = [
  { id: 'couteau', nom: 'Poignard', competence: 'Corps à corps', des: '1D4', empalante: true, aImpact: true, type: 'melee' },
  { id: 'batte', nom: 'Batte de baseball', competence: 'Corps à corps', des: '1D6', empalante: false, aImpact: true, type: 'melee' },
  { id: 'fusil', nom: 'Fusil', competence: 'Armes de poing', des: '2D6', empalante: false, aImpact: true, type: 'feu', portee: 30, capacite: 5 }
];
const PROFILS_TEST = [
  { id: 'hale', nom: 'Margaret Hale', kind: 'PJ', carac: { FOR: 55, CON: 60, TAI: 55, DEX: 80, APP: 60, INT: 70, POU: 65, EDU: 65 }, chance: 70,
    competences: { 'Corps à corps': 45, 'Armes de poing': 60, Esquive: 50 }, armeMelee: 'couteau', armeTir: 'revolver-38' },
  { id: 'lindqvist', nom: 'Pr Arthur Lindqvist', kind: 'PJ', carac: { FOR: 30, CON: 40, TAI: 60, DEX: 40, APP: 70, INT: 75, POU: 50, EDU: 80 }, chance: 60,
    competences: { 'Corps à corps': 30, Esquive: 25 }, armeMelee: 'batte' },
  { id: 'ogre', nom: 'Ogre', kind: 'PNJ', camp: 'ennemi', carac: { FOR: 120, CON: 80, TAI: 100, DEX: 80, APP: 0, INT: 30, POU: 40, EDU: 0 },
    competences: { 'Armes de poing': 50 }, armeMelee: 'batte', armeTir: 'fusil' }
];
const DISCIPLE = 'disciple-jacob-smith';
function reserveTest() {
  let r = creerReserve();
  for (const a of ARMES_TEST) r = ajouterArme(r, a);
  for (const id of ['couteau-grand', 'revolver-32', 'revolver-38']) r = ajouterArme(r, ARMES_DEPART[id]);
  for (const p of PROFILS_TEST) r = ajouterProfil(r, p);
  return ajouterProfil(r, CREATURES_DEPART.find(p => p.id === DISCIPLE));
}

/** Fournisseur strict espionné : enregistre chaque dé demandé par le moteur ('lancer' = dé à faces consommé,
 *  'const' = expression constante répondue sans saisie, 'd100' = d100 consommé). */
function espion(f) {
  const appels = [];
  return {
    appels,
    lancers: () => appels.filter(a => a[0] === 'lancer'),
    jets: () => appels.filter(a => a[0] === 'd100'),
    des: {
      d100(net) { const r = f.d100(net); appels.push(['d100', r.jet]); return r; },
      lancer(e) {
        const v = f.lancer(e);
        appels.push([/[dD]\d/.test(e) ? 'lancer' : 'const', e, v]);
        return v;
      }
    }
  };
}
const rencontreHaleDisciple = () => commencerRound(composerRencontre(reserveTest(), ['hale', DISCIPLE]));

// --- validerEntier -------------------------------------------------------------------------------------------------

test('validerEntier : accepte les entiers dans les bornes, rejette vide, espaces, décimaux, NaN et hors-bornes', () => {
  assert.deepEqual(validerEntier('25', { min: 1, max: 100, libelle: 'd100 tir' }), { ok: true, valeur: 25 });
  assert.deepEqual(validerEntier('  7 ', { min: 1, max: 100, libelle: 'd100' }), { ok: true, valeur: 7 });
  assert.deepEqual(validerEntier('100', { min: 1, max: 100, libelle: 'd100' }), { ok: true, valeur: 100 });
  assert.deepEqual(validerEntier('0', { min: 0, max: Infinity, libelle: 'Dégâts' }), { ok: true, valeur: 0 });
  for (const brut of ['', '   ', '12.5', 'abc', '1e2', '0x10', '12 3']) {
    const r = validerEntier(brut, { min: 1, max: 100, libelle: 'd100 tir' });
    assert.equal(r.ok, false, `« ${brut} » accepté`);
    assert.match(r.message, /^d100 tir : /);
    assert.match(r.message, /entier/);
  }
  assert.equal(validerEntier('0', { min: 1, max: 100, libelle: 'd100' }).ok, false);
  assert.equal(validerEntier('101', { min: 1, max: 100, libelle: 'd100' }).ok, false);
  assert.equal(validerEntier('-1', { min: 0, max: Infinity, libelle: 'Dégâts' }).ok, false);
  assert.match(validerEntier('101', { min: 1, max: 100, libelle: 'd100' }).message, /hors limites/);
});

// --- fournisseurStrict ----------------------------------------------------------------------------------------------

test('fournisseurStrict : d100 consomme la file dans l’ordre et rend { jet, candidats }', () => {
  const f = fournisseurStrict({ d100: [25, 80], lancers: [] });
  assert.deepEqual(f.d100(0), { jet: 25, candidats: [25] });
  assert.deepEqual(f.d100(2), { jet: 80, candidats: [80] }); // dés bonus/malus déjà combinés par le MJ
  assert.throws(() => f.d100(0), RangeError);
  assert.throws(() => f.d100(0), /Jet de d100 manquant \(saisie requise\)\./);
});

test('fournisseurStrict : les expressions constantes passent sans rien consommer, les dés consomment, et le manque lève', () => {
  const f = fournisseurStrict({ d100: [], lancers: [5] });
  assert.equal(f.lancer('0'), 0);
  assert.equal(f.lancer('1'), 1);
  assert.equal(f.lancer('-2'), -2);
  assert.equal(f.lancer('1D6'), 5); // seule valeur restante consommée
  assert.throws(() => f.lancer('1D8'), /Jet manquant pour 1D8 \(saisie requise\)\./);
  const g = fournisseurStrict({ lancers: [3, 4] });
  assert.equal(g.lancer('2D6+1'), 3);
  assert.equal(g.lancer('+1D4'), 4);
  assert.throws(() => g.lancer('1D10'), /Jet manquant pour 1D10/);
});

// --- planResolution : prédiction rejouée dans le moteur --------------------------------------------------------------

test('planResolution : tir manqué → { touche: false }, et le moteur ne consomme aucun dé à la résolution', () => {
  let s = rencontreHaleDisciple();
  s = tirer(s, { tireurId: 'hale', cibleId: DISCIPLE, distance: 10 }, fournisseurStrict({ d100: [90] })); // 90 > 60 : échec
  const avant = JSON.stringify(s);
  const plan = planResolution(s);
  assert.deepEqual(plan, { touche: false });
  assert.equal(JSON.stringify(s), avant, 'la prédiction ne mute pas l’état');
  const esp = espion(fournisseurStrict({}));
  const apres = resoudreEnAttente(s, esp.des);
  assert.deepEqual(esp.appels, [], 'aucun dé consommé à la résolution');
  assert.match(apres.journal.at(-1).texte, /manque/);
});

test('planResolution : tir touché (revolver sans Impact) prédit un seul champ « arme », rejoué à l’identique + jet de CON prévu', () => {
  let s = rencontreHaleDisciple();
  s = tirer(s, { tireurId: 'hale', cibleId: DISCIPLE, distance: 10 }, fournisseurStrict({ d100: [25] })); // 25 ≤ 60 : touche
  const plan = planResolution(s);
  assert.equal(plan.touche, true);
  assert.equal(plan.auteur.id, 'hale');
  assert.equal(plan.victime.id, DISCIPLE);
  assert.equal(plan.arme.id, 'revolver-38');
  assert.equal(plan.niveau, 3);
  assert.equal(plan.tresLonguePortee, false);
  assert.deepEqual(plan.champsDegats, [{ cle: 'arme', libelle: 'Arme (1D10)', expression: '1D10' }]);
  assert.equal(plan.degatsFixes, null);
  // Blessure grave (6 dégâts ≥ la moitié de 12 PV max) → jet de CON prévu.
  const ev = evaluerJetConBlessure(plan, { arme: 6 });
  assert.deepEqual(ev, { pret: true, total: 6, jetCON: true, victime: participant(s, DISCIPLE) });
  // Rejeu dans le moteur avec les mêmes dés : un lancer 1D10 consommé (champ prédit) puis un d100 de CON (prévu).
  const esp = espion(fournisseurStrict({ d100: [30], lancers: [6] }));
  const apres = resoudreEnAttente(s, esp.des);
  assert.deepEqual(esp.appels, [['lancer', '1D10', 6], ['d100', 30]], 'le moteur consomme exactement les dés prédits');
  assert.equal(plan.champsDegats.length, 1, 'un champ de dégâts prédit ⇔ un lancer consommé');
  assert.equal(ev.jetCON, true, 'jet de CON prédit ⇔ le moteur a demandé un d100 de CON');
  const d = participant(apres, DISCIPLE);
  assert.deepEqual([d.pv, d.etat, d.blessureGrave], [6, 'actif', true]);
});

test('planResolution : tir avec Impact à dés prédit « arme » puis « impact », rejoué dans le même ordre', () => {
  let s = commencerRound(composerRencontre(reserveTest(), ['ogre', 'hale']));
  s = tirer(s, { tireurId: 'ogre', cibleId: 'hale', distance: 8 }, fournisseurStrict({ d100: [30] })); // 30 ≤ 50 : touche
  const plan = planResolution(s);
  assert.deepEqual(plan.champsDegats.map(c => [c.cle, c.expression]),
    [['arme', '2D6'], ['impact', '+2D6']], 'l’Impact de l’ogre (+2D6) porte des dés');
  const esp = espion(fournisseurStrict({ lancers: [3, 2] }));
  const apres = resoudreEnAttente(s, esp.des);
  assert.deepEqual(esp.appels, [['lancer', '2D6', 3], ['lancer', '+2D6', 2]]);
  assert.equal(participant(apres, 'hale').pv, 11 - 5);
  // Sans blessure grave (5 < 11/2), aucun d100 de CON n’est demandé : evaluerJetConBlessure le prédisait.
  assert.equal(evaluerJetConBlessure(plan, { arme: 3, impact: 2 }).jetCON, false);
});

test('planResolution : mêlée rendue (riposte) → l’auteur est le défenseur, dégâts ordinaires de son arme', () => {
  let s = rencontreHaleDisciple();
  s = attaquerMelee(s, { attaquantId: 'hale', cibleId: DISCIPLE, mode: 'rendre' }, fournisseurStrict({ d100: [90, 20] }));
  const plan = planResolution(s);
  assert.equal(plan.touche, true);
  assert.equal(plan.auteur.id, DISCIPLE, 'le disciple rend les coups et touche');
  assert.equal(plan.victime.id, 'hale');
  assert.equal(plan.arme.id, 'couteau-grand');
  assert.equal(plan.niveau, 2, 'dégâts toujours ordinaires en rendant les coups');
  assert.deepEqual(plan.champsDegats, [{ cle: 'arme', libelle: 'Arme (1D8)', expression: '1D8' }]);
  const esp = espion(fournisseurStrict({ lancers: [4] }));
  const apres = resoudreEnAttente(s, esp.des);
  assert.deepEqual(esp.appels, [['lancer', '1D8', 4]]);
  assert.equal(participant(apres, 'hale').pv, 11 - 4);
});

test('planResolution : attaque réussie contre esquive ratée → touche ; esquive réussie → { touche: false } et aucun dé de dégâts', () => {
  let s = rencontreHaleDisciple();
  s = attaquerMelee(s, { attaquantId: 'hale', cibleId: DISCIPLE, mode: 'esquiver' }, fournisseurStrict({ d100: [30, 40] }));
  // attaque 30 ≤ 45 réussie (ordinaire), esquive 40 > 30 ratée → le coup touche.
  const plan = planResolution(s);
  assert.equal(plan.touche, true);
  let s2 = rencontreHaleDisciple();
  s2 = attaquerMelee(s2, { attaquantId: 'hale', cibleId: DISCIPLE, mode: 'esquiver' }, fournisseurStrict({ d100: [30, 5] }));
  // esquive 5 ≤ 6 → extrême > attaque ordinaire → le disciple esquive.
  const plan2 = planResolution(s2);
  assert.deepEqual(plan2, { touche: false });
  const esp = espion(fournisseurStrict({}));
  const apres = resoudreEnAttente(s2, esp.des);
  assert.deepEqual(esp.appels, []);
  assert.match(apres.journal.at(-1).texte, /esquive/);
});

test('planResolution : Extrême non empalant → aucun champ de dégâts, degatsFixes calculé par calculerDegats', () => {
  let s = commencerRound(composerRencontre(reserveTest(), ['lindqvist', DISCIPLE]));
  s = attaquerMelee(s, { attaquantId: 'lindqvist', cibleId: DISCIPLE, mode: 'aucune' }, fournisseurStrict({ d100: [5] })); // 5 ≤ 6 : extrême
  const plan = planResolution(s);
  assert.equal(plan.touche, true);
  assert.equal(plan.niveau, 4);
  assert.deepEqual(plan.champsDegats, [], 'Extrême sur arme non empalante : maximum, aucun dé de dégâts');
  assert.equal(plan.degatsFixes, 6, '1D6 max (6), Impact 0, via calculerDegats');
  const esp = espion(fournisseurStrict({ d100: [30] }));
  const apres = resoudreEnAttente(s, esp.des);
  assert.deepEqual(esp.lancers(), [], 'le moteur ne demande aucun lancer : la prédiction disait []');
  // 6 dégâts = la moitié des 12 PV max → blessure grave → le seul dé demandé est le d100 de CON.
  assert.deepEqual(esp.jets(), [['d100', 30]]);
  assert.equal(evaluerJetConBlessure(plan, {}).jetCON, true, 'dégâts fixes prédits : jet de CON prévu dès le rendu');
  const d = participant(apres, DISCIPLE);
  assert.deepEqual([d.pv, d.etat], [6, 'actif']);
});

test('planResolution : Extrême empalant → champ « empalement » (seul dé), rejoué à l’identique', () => {
  let s = rencontreHaleDisciple();
  s = attaquerMelee(s, { attaquantId: 'hale', cibleId: DISCIPLE, mode: 'aucune' }, fournisseurStrict({ d100: [5] })); // 5 ≤ 9 : extrême, couteau empalant
  const plan = planResolution(s);
  assert.deepEqual(plan.champsDegats, [{ cle: 'empalement', libelle: 'Empalement (1D4)', expression: '1D4' }]);
  const ev = evaluerJetConBlessure(plan, { empalement: 3 });
  assert.equal(ev.total, 4 + 3, 'arme max (4) + empalement (3), Impact 0');
  assert.equal(ev.jetCON, true, '7 dégâts ≥ la moitié de 12 PV max : blessure grave prévue');
  const esp = espion(fournisseurStrict({ d100: [30], lancers: [3] }));
  const apres = resoudreEnAttente(s, esp.des);
  assert.deepEqual(esp.appels, [['lancer', '1D4', 3], ['d100', 30]], 'un seul lancer (empalement) puis le d100 de CON prévu');
  assert.equal(participant(apres, DISCIPLE).pv, 12 - 7);
});

test('planResolution : tir à très longue portée, réussite extrême non critique → dégâts ordinaires (champs arme+impact)', () => {
  let s = commencerRound(composerRencontre(reserveTest(), ['ogre', 'hale']));
  s = tirer(s, { tireurId: 'ogre', cibleId: 'hale', distance: 100 }, fournisseurStrict({ d100: [5] })); // portée 30 ×4 = 120 : extrême, très longue portée
  const plan = planResolution(s);
  assert.equal(plan.tresLonguePortee, true);
  assert.equal(plan.niveau, 4);
  assert.deepEqual(plan.champsDegats.map(c => c.cle), ['arme', 'impact'], 'hors 01, une extrême à très longue portée n’est pas extrême');
  // Au contraire, un critique (01) à très longue portée reste extrême : fusil non empalant → dégâts fixes.
  let s2 = commencerRound(composerRencontre(reserveTest(), ['ogre', 'hale']));
  s2 = tirer(s2, { tireurId: 'ogre', cibleId: 'hale', distance: 100 }, fournisseurStrict({ d100: [1] }));
  const plan2 = planResolution(s2);
  assert.equal(plan2.niveau, 5);
  assert.deepEqual(plan2.champsDegats, []);
  assert.equal(plan2.degatsFixes, 12 + 12, '2D6 max + Impact +2D6 max, aucun dé');
  const esp = espion(fournisseurStrict({}));
  resoudreEnAttente(s2, esp.des);
  assert.deepEqual(esp.appels, []);
});

// --- evaluerJetConBlessure -------------------------------------------------------------------------------------------

test('evaluerJetConBlessure : champ manquant → pret false ; dégâts sous le seuil de blessure grave → aucun jet de CON au moteur', () => {
  let s = rencontreHaleDisciple();
  s = tirer(s, { tireurId: 'hale', cibleId: DISCIPLE, distance: 10 }, fournisseurStrict({ d100: [25] }));
  const plan = planResolution(s);
  assert.deepEqual(evaluerJetConBlessure(plan, {}), { pret: false, total: null, jetCON: false, victime: participant(s, DISCIPLE) });
  const ev = evaluerJetConBlessure(plan, { arme: 5 });
  assert.equal(ev.pret, true);
  assert.equal(ev.total, 5);
  assert.equal(ev.jetCON, false, '10 < 12 : pas de blessure grave');
  const esp = espion(fournisseurStrict({ lancers: [5] }));
  const apres = resoudreEnAttente(s, esp.des);
  assert.deepEqual(esp.appels, [['lancer', '1D10', 5]], 'aucun d100 de CON demandé, comme prévu');
  assert.equal(participant(apres, DISCIPLE).etat, 'actif');
  // Dégâts supérieurs aux PV max → mort immédiate, aucun jet de CON non plus.
  const ev2 = evaluerJetConBlessure(plan, { arme: 13 });
  assert.equal(ev2.jetCON, false);
  const esp2 = espion(fournisseurStrict({ lancers: [13] }));
  const apres2 = resoudreEnAttente(s, esp2.des);
  assert.deepEqual(esp2.appels, [['lancer', '1D10', 13]]);
  assert.equal(participant(apres2, DISCIPLE).etat, 'mort');
});

// --- planJetSan ------------------------------------------------------------------------------------------------------

test('planJetSan : coût invalide refusé ; sans jetSan valide, aucune branche prédite', () => {
  const hale = participant(composerRencontre(reserveTest(), ['hale', DISCIPLE]), 'hale');
  assert.throws(() => planJetSan(hale, 'abc'), /Coût de SAN invalide/);
  const p = planJetSan(hale, '1/1D6');
  assert.equal(p.jetValide, false);
  assert.equal(p.niveau, null);
  assert.equal(p.champPerte, null);
  assert.equal(p.jetIntRequis, false);
});

test('planJetSan : réussite → perte fixe (branche « 1 » sans dé), aucun lancer au moteur', () => {
  let s = composerRencontre(reserveTest(), ['hale', DISCIPLE]);
  const hale = participant(s, 'hale');
  const plan = planJetSan(hale, '1/1D6', { jetSan: 10 });
  assert.equal(plan.niveau, 4);
  assert.equal(plan.champPerte, null, 'branche réussite « 1 » : constante');
  assert.equal(plan.perteFixe, 1);
  assert.equal(plan.jetIntRequis, false);
  const esp = espion(fournisseurStrict({ d100: [10] }));
  const apres = jetSan(s, { id: 'hale', cout: '1/1D6' }, esp.des);
  assert.deepEqual(esp.jets(), [['d100', 10]]);
  assert.deepEqual(esp.lancers(), [], 'un seul d100 : la perte fixe ne consomme aucune saisie, comme prévu');
  assert.equal(participant(apres, 'hale').san, 65 - 1);
});

test('planJetSan : échec → champ perte « 1D6 », perte 6 ≥ 5 → jet d’INT prévu, rejoué à l’identique (folies comprise)', () => {
  let s = composerRencontre(reserveTest(), ['hale', DISCIPLE]);
  const hale = participant(s, 'hale');
  const plan = planJetSan(hale, '1/1D6', { jetSan: 80 });
  assert.equal(plan.niveau, 1);
  assert.deepEqual(plan.champPerte, { expression: '1D6' });
  assert.equal(plan.perteFixe, null);
  assert.equal(plan.jetIntRequis, false, 'perte pas encore saisie');
  const plan2 = planJetSan(hale, '1/1D6', { jetSan: 80, perte: 6 });
  assert.equal(plan2.jetIntRequis, true, 'perte 6 ≥ 5');
  const esp = espion(fournisseurStrict({ d100: [80, 20], lancers: [6] }));
  const apres = jetSan(s, { id: 'hale', cout: '1/1D6' }, esp.des);
  assert.deepEqual(esp.appels, [['d100', 80], ['lancer', '1D6', 6], ['d100', 20]],
    'd100 SAN, lancer de perte (champ prédit), puis d100 INT (prévu)');
  assert.equal(plan2.champPerte !== null, true, 'champ perte prédit ⇔ lancer consommé');
  assert.equal(plan2.jetIntRequis, true, 'jet d’INT prédit ⇔ d100 INT consommé');
  const h = participant(apres, 'hale');
  assert.equal(h.san, 65 - 6);
  assert.equal(h.folie, 'temporaire', 'INT 20 réussi contre 70 : folie temporaire (perte 6 ≥ 5)');
});

test('planJetSan : maladresse → perte fixe = max de la branche échec, aucun lancer ; seuil 5 respecté', () => {
  let s = composerRencontre(reserveTest(), ['hale', DISCIPLE]);
  const hale = participant(s, 'hale');
  const plan = planJetSan(hale, '1/1D6', { jetSan: 100 }); // 100 : maladresse (seuil 65 ≥ 50)
  assert.equal(plan.niveau, 0);
  assert.equal(plan.champPerte, null, 'maladresse : maxExpression(échec), pas de dé');
  assert.equal(plan.perteFixe, 6);
  assert.equal(plan.jetIntRequis, true, 'perte fixe 6 ≥ 5');
  const esp = espion(fournisseurStrict({ d100: [100, 20] }));
  const apres = jetSan(s, { id: 'hale', cout: '1/1D6' }, esp.des);
  assert.deepEqual(esp.appels, [['d100', 100], ['d100', 20]], 'aucun lancer : la maladresse prend le max, comme prévu');
  assert.equal(participant(apres, 'hale').san, 65 - 6);
  // Perte 4 < 5 → pas de jet d'INT, ni prédit ni demandé.
  const plan4 = planJetSan(hale, '1/1D6', { jetSan: 80, perte: 4 });
  assert.equal(plan4.jetIntRequis, false);
  const esp2 = espion(fournisseurStrict({ d100: [80], lancers: [4] }));
  jetSan(s, { id: 'hale', cout: '1/1D6' }, esp2.des);
  assert.deepEqual(esp2.appels, [['d100', 80], ['lancer', '1D6', 4]], 'pas de d100 INT : comme prévu');
});

test('planJetSan : si le moteur demande un dé non prédit, le fournisseur strict lève (aucun tirage au hasard)', () => {
  const s = composerRencontre(reserveTest(), ['hale', DISCIPLE]);
  // Prédiction avec perte 4 (pas d'INT), mais le moteur recevra une perte de 6 : il demandera un d100 INT non saisi.
  const f = fournisseurStrict({ d100: [80], lancers: [6] });
  assert.throws(() => jetSan(s, { id: 'hale', cout: '1/1D6' }, f), /Jet de d100 manquant \(saisie requise\)\./);
  const g = fournisseurStrict({ d100: [80] });
  assert.throws(() => jetSan(s, { id: 'hale', cout: '1/1D6' }, g), /Jet manquant pour 1D6 \(saisie requise\)\./);
});
