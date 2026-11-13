// Parcours COMP-ACCESSIB-10 : garde l'accessibilité de base sur l'application réelle (index.html servi tel quel).
// Écrans : Préparer, Jouer (rencontre en cours, panneau de résolution ouvert), Campagne, Bibliothèque, à 390 px et en bureau.
// 1. Débordement horizontal : la page ne défile pas en largeur, et aucun élément visible (fixe ou non) ne sort de l'écran
//    sans être rogné par un ancêtre qui le contient.
// 2. Noms accessibles : tout bouton, lien, champ, menu, onglet ou résumé visible a un nom calculé par le navigateur (arbre
//    d'accessibilité de Chromium, pas une approximation).
// 3. Fenêtres : le focus entre dans la fenêtre à l'ouverture et revient sur l'élément qui l'a ouverte à la fermeture. Pour
//    les fenêtres modales (showModal), Tab et Maj+Tab ne sortent pas de la fenêtre. Les fenêtres d'outil (tool-sheet) sont
//    non modales par choix (COMP-ACCESSIB-04, gardé tel quel) : Tab peut en sortir, ce n'est pas vérifié.
// Hors périmètre, par décision du MJ : cibles tactiles de 44 px (COMP-ACCESSIB-05) et raccourcis 1/2/3 sous une fenêtre.
// Chaque échec nomme l'écran, la largeur et l'élément. Les défauts connus non corrigés vont dans EXCEPTIONS, qui ne peut que
// rétrécir : une exception qui ne sert plus fait échouer le parcours.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { expect } from 'playwright/test';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

/** Défauts connus, non corrigés : « écran · largeur · contrôle · élément », tels qu'imprimés par un échec. */
const EXCEPTIONS = new Set([
]);

const WIDTHS = [{ label: '390 px', width: 390, height: 844 }, { label: 'bureau 1366 px', width: 1366, height: 900 }];
const root = fileURLToPath(new URL('../', import.meta.url)), base = '/Outil-MJ-Warhammer/';
const server = createStaticServer({ root, base, headers: { 'Cache-Control': 'no-store' } });
const caracs = { CC: 45, CT: 40, F: 40, E: 35, I: 40, Ag: 35, Dex: 35, Int: 40, FM: 35, Soc: 30 };
const profile = (id, name, kind, extra = {}) => ({ id, name, kind, hp: 12, maxHp: 12, caracs, skills: [], talents: [], equipment: [], traits: [], actions: [], extensions: { v5: {} }, ...extra });
// Rencontre lancée (scène active : Rappels et Événements actifs), puis un suivi ouvert sur le Gobelin (fenêtre « Garder ou archiver »).
async function seed(page) {
  await page.evaluate(async ({ hilda, gob }) => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    await Store.ready;
    for (const row of [hilda, gob]) await Store.addProfile(row);
    await Store.saveEncounter({ id: 'rencontre-accessibilite', name: 'Embuscade', entries: [hilda, gob].map(row => ({ profileId: row.id, zone: 'active', quantity: 1 })) });
    await Store.launchEncounter('rencontre-accessibilite');
    const state = JSON.parse(Store.getFullJSON());
    const gobId = state.combat.participants.find(row => row.name === 'Gobelin').id;
    state.extensions.v5.aftermathRegister = { schemaVersion: 1, revision: 1, calendar: { schemaVersion: 1, originDay: 0, currentDay: 0 }, receipts: [], diseases: [], sequelae: [],
      incidents: [{ id: 'i-gob', participantId: gobId, source: { kind: 'wounds-lost', cause: 'combat' }, subjectKind: 'person', injuryDay: 0, status: 'open',
        bandaged: false, requiresSurgery: false, surgeryCompleted: true, infection: false, dailyChecks: [], treatments: [] }] };
    await Store.loadFromJSON(state);
  }, { hilda: profile('profil-hilda', 'Hilda Brenner', 'PJ', { actions: [{ id: 'epee', name: 'Épée à une main', type: 'attack', attr: 'CC', base: 45, damage: 4, qualities: [], extensions: {} }] }),
    gob: profile('profil-gob', 'Gobelin', 'Créature', { hp: 9, maxHp: 9 }) });
}

const failures = [], usedExceptions = new Set();
let checkedControls = 0, checkedDialogs = 0;
const fail = (screen, width, check, element) => {
  const key = `${screen} · ${width} · ${check} · ${element}`;
  if (EXCEPTIONS.has(key)) { usedExceptions.add(key); return; }
  failures.push(key);
};

// Description lisible d'un élément, injectée dans la page : balise#id.classes [data-*] « texte ».
const DESCRIBE = `function describe(element) {
  if (!element || element.nodeType !== 1) return String(element);
  let text = element.tagName.toLowerCase();
  if (element.id) text += '#' + element.id;
  const classes = Array.from(element.classList).slice(0, 3);
  if (classes.length) text += '.' + classes.join('.');
  for (const name of ['data-action-key', 'data-focus-key', 'data-campaign-focus', 'name', 'type']) if (element.hasAttribute(name)) text += '[' + name + '=' + element.getAttribute(name) + ']';
  const label = (element.textContent || element.value || '').replace(/\\s+/g, ' ').trim().slice(0, 40);
  return label ? text + ' « ' + label + ' »' : text;
}`;

