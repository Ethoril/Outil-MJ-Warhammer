/** Reproduce an extension blocking the former journal filename, then verify the renamed graph. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const revisionReference = process.env.STARTUP_PREVIOUS_REVISION || '682d0af';
try { execFileSync('git', ['cat-file', '-e', revisionReference + ':index.html'], { cwd: root, stdio: 'ignore' }); }
catch { throw new Error(`Révision de référence introuvable : « git show ${revisionReference}:index.html » échoue (clone superficiel, historique absent ou GIT_DIR erroné). Donnez une révision présente avec STARTUP_PREVIOUS_REVISION.`); }
const server = createStaticServer({ root });
let browser;
try {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await launchBrowser();
  async function isolatedContext() {
    // Real native IndexedDB; no authenticated account and no external requests.
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await blockExternalNetwork(context, origin);
    await context.route('**/js/ui/log-view.js', route => route.abort('blockedbyclient'));
    return context;
  }
  const legacy = await isolatedContext();
  // Preserve the published initial screen; the independent bootstrap fix changes its button state.
  await legacy.route(origin + '/', route => route.fulfill({ contentType: 'text/html', body: execFileSync('git', ['show', revisionReference + ':index.html'], { cwd: root, encoding: 'utf8' }) }));
  await legacy.route('**/js/main.js', route => route.fulfill({ contentType: 'text/javascript', body: readFileSync(new URL('../js/main.js', import.meta.url), 'utf8').replace("from './ui/journal-view.js'", "from './ui/log-view.js'") }));
  const before = await legacy.newPage(), legacyFailures = [];
  before.on('requestfailed', request => legacyFailures.push({ url: request.url(), error: request.failure()?.errorText }));
  const blockedRequest = before.waitForEvent('requestfailed', { predicate: request => request.url().endsWith('/js/ui/log-view.js') });
  await before.goto(origin);
  await blockedRequest;
  await before.waitForFunction(() => document.querySelector('#login-screen')?.style.display === 'flex');
  assert.ok(legacyFailures.some(item => item.url.endsWith('/js/ui/log-view.js') && item.error?.startsWith('net::ERR_BLOCKED_BY_CLIENT')), JSON.stringify(legacyFailures));
  assert.equal(await before.locator('#btn-google-login-screen').getAttribute('data-firebase-bound'), null);
  await before.locator('#btn-google-login-screen').click();
  assert.equal(await before.locator('#login-screen').evaluate(node => node.style.display), 'flex');
  assert.equal(await before.locator('#app-content').evaluate(node => node.style.display), 'none');
  await legacy.close();
  console.log('Reproduction : ancien module ERR_BLOCKED_BY_CLIENT, écran de connexion bloqué et bouton sans gestionnaire.');

  const fixed = await isolatedContext(), page = await fixed.newPage(), errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await page.goto(origin);
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
  assert.equal(await page.locator('#login-screen').evaluate(node => node.style.display), 'none');
  await page.waitForFunction(() => document.querySelector('[data-google-login]')?.dataset.firebaseBound === 'true');
  assert.ok(requests.some(url => url.endsWith('/js/ui/journal-view.js')));
  assert.ok(!requests.some(url => url.endsWith('/js/ui/log-view.js')));
  const seeded = await page.evaluate(async () => {
    const { Store } = await import('/js/main.js');
    await Store.ready;
    await Store.addProfile({ id: 'boot-retained', name: 'Profil conservé après correction', kind: 'PJ', hp: 14, maxHp: 14, notes: 'Donnée locale de recette' });
    return Store.getProfile('boot-retained');
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
  const retained = await page.evaluate(async () => { const { Store } = await import('/js/main.js'); await Store.ready; return Store.getProfile('boot-retained'); });
  assert.deepEqual(retained, seeded, 'Native IndexedDB profile survives reload with former path still blocked');
  assert.deepEqual(errors, []);
  const manifest = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(manifest.includes("'./js/ui/journal-view.js'"));
  assert.ok(!manifest.includes("'./js/ui/log-view.js'"));
  console.log('Correctif : workspace et gestionnaire Google démarrent, aucun ancien chemin demandé, profil IndexedDB conservé au rechargement, nouveau module précaché.');
  await fixed.close();
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}
