// Imperium Maledictum : données de départ relevées dans le Core Book. Rien n'est inventé : chaque valeur de
// contrôle ci-dessous a été relevée à la main sur la page citée (page PDF = page imprimée).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { reserveDeDepart, ARMES_DEPART, PNJ_DEPART } from '../../../imperium/donnees-depart.js';
import { normaliserProfil, validerProfil, validerArme, valeursDerivees, trouverProfil, supprimerArme } from '../../../imperium/profils.js';

const ORDRE = ['CC', 'CT', 'F', 'E', 'Ag', 'Int', 'Per', 'FM', 'Soc'];

/**
 * Relevé du livre pour chaque PNJ de départ : page, rôle, vitesse, caractéristiques imprimées (CC CT F E Ag Int
 * Per FM Soc), armure, blessures max, critiques max, initiative, résolution imprimées, compétences et armes.
 */
const LIVRE = {
  'citoyen-imperial': { page: 340, role: 'troupe', vitesse: 'normale', carac: [30, 30, 30, 30, 30, 30, 30, 30, 30], armure: 0, wounds: 12, cw: 0, init: 6, res: 1,
    competences: { Athlétisme: 40, Dextérité: 40, Erudition: 35 }, armes: ['poings-citoyen'] },
  miserable: { page: 340, role: 'troupe', vitesse: 'normale', carac: [40, 30, 30, 40, 30, 20, 30, 20, 20], armure: 0, wounds: 13, cw: 0, init: 6, res: 1,
    competences: { Athlétisme: 40, Vigilance: 40, Discrétion: 40 }, armes: ['revolver-automatique', 'couteau'] },
  ganger: { page: 340, role: 'troupe', vitesse: 'normale', carac: [35, 35, 30, 40, 40, 20, 30, 20, 20], armure: 2, wounds: 13, cw: 0, init: 7, res: 1,
    competences: { Mêlée: 40, Présence: 40, Tir: 40, Discrétion: 50 }, armes: ['fusil-automatique', 'pistolet-automatique-lourd', 'couteau'] },
  serviteur: { page: 323, role: 'troupe', vitesse: 'lente', carac: [30, 30, 50, 50, 20, 10, 10, 10, 10], armure: 2, wounds: 16, cw: 0, init: 3, res: null,
    competences: { 'Athlétisme (Force)': 60, Dextérité: 30 }, armes: ['griffe-serviteur'] },
  cultiste: { page: 344, role: 'troupe', vitesse: 'normale', carac: [30, 30, 30, 30, 30, 30, 30, 30, 30], armure: 1, wounds: 12, cw: 0, init: 6, res: 1,
    competences: { 'Linguistique (Interdit)': 40, 'Erudition (Interdit)': 40, Mêlée: 40, Présence: 40, Tir: 40, 'Rapport (Tromperie)': 40, Discrétion: 40 },
    armes: ['fusil-automatique', 'pistolet-automatique', 'epee', 'couteau'] },
  'cultiste-maudit': { page: 344, role: 'troupe', vitesse: 'normale', carac: [50, 30, 30, 30, 30, 30, 30, 25, 25], armure: 2, wounds: 11, cw: 0, init: 6, res: 1,
    competences: { Vigilance: 40, 'Linguistique (Interdit)': 40, 'Erudition (Interdit)': 40, 'Mêlée (Mains nues)': 60, Présence: 30, Discrétion: 40 },
    armes: ['pistolet-automatique', 'griffes-du-warp'] },
  // p. 327 : Initiative 6 imprimée au lieu de 7 (Per 40 + Ag 30) → initiativeFixe 6 dans les données.
  executeur: { page: 327, role: 'elite', vitesse: 'normale', carac: [35, 35, 40, 40, 30, 25, 40, 40, 25], armure: 5, wounds: 16, cw: 1, init: 6, res: 2,
    competences: { Athlétisme: 50, Vigilance: 50, Discipline: 50, Endurance: 50, Intuition: 50, Mêlée: 40, 'Mêlée (Une main)': 50, Présence: 50, 'Présence (Interrogatoire)': 60, 'Présence (Intimidation)': 60, Tir: 40, Rapport: 30 },
    armes: ['electro-matraque', 'fusil-automatique', 'revolver-automatique'] },
  'chasseur-de-primes': { page: 342, role: 'elite', vitesse: 'normale', carac: [50, 50, 40, 50, 40, 30, 50, 30, 30], armure: 2, wounds: 17, cw: 1, init: 9, res: 3,
    competences: { Athlétisme: 50, Vigilance: 60, 'Intuition (Humains)': 60, 'Logique (Enquête)': 50, 'Navigation (Pistage)': 50, Présence: 40, 'Rapport (Questionnement)': 50 },
    armes: ['epee-tronconneuse', 'electro-matraque', 'fusil-automatique', 'toilleur'] },
  'chef-de-gang': { page: 342, role: 'chef', vitesse: 'normale', carac: [50, 50, 50, 50, 50, 30, 30, 40, 40], armure: 2, wounds: 19, cw: 5, init: 8, res: 2,
    competences: { Athlétisme: 60, Vigilance: 40, Discipline: 50, Intuition: 50, Mêlée: 60, Présence: 50, Tir: 60 },
    armes: ['arme-lourde', 'couteau', 'canon-a-main'] },
  'chef-de-culte': { page: 346, role: 'chef', vitesse: 'normale', carac: [40, 40, 40, 50, 40, 40, 40, 50, 50], armure: 2, wounds: 19, cw: 5, init: 8, res: 3,
    competences: { Vigilance: 50, Discipline: 60, 'Discipline (Peur)': 70, Endurance: 60, Intuition: 50, 'Linguistique (Interdit)': 50, 'Erudition (Interdit)': 50, Mêlée: 50, 'Mêlée (Une main)': 60, Présence: 60, 'Présence (Intimidation)': 70, 'Présence (Commandement)': 70, 'Rapport (Tromperie)': 60, Discrétion: 50 },
    armes: ['epee-tronconneuse', 'couteau', 'canon-a-main'] }
};

