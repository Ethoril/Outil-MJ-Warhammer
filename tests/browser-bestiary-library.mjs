import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const requests = [];
const page_html = '<!doctype html><meta charset="utf-8"><title>Recette bibliothèque</title><link rel="stylesheet" href="/MJ.css"><div id="holder"></div><script type="module">'
  + 'import { createStore } from "/js/core/store.js"; import { createBestiaryLibrary } from "/js/ui/bestiary-library.js";'
  + 'const values = new Map(); const store = createStore({ storage: { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) } });'
  + 'window.store = store; window.messages = [];'
  + 'window.library = createBestiaryLibrary({ container: document.querySelector("#holder"), store, notify: (m, t) => window.messages.push([m, t]) });'
  + 'window.ready = true;</script>';
const server = createServer(async (req, res) => {
  try {
    requests.push(req.url);
    if (req.url === '/qa-library') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(page_html); return; }
    const path = resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!path.startsWith(resolve(root) + sep) || !(await stat(path)).isFile()) throw new Error('404');
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'text/plain' }); res.end(await readFile(path));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const url = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined) });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url + '/qa-library');
  await page.waitForFunction(() => window.ready === true);
  // Chargement paresseux : rien n'est demandé avant l'ouverture.
  assert.equal(requests.filter(item => item.includes('/bestiary/')).length, 0);
  await page.evaluate(() => window.library.open());
  await page.waitForFunction(() => document.querySelectorAll('.item').length > 0);
  assert.ok(requests.some(item => item.endsWith('/bestiary/index.json')));
  // Filtre par nom puis fiche en lecture seule.
  await page.getByLabel('Nom du profil').fill('Zombie');
  await page.waitForFunction(() => [...document.querySelectorAll('.item strong')].every(node => /zombie/i.test(node.textContent)) && document.querySelectorAll('.item').length > 0);
  const zombieRow = page.locator('.item').filter({ has: page.locator('strong', { hasText: /^Zombie\b/ }) }).filter({ hasText: 'L06' }).first();
  await zombieRow.getByRole('button', { name: /Fiche de Zombie/ }).click();
  assert.match(await zombieRow.locator('.bestiary-sheet').innerText(), /Blessures : 12/);
  assert.equal(await zombieRow.locator('.bestiary-sheet input, .bestiary-sheet textarea').count(), 0);
  // Ajout au combat : trois exemplaires, valeurs imprimées, camp choisi.
  await zombieRow.getByLabel(/Nombre d’exemplaires de Zombie/).fill('3');
  await zombieRow.getByRole('button', { name: 'Ajouter au combat' }).click();
  await page.waitForFunction(() => window.store.listParticipants().length === 3);
  const added = await page.evaluate(() => window.store.listParticipants().map(p => ({ name: p.name, hp: p.hp, camp: p.camp, zone: p.zone, keywords: p.keywords })));
  assert.deepEqual(added.map(p => p.name).sort(), ['Zombie 1', 'Zombie 2', 'Zombie 3']);
  assert.ok(added.every(p => p.hp === 12 && p.camp === 'ennemi' && p.zone === 'bench' && p.keywords.includes('zombie')));
  // Copie dans la Réserve.
  await zombieRow.getByRole('button', { name: 'Copier dans la réserve' }).click();
  await page.waitForFunction(() => window.store.listProfiles().length === 1);
  const profile = await page.evaluate(() => window.store.listProfiles()[0]);
  assert.equal(profile.name, 'Zombie');
  assert.equal(profile.group, 'Bestiaire');
  assert.equal(profile.hp, 12);
  // Filtre par mot-clé avec descendants : « Mort-vivant » retrouve le Zombie, pas l'Humain.
  await page.getByLabel('Nom du profil').fill('');
  await page.getByLabel('Mot-clé').selectOption('mort-vivant');
  await page.waitForFunction(() => [...document.querySelectorAll('.item strong')].some(node => /^Zombie/.test(node.textContent)));
  assert.equal(await page.locator('.item strong', { hasText: /^Human\b/ }).count(), 0);
  // Gabarit : fiche seule, aucun bouton d'ajout.
  await page.getByLabel('Mot-clé').selectOption('');
  await page.getByLabel('Genre').selectOption('template');
  await page.waitForFunction(() => document.querySelectorAll('.item').length > 0);
  assert.equal(await page.getByRole('button', { name: 'Ajouter au combat' }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('Bibliothèque de bestiaire : parcours navigateur OK');
} finally {
  await browser.close();
  server.close();
}
