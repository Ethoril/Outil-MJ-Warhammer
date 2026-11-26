// Imperium Maledictum sur la carte (multi-jeux, lot I5) : la projection participant -> pion passe par le protocole
// commun (js/core/map-link-protocol.js, version 3) ; la projection elle-meme ne charge que imperium/ et les modules
// communs du chapeau (fermeture d'imports). Blessures montantes converties en PV descendants (p. 88), taille du pion
// depuis `taille` (p. 201, 313), marqueurs strictement dans les 16 MARQUEURS_CARTE (conditions p. 356-357, desespere
// p. 197, surpris p. 199), vitesse non envoyee comme portee (p. 202 : speedCells/runCells/visionDim a null).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARQUEURS_CARTE, MAP_LINK_VERSION } from '../../../js/core/map-link-protocol.js';
import { ajouterProfil } from '../../../imperium/profils.js';
import { composerRencontre, commencerRound, passerTour, engager, acteurCourant } from '../../../imperium/rencontre.js';
import { reserveDeDepart } from '../../../imperium/donnees-depart.js';
import {
  refCarteDe, participantsPourLaCarte, etatPionDe, engagementPairs, imperiumMapProjection, creerLiaisonCarte
} from '../../../imperium/projection-carte.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

// --- Profils : la reserve de depart + deux PJ (Sœur Helza, exemple p. 211 : Mêlée 42, F 37) ------------------------
function reserve() {
  let r = reserveDeDepart();
  r = ajouterProfil(r, {
    id: 'helza', nom: 'Sœur Helza', kind: 'PJ', camp: 'pj', taille: 'moyenne', vitesse: 'normale',
    image: 'maps/tokens/joueurs/helza.webp',
    // p. 211 : Mêlée 42, F 37 ; formule p. 88 -> blessures max 3+8+5 = 16, initiative 4+4 = 8
    carac: { CC: 40, CT: 40, F: 37, E: 40, Ag: 40, Int: 40, Per: 40, FM: 51, Soc: 40 },
    competences: { Mêlée: 42, Tir: 40, Réflexes: 50, Endurance: 50 },
    armure: 2, armes: ['epee', 'pistolet-laser'], resolution: 3, destinMax: 3,
    source: 'Core Book p. 211 (exemple Sœur Helza : Mêlée 42, F 37)'
  });
  r = ajouterProfil(r, {
    id: 'abel', nom: 'Abel Fournier', kind: 'PJ', camp: 'pj', taille: 'grande', vitesse: 'normale',
    carac: { CC: 45, CT: 40, F: 45, E: 45, Ag: 35, Int: 40, Per: 35, FM: 40, Soc: 30 },
    competences: { Mêlée: 40, Tir: 35 }, armure: 3, armes: ['hache'], resolution: 2, destinMax: 3,
    source: ''
  });
  return r;
}
const parEtat = (p, etat) => ({ ...p, etat });
const parBlessures = (p, blessures) => ({ ...p, blessures });

// --- Projection ---------------------------------------------------------------------------------------------------------

test('ref : pj:<id du profil> pour un PJ, p:<id> pour un PNJ (Ganger 2 compris)', () => {
  const r = composerRencontre(reserve(), ['helza', 'ganger', 'ganger']);
  assert.deepEqual(r.participants.map(refCarteDe), ['pj:helza', 'p:ganger', 'p:ganger-2']);
});

