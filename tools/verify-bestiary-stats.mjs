/**
 * Contrôle indépendant des chiffres d'un livre : relit le texte BRUT (ordre de lecture, sans mise en page) des PDF et vérifie que la
 * suite des 12 valeurs de chaque profil de js/data/bestiary/<livre>.json y figure, sur la bonne page.
 *   node tools/verify-bestiary-stats.mjs L06 [L11 …]
 * Les gabarits (cases vides) et les profils transcrits à la main sont signalés « non contrôlables », pas acceptés en silence.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { corpusBooks } from './lib/bestiary-extract.mjs';
import { blockAfter, completenessGaps, normalizeBlockText } from './lib/bestiary-completeness.mjs';

const KEYS = ['M', 'CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'];
let failures = 0;
let skillWarnings = 0;
const catalogue = new Set(JSON.parse(readFileSync('js/data/reference-snapshot.json', 'utf8')).talents.entries.map(entry => entry.englishName.toLowerCase()));
mkdirSync('tmp/divin', { recursive: true });
const totals = {};
for (const book of process.argv.slice(2)) {
  const data = JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8'));
  const meta = corpusBooks().find(item => item.id === book);
  const pages = execFileSync('pdftotext', [meta.path, '-'], { maxBuffer: 1 << 28 }).toString('utf8').split('\f')
    .map(page => page.replace(/[­−–—�]/g, '-').replace(/-{2,}/g, '-').replace(/\*/g, '').replace(/\s+/g, ' '));
  // Un zéro initial imprimé (« 09 », « 04 ») est la même valeur que « 9 », « 4 ».
  const unpadded = pages.map(page => normalizeBlockText(page).replace(/(?<=\s)0(\d)(?=\s)/g, '$1'));
  let checked = 0;
  const gaps_ = [];
  const skipped = [];
  for (const record of data.profiles) {
    if (record.kind !== 'profile' || record.blockKey?.endsWith(':manual')) { skipped.push(`${record.id} ${record.name} (${record.kind})`); continue; }
    // Un profil sans colonne de Blessures (wounds null) n'imprime pas de dernier chiffre.
    const tokens = [...KEYS.map(key => (record.stats[key] === null ? '-' : String(record.stats[key]))), ...(record.wounds === null || record.wounds === undefined ? [] : [String(record.wounds)])];
    const row = tokens.join(' ');
    // Une case vide perdue à l'extraction brute s'écrit parfois comme un blanc : on tolère l'absence d'un tiret.
    const loose = new RegExp(`(?:^|[^0-9])${tokens.filter(token => token !== '-').map(token => token.replace('*', '')).join('(?: -)* (?:- )*')}\\*?(?:[^0-9]|$)`);
    const text = unpadded[record.physicalPage - 1] || '';
    const at = text.includes(row) ? text.indexOf(row) : loose.exec(text)?.index ?? -1;
    if (at >= 0) checked += 1;
    else { failures += 1; console.error(`ÉCART ${book} p.${record.physicalPage} ${record.id} ${record.name} : ${row}`); }
    if (at >= 0) {
      const gaps = completenessGaps(record, blockAfter(text, at), catalogue);
      if (gaps.talents.length || gaps.skills.length) gaps_.push({ id: record.id, name: record.name, page: record.physicalPage, ...gaps });
    }
    // Compétences : chaque nom et chaque valeur gardés doivent figurer sur la page (aucune valeur inventée) ; avertissement seulement.
    for (const skill of record.skills || []) {
      const spec = /\((.+)\)$/.exec(skill.name)?.[1];
      const forms = [`${skill.name} ${skill.value}`, spec && `${spec} ${skill.value}`].filter(Boolean);
      if (!forms.some(form => text.includes(form))) { skillWarnings += 1; console.error(`avertissement ${book} ${record.id} ${record.name} : compétence « ${skill.name} ${skill.value} » absente du texte brut de la page`); }
    }
  }
  writeFileSync(`tmp/divin/bestiary-completude-${book}.json`, `${JSON.stringify({ book, profils: data.profiles.length, manques: gaps_ }, null, 1)}
`);
  totals[book] = { profils: gaps_.length, talents: gaps_.reduce((n, g) => n + g.talents.length, 0), competences: gaps_.reduce((n, g) => n + g.skills.length, 0) };
  console.log(`${book} : ${checked}/${data.profiles.length - skipped.length} lignes de valeurs retrouvées dans le texte brut ; non contrôlables : ${skipped.length}${skipped.length ? ` (${skipped.slice(0, 4).join(', ')}…)` : ''}`);
}
console.log(`complétude (profils incomplets, talents manquants, compétences manquantes) : ${JSON.stringify(totals)}`);
console.log(`avertissements de compétences : ${skillWarnings}`);
process.exitCode = failures ? 1 : 0;
