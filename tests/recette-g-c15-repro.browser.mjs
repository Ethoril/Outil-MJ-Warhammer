import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'playwright/test';
import { launchBrowser } from './helpers/browser.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

function startServer() {
  const server = createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url || '/').split('?')[0]);
    const file = join(root, normalize(requestPath === '/' ? '/index.html' : requestPath));
    try {
      if (!file.startsWith(root) || !statSync(file).isFile()) throw new Error('not found');
      response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
      response.end(readFileSync(file));
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

// Les commandes de séance vivent dans le menu ⋯ de la barre du haut.
// Le lancement ouvre le dialogue d'initiative (F2-A) : saisir des d10 distincts (pas d'égalité), calculer l'ordre, confirmer.
async function confirmLaunchInitiative(page) {
  const initiative = page.locator('dialog.tool-sheet', { hasText: 'Saisissez l’Initiative' });
  await initiative.waitFor({ state: 'visible' });
  const characteristics = initiative.locator('input[name^="characteristic:"]:not([readonly])');
  for (let index = 0; index < await characteristics.count(); index += 1) if (!await characteristics.nth(index).inputValue()) await characteristics.nth(index).fill('40');
  const dice = initiative.locator('input[name^="die:"]:not([readonly])');
  for (let index = 0; index < await dice.count(); index += 1) await dice.nth(index).fill(String(6 - index));
  await initiative.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  await initiative.getByRole('button', { name: 'Confirmer et appliquer' }).click();
}

async function openAppMenu(page) {
  const menu = page.locator('#app-menu');
  if (!(await menu.evaluate(element => element.matches(':popover-open')))) await page.locator('#btn-menu').click();
  await expect(menu).toBeVisible();
}

async function main() {
  const { server, port } = await startServer();
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
    await context.route('**/*', route => {
      if (route.request().url().startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await expect(page.locator('#app-content')).toBeVisible();
    await expect(page.locator('#workspace-root')).toBeVisible();

    await page.evaluate(async()=>{
      const {Store}=await import('/js/main.js');
      const {parseProfileJson}=await import('/js/core/json-profile-import.js');
      const data=await (await fetch('/docs/recette/profils-recette-complets.json')).text();
      await Store.importParsedProfiles(parseProfileJson(data).profiles);
      await Store.addProfilesToCombat(Store.listProfiles().slice(0,4).map(p=>p.id),{zone:'active'});
      const state=JSON.parse(Store.getFullJSON());state.combat.round=1;state.combat.order=state.combat.participants.map(p=>p.id);state.combat.currentActorId=state.combat.order[0];await Store.loadFromJSON(state);
    });
    const before=await page.evaluate(async()=>{const {Store}=await import('/js/main.js');const s=JSON.parse(Store.getFullJSON());return {reserve:s.reserve,combat:s.combat}});
    assert.equal(before.reserve.length,21); assert.equal(before.combat.participants.length,4); assert.equal(before.combat.round,1);
    await openAppMenu(page);
    const downloadPromise=page.waitForEvent('download'); await page.locator('#workspace-save').click();
    const savePath=await (await downloadPromise).path();
    await page.locator('#file-input').setInputFiles(savePath);
    await expect(page.locator('#toast-container')).toContainText('Sauvegarde chargée avec succès');
    const after=await page.evaluate(async()=>{const {Store}=await import('/js/main.js');const s=JSON.parse(Store.getFullJSON());return {reserve:s.reserve,combat:s.combat}});
    assert.deepEqual(after,before);
    console.log('C15 : profils complets et combat, export/réimport identique');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
await main();
