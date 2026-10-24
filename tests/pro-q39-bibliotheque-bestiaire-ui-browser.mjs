import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Q39 : depuis l'application réelle (index.html), l'onglet « Bibliothèque » mène à la bibliothèque de bestiaire :
// recherche « Stegadon », fiche, « Ajouter au combat », le profil apparaît au banc de « Jouer ».
// Les autres onglets ne la montrent pas.
const root = fileURLToPath(new URL('..', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

function startServer() {
  const server = createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    try {
      const file = join(root, normalize(requestPath === '/' ? '/index.html' : requestPath));
      if (!file.startsWith(root) || !statSync(file).isFile()) throw new Error('not found');
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })); });
}
function findExecutable() {
  return [process.env.PLAYWRIGHT_EXECUTABLE_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    .filter(Boolean).find(candidate => { try { return statSync(candidate).isFile(); } catch { return false; } });
}

const failures = [];
const pageErrors = [];
const check = (ok, description) => { if (ok) console.log('PASS — ' + description); else { failures.push(description); console.log('FAIL — ' + description); } };

const { server, port } = await startServer();
const browser = await chromium.launch({ headless: true, executablePath: findExecutable() });
try {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/*', route => (route.request().url().startsWith(`http://127.0.0.1:${port}/`) ? route.continue() : route.abort()));
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
  await page.locator('#bestiary-library-body .item').first().waitFor({ state: 'visible' });
  await page.getByLabel('Nom du profil').fill('Stegadon');
  const row = page.locator('#bestiary-library-body .item').filter({ has: page.locator('strong', { hasText: /^Stegadon\b/ }) }).first();
  await row.waitFor({ state: 'visible' });
  await row.getByRole('button', { name: /Fiche de Stegadon/ }).click();
  check(/Blessures/.test(await row.locator('.bestiary-sheet').innerText()), 'la fiche du Stegadon s’ouvre');
  await row.getByRole('button', { name: 'Ajouter au combat' }).click();
  await page.locator('#tab-combat').click();
  await page.locator('.workspace-bench').waitFor({ state: 'visible', timeout: 5000 });
  check(/Stegadon/.test(await page.locator('.workspace-bench').innerText()), 'le Stegadon est au banc de Jouer');
  await page.locator('#tab-library').click();
  check(await library.isVisible(), 'la bibliothèque reste atteignable après un retour sur Jouer');
  check(pageErrors.length === 0, 'aucune exception de page : ' + pageErrors.join(' | '));
} finally {
  await browser.close();
  server.close();
}
if (failures.length) { console.error(`${failures.length} contrôle(s) en échec`); process.exit(1); }
console.log('Q39 : parcours navigateur OK');
