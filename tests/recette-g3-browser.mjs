/**
 * Passe G, lot G3 (docs/specs/refonte-interface/tasks.md, « G3 · Magie et miracles ») : retours R15 et R17 du MJ (22/11).
 * Rencontre R20 (tests/fixtures/rencontre-r20.json) à 1440 × 800, round 1, au tour du chamane-bray.
 * - G3-a (R15) : le panneau d'un sort ne montre que le sort, la cible et les dés réclamés ; tout le reste est dans un seul
 *   repli « Options », fermé ; le sort va jusqu'au résultat appliqué, sans défilement du panneau ni de la page ; le sort
 *   calculé est celui affiché ; un double fait paraître le jet d'incident hors du repli.
 * - G3-b (R17) : miracle « Soleil flamboyant » : une ligne par cible, faits en cases précochées à « oui » ; « Allié du prêtre » ;
 *   une case décochée reste décochée.
 * Le parcours affiche le nombre de contrôles visibles avant le jet d'un sort (rapport du lot).
 * Usage : timeout 120 node tests/recette-g3-browser.mjs
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { blockExternalNetwork, startStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = `${root}tmp/recette-g3/`;
mkdirSync(shots, { recursive: true });
const save = JSON.parse(readFileSync(new URL('./fixtures/rencontre-r20.json', import.meta.url), 'utf8'));
const people = save.combat.participants;
const shaman = people.find(row => /Chamane/.test(row.name));
const priest = people.find(row => /Pedragar/.test(row.name));
const gors = ['Gor 1', 'Gor 2'].map(name => people.find(row => row.name === name));
// Round 1 directement, dans l'ordre de la sauvegarde : le parcours ne teste pas l'initiative (refonte-ecran-browser.mjs le fait).
save.combat.order = people.map(row => row.id);
save.combat.round = 1;
save.combat.currentActorId = shaman.id;
// « Soleil flamboyant » (Myrmidia, p. 224) exige l'Invocation de Myrmidia et la prière connue : le prêtre de la fixture les reçoit,
// sinon le panneau ouvre le bloc « Accès à la prière » (dérogation), hors du sujet de G3.
priest.talents = [...(priest.talents || []), { id: 'talent-invoke', name: 'Invocation (Myrmidia)', status: 'resolved', rank: 1, specialization: 'Myrmidia' }];
priest.prayers = [...(priest.prayers || []), { name: 'Soleil flamboyant', status: 'resolved' }];

const { origin, close } = await startStaticServer({ root });
const browser = await launchBrowser();
const failures = [];
const check = async (name, fn) => { try { await fn(); console.log(`✔ ${name}`); } catch (error) { failures.push(name); console.log(`✖ ${name}\n  ${error.message}`); } };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, serviceWorkers: 'block' });
  await blockExternalNetwork(context, origin);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [], dialogs = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { dialogs.push(dialog.message()); dialog.dismiss(); });
  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', null, { timeout: 20000 });
  await page.evaluate(async data => { const { Store } = await import('/js/main.js'); await Store.ready; await Store.loadFromJSON(data); }, save);
  await page.locator('#tab-combat').click();
  const resolution = page.locator('.workspace-resolution');
  const drawer = page.locator('.workspace-resolution-drawer');
  const lastLog = () => page.evaluate(async () => (await import('/js/main.js')).Store.getLog()[0]?.text || '');
  // Contrôles visibles (checkVisibility : le contenu d'un repli fermé ne compte pas) dans le bloc Magie du tiroir.
  const magicControls = () => page.evaluate(() => [...document.querySelectorAll('.workspace-resolution-drawer .workspace-v5-magic :is(input, select, button, summary, textarea)')]
    .filter(el => el.checkVisibility()).map(el => el.getAttribute('aria-label') || el.textContent.trim()));
  const fits = () => page.evaluate(() => {
    const doc = document.documentElement, open = document.querySelector('.workspace-resolution-drawer:not([hidden])');
    return { page: doc.scrollHeight <= innerHeight + 1 && doc.scrollWidth <= innerWidth + 1,
      drawer: !open || (open.scrollHeight <= open.clientHeight + 1 && open.getBoundingClientRect().bottom <= innerHeight + 1) };
  });
  async function openCast() {
    await page.locator(`[data-workspace-select="${shaman.id}"]`).first().click({ force: true }).catch(() => {});
    await resolution.locator('[data-magic-menu]').click();
    await resolution.getByRole('button', { name: 'Incantation V5' }).click();
    await drawer.locator('[data-magic-options]').waitFor({ state: 'attached' });
  }
  const roll = async value => { const input = page.locator('[data-roll-input="attack"]').first(); await input.fill(String(value)); await input.press('Enter'); await page.locator('.workspace-magic-result').waitFor(); };

  await openCast();
  await check('G3-a : avant le jet, seuls le sort et le repli « Options » (fermé) sont en vue dans le bloc Magie', async () => {
    const controls = await magicControls();
    console.log(`  contrôles visibles avant le jet (bloc Magie) : ${controls.length} → ${controls.join(' · ')}`);
    assert.deepEqual(controls, ['Sort à lancer', 'Options']);
    assert.equal(await drawer.locator('[data-magic-options]').evaluate(el => el.open), false, 'Options fermé par défaut');
    assert.equal(await drawer.locator('.workspace-v5-magic details').count(), 1, 'un seul repli dans le bloc Magie');
    assert.deepEqual(await fits(), { page: true, drawer: true }, 'ni la page ni le panneau ne défilent');
    await page.screenshot({ path: `${shots}01-sort-avant-jet.png` });
  });
  await check('G3-a : « Options » regroupe talents, choix du d100, dissipation, surpuissance et cibles multiples', async () => {
    await drawer.locator('[data-magic-options] > summary').click();
    const options = drawer.locator('[data-magic-options]');
    for (const label of ['Choix du d100 V5', 'Familier assistant', 'Réaction de dissipation adverse', 'Modificateur V5 (DR)', 'Effet critique d’incantation', 'Surpuissance : Dégâts', `Cible du sort : ${gors[0].name}`])
      assert.equal(await options.getByLabel(label, { exact: true }).count(), 1, label);
    await drawer.locator('[data-magic-options] > summary').click();
  });
  await check('G3-a (R15) : le sort affiché est celui calculé, et va jusqu’au résultat appliqué', async () => {
    const shown = await drawer.getByLabel('Sort à lancer', { exact: true }).evaluate(select => select.selectedOptions[0].text.split(' · ')[0]);
    await roll(5);
    assert.match(await page.locator('.workspace-magic-result').innerText(), new RegExp(`${shown} \\(NI \\d+\\) : Sort lancé`));
    assert.deepEqual(await fits(), { page: true, drawer: true }, 'résultat sans défilement');
    await page.screenshot({ path: `${shots}02-sort-resultat.png` });
    const apply = resolution.locator('[data-focus-key="apply"]').first();
    assert.equal(await apply.isEnabled(), true, `Appliquer actif (${await apply.getAttribute('title')})`);
    await apply.click();
    await page.waitForFunction(name => import('/js/main.js').then(({ Store }) => Store.getLog().some(row => row.text.includes(`Sort ${name} lancé`))), shown);
    assert.match(await lastLog(), new RegExp(`Sort ${shown} lancé`));
  });
  await check('G3-a : sur un double, le jet d’incident est demandé hors du repli « Options »', async () => {
    await openCast();
    await roll(33);
    const miscast = drawer.getByLabel('Jet d’incident si double / maladresse (1d100)', { exact: true });
    assert.equal(await miscast.count(), 1);
    assert.equal(await miscast.evaluate(el => el.checkVisibility() && !el.closest('[data-magic-options]')), true);
    await page.screenshot({ path: `${shots}03-sort-double.png` });
    assert.deepEqual(await fits(), { page: true, drawer: true });
    await resolution.locator('[data-focus-key="cancel-preview"]').first().click().catch(() => {});
  });

  // G3-b : miracle « Soleil flamboyant » (Myrmidia) dit par Père Pedragar, choisi dans le catalogue complet.
  await page.locator(`[data-workspace-select="${priest.id}"]`).first().click({ force: true }).catch(() => {});
  await resolution.locator('[data-magic-menu]').click();
  await resolution.getByRole('button', { name: 'Prière', exact: true }).click();
  const prayer = page.locator('[data-zone="centre"] [data-center-panel="prayer"] [data-divine-panel]');
  await prayer.waitFor();
  const all = prayer.getByText(/Toutes les prières/);
  if (await all.count()) await all.locator('input').check().catch(async () => { await all.click(); });
  if (await prayer.getByLabel('Culte', { exact: true }).count()) await prayer.getByLabel('Culte', { exact: true }).selectOption('Myrmidia');
  await prayer.getByLabel('Prière divine', { exact: true }).selectOption('divine:miracle:soleil-flamboyant');
  for (const gor of gors) {
    const target = prayer.getByLabel(`Destinataire ${gor.name}`, { exact: true });
    if (await target.count() && !(await target.isChecked())) await target.check();
  }
  await check('G3-b (R17) : une ligne par cible, faits en cases précochées à « oui » sauf « Allié du prêtre » (déduit du camp)', async () => {
    for (const gor of gors) {
      const line = prayer.getByRole('group', { name: `Faits · ${gor.name}` });
      assert.equal(await line.count(), 1, `une ligne de faits pour ${gor.name}`);
      const boxes = line.locator('input[type="checkbox"]');
      assert.equal(await boxes.count(), 4, 'portée, ne vénère pas Myrmidia, regarde le prêtre, allié');
      // Conditions précochées à oui ; « Allié du prêtre » se déduit du camp : un Gor ennemi n'est pas coché (correctif du 22/11).
      for (const box of await boxes.all()) { const label = await box.getAttribute('aria-label') || ''; assert.equal(await box.isChecked(), !/Allié du prêtre/.test(label), label); }
      assert.equal(await line.locator('select').count(), 0, 'plus de question « À préciser » par fait');
    }
    assert.equal(await prayer.getByText('Allié du prêtre', { exact: true }).count() >= 1, true);
    assert.equal(await prayer.getByText(/Allié admissible/).count(), 0);
    await page.screenshot({ path: `${shots}04-miracle-faits.png` });
    // La colonne des destinataires (lignes de faits, seule partie que G3 change) tient dans le panneau ; la page ne défile pas.
    const heights = await page.locator('[data-zone="centre"] .workspace-center-panel').evaluate(el => ({
      panel: el.clientHeight, targets: Math.ceil(el.querySelector('.workspace-divine-col.is-targets').scrollHeight),
      prayer: Math.ceil(el.querySelector('.workspace-divine-col.is-prayer')?.scrollHeight || 0) }));
    console.log(`  panneau de prière : ${heights.panel} px ; colonne des destinataires ${heights.targets} px ; colonne de la prière ${heights.prayer} px`);
    assert.ok(heights.targets <= heights.panel, `destinataires et faits de deux cibles dans le panneau (${heights.targets}/${heights.panel})`);
    assert.equal((await fits()).page, true, 'la page ne défile pas');
  });
  await check('G3-b : un fait décoché reste décoché (lu « non »)', async () => {
    const looking = prayer.getByLabel(`${gors[0].name} · Regarde le prêtre`, { exact: true });
    await looking.uncheck();
    await page.waitForTimeout(150);
    assert.equal(await prayer.getByLabel(`${gors[0].name} · Regarde le prêtre`, { exact: true }).isChecked(), false);
    assert.equal(await prayer.getByLabel(`${gors[1].name} · Regarde le prêtre`, { exact: true }).isChecked(), true);
  });
  await check('aucune erreur de page, aucune boîte native', async () => {
    assert.deepEqual(errors, []);
    assert.deepEqual(dialogs, []);
  });
} finally {
  await browser.close();
  await close();
}
if (failures.length) { console.log(`\n${failures.length} échec(s) : ${failures.join(' ; ')}`); process.exit(1); }
console.log('\nRecette G3 : tout est vert.');
