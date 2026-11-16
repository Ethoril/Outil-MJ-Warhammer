#!/usr/bin/env node
// Génère js/data/montures-fiches.js : la liste des montures que les joueurs choisissent sur leur fiche (chantier monture
// depuis la fiche, décision 2 du MJ), tirée du bestiaire. Sources : l'index et les livres de js/data/bestiary/. Critère :
// isMountCandidate (js/core/mounts.js), sur les profils seulement, comme l'onglet Monture de la Réserve. Le module généré
// est recopié tel quel dans le dépôt des fiches par tools/recopier-donnees-communes.mjs : il n'importe rien.
//
//   node tools/build-fiche-mounts.mjs            écrit le module
//   node tools/build-fiche-mounts.mjs --check    n'écrit rien ; code 1 si le module manque ou a dérivé
//
// Option : --out <fichier> remplace l'emplacement par défaut.
// Refuse (code 1) un identifiant de profil porté par deux montures.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const OUT = 'js/data/montures-fiches.js';
const COMMAND = 'node tools/build-fiche-mounts.mjs';
const racineOutil = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const collator = new Intl.Collator('fr', { sensitivity: 'base' });
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Montures de la liste, triées par libellé (accents et casse ignorés), code de livre, identifiant. Lève une erreur sur un identifiant en double. */
export function buildMounts({ index, books, isMountCandidate }) {
  const titles = Object.fromEntries(index.books.map(entry => [entry.book, entry.title]));
  const mounts = [];
  for (const book of books) {
    for (const profile of book.profiles) {
      if (!((profile.kind === 'profile' || !profile.kind) && isMountCandidate(profile))) continue;
      const libelle = String(profile.nameFr ?? '').trim() || String(profile.name ?? '').trim();
      mounts.push({ cle: profile.id, libelle, livre: book.book, titreLivre: titles[book.book] ?? book.title, id: profile.id });
    }
  }
  const seen = new Set();
  const doubles = new Set(mounts.map(m => m.cle).filter(cle => (seen.has(cle) ? true : (seen.add(cle), false))));
  if (doubles.size) throw new Error(`identifiant porté par deux montures : ${[...doubles].join(', ')}`);
  return mounts.sort((a, b) => collator.compare(a.libelle, b.libelle) || byText(a.livre, b.livre) || byText(a.id, b.id));
}

/** Texte du module (LF, déterministe, sans import). */
export function renderModule(mounts) {
  const quote = text => `'${String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const line = m => `  Object.freeze({ cle: ${quote(m.cle)}, libelle: ${quote(m.libelle)}, livre: ${quote(m.livre)}, titreLivre: ${quote(m.titreLivre)}, id: ${quote(m.id)} })`;
  return [
    `// Fichier généré par ${COMMAND} depuis le bestiaire de l'outil MJ : ne pas modifier à la main, régénérer par ${COMMAND}.`,
    '// Recopié tel quel dans le dépôt des fiches (node tools/recopier-donnees-communes.mjs) : aucun import.',
    '// Montures proposées sur la fiche : animaux dressés comme monture. `cle` = identifiant du profil dans le bestiaire (clé écrite sur la fiche).',
    'export const MONTURES_FICHES = Object.freeze([',
    mounts.map(line).join(',\n'),
    ']);',
    '',
    '/** Entrée de la liste pour une clé, ou undefined si elle est inconnue. */',
    'export const montureFicheDe = cle => MONTURES_FICHES.find(monture => monture.cle === cle);',
    ''
  ].join('\n');
}

/** Module à partir des fichiers du dépôt. */
export async function generate(racine = racineOutil) {
  const { isMountCandidate } = await import(pathToFileURL(join(racine, 'js/core/mounts.js')).href);
  const dir = join(racine, 'js/data/bestiary');
  const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
  const books = index.books.map(entry => JSON.parse(readFileSync(join(dir, entry.file), 'utf8')));
  const mounts = buildMounts({ index, books, isMountCandidate });
  return { mounts, text: renderModule(mounts) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const at = argv.indexOf('--out');
  const outPath = at >= 0 ? resolve(argv[at + 1]) : join(racineOutil, OUT);
  try {
    const { text } = await generate();
    const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;
    if (current === text) console.log(`montures des fiches à jour (${outPath})`);
    else if (argv.includes('--check')) {
      console.error(`montures des fiches ${current === null ? 'absentes' : 'différentes du bestiaire'} (${outPath}) : lancer ${COMMAND}`);
      process.exitCode = 1;
    } else {
      writeFileSync(outPath, text);
      console.log(`montures des fiches écrites (${outPath})`);
    }
  } catch (error) {
    console.error(`montures des fiches : ${error.message}`);
    process.exitCode = 1;
  }
}
