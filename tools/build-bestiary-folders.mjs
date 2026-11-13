#!/usr/bin/env node
// Génère js/data/bestiary-folders.js : le classement de tout le bestiaire en dossiers de navigation (chantier images
// des pions, T13), calqué sur la bibliothèque d'images de Map Display. Sources : le bestiaire (js/data/bestiary/L*.json)
// et le classement relu par le MJ (tools/token-images-categories.csv), qui range chaque créature par sa clé.
//
//   node tools/build-bestiary-folders.mjs            écrit le module
//   node tools/build-bestiary-folders.mjs --check    n'écrit rien ; code 1 si le module manque ou a dérivé
//
// Option : --out <fichier> remplace l'emplacement par défaut.
// Les gabarits (Soldat, Tirailleur…) ne sont pas des créatures : ils vont dans « Gabarits », rangés par id, sans
// passer par la clé (certaines clés de gabarit sont aussi celles de profils). Refuse (code 1) une créature absente du
// classement et un dossier sans libellé.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, loadBestiary, parseCategories } from './list-missing-token-images.mjs';
import { creatureKey, isCreature } from './lib/creature-key.mjs';

export const OUT = 'js/data/bestiary-folders.js';
export const TEMPLATES_FOLDER = 'gabarits';
const COMMAND = 'node tools/build-bestiary-folders.mjs';
const racineOutil = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Dossiers de premier niveau, dans l'ordre d'affichage, et libellés des sous-dossiers connus. */
const TOP = [['bestiaire', 'Bestiaire'], ['monstres', 'Monstres'], ['ennemis', 'Ennemis'], ['peuples', 'Peuples'], ['pnj', 'PNJ nommés'],
  ['pj', 'PJ prétirés'], ['destriers', 'Destriers'], [TEMPLATES_FOLDER, 'Gabarits']];
const LABELS = new Map([...TOP,
  ['ennemis/demons', 'Démons'], ['ennemis/elfes-noirs', 'Elfes noirs'], ['ennemis/gobelins', 'Gobelins'], ['ennemis/hommes-betes', 'Hommes-bêtes'],
  ['ennemis/hommes-lezards', 'Hommes-lézards'], ['ennemis/morts-vivants', 'Morts-vivants'], ['ennemis/ogres', 'Ogres'], ['ennemis/orcs', 'Orcs'],
  ['ennemis/reprouves', 'Réprouvés'], ['ennemis/skavens', 'Skavens'], ['ennemis/vampires', 'Vampires'], ['ennemis/rois-des-tombes', 'Rois des Tombes'],
  ['ennemis/vampires-pirates', 'Vampires pirates'],
  ['peuples/humains', 'Humains'], ['peuples/nains', 'Nains'], ['peuples/elfes', 'Elfes'], ['peuples/halflings', 'Halflings'], ['peuples/gnomes', 'Gnomes'],
  ['peuples/ogres', 'Ogres']]);
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Libellé d'un dossier : table ci-dessus, ou livre pour `pnj/<code>` ; null si inconnu. */
function labelOf(id, titles) {
  if (LABELS.has(id)) return LABELS.get(id);
  const book = /^pnj\/(l\d\d)$/.exec(id)?.[1].toUpperCase();
  return book && titles[book] ? `${book} — ${titles[book]}` : null;
}

/**
 * Dossiers non vides, parents compris : [{ id, parent, label, profiles }], parents avant enfants, premier niveau dans
 * l'ordre de TOP, sous-dossiers par libellé (PNJ par code de livre) ; ids de profils dans l'ordre du bestiaire.
 */
export function buildFolders({ books, categories }) {
  const titles = Object.fromEntries(books.map(book => [book.book, book.title]));
  const profilesOf = new Map();
  const unclassified = [];
  for (const { profiles } of books) {
    for (const p of profiles) {
      let folder = TEMPLATES_FOLDER;
      if (isCreature(p)) {
        const category = categories.get(creatureKey(p));
        if (!category) { unclassified.push(`${creatureKey(p)} (${p.id})`); continue; }
        folder = category.folder;
      }
      if (!profilesOf.has(folder)) profilesOf.set(folder, []);
      profilesOf.get(folder).push(p.id);
    }
  }
  if (unclassified.length) throw new Error(`${unclassified.length} créature(s) absente(s) de ${CATEGORIES} : ${unclassified.join(', ')}`);
  const ids = new Set();
  for (const folder of profilesOf.keys()) folder.split('/').forEach((_, i, parts) => ids.add(parts.slice(0, i + 1).join('/')));
  const folders = [...ids].map(id => {
    const label = labelOf(id, titles);
    if (!label) throw new Error(`dossier sans libellé : ${id} (ajouter son libellé dans ${COMMAND.split(' ')[1]})`);
    return { id, parent: id.includes('/') ? id.slice(0, id.lastIndexOf('/')) : null, label, profiles: profilesOf.get(id) || [] };
  });
  const topRank = id => { const at = TOP.findIndex(([top]) => top === id.split('/')[0]); return at < 0 ? TOP.length : at; };
  const sortKey = folder => (folder.parent === 'pnj' ? folder.id : folder.label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
  const ordered = [];
  const visit = parent => folders.filter(f => f.parent === parent)
    .sort((a, b) => (parent === null ? topRank(a.id) - topRank(b.id) || byText(a.id, b.id) : byText(sortKey(a), sortKey(b))))
    .forEach(folder => { ordered.push(folder); visit(folder.id); });
  visit(null);
  return ordered;
}

const wrap = ids => {
  const lines = [];
  for (let i = 0; i < ids.length; i += 8) lines.push(`      ${ids.slice(i, i + 8).map(id => `'${id}'`).join(', ')}`);
  return lines.length ? `[\n${lines.join(',\n')}\n    ]` : '[]';
};

/** Texte du module (LF, déterministe). */
export function renderModule(folders) {
  const quote = text => `'${String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  return [
    `// Fichier généré par ${COMMAND} depuis le bestiaire et ${CATEGORIES} : ne pas modifier à la main.`,
    `// Régénérer après un ajout de profils ou un changement du classement (${COMMAND}).`,
    '// Dossiers de la Bibliothèque de bestiaire, parents avant enfants ; chaque profil (id) est dans un seul dossier.',
    'export const BESTIARY_FOLDERS = Object.freeze([',
    folders.map(f => `  Object.freeze({ id: ${quote(f.id)}, parent: ${f.parent === null ? 'null' : quote(f.parent)}, label: ${quote(f.label)},\n    profiles: Object.freeze(${wrap(f.profiles)}) })`).join(',\n'),
    ']);',
    ''
  ].join('\n');
}

/** Module à partir des fichiers du dépôt. */
export function generate(racine = racineOutil) {
  const folders = buildFolders({ books: loadBestiary(racine), categories: parseCategories(readFileSync(join(racine, CATEGORIES), 'utf8')) });
  return { folders, text: renderModule(folders) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const at = argv.indexOf('--out');
  const outPath = at >= 0 ? resolve(argv[at + 1]) : join(racineOutil, OUT);
  try {
    const { text } = generate();
    const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;
    if (current === text) console.log(`dossiers à jour (${outPath})`);
    else if (argv.includes('--check')) {
      console.error(`dossiers ${current === null ? 'absents' : 'différents du bestiaire ou du classement'} (${outPath}) : lancer ${COMMAND}`);
      process.exitCode = 1;
    } else {
      writeFileSync(outPath, text);
      console.log(`dossiers écrits (${outPath})`);
    }
  } catch (error) {
    console.error(`dossiers du bestiaire : ${error.message}`);
    process.exitCode = 1;
  }
}