test('pion d’un PJ : nom, camp, image, taille moyenne en 1 case, PV pleins, pas de portée envoyée', () => {
  const r = composerRencontre(reserve(), ['helza']);
  const state = etatPionDe(r.participants[0]);
  assert.equal(state.ref, 'pj:helza');
  assert.equal(state.label, 'Sœur Helza');
  assert.equal(state.camp, 'pj');
  assert.equal(state.kind, 'pc');
  assert.equal(state.visionSource, true);
  assert.equal(state.imageUrl, 'maps/tokens/joueurs/helza.webp');
  assert.equal(state.formImageUrl, null);
  assert.equal(state.color, null);
  assert.equal(state.sizeCells, 1, 'taille moyenne -> 1 case (p. 201, 313)');
  assert.deepEqual(state.hp, { current: 16, max: 16 }, 'blessures 0 -> PV pleins (p. 88)');
  assert.equal(state.health, 'unharmed');
  assert.deepEqual(state.markers, []);
  assert.deepEqual(state.markerLevels, {});
  assert.equal(state.mounted, false);
  assert.equal(state.rider, null);
  assert.equal(state.dead, false);
  assert.equal(state.deathCause, null);
  // Mode Zones par défaut : la Vitesse (p. 202) ne part pas comme portée.
  assert.equal(state.speedCells, null);
  assert.equal(state.runCells, null);
  assert.equal(state.visionDim, null);
  assert.equal('bondCells' in state, false);
});

test('pion d’un PNJ : camp ennemi, kind npc, pas de source de vision, nom numéroté', () => {
  const r = composerRencontre(reserve(), ['ganger', 'ganger']);
  const [premier, second] = r.participants.map(etatPionDe);
  assert.equal(premier.camp, 'ennemi');
  assert.equal(premier.kind, 'npc');
  assert.equal(premier.visionSource, false);
  assert.equal(premier.ref, 'p:ganger');
  assert.equal(second.label, 'Ganger 2');
  assert.equal(second.ref, 'p:ganger-2');
  assert.deepEqual(premier.hp, { current: 13, max: 13 }, 'blessures max du Ganger p. 340 : 13');
});

test('image absente ou hors de maps/tokens/ : imageUrl null, la carte garde la sienne', () => {
  const r = composerRencontre(reserve(), ['abel', 'helza']);
  const [sans, avec] = r.participants;
  assert.equal(etatPionDe(sans).imageUrl, null, 'aucune image choisie');
  assert.equal(etatPionDe({ ...avec, image: 'https://exemple.fr/x.png' }).imageUrl, null, 'chemin refusé par token-library-path.js');
  assert.equal(etatPionDe({ ...avec, image: 'maps/tokens/../secret.png' }).imageUrl, null);
});

test('Blessures -> hp : PV descendants, santé unharmed / wounded / critical, Mourant critique (p. 214-215)', () => {
  const [helza] = composerRencontre(reserve(), ['helza']).participants;
  const max = 16;
  assert.deepEqual(etatPionDe(parBlessures(helza, 5)).hp, { current: 11, max });
  assert.equal(etatPionDe(parBlessures(helza, 5)).health, 'wounded');
  assert.equal(etatPionDe(parBlessures(helza, 12)).health, 'critical', 'courant 4 <= max/4 = 4');
  const zero = etatPionDe(parBlessures(helza, 16));
  assert.deepEqual(zero.hp, { current: 0, max });
  assert.equal(zero.health, 'critical');
  assert.equal(zero.dead, false, '0 PV reste vivant (Mourant), pas mort');
  assert.equal(etatPionDe(parBlessures(helza, 99)).hp.current, 0, 'blessures au-delà du max ramenées à 0 PV');
  assert.equal(etatPionDe({ ...parBlessures(helza, 3), etat: 'mourant' }).health, 'critical', 'Mourant -> critique (p. 215)');
  assert.equal(etatPionDe(parBlessures(helza, 0)).health, 'unharmed', 'aucune blessure -> indemne même Mourant');
  assert.equal(etatPionDe(parBlessures(helza, 15)).health, 'critical', 'courant 1 <= max/4');
  assert.equal(etatPionDe({ ...parBlessures(helza, 8), blessuresMax: 0 }).hp.max, 1, 'blessuresMax absent ou nul -> max 1');
});

