// Garde-fou de la source unique js/data/donnees-communes.js (constats FICHES-05, COMP-LIAISONS-06 et -10, REGLES-07) :
// valeurs des espèces et de la liaison carte, consommateurs de l'outil branchés dessus, copies des deux autres dépôts
// identiques (vérifiées seulement si ces dépôts sont présents sur le poste ; jamais en CI).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ESPECES, especeDe, cleEspece, LIAISON_CARTE } from '../../../js/data/donnees-communes.js';
import { woundsMax, ficheSnapshot } from '../../../js/core/fiche-sync.js';
import { creatureSizeOf } from '../../../js/core/creature-size.js';
import { mutationDomainForSpecies } from '../../../js/core/v5-corruption.js';
import { MAP_LINK_CHANNEL, MAP_LINK_PING_MS, MAP_LINK_TIMEOUT_MS, MAP_LINK_ECHO_MS } from '../../../js/core/map-link.js';
import { MAP_LINK_VERSION } from '../../../js/core/map-link-state.js';
import { recopier, depotsCibles, COPIES, SOURCE } from '../../../tools/recopier-donnees-communes.mjs';

const racine = new URL('../../../', import.meta.url);

test('registre des espèces : valeurs de règles inchangées depuis les trois anciennes tables', () => {
  const table = Object.fromEntries(ESPECES.map(e => [e.id, [e.mouvement, e.taille, e.sansBonusForce, e.multiplicateurBlessures, e.mutationPhysiqueMax]]));
  assert.deepEqual(table, {
    humain: [4, 'average', false, 1, 50], nain: [3, 'average', false, 1, 5], halfelin: [3, 'small', false, 1, 10],
    gnome: [3, 'small', true, 1, null], 'haut-elfe': [5, 'average', false, 1, 0], 'elfe-sylvain': [5, 'average', false, 1, 0],
    'elfe-noir': [5, 'average', false, 1, null], 'elfe-des-mers': [5, 'average', false, 1, 0], elfe: [5, 'average', false, 1, 0],
    ogre: [6, 'large', false, 2, null], skink: [6, 'small', true, 1, null], 'skink-cameleon': [6, 'small', true, 1, null]
  });
  assert.ok(Object.isFrozen(ESPECES) && ESPECES.every(Object.isFrozen));
});

test('lecture d’une espèce : clé de fiche, libellé, alias, accents et casse ; inconnue ou vide → null', () => {
  assert.equal(especeDe('haut-elfe').id, 'haut-elfe');
  assert.equal(especeDe('Haut Elfe').id, 'haut-elfe');
  assert.equal(especeDe('Skink caméléon').id, 'skink-cameleon');
  assert.equal(especeDe('halfling').id, 'halfelin');
  assert.equal(especeDe('Wood_Elf').id, 'elfe-sylvain');
  assert.equal(especeDe('homme-lezard'), null);
  assert.equal(especeDe(''), null);
  assert.equal(especeDe(undefined), null);
  const cles = ESPECES.flatMap(e => [e.id, ...e.alias].map(cleEspece));
  assert.equal(new Set(cles).size, cles.length, 'aucune clé ni alias partagé entre deux espèces');
});

test('consommateurs de l’outil branchés sur le registre : Blessures, Mouvement, Taille, mutation', () => {
  const totals = { F: 31, E: 33, FM: 32 };
  assert.equal(woundsMax({ totals, race: 'humain' }), 12);
  assert.equal(woundsMax({ totals, race: 'skink-cameleon' }), 9);
  assert.equal(woundsMax({ totals, race: 'Ogre' }), 24);
  assert.equal(woundsMax({ totals: { E: 33, FM: 32 }, race: 'gnome' }), 9, 'sans BF, la Force manquante ne bloque pas');
  const carac = { f: { base: 30 }, e: { base: 30 }, fm: { base: 30 } };
  for (const e of ESPECES) assert.equal(ficheSnapshot('wren', { race: e.id, carac }).movement, e.mouvement, e.id);
  assert.equal(ficheSnapshot('wren', { race: 'homme-lezard', carac }).movement, null);
  assert.equal(creatureSizeOf({ race: 'skink-cameleon' }).key, 'small');
  assert.equal(creatureSizeOf({ race: 'ogre' }).key, 'large');
  assert.equal(creatureSizeOf({ race: 'humain' }).assumed, true, 'une espèce Moyenne reste « supposée »');
  assert.equal(mutationDomainForSpecies({ species: 'Halfelin', roll: 10 }).domain, 'physical');
  assert.equal(mutationDomainForSpecies({ species: 'halfelin', roll: 11 }).domain, 'mental');
  assert.equal(mutationDomainForSpecies({ species: 'elfe-noir', roll: 1 }).needsGmChoice, true);
});

test('liaison carte : constantes de l’outil lues dans la source commune', () => {
  assert.deepEqual(LIAISON_CARTE, { canal: 'wfrp-map-link', version: 1, battementMs: 5000, delaiDeconnexionMs: 15000, echoMs: 4000 });
  assert.deepEqual([MAP_LINK_CHANNEL, MAP_LINK_VERSION, MAP_LINK_PING_MS, MAP_LINK_TIMEOUT_MS, MAP_LINK_ECHO_MS],
    ['wfrp-map-link', 1, 5000, 15000, 4000]);
});

test('source en LF, précachée par le service worker', () => {
  assert.ok(!readFileSync(new URL(SOURCE, racine), 'utf8').includes('\r'));
  assert.match(readFileSync(new URL('sw.js', racine), 'utf8'), /'\.\/js\/data\/donnees-communes\.js'/);
});

test('script de recopie : écrit les copies manquantes, puis --check passe ; une copie modifiée fait échouer --check', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'donnees-communes-'));
  const depots = { carte: join(tmp, 'carte'), fiches: join(tmp, 'fiches') };
  for (const dossier of Object.values(depots)) mkdirSync(dossier);
  assert.equal(recopier({ depots, check: true }).ok, false, 'copies absentes');
  assert.equal(recopier({ depots }).ok, true);
  assert.equal(recopier({ depots, check: true }).ok, true);
  const copie = join(depots.fiches, COPIES.fiches);
  writeFileSync(copie, readFileSync(copie, 'utf8').replace('mouvement: 4', 'mouvement: 5'));
  const derive = recopier({ depots, check: true });
  assert.equal(derive.ok, false);
  assert.match(derive.lignes.join('\n'), /fiches : copie différente/);
  assert.equal(recopier({ depots: { carte: join(tmp, 'absent') }, check: true }).ok, false, 'dépôt introuvable');
});

test('copies réelles des deux autres dépôts identiques à la source (poste du MJ seulement)', t => {
  const depots = depotsCibles([]);
  // Une copie pas encore fusionnée dans son dépôt est sautée ici (le script --check, lui, la signale) ; une copie présente doit être identique.
  const presents = Object.fromEntries(Object.entries(depots).filter(([nom, dossier]) => existsSync(join(dossier, COPIES[nom]))));
  if (!Object.keys(presents).length) { t.skip('aucune copie présente sur ce poste (dépôts absents ou branche non fusionnée)'); return; }
  const { ok, lignes } = recopier({ depots: presents, check: true });
  assert.ok(ok, lignes.join('\n'));
});
