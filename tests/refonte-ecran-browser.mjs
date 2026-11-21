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
const shots = `${root}tmp/refonte-ecran/`;
mkdirSync(shots, { recursive: true });

// Combattants de R20 utilisés par le parcours (identifiants stables du générateur tools/build-r20-fixture.mjs).
const GOR = 'r20-e0-p-101-1', GOR2 = 'r20-e0-p-101-2', UNGOR = 'r20-e0-p-102-1', ARCHER = 'r20-e0-p-122';
const SHAMAN = 'r20-e0-p-121', PRIEST = 'r20-e0-p-173', ERICH = 'r20-e0-p-536', JORUNN = 'r20-e0-p-537';

const { origin, close } = await startStaticServer({ root });
const browser = await launchBrowser();
const report = [];
let failures = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, serviceWorkers: 'block' });
  await blockExternalNetwork(context, origin);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [], dialogs = [];
  page.on('pageerror', error => errors.push(error.message));
  // Seul le chargement du fichier demande une confirmation native (remplacer la séance) ; aucune autre n'est attendue.
  page.on('dialog', dialog => { dialogs.push(dialog.message()); dialog.accept(); });
  const store = fn => page.evaluate(fn);

  async function measure(step) {
    await page.waitForTimeout(150);
    const m = await page.evaluate(zones => {
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
        melees: (el => el ? box(el) : { absent: true })(document.querySelector('[data-zone="centre"] [data-part="melees"]')),
        actionBar: (el => el ? { height: el.clientHeight, overflow: el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1 } : null)(document.querySelector('[data-zone="bas"] .workspace-action-bar'))
      };
    }, ZONES);
    const pageScrolls = m.page.scrollHeight > m.page.height + 1 || m.page.scrollWidth > m.page.width + 1;
    const absent = m.zones.filter(z => z.absent).map(z => z.name);
    const overflowing = m.zones.filter(z => !z.absent && z.shown && (z.scrollHeight > z.clientHeight + 1 || z.scrollWidth > z.clientWidth + 1));
    const windowsOverflow = m.windows.filter(w => !w.inside || w.scrollHeight > w.clientHeight + 1);
    // Lot E4a : la barre d'actions (zone bas) et la partie « mêlées » (zone centre) ne débordent jamais sur R20.
    for (const z of m.zones) if (z.name === 'bas' && z.shown && (z.scrollHeight > z.clientHeight + 1 || z.scrollWidth > z.clientWidth + 1)) failures.push(`${step} : la zone bas déborde (${z.scrollHeight}/${z.clientHeight})`);
    if (m.melees && !m.melees.absent && m.melees.scrollHeight > m.melees.clientHeight + 1) failures.push(`${step} : les mêlées débordent (${m.melees.scrollHeight}/${m.melees.clientHeight})`);
    if (m.melees && m.melees.absent && m.zones.find(z => z.name === 'centre')?.shown && report.length >= 3) failures.push(`${step} : partie mêlées absente du centre`);
    if (m.actionBar && m.actionBar.height > 0 && m.actionBar.overflow) failures.push(`${step} : la barre d'actions déborde (${JSON.stringify(m.actionBar)})`);
    report.push({ step, pageScrolls, page: m.page, absent, overflowing, windows: m.windows, windowsOverflow });
    if (pageScrolls) failures.push(`${step} : la page défile (${m.page.scrollWidth} × ${m.page.scrollHeight} pour ${m.page.width} × ${m.page.height})`);
    if (absent.length) failures.push(`${step} : zones absentes (${absent.join(', ')})`);
    if (STRICT_ZONES) for (const z of [...overflowing, ...windowsOverflow]) failures.push(`${step} : ${z.name} déborde (${z.scrollHeight}/${z.clientHeight})`);
    if (m.fonts.length) failures.push(`${step} : polices chargées (${[...new Set(m.fonts)].join(', ')})`);
    await page.screenshot({ path: `${shots}${String(report.length).padStart(2, '0')}-${step.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '')}.png` });
  }

  const resolution = () => page.locator('.workspace-resolution');
  const selectActor = id => page.locator(`[data-workspace-select="${id}"]`).first().click();
  const chooseAction = name => resolution().locator('[data-action-key]').filter({ hasText: name }).first().click();
  const chooseTarget = name => resolution().getByRole('button', { name, exact: true }).first().click();
  const rollInput = (name, value) => page.locator(`[data-roll-input="${name}"]`).first().fill(String(value));
  const press = (name, key = 'Enter') => page.locator(`[data-roll-input="${name}"]`).first().press(key);

  // 1. Lancer : la sauvegarde R20 chargée, 20 combattants actifs dans Jouer.
  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', null, { timeout: 20000 });
  await page.locator('#file-input').setInputFiles({ name: 'rencontre-r20.json', mimeType: 'application/json', buffer: fixture });
  await page.locator('#tab-combat').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-workspace-select]').length >= 20);
  await measure('lancer la rencontre');

  // 2. Initiative : la feuille de démarrage, dés des PJ, Combat instinctif, égalités, puis le round 1.
  await page.locator('#combat-banner .combat-banner-primary').click();
  const sheet = page.locator('dialog.tool-sheet');
  await sheet.waitFor({ state: 'visible' });
  await measure('saisir l’initiative');
  for (const die of await sheet.locator('input[name^="die:"]:not([readonly])').all()) await die.fill('5');
  for (const choice of await sheet.locator('select[name^="reflexChoice:"]').all()) await choice.selectOption({ index: 1 });
  for (let pass = 0; pass < 6 && !(await sheet.getByRole('button', { name: 'Confirmer et appliquer' }).isVisible()); pass += 1) {
    await sheet.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
    for (const first of await sheet.locator('select[data-kind="tieFirst"]').all()) if (!(await first.inputValue())) await first.selectOption({ index: 1 });
    const groups = new Map();
    for (const position of await sheet.locator('select[data-kind="tieChoice"]').all()) {
      const key = await position.getAttribute('data-group-key');
      const at = groups.get(key) || 0; groups.set(key, at + 1);
      await position.selectOption({ index: at + 1 });
    }
    for (const ride of await sheet.locator('input[data-mounted-rider]').all()) if (!(await ride.inputValue())) await ride.fill(await ride.getAttribute('data-field') === 'roll' ? '20' : '40');
    for (const question of await sheet.locator('select[data-ride-condition]').all()) if (!(await question.inputValue())) await question.selectOption({ index: 1 });
  }
  await sheet.getByRole('button', { name: 'Confirmer et appliquer' }).click();
  await page.waitForFunction(async () => (await import('/js/main.js')).Store.getCombat().round === 1);
  await measure('initiative appliquée, round 1');

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
  await page.locator(`[data-zone="frise"] [data-frise-id="${before.turn}"]`).click();
  const back = await friseState();
  assert.equal(back.actor, before.turn, 'un clic sur le portrait du tour ramène l’acteur à celui dont c’est le tour');
  assert.doesNotMatch(back.banner, /hors de son tour/, 'la mention disparaît');
  assert.equal(back.target, before.target, 'la cible ne change toujours pas');

  // 2 ter. Mêlées en cartouches (lot E4a, CA6) : un clic sur un cartouche choisit la cible, jamais l'acteur ni le tour ;
  // la frise ne change jamais la cible. La barre du bas porte les actions de l'acteur et « ce qu'il peut faire d'ici », sans numéros.
  const meleeState = () => page.evaluate(async () => {
    const { Store } = await import('/js/main.js');
    return { turn: Store.getCombat().currentActorId, actor: document.querySelector('.workspace-sheet-actor')?.dataset.actorId || null, target: document.querySelector('.workspace-sheet-target')?.dataset.actorId || null };
  });
  const cartouches = page.locator('[data-zone="centre"] [data-part="melees"] [data-workspace-target]');
  assert.ok(await cartouches.count() >= 20, `un cartouche par combattant actif (${await cartouches.count()}, 20 au moins attendus)`);
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
  await gorMove.selectOption(`engage:${ERICH}`);
  await page.getByLabel('Déplacer Gor 1', { exact: true }).selectOption(`engage:${JORUNN}`);
  await page.locator('.workspace-zone.is-melee').first().waitFor();
  assert.match(await page.locator('.workspace-token').filter({ has: page.locator(`[data-workspace-target="${GOR}"]`) }).textContent(), /Engagé avec : /, 'l’engagement reste lisible sur le cartouche');
  await selectActor(GOR);
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

  // 3. Attaque de mêlée : Gor 1 frappe Erich (jet d'attaque, défense, aperçu).
  await selectActor(GOR);
  await chooseAction('Hand Weapon');
  await chooseTarget('Erich Massenbach');
  await rollInput('attack', 23);
  await rollInput('defense', 87);
  await press('defense');
  await page.locator('.workspace-result').first().waitFor();
  await measure('attaque de mêlée');

  // 4. Tir : Guzgog tire à l'arc court sur Jorunn.
  await selectActor(ARCHER);
  await chooseAction('Shortbow');
  await chooseTarget('Jorunn Gromsdottir');
  await rollInput('attack', 23);
  await measure('tir');

  // 5. Sort : le chamane-bray ouvre l'Incantation V5.
  await selectActor(SHAMAN);
  await resolution().locator('[data-magic-menu]').click();
  await resolution().getByRole('button', { name: 'Incantation V5' }).click();
  await measure('sort');

  // 6. Prière : Père Pedragar ouvre le panneau des prières.
  await selectActor(PRIEST);
  await resolution().locator('[data-magic-menu]').click();
  await resolution().getByRole('button', { name: 'Prière', exact: true }).click();
  await measure('prière');

  // 7. Dégâts avec critique : Gor 2 touche Jorunn sur un double (11), saisie du critique, application.
  await selectActor(GOR2);
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

  // 8. 0 PV avec la mort subite des figurants active : la décision du MJ est attendue.
  await page.evaluate(async id => {
    const { Store } = await import('/js/main.js');
    await Store.setSuddenDeathEnabled(true);
    await Store.updateParticipant(id, { hp: 0 });
  }, UNGOR);
  await page.locator('.workspace-sudden-death-banner').first().waitFor();
  await measure('0 PV, mort subite active');

  // 9. Retrait d'un participant : confirmation de l'outil, puis retrait.
  await selectActor(UNGOR);
  await page.locator('.workspace-sheet-remove').first().click();
  const confirm = page.locator('dialog[open]').last();
  await confirm.waitFor({ state: 'visible' });
  await measure('retrait d’un participant (confirmation)');
  await confirm.getByRole('button', { name: /^Retirer/ }).first().click();
  await page.waitForFunction(async id => !(await import('/js/main.js')).Store.listParticipants().some(row => row.id === id && row.zone === 'active'), UNGOR);
  await measure('participant retiré');

  // 10. Tour suivant, puis changement de round.
  const next = page.locator('#combat-banner .combat-banner-primary');
  const roundNow = () => page.evaluate(async () => (await import('/js/main.js')).Store.getCombat().round);
  await next.click();
  await measure('tour suivant');
  for (let n = 0; n < 40 && (await roundNow()) < 2; n += 1) {
    await next.click();
    const sheetOpen = page.locator('dialog.tool-sheet[open]');
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
    + `${windows.length ? ` · fenêtres : ${windows.join(', ')}` : ''}`);
}
failures = [...new Set(failures)];
if (failures.length) {
  console.error(`\nÉCHEC (${failures.length}) :\n${failures.map(line => `  ${line}`).join('\n')}`);
  process.exit(1);
}
console.log('\nrefonte-ecran : OK (la page ne défile à aucune étape)');
