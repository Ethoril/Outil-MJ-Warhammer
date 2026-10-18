import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const ROOT = resolve('.');
const HISTORICAL_PANEL = 'C:\\Users\\arnot\\.codex\\visualizations\\2026\\10\\17\\01a14afb-f993-7171-b422-c21e6f8aa1e2\\divin-continuation-baseline\\js\\ui\\v5-divine-panel.js';
const serveHistoricalPanel = process.argv.includes('--historical-panel');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const launch = { headless: true, ...(existsSync(EDGE) ? { executablePath: EDGE } : {}) };
const mime = { '.css':'text/css','.html':'text/html','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml' };
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/js/ui/workspace.css"></head><body><main id="mount"></main><script type="module">
import {createDivinePanel} from '/js/ui/v5-divine-panel.js';
const actor={id:'priest',name:'Prêtresse',extensions:{v5:{divine:{sin:0}}}};
const panel=createDivinePanel({Store:{resolveDivineAccess:()=>({allowed:true,mode:'sheet',reason:'Accès établi.'}),getDivineAccessGrants:()=>[]},refresh:render});
function render(){document.querySelector('#mount').replaceChildren(panel.render(actor,[actor]));}
render();
</script></body></html>`;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
    if (url.pathname === '/__source__') { res.writeHead(200, { 'Content-Type': 'text/html' }).end(html); return; }
    if (serveHistoricalPanel && url.pathname === '/js/ui/v5-divine-panel.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-cache' }).end(await readFile(HISTORICAL_PANEL)); return;
    }
    const raw = decodeURIComponent(url.pathname), safe = normalize(raw).replace(/^(\.\.[/\\])+/, '');
    const path = resolve(join(ROOT, safe));
    if (!path.startsWith(ROOT)) throw new Error('outside root');
    const info = await stat(path), file = info.isDirectory() ? join(path, 'index.html') : path;
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(await readFile(file));
  } catch { res.writeHead(404).end('Not found'); }
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
let browser;
try {
  browser = await chromium.launch(launch);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/__source__`, { waitUntil: 'networkidle' });
  assert.deepEqual(errors, [], 'le panneau démarre sans erreur JavaScript');
  await page.waitForSelector('[data-divine-panel]');
  await page.locator('[data-divine-panel] > summary').click();
  const select = page.locator('[aria-label="Prière divine"]');
  const target = await select.locator('option').evaluateAll(options => options.find(option => option.textContent.includes('Commander la Légion'))?.value);
  assert.ok(target, 'un miracle V4 retrouvé et bloqué est disponible au choix dans le panneau');
  await select.selectOption(target);
  const source = await page.locator('[data-divine-panel] .workspace-divine-content p.workspace-muted').filter({ hasText: 'Source :' }).innerText();
  assert.match(source, /Up in arms\.pdf.*V4.*p\. 79/i, 'le formulaire affiche le document, l’édition V4 et le folio attestés par le contrat');
  assert.match(source, /adaptation V4 retrouvée.*contrat V5 bloqué/i, 'la provenance n’est pas présentée comme une adaptation V5');
  assert.doesNotMatch(source, /livre V5/i, 'le panneau ne rebaptise pas la source V4 en livre V5');
  assert.deepEqual(errors, [], 'le geste de sélection ne provoque pas d’erreur navigateur');
  console.log('E2/E3 UI source indépendante: source V4 p.79 correctement affichée.');
} finally {
  await browser?.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
