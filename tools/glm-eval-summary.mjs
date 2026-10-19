// Synthèse du journal d'évaluation de GLM 5.3 : node tools/glm-eval-summary.mjs
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const path = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/divin/GLM_EVALUATION.json');
const log = JSON.parse(readFileSync(path, 'utf8'));
const median = values => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const sum = values => values.filter(Number.isFinite).reduce((total, value) => total + value, 0);
const b1 = task => (Number.isFinite(task.b1_avant) && Number.isFinite(task.b1_apres)) ? task.b1_avant - task.b1_apres : null;
const rate = (items, predicate) => items.length ? Math.round(100 * items.filter(predicate).length / items.length) : null;

const reference = log.reference_sonnet_b2;
console.log(`Référence Sonnet (${reference.length} tâches) : B2 médian ${median(reference.map(row => row.tokens))} tokens, durée médiane ${median(reference.map(row => row.duree_s))} s`);

for (const voie of ['glm', 'sonnet', 'direct']) {
  const rows = log.taches.filter(task => task.voie === voie);
  if (!rows.length) { console.log(`\nVoie ${voie} : aucune tâche enregistrée.`); continue; }
  const defects = rows.flatMap(task => task.defauts_trouves_apres || []);
  const lines = sum(rows.map(task => task.lignes_livrees));
  console.log(`\nVoie ${voie} : ${rows.length} tâche(s)`);
  console.log(`  B1 médian (orchestrateur) : ${median(rows.map(b1))} tokens`);
  if (voie === 'glm') console.log(`  B2 coût plafond cumulé : ${sum(rows.map(task => task.b2_cout_usd)).toFixed(2)} USD (réel : ${sum(rows.map(task => task.b2_cout_reel_usd)).toFixed(2)} USD)`);
  else console.log(`  B2 médian : ${median(rows.map(task => task.b2_tokens))} tokens`);
  console.log(`  Durée de bout en bout médiane : ${median(rows.map(task => task.duree_bout_en_bout_s))} s`);
  console.log(`  Réussite au premier essai : ${rate(rows, task => task.reussite_premier_essai)} %`);
  console.log(`  Itérations moyennes : ${(sum(rows.map(task => task.iterations)) / rows.length).toFixed(2)}`);
  console.log(`  Reprises par Claude : ${rows.filter(task => task.reprise).length}`);
  console.log(`  Tâches avec hors-périmètre : ${rows.filter(task => (task.hors_perimetre || []).length).length}`);
  console.log(`  Lignes livrées : ${lines} ; retouchées par Claude : ${sum(rows.map(task => task.lignes_retouchees_par_claude))}`);
  console.log(`  Défauts trouvés après coup : ${defects.length} (bloquants : ${defects.filter(d => d.gravite === 'bloquant').length})${lines ? ` soit ${(1000 * defects.length / lines).toFixed(1)} pour 1000 lignes` : ''}`);
  console.log(`  Verdict qualité moyen : ${(sum(rows.map(task => Number(task.verdict_qualite))) / rows.length).toFixed(1)}/5`);
}
const familles = new Map();
for (const task of log.taches.filter(row => row.voie === 'glm')) {
  const entry = familles.get(task.famille) || { n: 0, ok: 0 };
  entry.n += 1; entry.ok += task.reussite_premier_essai ? 1 : 0;
  familles.set(task.famille, entry);
}
if (familles.size) console.log('\nGLM par famille (réussites au premier essai) : ' + [...familles].map(([name, value]) => `${name} ${value.ok}/${value.n}`).join(' ; '));
