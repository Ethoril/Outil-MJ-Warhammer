#!/usr/bin/env node
// Recopie la source unique js/data/donnees-communes.js (espèces, constantes de liaison) dans RPG Map Display
// et dans le dépôt des fiches des PJ, octet pour octet, en fins de ligne LF.
//
//   node tools/recopier-donnees-communes.mjs            écrit les copies
//   node tools/recopier-donnees-communes.mjs --check    n'écrit rien ; code 1 si une copie manque ou a dérivé
//
// Dépôts cibles : --carte <dossier> et --fiches <dossier>, sinon variables DONNEES_COMMUNES_CARTE et
// DONNEES_COMMUNES_FICHES, sinon les emplacements habituels du poste du MJ (DEPOTS_PAR_DEFAUT).
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE = 'js/data/donnees-communes.js';
export const DEPOTS_PAR_DEFAUT = Object.freeze({
  carte: 'E:/rpg-map-display',
  fiches: 'E:/Projet Warhammer Ennemi Intérieur/ennemi-interieur-wfrp4'
});
/** Emplacement de la copie dans chaque dépôt cible. */
export const COPIES = Object.freeze({
  carte: 'js/core/donnees-communes.js',
  fiches: 'js/data/donnees-communes.js'
});

const racineOutil = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const enLF = texte => texte.replace(/\r\n?/g, '\n');

/** Dossiers des dépôts cibles : arguments, puis variables d'environnement, puis défauts. */
export function depotsCibles(argv = [], env = process.env) {
  const option = nom => { const i = argv.indexOf(`--${nom}`); return i >= 0 ? argv[i + 1] : undefined; };
  return {
    carte: option('carte') ?? env.DONNEES_COMMUNES_CARTE ?? DEPOTS_PAR_DEFAUT.carte,
    fiches: option('fiches') ?? env.DONNEES_COMMUNES_FICHES ?? DEPOTS_PAR_DEFAUT.fiches
  };
}

/** Compare (et écrit sauf `check`) chaque copie ; renvoie une ligne d'état par dépôt et `ok`. */
export function recopier({ depots, check = false, racine = racineOutil } = {}) {
  const brut = readFileSync(join(racine, SOURCE), 'utf8');
  const source = enLF(brut);
  const lignes = [];
  let ok = true;
  if (brut !== source) { lignes.push(`source : fins de ligne CRLF dans ${SOURCE}`); ok = false; }
  for (const [nom, dossier] of Object.entries(depots)) {
    const cible = join(dossier, COPIES[nom]);
    if (!existsSync(dossier)) { lignes.push(`${nom} : dépôt introuvable (${dossier})`); ok = false; continue; }
    const actuel = existsSync(cible) ? readFileSync(cible, 'utf8') : null;
    if (actuel === source) { lignes.push(`${nom} : à jour (${cible})`); continue; }
    if (check) { lignes.push(`${nom} : ${actuel === null ? 'copie absente' : 'copie différente de la source'} (${cible})`); ok = false; continue; }
    mkdirSync(dirname(cible), { recursive: true });
    writeFileSync(cible, source);
    lignes.push(`${nom} : copie écrite (${cible})`);
  }
  return { ok, lignes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const { ok, lignes } = recopier({ depots: depotsCibles(argv), check: argv.includes('--check') });
  for (const ligne of lignes) console.log(ligne);
  if (!ok) { console.error('Données communes : dérive ou copie manquante. Relancez sans --check depuis le dépôt de l’outil MJ.'); process.exitCode = 1; }
}
