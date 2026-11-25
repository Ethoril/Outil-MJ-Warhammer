// Imperium Maledictum : réserve de profils (PJ, PNJ, armes), valeurs dérivées, armure par localisation, seuils de compétence.
// Tous les exemples chiffrés viennent du Core Book (page citée en commentaire ; page PDF = page imprimée).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  VERSION_RESERVE, KINDS, CAMPS, creerReserve, idDepuisNom,
  normaliserArme, validerArme, ajouterArme, modifierArme, supprimerArme,
  normaliserProfil, validerProfil, valeursDerivees, trouverProfil, ajouterProfil, modifierProfil, supprimerProfil,
  armureDe, seuilCompetence
} from '../../../imperium/profils.js';

const epee = { id: 'epee', nom: 'Épée', type: 'melee', specialisation: 'Mêlée (Une main)', degatsBase: 2, ajouteBF: true, portee: 'immediate', chargeur: null, traits: [], source: 'Livre de base p. 128' };
const lasgun = { id: 'fusil-laser', nom: 'Fusil laser', type: 'tir', specialisation: 'Tir (Arme longue)', degatsBase: 6, ajouteBF: false, portee: 'longue', chargeur: 8, traits: [{ id: 'two-handed' }], source: 'Livre de base p. 132' };
const reserveAvecArmes = () => [epee, lasgun].reduce((r, a) => ajouterArme(r, a), creerReserve());

// PJ inspiré des exemples du livre : F 37 (sœur Helza, p. 211), E 40, FM 51 → 16 blessures max (p. 88).
const soeur = {
  nom: 'Sœur Helza', kind: 'PJ',
  carac: { CC: 30, CT: 35, F: 37, E: 40, Ag: 42, Int: 40, Per: 40, FM: 51, Soc: 30 },
  competences: { 'Réflexes (Esquive)': 67, Discrétion: 40 }, // Ag 42 + 20 + 5 = 67, exemple p. 92
  armes: ['epee', 'fusil-laser'], destinMax: 3 // 3 points de Destin de départ, p. 88
};

test('constantes et réserve vide : version 1, kinds PJ/PNJ, camps pj/ennemi/neutre', () => {
  assert.equal(VERSION_RESERVE, 1);
  assert.deepEqual([...KINDS], ['PJ', 'PNJ']);
  assert.deepEqual([...CAMPS], ['pj', 'ennemi', 'neutre']);
  assert.deepEqual(creerReserve(), { version: 1, profils: [], armes: {} });
});

test('créer un profil PJ : id tiré du nom, valeurs par défaut, réserve d’origine intacte', () => {
  const r0 = reserveAvecArmes();
  const r1 = ajouterProfil(r0, soeur);
  assert.equal(r0.profils.length, 0);
  assert.equal(r1.profils.length, 1);
  const p = trouverProfil(r1, 'soeur-helza');
  assert.equal(p.nom, 'Sœur Helza');
  assert.equal(p.kind, 'PJ');
  assert.equal(p.camp, 'pj'); // camp par défaut d’un PJ
  assert.equal(p.role, null);
  assert.equal(p.taille, 'moyenne'); // taille par défaut, p. 201
  assert.equal(p.vitesse, 'normale'); // vitesse par défaut, p. 202
  assert.equal(p.armure, 0);
  assert.equal(p.resolution, null);
  assert.equal(p.suivi, null); // pas de suivi tant qu’aucune rencontre n’a eu lieu
  assert.deepEqual(p.armes, ['epee', 'fusil-laser']);
  assert.equal(p.destinMax, 3); // Destin de départ 3, p. 88
});

test('l’id est unique : un homonyme reçoit un suffixe, un id explicite déjà pris est refusé', () => {
  let r = ajouterProfil(reserveAvecArmes(), soeur);
  r = ajouterProfil(r, { ...soeur, nom: 'Sœur Helza' });
  assert.deepEqual(r.profils.map(p => p.id), ['soeur-helza', 'soeur-helza-2']);
  assert.equal(idDepuisNom('Évêque à l’œil', []), 'eveque-a-l-oeil');
  assert.equal(idDepuisNom('Chef de gang', ['chef-de-gang']), 'chef-de-gang-2');
  assert.throws(() => ajouterProfil(r, { ...soeur, id: 'soeur-helza' }), /déjà/);
});