test('mort et vaincu : dead sans cause inventée ; un enfui reste sur la carte, non mort (p. 216, 317)', () => {
  const [helza] = composerRencontre(reserve(), ['helza']).participants;
  const ganger = composerRencontre(reserve(), ['ganger']).participants[0];
  for (const etat of ['mort', 'vaincu']) {
    const state = etatPionDe(parEtat({ ...parBlessures(helza, 16), etats: [{ id: 'enflamme', niveau: 'majeur' }] }, etat));
    assert.equal(state.dead, true, etat);
    assert.equal(state.deathCause, null);
    assert.deepEqual(state.markers, [], 'un mort ne porte aucun marqueur');
    assert.deepEqual(state.markerLevels, {});
  }
  const enfui = etatPionDe(parEtat(ganger, 'fui'));
  assert.equal(enfui.dead, false, 'fui : retiré de la scène mais pas mort sur la carte');
  assert.deepEqual(enfui.markers, []);
  assert.equal(etatPionDe(parEtat(ganger, 'actif')).dead, false);
});

test('sizeCells depuis la taille (p. 201, 313) : 1 à 4 cases, défaut null', () => {
  const [helza] = composerRencontre(reserve(), ['helza']).participants;
  const tailles = { minuscule: 1, petite: 1, moyenne: 1, grande: 2, enorme: 3, monstrueuse: 4 };
  for (const [taille, cases] of Object.entries(tailles)) {
    assert.equal(etatPionDe({ ...helza, taille }).sizeCells, cases, taille);
  }
  assert.equal(etatPionDe({ ...helza, taille: 'inconnue' }).sizeCells, null);
  assert.equal(etatPionDe({ ...helza, taille: undefined }).sizeCells, null);
  assert.equal(etatPionDe(composerRencontre(reserve(), ['abel']).participants[0]).sizeCells, 2, 'Abel est grand');
});

test('marqueurs : projection stricte des conditions vers les 16 MARQUEURS_CARTE, niveaux 1/2 (p. 356-357, 197, 199)', () => {
  const [helza] = composerRencontre(reserve(), ['helza']).participants;
  const avec = etats => etatPionDe({ ...helza, etats });
  assert.deepEqual(avec([{ id: 'enflamme', niveau: 'mineur' }]).markers, ['ablaze']);
  assert.deepEqual(avec([{ id: 'enflamme', niveau: 'mineur' }]).markerLevels, { ablaze: 1 });
  assert.deepEqual(avec([{ id: 'enflamme', niveau: 'majeur' }]).markerLevels, { ablaze: 2 });
  assert.deepEqual(avec([{ id: 'hemorragique', niveau: 'majeur' }]).markers, ['bleeding']);
  assert.deepEqual(avec([{ id: 'hemorragique', niveau: 'majeur' }]).markerLevels, { bleeding: 2 });
  assert.deepEqual(avec([{ id: 'aveugle' }]).markers, ['blinded']);
  assert.deepEqual(avec([{ id: 'assourdi' }]).markers, ['deafened']);
  assert.deepEqual(avec([{ id: 'extenue', niveau: 'mineur' }]).markers, ['fatigued']);
  assert.deepEqual(avec([{ id: 'extenue', niveau: 'mineur' }]).markerLevels, { fatigued: 1 });
  assert.deepEqual(avec([{ id: 'effraye', niveau: 'mineur' }]).markers, ['fear']);
  assert.deepEqual(avec([{ id: 'effraye', niveau: 'majeur' }]).markers, ['terror']);
  assert.deepEqual(avec([{ id: 'empoisonne', niveau: 'majeur' }]).markers, ['poisoned']);
  assert.deepEqual(avec([{ id: 'empoisonne', niveau: 'majeur' }]).markerLevels, { poisoned: 2 });
  assert.deepEqual(avec([{ id: 'a-terre' }]).markers, ['prone']);
  assert.deepEqual(avec([{ id: 'entrave', niveau: 'mineur' }]).markers, ['entangled']);
  assert.deepEqual(avec([{ id: 'entrave', niveau: 'mineur' }]).markerLevels, { entangled: 1 });
  assert.deepEqual(avec([{ id: 'sonne', niveau: 'majeur' }]).markers, ['stunned']);
  assert.deepEqual(avec([{ id: 'sonne', niveau: 'majeur' }]).markerLevels, { stunned: 2 });
  assert.deepEqual(avec([{ id: 'inconscient' }]).markers, ['unconscious']);
  assert.deepEqual(avec([{ id: 'surpris' }]).markers, ['surprised'], 'p. 199');
  assert.deepEqual(avec([{ id: 'desespere' }]).markers, ['broken'], 'PNJ Désespéré, p. 197');
  // neutralise et surcharge (p. 357) : aucun marqueur connu de la carte
  assert.deepEqual(avec([{ id: 'neutralise' }, { id: 'surcharge' }]).markers, []);
  // Inconscient et Mourant (état) partent comme unconscious (p. 215, 357)
  assert.deepEqual(etatPionDe(parEtat(helza, 'inconscient')).markers, ['unconscious']);
  assert.deepEqual(etatPionDe(parEtat(helza, 'mourant')).markers, ['unconscious']);
  // Tout cumulé, sans doublon, et strictement dans MARQUEURS_CARTE
  const tous = avec([
    { id: 'enflamme', niveau: 'majeur' }, { id: 'hemorragique', niveau: 'mineur' }, { id: 'aveugle' }, { id: 'assourdi' },
    { id: 'extenue', niveau: 'majeur' }, { id: 'effraye', niveau: 'majeur' }, { id: 'empoisonne', niveau: 'mineur' },
    { id: 'a-terre' }, { id: 'entrave', niveau: 'majeur' }, { id: 'sonne', niveau: 'mineur' }, { id: 'surpris' },
    { id: 'desespere' }, { id: 'neutralise' }, { id: 'surcharge' }, { id: 'inconscient' }
  ]);
  assert.deepEqual(tous.markers, ['ablaze', 'bleeding', 'blinded', 'deafened', 'fatigued', 'terror', 'poisoned', 'prone', 'entangled', 'stunned', 'surprised', 'broken', 'unconscious']);
  assert.deepEqual(tous.markerLevels, { ablaze: 2, bleeding: 1, fatigued: 2, poisoned: 1, entangled: 2, stunned: 1 });
  for (const marqueur of tous.markers) assert.ok(MARQUEURS_CARTE.includes(marqueur), `${marqueur} connu de la carte`);
  for (const marqueur of Object.keys(tous.markerLevels)) assert.ok(MARQUEURS_CARTE.includes(marqueur), `${marqueur} connu de la carte`);
});

