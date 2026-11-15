#!/usr/bin/env node
// Écrit docs/specs/images-pions/illustrations-a-creer.md : les illustrations qui manquent à la bibliothèque de
// Map Display, classées par dossiers, d'après le bestiaire (js/data/bestiary/L*.json), la table des images
// (js/data/token-images.js) et le classement relu par le MJ (tools/token-images-categories.csv).
//
//   node tools/list-missing-token-images.mjs            écrit la liste
//   node tools/list-missing-token-images.mjs --check    n'écrit rien ; code 1 si la liste manque ou a dérivé
//
// Une créature = les profils (hors gabarits) de même nom français normalisé, tous livres confondus. Le script
// échoue si une créature sans image n'a pas de ligne dans le classement.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOKEN_IMAGES } from '../js/data/token-images.js';
import { REIKLAND_BEASTS, KADON_MONSTERS } from '../js/data/v5-transformation-bestiary.js';
import { slug } from './build-token-images.mjs';
import { creatureKey, isCreature } from './lib/creature-key.mjs';

export const CATEGORIES = 'tools/token-images-categories.csv';
export const OUT = 'docs/specs/images-pions/illustrations-a-creer.md';
export const KADON_DIR = 'monstres/transformation-kadon';
export const FORM_DIR = 'bestiaire/forme-bestiale';
const COMMAND = 'node tools/list-missing-token-images.mjs';
const racineOutil = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Livres du bestiaire : [{ book, title, profiles }] dans l'ordre des codes. */
export function loadBestiary(racine = racineOutil) {
  const dir = join(racine, 'js/data/bestiary');
  return readdirSync(dir).filter(f => /^L\d+\.json$/.test(f)).sort().map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}

