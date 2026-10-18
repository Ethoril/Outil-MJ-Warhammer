/** Real application menu/forms, native IDB, reload and history for explicit campaign time. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'tmp/divin/campaign-browser');
mkdirSync(output, { recursive: true });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html';
    const path = resolve(root, relative);
    assert.ok(path.startsWith(resolve(root) + sep) && statSync(path).isFile());
    res.writeHead(200, { 'Content-Type': types[extname(relative)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(path));
  } catch { res.writeHead(404).end('Resource unavailable'); }
});
const receipt = { passed: false, scope: 'actual application, native IndexedDB, simulated mobile', checks: [], screenshots: [] };
const check = description => receipt.checks.push(description);
let browser, page;
const snapshot = () => page.evaluate(async () => { const { Store } = await import('/js/main.js'); await Store.whenIdle(); return JSON.parse(Store.getFullJSON()); });
const readClock = async () => (await snapshot()).extensions.v5.gameClock;
const open = async () => {
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Temps de campagne', exact: true }).click();
  await page.getByRole('dialog', { name: 'Temps de campagne', exact: true }).waitFor();
};
const ready = () => page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
try {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
  // The application stays in guest mode; this recipe performs no external writes.
  await context.route('https://**', route => route.abort());
  page = await context.newPage(); page.setDefaultTimeout(7000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
  await ready();
  const initial = await readClock();
  const initialRevision = (await snapshot()).localRevision;
  assert.equal(initial.campaignSeconds, 0);
  await open();
  const dialog = page.getByRole('dialog', { name: 'Temps de campagne', exact: true });
  const amount = dialog.getByRole('spinbutton', { name: 'Durée écoulée', exact: true });
  const unit = dialog.getByRole('combobox', { name: 'Unité de durée', exact: true });
  const reason = dialog.getByRole('textbox', { name: 'Motif MJ', exact: true });
  await amount.fill('1'); await unit.selectOption('hours');
  await reason.fill('Voyage jusqu’au relais');
  assert.deepEqual(await readClock(), initial, 'editing the form must be inert');
  assert.equal((await snapshot()).localRevision, initialRevision);
  check('Opening and editing the form are inert, including outside combat');
  for (const width of [1440, 390]) for (const theme of ['dark', 'light']) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
    const box = await dialog.boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= width && box.y >= 0, 'dialog fits viewport');
    assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth), 'dialog does not overflow horizontally');
    const file = `campaign-${width}-${theme}.png`;
    await page.screenshot({ path: resolve(output, file), fullPage: true }); receipt.screenshots.push(file);
  }
  await dialog.getByRole('button', { name: 'Annuler', exact: true }).click();
  assert.deepEqual(await readClock(), initial);
  await open(); await page.keyboard.press('Escape'); assert.deepEqual(await readClock(), initial);
  check('Cancel and Escape preserve clock and effects');
  await open(); await amount.fill('1'); await unit.selectOption('hours');
  await reason.fill(''); await dialog.getByRole('button', { name: 'Avancer le temps', exact: true }).click();
  assert.deepEqual(await readClock(), initial, 'empty reason cannot commit');
  await reason.fill('Voyage jusqu’au relais');
  await dialog.getByRole('button', { name: 'Avancer le temps', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  const advanced = await readClock();
  assert.equal(advanced.campaignSeconds, 3600);
  assert.equal(advanced.revision, initial.revision + 1);
  assert.deepEqual(advanced.lastEvent.validatedPhases, []);
  const event = JSON.parse(advanced.lastEvent.payloadFingerprint);
  assert.equal(event.reason, 'Voyage jusqu’au relais'); assert.equal(event.seconds, 3600);
  check('One confirmed hour advances exactly 3600 seconds with a reason and zero combat phases');
  await page.reload({ waitUntil: 'domcontentloaded' }); await ready();
  assert.deepEqual(await readClock(), advanced, 'native IDB reload preserves exact clock receipt');
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await page.waitForFunction(async () => { const { Store } = await import('/js/main.js'); return JSON.parse(Store.getFullJSON()).extensions.v5.gameClock.campaignSeconds === 0; });
  assert.deepEqual(await readClock(), initial);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Rétablir', exact: false }).click();
  await page.waitForFunction(async () => { const { Store } = await import('/js/main.js'); return JSON.parse(Store.getFullJSON()).extensions.v5.gameClock.campaignSeconds === 3600; });
  assert.deepEqual(await readClock(), advanced);
  check('Reload, Undo and Redo restore clock and receipt together without wall time');
  await open(); await amount.fill('0.1'); await unit.selectOption('seconds'); await reason.fill('Fraction invalide');
  await dialog.getByRole('button', { name: 'Avancer le temps', exact: true }).click();
  assert.deepEqual(await readClock(), advanced);
  await dialog.getByRole('alert').waitFor();
  await amount.fill('1');
  await page.evaluate(async () => { const { Store } = await import('/js/main.js'); await Store.addProfile({ id: 'changed-during-clock-form', name: 'Modification concurrente', kind: 'PJ', hp: 12 }); });
  await dialog.getByRole('button', { name: 'Avancer le temps', exact: true }).click();
  assert.match(await dialog.getByRole('alert').innerText(), /partie a changé|modifi|périm/i);
  assert.deepEqual(await readClock(), advanced);
  check('Invalid fractions and a stale open form cannot advance the clock');
  await dialog.getByRole('button', { name: 'Annuler', exact: true }).click();
  assert.deepEqual(errors, []);
  receipt.passed = true;
} catch (error) {
  receipt.error = error.stack;
  if (page) await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  receipt.completedAt = new Date().toISOString();
  writeFileSync(resolve(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  await browser?.close(); await new Promise(done => server.close(done));
}
console.log(JSON.stringify(receipt));
