import { tmpdir } from 'node:os';
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
      // Rencontres enregistrées et scènes vivantes du faux Store (liste de Préparer).
      const encounters = [
        { id: 'enc-closed', title: 'Vieille embuscade', status: 'closed', notes: '', entries: [{ id: 'x', profileId: 'actor-1', quantity: 1 }] },
        { id: 'enc-empty', title: 'Rencontre vide', status: 'prepared', notes: '', entries: [] },
        { id: 'enc-1', title: 'Embuscade au gué', status: 'prepared', notes: '\nLe pont est piégé.\nDeuxième ligne', entries: [{ id: 'a', profileId: 'actor-1', quantity: 3 }, { id: 'b', profileId: 'actor-2', quantity: 1 }, { id: 'c', profileId: 'perdu', quantity: 1 }] }
      ];
      const scenes = { active: null, suspended: [] };
      const encounterCalls = [];
      const Store = {
        listEncounters: () => encounters,
        getActiveScene: () => scenes.active,
        listSuspendedScenes: () => scenes.suspended,
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
          removeParticipant(id) { calls.push({ type: 'remove', id }); },
          enterParticipant(id) { calls.push({ type: 'enter', id }); },
          beginEncounter() { encounterCalls.push({ type: 'begin' }); },
          editEncounter(id) { encounterCalls.push({ type: 'edit', id }); },
          launchEncounter(id) { encounterCalls.push({ type: 'launch', id }); },
          deleteEncounter(id) { encounterCalls.push({ type: 'delete', id }); },
          resumeScene(id) { encounterCalls.push({ type: 'resume', id }); },
          suspendScene() { encounterCalls.push({ type: 'suspend' }); },
          restartCombat() { encounterCalls.push({ type: 'restart' }); return true; },
          showPlay() { encounterCalls.push({ type: 'showPlay' }); }
        }
      });
      window.workspaceTestData = { combat, handlers, calls, diceLines, scenes, encounters, encounterCalls };
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

    // Liste des rencontres de Préparer : statut, composition, notes, boutons.
    const prepare = page.locator('#workspace-prepare');
    const cards = prepare.locator('.workspace-encounter-card');
    await expect(prepare.getByRole('button', { name: 'Nouvelle rencontre', exact: true })).toBeEnabled();
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toHaveAttribute('data-encounter-id', 'enc-closed');
    await expect(cards.nth(2)).toContainText('Préparée');
    const card = prepare.locator('[data-encounter-id="enc-1"].workspace-encounter-card');
    await expect(card.getByRole('heading', { name: 'Embuscade au gué' })).toBeVisible();
    await expect(card.locator('.workspace-encounter-status.is-prepared')).toHaveText('Préparée');
    await expect(card).toContainText('5 combattants · Combattant 1 ×3, Combattant 2, Profil supprimé');
    await expect(card.locator('.workspace-encounter-notes')).toHaveText('Le pont est piégé.');
    await expect(card.getByRole('button', { name: 'Lancer « Embuscade au gué »' })).toBeEnabled();
    await expect(prepare.getByRole('button', { name: 'Lancer « Rencontre vide »' })).toBeDisabled();
    await expect(prepare.getByRole('button', { name: 'Lancer « Rencontre vide »' })).toHaveAttribute('title', 'Ajoutez au moins un combattant');
    await card.getByRole('button', { name: 'Modifier « Embuscade au gué »' }).click();
    await card.getByRole('button', { name: 'Lancer « Embuscade au gué »' }).click();
    await card.getByRole('button', { name: 'Supprimer « Embuscade au gué »' }).click();
    // Avec une scène active : la carte passe « En cours », les autres « Lancer » sont bloqués.
    await page.evaluate(() => { window.workspaceTestData.scenes.active = { id: 'scene-1', title: 'Embuscade au gué', status: 'active', encounterId: 'enc-1' }; });
    await rerender();
    await expect(card.locator('.workspace-encounter-status.is-active')).toHaveText('En cours');
    await expect(cards.first()).toHaveAttribute('data-encounter-id', 'enc-1');
    await expect(prepare).toContainText('Combat en cours : « Embuscade au gué ». Suspendez-le ou supprimez la rencontre pour en lancer une autre.');
    await expect(prepare.getByRole('button', { name: 'Lancer « Vieille embuscade »' })).toBeDisabled();
    await expect(prepare.getByRole('button', { name: 'Lancer « Vieille embuscade »' })).toHaveAttribute('title', /Un combat est en cours/);
    await expect(card.getByRole('button', { name: 'Supprimer « Embuscade au gué »' })).toBeEnabled();
    await card.getByRole('button', { name: 'Revenir au combat « Embuscade au gué »' }).click();
    await card.getByRole('button', { name: 'Recommencer « Embuscade au gué »' }).click();
    await card.getByRole('button', { name: 'Suspendre « Embuscade au gué »' }).click();
    // Suspendue : « Reprendre » reste bloqué tant qu'une autre scène est active.
    await page.evaluate(() => {
      const { scenes } = window.workspaceTestData;
      scenes.suspended = [{ id: 'scene-2', status: 'suspended', encounterId: 'enc-closed' }];
      scenes.active = null;
    });
    await rerender();
    await expect(prepare.locator('.workspace-encounter-card[data-encounter-id="enc-closed"]')).toContainText('Suspendue');
    await expect(prepare.getByRole('button', { name: 'Supprimer « Vieille embuscade »' })).toBeEnabled();
    await prepare.getByRole('button', { name: 'Reprendre « Vieille embuscade »' }).click();
    await page.evaluate(() => { window.workspaceTestData.scenes.active = { id: 'scene-3', title: 'Autre', status: 'active', encounterId: 'enc-empty' }; });
    await rerender();
    await expect(prepare.getByRole('button', { name: 'Reprendre « Vieille embuscade »' })).toBeDisabled();
    assert.deepEqual(await page.evaluate(() => window.workspaceTestData.encounterCalls), [
      { type: 'edit', id: 'enc-1' }, { type: 'launch', id: 'enc-1' }, { type: 'delete', id: 'enc-1' },
      { type: 'showPlay' }, { type: 'restart' }, { type: 'suspend' }, { type: 'resume', id: 'scene-2' }
    ]);
    // Sans aucune carte (rencontre supprimée pendant le combat), la note du combat en cours reste.
    await page.evaluate(() => { const data = window.workspaceTestData; data.removed = data.encounters.splice(0); });
    await rerender();
    await expect(prepare.locator('.workspace-encounter-card')).toHaveCount(0);
    await expect(prepare).toContainText('Combat en cours : « Autre »');
    await expect(prepare).toContainText('Aucune rencontre préparée');
    await page.evaluate(() => { const data = window.workspaceTestData; data.encounters.push(...data.removed); });
    await page.evaluate(() => { const { scenes } = window.workspaceTestData; scenes.active = null; scenes.suspended = []; });
    await rerender();
    // Jouer sans combat : rencontres préparées en version compacte.
    await page.evaluate(() => { const { combat } = window.workspaceTestData; window.workspaceTestData.saved = Array.from(combat.participants); combat.participants.clear(); });
    await page.getByRole('tab', { name: 'Jouer' }).click();
    const compact = page.locator('.workspace-play-empty ~ .workspace-encounter-list .workspace-encounter-card');
    await expect(page.locator('#workspace-play')).toContainText('Rencontres préparées');
    await expect(compact).toHaveCount(3);
    await expect(compact.first().getByRole('button')).toHaveCount(1);
    await compact.filter({ hasText: 'Embuscade au gué' }).getByRole('button', { name: 'Lancer « Embuscade au gué »' }).click();
    assert.deepEqual((await page.evaluate(() => window.workspaceTestData.encounterCalls)).slice(-1), [{ type: 'launch', id: 'enc-1' }]);
    // « Recommencer » est réservé aux cartes de Préparer : aucune carte compacte de Jouer ne le propose.
    await expect(compact.getByRole('button', { name: /^Recommencer/ })).toHaveCount(0);
    await page.evaluate(() => { const { combat, saved } = window.workspaceTestData; saved.forEach(([id, actor]) => combat.participants.set(id, actor)); });
    await rerender();
    await page.getByRole('tab', { name: 'Préparer' }).click();
    await page.getByRole('tab', { name: 'Jouer' }).click();
    await expect(page.locator('.workspace-track .workspace-track-item')).toHaveCount(12);
    await expect(page.locator('.workspace-track')).toContainText('Un nom de combattant très long');
    await expect(page.locator('.workspace-track')).not.toContainText('Aucun état');
    await expect(page.locator('[data-workspace-select="actor-1"]')).toContainText('BE 3 · PA C2 B1');
    await expect(page.locator('[data-workspace-select="actor-1"]')).toContainText('Sonné · 2 t');
    // Ligne de piste : le contenu forme le nom accessible (PV, BE, PA, états), le personnage actif est pressé.
    await expect(page.locator('[data-workspace-select="actor-1"]')).not.toHaveAttribute('aria-label', /./);
    await expect(page.getByRole('button', { name: /Combattant 1 PV 10\/12 BE 3 · PA C2 B1 Sonné · 2 t/ })).toBeVisible();
    await expect(page.locator('[data-workspace-select="actor-1"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-workspace-select="actor-2"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-workspace-select="actor-2"]')).toContainText('−2/12');
    await expect(actorSheet).toContainText('Combattant 1');
    await expect(actorSheet).toContainText('Au tour de');
    await expect(actorSheet).toContainText('E · BE');
    // Default target: the first combatant of another camp in the order.
    await expect(targetSheet).toContainText('Combattant 2');
    const deadNpc = page.locator('.workspace-track').getByRole('button', { name: 'Retirer Combattant 2 du combat', exact: true });
    await expect(deadNpc).toBeVisible();
    await deadNpc.click();
    assert.deepEqual(await page.evaluate(() => window.workspaceTestData.calls.pop()), { type: 'remove', id: 'actor-2' });
    await page.evaluate(() => { window.workspaceTestData.combat.participants.get('actor-2').hp = 1; });
    await rerender();
    await expect(deadNpc).toHaveCount(0);
    await page.evaluate(() => { const npc = window.workspaceTestData.combat.participants.get('actor-2'); npc.hp = 0; npc.kind = 'PJ'; });
    await rerender();
    await expect(deadNpc).toHaveCount(0);
    await page.evaluate(() => { const npc = window.workspaceTestData.combat.participants.get('actor-2'); npc.hp = -2; npc.kind = 'Créature'; window.workspaceTestData.combat.participants.get('actor-1').hp = 0; });
    await rerender();
    await expect(deadNpc).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retirer Combattant 1 du combat', exact: true })).toHaveCount(0);
    await page.evaluate(() => { window.workspaceTestData.combat.participants.get('actor-1').hp = 10; });
    await rerender();
    // La cible par défaut porte l’étiquette « cible » dans la piste ; le tour, le marqueur ▶.
    await expect(page.locator('.workspace-track-role')).toHaveCount(1);
    await expect(page.locator('[data-workspace-select="actor-2"] .workspace-track-role')).toHaveText('cible');
    await expect(page.locator('.workspace-track-item.is-turn')).toHaveCount(1);
    await expect(page.locator('[data-workspace-select="actor-1"] .workspace-track-marker')).toHaveText('▶');
    await expect(page.locator('.workspace-pending')).toContainText('Rappel courant');

    // The bench stays visible, each waiting combatant with « Faire entrer ».
    await expect(page.locator('.workspace-bench')).toContainText('En attente (3)');
    await page.getByRole('button', { name: 'Faire entrer Combattant 13' }).click();

    // The acting sheet follows the current turn reported by the Store.
    await page.evaluate(() => { window.workspaceTestData.combat.currentActorId = 'actor-3'; });
    await rerender();
    await expect(actorSheet).toContainText('Combattant 3');
    await expect(page.locator('[data-workspace-select="actor-3"]')).toHaveAttribute('aria-current', 'step');

    await expect(actorSheet).toContainText('Au tour de');
    await expect(page.locator('[data-workspace-select="actor-3"] .workspace-track-marker')).toHaveText('▶');

    // Selecting a row makes it the active character (sheet + actions), not the target; the turn marker stays.
    await page.locator('[data-workspace-select="actor-5"]').click();
    await expect(actorSheet).toContainText('Combattant 5');
    await expect(actorSheet).toContainText('Agit hors tour');
    await expect(page.locator('[data-workspace-select="actor-5"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-workspace-select="actor-3"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-workspace-select="actor-3"] .workspace-track-marker')).toHaveText('▶');
    await expect(page.locator('[data-workspace-select="actor-5"] .workspace-track-marker')).toHaveText('');
    await expect(page.locator('[data-workspace-select="actor-3"]')).toHaveAttribute('aria-current', 'step');
    await rerender();
    await expect(actorSheet).toContainText('Combattant 5');
    // Le combattant du tour redevient « Au tour de ».
    await page.locator('[data-workspace-select="actor-3"]').click();
    await expect(actorSheet).toContainText('Combattant 3');
    await expect(actorSheet).toContainText('Au tour de');
    // Un autre tour (Store) fait oublier le choix.
    await page.locator('[data-workspace-select="actor-5"]').click();
    await page.evaluate(() => { window.workspaceTestData.combat.currentActorId = 'actor-4'; });
    await rerender();
    await expect(actorSheet).toContainText('Combattant 4');
    await expect(actorSheet).toContainText('Au tour de');
    await page.evaluate(() => { window.workspaceTestData.combat.currentActorId = 'actor-3'; });
    await rerender();
    // Combat non commencé : « Personnage actif », aucun marqueur.
    await page.evaluate(() => { window.workspaceTestData.combat.round = 0; });
    await rerender();
    await expect(actorSheet).toContainText('Personnage actif');
    await expect(page.locator('.workspace-track-item.is-turn')).toHaveCount(0);
    // Pas de tour annoncé aux lecteurs d'écran non plus.
    await expect(page.locator('.workspace-track [aria-current="step"]')).toHaveCount(0);
    await page.locator('[data-workspace-select="actor-6"]').click();
    await expect(actorSheet).toContainText('Combattant 6');
    await expect(actorSheet).toContainText('Personnage actif');
    await page.evaluate(() => { window.workspaceTestData.combat.round = 3; });
    await rerender();
    await expect(actorSheet).toContainText('Combattant 3');

    // La cible se choisit dans Résolution, et la piste l’étiquette « cible ».
    await page.locator('.workspace-resolution').getByRole('group', { name: 'Alliés' }).getByRole('button', { name: 'Combattant 5', exact: true }).click();
    await expect(targetSheet).toContainText('Combattant 5');
    await expect(actorSheet).toContainText('Combattant 3');
    await expect(page.locator('[data-workspace-select="actor-5"] .workspace-track-role')).toHaveText('cible');
    await expect(page.locator('.workspace-track-role')).toHaveCount(1);
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
    // 23 n'est pas un double, mais la cible est à −2 PV : Acharnement, donc critique. Sans sa localisation, pas de dégâts.
    await expect(result).toContainText('Acharnement : cible à −2 PV, gravité +10');
    await expect(result).toContainText('Dégâts : lancez d’abord la localisation du critique.');
    await expect(page.getByRole('button', { name: 'Appliquer les dégâts à Combattant 2' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Appliquer les dégâts à Combattant 2' })).toHaveAttribute('title', 'Lancez d’abord la localisation du critique');
    await page.locator('[data-roll-input="critical-location"]').fill('32');
    await page.locator('[data-roll-input="critical-location"]').press('Enter');
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
    await page.locator('[data-roll-input="critical-location"]').fill('32');
    await page.locator('[data-roll-input="critical-location"]').press('Enter');
    await expect(result.locator('.workspace-formula-notes').filter({ hasText: 'Inoffensive' })).toHaveText('Inoffensive : PA ×2, pas de minimum');
    await page.evaluate(() => { delete window.workspaceTestData.diceLines[0].qualities; });
    await page.getByRole('button', { name: 'Annuler le résultat calculé' }).click();

    // « Comparer les cibles » : mêmes jets sur chaque cible possible, rien n'est appliqué.
    await page.getByRole('button', { name: 'Comparer les cibles' }).click();
    const comparison = page.locator('.workspace-comparison-item');
    await expect(comparison).toHaveCount(11);
    await expect(comparison.first()).toContainText('Combattant 2 : touché · coup critique (localisation à lancer)');
    await expect(comparison.nth(1)).toContainText('Combattant 4 : touché · 10 dégâts · PV 10 → 0');
    await expect(page.locator('.workspace-comparison')).toContainText('Combattant 5 : ');
    await page.getByRole('button', { name: 'Choisir Combattant 4' }).click();
    await expect(comparison).toHaveCount(0);
    await expect(targetSheet).toContainText('Combattant 4');
    await expect(page.getByRole('button', { name: /^Appliquer \d+ dégâts à Combattant 4$/ })).toBeVisible();
    await page.getByRole('button', { name: 'Annuler le résultat calculé' }).click();
    await page.locator('.workspace-resolution').getByRole('group', { name: 'Adversaires' }).getByRole('button', { name: 'Combattant 2', exact: true }).click();
    await expect(page.locator('.workspace-defense-base')).toHaveValue('41');

    // Défense : les jets enregistrés de la cible rejoignent le choix ; le jet défensif est proposé d’office.
    await page.evaluate(() => {
      window.workspaceTestData.diceLines.push(
        { participantId: 'actor-2', note: 'Épée rouillée', base: 30, type: 'attack', damage: 5 },
        { participantId: 'actor-2', note: 'Esquive', base: 38, type: 'defense' }
      );
    });
    await page.locator('.workspace-resolution').getByRole('group', { name: 'Adversaires' }).getByRole('button', { name: 'Combattant 2', exact: true }).click();
    const defenseSelect = page.getByRole('combobox', { name: 'Défense de Combattant 2 : caractéristique ou jet' });
    await expect(defenseSelect.locator('option:checked')).toHaveText('Esquive · 38');
    await expect(defenseSelect.locator('optgroup[label="Jets enregistrés"] option')).toHaveText(['Épée rouillée · 30', 'Esquive · 38']);
    await expect(defenseSelect.locator('optgroup[label="Caractéristiques"] option')).toHaveText(['CC · 41', 'Ag · 33']);
    await expect(page.locator('.workspace-defense-base')).toHaveValue('38');
    await expect(page.locator('.workspace-defense .workspace-roll-label').last()).toHaveText('Jet de défense (Esquive 38)');
    await page.locator('[data-roll-input="defense"]').fill('88');
    await page.locator('[data-roll-input="defense"]').press('Enter');
    await expect(result).toContainText('Défense : Échec · DR −5');
    await expect(result).toContainText('DR net +7 · touché');
    await page.getByRole('button', { name: 'Comparer les cibles' }).click();
    await expect(page.locator('.workspace-comparison-item').first()).toContainText('Combattant 2 : touché');
    await defenseSelect.selectOption('CC');
    await expect(page.locator('.workspace-defense-base')).toHaveValue('41');
    // Un jet choisi à la main le reste en revenant sur cette cible ; une cible sans ce jet prend son propre défaut.
    const adversaries = page.locator('.workspace-resolution').getByRole('group', { name: 'Adversaires' });
    await defenseSelect.selectOption({ label: 'Épée rouillée · 30' });
    await expect(page.locator('.workspace-defense-base')).toHaveValue('30');
    await adversaries.getByRole('button', { name: 'Combattant 4', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Défense de Combattant 4 : caractéristique ou jet' }).locator('option:checked')).toHaveText('CC · 43');
    await expect(page.locator('.workspace-defense-base')).toHaveValue('43');
    await adversaries.getByRole('button', { name: 'Combattant 2', exact: true }).click();
    await expect(defenseSelect.locator('option:checked')).toHaveText('Épée rouillée · 30');
    await expect(page.locator('.workspace-defense-base')).toHaveValue('30');
    // Le jet disparaît de la cible : le choix retombe sur la CC, valeur comprise.
    await page.evaluate(() => { window.workspaceTestData.diceLines.length = 2; });
    await rerender();
    await expect(defenseSelect.locator('option:checked')).toHaveText('CC · 41');
    await expect(page.locator('.workspace-defense-base')).toHaveValue('41');
    // Valeur saisie à la main : gardée d'un rendu à l'autre ; « Autre » garde aussi sa valeur libre.
    await page.locator('.workspace-defense-base').fill('55');
    await rerender();
    await expect(page.locator('.workspace-defense-base')).toHaveValue('55');
    await expect(page.locator('.workspace-defense .workspace-roll-label').last()).toHaveText('Jet de défense (CC 55)');
    await defenseSelect.selectOption('Autre');
    await expect(page.locator('.workspace-defense-base')).toHaveValue('');
    await page.locator('.workspace-defense-base').fill('60');
    await rerender();
    await expect(page.locator('.workspace-defense-base')).toHaveValue('60');
    await expect(page.locator('.workspace-defense .workspace-roll-label').last()).toHaveText('Jet de défense (valeur 60)');
    await defenseSelect.selectOption('CC');
    await expect(page.locator('.workspace-defense-base')).toHaveValue('41');
    await attack.fill('0');
    await attack.press('Enter');
    await expect(page.locator('.workspace-resolution [role="alert"]')).toContainText('Le jet doit être un nombre de 1 à 100 (00 = 100).');

    // Coup critique sur un double : localisation, gravité, cases à cocher, second critique.
    await page.locator('[data-roll-input="defense"]').fill('');
    await page.evaluate(() => { window.workspaceTestData.combat.participants.get('actor-4').hp = 3; });
    await page.locator('.workspace-resolution').getByRole('group', { name: 'Adversaires' }).getByRole('button', { name: 'Combattant 4', exact: true }).click();
    await attack.fill('22');
    await attack.press('Enter');
    const critical = page.locator('.workspace-critical').first();
    await expect(result).toContainText('Coup critique');
    await expect(result).not.toContainText('Acharnement');
    await expect(critical.locator('.workspace-roll-label').first()).toHaveText('Localisation du critique (nouveau d100)');
    await expect(page.locator('[data-roll-input="critical-effect"]')).toHaveCount(0);
    await expect(result).toContainText('Dégâts : lancez d’abord la localisation du critique.');
    await expect(targetSheet.locator('.silhouette-zone.is-hit')).toHaveCount(0);
    // Un jet invalide s'affiche sous son champ sans effacer le bloc.
    const criticalLocation = page.locator('[data-roll-input="critical-location"]');
    await criticalLocation.fill('abc');
    await criticalLocation.press('Enter');
    await expect(critical.locator('[role="alert"]')).toHaveText('Le jet doit être un nombre de 1 à 100 (00 = 100).');
    await expect(criticalLocation).toHaveAttribute('aria-invalid', 'true');
    // Taper ne perd aucun caractère malgré un rendu du Bus ; « Lancer » recalcule aussitôt.
    await criticalLocation.fill('');
    await criticalLocation.pressSequentially('5');
    await rerender();
    await expect(criticalLocation).toBeFocused();
    await criticalLocation.pressSequentially('7');
    await criticalLocation.press('Enter');
    await expect(result).toContainText('57 → corps');
    await expect(targetSheet.locator('.silhouette-zone.is-hit')).toHaveAttribute('data-zone', 'body');
    await expect(result).toContainText('8 arme + 2 DR − 3 BE − 2 PA = 5');
    await expect(result).toContainText('PV 3 → −2');
    await expect(result).toContainText('Second critique — PV sous zéro · bras gauche (jet inversé 22)');
    await expect(page.locator('.workspace-critical.is-second [data-roll-input="critical-second"]')).toBeVisible();
    // Gravité 43 (corps) : +2 Blessures, rappels ; les deux cases sont cochées par défaut.
    await page.locator('[data-roll-input="critical-effect"]').fill('43');
    await page.locator('[data-roll-input="critical-effect"]').press('Enter');
    await expect(result).toContainText('43 → « Clavicule tordue » : +2 Blessures, un bras inutilisable 1d10 rounds.');
    await expect(result).toContainText('À arbitrer : un bras inutilisable 1d10 rounds');
    const wounds = page.getByRole('checkbox', { name: '+2 Blessures' });
    await expect(wounds).toBeChecked();
    await expect(result).toContainText('PV 3 → −4');
    await expect(page.getByRole('button', { name: 'Appliquer 7 dégâts à Combattant 4' })).toBeVisible();
    await wounds.uncheck();
    await expect(wounds).toBeFocused();
    await expect(wounds).not.toBeChecked();
    await expect(result).toContainText('PV 3 → −2');
    await expect(page.locator('[data-roll-input="critical-effect"]')).toHaveValue('43');
    await wounds.check();
    // Gravité du second critique (Bras Gauche, 60) : +3 Blessures en plus, coche indépendante.
    await page.locator('[data-roll-input="critical-second"]').fill('60');
    await page.locator('[data-roll-input="critical-second"]').press('Enter');
    await expect(result).toContainText('60 → « Ligament rompu »');
    await expect(page.getByRole('checkbox', { name: '+3 Blessures' })).toBeChecked();
    await expect(result).toContainText('PV 3 → −7');
    await page.getByRole('checkbox', { name: '+3 Blessures' }).uncheck();
    await expect(result).toContainText('PV 3 → −4');
    // Un changement de jet d'attaque remet les jets de critique à zéro.
    await attack.fill('33');
    await expect(criticalLocation).toHaveCount(0);
    await attack.press('Enter');
    await expect(page.locator('[data-roll-input="critical-location"]')).toHaveValue('');
    await page.getByRole('button', { name: 'Annuler le résultat calculé' }).click();
    // Comparer les cibles : critique en attente de localisation ; comparer puis choisir remet
    // à zéro les jets de critique de l'aperçu remplacé.
    await attack.fill('22');
    await attack.press('Enter');
    await page.locator('[data-roll-input="critical-location"]').fill('57');
    await page.locator('[data-roll-input="critical-location"]').press('Enter');
    await page.getByRole('button', { name: 'Comparer les cibles' }).click();
    await expect(page.locator('.workspace-comparison-item').first()).toContainText('touché · coup critique (localisation à lancer)');
    await page.locator('.workspace-comparison-item').first().getByRole('button').click();
    await expect(page.locator('[data-roll-input="critical-location"]')).toHaveValue('');
    await expect(page.locator('.workspace-resolution [data-focus-key="apply"]')).toHaveAttribute('title', 'Lancez d’abord la localisation du critique');
    await page.locator('.workspace-resolution').getByRole('group', { name: 'Adversaires' }).getByRole('button', { name: 'Combattant 2', exact: true }).click();
    await attack.fill('0');
    await attack.press('Enter');

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
    await expect(actorSheet).toContainText('Un nom de combattant très long');
    await expect(actorSheet).toContainText('Agit hors tour');

    await page.screenshot({ path: join(tmpdir(), 'mj-workspace-1440.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.setViewportSize({ width: 900, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: join(tmpdir(), 'mj-workspace-900.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));

    await page.getByRole('tab', { name: 'Bibliothèque' }).click();
    await page.getByRole('searchbox', { name: 'Rechercher dans la bibliothèque' }).fill('très long');
    await expect(page.locator('.workspace-space-library .workspace-profile-card')).toHaveCount(0);
    await page.setViewportSize({ width: 900, height: 900 });
    await expect(page.locator('.workspace-space-library')).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await context.close();
    console.log('PASS — workspace navigation, duel, personnage actif et cible, résolution intégrée sans frappe perdue, panneau latéral, focus/Espace, 15 acteurs et responsive 1440/900');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(`✖ test:browser-workspace — ${error.message}`);
  process.exitCode = 1;
});
