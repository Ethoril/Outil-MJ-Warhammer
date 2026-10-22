/**
 * Génère les profils de bestiaire d'un ou plusieurs livres : js/data/bestiary/<livre>.json + index.json.
 *   node tools/build-bestiary-profiles.mjs L06 [L11 …]
 * Source : texte des PDF (hors dépôt, extraction par colonnes) + inventaire (identifiants, noms, capacités). Valeurs imprimées telles
 * quelles. Les écarts de lecture (texte voisin écarté, nom français non vérifié) sont écrits dans tmp/divin/ pour relecture.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { extractProfiles, corpusBooks } from './lib/bestiary-extract.mjs';
import { assignInventoryIds } from './lib/bestiary-ids.mjs';
import { buildRecord } from './lib/bestiary-record.mjs';
import { MANUAL_BLOCKS } from './lib/bestiary-manual.mjs';
import { TRAIT_ALIASES } from './lib/bestiary-complement-data.mjs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';
import { BASE_REFERENTIAL } from '../js/core/creature-keywords.js';

const BOOKS = {
  L01: ['Archives of the Empire 2', 'V4'], L02: ['Archives of the Empire 3', 'V4'], L03: ['Archives of the Empire Volume 1', 'V4'], L04: ['Deft Steps, Light Fingers', 'V4'],
  L05: ['Livre de base (V4, français)', 'V4'], L06: ['Livre de base V5', 'V5'], L07: ['Lustria', 'V4'], L09: ['Temple of Spite', 'V4'], L10: ['Sylvania, The Cursed County', 'V4'],
  L11: ['The Imperial Zoo', 'V4'], L12: ['Tribes and Tribulations', 'V4'], L13: ['Up in Arms', 'V4'], L14: ['Sea Wardens of Cothique', 'V4'],
  L16: ['Lords of Stone and Steel', 'V4'], L17: ['Winds of Magic', 'V4'], L18: ['Power Behind the Throne Companion', 'V4'], L19: ['Middenheim: City of the White Wolf', 'V4'],
  L20: ['Altdorf: Crown of the Empire', 'V4'], L21: ['Empire in Ruins Companion', 'V4'], L22: ['The Horned Rat Companion', 'V4'], L23: ['Enemy in Shadows Companion', 'V4'],
  L24: ['Rough Nights & Hard Days', 'V4'], L25: ['Sea of Claws', 'V4'], L26: ['Death on the Reik Companion', 'V4']
};
const ids = process.argv.slice(2);
if (!ids.length) { console.error('usage : node tools/build-bestiary-profiles.mjs L06 [L11 …]'); process.exit(2); }

const inventory = JSON.parse(readFileSync('docs/BESTIAIRE_INVENTAIRE.json', 'utf8'));
const baseName = name => name.replace(/\s*\(.*\)\s*$/, '').replace(/\s+—.*$/, '').trim();
const canonicalNames = new Map();
const traitRefs = new Map();
const traitFr = new Map();
for (const trait of inventory.traits) {
  const base = baseName(trait.name);
  if (!canonicalNames.has(base.toLowerCase())) canonicalNames.set(base.toLowerCase(), base);
  const better = !traitRefs.has(base) || (trait.kind === 'trait' && !String(traitRefs.get(base)).startsWith('E0-T-0') );
  if (better || trait.kind === 'trait') { if (!traitRefs.has(base) || trait.kind === 'trait') traitRefs.set(base, trait.id); }
  if (trait.nameFr && !traitFr.has(base)) traitFr.set(base, baseName(trait.nameFr));
}
const canonical = name => {
  const key = String(name).trim().toLowerCase();
  const direct = canonicalNames.get(key);
  if (direct) return direct;
  const alias = TRAIT_ALIASES[key];
  return alias ? canonicalNames.get(alias.toLowerCase()) || null : null;
};
const titleCase = text => text.toLowerCase().replace(/(^|[\s(\-'’`])([a-zà-ÿ])/g, (_, before, letter) => before + letter.toUpperCase())
  .replace(/\b(Of|The|Von|Van|De|La|Der|Zu|Zum|Und|And|Or|At|In)\b/g, word => word.toLowerCase()).replace(/^./, letter => letter.toUpperCase());
const displayName = name => (/[a-zà-ÿ]/.test(name.replace(/\([^)]*\)/g, '')) ? name : titleCase(name)).replace(/\s+-\s+/g, ' — ');
const context = { canonical, traitRefs, traitFr, displayName, referential: BASE_REFERENTIAL };

mkdirSync('js/data/bestiary', { recursive: true });
mkdirSync('tmp/divin', { recursive: true });
let indexFile = { schemaVersion: 1, books: [] };
try { indexFile = JSON.parse(readFileSync('js/data/bestiary/index.json', 'utf8')); } catch { /* premier livre */ }
const manifest = corpusBooks();

