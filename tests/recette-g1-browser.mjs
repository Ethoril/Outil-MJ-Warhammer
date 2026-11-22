/**
 * Passe G, lot G1 (retours R1, R11, R12 de la recette du MJ du 22/11) · barre d'actions et ligne Action.
 * Joue la rencontre de référence R20 (tests/fixtures/rencontre-r20.json) au round 1 :
 *  - G1-a : la case de résolution ne montre plus aucune puce d'action préparée (la barre du bas les porte) ;
 *  - G1-b : au tour d'un PNJ qui ne sait faire que de la magie (le Chamane-bray, dont on retire les attaques), « Autres actions »
 *    ouvre le menu sort/prière/Test et met le focus sur sa première entrée ;
 *  - G1-c : « Charger » sur une cible déclare la charge (`draft.charging`), une puce « Charge » active apparaît hors du tiroir
 *    « autres… », le bouton de la barre est enfoncé ; un second clic (puce ou bouton) retire la charge.
 * La fixture ne contient aucun PNJ qui ne sache faire que de la magie : le parcours transforme le Chamane-bray (lanceur de sorts).
 *
 * Usage : timeout 120 node tests/recette-g1-browser.mjs
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { blockExternalNetwork, startStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = readFileSync(new URL('./fixtures/rencontre-r20.json', import.meta.url));
const shots = `${root}tmp/recette-g1/`;
mkdirSync(shots, { recursive: true });
const SHAMAN = 'Swilegrakk — Chamane-bray (Lanceur de sorts)';
const GOR = 'Gor 1';

// Round 1 déjà commencé : ordre = ordre de la fixture, Gor 1 joue ; le Chamane perd ses attaques et garde la magie.
function roundOneSave(currentName) {
  const save = JSON.parse(fixture.toString('utf8'));
  const people = save.combat.participants;
  const shaman = people.find(row => row.name === SHAMAN);
  shaman.actions = [
    { id: 'g1-focus', name: 'Focalisation', type: 'channelling', attr: 'FM', base: 50, note: 'Focalisation' },
    { id: 'g1-cast', name: 'Incantation', type: 'cast', attr: 'Int', base: 45, note: 'Incantation' }
  ];
  save.combat.round = 1;
  save.combat.order = people.map(row => row.id);
  save.combat.currentActorId = people.find(row => row.name === currentName).id;
  return Buffer.from(JSON.stringify(save));
}

const { origin, close } = await startStaticServer({ root });
const browser = await launchBrowser();
const failures = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, serviceWorkers: 'block' });
  await blockExternalNetwork(context, origin);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  const check = (ok, message) => { if (!ok) failures.push(message); console.log(`${ok ? 'ok ' : 'KO '} ${message}`); };
  const resolution = () => page.locator('.workspace-resolution');
  const draftCharging = () => page.evaluate(() => document.querySelector('[data-bar-action^="charge"]')?.getAttribute('aria-pressed') ?? null);

  async function load(currentName) {
    await page.goto(`${origin}/index.html`);
    await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', null, { timeout: 20000 });
    await page.locator('#file-input').setInputFiles({ name: 'rencontre-r20.json', mimeType: 'application/json', buffer: roundOneSave(currentName) });
    await page.locator('#tab-combat').click().catch(() => {});
    await page.locator('[data-zone="bas"] .workspace-action-bar').waitFor({ state: 'visible' });
  }

  // G1-a et G1-c : tour de Gor 1 (armes de mêlée préparées).
  await load(GOR);
  await resolution().first().waitFor({ state: 'visible' });
  const visibleChips = await resolution().locator('[data-action-key]').evaluateAll(list => list.filter(el => el.getClientRects().length && !el.closest('.workspace-action-menu')).map(el => el.textContent.trim()));
  check(visibleChips.length === 0, `G1-a : aucune puce d'action préparée dans la résolution (${JSON.stringify(visibleChips)})`);
  check(await page.locator('[data-zone="bas"] [data-bar-action^="prepared-"]').count() >= 2, 'G1-a : la barre du bas porte les actions préparées');
  for (const name of ['Test…', 'Sort, prière, Corruption…']) check(await resolution().getByRole('button', { name, exact: true }).count() === 1, `G1-a : « ${name} » reste dans la résolution`);

  // Cible : un PJ ; « Charger · … » apparaît.
  await page.locator('[data-zone="centre"] [data-workspace-select]').filter({ hasText: 'Erich' }).first().click().catch(() => {});
  let charge = page.locator('[data-zone="bas"] [data-bar-action^="charge-"]');
  if (!(await charge.count())) await resolution().getByRole('button', { name: 'Erich Massenbach', exact: true }).first().click();
  charge = page.locator('[data-zone="bas"] [data-bar-action^="charge-"]');
  await charge.waitFor({ state: 'visible' });
  check((await charge.getAttribute('aria-pressed')) !== 'true', 'G1-c : avant le clic, « Charger » est relevé');
  await charge.click();
  await page.waitForTimeout(200);
  const chip = resolution().locator('[data-charge-chip]');
  check(await chip.count() === 1 && await chip.isVisible(), 'G1-c : une puce « Charge » est visible dans la résolution');
  check(await chip.evaluate(el => !el.closest('.workspace-resolution-drawer') && el.getAttribute('aria-pressed') === 'true'), 'G1-c : la puce est active et hors du tiroir « autres… »');
  check((await page.locator('[data-zone="bas"] [data-bar-action^="charge-"]').getAttribute('aria-pressed')) === 'true', 'G1-c : le bouton « Charger » est enfoncé');
  await page.screenshot({ path: `${shots}charge-declaree.png` });
  await chip.click();
  await page.waitForTimeout(200);
  check(await resolution().locator('[data-charge-chip]').count() === 0, 'G1-c : un clic sur la puce retire la charge');
  check((await page.locator('[data-zone="bas"] [data-bar-action^="charge-"]').getAttribute('aria-pressed')) !== 'true', 'G1-c : le bouton est relevé');
  await page.locator('[data-zone="bas"] [data-bar-action^="charge-"]').click();
  await page.waitForTimeout(200);
  check(await resolution().locator('[data-charge-chip]').count() === 1, 'G1-c : « Charger » redéclare la charge');
  await page.locator('[data-zone="bas"] [data-bar-action^="charge-"]').click();
  await page.waitForTimeout(200);
  check(await resolution().locator('[data-charge-chip]').count() === 0, 'G1-c : un second clic sur le bouton retire la charge');

  // G1-b : tour du Chamane (magie seulement).
  await load(SHAMAN);
  await resolution().first().waitFor({ state: 'visible' });
  const menu = page.locator('#workspace-magic-menu');
  check(await menu.isHidden(), 'G1-b : le menu magie est fermé au départ');
  await page.locator('[data-zone="bas"] [data-bar-action="other"]').click();
  await page.waitForTimeout(200);
  check(await menu.isVisible(), 'G1-b : « Autres actions » ouvre le menu sort, prière et Test');
  check(await page.evaluate(() => document.activeElement === document.querySelector('#workspace-magic-menu button:not(:disabled)')), 'G1-b : le focus est sur la première entrée du menu');
  await page.screenshot({ path: `${shots}autres-actions.png` });
  check(errors.length === 0, `aucune erreur de page (${errors.join(' | ')})`);
} finally {
  await browser.close();
  await close();
}
if (failures.length) { console.error(`\n${failures.length} échec(s) :\n- ${failures.join('\n- ')}`); process.exit(1); }
console.log('\nrecette G1 : tout est vert');
