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

async function addProfile(page, name) {
  const form = page.locator('#form-add');
  if (!(await form.isVisible())) {
    await page.locator('#tab-prepare').click();
    await expect(page.locator('#workspace-prepare')).toBeVisible();
    await page.locator('#workspace-prepare').getByRole('button', { name: 'Nouveau profil' }).click();
  }
  await expect(form).toBeVisible();
  await form.locator('[name=name]').fill(name);
  await form.locator('[name=initiative]').fill('40');
  await form.locator('[name=hp]').fill('12');
  await form.locator('#btn-submit-form').click();
  await expect(page.locator('#reserve-list')).toContainText(name);
}

async function main() {
  const { server, port } = await startServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));

    await context.route('**/*', route => {
      if (route.request().url().startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
      return route.abort();
    });
    await context.route('**/js/core/sync.js*', route => route.fulfill({
      contentType: 'text/javascript',
      body: `
        import { applyOperation, createOperation } from '/js/core/sync-protocol.js';
        import { createSyncSession } from '/js/core/sync-session.js';
        const roots = new Map(JSON.parse(sessionStorage.getItem('__e05-roots') || '[]'));
        const persistRoots = () => sessionStorage.setItem('__e05-roots', JSON.stringify([...roots]));
        let activeContext = 'account:e05';
        let connect = null;
        let externalSequence = Number(sessionStorage.getItem('__e05-external-sequence') || 0);
        const liveListeners = new Map();
        const transportFor = contextId => ({
          async read() { return roots.get(contextId) || null; },
          async transaction(operation) {
            const current = roots.get(contextId) || null;
            const result = applyOperation(current, operation);
            if (!result.applied) return { status: 'aborted', root: result.document };
            roots.set(contextId, result.document);
            persistRoots();
            liveListeners.get(contextId)?.forEach(fn => fn(result.document));
            return { status: 'committed', root: result.document };
          },
          subscribe(fn) {
            if (!liveEnabled) return () => {};
            const listeners = liveListeners.get(contextId) || new Set();
            listeners.add(fn);
            liveListeners.set(contextId, listeners);
            return () => listeners.delete(fn);
          }
        });
        let liveEnabled = false;
        const makeHandle = contextId => ({
          dbRef: 'fixture-' + contextId, contextId,
          createSession: options => createSyncSession({ ...options, contextId, transport: transportFor(contextId), deviceId: 'browser-' + contextId })
        });
        window.__e05Remote = {
          get root() { return roots.get(activeContext) || null; },
          forceExternal() {
            const current = roots.get(activeContext) || null;
            const operation = createOperation({
              deviceId: 'other-device', sequence: ++externalSequence,
              baseRevision: current?.revision || 0,
              state: { ...(current?.state || {}), reserve: [...(current?.state?.reserve || []), { id: 'remote-only', name: 'Remote seulement' }] }
            });
            sessionStorage.setItem('__e05-external-sequence', String(externalSequence));
            roots.set(activeContext, applyOperation(current, operation).document);
            persistRoots();
            liveListeners.get(activeContext)?.forEach(fn => fn(roots.get(activeContext)));
          },
          enableLive() {
            liveEnabled = true;
          },
          pushLive() {
            const current = roots.get(activeContext) || null;
            const operation = createOperation({
              deviceId: 'live-device', sequence: 1,
              baseRevision: current?.revision || 0,
              state: { ...(current?.state || {}), reserve: [...(current?.state?.reserve || []), { id: 'live-only', name: 'Live seulement' }] }
            });
            roots.set(activeContext, applyOperation(current, operation).document);
            persistRoots();
            liveListeners.get(activeContext)?.forEach(fn => fn(roots.get(activeContext)));
          },
          switchContext(contextId) {
            activeContext = contextId;
            connect?.(makeHandle(contextId));
          }
        };
        export function initFirebaseSync(onConnected, onStatus) {
          connect = onConnected;
          onConnected(makeHandle('account:e05'));
          onStatus('connected');
        }
      `
    }));

    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await expect(page.locator('#app-content')).toBeVisible();
    await expect(page.locator('#sync-status')).toHaveText('Synchronisé', { timeout: 10000 });

    // The adapter announces an account context and Store must have switched
    // away from guest before the first user mutation is sent.
    await addProfile(page, 'Profil compte A');
    await expect.poll(() => page.evaluate(() => window.__e05Remote.root?.revision || 0)).toBe(1);

    // A second device advances the remote CAS revision. The next local write
    // must remain local and expose the conflict action to the user.
    await page.evaluate(() => window.__e05Remote.forceExternal());
    await expect.poll(() => page.evaluate(() => window.__e05Remote.root?.revision || 0)).toBe(2);
    await addProfile(page, 'Profil local en conflit');
    await expect(page.locator('#sync-status')).toHaveText('Conflit à résoudre', { timeout: 10000 });
    await expect(page.locator('#toast-container')).toContainText('Conflit distant');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Sauvegarder les deux' }).click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /^wfrp-conflit-\d{4}-\d{2}-\d{2}\.json$/);
    const exported = JSON.parse(await download.createReadStream().then(async stream => {
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      return Buffer.concat(chunks).toString('utf8');
    }));
    assert.equal(exported.format, 'wfrp-conflict-v2');
    assert.equal(exported.local.state.reserve.at(-1).name, 'Profil local en conflit');
    assert.equal(exported.remote.state.reserve.at(-1).name, 'Remote seulement');

    await addProfile(page, 'Profil à abandonner');
    await expect(page.locator('#sync-status')).toHaveText('Conflit à résoudre', { timeout: 10000 });
    await page.getByRole('button', { name: 'Prendre distant' }).click();
    await expect(page.locator('#sync-status')).toHaveText('Synchronisé', { timeout: 10000 });
    await expect(page.locator('#reserve-list')).toContainText('Remote seulement');
    await expect(page.locator('#reserve-list')).not.toContainText('Profil à abandonner');
    await page.reload();
    await expect(page.locator('#app-content')).toBeVisible();
    await expect(page.locator('#reserve-list')).toContainText('Remote seulement');
    await expect(page.locator('#reserve-list')).not.toContainText('Profil à abandonner');

    await page.evaluate(() => window.__e05Remote.forceExternal());
    await addProfile(page, 'Profil à conserver');
    await expect(page.locator('#sync-status')).toHaveText('Conflit à résoudre', { timeout: 10000 });
    await page.getByRole('button', { name: 'Garder local' }).click();
    await expect(page.locator('#sync-status')).toHaveText('Synchronisé', { timeout: 10000 });
    await expect(page.locator('#reserve-list')).toContainText('Profil à conserver');
    await page.reload();
    await expect(page.locator('#reserve-list')).toContainText('Profil à conserver');

    // Simulate logout then a different account through the provider boundary.
    // The visible reserve must follow the active context and never inherit A.
    await page.evaluate(() => window.__e05Remote.switchContext('guest'));
    await expect(page.locator('#sync-status')).toHaveText('Synchronisé', { timeout: 10000 });
    await expect(page.locator('#reserve-list')).not.toContainText('Profil compte A');
    await page.evaluate(() => window.__e05Remote.enableLive());
    await page.evaluate(() => window.__e05Remote.switchContext('account:b'));
    await expect(page.locator('#sync-status')).toHaveText('Synchronisé', { timeout: 10000 });
    await expect(page.locator('#reserve-list')).not.toContainText('Profil compte A');
    await addProfile(page, 'Profil compte B');
    await expect.poll(() => page.evaluate(() => window.__e05Remote.root?.state?.reserve?.at(-1)?.name)).toBe('Profil compte B');
    await page.evaluate(() => window.__e05Remote.pushLive());
    await expect(page.locator('#reserve-list')).toContainText('Live seulement', { timeout: 10000 });
    assert.deepEqual(errors, [], `exceptions navigateur: ${errors.join('\n')}`);
    await context.close();
    console.log('PASS — contexte compte, CAS concurrent, toast conflit et export des deux versions');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(`FAIL — browser-e05: ${error.stack || error.message}`);
  process.exitCode = 1;
});
