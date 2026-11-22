/**
 * Refonte de l'interface (docs/specs/refonte-interface/) · lot F2, CA23 : l'espace Campagne ne défile pas à 1440 × 800.
 * Charge une sauvegarde dédiée (la rencontre R20 : 20 participants, plus des suivis en nombre : blessures, maladies, séquelles,
 * critiques à ouvrir, deux anciens suivis sans personnage) et mesure, à chaque étape, le défilement de la page et celui des
 * cases de l'espace (`[data-zone^="campagne-"]`). Seules les cases nommées dans SCROLL_OK peuvent défiler (liste longue) ;
 * tout autre débordement fait échouer le parcours.
 * Captures dans tmp/refonte-campagne/ (non versionné).
 *
 * Usage : timeout 120 node tests/refonte-campagne-browser.mjs
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { blockExternalNetwork, startStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = `${root}tmp/refonte-campagne/`;
mkdirSync(shots, { recursive: true });
// Cases autorisées à défiler, une par une : la liste des suivis, les décisions à traiter (liste longue), le pli ouvert du
// détail (formulaires de soins) et les opérations d'ensemble dépliées.
const SCROLL_OK = ['campagne-liste', 'campagne-taches', 'campagne-pli', 'campagne-ops'];
const ZONES = ['campagne-temps', 'campagne-taches', 'campagne-liste', 'campagne-detail', 'campagne-ops'];

function savedGame() {
  const save = JSON.parse(readFileSync(new URL('./fixtures/rencontre-r20.json', import.meta.url), 'utf8'));
  const people = save.combat.participants;
  // Trois critiques à ouvrir (propositions) sur trois participants.
  for (const person of people.slice(3, 6)) {
    person.extensions = { ...(person.extensions || {}), v5: { ...(person.extensions?.v5 || {}), criticalAftermath: [{ id: `crit-${person.id}`, effectName: 'Entaille au bras', location: 'Bras gauche', criticalWoundId: 'cut-arm', sequela: { durableEffects: [] } }] } };
  }
  const incidents = people.slice(0, 14).map((person, index) => ({
    id: `inc-${index}`, participantId: person.id, source: { kind: 'wounds-lost', cause: `Blessure ${index}` }, injuryDay: 0, status: 'open',
    bandaged: index % 2 === 0, requiresSurgery: false, surgeryCompleted: false, subjectKind: 'person', infection: index % 5 === 0, dailyChecks: [], treatments: []
  }));
  const diseases = people.slice(0, 4).map((person, index) => ({ id: `disease:${index}`, participantId: person.id, label: `Fièvre ${index}`, remainingDays: 3 + index, status: 'active', careLog: [] }));
  diseases.push({ id: 'disease:ghost', participantId: 'ghost-1', label: 'Maladie spectrale', remainingDays: 3, status: 'active', careLog: [] });
  const sequelae = [{ id: 'seq:ghost', participantId: 'ghost-1', kind: 'broken-bone', status: 'open', label: 'Fracture spectrale', phase: 'healing', immobilization: { state: 'none', attempts: [] } }];
  incidents.push({ id: 'inc-ghost', participantId: 'ghost-1', source: { kind: 'wounds-lost', cause: 'Piège de fosse' }, injuryDay: 0, status: 'open', bandaged: false, requiresSurgery: false, surgeryCompleted: false, subjectKind: 'person', infection: false, dailyChecks: [], treatments: [] });
  incidents.push({ id: 'inc-ghost-2', participantId: 'ghost-2', source: { kind: 'wounds-lost', cause: 'Chute' }, injuryDay: 0, status: 'open', bandaged: false, requiresSurgery: false, surgeryCompleted: false, subjectKind: 'person', infection: false, dailyChecks: [], treatments: [] });
  return { save, rows: { incidents, diseases, sequelae } };
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
  page.on('dialog', dialog => { failures.push(`boîte native : ${dialog.message()}`); dialog.dismiss(); });

  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', null, { timeout: 20000 });
  // Le registre de convalescence se complète à partir de celui que le Store fabrique (calendrier, reçus), puis la sauvegarde est rechargée.
  await page.evaluate(async ({ save, rows }) => {
    const { Store } = await import('/js/main.js'); await Store.ready; await Store.loadFromJSON(save);
    const state = JSON.parse(Store.getFullJSON());
    state.extensions.v5.aftermathRegister = { ...Store.getAftermathState(), ...rows };
    await Store.loadFromJSON(state);
  }, savedGame());
  await page.locator('#tab-campaign').click();
  await page.locator('#workspace-campaign .campaign-workspace').waitFor();

  let step = 0;
  async function measure(name) {
    await page.waitForTimeout(120);
    const m = await page.evaluate(([zones, ok]) => {
      const doc = document.documentElement;
      const space = document.querySelector('#workspace-campaign');
      const zoneRows = zones.map(zone => {
        const el = document.querySelector(`[data-zone="${zone}"]`);
        if (!el) return { zone, absent: true };
        return { zone, shown: el.getClientRects().length > 0, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, overflowY: getComputedStyle(el).overflowY };
      });
      // Tout élément de l'espace qui défile (overflow auto/scroll avec contenu en trop) doit être une case nommée.
      const scrollers = [...space.querySelectorAll('*')].filter(el => el.getClientRects().length && /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1)
        .map(el => ({ zone: el.closest('[data-zone]')?.dataset.zone || '', own: el.dataset.zone || '', label: `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
      const bar = document.querySelector('.topbar')?.getBoundingClientRect();
      return { page: { scrollHeight: doc.scrollHeight, height: innerHeight, scrollWidth: doc.scrollWidth, width: innerWidth }, zoneRows, scrollers, inside: space.getBoundingClientRect().bottom <= innerHeight + 1, ok, barHeight: bar?.height, modal: [...document.querySelectorAll('dialog[open]')].length };
    }, [ZONES, SCROLL_OK]);
    if (m.page.scrollHeight > m.page.height + 1 || m.page.scrollWidth > m.page.width + 1) failures.push(`${name} : la page défile (${m.page.scrollWidth} × ${m.page.scrollHeight} pour ${m.page.width} × ${m.page.height})`);
    for (const row of m.zoneRows) {
      if (row.absent) { failures.push(`${name} : case absente (${row.zone})`); continue; }
      if (row.shown && row.scrollWidth > row.clientWidth + 1) failures.push(`${name} : ${row.zone} déborde en largeur (${row.scrollWidth}/${row.clientWidth})`);
      if (row.shown && row.scrollHeight > row.clientHeight + 1 && !(SCROLL_OK.includes(row.zone) && /(auto|scroll)/.test(row.overflowY))) failures.push(`${name} : ${row.zone} déborde (${row.scrollHeight}/${row.clientHeight})`);
    }
    for (const item of m.scrollers) {
      const zone = item.own || item.zone;
      if (!SCROLL_OK.includes(zone)) failures.push(`${name} : défilement hors case nommée (${item.label}, ${item.scrollHeight}/${item.clientHeight})`);
    }
    if (!m.inside) failures.push(`${name} : l'espace sort de la fenêtre`);
    if (m.modal) failures.push(`${name} : une fenêtre est ouverte`);
    step += 1;
    await page.screenshot({ path: `${shots}${String(step).padStart(2, '0')}-${name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '')}.png` });
  }
  const openFold = async name => { const header = page.locator('#workspace-campaign [data-campaign-fold-toggle]').filter({ hasText: name }).first(); if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click(); };

  await measure('Campagne, 20 participants et suivis');

  // Liste : un grand nombre de suivis défile dans sa case ; le dernier est joignable.
  const listZone = page.locator('[data-zone="campagne-liste"]');
  assert.ok((await listZone.evaluate(el => el.scrollHeight > el.clientHeight)), 'la liste des suivis est assez longue pour défiler dans sa case');
  await page.locator('[data-campaign-person="ghost-2"]').scrollIntoViewIfNeeded();
  await measure('Dernier suivi de la liste');

  // Détail d'un participant : chaque pli, un à la fois.
  const first = (await page.locator('[data-campaign-person]').first().getAttribute('data-campaign-person'));
  await page.locator(`[data-campaign-person="${first}"]`).click();
  for (const name of ['Suivis', 'Soins et décisions']) { await openFold(name); await measure(`Détail de ${first} : ${name}`); }
  await page.locator('[data-campaign-person]').nth(3).click();
  await openFold('Soins et décisions');
  await measure('Détail d\'un participant avec critique à ouvrir');

  // Détail d'un absent : séquelles et maladies.
  await page.locator('[data-campaign-person="ghost-1"]').scrollIntoViewIfNeeded();
  await page.locator('[data-campaign-person="ghost-1"]').click();
  for (const name of ['Arbitrage des séquelles', 'Maladies de l’absent', 'Suivis']) { await openFold(name); await measure(`Absent : ${name}`); }

  // Opérations d'ensemble (groupe, calendrier, pertes) et temps.
  await page.locator('#workspace-campaign .campaign-global-details > summary').click();
  await measure('Opérations d\'ensemble dépliées');

  // Thème sombre.
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await measure('Thème sombre');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

  // Fenêtre plus grande : rien ne casse.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await measure('1920 × 1080');
  await page.setViewportSize({ width: 1440, height: 800 });

  assert.deepEqual(errors, [], `Aucune erreur UI attendue : ${errors.join('; ')}`);
  if (failures.length) { console.error(failures.map(line => `  ✗ ${line}`).join('\n')); throw new Error(`${failures.length} mesure(s) hors limites`); }
  console.log(`refonte-campagne-browser : ${step} étapes mesurées, la page ne défile pas, seules les cases nommées défilent (${SCROLL_OK.join(', ')}).`);
} finally {
  await browser.close();
  await close();
}