test('la projection rend { ref: état } pour tout le monde ; l’adaptateur d’image peut remplacer l’image', () => {
  const r = composerRencontre(reserve(), ['helza', 'ganger']);
  const projection = imperiumMapProjection();
  assert.deepEqual(Object.keys(projection.tokenStates(r.participants)), ['pj:helza', 'p:ganger']);
  assert.equal(projection.refOf(r.participants[1]), 'p:ganger');
  const autre = imperiumMapProjection({ imageUrlOf: () => 'maps/tokens/autre.png' });
  assert.equal(autre.tokenStates(r.participants)['p:ganger'].imageUrl, 'maps/tokens/autre.png');
});

test('engagementPairs : depuis rencontre.engages (p. 212), [[refA, refB]] si les deux sont présents', () => {
  let r = composerRencontre(reserve(), ['helza', 'ganger']);
  assert.deepEqual(engagementPairs(r.participants, r), [], 'pas d’engagement au départ');
  r = engager(r, 'helza', 'ganger');
  assert.deepEqual(engagementPairs(r.participants, r), [['p:ganger', 'pj:helza']], 'paire triée comme dans la rencontre');
  assert.deepEqual(engagementPairs(r.participants.slice(0, 1), r), [], 'un seul présent -> rien');
  assert.deepEqual(engagementPairs(r.participants), [], 'sans rencontre -> rien');
  const projection = imperiumMapProjection({ getEngages: () => r });
  assert.deepEqual(projection.engagementPairs(r.participants), [['p:ganger', 'pj:helza']]);
  assert.deepEqual(imperiumMapProjection().engagementPairs(r.participants), []);
});

