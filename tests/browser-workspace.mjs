import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const mime = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8' };

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
    await page.setContent('<main><div id="mount"></div></main>');
    await page.addStyleTag({ path: join(root, 'MJ.css') });
    await page.addStyleTag({ path: join(root, 'js/ui/workspace.css') });
    await page.evaluate(async ({ moduleUrl }) => {
      const { initWorkspaceView } = await import(moduleUrl);
      const participants = Array.from({ length: 15 }, (_, index) => ({
        id: `actor-${index + 1}`,
        name: index === 11 || index === 14 ? 'Un nom de combattant très long pour vérifier le retour à la ligne' : `Combattant ${index + 1}`,
        kind: 'Créature', initiative: 50 - index, hp: 10, maxHp: 12,
        states: index === 0 ? ['Sonné|2'] : [], zone: index < 12 ? 'active' : 'bench'
      }));
      const profiles = participants.slice(0, 3).map(({ id, name, initiative, hp }) => ({ id, name, initiative, hp, kind: 'Créature', group: 'Test' }));
      const combat = { round: 3, currentActorId: 'actor-1', participants: new Map(participants.map(actor => [actor.id, actor])) };
      const handlers = new Map();
      const calls = [];
      const Store = {
        listProfiles: () => profiles,
        listParticipants: () => Array.from(combat.participants.values()),
        getCombat: () => combat,
        getDiceLines: () => [
          { participantId: 'actor-3', note: 'Épée longue', base: 'CC' },
          { participantId: 'actor-12', note: 'Action au nom très long', base: 'Ag' }
        ],
        canUndo: () => false,
        undo: () => false
      };
      const Bus = { on(event, fn) { handlers.set(event, fn); } };
      window.workspaceTest = initWorkspaceView({
        Store, Bus, mount: document.querySelector('#mount'),
        actions: {
          openRules() {}, openLog() {},
          renderOverview(content) { content.textContent = 'Rappel courant'; },
          runAction(payload) { calls.push({ type: 'runAction', payload }); },
          adjustHp(payload) { calls.push({ type: 'adjustHp', payload }); }
        }
      });
      window.workspaceTestData = { combat, handlers, calls };
    }, { moduleUrl: `http://127.0.0.1:${port}/js/ui/workspace-view.js` });

    await expect(page.getByRole('tab', { name: 'Préparer' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Jouer' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Bibliothèque' })).toBeVisible();
    await expect(page.locator('#workspace-prepare')).toBeVisible();

    await page.getByRole('tab', { name: 'Jouer' }).click();
    await expect(page.locator('.workspace-track .workspace-track-item')).toHaveCount(12);
    await expect(page.locator('.workspace-track')).toContainText('Un nom de combattant très long');
    await expect(page.locator('.workspace-actor-sheet')).toContainText('Combattant 1');
    await expect(page.locator('.workspace-context')).toContainText('Rappel courant');

    // Until a fiche is explicitly pinned, the selected sheet follows the
    // current turn reported by the Store.
    await page.evaluate(() => {
      window.workspaceTestData.combat.currentActorId = 'actor-3';
      window.workspaceTestData.handlers.get('combat')?.();
    });
    await expect(page.locator('.workspace-actor-sheet')).toContainText('Combattant 3');
    await page.evaluate(() => {
      window.workspaceTestData.combat.currentActorId = 'actor-1';
      window.workspaceTestData.handlers.get('combat')?.();
    });

    await page.locator('[data-workspace-select="actor-2"]').click();
    await expect(page.locator('.workspace-actor-sheet')).toContainText('Combattant 2');
    await expect(page.locator('[data-workspace-select="actor-1"]')).toHaveAttribute('aria-current', 'step');

    await page.getByRole('button', { name: 'Épingler la fiche' }).click();
    await page.evaluate(() => {
      window.workspaceTestData.combat.currentActorId = 'actor-3';
      window.workspaceTestData.handlers.get('combat')?.();
    });
    await expect(page.locator('.workspace-actor-sheet')).toContainText('Combattant 2');
    await page.getByRole('button', { name: 'Suivre le tour' }).click();
    await expect(page.locator('.workspace-actor-sheet')).toContainText('Combattant 3');
    await expect(page.locator('.workspace-prepared-actions')).toContainText('Épée longue');
    await page.getByRole('button', { name: /Épée longue/ }).click();
    await page.getByRole('button', { name: /\+1 PV pour Combattant 3/ }).click();
    await expect.poll(() => page.evaluate(() => window.workspaceTestData.calls)).toEqual([
      { type: 'runAction', payload: { participantId: 'actor-3', diceLineId: null } },
      { type: 'adjustHp', payload: { participantId: 'actor-3', delta: 1 } }
    ]);

    await page.getByRole('button', { name: 'Règles' }).click();
    await expect(page.locator('.workspace-context')).toContainText('Règles utiles');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Règles' })).toBeFocused();

    // Native Space on a focused command is consumed by the component, so a
    // host-level next-turn shortcut cannot fire here.
    const roundBefore = await page.locator('.workspace-round').textContent();
    await page.getByRole('button', { name: 'Annuler' }).focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('.workspace-round').textContent(), roundBefore);

    await page.locator('[data-workspace-select="actor-12"]').click();
    await expect(page.locator('.workspace-actor-sheet')).toContainText('Un nom de combattant très long');
    await expect(page.locator('.workspace-prepared-actions')).toContainText('Action au nom très long');

    await page.screenshot({ path: '/private/tmp/mj-workspace-1440.png', fullPage: true });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.setViewportSize({ width: 900, height: 900 });
    await page.screenshot({ path: '/private/tmp/mj-workspace-900.png', fullPage: true });
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));

    await page.getByRole('tab', { name: 'Bibliothèque' }).click();
    await page.getByRole('searchbox', { name: 'Rechercher dans la bibliothèque' }).fill('très long');
    await expect(page.locator('.workspace-space-library .workspace-profile-card')).toHaveCount(0);
    await page.setViewportSize({ width: 900, height: 900 });
    await expect(page.locator('.workspace-space-library')).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await context.close();
    console.log('PASS — workspace navigation, selection indépendante, panneau contextuel, focus/Espace, 15 acteurs et responsive 1440/900');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(`✖ test:browser-workspace — ${error.message}`);
  process.exitCode = 1;
});
