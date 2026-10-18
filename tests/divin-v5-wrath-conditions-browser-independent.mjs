/** Contrôle indépendant des gestes Courroux 61–65 / 89–95, navigateur + IndexedDB natif. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=process.env.DIVINE_WRATH_CONDITIONS_UI_OUTPUT||resolve(root,'tmp/divin/wrath-conditions-browser-independent');mkdirSync(output,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';const path=resolve(root,relative);assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':types[extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404).end('Resource unavailable');}});
const receipt={passed:false,scope:'Courroux 61–65/89–95: gestes réels, aperçu inerte, acquisition, reload IndexedDB, quatre captures responsive',checks:[],screenshots:[]};
const check=description=>receipt.checks.push(description);let browser,page,serverStarted=false;
const state=()=>page.evaluate(async()=>{const{Store}=await import('/js/main.js');await Store.whenIdle();const value=JSON.parse(Store.getFullJSON());delete value.exportedAt;return value;});
const ready=()=>page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block');
const openPanel=async()=>{const panel=page.locator('[data-divine-panel]');await panel.waitFor({state:'attached'});if(!await panel.evaluate(el=>el.open))await panel.locator('summary').first().click();return panel;};
const seed=async()=>page.evaluate(async()=>{
 const{Store}=await import('/js/main.js');const{getAllDivineContracts}=await import('/js/core/v5-divine-store.js');
 const battle=getAllDivineContracts().find(c=>c.id==='divine:blessing:myrmidia:battle');
 const person=(id,name)=>({id,name,kind:'PJ',camp:'pj',zone:'active',initiative:id==='priest'?60:30,hp:20,maxHp:30,
  caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,arms:0,legs:0},states:[],actions:[],
  skills:id==='priest'?[{id:'skill-50_72_69_e8_72_65-base',name:'Prière',status:'resolved',total:60}]:[],
  talents:id==='priest'?[{id:battle.requiredTalent.catalogueTalentId,status:'resolved',specialization:'Myrmidia',rank:1},{id:'talent-invoke',status:'resolved',specialization:'Myrmidia',rank:1}]:[],prayers:[],
  extensions:{v5:{divine:{sin:1},...(id==='priest'?{hasMomentum:true}:{})}}});
 await Store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[person('priest','Prêtresse'),person('ally','Allié')]},diceLines:[],log:[],extensions:{v5:{turnIndex:1}}});
});
const prepare=async({roll,wrathRoll})=>{
 const panel=await openPanel();await panel.getByRole('combobox',{name:'Prière divine',exact:true}).selectOption('divine:blessing:myrmidia:battle');
 await panel.getByRole('checkbox',{name:'Destinataire Allié',exact:true}).check();
 await panel.getByRole('combobox',{name:'Allié · Portée / zone confirmée',exact:true}).selectOption('true');
 await panel.getByRole('combobox',{name:'Le personnage peut prononcer la prière',exact:true}).selectOption('true');
 await panel.getByRole('spinbutton',{name:'Jet de Prière (d100)',exact:true}).fill(String(roll));
 await panel.locator('[data-divine-action="calculate"]').click();
 await panel.getByRole('spinbutton',{name:'Jet de Courroux (d100)',exact:true}).fill(String(wrathRoll));
 await panel.locator('[data-divine-action="calculate"]').click();return panel;
};
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));serverStarted=true;
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:900}});await context.route('https://**',route=>route.abort());
 page=await context.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});await ready();await seed();
 await page.getByRole('tab',{name:'Jouer',exact:true}).click();const actor=page.locator('[data-workspace-select="priest"]');if(await actor.count())await actor.click();
 let panel=await prepare({roll:99,wrathRoll:51});
 const resultText=await panel.locator('.workspace-divine-preview').innerText();
 assert.match(resultText,/Hémorragique/);assert.match(resultText,/2 état/i);assert.doesNotMatch(resultText,/reste à résoudre/i);
 assert.match(resultText,/seront acquis|à l’application|en attente d’application/i,'l’aperçu présente l’acquisition comme future');
 assert.match(resultText,/Élan.*(?:sera perdu|perdu)|Momentum.*perdu/i,'l’aperçu annonce la perte de Momentum qui sera appliquée');
 assert.equal(await panel.locator('[data-divine-action="apply"]').isDisabled(),false,'le Courroux sourcé est appliquable sans champ de conséquences MJ');
 for(const [width,theme] of [[1440,'dark'],[1440,'light'],[390,'dark'],[390,'light']]){
  await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}/${theme}: pas de débordement horizontal`);
  assert.match(await panel.innerText(),/Hémorragique/,'le résultat reste lisible dans chaque viewport');
  const file=`wrath-conditions-${width}-${theme}.png`;await page.screenshot({path:resolve(output,file),fullPage:true});receipt.screenshots.push(file);
 }
 assert.equal((await state()).combat.participants.find(row=>row.id==='priest').states.length,0,'l’aperçu reste inerte');
 assert.equal((await state()).combat.participants.find(row=>row.id==='priest').extensions.v5.hasMomentum,true,'l’aperçu ne consomme pas Élan');
 await panel.locator('[data-divine-action="apply"]').click();
 await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');await Store.whenIdle();return Store.listParticipants().find(row=>row.id==='priest').states.some(row=>row.key==='hemorragique');});
 let after=await state();assert.equal(after.combat.participants.find(row=>row.id==='priest').states.find(row=>row.key==='hemorragique').level,2);
 assert.equal(after.combat.participants.find(row=>row.id==='priest').extensions.v5.hasMomentum,false,'Élan est perdu au commit de l’acquisition réelle');
 assert.equal(after.combat.participants.find(row=>row.id==='ally').states.some(row=>row.key==='hemorragique'),false);
 check('Le geste Calculer montre la conséquence sourcée, l’aperçu ne mute pas; Appliquer pose deux Hémorragique sur le prêtre seulement.');
 await page.reload({waitUntil:'domcontentloaded'});await ready();after=await state();
 assert.equal(after.combat.participants.find(row=>row.id==='priest').states.find(row=>row.key==='hemorragique').level,2,'IndexedDB restaure les États');
 check('Les nouveaux États et leur reçu persistent après rechargement du navigateur.');

 const second=await context.newPage();second.setDefaultTimeout(8000);second.on('pageerror',error=>errors.push(error.message));
 await second.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});await second.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block');
 page=second;await seed();await page.getByRole('tab',{name:'Jouer',exact:true}).click();const actor2=page.locator('[data-workspace-select="priest"]');if(await actor2.count())await actor2.click();
 panel=await prepare({roll:99,wrathRoll:79});const brokenText=await panel.locator('.workspace-divine-preview').innerText();
 assert.match(brokenText,/Brisé/);assert.match(brokenText,/2 état/i);assert.doesNotMatch(brokenText,/résultat du Courroux reste à résoudre/i);
 assert.match(brokenText,/Sprint|se cacher/i);assert.match(brokenText,/facultatif|vous pouvez/i,'se cacher est présenté comme facultatif');
 await panel.locator('[data-divine-action="apply"]').click();
 await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');await Store.whenIdle();return Store.listParticipants().find(row=>row.id==='priest').states.some(row=>row.key==='brise');});
 assert.equal((await state()).combat.participants.find(row=>row.id==='priest').states.find(row=>row.key==='brise').level,2);
 check('Le geste Courroux 89–95 applique Brisé 2; l’interface garde la fuite/Sprint manuels et le Test de dissimulation facultatif.');
 assert.deepEqual(errors,[]);receipt.passed=true;
}catch(error){receipt.error=error.stack;if(page)await page.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;
}finally{receipt.completedAt=new Date().toISOString();writeFileSync(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');await browser?.close();if(serverStarted)await new Promise(done=>server.close(done));}
console.log(JSON.stringify(receipt));
