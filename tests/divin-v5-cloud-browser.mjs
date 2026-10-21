/** Two isolated browsers, native IDB and actual localhost Auth/RTDB serialization/CAS.
 * Production Store/session/protocol; REST bridge replaces only the Firebase SDK adapter.
 * Never accepts a non-loopback emulator or loads a real account.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {applyOperation} from '../js/core/sync-protocol.js';
import {normalizeRemoteDocument} from '../js/core/sync-session.js';
import {APP_VERSION} from '../js/version.js';
import {runBrokenEscapeCloudScenarios} from './divin-v5-broken-escape-cloud-scenarios.mjs';
import {runB7WrathCloudScenarios} from './divin-v5-b7-cloud-scenarios.mjs';
import {runB8WrathCloudScenarios} from './divin-v5-b8-cloud-scenarios.mjs';
import {runB9WrathCloudScenarios} from './divin-v5-b9-cloud-scenarios.mjs';
import {runB6WrathCloudScenarios} from './divin-v5-b6-cloud-scenarios.mjs';
import {runB5WrathCloudScenarios} from './divin-v5-b5-cloud-scenarios.mjs';
import {runB4WrathCloudScenarios} from './divin-v5-b4-cloud-scenarios.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const local=raw=>{const u=new URL('http://'+raw);assert.ok(['127.0.0.1','localhost','[::1]'].includes(u.hostname)&&u.port&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash);return u.origin;};
const db=local(process.env.FIREBASE_DATABASE_EMULATOR_HOST||'127.0.0.1:19000'),auth=local(process.env.FIREBASE_AUTH_EMULATOR_HOST||'127.0.0.1:19099');
const namespace='demo-divine-v5-'+Date.now(),checks=[],errors=[];
let token,uid,browser,server,origin;
const check=label=>{checks.push(label);console.log('PASS — '+label);};
async function request(path,{method='GET',body,owner=false,headers={}}={}){const response=await fetch(db+'/'+path+'.json?ns='+namespace+(owner?'&access_token=owner':'&auth='+encodeURIComponent(token)),{method,headers:{'content-type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});assert.ok([200,412].includes(response.status),'local RTDB status '+response.status);return response;}
const remote=()=>request('wfrp-sessions-v3/'+uid+'/current').then(r=>r.json());
async function transact(operation){const path='wfrp-sessions-v3/'+uid+'/current';for(let i=0;i<8;i++){const source=await request(path,{headers:{'X-Firebase-ETag':'true'}}),raw=await source.json(),current=normalizeRemoteDocument(raw),result=applyOperation(current,operation);if(!result.applied)return {status:'aborted',root:result.document};const committed=await request(path,{method:'PUT',body:result.document,headers:{'If-Match':source.headers.get('etag')}});if(committed.status===200)return {status:'committed',root:await committed.json()};}throw Error('CAS retries exhausted');}
const subject=(id,extra={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',init:id==='hero'?60:id==='ally'?50:40,hp:20,maxHp:30,caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},skills:[{name:'Prière',status:'resolved',carac:'soc',total:60}],armor:{head:0,body:0,arms:0,legs:0},states:[],talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],prayers:[],extensions:{v5:{resourceCharacterId:'divine-'+id,divine:{sin:0}}},...extra});
const fixture={schemaVersion:3,reserve:[],diceLines:[],extensions:{v5:{combatId:'qa-divine',turnIndex:1}},combat:{round:1,currentActorId:'hero',order:['hero','ally','enemy'],participants:[subject('hero'),subject('ally'),subject('enemy')]}};
async function boot(page,name){await page.evaluate(async({name,uid,version})=>{const[{createStore},{createPersistence},{createSyncSession},{createCombatEngine}]=await Promise.all([import('/js/core/store.js'),import('/js/core/persistence.js'),import('/js/core/sync-session.js'),import('/js/core/combat.js')]);const persistence=createPersistence({indexedDB,dbName:'qa-divine-native',contextId:'account:'+uid});if(!(await persistence.load()))await persistence.saveAtomic({state:{schemaVersion:3,reserve:[],combat:{round:0,order:[],participants:[]},diceLines:[],log:[{id:'journal-'+name,ts:1,kind:'management',text:'Journal local '+name}]}});const control={offline:false,loseAck:false,lostAckCount:0},statuses=[];const transport={async read(){if(control.offline)throw Error('QA offline');const r=await fetch('/qa/cloud');if(!r.ok)throw Error('read '+r.status);return r.json();},async transaction(operation){if(control.offline)throw Error('QA offline');const r=await fetch('/qa/cloud',{method:'POST',body:JSON.stringify(operation)});if(!r.ok)throw Error('transaction '+r.status);const value=await r.json();if(control.loseAck){control.loseAck=false;control.lostAckCount++;throw Error('QA lost acknowledgement');}return value;}};let session;const store=createStore({storage:null,persistence,contextId:'account:'+uid,appVersion:version,onSyncStatus:s=>statuses.push(s)});await store.ready;store.attachSync({contextId:'account:'+uid,createSession:options=>(session=createSyncSession({...options,deviceId:'qa-35-'+name,transport}))});const combat=createCombatEngine(store);window.qa35={store,combat,persistence,control,statuses,get session(){return session;},envelope:()=>JSON.parse(store.getFullJSON())};},{name,uid,version:APP_VERSION});await wait(page,()=>window.qa35.statuses.includes('synced'));}
async function wait(page,fn){await page.waitForFunction(fn,null,{timeout:20000});}
async function settled(page){const result=await page.evaluate(async()=>window.qa35.session.flush({localState:window.qa35.envelope()}));assert.equal(result.status,'synced');assert.equal(await page.evaluate(async()=>(await window.qa35.persistence.listOutbox()).length),0);}
async function pull(page){return page.evaluate(async()=>window.qa35.session.reconcile({localState:window.qa35.envelope()}));}
const envelope=page=>page.evaluate(()=>window.qa35.envelope());
const combatView=state=>({round:state.combat.round,currentActorId:state.combat.currentActorId,order:state.combat.order,
 participants:state.combat.participants.map(row=>({id:row.id,hp:row.hp,caracs:row.caracs,states:row.states,
  divineEffects:(row.extensions?.v5?.divineEffects||[]).map(layer=>({id:layer.id,executionId:layer.executionId,prayerId:layer.prayerId,
   casterId:layer.casterId,targetId:layer.targetId,type:layer.type,expiry:layer.expiry,statModifiers:layer.statModifiers,
   source:{fileSha256:layer.source?.fileSha256,printedPage:layer.source?.printedPage,section:layer.source?.section},
   sourceReceipt:{fileSha256:layer.sourceReceipt?.fileSha256,printedPage:layer.sourceReceipt?.printedPage,
    catalogueSnapshotSha256:layer.sourceReceipt?.catalogueSnapshotSha256}}))}))});
async function context(name){const ctx=await browser.newContext({viewport:{width:name==='A'?1440:390,height:900},serviceWorkers:'block'});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());await page.goto(origin+'/qa.html');await boot(page,name);return {ctx,page};}
try{
 const rules=readFileSync(resolve(root,'firebase.database.rules.json'),'utf8');const loaded=await fetch(db+'/.settings/rules.json?ns='+namespace+'&access_token=owner',{method:'PUT',headers:{'content-type':'application/json'},body:rules});assert.equal(loaded.status,200);
 const signup=await fetch(auth+'/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-qa-35',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'qa35-'+Date.now()+'@control.test',password:'password123',returnSecureToken:true})});assert.equal(signup.status,200);({idToken:token,localId:uid}=await signup.json());
 await request('wfrp-sessions-v3/'+uid+'/current',{method:'PUT',body:{revision:0,state:fixture}});
 const mime={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.html':'text/html'};
 server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(u.pathname==='/qa/cloud'){let value;if(req.method==='POST'){let body='';for await(const part of req)body+=part;value=await transact(JSON.parse(body));}else value=await remote();res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));return;}if(u.pathname==='/qa.html'){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Recette cloud V5</title><main>Recette locale 2.5</main>');return;}const path=resolve(root,'.'+decodeURIComponent(u.pathname));assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'});res.end(readFileSync(path));}catch(e){res.writeHead(500);res.end(e.message);}});await new Promise(done=>server.listen(0,'127.0.0.1',done));origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const a=await context('A'),b=await context('B');const A=a.page,B=b.page;
 const prayerId='divine:blessing:myrmidia:battle';
 const input={actorId:'hero',targetIds:['ally'],roll:45,canSpeak:true,choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true}}},expiry:{phase:'endOfTurn',round:6,actorId:'hero'}};
 await A.evaluate(async({prayerId,input})=>{const s=window.qa35.store,p=s.previewDivineExecution(prayerId,input);if(!p.ready)throw Error(p.error);await s.applyDivineExecution(prayerId,{preview:p});},{prayerId,input});await settled(A);await pull(B);
 assert.equal((await envelope(B)).combat.participants.find(p=>p.id==='ally').caracs.CC,50);assert.equal((await envelope(B)).combat.participants.find(p=>p.id==='ally').extensions.v5.divineEffects.length,1);check('Prière A : caractéristiques et couche divine effectivement reçues sur B');
 await A.reload();await boot(A,'A');await settled(A);await pull(B);assert.equal(await A.evaluate(()=>window.qa35.store.canUndo()),true);await A.evaluate(async()=>window.qa35.store.undo());await settled(A);await pull(B);assert.equal((await envelope(B)).combat.participants.find(p=>p.id==='ally').caracs.CC,40);check('IndexedDB natif, rechargement puis Annuler : retrait effectif reçu sur B');
 await A.evaluate(async()=>window.qa35.store.redo());await settled(A);await pull(B);assert.equal((await envelope(B)).combat.participants.find(p=>p.id==='ally').caracs.CC,50);check('Rétablir auteur : couche et valeur effectives synchronisées une seule fois');
 const grantActorId='enemy',grantTargetId='hero',grantActorTalents=await A.evaluate(()=>window.qa35.envelope().combat.participants.find(p=>p.id==='enemy').talents);
 await A.evaluate(async({actorId})=>{const r=await window.qa35.store.updateParticipant(actorId,{talents:[]});if(r?.ok===false)throw Error(r.error);},{actorId:grantActorId});await settled(A);await pull(B);
 assert.equal((await B.evaluate(({actorId,prayerId})=>window.qa35.store.resolveDivineAccess(actorId,prayerId),{actorId:grantActorId,prayerId})).allowed,false);
 const onceGrantId=await A.evaluate(async({actorId,prayerId})=>{const s=window.qa35.store,r=await s.grantDivineAccess(actorId,prayerId,{scope:'once',reason:'Autorisation exceptionnelle de recette',baseRevision:s.getLocalRevision()});if(!r.ok)throw Error(r.error);return r.grant.id;},{actorId:grantActorId,prayerId});await settled(A);await pull(B);
 const grantAccess=await B.evaluate(({actorId,prayerId})=>window.qa35.store.resolveDivineAccess(actorId,prayerId),{actorId:grantActorId,prayerId});assert.equal(grantAccess.allowed,true);assert.equal(grantAccess.mode,'grant');assert.equal(grantAccess.scope,'once');check('Dérogation ponctuelle créée par A, reçue et résolue par B sans talent d’accès');
 const grantInput=await B.evaluate(({input,actorId,targetId})=>({...input,actorId,targetIds:[targetId],facts:{targets:{[targetId]:{withinRange:true}}},expiry:{phase:'endOfTurn',round:window.qa35.store.getCombat().round+5,actorId}}),{input,actorId:grantActorId,targetId:grantTargetId});
 await B.evaluate(async({prayerId,input})=>{const s=window.qa35.store,p=s.previewDivineExecution(prayerId,input);if(!p.ready)throw Error(p.error);await s.applyDivineExecution(prayerId,{preview:p});},{prayerId,input:grantInput});await settled(B);await pull(A);
 const consumed=await A.evaluate(({actorId,grantId})=>{const s=window.qa35.store,g=s.getDivineAccessGrants(actorId).find(row=>row.id===grantId),state=JSON.parse(s.getFullJSON());return {grant:g,execution:state.extensions.v5.divineExecutions.find(row=>row.accessDecision?.grantId===grantId)};},{actorId:grantActorId,grantId:onceGrantId});assert.equal(consumed.grant.status,'consumed');assert.equal(consumed.execution.accessDecision.scope,'once');assert.equal((await envelope(A)).combat.participants.find(p=>p.id===grantTargetId).caracs.CC,50);check('Consommation ponctuelle par B reçue par A avec reçu d’accès et effet appliqué');
 await B.reload();await boot(B,'B');await settled(B);await pull(A);assert.equal(await B.evaluate(()=>window.qa35.store.canUndo()),true);await B.evaluate(async()=>window.qa35.store.undo());await settled(B);await pull(A);
 const restored=await A.evaluate(({actorId,grantId,targetId})=>{const state=window.qa35.envelope(),target=state.combat.participants.find(row=>row.id===targetId);return {grant:window.qa35.store.getDivineAccessGrants(actorId).find(row=>row.id===grantId),cc:target.caracs.CC,effects:target.extensions?.v5?.divineEffects||[]};},{actorId:grantActorId,grantId:onceGrantId,targetId:grantTargetId});assert.equal(restored.grant.status,'active');assert.equal(restored.cc,40);assert.equal(restored.effects.length,0);check('Après rechargement, Annuler dans B restaure ensemble la dérogation et la couche divine');
 await B.evaluate(({prayerId,input})=>{window.staleGrantPreview=window.qa35.store.previewDivineExecution(prayerId,input);if(!window.staleGrantPreview.ready)throw Error(window.staleGrantPreview.error);},{prayerId,input:grantInput});
 await A.evaluate(async({grantId})=>{const s=window.qa35.store,r=await s.revokeDivineAccessGrant(grantId,{reason:'Fin de la dérogation',baseRevision:s.getLocalRevision()});if(!r.ok)throw Error(r.error);},{grantId:onceGrantId});await settled(A);await pull(B);
 const staleRejected=await B.evaluate(async prayerId=>{try{await window.qa35.store.applyDivineExecution(prayerId,{preview:window.staleGrantPreview});return false;}catch{return true;}},prayerId);assert.equal(staleRejected,true);assert.equal((await B.evaluate(({actorId,grantId})=>window.qa35.store.getDivineAccessGrants(actorId).find(row=>row.id===grantId).status,{actorId:grantActorId,grantId:onceGrantId})),'revoked');assert.equal((await envelope(B)).combat.participants.find(p=>p.id===grantTargetId).caracs.CC,40);check('Révocation reçue de A invalide l’aperçu conservé par B sans effet résiduel');
 const raceGrantId=await A.evaluate(async({actorId,prayerId})=>{const s=window.qa35.store,r=await s.grantDivineAccess(actorId,prayerId,{scope:'once',reason:'Concurrence hors ligne de recette',baseRevision:s.getLocalRevision()});if(!r.ok)throw Error(r.error);return r.grant.id;},{actorId:grantActorId,prayerId});await settled(A);await pull(B);
 await B.evaluate(()=>{window.qa35.control.offline=true;});const localRaceExecution=await B.evaluate(async({prayerId,input})=>{const s=window.qa35.store,p=s.previewDivineExecution(prayerId,input);if(!p.ready)throw Error(p.error);const result=await s.applyDivineExecution(prayerId,{preview:p});if(result?.ok===false)throw Error(result.error);return p.executionId;},{prayerId,input:grantInput});await B.evaluate(()=>window.qa35.session.idle());
 const remoteRaceExecution=await A.evaluate(async({prayerId,input})=>{const s=window.qa35.store,p=s.previewDivineExecution(prayerId,input);if(!p.ready)throw Error(p.error);const result=await s.applyDivineExecution(prayerId,{preview:p});if(result?.ok===false)throw Error(result.error);return p.executionId;},{prayerId,input:grantInput});await settled(A);await B.evaluate(()=>{window.qa35.control.offline=false;});assert.equal((await pull(B)).status,'conflict');
 const raceConflict=JSON.parse(await B.evaluate(()=>window.qa35.store.exportSyncConflict()));const localRace=raceConflict.local.state,localGrant=localRace.extensions.v5.divineAccess.grants.find(row=>row.id===raceGrantId);assert.equal(localGrant.status,'consumed');assert.equal(localGrant.consumedBy,localRaceExecution);assert.ok(localRace.extensions.v5.divineExecutions.some(row=>row.executionId===localRaceExecution));assert.equal(localRace.combat.participants.find(row=>row.id===grantTargetId).caracs.CC,50);const remoteRace=raceConflict.remote.state;assert.equal(remoteRace.extensions.v5.divineAccess.grants.find(row=>row.id===raceGrantId).consumedBy,remoteRaceExecution);await B.evaluate(()=>window.qa35.store.resolveSyncRemote());await settled(B);await pull(A);check('Deux consommations concurrentes hors ligne : conflit explicite et branche locale exportable avec reçu et effet');
 await A.evaluate(async({actorId,talents})=>{const r=await window.qa35.store.updateParticipant(actorId,{talents});if(r?.ok===false)throw Error(r.error);},{actorId:grantActorId,talents:grantActorTalents});await settled(A);await pull(B);
 await B.evaluate(()=>{window.qa35.control.offline=true;});await B.evaluate(async()=>window.qa35.store.setDivineSin('hero',3,{reason:'Scénario local hors ligne'}));await B.evaluate(()=>window.qa35.session.idle());await A.evaluate(async()=>window.qa35.store.updateParticipant('enemy',{hp:19}));await settled(A);await B.evaluate(()=>{window.qa35.control.offline=false;});assert.equal((await pull(B)).status,'conflict');const conflict=JSON.parse(await B.evaluate(()=>window.qa35.store.exportSyncConflict()));assert.equal(conflict.local.state.combat.participants.find(p=>p.id==='hero').extensions.v5.divine.sin,3);await B.evaluate(()=>window.qa35.store.resolveSyncRemote());check('Péchés hors ligne : conflit explicite, total local conservé dans le point de restauration');
 await A.evaluate(async()=>{for(let i=0;i<18;i++)await window.qa35.store.nextTurn();});await settled(A);await pull(B);assert.equal((await envelope(B)).combat.participants.find(p=>p.id==='ally').caracs.CC,40);assert.equal((await envelope(B)).combat.participants.find(p=>p.id==='ally').extensions.v5.divineEffects?.length||0,0);check('Expiration par vrais Tours : retour de caractéristique reçu sur le second client');
 await B.evaluate(({prayerId,input})=>{window.divinePreview=window.qa35.store.previewDivineExecution(prayerId,{...input,expiry:{phase:'endOfTurn',round:window.qa35.store.getCombat().round+5,actorId:'hero'}});if(!window.divinePreview.ready)throw Error(window.divinePreview.error);},{prayerId,input});
 await B.evaluate(()=>{window.qa35.control.loseAck=true;});await B.evaluate(async prayerId=>window.qa35.store.applyDivineExecution(prayerId,{preview:window.divinePreview}),prayerId);await B.evaluate(async()=>{try{await window.qa35.session.flush({localState:window.qa35.envelope()});}catch(e){if(e.message!=='QA lost acknowledgement')throw e;}});assert.equal(await B.evaluate(()=>window.qa35.control.lostAckCount),1);const committed=await remote();await pull(B);await settled(B);assert.equal((await remote()).revision,committed.revision);assert.equal((await remote()).state.combat.participants.find(p=>p.id==='ally').caracs.CC,50);check('Accusé perdu : reprise sans second bonus, seconde couche ou seconde opération distante');
 const duplicate=await B.evaluate(async prayerId=>{try{await window.qa35.store.applyDivineExecution(prayerId,{preview:window.divinePreview});return false;}catch(e){return /changé|déjà/.test(e.message);}},prayerId);assert.equal(duplicate,true);check('Aperçu déjà confirmé refusé après reprise distante');

 // E5: actual Store.nextTurn transitions move the shared clock and divine layers in one syncable snapshot.
 await settled(A);await pull(B);await settled(B);await pull(A);
 const e5Before=await envelope(A);const e5Clock=e5Before.extensions?.v5?.gameClock;
 assert.ok(e5Clock,'la migration Store a initialisé la clock avant les Tours partagés');
 assert.deepEqual((await envelope(B)).extensions?.v5?.gameClock,e5Clock,'les clients commencent du même reçu de clock');
 const nextTurn=async page=>{
  const result=await page.evaluate(async()=>window.qa35.store.nextTurn());
  assert.notEqual(result?.ok,false,'Store.nextTurn committe la transition sans erreur');
  await page.evaluate(()=>window.qa35.session.idle());
 };
 await nextTurn(A);await settled(A);await pull(B);
 const afterA=await envelope(A),receivedOnB=await envelope(B),clockAfterA=afterA.extensions.v5.gameClock;
 assert.equal(clockAfterA.revision,e5Clock.revision+1);
 assert.ok(clockAfterA.lastEvent?.payloadFingerprint,'le reçu conserve l’empreinte complète de l’événement');
 assert.deepEqual(receivedOnB.extensions.v5.gameClock,clockAfterA,'la transition A est reçue sur B avec le même lastEvent');
 assert.deepEqual(combatView(receivedOnB),combatView(afterA),'position de combat et clock voyagent ensemble malgré les feuilles vides normalisées');
 check('E5 Store.nextTurn sur A : reçu clock et position synchronisés sur B');
 await A.reload();await boot(A,'A');await settled(A);await pull(B);
 assert.deepEqual((await envelope(A)).extensions.v5.gameClock,clockAfterA,'reload IndexedDB conserve le reçu après le Tour A');
 assert.equal(await A.evaluate(()=>window.qa35.store.canUndo()),true,'l’historique du Tour existe après reload');
 await A.evaluate(async()=>window.qa35.store.undo());await settled(A);await pull(B);
 assert.deepEqual((await envelope(A)).extensions.v5.gameClock,e5Clock,'Undo après reload restaure la clock d’avant le Tour');
 assert.deepEqual(combatView(await envelope(A)),combatView(e5Before),'Undo restaure en même temps la position');
 assert.deepEqual((await envelope(B)).extensions.v5.gameClock,e5Clock,'B reçoit le retour atomique d’Undo');
 await A.evaluate(async()=>window.qa35.store.redo());await settled(A);await pull(B);
 assert.deepEqual((await envelope(A)).extensions.v5.gameClock,clockAfterA,'Redo restaure le même reçu sans nouvelle avance');
 assert.deepEqual(combatView(await envelope(B)),combatView(afterA));
 check('E5 reload/Undo/Redo A : clock, reçu et position restent atomiques sur les deux clients');
 await nextTurn(B);await settled(B);await pull(A);
 const afterB=await envelope(B),receivedOnA=await envelope(A),clockAfterB=afterB.extensions.v5.gameClock;
 assert.equal(clockAfterB.revision,clockAfterA.revision+1);
 assert.deepEqual(receivedOnA.extensions.v5.gameClock,clockAfterB,'le Tour déclenché sur B revient vers A');
 assert.deepEqual(combatView(receivedOnA),combatView(afterB));
 check('E5 Store.nextTurn sur B : second reçu clock renvoyé vers A');

 // Both offline replicas calculate the same next Round from one CAS base. Only one branch may win remotely.
 let preparationTurns=0;
 while(!await A.evaluate(()=>window.qa35.combat.previewNextTurn().phases?.some(row=>row.phase==='startOfRound'))){
  assert.ok(preparationTurns<4,'l’ordre réel doit atteindre un franchissement de Round en au plus trois acteurs');
  await nextTurn(A);await settled(A);await pull(B);await settled(B);await pull(A);preparationTurns++;
 }
 assert.ok(await B.evaluate(()=>window.qa35.combat.previewNextTurn().phases?.some(row=>row.phase==='startOfRound')),
  'les deux répliques reçoivent le même état immédiatement avant le Round concurrent');
 await A.evaluate(()=>{window.qa35.control.offline=true;});
 await B.evaluate(()=>{window.qa35.control.offline=true;});
 const raceBase=await envelope(A);assert.deepEqual((await envelope(B)).extensions.v5.gameClock,raceBase.extensions.v5.gameClock);
 await nextTurn(A);await nextTurn(B);
 const localA=await envelope(A),localB=await envelope(B),baseClock=raceBase.extensions.v5.gameClock;
 assert.equal(localA.extensions.v5.gameClock.revision,baseClock.revision+1);
 assert.equal(localB.extensions.v5.gameClock.revision,baseClock.revision+1);
 assert.equal(localA.extensions.v5.gameClock.campaignSeconds,baseClock.campaignSeconds+10,
  'le vrai franchissement de Round hors ligne ajoute dix secondes dans la branche A');
 assert.equal(localB.extensions.v5.gameClock.campaignSeconds,baseClock.campaignSeconds+10,
  'la branche B part de la même base et ne double pas localement la durée');
 await A.evaluate(()=>{window.qa35.control.offline=false;});await settled(A);
 const winnerRemote=await remote();
 await B.evaluate(()=>{window.qa35.control.offline=false;});
 const raceStatus=await pull(B);assert.equal(raceStatus.status,'conflict','la seconde horloge concurrente ne se fusionne pas silencieusement');
 const clockConflict=JSON.parse(await B.evaluate(()=>window.qa35.store.exportSyncConflict()));
 assert.equal(clockConflict.local.state.extensions.v5.gameClock.campaignSeconds,baseClock.campaignSeconds+10);
 assert.equal(clockConflict.remote.state.extensions.v5.gameClock.campaignSeconds,baseClock.campaignSeconds+10);
 assert.equal(clockConflict.remote.state.extensions.v5.gameClock.revision,baseClock.revision+1,
  'le vainqueur distant n’a enregistré qu’un seul franchissement du Round');
 assert.ok(clockConflict.remote.state.extensions.v5.gameClock.lastEvent.payloadFingerprint.includes('null'),
  'la phase startOfRound/actorId null reste présente dans l’empreinte de l’événement RTDB');
 const remoteClock=clockConflict.remote.state.extensions.v5.gameClock,localClock=clockConflict.local.state.extensions.v5.gameClock;
 const remoteStartRound=remoteClock.lastEvent.validatedPhases.find(row=>row.phase==='startOfRound');
 assert.ok(remoteStartRound,'le plan validé du Round franchi survit au codec RTDB');
 assert.equal(remoteStartRound.actorId,null,'le codec restaure le null canonique startOfRound.actorId supprimé par RTDB');
 assert.deepEqual(remoteClock.lastEvent.validatedPhases,localClock.lastEvent.validatedPhases,
  'le plan complet reconstruit depuis le fingerprint garde l’identité canonique des champs null');
 await B.evaluate(()=>window.qa35.store.resolveSyncRemote());await settled(B);await pull(A);
 const resolvedClock=(await envelope(A)).extensions.v5.gameClock;
 assert.equal(resolvedClock.campaignSeconds,baseClock.campaignSeconds+10,'résoudre le conflit ne cumule pas une deuxième avance de temps');
 assert.equal(resolvedClock.revision,baseClock.revision+1);
 assert.deepEqual((await envelope(B)).extensions.v5.gameClock,resolvedClock);
 check('E5 deux avances hors ligne : conflit explicite, branche de restauration et une seule durée de Round retenue');

 // E5 campaign: exact explicit seconds and effect expiry share the same synchronized command.
 const campaignProjection=state=>({clock:state.extensions.v5.gameClock,hero:JSON.parse(JSON.stringify((()=>{
  const hero=state.combat.participants.find(row=>row.id==='hero');return {id:hero.id,ct:hero.caracs.CT,
   effects:(hero.extensions?.v5?.spellEffects||[]).map(effect=>({id:effect.id,spellId:effect.spellId,casterId:effect.casterId,
    durationType:effect.durationType,remainingMinutes:effect.remainingMinutes,expiresAtRound:effect.expiresAtRound,statModifiers:effect.statModifiers}))};
 })()))});
 const campaignStep=async(page,seconds,reason)=>{
  const result=await page.evaluate(async({seconds,reason})=>window.qa35.store.advanceCampaignTime({seconds,reason}),{seconds,reason});
  assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.status,'applied');
  assert.deepEqual(result.receipt.validatedPhases,[],'aucune phase fabriquée par une avance de campagne');
  return result;
 };
 await A.evaluate(async()=>window.qa35.store.applySpellEffects('hero',{id:'campaign-cloud-buff',spellId:'campaign-cloud-buff',spellName:'Contrôle campagne cloud',casterId:'hero',duration:'2 minutes',statModifiers:{CT:10}}));
 await settled(A);await pull(B);await settled(B);await pull(A);
 const campaignBefore=await envelope(A),campaignClock=campaignBefore.extensions.v5.gameClock;
 assert.equal(campaignProjection(campaignBefore).hero.ct,50);
 const campaignAResult=await campaignStep(A,30,'Avance de campagne A vers B');await settled(A);await pull(B);
 const campaignAfterA=await envelope(A),campaignReceivedB=await envelope(B);
 assert.equal(campaignAfterA.extensions.v5.gameClock.campaignSeconds,campaignClock.campaignSeconds+30);
 assert.equal(campaignAfterA.extensions.v5.gameClock.revision,campaignClock.revision+1);
 assert.deepEqual(campaignAResult.receipt,campaignAfterA.extensions.v5.gameClock.lastEvent);
 assert.deepEqual(campaignProjection(campaignReceivedB),campaignProjection(campaignAfterA));
 assert.equal(campaignProjection(campaignReceivedB).hero.effects.find(row=>row.id==='campaign-cloud-buff').remainingMinutes,1.5);
 assert.deepEqual(campaignAfterA.extensions.v5.gameClock.combat,campaignClock.combat);
 check('E5 campagne A vers B : secondes exactes, reçu et vraie durée de sort répliqués atomiquement');
 await A.reload();await boot(A,'A');await settled(A);await pull(B);
 assert.deepEqual(campaignProjection(await envelope(A)),campaignProjection(campaignAfterA),'rechargement IndexedDB conserve clock et temps restant');
 await A.evaluate(async()=>window.qa35.store.undo());await settled(A);await pull(B);
 assert.deepEqual(campaignProjection(await envelope(A)),campaignProjection(campaignBefore));
 assert.deepEqual(campaignProjection(await envelope(B)),campaignProjection(campaignBefore));
 await A.evaluate(async()=>window.qa35.store.redo());await settled(A);await pull(B);
 assert.deepEqual(campaignProjection(await envelope(A)),campaignProjection(campaignAfterA));
 assert.deepEqual(campaignProjection(await envelope(B)),campaignProjection(campaignAfterA));
 check('E5 campagne reload/Undo/Redo A : heure, reçu et couche restaurés ensemble sur les deux clients');
 await campaignStep(B,90,'Avance de campagne B vers A');await settled(B);await pull(A);
 const campaignAfterB=await envelope(B);
 assert.equal(campaignAfterB.extensions.v5.gameClock.campaignSeconds,campaignClock.campaignSeconds+120);
 assert.equal(campaignProjection(campaignAfterB).hero.effects.some(row=>row.id==='campaign-cloud-buff'),false);
 assert.equal(campaignProjection(campaignAfterB).hero.ct,40,'la vraie caractéristique revient à sa valeur de base');
 assert.deepEqual(campaignProjection(await envelope(A)),campaignProjection(campaignAfterB));
 await B.reload();await boot(B,'B');await settled(B);await pull(A);
 assert.deepEqual(campaignProjection(await envelope(B)),campaignProjection(campaignAfterB));
 await B.evaluate(async()=>window.qa35.store.undo());await settled(B);await pull(A);
 assert.deepEqual(campaignProjection(await envelope(A)),campaignProjection(campaignAfterA));
 await B.evaluate(async()=>window.qa35.store.redo());await settled(B);await pull(A);
 assert.deepEqual(campaignProjection(await envelope(A)),campaignProjection(campaignAfterB));
 check('E5 campagne B vers A : expiration effective, reload et Undo/Redo de la seconde avance partagés');

 // Offline divergent campaign deltas must conflict; resolving keeps one receipt and one effect state.
 await A.evaluate(async()=>window.qa35.store.applySpellEffects('hero',{id:'campaign-cloud-race',spellId:'campaign-cloud-race',spellName:'Concurrence campagne cloud',casterId:'hero',duration:'1 minute',statModifiers:{CT:10}}));
 await settled(A);await pull(B);await settled(B);await pull(A);
 const campaignRaceBase=await envelope(A),campaignRaceClock=campaignRaceBase.extensions.v5.gameClock;
 assert.deepEqual(campaignProjection(await envelope(B)),campaignProjection(campaignRaceBase));
 await A.evaluate(()=>{window.qa35.control.offline=true;});await B.evaluate(()=>{window.qa35.control.offline=true;});
 await campaignStep(A,30,'Branche hors ligne A trente secondes');await campaignStep(B,60,'Branche hors ligne B soixante secondes');
 await A.evaluate(()=>window.qa35.session.idle());await B.evaluate(()=>window.qa35.session.idle());
 const campaignRaceA=await envelope(A),campaignRaceB=await envelope(B);
 assert.equal(campaignRaceA.extensions.v5.gameClock.campaignSeconds,campaignRaceClock.campaignSeconds+30);
 assert.equal(campaignRaceB.extensions.v5.gameClock.campaignSeconds,campaignRaceClock.campaignSeconds+60);
 assert.equal(campaignProjection(campaignRaceA).hero.ct,50);assert.equal(campaignProjection(campaignRaceB).hero.ct,40);
 await A.evaluate(()=>{window.qa35.control.offline=false;});await settled(A);
 await B.evaluate(()=>{window.qa35.control.offline=false;});
 assert.equal((await pull(B)).status,'conflict','deux deltas concurrents ne se cumulent pas silencieusement');
 const campaignConflict=JSON.parse(await B.evaluate(()=>window.qa35.store.exportSyncConflict()));
 assert.equal(campaignConflict.local.state.extensions.v5.gameClock.campaignSeconds,campaignRaceClock.campaignSeconds+60);
 assert.equal(campaignConflict.remote.state.extensions.v5.gameClock.campaignSeconds,campaignRaceClock.campaignSeconds+30);
 assert.equal(campaignProjection(campaignConflict.local.state).hero.ct,40);
 assert.equal(campaignProjection(campaignConflict.remote.state).hero.ct,50);
 await B.evaluate(()=>window.qa35.store.resolveSyncRemote());await settled(B);await pull(A);
 const campaignWinner=await envelope(A),campaignResolved=await envelope(B);
 assert.equal(campaignWinner.extensions.v5.gameClock.campaignSeconds,campaignRaceClock.campaignSeconds+30,'seule avance gagnante de trente secondes retenue');
 assert.equal(campaignWinner.extensions.v5.gameClock.revision,campaignRaceClock.revision+1);
 assert.equal(campaignProjection(campaignWinner).hero.effects.find(row=>row.id==='campaign-cloud-race').remainingMinutes,0.5);
 assert.deepEqual(campaignProjection(campaignResolved),campaignProjection(campaignWinner));
 assert.deepEqual(campaignWinner.extensions.v5.gameClock.lastEvent.validatedPhases,[]);
 assert.equal(JSON.parse(campaignWinner.extensions.v5.gameClock.lastEvent.payloadFingerprint).seconds,30);
 check('E5 campagne deux avances hors ligne 30/60 : conflit exportable puis seul reçu et effet gagnants conservés');

 // E5 calendrier : sanction historique sourcée 6–10, pose directe autorisée par Q12.
 // This adds five checks; the twenty preceding assertions are kept verbatim.
 const imperialWeekSeconds=8*86400,wrathPrayerId='divine:blessing:myrmidia:courage';
 const wrathCaps=state=>(state.combat.participants.find(p=>p.id==='hero').extensions?.v5?.divineEffects||[])
  .filter(effect=>effect.type==='prayer-sl-cap');
 const wrathProjection=state=>({clock:state.extensions.v5.gameClock,caps:wrathCaps(state)});
 const wrathPreview=page=>page.evaluate(prayerId=>{
  const s=window.qa35.store,round=s.getCombat().round;
  const preview=s.previewDivineExecution(prayerId,{actorId:'hero',targetIds:['ally'],roll:23,canSpeak:true,
   choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}},
   expiry:{phase:'endOfTurn',round:round+5,actorId:'hero',moment:'afterEffects'}});
  if(!preview.ready)throw Error(preview.error);return preview.preview;
 },wrathPrayerId);
 const imposeWrath=page=>page.evaluate(async()=>{
  const {imposeHistoricalWrath}=await import('/tests/fixtures/divine-wrath-history.mjs');
  const {preview,result}=await imposeHistoricalWrath(window.qa35.store,{actorId:'hero',executionId:'cloud-historical-wrath:'+crypto.randomUUID()});
  if(preview.wrathTableResult?.id!=='wrath:6-10')throw Error('La sanction historique6–10 doit être sourcée');
  if(result?.ok===false||result?.ready===false)throw Error(result.error);
  return {originExecutionId:preview.cap.originExecutionId,prayer:result.receipt.prayer};
 });
 // A public import starts a distinct campaign origin after the twenty historical scenarios.
 // La première pose historique vérifie le lastEventId nul que RTDB omet.
 await A.evaluate(async initial=>window.qa35.store.loadFromJSON(initial),fixture);
 await settled(A);await pull(B);await settled(B);await pull(A);
 await A.evaluate(async()=>window.qa35.store.setDivineSin('hero',0,{reason:'Base explicite du contrôle Courroux6–10'}));
 await settled(A);await pull(B);await settled(B);await pull(A);
 const wrathBefore=await envelope(A),wrathClock=wrathBefore.extensions.v5.gameClock;
 assert.equal(wrathClock.revision,0);assert.equal(wrathClock.lastEvent,null);
 const wrathOrigin=await imposeWrath(A);assert.equal(wrathOrigin.prayer.success,false);
 await settled(A);await pull(B);
 const wrathAfter=await envelope(A),wrathReceived=await envelope(B),cap=wrathCaps(wrathAfter).find(e=>e.originExecutionId===wrathOrigin.originExecutionId);
 assert.ok(cap,'la pose directe de la sanction historique conserve le plafond');
 assert.equal(cap.deadline.atSeconds,wrathClock.campaignSeconds+imperialWeekSeconds);
 assert.equal(cap.duration.days,8);assert.equal(cap.duration.secondPolicyId,'campaign-day-86400s');
 assert.deepEqual(cap.clockAnchor,{campaignSeconds:wrathClock.campaignSeconds,clockRevision:wrathClock.revision,lastEventId:wrathClock.lastEvent?.id??null});
 assert.deepEqual(wrathProjection(wrathReceived),wrathProjection(wrathAfter),'provenance autonome complète identique après RTDB');
 assert.equal((await wrathPreview(B)).prayer.success,true);assert.equal((await wrathPreview(B)).prayer.sl,0);
 assert.equal((await wrathPreview(B)).extensionBudget.available,0);
 assert.equal((wrathReceived.combat.participants.find(p=>p.id==='ally').extensions?.v5?.divineEffects||[]).some(e=>e.type==='prayer-sl-cap'),false);
 check('E5 Courroux6–10 A vers B : pose historique sourcée, ancre8jours et vrai plafond Prière reçus');

 await A.reload();await boot(A,'A');await settled(A);await pull(B);
 assert.deepEqual(wrathProjection(await envelope(A)),wrathProjection(wrathAfter),'IndexedDB conserve la couche autonome et son ancre');
 await A.evaluate(async()=>window.qa35.store.undo());await settled(A);await pull(B);
 assert.equal(wrathCaps(await envelope(A)).length,0);assert.equal(wrathCaps(await envelope(B)).length,0);
 assert.deepEqual((await envelope(B)).extensions.v5.gameClock,wrathClock,'annuler la pose ne consomme pas de temps');
 assert.equal((await wrathPreview(B)).prayer.sl,4);
 await A.evaluate(async()=>window.qa35.store.redo());await settled(A);await pull(B);
 assert.deepEqual(wrathProjection(await envelope(B)),wrathProjection(wrathAfter));
 check('E5 Courroux reload/Undo/Redo de pose : sanction et provenance synchronisées sans délai recréé');

 await campaignStep(B,7*86400,'Sept jours impériaux écoulés');await settled(B);await pull(A);
 const seventhDay=await envelope(B);
 assert.equal(seventhDay.extensions.v5.gameClock.campaignSeconds,wrathClock.campaignSeconds+7*86400);
 assert.deepEqual(wrathCaps(seventhDay),[cap],'sept jours ne sont pas une semaine impériale');
 assert.deepEqual(wrathProjection(await envelope(A)),wrathProjection(seventhDay));
 await B.reload();await boot(B,'B');await settled(B);await pull(A);
 assert.deepEqual(wrathProjection(await envelope(B)),wrathProjection(seventhDay));assert.equal((await wrathPreview(B)).prayer.sl,0);
 check('E5 Courroux sept jours B vers A et reload : plafond encore actif avec ancre initiale inchangée');

 await campaignStep(A,86400,'Huitième jour de la semaine impériale');await settled(A);await pull(B);
 const eighthDay=await envelope(A);
 assert.equal(eighthDay.extensions.v5.gameClock.campaignSeconds,cap.deadline.atSeconds);
 assert.equal(wrathCaps(eighthDay).length,0);assert.deepEqual(wrathProjection(await envelope(B)),wrathProjection(eighthDay));
 assert.equal((await wrathPreview(B)).prayer.sl,4);
 await A.reload();await boot(A,'A');await settled(A);await pull(B);
 assert.deepEqual(wrathProjection(await envelope(A)),wrathProjection(eighthDay));
 await A.evaluate(async()=>window.qa35.store.undo());await settled(A);await pull(B);
 assert.deepEqual(wrathProjection(await envelope(B)),wrathProjection(seventhDay));assert.equal((await wrathPreview(B)).prayer.sl,0);
 await A.evaluate(async()=>window.qa35.store.redo());await settled(A);await pull(B);
 assert.deepEqual(wrathProjection(await envelope(B)),wrathProjection(eighthDay));assert.equal((await wrathPreview(B)).prayer.sl,4);
 check('E5 Courroux huitième jour A vers B : expiration exacte, reload et Undo/Redo heure+couche');

 const raceWrathOrigin=await imposeWrath(A);await settled(A);await pull(B);
 await campaignStep(A,imperialWeekSeconds-30,'Préparer trente secondes avant fin de la sanction');
 await settled(A);await pull(B);await settled(B);await pull(A);
 const wrathRaceBase=await envelope(A),wrathRaceClock=wrathRaceBase.extensions.v5.gameClock;
 assert.equal(wrathCaps(wrathRaceBase).length,1);assert.equal(wrathCaps(wrathRaceBase)[0].originExecutionId,raceWrathOrigin.originExecutionId);
 assert.deepEqual(wrathProjection(await envelope(B)),wrathProjection(wrathRaceBase));
 await A.evaluate(()=>{window.qa35.control.offline=true;});await B.evaluate(()=>{window.qa35.control.offline=true;});
 await campaignStep(A,30,'BrancheA atteint échéance absolue');const newOfflineOrigin=await imposeWrath(B);
 await A.evaluate(()=>window.qa35.session.idle());await B.evaluate(()=>window.qa35.session.idle());
 assert.equal(wrathCaps(await envelope(A)).length,0);assert.equal(wrathCaps(await envelope(B)).length,2);
 assert.notEqual(newOfflineOrigin.originExecutionId,raceWrathOrigin.originExecutionId);
 await A.evaluate(()=>{window.qa35.control.offline=false;});await settled(A);
 await B.evaluate(()=>{window.qa35.control.offline=false;});
 assert.equal((await pull(B)).status,'conflict','une nouvelle sanction concurrente ne se fusionne pas dans une autre échéance');
 const wrathConflict=JSON.parse(await B.evaluate(()=>window.qa35.store.exportSyncConflict()));
 assert.equal(wrathConflict.local.state.extensions.v5.gameClock.campaignSeconds,wrathRaceClock.campaignSeconds);
 assert.equal(wrathConflict.remote.state.extensions.v5.gameClock.campaignSeconds,wrathRaceClock.campaignSeconds+30);
 assert.equal(wrathCaps(wrathConflict.local.state).length,2);assert.equal(wrathCaps(wrathConflict.remote.state).length,0);
 assert.ok(wrathCaps(wrathConflict.local.state).some(e=>e.originExecutionId===newOfflineOrigin.originExecutionId));
 await B.evaluate(()=>window.qa35.store.resolveSyncRemote());await settled(B);await pull(A);
 const wrathWinner=await envelope(A);
 assert.equal(wrathWinner.extensions.v5.gameClock.revision,wrathRaceClock.revision+1);
 assert.equal(wrathCaps(wrathWinner).length,0);assert.deepEqual(wrathProjection(await envelope(B)),wrathProjection(wrathWinner));
 await B.reload();await boot(B,'B');await settled(B);await pull(A);
 assert.deepEqual(wrathProjection(await envelope(B)),wrathProjection(wrathWinner),'le reload ne ressuscite pas la sanction de la branche perdante');
 assert.equal((await wrathPreview(B)).prayer.sl,4);
 check('E5 Courroux hors ligne expirationA/nouvelle poseB : conflit exportable puis reçu+couches gagnants seuls persistés');


 // Leçons divines: source d10 and explicit MJ Round policy, independent of calendar seconds.
 const lessonLayers=state=>(state.combat.participants.find(p=>p.id==='hero').extensions?.v5?.divineEffects||[])
  .filter(effect=>effect.type==='prayer-sl-modifier');
 const lessonProjection=state=>({clock:state.extensions.v5.gameClock,layers:lessonLayers(state),
  sin:state.combat.participants.find(p=>p.id==='hero').extensions?.v5?.divine?.sin});
 const lessonTest=page=>page.evaluate(prayerId=>{
  const s=window.qa35.store,round=s.getCombat().round;
  const preview=s.previewDivineExecution(prayerId,{actorId:'hero',targetIds:['ally'],roll:23,canSpeak:true,
   choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}},
   expiry:{phase:'endOfTurn',round:round+5,actorId:'hero',moment:'afterEffects'}});
  if(!preview.ready)throw Error(preview.error);return preview.preview.prayer;
 },wrathPrayerId);
 const lessonFixture=structuredClone(fixture);
 // The historical fixture used init, while the canonical model reads initiative.
 // Keep historical checks intact; start this new three-person test with hero first.
 for(const participant of lessonFixture.combat.participants)participant.initiative=participant.id==='hero'?60:participant.id==='ally'?50:40;
 await A.evaluate(async initial=>window.qa35.store.loadFromJSON(initial),lessonFixture);
 await settled(A);await pull(B);await settled(B);await pull(A);
 await A.evaluate(async()=>window.qa35.store.setDivineSin('hero',1,{reason:'Péché source avant Leçons divines'}));
 await settled(A);await pull(B);await settled(B);await pull(A);
 const lessonBefore=await envelope(A);
 assert.deepEqual(lessonBefore.combat.participants.map(p=>p.initiative),[60,50,40]);
 assert.equal(lessonBefore.combat.currentActorId,'hero');
 assert.equal(lessonBefore.combat.round,1);
 assert.deepEqual(lessonBefore.combat.order,['hero','ally','enemy']);
 await A.evaluate(async prayerId=>{
  const s=window.qa35.store,preview=s.previewDivineExecution(prayerId,{actorId:'hero',targetIds:['ally'],roll:99,
   wrathRoll:1,wrathDurationRoll:1,canSpeak:true,choices:{range:0,targets:0,duration:0,effect:0},
   facts:{targets:{ally:{withinRange:true,ally:true}}}});
  if(!preview.ready)throw Error(preview.error);
  if(preview.wrathTableResult?.id!=='wrath:11-15')throw Error('Leçons divines exige sa ligne canonique');
  const result=await s.applyDivineExecution(prayerId,{preview});
  if(!result.ok)throw Error(result.error);
 },wrathPrayerId);
 await settled(A);await pull(B);
 const lessonAfter=await envelope(A),lesson=lessonLayers(lessonAfter)[0];
 assert.ok(lesson);assert.equal(lesson.amount,-1);
 assert.deepEqual(lesson.duration,{roll:1,sinAtTrigger:1,rounds:2,unit:'rounds'});
 assert.deepEqual(lesson.roundAnchor,{sceneId:null,round:1});
 assert.deepEqual(lesson.expiry,{round:2,phase:'endOfRound',moment:'afterEffects'});
 assert.deepEqual(lessonProjection(await envelope(B)),lessonProjection(lessonAfter));
 assert.equal((await lessonTest(B)).sl,3);
 check('Leçons A vers B : d10+Péché source, ancre scène nulle, fin Round2 et malus réel reçus sans texte libre');

 await A.reload();await boot(A,'A');await settled(A);await pull(B);
 assert.deepEqual(lessonProjection(await envelope(A)),lessonProjection(lessonAfter));
 await A.evaluate(async()=>window.qa35.store.undo());await settled(A);await pull(B);
 assert.deepEqual(lessonProjection(await envelope(B)),lessonProjection(lessonBefore));
 await A.evaluate(async()=>window.qa35.store.redo());await settled(A);await pull(B);
 assert.deepEqual(lessonProjection(await envelope(B)),lessonProjection(lessonAfter));
 assert.equal((await lessonTest(B)).sl,3);
 check('Leçons reload/Undo/Redo de pose : d10, Péché et modificateur natifs synchronisés ensemble');

 for(let turn=0;turn<5;turn++){
  await B.evaluate(async()=>window.qa35.store.nextTurn());await settled(B);await pull(A);
  assert.equal(lessonLayers(await envelope(A)).length,1);
 }
 const lessonLastTurn=await envelope(B);
 assert.equal(lessonLastTurn.combat.round,2);
 assert.equal((await lessonTest(A)).sl,3);
 await A.evaluate(async()=>window.qa35.store.nextTurn());await settled(A);await pull(B);
 const lessonExpired=await envelope(A);
 assert.equal(lessonExpired.combat.round,3);assert.equal(lessonLayers(lessonExpired).length,0);
 assert.deepEqual(lessonProjection(await envelope(B)),lessonProjection(lessonExpired));
 assert.equal((await lessonTest(B)).sl,4);
 check('Leçons six vrais Tours : fin du deuxième Round inclus expire une seule sanction sur les deux clients');

 await A.reload();await boot(A,'A');await settled(A);await pull(B);
 assert.equal(lessonLayers(await envelope(A)).length,0);
 await A.evaluate(async()=>window.qa35.store.undo());await settled(A);await pull(B);
 assert.deepEqual(lessonProjection(await envelope(B)),lessonProjection(lessonLastTurn));
 assert.equal((await lessonTest(B)).sl,3);
 await A.evaluate(async()=>window.qa35.store.redo());await settled(A);await pull(B);
 assert.deepEqual(lessonProjection(await envelope(B)),lessonProjection(lessonExpired));
 assert.equal((await lessonTest(B)).sl,4);
 check('Leçons expiration puis reload/Undo/Redo : phase attestée et malus restaurés ou retirés atomiquement');

 await A.evaluate(async()=>window.qa35.store.undo());await settled(A);await pull(B);await settled(B);await pull(A);
 await A.evaluate(()=>{window.qa35.control.offline=true;});await B.evaluate(()=>{window.qa35.control.offline=true;});
 await A.evaluate(async()=>window.qa35.store.nextTurn());
 await B.evaluate(async()=>window.qa35.store.setDivineSin('hero',1,{reason:'Branche concurrente conservant Leçons'}));
 await A.evaluate(async()=>window.qa35.session.idle());await B.evaluate(async()=>window.qa35.session.idle());
 assert.equal(lessonLayers(await envelope(A)).length,0);assert.equal(lessonLayers(await envelope(B)).length,1);
 await A.evaluate(()=>{window.qa35.control.offline=false;});await settled(A);
 await B.evaluate(()=>{window.qa35.control.offline=false;});
 assert.equal((await pull(B)).status,'conflict');
 const lessonConflict=JSON.parse(await B.evaluate(()=>window.qa35.store.exportSyncConflict()));
 assert.equal(lessonLayers(lessonConflict.local.state).length,1);
 assert.equal(lessonLayers(lessonConflict.remote.state).length,0);
 assert.equal(lessonProjection(lessonConflict.local.state).sin,1);
 assert.equal(lessonProjection(lessonConflict.remote.state).sin,0);
 await B.evaluate(()=>window.qa35.store.resolveSyncRemote());await settled(B);await pull(A);
 assert.equal(lessonLayers(await envelope(B)).length,0);
 assert.deepEqual(lessonProjection(await envelope(B)),lessonProjection(await envelope(A)));
 await B.reload();await boot(B,'B');await settled(B);await pull(A);
 assert.equal((await lessonTest(B)).sl,4);
 check('Leçons hors ligne expiration/Péché : conflit exportable, seule branche gagnante et aucun malus ressuscité au reload');


 // Wrath Conditions: genuine shared states, no prayer-owned timer or free-text substitute.
 const conditionActor=state=>state.combat.participants.find(row=>row.id==='hero');
 const conditionLevel=(state,key)=>(conditionActor(state).states||[]).filter(row=>row.key===key).reduce((sum,row)=>sum+row.level,0);
 // Compare the complete new mechanical receipt. Historical prayer traces contain
 // optional empty arrays/nulls that RTDB omits; those are outside this projection.
 const conditionProjection=state=>({combat:state.combat,sin:conditionActor(state).extensions.v5.divine.sin,
  executions:(state.extensions.v5.divineExecutions||[]).filter(row=>row.conditionReceipt).map(row=>({
   executionId:row.executionId,actorId:row.actorId,contractId:row.contractId,
   prayer:{roll:row.prayer.roll,sl:row.prayer.sl,success:row.prayer.success},
   conditionReceipt:{...row.conditionReceipt,stateIds:row.conditionReceipt.stateIds||[],
    reminders:row.conditionReceipt.reminders||[],removed:row.conditionReceipt.removed||[]}
  }))});
 const conditionFixture=()=>{
  const initial=structuredClone(fixture);
  for(const p of initial.combat.participants){p.initiative=p.id==='hero'?60:p.id==='ally'?50:40;}
  conditionActor(initial).extensions.v5.divine.sin=1;
  conditionActor(initial).extensions.v5.hasMomentum=true;
  return initial;
 };
 const imposeCondition=(page,wrathRoll)=>page.evaluate(async({prayerId,wrathRoll})=>{
  const s=window.qa35.store,before=s.getFullJSON();
  const preview=s.previewDivineExecution(prayerId,{actorId:'hero',targetIds:['ally'],roll:99,wrathRoll,canSpeak:true,
   choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}}});
  if(s.getFullJSON()!==before){
   const a=JSON.parse(before),b=JSON.parse(s.getFullJSON());delete a.exportedAt;delete b.exportedAt;
   if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Condition preview mutated state');
  }
  if(!preview.ready)throw Error(preview.error);
  const result=await s.applyDivineExecution(prayerId,{preview});if(!result.ok)throw Error(result.error);
  return {executionId:preview.executionId,rowId:preview.wrathTableResult.id};
 },{prayerId:wrathPrayerId,wrathRoll});
 for(const [wrathRoll,key,label] of [[51,'hemorragique','Hémorragique'],[79,'brise','Brisé']]){
  await A.evaluate(async initial=>window.qa35.store.loadFromJSON(initial),conditionFixture());
  await settled(A);await pull(B);await settled(B);await pull(A);
  const initial=await envelope(A);
  const imposed=await imposeCondition(A,wrathRoll);await settled(A);await pull(B);
  const acquired=await envelope(A);
  assert.equal(imposed.rowId,key==='hemorragique'?'wrath:61-65':'wrath:89-95');
  assert.equal(conditionLevel(acquired,key),2);assert.equal(conditionActor(acquired).extensions.v5.divine.sin,0);
  assert.equal(conditionActor(acquired).extensions.v5.hasMomentum,false);
  assert.equal(acquired.combat.participants.find(p=>p.id==='ally').states.length,0);
  assert.equal(conditionActor(acquired).hp,20,'acquisition does not invent immediate bleeding damage');
  const execution=acquired.extensions.v5.divineExecutions.find(row=>row.executionId===imposed.executionId);
  assert.ok(execution.conditionReceipt,'the committed execution retains its canonical acquisition receipt');
  assert.deepEqual(conditionProjection(await envelope(B)),conditionProjection(acquired));
  check(label+' A vers B : 1+Péché avant décrément, prêtre seul, Élan perdu et reçu source');

  await A.reload();await boot(A,'A');await settled(A);await pull(B);
  assert.deepEqual(conditionProjection(await envelope(A)),conditionProjection(acquired));
  await A.evaluate(async()=>window.qa35.store.undo());await settled(A);await pull(B);
  assert.deepEqual(conditionProjection(await envelope(B)),conditionProjection(initial));
  await A.evaluate(async()=>window.qa35.store.redo());await settled(A);await pull(B);
  assert.deepEqual(conditionProjection(await envelope(B)),conditionProjection(acquired));
  check(label+' reload/Undo/Redo natifs : États et Péchés atomiques, aucun état doublé');

  if(key==='hemorragique'){
   for(let t=0;t<2;t++){
    await B.evaluate(async()=>{const result=await window.qa35.combat.nextTurn();if(result.status!=='applied')throw Error(result.error||'V5 turn refused');});await settled(B);await pull(A);
    assert.equal(conditionActor(await envelope(A)).hp,20);
   }
   const beforeRoundEnd=await envelope(B);
   await B.evaluate(async()=>{const result=await window.qa35.combat.nextTurn();if(result.status!=='applied')throw Error(result.error||'V5 turn refused');});await settled(B);await pull(A);
   const roundEnd=await envelope(B);assert.equal(roundEnd.combat.round,2);
   assert.equal(conditionActor(roundEnd).hp,18);assert.equal(conditionLevel(roundEnd,key),2);
   assert.deepEqual(conditionProjection(await envelope(A)),conditionProjection(roundEnd));
   await B.evaluate(async()=>window.qa35.store.undo());await settled(B);await pull(A);
   assert.deepEqual(conditionProjection(await envelope(A)),conditionProjection(beforeRoundEnd));
   await B.evaluate(async()=>window.qa35.store.redo());await settled(B);await pull(A);
   assert.deepEqual(conditionProjection(await envelope(A)),conditionProjection(roundEnd));
   check('Hémorragique réel en fin de Round : deux Blessures sans BE/PA, puis Undo/Redo partagé sans double dommage');
  }else{
   const nextPrayer=await B.evaluate(prayerId=>{
    const s=window.qa35.store,round=s.getCombat().round;
    return s.previewDivineExecution(prayerId,{actorId:'hero',targetIds:['ally'],roll:23,canSpeak:true,
     brokenEscapeFacts:{visibleToAnyEnemy:false},
     choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}},
     expiry:{phase:'endOfRound',round:round+5,moment:'afterEffects'}});
   },wrathPrayerId);
   // Cette occurrence a déjà consommé son Action : aucune deuxième Prière n'est autorisée.
   assert.equal(nextPrayer.ready,false,'la visibilité hors vue ne rend pas une Action déjà dépensée');
   assert.match(nextPrayer.error||'',/Action|quota|DIV-BROKEN-MIDTURN-01/i);
   const receivedPrayerTest=await B.evaluate(async()=>{
    const s=window.qa35.store,actor=s.getCombat().participants.get('hero');
    const {previewResolution}=await import('/js/core/resolution.js');
    return previewResolution({actor,action:{id:'received-prayer-test',type:'skill',base:60,attr:'Soc',note:'Prière',
     extensions:{fiche:{skillId:'skill-50_72_69_e8_72_65-base'}}},roll:23,v5:{kind:'test',context:{runningOrHiding:false}}});
   });
   assert.equal(receivedPrayerTest.test.sl,2,'le Test partagé applique les deux DR de Brisé reçu sur B');
   assert.equal(conditionLevel(await envelope(B),key),2);
   check('Brisé reçu par B : malus du Test Prière partagé, États conservés et seconde Action du Tour refusée');
  }
 }

 // Concurrent conditions must remain two branches, never an accidental union.
 await A.evaluate(async initial=>window.qa35.store.loadFromJSON(initial),conditionFixture());
 await settled(A);await pull(B);await settled(B);await pull(A);
 await A.evaluate(()=>{window.qa35.control.offline=true;});await B.evaluate(()=>{window.qa35.control.offline=true;});
 await imposeCondition(A,51);await imposeCondition(B,79);
 await A.evaluate(()=>window.qa35.session.idle());await B.evaluate(()=>window.qa35.session.idle());
 assert.equal(conditionLevel(await envelope(A),'hemorragique'),2);assert.equal(conditionLevel(await envelope(B),'brise'),2);
 await A.evaluate(()=>{window.qa35.control.offline=false;});await settled(A);
 await B.evaluate(()=>{window.qa35.control.offline=false;});assert.equal((await pull(B)).status,'conflict');
 const conditionsConflict=JSON.parse(await B.evaluate(()=>window.qa35.store.exportSyncConflict()));
 assert.equal(conditionLevel(conditionsConflict.local.state,'brise'),2);
 assert.equal(conditionLevel(conditionsConflict.remote.state,'hemorragique'),2);
 assert.equal(conditionLevel(conditionsConflict.local.state,'hemorragique'),0);
 assert.equal(conditionLevel(conditionsConflict.remote.state,'brise'),0);
 await B.evaluate(()=>window.qa35.store.resolveSyncRemote());await settled(B);await pull(A);
 const conditionWinner=await envelope(A);assert.equal(conditionLevel(conditionWinner,'hemorragique'),2);
 assert.equal(conditionLevel(conditionWinner,'brise'),0);
 assert.deepEqual(conditionProjection(await envelope(B)),conditionProjection(conditionWinner));
 check('Courroux hors ligne HémorragiqueA/BriséB : conflit exportable puis seule branche gagnante');
 await B.reload();await boot(B,'B');await settled(B);await pull(A);
 assert.deepEqual(conditionProjection(await envelope(B)),conditionProjection(conditionWinner));
 assert.equal(conditionLevel(await envelope(B),'hemorragique'),2);assert.equal(conditionLevel(await envelope(B),'brise'),0);
 check('Courroux États après résolution et reload : aucun cumul des branches ou sanction ressuscitée');

 await runBrokenEscapeCloudScenarios({A,B,settled,pull,envelope,check,boot});
 await runB4WrathCloudScenarios({A,B,fixture,settled,pull,envelope,check,boot});
 await runB5WrathCloudScenarios({A,B,fixture,settled,pull,envelope,check});
 await runB6WrathCloudScenarios({A,B,fixture,settled,pull,envelope,check});
 await runB7WrathCloudScenarios({A,B,fixture,settled,pull,envelope,check});
 await runB8WrathCloudScenarios({A,B,fixture,settled,pull,envelope,check});
 await runB9WrathCloudScenarios({A,B,fixture,settled,pull,envelope,check});

 const exported=await envelope(B);const shared=await remote();for(const key of ['log','history','localRevision','archives'])assert.equal(Object.hasOwn(shared.state,key),false);assert.deepEqual(errors,[]);mkdirSync(resolve(root,'tmp/divin'),{recursive:true});writeFileSync(resolve(root,'tmp/divin/cloud-divine-receipt.json'),JSON.stringify({appVersion:APP_VERSION,checks,services:'localhost Auth/RTDB',persistence:'native IndexedDB, two isolated contexts',adapter:'production Store/session/protocol, real REST ETag bridge',namespace,errors},null,2));await a.ctx.close();await b.ctx.close();console.log('PASS — recette divin cloud, IndexedDB natif et historique');
}finally{await browser?.close();if(server)await new Promise(done=>server.close(done));if(token)try{await request('',{method:'DELETE',owner:true});}catch{} }
