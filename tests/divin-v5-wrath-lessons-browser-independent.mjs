/** Independent UI gesture control for Courroux 11–15, real app + IndexedDB. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=process.env.DIVINE_LESSONS_UI_OUTPUT||resolve(root,'tmp/divin/wrath-lessons-browser-independent');mkdirSync(output,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';const path=resolve(root,relative);assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':types[extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404).end('Resource unavailable');}});
const receipt={passed:false,scope:'Leçons divines: formulaire réel, d10 explicite, persistance IndexedDB et responsive',checks:[],screenshots:[]};
const check=description=>receipt.checks.push(description);let browser,page;
const state=()=>page.evaluate(async()=>{const{Store}=await import('/js/main.js');await Store.whenIdle();const value=JSON.parse(Store.getFullJSON());delete value.exportedAt;return value;});
const effect=async()=>((await state()).combat.participants.find(p=>p.id==='priest').extensions?.v5?.divineEffects||[]).find(e=>e.ruleId==='wrath:11-15:pray-sl-modifier');
const ready=()=>page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block');
const openPanel=async()=>{const panel=page.locator('[data-divine-panel]');await panel.waitFor({state:'attached'});if(!await panel.evaluate(el=>el.open))await panel.locator('summary').first().click();return panel;};
const prepare=async(roll)=>{
 const panel=await openPanel();await panel.getByRole('combobox',{name:'Prière divine',exact:true}).selectOption('divine:blessing:myrmidia:battle');
 assert.equal(await panel.evaluate(el=>el.open),true,'le panneau reste ouvert après sélection de prière');
 await panel.getByRole('checkbox',{name:'Destinataire Allié',exact:true}).check();
 await panel.getByRole('combobox',{name:'Allié · Portée / zone confirmée',exact:true}).selectOption('true');
 await panel.getByRole('combobox',{name:'Le personnage peut prononcer la prière',exact:true}).selectOption('true');
 await panel.getByRole('spinbutton',{name:'Jet de Prière (d100)',exact:true}).fill(String(roll));
 await panel.locator('[data-divine-action="calculate"]').click();return panel;
};
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:900}});await context.route('https://**',route=>route.abort());
 page=await context.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});await ready();
 await page.evaluate(async()=>{
  const{Store}=await import('/js/main.js');const{getAllDivineContracts}=await import('/js/core/v5-divine-store.js');
  const battle=getAllDivineContracts().find(c=>c.id==='divine:blessing:myrmidia:battle');
  const person=(id,name)=>({id,name,kind:'PJ',camp:'pj',zone:'active',init:id==='priest'?60:30,hp:20,maxHp:30,
   caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0},states:[],actions:[],
   skills:id==='priest'?[{id:'skill-50_72_69_e8_72_65-base',name:'Prière',status:'resolved',total:60}]:[],
   talents:id==='priest'?[{id:battle.requiredTalent.catalogueTalentId,status:'resolved',specialization:'Myrmidia',rank:1},{id:'talent-invoke',status:'resolved',specialization:'Myrmidia',rank:1}]:[],prayers:[],extensions:{v5:{divine:{sin:1}}}});
  await Store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[person('priest','Prêtresse'),person('ally','Allié')]},diceLines:[],log:[],extensions:{v5:{turnIndex:1}}});
 });
 await page.getByRole('tab',{name:'Jouer',exact:true}).click();const select=page.locator('[data-workspace-select="priest"]');if(await select.count())await select.click();
 let panel=await prepare(99);await panel.getByRole('spinbutton',{name:'Jet de Courroux (d100)',exact:true}).fill('1');
 await panel.locator('[data-divine-action="calculate"]').click();
 assert.equal(await panel.locator('[data-divine-action="apply"]').isDisabled(),true,'sans d10 explicite, l’application est bloquée même si un texte libre est fourni');
 assert.ok((await panel.innerText()).match(/d10|durée/i),'le formulaire explique le champ de durée manquant');
 await panel.getByRole('spinbutton',{name:'Jet de durée (d10)',exact:true}).fill('4');
 await panel.locator('[data-divine-action="calculate"]').click();
 assert.equal(await panel.locator('[data-divine-action="apply"]').isDisabled(),false,'le d10 explicite rend le résultat calculable');
 assert.doesNotMatch(await panel.innerText(),/résultat du Courroux reste à résoudre/i,'un résultat 11–15 déjà déterminé ne doit pas afficher le rappel MJ de résolution en attente');
 assert.match(await panel.innerText(),/4 \+ 1 Péché.*5 Round/i,'l’aperçu montre durée d10 + Péchés avant décrément');
 await panel.getByRole('spinbutton',{name:'Jet de durée (d10)',exact:true}).waitFor({state:'visible'});
 const themeColors={};
 for(const width of [1440,390])for(const theme of ['dark','light']){
  await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(v=>document.documentElement.dataset.theme=v,theme);
  const colors=await page.evaluate(()=>({bg:getComputedStyle(document.body).backgroundColor,theme:document.documentElement.dataset.theme}));
  assert.equal(colors.theme,theme);themeColors[theme]=colors.bg;assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'pas de débordement horizontal');
  assert.ok(await panel.getByRole('spinbutton',{name:'Jet de durée (d10)',exact:true}).isVisible(),'le champ d10 reste visible sur chaque capture');
  assert.match(await panel.innerText(),/5 Round/i,'le calcul de durée reste visible sur chaque capture');
  const file=`lessons-${width}-${theme}.png`;await page.screenshot({path:resolve(output,file),fullPage:true});receipt.screenshots.push(file);
 }
 assert.notEqual(themeColors.dark,themeColors.light,'le contrôle clair/parchemin doit changer le fond calculé réel');
 assert.equal(await effect(),undefined,'l’aperçu n’écrit aucune sanction');
 await panel.locator('[data-divine-action="apply"]').click();
 await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');await Store.whenIdle();return Store.listParticipants().find(p=>p.id==='priest').extensions?.v5?.divineEffects?.some(e=>e.ruleId==='wrath:11-15:pray-sl-modifier');});
 const applied=await effect();assert.equal(applied.amount,-1);assert.equal(applied.duration.rounds,5);assert.equal(applied.expiry.round,5);
 check('Le formulaire exige un d10 visible et explicite; l’aperçu calcule 4 + 1 Péché et l’application pose la couche');
 await page.reload({waitUntil:'domcontentloaded'});await ready();assert.equal((await effect()).id,applied.id,'IndexedDB restaure la sanction après reload');
 await page.getByRole('tab',{name:'Jouer',exact:true}).click();const reloadedSelect=page.locator('[data-workspace-select="priest"]');if(await reloadedSelect.count())await reloadedSelect.click();
 check('La sanction et sa provenance persistent après rechargement');
 panel=await prepare(23);const text=await panel.innerText();assert.match(text,/−1 DR|−1\s*DR|Prière.*3 DR/i,'le prochain Test de Prière montre le malus automatique');
 assert.deepEqual(errors,[]);receipt.passed=true;
}catch(error){receipt.error=error.stack;if(page)await page.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;
}finally{receipt.completedAt=new Date().toISOString();writeFileSync(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');await browser?.close();await new Promise(done=>server.close(done));}
console.log(JSON.stringify(receipt));
