/** Real service-worker/native IDB receipt; remote hub simulates protocol CAS, never Firebase. */
import assert from 'node:assert/strict';
import { APP_VERSION } from '../js/version.js';
import { createServer } from 'node:http';
import { readFileSync, statSync, mkdirSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { applyOperation } from '../js/core/sync-protocol.js';
const cacheName = `wfrp-cache-v${APP_VERSION}`, updatedCacheName = `${cacheName}-qa-update`;
const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/fiche-caelel.json', import.meta.url)));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
let hub = null, updateWorker = false, cachedIdentityFixture = false;
const server = createServer(async (req, res) => {
  try {
    const route = new URL(req.url, 'http://localhost').pathname;
    if (cachedIdentityFixture && route === '/vendor/firebase/firebase-auth.js') {
      res.writeHead(200, { 'Content-Type': types['.js'] });
      res.end(`export class GoogleAuthProvider {};
        export const getAuth = () => ({currentUser:JSON.parse(localStorage.getItem('qa-persisted-auth')||'null')});
        export const onAuthStateChanged = (auth,callback) => {localStorage.setItem('qa-auth-restores',String(Number(localStorage.getItem('qa-auth-restores')||0)+1));queueMicrotask(()=>callback(auth.currentUser));return ()=>{};};
        export const signInWithPopup = async()=>{throw new Error('Not a login test');};
        export const signOut = async()=>{};`); return;
    }
    if (cachedIdentityFixture && route === '/vendor/firebase/firebase-database.js') {
      res.writeHead(200, { 'Content-Type': types['.js'] });
      res.end(`export const getDatabase=()=>({});export const ref=(db,path)=>({path});
        export const get=async()=>{throw new Error('Fixture remote unavailable');};
        export const onValue=()=>()=>{};export const runTransaction=async()=>{throw new Error('Fixture remote unavailable');};
        export const set=async()=>{};export const update=async()=>{};`); return;
    }
    if (route === '/qa-hub' && req.method === 'POST') {
      let body = ''; for await (const part of req) body += part;
      const input = JSON.parse(body);
      let result = hub;
      if (input.operation) { const applied = applyOperation(hub, input.operation); hub = applied.document; result = { status: applied.applied ? 'committed' : 'aborted', root: hub }; }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(result)); return;
    }
    if (route === '/qa-session.html') { res.writeHead(200, { 'Content-Type': types['.html'] }); res.end('<!doctype html><meta charset="utf-8"><title>Deux sessions de recette</title>'); return; }
    const path = resolve(root, '.' + decodeURIComponent(route === '/' ? '/index.html' : route));
    assert.ok(path.startsWith(resolve(root) + sep) && statSync(path).isFile());
    let content = readFileSync(path);
    if (route === '/sw.js' && updateWorker) content = Buffer.from(content.toString().replace(cacheName, updatedCacheName));
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(content);
  } catch (error) { res.writeHead(404); res.end(String(error.message)); }
});
let browser;
async function boot(page, deviceId) {
  return page.evaluate(async deviceId => {
    const { createPersistence } = await import('/js/core/persistence.js');
    const { createSyncSession } = await import('/js/core/sync-session.js');
    const persistence = createPersistence({ indexedDB, dbName: 'qa-two-devices', contextId: 'account:qa' });
    const transport = {
      async read() { const response = await fetch('/qa-hub', { method: 'POST', body: '{}' }); if (!response.ok) throw new Error('hub read'); return response.json(); },
      async transaction(operation) { const response = await fetch('/qa-hub', { method: 'POST', body: JSON.stringify({ operation }) }); if (!response.ok) throw new Error('hub transaction'); return response.json(); }
    };
    const session = createSyncSession({ persistence, transport, deviceId, contextId: 'account:qa' });
    window.qa = { session, persistence };
    return session.open({ initialState: await persistence.load() ?? { schemaVersion: 3, reserve: [], combat: { round: 0, order: [], participants: [] }, log: [], diceLines: [] } });
  }, deviceId);
}
try {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined) });
  const pwaContext = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await pwaContext.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 30000 });
  const seeded = await page.evaluate(async fixture => {
    const { Store } = await import('/js/main.js'); await Store.ready;
    const { ficheSnapshot } = await import('/js/core/fiche-sync.js');
    await Store.addProfile({ id: 'pwa-pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, notes: 'Note locale de séance', diceLines: [{ id: 'local', note: 'Action locale', type: 'skill', base: 31, mod: -10 }], extensions: { futureLocal: { retained: true } } });
    await Store.applyFicheSync([{ profileId: 'pwa-pj', charId: 'caelel', snapshot: ficheSnapshot('caelel', fixture) }]);
    const { createPersistence } = await import('/js/core/persistence.js');
    const persistence = createPersistence({ indexedDB, contextId: 'guest' }); const state = await persistence.load(); persistence.close();
    const { getReferenceCatalogue } = await import('/js/core/reference-catalog.js');
    return { state, profile: Store.getProfile('pwa-pj'), keywords: getReferenceCatalogue().keywords.length, caches: await caches.keys() };
  }, fixture);
  await page.evaluate(async () => {
    const { renderLog } = await import('/js/ui/journal-view.js');
    const mount = document.createElement('div'); mount.id = 'qa-journal'; document.body.appendChild(mount);
    const log = [{ kind: 'resolution', text: 'Jet historique', detail: { referenceVersion: 'references:version-historique', action: { note: '<img src=x onerror=alert(1)>', extensions: { fiche: { equipmentId: 'arc-1' } } }, ammunitionId: 'fleche-1', protection: { ap: 2, counted: [{ name: 'Maille historique' }] }, mechanics: [{ id: 'precise', name: 'Précise historique', status: 'covered', edition: 'Édition historique', effect: 'Effet conservé' }] } }];
    renderLog({ getLog: () => log, listParticipants: () => [], listProfiles: () => [] }, mount, { contextual: true });
  });
  await page.locator('#qa-journal summary').click();
  const journal = await page.locator('#qa-journal').innerText();
  for (const value of ['version-historique', 'fleche-1', '2 PA', 'Maille historique', 'Précise historique', 'Édition historique', 'Effet conservé']) assert.ok(journal.includes(value), value);
  assert.equal(await page.locator('#qa-journal img').count(), 0, 'historical source strings remain escaped');
  await page.locator('#qa-journal').evaluate(node => node.remove());
  assert.equal(seeded.profile.maxHp, 18); assert.equal(seeded.profile.hp, 18, 'reserve is a full-health template'); assert.equal(seeded.keywords, 55);
  assert.ok(seeded.caches.includes(cacheName));
  assert.equal(await page.getByRole('button', { name: 'Actualiser', exact: true }).count(), 0, 'first installation offers no inactive update button');
  await pwaContext.setOffline(true); await page.reload();
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
  const offline = await page.evaluate(async fixture => {
    const { Store } = await import('/js/main.js'); await Store.ready;
    const { getReferenceCatalogue } = await import('/js/core/reference-catalog.js');
    const before = Store.getLocalRevision();
    const { ficheSnapshot } = await import('/js/core/fiche-sync.js');
    const result = await Store.applyFicheSync([{ profileId: 'pwa-pj', charId: 'caelel', snapshot: ficheSnapshot('caelel', fixture) }]);
    return { profile: Store.getProfile('pwa-pj'), keywords: getReferenceCatalogue().keywords.length, before, after: Store.getLocalRevision(), changed: result.changed, controlled: !!navigator.serviceWorker.controller };
  }, fixture);
  assert.deepEqual(offline.profile, seeded.profile); assert.equal(offline.keywords, 55); assert.equal(offline.changed, false); assert.equal(offline.before, offline.after); assert.ok(offline.controlled);
  await pwaContext.setOffline(false); updateWorker = true;
  await page.evaluate(async () => { await caches.open('qa-obsolete-cache'); const registration = await navigator.serviceWorker.getRegistration(); await registration.update(); });
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting);
  const revision = offline.after;
  await page.waitForFunction(() => document.querySelector('#local-status')?.dataset.status === 'saved');
  await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await page.waitForFunction(async ({ current, next }) => (await caches.keys()).includes(next) && !(await caches.keys()).includes(current), { current: cacheName, next: updatedCacheName });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
  const updated = await page.evaluate(async () => { const { Store } = await import('/js/main.js'); await Store.ready; return { profile: Store.getProfile('pwa-pj'), revision: Store.getLocalRevision(), caches: await caches.keys() }; });
  assert.deepEqual(updated.profile, seeded.profile); assert.equal(updated.revision, revision); assert.equal(updated.caches.includes('qa-obsolete-cache'), false); assert.deepEqual(errors, []);
  console.log('PWA réelle : installation, contrôle, rechargement hors ligne, consultation, sync idempotente, mise à jour explicite et nettoyage caches OK');
  await pwaContext.close();
  const contextA = await browser.newContext({ serviceWorkers: 'block' }), contextB = await browser.newContext({ serviceWorkers: 'block' });
  const a = await contextA.newPage(), b = await contextB.newPage();
  await a.goto(origin + '/qa-session.html'); await b.goto(origin + '/qa-session.html');
  await boot(a, 'qa-device-a'); await boot(b, 'qa-device-b');
  await contextA.setOffline(true);
  await a.evaluate(async state => { await window.qa.session.enqueue({ state, localState: state }); }, seeded.state);
  assert.equal(await a.evaluate(async () => (await window.qa.persistence.listOutbox()).length), 1);
  await contextA.setOffline(false); await a.reload(); await boot(a, 'new-process-a');
  assert.equal(await a.evaluate(async () => (await window.qa.persistence.readSession()).deviceId), 'qa-device-a');
  assert.equal((await a.evaluate(() => window.qa.session.flush())).status, 'synced');
  assert.equal(hub.revision, 1);
  await b.evaluate(() => window.qa.session.reconcile());
  let copied = await b.evaluate(() => window.qa.persistence.load());
  assert.deepEqual(copied.reserve[0], seeded.profile, 'second native IDB preserves fiche, equipment, talents, notes and local actions');
  await contextB.setOffline(true);
  await b.evaluate(async () => { const state = await window.qa.persistence.load(); state.reserve[0].notes = 'Modification concurrente B'; await window.qa.session.enqueue({ state, localState: state }); });
  await a.evaluate(async () => { const state = await window.qa.persistence.load(); state.reserve[0].notes = 'Séance conservée A'; await window.qa.session.enqueue({ state, localState: state }); await window.qa.session.flush(); });
  await contextB.setOffline(false); await b.reload(); await boot(b, 'new-process-b');
  assert.equal((await b.evaluate(() => window.qa.session.reconcile())).status, 'conflict');
  assert.equal((await b.evaluate(() => window.qa.persistence.load())).reserve[0].notes, 'Modification concurrente B');
  const backup = await b.evaluate(() => JSON.parse(window.qa.session.exportConflict()));
  assert.equal(backup.local.state.reserve[0].notes, 'Modification concurrente B'); assert.equal(backup.remote.state.reserve[0].notes, 'Séance conservée A');
  await b.evaluate(() => window.qa.session.resolveRemote());
  copied = await b.evaluate(() => window.qa.persistence.load());
  assert.equal(copied.reserve[0].notes, 'Séance conservée A'); assert.equal(copied.reserve[0].maxHp, 18);
  assert.equal(await b.evaluate(async () => (await window.qa.persistence.listOutbox()).length), 0);
  assert.ok((await b.evaluate(() => window.qa.persistence.listRestorePoints())).some(point => point.reason === 'conflict-remote'));
  await contextA.close(); await contextB.close();
  // Cold offline startup with a persisted identity: application, service worker and IDB
  // are real; Auth's cached identity and the unavailable remote SDK are explicit fixtures.
  cachedIdentityFixture = true;
  const accountContext = await browser.newContext({ serviceWorkers: 'allow' });
  const accountPage = await accountContext.newPage();
  await accountPage.goto(origin + '/qa-session.html');
  await accountPage.evaluate(async state => {
    localStorage.setItem('qa-persisted-auth', JSON.stringify({ uid: 'qa-mj', displayName: 'MJ de recette simulé' }));
    const { createPersistence } = await import('/js/core/persistence.js');
    const persistence = createPersistence({ indexedDB, contextId: 'account:qa-mj' });
    await persistence.saveAtomic({ state }); persistence.close();
  }, seeded.state);
  await accountPage.goto(origin);
  await accountPage.waitForFunction(() => !!navigator.serviceWorker.controller);
  await accountPage.waitForFunction(async () => (await import('/js/main.js')).Store.getProfile('pwa-pj')?.extensions?.ficheId === 'caelel');
  await accountContext.setOffline(true); await accountPage.reload();
  await accountPage.waitForFunction(async () => (await import('/js/main.js')).Store.getProfile('pwa-pj')?.extensions?.ficheId === 'caelel');
  // The remembered local context can hydrate before the deferred Auth adapter.
  // Wait for Auth itself, rather than treating the presence of a profile as its completion.
  await accountPage.waitForFunction(() => Number(localStorage.getItem('qa-auth-restores')) >= 2);
  assert.ok(await accountPage.evaluate(() => Number(localStorage.getItem('qa-auth-restores')) >= 2), 'Auth observer runs at cold offline startup');
  const offlineAccount = await accountPage.evaluate(async () => (await import('/js/main.js')).Store.getProfile('pwa-pj'));
  assert.deepEqual(offlineAccount, seeded.profile, 'only the persisted authenticated context is restored, without copying it into guest');
  await accountContext.close(); cachedIdentityFixture = false;
  console.log('Démarrage à froid hors ligne : contexte MJ restauré depuis identité persistée (Auth et distant simulés), IDB et service worker réels OK');
  console.log('Deux contextes navigateur / IndexedDB natif : file hors ligne durable, reprise, transfert v3, conflit explicite, export et restauration OK (transport HTTP CAS simulé)');
  mkdirSync(resolve(root, 'tmp/fiches-pj-receipt'), { recursive: true });
} finally { await browser?.close(); await new Promise(done => server.close(done)); }
