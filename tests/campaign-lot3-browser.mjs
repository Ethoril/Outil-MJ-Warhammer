import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { expect } from 'playwright/test';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const base = '/Outil-MJ-Warhammer/';

const server = createStaticServer({ root, base, headers: { 'Cache-Control': 'no-store' } });

await new Promise(resolveServer => server.listen(0, '127.0.0.1', resolveServer));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}${base}`;
const browser = await launchBrowser();

const person = (id, name, kind = 'PJ', extra = {}) => ({
  id, name, kind, camp: kind === 'PJ' ? 'pj' : 'ennemi', zone: 'active',
  initiative: id === 'hero' ? 60 : 30, hp: 20, maxHp: 20,
  caracs: { CC: 60, CT: 50, F: 40, E: 30, BE: 3, I: 40, Ag: 35, Dex: 35, Int: 30, FM: 35, Soc: 25 },
  skills: [{ id: 'dodge', name: 'Esquive', status: 'resolved', total: 45, carac: 'Ag' }],
  talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: {} },
  ...extra
});

const hero = person('hero', 'Héros', 'PJ', {
  caracs: { CC: 60, CT: 50, F: 40, E: 30, BE: 3, I: 40, Ag: 35, Dex: 35, Int: 50, FM: 35, Soc: 25 },
  skills: [
    { id: 'dodge', name: 'Esquive', status: 'resolved', total: 45, carac: 'Ag' },
    { id: 'heal', name: 'Guérison', status: 'resolved', total: 60, carac: 'Int', advances: 10 }
  ]
});

function fixture() {
  return {
    schemaVersion: 3,
    reserve: [],
    diceLines: [],
    log: [],
    combat: {
      round: 1,
      currentActorId: 'hero',
      order: ['hero', 'wounded'],
      participants: [
        hero,
        person('wounded', 'Blessé', 'PJ', {
          hp: 4, maxHp: 14,
          skills: [
            { id: 'dodge', name: 'Esquive', status: 'resolved', total: 45, carac: 'Ag' },
            { id: 'endurance', name: 'Résistance', status: 'resolved', total: 30, carac: 'E' }
          ],
          extensions: {
            v5: {
              criticalAftermath: [
                {
                  id: 'crit-w1',
                  effectName: 'Entaille au bras',
                  location: 'Bras gauche',
                  criticalWoundId: 'cut-arm',
                  sequela: { durableEffects: [] }
                }
              ]
            }
          }
        })
      ]
    },
    extensions: {
      v5: {
        combatId: 'campaign-lot3-browser',
        turnIndex: 1
      }
    }
  };
}

try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });

  const load = async state => page.evaluate(async s => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    await Store.ready;
    await Store.loadFromJSON(s);
  }, state);

  const read = async () => page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    return JSON.parse(Store.getFullJSON());
  });

  await load(fixture());

  // 1. Navigation depuis Jouer vers Campagne via le lien dans Suites de combat
  await page.locator('#tab-combat').click();
  const combatRoot = page.locator('#workspace-root');
  const aftermathDetails = combatRoot.locator('details.workspace-aftermath');
  await aftermathDetails.locator(':scope > summary').click();
  const linkToCampaign = aftermathDetails.locator('.workspace-aftermath-link');
  await expect(linkToCampaign).toBeVisible();
  await linkToCampaign.click();

  // Vérifier qu'on est basculé dans l'espace Campagne
  const campaignTab = page.locator('#tab-campaign');
  await expect(campaignTab).toHaveAttribute('aria-selected', 'true');
  const campaignSection = page.locator('#workspace-campaign');
  await expect(campaignSection).toBeVisible();

  // 2. Vérification visuelle, polices, couleurs et responsive
  const heading = campaignSection.locator('h2');
  await expect(heading).toHaveText('Campagne');
  const headingFont = await heading.evaluate(el => getComputedStyle(el).fontFamily);
  assert.ok(/Georgia|serif/i.test(headingFont), `Police Georgia ou serif attendue pour les titres : ${headingFont}`);

  const clockBar = campaignSection.locator('.campaign-clock');
  await expect(clockBar).toBeVisible();
  await expect(clockBar).toContainText('0 s');
  await expect(clockBar).toContainText('Convalescence : jour 0');

  for (const width of [1440, 900, 520]) {
    await page.setViewportSize({ width, height: 900 });
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    assert.ok(noOverflow, `Débordement horizontal à ${width}px`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  // 3. Ouvrir un suivi de critique depuis Campagne
  const tasks = campaignSection.locator('.campaign-tasks');
  await expect(tasks).toContainText('Entaille au bras');
  // Sélectionner le personnage blessé
  const woundedBtn = campaignSection.locator('[data-campaign-person="wounded"]');
  await woundedBtn.click();
  await expect(woundedBtn).toHaveAttribute('aria-pressed', 'true');

  const detail = campaignSection.locator('.campaign-detail');
  await expect(detail).toContainText('Blessé');
  await expect(detail).toContainText('4 / 14 PV');

  // La proposition de critique est disponible dans le détail
  const proposalSummary = detail.locator('summary', { hasText: 'Critiques à suivre (1)' });
  await proposalSummary.click();
  const openCritBtn = detail.getByRole('button', { name: /^Ouvrir le suivi de/ });
  await expect(openCritBtn).toBeVisible();
  await openCritBtn.click();

  // Le suivi est ouvert dans le registre
  await page.waitForFunction(() => /suivi des séquelles|Enregistré/.test(document.querySelector('.workspace-aftermath-status')?.textContent || ''));
  let saved = await read();
  assert.equal(saved.extensions.v5.aftermathRegister.incidents.length, 1);

  // 4. Soin de blessure depuis Campagne
  const treatmentSummary = detail.locator('details', { hasText: 'Guérison' }).first();
  await treatmentSummary.locator('summary').click();
  await treatmentSummary.getByLabel('Soigneur').selectOption({ label: 'Héros' });
  await treatmentSummary.getByLabel('Compétence').selectOption({ index: 0 });
  await treatmentSummary.getByLabel(/^d100/).fill('25');
  await treatmentSummary.getByLabel('Fournitures médicales disponibles').check();
  await treatmentSummary.getByRole('button', { name: 'Enregistrer le Test de soin' }).click();

  // Statut affiché et PV augmentés
  await page.waitForFunction(() => /Blessure\(s\) rendue\(s\)/.test(document.querySelector('.workspace-aftermath-status')?.textContent || ''));
  const statusText = await detail.locator('.workspace-aftermath-status').innerText();
  assert.match(statusText, /Enregistré.*d100 25 contre 60 : réussite/);
  saved = await read();
  const updatedWounded = saved.combat.participants.find(p => p.id === 'wounded');
  assert.ok(updatedWounded.hp > 4, `Les PV doivent avoir augmenté (actuel: ${updatedWounded.hp})`);

  // 4b. Traitement d'une infection depuis Campagne
  await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    const state = JSON.parse(Store.getFullJSON());
    const inc = state.extensions.v5.aftermathRegister.incidents[0];
    inc.infection = true;
    await Store.loadFromJSON(state);
  });

  await expect(detail.locator('.campaign-detail-followups')).toContainText('Infection active');

  const infectionDetails = detail.locator('details', { hasText: 'Traiter l’infection' }).first();
  await expect(infectionDetails).toBeVisible();
  await infectionDetails.locator('summary').click();

  const remedyCheckbox = infectionDetails.getByLabel('Remède adapté obtenu (sans Test)');
  await expect(remedyCheckbox).toBeVisible();
  await remedyCheckbox.check();
  await infectionDetails.getByRole('button', { name: 'Enregistrer le traitement' }).click();

  await page.waitForFunction(() => /Infection traitée|infection|Enregistré/.test(document.querySelector('.workspace-aftermath-status')?.textContent || ''));
  saved = await read();
  const treatedIncident = saved.extensions.v5.aftermathRegister.incidents[0];
  assert.equal(treatedIncident.infection, false, 'L’incident ne doit plus avoir d’infection active');

  // 5. Avance du temps par le dialogue de campagne
  const advanceBtn = campaignSection.getByRole('button', { name: 'Avancer le temps…' });
  await advanceBtn.click();
  const timeDialog = page.getByRole('dialog', { name: 'Temps de campagne' });
  await expect(timeDialog).toBeVisible();

  await timeDialog.getByLabel('Durée écoulée').fill('2');
  await timeDialog.getByLabel('Unité de durée').selectOption('days');
  await timeDialog.getByLabel('Motif MJ').fill('Repos à l’auberge');
  await timeDialog.getByRole('button', { name: 'Avancer le temps', exact: true }).click();
  await expect(timeDialog).toBeHidden();

  // Le temps et la convalescence ont avancé ensemble
  await expect(clockBar).toContainText('Convalescence : jour 2');
  saved = await read();
  assert.equal(saved.extensions.v5.aftermathRegister.calendar.currentDay, 2);

  // Undo annule le temps et la convalescence
  await page.locator('#btn-undo').click();
  await expect(clockBar).toContainText('Convalescence : jour 0');
  saved = await read();
  assert.equal(saved.extensions.v5.aftermathRegister.calendar.currentDay, 0);
  assert.equal(saved.extensions.v5.gameClock?.campaignSeconds, 0);

  // Redo rétablit le temps et la convalescence
  await page.locator('#btn-menu').click();
  const redoBtn = page.locator('#btn-redo');
  await expect(redoBtn).toBeEnabled();
  await redoBtn.click();
  await expect(clockBar).toContainText('Convalescence : jour 2');
  saved = await read();
  assert.equal(saved.extensions.v5.aftermathRegister.calendar.currentDay, 2, 'Redo doit rétablir la convalescence au jour 2');
  assert.equal(saved.extensions.v5.gameClock?.campaignSeconds, 172800, 'Redo doit rétablir le temps à 172800 s (2 jours)');

  // 5b. Saisies, focus et champs jumeaux réels de production
  // Charger une maladie active sur 'wounded' pour disposer de deux copies réelles du formulaire de soin
  await load({
    ...saved,
    extensions: {
      ...saved.extensions,
      v5: {
        ...saved.extensions.v5,
        aftermathRegister: {
          ...saved.extensions.v5.aftermathRegister,
          diseases: [
            {
              id: 'disease:rot',
              participantId: 'wounded',
              label: 'Fièvre des marais',
              remainingDays: 4,
              status: 'active',
              careLog: []
            }
          ]
        }
      }
    }
  });

  // Déplier les maladies dans le détail
  const detailDiseases = detail.locator('details.workspace-aftermath-diseases');
  await detailDiseases.locator(':scope > summary').click();
  await expect(detailDiseases).toHaveAttribute('open', '');

  // Déplier les opérations générales en bas
  const globalDetails = campaignSection.locator('.campaign-global-details');
  await globalDetails.locator(':scope > summary').click();
  await expect(globalDetails).toHaveAttribute('open', '');

  // Déplier les maladies dans la section générale
  const globalDiseases = globalDetails.locator('details.workspace-aftermath-diseases');
  await globalDiseases.locator(':scope > summary').click();
  await expect(globalDiseases).toHaveAttribute('open', '');

  // Identifier les deux copies réelles du formulaire de soin de la maladie 'disease:rot'
  const twinDetailMod = detail.locator('input[name="care-disease:rot-difficulty"]');
  const twinGlobalMod = campaignSection.locator('.campaign-global-section input[name="care-disease:rot-difficulty"]');
  const twinDetailRested = detail.locator('input[name="care-disease:rot-rested"]');
  const twinGlobalRested = campaignSection.locator('.campaign-global-section input[name="care-disease:rot-rested"]');

  await expect(twinDetailMod).toBeVisible();
  await expect(twinGlobalMod).toBeVisible();

  // Test 1 : Synchronisation immédiate des copies réelles AVANT tout re-rendu (évite toute divergence temporaire)
  await twinDetailMod.focus();
  await twinDetailMod.fill('3');
  // La copie jumelle dans la section générale doit avoir immédiatement reçu '3'
  await expect(twinGlobalMod).toHaveValue('3');

  // Modification dans l'autre sens : saisie dans la section générale
  await twinGlobalMod.focus();
  await twinGlobalMod.fill('-1');
  // La copie du détail doit avoir immédiatement reçu '-1'
  await expect(twinDetailMod).toHaveValue('-1');

  // Synchronisation des cases à cocher réelles
  await twinDetailRested.uncheck();
  await expect(twinGlobalRested).not.toBeChecked();

  // Test de synchronisation du soigneur et de ses compétences entre les formulaires jumeaux
  const twinDetailHealer = detail.locator('select[name="care-disease:rot-healer"]');
  const twinGlobalHealer = campaignSection.locator('.campaign-global-section select[name="care-disease:rot-healer"]');
  const twinDetailSkill = detail.locator('select[name="care-disease:rot-skill"]');
  const twinGlobalSkill = campaignSection.locator('.campaign-global-section select[name="care-disease:rot-skill"]');

  await expect(twinDetailSkill).toContainText('—');
  await expect(twinGlobalSkill).toContainText('—');

  // Sélection du Héros dans le détail
  await twinDetailHealer.selectOption('hero');

  // La section générale doit synchroniser immédiatement le soigneur ET les compétences associées
  await expect(twinGlobalHealer).toHaveValue('hero');
  await expect(twinDetailSkill).toContainText('Guérison (60)');
  await expect(twinGlobalSkill).toContainText('Guérison (60)');
  const selectedDetailSkill = await twinDetailSkill.inputValue();
  const selectedGlobalSkill = await twinGlobalSkill.inputValue();
  assert.ok(selectedDetailSkill && selectedDetailSkill !== '', 'Une compétence doit être sélectionnée dans le détail');
  assert.equal(selectedDetailSkill, selectedGlobalSkill, 'La sélection de compétence doit être synchronisée entre détail et général');

  // Test 2 : Déclenchement d'un VRAI re-rendu de production et préservation du focus contextuel
  // Mettre explicitement le focus sur le champ dans la section globale
  await twinGlobalMod.focus();
  await page.evaluate(() => {
    document.activeElement.dataset.renderTestMarker = 'active-node-before';
  });

  // Déclencher un vrai re-rendu de production via l'événement 'combat' du Bus
  await page.evaluate(async () => {
    const { Bus } = await import('/Outil-MJ-Warhammer/js/ui/bus.js');
    Bus.emit('combat');
  });

  // Confirmer que le nœud DOM a bien été détruit et reconstruit par le re-rendu
  await page.waitForFunction(() => !document.querySelector('[data-render-test-marker="active-node-before"]'));

  // Vérifier que le focus a été fidèlement restauré dans la section globale (et ne s'est pas téléporté dans le détail)
  const activeFocusScope = await page.evaluate(() => {
    const el = document.activeElement;
    if (el?.closest('.campaign-global-section') && el?.name === 'care-disease:rot-difficulty') return 'global';
    if (el?.closest('.campaign-detail')) return 'detail';
    return el?.tagName || 'none';
  });
  assert.equal(activeFocusScope, 'global', 'Le focus doit être restauré dans la section globale sur le champ correspondant');

  // Vérifier que les valeurs saisies ont été conservées sur les deux copies réelles après re-rendu
  await expect(detail.locator('input[name="care-disease:rot-difficulty"]')).toHaveValue('-1');
  await expect(campaignSection.locator('.campaign-global-section input[name="care-disease:rot-difficulty"]')).toHaveValue('-1');
  await expect(detail.locator('input[name="care-disease:rot-rested"]')).not.toBeChecked();
  await expect(campaignSection.locator('.campaign-global-section input[name="care-disease:rot-rested"]')).not.toBeChecked();
  await expect(detail.locator('select[name="care-disease:rot-healer"]')).toHaveValue('hero');
  await expect(campaignSection.locator('.campaign-global-section select[name="care-disease:rot-healer"]')).toHaveValue('hero');
  await expect(detail.locator('select[name="care-disease:rot-skill"]')).toContainText('Guérison (60)');
  await expect(campaignSection.locator('.campaign-global-section select[name="care-disease:rot-skill"]')).toContainText('Guérison (60)');

  // 6. Test d'un participant absent (Détail et Section générale)
  await load({
    ...saved,
    extensions: {
      ...saved.extensions,
      v5: {
        ...saved.extensions.v5,
        aftermathRegister: {
          ...saved.extensions.v5.aftermathRegister,
          incidents: [
            {
              id: 'inc-absent-1',
              participantId: 'ghost-participant',
              source: { kind: 'wounds-lost', cause: 'Piège de fosse' },
              injuryDay: 0,
              status: 'open',
              bandaged: false,
              requiresSurgery: false,
              surgeryCompleted: false,
              subjectKind: 'person',
              infection: false,
              dailyChecks: [],
              treatments: []
            }
          ],
          diseases: [
            {
              id: 'disease:ghost',
              participantId: 'ghost-participant',
              label: 'Maladie spectrale',
              remainingDays: 3,
              status: 'active',
              careLog: []
            }
          ],
          sequelae: [
            {
              id: 'seq:ghost',
              participantId: 'ghost-participant',
              kind: 'broken-bone',
              status: 'open',
              label: 'Fracture spectrale',
              phase: 'healing',
              immobilization: { state: 'none', attempts: [] }
            }
          ]
        }
      }
    }
  });

  // S'assurer que les sections générales sont dépliées
  if (!await globalDetails.evaluate(el => el.open)) {
    await globalDetails.locator(':scope > summary').click();
  }
  if (!await globalDiseases.evaluate(el => el.open)) {
    await globalDiseases.locator(':scope > summary').click();
  }
  const ghostDiseaseCard = globalDetails.locator('.workspace-aftermath-disease', { hasText: 'Maladie spectrale' });
  await expect(ghostDiseaseCard).toBeVisible();
  await expect(ghostDiseaseCard).toContainText('Ancien suivi sans personnage : consultation seule.');
  await expect(ghostDiseaseCard.getByRole('button', { name: 'Enregistrer les soins du jour' })).toHaveCount(0);

  const ghostSequelaCard = globalDetails.locator('.workspace-aftermath-sequela', { hasText: 'Fracture spectrale' });
  await expect(ghostSequelaCard).toBeVisible();
  await expect(ghostSequelaCard).toContainText('Ancien suivi sans personnage : consultation seule.');
  await expect(ghostSequelaCard.locator('button')).toHaveCount(0);

  // Vérification dans la colonne de détail pour l'absent
  const absentBtn = campaignSection.locator('[data-campaign-person="ghost-participant"]');
  await expect(absentBtn).toBeVisible();
  await absentBtn.click();
  await expect(detail).toContainText('SUIVI EN CONSULTATION');
  await expect(detail).toContainText('Piège de fosse');
  await expect(detail).toContainText('Ancien suivi sans personnage');

  // Cohérence de l'interface pour un absent :
  // Le bloc d'actions est intitulé 'Archivage du suivi' (et NON 'Soins et décisions disponibles')
  await expect(detail.locator('.campaign-detail-actions-box > h4')).toHaveText('Archivage du suivi');
  // Aucun formulaire de soin ni de maladie n'est proposé dans le détail de l'absent
  await expect(detail.locator('input[name*="disease"]')).toHaveCount(0);
  await expect(detail.getByRole('button', { name: 'Enregistrer le Test de soin' })).toHaveCount(0);

  // Refus effectif par le Store de toute mutation de soin sur le participant absent
  const storeRefusal = await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    const state = Store.getAftermathState();
    return Store.registerAftermathDisease({
      participantId: 'ghost-participant',
      label: 'Fièvre des marais',
      durationDays: 3,
      expectedRevision: state.revision
    });
  });
  assert.equal(storeRefusal.status, 'refused', 'Le Store doit refuser la maladie pour un absent');
  assert.equal(storeRefusal.receipt?.reason, 'unknown-subject', 'Raison attendue : unknown-subject');

  // L'archivage est l'unique action autorisée pour l'incident ouvert de l'absent
  const archiveBtn = detail.getByRole('button', { name: 'Archiver ce suivi' });
  await expect(archiveBtn).toBeVisible();
  await archiveBtn.click();
  await page.waitForFunction(() => /archivé|Enregistré/.test(document.querySelector('.workspace-aftermath-status')?.textContent || ''));

  saved = await read();
  const archivedInc = saved.extensions.v5.aftermathRegister.incidents.find(i => i.id === 'inc-absent-1');
  assert.equal(archivedInc.status, 'archived', 'L’incident de l’absent doit être archivé');

  // Une fois archivé, l'incident ouvert n'est plus présent dans la liste des actions
  await expect(detail.getByRole('button', { name: 'Archiver ce suivi' })).toHaveCount(0);

  // 6b. Préservation des fonctionnalités dans l'onglet Jouer (non-régression Lot 2 / Phase F2) :
  // Le panneau suites de combat de Jouer conserve ses contrôles d'arbitrage pour les séquelles
  const playNavBtn = page.locator('[data-workspace-space="play"]');
  await playNavBtn.click();
  const playAftermath = page.locator('#workspace-play section.workspace-aftermath');
  await expect(playAftermath).toBeVisible();

  // Dans Jouer, la séquelle de fracture n'est pas bridée en consultation seule
  const playGhostSequela = playAftermath.locator('.workspace-aftermath-sequela', { hasText: 'Fracture spectrale' });
  await expect(playGhostSequela).toBeVisible();
  await expect(playGhostSequela).not.toContainText('consultation seule');
  await expect(playGhostSequela.locator('details, button')).not.toHaveCount(0);

  // Retour à Campagne
  const campaignNavBtn = page.locator('#tab-campaign');
  await campaignNavBtn.click();
  await expect(campaignSection).toBeVisible();

  // 7. Vérification thème sombre et contrastes WCAG calculés
  const workspaceEl = campaignSection.locator('.campaign-workspace');
  function parseRGB(rgbStr) {
    const m = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) throw new Error(`Couleur RGB invalide: ${rgbStr}`);
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  function relLuminance([r, g, b]) {
    const srgb = [r, g, b].map(v => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }
  function contrastRatio(rgb1, rgb2) {
    const l1 = relLuminance(parseRGB(rgb1));
    const l2 = relLuminance(parseRGB(rgb2));
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Mode sombre
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const darkBg = await workspaceEl.evaluate(el => getComputedStyle(el).backgroundColor);
  const darkInk = await workspaceEl.evaluate(el => getComputedStyle(el).color);
  assert.equal(darkBg, 'rgb(28, 24, 21)', 'Fond sombre exact #1c1815 attendu');
  assert.equal(darkInk, 'rgb(236, 228, 216)', 'Encre sombre exacte #ece4d8 attendue');

  const darkContrast = contrastRatio(darkInk, darkBg);
  assert.ok(darkContrast >= 11.0, `Contraste texte sombre / fond doit être >= 11:1 (WCAG AAA) : obtenu ${darkContrast.toFixed(2)}:1`);

  const darkRedBadge = campaignSection.locator('.campaign-badge.red').first();
  if (await darkRedBadge.count()) {
    const redBg = await darkRedBadge.evaluate(el => getComputedStyle(el).backgroundColor);
    const redFg = await darkRedBadge.evaluate(el => getComputedStyle(el).color);
    const redRatio = contrastRatio(redFg, redBg);
    assert.ok(redRatio >= 4.5, `Contraste badge rouge sombre >= 4.5:1 (WCAG AA) : obtenu ${redRatio.toFixed(2)}:1`);
  }

  // Mode clair
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const lightBg = await workspaceEl.evaluate(el => getComputedStyle(el).backgroundColor);
  const lightInk = await workspaceEl.evaluate(el => getComputedStyle(el).color);
  assert.equal(lightBg, 'rgb(248, 243, 231)', 'Fond clair exact #f8f3e7 attendu');
  assert.equal(lightInk, 'rgb(52, 42, 36)', 'Encre claire exacte #342a24 attendue');

  const lightContrast = contrastRatio(lightInk, lightBg);
  assert.ok(lightContrast >= 11.0, `Contraste texte clair / fond doit être >= 11:1 (WCAG AAA) : obtenu ${lightContrast.toFixed(2)}:1`);

  const lightRedBadge = campaignSection.locator('.campaign-badge.red').first();
  if (await lightRedBadge.count()) {
    const redBg = await lightRedBadge.evaluate(el => getComputedStyle(el).backgroundColor);
    const redFg = await lightRedBadge.evaluate(el => getComputedStyle(el).color);
    const redRatio = contrastRatio(redFg, redBg);
    assert.ok(redRatio >= 4.5, `Contraste badge rouge clair >= 4.5:1 (WCAG AA) : obtenu ${redRatio.toFixed(2)}:1`);
  }

  assert.deepEqual(errors, [], `Aucune erreur UI attendue : ${errors.join('; ')}`);
  console.log('campaign-lot3-browser : TOUS LES PARCOURS VERTS (navigation, style, soins, temps, absents, dark mode).');
} finally {
  await browser.close();
  await new Promise(resolveServer => server.close(resolveServer));
}
