import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// // Q29 : une seule paire de listes de Taille par attaque naturelle dépendante de la Taille et pour Grand/Petit (rendu DOM réel, avant : listes en double).
const root = fileURLToPath(new URL('..', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };

function startServer() {
  const server = createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    try {
      const file = join(root, normalize(requestPath));
      if (!file.startsWith(root) || !statSync(file).isFile()) throw new Error('not found');
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'text/plain; charset=utf-8' });
      res.end(readFileSync(file));
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })); });
}
function findExecutable() {
  return [process.env.PLAYWRIGHT_EXECUTABLE_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    .filter(Boolean).find(candidate => { try { return statSync(candidate).isFile(); } catch { return false; } });
}

const failures = [];
const pageErrors = [];
const check = (ok, description) => { if (ok) console.log('PASS — ' + description); else { failures.push(description); console.log('FAIL — ' + description); } };

const { server, port } = await startServer();
const browser = await chromium.launch({ headless: true, executablePath: findExecutable() });
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.setContent('<main><div id="mount"></div></main>');
  await page.evaluate(async ({ moduleUrl }) => {
    const { renderResolutionPanel } = await import(moduleUrl);
    window.__renderAtk = spec => {
      document.querySelector('#mount').textContent = '';
      const actor = { id: 'beast', name: 'Bête', camp: 'ennemi', caracs: { CC: 50, F: 50, E: 40 }, traits: spec.traits, talents: spec.large ? [{ id: 'talent-large', status: 'resolved', rank: 1 }] : [] };
      const target = { id: 'hero', name: 'Héros', camp: 'pj', caracs: { CC: 40, E: 40 }, talents: [] };
      const handlers = { select: () => {}, input: () => {}, roll: () => {}, calculate: () => {}, compare: () => {}, choose: () => {}, apply: () => {}, cancel: () => {} };
      const actions = [{ id: 'a1', type: 'attack', label: 'Attaque', base: 50, attr: 'CC', damage: 6 }];
      document.querySelector('#mount').append(renderResolutionPanel({ draft: { v5Context: { naturalAttack: spec.natural } }, actor, participants: [actor, target], actions, actionKey: 'a1', type: 'attack', target,
        groups: { allies: [], adversaries: [target] }, defense: { option: { value: 'CC', statLabel: 'Corps à corps', v5: { kind: 'melee' } }, options: [] }, canCalculate: true, canApply: true, handlers }));
    };
  }, { moduleUrl: `http://127.0.0.1:${port}/js/ui/resolution-panel.js` });

  const sizeLists = (spec) => page.evaluate(s => { window.__renderAtk(s); return document.querySelectorAll('#mount select[aria-label="Taille de la cible"], #mount select[aria-label="Taille de l’auteur"]').length; }, spec);
  const beast = { traits: ['Tail', 'Stomp', 'Tongue', 'Bite'] };
  check(await sizeLists({ ...beast, natural: 'stomp' }) === 2, 'Piétinement : exactement 2 listes de Taille');
  check(await sizeLists({ ...beast, natural: 'tongue' }) === 2, 'Langue : exactement 2 listes de Taille');
  check(await sizeLists({ ...beast, natural: 'tail' }) === 2, 'Attaque caudale : exactement 2 listes de Taille');
  check(await sizeLists({ ...beast, natural: 'bite' }) === 0, 'Morsure : aucune liste de Taille');
  check(await sizeLists({ ...beast, natural: 'stomp', large: true }) === 2, 'Piétinement et talent Grand : toujours 2 listes');
  check(await sizeLists({ ...beast, natural: 'bite', large: true }) === 2, 'talent Grand seul : 2 listes');
  check(pageErrors.length === 0, 'aucune erreur de page (' + (pageErrors[0] || 'rien') + ')');
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
if (failures.length) { console.error(failures.length + ' contrôle(s) en échec.'); process.exit(1); }
console.log('pro-q29-tailles-ui-browser : tous les contrôles sont au vert.');
