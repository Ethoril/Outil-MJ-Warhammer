// Table d'appariement des images de la bibliothèque de Map Display (chantier images des pions, T2 et T2b) :
// js/data/token-images.js, générée depuis tools/token-images.csv par tools/build-token-images.mjs.
// N'exige pas la présence du dépôt de la carte (la CI de l'outil ne l'a pas).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOKEN_IMAGES } from '../../../js/data/token-images.js';
import { REIKLAND_BEASTS } from '../../../js/data/v5-transformation-bestiary.js';
import { buildTable, parseCsv, isLibraryPath, slug } from '../../../tools/build-token-images.mjs';
import { generate, buildMissing, parseCategories, loadBestiary } from '../../../tools/list-missing-token-images.mjs';

const racine = fileURLToPath(new URL('../../../', import.meta.url));
const dossierBestiaire = join(racine, 'js/data/bestiary');
const profils = new Map();
for (const fichier of readdirSync(dossierBestiaire).filter(f => /^L\d+\.json$/.test(f))) {
  for (const p of JSON.parse(readFileSync(join(dossierBestiaire, fichier), 'utf8')).profiles) profils.set(p.id, p);
}
const lancer = (script, args = []) => spawnSync(process.execPath, [join(racine, script), ...args], { cwd: racine, encoding: 'utf8' });

test('chaque profil cité existe au bestiaire et n’est pas un gabarit', () => {
  const cites = TOKEN_IMAGES.flatMap(image => image.profiles);
  assert.ok(cites.length > 0);
  for (const id of cites) {
    assert.ok(profils.has(id), `profil inconnu : ${id}`);
    assert.notEqual(profils.get(id).kind, 'template', `gabarit cité : ${id}`);
  }
});

test('un profil n’a qu’une image automatique (CA22)', () => {
  const cites = TOKEN_IMAGES.flatMap(image => image.profiles);
  const doublons = cites.filter((id, i) => cites.indexOf(id) !== i);
  assert.deepEqual(doublons, []);
});

