/**
 * Livre L28 : Ennemi Intérieur 3 — Le Pouvoir derrière le Trône (WJDR V4, français), ajouté au corpus par le MJ le 13/11/2026 (T15).
 *   node tools/build-bestiary-l28.mjs
 * Réécrit les entrées `addedOn: "2026-11-13"` du livre L28 dans docs/BESTIAIRE_INVENTAIRE.json (idempotent, identifiants stables) et la
 * section correspondante de docs/BESTIAIRE_INVENTAIRE.md. Les blocs sont ceux de l'extraction (tools/lib/bestiary-extract.mjs, livre
 * français) ; les noms sont relus sur les pages : `nameFrPrinted` = intitulé imprimé ; `name` = nom anglais seulement quand le même PNJ
 * est imprimé au Compagnon (L18), sinon l'intitulé imprimé. Ensuite : node tools/build-bestiary-profiles.mjs L28.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { extractProfiles, corpusBooks } from './lib/bestiary-extract.mjs';

const BOOK = 'L28';
const ADDED_ON = '2026-11-13';
const OFFSET = corpusBooks().find(book => book.id === BOOK).pageOffset;
const SOURCE_NOTE = 'L28 : livre V4 français ; bloc lu par l’extraction (en-têtes et noms français rendus en anglais), intitulé relu sur la page.';

/** Intitulés imprimés relus sur les pages (clé de bloc → nom français ; `en` : même PNJ au Compagnon L18, nom anglais repris). */
const NAMES = {
  'L28:26:0': { fr: 'Kurt Gruber, serveur — Bourgeois humain, ancienne recrue (Argent 2)' },
  'L28:26:1': { fr: 'Uli Breitner, propriétaire — Marchand humain, anciennement recrue et entremetteur (Argent 5)' },
  'L28:27:0': { fr: 'Renata Hoeflehner — Serveuse humain (Argent 2)' },
  'L28:27:1': { fr: 'Konrad Alpiger — Homme à tout faire/serveur humain (Argent 2)' },
  'L28:27:2': { fr: 'Tiasmara Flarett — Cuisinier halfling (Argent 2)' },
  'L28:31:0': { fr: 'Cultistes de la Main pourpre (7)' },
  'L28:31:1': { fr: 'Magus du culte de la Main pourpre' },
  'L28:35:0': { fr: 'Graf Boris Todbringer — Noble seigneur humain électeur impérial (Or 7)' },
  'L28:36:0': { fr: 'Baron Heinrich Todbringer — Émissaire humain, ancien conseiller et intendant (Argent 4)' },
  'L28:36:1': { fr: 'Baron Stefan Todbringer — Héritier souffreteux humain' },
  'L28:46:0': { fr: 'Démon mineur de Tzeentch' },
  'L28:58:0': { fr: 'Emil Valgeir — Prêtre guerrier d’Ulric vétéran humain (Argent 2)' },
  'L28:59:0': { fr: 'Claus Liebnitz — Prêtre sergent d’Ulric vétéran, ancien chevalier de l’ordre du Loup blanc (Argent 3)' },
  'L28:59:1': { fr: 'Isolde Begegnen — Grande prêtresse de Shallya (Or 1)', en: 'Isolde Begegnen — Human High Priestess (Gold 1)' },
  'L28:64:0': { fr: 'Glugnur — Tueur de troll nain (Bronze 2)' },
  'L28:65:0': { fr: 'Gustav Holschtweig — Colporteur humain (Bronze 4)' },
  'L28:65:1': { fr: 'Hildi Holschtweig — Colporteur humain (Bronze 4)' },
  'L28:66:0': { fr: 'Antonia Fiegling — Rançonneur humain (Bronze 5)' },
  'L28:66:1': { fr: 'Bruno Hansgorp — Coupe-jarret humain (Bronze 3)' },
  'L28:67:0': { fr: 'Karl Matthaus — Voleur humain (Bronze 1*)' },
  'L28:70:0': { fr: 'Les gladiateurs minotaures' },
  'L28:90:0': { fr: 'Nastassia — Agent (Or 4)', en: 'Nastassia — Human Spymaster (Gold 4)' },
  'L28:94:0': { fr: 'Snikkit — Vermine de choc skaven' },
  'L28:94:1': { fr: 'Guerriers skavens de Snikkit (6)' },
  'L28:94:2': { fr: 'Erina Eberhauer — Sorcier flamboyant (Argent 3)' },
  'L28:97:0': { fr: 'Selena — Prostitué humain (Bronze 1)' },
  'L28:97:1': { fr: 'Fritz Dreckig — Négociant humain (Argent 2)' },
  'L28:97:2': { fr: 'Bruno Kohl — Entremetteur humain, ancien noble et apothicaire (Bronze 3)' },
  'L28:97:3': { fr: 'Otto Geschwur — Coupe-jarret humain (Bronze 3)' },
  'L28:98:0': { fr: 'Marie-Astrid Platini — Prostitué humain (Bronze 1)' },
  'L28:99:0': { fr: 'Brunhilde Klaglich — Maître espion (Or 4)', en: 'Brunhilde Klaglich — Human Spymaster (Gold 4)' },
  'L28:100:0': { fr: 'Anton Hundisch — Sorcier novice humain (Bronze 3)' },
  'L28:100:1': { fr: 'Dagmar Mitschuldige — Soldat humain (Argent 3)' },
  'L28:100:2': { fr: 'Hultz Fleischer — Coupe-jarret humain (Bronze 3)' },
  'L28:112:0': { fr: 'Gaston — Serviteur humain, ancien employé (Argent 3)' },
  'L28:112:1': { fr: 'Swelt Tunger — Artisan humain, ancien voleur (Argent 1)' },
  'L28:112:2': { fr: 'Gueulard — Chien de garde' },
  'L28:112:3': { fr: 'Faucon — Éclaireur humain, ancien chasseur et domestique (Bronze 5)' },
  'L28:113:0': { fr: 'Sénestre — Faucon' },
  'L28:113:1': { fr: 'Chevaux de guerre' },
  'L28:113:2': { fr: 'Lurk — Gladiateur humain (Argent 2)' },
  'L28:117:0': { fr: 'Josef Sparsam — Chancelier, ancien maître du barreau (Or 3)' },
  'L28:119:0': { fr: 'Dieter Schmiedehammer — Champion de justice (Or 3)' },
  'L28:121:0': { fr: 'Rallane Lafarel — Troubadour (Argent 3)' },
  'L28:123:0': { fr: 'Katarina Todbringer — Noble (Or 3)' },
  'L28:125:0': { fr: 'Hildegarde Zimperlich — Valet (Argent 5)' },
  'L28:127:0': { fr: 'Johann Schwermutt — Officier (Or 1)' },
  'L28:127:1': { fr: 'Ulrich Schutzmann — Capitaine de la garde (Or 1)' },
  'L28:128:0': { fr: 'Maximillian von Genscher — Officier (Or 1)' },
  'L28:130:0': { fr: 'Albrecht Helseher — Seigneur sorcier (Or 2)' },
  'L28:131:0': { fr: 'Janna Eberhauer — Maître sorcier (Or 1)' },
  'L28:133:0': { fr: 'Ar-Ulric Jarrick Valgeir — Lecteur (Or 2)' },
  'L28:135:0': { fr: 'Emmanuelle Schlagen — Conseiller (Argent 4)' },
  'L28:137:0': { fr: 'Siegfried Prunkvoll — Chevalier commandeur (Or 2)' },
  'L28:139:0': { fr: 'Allavandrel Fanmaris — Maître de la chasse (Argent 3)' },
  'L28:141:0': { fr: 'Gotthard Wallenstein — Marchand (Argent 5)' },
  'L28:143:0': { fr: 'Luigi Pavarotti — Arnaqueur (Argent 2)' },
  'L28:145:0': { fr: 'Natasha Sinnlich — Émissaire (Argent 4)' },
  'L28:145:1': { fr: 'Kirsten Jung — Conseiller (Argent 4)' },
  'L28:146:0': { fr: 'Petra Liebkosen — Émissaire (Argent 4)' },
  'L28:148:0': { fr: 'Reiner Ehrlich — Maître du barreau (Or 1)' },
  'L28:148:1': { fr: 'Joachim Hoflich — Maître du barreau (Or 1)' },
  'L28:149:0': { fr: 'Karl Heinz Wasmeier — Maître du barreau (Or 1)' },
  'L28:151:0': { fr: 'Doppelgänger' }
};

