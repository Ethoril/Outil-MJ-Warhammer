/** Verify the exported application, including a real SW/offline/native IDB reload.
 * Le parcours construit lui-même son export (tools/build-lot2-local-release.mjs) : il ne dépend plus d'un artefact local resté d'une version antérieure. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION } from '../js/version.js';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
execFileSync(process.execPath, [resolve(root, 'tools/build-lot2-local-release.mjs')], { cwd: root, stdio: 'inherit' });
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
const server = createStaticServer({ root: site, base, headers: { 'Cache-Control': 'no-cache' } });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const checks = [];
try {
  browser = await launchBrowser();
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'allow' });
    await context.addInitScript(()=>{ if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{})); }); // index.html n'enregistre plus le service worker sur localhost/127.0.0.1 (d17639e) : le test le fait à sa place
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await blockExternalNetwork(page, origin);
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
