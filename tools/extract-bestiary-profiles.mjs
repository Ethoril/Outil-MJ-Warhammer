/**
 * Extrait les blocs de profils des livres du corpus (L01-L26) vers un JSON structuré (noms et chiffres imprimés seulement).
 *   node tools/extract-bestiary-profiles.mjs <sortie.json> [--keep-body] [L06 L11 …]
 * Les PDF restent hors du dépôt : le résultat est commité, pas régénéré par la suite de tests. Les lignes de valeurs dont une case est
 * vide ou illisible (gabarits, tiret perdu) sont listées dans `approximate` et se règlent par `tools/lib/bestiary-overrides.mjs`
 * (valeurs relues sur l'image de la page). `--keep-body` joint le texte brut du bloc (usage local, jamais commité).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { corpusBooks, extractProfiles } from './lib/bestiary-extract.mjs';

const args = process.argv.slice(2);
const keepBody = args.includes('--keep-body');
const [output, ...ids] = args.filter(arg => arg !== '--keep-body');
if (!output) { console.error('usage : node tools/extract-bestiary-profiles.mjs <sortie.json> [--keep-body] [livres…]'); process.exit(2); }
const { profiles, approximate } = extractProfiles(ids.length ? ids : corpusBooks().map(book => book.id), { keepBody });
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({ schemaVersion: 1, profiles, approximate }, null, 1)}\n`);
console.log(`${profiles.length} blocs, ${approximate.length} lignes de valeurs à confirmer`);
