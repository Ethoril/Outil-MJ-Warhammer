import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url));
const mime={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
function startServer(){
  const server=createServer((req,res)=>{const path=decodeURIComponent((req.url||'/').split('?')[0]),file=join(root,normalize(path==='/'?'/index.html':path));try{if(!file.startsWith(root)||!statSync(file).isFile())throw Error('missing');res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Access-Control-Allow-Origin':'*'});res.end(readFileSync(file));}catch{res.writeHead(404);res.end('Not found');}});
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve({server,port:server.address().port}));});
}

const {server,port}=await startServer();
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined)});
try{
  const context=await browser.newContext({serviceWorkers:'block'});await context.route('**/*',route=>route.request().url().startsWith(`http://127.0.0.1:${port}/`)?route.continue():route.abort());
  const page=await context.newPage();await page.goto(`http://127.0.0.1:${port}/blank`);await page.setContent('<main><div id="mount"></div></main>');await page.addStyleTag({path:join(root,'MJ.css')});await page.addStyleTag({path:join(root,'js/ui/workspace.css')});
  await page.evaluate(async({moduleUrl,resolutionUrl})=>{
    const{initWorkspaceView}=await import(moduleUrl),{previewResolution}=await import(resolutionUrl);
    const actor={id:'hero',name:'Héros',kind:'PJ',camp:'pj',zone:'active',initiative:40,hp:8,maxHp:12,caracs:{CC:40,E:30,F:30,Ag:35},armor:{},skills:[],talents:[],equipment:[],traits:[],states:[],extensions:{v5:{}}};
    const combat={round:1,currentActorId:'hero',order:['hero'],participants:new Map([[actor.id,actor]])},handlers=new Map();
    const Store={listEncounters:()=>[],getActiveScene:()=>null,listSuspendedScenes:()=>[],listProfiles:()=>[],listParticipants:()=>[...combat.participants.values()],getCombat:()=>combat,getEffectiveOrder:()=>['hero'],getDiceLines:()=>[],getFullJSON:()=>JSON.stringify({combat:{round:1,participants:[actor]},extensions:{v5:{}}}),previewResolution:input=>previewResolution({...input,target:null}),resolveDivineAccess:()=>({allowed:false,code:'DIVINE_DATA_REQUIRED',reason:'Test.'}),getDivineAccessGrants:()=>[],getDivineSinReminders:()=>[],
      previewAmputationShock:({participantId,criticalId})=>{const rec=combat.participants.get(participantId)?.extensions?.v5?.criticalAftermath?.find(row=>row.id===criticalId);return rec?{status:'requires-input',requirements:rec.requirements}:{status:'blocked'};},
      async updateParticipant(id,patch){Object.assign(combat.participants.get(id),patch);return{ok:true};},canUndo:()=>false,undo:()=>false};
    window.workspaceTest=initWorkspaceView({Store,Bus:{on:(event,fn)=>handlers.set(event,fn)},mount:document.querySelector('#mount'),actions:{renderOverview(){},showPlay(){}}});
    window.amputationHarness={actor,combat,handlers};
  },{moduleUrl:`http://127.0.0.1:${port}/js/ui/workspace-view.js`,resolutionUrl:`http://127.0.0.1:${port}/js/core/resolution.js`});
  await page.getByRole('tab',{name:'Jouer'}).click();
  await page.evaluate(()=>{const actor=window.amputationHarness.actor;actor.extensions.v5.criticalAftermath=[
    {id:'conditional',effectName:'Crushed Foot',requirements:[{part:'toes',difficultyDR:2,conditional:true}]},
    {id:'unconditional',effectName:'Severed Finger',requirements:[{part:'finger',difficultyDR:2,conditional:false}]}
  ];window.amputationHarness.handlers.get('combat')?.();});
  const rows=page.locator('.workspace-critical-amputation-controls');
  assert.equal(await rows.count(),2,'les deux amputations sont présentées séparément');
  assert.equal(await rows.nth(0).locator('select option[value="false"]').count(),1,'le refus est disponible pour l’amputation conditionnelle');
  assert.equal(await rows.nth(1).locator('select option[value="false"]').count(),0,'le refus est absent pour Severed Finger');
  await rows.nth(0).locator('select[aria-label^="Amputation effectivement survenue"]').selectOption('false');
  await rows.nth(0).getByRole('button',{name:'Enregistrer le choc'}).click();
  assert.equal(await rows.count(),1,'le choix Non ferme le suivi conditionnel');
  assert.equal(await page.evaluate(()=>window.amputationHarness.actor.extensions.v5.criticalAftermath[0].amputationShockStatus),'not-occurred','le choix Non est écrit dans l’état du participant');
  console.log('UI amputation : Non autorisé pour une amputation conditionnelle, refusé pour Severed Finger, et suivi fermé après sauvegarde.');
}finally{await browser.close();server.close();}
