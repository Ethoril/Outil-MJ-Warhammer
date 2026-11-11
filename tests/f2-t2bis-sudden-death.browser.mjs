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
    await Store.loadFromJSON(JSON.stringify({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'extra', order: ['extra'], participants: [{ id: 'extra', name: 'Figurant', kind: 'PNJ', camp: 'foes', zone: 'active', hp: 0, maxHp: 8, states: [], talents: [], extensions: { v5: {} } }] }, log: [], diceLines: [], extensions: { v5: {} } }));
  });
  await page.locator('#tab-combat').click();
  // U3 : le réglage vit dans « Règles de table », fermé par défaut ; pas de bannière tant que la règle est désactivée.
  const rules = page.locator('.workspace-table-rules');
  assert.equal(await rules.evaluate(el => el.open), false, 'Règles de table fermé par défaut');
  const banner = page.getByLabel('Mort subite : décision du MJ attendue');
  assert.equal(await banner.count(), 0, 'pas de bannière avec la règle désactivée, même avec un figurant à 0');
  await rules.locator('summary').click();
  const panel = page.getByLabel('Réglage de table : mort subite des figurants');
  await panel.waitFor({ state: 'visible' });
  const option = page.getByRole('checkbox', { name: 'Activer la mort subite des figurants' });
  assert.equal(await option.isChecked(), false, 'réglage désactivé par défaut');
  await option.check();
  await banner.getByText('Figurant · 0 Blessure').waitFor();
  assert.equal(await rules.evaluate(el => el.open), true, 'Règles de table reste ouvert après le rendu');
  const confirm = page.getByRole('checkbox', { name: 'Figurant : confirmer PNJ secondaire' });
  await confirm.check();
  const chooseUnconscious = page.getByRole('button', { name: 'Choisir : inconscient' });
  assert.equal(await chooseUnconscious.isEnabled(), true, 'le choix apparaît après confirmation MJ');
  await chooseUnconscious.click();
  const state = await page.evaluate(async () => { const { Store } = await import('./js/main.js'); return Store.listParticipants()[0]; });
  assert.ok(state.states.some(row => row.key === 'inconscient'), 'choix MJ appliqué au figurant');
  assert.equal(await banner.count(), 0, 'la bannière disparaît une fois la décision prise');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', undefined, { timeout: 20000 });
  await page.locator('#tab-combat').click();
  await page.locator('.workspace-table-rules').waitFor({ state: 'attached' });
  assert.equal(await page.locator('input[aria-label="Activer la mort subite des figurants"]').isChecked(), true, 'réglage retrouvé après rechargement de l’application');
  assert.deepEqual(pageErrors, [], 'aucune erreur JavaScript de page');
  await context.close();
  console.log('F2 T2 bis navigateur : option désactivée par défaut, confirmation du figurant, choix Inconscient et persistance après rechargement vérifiés.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
