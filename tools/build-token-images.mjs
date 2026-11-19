#!/usr/bin/env node
// Génère js/data/token-images.js (table des images de la bibliothèque de Map Display, maps/tokens/) depuis
// tools/token-images.csv, relu par le MJ. Seules les trois premières colonnes du CSV sont lues (chemin, libellé,
// profils séparés par |) ; les suivantes servent à la relecture.
//
//   node tools/build-token-images.mjs            écrit la table
//   node tools/build-token-images.mjs --check    n'écrit rien ; code 1 si la table manque ou a dérivé du CSV
//
// Options : --csv <fichier> et --out <fichier> remplacent les emplacements par défaut.
// Refuse (code 1) un chemin invalide, un chemin ou un profil cité deux fois, un profil inconnu du bestiaire,
// une image de forme bestiale dont la bête n'existe pas dans REIKLAND_BEASTS, une image de Kadon dont le monstre n'existe pas
// dans KADON_MONSTERS.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REIKLAND_BEASTS, KADON_MONSTERS } from '../js/data/v5-transformation-bestiary.js';
import { normalizeLibraryImage } from '../js/core/token-library-path.js';

export const CSV = 'tools/token-images.csv';
export const OUT = 'js/data/token-images.js';
export const ROOT_GROUP = 'racine';
const FORM_DIR = 'maps/tokens/bestiaire/forme-bestiale/';
const KADON_DIR = 'maps/tokens/monstres/transformation-kadon/';
const WINDS = Object.freeze({ bete: 'beasts', vie: 'jade' });
const racineOutil = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Nom normalisé : minuscules, sans accents ni ligatures, mots séparés par des tirets (« Rat géant » → rat-geant). */
export function slug(text) {
  return String(text).toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Chemin de la bibliothèque valide : la règle de l'outil (js/core/token-library-path.js), la même à l'écriture et à l'envoi. */
export const isLibraryPath = value => normalizeLibraryImage(value) !== undefined;

/** Lignes du CSV (séparateur `;`, en-tête ignoré) → [{ path, label, profiles }]. */
export function parseCsv(text) {
  const lines = String(text).replace(/^﻿/, '').split(/\r?\n/);
  return lines.slice(1).map((line, i) => ({ line, number: i + 2 })).filter(({ line }) => line.trim()).map(({ line, number }) => {
    const [path = '', label = '', profiles = ''] = line.split(';');
    return { number, path: path.trim(), label: label.trim(), profiles: profiles.split('|').map(id => id.trim()).filter(Boolean) };
  });
}

/** Forme d'une image : bête de REIKLAND_BEASTS et vent (dossier forme-bestiale), monstre de KADON_MONSTERS (dossier transformation-kadon), sinon null. */
function formOf(path, beasts, monsters) {
  if (path.startsWith(KADON_DIR)) {
    const name = path.slice(KADON_DIR.length).replace(/\.[a-z]+$/, '');
    const monster = Object.keys(monsters).find(key => slug(monsters[key].name) === name);
    if (!monster) throw new Error(`forme de Kadon de monstre inconnu (« ${name} » absent de KADON_MONSTERS) : ${path}`);
    return { monster };
  }
  if (!path.startsWith(FORM_DIR)) return null;
  const match = /^([a-z0-9-]+)-(bete|vie)\.[a-z]+$/.exec(path.slice(FORM_DIR.length));
  if (!match) throw new Error(`forme bestiale sans suffixe -bete ou -vie : ${path}`);
  const beast = Object.keys(beasts).find(key => slug(beasts[key].name) === match[1]);
  if (!beast) throw new Error(`forme bestiale de bête inconnue (« ${match[1]} » absent de REIKLAND_BEASTS) : ${path}`);
  return { beast, wind: WINDS[match[2]] };
}

/** Lignes lues → entrées de la table, triées par chemin ; lève une erreur en français au premier défaut. */
export function buildTable(rows, { profileIds = null, beasts = REIKLAND_BEASTS, monsters = KADON_MONSTERS } = {}) {
  const paths = new Set();
  const cited = new Map();
  const entries = rows.map(({ number = '?', path, label, profiles }) => {
    if (!isLibraryPath(path)) throw new Error(`ligne ${number} : chemin invalide « ${path} »`);
    if (paths.has(path)) throw new Error(`ligne ${number} : chemin cité deux fois « ${path} »`);
    paths.add(path);
    if (!label) throw new Error(`ligne ${number} : libellé vide pour ${path}`);
    for (const id of profiles) {
      if (profileIds && !profileIds.has(id)) throw new Error(`ligne ${number} : profil inconnu du bestiaire « ${id} »`);
      if (cited.has(id)) throw new Error(`ligne ${number} : profil ${id} cité deux fois (déjà sur ${cited.get(id)})`);
      cited.set(id, path);
    }
    const parts = path.split('/').slice(2);
    return { path, label, group: parts.length > 1 ? parts[0] : ROOT_GROUP, profiles: [...profiles], form: formOf(path, beasts, monsters) };
  });
  return entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** Texte du module généré (LF, figé). */
export function renderModule(entries) {
  const q = JSON.stringify;
  const lines = entries.map(({ path, label, group, profiles, form }) => {
    const formText = !form ? 'null' : form.monster ? `Object.freeze({ monster: ${q(form.monster)} })` : `Object.freeze({ beast: ${q(form.beast)}, wind: ${q(form.wind)} })`;
    return `  { path: ${q(path)}, label: ${q(label)}, group: ${q(group)}, profiles: Object.freeze([${profiles.map(q).join(', ')}]), form: ${formText} }`;
  });
  return [
    '// Fichier généré par tools/build-token-images.mjs depuis tools/token-images.csv : ne pas modifier à la main.',
    '// Régénérer : node tools/build-token-images.mjs',
    '// Images de la bibliothèque de Map Display (maps/tokens/) et profils du bestiaire qui les reçoivent d’office.',
    '// group : premier dossier sous maps/tokens/ (« racine » pour un fichier à la racine) ; form : bête de Forme bestiale',
    '// (clé de REIKLAND_BEASTS) et vent (beasts = Vent des Bêtes, jade = Vent de Jade), ou monstre de Transformation de Kadon',
    '// (monster : clé de KADON_MONSTERS), sinon null.',
    '/** @typedef {{ path: string, label: string, group: string, profiles: ReadonlyArray<string>, form: { beast: string, wind: string }|{ monster: string }|null }} TokenImage */',
    '/** @type {ReadonlyArray<TokenImage>} */',
    'export const TOKEN_IMAGES = Object.freeze([',
    lines.join(',\n'),
    ']);',
    '',
    "// Gel profond à l'exécution. ⛔ Il se fait ICI, en boucle, et non par un `Object.freeze` autour de chaque",
    "// entrée : un millier d'appels littéraux donnaient autant de types `Readonly<…>` distincts, et le `tsc`",
    "// de la carte rendait « TS2590 : union type too complex to represent » — la table avait dépassé ce que",
    "// l'inférence sait représenter. Le gel obtenu est le même, et le type n'est écrit qu'une fois.",
    'for (const entree of TOKEN_IMAGES) Object.freeze(entree);',
    ''
  ].join('\n');
}

/** Ids de tous les profils du bestiaire (js/data/bestiary/L*.json). */
export function bestiaryProfileIds(racine = racineOutil) {
  const dir = join(racine, 'js/data/bestiary');
  return new Set(readdirSync(dir).filter(f => /^L\d+\.json$/.test(f))
    .flatMap(f => JSON.parse(readFileSync(join(dir, f), 'utf8')).profiles.map(p => p.id)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const option = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? resolve(argv[i + 1]) : join(racineOutil, fallback); };
  const csvPath = option('csv', CSV);
  const outPath = option('out', OUT);
  try {
    const text = renderModule(buildTable(parseCsv(readFileSync(csvPath, 'utf8')), { profileIds: bestiaryProfileIds() }));
    const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;
    if (current === text) console.log(`table à jour (${outPath})`);
    else if (argv.includes('--check')) {
      console.error(`table ${current === null ? 'absente' : 'différente du CSV'} (${outPath}) : lancer node tools/build-token-images.mjs`);
      process.exitCode = 1;
    } else {
      writeFileSync(outPath, text);
      console.log(`table écrite (${outPath})`);
    }
  } catch (error) {
    console.error(`token-images : ${error.message}`);
    process.exitCode = 1;
  }
}
