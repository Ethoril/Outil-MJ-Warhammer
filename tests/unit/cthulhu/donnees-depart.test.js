// Cthulhu 7e : données de départ tirées des livres. Rien n'est inventé : chaque profil cite son livre et ses pages
// imprimées, et les valeurs de contrôle ci-dessous ont été relevées à la main sur les pages citées.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { reserveDeDepart, ARMES_DEPART, CREATURES_DEPART, SANS_BLOC_DEPART } from '../../../cthulhu/donnees-depart.js';
import { normaliserProfil, validerProfil, validerArme, valeursDerivees, trouverProfil } from '../../../cthulhu/profils.js';

const LIVRES = { 'Manuel du Gardien': 'USB_V7-GARDIEN.pdf', 'Aventures effroyables': 'USB_V7-AV-EFFROYABLES.pdf' };

/**
 * Relevé du livre pour chaque profil : pages imprimées, caractéristiques, PV, Impact, Carrure, PM, Mouvement (au sol),
 * attaques par round (`null` quand le livre ne donne pas un entier), combat, Protection et perte de SAN.
 */
const LIVRE = {
  goule: { livre: 'Manuel du Gardien', pages: [293], carac: [80, 65, 65, 65, 65, 65], pv: 13, impact: '+1D4', carrure: 1, pm: 13, mvt: 9, att: 3,
    corps: 40, esquive: 40, armure: 0, san: '0/1D6' },
  ghast: { livre: 'Manuel du Gardien', pages: [292, 293], carac: [110, 70, 130, 65, 15, 50], pv: 20, impact: '+2D6', carrure: 3, pm: 10, mvt: 10, att: 2,
    corps: 45, esquive: 35, armure: 0, san: '0/1D8' },
  'grande-race-de-yith': { livre: 'Manuel du Gardien', pages: [294, 295], carac: [210, 130, 320, 50, 100, 65], pv: 45, impact: '+6D6', carrure: 7, pm: 13,
    mvt: 7, att: 2, corps: 40, esquive: 25, armure: 8, san: '0/1D6' },
  'mi-go': { livre: 'Manuel du Gardien', pages: [302, 303], carac: [50, 50, 50, 70, 65, 65], pv: 10, impact: '0', carrure: 0, pm: 13, mvt: 7, att: 2,
    corps: 45, esquive: 35, armure: 0, san: '0/1D6' },
  'maigre-bete-de-la-nuit': { livre: 'Manuel du Gardien', pages: [302], carac: [50, 50, 70, 65, 20, 50], pv: 12, impact: '0', carrure: 0, pm: 10, mvt: 6,
    att: 1, corps: 45, esquive: 35, armure: 2, san: '0/1D6' },
  'peuple-serpent': { livre: 'Manuel du Gardien', pages: [303, 304], carac: [50, 50, 50, 65, 80, 65], pv: 10, impact: '0', carrure: 0, pm: 13, mvt: 8,
    att: 1, corps: 50, esquive: 32, armure: 1, san: '0/1D6' },
  'polype-volant': { livre: 'Manuel du Gardien', pages: [304, 305], carac: [250, 125, 250, 65, 70, 80], pv: 37, impact: '+5D6', carrure: 6, pm: 16, mvt: 8,
    att: null, corps: 85, esquive: 30, armure: 4, san: '1D3/1D20' },
  profond: { livre: 'Manuel du Gardien', pages: [306], carac: [70, 50, 80, 50, 65, 50], pv: 13, impact: '+1D4', carrure: 1, pm: 10, mvt: 8, att: 1,
    corps: 45, esquive: 25, armure: 1, san: '0/1D6' },
  'loup-garou': { livre: 'Manuel du Gardien', pages: [338], carac: [105, 65, 55, 65, 20, 65], pv: 12, impact: '+1D4', carrure: 1, pm: 13, mvt: 12, att: 2,
    corps: 50, esquive: 32, armure: 1, san: '0/1D8' },
  momie: { livre: 'Manuel du Gardien', pages: [339], carac: [105, 80, 65, 35, 55, 75], pv: 14, impact: '+1D6', carrure: 2, pm: 15, mvt: 6, att: 2,
    corps: 70, esquive: 17, armure: 2, san: '1/1D8' },
  // PNJ humain : « Disciples de Jacob Smith », Aventures effroyables p. 129. Le bloc ne donne ni attaques par round ni perte de SAN.
  'disciple-jacob-smith': { livre: 'Aventures effroyables', pages: [129], carac: [50, 60, 60, 60, 70, 60], pv: 12, impact: '0', carrure: 0, pm: 12, mvt: 8,
    att: null, corps: 40, esquive: 30, armure: 0, san: null }
};
const ORDRE = ['FOR', 'CON', 'TAI', 'DEX', 'INT', 'POU'];