test('un profil PNJ sans camp prend « ennemi », un PJ sans camp prend « pj » ; suivi réservé aux PJ', () => {
  const pnj = { nom: 'Ganger', kind: 'PNJ', role: 'troupe', carac: { CC: 35, CT: 35, F: 30, E: 40, Ag: 40, Int: 20, Per: 30, FM: 20, Soc: 20 }, armes: [] };
  const r = ajouterProfil(reserveAvecArmes(), pnj);
  assert.equal(trouverProfil(r, 'ganger').camp, 'ennemi');
  const pjAvecSuivi = normaliserProfil({ ...soeur, suivi: { blessures: 2, critiques: 0, destin: 2, destinBrule: false, etats: ['a-terre'] } });
  assert.deepEqual(pjAvecSuivi.suivi, { blessures: 2, critiques: 0, destin: 2, destinBrule: false, etats: ['a-terre'] });
  assert.equal(normaliserProfil({ ...pnj, suivi: { blessures: 1 } }).suivi, null, 'suivi d’un PNJ forcé à null');
});

test('modifier un profil : fusion des caractéristiques et des compétences, autres profils intacts', () => {
  let r = ajouterProfil(reserveAvecArmes(), soeur);
  r = ajouterProfil(r, { nom: 'Ganger', kind: 'PNJ', role: 'troupe', carac: { CC: 35, CT: 35, F: 30, E: 40, Ag: 40, Int: 20, Per: 30, FM: 20, Soc: 20 } });
  const r2 = modifierProfil(r, 'soeur-helza', { carac: { Ag: 50 }, competences: { Discrétion: 55 }, suivi: { blessures: 4 } });
  const p = trouverProfil(r2, 'soeur-helza');
  assert.equal(p.carac.Ag, 50);
  assert.equal(p.carac.F, 37);
  assert.equal(p.competences.Discrétion, 55);
  assert.equal(p.competences['Réflexes (Esquive)'], 67);
  assert.deepEqual(p.suivi, { blessures: 4 });
  assert.equal(trouverProfil(r, 'soeur-helza').carac.Ag, 42);
  assert.deepEqual(trouverProfil(r2, 'ganger'), trouverProfil(r, 'ganger'));
  assert.throws(() => modifierProfil(r, 'absent', { carac: { F: 10 } }), /introuvable/);
  assert.throws(() => modifierProfil(r, 'soeur-helza', { id: 'ganger' }), /id/);
});

test('supprimer un profil', () => {
  let r = ajouterProfil(reserveAvecArmes(), soeur);
  r = supprimerProfil(r, 'soeur-helza');
  assert.equal(r.profils.length, 0);
  assert.throws(() => supprimerProfil(r, 'soeur-helza'), /introuvable/);
});

test('validation : messages en français, champs facultatifs absents acceptés', () => {
  assert.deepEqual(validerProfil(normaliserProfil(soeur)), []);
  assert.ok(validerProfil({ ...normaliserProfil(soeur), nom: '  ' }).some(e => /nom/i.test(e)));
  assert.ok(validerProfil({ ...normaliserProfil(soeur), kind: 'dragon' }).some(e => /type/i.test(e)));
  assert.ok(validerProfil({ ...normaliserProfil(soeur), role: 'boss' }).some(e => /rôle/i.test(e)));
  assert.ok(validerProfil({ ...normaliserProfil(soeur), camp: 'mars' }).some(e => /camp/i.test(e)));
  assert.ok(validerProfil({ ...normaliserProfil(soeur), taille: 'géante' }).some(e => /taille/i.test(e)));
  assert.ok(validerProfil({ ...normaliserProfil(soeur), vitesse: 'statique' }).some(e => /vitesse/i.test(e)));
  const sansF = normaliserProfil({ ...soeur, carac: { ...soeur.carac, F: undefined } });
  assert.ok(validerProfil(sansF).some(e => /\bF\b/.test(e)));
  assert.ok(validerProfil({ ...normaliserProfil(soeur), armure: -1 }).some(e => /armure/i.test(e)));
  assert.ok(validerProfil({ ...normaliserProfil(soeur), armure: { tete: -2 } }).some(e => /tete/i.test(e)));
  assert.throws(() => ajouterProfil(creerReserve(), { nom: '' , carac: soeur.carac }), /nom/i);
});

test('un profil qui cite une arme absente de la réserve est refusé', () => {
  assert.throws(() => ajouterProfil(creerReserve(), soeur), /arme/i);
});

