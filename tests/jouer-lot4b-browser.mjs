import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'playwright/test';
import { launchBrowser } from './helpers/browser.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const mime = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json'
};

function parseRgb(colorStr) {
  const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return [0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function getLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrast(fgStr, bgStr) {
  const l1 = getLuminance(parseRgb(fgStr));
  const l2 = getLuminance(parseRgb(bgStr));
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

function startServer() {
  const server = createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (requestPath === '/blank') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!DOCTYPE html><html><head></head><body><main><div id="mount"></div></main></body></html>');
      return;
    }
    const file = join(root, normalize(requestPath === '/' ? '/index.html' : requestPath));
    try {
      if (!file.startsWith(root) || !statSync(file).isFile()) {
        throw new Error('not found');
      }
      res.writeHead(200, {
        'Content-Type': mime[extname(file)] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(readFileSync(file));
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function main() {
  const { server, port } = await startServer();
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
    await context.route('**/*', route => {
      if (route.request().url().startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
      return route.abort();
    });

    // =========================================================================
    // PARTIE 1 : BANC SIMULÉ (Duel, 3 étapes de résolution, contrastes,
    // rerendu avec maintien du focus, responsive 1440/900/520px)
    // =========================================================================
    const page = await context.newPage();
    page.on('pageerror', err => console.error('Page error:', err));
    await page.goto(`http://127.0.0.1:${port}/blank`);
    await page.setContent('<main><div id="mount"></div></main>');
    await page.addStyleTag({ path: join(root, 'MJ.css') });
    await page.addStyleTag({ path: join(root, 'js/ui/workspace.css') });

    await page.evaluate(async ({ moduleUrl, resolutionUrl }) => {
      const { initWorkspaceView } = await import(moduleUrl);
      const { previewResolution } = await import(resolutionUrl);

      const participants = [
        {
          id: 'actor-1',
          name: 'Elysia Valtieri',
          kind: 'PJ',
          zone: 'active',
          initiative: 58,
          hp: 11,
          maxHp: 12,
          camp: 'pj',
          caracs: { CC: 57, CT: 27, F: 33, E: 28, I: 58, Ag: 45 },
          armor: { head: 1, body: 2, arms: 1, legs: 0 },
          states: ['Élan|1'],
          actions: [
            { id: 'act-1', name: 'Rapière fine', type: 'attack', base: 57, damage: 'BF+4', mod: 0, qualities: ['Rapide'] },
            { id: 'act-2', name: 'Dague de parade', type: 'attack', base: 45, damage: 'BF+2', mod: 0, qualities: [] }
          ]
        },
        {
          id: 'actor-2',
          name: 'Capitaine des Répurgateurs von Klaus',
          kind: 'Créature',
          zone: 'active',
          initiative: 42,
          hp: 14,
          maxHp: 16,
          camp: 'ennemi',
          caracs: { CC: 52, CT: 40, F: 44, E: 45, I: 42, Ag: 38 },
          armor: { head: 2, body: 3, arms: 2, legs: 1 },
          states: [],
          actions: [
            { id: 'act-3', name: 'Épée bâtarde', type: 'attack', base: 52, damage: 'BF+5', mod: 0, qualities: [] }
          ]
        },
        {
          id: 'actor-3',
          name: 'Garde de la milice au nom exceptionnellement long et détaillé pour vérifier la coupure de texte',
          kind: 'Créature',
          zone: 'active',
          initiative: 30,
          hp: 9,
          maxHp: 10,
          camp: 'ennemi',
          caracs: { CC: 35, CT: 25, F: 32, E: 34, I: 30, Ag: 30 },
          armor: { head: 1, body: 1, arms: 0, legs: 0 },
          states: [],
          actions: [
            { id: 'act-4', name: 'Hallebarde', type: 'attack', base: 35, damage: 'BF+4', mod: 0, qualities: [] }
          ]
        }
      ];

      const combat = {
        round: 1,
        turn: 0,
        scene: { id: 'scene-1', title: 'Duel dans les ruines' },
        participants: new Map(participants.map(p => [p.id, p])),
        turnOrder: ['actor-1', 'actor-2', 'actor-3']
      };

      const calls = [];
      const handlers = new Map();
      const Store = {
        getCombat: () => ({ round: combat.round, turn: combat.turn, scene: combat.scene, turnOrder: [...combat.turnOrder] }),
        listParticipants: () => Array.from(combat.participants.values()),
        getTurnIndex: () => combat.turn,
        getRound: () => combat.round,
        getActionClock: () => ({ round: combat.round, turn: combat.turn }),
        listTurnActions: () => [],
        getReactionOpportunities: () => [],
        getDiceLines: () => [],
        listEncounters: () => [],
        getSceneState: () => ({ id: 'scene-1', title: 'Duel dans les ruines' }),
        isCombatRunning: () => true,
        previewResolution: input => previewResolution({ ...input, target: input.targetId ? combat.participants.get(input.targetId) : null }),
        resolveDivineAccess: () => ({ allowed: false, mode: 'denied', grantId: null, reason: 'Aucun divin', needsInput: [] }),
        getDivineAccessGrants: () => [],
        canUndo: () => calls.some(c => c.type === 'apply'),
        undo: () => { calls.push({ type: 'undo' }); return true; }
      };

      const Bus = {
        on(event, fn) { handlers.set(event, fn); }
      };

      window.workspaceTestData = { combat, calls, handlers, Bus };

      initWorkspaceView({
        Store,
        Bus,
        mount: document.querySelector('#mount'),
        actions: {
          adjustHp: payload => { calls.push({ type: 'adjustHp', payload }); },
          applyResolution: payload => { calls.push({ type: 'apply', payload }); },
          declareCombatAction: payload => { calls.push({ type: 'declareAction', payload }); },
          editParticipant: payload => { calls.push({ type: 'editParticipant', payload }); },
          setMomentum: (id, val) => { calls.push({ type: 'setMomentum', id, val }); }
        }
      });
    }, {
      moduleUrl: `http://127.0.0.1:${port}/js/ui/workspace-view.js`,
      resolutionUrl: `http://127.0.0.1:${port}/js/core/resolution.js`
    });

    // Basculer sur l'espace Jouer
    const playTab = page.getByRole('tab', { name: 'Jouer' });
    await playTab.click();
    await expect(page.locator('#workspace-play')).toBeVisible();

    const duel = page.locator('#workspace-play .workspace-duel');
    const actorSheet = page.locator('#workspace-play .workspace-sheet-actor');
    const targetSheet = page.locator('#workspace-play .workspace-sheet-target');
    const resolution = page.locator('#workspace-play .workspace-resolution');

    // 1. Structure duel et fiches
    await expect(duel).toBeVisible();
    await expect(actorSheet).toBeVisible();
    await expect(targetSheet).toBeVisible();

    // Bordures accentuées distinctives
    const actorBorder = await actorSheet.evaluate(el => getComputedStyle(el).borderTopColor);
    const targetBorder = await targetSheet.evaluate(el => getComputedStyle(el).borderTopColor);
    assert.ok(actorBorder, 'Bordure supérieure de l’acteur définie');
    assert.ok(targetBorder, 'Bordure supérieure de la cible définie');
    assert.notEqual(actorBorder, targetBorder, 'L’acteur et la cible ont des liserés supérieurs distincts');

    // Identité, HP et caractéristiques
    await expect(actorSheet.locator('.workspace-sheet-name')).toHaveText('Elysia Valtieri');
    await expect(actorSheet.locator('.workspace-camp')).toContainText('PJ');
    await expect(actorSheet.locator('.workspace-caracs .workspace-carac')).toHaveCount(6);
    await expect(actorSheet.locator('.workspace-carac.is-key')).toHaveCount(1);
    await expect(actorSheet.locator('.silhouette svg')).toBeVisible();

    // 2. Progression en 3 étapes de résolution
    const steps = resolution.locator('.workspace-resolution-step');
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0).locator(':scope > h4')).toContainText('1 · Action et cible');
    await expect(steps.nth(1).locator(':scope > h4')).toContainText('2 · Jets');
    await expect(steps.nth(2).locator(':scope > h4')).toContainText('3 · Résultat');

    // Pied collant (footer)
    const footer = resolution.locator('.workspace-resolution-footer');
    await expect(footer).toBeVisible();
    const footerPos = await footer.evaluate(el => getComputedStyle(el).position);
    assert.equal(footerPos, 'sticky', 'Le pied d’action est en position sticky');

    // Étape 1 : Puces d’action et de cible
    const actionChips = steps.nth(0).locator('.workspace-chip');
    await expect(actionChips.first()).toBeVisible();
    const selectedAction = steps.nth(0).locator('.workspace-chip[aria-pressed="true"]').first();
    await expect(selectedAction).toBeVisible();

    // Étape 2 : Jets d'attaque et défense
    const attackInput = resolution.locator('[data-roll-input="attack"]');
    await expect(attackInput).toBeVisible();
    await expect(steps.nth(1).locator('button[data-focus-key="calculate"]')).toBeVisible();

    // Étape 3 : Résultat après calcul
    await attackInput.fill('24');
    await steps.nth(1).locator('button[data-focus-key="calculate"]').click();
    const resultBox = resolution.locator('.workspace-result');
    await expect(resultBox).toBeVisible();
    await expect(resultBox.locator('.workspace-outcome')).toBeVisible();
    const detailsSummary = resultBox.locator('summary');
    if (await detailsSummary.count()) {
      await detailsSummary.click();
      await expect(resultBox.locator('.workspace-formula')).toBeVisible();
    }

    // Vérifier aperçu des dégâts sur la fiche cible (silhouette + PV après)
    await expect(targetSheet.locator('.workspace-sheet-hp-after')).toBeVisible();
    await expect(targetSheet.locator('.silhouette-zone.is-hit')).toBeVisible();

    // Vérifier aussi les commandes et badges qui ne sont pas toujours présents dans le scénario.
    await page.evaluate(() => {
      const fixture = document.createElement('div');
      fixture.dataset.contrastFixture = '';
      fixture.innerHTML = '<div class="workspace-resolution-step"><div class="workspace-resolution-commands"><button data-focus-key="calculate">Calculer</button></div></div><div class="workspace-resolution-footer"><button data-focus-key="apply">Appliquer</button></div><span class="workspace-roll-owner">Ennemi</span><span class="workspace-roll-owner is-pj">PJ</span>';
      document.querySelector('#workspace-play').appendChild(fixture);
    });
    // 3. Mesures mathématiques de contraste WCAG AA (>= 4.5:1) dans les deux thèmes
    for (const theme of ['light', 'dark-forced', 'dark-system']) {
      if (theme === 'light') {
        await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
        await page.emulateMedia({ colorScheme: 'light' });
      } else if (theme === 'dark-forced') {
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
        await page.emulateMedia({ colorScheme: 'light' });
      } else {
        await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
        await page.emulateMedia({ colorScheme: 'dark' });
      }

      const checks = await page.evaluate(() => {
        const sheet = document.querySelector('#workspace-play .workspace-actor-sheet');
        const sheetName = document.querySelector('#workspace-play .workspace-sheet-name');
        const sheetHp = document.querySelector('#workspace-play .workspace-sheet-hp');
        const caracDt = document.querySelector('#workspace-play .workspace-carac dt');
        const caracDd = document.querySelector('#workspace-play .workspace-carac dd');
        const caracCell = document.querySelector('#workspace-play .workspace-carac');
        const stepHeader = document.querySelector('#workspace-play .workspace-resolution-step > h4');
        const stepCard = document.querySelector('#workspace-play .workspace-resolution-step');
        const chipSelected = document.querySelector('#workspace-play .workspace-chip[aria-pressed="true"]');
        const rollInput = document.querySelector('#workspace-play .workspace-roll-input');
        const resultCard = document.querySelector('#workspace-play .workspace-result');
        const resultLine = document.querySelector('#workspace-play .workspace-result-line');
        const outcome = document.querySelector('#workspace-play .workspace-outcome');
        const applyBtn = document.querySelector('#workspace-play button[data-focus-key="apply"]');
        const fixture = document.querySelector('[data-contrast-fixture]');
        const sample = selector => {
          const el = fixture.querySelector(selector);
          return { color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor };
        };

        return {
          sheetText: { color: getComputedStyle(sheetName).color, bg: getComputedStyle(sheet).backgroundColor },
          sheetHp: { color: getComputedStyle(sheetHp).color, bg: getComputedStyle(sheet).backgroundColor },
          caracDt: { color: getComputedStyle(caracDt).color, bg: getComputedStyle(caracCell).backgroundColor },
          caracDd: { color: getComputedStyle(caracDd).color, bg: getComputedStyle(caracCell).backgroundColor },
          stepHeader: { color: getComputedStyle(stepHeader).color, bg: getComputedStyle(stepCard).backgroundColor },
          chipSelected: { color: getComputedStyle(chipSelected).color, bg: getComputedStyle(chipSelected).backgroundColor },
          rollInput: { color: getComputedStyle(rollInput).color, bg: getComputedStyle(rollInput).backgroundColor },
          resultLine: resultCard ? { color: getComputedStyle(resultLine).color, bg: getComputedStyle(resultCard).backgroundColor } : null,
          outcome: outcome ? { color: getComputedStyle(outcome).color, bg: getComputedStyle(outcome).backgroundColor } : null,
          applyBtn: applyBtn ? { color: getComputedStyle(applyBtn).color, bg: getComputedStyle(applyBtn).backgroundColor } : null,
          calculateFixture: sample('[data-focus-key="calculate"]'),
          applyFixture: sample('[data-focus-key="apply"]'),
          enemyOwnerFixture: sample('.workspace-roll-owner:not(.is-pj)'),
          pjOwnerFixture: sample('.workspace-roll-owner.is-pj')
        };
      });

      for (const [name, pair] of Object.entries(checks)) {
        if (!pair) continue;
        const contrast = getContrast(pair.color, pair.bg);
        assert.ok(
          contrast >= 4.5,
          `Contraste insuffisant (${contrast.toFixed(2)}:1 < 4.5:1) pour ${name} en thème ${theme}`
        );
      }
    }
    await page.locator('[data-contrast-fixture]').evaluate(el => el.remove());

    // Retour au thème clair pour les tests comportementaux
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
    await page.emulateMedia({ colorScheme: 'light' });

    // 4. Maintien du focus et d'une saisie lors d'un rerendu effectif
    const defenseInput = resolution.locator('[data-roll-input="defense"]');
    if (await defenseInput.count()) {
      await defenseInput.fill('48');
      await defenseInput.focus();
      await expect(defenseInput).toBeFocused();

      // Rerendu effectif du composant via le Store/Bus
      await page.evaluate(() => window.workspaceTestData.handlers.get('combat')?.());
      const rerenderedDefense = resolution.locator('[data-roll-input="defense"]');
      await expect(rerenderedDefense).toHaveValue('48');
      await expect(rerenderedDefense).toBeFocused();
    }

    // 5. Sans cible (état empty de la fiche cible)
    await page.evaluate(() => {
      const noneTargetChip = document.querySelector('[data-focus-key="target-none"]');
      if (noneTargetChip) noneTargetChip.click();
    });
    const emptySheet = page.locator('#workspace-play .workspace-actor-sheet.is-empty');
    if (await emptySheet.count()) {
      await expect(emptySheet).toBeVisible();
      await expect(emptySheet).toContainText('Aucune cible');
      const emptyBorderStyle = await emptySheet.evaluate(el => getComputedStyle(el).borderStyle);
      assert.equal(emptyBorderStyle, 'dashed', 'La fiche cible vide arbore une bordure tiretée');
    }

    // 6. Responsive 1440px, 900px, 520px sans dépassement horizontal
    for (const width of [1440, 900, 520]) {
      await page.setViewportSize({ width, height: 800 });
      const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      assert.ok(noOverflow, `Pas de débordement horizontal à ${width}px dans le banc Jouer`);
    }

    await page.close();

    // =========================================================================
    // PARTIE 2 : APPLICATION RÉELLE (index.html, vrai Store, pleine largeur,
    // calcul sans mutation, application unique puis Undo)
    // =========================================================================
    const realPage = await context.newPage();
    realPage.on('pageerror', err => console.error('Real page error:', err));
    await realPage.goto(`http://127.0.0.1:${port}/index.html`);
    await expect(realPage.locator('#app-content')).toBeVisible();

    // Importer une rencontre de test
    await realPage.locator('#tab-prepare').click();
    await realPage.locator('#btn-menu').click();
    await realPage.locator('#app-menu').getByRole('button', { name: 'Importer du texte' }).click();
    const importDialog = realPage.getByRole('dialog');
    await importDialog.getByRole('textbox', { name: 'Texte des profils' }).fill(
      'Nom: Duelliste impérial\nPV: 14\nInitiative: 55\nCC: 50\nF: 35\nAction: Épée | type=attack | base=50 | dégâts=BF+4\n---\nNom: Maraudeur du Chaos\nPV: 16\nInitiative: 20\nCC: 40\nF: 40\nAction: Hache | type=attack | base=40 | dégâts=BF+5'
    );
    await importDialog.getByRole('button', { name: 'Analyser le texte' }).click();
    await importDialog.getByRole('button', { name: 'Importer 2 profils' }).click();
    await expect(importDialog).toBeHidden();

    // Lancer une nouvelle rencontre avec ces deux combattants
    await realPage.locator('#workspace-prepare').getByRole('button', { name: 'Nouvelle rencontre', exact: true }).click();
    const prepOverlay = realPage.getByRole('dialog');
    const profileSelect = prepOverlay.getByRole('combobox', { name: 'Profil' });
    const campSelect = prepOverlay.getByRole('combobox', { name: 'Camp' });
    const zoneSelect = prepOverlay.locator('select').last();

    await profileSelect.selectOption({ label: 'Duelliste impérial (Créature)' });
    await campSelect.selectOption('pj');
    await zoneSelect.selectOption('active');
    await prepOverlay.getByRole('button', { name: 'Ajouter' }).click();

    await profileSelect.selectOption({ label: 'Maraudeur du Chaos (Créature)' });
    await campSelect.selectOption('ennemi');
    await zoneSelect.selectOption('active');
    await prepOverlay.getByRole('button', { name: 'Ajouter' }).click();

    await prepOverlay.getByRole('button', { name: 'Lancer la rencontre' }).last().click();
    const initiative = realPage.locator('dialog.tool-sheet', { hasText: 'Saisissez l’Initiative' });
    await initiative.waitFor({ state: 'visible' });
    const characteristics = initiative.locator('input[name^="characteristic:"]:not([readonly])');
    for (let index = 0; index < await characteristics.count(); index += 1) {
      if (!await characteristics.nth(index).inputValue()) await characteristics.nth(index).fill('40');
    }
    const dice = initiative.locator('input[name^="die:"]:not([readonly])');
    for (let index = 0; index < await dice.count(); index += 1) {
      await dice.nth(index).fill(String(6 - index));
    }
    await initiative.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
    await initiative.getByRole('button', { name: 'Confirmer et appliquer' }).click();
    await expect(prepOverlay).toBeHidden();

    // Aller dans Jouer
    await realPage.locator('#tab-combat').click();
    const playArea = realPage.locator('#workspace-play');
    await expect(playArea).toBeVisible();

    // Mesure de la pleine largeur réelle
    const playBox = await playArea.boundingBox();
    assert.ok(playBox && playBox.width >= 1350, `Jouer occupe la pleine largeur réelle (${playBox?.width}px / 1440px)`);

    // Démarrer le combat si nécessaire
    const startCombatBtn = realPage.locator('#combat-banner').getByRole('button', { name: 'Commencer le combat' });
    if (await startCombatBtn.isVisible()) {
      await startCombatBtn.click();
    }

    // Duel en application réelle
    const realDuel = realPage.locator('#workspace-play .workspace-duel');
    await expect(realDuel).toBeVisible();
    const realActor = realDuel.locator('.workspace-sheet-actor');
    const realTarget = realDuel.locator('.workspace-sheet-target');
    const actorName = await realActor.locator('.workspace-sheet-name').innerText();
    const targetName = await realTarget.locator('.workspace-sheet-name').innerText();
    assert.ok(actorName, 'Nom de l’acteur affiché sur sa fiche');
    assert.ok(targetName, 'Nom de la cible affiché sur sa fiche');
    assert.notEqual(actorName, targetName, 'L’acteur et la cible sont des combattants distincts');

    // Résolution en application réelle : 3 étapes
    const realRes = realPage.locator('#workspace-play .workspace-resolution');
    await expect(realRes.locator('.workspace-resolution-step')).toHaveCount(3);

    // Calcul sans mutation : saisir 25
    const targetHpInitial = await realTarget.locator('.workspace-sheet-hp').innerText();
    const trackBeforeApply = await realPage.locator('.workspace-track').textContent();
    await realRes.locator('[data-roll-input="attack"]').fill('25');
    const readGameState = () => realPage.evaluate(async () => {
      const snapshot = JSON.parse((await import('/js/main.js')).Store.getFullJSON());
      delete snapshot.exportedAt; // horodatage de l'export, pas état de jeu
      return snapshot;
    });
    const stateBeforeCalculate = await readGameState();
    await realRes.getByRole('button', { name: 'Calculer' }).click();

    // Résultat calculé mais aucun PV changé sur la piste
    await expect(realRes.locator('.workspace-result')).toBeVisible();
    const trackDuring = await realPage.locator('.workspace-track').textContent();
    assert.equal(trackDuring, trackBeforeApply, 'Calculer ne mute aucun PV dans le Store ni sur la piste');
    const stateAfterCalculate = await readGameState();
    assert.deepEqual(stateAfterCalculate, stateBeforeCalculate, 'Calculer ne modifie pas l’état exporté du Store');

    // La fiche cible affiche l'aperçu prévisionnel
    await expect(realTarget.locator('.workspace-sheet-hp-after')).toBeVisible();

    // Compléter la défense requise (Maraudeur a CC 40)
    const realDefense = realRes.locator('[data-roll-input="defense"]');
    await expect(realDefense).toBeVisible();
    await realDefense.fill('75');
    await realDefense.focus();
    await realDefense.evaluate(el => { el.dataset.testBeforeRerender = '1'; });
    await realPage.evaluate(async () => (await import('/js/ui/bus.js')).Bus.emit('combat'));
    await expect(realPage.locator('[data-test-before-rerender]')).toHaveCount(0);
    await expect(realDefense).toBeFocused();
    await expect(realDefense).toHaveValue('75');
    await realDefense.press('Enter');

    // Application unique
    const applyBtn = realRes.locator('.workspace-resolution-footer button[data-focus-key="apply"]');
    await expect(applyBtn).toBeEnabled();
    await applyBtn.click();

    // PV modifiés
    await expect(realTarget.locator('.workspace-sheet-hp')).not.toHaveText(targetHpInitial);

    // Undo restaure l'état
    await realPage.locator('#btn-undo').click();
    await expect(realTarget.locator('.workspace-sheet-hp')).toHaveText(targetHpInitial);

    // Même partie : passage Jouer → Campagne, temps, Undo/Redo et reprise après rechargement.
    const beforeCampaign = await readGameState();
    const secondsBefore = beforeCampaign.extensions?.v5?.gameClock?.campaignSeconds || 0;
    const participantsBefore = beforeCampaign.combat.participants;
    await realPage.locator('#tab-campaign').click();
    const campaign = realPage.locator('#workspace-campaign');
    await campaign.getByRole('button', { name: 'Avancer le temps…' }).click();
    const clockDialog = realPage.getByRole('dialog', { name: 'Temps de campagne' });
    await clockDialog.getByLabel('Durée écoulée').fill('60');
    await clockDialog.getByLabel('Motif MJ').fill('Recette transversale');
    await clockDialog.getByRole('button', { name: 'Avancer le temps', exact: true }).click();
    await expect(clockDialog).toBeHidden();
    const afterAdvance = await readGameState();
    assert.equal(afterAdvance.extensions.v5.gameClock.campaignSeconds, secondsBefore + 3600);
    assert.deepEqual(afterAdvance.combat.participants, participantsBefore, 'Le temps ne modifie pas les participants dans ce scénario');
    await realPage.locator('#btn-undo').click();
    assert.equal((await readGameState()).extensions?.v5?.gameClock?.campaignSeconds || 0, secondsBefore);
    await realPage.locator('#btn-menu').click();
    await realPage.locator('#btn-redo').click();
    assert.equal((await readGameState()).extensions.v5.gameClock.campaignSeconds, secondsBefore + 3600);
    await realPage.locator('#tab-combat').click();
    await expect(realTarget.locator('.workspace-sheet-hp')).toHaveText(targetHpInitial);
    await realPage.reload({ waitUntil: 'domcontentloaded' });
    await expect(realPage.locator('#app-content')).toBeVisible();
    const afterReload = await readGameState();
    assert.equal(afterReload.extensions.v5.gameClock.campaignSeconds, secondsBefore + 3600);
    assert.deepEqual(afterReload.combat.participants, participantsBefore, 'Les participants survivent au rechargement');
    await realPage.locator('#tab-combat').click();

    // Vérification responsive réelle 1440 / 900 / 520
    for (const width of [1440, 900, 520]) {
      await realPage.setViewportSize({ width, height: 900 });
      const noOverflow = await realPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      assert.ok(noOverflow, `Pas de débordement horizontal à ${width}px dans l'application réelle`);
    }

    await realPage.close();
    await context.close();
    console.log('PASS — Jouer Lot 4B : fiches de duel, progression 3 étapes de résolution, contrastes WCAG AA, calcul sans mutation, application unique et undo');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(err => {
  console.error('FAIL — Jouer Lot 4B :', err);
  process.exit(1);
});