async function checkOverflow(page, screen, width) {
  const report = await page.evaluate(`(() => { ${DESCRIBE}
    const viewport = document.documentElement.clientWidth;
    const scrolls = document.documentElement.scrollWidth > viewport + 1;
    const clipped = element => {
      let { left, right } = element.getBoundingClientRect();
      for (let parent = element.parentElement; parent && parent !== document.documentElement; parent = parent.parentElement) {
        if (getComputedStyle(parent).overflowX === 'visible') continue;
        const box = parent.getBoundingClientRect();
        left = Math.max(left, box.left); right = Math.min(right, box.right);
      }
      return { left, right };
    };
    const offending = new Set();
    for (const element of document.body.querySelectorAll('*')) {
      const rect = element.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2 || !element.checkVisibility({ visibilityProperty: true })) continue;
      if (rect.right <= 0 || rect.left >= viewport) { if (!scrolls) continue; }
      const { left, right } = clipped(element);
      if (right <= left) continue;
      if (right > viewport + 1 || left < -1) offending.add(element);
    }
    const outermost = Array.from(offending).filter(element => !offending.has(element.parentElement));
    return { scrolls, viewport, scrollWidth: document.documentElement.scrollWidth,
      elements: outermost.slice(0, 6).map(element => { const rect = element.getBoundingClientRect(); return describe(element) + ' (de ' + Math.round(rect.left) + ' à ' + Math.round(rect.right) + ' px)'; }) };
  })()`);
  if (report.scrolls) fail(screen, width, 'débordement', `la page défile en largeur (${report.scrollWidth} px pour ${report.viewport} px)`);
  for (const element of report.elements) fail(screen, width, 'débordement', element);
}

const NAMED_ROLES = new Set(['button', 'link', 'textbox', 'searchbox', 'combobox', 'listbox', 'checkbox', 'radio', 'spinbutton', 'slider', 'switch', 'tab', 'menuitem',
  'menuitemcheckbox', 'menuitemradio', 'DisclosureTriangle', 'PopUpButton', 'ComboBoxSelect', 'ComboBoxMenuButton', 'ToggleButton', 'textField', 'TextField']);
async function checkNames(page, cdp, screen, width) {
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const controls = nodes.filter(node => !node.ignored && NAMED_ROLES.has(node.role?.value) && node.backendDOMNodeId != null);
  // Garde-fou : un arbre presque vide voudrait dire que l'écran n'est pas affiché, et la vérification serait vide de sens.
  if (controls.length < 10) fail(screen, width, 'nom accessible', `seulement ${controls.length} contrôle(s) dans l'arbre d'accessibilité`);
  checkedControls += controls.length;
  for (const node of controls) {
    if (String(node.name?.value || '').trim()) continue;
    const { object } = await cdp.send('DOM.resolveNode', { backendNodeId: node.backendDOMNodeId }).catch(() => ({}));
    if (!object?.objectId) continue;
    const { result } = await cdp.send('Runtime.callFunctionOn', { objectId: object.objectId, returnByValue: true,
      functionDeclaration: `function () { ${DESCRIBE} const element = this.nodeType === 1 ? this : this.parentElement;
        return element && element.checkVisibility({ visibilityProperty: true }) ? describe(element) : null; }` });
    if (result?.value) fail(screen, width, 'nom accessible', `${node.role.value} ${result.value}`);
  }
}

const activeDescription = page => page.evaluate(`(() => { ${DESCRIBE} return describe(document.activeElement); })()`);

/** Ouvre une fenêtre par `opener`, vérifie que le focus y entre (et y reste si elle est modale), la ferme, vérifie le retour du focus.
 * `modal` : la fenêtre doit être modale (showModal) ; une fenêtre modale devenue non modale laisserait sortir le focus sans signal. */
async function checkDialog(page, screen, width, { name, opener, dialog, modal = false, close = page => page.keyboard.press('Escape'), returnTo = opener }) {
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  const inside = () => dialog.evaluate(element => element.contains(document.activeElement) && document.activeElement !== element.ownerDocument.body);
  await expect.poll(inside, { timeout: 3000 }).toBe(true).catch(async () => fail(screen, width, `fenêtre « ${name} »`, `focus hors de la fenêtre à l'ouverture : ${await activeDescription(page)}`));
  const isModal = await dialog.evaluate(element => element.matches(':modal'));
  if (modal && !isModal) fail(screen, width, `fenêtre « ${name} »`, 'la fenêtre n’est plus modale');
  if (isModal) {
    const count = await dialog.evaluate(element => element.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])').length);
    for (const key of [...Array(count + 2).fill('Tab'), 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
      await page.keyboard.press(key);
      // Sortir vers l'interface du navigateur (body dans un navigateur sans interface) est permis : le reste de la page est inerte.
      if (!await inside() && !await page.evaluate(() => !document.activeElement || document.activeElement === document.body)) {
        fail(screen, width, `fenêtre « ${name} »`, `${key} sort de la fenêtre modale vers ${await activeDescription(page)}`); break;
      }
    }
  }
  await close(page);
  await expect(dialog).toBeHidden();
  checkedDialogs += 1;
  const back = await expect.poll(() => returnTo.evaluate(element => element === document.activeElement), { timeout: 3000 }).toBe(true).then(() => true, () => false);
  if (!back) fail(screen, width, `fenêtre « ${name} »`, `le focus ne revient pas à l'élément d'ouverture mais sur ${await activeDescription(page)}`);
}

