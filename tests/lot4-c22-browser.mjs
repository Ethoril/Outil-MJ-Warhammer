import assert from 'node:assert/strict';
import { startApp } from './helpers/lot4-ca-app.mjs';

// C22 (G-BASE-5) : le panneau « Événements structurés » doit refléter immédiatement une jauge créée
// (choix de conséquence) et l'application d'une conséquence (compteur de jauge, liste d'événements),
// sans fermer ni rouvrir le panneau.
const app = await startApp();
try {
  const { page } = app;
  await page.evaluate(async () => {
    const { Store } = await import('/js/main.js');
    for (const name of ['Garde', 'Archer']) await Store.addProfile({ id: 'c22-' + name, name, kind: 'Créature', hp: 12, maxHp: 12, caracs: { E: 30, I: 30 } });
    const ids = Store.listProfiles().map(profile => profile.id);
    await Store.saveEncounter({ id: 'rencontre-c22', name: 'C22', entries: ids.map(profileId => ({ profileId, zone: 'active', quantity: 1 })) });
    await Store.launchEncounter('rencontre-c22');
    await Store.executeCommand('create-scene-clock', draft => ({ ...draft, activeScene: { ...draft.activeScene, clocks: [{ id: 'jauge-pre', value: 0, max: 6 }] } }));
  });
  await page.locator('#btn-menu').click();
  await page.locator('#workspace-events').click();
  const overlay = page.getByRole('dialog');
  const clockForm = overlay.locator('form').filter({ hasText: 'Jauge manuelle' });
  await clockForm.locator('[name=id]').fill('jauge-c22');
  await clockForm.locator('[name=max]').fill('6');
  await clockForm.getByRole('button', { name: 'Créer la jauge' }).click();
  await page.locator('#toast-container').getByText('Jauge créée').waitFor();

  const eventForm = overlay.locator('form').filter({ hasText: 'Créer un événement structuré' });
  await eventForm.locator('[name=consequence]').selectOption('advanceClock');
  const options = await eventForm.locator('[name=target] option').allTextContents();
  const failures = [];
  if (!options.includes('jauge-c22')) failures.push(`la jauge créée doit apparaître dans le choix de conséquence, options : ${JSON.stringify(options)}`);
  await eventForm.locator('[name=id]').fill('evt-c22');
  await eventForm.locator('[name=target]').selectOption({ label: 'jauge-pre' });
  await eventForm.getByRole('button', { name: 'Enregistrer et prévisualiser' }).click();
  await overlay.locator('.scene-event-preview').getByRole('button', { name: 'Appliquer la conséquence' }).click();
  await page.locator('#toast-container').getByText('Conséquence appliquée').waitFor();
  const text = await overlay.textContent();
  if (!/jauge-pre · 1\/6/.test(text)) failures.push('compteur de jauge non rafraîchi après application (attendu jauge-pre · 1/6), panneau resté ouvert');
  if (!/Déjà résolu/.test(text)) failures.push('liste d’événements non rafraîchie : l’événement appliqué devrait être marqué « Déjà résolu »');
  assert.deepEqual(failures, []);
  assert.deepEqual(app.errors, []);
  console.log('lot4-c22-browser: OK');
} finally { await app.close(); }