/** Armes de départ relevées dans les tableaux : spécialisation, dégâts de base, bonus de F, portée, chargeur, traits, page. */
const ARMES_LIVRE = {
  'mains-nues': { page: 128, type: 'melee', specialisation: 'Mêlée (Mains nues)', degats: 0, bf: true, portee: 'immediate', chargeur: null, traits: [['ineffective']] },
  couteau: { page: 128, type: 'melee', specialisation: 'Mêlée (Une main)', degats: 0, bf: true, portee: 'immediate', chargeur: null, traits: [['subtle'], ['thrown', 'courte']] },
  epee: { page: 128, type: 'melee', specialisation: 'Mêlée (Une main)', degats: 2, bf: true, portee: 'immediate', chargeur: null, traits: [] },
  hache: { page: 128, type: 'melee', specialisation: 'Mêlée (Une main)', degats: 2, bf: true, portee: 'immediate', chargeur: null, traits: [['rend', 1]] },
  'arme-lourde': { page: 128, type: 'melee', specialisation: 'Mêlée (Deux mains)', degats: 4, bf: true, portee: 'immediate', chargeur: null, traits: [['heavy', 4], ['two-handed']] },
  'epee-tronconneuse': { page: 128, type: 'melee', specialisation: 'Mêlée (Une main)', degats: 3, bf: true, portee: 'immediate', chargeur: null, traits: [['loud'], ['rend', 2]] },
  'electro-matraque': { page: 128, type: 'melee', specialisation: 'Mêlée (Une main)', degats: 2, bf: true, portee: 'immediate', chargeur: null, traits: [['loud'], ['inflict', 'sonne']] },
  'epee-energetique': { page: 128, type: 'melee', specialisation: 'Mêlée (Une main)', degats: 4, bf: true, portee: 'immediate', chargeur: null, traits: [['penetrating', 4]] },
  'griffe-serviteur': { page: 323, type: 'melee', specialisation: 'Mêlée (Mains nues)', degats: 2, bf: true, portee: 'immediate', chargeur: null, traits: [['penetrating', 2]] }, // 7 pour F 50, p. 323
  'griffes-du-warp': { page: '222, 344', type: 'melee', specialisation: 'Mêlée (Mains nues)', degats: 0, bf: true, portee: 'immediate', chargeur: null, traits: [['rend', 1]] },
  'poings-citoyen': { page: 340, type: 'melee', specialisation: 'Mêlée (Mains nues)', degats: 1, bf: false, portee: 'immediate', chargeur: null, traits: [['ineffective']] }, // 1 dégât fixe, Ineffective, p. 340
  'pistolet-laser': { page: 132, type: 'tir', specialisation: 'Tir (Pistolet)', degats: 5, bf: false, portee: 'moyenne', chargeur: 4, traits: [['burst'], ['close'], ['loud'], ['reliable']] },
  'fusil-laser': { page: 132, type: 'tir', specialisation: 'Tir (Arme longue)', degats: 6, bf: false, portee: 'longue', chargeur: 8, traits: [['burst'], ['loud'], ['reliable'], ['two-handed']] },
  'pistolet-automatique': { page: 133, type: 'tir', specialisation: 'Tir (Pistolet)', degats: 5, bf: false, portee: 'moyenne', chargeur: 3, traits: [['close'], ['loud'], ['rapid-fire', 3]] },
  'fusil-automatique': { page: 133, type: 'tir', specialisation: 'Tir (Arme longue)', degats: 6, bf: false, portee: 'longue', chargeur: 5, traits: [['loud'], ['rapid-fire', 3], ['two-handed']] },
  'revolver-automatique': { page: 133, type: 'tir', specialisation: 'Tir (Pistolet)', degats: 6, bf: false, portee: 'moyenne', chargeur: 6, traits: [['close'], ['loud'], ['reliable']] },
  'pistolet-automatique-lourd': { page: 133, type: 'tir', specialisation: 'Tir (Pistolet)', degats: 6, bf: false, portee: 'moyenne', chargeur: 2, traits: [['burst'], ['close'], ['loud']] },
  'canon-a-main': { page: 133, type: 'tir', specialisation: 'Tir (Pistolet)', degats: 8, bf: false, portee: 'moyenne', chargeur: 4, traits: [['close'], ['heavy', 4], ['loud'], ['penetrating', 2]] },
  'fusil-a-pompe': { page: 133, type: 'tir', specialisation: 'Tir (Arme longue)', degats: 6, bf: false, portee: 'moyenne', chargeur: 8, traits: [['inflict', 'a-terre'], ['loud'], ['spread'], ['two-handed']] },
  'pistolet-bolter': { page: 132, type: 'tir', specialisation: 'Tir (Pistolet)', degats: 8, bf: false, portee: 'moyenne', chargeur: 2, traits: [['burst'], ['close'], ['loud'], ['penetrating', 4], ['spread']] },
  'pistolet-plasma': { page: 133, type: 'tir', specialisation: 'Tir (Pistolet)', degats: 10, bf: false, portee: 'moyenne', chargeur: 6, traits: [['close'], ['loud'], ['penetrating', 6], ['supercharge', 4], ['unstable']] },
  toilleur: { page: 133, type: 'tir', specialisation: 'Tir (Arme longue)', degats: 0, bf: false, portee: 'moyenne', chargeur: 6, traits: [['inflict', 'entrave'], ['two-handed']] },
  'grenade-fragmentation': { page: 136, type: 'tir', specialisation: 'Tir (Lancer)', degats: 6, bf: false, portee: 'moyenne', chargeur: null, traits: [['blast'], ['loud'], ['thrown', 'moyenne'], ['unstable']] }
};

