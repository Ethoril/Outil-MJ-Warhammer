// Cthulhu 7e : réserve de profils (investigateurs, PNJ, créatures, armes), valeurs dérivées, données de départ.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  creerReserve, ajouterProfil, modifierProfil, supprimerProfil, trouverProfil, validerProfil, normaliserProfil,
  idDepuisNom, valeursDerivees, mouvementDe, ajouterArme, modifierArme, supprimerArme, nouvelleJournee
} from '../../../cthulhu/profils.js';
import { reserveDeDepart, ARMES_DEPART, CREATURES_DEPART } from '../../../cthulhu/donnees-depart.js';

const hale = {
  nom: 'Margaret Hale', kind: 'PJ',
  carac: { FOR: 55, CON: 60, TAI: 55, DEX: 80, APP: 60, INT: 70, POU: 65, EDU: 65 }, chance: 70,
  competences: { 'Corps à corps': 45, 'Armes de poing': 60, Esquive: 50 }, armeMelee: 'couteau', armeTir: 'revolver'
};
const armes = [
  { id: 'poing', nom: 'Coup de poing', competence: 'Corps à corps', des: '1D3', empalante: false, aImpact: true, type: 'melee' },
  { id: 'couteau', nom: 'Couteau', competence: 'Corps à corps', des: '1D4', empalante: true, aImpact: true, type: 'melee' },
  { id: 'revolver', nom: 'Revolver', competence: 'Armes de poing', des: '1D10', empalante: true, aImpact: false, type: 'feu', portee: 15, capacite: 6 }
];
const reserveAvecArmes = () => armes.reduce((r, a) => ajouterArme(r, a), creerReserve());

test('créer un profil : id tiré du nom, valeurs par défaut lues comme vides, réserve d’origine intacte', () => {
  const r0 = reserveAvecArmes();
  const r1 = ajouterProfil(r0, hale);
  assert.equal(r0.profils.length, 0);
  assert.equal(r1.profils.length, 1);
  const p = trouverProfil(r1, 'margaret-hale');
  assert.equal(p.nom, 'Margaret Hale');
  assert.equal(p.camp, 'pj');
  assert.equal(p.suivi, null);
  assert.equal(p.attaquesParRound, 1);
  assert.equal(p.armure, 0);
  assert.equal(p.armeFeuPrete, false);
});

test('l’id est unique : un homonyme reçoit un suffixe, un id explicite déjà pris est refusé', () => {
  let r = reserveAvecArmes();
  r = ajouterProfil(r, hale);
  r = ajouterProfil(r, { ...hale, nom: 'Margaret Hale' });
  assert.deepEqual(r.profils.map(p => p.id), ['margaret-hale', 'margaret-hale-2']);
  assert.equal(idDepuisNom('Pr Arthur Lindqvist', []), 'pr-arthur-lindqvist');
  assert.equal(idDepuisNom('Évêque à l’œil', []), 'eveque-a-l-oeil');
  assert.throws(() => ajouterProfil(r, { ...hale, id: 'margaret-hale' }), /déjà/);
});

test('modifier un profil : fusion des caractéristiques et des compétences, autres profils intacts', () => {
  let r = ajouterProfil(reserveAvecArmes(), hale);
  r = ajouterProfil(r, { ...hale, nom: 'Autre', kind: 'PNJ' });
  const r2 = modifierProfil(r, 'margaret-hale', { carac: { DEX: 90 }, competences: { Esquive: 55 }, chance: 65 });
  const p = trouverProfil(r2, 'margaret-hale');
  assert.equal(p.carac.DEX, 90);
  assert.equal(p.carac.FOR, 55);
  assert.equal(p.competences.Esquive, 55);
  assert.equal(p.competences['Corps à corps'], 45);
  assert.equal(p.chance, 65);
  assert.equal(trouverProfil(r, 'margaret-hale').carac.DEX, 80);
  assert.deepEqual(trouverProfil(r2, 'autre'), trouverProfil(r, 'autre'));
  assert.throws(() => modifierProfil(r, 'absent', { chance: 1 }), /introuvable/);
  assert.throws(() => modifierProfil(r, 'margaret-hale', { id: 'autre' }), /id/);
});