test('participants de la carte : ceux de la rencontre, plus les PJ de la réserve qui n’y sont pas (contrat §3)', () => {
  const sans = participantsPourLaCarte({ reserve: reserve(), rencontre: null });
  assert.deepEqual(sans.map(refCarteDe), ['pj:helza', 'pj:abel'], 'hors rencontre : PJ seuls, les PNJ de la réserve ne partent pas');
  const rencontre = composerRencontre(reserve(), ['helza', 'ganger']);
  const avec = participantsPourLaCarte({ reserve: reserve(), rencontre });
  assert.deepEqual(avec.map(refCarteDe), ['pj:helza', 'p:ganger', 'pj:abel']);
  // Un PJ hors rencontre porte ce qu’il a gardé : blessures et conditions de son suivi (p. 214, 356).
  let r = reserve();
  r = { ...r, profils: r.profils.map(p => (p.id === 'abel' ? { ...p, suivi: { blessures: 6, critiques: [], destin: 2, destinBrule: 1, etats: [{ id: 'hemorragique', niveau: 'mineur' }] } } : p)) };
  const [, abel] = participantsPourLaCarte({ reserve: r, rencontre: null });
  const pion = etatPionDe(abel);
  assert.deepEqual(pion.hp, { current: pion.hp.max - 6, max: pion.hp.max });
  assert.deepEqual(pion.markers, ['bleeding']);
  assert.deepEqual(pion.markerLevels, { bleeding: 1 });
  assert.equal(pion.dead, false);
});

// --- Par le protocole commun --------------------------------------------------------------------------------------------

function liaison(etatInitial, options = {}) {
  const envoyes = [];
  let etat = etatInitial;
  const canal = { postMessage: message => envoyes.push(message), close() {} };
  const lien = creerLiaisonCarte({ channel: canal, getEtat: () => etat, now: () => 1000, ...options });
  const carte = (type, payload = {}) => ({ v: MAP_LINK_VERSION, type, seq: 1, at: 0, from: 'map', payload });
  return {
    lien, envoyes, carte,
    de: type => envoyes.filter(m => m.type === type),
    poser(suivant) { etat = suivant; lien.refresh(); }
  };
}

test('par le protocole : instantané, pions en réserve puis posés, blessure, mort, retrait', () => {
  const res = reserve();
  const r = composerRencontre(res, ['helza', 'ganger']);
  const t = liaison({ reserve: res, rencontre: null });
  assert.equal(t.envoyes[0].type, 'mj.hello');
  assert.equal(t.envoyes[0].from, 'outil-mj');
  t.lien.onMessage(t.carte('map.hello'));
  assert.equal(t.lien.status(), 'connected');
  assert.deepEqual(t.de('mj.snapshot')[0].payload.tokens.map(pion => pion.ref), ['pj:helza', 'pj:abel']);
  assert.deepEqual(t.de('mj.roster').at(-1).payload, { characters: [{ ref: 'pj:abel', label: 'Abel Fournier' }, { ref: 'pj:helza', label: 'Sœur Helza' }] });
  assert.deepEqual(t.de('mj.engagements').at(-1).payload, { pairs: [] });

  // Rencontre composée : le ganger arrive dans la réserve de la carte (token.add) ; les PJ, déjà liés, ne sont pas rajoutés.
  t.poser({ reserve: res, rencontre: r });
  assert.deepEqual(t.de('token.add').map(m => m.payload.ref), ['p:ganger']);
  assert.deepEqual(t.lien.placement().pending.map(p => p.ref), ['pj:abel', 'p:ganger', 'pj:helza'], 'à poser, triés par nom');
  t.lien.onMessage(t.carte('map.placed', { ref: 'pj:helza' }));
  t.lien.onMessage(t.carte('map.placed', { ref: 'p:ganger' }));
  assert.deepEqual(t.lien.placement().placed, ['p:ganger', 'pj:helza']);
  assert.equal(t.lien.isPlaced(r.participants[1]), true);

  // Blessure : le Ganger monte à 5 blessures -> PV 13 -> 8, token.state puis fx.wound.
  const blesse = { ...r, participants: r.participants.map(p => (p.id === 'ganger' ? { ...p, blessures: 5 } : p)) };
  t.poser({ reserve: res, rencontre: blesse });
  assert.deepEqual(t.de('fx.wound').map(m => m.payload), [{ ref: 'p:ganger', hpLost: 5, maxHp: 13, target: 'self' }]);
  const apres = t.de('token.state').at(-1).payload;
  assert.equal(apres.ref, 'p:ganger');
  assert.deepEqual(apres.hp, { current: 8, max: 13 });
  assert.equal(apres.health, 'wounded');

  // Mort de la PJ : dead, plus de marqueur, fx.death.
  const morte = { ...blesse, participants: blesse.participants.map(p => (p.id === 'helza' ? { ...p, blessures: 16, etat: 'mort', etats: [{ id: 'inconscient' }] } : p)) };
  t.poser({ reserve: res, rencontre: morte });
  const mort = t.de('token.state').at(-1).payload;
  assert.equal(mort.ref, 'pj:helza');
  assert.equal(mort.dead, true);
  assert.deepEqual(mort.markers, []);
  assert.deepEqual(mort.markerLevels, {});
  assert.deepEqual(t.de('fx.death').map(m => m.payload), [{ ref: 'pj:helza', cause: 'blood' }]);

  // Fin de la rencontre : le PNJ est retiré de la carte, les PJ restent liés.
  t.poser({ reserve: res, rencontre: null });
  assert.deepEqual(t.de('token.remove').map(m => m.payload), [{ ref: 'p:ganger' }]);
});

