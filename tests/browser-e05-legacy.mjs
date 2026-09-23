import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const mime = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function startServer() {
  const server = createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = join(root, normalize(requestPath === '/' ? '/index.html' : requestPath));
    try {
      if (!file.startsWith(root) || !statSync(file).isFile()) throw new Error('not found');
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const fixture = `
  import { applyOperation } from '/js/core/sync-protocol.js';
  import { createSyncSession } from '/js/core/sync-session.js';

  const legacy = {
    reserve: [{ id: 'legacy-remote', name: 'Profil distant v1', hp: 18, maxHp: 20, initiative: 33 }],
    combat: { round: 2, order: ['legacy-participant'], currentActorId: 'legacy-participant', participants: [{
      id: 'legacy-participant', profileId: 'legacy-remote', name: 'Profil distant v1', hp: 15, maxHp: 20, states: ['Sonné|2']
    }] },
    log: [{ id: 'legacy-log', text: 'Entrée distante v1', kind: 'management' }],
    diceLines: []
  };
  const roots = new Map(JSON.parse(sessionStorage.getItem('__e05-legacy-roots') || '[]'));
  let activeContext = 'account:legacy';
  let legacyReads = Number(sessionStorage.getItem('__e05-legacy-reads') || 0);
  let v2Writes = Number(sessionStorage.getItem('__e05-legacy-v2-writes') || 0);
  const listeners = new Map();
  const persist = () => sessionStorage.setItem('__e05-legacy-roots', JSON.stringify([...roots]));
  const transportFor = contextId => ({
    async read() { return roots.get(contextId) || null; },
    async readLegacy() {
      legacyReads += 1;
      sessionStorage.setItem('__e05-legacy-reads', String(legacyReads));
      return legacy;
    },
    async transaction(operation) {
      v2Writes += 1;
      sessionStorage.setItem('__e05-legacy-v2-writes', String(v2Writes));
      const current = roots.get(contextId) || null;
      const result = applyOperation(current, operation);
      if (!result.applied) return { status: 'aborted', root: result.document };
      roots.set(contextId, result.document);
      persist();
      listeners.get(contextId)?.forEach(fn => fn(result.document));
      return { status: 'committed', root: result.document };
    },
    subscribe(fn) {
      const set = listeners.get(contextId) || new Set();
      set.add(fn); listeners.set(contextId, set);
      return () => set.delete(fn);
    }
  });
  const makeHandle = contextId => ({
    dbRef: 'fixture-v2-' + contextId,
    legacyDbRef: 'fixture-v1-' + contextId,
    contextId,
    legacyMigration: () => transportFor(contextId).readLegacy(),
    createSession: options => createSyncSession({
      ...options,
      contextId,
      transport: transportFor(contextId),
      deviceId: 'browser-legacy'
    })
  });
  window.__e05Legacy = {
    get v1Snapshot() { return legacy; },
    get v2Root() { return roots.get(activeContext) || null; },
    get legacyReads() { return legacyReads; },
    get v1Writes() { return 0; },
    get v2Writes() { return v2Writes; }
  };
  export function initFirebaseSync(onConnected, onStatus) {
    onConnected(makeHandle(activeContext));
    onStatus('connected');
  }
`;

async function main() {
  const { server, port } = await startServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const errors = [];
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.route('**/*', route => {
      if (route.request().url().startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
      return route.abort();
    });
    await context.route('**/js/core/sync.js*', route => route.fulfill({
      contentType: 'text/javascript',
      body: fixture
    }));

    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.stack || error.message));
    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await expect(page.locator('#app-content')).toBeVisible();
    await expect(page.locator('#sync-status')).toHaveText('Synchronisé', { timeout: 10000 });

    const toast = page.locator('#toast-container .toast').filter({ hasText: 'Ancienne sauvegarde distante' });
    await expect(toast).toBeVisible({ timeout: 10000 });
    await expect(toast).toContainText('non importée automatiquement');
    await expect(toast.getByRole('button', { name: 'Importer explicitement' })).toBeVisible();
    assert.equal(await page.evaluate(() => window.__e05Legacy.v2Root), null);
    assert.equal(await page.evaluate(() => window.__e05Legacy.v1Writes), 0);

    // Refusal is a real close gesture: it must leave both the read-only v1
    // source untouched and the v2 namespace empty.
    await toast.locator('span').last().click();
    await expect(toast).toBeHidden();
    assert.equal(await page.evaluate(() => window.__e05Legacy.v2Writes), 0);
    assert.equal(await page.evaluate(() => window.__e05Legacy.v1Writes), 0);

    // A reload reoffers the read-only candidate. Only the explicit import
    // action may create the first v2 transaction.
    await page.reload();
    await expect(page.locator('#sync-status')).toHaveText('Synchronisé', { timeout: 10000 });
    const secondToast = page.locator('#toast-container .toast').filter({ hasText: 'Ancienne sauvegarde distante' });
    await expect(secondToast).toBeVisible({ timeout: 10000 });
    const readsBefore = await page.evaluate(() => window.__e05Legacy.legacyReads);
    assert.ok(readsBefore >= 2, 'la candidate v1 doit être relue après rechargement');
    await secondToast.getByRole('button', { name: 'Importer explicitement' }).click();
    await expect(page.locator('#reserve-list')).toContainText('Profil distant v1', { timeout: 10000 });
    await expect.poll(() => page.evaluate(() => window.__e05Legacy.v2Root?.revision || 0)).toBeGreaterThanOrEqual(1);
    assert.equal(await page.evaluate(() => window.__e05Legacy.legacyReads), readsBefore);
    assert.equal(await page.evaluate(() => window.__e05Legacy.v1Writes), 0);
    assert.equal(await page.evaluate(() => window.__e05Legacy.v2Root?.state?.reserve?.[0]?.name), 'Profil distant v1');
    assert.deepEqual(errors, [], `exceptions navigateur: ${errors.join('\n')}`);
    await context.close();
    console.log('PASS — migration distante v1 en lecture seule, refus puis import explicite v2');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(`FAIL — browser-e05-legacy: ${error.stack || error.message}`);
  process.exitCode = 1;
});
