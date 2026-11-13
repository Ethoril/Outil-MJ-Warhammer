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
import { buildTable, parseCsv, isLibraryPath } from '../../../tools/build-token-images.mjs';

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

test('18 formes bestiales sur les 9 bêtes connues, chacune dans les deux vents', () => {
  const formes = TOKEN_IMAGES.filter(image => image.form);
  assert.equal(formes.length, 18);
  for (const { form, path } of formes) {
    assert.ok(Object.hasOwn(REIKLAND_BEASTS, form.beast), `bête inconnue : ${form.beast}`);
    assert.ok(['beasts', 'jade'].includes(form.wind));
    assert.match(path, /^maps\/tokens\/bestiaire\/forme-bestiale\//);
    assert.equal(path.endsWith('-bete.webp') ? 'beasts' : 'jade', form.wind);
  }
  const cles = new Set(formes.map(({ form }) => form.beast));
  assert.equal(cles.size, 9);
  assert.deepEqual([...cles].sort(), Object.keys(REIKLAND_BEASTS).sort());
  for (const cle of cles) assert.deepEqual(formes.filter(({ form }) => form.beast === cle).map(({ form }) => form.wind).sort(), ['beasts', 'jade']);
});

test('chemins valides, uniques, triés ; groupe = premier dossier ; table figée', () => {
  assert.equal(TOKEN_IMAGES.length, 120);
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
