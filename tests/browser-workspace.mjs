import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const mime = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.json': 'application/json' };

function startServer() {
  const server = createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = join(root, normalize(requestPath === '/' ? '/index.html' : requestPath));
    try {
      if (!file.startsWith(root) || !statSync(file).isFile()) throw new Error('not found');
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
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
    await context.route('**/*', route => {
      if (route.request().url().startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
      return route.abort();
    });
    const page = await context.newPage();
    // A same-origin blank page: localStorage (panel memory) is then available.
    await page.goto(`http://127.0.0.1:${port}/blank`);
    await page.setContent('<main><div id="mount"></div></main>');
    await page.addStyleTag({ path: join(root, 'MJ.css') });
    await page.addStyleTag({ path: join(root, 'js/ui/workspace.css') });
    await page.evaluate(async ({ moduleUrl, resolutionUrl }) => {
      const { initWorkspaceView } = await import(moduleUrl);
      const { previewResolution } = await import(resolutionUrl);
      const participants = Array.from({ length: 15 }, (_, index) => ({
        id: `actor-${index + 1}`,
        name: index === 11 || index === 14 ? 'Un nom de combattant très long pour vérifier le retour à la ligne' : `Combattant ${index + 1}`,
        kind: 'Créature', initiative: 50 - index, hp: 10, maxHp: 12,
        camp: index % 2 ? 'ennemi' : 'pj',
        caracs: { CC: 40 + index, E: 35, F: 30, Ag: 33 }, armor: { head: 0, body: 2, arms: 1, legs: 0 },
        states: index === 0 ? ['Sonné|2'] : [], zone: index < 12 ? 'active' : 'bench'
      }));
      // PV négatifs : affichés avec le signe moins U+2212.
      participants[1].hp = -2;
      const diceLines = [
        { participantId: 'actor-3', note: 'Épée longue', base: 45, attr: 'CC', type: 'attack', damage: 8 },
        { participantId: 'actor-12', note: 'Action au nom très long', base: 'Ag' }
      ];
      const profiles = participants.slice(0, 3).map(({ id, name, initiative, hp }) => ({ id, name, initiative, hp, kind: 'Créature', group: 'Test', caracs: { E: 42 } }));
      const combat = { round: 3, currentActorId: 'actor-1', participants: new Map(participants.map(actor => [actor.id, actor])) };
      const handlers = new Map();
      const calls = [];
      const Store = {
        listProfiles: () => profiles,
        listParticipants: () => Array.from(combat.participants.values()),
        getCombat: () => combat,
        getDiceLines: () => diceLines,
        previewResolution: input => previewResolution({ ...input, target: input.targetId ? combat.participants.get(input.targetId) : null }),
        canUndo: () => false,
        undo: () => false
      };
      const Bus = { on(event, fn) { handlers.set(event, fn); } };
      window.workspaceTest = initWorkspaceView({
        Store, Bus, mount: document.querySelector('#mount'),
        actions: {
          renderOverview(content) { content.textContent = 'Rappel courant'; },
          adjustHp(payload) { calls.push({ type: 'adjustHp', payload }); },
          enterParticipant(id) { calls.push({ type: 'enter', id }); }
        }
      });
      window.workspaceTestData = { combat, handlers, calls, diceLines };
      window.spaceReachedDocument = 0;
      document.addEventListener('keydown', event => { if (event.code === 'Space') window.spaceReachedDocument += 1; });
    }, {
      moduleUrl: `http://127.0.0.1:${port}/js/ui/workspace-view.js`,
      resolutionUrl: `http://127.0.0.1:${port}/js/core/resolution.js`
    });
    const rerender = () => page.evaluate(() => window.workspaceTestData.handlers.get('combat')?.());
    const actorSheet = page.locator('.workspace-sheet-actor');
    const targetSheet = page.locator('.workspace-sheet-target');

    // Le repli par défaut du panneau (selon la largeur) n'est pas un choix mémorisé.
    assert.equal(await page.evaluate(() => localStorage.getItem('wfrp.sidePanel')), null);
    await expect(page.getByRole('tab', { name: 'Préparer' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Jouer' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Bibliothèque' })).toBeVisible();
    await expect(page.locator('#workspace-prepare')).toBeVisible();

    await page.getByRole('tab', { name: 'Jouer' }).click();
    await expect(page.locator('.workspace-track .workspace-track-item')).toHaveCount(12);
    await expect(page.locator('.workspace-track')).toContainText('Un nom de combattant très long');
    await expect(page.locator('.workspace-track')).not.toContainText('Aucun état');
    await expect(page.locator('[data-workspace-select="actor-1"]')).toContainText('BE 3 · PA C2 B1');
    await expect(page.locator('[data-workspace-select="actor-1"]')).toContainText('Sonné · 2 t');
    // Ligne de piste : le contenu forme le nom accessible (PV, BE, PA, états), la cible est pressée.
    await expect(page.locator('[data-workspace-select="actor-1"]')).not.toHaveAttribute('aria-label', /./);
    await expect(page.getByRole('button', { name: /Combattant 1 PV 10\/12 BE 3 · PA C2 B1 Sonné · 2 t/ })).toBeVisible();
    await expect(page.locator('[data-workspace-select="actor-2"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-workspace-select="actor-2"]')).toContainText('−2/12');
    await expect(actorSheet).toContainText('Combattant 1');
    await expect(actorSheet).toContainText('E · BE');
    // Default target: the first combatant of another camp in the order.
    await expect(targetSheet).toContainText('Combattant 2');
    await expect(page.locator('.workspace-pending')).toContainText('Rappel courant');

    // The bench stays visible, each waiting combatant with « Faire entrer ».
    await expect(page.locator('.workspace-bench')).toContainText('En attente (3)');
    await page.getByRole('button', { name: 'Faire entrer Combattant 13' }).click();

    // The acting sheet follows the current turn reported by the Store.
    await page.evaluate(() => { window.workspaceTestData.combat.currentActorId = 'actor-3'; });
    await rerender();
    await expect(actorSheet).toContainText('Combattant 3');
    await expect(page.locator('[data-workspace-select="actor-3"]')).toHaveAttribute('aria-current', 'step');

    // Selecting a row makes it the target; the acting row changes nothing.
    await page.locator('[data-workspace-select="actor-5"]').click();
    await expect(targetSheet).toContainText('Combattant 5');
    await page.locator('[data-workspace-select="actor-3"]').click();
    await expect(actorSheet).toContainText('Combattant 3');
    await expect(targetSheet).toContainText('Combattant 5');
    await rerender();
    await expect(targetSheet).toContainText('Combattant 5');
    await expect(page.locator('.workspace-resolution')).toContainText('Épée longue · 45');
    await expect(page.locator('.workspace-resolution').getByRole('group', { name: 'Alliés' })).toContainText('Combattant 5');

    // Integrated resolution: no keystroke is lost across Bus re-renders.
    const attack = page.locator('[data-roll-input="attack"]');
    await attack.click();
    await page.keyboard.type('2');
    await rerender();
    await expect(attack).toBeFocused();
    await page.keyboard.type('3');
    await rerender();
    await expect(attack).toHaveValue('23');
    await page.locator('.workspace-resolution').getByRole('group', { name: 'Adversaires' }).getByRole('button', { name: 'Combattant 2', exact: true }).click();
    await expect(targetSheet).toContainText('Combattant 2');
    await expect(page.locator('.workspace-defense-base')).toHaveValue('41');
    await page.locator('[data-roll-input="defense"]').fill('88');
    await page.locator('[data-roll-input="defense"]').press('Enter');
    const result = page.locator('.workspace-result');
    await expect(result).toContainText('Attaque : Réussite · DR +2');
    await expect(result).toContainText('Défense : Échec · DR −4');
    await expect(result).toContainText('DR net +6 · touché');
    await expect(result).toContainText('32 → bras droit');
    await expect(result).toContainText('8 arme + 6 DR − 3 BE − 1 PA = 10');
    await expect(targetSheet.locator('.silhouette-zone.is-hit')).toHaveAttribute('data-zone', 'arm-right');
    await expect(targetSheet).toContainText('→ −12');
    await expect(result).toContainText('PV −2 → −12');
    await expect(page.getByRole('button', { name: 'Appliquer 10 dégâts à Combattant 2' })).toBeDisabled();
    await page.getByRole('button', { name: 'Annuler le résultat calculé' }).click();
    await expect(result).toHaveCount(0);

    // Les notes de la formule (mots-clés) sont affichées sous le calcul.
    await page.evaluate(() => { window.workspaceTestData.diceLines[0].qualities = ['Inoffensive']; });
    await rerender();
    await page.locator('[data-roll-input="defense"]').press('Enter');
    await expect(result.locator('.workspace-formula-notes')).toHaveText('Inoffensive : PA ×2, pas de minimum');
    await page.evaluate(() => { delete window.workspaceTestData.diceLines[0].qualities; });
    await page.getByRole('button', { name: 'Annuler le résultat calculé' }).click();

    // « Comparer les cibles » : mêmes jets sur chaque cible possible, rien n'est appliqué.
    await page.getByRole('button', { name: 'Comparer les cibles' }).click();
    const comparison = page.locator('.workspace-comparison-item');
    await expect(comparison).toHaveCount(11);
    await expect(comparison.first()).toContainText('Combattant 2 : touché · 10 dégâts · PV −2 → −12');
    await expect(page.locator('.workspace-comparison')).toContainText('Combattant 5 : ');
    await page.getByRole('button', { name: 'Choisir Combattant 4' }).click();
    await expect(comparison).toHaveCount(0);
    await expect(targetSheet).toContainText('Combattant 4');
    await expect(page.getByRole('button', { name: /^Appliquer \d+ dégâts à Combattant 4$/ })).toBeVisible();
    await page.getByRole('button', { name: 'Annuler le résultat calculé' }).click();
    await page.locator('.workspace-resolution').getByRole('group', { name: 'Adversaires' }).getByRole('button', { name: 'Combattant 2', exact: true }).click();
    await expect(page.locator('.workspace-defense-base')).toHaveValue('41');
    await attack.fill('0');
    await attack.press('Enter');
    await expect(page.locator('.workspace-resolution [role="alert"]')).toContainText('Le jet doit être un nombre de 1 à 100 (00 = 100).');

    // Manual PV stay on the sheet; the amount field feeds the button.
    await page.getByRole('textbox', { name: 'Quantité de PV pour Combattant 3' }).or(page.getByRole('spinbutton', { name: 'Quantité de PV pour Combattant 3' })).fill('2');
    await page.getByRole('button', { name: '+2 PV pour Combattant 3' }).click();
    await expect.poll(() => page.evaluate(() => window.workspaceTestData.calls)).toEqual([
      { type: 'enter', id: 'actor-13' },
      { type: 'adjustHp', payload: { participantId: 'actor-3', delta: 2 } }
    ]);

    // Native Space on a focused command is consumed by the component, so a
    // host-level next-turn shortcut cannot fire here.
    await page.getByRole('button', { name: 'Calculer' }).focus();
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => window.spaceReachedDocument), 0);

    // Side panel: non-modal tabs, collapsible into a rail, remembered.
    const side = page.locator('.workspace-side');
    await side.getByRole('tab', { name: 'Profils' }).click();
    await expect(side.getByRole('tabpanel')).toContainText('BE 4');
    await expect(side.getByRole('button', { name: 'Ajouter Combattant 1 au combat' })).toBeDisabled();
    await side.getByRole('searchbox', { name: 'Rechercher un profil à ajouter' }).fill('Combattant 2');
    await rerender();
    await expect(side.getByRole('searchbox', { name: 'Rechercher un profil à ajouter' })).toHaveValue('Combattant 2');
    await expect(side.locator('.workspace-side-profile')).toHaveCount(1);
    await side.getByRole('button', { name: 'Replier le panneau' }).click();
    await expect(side).toHaveClass(/is-collapsed/);
    await expect(side.getByRole('tabpanel')).toHaveCount(0);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('wfrp.sidePanel'))), { tab: 'profiles', collapsed: true });
    await side.getByRole('tab', { name: 'Journal' }).click();
    await expect(side).not.toHaveClass(/is-collapsed/);
    await expect(side.getByRole('tabpanel')).toContainText('Aucun événement récent');
    await page.evaluate(() => window.workspaceTest.openContext('rules'));
    await expect(side.getByRole('tab', { name: 'Règles' })).toHaveAttribute('aria-selected', 'true');

    await page.locator('[data-workspace-select="actor-12"]').click();
    await expect(targetSheet).toContainText('Un nom de combattant très long');

    await page.screenshot({ path: '/private/tmp/mj-workspace-1440.png', fullPage: true });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.setViewportSize({ width: 900, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: '/private/tmp/mj-workspace-900.png', fullPage: true });
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));

    await page.getByRole('tab', { name: 'Bibliothèque' }).click();
    await page.getByRole('searchbox', { name: 'Rechercher dans la bibliothèque' }).fill('très long');
    await expect(page.locator('.workspace-space-library .workspace-profile-card')).toHaveCount(0);
    await page.setViewportSize({ width: 900, height: 900 });
    await expect(page.locator('.workspace-space-library')).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await context.close();
    console.log('PASS — workspace navigation, duel et cible, résolution intégrée sans frappe perdue, panneau latéral, focus/Espace, 15 acteurs et responsive 1440/900');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(`✖ test:browser-workspace — ${error.message}`);
  process.exitCode = 1;
});
