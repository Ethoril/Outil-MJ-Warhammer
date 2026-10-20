import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const mime = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
const CALM_LABEL = 'Test de Calme de l’attaquant (Bénédiction de Protection)';
const REVERSE_LABEL = 'Inverser les dés de ce Test (Fortune généreuse : 82 devient 28)';
const QUICK_LABEL = 'Attaque rapide (Myrmidia) : attaque gratuite hors séquence';

function startServer() {
  const server = createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    try {
      const file = join(root, normalize(requestPath));
      if (!file.startsWith(root) || !statSync(file).isFile()) throw new Error('not found');
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'text/plain; charset=utf-8' });
      res.end(readFileSync(file));
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function findExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);
  return candidates.find(candidate => { try { return statSync(candidate).isFile(); } catch { return false; } });
}

const failures = [];
const pageErrors = [];
const check = (ok, description) => {
  if (ok) console.log('PASS — ' + description);
  else { failures.push(description); console.log('FAIL — ' + description); }
};

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
    const {previewResolution}=await import('/js/core/resolution.js');
    // Rend le panneau avec un harnais minimal et enregistre les appels de handlers dans window.__calls.
    window.__render = spec => {
      document.querySelector('#mount').textContent = '';
      const calls = [];
      const handlers = {
        select: payload => calls.push({ kind: 'select', payload }),
        input: (key, value) => calls.push({ kind: 'input', key, value }),
        roll: () => {}, calculate: () => {}, compare: () => {}, choose: () => {}, apply: () => {}, cancel: () => {}
      };
      const actor = { id: 'actor', name: 'Attaquant', camp: spec.actorCamp, caracs: { CC: 50, Ag: 40, E: 40, F: 40 } };
      if (spec.actorDivine || spec.actorQuick) {
        const layers = [];
        if (spec.actorDivine) layers.push({ id: 'l1', reverseDice: { remaining: 1 } });
        if (spec.actorQuick) layers.push({ id: 'l2', freeAttack: { scope: 'round', test: { attr: 'I', slModifier: 0 } } });
        actor.extensions = { v5: { divineEffects: layers } };
      }
      const target = { id: 'target', name: 'Cible', camp: spec.targetCamp, caracs: { CC: 45, Ag: 40, E: 40, F: 40 } };
      if (spec.targetDivine) target.extensions = { v5: { divineEffects: [{ id: 'l1', attackDeterrent: { skill: 'Calme', slBonus: 2, ...(spec.passedActor ? { passedAttackerIds: ['actor'] } : {}), ...(spec.passedOther ? { passedAttackerIds: ['other'] } : {}) } }] } };
      const actions = [{ id: 'a1', type: 'attack', attr: 'CC', note: 'Attaque', base: 50, damage: 5 }];
      const section = renderResolutionPanel({
        draft: { v5Context: {}, reverseDice: spec.reverse === true, preview: spec.hint ? {...previewResolution({actor,action:{type:'test',base:50},roll:82}),reverseDiceHint:spec.hint} : null },
        actor,
        participants: [actor, target],
        actions,
        actionKey: 'a1',
        type: 'attack',
        target,
        groups: { allies: [], adversaries: [target] },
        defense: { options: [], option: { value: 'CC', statLabel: 'CC' } },
        canCalculate: true,
        canApply: true,
        handlers
      });
      document.querySelector('#mount').appendChild(section);
      window.__calls = calls;
    };
  }, { moduleUrl: `http://127.0.0.1:${port}/js/ui/resolution-panel.js` });


  const hint=page.getByText('L’inversion (28) réussirait ce Test.',{exact:true});
  await page.evaluate(()=>window.__render({actorCamp:'pj',targetCamp:'ennemi',actorDivine:true,hint:{reversed:28,wouldSucceed:true}}));
  check(await hint.count()===1,'indice A6 visible à côté de la case');
  await page.evaluate(()=>window.__render({actorCamp:'pj',targetCamp:'ennemi',actorDivine:true}));
  check(await hint.count()===0,'aucun indice si absent de l’aperçu');
  await page.evaluate(()=>window.__render({actorCamp:'pj',targetCamp:'ennemi',actorDivine:true,reverse:true,hint:{reversed:28,wouldSucceed:true}}));
  check(await hint.count()===0,'aucun indice si inversion déjà demandée');
  check(pageErrors.length===0,'aucune erreur de page : '+pageErrors.join('; '));await context.close();
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
if(failures.length)process.exitCode=1;
