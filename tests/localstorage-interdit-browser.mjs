import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';

// BOOT-05 : un localStorage interdit (SecurityError) ne fait plus échouer le démarrage ; l’outil démarre en mode dégradé.
const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    const file = resolve(root, '.' + decodeURIComponent(path === '/' ? '/index.html' : path));
    if (!file.startsWith(resolve(root) + sep) || !statSync(file).isFile()) throw new Error('missing');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Accès refusé', 'SecurityError'); } });
  });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.locator('#app-content').waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#tab-prepare').isVisible(), true, 'la barre des onglets est affichée');
  // Le thème reste réglable, sans mémorisation.
  await page.locator('#btn-menu').click();
  const theme = page.locator('#btn-theme-toggle');
  const before = await theme.textContent();
  await theme.click();
  assert.notEqual(await theme.textContent(), before, 'le bouton de thème change d’état');
  await page.locator('#tab-campaign').click();
  assert.deepEqual(errors, []);
  console.log('localstorage-interdit: OK');
} finally { await browser.close(); server.close(); }