for (const book of ids) {
  if (!BOOKS[book]) throw new Error(`Livre inconnu ou sans profil : ${book}`);
  const { profiles } = extractProfiles([book]);
  const entries = inventory.profiles.filter(entry => entry.book === book);
  const { byKey, missing, extra } = assignInventoryIds(profiles, entries);
  const records = [];
  const dropped = [];
  for (const profile of profiles) {
    const entry = byKey.get(profile.key);
    if (!entry) continue;
    const record = buildRecord(profile, entry, context);
    dropped.push({ id: record.id, ...record._dropped });
    delete record._dropped;
    records.push(record);
  }
  for (const entry of missing) {
    const manual = MANUAL_BLOCKS[entry.id];
    if (!manual) { console.error(`SANS BLOC : ${entry.id} ${entry.name} (${book} p. ${entry.page})`); continue; }
    const record = buildRecord(manual, entry, context);
    delete record._dropped;
    records.push(record);
  }
  for (const block of extra) console.error(`BLOC SANS ENTRÉE : ${block.key} ${block.title}`);
  records.sort((a, b) => a.id.localeCompare(b.id));
  const problems = records.flatMap(record => validateBestiaryRecord(record).map(message => `${record.id} ${record.name} : ${message}`));
  if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
  const meta = manifest.find(item => item.id === book);
  const output = { schemaVersion: 1, book, title: BOOKS[book][0], edition: BOOKS[book][1], source: { corpusId: book, sha256: meta?.sha256 || null }, profiles: records };
  writeFileSync(`js/data/bestiary/${book}.json`, `${JSON.stringify(output, null, 1)}\n`);
  writeFileSync(`tmp/divin/bestiary-ecarts-${book}.json`, `${JSON.stringify({ dropped, unverifiedSkills: records.flatMap(record => (record.skills || []).filter(skill => skill.frUnverified).map(skill => `${record.id} ${skill.name}`)), unrecognizedTraits: records.flatMap(record => [...(record.traits || []), ...(record.optionalTraits || [])].filter(trait => trait.unrecognized).map(trait => `${record.id} ${trait.name}`)), withoutKeywords: records.filter(record => !record.keywords?.length).map(record => `${record.id} ${record.name}`) }, null, 1)}\n`);
  const counts = { profiles: records.filter(r => r.kind === 'profile').length, templates: records.filter(r => r.kind === 'template').length, pregenerated: records.filter(r => r.kind === 'pregenerated-character').length };
  indexFile.books = [...indexFile.books.filter(item => item.book !== book), { book, file: `${book}.json`, title: BOOKS[book][0], edition: BOOKS[book][1], counts }].sort((a, b) => a.book.localeCompare(b.book));
  console.log(`${book} : ${records.length} profils (${counts.profiles} profils, ${counts.templates} gabarits, ${counts.pregenerated} prétirés), ${missing.filter(entry => !MANUAL_BLOCKS[entry.id]).length} sans bloc`);
}
writeFileSync('js/data/bestiary/index.json', `${JSON.stringify(indexFile, null, 1)}\n`);
