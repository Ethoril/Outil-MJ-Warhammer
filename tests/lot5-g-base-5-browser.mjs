import assert from 'node:assert/strict';
import { startApp } from './helpers/lot4-ca-app.mjs';

// Lot 5 · G-BASE-5 : dans « Événements structurés », le menu « Participant » d'une condition PV listait aussi
// « Événement : ev-jauge ». Seule la condition « Après un événement résolu » doit proposer des événements.
const app = await startApp();
try {
  const { page } = app;
  await page.evaluate(async () => {
    const { Store } = await import('/js/main.js');
    for (const name of ['Garde', 'Archer']) await Store.addProfile({ id: 'g5-' + name, name, kind: 'Créature', hp: 12, maxHp: 12, caracs: { E: 30, I: 30 } });
    const ids = Store.listProfiles().map(profile => profile.id);
    await Store.saveEncounter({ id: 'rencontre-g5', name: 'G5', entries: ids.map(profileId => ({ profileId, zone: 'active', quantity: 1 })) });
    await Store.launchEncounter('rencontre-g5');
    await Store.executeCommand('create-scene-event', draft => ({ ...draft, activeScene: { ...draft.activeScene, events: [{ id: 'ev-jauge', condition: { type: 'manual' }, consequence: { type: 'note', text: 'Test' }, recurring: false }, { id: 'ev-suite', condition: { type: 'previousResolved', occurrenceId: `${draft.activeScene.id}:ev-jauge:once` }, consequence: { type: 'note', text: 'Suite' }, recurring: false }] } }));
  });
  await page.locator('#btn-menu').click();
  await page.locator('#workspace-events').click();
  const form = page.getByRole('dialog').locator('form').filter({ hasText: 'Créer un événement structuré' });
  const options = async () => form.locator('[name=value] option').allTextContents();
  const failures = [];
  for (const type of ['hpBelow', 'participantDown']) {
    await form.locator('[name=condition]').selectOption(type);
    const list = await options();
    if (list.some(label => /Événement/.test(label))) failures.push(`${type} : le menu liste un événement, ${JSON.stringify(list)}`);
    if (!list.includes('Garde') || !list.includes('Archer')) failures.push(`${type} : les combattants doivent rester listés, ${JSON.stringify(list)}`);
  }
  await form.locator('[name=condition]').selectOption('previousResolved');
  const events = await options();
  if (!events.some(label => /ev-jauge/.test(label))) failures.push(`previousResolved : l'événement doit être proposé, ${JSON.stringify(events)}`);
  if (events.includes('Garde')) failures.push(`previousResolved : aucun combattant attendu, ${JSON.stringify(events)}`);
  // Contre-vérification (Claude) : « Modifier » un événement « Après un événement résolu » retrouve l'événement visé.
  await form.locator('[name=condition]').selectOption('hpBelow');
  await page.getByRole('dialog').getByRole('button', { name: 'Modifier', exact: true }).last().click();
  const edited = await form.locator('[name=value]').inputValue();
  if (edited !== 'ev-jauge') failures.push(`Modifier ev-suite : événement visé perdu, valeur « ${edited} »`);
  assert.deepEqual(failures, []);
  assert.deepEqual(app.errors, []);
  console.log('lot5-g-base-5-browser: OK');
} finally { await app.close(); }
