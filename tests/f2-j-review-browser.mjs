import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Parcours navigateur F2-J : un critique appliqué par l'interface crée l'occurrence F2-I, le panneau propose le suivi lié,
// un soin passe par la compétence Guérison du soigneur et un d100, un saut de trois jours liste chaque Test quotidien.
const root=fileURLToPath(new URL('../',import.meta.url)),base='/Outil-MJ-Warhammer/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);assert.ok(pathname.startsWith(base));const path=resolve(root,pathname.slice(base.length)||'index.html');assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404);res.end('Not found');}});
const person=(id,name,kind='PJ',extra={})=>({id,name,kind,camp:kind==='PJ'?'pj':'ennemi',zone:'active',initiative:id==='hero'?60:30,hp:20,maxHp:20,caracs:{CC:60,CT:50,F:40,E:30,BE:3,I:40,Ag:35,Dex:35,Int:30,FM:35,Soc:25},skills:[{id:'dodge',name:'Esquive',status:'resolved',total:45,carac:'Ag'}],talents:[],equipment:[],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},...extra});
const hero=person('hero','Héros','PJ',{caracs:{CC:60,CT:50,F:40,E:30,BE:3,I:40,Ag:35,Dex:35,Int:50,FM:35,Soc:25},skills:[{id:'dodge',name:'Esquive',status:'resolved',total:45,carac:'Ag'},{id:'heal',name:'Guérison',status:'resolved',total:60,carac:'Int',advances:10}],actions:[{id:'sword',note:'Coup d’épée',type:'attack',attr:'CC',base:60,damage:20,qualities:[]}]});
const fixture=()=>({schemaVersion:3,reserve:[],diceLines:[],log:[],extensions:{v5:{combatId:'f2-j-review-browser',turnIndex:1}},combat:{round:1,currentActorId:'hero',order:['hero','foe','cripple'],participants:[hero,person('foe','Garde','PNJ',{hp:2,maxHp:20,states:[{id:'ko',key:'inconscient',name:'Inconscient',level:1}],actions:[]}),person('cripple','Éclopé','PJ',{hp:10,maxHp:20})]}});

