import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
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
        draft: { v5Context: {} },
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

  const calmSelect = page.locator(`select[aria-label="${CALM_LABEL}"]`);
  const reverseCheckbox = page.locator(`input[type="checkbox"][aria-label="${REVERSE_LABEL}"]`);
  const lastCall = () => page.evaluate(() => window.__calls[window.__calls.length - 1]);

  // a) Attaque d’un ennemi sur une cible porteuse d’une couche attackDeterrent.
  await page.evaluate(() => window.__render({ actorCamp: 'ennemi', targetCamp: 'pj', targetDivine: true }));
  check(await calmSelect.count() === 1, 'attaque ennemie sur cible avec attackDeterrent : le sélecteur de Test de Calme de l’attaquant est affiché');
  await calmSelect.selectOption('pass');
  let call = await lastCall();
  check(call?.kind === 'select' && call.payload?.v5Context?.protectionCalm?.success === true,
    'choisir « Réussite » appelle handlers.select avec protectionCalm { success: true }');
  await calmSelect.selectOption('fail');
  call = await lastCall();
  check(call?.kind === 'select' && call.payload?.v5Context?.protectionCalm?.success === false,
    'choisir « Échec » appelle handlers.select avec protectionCalm { success: false }');

  // b) Cible sans couche divine, puis attaquant et cible du même camp.
  await page.evaluate(() => window.__render({ actorCamp: 'ennemi', targetCamp: 'pj', targetDivine: false }));
  check(await calmSelect.count() === 0, 'cible sans couche divine : aucun sélecteur de Test de Calme de l’attaquant');
  await page.evaluate(() => window.__render({ actorCamp: 'pj', targetCamp: 'pj', targetDivine: true }));
  check(await calmSelect.count() === 0, 'attaquant et cible du même camp : aucun sélecteur de Test de Calme de l’attaquant');

  // c) Attaquant déjà enregistré (ou non) dans passedAttackerIds de la couche attackDeterrent.
  await page.evaluate(() => window.__render({ actorCamp: 'ennemi', targetCamp: 'pj', targetDivine: true, passedActor: true }));
  check(await calmSelect.count() === 0, 'attaquant déjà dans passedAttackerIds : aucun sélecteur de Test de Calme de l’attaquant');
  await page.evaluate(() => window.__render({ actorCamp: 'ennemi', targetCamp: 'pj', targetDivine: true, passedOther: true }));
  check(await calmSelect.count() === 1, 'passedAttackerIds ne contenant que l’attaquant : le sélecteur de Test de Calme de l’attaquant reste affiché');

  // d) Acteur porteur (ou non) d’une faveur d’inversion reverseDice.
  await page.evaluate(() => window.__render({ actorCamp: 'pj', targetCamp: 'ennemi', actorDivine: true }));
  check(await reverseCheckbox.count() === 1, 'acteur avec une couche reverseDice : la case « Inverser les dés » est affichée');
  await reverseCheckbox.check();
  call = await lastCall();
  check(call?.kind === 'select' && call.payload?.reverseDice === true,
    'cocher la case appelle handlers.select avec reverseDice: true');
  await page.evaluate(() => window.__render({ actorCamp: 'pj', targetCamp: 'ennemi', actorDivine: false }));
  check(await reverseCheckbox.count() === 0, 'acteur sans couche reverseDice : aucune case « Inverser les dés »');

  // e) Attaque rapide (Myrmidia) : case affichée seulement si l’acteur porte la couche freeAttack du miracle.
  const quickCheckbox = page.locator(`input[type="checkbox"][aria-label="${QUICK_LABEL}"]`);
  await page.evaluate(() => window.__render({ actorCamp: 'pj', targetCamp: 'ennemi', actorQuick: true }));
  check(await quickCheckbox.count() === 1, 'acteur avec la couche freeAttack : la case « Attaque rapide » est affichée');
  await quickCheckbox.check();
  call = await lastCall();
  check(call?.kind === 'select' && call.payload?.extraAttack === true && call.payload?.v5Context?.freeAttackTalent === 'divine-free-attack',
    'cocher la case appelle handlers.select avec extraAttack et freeAttackTalent \'divine-free-attack\'');
  await page.evaluate(() => window.__render({ actorCamp: 'pj', targetCamp: 'ennemi', actorQuick: false }));
  check(await quickCheckbox.count() === 0, 'acteur sans couche freeAttack : aucune case « Attaque rapide »');

  // A11 : fiche réelle, commande publique du Store observée, puis Annuler par un geste.
  await context.route('https://**', route => route.abort());
  const appPage = await context.newPage();
  appPage.on('pageerror', error => pageErrors.push(error.message));
  await appPage.goto(`http://127.0.0.1:${port}/index.html`);
  await appPage.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
  await appPage.evaluate(async () => {
    const {Store} = await import('/js/main.js');
    await Store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'guard',order:['guard'],participants:[
      {id:'guard',name:'Garde',kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,caracs:{I:40,CC:40,E:30},states:[{id:'bleed',key:'hemorragique',name:'Hémorragique',level:1}],
        extensions:{v5:{criticalWounds:[{id:'c1',name:'Entaille',location:'Bras gauche',round:2,stateIds:['bleed']}]}}}
    ]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
  });
  await appPage.getByRole('tab',{name:'Jouer',exact:true}).click();
  const registry=appPage.locator('.workspace-critical-wounds');
  check(await registry.count()===1 && /Entaille.*Bras gauche.*Round 2/.test(await registry.innerText()),'A11 : nom, localisation et Round visibles sur la fiche');
  await appPage.getByRole('button',{name:'Guérir Entaille de Garde',exact:true}).click();
  await registry.waitFor({state:'detached',timeout:7000});
  check(await appPage.evaluate(async()=>{const {Store}=await import('/js/main.js');await Store.whenIdle();return Store.listParticipants()[0].states.some(s=>s.id==='bleed') && Store.getLog().some(l=>l.detail?.kind==='heal-critical-wound' && l.actorId==='guard' && l.detail.critical?.id==='c1');}),'A11 : le bouton appelle la commande et conserve les États');
  await appPage.getByRole('button',{name:'Annuler',exact:true}).click();
  await registry.waitFor();
  check(await registry.count()===1,'A11 : Annuler restaure le registre dans la fiche');
  await appPage.close();
  check(pageErrors.length === 0, 'aucune erreur de page pendant le rendu (' + (pageErrors[0] || 'rien à signaler') + ')');
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

if (failures.length) {
  console.error(failures.length + ' contrôle(s) en échec.');
  process.exit(1);
}
console.log('divin-v5-p5-ui-browser : tous les contrôles sont au vert.');
