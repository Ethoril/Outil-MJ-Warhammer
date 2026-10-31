import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Q42 : (1) le rappel d'un participant en jeu s'affiche sur la fiche du personnage actif (onglet Jouer), « Fait » le retire ;
// (2) la section « Compétences sans valeur imprimée » de la fiche est masquée quand elle est vide et visible sinon.
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
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/blank`);
  await page.setContent('<main><div id="mount"></div><div id="fiche"></div></main>');
  const base = `http://127.0.0.1:${port}`;
  await page.evaluate(async ({ base }) => {
    const { initWorkspaceView } = await import(base + '/js/ui/workspace-view.js');
    const { buildParticipantFromBestiary } = await import(base + '/js/core/bestiary-profiles.js');
    const { createStore } = await import(base + '/js/core/store.js');
    const books = await Promise.all(['L18', 'L19', 'L20', 'L21', 'L23'].map(async id => (await (await fetch(base + '/js/data/bestiary/' + id + '.json')).json()).profiles));
    let saved = null;
    const Store = createStore({ persistence: { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }, storage: null });
    await Store.ready;
    await Store.addParticipant(buildParticipantFromBestiary('E0-P-593', { library: books.flat(), zone: 'active' }));
    initWorkspaceView({ Store, Bus: { on() {} }, mount: document.querySelector('#mount'), actions: {} });
  }, { base });

  await page.getByRole('tab', { name: 'Jouer' }).click();
  const sheet = page.locator('.workspace-actor-sheet.workspace-sheet-actor');
  // Les rappels de Traits (Régénération, Increvable, Infecté : T3/T8, 23/10) s'ajoutent à celui de l'armure : on cible l'armure.
  const armour = sheet.locator('.actor-reminder', { hasText: 'Armure imprimée' });
  check(await armour.count() === 1, 'le rappel d’armure du participant est affiché sur la fiche du personnage actif');
  check(/Armure imprimée/.test(await armour.first().innerText()), 'le texte est celui du rappel d’armure');
  await armour.locator('.btn-reminder[data-decision="resolve"]').click();
  await page.waitForTimeout(100);
  check(await page.locator('.workspace-actor-sheet .actor-reminder', { hasText: 'Armure imprimée' }).count() === 0, '« Fait » retire le rappel d’armure');

  const titles = await page.evaluate(async ({ base }) => {
    const { renderFicheDetails } = await import(base + '/js/ui/fiche-details.js');
    const summaries = subject => Array.from(renderFicheDetails(subject).querySelectorAll('summary')).map(node => node.textContent);
    return { empty: summaries({ extensions: { v5: { bestiary: { unvaluedSkills: [] } } } }), full: summaries({ extensions: { v5: { bestiary: { unvaluedSkills: ['Language (Elthárin)'] } } } }) };
  }, { base });
  check(!titles.empty.some(text => /sans valeur imprimée/.test(text)), 'section masquée quand aucune compétence sans valeur');
  check(titles.full.some(text => /sans valeur imprimée.*\(1\)/.test(text)), 'section visible avec ses compétences');
  check(pageErrors.length === 0, 'aucune erreur de page (' + (pageErrors[0] || 'rien') + ')');
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
if (failures.length) { console.error(failures.length + ' contrôle(s) en échec.'); process.exit(1); }
console.log('pro-q42-interface-browser : tous les contrôles sont au vert.');