const inventory = JSON.parse(readFileSync('docs/BESTIAIRE_INVENTAIRE.json', 'utf8'));
const previous = new Map(inventory.profiles.filter(entry => entry.book === BOOK).map(entry => [entry.blockKey, entry.id]));
inventory.profiles = inventory.profiles.filter(entry => entry.book !== BOOK);
inventory.coverage = inventory.coverage.filter(entry => entry.book !== BOOK);
const baseName = name => name.replace(/\s*\(.*\)\s*$/, '').replace(/\s+—.*$/, '').trim();
const known = new Map(inventory.traits.map(entry => [baseName(entry.name).toLowerCase(), baseName(entry.name)]));

const { profiles } = extractProfiles([BOOK]);
const missing = profiles.filter(profile => !NAMES[profile.key]).map(profile => profile.key);
const stale = Object.keys(NAMES).filter(key => !profiles.some(profile => profile.key === key));
if (missing.length || stale.length) throw new Error(`Blocs sans nom relu : ${missing.join(', ') || '—'} ; noms sans bloc : ${stale.join(', ') || '—'}`);

let next = Math.max(...inventory.profiles.map(entry => Number(entry.id.slice(5)))) + 1;
const entries = profiles.map(profile => {
  const used = new Set();
  for (const list of [profile.traits, profile.attackTraits, profile.optional]) for (const trait of list || []) {
    const name = known.get(baseName(trait.name).toLowerCase());
    if (name) used.add(name);
  }
  const id = previous.get(profile.key) || `E0-P-${String(next++).padStart(3, '0')}`;
  const names = NAMES[profile.key];
  return {
    name: names.en || names.fr, nameFrPrinted: names.fr, book: BOOK, page: profile.physicalPage - OFFSET, physicalPage: profile.physicalPage, kind: 'profile',
    traitsUsed: [...used].sort(), count: used.size, abilityRefs: [], sourceNote: SOURCE_NOTE, id, blockKey: profile.key, addedOn: ADDED_ON
  };
});
inventory.profiles.push(...entries);
inventory.coverage.push({
  book: BOOK, profilePagesPhysical: [...new Set(entries.map(entry => entry.physicalPage))], rulePagesPrinted: [],
  entries: entries.length, profiles: entries.length, templates: 0, pregeneratedCharacters: 0,
  method: 'Livre V4 français : en-têtes et étiquettes mis au format anglais à colonnes égales, noms de compétences, talents et Traits rendus en anglais (tools/lib/bestiary-french.mjs) ; intitulés relus sur les pages.', addedOn: ADDED_ON
});
writeFileSync('docs/BESTIAIRE_INVENTAIRE.json', `${JSON.stringify(inventory, null, 2)}\n`);

