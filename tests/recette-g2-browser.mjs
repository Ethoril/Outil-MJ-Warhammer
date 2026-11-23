/**
 * Passe G · lot G2 (docs/specs/refonte-interface/tasks.md) : tir, esquive et ligne Distance (R14, f4-tirer, g-distance).
 * Une archère PJ (Ulla) tire à l'arc court sur un Gor (I 42 : BI 4). La carte est simulée par le fournisseur de distance de
 * la résolution (`setMapDistanceProvider`), comme la liaison de main.js.
 * Étapes : tir sans droit à l'esquive (carte 9 m) résolu sans défense, Appliquer actif (G2-g) ; carte 3 m → esquive permise
 * sans question ; carte 9 m → esquive interdite, forçable d'un clic ; sans carte → question Oui / Non en ligne, « Non » →
 * Appliquer actif sans défense ; raison bloquante cliquée sans ouvrir « autres… » (G2-d) ; boutons ≤ 40 caractères (G2-c) ;
 * ligne Distance lisible (G2-f). Compte des contrôles visibles à l'étape « tir » (G2-e, rapport).
 * Captures dans tmp/recette-g2/ (non versionné).
 *
 * Usage : timeout 120 node tests/recette-g2-browser.mjs
 */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { blockExternalNetwork, startStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = `${root}tmp/recette-g2/`;
mkdirSync(shots, { recursive: true });

const archer = { id: 'g2-ulla', name: 'Ulla', kind: 'PJ', camp: 'pj', zone: 'active', hp: 12, maxHp: 12, initiative: 50,
  caracs: { CC: 35, CT: 55, F: 30, E: 30, I: 40, Ag: 40, Dex: 35, Int: 30, FM: 30, Soc: 30 }, states: [], skills: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 },
  actions: [{ id: 'g2-arc', name: 'Arc court', note: 'Arc court', type: 'attack', attr: 'CT', base: 55, mod: 0, damage: 7, range: 50, qualities: [], extensions: { v5: { kind: 'ranged' } } }],
  extensions: { v5: { hasMomentum: false } } };
const gor = { id: 'g2-gor', name: 'Gor', kind: 'PNJ', camp: 'ennemi', zone: 'active', hp: 14, maxHp: 14, initiative: 40,
  caracs: { CC: 40, CT: 25, F: 35, E: 35, I: 42, Ag: 35, Dex: 25, Int: 20, FM: 25, Soc: 15 }, states: [], skills: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, actions: [], extensions: { v5: { hasMomentum: false } } };