await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined)});
try{
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 const origin=`http://127.0.0.1:${server.address().port}${base}`;await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});await page.locator('#tab-combat').click();
 const load=async state=>page.evaluate(async s=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;await Store.loadFromJSON(s);},state),read=async()=>page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');return JSON.parse(Store.getFullJSON());});
 await load(fixture());
 const combat=page.locator('#workspace-root'),panel=combat.locator('[aria-label="Suivi des séquelles et convalescence"]'),card=name=>panel.locator('.workspace-aftermath-incident').filter({has:page.locator('h4',{hasText:name})}),status=panel.locator('.workspace-aftermath-status');
 const participant=async id=>(await read()).combat.participants.find(row=>row.id===id);

 // 1. Un critique appliqué par l'interface crée l'occurrence F2-I ; aucune occurrence, aucun suivi proposé avant.
 await panel.waitFor();
 await panel.locator('summary',{hasText:'Critiques à suivre (0)'}).waitFor();
 await combat.locator('[data-workspace-select="hero"]').click();
 await combat.getByRole('combobox',{name:'Nature du Test'}).selectOption('melee');
 await combat.getByRole('textbox',{name:'Attaque (CC 60)'}).fill('1');await combat.getByRole('button',{name:'Calculer'}).click();
 const effect=combat.getByRole('textbox',{name:'Gravité (d100 + 210)'});await effect.fill('45');await effect.press('Tab');
 await combat.locator('.workspace-result-live').getByRole('button',{name:/Appliquer/}).click();
 const occurrence=(await participant('foe')).extensions.v5.criticalAftermath;assert.ok(occurrence?.length,'le critique appliqué par l’interface crée l’occurrence F2-I');

 // 2. Le panneau propose le suivi lié ; il n'existe aucun autre moyen d'ouvrir un suivi de critique.
 await panel.locator('summary',{hasText:'Critiques à suivre (1)'}).click();
 await panel.getByRole('button',{name:/^Ouvrir le suivi de/}).click();
 await card('Garde').waitFor();
 const register=(await read()).extensions.v5.aftermathRegister;assert.equal(register.incidents.length,1);assert.equal(register.incidents[0].source.criticalId,occurrence[0].id,'lien par identifiant stable de l’occurrence');
 await panel.locator('summary',{hasText:'Critiques à suivre (0)'}).waitFor();

 // 3. Un soin : soigneur, compétence de la fiche et d100 ; le moteur calcule réussite et DR (score 60, jet 20 : 4 DR, Int 50 : 9 Blessures).
 const treatment=card('Garde').locator('details',{hasText:'Guérison'}).first();
 await treatment.locator('summary').click();
 await treatment.getByLabel('Soigneur').selectOption({label:'Héros'});
 await treatment.getByLabel('Compétence').selectOption({index:0});
 await treatment.getByLabel('d100',{exact:true}).fill('20');
 assert.equal(await treatment.getByLabel('Réussite').count()+await treatment.getByLabel('DR du Test de soin').count(),0,'aucun champ libre de résultat ou de réussite');
 await treatment.getByRole('button',{name:'Enregistrer le Test de soin'}).click();
 await page.waitForFunction(()=>/Blessure\(s\) rendue\(s\)/.test(document.querySelector('.workspace-aftermath-status')?.textContent||''));
 assert.match(await status.innerText(),/d100 20 contre 60 : réussite, 4 DR · 9 Blessure\(s\) rendue\(s\)/);
 assert.equal((await participant('foe')).hp,9);

 // 4. Blessures perdues hors critique : le blessé doit avoir perdu des Blessures.
 await panel.locator('summary',{hasText:'Blessures perdues hors critique'}).click();
 const lost=panel.locator('details',{hasText:'Blessures perdues hors critique'});
 assert.deepEqual(await lost.getByLabel('Blessé').locator('option').allInnerTexts(),['Choisir…','Garde (9/20)','Éclopé (10/20)']);
 await lost.getByLabel('Blessé').selectOption({label:'Éclopé (10/20)'});await lost.getByLabel('Cause').fill('Chute dans l’escalier');
 await lost.getByRole('button',{name:'Créer le suivi'}).click();await card('Éclopé').waitFor();

 // 5. Saut de trois jours : l'aperçu liste chaque Test quotidien ; rien n'est appliqué sans les jets ; l'infection du jour 1 ignore le jour 2.
 await panel.getByLabel('Jours à avancer').fill('3');await panel.getByRole('button',{name:'Aperçu des échéances'}).click();
 const rolls=panel.locator('.workspace-aftermath-check');assert.equal(await rolls.count(),3,'trois Tests quotidiens listés, jour par jour');
 assert.match(await rolls.nth(0).innerText(),/Éclopé.*fin du jour 0.*Résistance \+2 DR \(score 30\)/);assert.match(await rolls.nth(2).innerText(),/requis seulement si les jours précédents sont réussis/);
 await panel.getByRole('button',{name:'Confirmer l’avancement'}).click();
 await page.waitForFunction(()=>/Refus/.test(document.querySelector('.workspace-aftermath-status')?.textContent||''));
 assert.equal((await read()).extensions.v5.aftermathRegister.calendar.currentDay,0,'aucun saut sans les jets demandés');
 await panel.getByLabel('Jours à avancer').waitFor();
 if(!await rolls.count()){await panel.getByRole('button',{name:'Aperçu des échéances'}).click();}
 await panel.getByLabel(/d100 du jour 0/).fill('10');await panel.getByLabel(/d100 du jour 1/).fill('99');await panel.getByLabel(/d100 du jour 2/).fill('10');
 await panel.getByRole('button',{name:'Confirmer l’avancement'}).click();
 await page.waitForFunction(()=>/jour 0 → 3/.test(document.querySelector('.workspace-aftermath-status')?.textContent||''));
 const jumped=(await read()).extensions.v5.aftermathRegister,sick=jumped.incidents.find(row=>row.participantId==='cripple');
 assert.deepEqual([jumped.calendar.currentDay,sick.infection,sick.dailyChecks.map(check=>[check.day,check.success])],[3,true,[[0,true],[1,false]]],'infection au jour 1, jour 2 ignoré');

 // 6. Undo/Redo et rechargement.
 await page.locator('#btn-undo').click();assert.equal((await read()).extensions.v5.aftermathRegister.calendar.currentDay,0,'Undo annule le saut');
 await page.locator('#btn-menu').click();await page.locator('#btn-redo').click();assert.equal((await read()).extensions.v5.aftermathRegister.calendar.currentDay,3,'Redo rétablit le saut');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});
 const persisted=await page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;return JSON.parse(Store.getFullJSON());});
 assert.equal(persisted.extensions.v5.aftermathRegister.calendar.currentDay,3,'le registre survit au rechargement');
 assert.deepEqual(errors,[],`aucune erreur UI attendue : ${errors.join('; ')}`);
 console.log('f2-j-review-browser : parcours vert');
}finally{await browser.close();await new Promise(done=>server.close(done));}
