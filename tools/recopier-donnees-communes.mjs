#!/usr/bin/env node
// Recopie les sources uniques de l'outil MJ dans RPG Map Display et dans le dépôt des fiches des PJ, octet pour octet,
// en fins de ligne LF :
//   - js/data/donnees-communes.js (espèces, constantes de liaison) → carte et fiches ;
//   - js/data/token-images.js (table des images de la bibliothèque de la carte) → carte seulement ;
//   - docs/CONTRAT_LIAISON_MAP_DISPLAY.md (contrat de liaison) → carte seulement, copie « docs/CONTRAT-LIAISON-OUTIL-MJ.md » ;
//   - js/data/montures-fiches.js (montures proposées sur la fiche, généré par tools/build-fiche-mounts.mjs) → fiches seulement.
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
export const SOURCE_TOKEN_IMAGES = 'js/data/token-images.js';
export const SOURCE_CONTRAT = 'docs/CONTRAT_LIAISON_MAP_DISPLAY.md';
export const SOURCE_MONTURES = 'js/data/montures-fiches.js';
export const DEPOTS_PAR_DEFAUT = Object.freeze({
  carte: 'E:/rpg-map-display',
  fiches: 'E:/Projet Warhammer Ennemi Intérieur/ennemi-interieur-wfrp4'
});
/** Emplacement de la copie des données communes dans chaque dépôt cible. */
export const COPIES = Object.freeze({
  carte: 'js/core/donnees-communes.js',
  fiches: 'js/data/donnees-communes.js'
});
/** Chaque source et ses copies, par dépôt cible (un dépôt absent de `copies` n'en reçoit pas). */
export const RECOPIES = Object.freeze([
  Object.freeze({ source: SOURCE, copies: COPIES }),
  Object.freeze({ source: SOURCE_TOKEN_IMAGES, copies: Object.freeze({ carte: 'js/core/token-images.js' }) }),
  Object.freeze({ source: SOURCE_CONTRAT, copies: Object.freeze({ carte: 'docs/CONTRAT-LIAISON-OUTIL-MJ.md' }) }),
  Object.freeze({ source: SOURCE_MONTURES, copies: Object.freeze({ fiches: 'js/data/montures-fiches.js' }) })
]);

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

/** Compare (et écrit sauf `check`) chaque copie de chaque source ; renvoie une ligne d'état par copie et `ok`. */
export function recopier({ depots, check = false, racine = racineOutil, recopies = RECOPIES } = {}) {
  const lignes = [];
  let ok = true;
  for (const { source: chemin, copies } of recopies) {
    const brut = readFileSync(join(racine, chemin), 'utf8');
    const source = enLF(brut);
    if (brut !== source) { lignes.push(`source : fins de ligne CRLF dans ${chemin}`); ok = false; }
    for (const [nom, dossier] of Object.entries(depots)) {
      if (!copies[nom]) continue;
      const cible = join(dossier, copies[nom]);
      if (!existsSync(dossier)) { lignes.push(`${nom} : dépôt introuvable (${dossier})`); ok = false; continue; }
      const actuel = existsSync(cible) ? readFileSync(cible, 'utf8') : null;
      if (actuel === source) { lignes.push(`${nom} : à jour (${cible})`); continue; }
      if (check) { lignes.push(`${nom} : ${actuel === null ? 'copie absente' : 'copie différente de la source'} (${cible}) ← ${chemin}`); ok = false; continue; }
      mkdirSync(dirname(cible), { recursive: true });
      writeFileSync(cible, source);
      lignes.push(`${nom} : copie écrite (${cible})`);
    }
  }
  return { ok, lignes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const { ok, lignes } = recopier({ depots: depotsCibles(argv), check: argv.includes('--check') });
  for (const ligne of lignes) console.log(ligne);
  if (!ok) {
    console.error('Copies communes : dérive ou copie manquante (données communes, table des images ou contrat de liaison).');
    console.error('Après toute modification d’une source, ou une régénération de js/data/token-images.js, relancez depuis le dépôt de l’outil MJ :');
    console.error('  node tools/recopier-donnees-communes.mjs');
    process.exitCode = 1;
  }
}
