/**
 * Refonte de l'interface (docs/specs/refonte-interface/) · lot F3, CA23 : la Bibliothèque ne défile pas à 1440 × 800.
 * Charge une sauvegarde de 80 profils en réserve (dont des favoris, tirés de la rencontre R20) et mesure, pour Profils,
 * Règles et mots-clés, Favoris et la bibliothèque de bestiaire ouverte : le défilement de la page (hauteur et largeur) et
 * celui de chaque case. Seules les cases nommées ici défilent ; tout autre défilement fait échouer le parcours.
 *   - liste  : la liste des profils (ou des favoris), à gauche ;
 *   - lecture : le texte des règles et mots-clés (lecture, comme l'onglet Règles du combat) ;
 *   - bestiaire : la liste de la bibliothèque de bestiaire.
 *   - fiche : la fiche du profil choisi, à droite, quand elle est longue (27 compétences) : lecture, comme le texte des règles.
 * Captures dans tmp/refonte-bibliotheque/ (non versionné).
 *
 * Usage : timeout 120 node tests/refonte-bibliotheque-browser.mjs
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { blockExternalNetwork, startStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = readFileSync(new URL('./fixtures/rencontre-r20.json', import.meta.url));
const shots = `${root}tmp/refonte-bibliotheque/`;
mkdirSync(shots, { recursive: true });
const COPIES = 4;

// La sauvegarde R20 devient une réserve de 80 profils (20 × 4 copies), un profil sur cinq favori, aucun combat.
function librarySave() {
  const save = JSON.parse(fixture.toString('utf8'));
  const people = save.combat.participants;
  save.reserve = [];
  for (let copy = 0; copy < COPIES; copy += 1) {
    people.forEach((person, index) => {
      const { id, zone, states, ...profile } = structuredClone(person);
      const v5 = { ...(profile.extensions?.v5 || {}) };
      delete v5.ownMountId; delete v5.mounted; delete v5.mountId; delete v5.mountOf;
      save.reserve.push({ ...profile, id: `bib-${copy}-${id}`, name: `${person.name}${copy ? ` (${copy + 1})` : ''}`, favorite: (copy * people.length + index) % 5 === 0, extensions: { ...(profile.extensions || {}), v5 } });
    });
  }
  save.encounters = [];
  save.combat = { round: 0, currentActorId: null, order: [], orderMode: 'automatic', participants: [] };
  save.activeScene = null;
  return Buffer.from(JSON.stringify(save));
}

const { origin, close } = await startStaticServer({ root });
const browser = await launchBrowser();
const failures = [];
const report = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, serviceWorkers: 'block' });
  await blockExternalNetwork(context, origin);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { dialog.accept(); }); // seul le chargement de la sauvegarde demande une confirmation native

  // Mesure : la page, puis chaque case de la bibliothèque. `allowed` : les cases qui peuvent défiler à cette étape.
  async function measure(step, allowed = []) {
    await page.waitForTimeout(200);
    const m = await page.evaluate(() => {
      const doc = document.documentElement;
      const visible = el => el.getClientRects().length > 0;
      const named = el => el.dataset.libraryZone || (el.id === 'bestiary-library-body' ? 'bestiaire' : '');
      const area = document.querySelector('#panel-workspace');
      const zones = [...area.querySelectorAll('[data-library-zone], #bestiary-library-body')].filter(visible)
        .map(el => ({ name: named(el), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrolls: /(auto|scroll)/.test(getComputedStyle(el).overflowY) }));
      // Tout élément visible qui défile et n'est pas une case nommée : défilement non déclaré.
      const stray = [...area.querySelectorAll('*')].filter(el => visible(el) && !named(el) && /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1 && !el.closest('[data-library-zone="lecture"], #bestiary-library-body'))
        .map(el => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
      return { page: { scrollHeight: doc.scrollHeight, height: innerHeight, scrollWidth: doc.scrollWidth, width: innerWidth }, zones, stray, modal: document.querySelectorAll('dialog[open]:modal').length };
    });
    report.push({ step, page: m.page, zones: m.zones });
    if (m.page.scrollHeight > m.page.height + 1 || m.page.scrollWidth > m.page.width + 1) failures.push(`${step} : la page défile (${m.page.scrollWidth} × ${m.page.scrollHeight} pour ${m.page.width} × ${m.page.height})`);
    for (const z of m.zones) {
      const overflow = z.scrollHeight > z.clientHeight + 1 || z.scrollWidth > z.clientWidth + 1;
      if (overflow && !allowed.includes(z.name)) failures.push(`${step} : la case « ${z.name} » déborde (${z.scrollWidth} × ${z.scrollHeight} pour ${z.clientWidth} × ${z.clientHeight})`);
    }
    for (const stray of m.stray) failures.push(`${step} : défilement non déclaré (${stray})`);
    await page.screenshot({ path: `${shots}${String(report.length).padStart(2, '0')}-${step.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '')}.png` });
    return m;
  }
  const zone = name => page.locator(`#workspace-library [data-library-zone="${name}"]`);
  const scrolls = async name => zone(name).evaluate(el => el.scrollHeight > el.clientHeight + 1);

  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', null, { timeout: 20000 });
  await page.locator('#file-input').setInputFiles({ name: 'bibliotheque.json', mimeType: 'application/json', buffer: librarySave() });
  await page.locator('#tab-library').click();
  await page.locator('#workspace-library').waitFor({ state: 'visible' });

  // 1. Profils : liste longue à gauche (défile dans sa case), fiche à droite (ne défile pas).
  await page.waitForFunction(count => document.querySelectorAll('#workspace-library .workspace-profile-card').length >= count, COPIES * 20);
  await measure('Profils', ['liste', 'fiche']);
  assert.ok(await scrolls('liste'), 'la liste de 80 profils défile dans sa case');
  assert.equal(await page.locator('#workspace-library .workspace-profile-card').count(), COPIES * 20, 'les 80 profils sont dans la liste');
  assert.equal(await zone('fiche').count(), 1, 'une fiche à droite de la liste');
  // Un clic sur un profil affiche sa fiche à droite, sans rien pousser hors de l'écran.
  const target = page.locator('#workspace-library .workspace-profile-card').filter({ hasText: 'Père Pedragar' }).first();
  await target.getByRole('button', { name: /Afficher la fiche/ }).click();
  await measure('Profils, fiche d’un autre profil', ['liste', 'fiche']);
  assert.match(await zone('fiche').innerText(), /Père Pedragar/, 'la fiche à droite est celle du profil choisi');
  assert.ok(await zone('fiche').locator('.fiche-consultation').count(), 'la fiche montre compétences, talents, équipement');
  // Les boutons de la liste restent là : Modifier, Dupliquer, Supprimer.
  await target.getByRole('button', { name: /^Modifier/ }).waitFor({ state: 'visible' });
  // Une recherche réduit la liste ; la page reste fixe, sans défilement dans la liste.
  await page.locator('#workspace-library .workspace-search').fill('Pedragar');
  await page.waitForFunction(() => document.querySelectorAll('#workspace-library .workspace-profile-card').length === 4);
  await measure('Profils, recherche', ['fiche']);
  await page.locator('#workspace-library .workspace-search').fill('zzzz introuvable');
  await measure('Profils, aucun résultat', []);
  await page.locator('#workspace-library .workspace-search').fill('');

  // 2. Règles et mots-clés : le texte défile dans sa case de lecture, la page reste fixe.
  await page.locator('#workspace-library').getByRole('button', { name: 'Règles et mots-clés', exact: true }).click();
  await page.locator('#workspace-library .rules-title').waitFor({ state: 'visible' });
  await measure('Règles et mots-clés', ['lecture']);
  assert.ok(await scrolls('lecture'), 'le texte des règles défile dans sa case');
  const summaries = page.locator('#workspace-library .rule-block > details > summary');
  for (let index = 0; index < Math.min(3, await summaries.count()); index += 1) await summaries.nth(index).click();
  await measure('Règles et mots-clés, blocs ouverts', ['lecture']);
  await page.locator('#workspace-library .rules-search').fill('Sonné');
  await measure('Règles et mots-clés, recherche', ['lecture']);
  assert.match(await page.locator('#workspace-library').innerText(), /Sonné/);

  // 3. Favoris : même disposition que Profils.
  await page.locator('#workspace-library').getByRole('button', { name: 'Favoris', exact: true }).click();
  await page.waitForFunction(count => document.querySelectorAll('#workspace-library .workspace-profile-card').length === count, COPIES * 4);
  await measure('Favoris', ['liste', 'fiche']);
  assert.ok(await zone('fiche').count(), 'Favoris a sa fiche à droite');

  // 4. Bestiaire : la bibliothèque ouverte tient dans l'écran, sa liste défile dans sa case.
  await page.locator('#workspace-library').getByRole('button', { name: 'Profils', exact: true }).click();
  await page.locator('#bestiary-library > summary').click();
  await page.locator('#bestiary-library-body .bestiary-folder').first().waitFor({ state: 'visible' });
  await measure('Bestiaire, racine', ['liste', 'fiche', 'bestiaire']);
  await page.locator('#bestiary-library-body .bestiary-folder').first().click();
  await page.locator('#bestiary-library-body .bestiary-crumbs .bestiary-crumb').first().click(); // retour à la racine : la recherche à plat porte sur tout le bestiaire
  await page.locator('#bestiary-library-body .bestiary-filters input').fill('a');
  await page.locator('#bestiary-library-body .item').first().waitFor({ state: 'visible' });
  await measure('Bestiaire, recherche à plat', ['liste', 'fiche', 'bestiaire']);
  assert.ok(await page.locator('#bestiary-library-body').evaluate(el => el.scrollHeight > el.clientHeight + 1), 'la liste du bestiaire défile dans sa case');
  await page.locator('#bestiary-library-body .item').first().getByRole('button', { name: /^Fiche de/ }).click();
  await measure('Bestiaire, fiche dépliée', ['liste', 'fiche', 'bestiaire']);
  assert.equal(await page.locator('dialog[open]').count(), 0, 'aucune fenêtre ouverte');

  assert.deepEqual(errors, [], `exceptions navigateur : ${errors.join('\n')}`);
  await context.close();
} finally {
  await browser.close();
  await close();
}
for (const row of report) console.log(`${row.step} : page ${row.page.scrollWidth} × ${row.page.scrollHeight} (fenêtre ${row.page.width} × ${row.page.height}) ; cases ${row.zones.map(z => `${z.name} ${z.scrollHeight}/${z.clientHeight}`).join(', ') || 'aucune'}`);
if (failures.length) {
  console.error(`refonte-bibliotheque : ${failures.length} échec(s)\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`refonte-bibliotheque : ${report.length} étapes, la page ne défile pas, seules les cases nommées défilent : OK`);
