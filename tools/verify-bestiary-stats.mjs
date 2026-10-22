/**
 * Contrôle indépendant des chiffres d'un livre : relit le texte BRUT (ordre de lecture, sans mise en page) des PDF et vérifie que la
 * suite des 12 valeurs de chaque profil de js/data/bestiary/<livre>.json y figure, sur la bonne page.
 *   node tools/verify-bestiary-stats.mjs L06 [L11 …]
 * Les gabarits (cases vides) et les profils transcrits à la main sont signalés « non contrôlables », pas acceptés en silence.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { corpusBooks } from './lib/bestiary-extract.mjs';

const KEYS = ['M', 'CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'];
let failures = 0;
let skillWarnings = 0;
for (const book of process.argv.slice(2)) {
  const data = JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8'));
  const meta = corpusBooks().find(item => item.id === book);
  const pages = execFileSync('pdftotext', [meta.path, '-'], { maxBuffer: 1 << 28 }).toString('utf8').split('\f')
    .map(page => page.replace(/[­−–—�]/g, '-').replace(/\*/g, '').replace(/\s+/g, ' '));
  let checked = 0;
  const skipped = [];
  for (const record of data.profiles) {
    if (record.kind !== 'profile' || record.blockKey?.endsWith(':manual')) { skipped.push(`${record.id} ${record.name} (${record.kind})`); continue; }
    const tokens = [...KEYS.map(key => (record.stats[key] === null ? '-' : String(record.stats[key]))), String(record.wounds)];
    const row = tokens.join(' ');
    // Une case vide perdue à l'extraction brute s'écrit parfois comme un blanc : on tolère l'absence d'un tiret.
    const loose = new RegExp(`(?:^|[^0-9])${tokens.filter(token => token !== '-').map(token => token.replace('*', '')).join('(?: -)* (?:- )*')}\\*?(?:[^0-9]|$)`);
    const text = pages[record.physicalPage - 1] || '';
    if (text.includes(row) || loose.test(text)) checked += 1;
    else { failures += 1; console.error(`ÉCART ${book} p.${record.physicalPage} ${record.id} ${record.name} : ${row}`); }
    // Compétences : chaque nom et chaque valeur gardés doivent figurer sur la page (aucune valeur inventée) ; avertissement seulement.
    for (const skill of record.skills || []) {
      const spec = /\((.+)\)$/.exec(skill.name)?.[1];
      const forms = [`${skill.name} ${skill.value}`, spec && `${spec} ${skill.value}`].filter(Boolean);
      if (!forms.some(form => text.includes(form))) { skillWarnings += 1; console.error(`avertissement ${book} ${record.id} ${record.name} : compétence « ${skill.name} ${skill.value} » absente du texte brut de la page`); }
    }
  }
  console.log(`${book} : ${checked}/${data.profiles.length - skipped.length} lignes de valeurs retrouvées dans le texte brut ; non contrôlables : ${skipped.length}${skipped.length ? ` (${skipped.slice(0, 4).join(', ')}…)` : ''}`);
}
console.log(`avertissements de compétences : ${skillWarnings}`);
process.exitCode = failures ? 1 : 0;
