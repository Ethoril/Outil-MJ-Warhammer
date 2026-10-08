/** Independent receipt: a blocked module must be visible and leave native IDB intact.
 * No OAuth login, private fiche access, or Firebase writes are performed.
 * Upgrade uses actual committed 3.12.0 files and real service workers.
 */
import assert from 'node:assert/strict';
import { APP_VERSION } from '../js/version.js';
const currentCache = `wfrp-cache-v${APP_VERSION}`;
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, mkdirSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'tmp/startup-receipt');
mkdirSync(output, { recursive: true });
const previousRevision = process.env.STARTUP_PREVIOUS_REVISION || '682d0af';
let servePrevious = false;
const previousAssets = new Map();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const basePath = '/Outil-MJ-Warhammer/';
const server = createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    assert.ok(pathname.startsWith(basePath));
    const relative = pathname.slice(basePath.length) || 'index.html';
    assert.ok(!relative.includes('..'));
    let content;
    if (servePrevious) {
      if (!previousAssets.has(relative)) previousAssets.set(relative, execFileSync('git', ['show', previousRevision + ':' + relative], { cwd: root, maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }));
      content = previousAssets.get(relative);
    } else {
      const path = resolve(root, relative);
      assert.ok(path.startsWith(resolve(root) + sep) && statSync(path).isFile());
      content = readFileSync(path);
    }
    res.writeHead(200, { 'Content-Type': types[extname(relative)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(content);
  } catch { res.writeHead(404); res.end('Resource unavailable'); }
});
const legacyFilter = ['*/js/ui/log-view.js'];
async function configureFilter(context, page, extra = []) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: [...legacyFilter, ...extra] });
  return cdp;
}
async function ready(page) {
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
  await page.waitForFunction(() => document.querySelector('#btn-google-login')?.dataset.firebaseBound === 'true', { timeout: 15000 });
}
async function readDurable(page) {
  return page.evaluate(async () => {
    const { createPersistence } = await import('./js/core/persistence.js');
    const persistence = createPersistence({ contextId: 'guest' });
    const state = await persistence.load(); persistence.close(); return state;
  });
}
async function seed(page, id) {
  return page.evaluate(async id => {
    const { Store } = await import('./js/main.js'); await Store.ready;
    await Store.addProfile({ id, name: 'Recette démarrage', kind: 'PJ', hp: 14, maxHp: 14, notes: 'Notes locales à conserver', diceLines: [{ id: id + '-local', note: 'Action locale', type: 'skill', base: 32, mod: -10 }], extensions: { futureLocal: { retained: true } } });
    await Store.whenIdle(); return Store.getProfile(id);
  }, id);
}
async function profile(page, id) {
  return page.evaluate(async id => { const { Store } = await import('./js/main.js'); await Store.ready; return Store.getProfile(id); }, id);
}
let browser;
try {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const url = 'http://127.0.0.1:' + server.address().port + basePath;
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined) });

  const fresh = await browser.newContext({ serviceWorkers: 'block' });
  const page = await fresh.newPage(), errors = [], failed = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failed.push({ url: request.url(), reason: request.failure()?.errorText }));
  const cdp = await configureFilter(fresh, page);
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await ready(page);
  assert.deepEqual(errors, []);
  assert.equal(failed.some(item => new URL(item.url).pathname.endsWith('/log-view.js')), false, 'renamed entry no longer requests the blocked filename');
  const seeded = await seed(page, 'startup-preserved');
  const before = await readDurable(page);
  await cdp.send('Network.setBlockedURLs', { urls: [...legacyFilter, '*/js/core/dice.js'] });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#startup-status[role=alert]').waitFor({ state: 'visible', timeout: 15000 });
  assert.match(await page.locator('#startup-status').innerText(), /n’a pas pu démarrer/);
  assert.equal(await page.locator('#btn-startup-retry').isVisible(), true);
  assert.ok(failed.some(item => item.url.endsWith('/js/core/dice.js') && /BLOCKED_BY_CLIENT|inspector/.test(item.reason)), JSON.stringify(failed));
  assert.deepEqual(await readDurable(page), before, 'interrupted import does not rewrite state, session, notes, or local actions');
  await page.screenshot({ path: resolve(output, 'blocked-module-message.png'), fullPage: true });
  await cdp.send('Network.setBlockedURLs', { urls: legacyFilter });
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.locator('#btn-startup-retry').click()]);
  await ready(page);
  assert.deepEqual(await profile(page, 'startup-preserved'), seeded);
  assert.deepEqual(await readDurable(page), before, 'retry restores the identical durable state');
  await page.screenshot({ path: resolve(output, 'recovered-filter-active.png'), fullPage: true });
  await fresh.close();
  console.log('Démarrage : ancien nom bloqué sans effet, autre import bloqué avec alerte, réessai fonctionnel, IndexedDB inchangée.');

  servePrevious = true;
  const upgrade = await browser.newContext({ serviceWorkers: 'allow' });
  const oldPage = await upgrade.newPage();
  await oldPage.goto(url, { waitUntil: 'domcontentloaded' }); await ready(oldPage);
  await oldPage.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 20000 });
  const oldProfile = await seed(oldPage, 'upgrade-preserved');
  const oldState = await readDurable(oldPage);
  await configureFilter(upgrade, oldPage);
  await oldPage.reload({ waitUntil: 'domcontentloaded' });
  await oldPage.waitForTimeout(500);
  assert.equal(await oldPage.locator('#login-screen').evaluate(node => node.style.display), 'flex', 'confirmed 3.12.0 symptom with real cached SW');
  assert.equal(await oldPage.locator('#btn-google-login-screen').getAttribute('data-firebase-bound'), null);
  assert.deepEqual(await readDurable(oldPage), oldState);
  servePrevious = false;
  await oldPage.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await oldPage.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting, { timeout: 30000 });
  await oldPage.close(); // Replacement activation after the last old controlled page closes.
  let activated = false;
  for (let attempt = 0; attempt < 200 && !activated; attempt += 1) {
    for (const worker of upgrade.serviceWorkers()) {
      try { const names = await worker.evaluate(() => caches.keys()); activated = names.includes(currentCache) && !names.includes('wfrp-cache-v3.12.0'); } catch { /* old worker can terminate during activation */ }
      if (activated) break;
    }
    if (!activated) await new Promise(done => setTimeout(done, 50));
  }
  assert.ok(activated, 'replacement activates after last old controlled page closes');
  const newPage = await upgrade.newPage(); await configureFilter(upgrade, newPage);
  await newPage.goto(url, { waitUntil: 'domcontentloaded' }); await ready(newPage);
  await newPage.waitForFunction(async current => {
    const names = await caches.keys();
    return names.includes(current) && !names.includes('wfrp-cache-v3.12.0');
  }, currentCache, { timeout: 20000 });
  assert.deepEqual(await profile(newPage, 'upgrade-preserved'), oldProfile);
  assert.deepEqual(await readDurable(newPage), oldState, 'worker upgrade preserves the native IDB envelope');
  await newPage.screenshot({ path: resolve(output, `upgrade312-to${APP_VERSION}.png`), fullPage: true });
  await upgrade.close();
  console.log(`Upgrade réel 3.12.0 → ${APP_VERSION} : symptôme ancien reproduit, filtre maintenu, fermeture du dernier onglet, nouveau cache actif, profil et état local identiques.`);
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}