test('mj.engagements par le protocole : la paire part à l’instantané et au changement (p. 212)', () => {
  const res = reserve();
  let r = composerRencontre(res, ['helza', 'ganger']);
  const t = liaison({ reserve: res, rencontre: r });
  t.lien.onMessage(t.carte('map.hello'));
  assert.deepEqual(t.de('mj.engagements').at(-1).payload, { pairs: [] });
  r = engager(r, 'helza', 'ganger');
  t.poser({ reserve: res, rencontre: r });
  assert.deepEqual(t.de('mj.engagements').at(-1).payload, { pairs: [['p:ganger', 'pj:helza']] });
});

test('rien d’envoyé hors du contrat : enveloppes v3, marqueurs connus, portées null sur tous les messages', () => {
  const res = reserve();
  const r = composerRencontre(res, ['helza', 'ganger']);
  const t = liaison({ reserve: res, rencontre: r });
  t.lien.onMessage(t.carte('map.hello'));
  t.poser({ reserve: res, rencontre: { ...r, participants: r.participants.map(p => ({ ...p, blessures: 13, etat: 'mourant', etats: [{ id: 'enflamme', niveau: 'majeur' }, { id: 'surpris' }] })) } });
  const pions = [...t.de('mj.snapshot').flatMap(m => m.payload.tokens), ...t.de('token.add').map(m => m.payload), ...t.de('token.state').map(m => m.payload)];
  assert.ok(pions.length >= 4);
  for (const pion of pions) {
    for (const marqueur of pion.markers) assert.ok(MARQUEURS_CARTE.includes(marqueur), marqueur);
    for (const marqueur of Object.keys(pion.markerLevels)) assert.ok(MARQUEURS_CARTE.includes(marqueur), marqueur);
    assert.equal(pion.speedCells, null);
    assert.equal(pion.runCells, null);
    assert.equal(pion.visionDim, null);
  }
  assert.equal(MAP_LINK_VERSION, 3);
  for (const message of t.envoyes) {
    assert.equal(message.v, 3);
    assert.equal(message.from, 'outil-mj');
  }
});

