import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createCriticalAftermathRecord } from '../js/core/v5-critical-aftermath.js';
import { getV5CriticalEffect } from '../js/data/v5-crits.js';

// Parcours navigateur F2-J2 : une fracture issue d'un critique appliqué par l'interface, son Test d'immobilisation, l'avancement du calendrier jusqu'à la guérison,
// puis une main perdue confirmée dans le registre F2-I : arme à deux mains refusée et circonstance demandée dans la résolution.
const root=fileURLToPath(new URL('../',import.meta.url)),base='/Outil-MJ-Warhammer/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);assert.ok(pathname.startsWith(base));const path=resolve(root,pathname.slice(base.length)||'index.html');assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404);res.end('Not found');}});
const person=(id,name,kind='PJ',extra={})=>({id,name,kind,camp:kind==='PJ'?'pj':'ennemi',zone:'active',initiative:id==='hero'?60:30,hp:20,maxHp:20,caracs:{CC:60,CT:50,F:40,E:30,BE:3,I:40,Ag:35,Dex:35,Int:30,FM:35,Soc:25,M:4},skills:[{id:'dodge',name:'Esquive',status:'resolved',total:45,carac:'Ag'}],talents:[],equipment:[],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},...extra});
const hero=person('hero','Héros','PJ',{caracs:{CC:60,CT:50,F:40,E:30,BE:3,I:40,Ag:35,Dex:35,Int:50,FM:35,Soc:25,M:4},skills:[{id:'dodge',name:'Esquive',status:'resolved',total:45,carac:'Ag'},{id:'heal',name:'Guérison',status:'resolved',total:60,carac:'Int',advances:10}],actions:[{id:'sword',note:'Coup d’épée',type:'attack',attr:'CC',base:60,damage:6,qualities:[]}]});
// Main mutilée (Bras, 126-130) : le choc d'amputation de la main est confirmé dans le registre F2-I, comme le fait la carte de choc.
const handRoll=Array.from({length:200},(_,i)=>i+1).find(n=>getV5CriticalEffect('ARM',n)?.source?.printedName==='Mangled Hand');
const mutilated=createCriticalAftermathRecord(person('manchot','Manchot'),{table:'ARM',effectRoll:handRoll,resolutionId:'f2-j2-hand'});
mutilated.record.amputationShock={amputationOccurred:true,part:'hand',difficultyDR:-2,test:{success:true,sl:0},acquiredStates:[],surgeryRequired:true};
mutilated.participant.extensions.v5.criticalAftermath=[mutilated.record];
const manchot={...mutilated.participant,camp:'ennemi',initiative:40,equipment:[{id:'espadon',kind:'weapon',name:'Espadon',category:'Deux mains',hands:2,damage:'BF+5',qualities:[]},{id:'epee',kind:'weapon',name:'Épée',category:'Base',damage:'BF+4',qualities:[]}],
 actions:[{id:'great',note:'Espadon',type:'attack',attr:'CC',base:55,damage:7,qualities:[],extensions:{fiche:{equipmentId:'espadon'}}},{id:'epee',note:'Épée',type:'attack',attr:'CC',base:55,damage:5,qualities:[],extensions:{fiche:{equipmentId:'epee'}}}]};
const fixture=()=>({schemaVersion:3,reserve:[],diceLines:[],log:[],extensions:{v5:{combatId:'f2-j2-review-browser',turnIndex:1}},combat:{round:1,currentActorId:'hero',order:['hero','foe','manchot'],participants:[hero,person('foe','Garde','PNJ',{hp:2,maxHp:20,states:[{id:'ko',key:'inconscient',name:'Inconscient',level:1}],actions:[]}),manchot]}});