test('armes : normaliser, valider, ajouter, modifier, supprimer (refusé tant qu’un profil s’en sert)', () => {
  let r = reserveAvecArmes();
  assert.throws(() => ajouterArme(r, { ...epee }), /déjà/);
  assert.throws(() => ajouterArme(r, { nom: 'X' }), /id/);
  assert.ok(validerArme(normaliserArme({ id: 'x', nom: '', type: 'melee' })).some(e => /nom/i.test(e)));
  assert.ok(validerArme(normaliserArme({ id: 'x', nom: 'X', type: 'arc' })).some(e => /type/i.test(e)));
  assert.ok(validerArme(normaliserArme({ id: 'x', nom: 'X', type: 'melee', degatsBase: 2.5 })).some(e => /dégâts/i.test(e)));
  assert.ok(validerArme(normaliserArme({ id: 'x', nom: 'X', type: 'tir', portee: 'loin' })).some(e => /portée/i.test(e)));
  assert.ok(validerArme(normaliserArme({ id: 'x', nom: 'X', type: 'tir', portee: 'moyenne', chargeur: 0 })).some(e => /chargeur/i.test(e)));
  assert.deepEqual(validerArme(normaliserArme(lasgun)), []);
  assert.equal(normaliserArme(lasgun).portee, 'longue');
  r = ajouterProfil(r, soeur); // soeur s’équipe de epee et fusil-laser
  assert.throws(() => supprimerArme(r, 'epee'), /Sœur Helza/);
  r = modifierArme(r, 'epee', { degatsBase: 3 });
  assert.equal(r.armes.epee.degatsBase, 3);
  assert.equal(r.armes.epee.ajouteBF, true);
  assert.throws(() => modifierArme(r, 'epee', { id: 'autre' }), /id/);
  assert.throws(() => modifierArme(r, 'absente', {}), /introuvable/);
  r = supprimerProfil(r, 'soeur-helza');
  r = supprimerArme(r, 'epee');
  assert.equal(r.armes.epee, undefined);
  assert.throws(() => supprimerArme(r, 'epee'), /introuvable/);
});

test('valeurs dérivées PJ : bonus par caractéristique, blessures, critiques, initiative (p. 88)', () => {
  const d = valeursDerivees(normaliserProfil(soeur));
  assert.equal(d.bonus.F, 3); // F 37 → 3, p. 50 (exemple p. 211)
  assert.equal(d.bonus.FM, 5); // FM 51 → 5, p. 50
  assert.equal(d.blessuresMax, 16); // bonus F 3 + 2 × bonus E 4 + bonus FM 5, p. 88
  assert.equal(d.critiquesMax, 4); // PJ : bonus d’E, p. 88
  assert.equal(d.initiative, 8); // bonus Per 4 + bonus Ag 4, p. 88 (Ag 42 ici)
  assert.equal(d.armure, 0);
});

test('valeurs dérivées PNJ selon le rôle : Troupe 0 critique, Élite 1, Chef bonus d’E (p. 88, 317)', () => {
  const base = { nom: 'X', kind: 'PNJ', carac: soeur.carac };
  // Ganger p. 340 : F 30 + E 40 + FM 20 → 13 blessures ; Initiative Per 30 + Ag 40 → 7
  const ganger = normaliserProfil({ ...base, role: 'troupe', carac: { CC: 35, CT: 35, F: 30, E: 40, Ag: 40, Int: 20, Per: 30, FM: 20, Soc: 20 } });
  const dg = valeursDerivees(ganger);
  assert.equal(dg.blessuresMax, 13); // 3 + 8 + 2, p. 88 (imprimé 13 p. 340)
  assert.equal(dg.critiquesMax, 0); // Troupe : 0, p. 317 (imprimé 0 p. 340)
  assert.equal(dg.initiative, 7); // 3 + 4, p. 88 (imprimé 7 p. 340)
  assert.equal(valeursDerivees({ ...base, role: 'elite' }).critiquesMax, 1); // Élite : 1, p. 317 (imprimé 1 p. 327)
  assert.equal(valeursDerivees({ ...base, role: 'chef' }).critiquesMax, 4); // Chef : bonus d’E 4, p. 317 (chef de gang p. 342 : E 50 → 5)
});