test('aucun cultiste inventé : le seul adversaire humain est un PNJ au profil complet d’un scénario, avec sa source', () => {
  const humains = CREATURES_DEPART.filter(p => p.kind === 'PNJ');
  assert.deepEqual(humains.map(p => p.id), ['disciple-jacob-smith']);
  assert.ok(!CREATURES_DEPART.some(p => /cultiste|fanatique/i.test(`${p.id} ${p.nom}`)), 'le cultiste de C2 est retiré');
  const d = humains[0];
  assert.deepEqual(d.source, { livre: 'Aventures effroyables', pages: [129] });
  assert.deepEqual(d.carac, { FOR: 50, CON: 60, TAI: 60, DEX: 60, APP: 50, INT: 70, POU: 60, EDU: 80 }, 'les huit caractéristiques du bloc imprimé');
  for (const [nom, valeur] of Object.entries({ 'Corps à corps': 40, 'Armes de poing': 40, Esquive: 30, Discrétion: 60, Écouter: 60, Occultisme: 60,
    'Mythe de Cthulhu': 20, Baratin: 30, Conduite: 30, Lancer: 25, Mécanique: 30, Persuasion: 40, Psychologie: 40, Sauter: 40, 'Trouver Objet Caché': 40,
    Grimper: 50, Intimidation: 40 })) assert.equal(d.competences[nom], valeur, nom);
  assert.equal(d.armeMelee, 'couteau-grand', 'la machette du livre (1D8) est le grand couteau du tableau des armes');
  assert.equal(d.armeTir, 'revolver-32', 'le revolver .32 du livre (1D8)');
  assert.ok(!('armeFeuPrete' in d), 'le livre ne dit pas que l’arme est en main : champ absent, lu comme faux');
  assert.ok(!('attaquesParRound' in d), 'le livre ne donne pas d’attaques par round pour ce PNJ : champ absent');
  assert.ok(!('coutSan' in d), 'le livre ne donne pas de perte de SAN pour ce PNJ : champ absent');
});

test('aucune valeur de travail : pas de mention de valeur choisie dans les profils, dans les notes ni dans le module', () => {
  for (const p of CREATURES_DEPART) assert.doesNotMatch(String(p.notes ?? ''), /valeur de travail|choisie|bâti|inventé/i, p.id);
  const code = readFileSync(new URL('../../../cthulhu/donnees-depart.js', import.meta.url), 'utf8');
  assert.doesNotMatch(code, /valeurs? de travail|choisies?\b.*retrouver|aucun bloc de cultiste/i);
});

test('chaque créature et chaque PNJ cite son livre et ses pages imprimées, et la fiche contrôlée par page est celle du livre', () => {
  assert.deepEqual(CREATURES_DEPART.map(p => p.id).sort(), Object.keys(LIVRE).sort());
  for (const p of CREATURES_DEPART) {
    assert.ok(LIVRES[p.source?.livre], `${p.id} : livre connu`);
    assert.ok(Array.isArray(p.source.pages) && p.source.pages.length > 0 && p.source.pages.every(n => Number.isInteger(n) && n > 0), `${p.id} : pages`);
    assert.deepEqual(p.source, { livre: LIVRE[p.id].livre, pages: LIVRE[p.id].pages }, `${p.id} : source`);
  }
});

