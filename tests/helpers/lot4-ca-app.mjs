import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Démarre index.html (Firebase remplacé au niveau du module) pour les parcours du lot 4, sous-lot C-a.
const root = fileURLToPath(new URL('../..', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

export async function startApp() {
  const server = createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = join(root, normalize(requestPath === '/' ? '/index.html' : requestPath));
    try {
      if (!file.startsWith(root) || !statSync(file).isFile()) throw new Error('not found');
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.route('**/*', route => route.request().url().startsWith(`http://127.0.0.1:${port}/`) ? route.continue() : route.abort());
  await page.route('**/js/core/sync.js', route => route.fulfill({ contentType: 'text/javascript', body: `
    export function initFirebaseSync(onConnected) {
      document.querySelector('#login-screen')?.style.setProperty('display', 'none');
      document.querySelector('#app-content')?.style.setProperty('display', 'block');
      onConnected({ dbRef: 'isolated-test', onValue() {}, update() { return Promise.resolve(); } });
    }` }));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.locator('#app-content').waitFor({ state: 'visible' });
  return { page, errors, close: async () => { await browser.close(); server.close(); } };
}

export async function openNewProfileForm(page) {
  await page.locator('#tab-prepare').click();
  await page.locator('#workspace-prepare').getByRole('button', { name: 'Nouveau profil' }).click();
  const form = page.locator('#form-add');
  await form.waitFor({ state: 'visible' });
  return form;
}