const MARK = '## Livre L28 du 13/11/2026 (Le Pouvoir derrière le Trône)';
const md = readFileSync('docs/BESTIAIRE_INVENTAIRE.md', 'utf8');
const start = md.indexOf(MARK);
const after = start < 0 ? -1 : md.indexOf('\n## ', start + MARK.length);
const before = start < 0 ? md.trimEnd() : md.slice(0, start).trimEnd();
const tail = after < 0 ? '' : md.slice(after);
const section = [
  MARK, '',
  `AJOUT : ${entries.length} profils de PNJ et de créatures, marqués \`addedOn: "${ADDED_ON}"\`. Livre V4 en français ; page physique = page imprimée + ${OFFSET}. Trois PNJ sont aussi au Compagnon (L18) avec les mêmes caractéristiques : Isolde Begegnen, Nastassia, Brunhilde Klaglich.`, '',
  '| ID | Source | Nom imprimé | Traits reconnus |', '| --- | --- | --- | --- |',
  ...entries.map(entry => `| ${entry.id} | L28 p.${entry.page} | ${entry.nameFrPrinted.replace(/\|/g, '/')} | ${entry.traitsUsed.join(', ') || '—'} |`), ''
].join('\n');
writeFileSync('docs/BESTIAIRE_INVENTAIRE.md', `${before}\n\n${section}${tail}`);
console.log(`L28 : ${entries.length} entrées d’inventaire (${entries[0].id} à ${entries[entries.length - 1].id})`);
