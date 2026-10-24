import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Q28 : un capitaine qui n'a que « Maître à bord » doit voir le champ « à bord » (rendu DOM réel), et la réponse « oui » donne +niveaux DR.
const root = fileURLToPath(new URL('..', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
const COMMAND = 'skill-43_6f_6d_6d_61_6e_64_65_6d_65_6e_74-base';
const FIELD = 'Test de Commandement à bord d’un navire (Maître à bord)';

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
    window.__render = spec => {
      document.querySelector('#mount').textContent = '';
      const actor = { id: 'cap', name: 'Capitaine', camp: 'pj', caracs: { CC: 50, Soc: 50 }, talents: spec.talents };
      const target = { id: 'b', name: 'Matelot', camp: 'pj', caracs: { CC: 40, Soc: 40 }, talents: [] };
      const handlers = { select: () => {}, input: () => {}, roll: () => {}, calculate: () => {}, compare: () => {}, choose: () => {}, apply: () => {}, cancel: () => {} };
      const actions = [{ id: 'a1', type: 'test', note: 'Commandement', label: 'Commandement', base: 50, extensions: { fiche: { skillId: spec.skillId } } }];
      document.querySelector('#mount').append(renderResolutionPanel({ draft: { v5Context: {} }, actor, participants: [actor, target], actions, actionKey: 'a1', type: 'test', target,
        groups: { allies: [target], adversaries: [] }, defense: { options: [] }, canCalculate: true, canApply: true, handlers }));
    };
  }, { moduleUrl: `http://127.0.0.1:${port}/js/ui/resolution-panel.js` });

  const mac = [{ id: 'talent-master-and-commander', status: 'resolved', rank: 2 }];
  await page.evaluate(spec => window.__render(spec), { talents: mac, skillId: COMMAND });
  check(await page.getByLabel(FIELD).count() === 1, 'porteur de Maître à bord seul, Commandement : champ « à bord » visible');
  await page.evaluate(spec => window.__render(spec), { talents: [], skillId: COMMAND });
  check(await page.getByLabel(FIELD).count() === 0, 'sans le talent : pas de champ');
  await page.evaluate(spec => window.__render(spec), { talents: mac, skillId: 'none' });
  check(await page.getByLabel(FIELD).count() === 0, 'autre compétence : pas de champ');

  // Réponse « oui » : le moteur applique +niveaux DR.
  const sl = await page.evaluate(async ({ base, command }) => {
    const { buildCombatTest } = await import(base + '/js/core/v5-combat-rules.js');
    const actor = { id: 'cap', hp: 12, states: [], talents: [{ id: 'talent-master-and-commander', status: 'resolved', rank: 2 }] };
    const built = buildCombatTest({ actor, target: { id: 'b', hp: 12, states: [], talents: [] }, roll: 47,
      action: { type: 'test', label: 'Commandement', base: 50, extensions: { fiche: { skillId: command } } }, v5: { kind: 'test', context: { onBoardVessel: true } } });
    return built.test.options[0].result.sl;
  }, { base: `http://127.0.0.1:${port}`, command: COMMAND });
  check(sl === 3, 'réponse « oui » : DR 1 + 2 niveaux = 3 (obtenu ' + sl + ')');
  check(pageErrors.length === 0, 'aucune erreur de page (' + (pageErrors[0] || 'rien') + ')');
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
if (failures.length) { console.error(failures.length + ' contrôle(s) en échec.'); process.exit(1); }
console.log('pro-q28-maitre-a-bord-ui-browser : tous les contrôles sont au vert.');
