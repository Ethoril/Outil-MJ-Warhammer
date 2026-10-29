import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  try {
    const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    const relative = normalize(pathname === '/' ? '/index.html' : pathname);
    const file = join(root, relative);
    if (!file.startsWith(root) || !statSync(file).isFile()) throw new Error('missing');
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined) });
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage(), origin = `http://127.0.0.1:${server.address().port}`;
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', undefined, { timeout: 20000 });
  await page.evaluate(async () => {
    const { Store } = await import('./js/main.js'); await Store.ready;
    await Store.loadFromJSON(JSON.stringify({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'extra', order: ['extra'], participants: [{ id: 'extra', name: 'Figurant', kind: 'PNJ', camp: 'foes', zone: 'active', hp: 0, maxHp: 8, states: [], talents: [], extensions: { v5: {} } }] }, log: [], diceLines: [], extensions: { v5: {} } }));
  });
  await page.locator('#tab-combat').click();
  const panel = page.getByLabel('Réglage de table : mort subite des figurants');
  await panel.waitFor({ state: 'visible' });
  const option = page.getByRole('checkbox', { name: 'Activer la mort subite des figurants' });
  assert.equal(await option.isChecked(), false, 'réglage désactivé par défaut');
  await option.check();
  await page.getByText('Figurant · 0 Blessure').waitFor();
  const confirm = page.getByRole('checkbox', { name: 'Figurant : confirmer PNJ secondaire' });
  await confirm.check();
  const chooseUnconscious = page.getByRole('button', { name: 'Choisir : inconscient' });
  assert.equal(await chooseUnconscious.isEnabled(), true, 'le choix apparaît après confirmation MJ');
  await chooseUnconscious.click();
  const state = await page.evaluate(async () => { const { Store } = await import('./js/main.js'); return Store.listParticipants()[0]; });
  assert.ok(state.states.some(row => row.key === 'inconscient'), 'choix MJ appliqué au figurant');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', undefined, { timeout: 20000 });
  await page.locator('#tab-combat').click();
  assert.equal(await page.getByRole('checkbox', { name: 'Activer la mort subite des figurants' }).isChecked(), true, 'réglage retrouvé après rechargement de l’application');
  assert.deepEqual(pageErrors, [], 'aucune erreur JavaScript de page');
  await context.close();
  console.log('F2 T2 bis navigateur : option désactivée par défaut, confirmation du figurant, choix Inconscient et persistance après rechargement vérifiés.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
