// C9 : « Créer depuis un JSON » porte tout le profil (talents, compétences, prières, ressources). Parcours dans l'index réel.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

function startServer() {
  const server = createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url || '/').split('?')[0]);
    const file = join(root, normalize(requestPath === '/' ? '/index.html' : requestPath));
    try {
      if (!file.startsWith(root) || !statSync(file).isFile()) throw new Error('not found');
      response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
      response.end(readFileSync(file));
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })); });
}

// Le prêtre d'Ulric de la recette (docs/recette/profils-recette-complets.json), seul dans la rencontre.
const priest = JSON.parse(readFileSync(join(root, 'docs/recette/profils-recette-complets.json'), 'utf8')).profils.find(profile => profile.nom === 'Recette Prêtre de Ulric');

async function openJsonView(page) {
  await page.locator('#tab-prepare').click();
  await page.locator('#workspace-prepare').getByRole('button', { name: 'Nouveau profil', exact: true }).click();
  const overlay = page.getByRole('dialog');
  await overlay.getByText('Créer depuis un JSON').click();
  return overlay;
}

async function main() {
  const { server, port } = await startServer();
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
    await context.route('**/*', route => (route.request().url().startsWith(`http://127.0.0.1:${port}/`) ? route.continue() : route.abort()));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await expect(page.locator('#app-content')).toBeVisible();

    // 1. Un talent mal écrit est signalé avec le nom le plus proche ; la création attend la confirmation.
    let overlay = await openJsonView(page);
    const text = overlay.getByRole('textbox', { name: 'JSON du profil' });
    await text.fill(JSON.stringify({ ...priest, talents: [...priest.talents, { nom: 'Oeil de la tempete' }] }));
    await overlay.getByRole('button', { name: 'Vérifier le JSON' }).click();
    await expect(overlay.locator('.import-text-review')).toContainText('Talent inconnu : « Oeil de la tempete » — vouliez-vous « Œil de la tempête » ?');
    await expect(overlay.getByRole('button', { name: 'Créer 1 profil' })).toBeDisabled();

    // 2. Le profil complet s'affiche en entier dans l'aperçu, puis se crée.
    await text.fill(JSON.stringify(priest));
    await overlay.getByRole('button', { name: 'Vérifier le JSON' }).click();
    const preview = overlay.locator('.import-text-profile');
    await expect(preview).toContainText('Béni [Ulric]');
    await expect(preview).toContainText('Prière 90');
    await expect(preview).toContainText('Morsure du loup');
    await expect(overlay.locator('.import-text-review')).toHaveCount(0);
    await overlay.getByRole('button', { name: 'Créer 1 profil' }).click();
    await expect(overlay).toBeHidden();
    await expect(page.locator('#toast-container')).toContainText('Profil créé');

    // 3. Le profil créé reste modifiable (rien de verrouillé) ; « Copier en JSON » copie le profil enregistré.
    await page.locator('#workspace-prepare').getByRole('button', { name: `Modifier ${priest.nom}` }).click();
    const edit = page.getByRole('dialog');
    await expect(edit.locator('[name=hp]')).toHaveValue(String(priest.pv));
    await expect(edit.locator('[name=cult]')).toHaveValue('Ulric');
    await expect(edit.locator('[name=hp]')).not.toHaveAttribute('readonly', '');
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://127.0.0.1:${port}` }).catch(() => {});
    await edit.getByRole('button', { name: 'Copier en JSON' }).click();
    await expect(page.locator('#toast-container')).toContainText('Profil copié en JSON');
    const copied = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
    assert.equal(copied.nom, priest.nom);
    assert.equal(copied.culte, 'Ulric');
    assert.deepEqual(copied.prieres, priest.prieres);
    assert.deepEqual(copied.talents, priest.talents);
    // Lot 3 (contre-vérification) : un culte différent des talents est signalé sans bloquer l'enregistrement.
    await edit.locator('[name=cult]').fill('Sigmar');
    await edit.locator('[name=notes]').fill('culte à revoir');
    await page.locator('#btn-submit-form').click();
    await expect(page.locator('#toast-container')).toContainText('Culte différent des talents de culte');
    await expect(edit).toBeHidden();
    await page.locator('#workspace-prepare').getByRole('button', { name: `Modifier ${priest.nom}` }).click();
    await expect(edit.locator('[name=cult]')).toHaveValue('Sigmar');
    await expect(edit.locator('[name=notes]')).toHaveValue('culte à revoir');
    await edit.getByRole('button', { name: 'Fermer' }).click();

    // 4. La bibliothèque montre la fiche du profil : talents et prières.
    await page.locator('#tab-library').click();
    const card = page.locator('.workspace-space-library .workspace-profile-card').filter({ hasText: priest.nom });
    await expect(card.locator('.fiche-consultation')).toContainText('Talents (2)');
    await expect(card.locator('.fiche-consultation')).toContainText('Prières — consultation (13)');

    // 5. Ajouté à une rencontre et lancé, le prêtre arrive en combat avec son talent et sa prière.
    await page.locator('#tab-prepare').click();
    await page.locator('#workspace-prepare').getByRole('button', { name: 'Nouvelle rencontre', exact: true }).click();
    const prepare = page.getByRole('dialog');
    await prepare.getByRole('combobox', { name: 'Profil' }).selectOption({ label: `${priest.nom} (PNJ)` });
    await prepare.locator('select').last().selectOption('active');
    await prepare.getByRole('button', { name: 'Ajouter' }).click();
    await expect(prepare.locator('.encounter-composition')).toContainText(`${priest.nom} ×1`);
    await prepare.getByRole('button', { name: 'Lancer la rencontre' }).last().click();
    const initiative = page.locator('dialog.tool-sheet', { hasText: 'Saisissez l’Initiative' });
    await initiative.waitFor({ state: 'visible' });
    const dice = initiative.locator('input[name^="die:"]:not([readonly])');
    for (let index = 0; index < await dice.count(); index += 1) await dice.nth(index).fill(String(6 - index));
    await initiative.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
    await initiative.getByRole('button', { name: 'Confirmer et appliquer' }).click();
    await page.locator('#tab-combat').click();
    await expect(page.locator('.workspace-track .workspace-track-item')).toHaveCount(1);
    const sheet = page.locator('.workspace-sheet-actor');
    await expect(sheet.locator('.fiche-consultation')).toContainText('Béni [Ulric] · rang 1');
    await expect(sheet.locator('.fiche-consultation')).toContainText('Morsure du loup');

    assert.deepEqual(errors, [], `exceptions navigateur: ${errors.join('\n')}`);
    await context.close();
    console.log('PASS — import JSON complet : aperçu, avertissement avec suggestion, création, fiche et « Copier en JSON »');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(`✖ browser-import-json-complet — ${error.message}`);
  process.exitCode = 1;
});