const save = { schemaVersion: 3, reserve: [], encounters: [], activeScene: null, suspendedScenes: [], log: [], diceLines: [],
  combat: { round: 1, currentActorId: archer.id, order: [archer.id, gor.id], orderMode: 'automatic', participants: [archer, gor] } };

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
  const drawerHidden = () => page.locator('.workspace-resolution-drawer').first().evaluate(el => el.hidden);
  const apply = () => resolution().locator('[data-focus-key="apply"]').first();
  // La carte : null = non reliée (réponse « ok: false », comme la liaison débranchée).
  const setMap = meters => page.evaluate(async value => {
    const { setMapDistanceProvider } = await import('/js/ui/resolution-panel.js');
    setMapDistanceProvider(async () => value === null ? { ok: false, message: 'Carte non reliée.' } : { ok: true, meters: value });
  }, meters);
  // Repart d'un tir neuf sur le Gor (brouillon remis à zéro par le changement de cible).
  const openShot = async meters => {
    await setMap(meters);
    await resolution().getByRole('button', { name: 'Ulla', exact: true }).first().click().catch(() => {});
    await resolution().getByRole('button', { name: 'Gor', exact: true }).first().click();
    await page.waitForTimeout(150);
  };
  const longButtons = () => resolution().evaluate(section => [...section.querySelectorAll('button')]
    .filter(el => !el.closest('.workspace-resolution-drawer') && el.offsetParent !== null)
    .map(el => el.textContent.replace(/\s+/g, ' ').trim()).filter(text => text.length > 40));

  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', null, { timeout: 20000 });
  await page.locator('#file-input').setInputFiles({ name: 'recette-g2.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(save)) });
  await page.locator('#tab-combat').click();
  await resolution().waitFor({ state: 'visible' });
  await page.locator(`[data-workspace-select="${archer.id}"]`).first().click().catch(() => {});
  await page.locator('[data-zone="bas"] [data-bar-action^="prepared-"]').filter({ hasText: 'Arc court' }).first().click();

  // G2-e : contrôles visibles à l'étape « tir » (avant les jets), hors panneau « autres… », sans carte, carte 9 m, carte 3 m.
  const visibleControls = () => resolution().evaluate(section => [...section.querySelectorAll('button, input, select, summary')]
    .filter(el => !el.closest('.workspace-resolution-drawer') && el.offsetParent !== null)
    .map(el => (el.getAttribute('aria-label') || el.textContent || el.dataset.focusKey || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 30)));
  for (const [meters, name] of [[null, 'sans carte'], [9, 'carte 9 m'], [3, 'carte 3 m']]) {
    await openShot(meters);
    await page.waitForTimeout(150);
    const visible = await visibleControls();
    console.log(`G2-e : ${visible.length} contrôles visibles à l'étape « tir » (${name}) : ${visible.join(' | ')}`);
    assert.equal(await drawerHidden(), true, 'rien du panneau « autres… » par défaut');
  }
  await openShot(null);
  await page.screenshot({ path: `${shots}tir-sans-carte.png` });

  // G2-g : carte à 9 m (> BI 4), pas de bouclier → aucun jet de défense ; « Lancer tous les dés des PNJ » ne lance pas
  // de défense ; Appliquer actif après le seul jet de tir.
  await openShot(9);
  await page.locator('[data-roll-input="attack"]').first().fill('30');
  const rollAll = resolution().locator('[data-focus-key="roll-all-npc"]').first();
  if (await rollAll.isEnabled()) await rollAll.click();
  await page.locator('[data-roll-input="attack"]').first().press('Enter');
  await resolution().locator('.workspace-result').first().waitFor();
  assert.equal(await page.locator('[data-roll-input="defense"]').first().inputValue().catch(() => ''), '', 'aucun jet de défense');
  assert.ok(await apply().isEnabled(), `Appliquer actif sans défense (${await apply().getAttribute('title').catch(() => '')})`);
  console.log('ok : G2-g — tir sans droit à l’esquive résolu sans défense, Appliquer actif');

  // G2-a : carte à 9 m → « Esquive interdite : 9 m > BI 4 », défense grisée, puce forçable d'un clic.
  const chip = resolution().locator('[data-dodge-chip]');
  assert.equal((await chip.textContent()).trim(), 'Esquive interdite : 9 m > BI 4');
  assert.equal(await chip.getAttribute('aria-pressed'), 'false');
  assert.ok(await page.locator('[data-roll-input="defense"]').first().isDisabled(), 'défense grisée');
  assert.match(await resolution().locator('.workspace-defense').first().textContent(), /Esquive interdite : 9 m > BI 4/, 'raison courte sur la défense');
  await page.screenshot({ path: `${shots}esquive-interdite.png` });
  await chip.click();
  await page.waitForFunction(() => document.querySelector('[data-dodge-chip]')?.getAttribute('aria-pressed') === 'true');
  assert.match(await chip.textContent(), /Esquive permise \(MJ\)/);
  assert.ok(await page.locator('[data-roll-input="defense"]').first().isEnabled(), 'défense rouverte par le MJ');
  await chip.click();
  await page.waitForFunction(() => document.querySelector('[data-dodge-chip]')?.getAttribute('aria-pressed') === 'false');
  console.log('ok : G2-a — carte 9 m : esquive interdite, forçable d’un clic');

  // G2-a, G2-b, G2-f : carte à 3 m → « Esquive permise : 3 m ≤ BI 4 », sans question ; mètres sur la ligne Distance.
  await openShot(3);
  await page.waitForFunction(() => /3 m ≤ BI 4/.test(document.querySelector('[data-dodge-chip]')?.textContent || ''));
  assert.equal(await resolution().locator('[data-dodge-answer]').count(), 0, 'aucune question');
  const summary = (await resolution().locator('[data-distance-summary]').textContent()).trim();
  assert.match(summary, /^Bout portant · 3 m · carte$/, `ligne Distance : ${summary}`);
  assert.equal(await resolution().locator('[data-distance-choice="point-blank"]').getAttribute('aria-pressed'), 'true', 'puce retenue marquée');
  const separated = await resolution().locator('[data-distance-choice="contact"]').evaluate(el => el.parentElement !== document.querySelector('[data-distance-choice="short"]').parentElement);
  assert.ok(separated, '« Au contact » séparé des bandes de portée');
  assert.match(await page.locator('[aria-label^="Défense de Gor"]').first().evaluate(el => el.selectedOptions[0]?.textContent || ''), /^(Esquive|Ag)/, 'défense proposée : Esquive');
  await page.screenshot({ path: `${shots}esquive-permise.png` });
  console.log(`ok : G2-a/b/f — carte 3 m : esquive permise sans question ; Distance « ${summary} »`);

  // G2-a (Q1), G2-d : sans carte → question en ligne, sans précoche ; un jet de défense saisi sans réponse donne une
  // raison courte qui, cliquée, mène à la question sans ouvrir « autres… » ; « Non » → Appliquer actif sans défense.
  await openShot(null);
  const question = resolution().locator('[data-dodge]');
  assert.match(await question.textContent(), /Esquive permise si le tireur est à 4 m ou moins \(BI 4\)/);
  const oui = question.locator('[data-dodge-answer="oui"]'), non = question.locator('[data-dodge-answer="non"]');
  assert.equal(await oui.getAttribute('aria-pressed'), 'false', 'aucune précoche');
  assert.equal(await non.getAttribute('aria-pressed'), 'false');
  await page.locator('[data-roll-input="attack"]').first().fill('30');
  await page.locator('[data-roll-input="defense"]').first().fill('80');
  await page.locator('[data-roll-input="defense"]').first().press('Enter');
  await resolution().locator('.workspace-result').first().waitFor();
  const reason = resolution().locator('.workspace-blocking-reason').filter({ hasText: /tir/i }).first();
  const link = reason.locator('button').first();
  const linkText = (await link.textContent()).trim();
  assert.ok(linkText.length <= 40, `raison courte (${linkText})`);
  assert.ok((await link.getAttribute('title') || await reason.getAttribute('title') || '').length > linkText.length, 'texte complet en infobulle');
  assert.deepEqual(await longButtons(), [], 'aucun bouton de plus de 40 caractères');
  await link.click();
  assert.equal(await drawerHidden(), true, 'la raison cliquée n’ouvre pas « autres… »');
  assert.ok(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-dodge]'))), 'le focus va à la question en ligne');
  await page.screenshot({ path: `${shots}raison-cliquee.png` });
  await resolution().locator('[data-dodge-answer="non"]').click();
  await page.waitForFunction(() => document.querySelector('[data-dodge-answer="non"]')?.getAttribute('aria-pressed') === 'true');
  assert.equal(await page.locator('[data-roll-input="defense"]').first().inputValue(), '', 'défense effacée');
  await page.locator('[data-roll-input="attack"]').first().press('Enter');
  await resolution().locator('.workspace-result').first().waitFor();
  assert.ok(await apply().isEnabled(), `« Non » : Appliquer actif sans défense (${await apply().getAttribute('title').catch(() => '')})`);
  assert.equal(await drawerHidden(), true);
  console.log('ok : G2-a/d/g — sans carte : question en ligne, raison cliquée sans tiroir, « Non » → Appliquer actif');

  assert.deepEqual(errors, [], `aucune erreur de page : ${errors.join(' | ')}`);
  console.log('recette G2 : vert');
} catch (error) {
  failed = true;
  console.error('recette G2 : ROUGE —', error.message);
  const page = browser.contexts()[0]?.pages()[0];
  if (page) {
    await page.screenshot({ path: `${shots}echec.png` }).catch(() => {});
    const state = await page.evaluate(() => ({
      reasons: [...document.querySelectorAll('.workspace-blocking-reason')].map(el => el.textContent),
      distance: document.querySelector('[data-distance]')?.textContent || null,
      apply: document.querySelector('.workspace-resolution [data-focus-key="apply"]')?.title || null
    })).catch(() => null);
    console.error(JSON.stringify(state));
  }
} finally {
  await browser.close();
  await close();
}
process.exit(failed ? 1 : 0);