test('v3 — mj.turn : null hors rencontre et au round 0, ref du participant actif à l’instantané et à chaque tour', () => {
  assert.equal(MAP_LINK_VERSION, 3);
  const res = reserve();
  const r0 = composerRencontre(res, ['helza', 'ganger']);

  // Hors rencontre : instantané puis mj.turn { ref: null }.
  const tHors = liaison({ reserve: res, rencontre: null });
  tHors.lien.onMessage(tHors.carte('map.hello'));
  assert.deepEqual(tHors.de('mj.turn').map(m => m.payload), [{ ref: null }]);

  // Au round 0 (aucun acteur courant) : mj.turn { ref: null } dans l'instantané, inchangé sur refresh.
  const t = liaison({ reserve: res, rencontre: r0 });
  t.lien.onMessage(t.carte('map.hello'));
  assert.deepEqual(t.de('mj.turn').map(m => m.payload), [{ ref: null }]);
  t.poser({ reserve: res, rencontre: r0 });
  assert.equal(t.de('mj.turn').length, 1, 'rien de renvoyé tant que le tour reste null');

  // Round 1 : Sœur Helza (Initiative 8) agit avant le Ganger (Initiative 7, p. 198), puis le Ganger au tour suivant.
  const r1 = commencerRound(r0);
  assert.equal(acteurCourant(r1).id, 'helza');
  t.poser({ reserve: res, rencontre: r1 });
  assert.deepEqual(t.de('mj.turn').at(-1).payload, { ref: 'pj:helza' });

  // Un instantané pendant le tour de Sœur Helza émet aussi mj.turn { ref: 'pj:helza' }.
  const tSnapshot = liaison({ reserve: res, rencontre: r1 });
  tSnapshot.lien.onMessage(tSnapshot.carte('map.hello'));
  assert.deepEqual(tSnapshot.de('mj.turn').map(m => m.payload), [{ ref: 'pj:helza' }]);

  const r2 = passerTour(r1);
  assert.equal(acteurCourant(r2).id, 'ganger');
  t.poser({ reserve: res, rencontre: r2 });
  assert.deepEqual(t.de('mj.turn').at(-1).payload, { ref: 'p:ganger' });

  // Fin de rencontre : retour à null.
  t.poser({ reserve: res, rencontre: null });
  assert.deepEqual(t.de('mj.turn').at(-1).payload, { ref: null });
  for (const message of t.envoyes) assert.equal(message.v, 3);
});

test('v3 — tolérance : map.turnReset sans puis avec espion onTurnReset, et map.impact inattendu ignoré sans erreur', () => {
  const res = reserve();
  const r1 = commencerRound(composerRencontre(res, ['helza', 'ganger']));

  const t = liaison({ reserve: res, rencontre: r1 });
  t.lien.onMessage(t.carte('map.hello'));
  const avant = t.envoyes.length;
  t.lien.onMessage({ v: 3, type: 'map.turnReset', seq: 2, at: 0, from: 'map', payload: { ref: 'pj:helza' } });
  assert.equal(t.envoyes.length, avant, 'map.turnReset sans callback : aucune erreur ni message parasite');

  t.lien.onMessage({ v: 3, type: 'map.impact', seq: 3, at: 0, from: 'map', payload: { queryId: 'iq-99', refs: ['pj:helza'] } });
  assert.equal(t.envoyes.length, avant, 'map.impact inattendu : ignoré sans erreur ni message');

  const resets = [];
  const tEspion = liaison({ reserve: res, rencontre: r1 }, { onTurnReset: ref => resets.push(ref) });
  tEspion.lien.onMessage(tEspion.carte('map.hello'));
  tEspion.lien.onMessage({ v: 3, type: 'map.turnReset', seq: 2, at: 0, from: 'map', payload: { ref: 'pj:helza' } });
  assert.deepEqual(resets, ['pj:helza']);
});

test('une carte dont la version diffère est signalée, rien n’est envoyé de plus', () => {
  const t = liaison({ reserve: reserve(), rencontre: null });
  const avant = t.envoyes.length;
  t.lien.onMessage({ v: 99, type: 'map.hello', seq: 1, at: 0, from: 'map', payload: {} });
  assert.equal(t.lien.status(), 'version-mismatch');
  assert.equal(t.envoyes.length, avant);
});