await new Promise(done => server.listen(0, '127.0.0.1', done));
const started = Date.now();
const browser = await launchBrowser();
try {
  for (const { label: width, width: w, height } of WIDTHS) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: w, height } }), page = await context.newPage(), errors = [];
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => { errors.push(`boîte native : ${dialog.message()}`); void dialog.dismiss(); });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Accessibility.enable');
    await page.goto(`http://127.0.0.1:${server.address().port}${base}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
    await seed(page);
    const screen = async (name, tab, ready) => {
      await page.locator(tab).click();
      await ready();
      await checkOverflow(page, name, width);
      await checkNames(page, cdp, name, width);
    };

    // Préparer, puis sa fenêtre « Nouvelle rencontre » (fenêtre d'outil) et le menu ⋯.
    await screen('Préparer', '#tab-prepare', () => expect(page.locator('#workspace-prepare')).toBeVisible());
    await checkDialog(page, 'Préparer', width, { name: 'Nouvelle rencontre', opener: page.locator('#workspace-prepare').getByRole('button', { name: 'Nouvelle rencontre', exact: true }),
      dialog: page.locator('dialog.tool-sheet').filter({ has: page.locator('.prepare-persistent-characters') }) });
    await checkDialog(page, 'Préparer', width, { name: 'Menu ⋯', opener: page.locator('#btn-menu'), dialog: page.locator('#app-menu') });
    await page.locator('#btn-menu').click();
    await expect(page.locator('#app-menu')).toBeVisible();
    await checkOverflow(page, 'Menu ⋯', width);
    await checkNames(page, cdp, 'Menu ⋯', width);
    await page.keyboard.press('Escape');

    // Jouer : rencontre en cours, panneau de résolution d'une attaque ouvert sur le Gobelin.
    await screen('Jouer', '#tab-combat', async () => {
      await page.locator('[data-workspace-select]', { hasText: 'Hilda' }).click();
      await page.locator('[data-action-key="epee"]').click();
      await page.locator('#workspace-root').getByRole('group', { name: 'Adversaires' }).getByRole('button', { name: 'Gobelin', exact: true }).click();
      await expect(page.locator('#workspace-root [data-roll-input="attack"]')).toBeVisible();
    });
    for (const [name, id, title] of [['Rappels', '#workspace-reminders', 'Rappels de séance'], ['Événements / Jauges', '#workspace-events', 'Événements structurés']]) {
      const sheet = page.locator('dialog.tool-sheet').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
      await checkDialog(page, 'Jouer', width, { name, opener: page.locator(id), dialog: sheet, close: () => sheet.getByRole('button', { name: 'Fermer', exact: true }).click() });
    }
    await checkDialog(page, 'Jouer', width, { name: 'Temps de campagne', modal: true, opener: page.locator('#workspace-campaign-time'), dialog: page.locator('dialog.campaign-time-dialog') });
    await checkDialog(page, 'Jouer', width, { name: 'Terminer le combat', modal: true, opener: page.locator('#workspace-end-combat'), dialog: page.locator('dialog.encounter-end-dialog'),
      close: () => page.locator('dialog.encounter-end-dialog').getByRole('button', { name: 'Annuler', exact: true }).click() });

    // Campagne, et sa fenêtre « Avancer le temps » (le bouton est reconstruit : le focus revient au bouton du même rôle).
    await screen('Campagne', '#tab-campaign', () => expect(page.locator('#workspace-campaign [data-campaign-focus="advance"]')).toBeVisible());
    await checkDialog(page, 'Campagne', width, { name: 'Avancer le temps', modal: true, opener: page.locator('#workspace-campaign [data-campaign-focus="advance"]'),
      dialog: page.locator('dialog.campaign-time-dialog') });

    // Bibliothèque, une fois le bestiaire affiché.
    await screen('Bibliothèque', '#tab-library', () => page.waitForFunction(() => document.querySelectorAll('#workspace-library button').length > 5));

    if (errors.length) fail('application', width, 'erreurs de page', errors.join(' ; '));
    await context.close();
  }
  const stale = [...EXCEPTIONS].filter(key => !usedExceptions.has(key));
  for (const key of stale) failures.push(`exception périmée, à retirer de EXCEPTIONS : ${key}`);
  assert.deepEqual(failures, [], `Accessibilité de base :\n  ${failures.join('\n  ')}`);
  console.log(`accessibilite-browser : débordement, noms accessibles et focus des fenêtres sur Préparer, Jouer, Campagne, Bibliothèque (390 px et bureau), ${checkedControls} contrôles nommés, ${checkedDialogs} ouvertures de fenêtre : OK en ${Math.round((Date.now() - started) / 1000)} s.`);
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
