/**
 * Passe G · lot G6 (recette du MJ du 22/11, R3 et R7) : Surprise et Vigilance dans la saisie de l'initiative.
 * - G6-c : « Surprise : aucune » puis « Surprise : camp PJ surpris » en tête de la saisie.
 * - G6-b : colonne Vigilance pour chaque surpris qui a le talent (p. 116 : Perception +0) ; réussi = pas Surpris ;
 *   Surpris posé aux autres avant le round 1 ; Annuler rétablit tout.
 * - G6-d : un échec d'enregistrement dit « Enregistrement local impossible, réessayez ».
 * Rencontre minimale : trois PJ (deux avec Vigilance), un ennemi, lancée depuis Préparer.
 *
 * Usage : timeout 120 node tests/recette-g6-browser.mjs
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { blockExternalNetwork, startStaticServer } from './helpers/static-server.mjs';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = `${root}tmp/recette-g6/`;
mkdirSync(shots, { recursive: true });
const perceptionId = getReferenceCatalogue().skills.find(row => row.nom === 'Perception').id;
const aware = { id: 'talent-combat-aware', name: 'Vigilance', rank: 1, status: 'resolved' };

function save() {
  const base = JSON.parse(readFileSync(new URL('./fixtures/rencontre-r20.json', import.meta.url), 'utf8'));
  const profile = (id, name, kind, extra = {}) => ({ id, name, kind, hp: 10, maxHp: 10, initiative: 40, caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 30, Dex: 30, Int: 30, FM: 30, Soc: 30 },
    armor: { head: 0, body: 0, arms: 0, legs: 0 }, actions: [], skills: [], talents: [], states: [], extensions: { v5: {} }, ...extra });
  const perception = [{ id: perceptionId, name: 'Perception', carac: 'i', total: 50, status: 'resolved' }];
  base.reserve = [
    profile('g6-vigile', 'Vigile', 'PJ', { talents: [aware], skills: perception }),
    profile('g6-distrait', 'Distrait', 'PJ', { talents: [aware], skills: perception }),
    profile('g6-autre', 'Autre PJ', 'PJ'),
    profile('g6-gor', 'Gor embusqué', 'Créature')
  ];
  base.encounters = [{ id: 'g6', title: 'Embuscade G6', status: 'prepared', entries: base.reserve.map((row, index) => ({ id: `g6-ligne-${index}`, profileId: row.id, quantity: 1, camp: row.kind === 'PJ' ? 'pj' : 'ennemi', zone: 'bench' })) }];
  base.combat = { round: 0, currentActorId: null, order: [], orderMode: 'automatic', participants: [] };
  base.activeScene = null; base.log = []; base.diceLines = [];
  return Buffer.from(JSON.stringify(base));
}

const { origin, close } = await startStaticServer({ root });
const browser = await launchBrowser();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, serviceWorkers: 'block' });
  await blockExternalNetwork(context, origin);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  const storeCall = (fn, arg) => page.evaluate(async ([source, argument]) => { const { Store } = await import('/js/main.js'); return new Function('Store', 'arg', `return (${source})(Store, arg)`)(Store, argument); }, [fn.toString(), arg]);
  const surprised = () => storeCall(Store => Object.fromEntries(Store.listParticipants().map(row => [row.name, row.states.some(s => s.key === 'surpris')])));
  const board = () => page.locator('[data-zone="centre"] .workspace-initiative');
  const row = name => board().locator('[data-initiative-row]').filter({ hasText: name });

  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', null, { timeout: 20000 });
  await page.locator('#file-input').setInputFiles({ name: 'g6.json', mimeType: 'application/json', buffer: save() });
  await page.locator('#tab-prepare').click();
  const launch = page.locator('#workspace-prepare [data-workspace-action="launch-encounter"][data-encounter-id="g6"]');
  await launch.waitFor({ state: 'visible' });
  await launch.click();
  await board().waitFor({ state: 'visible' });

  // G6-c : déclaration de la Surprise en tête ; sans surprise, aucune colonne Vigilance.
  const headline = board().locator('.workspace-initiative-surprise');
  assert.equal(await headline.innerText(), 'Surprise : aucune');
  assert.equal(await board().locator('[data-vigilance-field]:visible').count(), 0, 'pas de Vigilance hors surprise');

  await board().locator('select[name="surprisedCamp"]').selectOption('pj');
  await page.waitForFunction(() => document.querySelector('.workspace-initiative-surprise')?.textContent === 'Surprise : camp PJ surpris');
  // G6-b : une colonne Vigilance pour chaque surpris qui a le talent, et pour eux seuls.
  assert.equal(await row('Vigile').locator('[data-vigilance-field]').isVisible(), true);
  assert.equal(await row('Distrait').locator('[data-vigilance-field]').isVisible(), true);
  assert.equal(await row('Autre PJ').locator('[data-vigilance-field]').count(), 0);
  for (const die of await board().locator('input[name^="die:"]:not([readonly])').all()) await die.fill('5');
  await row('Vigile').locator('input[name^="vigilance:"]').fill('20');
  await row('Distrait').locator('input[name^="vigilance:"]').fill('90');
  await board().locator('select[name="surprisedCamp"]').focus();
  await page.waitForFunction(() => [...document.querySelectorAll('[data-vigilance-result]')].every(el => el.textContent.trim()));
  assert.match(await row('Vigile').locator('[data-vigilance-result]').innerText(), /Réussi \(\+3 DR\) : pas Surpris/);
  assert.match(await row('Distrait').locator('[data-vigilance-result]').innerText(), /Raté .* : Surpris/);
  const start = board().locator('.workspace-initiative-start');
  for (let pass = 0; pass < 6 && (await start.getAttribute('data-ready')) !== 'true'; pass += 1) {
    for (const first of await board().locator('select[data-kind="tieFirst"]').all()) if (!(await first.inputValue())) await first.selectOption({ index: 1 });
    const groups = new Map();
    for (const position of await board().locator('select[data-kind="tieChoice"]').all()) {
      const key = await position.getAttribute('data-group-key'); const at = groups.get(key) || 0; groups.set(key, at + 1);
      if (!(await position.inputValue())) await position.selectOption({ index: at + 1 });
    }
    await page.waitForTimeout(300);
  }
  assert.equal(await start.getAttribute('data-ready'), 'true', 'saisie complète');
  await page.screenshot({ path: `${shots}saisie-surprise.png` });

  // G6-d : enregistrement local en échec (simulé) → message de persistance, pas « corrigez les données ».
  await page.evaluate(async () => { const { Store } = await import('/js/main.js'); window.__g6Apply = Store.applyCombatInitialization; Store.applyCombatInitialization = async () => ({ ok: false, status: 'persistence-error', error: new Error('The database connection is closing.') }); });
  await start.click();
  await page.waitForFunction(() => /Enregistrement local impossible/i.test(document.querySelector('.workspace-initiative-status')?.textContent || ''));
  const status = await board().locator('.workspace-initiative-status').innerText();
  assert.match(status, /enregistrement local impossible, réessayez/i);
  assert.doesNotMatch(status, /corrigez/);
  await page.evaluate(async () => { const { Store } = await import('/js/main.js'); Store.applyCombatInitialization = window.__g6Apply; });

  // Application : Vigilance réussie = pas Surpris ; les autres du camp surpris le sont avant le round 1.
  await start.click();
  await page.waitForFunction(async () => (await import('/js/main.js')).Store.getCombat().round === 1);
  assert.deepEqual(await surprised(), { Vigile: false, Distrait: true, 'Autre PJ': true, 'Gor embusqué': false });
  assert.ok(await storeCall(Store => Store.getLog().some(entry => /Vigile : Vigilance/.test(entry.text || ''))), 'jet de Vigilance au journal');
  await page.screenshot({ path: `${shots}round-1.png` });

  // Annuler rétablit tout : plus de Surpris, retour avant le round 1.
  await storeCall(Store => Store.undo());
  await page.waitForFunction(async () => (await import('/js/main.js')).Store.getCombat().round === 0);
  assert.deepEqual(await surprised(), { Vigile: false, Distrait: false, 'Autre PJ': false, 'Gor embusqué': false });

  assert.deepEqual(errors, [], `erreurs de page : ${errors.join(' | ')}`);
  console.log('recette G6 : surprise, Vigilance et message d’enregistrement vérifiés');
} finally {
  await browser.close();
  await close();
}
