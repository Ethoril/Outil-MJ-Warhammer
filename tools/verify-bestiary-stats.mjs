/**
 * Contrôle indépendant des chiffres d'un livre : relit le texte BRUT (ordre de lecture, sans mise en page) des PDF et vérifie que la
 * suite des 12 valeurs de chaque profil de js/data/bestiary/<livre>.json y figure, sur la bonne page.
 *   node tools/verify-bestiary-stats.mjs L06 [L11 …]
 * Les gabarits (cases vides) et les profils transcrits à la main sont signalés « non contrôlables », pas acceptés en silence.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { corpusBooks } from './lib/bestiary-extract.mjs';
import { repairGlyphs } from './lib/bestiary-glyphs.mjs';
import { JUSTIFIED } from './lib/bestiary-justified.mjs';
import { blockAfter, colonize, completenessGaps, extendedGaps, findValueRow, formatGaps, normalizeBlockText, stackedBlock, veryIncomplete } from './lib/bestiary-completeness.mjs';

// Catégories contrôlées : talents et compétences (Q0), attaques, Traits, équipement, sorts, bruit d'équipement (Q11).
const CATEGORIES = ['talents', 'skills', 'attacks', 'traits', 'trappings', 'spells', 'trappingNoise', 'veryIncomplete'];
let justifiedCount = 0;
const KEYS = ['M', 'CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'];
let failures = 0;
const skillWarnings = [];
const catalogue = new Set(JSON.parse(readFileSync('js/data/reference-snapshot.json', 'utf8')).talents.entries.map(entry => entry.englishName.toLowerCase()));
// Noms de Traits de l'inventaire (Q32 : « Nom : description » des livres L06 et L09).
const traitNames = new Set(JSON.parse(readFileSync('docs/BESTIAIRE_INVENTAIRE.json', 'utf8')).traits.map(trait => trait.name));
mkdirSync('tmp/divin', { recursive: true });
const totals = {};
for (const book of process.argv.slice(2)) {
  const data = JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8'));
  const meta = corpusBooks().find(item => item.id === book);
  const pages = repairGlyphs(execFileSync('pdftotext', [meta.path, '-'], { maxBuffer: 1 << 28 }).toString('utf8')).split('\f')
    .map(page => page.replace(/[­−–—�]/g, '-').replace(/-{2,}/g, '-').replace(/\*/g, '').replace(/\s+/g, ' '));
  // Un zéro initial imprimé (« 09 », « 04 ») est la même valeur que « 9 », « 4 ».
  const unpadded = pages.map(page => normalizeBlockText(page).replace(/(?<=\s)0(\d)(?=\s)/g, '$1'));
  let checked = 0;
  const gaps_ = [];
  const justified_ = [];
  const skipped = [];
  for (const record of data.profiles) {
    if (record.kind !== 'profile' || record.blockKey?.endsWith(':manual')) { skipped.push(`${record.id} ${record.name} (${record.kind})`); continue; }
    // Un profil sans colonne de Blessures (wounds null) n'imprime pas de dernier chiffre.
    const tokens = [...KEYS.map(key => (record.stats[key] === null ? '-' : String(record.stats[key]))), ...(record.wounds === null || record.wounds === undefined ? [] : [String(record.wounds)])];
    const row = tokens.join(' ');
    const text = unpadded[record.physicalPage - 1] || '';
    // Q25 : le premier chiffre ne doit pas être la fin d'un nombre plus long (Sea Dragon L09 : « 10 70 60… » lu comme « 0 70 60… »).
    const at = findValueRow(text, tokens, record.name);
    if (at >= 0) checked += 1;
    else { failures += 1; console.error(`ÉCART ${book} p.${record.physicalPage} ${record.id} ${record.name} : ${row}`); }
    // Sur un écart de valeurs, le bloc reste contrôlé à partir de la ligne imprimée de même forme (première colonne libre).
    const blockAt = at >= 0 ? at : findValueRow(text, ['\\d+', ...tokens.slice(1)], record.name);
    if (blockAt >= 0) {
      const raw = stackedBlock(text, blockAt) ?? blockAfter(text, blockAt);
      // Q32 : rubriques sans deux-points (L06, L09, L10) lues comme les autres ; descriptions « Nom : texte », « Traits Continued », attaques V5 et Souffle.
      const block = colonize(raw);
      const gaps = { ...completenessGaps(record, block, catalogue), ...extendedGaps(record, block), veryIncomplete: veryIncomplete(record, raw) };
      const legacy = JSON.parse(JSON.stringify(gaps));
      // Faux positifs relus sur la page (tools/lib/bestiary-justified.mjs) : sortis du décompte, gardés dans le rapport avec leur raison.
      const justified = {};
      for (const [category, reason] of Object.entries(JUSTIFIED[record.id] || {})) {
        if (!gaps[category]?.length) continue;
        justified[category] = { items: gaps[category], reason };
        gaps[category] = [];
        justifiedCount += justified[category].items.length;
      }
      // Les manques propres à Q32 s'ajoutent après : une justification relue avant Q32 ne les couvre pas (Q34 les relit).
      for (const [category, list] of Object.entries(formatGaps(record, block, catalogue, traitNames))) gaps[category] = [...gaps[category], ...list.filter(item => !legacy[category].includes(item))];
      if (Object.keys(justified).length) justified_.push({ id: record.id, name: record.name, page: record.physicalPage, justifiés: justified });
      if (CATEGORIES.some(category => gaps[category].length)) gaps_.push({ id: record.id, name: record.name, page: record.physicalPage, ...gaps });
    }
    // Compétences : chaque nom et chaque valeur gardés doivent figurer sur la page (aucune valeur inventée) ; avertissement seulement.
    for (const skill of record.skills || []) {
      const spec = /\((.+)\)$/.exec(skill.name)?.[1];
      const forms = [`${skill.name} ${skill.value}`, spec && `${spec} ${skill.value}`].filter(Boolean);
      // Comparaison hors ponctuation, espaces et casse : césures « Two- handed » et tirets rendus en U+FFFD ne sont pas des écarts.
      const squash = value => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      if (!forms.some(form => squash(text).includes(squash(form)))) { skillWarnings.push(`avertissement ${book} ${record.id} ${record.name} : compétence « ${skill.name} ${skill.value} » absente du texte brut de la page`); }
    }
  }
  writeFileSync(`tmp/divin/bestiary-completude-${book}.json`, `${JSON.stringify({ book, profils: data.profiles.length, manques: gaps_, justifiés: justified_ }, null, 1)}
`);
  totals[book] = { profils: gaps_.length };
  for (const category of CATEGORIES) totals[book][category] = gaps_.reduce((n, g) => n + g[category].length, 0);
  console.log(`${book} : ${checked}/${data.profiles.length - skipped.length} lignes de valeurs retrouvées dans le texte brut ; non contrôlables : ${skipped.length}${skipped.length ? ` (${skipped.slice(0, 4).join(', ')}…)` : ''}`);
}
console.log(`complétude (profils incomplets puis manques par catégorie) : ${JSON.stringify(totals)}`);
console.log(`total par catégorie : ${JSON.stringify(Object.fromEntries(CATEGORIES.map(category => [category, Object.values(totals).reduce((n, t) => n + t[category], 0)])))}`);
console.log(`manques justifiés (faux positifs relus, bestiary-justified.mjs) : ${justifiedCount}`);
// Triés (livre, puis identifiant) : la sortie ne dépend pas de l'ordre de lecture.
for (const line of skillWarnings.sort()) console.error(line);
console.log(`avertissements de compétences : ${skillWarnings.length}`);
process.exitCode = failures ? 1 : 0;
