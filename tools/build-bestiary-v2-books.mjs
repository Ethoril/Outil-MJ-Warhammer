/**
 * Livres WJDR V2 convertis en V5 par la règle maison du MJ (tools/lib/bestiary-v2.mjs, docs/specs/images-pions/conversion-v2-v5.md) :
 *   node tools/build-bestiary-v2-books.mjs L29 [L30]
 * Source : la transcription relue de chaque livre (tools/lib/bestiary-v2-l29.mjs…), noms et chiffres seulement. Écrit
 * js/data/bestiary/<livre>.json, son entrée d'index, ses entrées d'inventaire (`addedOn: "2026-11-14"`, identifiants stables) et ses lignes
 * de classement (tools/token-images-categories.csv, sans toucher aux lignes existantes).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { v2Record } from './lib/bestiary-v2-record.mjs';
import { slug } from './build-token-images.mjs';

const BOOKS = {
  L29: { file: './lib/bestiary-v2-l29.mjs', title: 'Le Tome de la Corruption (WJDR V2, converti en V5)', sha256: '2e576d7a833d59c4acd6c4986f38319cf4ce37eb1ae96105795e3b02abee25df' },
  L30: { file: './lib/bestiary-v2-l30.mjs', title: 'Le Seigneur liche (WJDR V2, converti en V5)', sha256: '283c1f2bea4565d2269f9110b8b75853eb29fc0366280fc51eedf4c97ef9ca22' }
};
const ADDED_ON = '2026-11-14';
const inventory = JSON.parse(readFileSync('docs/BESTIAIRE_INVENTAIRE.json', 'utf8'));

for (const book of process.argv.slice(2)) {
  const meta = BOOKS[book];
  if (!meta) throw new Error(`Livre V2 inconnu : ${book}`);
  const { PROFILES } = await import(meta.file);
  const previous = new Map(inventory.profiles.filter(row => row.book === book).map(row => [row.blockKey, row.id]));
  inventory.profiles = inventory.profiles.filter(row => row.book !== book);
  inventory.coverage = inventory.coverage.filter(row => row.book !== book);
  let next = Math.max(...inventory.profiles.map(row => Number(row.id.slice(5))), ...[...previous.values()].map(value => Number(value.slice(5)))) + 1;
  const perPage = new Map();
  const profiles = PROFILES.map(entry => {
    const index = perPage.get(entry.physicalPage) ?? 0;
    perPage.set(entry.physicalPage, index + 1);
    const blockKey = `${book}:${entry.physicalPage}:${index}`;
    return v2Record(entry, previous.get(blockKey) || `E0-P-${String(next++).padStart(3, '0')}`, blockKey, book);
  });
  const note = `${book} : profils V2 transcrits (noms et chiffres) puis convertis en V5 par la règle maison du MJ (tools/lib/bestiary-v2.mjs, 14/11/2026).`;
  for (const profile of profiles) {
    const traitsUsed = profile.traits.map(item => item.name);
    inventory.profiles.push({ name: profile.name, book, page: profile.page, physicalPage: profile.physicalPage, kind: 'profile', traitsUsed, count: traitsUsed.length,
      abilityRefs: [], sourceNote: note, id: profile.id, blockKey: profile.blockKey, addedOn: ADDED_ON });
  }
  inventory.coverage.push({ book, profilePagesPhysical: [...new Set(profiles.map(profile => profile.physicalPage))], rulePagesPrinted: [], entries: profiles.length,
    profiles: profiles.length, templates: 0, pregeneratedCharacters: 0, method: 'Profils V2 transcrits et contrôlés contre la couche texte du PDF, convertis par tools/build-bestiary-v2-books.mjs.', addedOn: ADDED_ON });
  writeFileSync(`js/data/bestiary/${book}.json`, `${JSON.stringify({ schemaVersion: 1, book, title: meta.title, edition: 'V5', sourceEdition: 'V2', source: { corpusId: book, sha256: meta.sha256 }, conversionNote: note, profiles }, null, 1)}\n`);
  const index = JSON.parse(readFileSync('js/data/bestiary/index.json', 'utf8'));
  index.books = [...index.books.filter(row => row.book !== book), { book, file: `${book}.json`, title: meta.title, edition: 'V5', counts: { profiles: profiles.length, templates: 0, pregenerated: 0 } }]
    .sort((a, b) => a.book.localeCompare(b.book));
  writeFileSync('js/data/bestiary/index.json', `${JSON.stringify(index, null, 1)}\n`);
  // Classement : une ligne par créature absente du fichier (dossier choisi par créature), lignes existantes intactes.
  const csvPath = 'tools/token-images-categories.csv';
  const [head, ...rows] = readFileSync(csvPath, 'utf8').split('\n').filter(Boolean);
  const keys = new Set(rows.map(row => row.split(';')[0]));
  for (const [i, profile] of profiles.entries()) {
    const key = slug(profile.nameFr);
    if (!keys.has(key)) { rows.push([key, PROFILES[i].folder, PROFILES[i].folder.startsWith('pnj/') ? 'oui' : 'non', ''].join(';')); keys.add(key); }
  }
  const k = row => row.split(';')[0];
  writeFileSync(csvPath, `${[head, ...rows.sort((a, b) => (k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0))].join('\n')}\n`);
  console.log(`${book} : ${profiles.length} profils (${profiles[0].id} à ${profiles[profiles.length - 1].id})`);
}
writeFileSync('docs/BESTIAIRE_INVENTAIRE.json', `${JSON.stringify(inventory, null, 2)}\n`);
