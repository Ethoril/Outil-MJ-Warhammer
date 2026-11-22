/**
 * Passe G · lot G5 (docs/specs/refonte-interface/tasks.md) : Taille (arme), « Arbitrer », armure Partielle.
 * Une Vermine de choc (L06 p. 352 : hallebarde, Défensive, Taille, Empaleuse) frappe au Corps un PJ portant une veste de
 * cuir (1 PA) et une chemise de mailles (2 PA) sur le Corps, et une coiffe de mailles (Partielle, 2 PA) sur la tête.
 * Attendu : « Appliquer » actif, aucune raison « Taille » ; la pièce de plus fort PA (mailles) précochée dans une liste
 * limitée aux pièces du Corps, libellée « Taille (arme) » ; la fiche de la cible montre « 2* » sur la tête, pas « ? ».
 * Captures dans tmp/recette-g5/ (non versionné).
 *
 * Usage : timeout 120 node tests/recette-g5-browser.mjs
 */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { blockExternalNetwork, startStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = `${root}tmp/recette-g5/`;
mkdirSync(shots, { recursive: true });

const piece = (id, name, ap, locations, layer, keywords = []) => ({ id, baseId: id, kind: 'armour', name, category: layer === 'leather' ? 'Cuir' : 'Mailles', damage: '', reach: '', range: '', ap, locations, layer, keywords, notes: '', source: '', custom: false });
const vermin = { id: 'g5-vermine', name: 'Vermine de choc', kind: 'PNJ', camp: 'ennemi', zone: 'active', hp: 15, maxHp: 15, initiative: 55,
  caracs: { CC: 45, CT: 30, F: 45, E: 45, I: 55, Ag: 45, Dex: 30, Int: 20, FM: 35, Soc: 15 }, states: [], skills: [], equipment: [],
  armor: { head: 5, body: 5, arms: 5, legs: 5 },
  actions: [{ id: 'g5-hallebarde', name: 'Hallebarde', note: 'Hallebarde', type: 'attack', attr: 'CC', base: 60, mod: 0, damage: 8,
    qualities: [{ id: 'defensive', parameter: '' }, { id: 'taille', parameter: '' }, { id: 'empaleuse', parameter: '' }], extensions: { v5: { kind: 'melee' } } }],
  extensions: { v5: { hasMomentum: false } } };
const pj = { id: 'g5-wren', name: 'Wren', kind: 'PJ', camp: 'pj', zone: 'active', hp: 12, maxHp: 12, initiative: 40,
  caracs: { CC: 35, CT: 40, F: 25, E: 30, I: 40, Ag: 40, Dex: 35, Int: 30, FM: 30, Soc: 30 }, states: [], skills: [],
  equipment: [piece('g5-coiffe', 'Coiffe de mailles', 2, ['head'], 'chain', [{ id: 'flexible' }, { id: 'partielle' }]),
    piece('g5-veste', 'Veste de cuir', 1, ['body', 'leftArm', 'rightArm'], 'leather'), piece('g5-mailles', 'Chemise de mailles', 2, ['body'], 'chain')],
  armorLocations: { head: 2, body: 3, rightArm: 1, leftArm: 1, rightLeg: 0, leftLeg: 0 }, armor: { head: 2, body: 3, arms: 1, legs: 0 },
  extensions: { v5: { hasMomentum: false } } };
const save = { schemaVersion: 3, reserve: [], encounters: [], activeScene: null, suspendedScenes: [], log: [], diceLines: [],
  combat: { round: 1, currentActorId: vermin.id, order: [vermin.id, pj.id], orderMode: 'automatic', participants: [vermin, pj] } };

const { origin, close } = await startStaticServer({ root });
const browser = await launchBrowser();
let failed = false;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, serviceWorkers: 'block' });
  await blockExternalNetwork(context, origin);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  const resolution = () => page.locator('.workspace-resolution');

  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', null, { timeout: 20000 });
  await page.locator('#file-input').setInputFiles({ name: 'recette-g5.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(save)) });
  await page.locator('#tab-combat').click();
  await resolution().waitFor({ state: 'visible' });

  // Taille (arme) : la Vermine de choc frappe Wren au Corps (54 inversé = 45), Wren rate sa défense.
  await page.locator(`[data-workspace-select="${vermin.id}"]`).first().click().catch(() => {});
  // Passe G1 (R1) : l'action se choisit dans la barre du bas, plus dans la résolution.
  await page.locator('[data-zone="bas"] [data-bar-action^="prepared-"]').filter({ hasText: 'Hallebarde' }).first().click();
  await resolution().getByRole('button', { name: 'Wren', exact: true }).first().click();
  await page.locator('[data-roll-input="attack"]').first().fill('54');
  await page.locator('[data-roll-input="defense"]').first().fill('95');
  await page.locator('[data-roll-input="defense"]').first().press('Enter');
  const apply = resolution().locator('[data-focus-key="apply"]').first();
  await apply.waitFor();
  // La liste des pièces vit dans « autres… » (seul ce bouton ouvre le panneau des circonstances).
  await resolution().locator('[data-circumstances-toggle]').first().click();
  await page.waitForFunction(() => document.querySelector('[data-hack-piece]'), null, { timeout: 10000 });
  await page.screenshot({ path: `${shots}taille-arme.png` });

  const reasons = await resolution().locator('.workspace-blocking-reason').allTextContents();
  assert.ok(!reasons.some(text => /Taille/.test(text)), `aucune raison « Taille » : ${JSON.stringify(reasons)}`);
  assert.ok(await apply.isEnabled(), `« Appliquer » actif (${await apply.getAttribute('title').catch(() => '')} ; ${JSON.stringify(reasons)})`);
  const list = page.locator('[data-hack-piece]');
  assert.equal(await list.inputValue(), 'g5-mailles', 'la pièce de plus fort PA est précochée');
  assert.deepEqual((await list.locator('option').evaluateAll(items => items.map(item => item.value))).sort(), ['g5-mailles', 'g5-veste'], 'liste limitée aux pièces du Corps');
  assert.equal(await page.getByLabel('Taille (arme) : pièce touchée').count(), 1, 'libellé « Taille (arme) »');
  console.log('ok : Taille (arme) — Appliquer actif, Chemise de mailles précochée, liste Corps seulement');

  // Armure Partielle : la fiche de Wren (cible, zone droite) montre « 2* » sur la tête.
  const head = page.locator('[data-zone="droite"] [data-pa-zone="head"]').first();
  await head.waitFor();
  const headText = (await head.textContent()).replace(/\s+/g, '');
  assert.match(headText, /2\*/, `tête « 2* » (lu : ${headText})`);
  assert.doesNotMatch(headText, /\?/);
  assert.match(await head.getAttribute('title'), /Partielle : ignorée sur une localisation paire/);
  console.log('ok : coiffe de mailles seule — « 2* » avec infobulle');

  await apply.click();
  await page.waitForFunction(() => true);
  const damaged = await page.evaluate(async id => { const { Store } = await import('/js/main.js'); return Store.listParticipants().find(row => row.id === id)?.extensions?.v5?.armorDamageByItem || {}; }, pj.id);
  assert.equal(damaged['g5-mailles'], 1, 'la chemise de mailles perd 1 PA');
  console.log('ok : application — Chemise de mailles −1 PA');
  assert.deepEqual(errors, [], `aucune erreur de page : ${errors.join(' | ')}`);
  console.log('recette G5 : vert');
} catch (error) {
  failed = true;
  console.error('recette G5 : ROUGE —', error.message);
  const page = browser.contexts()[0]?.pages()[0];
  if (page) {
    await page.screenshot({ path: `${shots}echec.png` }).catch(() => {});
    const state = await page.evaluate(() => ({
      reasons: [...document.querySelectorAll('.workspace-blocking-reason')].map(el => el.textContent),
      taille: [...document.querySelectorAll('p, label')].map(el => `${el.closest('[data-zone]')?.dataset.zone || 'hors zone'}:${el.closest('dialog, aside')?.tagName || ''}: ${el.textContent}`).filter(text => /Taille/.test(text)),
      v5ctx: document.querySelectorAll('.workspace-v5-context').length,
      actions: [...document.querySelectorAll('[data-action-key]')].map(el => el.textContent).slice(0, 8)
    })).catch(() => null);
    console.error(JSON.stringify(state));
  }
} finally {
  await browser.close();
  await close();
}
process.exit(failed ? 1 : 0);