const traitsEnLigne = a => a.traits.map(t => (t.valeur === undefined ? [t.id] : [t.id, t.valeur]));

test('les dix PNJ de départ : ids, rôles et sources citées page par page', () => {
  assert.deepEqual(PNJ_DEPART.map(p => p.id).sort(), Object.keys(LIVRE).sort());
  const r = reserveDeDepart();
  for (const p of PNJ_DEPART) {
    assert.equal(p.kind, 'PNJ');
    assert.equal(p.camp, 'ennemi');
    assert.equal(p.role, LIVRE[p.id].role, `${p.id} : rôle p. ${LIVRE[p.id].page}`);
    assert.equal(p.source, `Livre de base p. ${LIVRE[p.id].page}`, `${p.id} : source`);
    assert.ok(!('suivi' in p), `${p.id} : suivi absent des données brutes (lu comme vide)`);
    assert.equal(trouverProfil(r, p.id).suivi, null, `${p.id} : suivi null dans la réserve (réservé aux PJ)`);
  }
});

test('chaque PNJ a les neuf caractéristiques imprimées de son statblock', () => {
  const r = reserveDeDepart();
  for (const [id, v] of Object.entries(LIVRE)) {
    const p = trouverProfil(r, id);
    assert.deepEqual(ORDRE.map(c => p.carac[c]), v.carac, `${id} : CC CT F E Ag Int Per FM Soc, p. ${v.page}`);
    assert.equal(p.armure, v.armure, `${id} : armure, p. ${v.page}`);
    assert.equal(p.resolution, v.res, `${id} : résolution, p. ${v.page}`);
    assert.equal(p.vitesse, v.vitesse, `${id} : vitesse, p. ${v.page}`);
    assert.equal(p.taille, 'moyenne', `${id} : taille Moyenne, p. ${v.page}`);
    assert.deepEqual(p.competences, v.competences, `${id} : compétences, p. ${v.page}`);
    assert.deepEqual(p.armes, v.armes, `${id} : armes, attaques p. ${v.page}`);
  }
});

