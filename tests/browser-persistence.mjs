import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixtures = join(root, 'tests', 'fixtures');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

function startStaticServer() {
  const server = createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
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

async function isolateNetwork(context, port) {
  await context.route('**/*', route => {
    if (route.request().url().startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
    return route.abort();
  });
}

async function waitForApp(page) {
  await expect(page.locator('#app-content')).toBeVisible();
  await expect(page.locator('#login-screen')).toBeHidden();
  await expect(page.locator('#local-status')).toHaveAttribute('data-status', 'saved');
}

async function readPersistence(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('wfrp-persistence-v2');
    request.onerror = () => reject(request.error || new Error('IDB open failed'));
    request.onsuccess = () => {
      const db = request.result;
      try {
        const tx = db.transaction(['contexts', 'outbox', 'restores'], 'readonly');
        const reads = ['contexts', 'outbox', 'restores'].map(name => new Promise((done, fail) => {
          const get = tx.objectStore(name).getAll();
          get.onsuccess = () => done(get.result);
          get.onerror = () => fail(get.error || new Error(`IDB read failed: ${name}`));
        }));
        Promise.all(reads).then(([contexts, outbox, restores]) => {
          db.close();
          resolve({ contexts, outbox, restores });
        }).catch(reject);
      } catch (error) {
        db.close();
        reject(error);
      }
    };
  }));
}

async function fillProfile(page, name) {
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
  await form.locator('[name=group]').fill('E04');
  await form.locator('[name=E]').fill('32');
  await form.locator('#btn-submit-form').click();
  await expect(page.locator('#reserve-list')).toContainText(name);
  await expect(page.locator('#local-status')).toHaveAttribute('data-status', 'saved');
}

async function loadFixture(page, file, { accept = true } = {}) {
  const dialog = accept
    ? page.waitForEvent('dialog').then(browserDialog => browserDialog.accept())
    : null;
  await page.locator('#tab-combat').click();
  // The current workspace keeps the legacy combat panel hidden. Use the
  // visible session tool, which delegates to the same file input and import
  // confirmation path.
  await page.locator('#workspace-load').click();
  await page.locator('#file-input').setInputFiles(file);
  if (dialog) await dialog;
}

