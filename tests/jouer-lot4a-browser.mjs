import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'playwright/test';
import { launchBrowser } from './helpers/browser.mjs';
import { startStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

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

async function main() {
  const { server, port } = await startStaticServer({ root, pages: { '/blank': '<!DOCTYPE html><html><head></head><body><main><div id="mount"></div></main></body></html>' }, headers: { 'Access-Control-Allow-Origin': '*' } });
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
    await blockExternalNetwork(context, port);
    const page = await context.newPage();
    page.on('pageerror', err => console.error('Page error:', err));
    await page.goto(`http://127.0.0.1:${port}/blank`);
    await page.setContent('<main><div id="mount"></div></main>');
    await page.addStyleTag({ path: join(root, 'MJ.css') });
    await page.addStyleTag({ path: join(root, 'js/ui/workspace.css') });

    await page.evaluate(async ({ moduleUrl, resolutionUrl }) => {
      const { initWorkspaceView } = await import(moduleUrl);
      const { previewResolution } = await import(resolutionUrl);

      const participants = Array.from({ length: 15 }, (_, index) => ({
        id: `actor-${index + 1}`,
        name: index === 11 || index === 14
          ? 'Un nom de combattant exceptionnellement long pour vérifier les retours à la ligne'
          : (index === 0 ? 'Elysia Valtieri' : index === 1 ? 'Vampire des cryptes' : `Combattant ${index + 1}`),
        kind: index % 2 === 0 ? 'PJ' : 'Créature',
        initiative: 50 - index,
        hp: index === 0 ? 10 : (index === 1 ? 3 : 12),
        maxHp: index === 0 ? 12 : (index === 1 ? 15 : 12),
        camp: index % 2 ? 'ennemi' : 'pj',
        caracs: { CC: 57, CT: 27, F: 33, E: 28, I: 58, Ag: 45 },
        armor: { head: 1, body: 2, arms: 1, legs: 0 },
        states: index === 0 ? ['Élan|1'] : [],
        zone: index < 12 ? 'active' : 'bench'
      }));

      const diceLines = [
        { participantId: 'actor-1', note: 'Lance (2M)', base: 57, attr: 'CC', type: 'attack', damage: 8 },
        { participantId: 'actor-2', note: 'Morsure', base: 40, attr: 'CC', type: 'attack', damage: 6 }
      ];

      const profiles = participants.slice(0, 5).map(({ id, name, initiative, hp }) => ({
        id, name, initiative, hp, kind: 'Créature', group: 'Test', caracs: { E: 42 }
      }));

      const combat = {
        round: 1,
        started: true,
        currentActorId: 'actor-1',
        participants: new Map(participants.map(actor => [actor.id, actor]))
      };

      const handlers = new Map();
      const calls = [];
      const encounters = [
        { id: 'enc-1', title: 'Embuscade au gué', status: 'prepared', notes: 'Pont piégé', entries: [{ id: 'a', profileId: 'actor-1', quantity: 2 }] },
        { id: 'enc-2', title: 'Crypte abandonnée', status: 'prepared', notes: 'Pénombre', entries: [] }
      ];

      const Store = {
        listEncounters: () => encounters,
        getActiveScene: () => null,
        listSuspendedScenes: () => [],
        listProfiles: () => profiles,
        listParticipants: () => Array.from(combat.participants.values()),
        getCombat: () => combat,
        getDiceLines: () => diceLines,
        getActionClock: () => ({ round: 1 }),
        getTurnIndex: () => 1,
        listTurnActions: () => [],
        getSceneCircumstances: () => ({ lighting: 'normal' }),
        getV5TurnFacts: () => ({}),
        previewAmputationShock: () => ({ status: 'blocked' }),
        resolveDivineAccess: () => ({ allowed: false, mode: 'denied', reason: 'Test' }),
        getDivineAccessGrants: () => [],
        previewResolution: input => previewResolution({ ...input, target: input.targetId ? combat.participants.get(input.targetId) : null }),
        async updateParticipant(id, patch) {
          const participant = combat.participants.get(id);
          Object.assign(participant, patch);
          return { ok: true };
        },
        engageParticipants: async () => true,
        previewDisengage: () => ({ safe: true }),
        applyDisengage: async () => true,
        canUndo: () => false,
        undo: () => false
      };

      const Bus = { on(event, fn) { handlers.set(event, fn); } };

      window.workspaceTest = initWorkspaceView({
        Store,
        Bus,
        mount: document.querySelector('#mount'),
        actions: {
          renderOverview(content) { content.textContent = 'Rappel'; },
          adjustHp(payload) { calls.push({ type: 'adjustHp', payload }); },
          beginEncounter() { calls.push({ type: 'begin' }); },
          launchEncounter(id) { calls.push({ type: 'launch', id }); },
          enterParticipant(id) { calls.push({ type: 'enter', id }); }
        }
      });

      window.workspaceTestData = { combat, handlers, calls, profiles, encounters };
    }, {
      moduleUrl: `http://127.0.0.1:${port}/js/ui/workspace-view.js`,
      resolutionUrl: `http://127.0.0.1:${port}/js/core/resolution.js`
    });

    const rerender = () => page.evaluate(() => window.workspaceTestData.handlers.get('combat')?.());
    const playTab = page.getByRole('tab', { name: 'Jouer' });
    await playTab.click();

    // 1. Structure de Jouer affichée et pleine largeur
    const playSpace = page.locator('#workspace-play');
    await expect(playSpace).toBeVisible();

    const grid = page.locator('.workspace-play-grid');
    await expect(grid).toBeVisible();
    await expect(page.locator('.workspace-track-column')).toBeVisible();
    await expect(page.locator('.workspace-center')).toBeVisible();
    const side = page.locator('.workspace-side');
    await expect(side).toBeVisible();

    // Mesure de l'occupation de la largeur à 1440px
    const gridBox = await grid.boundingBox();
    assert.ok(gridBox && gridBox.width >= 1350, `La grille occupe la pleine largeur disponible (${gridBox?.width}px / 1440px)`);
    assert.ok(gridBox.width / 1440 > 0.93, `Ratio d'occupation de largeur satisfaisant (${(gridBox.width / 1440 * 100).toFixed(1)}%)`);

    // 2. Vérification des largeurs responsive et débordement (1440, 900, 520 px)
    const viewports = [1440, 900, 520];
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });
      const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      assert.ok(noOverflow, `Débordement horizontal détecté à ${width}px (scrollWidth: ${await page.evaluate(() => document.documentElement.scrollWidth)})`);
    }

    // 3. Vérification des thèmes et mesures de contraste WCAG AA (>= 4.5:1)
    await page.setViewportSize({ width: 1440, height: 900 });

    // En clair : vérifier couleur de fond, texte et contrastes
    const lightBg = await page.locator('.workspace-plateau').evaluate(el => getComputedStyle(el).backgroundColor);
    const lightInk = await page.locator('#workspace-play').evaluate(el => getComputedStyle(el).color);
    assert.ok(lightBg, 'Fond plateau défini en clair');
    assert.ok(lightInk, 'Encre définie en clair');

    const lightTextContrast = getContrast(lightInk, lightBg);
    assert.ok(lightTextContrast >= 4.5, `Contraste texte clair insuffisant : ${lightTextContrast.toFixed(2)}:1 (attendu >= 4.5:1)`);

    const lightActiveTabStyle = await side.locator('.workspace-side-tab[aria-selected="true"]').evaluate(el => ({
      color: getComputedStyle(el).color,
      bg: getComputedStyle(el).backgroundColor
    }));
    const lightActiveTabContrast = getContrast(lightActiveTabStyle.color, lightActiveTabStyle.bg);
    assert.ok(lightActiveTabContrast >= 4.5, `Contraste onglet actif clair insuffisant : ${lightActiveTabContrast.toFixed(2)}:1 (attendu >= 4.5:1)`);

    // Passage en thème sombre
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    const darkBg = await page.locator('.workspace-plateau').evaluate(el => getComputedStyle(el).backgroundColor);
    const darkInk = await page.locator('#workspace-play').evaluate(el => getComputedStyle(el).color);
    assert.notEqual(darkBg, lightBg, 'Le fond du plateau change en mode sombre');

    const rgbValues = parseRgb(darkBg);
    assert.ok(rgbValues[0] < 80 && rgbValues[1] < 80 && rgbValues[2] < 80, `Fond sombre effectif sous 80 (reçu ${darkBg})`);

    const darkTextContrast = getContrast(darkInk, darkBg);
    assert.ok(darkTextContrast >= 4.5, `Contraste texte sombre insuffisant : ${darkTextContrast.toFixed(2)}:1 (attendu >= 4.5:1)`);

    const darkActiveTabStyle = await side.locator('.workspace-side-tab[aria-selected="true"]').evaluate(el => ({
      color: getComputedStyle(el).color,
      bg: getComputedStyle(el).backgroundColor
    }));
    const darkActiveTabContrast = getContrast(darkActiveTabStyle.color, darkActiveTabStyle.bg);
    assert.ok(darkActiveTabContrast >= 4.5, `Contraste onglet actif sombre insuffisant : ${darkActiveTabContrast.toFixed(2)}:1 (attendu >= 4.5:1)`);

    // Vérification du contraste des puces sélectionnées en sombre (doit être >= 4.5:1)
    const chipSelectedStyle = await page.evaluate(() => {
      const el = document.querySelector('.workspace-chip') || document.createElement('button');
      el.className = 'workspace-chip';
      el.setAttribute('aria-pressed', 'true');
      document.querySelector('#workspace-play').appendChild(el);
      const cs = getComputedStyle(el);
      const res = { color: cs.color, bg: cs.backgroundColor };
      el.remove();
      return res;
    });
    const chipDarkContrast = getContrast(chipSelectedStyle.color, chipSelectedStyle.bg);
    assert.ok(chipDarkContrast >= 4.5, `Contraste puce sélectionnée en sombre insuffisant : ${chipDarkContrast.toFixed(2)}:1 (attendu >= 4.5:1)`);

    // Vérification du style et du contraste du lien Jouer → Campagne (aftermath link)
    const aftermathLinkStyle = await page.evaluate(() => {
      const el = document.createElement('a');
      el.className = 'workspace-aftermath-link';
      el.textContent = 'Ouvrir dans l’espace Campagne';
      document.querySelector('#workspace-play').appendChild(el);
      const cs = getComputedStyle(el);
      const res = { color: cs.color, bg: cs.backgroundColor };
      el.remove();
      return res;
    });
    const aftermathDarkContrast = getContrast(aftermathLinkStyle.color, aftermathLinkStyle.bg);
    assert.ok(aftermathDarkContrast >= 4.5, `Contraste lien aftermath sombre insuffisant : ${aftermathDarkContrast.toFixed(2)}:1 (attendu >= 4.5:1)`);

    // Survol réel : tester séparément le thème forcé et la préférence système.
    await page.evaluate(() => {
      const link = document.createElement('a');
      link.className = 'workspace-aftermath-link';
      link.dataset.hoverContrastTest = '';
      link.textContent = 'Ouvrir dans l’espace Campagne';
      link.style.transition = 'none';
      document.querySelector('#workspace-play').appendChild(link);
    });
    const hoverLink = page.locator('[data-hover-contrast-test]');
    for (const mode of ['forced', 'system']) {
      await page.emulateMedia({ colorScheme: mode === 'forced' ? 'light' : 'dark' });
      await page.evaluate(forced => {
        if (forced) document.documentElement.setAttribute('data-theme', 'dark');
        else document.documentElement.removeAttribute('data-theme');
      }, mode === 'forced');
      await hoverLink.hover();
      const style = await hoverLink.evaluate(el => ({ color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }));
      const ratio = getContrast(style.color, style.bg);
      assert.ok(ratio >= 4.5, `Contraste du lien au survol en sombre ${mode} insuffisant : ${ratio.toFixed(2)}:1`);
    }
    await hoverLink.evaluate(el => el.remove());
    await page.emulateMedia({ colorScheme: 'light' });

    // Rétablissement clair
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));

    // 4. Plateau, zones de mêlées et jetons
    const plateau = page.locator('.workspace-plateau');
    await expect(plateau).toBeVisible();
    const tokens = page.locator('.workspace-track-entry');
    await expect(tokens).toHaveCount(12);

    // Sélection d'un combattant
    await page.locator('[data-workspace-select="actor-1"]').click();
    await expect(page.locator('.workspace-track-item.is-actor')).toHaveCount(1);
    await expect(page.locator('.workspace-sheet-actor')).toContainText('Elysia Valtieri');

    // Fiche cible présente
    await expect(page.locator('.workspace-sheet-target')).toBeVisible();

    // 5. Barre d'actions rapides
    const actionBar = page.locator('.workspace-action-bar');
    await expect(actionBar).toBeVisible();
    await expect(actionBar.getByRole('button', { name: /Charger|Attaquer|Se déplacer|Autres actions/ }).first()).toBeVisible();

    // 6. Panneau latéral et ses 4 onglets (Règles, Profils, Circonstances, Journal)
    await expect(side.getByRole('tab', { name: 'Règles' })).toBeVisible();
    await expect(side.getByRole('tab', { name: 'Profils' })).toBeVisible();
    await expect(side.getByRole('tab', { name: 'Circonstances' })).toBeVisible();
    await expect(side.getByRole('tab', { name: 'Journal' })).toBeVisible();

    // Vérification de l'absence de coupure au milieu des mots sur les onglets du volet latéral
    const sideTabs = side.locator('.workspace-side-tab');
    const tabCount = await sideTabs.count();
    assert.equal(tabCount, 4, 'Les 4 onglets sont présents dans le volet');
    for (let i = 0; i < tabCount; i++) {
      const tab = sideTabs.nth(i);
      const text = await tab.innerText();
      const style = await tab.evaluate(el => ({
        whiteSpace: getComputedStyle(el).whiteSpace,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight
      }));
      assert.equal(style.whiteSpace, 'nowrap', `L'onglet "${text}" doit être en nowrap`);
      assert.ok(
        style.scrollHeight <= style.clientHeight + 2,
        `L'onglet "${text}" ne doit pas être coupé au milieu d'un mot (scrollHeight: ${style.scrollHeight}, clientHeight: ${style.clientHeight})`
      );
    }

    // Onglet Profils
    await side.getByRole('tab', { name: 'Profils' }).click();
    await expect(side.locator('.workspace-side-profile')).toHaveCount(5);

    // Repli du volet latéral
    const toggleBtn = side.getByRole('button', { name: /Replier le panneau/ });
    await toggleBtn.click();
    await expect(side).toHaveClass(/is-collapsed/);
    await expect(grid).toHaveClass(/is-side-collapsed/);

    // Déplier à nouveau via un clic sur un onglet
    await side.getByRole('tab', { name: 'Journal' }).click();
    await expect(side).not.toHaveClass(/is-collapsed/);

    // 7. Préservation des saisies en cours et vérification effective du focus après rerendu
    const defenseBase = page.locator('.workspace-defense-base');
    if (await defenseBase.isVisible()) {
      await defenseBase.focus();
      await expect(defenseBase).toBeFocused();
      await defenseBase.fill('55');
      await rerender();
      await expect(defenseBase).toBeFocused();
      await expect(defenseBase).toHaveValue('55');
    }

    const attackInput = page.locator('.workspace-roll-input').first();
    await attackInput.fill('42');
    await rerender();
    await expect(attackInput).toHaveValue('42');

    // 8. État sans rencontre (0 combattant) et préservation des libellés du volet latéral
    await page.evaluate(() => {
      const { combat } = window.workspaceTestData;
      window.workspaceTestData.saved = Array.from(combat.participants);
      combat.participants.clear();
      combat.started = false;
    });
    await rerender();
    const emptyState = page.locator('.workspace-play-empty');
    await expect(emptyState).toBeVisible();
    await expect(emptyState.getByRole('heading', { name: 'Aucune rencontre en cours' })).toBeVisible();
    await expect(emptyState.getByRole('button', { name: 'Préparer une rencontre' })).toBeVisible();
    // Rencontres préparées compactes visibles dans Jouer
    await expect(page.locator('#workspace-play .workspace-encounter-list .workspace-encounter-card')).toHaveCount(2);

    // Vérification que sur l'écran vide, les libellés du volet restent intacts sans césure
    for (let i = 0; i < tabCount; i++) {
      const tab = sideTabs.nth(i);
      const text = await tab.innerText();
      const style = await tab.evaluate(el => ({
        whiteSpace: getComputedStyle(el).whiteSpace,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight
      }));
      assert.equal(style.whiteSpace, 'nowrap', `Sur écran vide, l'onglet "${text}" reste en nowrap`);
      assert.ok(
        style.scrollHeight <= style.clientHeight + 2,
        `Sur écran vide, l'onglet "${text}" ne se coupe pas (scrollHeight: ${style.scrollHeight}, clientHeight: ${style.clientHeight})`
      );
    }

    // 9. Vérification sur l'application réelle (index.html)
    const realPage = await context.newPage();
    await realPage.goto(`http://127.0.0.1:${port}/index.html`);
    await realPage.setViewportSize({ width: 1440, height: 900 });
    const realPlayTab = realPage.locator('#tab-combat');
    await expect(realPlayTab).toBeVisible();
    await realPlayTab.click();
    await expect(realPage.locator('#workspace-play')).toBeVisible();

    // Mesure de l'occupation réelle de la largeur dans l'application
    const realPlayBox = await realPage.locator('#workspace-play').boundingBox();
    assert.ok(realPlayBox && realPlayBox.width >= 1350, `L'espace Jouer occupe la pleine largeur dans l'application réelle (${realPlayBox?.width}px / 1440px)`);

    // Vérification des libellés du volet latéral sur écran réel
    const realSideTabs = realPage.locator('#workspace-play .workspace-side-tab');
    const realTabCount = await realSideTabs.count();
    assert.equal(realTabCount, 4, 'Les 4 onglets sont présents dans l\'application réelle');
    for (let i = 0; i < realTabCount; i++) {
      const tab = realSideTabs.nth(i);
      const text = await tab.innerText();
      const style = await tab.evaluate(el => ({
        whiteSpace: getComputedStyle(el).whiteSpace,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight
      }));
      assert.equal(style.whiteSpace, 'nowrap', `Dans l'application réelle, l'onglet "${text}" est en nowrap`);
      assert.ok(style.scrollHeight <= style.clientHeight + 2, `Dans l'application réelle, l'onglet "${text}" ne se coupe pas`);
    }

    // Rétablissement et fermeture de realPage
    await realPage.close();

    // Restauration pour fin propre
    await page.evaluate(() => {
      const { combat, saved } = window.workspaceTestData;
      saved.forEach(([id, actor]) => combat.participants.set(id, actor));
      combat.started = true;
    });
    await rerender();
    await expect(page.locator('.workspace-track-entry')).toHaveCount(12);

    await context.close();
    console.log('PASS — Jouer Lot 4A : pleine largeur, palette maquette/campagne, thèmes clair/sombre, 1440/900/520px, plateau, duel, volet et état vide');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(`✖ test:jouer-lot4a-browser — ${error.message}`);
  process.exitCode = 1;
});