test('formes bestiales : des bêtes connues, chacune par paire des deux vents', () => {
  const formes = TOKEN_IMAGES.filter(image => image.form);
  assert.ok(formes.length > 0);
  for (const { form, path } of formes) {
    assert.ok(Object.hasOwn(REIKLAND_BEASTS, form.beast), `bête inconnue : ${form.beast}`);
    assert.ok(['beasts', 'jade'].includes(form.wind));
    assert.match(path, /^maps\/tokens\/bestiaire\/forme-bestiale\//);
    assert.equal(path.endsWith('-bete.webp') ? 'beasts' : 'jade', form.wind);
  }
  const cles = new Set(formes.map(({ form }) => form.beast));
  assert.equal(formes.length, cles.size * 2);
  for (const cle of cles) assert.deepEqual(formes.filter(({ form }) => form.beast === cle).map(({ form }) => form.wind).sort(), ['beasts', 'jade']);
});

test('chemins valides, uniques, triés ; groupe = premier dossier ; une entrée par ligne du CSV', () => {
  // La bibliothèque grossit pendant le chantier (CA38) : aucun nombre d'images figé, la table suit le CSV ligne pour ligne.
  const lignes = readFileSync(join(racine, 'tools/token-images.csv'), 'utf8').split(/\r?\n/).slice(1).filter(ligne => ligne.trim());
  assert.equal(TOKEN_IMAGES.length, lignes.length);
  const chemins = TOKEN_IMAGES.map(image => image.path);
  assert.deepEqual(chemins, [...chemins].sort());
  assert.equal(new Set(chemins).size, chemins.length);
  for (const image of TOKEN_IMAGES) {
    assert.ok(isLibraryPath(image.path), image.path);
    assert.ok(image.path.length <= 200 && !image.path.includes('..'));
    assert.match(image.path, /^maps\/tokens\/.+\.(webp|png|jpe?g|gif|avif)$/);
    const parties = image.path.split('/').slice(2);
    assert.equal(image.group, parties.length > 1 ? parties[0] : 'racine');
    assert.ok(image.label.trim());
    if (!image.path.includes('/forme-bestiale/')) assert.equal(image.form, null);
    assert.ok(Object.isFrozen(image) && Object.isFrozen(image.profiles));
  }
  assert.ok(Object.isFrozen(TOKEN_IMAGES));
});

test('chemin de bibliothèque : refuse ce qui sort de maps/tokens/ ou n’est pas une image', () => {
  for (const mauvais of ['maps/tokens/../secret.webp', 'tokens/loup.webp', 'maps/tokens/loup.txt', 'maps\\tokens\\loup.webp',
    '/maps/tokens/loup.webp', `maps/tokens/${'a'.repeat(200)}.webp`, '', null, 42]) assert.equal(isLibraryPath(mauvais), false, String(mauvais));
  assert.equal(isLibraryPath('maps/tokens/bestiaire/loup.webp'), true);
});

test('générateur : refuse chemin invalide, profil cité deux fois, profil inconnu, forme inconnue', () => {
  const connus = new Set(['A', 'B']);
  const construire = csv => buildTable(parseCsv(csv), { profileIds: connus });
  const entete = 'chemin;libellé;profils;noms;livre;confiance;note\n';
  assert.throws(() => construire(entete + 'maps/tokens/../x.webp;X;;;;;\n'), /chemin invalide/);
  assert.throws(() => construire(entete + 'maps/tokens/a.webp;A;A;;;;\nmaps/tokens/b.webp;B;B|A;;;;\n'), /cité deux fois/);
  assert.throws(() => construire(entete + 'maps/tokens/a.webp;A;Z;;;;\n'), /profil inconnu/);
  assert.throws(() => construire(entete + 'maps/tokens/bestiaire/forme-bestiale/licorne-bete.webp;L;;;;;\n'), /forme/);
  assert.throws(() => construire(entete + 'maps/tokens/bestiaire/forme-bestiale/loup.webp;L;;;;;\n'), /forme/);
  assert.throws(() => construire(entete + 'maps/tokens/a.webp;A;;;;;\nmaps/tokens/a.webp;A;;;;;\n'), /deux fois/);
  const table = construire('﻿' + entete + 'maps/tokens/b.webp;Bé;B;;;;\r\nmaps/tokens/bestiaire/forme-bestiale/rat-geant-vie.webp;Rat;;;;;\r\n');
  assert.deepEqual(table, [
    { path: 'maps/tokens/b.webp', label: 'Bé', group: 'racine', profiles: ['B'], form: null },
    { path: 'maps/tokens/bestiaire/forme-bestiale/rat-geant-vie.webp', label: 'Rat', group: 'bestiaire', profiles: [], form: { beast: 'giant-rat', wind: 'jade' } }
  ]);
});

test('table à jour du CSV (--check vert) ; --check rouge sans rien écrire sur un fichier dérivé (CA20)', () => {
  const vert = lancer('tools/build-token-images.mjs', ['--check']);
  assert.equal(vert.status, 0, vert.stdout + vert.stderr);
  const dossier = mkdtempSync(join(tmpdir(), 'token-images-'));
  const sortie = join(dossier, 'token-images.js');
  writeFileSync(sortie, '// dérivé\n');
  const rouge = lancer('tools/build-token-images.mjs', ['--check', '--out', sortie]);
  assert.equal(rouge.status, 1);
  assert.equal(readFileSync(sortie, 'utf8'), '// dérivé\n');
  const genere = readFileSync(join(racine, 'js/data/token-images.js'), 'utf8');
  assert.ok(!genere.includes('\r'));
  assert.match(genere.split('\n')[0], /fichier généré.*ne pas modifier à la main/i);
});

test('illustrations à créer : chaque profil sans image y figure une fois, aucun profil illustré (CA26)', () => {
  const { missing } = generate(racine);
  const listes = missing.entries.flatMap(e => e.profileIds);
  assert.equal(new Set(listes).size, listes.length, 'un profil listé deux fois');
  const illustres = new Set(TOKEN_IMAGES.flatMap(image => image.profiles));
  const attendus = [...profils.values()].filter(p => p.kind !== 'template' && !illustres.has(p.id)).map(p => p.id).sort();
  assert.deepEqual([...listes].sort(), attendus);
  for (const e of missing.entries) assert.match(e.file, /^[a-z0-9-]+(\/[a-z0-9-]+)*\/[a-z0-9-]+\.webp$/);
  assert.equal(missing.forms.length, 0, 'les 9 bêtes de Forme bestiale ont leurs deux images');
  assert.equal(missing.kadon.length, 0, 'les 9 monstres de Transformation de Kadon ont leur image');
});

test('classement : une ligne par créature du bestiaire, appariée ou non (CA33)', () => {
  const categories = parseCategories(readFileSync(join(racine, 'tools/token-images-categories.csv'), 'utf8'));
  const sansClasse = [...profils.values()].filter(p => p.kind !== 'template')
    .map(p => slug(p.nameFr)).filter(cle => !categories.has(cle));
  assert.deepEqual(sansClasse, []);
});

test('illustrations à créer : échoue sur une créature sans image non classée ; classement invalide refusé', () => {
  const livres = [{ book: 'L99', profiles: [{ id: 'X1', book: 'L99', page: 1, kind: 'profile', nameFr: 'Bête inconnue', name: 'Unknown' }] }];
  assert.throws(() => buildMissing({ books: livres, table: [], categories: new Map() }), /bete-inconnue/);
  const ok = buildMissing({ books: livres, table: [], categories: parseCategories('en-tête\nbete-inconnue;monstres;non;\n') });
  assert.deepEqual(ok.entries.map(e => [e.file, e.profileIds]), [['monstres/bete-inconnue.webp', ['X1']]]);
  assert.throws(() => parseCategories('en-tête\nx;Monstres;non;\n'), /dossier invalide/);
  assert.throws(() => parseCategories('en-tête\nx;monstres;peut-être;\n'), /oui ou non/);
  assert.throws(() => parseCategories('en-tête\nx;monstres;non;\nx;bestiaire;non;\n'), /deux fois/);
  assert.ok(loadBestiary(racine).length > 0);
});

test('illustrations à créer : --check vert, liste en LF', () => {
  const vert = lancer('tools/list-missing-token-images.mjs', ['--check']);
  assert.equal(vert.status, 0, vert.stdout + vert.stderr);
  assert.ok(!readFileSync(join(racine, 'docs/specs/images-pions/illustrations-a-creer.md'), 'utf8').includes('\r'));
});
