import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';

// 3.33.0 (MJ, 01/11) : derrière `python -m http.server`, sans Cache-Control, le navigateur juge frais
// un module ancien ; la mise à jour du service worker le recopiait dans le nouveau cache à côté de
// modules récents, et l'outil ne démarrait plus. L'installation doit relire le réseau.
const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const oldDate = new Date(Date.now() - 60 * 24 * 3600 * 1000).toUTCString();
let release = 1;
const server = createServer((req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/swtest') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><title>sw</title><p>sw</p>');
      return;
    }
    const file = resolve(root, '.' + decodeURIComponent(path === '/' ? '/index.html' : path));
    if (!file.startsWith(resolve(root) + sep) || !statSync(file).isFile()) throw new Error('missing');
    let body = readFileSync(file);
    if (release === 2 && path === '/sw.js') body = Buffer.from(body.toString('utf8').replace(/const CACHE_NAME = '[^']+'/, "const CACHE_NAME = 'wfrp-cache-test-v2'"));
    if (release === 2 && path === '/js/core/scene-events.js') body = Buffer.concat([body, Buffer.from('\n// marqueur-version-2\n')]);
    // Comme python -m http.server : date de modification ancienne, aucune directive de cache.
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Last-Modified': oldDate });
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolveServer => server.listen(0, '127.0.0.1', resolveServer));
const browser = await launchBrowser();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/swtest`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
  });
  release = 2;
  const cached = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.update();
    const worker = registration.installing || registration.waiting;
    if (worker && worker.state !== 'installed') {
      await new Promise((done, fail) => worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' || worker.state === 'activated') done();
        if (worker.state === 'redundant') fail(new Error('installation échouée'));
      }));
    }
    const cache = await caches.open('wfrp-cache-test-v2');
    const response = await cache.match('./js/core/scene-events.js');
    return response ? response.text() : '';
  });
  assert.match(cached, /marqueur-version-2/, 'le nouveau cache contient la version du serveur, pas la copie du cache HTTP');
  console.log('sw-update-fresh-cache-browser: OK');
} finally {
  await browser.close();
  server.close();
}
