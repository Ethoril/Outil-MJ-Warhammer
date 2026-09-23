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

function startStaticServer() {
  const server = createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const relative = normalize(requestPath === '/' ? '/index.html' : requestPath);
    const file = join(root, relative);
    try {
      if (!file.startsWith(root) || !statSync(file).isFile()) throw new Error('not found');
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
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

async function fillProfile(page, values) {
  const form = page.locator('#form-add');
  await form.locator('[name=name]').fill(values.name);
  await form.locator('[name=kind]').selectOption(values.kind);
  await form.locator('[name=group]').fill(values.group);
  await form.locator('[name=initiative]').fill(String(values.initiative));
  await form.locator('[name=hp]').fill(String(values.hp));
  await form.locator('[name=E]').fill(String(values.endurance));
  await form.locator('[name=armor_head]').fill(String(values.armor.head));
  await form.locator('[name=armor_body]').fill(String(values.armor.body));
  await form.locator('[name=armor_arms]').fill(String(values.armor.arms));
  await form.locator('[name=armor_legs]').fill(String(values.armor.legs));
  await form.locator('details').first().locator('summary').click();
  await form.locator('[name=CC]').fill(String(values.CC));
}

async function addProfileDice(page, { base, note, damage = 1, type = 'attack' }) {
  await page.locator('#btn-add-tpl').click();
  const row = page.locator('#form-dice-list .row').last();
  await row.locator('.pf-dice-type').selectOption(type);
  await row.locator('.pf-dice-base').fill(String(base));
  await row.locator('.pf-dice-note').fill(note);
  await row.locator('.pf-dice-damage').fill(String(damage));
}

async function openWorkspaceSpace(page, space) {
  const tabId = { prepare: 'tab-prepare', play: 'tab-combat', library: 'tab-library' }[space];
  if (!tabId) throw new Error(`Espace inconnu: ${space}`);
  await page.locator(`#${tabId}`).click();
  await expect(page.locator(`#workspace-${space}`)).toBeVisible();
  await expect(page.locator(`#${tabId}`)).toHaveAttribute('aria-selected', 'true');
}

async function openProfileForm(page) {
  const form = page.locator('#form-add');
  if (!(await form.isVisible())) {
    await openWorkspaceSpace(page, 'prepare');
    await page.locator('#workspace-prepare').getByRole('button', { name: 'Nouveau profil' }).click();
  }
  await expect(form).toBeVisible();
  return form;
}

async function workspaceProfileCard(page, name) {
  await page.locator('#tab-library').click();
  const card = page.locator('.workspace-space-library .workspace-profile-card').filter({ hasText: name });
  await expect(card).toHaveCount(1);
  return card;
}

async function openWorkspaceProfileEditor(page, name) {
  const card = await workspaceProfileCard(page, name);
  await card.getByRole('button', { name: 'Modifier' }).click();
  const dialog = page.locator('dialog[open]').last();
  await expect(dialog).toBeVisible();
  const form = dialog.locator('#form-add');
  await expect(form).toBeVisible();
  return { card, dialog, form };
}

async function main() {
  const { server, port } = await startStaticServer();
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH
    || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({ headless: true, executablePath });

  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    const dialogs = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    page.on('dialog', async dialog => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.accept();
    });

    // Only the local fixture server is allowed. Firebase is replaced at the module boundary.
    await page.route('**/*', route => {
      if (route.request().url().startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
      return route.abort();
    });
    await page.route('**/js/core/sync.js', route => route.fulfill({
      contentType: 'text/javascript',
      body: `
        export function initFirebaseSync(onConnected) {
          document.querySelector('#login-screen')?.style.setProperty('display', 'none');
          document.querySelector('#app-content')?.style.setProperty('display', 'block');
          onConnected({ dbRef: 'isolated-test', onValue() {}, update() { return Promise.resolve(); } });
        }
      `
    }));

    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await expect(page.locator('#app-content')).toBeVisible();
    await expect(page.locator('#login-screen')).toBeHidden();

    // The smoke runs through the application shell.  Profile editing is
    // reached from Préparer so the test cannot accidentally use a hidden
    // legacy panel after the three-space navigation is mounted.
    for (const space of ['prepare', 'play', 'library']) await openWorkspaceSpace(page, space);
    const form = await openProfileForm(page);
    for (const name of [
      'name', 'kind', 'group', 'initiative', 'hp', 'E',
      'armor_head', 'armor_body', 'armor_arms', 'armor_legs',
      'CC', 'CT', 'F', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'
    ]) {
      await expect(form.locator(`[name=${name}]`)).toHaveCount(1);
    }

    // Create a complete profile through actual form controls, including a prepared roll.
    await fillProfile(page, {
      name: 'Aline du Test', kind: 'PJ', group: 'Recette', initiative: 55,
      hp: 14, endurance: 35, armor: { head: 1, body: 2, arms: 0, legs: 0 }, CC: 48
    });
    await addProfileDice(page, { base: 48, note: 'Épée de recette', damage: 1 });
    await form.locator('#btn-submit-form').click();
    await expect(page.locator('#reserve-list')).toContainText('Aline du Test');

    // Edit, then cancel a second edit to verify both paths leave the form coherent.
    const { dialog: editDialog, form: editForm } = await openWorkspaceProfileEditor(page, 'Aline du Test');
    const originalItem = page.locator('.workspace-space-library .workspace-profile-card').filter({ hasText: 'Aline du Test' });
    const formForEdit = editForm;
    await expect(formForEdit.locator('[name=name]')).toHaveValue('Aline du Test');
    await expect(formForEdit.locator('[name=initiative]')).toHaveValue('55');
    await expect(formForEdit.locator('[name=hp]')).toHaveValue('14');
    await expect(formForEdit.locator('[name=group]')).toHaveValue('Recette');
    await expect(formForEdit.locator('[name=E]')).toHaveValue('35');
    await expect(formForEdit.locator('[name=armor_body]')).toHaveValue('2');
    await expect(formForEdit.locator('#form-dice-list .row')).toHaveCount(1);

    await formForEdit.locator('[name=name]').fill('Annulation ignorée');
    await formForEdit.locator('#btn-cancel-edit').click();
    await editDialog.getByRole('button', { name: 'Fermer' }).click();
    await expect((await workspaceProfileCard(page, 'Aline du Test'))).toBeVisible();
    await expect(page.locator('.workspace-space-library')).not.toContainText('Annulation ignorée');

    // Commit an edit and duplicate it through the rendered item controls.
    const edited = await openWorkspaceProfileEditor(page, 'Aline du Test');
    await edited.form.locator('[name=name]').fill('Aline modifiée');
    await edited.form.locator('[name=initiative]').fill('61');
    await edited.form.locator('#btn-submit-form').click();
    await expect(page.locator('.workspace-space-library')).toContainText('Aline modifiée');
    await expect(page.locator('.workspace-space-library')).not.toContainText('Aline du Test');

    const modifiedCard = await workspaceProfileCard(page, 'Aline modifiée');
    await modifiedCard.getByRole('button', { name: 'Dupliquer' }).click();
    await expect(page.locator('.workspace-space-library .workspace-profile-card')).toHaveCount(2);
    const duplicatedItem = page.locator('.workspace-space-library .workspace-profile-card').filter({ hasText: /Aline modifiée \d+/ });
    await expect(duplicatedItem).toHaveCount(1);
    await expect(page.locator('.workspace-space-library .workspace-profile-card')).toHaveCount(2);

    // Delete only the duplicate through the reversible Store command.
    await duplicatedItem.getByRole('button', { name: 'Supprimer' }).click();
    await expect(duplicatedItem).toHaveCount(0);
    await expect(page.locator('.workspace-space-library')).toContainText('Aline modifiée');

    // Compose the two surviving templates through the real preparation view,
    // then run their prepared physical action from Jouer.
    await modifiedCard.getByRole('button', { name: 'Dupliquer' }).click();
    await expect(page.locator('.workspace-space-library .workspace-profile-card')).toHaveCount(2);
    await page.locator('#tab-prepare').click();
    await page.locator('#workspace-prepare').getByRole('button', { name: 'Lancer la rencontre' }).click();
    const prepareOverlay = page.getByRole('dialog');
    const profileSelect = prepareOverlay.getByRole('combobox', { name: 'Profil' });
    const zoneSelect = prepareOverlay.locator('select').last();
    await zoneSelect.selectOption('active');
    const profileOptions = await profileSelect.locator('option').evaluateAll(options => options
      .filter(option => option.value && option.textContent.includes('Aline modifiée'))
      .map(option => ({ value: option.value, label: option.textContent })));
    assert.equal(profileOptions.length, 2, 'la réserve doit proposer les deux profils de la rencontre');
    const [firstProfile, secondProfile] = profileOptions;
    const secondName = secondProfile.label.replace(/\s+\(.+\)$/, '');
    await profileSelect.selectOption(firstProfile.value);
    await prepareOverlay.getByRole('button', { name: 'Ajouter' }).click();
    await profileSelect.selectOption(secondProfile.value);
    await zoneSelect.selectOption('active');
    await prepareOverlay.getByRole('button', { name: 'Ajouter' }).click();
    await prepareOverlay.getByRole('button', { name: 'Lancer la rencontre' }).last().click();
    await expect(prepareOverlay).toBeHidden();
    await openWorkspaceSpace(page, 'play');
    await expect(page.locator('.workspace-track .workspace-track-item')).toHaveCount(2);
    await page.getByRole('button', { name: 'Démarrer' }).click();
    await expect(page.locator('.workspace-round')).toContainText('Round 1');

    const action = page.getByRole('button', { name: /Épée de recette.*48|48.*Épée de recette/ }).first();
    await expect(action).toBeVisible();
    await action.click();
    const resolution = page.getByRole('dialog');
    await resolution.locator('select[name="type"]').selectOption('attack');
    await resolution.locator('select[name="target"]').selectOption({ index: 1 });
    await resolution.locator('input[name="roll"]').fill('42');
    await resolution.getByRole('button', { name: 'Prévisualiser' }).click();
    await expect(resolution).toContainText('DR');
    await resolution.getByRole('button', { name: 'Appliquer les conséquences' }).click();
    await expect(resolution).toBeHidden();
    await expect(page.locator('#toast-container')).toContainText('Conséquences appliquées');
    await expect(page.locator('.workspace-track')).toContainText('PV 13/14');

    // A manual PV change is one command: undo and redo must restore the same
    // deterministic value in the actor sheet.
    await page.getByRole('button', { name: /\+1 PV pour/ }).click();
    await expect(page.locator('.workspace-actor-sheet')).toContainText('PV 15/14');
    await page.locator('#workspace-play').getByRole('button', { name: 'Annuler' }).click();
    await expect(page.locator('.workspace-actor-sheet')).toContainText('PV 14/14');
    await page.locator('#btn-redo').click();
    await expect(page.locator('.workspace-actor-sheet')).toContainText('PV 15/14');

    // Edit the second live participant and remove only that instance.
    await page.getByRole('button', { name: `Consulter ${secondName}` }).click();
    await page.locator('.workspace-actor-sheet').getByRole('button', { name: 'Modifier la fiche' }).click();
    const participantDialog = page.getByRole('dialog');
    await participantDialog.getByRole('button', { name: 'Retirer du combat' }).click();
    await expect(participantDialog).toBeHidden();
    await expect(page.locator('.workspace-track .workspace-track-item')).toHaveCount(1);

    // Reload keeps the edited profile template and the live scene instance.
    await page.reload();
    await expect(page.locator('#app-content')).toBeVisible();
    await openWorkspaceSpace(page, 'library');
    await expect(page.locator('.workspace-space-library')).toContainText('Aline modifiée');
    await expect(page.locator('.workspace-space-library')).toContainText(secondName);
    await openWorkspaceSpace(page, 'play');
    await expect(page.locator('.workspace-track .workspace-track-item')).toHaveCount(1);
    await expect(page.locator('.workspace-track')).toContainText('PV 15/14');

    await page.locator('#workspace-close-scene').click();
    const closure = page.getByRole('dialog');
    await closure.getByRole('button', { name: 'Prévisualiser le report' }).click();
    await closure.getByRole('button', { name: 'Clôturer et archiver' }).click();
    await expect(closure).toBeHidden();
    await expect(page.locator('#toast-container')).toContainText('clôturée');

    assert.deepEqual(errors, [], `exceptions navigateur: ${errors.join('\n')}`);
    await context.close();
    console.log('✔ test:browser — démarrage, CRUD profil, rencontre réelle, résolution, undo/redo, reload et clôture');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(`✖ test:browser — ${error.message}`);
  process.exitCode = 1;
});
