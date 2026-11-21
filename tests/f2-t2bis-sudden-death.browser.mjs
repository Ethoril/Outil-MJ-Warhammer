import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = createStaticServer({ root, headers: { 'Cache-Control': 'no-store' } });

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await launchBrowser();
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage(), origin = `http://127.0.0.1:${server.address().port}`;
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', undefined, { timeout: 20000 });
  await page.evaluate(async () => {
    const { Store } = await import('./js/main.js'); await Store.ready;
    await Store.loadFromJSON(JSON.stringify({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'extra', order: ['extra'], participants: [{ id: 'extra', name: 'Figurant', kind: 'PNJ', camp: 'foes', zone: 'active', hp: 0, maxHp: 8, states: [], talents: [], extensions: { v5: {} } }, { id: 'chef', name: 'Chef', kind: 'PNJ', camp: 'foes', zone: 'active', hp: 0, maxHp: 12, states: [], talents: [], extensions: { v5: {} } }] }, log: [], diceLines: [], extensions: { v5: {} } }));
  });
  await page.locator('#tab-combat').click();
  // U3 : le réglage vit dans « Règles de table », fermé par défaut. Refonte E2 : la décision arrive dans la case « À décider »
  // (plus de bannière ni de case « confirmer PNJ secondaire ») ; règle désactivée = seulement la proposition de l'activer.
  const rules = page.locator('.workspace-table-rules');
  assert.equal(await rules.evaluate(el => el.open), false, 'Règles de table fermé par défaut');
  const card = id => page.locator(`[data-decisions] [data-decision-kind="mort-subite"][data-participant-id="${id}"]`);
  await page.locator('[data-decisions] [data-decision-kind="reglage-mort-subite"]').first().waitFor();
  assert.equal(await card('extra').count(), 0, 'pas de mort subite avec la règle désactivée, même avec un figurant à 0');
  await rules.locator('summary').click();
  const panel = page.getByLabel('Réglage de table : mort subite des figurants');
  await panel.waitFor({ state: 'visible' });
  const option = page.getByRole('checkbox', { name: 'Activer la mort subite des figurants' });
  assert.equal(await option.isChecked(), false, 'réglage désactivé par défaut');
  await option.check();
  await card('extra').getByText('Figurant · 0 Blessure').waitFor();
  assert.equal(await rules.evaluate(el => el.open), true, 'Règles de table reste ouvert après le rendu');
  assert.equal(await card('extra').locator('input[type="checkbox"]').count(), 0, 'aucune case à cocher préalable');
  const chooseUnconscious = card('extra').getByRole('button', { name: 'Inconscient', exact: true });
  assert.equal(await chooseUnconscious.isEnabled(), true, 'le choix est actif d’emblée');
  await chooseUnconscious.click();
  await card('extra').waitFor({ state: 'detached' });
  const state = await page.evaluate(async () => { const { Store } = await import('./js/main.js'); return Store.listParticipants().find(row => row.id === 'extra'); });
  assert.ok(state.states.some(row => row.key === 'inconscient'), 'choix MJ appliqué au figurant');
  // « Pas un figurant » : la décision disparaît et le choix est gardé sur le participant (extensions.v5.suddenDeathDeclined).
  await card('chef').getByRole('button', { name: 'Pas un figurant' }).click();
  await card('chef').waitFor({ state: 'detached' });
  const chef = await page.evaluate(async () => { const { Store } = await import('./js/main.js'); return Store.listParticipants().find(row => row.id === 'chef'); });
  assert.equal(chef.extensions?.v5?.suddenDeathDeclined, true, '« Pas un figurant » enregistré');
  assert.equal(chef.extensions?.v5?.dead, undefined, 'ni mort ni inconscient');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', undefined, { timeout: 20000 });
  await page.locator('#tab-combat').click();
  await page.locator('.workspace-table-rules').waitFor({ state: 'attached' });
  assert.equal(await page.locator('input[aria-label="Activer la mort subite des figurants"]').isChecked(), true, 'réglage retrouvé après rechargement de l’application');
  assert.equal(await page.locator('[data-decisions] [data-decision-kind="mort-subite"]').count(), 0, '« Pas un figurant » survit au rechargement');
  assert.deepEqual(pageErrors, [], 'aucune erreur JavaScript de page');
  await context.close();
  console.log('F2 T2 bis navigateur : option désactivée par défaut, case « À décider », Inconscient et « Pas un figurant » en un clic, persistance après rechargement vérifiés.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