test('piège du Core Book : les valeurs fixes imprimées priment sur la formule (p. 327, 345)', () => {
  // Exécuteur p. 327 : Per 40 + Ag 30 donnerait Initiative 7, mais le statblock imprime 6.
  const enforcer = normaliserProfil({
    nom: 'Exécuteur', kind: 'PNJ', role: 'elite',
    carac: { CC: 35, CT: 35, F: 40, E: 40, Ag: 30, Int: 25, Per: 40, FM: 40, Soc: 25 }, initiativeFixe: 6
  });
  assert.equal(valeursDerivees(enforcer).initiative, 6); // valeur fixe, p. 327
  assert.equal(valeursDerivees({ ...enforcer, initiativeFixe: null }).initiative, 7); // formule p. 88 : 4 + 3
  assert.equal(valeursDerivees(enforcer).blessuresMax, 16); // 4 + 8 + 4, p. 88 (imprimé 16 p. 327)
  // Chaos Spawn p. 345 : F 90 E 90 FM 10 → la formule donne 28, le statblock imprime 14.
  const spawn = normaliserProfil({
    nom: 'Chaos Spawn', kind: 'PNJ', role: 'elite',
    carac: { CC: 50, CT: 10, F: 90, E: 90, Ag: 20, Int: 10, Per: 10, FM: 10, Soc: 10 }, blessuresMaxFixe: 14
  });
  assert.equal(valeursDerivees(spawn).blessuresMax, 14); // valeur fixe, p. 345
  assert.equal(valeursDerivees({ ...spawn, blessuresMaxFixe: null }).blessuresMax, 28); // formule p. 88 : 9 + 18 + 1
});

test('armureDe : une valeur unique s’applique à toutes les localisations (p. 316), objet par localisation sinon (p. 211)', () => {
  // Exécuteur p. 327 : Armour 5 partout, p. 316 (une seule valeur d’armure s’applique à toutes les localisations).
  const enforcer = { armure: 5 };
  for (const loc of ['tete', 'bras-g', 'bras-d', 'corps', 'jambe-g', 'jambe-d']) assert.equal(armureDe(enforcer, loc), 5, loc);
  // Armure par localisation, avec repli « bras »/« jambe » : tête sans casque = 0 (p. 316).
  const parLoc = { armure: { corps: 4, bras: 2, jambe: 1, tete: 0 } };
  assert.equal(armureDe(parLoc, 'corps'), 4);
  assert.equal(armureDe(parLoc, 'bras-g'), 2);
  assert.equal(armureDe(parLoc, 'bras-d'), 2);
  assert.equal(armureDe(parLoc, 'jambe-g'), 1);
  assert.equal(armureDe(parLoc, 'tete'), 0);
  const mixte = { armure: { tete: 3, brasG: 2, corps: 4 } };
  assert.equal(armureDe(mixte, 'bras-g'), 2);
  assert.equal(armureDe(mixte, 'bras-d'), 0); // brasD absent, pas de « bras » générique → 0
  assert.equal(armureDe({ armure: 0 }, 'corps'), 0);
  assert.equal(armureDe({}, 'corps'), 0); // armure absente : lu comme 0
  assert.throws(() => armureDe(enforcer, 'ventre'), /localisation/i);
});

test('seuilCompetence : compétence, puis compétence parente « Parent (Spécialisation) », puis caractéristique (p. 92, 316)', () => {
  // Exécuteur p. 327 : Mêlée 40, Mêlée (Une main) 50, Tir 40 ; Ag 30.
  const enforcer = normaliserProfil({
    nom: 'Exécuteur', kind: 'PNJ', role: 'elite',
    carac: { CC: 35, CT: 35, F: 40, E: 40, Ag: 30, Int: 25, Per: 40, FM: 40, Soc: 25 },
    competences: { Mêlée: 40, 'Mêlée (Une main)': 50, Tir: 40 }
  });
  assert.equal(seuilCompetence(enforcer, 'Mêlée (Une main)', 'CC'), 50); // compétence directe, p. 327
  assert.equal(seuilCompetence(enforcer, 'Mêlée (Deux mains)', 'CC'), 40); // repli sur la parente « Mêlée », p. 92
  assert.equal(seuilCompetence(enforcer, 'Tir (Pistolet)', 'CT'), 40); // repli sur « Tir », p. 92
  assert.equal(seuilCompetence(enforcer, 'Discrétion', 'Ag'), 30); // absente → caractéristique Ag, p. 316
  assert.equal(seuilCompetence(enforcer, 'Athlétisme', 'F'), 40); // absente → F 40, p. 316 (Athlétisme se teste en F, p. 92)
  // Sœur Helza : Ag 42 + 20 + 5 = 67 en Réflexes (Esquive), exemple p. 92.
  const p = normaliserProfil(soeur);
  assert.equal(seuilCompetence(p, 'Réflexes (Esquive)', 'Ag'), 67);
  assert.equal(seuilCompetence(p, 'Réflexes', 'Ag'), 42); // sans la spécialisation, la parente absente → Ag, p. 92
});

test('profils.js n’importe que ./regles.js', () => {
  const code = readFileSync(new URL('../../../imperium/profils.js', import.meta.url), 'utf8');
  const imports = [...code.matchAll(/from\s+'([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(imports, ['./regles.js']);
});
