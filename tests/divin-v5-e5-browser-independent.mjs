/** Independent browser check of the existing end-turn control and native IndexedDB persistence. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const EVIDENCE = join(ROOT, 'tmp', 'divin', 'e5-browser-independent');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const launch = { headless: true, ...(existsSync(EDGE) ? { executablePath: EDGE } : {}) };
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head><body>
<main><h1>Contrôle indépendant E5</h1><div id="combat-banner"></div><div id="history"><button id="undo">Annuler</button><button id="redo">Rétablir</button></div><pre id="state" style="max-width:100%;max-height:12rem;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere"></pre></main>
<script type="module">
import {createStore} from '/js/core/store.js';
import {createPersistence} from '/js/core/persistence.js';
import {createCombatEngine} from '/js/core/combat.js';
import {initCombatBanner} from '/js/ui/combat-banner.js';
import {getAllDivineContracts} from '/js/core/v5-divine-store.js';
const DB='divine-e5-independent-native-idb-${RUN_ID}';
const persistence=createPersistence({indexedDB,dbName:DB,contextId:'e5-independent'});
const Store=createStore({storage:null,persistence,contextId:'e5-independent'});await Store.ready;
const Combat=createCombatEngine(Store);
const actor=(id,name,initiative)=>({id,name,kind:'PJ',camp:'pj',zone:'active',initiative,hp:20,maxHp:20,caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},skills:[{id:'pray',name:'Prière',status:'resolved',carac:'Soc',total:60}],talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],prayers:[],equipment:[],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{divine:{sin:0}}}});
if(Store.getCombat().participants.size===0) {
  await Store.loadFromJSON(JSON.stringify({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[actor('priest','Prêtresse',60),actor('ally','Allié',30)]},diceLines:[],log:[],extensions:{v5:{turnIndex:1}}}));
  const battle=getAllDivineContracts().find(row=>row.id==='divine:blessing:myrmidia:battle');
  const prayer=Store.previewDivineExecution(battle.id,{actorId:'priest',targetIds:['ally'],roll:45,canSpeak:true,
    choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}},
    expiry:{phase:'endOfTurn',round:6,actorId:'priest',moment:'afterEffects'}});
  if(!prayer.ready) throw Error(prayer.error||'fixture de bénédiction impossible');
  await Store.applyDivineExecution(battle.id,{preview:prayer});
  const ally=Store.listParticipants().find(row=>row.id==='ally'),v5=ally.extensions.v5;
  await Store.updateParticipant('ally',{extensions:{...ally.extensions,v5:{...v5,divineEffects:v5.divineEffects.map(layer=>({...layer,expiry:{
    phase:'endOfTurn',round:1,actorId:'ally',turn:2,moment:'afterEffects'
  }}))}}});
}
const current=()=>JSON.parse(Store.getFullJSON());
const render=()=>{banner?.render();document.querySelector('#state').textContent=JSON.stringify(current(),null,2);document.querySelector('#undo').disabled=!Store.canUndo();document.querySelector('#redo').disabled=!Store.canRedo();};
const banner=initCombatBanner({Store,mount:document.querySelector('#combat-banner'),onAdvance:async()=>{const result=await Combat.nextTurn();if(result?.ok===false)throw Error(result.error||'Transition refusée');await Store.whenIdle?.();render();return result;}});
document.querySelector('#undo').onclick=async()=>{await Store.undo();await Store.whenIdle?.();render();};
document.querySelector('#redo').onclick=async()=>{await Store.redo();await Store.whenIdle?.();render();};
banner.render('play');window.__E5__={Store,Combat,persistence,banner,render,current};render();
</script></body></html>`;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
    if (url.pathname === '/__e5__') { res.writeHead(200, { 'Content-Type': 'text/html' }).end(html); return; }
    const raw = decodeURIComponent(url.pathname), safe = normalize(raw).replace(/^(\.\.[/\\])+/, ''), path = resolve(join(ROOT, safe));
    if (!path.startsWith(ROOT)) throw new Error('outside root');
    const info = await stat(path), file = info.isDirectory() ? join(path, 'index.html') : path;
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(await readFile(file));
  } catch { res.writeHead(404).end('Not found'); }
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
await mkdir(EVIDENCE, { recursive: true });
let browser;
try {
  browser = await chromium.launch(launch);
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage(); page.setDefaultTimeout(8000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/__e5__`, { waitUntil: 'networkidle' });
  const next = page.getByRole('button', { name: 'Tour suivant' });
  await next.waitFor({ state: 'visible', timeout: 8000 }).catch(async error => {
    throw new Error(`${error.message}\nUI=${await page.locator('#combat-banner').innerText().catch(() => '')}\nHTML=${await page.locator('#combat-banner').innerHTML().catch(() => '')}\nSTATE=${await page.evaluate(()=>JSON.stringify({combat:window.__E5__.Store.getCombat(),json:window.__E5__.current()})).catch(()=> '')}\nPAGE_ERRORS=${JSON.stringify(errors)}`);
  });
  const initial = await page.evaluate(() => window.__E5__.current());
  assert.equal(initial.combat.currentActorId, 'priest');
  assert.equal(initial.combat.round, 1);
  assert.equal(initial.extensions.v5.gameClock.campaignSeconds, 0);
  assert.equal(initial.combat.participants.find(row => row.id === 'ally').extensions.v5.divineEffects.length, 1,
    'la fixture démarre avec une couche divine source-valid à échéance explicite');

  // The real component button advances two distinct actors and then crosses the Round boundary.
  await next.click();
  await page.waitForFunction(() => window.__E5__.Store.getCombat().currentActorId === 'ally');
  let afterFirst = await page.evaluate(() => window.__E5__.current());
  assert.equal(afterFirst.combat.round, 1);
  assert.equal(afterFirst.extensions.v5.gameClock.campaignSeconds, 0);
  assert.equal(afterFirst.extensions.v5.gameClock.combat.turnIndex, 2);
  await next.click();
  await page.waitForFunction(() => window.__E5__.Store.getCombat().currentActorId === 'priest' && window.__E5__.Store.getCombat().round === 2);
  const afterRound = await page.evaluate(() => window.__E5__.current());
  assert.equal(afterRound.extensions.v5.gameClock.campaignSeconds, 10, 'un seul franchissement de Round ajoute dix secondes');
  assert.equal(afterRound.extensions.v5.gameClock.combat.round, 2);
  assert.equal(afterRound.extensions.v5.gameClock.combat.turnIndex, 3);
  assert.equal(afterRound.extensions.v5.gameClock.lastEvent.resultRevision, afterRound.extensions.v5.gameClock.revision);
  assert.equal(afterRound.combat.participants.find(row => row.id === 'ally').extensions.v5.divineEffects.length, 0,
    'le clic qui franchit le Round expire la couche arrivée à son Tour 2');
  await page.screenshot({ path: join(EVIDENCE, 'round-transition.png') });

  // Reload creates a fresh Store over the same native IndexedDB context.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__E5__?.Store?.getCombat()?.currentActorId));
  const reloaded = await page.evaluate(() => window.__E5__.current());
  assert.deepEqual(reloaded.extensions.v5.gameClock, afterRound.extensions.v5.gameClock, 'IDB reload restores the clock receipt with combat position');
  assert.deepEqual(reloaded.combat, afterRound.combat, 'IDB reload restores the combat transition in the same snapshot');

  // A stale preview must not commit after a management command changes the revision.
  const stalePreview = await page.evaluate(() => window.__E5__.Combat.previewNextTurn());
  assert.equal(stalePreview.ready, true, stalePreview.error);
  await page.evaluate(async () => window.__E5__.Store.setRoundTurn(2, 'ally'));
  const staleApply = await page.evaluate(async preview => window.__E5__.Combat.nextTurn({ baseRevision: preview.baseRevision }), stalePreview);
  assert.ok(staleApply.status === 'stale' || staleApply.requiresPreview === true,
    `l’aperçu périmé doit être refusé après changement de position; reçu=${JSON.stringify(staleApply)}`);

  // Undo and redo through visible controls restore one coherent position/clock pair.
  const beforeUndo = await page.evaluate(() => window.__E5__.current());
  await page.getByRole('button', { name: 'Annuler' }).click();
  const undone = await page.evaluate(() => window.__E5__.current());
  assert.deepEqual(undone.extensions.v5.gameClock, afterRound.extensions.v5.gameClock, 'Undo de la mutation de position restaure le snapshot pré-management complet');
  assert.deepEqual(undone.combat, afterRound.combat);
  await page.getByRole('button', { name: 'Rétablir' }).click();
  const redone = await page.evaluate(() => window.__E5__.current());
  assert.deepEqual(redone.extensions.v5.gameClock, beforeUndo.extensions.v5.gameClock, 'Redo rétablit ensemble le snapshot et sa clock');
  assert.deepEqual(redone.combat, beforeUndo.combat);
  await page.reload({ waitUntil: 'networkidle' });
  const afterRedoReload = await page.evaluate(() => window.__E5__.current());
  assert.deepEqual(afterRedoReload.extensions.v5.gameClock, redone.extensions.v5.gameClock);
  assert.deepEqual(errors, [], 'aucune erreur JavaScript navigateur');
  const receipt = { ok: true, persistence: 'IndexedDB natif, même contexte après reload', gesture: 'bouton production initCombatBanner « Tour suivant »', checks: [
    '2 acteurs puis nouveau Round via clics réels', 'clock, position et couche divine expirée dans la même transition persistée', 'reload IDB', 'preview refusé après changement de révision', 'Undo/Redo et reload après Redo'
  ], errors, screenshot: join(EVIDENCE, 'round-transition.png') };
  await writeFile(join(EVIDENCE, 'receipt.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
  await context.close();
} finally { await browser?.close(); await new Promise(resolveClose => server.close(resolveClose)); }
