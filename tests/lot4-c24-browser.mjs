import assert from 'node:assert/strict';
import { startApp } from './helpers/lot4-ca-app.mjs';

// C24 (G-DEC-4) : un PJ dont on passe le camp à Neutre puis « Enregistrer » doit rester Neutre
// (valeur stockée, pastille de la fiche et valeur du formulaire à la réouverture).
const app = await startApp();
try {
  const { page } = app;
  await page.evaluate(async () => {
    const { Store } = await import('/js/main.js');
    await Store.addProfile({ id: 'c24-pj', name: 'Cobaye', kind: 'PJ', hp: 12, maxHp: 12, caracs: { E: 30, I: 30 } });
    await Store.addProfile({ id: 'c24-foe', name: 'Brute', kind: 'Créature', hp: 12, maxHp: 12, caracs: { E: 30, I: 20 } });
    await Store.saveEncounter({ id: 'rencontre-c24', name: 'C24', entries: [
      { profileId: 'c24-pj', zone: 'active', quantity: 1, camp: 'pj' }, { profileId: 'c24-foe', zone: 'active', quantity: 1, camp: 'ennemi' }] });
    await Store.launchEncounter('rencontre-c24');
  });
  await page.locator('#tab-combat').click();
  const openEditor = async () => {
    await page.locator('#workspace-play [aria-label="Modifier Cobaye"]').click();
    const dialog = page.locator('dialog.tool-sheet'); await dialog.waitFor({ state: 'visible' });
    return dialog;
  };
  let dialog = await openEditor();
  assert.equal(await dialog.locator('[name=camp]').inputValue(), 'pj', 'point de départ : camp PJ');
  await dialog.locator('[name=camp]').selectOption('neutre');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await page.waitForFunction(async () => { const { Store } = await import('/js/main.js'); return Store.listParticipants().find(item => item.name === 'Cobaye')?.camp === 'neutre'; });
  const stored = await page.evaluate(async () => { const { Store } = await import('/js/main.js'); return Store.listParticipants().find(item => item.name === 'Cobaye').camp; });
  assert.equal(stored, 'neutre', 'camp stocké');
  if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  dialog = await openEditor();
  assert.equal(await dialog.locator('[name=camp]').inputValue(), 'neutre', 'le formulaire rouvert doit afficher Neutre, pas PJ (normalizeCamp renvoie « pj » pour un PJ neutre)');
  assert.deepEqual(app.errors, []);
  console.log('lot4-c24-browser: OK');
} finally { await app.close(); }