test('supprimer un profil', () => {
  let r = ajouterProfil(reserveAvecArmes(), hale);
  r = supprimerProfil(r, 'margaret-hale');
  assert.equal(r.profils.length, 0);
  assert.throws(() => supprimerProfil(r, 'margaret-hale'), /introuvable/);
});

test('validation : messages en français, champs facultatifs absents acceptés', () => {
  assert.deepEqual(validerProfil(normaliserProfil(hale)), []);
  const sansNom = validerProfil({ ...normaliserProfil(hale), nom: '  ' });
  assert.ok(sansNom.some(e => /nom/i.test(e)));
  const sansCON = normaliserProfil({ ...hale, carac: { ...hale.carac, CON: undefined } });
  assert.ok(validerProfil(sansCON).some(e => /CON/.test(e)));
  assert.ok(validerProfil({ ...normaliserProfil(hale), kind: 'dragon' }).some(e => /type/i.test(e)));
  // APP et ÉDU facultatives : absentes, elles se lisent comme 0
  const goule = normaliserProfil({ nom: 'Goule', kind: 'CREATURE', carac: { FOR: 80, CON: 65, TAI: 65, DEX: 65, INT: 65, POU: 65 } });
  assert.deepEqual(validerProfil(goule), []);
  assert.equal(goule.carac.APP, 0);
  assert.equal(goule.camp, 'ennemi');
  assert.throws(() => ajouterProfil(creerReserve(), { nom: '' }), /nom/i);
});

test('un profil qui cite une arme absente de la réserve est refusé', () => {
  assert.throws(() => ajouterProfil(creerReserve(), hale), /arme/i);
});

test('valeurs dérivées : Impact, Carrure, PV, MVT, PM', () => {
  const d = valeursDerivees(normaliserProfil(hale)); // FOR+TAI = 110, CON+TAI = 115
  assert.deepEqual(d, { impact: '0', carrure: 0, pvMax: 11, mvt: 8, pm: 13, sanDepart: 65 });
  const costaud = valeursDerivees(normaliserProfil({ ...hale, carac: { ...hale.carac, FOR: 85, TAI: 75, CON: 70, DEX: 50 } }));
  assert.equal(costaud.impact, '+1D4');
  assert.equal(costaud.carrure, 1);
  assert.equal(costaud.pvMax, 14);
  assert.equal(costaud.mvt, 8); // FOR > TAI, DEX < TAI : une seule des deux
  assert.equal(valeursDerivees(normaliserProfil({ ...hale, mvt: 9 })).mvt, 9); // valeur du livre prioritaire
});

test('MVT : 7 si FOR et DEX sous la TAI, 8 si l’une l’égale ou la dépasse ou si les trois sont égales, 9 si les deux la dépassent (Gardien p. 30)', () => {
  assert.equal(mouvementDe({ FOR: 40, DEX: 50, TAI: 60 }), 7);
  assert.equal(mouvementDe({ FOR: 60, DEX: 50, TAI: 60 }), 8);
  assert.equal(mouvementDe({ FOR: 60, DEX: 60, TAI: 60 }), 8);
  assert.equal(mouvementDe({ FOR: 70, DEX: 61, TAI: 60 }), 9);
});

test('armes de la réserve : ajouter, modifier, supprimer (refusé tant qu’un profil s’en sert)', () => {
  let r = ajouterProfil(reserveAvecArmes(), hale);
  assert.throws(() => ajouterArme(r, { ...armes[0] }), /déjà/);
  assert.throws(() => ajouterArme(r, { id: 'x', nom: 'X', competence: 'Corps à corps', des: 'beaucoup', type: 'melee' }), /dés/i);
  assert.throws(() => ajouterArme(r, { id: 'arc', nom: 'Arc', competence: 'Arcs', des: '1D8', type: 'feu' }), /portée/i);
  r = modifierArme(r, 'couteau', { des: '1D6' });
  assert.equal(r.armes.couteau.des, '1D6');
  assert.equal(r.armes.couteau.empalante, true);
  assert.throws(() => supprimerArme(r, 'couteau'), /Margaret Hale/);
  r = supprimerArme(r, 'poing');
  assert.equal(r.armes.poing, undefined);
});

