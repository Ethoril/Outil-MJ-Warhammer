import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), '../tools/glm-eval-summary.mjs');

function runSummaryWithLog(logData) {
  const dir = mkdtempSync(join(tmpdir(), 'glm-eval-test-'));
  try {
    const logPath = join(dir, 'fake-eval.json');
    writeFileSync(logPath, JSON.stringify(logData, null, 2), 'utf8');
    return execFileSync(process.execPath, [scriptPath, '--log', logPath], { encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('glm-eval-summary : coût estimé b2_cout_usd * 0.92 / 7, moyenne hebdo Sonnet avec nombre de tâches mesurées, et coût réel cumulé connu', () => {
  const fakeLog = {
    abonnement: {
      valeur_1pct_hebdo_eur: 0.1,
      seuil_rentabilite: 0.5
    },
    reference_sonnet_b2: [
      { tache: 'ref-1', tokens: 100000, duree_s: 300 }
    ],
    cout_reel_note_20_10_soir: '17,03 EUR cumulés (console Mistral)',
    taches: [
      {
        id: 'glm-estime',
        voie: 'glm',
        famille: 'module-effets',
        b2_cout_usd: 0.7, // 0.7 * 0.92 / 7 = 0.092 EUR (estimé)
        b2_cout_reel_eur: null,
        duree_bout_en_bout_s: 60,
        reussite_premier_essai: true,
        code_correct_premier_essai: true,
        iterations: 0,
        lignes_livrees: 20,
        lignes_retouchees_par_claude: 0,
        reprise: false,
        verdict_qualite: '5'
      },
      {
        id: 'sonnet-1',
        voie: 'sonnet',
        famille: 'module-effets',
        b2_tokens: 50000,
        usage_hebdo_avant_apres: [10, 10], // 0 pt
        duree_bout_en_bout_s: 50,
        reussite_premier_essai: true,
        code_correct_premier_essai: true,
        iterations: 0,
        lignes_livrees: 10,
        lignes_retouchees_par_claude: 0,
        reprise: false,
        verdict_qualite: '5'
      },
      {
        id: 'sonnet-2',
        voie: 'sonnet',
        famille: 'module-effets',
        b2_tokens: 60000,
        usage_hebdo_avant_apres: [10, 10], // 0 pt
        duree_bout_en_bout_s: 55,
        reussite_premier_essai: true,
        code_correct_premier_essai: true,
        iterations: 0,
        lignes_livrees: 12,
        lignes_retouchees_par_claude: 0,
        reprise: false,
        verdict_qualite: '5'
      },
      {
        id: 'sonnet-3',
        voie: 'sonnet',
        famille: 'module-effets',
        b2_tokens: 140000,
        usage_hebdo_avant_apres: [10, 16], // 6 pt -> médiane serait 0, mais moyenne = (0+0+6)/3 = 2 pt
        duree_bout_en_bout_s: 120,
        reussite_premier_essai: true,
        code_correct_premier_essai: true,
        iterations: 0,
        lignes_livrees: 40,
        lignes_retouchees_par_claude: 0,
        reprise: false,
        verdict_qualite: '5'
      },
      {
        id: 'sonnet-non-mesuree',
        voie: 'sonnet',
        famille: 'autre',
        b2_tokens: null,
        usage_hebdo_avant_apres: [null, null],
        duree_bout_en_bout_s: null,
        reussite_premier_essai: false,
        code_correct_premier_essai: true,
        iterations: 0,
        lignes_livrees: 5,
        lignes_retouchees_par_claude: 0,
        reprise: true,
        verdict_qualite: '4'
      }
    ]
  };

  const out = runSummaryWithLog(fakeLog);

  // 1. Coût réel cumulé connu (champ de note) à côté du plafond cumulé
  assert.match(out, /B2 coût plafond cumulé : 0\.70 USD.*17,03 EUR cumulés \(console Mistral\)/);

  // 2. Coût réel estimé d'une tâche GLM via b2_cout_usd * 0.92 / 7 (= 0.092 -> 0.09 €) affiché comme estimation
  assert.match(out, /GLM médian 0\.09 € \(estimation\)/);

  // 3. Moyenne des points hebdomadaires Sonnet ((0 + 0 + 6) / 3 = 2 pt sur 3 tâches mesurées) et non médiane (0 pt)
  assert.match(out, /2 pt de % hebdo.*3 tâche\(s\) mesurée\(s\)/);
  assert.match(out, /\bRENTABLE\b/);
  assert.doesNotMatch(out, /NON RENTABLE/);
});

test('glm-eval-summary : privilégie b2_cout_reel_eur quand il est renseigné', () => {
  const fakeLog = {
    abonnement: {
      valeur_1pct_hebdo_eur: 0.1,
      seuil_rentabilite: 0.5
    },
    reference_sonnet_b2: [
      { tache: 'ref-1', tokens: 100000, duree_s: 300 }
    ],
    cout_reel_note_20_10_soir: '0,25 EUR cumulés',
    taches: [
      {
        id: 'glm-reel',
        voie: 'glm',
        famille: 'module-effets',
        b2_cout_usd: 3.5, // fallback donnerait 0.46 €, mais b2_cout_reel_eur = 0.25 € doit primer
        b2_cout_reel_eur: 0.25,
        duree_bout_en_bout_s: 60,
        reussite_premier_essai: true,
        code_correct_premier_essai: true,
        iterations: 0,
        lignes_livrees: 15,
        lignes_retouchees_par_claude: 0,
        reprise: false,
        verdict_qualite: '5'
      },
      {
        id: 'sonnet-1',
        voie: 'sonnet',
        famille: 'module-effets',
        b2_tokens: 50000,
        usage_hebdo_avant_apres: [20, 22], // 2 pt sur 1 tâche mesurée
        duree_bout_en_bout_s: 50,
        reussite_premier_essai: true,
        code_correct_premier_essai: true,
        iterations: 0,
        lignes_livrees: 10,
        lignes_retouchees_par_claude: 0,
        reprise: false,
        verdict_qualite: '5'
      }
    ]
  };

  const out = runSummaryWithLog(fakeLog);
  assert.match(out, /GLM médian 0\.25 € contre/);
  assert.doesNotMatch(out, /0\.25 € \(estimation\)/);
  assert.match(out, /2 pt de % hebdo.*1 tâche\(s\) mesurée\(s\)/);
  assert.match(out, /NON RENTABLE/);
});
