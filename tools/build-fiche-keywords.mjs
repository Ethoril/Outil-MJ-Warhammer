#!/usr/bin/env node
// Écrit dans le dépôt des fiches le référentiel des mots-clés (js/data/creature-keywords.js) et la liste des types de mots-clés
// (js/data/fiche-keyword-types.js), seules données que les fiches tiennent de l'outil sur ce sujet. Chaque copie commence par un
// en-tête généré de deux lignes : commit source de l'outil, puis fichier source et empreinte sha256 du corps. Les fiches peuvent
// ainsi vérifier la copie sans le dépôt de l'outil (tools/fiche-v5.test.mjs).
//
//   node tools/build-fiche-keywords.mjs            écrit les copies
//   node tools/build-fiche-keywords.mjs --check    n'écrit rien ; code 1 si une copie manque ou a dérivé
//
// Dépôt des fiches : --fiches <dossier>, sinon DONNEES_COMMUNES_FICHES, sinon l'emplacement habituel (comme recopier-donnees-communes).
// Le commit de l'en-tête change à chaque commit de l'outil : --check compare le corps et l'empreinte, pas le commit.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { depotsCibles } from './recopier-donnees-communes.mjs';

const COMMAND = 'node tools/build-fiche-keywords.mjs';
const racineOutil = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Chemins dans le dépôt des fiches : référentiel (sync-fiche-domain le propage ensuite aux fonctions) et types. */
export const FICHES_FICHIERS = Object.freeze({ referentiel: 'js/data/creature-keywords.js', types: 'js/data/mots-cles-types.js' });
const SOURCES = Object.freeze([
  Object.freeze({ source: 'js/data/creature-keywords.js', copie: FICHES_FICHIERS.referentiel }),
  Object.freeze({ source: 'js/data/fiche-keyword-types.js', copie: FICHES_FICHIERS.types })
]);
const enLF = texte => texte.replace(/\r\n?/g, '\n');
const empreinte = corps => createHash('sha256').update(corps).digest('hex');

/** Les deux lignes d'en-tête pour un corps donné (terminées par un saut de ligne). */
export function enTete(source, commit, corps) {
  return `// Fichier généré par ${COMMAND} depuis l'outil MJ (commit ${commit}) : ne pas modifier à la main.\n`
    + `// Source : ${source} · sha256 du corps : ${empreinte(corps)}\n`;
}

/** Commit courant de l'outil (7 caractères), ou « inconnu » hors dépôt Git. */
export function commitSource(racine = racineOutil) {
  try { return execFileSync('git', ['-C', racine, 'rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || 'inconnu'; } catch { return 'inconnu'; }
}

/** Copies attendues : { source, copie, text } (LF, déterministe). Lève une erreur si une source est en CRLF. */
export function generate({ racine = racineOutil, commit = commitSource(racine) } = {}) {
  return SOURCES.map(({ source, copie }) => {
    const brut = readFileSync(join(racine, source), 'utf8');
    const corps = enLF(brut);
    if (brut !== corps) throw new Error(`fins de ligne CRLF dans ${source}`);
    return { source, copie, text: `${enTete(source, commit, corps)}${corps}` };
  });
}

/** Le texte de la copie est-il celui attendu, au commit de l'en-tête près ? */
const memeContenu = (actuel, attendu) => {
  const corps = texte => texte.split('\n').slice(2).join('\n');
  return actuel !== null && corps(actuel) === corps(attendu) && actuel.split('\n').slice(0, 2).join('\n').replace(/\(commit [^)]*\)/, '(commit)') === attendu.split('\n').slice(0, 2).join('\n').replace(/\(commit [^)]*\)/, '(commit)');
};

/** Compare (et écrit sauf `check`) les copies dans le dépôt des fiches ; renvoie une ligne d'état par fichier et `ok`. */
export function synchroniser({ depot, check = false, racine = racineOutil, commit = commitSource(racine) } = {}) {
  const lignes = [];
  if (!existsSync(depot)) return { ok: false, lignes: [`fiches : dépôt introuvable (${depot})`] };
  let ok = true;
  for (const { source, copie, text } of generate({ racine, commit })) {
    const cible = join(depot, copie);
    const actuel = existsSync(cible) ? enLF(readFileSync(cible, 'utf8')) : null;
    if (memeContenu(actuel, text)) { lignes.push(`fiches : à jour (${cible})`); continue; }
    if (check) { lignes.push(`fiches : ${actuel === null ? 'copie absente' : 'copie différente de la source'} (${cible}) ← ${source}`); ok = false; continue; }
    mkdirSync(dirname(cible), { recursive: true });
    writeFileSync(cible, text);
    lignes.push(`fiches : copie écrite (${cible})`);
  }
  return { ok, lignes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  try {
    const { ok, lignes } = synchroniser({ depot: depotsCibles(argv).fiches, check: argv.includes('--check') });
    for (const ligne of lignes) console.log(ligne);
    if (!ok) { console.error(`Mots-clés des fiches : dérive ou copie manquante. Lancer ${COMMAND}, puis node tools/sync-fiche-domain.mjs dans le dépôt des fiches.`); process.exitCode = 1; }
  } catch (error) {
    console.error(`mots-clés des fiches : ${error.message}`);
    process.exitCode = 1;
  }
}
