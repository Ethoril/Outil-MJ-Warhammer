import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const EVIDENCE = join(ROOT,'tmp','divin','browser-independent');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const launch = { headless: true, ...(existsSync(EDGE) ? { executablePath: EDGE } : {}) };
const mime = { '.css':'text/css','.html':'text/html','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml' };
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head><body><div id="workspace-mount"></div><script type="module">
import {createStore} from '/js/core/store.js';import {initWorkspaceView} from '/js/ui/workspace-view.js';import registry from '/js/data/v5-divine-contracts.json' with {type:'json'};
let saved=localStorage.getItem('independent-divine-form-state');const hadSaved=Boolean(saved);const listeners=new Map();const bus={on(e,f){if(!listeners.has(e))listeners.set(e,new Set());listeners.get(e).add(f)},emit(e,...a){for(const f of listeners.get(e)||[])f(...a)}};
const Store=createStore({bus,persistence:{async load(){return saved?JSON.parse(saved):null},async saveAtomic({state}){saved=JSON.stringify(state);localStorage.setItem('independent-divine-form-state',saved);return {ok:true}}}});await Store.ready;
const sun=registry.contracts.find(c=>c.canonicalName==='Blazing Sun');const invocation=sun.requiredTalent.catalogueTalentId;
const priest={id:'priest',name:'Prêtresse',kind:'PJ',camp:'pj',zone:'active',init:55,hp:12,maxHp:12,caracs:{CC:35,CT:35,F:30,E:40,I:45,Ag:40,Dex:40,Int:50,FM:50,Soc:80},skills:[{id:'pray',name:'Pray',status:'resolved',total:80}],talents:[{id:invocation,status:'resolved',specialization:'Myrmidia',rank:1}],prayers:[{nom:sun.catalogueName}],actions:[],states:[{key:'sonne',name:'Sonné',level:2},{key:'souille',name:'Souillé',level:1}],armor:{head:0,body:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0},extensions:{v5:{baseCaracs:{Soc:80},divine:{sin:0}}}};
const ally={...structuredClone(priest),id:'ally',name:'Allié',talents:[],prayers:[],caracs:{...priest.caracs},skills:[],states:[],armor:{head:0,body:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0},extensions:{v5:{baseCaracs:{Soc:40}}}};
if(!hadSaved)await Store.loadFromJSON(JSON.stringify({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[priest,ally]},diceLines:[],log:[]}));
const view=initWorkspaceView({mount:document.getElementById('workspace-mount'),Store,Bus:bus,actions:{applyResolution:p=>Store.applyResolution(p),acquireStates:(...a)=>Store.acquireStates(...a),recoverState:(...a)=>Store.recoverState(...a),setStates:(...a)=>Store.setStates(...a),setMomentum:(...a)=>Store.setMomentum(...a)}});view.setSpace('play');window.__TEST__={Store,view,contracts:registry.contracts};
</script></body></html>`;

const server = createServer(async (req,res)=>{
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
    if (url.pathname === '/__form__') { res.writeHead(200,{'Content-Type':'text/html'}).end(html); return; }
    const raw = decodeURIComponent(url.pathname), safe = normalize(raw).replace(/^(\.\.[/\\])+/, ''), path = resolve(join(ROOT,safe));
    if (!path.startsWith(ROOT)) throw new Error('outside root');
    const info = await stat(path), file = info.isDirectory() ? join(path,'index.html') : path;
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'}).end(await readFile(file));
  } catch { res.writeHead(404).end('Not found'); }
});
await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
await mkdir(EVIDENCE,{recursive:true});
let browser;
try {
  browser = await chromium.launch(launch);
  const context = await browser.newContext({viewport:{width:1280,height:900}});
  const page = await context.newPage(); page.setDefaultTimeout(6000);
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/__form__`,{waitUntil:'networkidle'});
  await page.waitForSelector('[data-divine-panel]');
  const panel=page.locator('[data-divine-panel]');
  await panel.locator('summary').first().click();

  // Create then revoke a once grant through the actual panel controls.
  const prayerSelect=page.locator('[aria-label="Prière divine"]');
  await prayerSelect.selectOption('divine:miracle:appel-a-la-fureur');
  const grantBox=panel.locator('details.workspace-v5-context-details').filter({hasText:'Accès à la prière'});
  await grantBox.locator('[aria-label="Portée de la dérogation"]').selectOption('once');
  await grantBox.locator('[aria-label="Motif de la décision du MJ"]').fill('Contrôle navigateur indépendant E3');
  const screenshots=[];
  for (const option of [
    {width:1440,height:900,theme:'dark',name:'grant-desktop-dark.png'},
    {width:1440,height:900,theme:'light',name:'grant-desktop-parchment.png'},
    {width:390,height:844,theme:'dark',name:'grant-mobile-dark.png'},
    {width:390,height:844,theme:'light',name:'grant-mobile-parchment.png'}
  ]) {
    await page.setViewportSize({width:option.width,height:option.height});
    await page.evaluate(theme=>document.documentElement.setAttribute('data-theme',theme),option.theme);
    await page.evaluate(async()=>{window.scrollTo(0,document.body.scrollHeight);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));window.scrollTo(0,0);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
    await page.locator('[aria-label="Portée de la dérogation"]').waitFor({state:'visible'});
    const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,inner:innerWidth}));
    assert.ok(layout.width<=layout.inner,`débordement ${option.name}: ${layout.width}/${layout.inner}`);
    await page.screenshot({path:join(EVIDENCE,option.name),fullPage:true}); screenshots.push(option.name);
  }
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
  await grantBox.getByRole('button',{name:'Accorder cette dérogation'}).click();
  await page.waitForFunction(()=>window.__TEST__.Store.getDivineAccessGrants('priest').some(row=>row.prayerId==='divine:miracle:appel-a-la-fureur'&&row.status==='active'));
  const grantId=await page.evaluate(()=>window.__TEST__.Store.getDivineAccessGrants('priest').find(row=>row.prayerId==='divine:miracle:appel-a-la-fureur'&&row.status==='active').id);
  const refreshedGrantBox=panel.locator('details.workspace-v5-context-details').filter({hasText:'Accès à la prière'});
  await refreshedGrantBox.locator('summary').click();
  await refreshedGrantBox.locator('[aria-label="Raison de révocation"]').fill('Fin du contrôle indépendant');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:join(EVIDENCE,'revoke-mobile-dark.png'),fullPage:true}); screenshots.push('revoke-mobile-dark.png');
  await page.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));
  await page.screenshot({path:join(EVIDENCE,'revoke-mobile-parchment.png'),fullPage:true}); screenshots.push('revoke-mobile-parchment.png');
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
  await refreshedGrantBox.getByRole('button',{name:'Révoquer cette dérogation'}).click();
  await page.waitForFunction(id=>window.__TEST__.Store.getDivineAccessGrants('priest').some(row=>row.id===id&&row.status==='revoked'),grantId);
  assert.equal(await page.evaluate(id=>window.__TEST__.Store.getDivineAccessGrants('priest').find(row=>row.id===id)?.status,grantId),'revoked');

  // DIV-03: keep source yards but present the same numeric value as game meters in details and preview.
  await prayerSelect.selectOption('divine:miracle:appel-a-la-fureur');
  const furyAccess=panel.locator('details.workspace-v5-context-details').filter({hasText:'Accès à la prière'});
  if(!await furyAccess.evaluate(element=>element.open)) await furyAccess.locator('summary').click();
  await furyAccess.locator('[aria-label="Portée de la dérogation"]').selectOption('once');
  await furyAccess.locator('[aria-label="Motif de la décision du MJ"]').fill('Autorisation limitée pour contrôler le rendu DIV-03');
  await furyAccess.getByRole('button',{name:'Accorder cette dérogation'}).click();
  await page.waitForFunction(()=>window.__TEST__.Store.getDivineAccessGrants('priest').some(row=>row.prayerId==='divine:miracle:appel-a-la-fureur'&&row.status==='active'));
  const furyDetail=await panel.innerText();
  assert.match(furyDetail,/Cibles\s*:\s*Zone de 8 mètres/i,`le détail doit afficher 8 mètres de jeu; rendu=${furyDetail}`);
  assert.doesNotMatch(furyDetail,/Zone de 8 yards/i,'le panneau ne présente pas les yards comme unité de jeu');
  const furySource=await page.evaluate(()=>window.__TEST__.contracts.find(row=>row.id==='divine:miracle:appel-a-la-fureur'));
  assert.equal(furySource.params.targets.unit,'yards','la donnée source reste conservée en yards');
  assert.equal(furySource.source.printedPage,224,'le folio imprimé de provenance source reste intact');
  assert.equal(furySource.source.fileSha256,'53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de',
    'le hash du livre V5 source reste intact');
  await page.locator('[aria-label="Destinataire Allié"]').check();
  await page.locator('[aria-label="Allié · Portée / zone confirmée"]').selectOption('true');
  await page.locator('[aria-label="Le personnage peut prononcer la prière"]').selectOption('true');
  await page.locator('[aria-label="Jet de Prière (d100)"]').fill('23');
  await page.locator('[aria-label="Arbitrage DIV-05 pour pénalités incomparables"]').selectOption('sl');
  await page.locator('[aria-label="Motif de l’arbitrage MJ DIV-05"]').fill('Arbitrage explicite pour atteindre le preview DIV-03');
  await page.locator('[data-divine-action="calculate"]').click();
  await page.waitForSelector('.workspace-divine-preview');
  const furyPreview=await page.locator('.workspace-divine-preview').innerText();
  assert.match(furyPreview,/cibles\s+8 mètres de jeu/i,`l’aperçu doit reprendre la valeur métrique tout en conservant la provenance yards; rendu=${furyPreview}`);
  assert.doesNotMatch(furyPreview,/cibles\s+8 yards/i,'les yards ne sont pas l’unité d’usage affichée dans l’aperçu');

  // Fill the full Soleil form, including Sin and the Wrath consequence fields.
  await prayerSelect.selectOption('divine:miracle:soleil-flamboyant');
  const sins=panel.locator('details.workspace-v5-context-details').filter({hasText:'Péchés :'});
  await sins.locator(':scope > summary').click();
  await sins.locator('[aria-label="Total de Péchés"]').fill('1');
  await sins.locator('[aria-label="Raison de l’ajustement des Péchés"]').fill('Valeur fixée pour l’essai de table');
  await sins.getByRole('button',{name:'Enregistrer les Péchés'}).click();
  await page.waitForFunction(()=>window.__TEST__.Store.listParticipants().find(p=>p.id==='priest').extensions.v5.divine.sin===1);

  await page.locator('[aria-label="Destinataire Allié"]').check();
  await page.locator('[aria-label="Allié · Portée / zone confirmée"]').selectOption('true');
  await page.locator('[aria-label="Allié · Ne vénère pas Myrmidia"]').selectOption('true');
  await page.locator('[aria-label="Allié · Regarde le prêtre"]').selectOption('true');
  await page.locator('[aria-label="Le personnage peut prononcer la prière"]').selectOption('true');
  await page.locator('[aria-label="Jet de Prière (d100)"]').fill('21');
  const statesBox=panel.locator('details.workspace-v5-context-details').filter({hasText:'États appliqués au Test de Prière (Soc)'});
  if(!await statesBox.evaluate(element=>element.open)) await statesBox.locator('summary').click();
  await page.locator('[aria-label="Arbitrage DIV-05 pour pénalités incomparables"]').selectOption('sl');
  if(!await panel.locator('details.workspace-v5-context-details').filter({hasText:'États appliqués au Test de Prière (Soc)'}).evaluate(element=>element.open))
    await panel.locator('details.workspace-v5-context-details').filter({hasText:'États appliqués au Test de Prière (Soc)'}).locator('summary').click();
  await page.locator('[aria-label="Motif de l’arbitrage MJ DIV-05"]').fill('Malus SL retenu explicitement pour ce Test');
  const beforePrayerPreview=await page.evaluate(()=>{const state=JSON.parse(window.__TEST__.Store.getFullJSON());delete state.exportedAt;return state;});
  await page.locator('[data-divine-action="calculate"]').click();
  await page.waitForSelector('.workspace-divine-preview');
  const afterPrayerPreview=await page.evaluate(()=>{const state=JSON.parse(window.__TEST__.Store.getFullJSON());delete state.exportedAt;return state;});
  assert.deepEqual(afterPrayerPreview,beforePrayerPreview,'le geste Calculer est en lecture seule, y compris lorsque le Courroux est déclenché');
  assert.match(await page.locator('.workspace-divine-preview').innerText(),/Courroux divin déclenché/);
  await page.locator('.workspace-divine-preview [aria-label="Jet de Courroux (d100)"]').fill('78');
  await page.locator('[data-divine-action="calculate"]').click();
  await page.locator('.workspace-divine-preview [aria-label="Nom du profil confirmé"]').fill('Démon mineur');
  await page.locator('.workspace-divine-preview [aria-label="Blessures du profil"]').fill('10');
  await page.locator('.workspace-divine-preview [aria-label="Initiative du profil"]').fill('30');
  await page.locator('.workspace-divine-preview [aria-label="Distance d’apparition (2d10 m)"]').fill('8');
  await page.locator('.workspace-divine-preview [aria-label="Position d’apparition confirmée"]').fill('Au fond de la salle');
  await page.locator('.workspace-divine-preview [aria-label="Cible la plus proche désignée"]').selectOption('priest');
  await page.evaluate(()=>{
    const store=window.__TEST__.Store,original=store.previewDivineExecution;
    window.__TEST__.previewCalls=[];
    store.previewDivineExecution=(...args)=>{const result=original(...args);window.__TEST__.previewCalls.push(result);return result;};
  });
  await page.locator('[data-divine-action="calculate"]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-divine-action="apply"]')?.disabled);
  const resolvedText=await page.locator('.workspace-divine-preview').innerText();
  const wrathPreview=await page.evaluate(()=>window.__TEST__.previewCalls.at(-1));
  assert.equal(wrathPreview.wrathTableResult?.id,'wrath:88-88','le jet 78 augmenté de 10 Péchés atteint la ligne 88');
  assert.match(resolvedText,/démon inférieur/i,'le résultat de table est rendu dans le formulaire');
  await page.locator('[data-divine-action="apply"]').click();
  await page.waitForFunction(()=>window.__TEST__.Store.listParticipants().find(p=>p.id==='priest').extensions.v5.divine.sin===0);
  const applied=await page.evaluate(()=>{
    const rows=window.__TEST__.Store.listParticipants();
    const priest=rows.find(p=>p.id==='priest'),ally=rows.find(p=>p.id==='ally');
    return {sin:priest.extensions.v5.divine.sin,states:ally.states.map(s=>s.key||s.name),effects:ally.extensions?.v5?.divineEffects||[],summoned:rows.filter(p=>p.extensions?.v5?.divineWrathSummon).map(p=>p.name)};
  });
  assert.equal(applied.sin,0,'l’application du Courroux retire le Péché après résolution');
  assert.deepEqual(applied.summoned,['Démon mineur'],'B14 : le démon confirmé par le MJ est créé comme participant');
  assert.ok(applied.states.some(key=>/aveugle|blind/i.test(key)),'l’effet du Soleil aveugle sa cible admissible; le démon du Courroux reste un rappel MJ distinct');
  await page.reload({waitUntil:'networkidle'}); await page.waitForSelector('[data-divine-panel]');
  const reloaded=await page.evaluate(()=>({sin:window.__TEST__.Store.listParticipants().find(p=>p.id==='priest').extensions.v5.divine.sin,
    states:window.__TEST__.Store.listParticipants().find(p=>p.id==='ally').states.map(s=>s.key||s.name)}));
  assert.equal(reloaded.sin,0); assert.ok(reloaded.states.some(key=>/aveugle|blind/i.test(key)),'l’effet du Courroux persiste au reload');
  const historyBeforeUndo=await page.evaluate(()=>{
    const store=window.__TEST__.Store,history=store.getHistory();
    const sin=state=>state?.combat?.participants?.find(row=>row.id==='priest')?.extensions?.v5?.divine?.sin;
    return {canUndo:store.canUndo(),currentSin:sin(JSON.parse(store.getFullJSON())),past:history.past.map(command=>({type:command.type,
      beforeSin:sin(command.inverse?.state),afterSin:sin(command.result?.state)}))};
  });
  const undoResult=await page.evaluate(async()=>window.__TEST__.Store.undo());
  const undone=await page.evaluate(()=>({sin:window.__TEST__.Store.listParticipants().find(p=>p.id==='priest').extensions.v5.divine.sin,
    states:window.__TEST__.Store.listParticipants().find(p=>p.id==='ally').states.map(s=>s.key||s.name)}));
  assert.equal(undone.sin,1,`Undo restitue le Péché dépensé par le Courroux; history=${JSON.stringify(historyBeforeUndo)} undo=${JSON.stringify(undoResult)}`);
  assert.ok(!undone.states.some(key=>/aveugle|blind/i.test(key)),'Undo retire l’état ajouté par le résultat de table');
  assert.deepEqual(errors,[],'aucune erreur navigateur pendant les gestes');
  console.log(JSON.stringify({ok:true,revokedGrantId:grantId,soleil:resolvedText,applied,reloaded,undone,screenshots:EVIDENCE,files:screenshots},null,2));
  await context.close();
} finally { await browser?.close(); await new Promise(resolveClose=>server.close(resolveClose)); }
