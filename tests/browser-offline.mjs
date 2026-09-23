import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const swSource = readFileSync(join(root, 'sw.js'), 'utf8');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

let swVersion = 'A';

function versionedServiceWorker() {
  const marker = `
    if (url.pathname === '/__wfrp-test-version') {
      event.respondWith(new Response(${JSON.stringify(swVersion)}, { headers: { 'Content-Type': 'text/plain' } }));
      return;
    }
`;
  return swSource
    .replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = 'wfrp-cache-test-${swVersion}';`)
    // Avoid racing the explicit update toast with the install notification.
    .replace(
      "clients.forEach(client => client.postMessage({ type: 'wfrp-update-ready', version: CACHE_NAME }));",
      "clients.forEach(client => { if (CACHE_NAME.endsWith('-B')) client.postMessage({ type: 'wfrp-update-ready', version: CACHE_NAME }); });"
    )
    .replace('  const url = new URL(event.request.url);', `  const url = new URL(event.request.url);${marker}`);
}

function startStaticServer() {
  const server = createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (requestPath === '/sw.js') {
      res.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(versionedServiceWorker());
      return;
    }
    const relative = normalize(requestPath === '/' ? '/index.html' : requestPath);
    const file = join(root, relative);
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

async function configureNetwork(context, port) {
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
    return route.abort();
  });
  await context.route('**/sw.js', route => route.fulfill({
    contentType: 'text/javascript; charset=utf-8',
    body: versionedServiceWorker()
  }));
}

async function waitForApp(page) {
  await expect(page.locator('#app-content')).toBeVisible();
  await expect(page.locator('#login-screen')).toBeHidden();
}

async function fillLocalProfile(page, name) {
  const form = page.locator('#form-add');
  if (!(await form.isVisible())) {
    await page.locator('#tab-prepare').click();
    await expect(page.locator('#workspace-prepare')).toBeVisible();
    await page.locator('#workspace-prepare').getByRole('button', { name: 'Nouveau profil' }).click();
  }
  await expect(form).toBeVisible();
  await form.locator('[name=name]').fill(name);
  await form.locator('[name=initiative]').fill('47');
  await form.locator('[name=hp]').fill('13');
  await form.locator('[name=group]').fill('Hors ligne');
  await form.locator('[name=E]').fill('32');
  await form.locator('#btn-submit-form').click();
  await expect(page.locator('#reserve-list')).toContainText(name);
}

async function registrationWaiting(page) {
  return page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
}

async function serviceWorkerMarker(page) {
  return page.evaluate(async () => fetch(`/__wfrp-test-version?probe=${Date.now()}`, { cache: 'no-store' })
    .then(response => response.text()));
}

async function installAndActivateWorker(page, origin) {
  await page.goto(`${origin}/index.html`);
  await waitForApp(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => serviceWorkerMarker(page)).toBe('A');
}

async function dismissUpdateToasts(page) {
  const toast = page.locator('#toast-container .toast').filter({ hasText: 'Une mise à jour est prête.' });
  for (let attempt = 0; attempt < 3 && await toast.count(); attempt++) {
    await toast.first().locator('span').last().click();
    await expect(toast.first()).toBeHidden({ timeout: 1000 }).catch(() => {});
  }
}

async function updateToWaiting(page) {
  swVersion = 'B';
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error('service worker absent');
    await registration.update();
  });
  await expect.poll(() => registrationWaiting(page), { timeout: 15000 }).toBe(true);
  await expect.poll(
    () => page.getByRole('button', { name: 'Actualiser' }).count(),
    { timeout: 15000 }
  ).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Actualiser' }).last()).toBeVisible();
}

async function runScenario(name, fn, results) {
  try {
    await fn();
    results.push(`PASS — ${name}`);
  } catch (error) {
    results.push(`FAIL — ${name}: ${error.message}`);
  }
}

async function main() {
  const { server, port } = await startStaticServer();
  const origin = `http://127.0.0.1:${port}`;
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH
    || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({ headless: true, executablePath });
  const results = [];

  try {
    await runScenario('réseau distant indisponible : démarrage invité et reload local', async () => {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      try {
        await configureNetwork(context, port);
        const page = await context.newPage();
        await page.goto(`${origin}/index.html`);
        await waitForApp(page);
        // Firebase is bundled locally; a blocked network affects authentication,
        // not application bootstrap. The user remains an explicit guest.
        await expect(page.locator('#sync-status')).toHaveAttribute('data-status', 'signedOut');
        await fillLocalProfile(page, 'Profil local SDK absent');
        await page.reload();
        await waitForApp(page);
        const profileCard = page.locator('#workspace-prepare .workspace-profile-card').filter({ hasText: 'Profil local SDK absent' });
        await expect(profileCard).toBeVisible();
        await profileCard.getByRole('button', { name: 'Modifier' }).click();
        const editForm = page.locator('dialog[open] #form-add');
        await expect(editForm).toBeVisible();
        await expect(editForm.locator('[name=initiative]')).toHaveValue('47');
        await expect(editForm.locator('[name=hp]')).toHaveValue('13');
        await expect(editForm.locator('[name=group]')).toHaveValue('Hors ligne');
      } finally {
        await context.close();
      }
    }, results);

    await runScenario('service worker réel : installation puis reload hors ligne', async () => {
      swVersion = 'A';
      const context = await browser.newContext({ serviceWorkers: 'allow' });
      try {
        await configureNetwork(context, port);
        const page = await context.newPage();
        await installAndActivateWorker(page, origin);
        await fillLocalProfile(page, 'Profil PWA hors ligne');
        await context.setOffline(true);
        await page.reload();
        await waitForApp(page);
        await expect(page.locator('#reserve-list')).toContainText('Profil PWA hors ligne');
        // The load path should report that the local snapshot is available and durable.
        await expect(page.locator('#local-status')).toHaveAttribute('data-status', 'saved');
      } finally {
        await context.close();
      }
    }, results);

    await runScenario('cache vA/vB : waiting puis activation volontaire', async () => {
      swVersion = 'A';
      const context = await browser.newContext({ serviceWorkers: 'allow' });
      try {
        await configureNetwork(context, port);
        const page = await context.newPage();
        await installAndActivateWorker(page, origin);
        await dismissUpdateToasts(page);
        await fillLocalProfile(page, 'Profil cache versionné');
        await expect.poll(() => serviceWorkerMarker(page)).toBe('A');
        await updateToWaiting(page);
        await expect.poll(() => serviceWorkerMarker(page)).toBe('A');
        const updateButton = page.getByRole('button', { name: 'Actualiser' }).last();
        const navigation = page.waitForEvent('framenavigated', { timeout: 15000 });
        await updateButton.click();
        await navigation;
        await waitForApp(page);
        await expect.poll(() => serviceWorkerMarker(page), { timeout: 15000 }).toBe('B');
        await expect.poll(() => registrationWaiting(page)).toBe(false);
        await expect(page.locator('#reserve-list')).toContainText('Profil cache versionné');
      } finally {
        await context.close();
      }
    }, results);

    await runScenario('quota local : une mise à jour en attente reste refusée', async () => {
      swVersion = 'A';
      const context = await browser.newContext({ serviceWorkers: 'allow' });
      try {
        await configureNetwork(context, port);
        const page = await context.newPage();
        await installAndActivateWorker(page, origin);
        await dismissUpdateToasts(page);
        // Test-only fault injection after Store.ready: it exercises the real
        // IndexedDB transaction and has no production hook or global flag.
        await page.evaluate(() => {
          const nativePut = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function (...args) {
            if (this.name === 'contexts') {
              throw new DOMException('QuotaExceededError', 'QuotaExceededError');
            }
            return nativePut.apply(this, args);
          };
        });
        await page.locator('#tab-prepare').click();
        await page.locator('#workspace-prepare').getByRole('button', { name: 'Nouveau profil' }).click();
        await expect(page.locator('#form-add')).toBeVisible();
        await page.locator('#form-add [name=name]').fill('Profil quota refusé');
        await page.locator('#form-add [name=initiative]').fill('47');
        await page.locator('#form-add [name=hp]').fill('13');
        await page.locator('#btn-submit-form').click();
        await expect(page.locator('#local-status')).toHaveAttribute('data-status', 'error');
        await page.locator('dialog[open]').getByRole('button', { name: 'Fermer' }).click();
        await updateToWaiting(page);
        const updateButton = page.getByRole('button', { name: 'Actualiser' }).last();
        await updateButton.click();
        await page.waitForTimeout(500);
        assert.equal(await serviceWorkerMarker(page), 'A', 'une erreur locale doit empêcher l’activation');
        assert.equal(await registrationWaiting(page), true, 'la mise à jour doit rester en attente');
      } finally {
        await context.close();
      }
    }, results);

    await runScenario('réseau rétabli : adaptateur local reste invité sans reload', async () => {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      try {
        await configureNetwork(context, port);
        const page = await context.newPage();
        let loadCount = 0;
        page.on('load', () => { loadCount++; });
        await page.goto(`${origin}/index.html`);
        await waitForApp(page);
        await expect(page.locator('#sync-status')).toHaveAttribute('data-status', 'signedOut');

        await context.setOffline(true);
        await context.setOffline(false);
        await expect.poll(
          () => page.locator('#sync-status').getAttribute('data-status'),
          { timeout: 15000 }
        ).toBe('signedOut');
        await expect(page.locator('#app-content')).toBeVisible();
        assert.equal(loadCount, 1, 'le rétablissement ne doit pas recharger la page');
      } finally {
        await context.close();
      }
    }, results);
  } finally {
    await browser.close();
    server.close();
  }

  results.forEach(result => console.log(result));
  if (results.some(result => result.startsWith('FAIL'))) process.exitCode = 1;
}

main().catch(error => {
  console.error(`✖ test:browser-offline — ${error.message}`);
  process.exitCode = 1;
});
