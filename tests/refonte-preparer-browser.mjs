/**
 * Refonte de l'interface (docs/specs/refonte-interface/) · lot F1, CA23 : l'espace Préparer ne défile pas à 1440 × 800.
 * La sauvegarde R20 est transformée en réserve de 80 profils et 12 rencontres (dont une de 18 lignes) : de quoi remplir les listes.
 * Mesure, à chaque étape, le défilement de la page, de chaque case de l'espace (`[data-zone^="prep-"]`) et des fenêtres ouvertes.
 * Seules les cases nommées dans SCROLLABLE (liste des rencontres, réserve) ont le droit de défiler ; tout autre débordement échoue.
 * Captures dans tmp/refonte-preparer/ (non versionné).
 *
 * Usage : timeout 120 node tests/refonte-preparer-browser.mjs
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { blockExternalNetwork, startStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = readFileSync(new URL('./fixtures/rencontre-r20.json', import.meta.url));
const ZONES = ['prep-entete', 'prep-rencontres', 'prep-profils'];
const SCROLLABLE = new Set(['prep-rencontres', 'prep-profils']);
const shots = `${root}tmp/refonte-preparer/`;
mkdirSync(shots, { recursive: true });
const PROFILE_PREFIX = 'r20-profil-';

function bigSave() {
  const save = JSON.parse(fixture.toString('utf8'));
  const people = save.combat.participants;
  const horse = people.find(row => row.name === 'Cheval de selle');
  const base = people.map(person => {
    const { id, zone, states, ...profile } = structuredClone(person);
    const v5 = { ...(profile.extensions?.v5 || {}) };
    delete v5.ownMountId; delete v5.mounted; delete v5.mountId; delete v5.mountOf;
    return { ...profile, id: PROFILE_PREFIX + id, extensions: { ...(profile.extensions || {}), v5 } };
  });
  const reserve = [...base];
  for (let copy = 1; reserve.length < 80; copy += 1) for (const profile of base) if (reserve.length < 80) reserve.push({ ...structuredClone(profile), id: `${profile.id}-copie-${copy}`, name: `${profile.name} (copie ${copy})` });
  save.reserve = reserve;
  const entryOf = (profile, index, tag) => ({ id: `${tag}-ligne-${index}`, profileId: profile.id, quantity: 1, camp: 'ennemi', zone: 'bench' });
  save.encounters = [{ id: 'r20', title: 'R20', status: 'prepared', entries: base.filter(profile => profile.name !== horse.name).map((profile, index) => entryOf(profile, index, 'r20')) }];
  for (let n = 1; n <= 11; n += 1) save.encounters.push({ id: `rencontre-${n}`, title: `Rencontre d’essai ${n}`, status: 'prepared', notes: 'Embuscade sur la route, de nuit.', entries: reserve.slice(n, n + (n === 11 ? 18 : 6)).map((profile, index) => entryOf(profile, index, `rencontre-${n}`)) });
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
  page.on('dialog', dialog => { dialog.accept(); });

  async function measure(step) {
    await page.waitForTimeout(150);
    const m = await page.evaluate(zones => {
      const doc = document.documentElement;
      const box = el => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
      return {
        page: { scrollHeight: doc.scrollHeight, height: innerHeight, scrollWidth: doc.scrollWidth, width: innerWidth },
        zones: zones.map(name => { const el = document.querySelector(`[data-zone="${name}"]`); return el ? { name, shown: el.getClientRects().length > 0, ...box(el) } : { name, absent: true }; }),
        // Tout élément visible de l'espace qui défile et qui n'est pas une case nommée (liste interne comprise).
        stray: [...document.querySelectorAll('#workspace-prepare *')].filter(el => el.getClientRects().length && /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1 && !el.matches('[data-zone^="prep-"]'))
          .map(el => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`),
        windows: [...document.querySelectorAll('dialog[open]')].map(el => {
          const r = el.getBoundingClientRect();
          const body = el.querySelector('.tool-sheet-body');
          return { name: el.querySelector('h2')?.textContent?.trim() || 'fenêtre', inside: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1, bodyScroll: body ? body.scrollHeight - body.clientHeight : 0, bodyWide: body ? body.scrollWidth - body.clientWidth : 0 };
        })
      };
    }, ZONES);
    report.push({ step, ...m });
    if (m.page.scrollHeight > m.page.height + 1 || m.page.scrollWidth > m.page.width + 1) failures.push(`${step} : la page défile (${m.page.scrollWidth} × ${m.page.scrollHeight} pour ${m.page.width} × ${m.page.height})`);
    for (const z of m.zones) {
      if (z.absent) { failures.push(`${step} : case ${z.name} absente`); continue; }
      if (z.shown && !SCROLLABLE.has(z.name) && (z.scrollHeight > z.clientHeight + 1 || z.scrollWidth > z.clientWidth + 1)) failures.push(`${step} : ${z.name} déborde (${z.scrollHeight}/${z.clientHeight})`);
      if (z.shown && z.scrollWidth > z.clientWidth + 1) failures.push(`${step} : ${z.name} déborde en largeur (${z.scrollWidth}/${z.clientWidth})`);
    }
    if (m.stray.length) failures.push(`${step} : défilement hors des cases nommées (${m.stray.join(', ')})`);
    for (const w of m.windows) {
      if (!w.inside) failures.push(`${step} : la fenêtre « ${w.name} » sort de l’écran`);
      if (w.bodyScroll > 1) failures.push(`${step} : la fenêtre « ${w.name} » défile (${w.bodyScroll} px de trop)`);
      if (w.bodyWide > 1) failures.push(`${step} : la fenêtre « ${w.name} » déborde en largeur`);
    }
    await page.screenshot({ path: `${shots}${String(report.length).padStart(2, '0')}-${step.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '')}.png` });
    return m;
  }

  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', null, { timeout: 20000 });
  await page.locator('#file-input').setInputFiles({ name: 'preparer-grande.json', mimeType: 'application/json', buffer: bigSave() });
  await page.locator('#tab-prepare').click();
  await page.locator('#workspace-prepare [data-encounter-id="r20"]').first().waitFor({ state: 'visible' });

  // 1. Préparer avec 80 profils et 12 rencontres : la page ne défile pas, les deux listes défilent dans leur case.
  const first = await measure('préparer avec 80 profils et 12 rencontres');
  const encounters = first.zones.find(z => z.name === 'prep-rencontres'), profiles = first.zones.find(z => z.name === 'prep-profils');
  assert.ok(encounters.scrollHeight > encounters.clientHeight, 'la liste des rencontres est assez longue pour défiler dans sa case');
  assert.ok(profiles.scrollHeight > profiles.clientHeight, 'la réserve est assez longue pour défiler dans sa case');
  assert.equal(await page.locator('#workspace-prepare article.workspace-encounter-card').count() >= 12, true, 'les 12 rencontres restent dans la liste');
  assert.equal(await page.locator('#workspace-prepare article.workspace-profile-card').count(), 80, 'les 80 profils restent dans la réserve');
  // Les listes défilent dans leur case : le dernier profil s'atteint en faisant défiler la case, pas la page.
  await page.locator('[data-zone="prep-profils"]').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await measure('réserve défilée jusqu’en bas');
  await page.locator('[data-zone="prep-profils"]').evaluate(el => { el.scrollTop = 0; });

  // 2. Fonctions toujours à portée : Nouveau profil et Nouvelle rencontre dans l'en-tête, Modifier / Lancer sur chaque carte.
  for (const name of ['Nouveau profil', 'Nouvelle rencontre']) assert.equal(await page.locator('[data-zone="prep-entete"]').getByRole('button', { name }).isVisible(), true, `« ${name} » reste visible`);

  // 3. Formulaire d'ajout d'une rencontre vide, puis rencontre de 18 lignes : la fenêtre tient, la composition défile dans sa case.
  await page.locator('[data-zone="prep-entete"]').getByRole('button', { name: 'Nouvelle rencontre' }).click();
  await page.locator('dialog[open] .prepare-view').waitFor({ state: 'visible' });
  await measure('nouvelle rencontre (formulaire d’ajout)');
  await page.locator('dialog[open]').getByRole('button', { name: 'Fermer' }).click();
  await page.locator('#workspace-prepare [data-workspace-action="edit-encounter"][data-encounter-id="rencontre-11"]').click();
  await page.locator('dialog[open] .prepare-view').waitFor({ state: 'visible' });
  assert.equal(await page.locator('dialog[open] .encounter-composition li').count(), 18, 'les 18 lignes de la composition');
  await measure('modifier une rencontre de 18 lignes');
  assert.equal(await page.locator('dialog[open]').getByRole('button', { name: 'Lancer la rencontre' }).isVisible(), true, '« Lancer la rencontre » reste visible sans défiler');
  assert.equal(await page.locator('dialog[open]').getByRole('button', { name: 'Ajouter', exact: true }).isVisible(), true, '« Ajouter » reste visible sans défiler');
  await page.locator('dialog[open]').getByRole('button', { name: 'Fermer' }).click();

  // 4. Nouveau profil : la fenêtre du formulaire tient dans l'écran.
  await page.locator('[data-zone="prep-entete"]').getByRole('button', { name: 'Nouveau profil' }).click();
  await page.locator('dialog[open]').waitFor({ state: 'visible' });
  const form = await page.evaluate(() => { const r = document.querySelector('dialog[open]').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, right: r.right, height: innerHeight, width: innerWidth }; });
  assert.ok(form.top >= 0 && form.bottom <= form.height + 1 && form.right <= form.width + 1, 'la fenêtre « Nouveau profil » tient dans l’écran');
  await page.screenshot({ path: `${shots}nouveau-profil.png` });
  await page.locator('dialog[open]').getByRole('button', { name: 'Fermer' }).click();

  // 5. Combat en cours : la carte « En cours » et sa note restent dans la case ; la page ne défile pas.
  await page.locator('#workspace-prepare [data-workspace-action="launch-encounter"][data-encounter-id="r20"]').click();
  await page.locator('[data-zone="centre"]').first().waitFor({ state: 'visible' });
  await page.locator('#tab-prepare').click();
  await page.locator('#workspace-prepare .workspace-encounter-note').waitFor({ state: 'visible' });
  await measure('préparer pendant un combat en cours');
  // Retour à Jouer : l'écran de combat n'est pas touché par la grille de Préparer.
  await page.locator('#tab-combat').click();
  await page.locator('[data-zone="centre"]').first().waitFor({ state: 'visible' });
  const play = await page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, height: innerHeight }));
  assert.ok(play.scrollHeight <= play.height + 1, 'l’écran Jouer ne défile toujours pas');
  assert.deepEqual(errors, [], `aucune erreur de page : ${errors.join(' | ')}`);
} finally {
  await browser.close();
  await close();
}

for (const row of report) console.log(`${row.step} : page ${row.page.scrollHeight}/${row.page.height}${row.zones.filter(z => !z.absent).map(z => ` · ${z.name} ${z.scrollHeight}/${z.clientHeight}`).join('')}${row.windows.map(w => ` · fenêtre « ${w.name} » ${w.inside ? 'dans l’écran' : 'HORS ÉCRAN'}, défilement ${w.bodyScroll}`).join('')}`);
if (failures.length) { console.error(`\n${failures.length} écart(s) :\n- ${failures.join('\n- ')}`); process.exitCode = 1; } else console.log('\nPréparer tient à 1440 × 800 sans défilement de page.');