async function readDownload(download) {
  const stream = await download.createReadStream();
  assert.ok(stream, 'le téléchargement doit fournir un flux lisible');
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function runScenario(name, callback, results) {
  try {
    await callback();
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
  const fixture = readFileSync(join(fixtures, 'e04-v2.json'), 'utf8');
  const invalidFixture = readFileSync(join(fixtures, 'e04-invalid.json'), 'utf8');

  try {
    await runScenario('enveloppe arbitraire refusée sans remplacer l’état IDB', async () => {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      try {
        await isolateNetwork(context, port);
        const page = await context.newPage();
        await page.goto(`${origin}/index.html`);
        await waitForApp(page);
        await fillProfile(page, 'Profil avant import invalide');
        const before = await readPersistence(page);
        await loadFixture(page, { name: 'e04-invalid.json', mimeType: 'application/json', buffer: Buffer.from(invalidFixture) }, { accept: false });
        await expect(page.locator('#toast-container .toast')).toContainText('Erreur de chargement');
        const after = await readPersistence(page);
        assert.deepEqual(after.contexts, before.contexts);
        assert.deepEqual(after.outbox, before.outbox);
        assert.deepEqual(after.restores, before.restores);
        await expect(page.locator('#reserve-list')).toContainText('Profil avant import invalide');
      } finally {
        await context.close();
      }
    }, results);

    await runScenario('migration legacy conserve maxHp et états après reload IDB', async () => {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      await context.addInitScript(({ legacy }) => {
        if (sessionStorage.getItem('__e04_legacy_seeded') === '1') return;
        for (const [key, value] of Object.entries(legacy)) localStorage.setItem(key, JSON.stringify(value));
        sessionStorage.setItem('__e04_legacy_seeded', '1');
      }, { legacy: {
        'wfrp.reserve.v1': [{ id: 'legacy-profile', name: 'Profil legacy', hp: 17, initiative: 41 }],
        'wfrp.combat.v1': {
          round: 4,
          currentActorId: 'legacy-participant',
          order: ['legacy-participant'],
          participants: [{ id: 'legacy-participant', profileId: 'legacy-profile', name: 'Profil legacy', hp: 6, maxHp: 17, states: ['Sonné|3'] }]
        },
        'wfrp.log.v1': [],
        'wfrp.dice.v1': []
      }});
      try {
        await isolateNetwork(context, port);
        const page = await context.newPage();
        await page.goto(`${origin}/index.html`);
        await waitForApp(page);
        await expect(page.locator('#reserve-list')).toContainText('Profil legacy');
        await expect.poll(async () => (await readPersistence(page)).contexts.length).toBe(1);
        await page.evaluate(() => {
          for (const key of ['wfrp.reserve.v1', 'wfrp.combat.v1', 'wfrp.log.v1', 'wfrp.dice.v1']) localStorage.removeItem(key);
        });
        await page.reload();
        await waitForApp(page);
        const legacyKeys = ['wfrp.reserve.v1', 'wfrp.combat.v1', 'wfrp.log.v1', 'wfrp.dice.v1'];
        assert.deepEqual(await page.evaluate(keys => keys.filter(key => localStorage.getItem(key) !== null), legacyKeys), []);
        const persisted = await readPersistence(page);
        const state = persisted.contexts.find(record => record.contextId === 'guest')?.state;
        assert.ok(state, 'l’état guest doit être présent dans IDB');
        assert.equal(state.combat.participants[0].maxHp, 17);
        assert.deepEqual(state.combat.participants[0].states, ['Sonné|3']);
        await expect(page.locator('#reserve-list')).toContainText('Profil legacy');
      } finally {
        await context.close();
      }
    }, results);

    await runScenario('export/réimport v2 conserve les extensions et les modèles', async () => {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      try {
        await isolateNetwork(context, port);
        const page = await context.newPage();
        await page.goto(`${origin}/index.html`);
        await waitForApp(page);
        await loadFixture(page, { name: 'e04-v2.json', mimeType: 'application/json', buffer: Buffer.from(fixture) });
        await expect(page.locator('#reserve-list')).toContainText('Profil fixture E04');
        await expect(page.locator('#local-status')).toHaveAttribute('data-status', 'saved');
        await page.locator('#tab-library').click();
        let fixtureItem = page.locator('#workspace-library .workspace-profile-card').filter({ hasText: 'Profil fixture E04' });
        await expect(fixtureItem).toBeVisible();
        await fixtureItem.getByRole('button', { name: 'Modifier' }).click();
        await page.locator('dialog #form-add [name=name]').fill('Profil avant export');
        await page.locator('dialog #btn-submit-form').click();
        await expect(page.locator('#workspace-library')).toContainText('Profil avant export');
        await page.locator('#tab-combat').click();
        const download = page.waitForEvent('download');
        await page.locator('#workspace-save').click();
        const exported = await readDownload(await download);
        assert.deepEqual(exported.extensions.campaign, { name: 'Fixture E04' });
        assert.equal(exported.reserve[0].extensions.portrait, 'fixture://portrait');
        assert.equal(exported.combat.participants[0].extensions.token, 'fixture-token');
        assert.equal(exported.combat.participants[0].maxHp, 15);
        assert.equal(exported.combat.participants[0].states.length, 1);
        assert.equal(exported.combat.participants[0].states[0].key, 'hemorragique');
        assert.equal(exported.combat.participants[0].states[0].duration, 2);

        await page.locator('#tab-library').click();
        const exportedItem = page.locator('#workspace-library .workspace-profile-card').filter({ hasText: 'Profil avant export' });
        await expect(exportedItem).toBeVisible();
        await exportedItem.getByRole('button', { name: 'Modifier' }).click();
        await page.locator('dialog #form-add [name=name]').fill('Profil après export');
        await page.locator('dialog #btn-submit-form').click();
        await expect(page.locator('#workspace-library')).toContainText('Profil après export');
        await loadFixture(page, {
          name: 'e04-exported.json',
          mimeType: 'application/json',
          buffer: Buffer.from(JSON.stringify(exported))
        });
        await expect(page.locator('#reserve-list')).toContainText('Profil avant export');
        await expect(page.locator('#reserve-list')).not.toContainText('Profil après export');
        const roundTrip = page.waitForEvent('download');
        await page.locator('#workspace-save').click();
        const reimported = await readDownload(await roundTrip);
        assert.deepEqual(reimported.extensions.campaign, { name: 'Fixture E04' });
        assert.equal(reimported.reserve[0].extensions.portrait, 'fixture://portrait');
        assert.equal(reimported.combat.participants[0].extensions.token, 'fixture-token');
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
  console.error(`✖ test:browser-persistence — ${error.message}`);
  process.exitCode = 1;
});
