// Lot 5 · C55 : Focalisation en mode Pause, l'aperçu affichait toujours « DR +0 » et « gain +0 » quel que soit le jet.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';
import { openU1Settings, clickU1Magic } from './helpers/u1-drawer.mjs';

const ROOT = resolve('.');
const EDGE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe';
const MIME = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const file = resolve(join(ROOT, path));
    if (!file.startsWith(ROOT) || !(await stat(file)).isFile()) throw new Error('missing');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const HARNESS = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head>
<body><div id="workspace-mount"></div><script type="module">
import { createStore } from '/js/core/store.js';
import { initWorkspaceView } from '/js/ui/workspace-view.js';
const store = createStore({ storage: null }); await store.ready;
const mage = { id: 'mage', name: 'Mage des Bêtes', kind: 'PJ', camp: 'pj', zone: 'active', init: 55, hp: 14, maxHp: 14,
  caracs: { CC: 35, CT: 35, F: 30, E: 40, I: 45, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 35 },
  skills: [{ name: 'Focalisation', characteristic: 'FM', advances: 0, value: 50 }, { name: 'Calme', characteristic: 'FM', advances: 0, value: 50 }, { name: 'Langue (Magick)', characteristic: 'Int', advances: 10, value: 60 }],
  spells: [{ id: 'spell-tradition-brise-os', name: 'Brise-os' }], actions: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { magic: { lore: 'beasts' }, channelling: { sl: 5, type: 'winds' } } } };
const foe = { id: 'foe', name: 'Brigand', kind: 'PNJ', camp: 'ennemi', zone: 'active', init: 40, hp: 15, maxHp: 15,
  caracs: { CC: 45, CT: 30, F: 40, E: 30, I: 35, Ag: 30, Dex: 25, Int: 30, FM: 35, Soc: 20 }, actions: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 } };
await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: 'mage', order: ['mage', 'foe'], participants: [mage, foe] } });
const view = initWorkspaceView({ mount: document.getElementById('workspace-mount'), Store: store, actions: { applyResolution: p => store.applyResolution(p) } });
view.setSpace('play'); window.__TEST__ = { Store: store, view };
</script></body></html>`;

const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : existsSync(EDGE) ? { executablePath: EDGE } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const pageErrors = []; page.on('pageerror', e => pageErrors.push(e.message));
  await page.route(`${baseUrl}/__c55__.html`, route => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HARNESS }));
  await page.goto(`${baseUrl}/__c55__.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.workspace-resolution');
  await clickU1Magic(page, 'channelling'); await openU1Settings(page);
  await page.locator('[data-focus-key="magicChannelMode"]').selectOption('pause');
  await page.fill('[data-roll-input="attack"]', '20');
  await page.click('[data-focus-key="calculate"]');
  const text = await page.locator('.workspace-magic-result').innerText();
  assert.match(text, /Réussite · DR \+5/, `la pause doit afficher les DR du Test (Focalisation 50, jet 20, Accessible +2 : +5) : ${text}`);
  assert.doesNotMatch(text, /gain/, `la pause ne gagne pas de DR : ${text}`);
  assert.equal(pageErrors.length, 0, pageErrors.join(' | '));
  console.log('lot5-c55-browser: OK');
} finally { await browser.close(); await new Promise(r => server.close(r)); }
