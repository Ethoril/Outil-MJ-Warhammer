/** Verify the exported application, including a real SW/offline/native IDB reload. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, realpathSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { APP_VERSION } from '../js/version.js';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const pointer = JSON.parse(readFileSync(resolve(root, 'tmp/lot2-25/release-path.json')));
const site = realpathSync(pointer.directory);
assert.ok(site.startsWith(resolve(root, 'tmp/lot2-25/release') + sep));
const manifest = JSON.parse(readFileSync(resolve(site, 'release-manifest.json')));
assert.equal(manifest.appVersion, APP_VERSION);
for (const asset of manifest.files) {
  const file = realpathSync(resolve(site, asset.file));
  assert.ok(file.startsWith(site + sep));
  assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), asset.sha256, asset.file);
}
const base = '/Outil-MJ-Warhammer/';
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    assert.ok(path.startsWith(base));
    const file = realpathSync(resolve(site, path.slice(base.length) || 'index.html'));
    assert.ok(file.startsWith(site + sep) && statSync(file).isFile());
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' }); res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end('Unavailable'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const checks = [];
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined) });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'allow' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.goto(origin + base);
    await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.evaluate(async () => {
      const { Store } = await import('./js/main.js'); await Store.ready;
      await Store.addProfile({ id: 'release-qa', name: 'Paquet local', kind: 'PJ', hp: 14, maxHp: 14 }); await Store.whenIdle();
    });
    await context.setOffline(true); await page.reload();
    await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
    const proof = await page.evaluate(async () => {
      const [{ Store }, { APP_VERSION }] = await Promise.all([import('./js/main.js'), import('./js/version.js')]); await Store.ready;
      return { version: APP_VERSION, hp: Store.getProfile('release-qa')?.hp, caches: await caches.keys(), overflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    assert.equal(proof.version, APP_VERSION); assert.equal(proof.hp, 14);
    assert.ok(proof.caches.includes(`wfrp-cache-v${APP_VERSION}`)); assert.equal(proof.overflow, false); assert.deepEqual(errors, []);
    checks.push({ width, version: proof.version, offline: true, profilePreserved: true, overflow: false });
    await context.close();
  }
  writeFileSync(resolve(root, 'tmp/lot2-25/release-browser-receipt.json'), JSON.stringify({ appVersion: APP_VERSION, assets: manifest.files.length, checks }, null, 2));
  console.log(`PASS — exported ${APP_VERSION}, ${manifest.files.length} hashes, desktop/mobile startup, real offline PWA and native IDB`);
} finally { await browser?.close(); await new Promise(done => server.close(done)); }
