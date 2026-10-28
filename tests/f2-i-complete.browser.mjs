import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createCriticalAftermathRecord } from '../js/core/v5-critical-aftermath.js';
import { getV5CriticalEffect } from '../js/data/v5-crits.js';

// Full app + real Store; JSON seeds only documented preconditions that would
// otherwise require many combat rounds (existing critical aftermath records).
const root=fileURLToPath(new URL('../',import.meta.url)),base='/Outil-MJ-Warhammer/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);assert.ok(pathname.startsWith(base));const path=resolve(root,pathname.slice(base.length)||'index.html');assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404);res.end('Not found');}});
const person=(id,name,kind='PJ',extra={})=>({id,name,kind,camp:kind==='PJ'?'pj':'ennemi',zone:'active',initiative:id==='hero'?60:30,hp:20,maxHp:20,caracs:{CC:60,CT:50,F:40,E:30,BE:3,I:40,Ag:35,Dex:35,Int:30,FM:35,Soc:25},skills:[{id:'dodge',name:'Esquive',status:'resolved',total:45,carac:'Ag'}],talents:[],equipment:[],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},...extra});
const seedCritical=(target,table,effectRoll,resolutionId)=>createCriticalAftermathRecord(target,{table,effectRoll,resolutionId,criticalIndex:0,round:1});
const hero=person('hero','Héros','PJ',{actions:[{id:'sword',note:'Coup d’épée',type:'attack',attr:'CC',base:60,damage:20,qualities:[]} ]});
const toe=seedCritical(person('toe','PJ Toe'), 'LEG',110,'browser-toe');
const fatal=seedCritical(person('fatal','PJ Fatale'), 'HEAD',100,'browser-fatal');
const refusedFatal=seedCritical(person('refused-fatal','PJ Refusé'), 'HEAD',100,'browser-refused-fatal');
const handRoll=Array.from({length:200},(_,i)=>i+1).find(n=>getV5CriticalEffect('ARM',n)?.source?.printedName==='Cleft Hand');
assert.ok(handRoll,'Cleft Hand fixture exists in the V5 table');
const handBase=seedCritical(person('hand','PJ Main'), 'ARM',handRoll,'browser-hand');
// Explicit hand fixture corresponding to the printed Cleft Hand line and the
// already-confirmed loss of all fingers; the hand shock itself stays pending.
const handRecord={...handBase.record,effectName:'Main ouverte',sequela:{...handBase.record.sequela,durableEffects:[{kind:'amputation',part:'hand',difficultySL:-1,conditional:true,trigger:'all-fingers-lost'}]},amputationShock:{amputationOccurred:true,part:'finger',difficultyDR:-1,test:{success:false,sl:-1},acquiredStates:['À Terre','Sonné'],surgeryRequired:true}};
const hand={...handBase.participant,extensions:{v5:{...handBase.participant.extensions.v5,criticalAftermath:[handRecord]}}};
const toeTarget={...toe.participant,zone:'active'},fatalTarget={...fatal.participant,zone:'active'},refusedTarget={...refusedFatal.participant,zone:'active'},combatFixture=()=>({schemaVersion:3,reserve:[],diceLines:[],log:[],extensions:{v5:{combatId:'f2-i-complete-browser',turnIndex:1}},combat:{round:1,currentActorId:'hero',order:['hero','foe'],participants:[hero,person('foe','Garde','PNJ',{hp:2,maxHp:20,states:[{id:'ko',key:'inconscient',name:'Inconscient',level:1}],actions:[]}),toeTarget,fatalTarget,refusedTarget,hand]}});

