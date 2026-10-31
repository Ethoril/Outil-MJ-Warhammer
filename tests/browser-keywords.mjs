import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const page_html = '<!doctype html><meta charset="utf-8"><title>Recette mots-clés</title><link rel="stylesheet" href="/MJ.css"><div id="holder"></div><script type="module">'
  + 'import { createStore } from "/js/core/store.js"; import { createKeywordPicker } from "/js/ui/keyword-picker.js";'
  + 'const values = new Map(); const store = createStore({ storage: { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) } });'
  + 'window.store = store; window.changes = [];'
  + 'window.picker = createKeywordPicker({ container: document.querySelector("#holder"), store, subject: { traits: ["Mort-vivant"] }, onChange: value => window.changes.push(value) });'
  + 'window.ready = true;</script>';
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/qa-keywords') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(page_html); return; }
    const path = resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!path.startsWith(resolve(root) + sep) || !(await stat(path)).isFile()) throw new Error('404');
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'text/plain' }); res.end(await readFile(path));
  } catch { res.writeHead(404); res.end('Not found'); }
});
// Chromium refuse les ports « dangereux » (6666, 6665-6669, 6000, 10080…) : on retire un port tant qu'il n'est pas au-dessus de la liste.
for (;;) {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  if (server.address().port > 10080) break;
  await new Promise(done => server.close(done));
}
const url = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined) });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url + '/qa-keywords');
  await page.waitForFunction(() => window.ready === true);
  const chips = () => page.locator('.keyword-chip').allInnerTexts();
  // Mot-clé déduit d'un Trait de nature, visible et écartable.
  assert.match((await chips()).join('|'), /Mort-vivant/);
  assert.equal(await page.locator('.keyword-derived').count(), 1);
  // Un alias se résout en terme du référentiel.
  const input = page.getByLabel('Ajouter un mot-clé');
  await input.fill('peau verte'); await input.press('Enter');
  assert.match((await chips()).join('|'), /Peaux-vertes/);
  // Un terme inconnu n'est jamais gardé : message et proposition d'ajout.
  await input.fill('Zorglub'); await input.press('Enter');
  assert.match(await page.locator('text=n’est pas dans le référentiel').first().innerText(), /Zorglub/);
  // La boîte du MJ refuse un quasi-doublon et propose le terme existant.
  await page.getByRole('button', { name: /Ajouter ce terme au référentiel/ }).click();
  const dialog = page.locator('dialog');
  await dialog.getByLabel('Nom du mot-clé').fill('Zombi');
  await dialog.getByRole('button', { name: 'Ajouter le mot-clé' }).click();
  assert.match(await dialog.locator('[role=alert]').innerText(), /Zombie/);
  await dialog.getByRole('button', { name: /Utiliser « Zombie »/ }).click();
  await page.waitForFunction(() => !document.querySelector('dialog'));
  assert.match((await chips()).join('|'), /Zombie/);
  assert.equal(await page.evaluate(() => window.store.getKeywordReferential().terms.has('zorglub')), false);
  // Un terme réellement nouveau est ajouté au référentiel et posé sur le profil.
  await input.fill('Zorglub'); await input.press('Enter');
  await page.getByRole('button', { name: /Ajouter ce terme au référentiel/ }).click();
  await page.locator('dialog').getByLabel('Alias séparés par des virgules').fill('zorglubien');
  await page.locator('dialog').getByRole('button', { name: 'Ajouter le mot-clé' }).click();
  await page.waitForFunction(() => !document.querySelector('dialog'));
  assert.match((await chips()).join('|'), /Zorglub/);
  assert.equal(await page.evaluate(() => window.store.getKeywordReferential().terms.has('zorglub')), true);
  await input.fill('zorglubien'); await input.press('Enter');
  const value = await page.evaluate(() => window.picker.getValue());
  assert.deepEqual(value.keywords, ['peaux-vertes', 'zombie', 'zorglub']);
  // Écarter le mot-clé déduit le range dans les exclusions ; on peut le rétablir.
  await page.getByRole('button', { name: /Écarter le mot-clé déduit Mort-vivant/ }).click();
  assert.deepEqual((await page.evaluate(() => window.picker.getValue())).keywordExclusions, ['mort-vivant']);
  assert.equal(await page.locator('.keyword-derived').count(), 0);
  await page.getByRole('button', { name: /Rétablir Mort-vivant/ }).click();
  assert.equal(await page.locator('.keyword-derived').count(), 1);
  assert.deepEqual(errors, []);
  console.log('Mots-clés navigateur : alias, déduction, exclusion, refus de quasi-doublon, ajout MJ sans erreur OK');
} finally { await browser.close(); await new Promise(done => server.close(done)); }
