// Synthèse du journal d'évaluation de GLM 5.3 : node tools/glm-eval-summary.mjs
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const logFlagIndex = process.argv.indexOf('--log');
const path = logFlagIndex !== -1 && process.argv[logFlagIndex + 1]
  ? resolve(process.argv[logFlagIndex + 1])
  : resolve(dirname(fileURLToPath(import.meta.url)), '../docs/divin/GLM_EVALUATION.json');
const log = JSON.parse(readFileSync(path, 'utf8'));
const median = values => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const sum = values => values.filter(Number.isFinite).reduce((total, value) => total + value, 0);
const glmTaskCostEur = task => Number.isFinite(task.b2_cout_reel_eur)
  ? task.b2_cout_reel_eur
  : (Number.isFinite(task.b2_cout_usd) ? task.b2_cout_usd * 0.92 / 7 : NaN);
const b1 = task => Array.isArray(task.contexte_orchestrateur_avant_apres) ? task.contexte_orchestrateur_avant_apres[1] - task.contexte_orchestrateur_avant_apres[0]
  : (Number.isFinite(task.b1_avant) && Number.isFinite(task.b1_apres)) ? task.b1_avant - task.b1_apres : null;
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
  if (voie === 'glm') {
    const note = log.cout_reel_note_20_10_soir ?? log.cout_reel_note ?? log.cout_reel_note_20_10;
    console.log(`  B2 coût plafond cumulé : ${sum(rows.map(task => task.b2_cout_usd)).toFixed(2)} USD (coût réel estimé des tâches : ${sum(rows.map(glmTaskCostEur)).toFixed(2)} €${note ? ` ; coût réel cumulé connu : ${note}` : ''})`);
  }
  else console.log(`  B2 médian : ${median(rows.map(task => task.b2_tokens))} tokens`);
  console.log(`  Durée de bout en bout médiane : ${median(rows.map(task => task.duree_bout_en_bout_s))} s`);
  console.log(`  Réussite au premier essai : ${rate(rows, task => task.reussite_premier_essai)} % ; code correct du premier coup : ${rate(rows, task => task.code_correct_premier_essai)} %`);
  console.log(`  Erreurs imputables à l'orchestrateur : ${sum(rows.map(task => (task.erreurs_orchestrateur || []).length))}`);
  console.log(`  Itérations moyennes : ${(sum(rows.map(task => task.iterations)) / rows.length).toFixed(2)}`);
  console.log(`  Reprises par Claude : ${rows.filter(task => task.reprise).length}`);
  console.log(`  Tâches avec hors-périmètre : ${rows.filter(task => (task.hors_perimetre || []).length).length}`);
  console.log(`  Lignes livrées : ${lines} ; retouchées par Claude : ${sum(rows.map(task => task.lignes_retouchees_par_claude))}`);
  console.log(`  Défauts trouvés après coup : ${defects.length} (bloquants : ${defects.filter(d => d.gravite === 'bloquant').length})${lines ? ` soit ${(1000 * defects.length / lines).toFixed(1)} pour 1000 lignes` : ''}`);
  console.log(`  Verdict qualité moyen : ${(sum(rows.map(task => parseInt(task.verdict_qualite, 10))) / rows.length).toFixed(1)}/5`);
}
const familles = new Map();
for (const task of log.taches.filter(row => row.voie === 'glm')) {
  const entry = familles.get(task.famille) || { n: 0, ok: 0 };
  entry.n += 1; entry.ok += task.reussite_premier_essai ? 1 : 0;
  familles.set(task.famille, entry);
}
if (familles.size) console.log('\nGLM par famille (réussites au premier essai) : ' + [...familles].map(([name, value]) => `${name} ${value.ok}/${value.n}`).join(' ; '));

// Critères de décision : qualité relative à Sonnet, coût relatif à l'abonnement, efficacité de l'orchestrateur.
const glm = log.taches.filter(task => task.voie === 'glm');
const sonnet = log.taches.filter(task => task.voie === 'sonnet');
if (glm.length) {
  const a = log.abonnement || {};
  const sonnetB2 = median((sonnet.length ? sonnet : reference).map(task => task.b2_tokens ?? task.tokens));
  const extraB1 = (median(glm.map(b1)) ?? 0) - (median(sonnet.map(b1)) ?? 0);
  const saved = Math.max(0, sonnetB2 - Math.max(0, extraB1));
  const glmCost = median(glm.map(task => task.b2_cout_reel_usd ?? task.b2_cout_usd));
  console.log('\nCritères de décision');
  console.log(`  Qualité : premier essai GLM ${rate(glm, t => t.reussite_premier_essai)} % contre Sonnet ${sonnet.length ? rate(sonnet, t => t.reussite_premier_essai) + ' %' : 'non mesuré (aucune tâche Sonnet comparable enregistrée)'}`);
  const sonnetWeeklyDiffs = sonnet
    .map(task => Array.isArray(task.usage_hebdo_avant_apres) && Number.isFinite(task.usage_hebdo_avant_apres[0]) && Number.isFinite(task.usage_hebdo_avant_apres[1])
      ? task.usage_hebdo_avant_apres[1] - task.usage_hebdo_avant_apres[0]
      : NaN)
    .filter(Number.isFinite);
  const sonnetWeekly = sonnetWeeklyDiffs.length ? sum(sonnetWeeklyDiffs) / sonnetWeeklyDiffs.length : null;
  const hasEstimatedGlm = glm.some(task => !Number.isFinite(task.b2_cout_reel_eur) && Number.isFinite(task.b2_cout_usd));
  const glmCostEur = median(glm.map(glmTaskCostEur));
  const glmCostLabel = glmCostEur != null ? `${glmCostEur.toFixed(2)} €${hasEstimatedGlm ? ' (estimation)' : ''}` : 'non mesuré';
  if (Number.isFinite(a.valeur_1pct_hebdo_eur) && Number.isFinite(sonnetWeekly) && Number.isFinite(glmCostEur)) {
    const value = sonnetWeekly * a.valeur_1pct_hebdo_eur;
    console.log(`  Coût : GLM médian ${glmCostLabel} contre valeur du quota hebdomadaire épargné ${value.toFixed(3)} € (${Number(sonnetWeekly.toFixed(2))} pt de % hebdo en moyenne sur ${sonnetWeeklyDiffs.length} tâche(s) mesurée(s) × ${a.valeur_1pct_hebdo_eur} €, seuil ${a.seuil_rentabilite}) : ${glmCostEur <= a.seuil_rentabilite * value ? 'RENTABLE' : 'NON RENTABLE'}`);
  } else console.log(`  Coût : GLM médian ${glmCostLabel} ; points de % hebdo d'une tâche Sonnet comparable : ${sonnetWeekly != null ? `${Number(sonnetWeekly.toFixed(2))} en moyenne (${sonnetWeeklyDiffs.length} tâche(s) mesurée(s))` : 'non mesuré'} (1 % hebdo vaut ${a.valeur_1pct_hebdo_eur} €)`);
  console.log(`  Fenêtre de 5 h : GLM médian ${median(glm.map(t => t.usage_5h_avant_apres?.[1] - t.usage_5h_avant_apres?.[0]))} pt contre Sonnet ${median(sonnet.map(t => t.usage_5h_avant_apres?.[1] - t.usage_5h_avant_apres?.[0])) ?? 'non mesuré'} pt`);
  console.log(`  Orchestrateur : B1 médian GLM ${median(glm.map(b1))} contre Sonnet ${sonnet.length ? median(sonnet.map(b1)) : 'non mesuré'}`);
}
