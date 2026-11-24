// Cthulhu sur la carte (multi-jeux, lot C4, CA25 à CA27) : la projection participant → pion de Cthulhu passe par le protocole
// commun (js/core/map-link-protocol.js) ; la page ne charge aucun module de Warhammer (fermeture d'imports de cthulhu/app.js).
// Décisions du MJ : Q5 = non (un Mourant part comme Inconscient, aucun marqueur nouveau), Q6 = défaut de la spec (MVT non envoyé :
// speedCells et runCells à null, la carte garde la portée saisie). Rien n'est inventé : pas de taille ni de vision propres à Cthulhu,
// la carte garde les siennes (null).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARQUEURS_CARTE, MAP_LINK_VERSION } from '../../../js/core/map-link-protocol.js';
import { creerReserve, ajouterArme, ajouterProfil } from '../../../cthulhu/profils.js';
import { composerRencontre } from '../../../cthulhu/rencontre.js';
import { ARMES_DEPART, CREATURES_DEPART } from '../../../cthulhu/donnees-depart.js';
import {
  refCarteDe, participantsPourLaCarte, etatPionDe, cthulhuMapProjection, creerLiaisonCarte
} from '../../../cthulhu/projection-carte.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

// --- Profils : ceux de la maquette pour les investigateurs (comme tests/unit/cthulhu/rencontre.test.js) et la goule du livre ---
const GOULE = CREATURES_DEPART.find(c => c.id === 'goule');
function reserve() {
  let r = creerReserve();
  for (const id of ['poing', 'couteau-grand', 'revolver-38', 'griffes-goule']) r = ajouterArme(r, ARMES_DEPART[id]);
  r = ajouterProfil(r, { id: 'hale', nom: 'Margaret Hale', kind: 'PJ', image: 'maps/tokens/joueurs/hale.webp', carac: { FOR: 55, CON: 60, TAI: 55, DEX: 80, APP: 60, INT: 70, POU: 65, EDU: 65 },
    chance: 70, competences: { 'Corps à corps': 45, Esquive: 50 }, armeMelee: 'couteau-grand', armeTir: 'revolver-38' });
  r = ajouterProfil(r, { id: 'lindqvist', nom: 'Pr Arthur Lindqvist', kind: 'PJ', carac: { FOR: 30, CON: 40, TAI: 60, DEX: 40, APP: 70, INT: 75, POU: 50, EDU: 80 },
    chance: 60, competences: { 'Corps à corps': 30, Esquive: 25 }, armeMelee: 'poing' });
  return ajouterProfil(r, GOULE);
}
const MARQUEURS_DE = state => [...state.markers];
const parEtat = (p, etat) => ({ ...p, etat });

// --- Projection ---------------------------------------------------------------------------------------------------------

test('CA25 — ref : pj:<id du profil> pour un investigateur, p:<id> pour un PNJ ou une créature (Goule 2 comprise)', () => {
  const r = composerRencontre(reserve(), ['hale', 'goule', 'goule']);
  assert.deepEqual(r.participants.map(refCarteDe), ['pj:hale', 'p:goule', 'p:goule-2']);
});

test('CA25 — pion d’un investigateur : nom, camp, image de bibliothèque, PV, pas de MVT, taille ni vision envoyés', () => {
  const r = composerRencontre(reserve(), ['hale']);
  const state = etatPionDe(r.participants[0]);
  assert.equal(state.ref, 'pj:hale');
  assert.equal(state.label, 'Margaret Hale');
  assert.equal(state.camp, 'pj');
  assert.equal(state.kind, 'pc');
  assert.equal(state.visionSource, true);
  assert.equal(state.imageUrl, 'maps/tokens/joueurs/hale.webp');
  assert.equal(state.formImageUrl, null);
  assert.equal(state.color, null);
  assert.deepEqual(state.hp, { current: r.participants[0].pvMax, max: r.participants[0].pvMax });
  assert.equal(state.health, 'unharmed');
  assert.deepEqual(MARQUEURS_DE(state), []);
  assert.deepEqual(state.markerLevels, {});
  assert.equal(state.mounted, false);
  assert.equal(state.rider, null);
  assert.equal(state.dead, false);
  assert.equal(state.deathCause, null);
  // Q6 : le MVT de Cthulhu ne part pas comme portée ; la carte garde la portée saisie à la main.
  assert.equal(state.speedCells, null);
  assert.equal(state.runCells, null);
  // Cthulhu ne modélise ni taille ni vision : la carte garde les siennes.
  assert.equal(state.sizeCells, null);
  assert.equal(state.visionDim, null);
  assert.equal('bondCells' in state, false);
});