test('nouvelle journée : le cumul de SAN de la journée repart de la SAN actuelle, la SAN et la Chance restent', () => {
  let r = ajouterProfil(reserveAvecArmes(), hale);
  r = modifierProfil(r, 'margaret-hale', { suivi: { pv: 4, blessureGrave: true, etat: 'actif', san: 50, journeeSan: { sanDebut: 65, perteJour: 15, persistanteDeclenchee: true }, folie: 'persistante', chance: 30 } });
  const apres = trouverProfil(nouvelleJournee(r), 'margaret-hale').suivi;
  assert.deepEqual(apres.journeeSan, { sanDebut: 50, perteJour: 0, persistanteDeclenchee: false });
  assert.equal(apres.san, 50);
  assert.equal(apres.chance, 30);
  assert.equal(apres.folie, 'persistante');
  assert.equal(apres.pv, 4);
});

test('données de départ : la goule suit le Manuel du Gardien p. 293', () => {
  const r = reserveDeDepart();
  const g = trouverProfil(r, 'goule');
  assert.deepEqual(g.carac, { FOR: 80, CON: 65, TAI: 65, DEX: 65, APP: 0, INT: 65, POU: 65, EDU: 0 });
  assert.equal(g.kind, 'CREATURE');
  assert.equal(g.attaquesParRound, 3);
  assert.equal(g.competences['Corps à corps'], 40);
  assert.equal(g.competences.Esquive, 40);
  assert.equal(g.reductionFeu, 'moitie');
  assert.equal(g.coutSan, '0/1D6');
  assert.deepEqual(valeursDerivees(g), { impact: '+1D4', carrure: 1, pvMax: 13, mvt: 9, pm: 13, sanDepart: 65 });
  assert.equal(r.armes[g.armeMelee].des, '1D6');
  assert.equal(r.armes[g.armeMelee].aImpact, true);
});

test('données de départ : le disciple de Jacob Smith (Aventures effroyables p. 129) et les armes du tableau (Gardien p. 405-406)', () => {
  const r = reserveDeDepart();
  const c = trouverProfil(r, 'disciple-jacob-smith');
  assert.equal(c.carac.DEX, 60);
  assert.equal(c.competences['Corps à corps'], 40);
  assert.equal(c.competences.Esquive, 30);
  assert.equal(c.competences['Armes de poing'], 40);
  const d = valeursDerivees(c);
  assert.equal(d.impact, '0');
  assert.equal(d.carrure, 0);
  assert.equal(d.pvMax, 12);
  assert.equal(d.mvt, 8);
  assert.equal(r.armes[c.armeTir].des, '1D8');
  assert.equal(r.armes[c.armeTir].capacite, 6);
  assert.equal(r.armes[c.armeTir].portee, 15);
  assert.equal(r.armes[c.armeTir].empalante, true);
  assert.equal(r.armes['revolver-38'].capacite, 8);
  assert.equal(r.armes.poing.des, '1D3');
  assert.equal(r.armes['couteau-grand'].des, '1D8');
  assert.equal(r.armes['gourdin-grand'].des, '1D8');
  assert.equal(r.armes['gourdin-grand'].empalante, false);
  assert.equal(r.armes['automatique-45'].des, '1D10+2');
});

test('données de départ : toutes les armes sont valides, aucun investigateur ; le détail des profils est dans donnees-depart.test.js', () => {
  const r = reserveDeDepart();
  assert.deepEqual(Object.keys(ARMES_DEPART).sort(), Object.keys(r.armes).sort());
  assert.deepEqual(r.profils.map(p => p.id).sort(), CREATURES_DEPART.map(p => p.id).sort());
  assert.ok(r.profils.every(p => p.kind !== 'PJ'));
  for (const p of r.profils) assert.deepEqual(validerProfil(p), []);
});
