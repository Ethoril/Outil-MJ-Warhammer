import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const persistenceSource = readFileSync(`${root}/js/core/persistence.js`, 'utf8');

function startServer() {
  const server = createServer((request, response) => {
    if (request.url === '/js/core/persistence.js') {
      response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      response.end(persistenceSource);
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><title>E04 IndexedDB</title>');
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const { server, port } = await startServer();
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath });

try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/`);
  const result = await page.evaluate(async () => {
    const { createPersistence } = await import('/js/core/persistence.js');
    const dbName = 'e04-native-rollback-' + crypto.randomUUID();
    const originalPut = IDBObjectStore.prototype.put;
    let aborted = false;
    IDBObjectStore.prototype.put = function patchedPut(...args) {
      const request = originalPut.apply(this, args);
      if (this.name === 'contexts' && !aborted) {
        request.onsuccess = () => {
          aborted = true;
          this.transaction.abort();
        };
      }
      return request;
    };
    try {
      const persistence = createPersistence({ dbName, contextId: 'guest' });
      let errorName = null;
      try {
        await persistence.saveAtomic({
          state: { schemaVersion: 2, reserve: [], combat: {} },
          operations: [{ id: 'queued-after-state' }],
          restore: { id: 'restore-after-state', state: { schemaVersion: 2, reserve: [] } }
        });
      } catch (error) {
        errorName = error.name;
      }
      return {
        aborted,
        errorName,
        state: await persistence.load(),
        outbox: await persistence.listOutbox(),
        restores: await persistence.listRestorePoints()
      };
    } finally {
      IDBObjectStore.prototype.put = originalPut;
    }
  });
  assert.equal(result.aborted, true);
  assert.ok(['AbortError', 'Error'].includes(result.errorName));
  assert.equal(result.state, null);
  assert.deepEqual(result.outbox, []);
  assert.deepEqual(result.restores, []);
  console.log('✔ E04 navigateur — abort natif après state sans écriture partielle');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
