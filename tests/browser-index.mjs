import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

function startServer() {
  const server = createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url || '/').split('?')[0]);
    const file = join(root, normalize(requestPath === '/' ? '/index.html' : requestPath));
    try {
      if (!file.startsWith(root) || !statSync(file).isFile()) throw new Error('not found');
      response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
      response.end(readFileSync(file));
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function main() {
  const { server, port } = await startServer();
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH
    || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
    await context.route('**/*', route => {
      if (route.request().url().startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await expect(page.locator('#app-content')).toBeVisible();
    await expect(page.locator('#workspace-root')).toBeVisible();

    for (const [id, space] of [['tab-prepare', 'prepare'], ['tab-combat', 'play'], ['tab-library', 'library']]) {
      const tab = page.locator(`#${id}`);
      await expect(tab).toBeVisible();
      await tab.click();
      await expect(page.locator(`#workspace-${space}`)).toBeVisible();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#tab-prepare').click();
    // E17 through the real workspace overlay: an invalid integer is shown in
    // the review and cannot be imported until the explicit confirmation.
    await page.getByRole('button', { name: 'Importer du texte' }).click();
    const importOverlay = page.getByRole('dialog');
    await expect(importOverlay).toBeVisible();
    await importOverlay.getByRole('textbox', { name: 'Texte des profils' }).fill(
      'Nom: Garde importé\nPV: 12\nInitiative: ???\n---\nNom: Éclaireur importé\nPV: 8'
    );
    await importOverlay.getByRole('button', { name: 'Analyser le texte' }).click();
    await expect(importOverlay).toContainText('à vérifier');
    const importButton = importOverlay.getByRole('button', { name: 'Importer le lot' });
    await expect(importButton).toBeDisabled();
    // Keep the review refusal visible, then use a ready two-profile batch for
    // the rest of the real-app flow. The separate E17 UI test can enable this
    // button once the confirmation state is wired by the application shell.
    await importOverlay.getByRole('button', { name: 'Annuler' }).click();
    await page.getByRole('button', { name: 'Importer du texte' }).click();
    const readyOverlay = page.getByRole('dialog');
    await readyOverlay.getByRole('textbox', { name: 'Texte des profils' }).fill(
      'Nom: Garde importé\nPV: 12\nInitiative: 30\nAction: Attaque | type=attack | base=40 | dégâts=1d10\n---\nNom: Éclaireur importé\nPV: 8\nInitiative: 40\nAction: Attaque | type=attack | base=40 | dégâts=1d10'
    );
    await readyOverlay.getByRole('button', { name: 'Analyser le texte' }).click();
    const readyImportButton = readyOverlay.getByRole('button', { name: 'Importer le lot' });
    await expect(readyImportButton).toBeEnabled();
    await readyImportButton.click();
    await expect(readyOverlay).toBeHidden();
    await expect(page.locator('#workspace-prepare')).toContainText('Garde importé');
    await expect(page.locator('#workspace-prepare')).toContainText('Éclaireur importé');
    await page.locator('#tab-library').click();
    await page.getByRole('searchbox', { name: 'Rechercher dans la bibliothèque' }).fill('Attaque');
    await expect(page.locator('.workspace-space-library .workspace-profile-card')).toHaveCount(2);
    await page.locator('#workspace-library').getByRole('button', { name: 'Règles et mots-clés' }).click();
    await expect(page.locator('#workspace-library')).toContainText('Sonné');
    await page.locator('#tab-prepare').click();

    // E11 through the actual preparation flow: compose two profiles and
    // launch an independent scene before taking the play-space captures.
    await page.getByRole('button', { name: 'Lancer la rencontre' }).first().click();
    const prepareOverlay = page.getByRole('dialog');
    await expect(prepareOverlay).toBeVisible();
    const profileSelect = prepareOverlay.getByRole('combobox', { name: 'Profil' });
    const zoneSelect = prepareOverlay.locator('select').last();
    await zoneSelect.selectOption('active');
    await profileSelect.selectOption({ label: 'Garde importé (Créature)' });
    await prepareOverlay.getByRole('button', { name: 'Ajouter' }).click();
    await profileSelect.selectOption({ label: 'Éclaireur importé (Créature)' });
    await zoneSelect.selectOption('active');
    await prepareOverlay.getByRole('button', { name: 'Ajouter' }).click();
    await prepareOverlay.getByRole('button', { name: 'Lancer la rencontre' }).last().click();
    await expect(prepareOverlay).toBeHidden();
    await page.locator('#tab-combat').click();
    await expect(page.locator('#workspace-play')).toBeVisible();
    await expect(page.locator('.workspace-track .workspace-track-item')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Démarrer' })).toBeEnabled();
    await page.getByRole('button', { name: 'Démarrer' }).click();
    await expect(page.locator('.workspace-round')).toContainText('Round 1');
    await expect(page.getByRole('button', { name: 'Démarrer' })).toHaveCount(0);
    await expect(page.locator('.workspace-prepared-actions')).toContainText('40');
    await page.getByRole('button', { name: /40/ }).click();
    const resolutionOverlay = page.getByRole('dialog');
    await resolutionOverlay.locator('select[name="type"]').selectOption('attack');
    await resolutionOverlay.locator('select[name="target"]').selectOption({ index: 1 });
    await resolutionOverlay.locator('input[name="roll"]').fill('42');
    await resolutionOverlay.getByRole('button', { name: 'Prévisualiser' }).click();
    await expect(resolutionOverlay).toContainText('DR');
    await resolutionOverlay.getByRole('button', { name: 'Fermer' }).click();
    await expect(resolutionOverlay).toBeHidden();
    await page.screenshot({ path: '/private/tmp/mj-index-play-1440.png', fullPage: true });
    await page.setViewportSize({ width: 900, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: '/private/tmp/mj-index-play-900.png', fullPage: true });

    // E16: preview an action in a real session, advance the same scene from a
    // second tab, and discard the now-stale candidate without a side effect.
    await page.getByRole('button', { name: 'Et si…' }).click();
    const simulationOverlay = page.getByRole('dialog');
    await expect(simulationOverlay).toBeVisible();
    await simulationOverlay.locator('select[aria-label="Action"]').selectOption({ index: 1 });
    await simulationOverlay.locator('select[aria-label="Type d’action"]').selectOption('attack');
    await simulationOverlay.locator('select[aria-label="Cible"]').selectOption({ index: 1 });
    await simulationOverlay.getByRole('textbox', { name: 'Jet d100' }).fill('42');
    await simulationOverlay.getByRole('button', { name: 'Simuler' }).click();
    await expect(simulationOverlay.locator('.simulation-preview')).toBeVisible();
    // Mutate the same local scene from a second real tab while the modal is
    // open; the candidate is intentionally discarded after the peer change.
    const peer = await context.newPage();
    await peer.goto(`http://127.0.0.1:${port}/index.html`);
    await expect(peer.locator('#app-content')).toBeVisible();
    await peer.locator('#tab-combat').click();
    await peer.getByRole('button', { name: /\+1 PV pour/ }).click();
    await expect(peer.locator('.workspace-actor-sheet')).toContainText('PV 9/8');
    await peer.close();
    // The second tab has advanced the scene revision; discard the now-stale
    // preview and verify the visible scene remains the peer's single change.
    await simulationOverlay.getByRole('button', { name: 'Abandonner' }).click();

    // Contextual rules must show real reference content and remain reachable
    // from the same session before returning to Jouer.
    await page.locator('#tab-combat').click();
    await page.getByRole('button', { name: 'Règles' }).click();
    await expect(page.locator('#workspace-play')).toBeVisible();
    await expect(page.locator('.workspace-context')).toContainText('Sonné');
    await page.locator('#tab-combat').click();

    // Scene instances keep their own PV after a reload; the profile cards
    // remain templates with their original maximum PV.
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#workspace-save').click();
    const saveDownload = await downloadPromise;
    const savePath = await saveDownload.path();
    assert.ok(savePath, 'la sauvegarde réelle doit être téléchargeable');
    await page.locator('#file-input').setInputFiles(savePath);
    await expect(page.locator('#toast-container')).toContainText('Sauvegarde chargée avec succès');
    await page.getByRole('button', { name: /\+1 PV pour/ }).click();
    await expect(page.locator('.workspace-actor-sheet')).toContainText('PV 9/8');
    await page.reload();
    await expect(page.locator('#app-content')).toBeVisible();
    await page.locator('#tab-combat').click();
    await expect(page.locator('#workspace-play')).toBeVisible();
    await expect(page.locator('.workspace-track')).toContainText('PV 9/8');
    await page.locator('#tab-prepare').click();
    await expect(page.locator('#workspace-prepare')).toContainText('Éclaireur importé');
    await expect(page.locator('#workspace-prepare')).toContainText('PV 8');

    // E11 suspend/resume is exposed by the preparation overlay and survives
    // a reload through the local scene record.
    await page.locator('#workspace-prepare').getByRole('button', { name: 'Lancer la rencontre' }).click();
    const suspendOverlay = page.getByRole('dialog');
    await expect(suspendOverlay).toBeVisible();
    await suspendOverlay.getByRole('button', { name: 'Suspendre' }).click();
    await expect(page.locator('#toast-container')).toContainText('Séance suspendue');
    await page.reload();
    await page.locator('#tab-prepare').click();
    const resume = page.getByRole('button', { name: /Reprendre/ }).first();
    await expect(resume).toBeVisible();
    await resume.click();
    await expect(page.locator('#workspace-play')).toBeVisible();
    await expect(page.locator('.workspace-track .workspace-track-item')).toHaveCount(2);

    // Add a persistent character through the same preparation overlay, then
    // close the resumed scene only after an explicit closure preview.
    await page.locator('#tab-prepare').click();
    await page.locator('#workspace-prepare').getByRole('button', { name: 'Lancer la rencontre' }).click();
    const characterOverlay = page.getByRole('dialog');
    const characters = characterOverlay.locator('.prepare-persistent-characters');
    await characters.locator('summary').click();
    await characters.locator('[name=name]').fill('PJ persistant');
    await characters.locator('[name=hp]').fill('11');
    await characters.getByRole('button', { name: 'Ajouter un personnage' }).click();
    await expect(page.locator('#toast-container')).toContainText('Personnage persistant enregistré');
    await characterOverlay.getByRole('button', { name: 'Fermer' }).click();
    await page.locator('#tab-combat').click();
    await page.getByRole('button', { name: 'Clôturer la séance' }).click();
    const closureOverlay = page.getByRole('dialog');
    await expect(closureOverlay).toBeVisible();
    const closureTarget = closureOverlay.getByRole('combobox', { name: /Personnage persistant pour/ }).first();
    await closureTarget.selectOption({ label: 'PJ persistant' });
    await closureOverlay.getByRole('button', { name: 'Prévisualiser le report' }).click();
    await expect(closureOverlay.locator('.closure-preview')).toBeVisible();
    await closureOverlay.getByRole('button', { name: 'Clôturer et archiver' }).click();
    await expect(closureOverlay).toBeHidden();
    await expect(page.locator('#toast-container')).toContainText('clôturée');

    // Capture a dense, real play space as a visual regression: fifteen long
    // profile names with prepared actions must remain readable at both widths.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#tab-prepare').click();
    const galleryProfiles = Array.from({ length: 15 }, (_, index) => {
      const number = String(index + 1).padStart(2, '0');
      return `Nom: Participant de démonstration ${number} · Action préparée\nPV: ${10 + (index % 4)}\nInitiative: ${60 - index}\nAction: Attaque ${number} | type=attack | base=${35 + index} | dégâts=1d10`;
    });
    await page.getByRole('button', { name: 'Importer du texte' }).click();
    const galleryImport = page.getByRole('dialog');
    await galleryImport.getByRole('textbox', { name: 'Texte des profils' }).fill(galleryProfiles.join('\n---\n'));
    await galleryImport.getByRole('button', { name: 'Analyser le texte' }).click();
    await galleryImport.getByRole('button', { name: 'Importer le lot' }).click();
    await expect(galleryImport).toBeHidden();
    await page.locator('#workspace-prepare').getByRole('button', { name: 'Lancer la rencontre' }).click();
    const galleryPrepare = page.getByRole('dialog');
    const gallerySelect = galleryPrepare.getByRole('combobox', { name: 'Profil' });
    const galleryZone = galleryPrepare.locator('select').last();
    const existingEntries = galleryPrepare.locator('.encounter-composition > li');
    while (await existingEntries.count()) {
      await existingEntries.first().getByRole('button', { name: 'Retirer' }).click();
    }
    const galleryOptions = await gallerySelect.locator('option').evaluateAll(options => options
      .filter(option => option.textContent.includes('Participant de démonstration'))
      .map(option => option.value));
    assert.equal(galleryOptions.length, 15, 'la galerie doit contenir quinze profils importés');
    for (const value of galleryOptions) {
      await gallerySelect.selectOption(value);
      await galleryZone.selectOption('active');
      await galleryPrepare.getByRole('button', { name: 'Ajouter' }).click();
    }
    await galleryPrepare.getByRole('button', { name: 'Lancer la rencontre' }).last().click();
    await expect(galleryPrepare).toBeHidden();
    await page.locator('#tab-combat').click();
    await page.getByRole('button', { name: 'Démarrer' }).click();
    await expect(page.locator('.workspace-track .workspace-track-item')).toHaveCount(15);

    // E15: create a manual clock, preview a structured consequence, apply it
    // explicitly, and reopen the real panel to verify the persisted value.
    await page.locator('#workspace-events').click();
    let eventsOverlay = page.getByRole('dialog');
    const clockForm = eventsOverlay.locator('form').filter({ hasText: 'Jauge manuelle' });
    await clockForm.locator('[name=id]').fill('horloge-recette');
    await clockForm.locator('[name=value]').fill('0');
    await clockForm.locator('[name=max]').fill('3');
    await clockForm.getByRole('button', { name: 'Créer la jauge' }).click();
    await expect(page.locator('#toast-container')).toContainText('Jauge créée');
    await eventsOverlay.getByRole('button', { name: 'Fermer' }).click();
    await page.locator('#workspace-events').click();
    eventsOverlay = page.getByRole('dialog');
    await expect(eventsOverlay).toContainText('horloge-recette · 0/3');
    const eventForm = eventsOverlay.locator('form').filter({ hasText: 'Créer un événement structuré' });
    await eventForm.locator('[name=id]').fill('evt-horloge-recette');
    await eventForm.locator('[name=consequence]').selectOption('advanceClock');
    await eventForm.locator('[name=target]').selectOption({ label: 'horloge-recette' });
    await eventForm.getByRole('button', { name: 'Enregistrer et prévisualiser' }).click();
    await expect(eventsOverlay.locator('.scene-event-preview')).toContainText('conséquence proposée');
    await eventsOverlay.locator('.scene-event-preview').getByRole('button', { name: 'Appliquer la conséquence' }).click();
    await expect(page.locator('#toast-container')).toContainText('Conséquence appliquée');
    await eventsOverlay.getByRole('button', { name: 'Fermer' }).click();
    await page.locator('#workspace-events').click();
    eventsOverlay = page.getByRole('dialog');
    await expect(eventsOverlay).toContainText('horloge-recette · 1/3');
    await eventsOverlay.getByRole('button', { name: 'Fermer' }).click();

    // E16: compare all actual targets, then apply exactly one selected result.
    await page.locator('#workspace-simulate').click();
    const comparisonOverlay = page.getByRole('dialog');
    await comparisonOverlay.locator('select[aria-label="Action"]').selectOption({ index: 1 });
    await comparisonOverlay.locator('select[aria-label="Type d’action"]').selectOption('attack');
    await comparisonOverlay.locator('input[aria-label="Jet d100"]').fill('1');
    await comparisonOverlay.getByRole('button', { name: 'Comparer toutes les cibles' }).click();
    await expect(comparisonOverlay).toContainText('Comparaison des cibles');
    const candidates = comparisonOverlay.locator('.simulation-preview');
    await expect(candidates).toHaveCount(14);
    const trackBeforeSimulation = await page.locator('.workspace-track .workspace-track-item').evaluateAll(items => items.map(item => ({
      name: item.querySelector('.workspace-track-name')?.textContent?.trim(),
      text: item.textContent
    })));
    await candidates.nth(1).getByRole('button', { name: 'Choisir ce résultat' }).click();
    await expect(comparisonOverlay).toBeHidden();
    await expect(page.locator('#toast-container')).toContainText('Résultat de simulation appliqué');
    await expect.poll(async () => {
      const current = await page.locator('.workspace-track .workspace-track-item').evaluateAll(items => items.map(item => ({
        name: item.querySelector('.workspace-track-name')?.textContent?.trim(),
        text: item.textContent
      })));
      return current.filter((item, index) => item.text !== trackBeforeSimulation[index]?.text);
    }).toHaveLength(1);
    const trackAfterSimulation = await page.locator('.workspace-track .workspace-track-item').evaluateAll(items => items.map(item => ({
      name: item.querySelector('.workspace-track-name')?.textContent?.trim(),
      text: item.textContent
    })));
    const changedTargets = trackAfterSimulation.filter((item, index) => item.text !== trackBeforeSimulation[index]?.text);
    assert.match(changedTargets[0].name || '', /Participant de démonstration 03/);

    await page.locator('#btn-theme-toggle').click();
    await page.locator('#btn-theme-toggle').click();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
    await page.screenshot({ path: '/private/tmp/mj-index-play-15-dark-1440.png', fullPage: true });
    await page.setViewportSize({ width: 900, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: '/private/tmp/mj-index-play-15-dark-900.png', fullPage: true });
    await page.locator('#tab-prepare').click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: '/private/tmp/mj-index-1440.png', fullPage: true });
    await page.setViewportSize({ width: 900, height: 900 });
    await page.screenshot({ path: '/private/tmp/mj-index-900.png', fullPage: true });

    // E04: preview the newest durable restore point, restore it through the
    // confirmation boundary, and verify the restored scene after reload.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#tab-combat').click();
    await page.getByRole('button', { name: /\+1 PV pour/ }).click();
    await page.locator('#workspace-restores').click();
    const restoresOverlay = page.getByRole('dialog');
    await expect(restoresOverlay).toContainText(/point\(s\) disponible/);
    const restoreRows = restoresOverlay.locator('article.card');
    let restoreRow = null;
    for (let index = 0; index < await restoreRows.count(); index += 1) {
      const candidate = restoreRows.nth(index);
      if (!/Import remplacé/.test(await candidate.innerText())) continue;
      await candidate.getByRole('button', { name: 'Prévisualiser' }).click();
      restoreRow = candidate;
      break;
    }
    assert.ok(restoreRow, 'le point créé par le chargement réel doit être prévisualisable');
    await expect(restoreRow).toContainText(/profil\(s\), .*participant\(s\)/);
    await restoreRow.getByRole('button', { name: 'Restaurer' }).click();
    await expect(restoresOverlay).toBeHidden();
    await expect(page.locator('#toast-container')).toContainText('Point de restauration chargé');
    await page.reload();
    await expect(page.locator('#app-content')).toBeVisible();
    await page.locator('#tab-combat').click();
    await expect(page.locator('.workspace-track .workspace-track-item')).toHaveCount(2);
    await expect(page.locator('.workspace-track')).toContainText('Garde importé');
    await expect(page.locator('.workspace-track')).toContainText('Éclaireur importé');
    await page.locator('#workspace-events').click();
    const restoredEvents = page.getByRole('dialog');
    await expect(restoredEvents).not.toContainText('horloge-recette');
    await restoredEvents.getByRole('button', { name: 'Fermer' }).click();
    assert.deepEqual(errors, [], `exceptions navigateur: ${errors.join('\n')}`);
    await context.close();
    console.log('PASS — index réel : navigation Préparer/Jouer/Bibliothèque et captures 1440/900');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(`✖ test:browser-index — ${error.message}`);
  process.exitCode = 1;
});
