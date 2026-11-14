import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { startStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';

// Q39 : depuis l'application réelle (index.html), l'onglet « Bibliothèque » mène à la bibliothèque de bestiaire :
// recherche « Stegadon », fiche, « Ajouter au combat », le profil apparaît au banc de « Jouer ».
// Les autres onglets ne la montrent pas.
const root = fileURLToPath(new URL('..', import.meta.url));

const failures = [];
const pageErrors = [];
const check = (ok, description) => { if (ok) console.log('PASS — ' + description); else { failures.push(description); console.log('FAIL — ' + description); } };

const { server, port } = await startStaticServer({ root });
const browser = await launchBrowser();
try {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  await blockExternalNetwork(page, port);
  await page.route('**/js/core/sync.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: `export function initFirebaseSync(onConnected) {
      document.querySelector('#login-screen')?.style.setProperty('display', 'none');
      document.querySelector('#app-content')?.style.setProperty('display', 'block');
      onConnected({ dbRef: 'isolated-test', onValue() {}, update() { return Promise.resolve(); } });
    }`
  }));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.locator('#app-content').waitFor({ state: 'visible' });

  const library = page.locator('#bestiary-library');
  for (const tab of ['tab-prepare', 'tab-combat']) {
    await page.locator('#' + tab).click();
    check(!(await library.isVisible()), `la bibliothèque de bestiaire est cachée dans l’onglet ${tab}`);
  }
  await page.locator('#tab-library').click();
  check(await library.isVisible(), 'l’onglet Bibliothèque montre la bibliothèque de bestiaire');
  await library.locator('summary').click();
  await page.locator('#bestiary-library-body .bestiary-folder').first().waitFor({ state: 'visible' }); // racine : les dossiers (images des pions, T14)
  await page.getByLabel('Nom du profil').fill('Stegadon');
  // Nom français d'abord (images des pions, S13, CA39) : le Stégadon de L07 s'affiche « Stégadon » seul (même nom aux accents près).
  const row = page.locator('#bestiary-library-body .item').filter({ has: page.locator('strong', { hasText: /^Stégadon$/ }) }).filter({ hasText: 'L07' }).first();
  await row.waitFor({ state: 'visible' });
  await row.getByRole('button', { name: /Fiche de Stégadon/ }).click();
  check(/Blessures/.test(await row.locator('.bestiary-sheet').innerText()), 'la fiche du Stégadon s’ouvre');
  check(/^Stégadon · L07/.test(await row.locator('.bestiary-sheet p').first().innerText()), 'la fiche donne le nom français d’abord');
  await row.getByRole('button', { name: 'Ajouter au combat' }).click();
  await page.locator('#tab-combat').click();
  await page.locator('.workspace-bench').waitFor({ state: 'visible', timeout: 5000 });
  check(/Stégadon/.test(await page.locator('.workspace-bench').innerText()), 'le Stégadon est au banc de Jouer, sous son nom français');
  await page.locator('#tab-library').click();
  check(await library.isVisible(), 'la bibliothèque reste atteignable après un retour sur Jouer');
  check(pageErrors.length === 0, 'aucune exception de page : ' + pageErrors.join(' | '));
} finally {
  await browser.close();
  server.close();
}
if (failures.length) { console.error(`${failures.length} contrôle(s) en échec`); process.exit(1); }
console.log('Q39 : parcours navigateur OK');