await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined)});
try{
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 const origin=`http://127.0.0.1:${server.address().port}${base}`;await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});await page.locator('#tab-combat').click();
 const load=async state=>page.evaluate(async s=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;await Store.loadFromJSON(s);},state),read=async()=>page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');return JSON.parse(Store.getFullJSON());});
 await load(combatFixture());const combat=page.locator('#workspace-root');await combat.locator('[data-workspace-select="hero"]').click();
 await combat.getByRole('combobox',{name:'Nature du Test'}).selectOption('melee');
 await combat.getByRole('textbox',{name:'Attaque (CC 60)'}).fill('1');await combat.getByRole('button',{name:'Calculer'}).click();
 const attackPreview=combat.locator('.workspace-result-live');
 // The attack's actual roll derives the hit location; excess wounds add severity.
 const effect=combat.getByRole('textbox',{name:'Gravité (d100 + 210)'});await effect.fill('45');await effect.press('Tab');
 const previewText=await attackPreview.innerText();assert.match(previewText,/critique/i,'attaque d’interface avec critique visible');
 assert.match(previewText,/critique d’excédent/i,'la résolution présente explicitement le critique d’excédent');
 assert.ok(previewText.length>0);
 await attackPreview.getByRole('button',{name:/Appliquer/}).click();
 const appliedAttack=await read(),foeAfter=appliedAttack.combat.participants.find(p=>p.id==='foe');assert.ok(foeAfter.extensions.v5.criticalAftermath?.length,'le critique/excédent produit une séquelle Store après application UI');
 // The rest starts from explicit critical aftermath preconditions in the fixture.
 await load(combatFixture());
 const declined=page.locator('[aria-label="Chocs d’amputation à résoudre"]');await declined.waitFor();
 const toeRow=declined.locator('.workspace-critical-amputation-controls').nth(1);
 await toeRow.getByRole('combobox').nth(0).selectOption('false');await toeRow.getByRole('button',{name:'Enregistrer le choc'}).click();
 assert.equal((await read()).combat.participants.find(p=>p.id==='toe').extensions.v5.criticalAftermath[0].amputationShockStatus,'not-occurred','choix Non conditionnel enregistré');
 const handRow=page.locator('[aria-label="Chocs d’amputation à résoudre"] .workspace-critical-amputation-controls').nth(0);
 await handRow.getByRole('combobox').nth(0).selectOption('true');await handRow.getByRole('combobox').nth(1).selectOption('failure');await handRow.locator('input[type="number"]').fill('-2');await handRow.getByRole('button',{name:'Enregistrer le choc'}).click();
 const handAfter=await read(),handSaved=handAfter.combat.participants.find(p=>p.id==='hand').extensions.v5.criticalAftermath[0];assert.equal(handSaved.amputationShocks?.at(-1)?.part,'hand','second choc distinct de main enregistré via UI');
 const deaths=page.locator('[aria-label="Décisions MJ sur les morts critiques"]');await deaths.waitFor();const fatalRow=deaths.locator('.workspace-result-line').filter({hasText:'PJ Fatale'}),refusedRow=deaths.locator('.workspace-result-line').filter({hasText:'PJ Refusé'});assert.ok(await fatalRow.getByRole('button',{name:'Confirmer la mort'}).isEnabled());await fatalRow.getByRole('button',{name:'Confirmer la mort'}).click();await refusedRow.getByRole('button',{name:'Refuser la mort'}).click();
 const deathState=await read();assert.equal(deathState.combat.participants.find(p=>p.id==='fatal').extensions.v5.dead,true,'mort critique confirmée par MJ');assert.notEqual(deathState.combat.participants.find(p=>p.id==='refused-fatal').extensions.v5.dead,true,'autre mort critique refusée par MJ');
 const npcState=combatFixture();npcState.combat.participants.push(person('extra','Figurant','PNJ',{hp:0,maxHp:8}));await load(npcState);
 await page.getByRole('checkbox',{name:'Activer la mort subite des figurants'}).check();await page.getByRole('checkbox',{name:'Figurant : confirmer PNJ secondaire'}).check();await page.getByRole('button',{name:'Choisir : mort'}).click();
 assert.equal((await read()).combat.participants.find(p=>p.id==='extra').extensions.v5.dead,true,'mort subite PNJ appliquée après confirmations visibles');
 await page.locator('#btn-undo').click();assert.notEqual((await read()).combat.participants.find(p=>p.id==='extra').extensions.v5.dead,true,'Undo annule la décision PNJ');await page.locator('#btn-menu').click();await page.locator('#btn-redo').click();assert.equal((await read()).combat.participants.find(p=>p.id==='extra').extensions.v5.dead,true,'Redo réapplique la décision PNJ');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});const persisted=await page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;return JSON.parse(Store.getFullJSON());});assert.equal(persisted.combat.participants.find(p=>p.id==='extra').extensions.v5.dead,true,'état redo persisté après reload');assert.deepEqual(errors,[],'aucune erreur JavaScript');
 console.log('F2-I navigateur complet : attaque critique/aperçu excédent, refus conditionnel, second choc de main, refus de mort critique, mort subite figurant, Undo/Redo/reload passés. Préconditions de suivis injectées en JSON dans le vrai Store.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