test('CA25 — pion d’une créature : camp ennemi, kind npc, pas de source de vision, nom numéroté, image de la goule du bestiaire', () => {
  const r = composerRencontre(reserve(), ['goule', 'goule']);
  const [premiere, seconde] = r.participants.map(etatPionDe);
  assert.equal(premiere.camp, 'ennemi');
  assert.equal(premiere.kind, 'npc');
  assert.equal(premiere.visionSource, false);
  assert.equal(seconde.label, 'Goule 2');
  assert.equal(premiere.imageUrl, GOULE.image);
  assert.equal(premiere.speedCells, null);
});

test('CA25 — image absente ou hors de maps/tokens/ : imageUrl null, la carte garde la sienne', () => {
  const r = composerRencontre(reserve(), ['lindqvist', 'hale']);
  const [sans, hors] = [r.participants[0], { ...r.participants[1], image: 'https://exemple.fr/x.png' }];
  assert.equal(etatPionDe(sans).imageUrl, null, 'aucune image choisie');
  assert.equal(etatPionDe(hors).imageUrl, null, 'chemin refusé par token-library-path.js');
  assert.equal(etatPionDe({ ...sans, image: 'maps/tokens/../secret.png' }).imageUrl, null);
});

test('CA25 — PV, santé et mort : 0 PV reste vivant et critique, la mort envoie dead sans cause inventée', () => {
  const [hale] = composerRencontre(reserve(), ['hale']).participants;
  const max = hale.pvMax;
  assert.equal(etatPionDe({ ...hale, pv: max - 1 }).health, 'wounded');
  assert.equal(etatPionDe({ ...hale, pv: Math.floor(max / 4) }).health, 'critical');
  const zero = etatPionDe({ ...hale, pv: 0, etat: 'inconscient' });
  assert.deepEqual(zero.hp, { current: 0, max });
  assert.equal(zero.health, 'critical');
  assert.equal(zero.dead, false);
  assert.equal(etatPionDe({ ...hale, pv: -3 }).hp.current, 0, 'PV négatifs ramenés à 0');
  const mort = etatPionDe(parEtat({ ...hale, pv: 0 }, 'mort'));
  assert.equal(mort.dead, true);
  assert.equal(mort.deathCause, null);
  assert.deepEqual(MARQUEURS_DE(mort), [], 'un mort n’est pas inconscient : il porte dead, pas de marqueur');
});

test('CA27 (Q5 = non) — Inconscient et Mourant partent tous deux comme « unconscious » ; aucun marqueur hors des 16 de la carte', () => {
  const [hale] = composerRencontre(reserve(), ['hale']).participants;
  assert.deepEqual(MARQUEURS_DE(etatPionDe(parEtat(hale, 'actif'))), []);
  assert.deepEqual(MARQUEURS_DE(etatPionDe(parEtat(hale, 'inconscient'))), ['unconscious']);
  assert.deepEqual(MARQUEURS_DE(etatPionDe(parEtat(hale, 'mourant'))), ['unconscious']);
  for (const etat of ['actif', 'inconscient', 'mourant', 'mort']) {
    for (const marqueur of etatPionDe({ ...parEtat(hale, etat), blessureGrave: true, folie: 'phobie' }).markers) {
      assert.ok(MARQUEURS_CARTE.includes(marqueur), `${marqueur} est connu de la carte`);
    }
  }
  assert.deepEqual(MARQUEURS_DE(etatPionDe({ ...hale, blessureGrave: true, folie: 'phobie' })), [], 'blessure grave et folie ne partent pas');
});

test('CA25 — la projection rend { ref: état } pour tout le monde ; l’adaptateur d’image peut remplacer l’image', () => {
  const r = composerRencontre(reserve(), ['hale', 'goule']);
  const projection = cthulhuMapProjection();
  assert.deepEqual(Object.keys(projection.tokenStates(r.participants)), ['pj:hale', 'p:goule']);
  assert.equal(projection.refOf(r.participants[1]), 'p:goule');
  assert.equal('engagementPairs' in projection, false, 'pas d’engagements : mj.engagements part vide par défaut');
  const autre = cthulhuMapProjection({ imageUrlOf: () => 'maps/tokens/autre.png' });
  assert.equal(autre.tokenStates(r.participants)['p:goule'].imageUrl, 'maps/tokens/autre.png');
});

