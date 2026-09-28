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

// Les commandes de séance vivent dans le menu ⋯ de la barre du haut.
async function openAppMenu(page) {
  const menu = page.locator('#app-menu');
  if (!(await menu.evaluate(element => element.matches(':popover-open')))) await page.locator('#btn-menu').click();
  await expect(menu).toBeVisible();
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
    await expect(page.locator('#btn-undo')).toHaveAccessibleName('Annuler');
    await openAppMenu(page);
    await expect(page.locator('#app-menu')).toHaveAttribute('role', 'dialog');
    await expect(page.locator('#app-menu [role="menuitem"]')).toHaveCount(0);
    await expect(page.locator('#workspace-save')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#workspace-load')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#app-menu')).toBeHidden();
    await expect(page.locator('#btn-menu')).toBeFocused();
    // E17 through the real workspace overlay: an invalid integer is shown in
    // the review and cannot be imported until the explicit confirmation.
    await openAppMenu(page);
    await page.locator('#app-menu').getByRole('button', { name: 'Importer du texte' }).click();
    const importOverlay = page.getByRole('dialog');
    await expect(importOverlay).toBeVisible();
    await importOverlay.getByRole('textbox', { name: 'Texte des profils' }).fill(
      'Nom: Garde importé\nPV: 12\nInitiative: ???\n---\nNom: Éclaireur importé\nPV: 8'
    );
    await importOverlay.getByRole('button', { name: 'Analyser le texte' }).click();
    await expect(importOverlay).toContainText('à vérifier');
    // Aperçu lisible (pas de JSON) et motifs de revue en français, avec la ligne du texte saisi.
    await expect(importOverlay.locator('pre')).toHaveCount(0);
    await expect(importOverlay.locator('.import-text-review')).toContainText('Garde importé, ligne 3 : nombre entier attendu (Initiative « ??? »)');
    await expect(importOverlay.getByRole('heading', { level: 2 })).toHaveText('Importer des profils depuis du texte');
    const importButton = importOverlay.getByRole('button', { name: 'Importer 2 profils' });
    await expect(importButton).toBeDisabled();
    // Keep the review refusal visible, then use a ready two-profile batch for
    // the rest of the real-app flow. The separate E17 UI test can enable this
    // button once the confirmation state is wired by the application shell.
    await importOverlay.getByRole('button', { name: 'Annuler' }).click();
    await openAppMenu(page);
    await page.locator('#app-menu').getByRole('button', { name: 'Importer du texte' }).click();
    const readyOverlay = page.getByRole('dialog');
    await readyOverlay.getByRole('textbox', { name: 'Texte des profils' }).fill(
      'Nom: Garde importé\nPV: 12\nInitiative: 30\nF: 35\nAction: Attaque | type=attack | base=40 | dégâts=BF+4\n---\nNom: Éclaireur importé\nPV: 8\nInitiative: 40\nF: 35\nAction: Attaque | type=attack | base=40 | dégâts=BF+4'
    );
    await readyOverlay.getByRole('button', { name: 'Analyser le texte' }).click();
    await expect(readyOverlay.locator('.import-text-profile').first()).toContainText('Attaque 40 · dégâts BF+4 = 7');
    const readyImportButton = readyOverlay.getByRole('button', { name: 'Importer 2 profils' });
    await expect(readyImportButton).toBeEnabled();
    await readyImportButton.click();
    await expect(readyOverlay).toBeHidden();
    await expect(page.locator('#toast-container')).toContainText('2 profils importés');
    await expect(page.locator('#workspace-prepare')).toContainText('Garde importé');
    await expect(page.locator('#workspace-prepare')).toContainText('Éclaireur importé');
    await page.locator('#tab-library').click();
    await page.getByRole('searchbox', { name: 'Rechercher dans la bibliothèque' }).fill('Attaque');
    await expect(page.locator('.workspace-space-library .workspace-profile-card')).toHaveCount(2);
    await page.locator('#workspace-library').getByRole('button', { name: 'Règles et mots-clés' }).click();
    await expect(page.locator('#workspace-library')).toContainText('Sonné');
    await expect(page.locator('#workspace-library .rules-title')).toBeVisible();
    await page.locator('#tab-prepare').click();

    // E11 through the actual preparation flow: compose two profiles and
    // launch an independent scene before taking the play-space captures.
    await page.getByRole('button', { name: 'Lancer la rencontre' }).first().click();
    const prepareOverlay = page.getByRole('dialog');
    await expect(prepareOverlay).toBeVisible();
    // Fenêtre d'outil non modale : un seul titre, focus à l'intérieur, et les
    // onglets restent utilisables sans la fermer.
    await expect(prepareOverlay.getByRole('heading', { name: 'Préparer une rencontre' })).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('dialog.tool-sheet')))).toBe(true);
    await page.locator('#tab-library').click();
    await expect(page.locator('#workspace-library')).toBeVisible();
    await expect(prepareOverlay).toBeVisible();
    await page.locator('#tab-prepare').click();
    const campSelect = prepareOverlay.getByRole('combobox', { name: 'Camp' });
    await prepareOverlay.getByRole('combobox', { name: 'Profil' }).selectOption({ label: 'Garde importé (Créature)' });
    await expect(campSelect).toHaveValue('ennemi');
    const profileSelect = prepareOverlay.getByRole('combobox', { name: 'Profil' });
    const zoneSelect = prepareOverlay.locator('select').last();
    await zoneSelect.selectOption('active');
    await profileSelect.selectOption({ label: 'Garde importé (Créature)' });
    await prepareOverlay.getByRole('button', { name: 'Ajouter' }).click();
    await expect(prepareOverlay.locator('.encounter-composition')).toContainText('Garde importé ×1 · Ennemi · actif');
    await profileSelect.selectOption({ label: 'Éclaireur importé (Créature)' });
    await zoneSelect.selectOption('active');
    await prepareOverlay.getByRole('button', { name: 'Ajouter' }).click();
    await prepareOverlay.getByRole('button', { name: 'Lancer la rencontre' }).last().click();
    await expect(prepareOverlay).toBeHidden();
    await expect(page.locator('#toast-container')).toContainText('Rencontre lancée');
    await page.locator('#tab-combat').click();
    await expect(page.locator('#workspace-play')).toBeVisible();
    await expect(page.locator('.workspace-track .workspace-track-item')).toHaveCount(2);
    const startButton = page.locator('#combat-banner').getByRole('button', { name: 'Commencer le combat' });
    await expect(startButton).toBeEnabled();
    await startButton.click();
    await expect(page.locator('#combat-banner')).toContainText('Round 1');
    await expect(startButton).toHaveCount(0);
    // Integrated resolution (no modal): the acting combatant's action is
    // preselected, the attack roll is typed in place, then « Calculer ».
    const resolution = page.locator('.workspace-resolution');
    await expect(resolution).toContainText('40');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await resolution.locator('[data-roll-input="attack"]').fill('23');
    await resolution.getByRole('button', { name: 'Calculer' }).click();
    await expect(resolution.locator('.workspace-result')).toContainText('DR +2');
    await page.screenshot({ path: '/private/tmp/mj-index-play-1440.png', fullPage: true });
    await page.setViewportSize({ width: 900, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: '/private/tmp/mj-index-play-900.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });

    // E16 : calculer n'applique rien. Le second onglet réel modifie la même
    // scène locale pendant que le résultat est affiché ; la suite du scénario
    // dépend de cette mutation.
    const trackBeforeApply = await page.locator('.workspace-track').textContent();
    const peer = await context.newPage();
    await peer.goto(`http://127.0.0.1:${port}/index.html`);
    await expect(peer.locator('#app-content')).toBeVisible();
    await peer.locator('#tab-combat').click();
    await peer.locator('.workspace-sheet-actor').getByRole('button', { name: /\+1 PV pour/ }).click();
    await expect(peer.locator('.workspace-sheet-actor')).toContainText('PV 9/8');
    await peer.close();
    assert.equal(await page.locator('.workspace-track').textContent(), trackBeforeApply, 'calculer ne doit modifier aucun PV');
    await resolution.getByRole('button', { name: /^Appliquer \d+ dégâts à Garde importé$/ }).click();
    await expect(page.locator('#toast-container')).toContainText(/\d+ dégâts appliqués à Garde importé/);
    await expect(page.locator('[data-workspace-select]').filter({ hasText: 'Garde importé' })).toContainText('PV 3/12');
    await expect(resolution.locator('.workspace-result')).toHaveCount(0);

    // Contextual rules must show real reference content and remain reachable
    // from the same session before returning to Jouer.
    await page.locator('#tab-combat').click();
    await page.locator('.workspace-side').getByRole('tab', { name: 'Règles' }).click();
    await expect(page.locator('#workspace-play')).toBeVisible();
    await expect(page.locator('.workspace-side')).toContainText('Sonné');
    await page.locator('#tab-combat').click();

    // Scene instances keep their own PV after a reload; the profile cards
    // remain templates with their original maximum PV.
    const downloadPromise = page.waitForEvent('download');
    await openAppMenu(page);
    await page.locator('#workspace-save').click();
    const saveDownload = await downloadPromise;
    const savePath = await saveDownload.path();
    assert.ok(savePath, 'la sauvegarde réelle doit être téléchargeable');
    await page.locator('#file-input').setInputFiles(savePath);
    await expect(page.locator('#toast-container')).toContainText('Sauvegarde chargée avec succès');
    await page.locator('.workspace-sheet-actor').getByRole('button', { name: /\+1 PV pour/ }).click();
    await expect(page.locator('.workspace-sheet-actor')).toContainText('PV 9/8');
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
    await openAppMenu(page);
    const resume = page.locator('#app-menu').getByRole('button', { name: /Reprendre/ }).first();
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
    await expect(page.locator('#toast-container')).toContainText('Personnage persistant ajouté');
    await characterOverlay.getByRole('button', { name: 'Fermer' }).click();
    await page.locator('#tab-combat').click();
    await openAppMenu(page);
    await page.locator('#app-menu').getByRole('button', { name: 'Clôturer la séance' }).click();
    const closureOverlay = page.getByRole('dialog');
    await expect(closureOverlay).toBeVisible();
    await expect(closureOverlay.getByRole('heading')).toHaveText(['Clôturer la séance']);
    const closureTarget = closureOverlay.getByRole('combobox', { name: /Personnage persistant pour/ }).first();
    await closureTarget.selectOption({ label: 'PJ persistant' });
    await closureOverlay.getByRole('button', { name: 'Voir le report' }).click();
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
      return `Nom: Participant de démonstration ${number} · Action préparée\nPV: ${10 + (index % 4)}\nInitiative: ${60 - index}\nF: 30\nAction: Attaque ${number} | type=attack | base=${35 + index} | dégâts=BF+4`;
    });
    await openAppMenu(page);
    await page.locator('#app-menu').getByRole('button', { name: 'Importer du texte' }).click();
    const galleryImport = page.getByRole('dialog');
    await galleryImport.getByRole('textbox', { name: 'Texte des profils' }).fill(galleryProfiles.join('\n---\n'));
    await galleryImport.getByRole('button', { name: 'Analyser le texte' }).click();
    await galleryImport.getByRole('button', { name: 'Importer 15 profils' }).click();
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
    await page.locator('#combat-banner').getByRole('button', { name: 'Commencer le combat' }).click();
    await expect(page.locator('.workspace-track .workspace-track-item')).toHaveCount(15);

    // E15: create a manual clock, preview a structured consequence, apply it
    // explicitly, and reopen the real panel to verify the persisted value.
    await openAppMenu(page);
    await page.locator('#workspace-events').click();
    let eventsOverlay = page.getByRole('dialog');
    const clockForm = eventsOverlay.locator('form').filter({ hasText: 'Jauge manuelle' });
    await clockForm.locator('[name=id]').fill('horloge-recette');
    await clockForm.locator('[name=value]').fill('0');
    await clockForm.locator('[name=max]').fill('3');
    await clockForm.getByRole('button', { name: 'Créer la jauge' }).click();
    await expect(page.locator('#toast-container')).toContainText('Jauge créée');
    // Les toasts passent à gauche de la fenêtre d'outil ouverte.
    const toastBox = await page.locator('#toast-container').boundingBox();
    const sheetBox = await eventsOverlay.boundingBox();
    assert.ok(toastBox.x + toastBox.width <= sheetBox.x, 'les toasts ne doivent pas recouvrir la fenêtre d’outil');
    // Pendant qu'une fenêtre est ouverte, le bandeau et la piste restent utilisables.
    const roundBefore = await page.locator('#combat-banner').textContent();
    await page.locator('#combat-banner').getByRole('button', { name: 'Tour suivant' }).click();
    await expect.poll(() => page.locator('#combat-banner').textContent()).not.toBe(roundBefore);
    await expect(eventsOverlay).toBeVisible();
    await page.locator('[data-workspace-select]').filter({ hasText: 'Participant de démonstration 04' }).click();
    await expect(page.locator('.workspace-sheet-target')).toContainText('Participant de démonstration 04');
    await expect(eventsOverlay).toBeVisible();
    // Une seule fenêtre à la fois ; Échap ferme et rend le focus au menu ⋯.
    await openAppMenu(page);
    await page.locator('#workspace-archives').click();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toHaveText('Archives de séances');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('#btn-menu')).toBeFocused();
    await openAppMenu(page);
    await page.locator('#workspace-events').click();
    eventsOverlay = page.getByRole('dialog');
    await expect(eventsOverlay).toContainText('horloge-recette · 0/3');
    const eventForm = eventsOverlay.locator('form').filter({ hasText: 'Créer un événement structuré' });
    await eventForm.locator('[name=id]').fill('evt-horloge-recette');
    await eventForm.locator('[name=consequence]').selectOption('advanceClock');
    await eventForm.locator('[name=target]').selectOption({ label: 'horloge-recette' });
    await eventForm.getByRole('button', { name: 'Enregistrer et prévisualiser' }).click();
    await expect(eventsOverlay.locator('.scene-event-preview pre')).toHaveCount(0);
    await expect(eventsOverlay.locator('.scene-event-preview')).toContainText('Conséquence proposée');
    await eventsOverlay.locator('.scene-event-preview').getByRole('button', { name: 'Appliquer la conséquence' }).click();
    await expect(page.locator('#toast-container')).toContainText('Conséquence appliquée');
    await eventsOverlay.getByRole('button', { name: 'Fermer' }).click();
    await openAppMenu(page);
    await page.locator('#workspace-events').click();
    eventsOverlay = page.getByRole('dialog');
    await expect(eventsOverlay).toContainText('horloge-recette · 1/3');
    await eventsOverlay.getByRole('button', { name: 'Fermer' }).click();

    // E16 : choisir une cible parmi les quinze dans la piste, calculer sans
    // appliquer (aucun PV ne bouge), puis appliquer exactement ce résultat.
    const trackTexts = () => page.locator('.workspace-track .workspace-track-item').evaluateAll(items => items.map(item => item.textContent));
    await page.locator('[data-workspace-select]').filter({ hasText: 'Participant de démonstration 03' }).click();
    await expect(page.locator('.workspace-sheet-target')).toContainText('Participant de démonstration 03');
    const galleryResolution = page.locator('.workspace-resolution');
    await galleryResolution.locator('[data-roll-input="attack"]').fill('1');
    await galleryResolution.locator('[data-roll-input="attack"]').press('Enter');
    await expect(galleryResolution.locator('.workspace-result')).toBeVisible();
    const trackBeforeResolution = await trackTexts();
    await page.waitForTimeout(200);
    assert.deepEqual(await trackTexts(), trackBeforeResolution, 'calculer ne doit rien appliquer');
    await galleryResolution.getByRole('button', { name: /^Appliquer \d+ dégâts à Participant de démonstration 03/ }).click();
    await expect(page.locator('#toast-container')).toContainText(/dégâts appliqués à Participant de démonstration 03/);
    await expect.poll(async () => (await trackTexts()).filter((text, index) => text !== trackBeforeResolution[index]).length).toBe(1);
    const changedRows = (await trackTexts()).filter((text, index) => text !== trackBeforeResolution[index]);
    assert.match(changedRows[0], /Participant de démonstration 03/);

    // E16 « Et si… » : comparer toutes les cibles avec les mêmes jets, sans rien
    // appliquer, puis choisir une ligne pour retrouver l'aperçu de « Calculer ».
    await galleryResolution.locator('[data-roll-input="attack"]').fill('1');
    const trackBeforeCompare = await trackTexts();
    await galleryResolution.getByRole('button', { name: 'Comparer les cibles' }).click();
    const comparisonRows = galleryResolution.locator('.workspace-comparison-item');
    await expect(comparisonRows).toHaveCount(14);
    await expect(comparisonRows.first()).toContainText(/ : touché · \d+ dégâts · PV \d+ → −?\d+/);
    await page.waitForTimeout(200);
    assert.deepEqual(await trackTexts(), trackBeforeCompare, 'comparer ne doit rien appliquer');
    const chosenName = (await comparisonRows.nth(1).locator('span').textContent()).split(' : ')[0];
    await comparisonRows.nth(1).getByRole('button', { name: `Choisir ${chosenName}` }).click();
    await expect(comparisonRows).toHaveCount(0);
    await expect(page.locator('.workspace-sheet-target')).toContainText(chosenName);
    const applyChosen = galleryResolution.locator('[data-focus-key="apply"]');
    await expect(applyChosen).toContainText(`à ${chosenName}`);
    // Aperçu périmé : la cible change après le calcul (ici −1 PV sur sa fiche,
    // voir le rapport pour le second onglet) ; rien n'est appliqué.
    await page.locator('.workspace-sheet-target').getByRole('button', { name: `−1 PV pour ${chosenName}` }).click();
    const trackBeforeStale = await trackTexts();
    await applyChosen.click();
    await expect(galleryResolution.locator('[role="alert"]')).toHaveText('La partie a changé depuis le calcul : recalculez.');
    await page.waitForTimeout(200);
    assert.deepEqual(await trackTexts(), trackBeforeStale, 'un aperçu périmé ne doit rien appliquer');

    await openAppMenu(page);
    await page.locator('#btn-theme-toggle').click();
    await page.locator('#btn-theme-toggle').click();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
    await expect(page.locator('#btn-theme-toggle')).toHaveText('Thème : Sombre');
    await page.keyboard.press('Escape');
    await expect(page.locator('#app-menu')).toBeHidden();
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
    await page.locator('.workspace-sheet-actor').getByRole('button', { name: /\+1 PV pour/ }).click();
    await openAppMenu(page);
    await page.locator('#workspace-restores').click();
    const restoresOverlay = page.getByRole('dialog');
    await expect(restoresOverlay.getByRole('heading', { level: 2 })).toHaveText('Versions précédentes');
    await expect(restoresOverlay).toContainText(/\d+ versions? disponibles?/);
    const restoreRows = restoresOverlay.locator('article.card');
    let restoreRow = null;
    for (let index = 0; index < await restoreRows.count(); index += 1) {
      const candidate = restoreRows.nth(index);
      if (!/Import remplacé/.test(await candidate.innerText())) continue;
      await candidate.getByRole('button', { name: 'Voir le contenu' }).click();
      restoreRow = candidate;
      break;
    }
    assert.ok(restoreRow, 'le point créé par le chargement réel doit être prévisualisable');
    await expect(restoreRow).toContainText(/profil\(s\), .*participant\(s\)/);
    await restoreRow.getByRole('button', { name: 'Restaurer' }).click();
    await expect(restoresOverlay).toBeHidden();
    await expect(page.locator('#toast-container')).toContainText('Version précédente restaurée');
    await page.reload();
    await expect(page.locator('#app-content')).toBeVisible();
    await page.locator('#tab-combat').click();
    await expect(page.locator('.workspace-track .workspace-track-item')).toHaveCount(2);
    await expect(page.locator('.workspace-track')).toContainText('Garde importé');
    await expect(page.locator('.workspace-track')).toContainText('Éclaireur importé');
    await openAppMenu(page);
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
