/** P4c B4 : invocations divines en cloud local. Two isolated browsers, native IDB and actual localhost Auth/RTDB serialization/CAS.
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
const root=fileURLToPath(new URL('../',import.meta.url));
const local=raw=>{const u=new URL('http://'+raw);assert.ok(['127.0.0.1','localhost','[::1]'].includes(u.hostname)&&u.port&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash);return u.origin;};
const db=local(process.env.FIREBASE_DATABASE_EMULATOR_HOST||'127.0.0.1:19000'),auth=local(process.env.FIREBASE_AUTH_EMULATOR_HOST||'127.0.0.1:19099');
const namespace='demo-divine-p4c-'+Date.now(),checks=[],errors=[];
let token,uid,browser,server,origin;
const check=label=>{checks.push(label);console.log('PASS — '+label);};
async function request(path,{method='GET',body,owner=false,headers={}}={}){const response=await fetch(db+'/'+path+'.json?ns='+namespace+(owner?'&access_token=owner':'&auth='+encodeURIComponent(token)),{method,headers:{'content-type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});assert.ok([200,412].includes(response.status),'local RTDB status '+response.status);return response;}
const remote=()=>request('wfrp-sessions-v3/'+uid+'/current').then(r=>r.json());
async function transact(operation){const path='wfrp-sessions-v3/'+uid+'/current';for(let i=0;i<8;i++){const source=await request(path,{headers:{'X-Firebase-ETag':'true'}}),raw=await source.json(),current=normalizeRemoteDocument(raw),result=applyOperation(current,operation);if(!result.applied)return {status:'aborted',root:result.document};const committed=await request(path,{method:'PUT',body:result.document,headers:{'If-Match':source.headers.get('etag')}});if(committed.status===200)return {status:'committed',root:await committed.json()};}throw Error('CAS retries exhausted');}
const subject=(id,extra={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',init:id==='hero'?60:id==='ally'?50:40,hp:20,maxHp:30,caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},skills:[{name:'Prière',status:'resolved',carac:'soc',total:60}],armor:{head:0,body:0,arms:0,legs:0},states:[],talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Ulric'},{id:'talent-invoke',status:'resolved',rank:1,specialization:'Ulric'}],prayers:[{name:'Hurlement du loup',status:'resolved'}],extensions:{v5:{resourceCharacterId:'divine-'+id,divine:{sin:0}}},...extra});
const fixture={schemaVersion:3,reserve:[],diceLines:[],extensions:{v5:{combatId:'qa-divine',turnIndex:1}},combat:{round:1,currentActorId:'hero',order:['hero','ally','enemy'],participants:[subject('hero'),subject('ally'),subject('enemy')]}};
async function boot(page,name){await page.evaluate(async({name,uid,version})=>{const[{createStore},{createPersistence},{createSyncSession},{createCombatEngine}]=await Promise.all([import('/js/core/store.js'),import('/js/core/persistence.js'),import('/js/core/sync-session.js'),import('/js/core/combat.js')]);const persistence=createPersistence({indexedDB,dbName:'qa-divine-native',contextId:'account:'+uid});if(!(await persistence.load()))await persistence.saveAtomic({state:{schemaVersion:3,reserve:[],combat:{round:0,order:[],participants:[]},diceLines:[],log:[{id:'journal-'+name,ts:1,kind:'management',text:'Journal local '+name}]}});const control={offline:false,loseAck:false,lostAckCount:0},statuses=[];const transport={async read(){if(control.offline)throw Error('QA offline');const r=await fetch('/qa/cloud');if(!r.ok)throw Error('read '+r.status);return r.json();},async transaction(operation){if(control.offline)throw Error('QA offline');const r=await fetch('/qa/cloud',{method:'POST',body:JSON.stringify(operation)});if(!r.ok)throw Error('transaction '+r.status);const value=await r.json();if(control.loseAck){control.loseAck=false;control.lostAckCount++;throw Error('QA lost acknowledgement');}return value;}};let session;const store=createStore({storage:null,persistence,contextId:'account:'+uid,appVersion:version,onSyncStatus:s=>statuses.push(s)});await store.ready;store.attachSync({contextId:'account:'+uid,createSession:options=>(session=createSyncSession({...options,deviceId:'qa-35-'+name,transport}))});const combat=createCombatEngine(store);window.qa35={store,combat,persistence,control,statuses,get session(){return session;},envelope:()=>JSON.parse(store.getFullJSON())};},{name,uid,version:APP_VERSION});await wait(page,()=>window.qa35.statuses.includes('synced'));}
async function wait(page,fn){await page.waitForFunction(fn,null,{timeout:20000});}
async function settled(page){const result=await page.evaluate(async()=>window.qa35.session.flush({localState:window.qa35.envelope()}));assert.equal(result.status,'synced');assert.equal(await page.evaluate(async()=>(await window.qa35.persistence.listOutbox()).length),0);}
async function pull(page){return page.evaluate(async()=>window.qa35.session.reconcile({localState:window.qa35.envelope()}));}
const envelope=page=>page.evaluate(()=>window.qa35.envelope());
async function context(name){const ctx=await browser.newContext({viewport:{width:name==='A'?1440:390,height:900},serviceWorkers:'block'});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());await page.goto(origin+'/qa.html');await boot(page,name);return {ctx,page};}
try{
 const rules=readFileSync(resolve(root,'firebase.database.rules.json'),'utf8');const loaded=await fetch(db+'/.settings/rules.json?ns='+namespace+'&access_token=owner',{method:'PUT',headers:{'content-type':'application/json'},body:rules});assert.equal(loaded.status,200);
 const signup=await fetch(auth+'/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-qa-35',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'qa35-'+Date.now()+'@control.test',password:'password123',returnSecureToken:true})});assert.equal(signup.status,200);({idToken:token,localId:uid}=await signup.json());
 await request('wfrp-sessions-v3/'+uid+'/current',{method:'PUT',body:{revision:0,state:fixture}});
 const mime={'.js':'text/javascript','.json':'application/json','.css':'text/css','.html':'text/html'};
 server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(u.pathname==='/qa/cloud'){let value;if(req.method==='POST'){let body='';for await(const part of req)body+=part;value=await transact(JSON.parse(body));}else value=await remote();res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));return;}if(u.pathname==='/qa.html'){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Recette cloud V5</title><main>Recette locale 2.5</main>');return;}const path=resolve(root,'.'+decodeURIComponent(u.pathname));assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'});res.end(readFileSync(path));}catch(e){res.writeHead(500);res.end(e.message);}});await new Promise(done=>server.listen(0,'127.0.0.1',done));origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const a=await context('A'),b=await context('B');const A=a.page,B=b.page;
 const HOWL='divine:miracle:ulric:howl-of-the-wolf';
 const wolvesOf=state=>state.combat.participants.filter(p=>p.extensions?.v5?.divineSummon);
 const hero=state=>state.combat.participants.find(p=>p.id==='hero');
 const layersOf=state=>(hero(state).extensions?.v5?.divineEffects||[]).filter(l=>l.type==='summon-creature');
 const view=state=>({round:state.combat.round,currentActorId:state.combat.currentActorId,order:state.combat.order,
  wolves:wolvesOf(state).map(w=>({id:w.id,name:w.name,hp:w.hp,maxHp:w.maxHp,caracs:w.caracs,zone:w.zone,link:w.extensions.v5.divineSummon})),
  layers:layersOf(state).map(l=>({id:l.id,executionId:l.executionId,expiry:l.expiry,summon:l.summon}))});
 /** Jamais deux loups, jamais d'identifiant en double, chaque loup lié à une couche vivante du prêtre. */
 const sane=(state,label,expected)=>{
  const ids=state.combat.participants.map(p=>p.id);assert.equal(new Set(ids).size,ids.length,'identifiants uniques ('+label+')');
  const w=wolvesOf(state);assert.ok(w.length<=1,'jamais deux loups ('+label+') : '+w.map(p=>p.id));
  if(expected!==undefined)assert.equal(w.length,expected,expected+' loup(s) ('+label+')');
  for(const wolf of w){
   const link=wolf.extensions.v5.divineSummon;
   if(link.endedPending)continue;
   assert.ok(layersOf(state).some(l=>l.id===link.layerId&&l.executionId===link.executionId),'loup lié à sa couche ('+label+')');
  }
 };
 const same=async(label,expected)=>{const a=await envelope(A),b=await envelope(B);sane(a,label+' A',expected);sane(b,label+' B',expected);assert.deepEqual(view(b),view(a),'états convergents ('+label+')');return a;};
 const castHowl=(page,roll=45)=>page.evaluate(async({prayerId,roll})=>{
  const s=window.qa35.store,round=s.getCombat().round;
  const p=s.previewDivineExecution(prayerId,{actorId:'hero',targetIds:['hero'],roll,canSpeak:true,choices:{range:0,targets:0,duration:0,effect:0},
   facts:{targets:{hero:{withinRange:true}}},expiry:{phase:'endOfTurn',round:round+5,actorId:'hero'}});
  if(!p.ready)throw Error(p.error||JSON.stringify(p.needsInput));
  const r=await s.applyDivineExecution(prayerId,{preview:p});if(r?.ok===false||r?.ready===false)throw Error(r.error);return p.executionId;
 },{prayerId:HOWL,roll});
 const endPrayer=(page,executionId)=>page.evaluate(async({executionId})=>{const s=window.qa35.store,r=await s.endDivinePrayer(executionId,{reason:'Fin de recette',baseRevision:s.getLocalRevision()});if(r?.ok===false)throw Error(r.error);},{executionId});
 const offline=(page,value)=>page.evaluate(v=>{window.qa35.control.offline=v;},value);
 const turn=async page=>{const r=await page.evaluate(async()=>window.qa35.store.nextTurn());assert.notEqual(r?.ok,false);await page.evaluate(()=>window.qa35.session.idle());};
 const fresh=async()=>{
  await A.evaluate(async initial=>window.qa35.store.loadFromJSON(initial),fixture);await settled(A);await pull(B);await settled(B);await pull(A);
  sane(await envelope(A),'départ propre',0);
 };
 await fresh();

 // 1. A lance en ligne, B reçoit une seule créature.
 await castHowl(A);await settled(A);await pull(B);
 let st=await same('lancement',1);
 const wolf1=wolvesOf(st)[0];
 assert.equal(wolf1.caracs.CC,45);assert.equal(wolf1.caracs.FM,35);assert.equal(wolf1.maxHp,24);assert.equal(wolf1.extensions.v5.divineSummon.ownerId,'hero');
 await pull(B);await settled(B);await pull(A);await same('lancement, second échange',1);
 check('A lance Hurlement du loup en ligne : B reçoit exactement un loup (CC 45, FM 35, 24 Blessures), même couche et même identifiant');

 // 2. Rechargement des deux clients (IndexedDB natif).
 await A.reload();await boot(A,'A');await settled(A);await pull(B);await B.reload();await boot(B,'B');await settled(B);await pull(A);
 await same('rechargements',1);
 check('Rechargement de A puis de B : une seule créature, états identiques');

 // 3. Vrais Tours : la main passe sans doublon ; le retrait à l'échéance arrive chez l'autre client.
 let guard=0;
 while(layersOf(await envelope(A)).length&&guard++<40){await turn(A);await settled(A);await pull(B);await same('Tour '+guard);}
 assert.ok(guard<40,'la couche expire');
 if(wolvesOf(await envelope(A)).length){assert.equal(wolvesOf(await envelope(A))[0].extensions.v5.divineSummon.endedPending,true);await turn(A);await settled(A);await pull(B);}
 await same('expiration',0);
 check('Expiration par Tours chez A (retrait différé si le loup est l’acteur courant) : le loup disparaît aussi chez B');
 await A.evaluate(async()=>window.qa35.store.undo());await settled(A);await pull(B);await same('Annuler après expiration');
 await A.evaluate(async()=>window.qa35.store.redo());await settled(A);await pull(B);await same('Rétablir après expiration',0);
 check('Annuler/Rétablir de l’expiration chez A : états convergents, jamais deux loups');

 // 4. Fin de la prière chez A retire la créature chez B.
 await fresh();
 const exec4=await castHowl(A);await settled(A);await pull(B);await same('avant fin',1);
 await endPrayer(A,exec4);await settled(A);await pull(B);
 await same('après fin',0);assert.equal(layersOf(await envelope(B)).length,0);
 await A.evaluate(async()=>window.qa35.store.undo());await settled(A);await pull(B);await same('Annuler la fin',1);
 await A.evaluate(async()=>window.qa35.store.redo());await settled(A);await pull(B);await same('Rétablir la fin',0);
 check('Fin de la prière chez A : la créature disparaît chez B ; Annuler la restitue, Rétablir la retire, sans doublon');

 // 5. Conflit : chacun lance un Hurlement hors ligne.
 for(const choice of ['remote','local']){
  await fresh();
  await offline(B,true);const localExec=await castHowl(B);await B.evaluate(()=>window.qa35.session.idle());
  const remoteExec=await castHowl(A,44);await settled(A);
  await offline(B,false);
  assert.equal((await pull(B)).status,'conflict','deux Hurlements concurrents : conflit explicite ('+choice+')');
  const conflict=JSON.parse(await B.evaluate(()=>window.qa35.store.exportSyncConflict()));
  const lw=wolvesOf(conflict.local.state),rw=wolvesOf(conflict.remote.state);
  assert.equal(lw.length,1);assert.equal(rw.length,1);assert.notEqual(lw[0].id,rw[0].id,'branches distinctes');
  assert.equal(lw[0].extensions.v5.divineSummon.executionId,localExec);assert.equal(rw[0].extensions.v5.divineSummon.executionId,remoteExec);
  await B.evaluate(c=>c==='remote'?window.qa35.store.resolveSyncRemote():window.qa35.store.resolveSyncLocal(),choice);
  await settled(B);await pull(A);await settled(A);await pull(B);
  st=await same('conflit '+choice,1);
  assert.equal(wolvesOf(st)[0].extensions.v5.divineSummon.executionId,choice==='remote'?remoteExec:localExec,'seule la branche choisie survit ('+choice+')');
  await B.reload();await boot(B,'B');await settled(B);await pull(A);await same('rechargement après conflit '+choice,1);
  check('Conflit hors ligne, deux Hurlements, résolution '+(choice==='remote'?'distante':'locale')+' : un seul loup, branche choisie, états convergents, rechargement stable');
 }

 // 6. Conflit : A prie, B passe un Tour hors ligne.
 for(const choice of ['remote','local']){
  await fresh();
  await offline(B,true);await turn(B);
  const exec=await castHowl(A);await settled(A);
  await offline(B,false);assert.equal((await pull(B)).status,'conflict','prière de A contre Tour de B : conflit ('+choice+')');
  const conflict=JSON.parse(await B.evaluate(()=>window.qa35.store.exportSyncConflict()));
  assert.equal(wolvesOf(conflict.local.state).length,0);assert.equal(wolvesOf(conflict.remote.state).length,1);
  await B.evaluate(c=>c==='remote'?window.qa35.store.resolveSyncRemote():window.qa35.store.resolveSyncLocal(),choice);
  await settled(B);await pull(A);await settled(A);await pull(B);
  const expected=choice==='remote'?1:0;st=await same('prière contre Tour '+choice,expected);
  if(expected)assert.equal(wolvesOf(st)[0].extensions.v5.divineSummon.executionId,exec);
  let more=0;
  while(layersOf(await envelope(A)).length&&more++<40){await turn(B);await settled(B);await pull(A);await same('Tours après conflit');}
  if(wolvesOf(await envelope(A)).length){await turn(B);await settled(B);await pull(A);}
  await same('fin après conflit '+choice,0);
  check('Conflit prière de A / Tour de B hors ligne, résolution '+(choice==='remote'?'distante':'locale')+' : '+(expected?'le loup de A subsiste une fois':'aucun loup fantôme')+', convergence, Tours suivants sains');
 }

 assert.deepEqual(errors,[]);
 mkdirSync(resolve(root,'tmp/divin'),{recursive:true});
 writeFileSync(resolve(root,'tmp/divin/p4c-cloud-receipt.json'),JSON.stringify({appVersion:APP_VERSION,checks,services:'localhost Auth/RTDB',namespace,errors},null,2));
 await a.ctx.close();await b.ctx.close();console.log('PASS — recette cloud des invocations divines (P4c)');
}finally{await browser?.close();if(server)await new Promise(done=>server.close(done));if(token)try{await request('',{method:'DELETE',owner:true});}catch{} }