test('CA25 — participants de la carte : ceux de la rencontre, plus les investigateurs de la réserve qui n’y sont pas (liaison durable, contrat §3)', () => {
  const sans = participantsPourLaCarte({ reserve: reserve(), rencontre: null });
  assert.deepEqual(sans.map(refCarteDe), ['pj:hale', 'pj:lindqvist'], 'hors rencontre : investigateurs seuls, la goule n’est pas un PJ');
  const rencontre = composerRencontre(reserve(), ['hale', 'goule']);
  const avec = participantsPourLaCarte({ reserve: reserve(), rencontre });
  assert.deepEqual(avec.map(refCarteDe), ['pj:hale', 'p:goule', 'pj:lindqvist']);
  // Un investigateur hors rencontre porte ce qu’il a gardé : PV et état de son suivi.
  let r = reserve();
  r = { ...r, profils: r.profils.map(p => (p.id === 'lindqvist' ? { ...p, suivi: { pv: 3, blessureGrave: false, etat: 'mourant', san: 40, journeeSan: null, folie: null, chance: 50 } } : p)) };
  const [, lind] = participantsPourLaCarte({ reserve: r, rencontre: null });
  const pion = etatPionDe(lind);
  assert.deepEqual(pion.hp, { current: 3, max: lind.pvMax });
  assert.deepEqual(MARQUEURS_DE(pion), ['unconscious']);
});

// --- Par le protocole commun --------------------------------------------------------------------------------------------

function liaison(etatInitial) {
  const envoyes = [];
  let etat = etatInitial;
  const canal = { postMessage: message => envoyes.push(message), close() {} };
  const lien = creerLiaisonCarte({ channel: canal, getEtat: () => etat, now: () => 1000 });
  const carte = (type, payload = {}) => ({ v: MAP_LINK_VERSION, type, seq: 1, at: 0, from: 'map', payload });
  return {
    lien, envoyes, carte,
    de: type => envoyes.filter(m => m.type === type),
    poser(suivant) { etat = suivant; lien.refresh(); }
  };
}

test('CA25 — par le protocole : instantané, pions en réserve puis posés, blessure, inconscient, mort, retrait', () => {
  const r = composerRencontre(reserve(), ['hale', 'goule']);
  const t = liaison({ reserve: reserve(), rencontre: null });
  assert.equal(t.envoyes[0].type, 'mj.hello');
  assert.equal(t.envoyes[0].from, 'outil-mj');
  t.lien.onMessage(t.carte('map.hello'));
  assert.equal(t.lien.status(), 'connected');
  assert.deepEqual(t.de('mj.snapshot')[0].payload.tokens.map(token => token.ref), ['pj:hale', 'pj:lindqvist']);
  assert.deepEqual(t.de('mj.roster').at(-1).payload, { characters: [{ ref: 'pj:hale', label: 'Margaret Hale' }, { ref: 'pj:lindqvist', label: 'Pr Arthur Lindqvist' }] });
  assert.deepEqual(t.de('mj.engagements').at(-1).payload, { pairs: [] });

  // Rencontre composée : la goule arrive dans la réserve de la carte (token.add) ; les investigateurs, déjà liés, ne sont pas rajoutés.
  t.poser({ reserve: reserve(), rencontre: r });
  assert.deepEqual(t.de('token.add').map(m => m.payload.ref), ['p:goule']);
  assert.deepEqual(t.lien.placement().pending.map(p => p.ref), ['p:goule', 'pj:hale', 'pj:lindqvist'], 'à poser, triés par nom');
  t.lien.onMessage(t.carte('map.placed', { ref: 'pj:hale' }));
  t.lien.onMessage(t.carte('map.placed', { ref: 'p:goule' }));
  assert.deepEqual(t.lien.placement().placed, ['p:goule', 'pj:hale']);
  assert.deepEqual(t.lien.placement().pending.map(p => p.ref), ['pj:lindqvist'], 'reste à poser');
  const goule = r.participants[1];
  assert.equal(t.lien.isPlaced(goule), true);

  // Blessure : token.state puis fx.wound.
  const blessee = { ...r, participants: r.participants.map(p => (p.id === 'goule' ? { ...p, pv: p.pv - 5 } : p)) };
  t.poser({ reserve: reserve(), rencontre: blessee });
  assert.deepEqual(t.de('fx.wound').map(m => m.payload), [{ ref: 'p:goule', hpLost: 5, maxHp: goule.pvMax, target: 'self' }]);
  assert.equal(t.de('token.state').at(-1).payload.health, 'wounded');

  // Investigateur inconscient, puis mourant, puis mort.
  const hale = id => ({ ...blessee, participants: blessee.participants.map(p => (p.id === 'hale' ? { ...p, ...id } : p)) });
  const inconscient = hale({ pv: 0, etat: 'inconscient' });
  t.poser({ reserve: reserve(), rencontre: inconscient });
  const apres = t.de('token.state').at(-1).payload;
  assert.equal(apres.ref, 'pj:hale');
  assert.deepEqual(apres.markers, ['unconscious']);
  assert.equal(t.de('fx.wound').at(-1).payload.ref, 'pj:hale');
  t.poser({ reserve: reserve(), rencontre: hale({ pv: 0, etat: 'mourant' }) });
  assert.equal(t.de('token.state').length, 2, 'mourant = même pion qu’inconscient : rien de nouveau à envoyer');
  t.poser({ reserve: reserve(), rencontre: hale({ pv: 0, etat: 'mort' }) });
  const mort = t.de('token.state').at(-1).payload;
  assert.equal(mort.dead, true);
  assert.deepEqual(mort.markers, []);
  assert.deepEqual(t.de('fx.death').map(m => m.payload), [{ ref: 'pj:hale', cause: 'blood' }]);

  // Fin de la rencontre : la goule est retirée de la carte, les investigateurs restent liés.
  t.poser({ reserve: reserve(), rencontre: null });
  assert.deepEqual(t.de('token.remove').map(m => m.payload), [{ ref: 'p:goule' }]);
});