test('valeurs dérivées de chaque PNJ = valeurs imprimées du statblock (formule p. 88, rôles p. 317)', () => {
  const r = reserveDeDepart();
  for (const [id, v] of Object.entries(LIVRE)) {
    const d = valeursDerivees(trouverProfil(r, id));
    assert.equal(d.blessuresMax, v.wounds, `${id} : blessures max, p. ${v.page}`);
    assert.equal(d.critiquesMax, v.cw, `${id} : critiques max, p. ${v.page} (rôle ${v.role}, p. 317)`);
    assert.equal(d.initiative, v.init, `${id} : initiative, p. ${v.page}`);
  }
  // Piège p. 327 : l’exécuteur a Per 40 + Ag 30 (formule 7) mais Initiative 6 imprimée.
  const executeur = trouverProfil(r, 'executeur');
  assert.equal(executeur.initiativeFixe, 6);
  assert.equal(valeursDerivees({ ...executeur, initiativeFixe: null }).initiative, 7, 'formule p. 88 : 4 + 3');
});

test('chaque PNJ passe la validation et entre dans la réserve avec ses armes', () => {
  const r = reserveDeDepart();
  assert.equal(r.profils.length, 10);
  assert.ok(!r.profils.some(p => p.kind === 'PJ'), 'aucun PJ dans les données de départ');
  for (const p of PNJ_DEPART) {
    assert.deepEqual(validerProfil(normaliserProfil(p)), [], p.id);
    const dansReserve = trouverProfil(r, p.id);
    assert.ok(dansReserve, `${p.id} est dans la réserve`);
    for (const idArme of dansReserve.armes) assert.ok(r.armes[idArme], `${p.id} : arme « ${idArme} » dans la réserve`);
  }
  assert.deepEqual(r.profils.map(p => p.id).sort(), PNJ_DEPART.map(p => p.id).sort());
});

test('armes de départ : spécialisation, dégâts, bonus de F, portée, chargeur, traits et page, ligne par ligne', () => {
  assert.deepEqual(Object.keys(ARMES_DEPART).sort(), Object.keys(ARMES_LIVRE).sort());
  for (const [id, v] of Object.entries(ARMES_LIVRE)) {
    const a = ARMES_DEPART[id];
    assert.deepEqual(validerArme(a), [], `${id} : valide`);
    assert.equal(a.type, v.type, `${id} : type`);
    assert.equal(a.specialisation, v.specialisation, `${id} : spécialisation, p. ${v.page}`);
    assert.equal(a.degatsBase, v.degats, `${id} : dégâts de base, p. ${v.page}`);
    assert.equal(a.ajouteBF, v.bf, `${id} : ajoute le bonus de F`);
    assert.equal(a.portee, v.portee, `${id} : portée, p. ${v.page}`);
    assert.equal(a.chargeur, v.chargeur, `${id} : chargeur, p. ${v.page}`);
    assert.deepEqual(traitsEnLigne(a), v.traits, `${id} : traits, p. ${v.page}`);
    for (const p of String(v.page).split(',')) assert.ok(a.source.includes(`p. ${p.trim()}`), `${id} : source cite la page ${p.trim()}`);
  }
});

test('la réserve de départ contient toutes les armes, toutes valides, et refuse de supprimer une arme équipée', () => {
  const r = reserveDeDepart();
  assert.deepEqual(Object.keys(r.armes).sort(), Object.keys(ARMES_DEPART).sort());
  for (const a of Object.values(ARMES_DEPART)) assert.deepEqual(validerArme(a), [], a.id);
  assert.throws(() => supprimerArme(r, 'couteau'), /Misérable|Ganger|Cultiste|Chef de gang|Chef de culte/, 'couteau équipé par 5 PNJ (p. 340, 342, 344, 346)');
  assert.equal(r.version, 1);
});

test('donnees-depart.js n’importe que ./profils.js, et aucun texte du livre n’y est recopié entre guillemets', () => {
  const code = readFileSync(new URL('../../../imperium/donnees-depart.js', import.meta.url), 'utf8');
  const imports = [...code.matchAll(/from\s+'([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(imports, ['./profils.js']);
  assert.doesNotMatch(code, /«[^»\n]{30,}»/);
  assert.doesNotMatch(code, /\b(Unarmed|Laspistol|Chainsword|Shock Maul|Power Sword|Great Weapon|Autogun|Stub Revolver|Stub Pistol|Hand Cannon|Bolt Pistol|Plasma Pistol|Webber|Frag Grenade|Servo Claw|Warp Claws)\b/);
});