test('chaque profil de départ passe la validation de profils.js et entre dans la réserve avec ses armes', () => {
  const r = reserveDeDepart();
  assert.equal(r.profils.length, CREATURES_DEPART.length);
  for (const p of CREATURES_DEPART) {
    assert.deepEqual(validerProfil(normaliserProfil(p)), [], p.id);
    const dansReserve = trouverProfil(r, p.id);
    assert.ok(dansReserve, `${p.id} est dans la réserve`);
    for (const a of [dansReserve.armeMelee, dansReserve.armeTir]) if (a) assert.ok(r.armes[a], `${p.id} : arme « ${a} » dans la réserve`);
  }
  for (const a of Object.values(ARMES_DEPART)) assert.deepEqual(validerArme(a), [], a.id);
  assert.deepEqual(Object.keys(ARMES_DEPART).sort(), Object.keys(r.armes).sort());
  assert.ok(!r.profils.some(p => p.kind === 'PJ'), 'aucun investigateur');
});

test('valeurs de contrôle relevées dans les livres : caractéristiques, PV, Impact, Carrure, PM, Mouvement, attaques, combat, Protection, SAN', () => {
  const r = reserveDeDepart();
  for (const [id, v] of Object.entries(LIVRE)) {
    const p = trouverProfil(r, id);
    assert.deepEqual(ORDRE.map(c => p.carac[c]), v.carac, `${id} : FOR CON TAI DEX INT POU`);
    const d = valeursDerivees(p);
    assert.equal(d.pvMax, v.pv, `${id} : PV`);
    assert.equal(d.impact, v.impact, `${id} : Impact`);
    assert.equal(d.carrure, v.carrure, `${id} : Carrure`);
    assert.equal(d.pm, v.pm, `${id} : PM`);
    assert.equal(d.mvt, v.mvt, `${id} : Mouvement`);
    const brut = CREATURES_DEPART.find(c => c.id === id);
    if (v.att === null) assert.ok(!('attaquesParRound' in brut), `${id} : attaques par round absentes (le livre ne donne pas un entier)`);
    else assert.equal(brut.attaquesParRound, v.att, `${id} : attaques par round`);
    assert.equal(p.attaquesParRound, v.att ?? 1, `${id} : attaques par round lues (absence = 1)`);
    assert.equal(p.competences['Corps à corps'], v.corps, `${id} : Combat rapproché`);
    assert.equal(p.competences.Esquive, v.esquive, `${id} : Esquive`);
    assert.equal(p.armure, v.armure, `${id} : Protection`);
    assert.equal(p.coutSan, v.san, `${id} : perte de SAN`);
  }
});

test('attaques et dégâts des créatures, tels que le livre les donne', () => {
  const r = reserveDeDepart();
  const arme = id => r.armes[trouverProfil(r, id).armeMelee];
  assert.deepEqual([arme('ghast').des, arme('ghast').aImpact], ['1D6', true]);
  assert.deepEqual([arme('grande-race-de-yith').des, arme('grande-race-de-yith').aImpact], ['1D6', true]);
  assert.deepEqual([arme('mi-go').des, arme('mi-go').aImpact], ['1D6', true]);
  assert.deepEqual([arme('maigre-bete-de-la-nuit').des, arme('maigre-bete-de-la-nuit').aImpact], ['1D4', true]);
  assert.deepEqual([arme('peuple-serpent').des, arme('peuple-serpent').aImpact], ['1D3', true]);
  assert.deepEqual([arme('polype-volant').des, arme('polype-volant').aImpact], ['1D10', false], 'tentacules : 1D10, sans Impact');
  assert.deepEqual([arme('profond').des, arme('profond').aImpact], ['1D6', true]);
  assert.deepEqual([arme('loup-garou').des, arme('loup-garou').aImpact], ['1D8', true]);
  assert.deepEqual([arme('momie').des, arme('momie').aImpact], ['1D6', true]);
  assert.deepEqual([r.armes.harpon.des, r.armes.harpon.aImpact], ['1D8', true], 'harpon de Profond, exemple du livre');
  // Arme à foudre de la Grande Race : 1D10 par charge, portée 100 m, batterie de 32 charges ; Combat à distance 30 %.
  const yith = trouverProfil(r, 'grande-race-de-yith');
  assert.equal(yith.competences['Arme à foudre'], 30);
  const foudre = r.armes[yith.armeTir];
  assert.deepEqual([foudre.competence, foudre.des, foudre.portee, foudre.capacite, foudre.type], ['Arme à foudre', '1D10', 100, 32, 'feu']);
});