test('CA9, CA27 — rien d’envoyé hors du contrat : enveloppes, marqueurs et portées (null) sur tous les messages', () => {
  const r = composerRencontre(reserve(), ['hale', 'goule']);
  const t = liaison({ reserve: reserve(), rencontre: r });
  t.lien.onMessage(t.carte('map.hello'));
  t.poser({ reserve: reserve(), rencontre: { ...r, participants: r.participants.map(p => ({ ...p, pv: 1, etat: 'mourant', folie: 'amnésie' })) } });
  const pions = [...t.de('mj.snapshot').flatMap(m => m.payload.tokens), ...t.de('token.add').map(m => m.payload), ...t.de('token.state').map(m => m.payload)];
  assert.ok(pions.length >= 4);
  for (const pion of pions) {
    for (const marqueur of pion.markers) assert.ok(MARQUEURS_CARTE.includes(marqueur), marqueur);
    assert.equal(pion.speedCells, null);
    assert.equal(pion.runCells, null);
  }
  for (const message of t.envoyes) {
    assert.equal(message.v, MAP_LINK_VERSION);
    assert.equal(message.from, 'outil-mj');
  }
});

test('CA25 — une carte dont la version diffère est signalée, rien n’est envoyé de plus', () => {
  const t = liaison({ reserve: reserve(), rencontre: null });
  const avant = t.envoyes.length;
  t.lien.onMessage({ v: 99, type: 'map.hello', seq: 1, at: 0, from: 'map', payload: {} });
  assert.equal(t.lien.status(), 'version-mismatch');
  assert.equal(t.envoyes.length, avant);
});

// --- CA26 : la page de Cthulhu ne charge aucun module de Warhammer ---------------------------------------------------------

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

test('CA26 — cthulhu/app.js n’importe, dynamiques comprises, que cthulhu/ et les modules communs du chapeau', () => {
  const communs = modulesCommuns();
  assert.ok(communs.includes('js/core/map-link-protocol.js') && communs.includes('js/core/token-library-path.js'));
  const fermee = fermeture('cthulhu/app.js');
  const dehors = fermee.filter(chemin => !chemin.startsWith('cthulhu/') && !communs.includes(chemin));
  assert.deepEqual(dehors, [], `hors de cthulhu/ et du chapeau : ${dehors.join(', ')}`);
  assert.deepEqual(fermee.filter(chemin => /map-link-(state|feedback)\.js$|\/map-link\.js$|\/store\.js$/.test(chemin)), [], 'aucun module de liaison ni de Warhammer');
  for (const attendu of ['cthulhu/projection-carte.js', 'js/core/map-link-protocol.js', 'js/core/token-library-path.js', 'js/ui/map-link-indicator.js']) {
    assert.ok(fermee.includes(attendu), `${attendu} est branché sur la page`);
  }
});

test('CA26 — la projection elle-même ne charge que le protocole commun, le chemin d’image et le camp', () => {
  const communs = modulesCommuns();
  const fermee = fermeture('cthulhu/projection-carte.js');
  assert.deepEqual(fermee.filter(chemin => !chemin.startsWith('cthulhu/') && !communs.includes(chemin)), []);
});

test('Précache — la projection de Cthulhu est dans le service worker', () => {
  assert.match(readFileSync(join(ROOT, 'sw.js'), 'utf8'), /'\.\/cthulhu\/projection-carte\.js'/);
});
