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
import { TEMPLATE_IDS, NAME_FIXES, WOUNDS_ABSENT_IDS, ARMOUR_DETAIL } from './lib/bestiary-overrides.mjs';
import { MANUAL_BLOCKS } from './lib/bestiary-manual.mjs';
import { KEYWORDS_MANUAL } from './lib/bestiary-keywords-manual.mjs';
import { parsePregenerated } from './lib/bestiary-pregen.mjs';
import { cleanSkills } from './lib/bestiary-record.mjs';
import { execFileSync } from 'node:child_process';
import { repairGlyphs } from './lib/bestiary-glyphs.mjs';
import { NAMES_FR } from './lib/bestiary-names-fr.mjs';
import { proposeFrenchName } from './lib/bestiary-names-glossary.mjs';
import { TRAIT_ALIASES } from './lib/bestiary-complement-data.mjs';
import { validateBestiaryRecord } from '../js/core/bestiary-profiles.js';
import { BASE_REFERENTIAL, resolveKeyword } from '../js/core/creature-keywords.js';

const BOOKS = {
  L01: ['Archives of the Empire 2', 'V4'], L02: ['Archives of the Empire 3', 'V4'], L03: ['Archives of the Empire Volume 1', 'V4'], L04: ['Deft Steps, Light Fingers', 'V4'],
  L05: ['Livre de base (V4, français)', 'V4'], L06: ['Livre de base V5', 'V5'], L07: ['Lustria', 'V4'], L09: ['Temple of Spite', 'V4'], L10: ['Sylvania, The Cursed County', 'V4'],
  L11: ['The Imperial Zoo', 'V4'], L12: ['Tribes and Tribulations', 'V4'], L13: ['Up in Arms', 'V4'], L14: ['Sea Wardens of Cothique', 'V4'],
  L16: ['Lords of Stone and Steel', 'V4'], L17: ['Winds of Magic', 'V4'], L18: ['Power Behind the Throne Companion', 'V4'], L19: ['Middenheim: City of the White Wolf', 'V4'],
  L20: ['Altdorf: Crown of the Empire', 'V4'], L21: ['Empire in Ruins Companion', 'V4'], L22: ['The Horned Rat Companion', 'V4'], L23: ['Enemy in Shadows Companion', 'V4'],
  L24: ['Rough Nights & Hard Days', 'V4'], L25: ['Sea of Claws', 'V4'], L26: ['Death on the Reik Companion', 'V4']
};
const outFlag = process.argv.find(arg => arg.startsWith('--out='));
const OUT = outFlag ? outFlag.slice(6) : 'js/data/bestiary';
const ids = process.argv.slice(2).filter(arg => !arg.startsWith('--out='));
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
  // Les coupures de ligne laissent « Cold- blooded » : le trait d'union suivi d'un blanc est recollé.
  const key = String(name).trim().toLowerCase().replace(/-\s+/g, '-');
  const direct = canonicalNames.get(key);
  if (direct) return direct;
  const alias = TRAIT_ALIASES[key];
  return alias ? canonicalNames.get(baseName(alias).toLowerCase()) || null : null;
};
const titleCase = text => text.toLowerCase().replace(/(^|[\s(\-'’`])([a-zà-ÿ])/g, (_, before, letter) => before + letter.toUpperCase())
  .replace(/\b(Of|The|Von|Van|De|La|Der|Zu|Zum|Und|And|Or|At|In)\b/g, word => word.toLowerCase()).replace(/^./, letter => letter.toUpperCase());
const displayName = name => (/[a-zà-ÿ]/.test(name.replace(/\([^)]*\)/g, '')) ? name : titleCase(name)).replace(/\s+-\s+/g, ' — ');
function applyManualKeywords(record) {
  const extra = KEYWORDS_MANUAL[record.id];
  if (!extra) return;
  // Une entrée « -id » retire un mot-clé lu à tort dans le nom (surnom, par exemple).
  const removed = new Set(extra.filter(id => id.startsWith('-')).map(id => id.slice(1)));
  const all = [...new Set([...(record.keywords || []), ...extra.filter(id => !id.startsWith('-'))])].filter(id => !removed.has(id));
  if (all.length) record.keywords = all; else delete record.keywords;
}
function applyFrenchName(record) {
  if (NAME_FIXES[record.id]) record.name = NAME_FIXES[record.id];
  applyManualKeywords(record);
  const found = NAMES_FR[record.id];
  if (found) { record.nameFr = found.nameFr; record.nameFrSource = found.source; }
  else if (record.kind !== 'pregenerated-character') { record.nameFr = proposeFrenchName(record.name); record.nameFrSource = 'proposition'; }
  else { record.nameFr = record.name; record.nameFrSource = 'proposition'; }
}
const context = { canonical, traitRefs, traitFr, displayName, referential: BASE_REFERENTIAL };

mkdirSync(OUT + '', { recursive: true });
mkdirSync('tmp/divin', { recursive: true });
let indexFile = { schemaVersion: 1, books: [] };
try { indexFile = JSON.parse(readFileSync(OUT + '/index.json', 'utf8')); } catch { /* premier livre */ }
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
    const corrected = TEMPLATE_IDS.has(entry.id);
    const record = buildRecord(profile, corrected ? { ...entry, kind: 'template' } : entry, context);
    if (corrected) record.inventoryKind = entry.kind;
    if (WOUNDS_ABSENT_IDS.has(record.id)) record.woundsAbsent = true;
    if (ARMOUR_DETAIL[record.id]) record.armour = { detail: ARMOUR_DETAIL[record.id] };
    dropped.push({ id: record.id, ...record._dropped });
    delete record._dropped;
    applyFrenchName(record);
    records.push(record);
  }
  const talentDictionary = new Set(JSON.parse(readFileSync('js/data/reference-snapshot.json', 'utf8')).talents.entries.map(item => item.englishName).filter(Boolean));
  for (const entry of missing.filter(item => item.kind === 'pregenerated-character')) {
    const meta = manifest.find(item => item.id === book);
    const page = flag => repairGlyphs(execFileSync('pdftotext', [...flag, '-f', String(entry.physicalPage), '-l', String(entry.physicalPage), meta.path, '-'], { maxBuffer: 1 << 26 }).toString('utf8'));
    const parsed = parsePregenerated(page([]), page(['-layout']), talentDictionary);
    const skills = cleanSkills(parsed.skills);
    const record = {
      id: entry.id, book, page: entry.page, physicalPage: entry.physicalPage, kind: 'pregenerated-character', blockKey: `${book}:${entry.physicalPage}:sheet`,
      name: entry.name, nameFr: null, stats: parsed.stats, wounds: parsed.wounds, identity: { ...parsed.identity, formName: parsed.identity.name },
      ...(skills.kept.length ? { skills: skills.kept, skillsPartial: true } : {}), ...(parsed.talents.length ? { talents: parsed.talents } : {})
    };
    // Intitulés incohérents de la fiche (nom du formulaire différent du titre) : signalés, jamais corrigés.
    const title = entry.name.trim().toLowerCase();
    if (record.identity.formName && record.identity.formName.trim().toLowerCase() !== title) record.identity.titleMismatch = true;
    for (const warning of parsed.warnings) console.error(`${entry.id} : ${warning}`);
    const species = resolveKeyword(parsed.identity.species || '');
    if (species) record.keywords = [species.id];
    applyFrenchName(record);
    records.push(record);
    missing.splice(missing.indexOf(entry), 1);
  }
  for (const entry of missing) {
    const manual = MANUAL_BLOCKS[entry.id];
    if (!manual) { console.error(`SANS BLOC : ${entry.id} ${entry.name} (${book} p. ${entry.page})`); continue; }
    const record = buildRecord(manual, entry, context);
    delete record._dropped;
    applyFrenchName(record);
    records.push(record);
  }
  for (const block of extra) console.error(`BLOC SANS ENTRÉE : ${block.key} ${block.title}`);
  records.sort((a, b) => a.id.localeCompare(b.id));
  const problems = records.flatMap(record => validateBestiaryRecord(record).map(message => `${record.id} ${record.name} : ${message}`));
  if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
  const meta = manifest.find(item => item.id === book);
  const output = { schemaVersion: 1, book, title: BOOKS[book][0], edition: BOOKS[book][1], source: { corpusId: book, sha256: meta?.sha256 || null }, profiles: records };
  writeFileSync(`${OUT}/${book}.json`,`${JSON.stringify(output, null, 1)}\n`);
  writeFileSync(`tmp/divin/bestiary-ecarts-${book}.json`, `${JSON.stringify({ dropped, unverifiedSkills: records.flatMap(record => (record.skills || []).filter(skill => skill.frUnverified).map(skill => `${record.id} ${skill.name}`)), droppedTraits: dropped.flatMap(row => row.traits.map(name => `${row.id} ${name}`)), withoutKeywords: records.filter(record => !record.keywords?.length).map(record => `${record.id} ${record.name}`) }, null, 1)}\n`);
  const counts = { profiles: records.filter(r => r.kind === 'profile').length, templates: records.filter(r => r.kind === 'template').length, pregenerated: records.filter(r => r.kind === 'pregenerated-character').length };
  indexFile.books = [...indexFile.books.filter(item => item.book !== book), { book, file: `${book}.json`, title: BOOKS[book][0], edition: BOOKS[book][1], counts }].sort((a, b) => a.book.localeCompare(b.book));
  console.log(`${book} : ${records.length} profils (${counts.profiles} profils, ${counts.templates} gabarits, ${counts.pregenerated} prétirés), ${missing.filter(entry => !MANUAL_BLOCKS[entry.id]).length} sans bloc`);
}
writeFileSync(OUT + '/index.json', `${JSON.stringify(indexFile, null, 1)}\n`);