test('ce que le modèle ne sait pas jouer est écrit dans les notes du profil, pas codé', () => {
  const note = id => CREATURES_DEPART.find(p => p.id === id).notes;
  assert.match(note('goule'), /Mordre et serrer/);
  assert.match(note('ghast'), /Discrétion|lumière/i);
  assert.match(note('grande-race-de-yith'), /Voyage temporel/);
  assert.match(note('mi-go'), /perforantes/);
  assert.match(note('maigre-bete-de-la-nuit'), /Titiller/);
  assert.match(note('peuple-serpent'), /Morsure/);
  assert.match(note('polype-volant'), /2D6/, 'le livre donne 2D6 attaques par round : non entier, donc absent du profil');
  assert.match(note('polype-volant'), /Bourrasque/);
  assert.match(note('profond'), /harpon|trident/i);
  assert.match(note('loup-garou'), /argent/);
  assert.match(note('momie'), /perforantes/);
  assert.equal(CREATURES_DEPART.find(p => p.id === 'polype-volant').reductionFeu ?? null, null);
  assert.equal(CREATURES_DEPART.find(p => p.id === 'goule').reductionFeu, 'moitie', 'seule la goule a la moitié des dégâts d’armes à feu dans le livre');
});

test('le fantôme (Gardien p. 337) n’a pas de bloc dans le livre : il n’entre pas dans la réserve, il est signalé à part', () => {
  const f = SANS_BLOC_DEPART.find(p => p.id === 'fantome');
  assert.ok(f);
  assert.deepEqual(f.source, { livre: 'Manuel du Gardien', pages: [337] });
  assert.match(f.raison, /sur mesure|aucune caractéristique/i);
  assert.equal(f.coutSanMax, '1D8');
  assert.ok(!CREATURES_DEPART.some(p => p.id === 'fantome'));
  assert.equal(trouverProfil(reserveDeDepart(), 'fantome'), null);
  assert.ok(!('carac' in f), 'aucune caractéristique inventée');
});

test('armes de départ : valeurs du tableau des armes (Gardien p. 405-406), ligne par ligne', () => {
  const attendu = {
    poing: ['1D3', true, false], 'couteau-petit': ['1D4', true, true], 'couteau-cuisine': ['1D4+2', true, true], 'couteau-grand': ['1D8', true, true],
    'gourdin-petit': ['1D6', true, false], 'gourdin-grand': ['1D8', true, false]
  };
  for (const [id, [des, aImpact, empalante]] of Object.entries(attendu)) {
    assert.deepEqual([ARMES_DEPART[id].des, ARMES_DEPART[id].aImpact, ARMES_DEPART[id].empalante], [des, aImpact, empalante], id);
  }
  // Armes de poing : dégâts, portée de base, capacité (colonne « Cap. »).
  const feu = { 'revolver-32': ['1D8', 15, 6], 'revolver-38': ['1D10', 15, 8], 'automatique-45': ['1D10+2', 15, 7] };
  for (const [id, [des, portee, capacite]] of Object.entries(feu)) {
    const a = ARMES_DEPART[id];
    assert.deepEqual([a.des, a.portee, a.capacite, a.empalante, a.aImpact, a.type, a.competence], [des, portee, capacite, true, false, 'feu', 'Armes de poing'], id);
  }
});