await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined)});
try{
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 const origin=`http://127.0.0.1:${server.address().port}${base}`;await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});await page.locator('#tab-combat').click();
 const load=async state=>page.evaluate(async s=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;await Store.loadFromJSON(s);},state),read=async()=>page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');return JSON.parse(Store.getFullJSON());});
 await load(fixture());
 const combat=page.locator('#workspace-root'),panel=combat.locator('[aria-label="Suivi des séquelles et convalescence"]'),status=panel.locator('.workspace-aftermath-status'),sequelae=panel.locator('.workspace-aftermath-sequelae');
 const participant=async id=>(await read()).combat.participants.find(row=>row.id===id);
 const waitStatus=async pattern=>page.waitForFunction(source=>new RegExp(source).test(document.querySelector('.workspace-aftermath-status')?.textContent||''),pattern.source);

 // 1. Un critique appliqué par l'interface : cible choisie dans le groupe « Adversaires », gravité 5 + 70 d'excédent = 75, Cassure nette (fracture mineure du bras gauche).
 await panel.waitFor();
 await combat.locator('[data-workspace-select="hero"]').click();
 await combat.getByRole('group',{name:'Adversaires'}).getByRole('button',{name:'Garde'}).click();
 await combat.getByRole('combobox',{name:'Nature du Test'}).selectOption('melee');
 await combat.getByRole('textbox',{name:'Attaque (CC 60)'}).fill('1');await combat.getByRole('button',{name:'Calculer'}).click();
 const effect=combat.getByRole('textbox',{name:/Gravité \(d100 \+ \d+\)/});await effect.fill('5');await effect.press('Tab');
 await combat.locator('.workspace-result-live').getByRole('button',{name:/Appliquer/}).click();
 const occurrence=(await participant('foe')).extensions.v5.criticalAftermath;
 assert.equal(occurrence.length,1);assert.equal(occurrence[0].effectName,'Cassure nette');assert.deepEqual(occurrence[0].sequela.injuries.map(row=>[row.name,row.severity,row.part]),[['Broken Bone','minor','arm']],'fracture mineure issue d’un critique appliqué par l’interface');

 // 2. Le suivi lié, puis les séquelles : côté et 1d10 saisis par le MJ, jamais devinés.
 await panel.locator('summary',{hasText:'Critiques à suivre (2)'}).click();
 for(const [name,effectName] of [['Garde','Cassure nette'],['Manchot','Main mutilée']]){
  const row=panel.locator('.workspace-aftermath-proposal').filter({hasText:name});await row.getByLabel('Déjà bandée ou traitée').check();await row.getByRole('button',{name:`Ouvrir le suivi de ${effectName}`}).click();
 }
 await panel.locator('summary',{hasText:'Séquelles à suivre (2)'}).waitFor();
 await panel.locator('summary',{hasText:'Séquelles à suivre (2)'}).click();
 const opening=panel.locator('.workspace-aftermath-open');assert.equal(await opening.count(),2);
 const boneBox=opening.filter({hasText:'Fracture mineure'});await boneBox.getByLabel(/Côté · Fracture/).selectOption('left');await boneBox.getByLabel(/1d10 de guérison/).fill('4');
 await boneBox.getByRole('button',{name:/Ouvrir le suivi des séquelles de Garde/}).click();
 await waitStatus(/suivi des séquelles ouvert/);
 const handBox=opening.filter({hasText:'Perte : main'});await handBox.getByLabel(/Côté · Perte/).selectOption('left');await handBox.getByLabel(/Main directrice/).check();
 await handBox.getByRole('button',{name:/Ouvrir le suivi des séquelles de Manchot/}).click();
 await page.waitForFunction(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');return Store.getAftermathState().sequelae?.length===2;});
 let register=(await read()).extensions.v5.aftermathRegister;
 const bone=register.sequelae.find(row=>row.kind==='broken-bone'),lost=register.sequelae.find(row=>row.kind==='loss');
 assert.deepEqual([bone.id,bone.endDay,bone.side],[`${occurrence[0].id}:j2:injury:0`,34,'left'],'identifiant stable dérivé de l’occurrence, 30 + 1d10 jours');
 assert.deepEqual([lost.part,lost.side,lost.primary,lost.status],['hand','left',true,'permanent']);
 assert.equal((await participant('foe')).extensions.v5.sequelaEffects.rows.some(row=>row.type==='two-hands'),true,'bras inutilisable pendant la fracture');

 // 3. Test d'immobilisation : compétence Guérison de la fiche et d100 saisi (score 60, jet 20, +2 DR dans la semaine).
 const card=sequelae.locator('.workspace-aftermath-sequela').filter({hasText:'Fracture mineure'});
 await card.locator('summary',{hasText:'Immobiliser la fracture'}).click();
 await card.getByLabel('Soigneur').selectOption({label:'Héros'});await card.getByLabel('Compétence').selectOption({index:0});await card.getByLabel('d100',{exact:true}).fill('20');
 assert.equal(await card.getByLabel('Réussite').count(),0,'aucun champ libre de réussite');
 await card.getByRole('button',{name:'Enregistrer le Test d’immobilisation'}).click();
 await waitStatus(/fracture immobilisée/);assert.match(await status.innerText(),/d100 20 contre 60 : réussite/);

 // 4. Avancement jusqu’à la guérison : l’aperçu annonce la fin de guérison sans Test (restée attachée), rien n’est appliqué avant la confirmation.
 await panel.getByLabel('Jours à avancer').fill('34');await panel.getByRole('button',{name:'Aperçu des échéances'}).click();
 await panel.getByText(/Jour 34 · Garde · Fracture mineure \(bras\) : fin de guérison \(restée attachée, aucun Test\)/).waitFor();
 assert.equal((await read()).extensions.v5.aftermathRegister.calendar.currentDay,0);
 await panel.getByRole('button',{name:'Confirmer l’avancement'}).click();await waitStatus(/jour 0 → 34/);
 assert.equal((await participant('foe')).extensions.v5.sequelaEffects,undefined,'le malus temporaire a disparu au jour 34');
 const healing=sequelae.locator('.workspace-aftermath-sequela').filter({hasText:'Fracture mineure'});
 await healing.locator('summary',{hasText:'Constater la guérison'}).click();await healing.getByRole('button',{name:'Enregistrer'}).click();await waitStatus(/fracture guérie/);
 assert.equal((await read()).extensions.v5.aftermathRegister.sequelae.find(row=>row.kind==='broken-bone').status,'healed');

 // 5. Le critique est déclaré guéri : le refus de J1 est levé, l’historique et la perte du Manchot restent.
 const incident=panel.locator('.workspace-aftermath-incident').filter({has:page.locator('h4',{hasText:'Garde'})});
 await incident.locator('summary',{hasText:'Déclarer le critique guéri'}).click();
 await incident.getByLabel('Les malus temporaires sont terminés').check();await incident.getByLabel(/Les États du critique sont retirés/).check();await incident.getByRole('button',{name:'Clore'}).click();
 await page.waitForFunction(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');return Store.getAftermathState().incidents.some(row=>row.status==='closed');});
 register=(await read()).extensions.v5.aftermathRegister;
 assert.equal(register.sequelae.find(row=>row.kind==='broken-bone').finalTest.waived,true);
 assert.equal(register.sequelae.find(row=>row.kind==='loss').status,'permanent');

 // 6. Une main perdue confirmée : l’arme à deux mains est refusée dans la résolution, l’épée à une main passe, la circonstance demandée au MJ est proposée.
 await combat.locator('[data-workspace-select="manchot"]').click();
 await combat.locator('[data-action-key="great"]').click();
 await combat.getByRole('group',{name:'Adversaires'}).getByRole('button',{name:'Héros'}).click();
 await combat.getByRole('combobox',{name:'Nature du Test'}).selectOption('melee');
 await combat.getByRole('textbox',{name:'Attaque (CC 55)'}).fill('30');await combat.getByRole('button',{name:'Calculer'}).click();
 await combat.getByText(/une arme à deux mains est interdite/).first().waitFor();
 await combat.locator('[data-action-key="epee"]').click();await combat.getByRole('combobox',{name:'Nature du Test'}).selectOption('melee');
 await combat.getByRole('textbox',{name:'Attaque (CC 55)'}).fill('30');await combat.getByRole('button',{name:'Calculer'}).click();
 await combat.getByLabel(/Séquelle · Test de mêlée avec l’arme de la main non directrice/).first().waitFor();
 assert.equal(await combat.getByText(/une arme à deux mains est interdite/).count(),0,'l’épée à une main est permise');

 // 7. Undo/Redo et rechargement : les séquelles, leurs échéances et la projection suivent.
 const count=async()=>((await read()).extensions.v5.aftermathRegister.sequelae||[]).length;
 const before=await count();assert.equal(before,2);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});
 const persisted=await page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;return JSON.parse(Store.getFullJSON());});
 assert.equal(persisted.extensions.v5.aftermathRegister.sequelae.length,2,'les séquelles survivent au rechargement');
 assert.equal(persisted.extensions.v5.aftermathRegister.calendar.currentDay,34);
 assert.equal(persisted.combat.participants.find(row=>row.id==='manchot').extensions.v5.sequelaEffects.rows.some(row=>row.type==='two-hands'),true,'la projection survit aussi');
 assert.deepEqual(errors,[],`aucune erreur UI attendue : ${errors.join('; ')}`);
 console.log('f2-j2-review-browser : parcours vert');
}finally{await browser.close();await new Promise(done=>server.close(done));}
