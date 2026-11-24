/**
 * Refonte de l'interface (docs/specs/refonte-interface/) · mesure de l'écran de combat, CA1 à CA3 et CA21.
 * Joue la rencontre de référence R20 (tests/fixtures/rencontre-r20.json, 20 combattants actifs) dans une fenêtre de
 * 1440 × 800 et mesure, à chaque étape du parcours de combat, le défilement de la page et celui de chaque zone de
 * l'écran (`[data-zone]` = frise, acteur, centre, droite, bas), plus les fenêtres ouvertes (dialog[open]).
 *
 * Mode « rapport » (lot E0) : le parcours échoue si la PAGE défile à une étape, si une zone manque, ou si une police
 * est chargée ; les zones qui débordent encore sont seulement rapportées (elles se compactent dans les lots E1 à E4b).
 * REFONTE_ZONES_STRICT=1 fait aussi échouer sur une zone qui déborde (attendu à partir du lot E6).
 * Captures de chaque étape dans tmp/refonte-ecran/ (non versionné).
 *
 * Lot E5 (démarrage) : la sauvegarde R20 est transformée en réserve de 20 profils + une rencontre dont toutes les lignes sont
 * « En attente » ; le parcours la LANCE depuis Préparer (20 actifs d'un geste), saisit l'initiative dans la zone centrale
 * (sans feuille latérale), ajoute un renfort et retire un combattant pendant la saisie, puis commence le round 1.
 *
 * Usage : timeout 120 node tests/refonte-ecran-browser.mjs
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { blockExternalNetwork, startStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = readFileSync(new URL('./fixtures/rencontre-r20.json', import.meta.url));
const ZONES = ['frise', 'acteur', 'centre', 'droite', 'bas'];
const STRICT_ZONES = process.env.REFONTE_ZONES_STRICT === '1';
const DUMP = process.env.REFONTE_DUMP === '1';
const shots = `${root}tmp/refonte-ecran/`;
mkdirSync(shots, { recursive: true });

// Combattants de R20 utilisés par le parcours, retrouvés par leur nom après le lancement (la rencontre lancée crée de nouveaux identifiants).
const NAMES = { GOR: 'Gor 1', GOR2: 'Gor 2', UNGOR: 'Ungor 1', ARCHER: 'Guzgog — Tirailleur ungor', SHAMAN: 'Swilegrakk — Chamane-bray (Lanceur de sorts)', PRIEST: 'Père Pedragar, prêtre de Taal', RIDER: 'Lynathryn Nightsong', ERICH: 'Erich Massenbach', JORUNN: 'Jorunn Gromsdottir', LYNATHRYN: 'Lynathryn Nightsong', CHEVAL: 'Cheval de selle' };
const ID = {};
const PROFILE_PREFIX = 'r20-profil-';

// La sauvegarde R20 (20 combattants actifs, round 0) devient : une réserve de 20 profils, une rencontre « R20 » dont toutes
// les lignes sont « En attente » (le lancement doit les faire entrer), aucun combat en cours. Lynathryn déclare sa monture.
function launchableSave() {
  const save = JSON.parse(fixture.toString('utf8'));
  const people = save.combat.participants;
  const horse = people.find(row => row.name === 'Cheval de selle');
  save.reserve = people.map(person => {
    const { id, zone, states, ...profile } = structuredClone(person);
    const v5 = { ...(profile.extensions?.v5 || {}) };
    delete v5.ownMountId; delete v5.mounted; delete v5.mountId; delete v5.mountOf;
    if (person.name === NAMES.RIDER) v5.declaredMount = { profileId: PROFILE_PREFIX + horse.id, name: horse.name };
    return { ...profile, id: PROFILE_PREFIX + id, extensions: { ...(profile.extensions || {}), v5 } };
  });
  save.encounters = [{ id: 'r20', title: 'R20', status: 'prepared', entries: people.filter(row => row !== horse).map((person, index) => ({ id: `r20-ligne-${index}`, profileId: PROFILE_PREFIX + person.id, quantity: 1, camp: person.camp, zone: 'bench' })) }];
  save.combat = { round: 0, currentActorId: null, order: [], orderMode: 'automatic', participants: [] };
  save.activeScene = null;
  return Buffer.from(JSON.stringify(save));
}

const { origin, close } = await startStaticServer({ root });
const browser = await launchBrowser();
const report = [];
let failures = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, serviceWorkers: 'block' });
  await blockExternalNetwork(context, origin);
  const page = await context.newPage();
  // Dés des PNJ tirés au hasard par l'outil : un tirage fixe rend les égalités (donc la hauteur de la saisie) reproductibles.
  await page.addInitScript(() => { let seed = 20241121; Math.random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; });
  page.setDefaultTimeout(10000);
  const errors = [], dialogs = [];
  page.on('pageerror', error => errors.push(error.message));
  // Seul le chargement du fichier demande une confirmation native (remplacer la séance) ; aucune autre n'est attendue.
  page.on('dialog', dialog => { dialogs.push(dialog.message()); dialog.accept(); });
  const store = fn => page.evaluate(fn);

  async function measure(step) {
    await page.waitForTimeout(150);
    const m = await page.evaluate(([zones, dumpCentre]) => {
      const doc = document.documentElement;
      const box = el => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
      // Une fenêtre peut ne pas défiler elle-même mais contenir un corps qui défile : on retient le plus grand débordement interne.
      const inner = el => [el, ...el.querySelectorAll('*')].filter(item => item === el || /(auto|scroll)/.test(getComputedStyle(item).overflowY))
        .reduce((most, item) => (item.scrollHeight - item.clientHeight > most.scrollHeight - most.clientHeight ? box(item) : most), box(el));
      return {
        page: { scrollHeight: doc.scrollHeight, height: innerHeight, scrollWidth: doc.scrollWidth, width: innerWidth },
        zones: zones.map(name => {
          const el = document.querySelector(`[data-zone="${name}"]`);
          if (!el) return { name, absent: true };
          // Débordement en largeur : l'élément qui dépasse le plus à droite, pour orienter les lots suivants.
          const edge = el.getBoundingClientRect().right;
          const widest = el.scrollWidth > el.clientWidth + 1 ? [...el.querySelectorAll('*')].reduce((most, item) => {
            const right = item.getBoundingClientRect().right;
            return right > most.right ? { right, label: `${item.tagName.toLowerCase()}.${[...item.classList].join('.')}` } : most;
          }, { right: edge, label: '' }).label : '';
          return { name, shown: el.getClientRects().length > 0, widest, ...box(el) };
        }),
        windows: [...document.querySelectorAll('dialog[open]')].map(el => {
          const r = el.getBoundingClientRect();
          return { name: el.getAttribute('aria-label') || el.querySelector('h2,h3,strong')?.textContent?.trim() || 'fenêtre', inside: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1, ...inner(el) };
        }),
        fonts: document.fonts ? [...document.fonts].map(face => face.family) : [],
        // Lot E2b (CA10) : aucune fenêtre modale pendant le combat (seule la confirmation de « Terminer le combat » l'est).
        modal: [...document.querySelectorAll('dialog[open]')].filter(el => el.matches(':modal')).map(el => el.getAttribute('aria-label') || el.querySelector('h2,h3')?.textContent?.trim() || 'fenêtre'),
        // Lot E2b : rien ne défile dans la zone de droite (case « À décider » et fiche de la cible), même avec une décision.
        droiteInner: (zone => zone ? [...zone.querySelectorAll('*')].filter(item => item.getClientRects().length && /(auto|scroll)/.test(getComputedStyle(item).overflowY) && item.scrollHeight > item.clientHeight + 1)
          .map(item => ({ name: `droite : ${item.matches('[data-decisions], [data-decisions] *') ? 'À décider' : item.closest('.workspace-sheet, [data-sheet]') ? 'fiche de la cible' : item.className.split(' ')[0] || item.tagName.toLowerCase()}`, scrollHeight: item.scrollHeight, clientHeight: item.clientHeight })) : [])(document.querySelector('[data-zone="droite"]')),
        // G11 (recette j-vingt) : la ligne des cibles de la résolution ne défile pas en largeur, même à 20 combattants.
        targetRows: [...document.querySelectorAll('[data-zone="centre"] .workspace-resolution-row.is-target > .workspace-chip-list')].filter(el => el.getClientRects().length)
          .map(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth })),
        // REFONTE_DUMP=1 : hauteur des blocs de la zone centre (trois niveaux), pour savoir ce qui la remplit.
        dump: (() => {
          if (!dumpCentre) return null;
          const out = [];
          const walk = (el, depth) => {
            for (const child of el.children) {
              const h = Math.round(child.getBoundingClientRect().height);
              if (!h) continue;
              out.push(`${'  '.repeat(depth)}${h} ${child.tagName.toLowerCase()}.${[...child.classList].join('.')}${child.dataset.part ? `[${child.dataset.part}]` : ''} ${(child.querySelector('h4,h5,summary,strong')?.textContent || '').trim().slice(0, 40)}`);
              if ((depth < 3 || child.closest('.is-resultat, [data-zone="droite"], [data-center-panel]')) && h > 30 && depth < 9) walk(child, depth + 1);
            }
          };
          for (const name of ['centre', 'droite']) {
            const zone = document.querySelector(`[data-zone="${name}"]`);
            if (zone) { out.push(`[${name}]`); walk(zone, 0); }
          }
          return out;
        })(),
        melees: (el => el ? box(el) : { absent: true })(document.querySelector('[data-zone="centre"] [data-part="melees"]')),
        // Lot E4b : la résolution et les panneaux ouverts dans la case centrale (prière, corruption, désengagement) ne
        // débordent pas, même coupés : on compare la hauteur NATURELLE de leur contenu (hauteur libérée le temps de la
        // mesure) à la hauteur qu'ils occupent. Le panneau « autres… » tient dans la fenêtre.
        centreParts: [...document.querySelectorAll('[data-zone="centre"] .workspace-resolution:not([hidden]), [data-zone="centre"] .workspace-resolution.has-result > .workspace-resolution-step.is-resultat, [data-zone="centre"] .workspace-center-panel, [data-zone="centre"] .workspace-disengage')]
          .filter(el => el.getClientRects().length).map(el => {
            // Résolution : mesure géométrique — aucune étape (hors colonne Résultat, mesurée à part) ne passe sous le pied, et
            // le pied reste dans la case.
            if (el.classList.contains('workspace-resolution')) {
              const r = el.getBoundingClientRect(), foot = el.querySelector(':scope > .workspace-resolution-footer');
              const footBox = foot && foot.getClientRects().length ? foot.getBoundingClientRect() : null;
              const lowest = Math.max(r.top, ...[...el.querySelectorAll(':scope > .workspace-resolution-step:not(.is-resultat)')].filter(item => item.getClientRects().length).map(item => item.getBoundingClientRect().bottom));
              const overflow = Math.max(0, lowest - (footBox ? footBox.top : r.bottom)) + Math.max(0, (footBox ? footBox.bottom : lowest) - r.bottom);
              return { name: 'résolution', scrollHeight: Math.ceil(r.height + overflow), clientHeight: Math.floor(r.height) };
            }
            const clientHeight = el.clientHeight, saved = el.getAttribute('style');
            el.style.cssText += ';height:auto !important;max-height:none !important;min-height:0 !important;flex:none !important;overflow:visible !important;align-self:start !important';
            const natural = Math.ceil(el.getBoundingClientRect().height);
            if (saved === null) el.removeAttribute('style'); else el.setAttribute('style', saved);
            return { name: el.classList.contains('workspace-resolution') ? 'résolution' : el.classList.contains('is-resultat') ? 'résultat' : el.classList.contains('workspace-disengage') ? 'désengagement' : `panneau ${el.dataset.centerPanel}`, scrollHeight: Math.max(natural, el.scrollHeight), clientHeight };
          }),
        drawer: (el => el && el.getClientRects().length ? (r => ({ inside: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1, ...box(el) }))(el.getBoundingClientRect()) : null)(document.querySelector('.workspace-resolution-drawer:not([hidden])')),
        actionBar: (el => el ? { height: el.clientHeight, overflow: el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1 } : null)(document.querySelector('[data-zone="bas"] .workspace-action-bar'))
      };
    }, [ZONES, DUMP]);
    if (m.dump) {
      console.log(['', `### ${step}`, ...m.dump].join('\n'));
      // Capture de toute la zone centre dépliée (hors mesure) : la fenêtre s'allonge le temps de la capture.
      const height = await page.evaluate(() => { const z = document.querySelector('[data-zone="centre"]'); z.dataset.dumpStyle = z.getAttribute('style') || ''; z.style.cssText = 'position:fixed;top:0;left:0;width:760px;height:auto;max-height:none;overflow:visible;z-index:99999;background:var(--bg,#fff)'; return Math.ceil(z.getBoundingClientRect().height); });
      await page.setViewportSize({ width: 1440, height: Math.max(800, height) });
      await page.screenshot({ path: `${shots}centre-${String(report.length + 1).padStart(2, '0')}.png`, clip: { x: 0, y: 0, width: 760, height: Math.max(100, height) } }).catch(() => {});
      await page.evaluate(() => { const z = document.querySelector('[data-zone="centre"]'); z.setAttribute('style', z.dataset.dumpStyle); delete z.dataset.dumpStyle; });
      await page.setViewportSize({ width: 1440, height: 800 });
    }
    const pageScrolls = m.page.scrollHeight > m.page.height + 1 || m.page.scrollWidth > m.page.width + 1;
    const absent = m.zones.filter(z => z.absent).map(z => z.name);
    const overflowing = m.zones.filter(z => !z.absent && z.shown && (z.scrollHeight > z.clientHeight + 1 || z.scrollWidth > z.clientWidth + 1));
    const windowsOverflow = m.windows.filter(w => !w.inside || w.scrollHeight > w.clientHeight + 1);
    // Lot E4a : la barre d'actions (zone bas) et la partie « mêlées » (zone centre) ne débordent jamais sur R20.
    for (const z of m.zones) if (z.name === 'bas' && z.shown && (z.scrollHeight > z.clientHeight + 1 || z.scrollWidth > z.clientWidth + 1)) failures.push(`${step} : la zone bas déborde (${z.scrollHeight}/${z.clientHeight})`);
    // Lot E4b : zone centre, résolution et panneaux centraux sans débordement sur R20, à chaque étape.
    for (const z of m.zones) if (z.name === 'centre' && z.shown && (z.scrollHeight > z.clientHeight + 1 || z.scrollWidth > z.clientWidth + 1)) failures.push(`${step} : la zone centre déborde (${z.scrollHeight}/${z.clientHeight})`);
    // Lot E2b : plus d'exception — la colonne Résultat (critique compris) et le panneau de prière tiennent aussi.
    for (const part of m.centreParts || []) if (part.scrollHeight > part.clientHeight + 1) failures.push(`${step} : ${part.name} déborde (${part.scrollHeight}/${part.clientHeight})`);
    for (const row of m.targetRows || []) if (row.scrollWidth > row.clientWidth + 1) failures.push(`${step} : la ligne des cibles défile en largeur (${row.scrollWidth}/${row.clientWidth})`);
    for (const part of m.droiteInner) failures.push(`${step} : ${part.name} défile (${part.scrollHeight}/${part.clientHeight})`);
    if (m.modal.length) failures.push(`${step} : fenêtre modale ouverte pendant le combat (${m.modal.join(', ')})`);
    if (m.drawer && !m.drawer.inside) failures.push(`${step} : le panneau « autres… » sort de la fenêtre`);
    if (m.melees && !m.melees.absent && m.melees.scrollHeight > m.melees.clientHeight + 1) failures.push(`${step} : les mêlées débordent (${m.melees.scrollHeight}/${m.melees.clientHeight})`);
    if (m.melees && m.melees.absent && m.zones.find(z => z.name === 'centre')?.shown && report.length >= 3) failures.push(`${step} : partie mêlées absente du centre`);
    if (m.actionBar && m.actionBar.height > 0 && m.actionBar.overflow) failures.push(`${step} : la barre d'actions déborde (${JSON.stringify(m.actionBar)})`);
    report.push({ step, pageScrolls, page: m.page, absent, overflowing, windows: m.windows, windowsOverflow, centreParts: [...(m.centreParts || []), ...m.droiteInner] });
    if (pageScrolls) failures.push(`${step} : la page défile (${m.page.scrollWidth} × ${m.page.scrollHeight} pour ${m.page.width} × ${m.page.height})`);
    if (absent.length) failures.push(`${step} : zones absentes (${absent.join(', ')})`);
    if (STRICT_ZONES) for (const z of [...overflowing, ...windowsOverflow]) failures.push(`${step} : ${z.name} déborde (${z.scrollHeight}/${z.clientHeight})`);
    if (m.fonts.length) failures.push(`${step} : polices chargées (${[...new Set(m.fonts)].join(', ')})`);
    await page.screenshot({ path: `${shots}${String(report.length).padStart(2, '0')}-${step.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '')}.png` });
  }

  // Lot E3 : fiches compactes (zones acteur et droite sans débordement), menu ⋯ et fiche complète.
  async function sheetsStep(step) {
    await measure(step);
    const row = report.at(-1);
    for (const zone of row.overflowing.filter(z => ['acteur', 'droite'].includes(z.name))) failures.push(`${step} : la zone ${zone.name} déborde (${zone.scrollHeight}/${zone.clientHeight})`);
  }
  const sheetMenu = role => page.locator(`[data-zone="${role}"] [data-sheet-menu-button]`).first();
  const menuItem = name => page.locator('[role="menu"][data-sheet-menu]').getByRole('menuitem', { name });
  const insideWindow = locator => locator.evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1; });
  const resolution = () => page.locator('.workspace-resolution');
  const selectActor = id => page.locator(`[data-workspace-select="${id}"]`).first().click();
  // Passe G1 (R1) : les puces d'action de la résolution sont supprimées ; l'action se choisit dans la barre du bas.
  const chooseAction = name => page.locator('[data-zone="bas"] [data-bar-action^="prepared-"]').filter({ hasText: name }).first().click();
  // G11 (j-vingt) : au-delà de huit cibles, seules la cible choisie et les engagés restent en puces ; les autres se
  // choisissent dans le menu « Autres cibles (N)… » de la même ligne.
  const chooseTarget = async name => {
    const chip = resolution().getByRole('button', { name, exact: true }).first();
    if (await chip.count()) return chip.click();
    return resolution().locator('select.workspace-target-more').first().selectOption({ label: name });
  };
  const rollInput = (name, value) => page.locator(`[data-roll-input="${name}"]`).first().fill(String(value));
  const press = (name, key = 'Enter') => page.locator(`[data-roll-input="${name}"]`).first().press(key);

  const storeCall = (fn, arg) => page.evaluate(async ([source, argument]) => { const { Store } = await import('/js/main.js'); return new Function('Store', 'arg', `return (${source})(Store, arg)`)(Store, argument); }, [fn.toString(), arg]);
  const activeCount = () => storeCall(Store => Store.listParticipants().filter(row => row.zone === 'active').length);
  const board = () => page.locator('[data-zone="centre"] .workspace-initiative');
  const rows = () => page.locator('[data-initiative-row]');
  // Lot E5 : la saisie de l'initiative tient dans la zone centrale (aucune zone ni fenêtre ne défile), même hors mode strict.
  const mustFit = () => { const last = report.at(-1); for (const z of [...last.overflowing, ...last.windowsOverflow]) failures.push(`${last.step} : ${z.name} déborde (${z.scrollHeight}/${z.clientHeight})`); };

  // 1. Lancer la rencontre : 20 combattants actifs d'un geste, aucune feuille latérale.
  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', null, { timeout: 20000 });
  await page.locator('#file-input').setInputFiles({ name: 'rencontre-r20.json', mimeType: 'application/json', buffer: launchableSave() });
  await page.locator('#tab-prepare').click();
  const launch = page.locator('#workspace-prepare [data-workspace-action="launch-encounter"][data-encounter-id="r20"]');
  await launch.waitFor({ state: 'visible' });
  await launch.click();
  await board().waitFor({ state: 'visible' });
  assert.equal(await activeCount(), 20, 'le lancement fait entrer les 20 combattants d’un geste');
  assert.equal(await page.locator('dialog[open]').count(), 0, 'aucune feuille d’initiative : tout se saisit au centre');
  assert.equal(await rows().count(), 20, 'une case d’initiative par combattant');
  assert.equal(await page.locator('[data-zone="centre"] .workspace-resolution').count(), 0, 'avant le round 1 le centre porte l’initiative, pas la résolution');
  await measure('lancer la rencontre'); mustFit();

  // 2. Initiative dans la zone centrale : trois colonnes, dés des PJ, Combat instinctif, égalités, camp surpris, cavalier.
  const columns = await board().locator('.workspace-initiative-grid').evaluate(grid => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
  assert.equal(columns, 3, 'grille sur trois colonnes');
  await measure('saisir l’initiative'); mustFit();
  for (const die of await board().locator('input[name^="die:"]:not([readonly])').all()) await die.fill('5');
  for (const first of await board().locator('input[name^="reflexFirst:"]:not([readonly])').all()) await first.fill('4');
  for (const second of await board().locator('input[name^="reflexSecond:"]:not([readonly])').all()) await second.fill('7');
  for (const choice of await board().locator('select[name^="reflexChoice:"]').all()) await choice.selectOption({ index: 1 });
  // Cavalier : « monté » et « sans monture » (la monture déclarée quitte la rencontre, puis revient).
  const mountGroup = board().locator('.workspace-initiative-mount');
  await mountGroup.getByRole('button', { name: 'Sans monture' }).click();
  await page.waitForFunction(async name => (await import('/js/main.js')).Store.listParticipants().some(row => row.name === name && row.extensions?.v5?.mountAbsent === true), NAMES.RIDER);
  assert.equal(await board().locator('.workspace-initiative-mount [aria-pressed="true"]').innerText(), 'Sans monture');
  assert.equal(await rows().count(), 19, 'la monture quitte la rencontre : 19 cases');
  await mountGroup.getByRole('button', { name: 'Monté' }).click();
  await page.waitForFunction(() => document.querySelector('.workspace-bench'));
  await page.locator('.workspace-bench').getByRole('button', { name: /^Faire entrer Cheval/ }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-initiative-row]').length === 20);
  // Camp surpris : choisi puis enlevé.
  await board().locator('select[name="surprisedCamp"]').selectOption('allie');
  await board().locator('select[name="surprisedCamp"]').selectOption('');
  // Renfort et retrait PENDANT la saisie : la liste suit, la saisie en cours et la case ne se ferment pas.
  await board().locator('input[name^="characteristic:"]').first().fill('41');
  await storeCall(async Store => { const row = Store.listParticipants().find(item => item.name === 'Gor 5'); await Store.moveParticipant(row.id, 'bench'); });
  await page.waitForFunction(() => document.querySelectorAll('[data-initiative-row]').length === 19);
  await page.locator('.workspace-bench').getByRole('button', { name: 'Faire entrer Gor 5' }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-initiative-row]').length === 20);
  assert.equal(await board().locator('input[name^="characteristic:"]').first().inputValue(), '41', 'la saisie en cours survit à l’entrée d’un renfort');
  await storeCall(async Store => { await Store.addProfile({ id: 'r20-renfort', name: 'Renfort ungor', kind: 'Créature', hp: 8, initiative: 30, caracs: { I: 30 } }); await Store.addProfilesToCombat(['r20-renfort'], {}); });
  await page.locator('.workspace-bench').getByRole('button', { name: 'Faire entrer Renfort ungor' }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-initiative-row]').length === 21);
  await board().getByRole('button', { name: 'Retirer Ungor 4 de la rencontre' }).click();
  const confirmRemoval = page.locator('dialog[open]').last();
  await confirmRemoval.waitFor({ state: 'visible' });
  await confirmRemoval.getByRole('button', { name: /^Retirer/ }).first().click();
  await page.waitForFunction(() => document.querySelectorAll('[data-initiative-row]').length === 20);
  assert.equal(await board().locator('input[name^="characteristic:"]').first().inputValue(), '41', 'la saisie en cours survit au retrait d’un combattant');
  assert.equal(await board().count(), 1, 'la case d’initiative reste ouverte');
  await measure('renfort et retrait pendant la saisie'); mustFit();
  // Égalités : tranchées par le parcours (Test opposé à deux, ordre fixé à trois ou plus).
  const start = board().locator('.workspace-initiative-start');
  for (let pass = 0; pass < 8 && (await start.getAttribute('data-ready')) !== 'true'; pass += 1) {
    for (const first of await board().locator('select[data-kind="tieFirst"]').all()) if (!(await first.inputValue())) await first.selectOption({ index: 1 });
    const groups = new Map();
    for (const position of await board().locator('select[data-kind="tieChoice"]').all()) {
      const key = await position.getAttribute('data-group-key');
      const at = groups.get(key) || 0; groups.set(key, at + 1);
      if (!(await position.inputValue())) await position.selectOption({ index: at + 1 });
    }
    for (const ride of await board().locator('input[data-mounted-rider]').all()) if (!(await ride.inputValue())) await ride.fill(await ride.getAttribute('data-field') === 'roll' ? '20' : '40');
    for (const question of await board().locator('select[data-ride-condition]').all()) if (!(await question.inputValue())) await question.selectOption({ index: 1 });
  }
  assert.equal(await start.getAttribute('data-ready'), 'true', 'saisie complète : l’ordre est calculable');
  await start.click();
  await page.waitForFunction(async () => (await import('/js/main.js')).Store.getCombat().round === 1);
  assert.equal(await page.locator('[data-initiative]').count(), 0, 'le round 1 a remplacé la saisie');
  await measure('initiative appliquée, round 1');
  for (const [key, name] of Object.entries(NAMES)) ID[key] = await storeCall((Store, wanted) => Store.listParticipants().find(row => row.name === wanted)?.id, name);

  // 2 bis. Frise d'initiative (lot E1, CA4 à CA6) : un portrait par combattant actif ; un clic fait agir le combattant sans changer le tour ni la cible.
  const friseState = () => page.evaluate(async () => {
    const { Store } = await import('/js/main.js');
    const combat = Store.getCombat();
    return {
      turn: combat.currentActorId, round: combat.round,
      actor: document.querySelector('.workspace-sheet-actor')?.dataset.actorId || null,
      target: document.querySelector('.workspace-sheet-target')?.dataset.actorId || null,
      banner: document.querySelector('#combat-banner')?.textContent || '',
      portraits: [...document.querySelectorAll('[data-zone="frise"] [data-frise-id]')].map(el => ({ id: el.dataset.friseId, turn: el.getAttribute('aria-current') === 'step', dead: el.classList.contains('is-dead') }))
    };
  });
  const before = await friseState();
  assert.ok(before.portraits.length >= 20, `la frise montre les combattants actifs (${before.portraits.length}, 20 au moins attendus)`);
  assert.equal(before.portraits.filter(item => item.turn).length, 1, 'un seul portrait a le tour');
  assert.equal(before.portraits.find(item => item.turn).id, before.turn, 'le portrait du tour est celui du combat');
  assert.equal(before.actor, before.turn, 'au départ, le tour est celui qui agit');
  assert.doesNotMatch(before.banner, /hors de son tour/);
  const other = before.portraits.find(item => !item.turn && !item.dead && item.id !== before.target);
  await page.locator(`[data-zone="frise"] [data-frise-id="${other.id}"]`).click();
  const after = await friseState();
  assert.equal(after.actor, other.id, 'le clic fait de ce combattant celui qui agit (fiche de gauche)');
  assert.equal(await page.locator('[data-zone="acteur"] .workspace-sheet-actor').count(), 1, 'la fiche de gauche est celle de l’acteur');
  assert.equal(after.turn, before.turn, 'le tour en cours ne change pas');
  assert.equal(after.round, before.round, 'le round ne change pas');
  assert.equal(after.target, before.target, 'la cible ne change pas');
  assert.match(after.banner, /agit hors de son tour/, 'la barre du haut l’indique');
  assert.ok(await page.locator('[data-zone="bas"] .workspace-action-bar').count(), 'la barre d’actions est celle de l’acteur');
  await measure('frise : un autre combattant agit');
  const friseBox = await page.evaluate(() => { const z = document.querySelector('[data-zone="frise"]'); return { h: z.scrollHeight, c: z.clientHeight, w: z.scrollWidth, cw: z.clientWidth }; });
  assert.ok(friseBox.h <= friseBox.c + 1 && friseBox.w <= friseBox.cw + 1, `la zone frise ne déborde pas (${JSON.stringify(friseBox)})`);
  assert.ok(friseBox.c <= 130, `la frise reste basse (${friseBox.c} px)`);
  // 2 ter (lot E4c, CA24-CA25) : « Jouer son tour maintenant » depuis la frise (et le bandeau) ; Tour suivant reprend où on
  // en était, le combattant avancé est marqué « a joué » ; Annuler rétablit tout.
  const waitTurn = async id => { for (let n = 0; n < 40; n += 1) { const now = await friseState(); if (now.turn === id) return now; await page.waitForTimeout(50); } return friseState(); };
  const playNowFrise = page.locator(`[data-zone="frise"] [data-play-turn-now="${other.id}"]`);
  assert.equal(await playNowFrise.count(), 1, 'la frise propose « Jouer son tour maintenant » sur celui qui agit hors de son tour');
  assert.equal(await playNowFrise.isEnabled(), true, 'permis : il n’a pas encore joué ce round');
  assert.equal(await page.locator('#combat-banner .combat-banner-play-now:not([hidden])').count(), 1, 'le bandeau le propose aussi');
  await playNowFrise.click();
  const advancedNow = await waitTurn(other.id);
  assert.equal(advancedNow.turn, other.id, 'le tour passe tout de suite à ce combattant');
  assert.equal(advancedNow.round, before.round, 'même round');
  assert.deepEqual(advancedNow.portraits.map(item => item.id), before.portraits.map(item => item.id), 'l’ordre d’initiative ne change pas');
  assert.doesNotMatch(advancedNow.banner, /hors de son tour/, 'il joue son tour : plus « hors de son tour »');
  await measure('jouer son tour maintenant');
  await page.locator('#combat-banner .combat-banner-primary').click();
  const resumed = await waitTurn(before.turn);
  assert.equal(resumed.turn, before.turn, 'Tour suivant revient à celui qui devait jouer');
  assert.ok(await page.locator(`[data-zone="frise"] [data-frise-id="${other.id}"].is-done`).count(), 'le combattant avancé est marqué « a joué »');
  await page.locator(`[data-zone="frise"] [data-frise-id="${other.id}"]`).click();
  assert.equal(await page.locator(`[data-zone="frise"] [data-play-turn-now="${other.id}"]`).isDisabled(), true, 'déjà joué : la commande est grisée');
  assert.match((await friseState()).banner, /a déjà joué ce round/, 'avec la raison');
  await measure('jouer son tour maintenant : reprise');
  for (const step of ['Tour suivant', 'Jouer son tour maintenant']) {
    assert.equal(await page.locator('#btn-undo').isEnabled(), true, `Annuler (${step}) disponible`);
    await page.locator('#btn-undo').click();
    await page.waitForTimeout(150);
  }
  assert.equal((await waitTurn(before.turn)).turn, before.turn, 'Annuler rétablit le tour');
  assert.equal(await storeCall(Store => JSON.parse(Store.getFullJSON()).extensions?.v5?.advancedTurn ?? null), null, 'Annuler efface le tour avancé');
  await page.locator(`[data-zone="frise"] [data-frise-id="${before.turn}"]`).click();
  const back = await friseState();
  assert.equal(back.actor, before.turn, 'un clic sur le portrait du tour ramène l’acteur à celui dont c’est le tour');
  assert.doesNotMatch(back.banner, /hors de son tour/, 'la mention disparaît');
  assert.equal(back.target, before.target, 'la cible ne change toujours pas');
  // 2 bis (E3). Fiches compactes : une créature qui agit sur un PJ, puis le PJ monté ; menu ⋯, fiche complète, retrait, sans monture.
  await selectActor(ID.GOR);
  await chooseAction('Hand Weapon');
  await chooseTarget('Erich Massenbach');
  await sheetsStep('fiches : créature et PJ');
  assert.ok(await page.locator('[data-zone="droite"] [data-sheet-role="target"]').getByText('Chance').count(), 'la fiche d’un PJ montre Chance');
  assert.ok(await page.locator('[data-zone="droite"] [data-sheet-role="target"]').getByText('Destin').count(), 'la fiche d’un PJ montre Destin');
  // La fixture ne déclare pas la monture sur la fiche de Lynathryn : on la déclare (profil de son cheval) pour « sans monture ».
  await page.evaluate(async ids => {
    const { Store } = await import('/js/main.js');
    const list = Store.listParticipants(), rider = list.find(row => row.id === ids[0]), mount = list.find(row => row.id === ids[1]);
    const profileId = mount.source?.profileId || mount.profileId || mount.id;
    await Store.updateParticipant(rider.id, { extensions: { ...rider.extensions, v5: { ...rider.extensions?.v5, declaredMount: { profileId, name: mount.name } } } });
  }, [ID.LYNATHRYN, ID.CHEVAL]);
  await selectActor(ID.LYNATHRYN);
  await sheetsStep('fiches : PJ monté');
  // 2 ter (E7b). Chance puis Destin : fenêtres non modales, page fixe, le reste de l'écran reste cliquable.
  await page.locator('[data-zone="acteur"] [data-workspace-action="edit-fortune"]').click();
  await page.locator('dialog.v5-effect-dialog[open]').waitFor();
  await page.locator('[data-zone="acteur"] [data-workspace-action="edit-fate"]').click();
  await page.waitForFunction(() => document.querySelectorAll('dialog.v5-effect-dialog[open]').length === 2);
  await measure('Chance et Destin ouverts');
  assert.equal(await page.locator('dialog:modal').count(), 0, 'Chance et Destin ne sont pas modaux');
  assert.equal(await page.evaluate(() => document.body.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth), true, 'page fixe avec les deux fenêtres');
  await page.locator('[data-zone="frise"] [data-frise-id]').nth(1).click();
  assert.ok(await page.locator('#combat-banner .combat-banner-primary').isEnabled(), 'le reste de l’écran répond pendant que les fenêtres sont ouvertes');
  while (await page.locator('dialog.v5-effect-dialog[open]').count()) await page.locator('dialog.v5-effect-dialog[open]').first().getByRole('button', { name: 'Annuler' }).click();
  assert.equal(await page.locator('dialog[open]').count(), 0, 'Annuler ferme Chance et Destin');
  await selectActor(ID.LYNATHRYN);
  await sheetMenu('acteur').click();
  await menuItem(/Fiche complète/).waitFor();
  assert.ok(await insideWindow(page.locator('[role="menu"][data-sheet-menu]')), 'le menu ⋯ tient dans la fenêtre');
  for (const name of [/Retirer du combat/, /Sans monture pour cette rencontre/, /Renommer/, /Changer de camp/, /Fiche complète/, /Sorts et prières/]) assert.equal(await menuItem(name).count(), 1, `menu ⋯ : ${name}`);
  await measure('menu ⋯ ouvert');
  await menuItem(/Fiche complète/).click();
  const full = page.locator('.workspace-fullsheet[role="dialog"]');
  await full.waitFor({ state: 'visible' });
  await page.waitForTimeout(150);
  const fullBox = await full.evaluate(el => {
    const r = el.getBoundingClientRect();
    const inner = [el, ...el.querySelectorAll('*')].filter(item => item === el || /(auto|scroll)/.test(getComputedStyle(item).overflowY)).reduce((most, item) => (item.scrollHeight - item.clientHeight > most ? item.scrollHeight - item.clientHeight : most), 0);
    return { inside: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1, overflow: inner };
  });
  report.push({ step: 'fiche complète (PJ monté)', note: `panneau ${fullBox.inside ? 'dans la fenêtre' : 'HORS fenêtre'}, débordement interne ${fullBox.overflow} px` });
  if (!fullBox.inside || fullBox.overflow > 1) failures.push(`fiche complète : panneau ${fullBox.inside ? '' : 'hors fenêtre, '}débordement interne ${fullBox.overflow} px`);
  await page.screenshot({ path: `${shots}fiche-complete-pj.png` });
  await full.getByRole('button', { name: 'Fermer' }).click();
  await full.waitFor({ state: 'hidden' });
  // Retrait annulé : le cavalier reste, le choix de la monture est proposé.
  await sheetMenu('acteur').click();
  await menuItem(/Retirer du combat/).click();
  const removal = page.locator('dialog[open]').last();
  await removal.waitFor({ state: 'visible' });
  assert.ok(await removal.getByText(/Retirer aussi sa monture/).count(), 'le retrait d’un cavalier propose de retirer aussi sa monture');
  await removal.getByRole('button', { name: 'Annuler' }).click();
  await removal.waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(async id => (await import('/js/main.js')).Store.listParticipants().some(row => row.id === id && row.zone === 'active'), ID.LYNATHRYN), true, 'Annuler garde le cavalier');
  // Sans monture pour cette rencontre, puis retour de la monture.
  const mountState = () => page.evaluate(async ids => { const { Store } = await import('/js/main.js'); const list = Store.listParticipants(); return { absent: list.find(row => row.id === ids[0])?.extensions?.v5?.mountAbsent === true, mount: list.some(row => row.id === ids[1] && row.zone === 'active') }; }, [ID.LYNATHRYN, ID.CHEVAL]);
  await sheetMenu('acteur').click();
  await menuItem(/Sans monture pour cette rencontre/).click();
  await page.waitForFunction(async ids => (await import('/js/main.js')).Store.listParticipants().find(row => row.id === ids[0])?.extensions?.v5?.mountAbsent === true, [ID.LYNATHRYN]);
  assert.deepEqual(await mountState(), { absent: true, mount: false }, 'sans monture : la monture quitte la rencontre');
  await sheetsStep('fiches : sans monture');
  await sheetMenu('acteur').click();
  await menuItem(/Remettre la monture|Monture présente/).click();
  await page.waitForFunction(async ids => (await import('/js/main.js')).Store.listParticipants().find(row => row.id === ids[0])?.extensions?.v5?.mountAbsent !== true, [ID.LYNATHRYN]);

  // Formulaire « + état » (couche des fiches), renommer, changer de camp, sorts et prières d'un lanceur : tout tient dans la fenêtre.
  await selectActor(ID.SHAMAN);
  await page.locator('[data-zone="acteur"] .workspace-state-add').click();
  const stateForm = page.locator('.workspace-state-popover .workspace-state-form');
  await stateForm.waitFor({ state: 'visible' });
  assert.ok(await insideWindow(page.locator('.workspace-state-popover')), 'le formulaire d’état tient dans la fenêtre');
  await sheetsStep('fiches : formulaire d’état ouvert');
  await stateForm.locator('select').first().selectOption('Sonné');
  await stateForm.getByRole('button', { name: 'Ajouter' }).click();
  await page.locator('[data-zone="acteur"] .workspace-state-chip').filter({ hasText: 'Sonné' }).waitFor();
  await sheetsStep('fiches : état ajouté');
  await sheetMenu('acteur').click();
  await menuItem(/Changer de camp/).click();
  await page.locator('[role="menu"][data-sheet-menu]').getByRole('menuitem', { name: 'Neutre' }).click();
  await page.waitForFunction(async id => (await import('/js/main.js')).Store.listParticipants().find(row => row.id === id)?.camp === 'neutre', ID.SHAMAN);
  await sheetMenu('acteur').click();
  await menuItem(/Renommer/).click();
  await page.locator('[data-zone="acteur"] .workspace-sheet-name-input').fill('Swilegrakk le Bray');
  await page.locator('[data-zone="acteur"] .workspace-sheet-name-input').press('Enter');
  await page.locator('[data-zone="acteur"] .workspace-sheet-name', { hasText: 'Swilegrakk le Bray' }).waitFor();
  await sheetMenu('acteur').click();
  await menuItem(/Sorts et prières/).click();
  await full.waitFor({ state: 'visible' });
  await page.waitForTimeout(150);
  const magicBox = await full.evaluate(el => { const r = el.getBoundingClientRect(); return { inside: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1, details: el.querySelector('.workspace-magic-list')?.open === true }; });
  assert.deepEqual(magicBox, { inside: true, details: true }, 'sorts et prières : panneau dans la fenêtre, liste ouverte');
  await page.screenshot({ path: `${shots}fiche-complete-lanceur.png` });
  await page.keyboard.press('Escape');
  await full.waitFor({ state: 'hidden' });

  // 2 ter. Mêlées en cartouches (lot E4a, CA6) : un clic sur un cartouche choisit la cible, jamais l'acteur ni le tour ;
  // la frise ne change jamais la cible. La barre du bas porte les actions de l'acteur et « ce qu'il peut faire d'ici », sans numéros.
  const meleeState = () => page.evaluate(async () => {
    const { Store } = await import('/js/main.js');
    return { turn: Store.getCombat().currentActorId, actor: document.querySelector('.workspace-sheet-actor')?.dataset.actorId || null, target: document.querySelector('.workspace-sheet-target')?.dataset.actorId || null };
  });
  const cartouches = page.locator('[data-zone="centre"] [data-part="melees"] [data-workspace-target]');
  assert.equal(await cartouches.count(), await activeCount(), `un cartouche par combattant actif (${await cartouches.count()} pour ${await activeCount()})`);
  assert.equal(await page.locator('[data-zone="centre"] [data-part="melees"] [data-workspace-select]').count(), 0, 'les cartouches ne choisissent pas l’acteur');
  const wasMelee = await meleeState();
  const pick = await cartouches.evaluateAll((items, avoid) => items.map(item => item.dataset.workspaceTarget).find(id => !avoid.includes(id)), [wasMelee.actor, wasMelee.target]);
  await page.locator(`[data-part="melees"] [data-workspace-target="${pick}"]`).click();
  const nowMelee = await meleeState();
  assert.equal(nowMelee.target, pick, 'le clic sur le cartouche choisit la cible (fiche de droite)');
  assert.equal(nowMelee.actor, wasMelee.actor, 'l’acteur ne change pas');
  assert.equal(nowMelee.turn, wasMelee.turn, 'le tour ne change pas');
  assert.equal(await page.locator(`[data-part="melees"] [data-workspace-target="${pick}"]`).getAttribute('aria-pressed'), 'true', 'le cartouche choisi est marqué');
  assert.equal(await page.locator('[data-part="melees"] [data-workspace-target][aria-pressed="true"]').count(), 1, 'une seule cible marquée');
  await measure('mêlées : un cartouche choisit la cible');
  // Retour de la cible à celle d'avant ; la frise ne la touche pas.
  await page.locator(`[data-part="melees"] [data-workspace-target="${wasMelee.target}"]`).click();
  assert.equal((await meleeState()).target, wasMelee.target);
  await page.locator(`[data-zone="frise"] [data-frise-id="${pick}"]`).click();
  assert.equal((await meleeState()).target, wasMelee.target, 'un clic sur la frise ne change jamais la cible');
  await page.locator(`[data-zone="frise"] [data-frise-id="${wasMelee.actor}"]`).click();
  // Les cartouches gardent leurs commandes : Déplacer…, Engager avec…, Encerclé, Position haute, À couvert.
  const gorMove = page.getByLabel('Déplacer Gor 1', { exact: true });
  const moveOptions = await gorMove.locator('option').allTextContents();
  for (const label of ['Déplacer…', 'Engager avec Erich Massenbach', 'Encerclé', 'Position haute', 'À couvert']) assert.ok(moveOptions.includes(label), `Déplacer… propose « ${label} » (${moveOptions.join(' | ')})`);
  // Engagement : Gor 1 contre Erich et Jorunn — une mêlée, des cartouches groupés, aucun débordement.
  await gorMove.selectOption(`engage:${ID.ERICH}`);
  await page.getByLabel('Déplacer Gor 1', { exact: true }).selectOption(`engage:${ID.JORUNN}`);
  await page.locator('.workspace-zone.is-melee').first().waitFor();
  assert.match(await page.locator('.workspace-token').filter({ has: page.locator(`[data-workspace-target="${ID.GOR}"]`) }).textContent(), /Engagé avec : /, 'l’engagement reste lisible sur le cartouche');
  await selectActor(ID.GOR);
  const bar = page.locator('[data-zone="bas"] .workspace-action-bar');
  const barLabels = await bar.locator('.workspace-action-bar-item strong').allTextContents();
  for (const label of ['Se désengager', 'Fuir', 'Se déplacer', 'Autres actions']) assert.ok(barLabels.includes(label), `la barre du bas propose « ${label} » (${barLabels.join(' | ')})`);
  assert.ok(barLabels.some(label => label.startsWith('Attaquer · ')), 'Attaquer · <ennemi engagé>');
  assert.ok(barLabels.some(label => /^Hand Weapon/.test(label)), `les actions de l’acteur sont dans la barre (${barLabels.join(' | ')})`);
  assert.equal(await bar.locator('[aria-keyshortcuts]').count(), 0, 'aucun raccourci clavier sur les actions');
  assert.ok(barLabels.every(label => !/^\s*[1-9][\s.)·]/.test(label)), `actions non numérotées (${barLabels.join(' | ')})`);
  await bar.getByRole('button', { name: /^Se désengager/ }).click();
  await page.locator('.workspace-disengage').waitFor();
  await measure('mêlées : engagement, barre d’actions, désengagement ouvert');
  await page.locator('.workspace-disengage').getByRole('button', { name: 'Fermer' }).click();
  await selectActor(wasMelee.actor);
  await page.getByLabel('Déplacer Gor 1', { exact: true }).selectOption('free');
  await page.waitForFunction(() => !document.querySelector('.workspace-zone.is-melee'));
  // 2 quater (lot E4c, CA26) : « Charger » sur la cible choisie par son cartouche, pour chaque ennemi libre, sans limite.
  await selectActor(ID.GOR);
  const gorFoes = await page.evaluate(async id => {
    const { Store } = await import('/js/main.js');
    const { outnumberSide } = await import('/js/core/outnumbering.js');
    const list = Store.listParticipants().filter(row => row.zone === 'active'), gor = list.find(row => row.id === id);
    return list.filter(row => row.id !== id && outnumberSide(row) !== outnumberSide(gor)).map(row => ({ id: row.id, name: row.name }));
  }, ID.GOR);
  assert.ok(gorFoes.length > 4, `plus de quatre ennemis pour Gor 1 (${gorFoes.length})`);
  for (const foe of gorFoes) {
    await page.locator(`[data-part="melees"] [data-workspace-target="${foe.id}"]`).click();
    const charge = page.locator('[data-zone="bas"] .workspace-action-bar [data-bar-action="charge-' + foe.id + '"]');
    assert.equal(await charge.count(), 1, `Charger · ${foe.name} proposé une fois la cible choisie`);
    assert.equal(await charge.isEnabled(), true, `Charger · ${foe.name} actif`);
  }
  const lastFoe = gorFoes.at(-1);
  await page.locator('[data-zone="bas"] .workspace-action-bar [data-bar-action="charge-' + lastFoe.id + '"]').click();
  assert.equal((await meleeState()).target, lastFoe.id, 'la charge porte sur la cible choisie');
  await measure('charger');
  await selectActor(wasMelee.actor);

  // 3. Attaque de mêlée : Gor 1 frappe Erich (jet d'attaque, défense, aperçu).
  await selectActor(ID.GOR);
  await chooseAction('Hand Weapon');
  await chooseTarget('Erich Massenbach');
  await rollInput('attack', 23);
  await rollInput('defense', 87);
  await press('defense');
  await page.locator('.workspace-result').first().waitFor();
  await measure('attaque de mêlée');
  // Lot E4b (CA15a, CA20) : plus d'onglet « Circonstances » ; séquelles, convalescence et calendrier hors de l'écran de combat.
  assert.equal(await page.locator('[data-side-tab="circumstances"]').count(), 0, 'l’onglet « Circonstances » a disparu');
  assert.equal(await page.locator('[data-zone] .workspace-aftermath').count(), 0, 'pas de suites de combat dans l’écran de combat');
  assert.equal(await page.locator('[data-zone]').getByText('Suites de combat').count(), 0);

  // 4. Tir : Guzgog tire à l'arc court sur Jorunn.
  await selectActor(ID.ARCHER);
  await chooseAction('Shortbow');
  await chooseTarget('Jorunn Gromsdottir');
  await rollInput('attack', 23);
  await measure('tir');
  // Lot E4b (CA13, CA15a) : une ligne « Distance » de six choix, plus de case « Tir à bout portant » ; panneau « autres… »
  // de 12 circonstances au plus, dans la fenêtre.
  assert.equal(await resolution().locator('[data-distance] [data-distance-choice]').count(), 6, 'ligne Distance : six choix');
  assert.equal(await page.getByLabel('Tir à bout portant', { exact: true }).count(), 0, 'plus de case « Tir à bout portant »');
  await resolution().locator('[data-circumstances-toggle]').click();
  const others = page.locator('.workspace-resolution-drawer');
  await others.waitFor({ state: 'visible' });
  const pertinent = await others.locator('.workspace-circumstances-pertinent [data-circumstance]').count();
  assert.ok(pertinent > 0 && pertinent <= 12, `panneau « autres… » : ${pertinent} circonstances (1 à 12)`);
  assert.equal(await others.locator('.workspace-circumstances-more').evaluate(el => el.open), false, 'réglages détaillés repliés');
  await measure('tir : panneau « autres… » ouvert');
  await others.getByRole('button', { name: 'Fermer', exact: true }).click();
  await others.waitFor({ state: 'hidden' });

  // 5. Sort : le chamane-bray ouvre l'Incantation V5.
  await selectActor(ID.SHAMAN);
  await resolution().locator('[data-magic-menu]').click();
  await resolution().getByRole('button', { name: 'Incantation V5' }).click();
  await measure('sort');

  // 6. Prière : Père Pedragar ouvre le panneau des prières.
  await selectActor(ID.PRIEST);
  await resolution().locator('[data-magic-menu]').click();
  await resolution().getByRole('button', { name: 'Prière', exact: true }).click();
  // Lot E4b : la prière s'ouvre dans la case centrale, à la place des mêlées et de la résolution.
  await page.locator('[data-zone="centre"] [data-center-panel="prayer"] [data-divine-panel]').waitFor();
  await measure('prière');
  await page.locator('[data-center-panel="prayer"]').getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.locator('[data-zone="centre"] [data-part="melees"]').waitFor();

  // 7. Dégâts avec critique : Gor 2 touche Jorunn sur un double (11), saisie du critique, application.
  await selectActor(ID.GOR2);
  await chooseAction('Hand Weapon');
  await chooseTarget('Jorunn Gromsdottir');
  await rollInput('attack', 11);
  await rollInput('defense', 87);
  await press('defense');
  await page.locator('[data-roll-input="critical-location"], [data-roll-input="critical-effect"]').first().waitFor();
  for (const name of ['critical-location', 'critical-effect', 'critical-second']) {
    const input = page.locator(`[data-roll-input="${name}"]`).first();
    if (await input.isVisible().catch(() => false)) { await input.fill(name === 'critical-location' ? '57' : '35'); await input.press('Enter'); }
  }
  await measure('dégâts avec critique');
  const apply = resolution().locator('[data-focus-key="apply"]').first();
  if (await apply.isEnabled().catch(() => false)) { await apply.click(); await measure('critique appliqué'); }
  else report.push({ step: 'critique appliqué', note: `non appliqué : ${await apply.getAttribute('title').catch(() => '?')}` });

  // 8. 0 PV avec la mort subite des figurants active : la décision du MJ arrive dans la case « À décider » (lot E2,
  // CA7 à CA9) : carte visible sans défilement, compteur dans la barre du haut, marque sur la frise, Tour suivant actif,
  // « Plus tard » réduit la carte sans la retirer, « Mort » se décide en un clic.
  await page.evaluate(async id => {
    const { Store } = await import('/js/main.js');
    await Store.setSuddenDeathEnabled(true);
    await Store.updateParticipant(id, { hp: 0 });
  }, ID.UNGOR);
  const decisionCard = page.locator(`[data-zone="droite"] [data-decisions] [data-decision-kind="mort-subite"][data-participant-id="${ID.UNGOR}"]`);
  await decisionCard.waitFor();
  await measure('0 PV, mort subite active');
  for (const zone of report.at(-1).overflowing.filter(z => z.name === 'droite')) failures.push(`0 PV, mort subite active : la zone droite déborde (${zone.scrollHeight}/${zone.clientHeight})`);
  assert.ok(await insideWindow(decisionCard), 'la carte « À décider » est dans la fenêtre');
  assert.ok(await decisionCard.evaluate(el => { const zone = el.closest('[data-zone]'), z = zone.getBoundingClientRect(), r = el.getBoundingClientRect(); return zone.scrollTop === 0 && r.top >= z.top - 1 && r.bottom <= z.bottom + 1; }), 'la carte se voit sans faire défiler sa zone');
  assert.deepEqual(await decisionCard.locator('[data-decision-option]').allTextContents(), ['Mort', 'Inconscient', 'Plus tard', 'Pas un figurant'], 'options de la mort subite, sans case à cocher préalable');
  assert.equal(await decisionCard.locator('input[type="checkbox"]').count(), 0, 'aucune case à cocher préalable');
  const bannerCount = page.locator('#combat-banner [data-decisions-count]');
  const pending = Number(await page.locator('[data-zone="droite"] [data-decisions] .workspace-decisions-count').getAttribute('data-decisions-count'));
  assert.ok(pending >= 1, 'la case compte la décision');
  assert.equal(await bannerCount.getAttribute('data-decisions-count'), String(pending), 'compteur de la barre du haut = case « À décider »');
  assert.ok(await bannerCount.isVisible(), 'le compteur se voit');
  assert.equal(await page.locator(`[data-zone="frise"] [data-frise-id="${ID.UNGOR}"] .frise-decision`).count(), 1, 'marque « décision en attente » sur la frise');
  assert.ok(await page.locator('#combat-banner .combat-banner-primary').isEnabled(), 'Tour suivant reste actif');
  await decisionCard.locator('[data-decision-option="later"]').click();
  await decisionCard.locator('.workspace-decision-resume').waitFor();
  assert.equal(await bannerCount.getAttribute('data-decisions-count'), String(pending), '« Plus tard » laisse la décision en attente');
  // 8 bis (lot E9, d) : barre du haut à 1440 × 800 avec un nom d'acteur long, quand « Jouer son tour maintenant » et
  // « N à décider » s'affichent ensemble : « Round N · au tour de … » ne doit pas être tronqué.
  const longName = NAMES.SHAMAN; // le nom d'acteur le plus long de la fixture R20 (44 caractères)
  const barHeightBefore = await page.evaluate(() => document.querySelector('.topbar').getBoundingClientRect().height);
  const turnId = (await friseState()).turn;
  const turnOldName = await page.evaluate(async id => (await import('/js/main.js')).Store.listParticipants().find(row => row.id === id).name, turnId);
  await page.evaluate(async ([id, name]) => (await import('/js/main.js')).Store.updateParticipant(id, { name }), [turnId, longName]);
  const awayId = (await friseState()).portraits.find(item => !item.turn && !item.dead && item.id !== ID.UNGOR && item.id !== other.id)?.id;
  assert.ok(awayId, 'un combattant disponible pour agir hors de son tour');
  await page.locator(`[data-zone="frise"] [data-frise-id="${awayId}"]`).click();
  await page.locator('#combat-banner .combat-banner-play-now:not([hidden])').waitFor();
  await page.locator('#combat-banner [data-decisions-count]:not([hidden])').waitFor();
  const roundText = await page.locator('#combat-banner .combat-banner-status').evaluate(el => ({ text: el.textContent, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, barHeight: document.querySelector('.topbar').getBoundingClientRect().height }));
  assert.match(roundText.text, /^Round \d+ · au tour de Swilegrakk/, 'le texte du round est complet dans le DOM');
  assert.equal(roundText.barHeight, barHeightBefore, 'la hauteur de la barre du haut ne change pas');
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, 'la page ne défile pas');
  assert.ok(roundText.scrollWidth <= roundText.clientWidth, `« Round N · au tour de … » est tronqué dans la barre du haut (${roundText.scrollWidth} > ${roundText.clientWidth})`);
  await page.locator(`[data-zone="frise"] [data-frise-id="${turnId}"]`).click();
  await page.evaluate(async ([id, name]) => (await import('/js/main.js')).Store.updateParticipant(id, { name }), [turnId, turnOldName]);
  await decisionCard.locator('.workspace-decision-resume').click();
  await decisionCard.locator('[data-decision-option="dead"]').click();
  await decisionCard.waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(async id => (await import('/js/main.js')).Store.listParticipants().find(row => row.id === id)?.extensions?.v5?.dead, ID.UNGOR), true, '« Mort » en un clic');
  assert.equal(await bannerCount.getAttribute('data-decisions-count'), String(pending - 1), 'la décision prise quitte le compteur');
  await measure('mort subite décidée');

  // 9. Retrait d'un participant : confirmation de l'outil, puis retrait.
  await selectActor(ID.UNGOR);
  await sheetMenu('acteur').click();
  await menuItem(/Retirer du combat/).click();
  const confirm = page.locator('dialog[open]').last();
  await confirm.waitFor({ state: 'visible' });
  // Lot E2b (décision 16) : la confirmation, non modale, figure aussi dans la case « À décider ».
  await page.locator(`[data-zone="droite"] [data-decisions] [data-decision-kind="retrait"][data-participant-id="${ID.UNGOR}"]`).waitFor();
  await measure('retrait d’un participant (confirmation)');
  await confirm.getByRole('button', { name: /^Retirer/ }).first().click();
  await page.waitForFunction(async id => !(await import('/js/main.js')).Store.listParticipants().some(row => row.id === id && row.zone === 'active'), ID.UNGOR);
  await measure('participant retiré');

  // 10. Tour suivant, puis changement de round.
  const next = page.locator('#combat-banner .combat-banner-primary');
  const roundNow = () => page.evaluate(async () => (await import('/js/main.js')).Store.getCombat().round);
  await next.click();
  await measure('tour suivant');
  for (let n = 0; n < 40 && (await roundNow()) < 2; n += 1) {
    await next.click();
    const sheetOpen = page.locator('dialog.tool-sheet[open]');
    if (await page.locator('dialog:modal').count()) failures.push(`tour suivant : fenêtre modale ouverte (${await page.locator('dialog:modal').first().innerText().then(text => text.slice(0, 60)).catch(() => '?')})`);
    if (await sheetOpen.count()) await sheetOpen.getByRole('button', { name: /Fermer|Annuler/ }).first().click();
  }
  assert.equal(await roundNow(), 2, 'le parcours atteint le round 2');
  await measure('changement de round');

  // 11. Terminer le combat.
  await page.locator('#workspace-end-combat').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-workspace-select]').length === 0);
  await measure('combat terminé');

  assert.deepEqual(errors, [], 'aucune erreur de page');
  assert.ok(dialogs.length <= 1, `aucune boîte native hormis le chargement du fichier (${dialogs.join(' | ')})`);
} finally {
  await browser.close();
  await close();
}

// Rapport : page et zones à chaque étape.
console.log('\nRefonte · mesure de l’écran de combat sur R20, 1440 × 800');
for (const row of report) {
  if (row.note) { console.log(`- ${row.step} : ${row.note}`); continue; }
  const zones = row.overflowing.map(z => `${z.name} ${z.scrollHeight}/${z.clientHeight}${z.scrollWidth > z.clientWidth + 1 ? ` (largeur ${z.scrollWidth}/${z.clientWidth}, ${z.widest})` : ''}`);
  const windows = row.windows.map(w => `${w.name.slice(0, 40)} ${w.scrollHeight}/${w.clientHeight}${w.inside ? '' : ' hors fenêtre'}`);
  console.log(`- ${row.step} : page ${row.pageScrolls ? `DÉFILE (${row.page.scrollHeight} px)` : 'fixe'}`
    + `${row.absent.length ? ` · zones absentes : ${row.absent.join(', ')}` : ''}`
    + ` · zones qui débordent : ${zones.length ? zones.join(', ') : 'aucune'}`
    + `${windows.length ? ` · fenêtres : ${windows.join(', ')}` : ''}`
    + `${row.centreParts?.length ? ` · centre : ${row.centreParts.map(part => `${part.name} ${part.scrollHeight}/${part.clientHeight}`).join(', ')}` : ''}`);
}
failures = [...new Set(failures)];
if (failures.length) {
  console.error(`\nÉCHEC (${failures.length}) :\n${failures.map(line => `  ${line}`).join('\n')}`);
  process.exit(1);
}
console.log('\nrefonte-ecran : OK (la page ne défile à aucune étape)');