// --- Fermeture des imports ----------------------------------------------------------------------------------------------

/** Fermeture des imports (statiques, réexports, `import()` dynamiques) d'un module, comme tests/unit/chapeau/modules-communs.test.mjs. */
function fermeture(entree) {
  const vus = new Set(), file = [join(ROOT, entree)];
  while (file.length) {
    const fichier = file.pop();
    const source = readFileSync(fichier, 'utf8');
    const specifieurs = [...source.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g)]
      .map(m => m[1] ?? m[2] ?? m[3]).filter(spec => spec.startsWith('.'));
    for (const spec of specifieurs) {
      const cible = resolve(dirname(fichier), spec);
      assert.ok(existsSync(cible), `import introuvable : ${spec} dans ${relative(ROOT, fichier)}`);
      const cle = relative(ROOT, cible).replaceAll('\\', '/');
      if (!vus.has(cle)) { vus.add(cle); file.push(cible); }
    }
  }
  return [...vus].sort();
}

/** La liste des modules communs, lue dans le test du chapeau qui la garde (une seule source). */
function modulesCommuns() {
  const source = readFileSync(join(ROOT, 'tests/unit/chapeau/modules-communs.test.mjs'), 'utf8');
  const bloc = source.match(/MODULES_COMMUNS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(bloc, 'liste des modules communs introuvable dans modules-communs.test.mjs');
  return [...bloc[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
}

test('la projection d’Imperium n’importe que les cinq modules autorisés', () => {
  const source = readFileSync(join(ROOT, 'imperium/projection-carte.js'), 'utf8');
  const imports = [...source.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  assert.deepEqual([...imports].sort(), [
    '../js/core/map-link-protocol.js', '../js/core/participant-camp.js', '../js/core/token-library-path.js',
    './profils.js', './rencontre.js'
  ].sort());
});

test('la projection elle-même ne charge que imperium/ et les modules communs du chapeau', () => {
  const communs = modulesCommuns();
  assert.ok(communs.includes('js/core/map-link-protocol.js') && communs.includes('js/core/token-library-path.js') && communs.includes('js/core/participant-camp.js'));
  const fermee = fermeture('imperium/projection-carte.js');
  const dehors = fermee.filter(chemin => !chemin.startsWith('imperium/') && !communs.includes(chemin));
  assert.deepEqual(dehors, [], `hors de imperium/ et du chapeau : ${dehors.join(', ')}`);
  assert.deepEqual(fermee, ['imperium/profils.js', 'imperium/regles.js', 'imperium/rencontre.js',
    'imperium/tables-critiques.js', 'js/core/map-link-protocol.js', 'js/core/participant-camp.js', 'js/core/token-library-path.js',
    'js/data/donnees-communes.js'].sort());
});

test('la fermeture d’imports de imperium/app.js reste dans imperium/ et les modules communs du chapeau', () => {
  const communs = modulesCommuns();
  assert.ok(communs.includes('js/core/participant-camp.js') && communs.includes('js/ui/selecteur-jeu.js') && communs.includes('js/ui/theme.js'));
  const fermee = fermeture('imperium/app.js');
  const dehors = fermee.filter(chemin => !chemin.startsWith('imperium/') && !communs.includes(chemin));
  assert.deepEqual(dehors, [], `hors de imperium/ et du chapeau : ${dehors.join(', ')}`);
  assert.ok(fermee.includes('imperium/seance.js') && fermee.includes('imperium/profils.js') && fermee.includes('imperium/rencontre.js'),
    'app.js s’appuie sur le moteur imperium/ (seance.js, profils.js, rencontre.js)');
});

test('imperium/projection-carte.js et imperium/app.js sont précachés dans sw.js', () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const listés = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);
  assert.ok(listés.includes('imperium/projection-carte.js'), 'imperium/projection-carte.js dans ASSETS_TO_CACHE');
  assert.ok(listés.includes('imperium/app.js'), 'imperium/app.js dans ASSETS_TO_CACHE');
});