/** Classement relu par le MJ : Map clé → { folder, named, note } ; lève une erreur sur une ligne invalide. */
export function parseCategories(text) {
  const map = new Map();
  String(text).replace(/^﻿/, '').split(/\r?\n/).slice(1).forEach((line, i) => {
    if (!line.trim()) return;
    const [key = '', folder = '', named = '', note = ''] = line.split(';').map(cell => cell.trim());
    const where = `${CATEGORIES}, ligne ${i + 2}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key)) throw new Error(`${where} : clé de créature invalide « ${key} »`);
    if (map.has(key)) throw new Error(`${where} : clé « ${key} » classée deux fois`);
    if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(folder)) throw new Error(`${where} : dossier invalide « ${folder} »`);
    if (named !== 'oui' && named !== 'non') throw new Error(`${where} : « nommé » doit valoir oui ou non, pas « ${named} »`);
    map.set(key, { folder, named: named === 'oui', note });
  });
  return map;
}

const refOf = p => `${p.book} p.${p.page}`;

/** Illustrations manquantes, regroupées ; lève une erreur si une créature sans image n'est pas classée. */
export function buildMissing({ books, table = TOKEN_IMAGES, categories, beasts = REIKLAND_BEASTS, kadon = KADON_MONSTERS }) {
  const imageOf = new Map(table.flatMap(image => image.profiles.map(id => [id, image.path])));
  const creatures = new Map();
  for (const { profiles } of books) {
    for (const p of profiles) {
      if (!isCreature(p)) continue;
      const key = creatureKey(p);
      if (!creatures.has(key)) creatures.set(key, []);
      creatures.get(key).push(p);
    }
  }
  const unclassified = [];
  const entries = [];
  for (const [key, profiles] of [...creatures].sort((a, b) => byText(a[0], b[0]))) {
    const missing = profiles.filter(p => !imageOf.has(p.id));
    if (!missing.length) continue;
    const category = categories.get(key);
    if (!category) { unclassified.push(key); continue; }
    const images = [...new Set(profiles.map(p => imageOf.get(p.id)).filter(Boolean))];
    const first = missing[0];
    entries.push({
      key, folder: category.folder, named: category.named, note: category.note,
      file: `${category.folder}/${key}.webp`, nameFr: first.nameFr || first.name, name: first.name,
      book: first.book, page: first.page, refs: [...new Set(missing.map(refOf))], profileIds: missing.map(p => p.id),
      partial: images.map(path => path.replace(/^maps\/tokens\//, ''))
    });
  }
  if (unclassified.length) {
    throw new Error(`${unclassified.length} créature(s) sans image absente(s) de ${CATEGORIES} : ${unclassified.join(', ')}`);
  }
  const formPaths = new Set(table.filter(image => image.form?.beast).map(image => `${image.form.beast}:${image.form.wind}`));
  const forms = Object.entries(beasts).flatMap(([beast, { name, page }]) => [['beasts', 'bete', 'Vent des Bêtes'], ['jade', 'vie', 'Vent de Jade']]
    .filter(([wind]) => !formPaths.has(`${beast}:${wind}`))
    .map(([wind, suffix, windName]) => ({ beast, name, page, wind, windName, file: `${FORM_DIR}/${slug(name)}-${suffix}.webp` })));
  const paths = new Set(table.map(image => image.path));
  const kadonMissing = Object.entries(kadon).map(([monster, { name, page }]) => ({ monster, name, page, file: `${KADON_DIR}/${slug(name)}.webp` }))
    .filter(({ file }) => !paths.has(`maps/tokens/${file}`));
  return { entries, forms, kadon: kadonMissing };
}

const cell = value => String(value).replace(/\|/g, '\\|');
const row = cells => `| ${cells.map(cell).join(' | ')} |`;

/** Texte Markdown de la liste (LF, déterministe). */
export function renderMarkdown({ entries, forms, kadon }, { titles = {} } = {}) {
  const generic = entries.filter(e => !e.named);
  const named = entries.filter(e => e.named);
  const folders = [...new Set(generic.map(e => e.folder))].sort(byText);
  const count = list => list.reduce((n, e) => n + e.profileIds.length, 0);
  const noteOf = e => [e.note, e.partial.length ? `autres profils déjà illustrés : ${e.partial.join(', ')}` : ''].filter(Boolean).join(' ; ');
  const out = [
    '# Illustrations à créer',
    '',
    `Fichier généré, ne pas modifier à la main. Régénérer après l’ajout d’images ou un changement du classement : \`node tools/build-token-images.mjs\` puis \`${COMMAND}\`.`,
    '',
    `Sources : le bestiaire (\`js/data/bestiary/\`), la table des images (\`js/data/token-images.js\`, depuis \`tools/token-images.csv\`) et le classement relu par le MJ (\`${CATEGORIES}\`). Une créature présente dans plusieurs livres n’y figure qu’une fois. Le nom de fichier proposé, déposé dans \`rpg-map-display/maps/tokens/\`, est celui que l’appariement exact retrouvera (nom français sans accents). Les gabarits (Soldat, Tirailleur…) ne sont pas des créatures et n’y figurent pas.`,
    '',
    '## Récapitulatif',
    '',
    row(['Dossier', 'Illustrations', 'Profils couverts']),
    row(['---', '---:', '---:']),
    ...folders.map(folder => { const list = generic.filter(e => e.folder === folder); return row([`\`${folder}\``, list.length, count(list)]); }),
    row(['Individus nommés (`pnj/<livre>`, `pj`)', named.length, count(named)]),
    row([`\`${FORM_DIR}\``, forms.length, '—']),
    row([`\`${KADON_DIR}\``, kadon.length, '—']),
    row(['**Total**', `**${entries.length + forms.length + kadon.length}**`, `**${count(entries)}**`]),
    '',
    '## Créatures génériques',
    ''
  ];
  for (const folder of folders) {
    const list = generic.filter(e => e.folder === folder);
    out.push(`### \`${folder}\` (${list.length})`, '', row(['Fichier proposé', 'Nom français', 'Nom anglais', 'Livres et pages', 'Profils', 'Note']), row(['---', '---', '---', '---', '---:', '---']));
    for (const e of list) out.push(row([`\`${e.file}\``, e.nameFr, e.name, e.refs.join(', '), e.profileIds.length, noteOf(e)]));
    out.push('');
  }
  out.push('## Individus nommés', '', 'PNJ de scénario, monstres uniques et PJ prétirés, par livre de première apparition.', '');
  const books = [...new Set(named.map(e => e.book))].sort(byText);
  for (const book of books) {
    const list = named.filter(e => e.book === book).sort((a, b) => a.page - b.page || byText(a.key, b.key));
    out.push(`### ${book}${titles[book] ? ` — ${titles[book]}` : ''} (${list.length})`, '', row(['Fichier proposé', 'Nom français', 'Nom anglais', 'Pages', 'Profils', 'Note']), row(['---', '---', '---', '---', '---:', '---']));
    for (const e of list) out.push(row([`\`${e.file}\``, e.nameFr, e.name, e.refs.join(', '), e.profileIds.length, noteOf(e)]));
    out.push('');
  }
  out.push(`## \`${FORM_DIR}\``, '', 'Bêtes de la Forme bestiale (Livre de base pp. 325-327) sans image dans l’une des deux variantes : `-bete` pour le Vent des Bêtes, `-vie` pour le Vent de Jade.', '');
  if (forms.length) {
    out.push(row(['Fichier proposé', 'Bête', 'Clé', 'Vent', 'Page']), row(['---', '---', '---', '---', '---:']));
    for (const f of forms) out.push(row([`\`${f.file}\``, f.name, f.beast, f.windName, f.page]));
  } else out.push('Aucune : chaque bête a ses deux images.');
  out.push('', `## \`${KADON_DIR}\``, '', 'Monstres de la Transformation de Kadon (Livre de base pp. 328-335) sans image dédiée. Tant qu’une image manque, le pion ne change pas sous cette forme.', '');
  if (kadon.length) {
    out.push(row(['Fichier proposé', 'Monstre', 'Clé', 'Page']), row(['---', '---', '---', '---:']));
    for (const k of kadon) out.push(row([`\`${k.file}\``, k.name, k.monster, k.page]));
  } else out.push('Aucun : chaque monstre a son image.');
  out.push('');
  return out.join('\n');
}

/** Liste complète à partir des fichiers du dépôt. */
export function generate(racine = racineOutil) {
  const books = loadBestiary(racine);
  const categories = parseCategories(readFileSync(join(racine, CATEGORIES), 'utf8'));
  const missing = buildMissing({ books, categories });
  const titles = Object.fromEntries(books.map(b => [b.book, b.title]));
  return { missing, text: renderMarkdown(missing, { titles }) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outPath = join(racineOutil, OUT);
  try {
    const { text } = generate();
    const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;
    if (current === text) console.log(`liste à jour (${OUT})`);
    else if (process.argv.includes('--check')) {
      console.error(`liste ${current === null ? 'absente' : 'différente du bestiaire, de la table ou du classement'} (${OUT}) : lancer ${COMMAND}`);
      process.exitCode = 1;
    } else {
      writeFileSync(outPath, text);
      console.log(`liste écrite (${OUT})`);
    }
  } catch (error) {
    console.error(`illustrations à créer : ${error.message}`);
    process.exitCode = 1;
  }
}
