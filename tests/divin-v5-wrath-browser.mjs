/** Principal acceptance: real application, gestures and native IndexedDB. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'tmp/divin/wrath-browser');mkdirSync(output,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';const path=resolve(root,relative);assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':types[extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404).end('Resource unavailable');}});
const receipt={passed:false,scope:'Actual application, native IndexedDB, real prayer and time forms, simulated mobile',checks:[],screenshots:[]};
const check=description=>receipt.checks.push(description);let browser,page;
const state=()=>page.evaluate(async()=>{const{Store}=await import('/js/main.js');await Store.whenIdle();return JSON.parse(Store.getFullJSON());});
const caps=async()=>((await state()).combat.participants.find(p=>p.id==='priest').extensions?.v5?.divineEffects||[]).filter(e=>e.type==='prayer-sl-cap');
const ready=()=>page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block');
const openPanel=async()=>{const panel=page.locator('[data-divine-panel]');await panel.waitFor();if(!await panel.evaluate(el=>el.open))await panel.locator('summary').first().click();return panel;};
const prepare=async(contractId,roll)=>{
 const panel=await openPanel();await panel.getByRole('combobox',{name:'Prière divine',exact:true}).selectOption(contractId);
 assert.equal(await panel.evaluate(el=>el.open),true,'Le panneau ouvert reste ouvert après choix de prière');
 await panel.getByRole('checkbox',{name:'Destinataire Allié',exact:true}).check();
 await panel.getByRole('combobox',{name:'Allié · Portée / zone confirmée',exact:true}).selectOption('true');
 await panel.getByRole('combobox',{name:'Le personnage peut prononcer la prière',exact:true}).selectOption('true');
 await panel.getByRole('spinbutton',{name:'Jet de Prière (d100)',exact:true}).fill(String(roll));
 await panel.getByRole('combobox',{name:'Fin de l’effet (choix du MJ)',exact:true}).selectOption('endOfRound');
 await panel.locator('[data-divine-action="calculate"]').click();return panel;
};
const advanceDays=async(days)=>{
 await page.getByRole('button',{name:'Menu',exact:true}).click();
 await page.getByRole('button',{name:'Temps de campagne',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Temps de campagne',exact:true});
 await dialog.getByRole('spinbutton',{name:'Durée écoulée',exact:true}).fill(String(days));
 await dialog.getByRole('combobox',{name:'Unité de durée',exact:true}).selectOption('days');
 await dialog.getByRole('textbox',{name:'Motif MJ',exact:true}).fill('Temps confirmé pour le contrôle du Courroux');
 await dialog.getByRole('button',{name:'Avancer le temps',exact:true}).click();await dialog.waitFor({state:'detached'});
};
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:900}});await context.route('https://**',route=>route.abort());
 page=await context.newPage();page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});await ready();
 await page.evaluate(async()=>{
  const{Store}=await import('/js/main.js');
  const{getAllDivineContracts}=await import('/js/core/v5-divine-store.js');
  const battle=getAllDivineContracts().find(c=>c.id==='divine:blessing:myrmidia:battle');
  const person=(id,name)=>({id,name,kind:'PJ',camp:'pj',zone:'active',init:id==='priest'?60:30,hp:20,maxHp:30,
   caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0},states:[],actions:[],
   skills:id==='priest'?[{id:'pray',name:'Pray',status:'resolved',total:60}]:[],
   talents:id==='priest'?[{id:battle.requiredTalent.catalogueTalentId,status:'resolved',specialization:'Myrmidia',rank:1}]:[],prayers:[],extensions:{v5:{divine:{sin:0}}}});
  await Store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[person('priest','Prêtresse'),person('ally','Allié')]},diceLines:[],log:[],extensions:{v5:{turnIndex:1}}});
 });
 await page.getByRole('tab',{name:'Jouer',exact:true}).click();
 const actorButton=page.locator('[data-workspace-select="priest"]');if(await actorButton.count())await actorButton.click();
 let panel=await prepare('divine:blessing:myrmidia:battle',99);
 await panel.getByRole('spinbutton',{name:'Jet de Courroux (d100)',exact:true}).fill('6');
 await panel.locator('[data-divine-action="calculate"]').click();
 assert.equal(await panel.locator('[data-divine-action="apply"]').isDisabled(),false,'Courroux6–10 déterministe doit être appliquable sans texte MJ libre');
 assert.equal((await caps()).length,0,'l’aperçu ne pose pas la sanction');
 await panel.locator('[data-divine-action="apply"]').click();
 await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');return Store.listParticipants().find(p=>p.id==='priest').extensions?.v5?.divineEffects?.some(e=>e.type==='prayer-sl-cap');});
 assert.equal((await caps())[0].deadline.atSeconds,8*86400);
 check('Le vrai formulaire pose sur échec le Courroux6–10 sans texte MJ inventé; son aperçu reste inerte');
 panel=await prepare('divine:blessing:myrmidia:courage',23);
 const limitedText=await panel.locator('.workspace-divine-preview').innerText();
 assert.match(limitedText,/Prière réussie\s*·\s*0 DR/);assert.match(limitedText,/plafond|Courroux.*DR|DR.*Courroux/i,'la cause du plafond est visible');
 for(const width of [1440,390])for(const theme of ['dark','light']){
  await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(v=>document.documentElement.dataset.theme=v,theme);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'pas de débordement horizontal');
  const file=`wrath-${width}-${theme}.png`;await page.screenshot({path:resolve(output,file),fullPage:true});receipt.screenshots.push(file);
 }
 await panel.locator('[data-divine-action="apply"]').click();
 await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');return Store.listParticipants().find(p=>p.id==='ally').caracs.FM===60;});
 const active=panel.locator('details').filter({hasText:'Prières actives du personnage'});
 if(!await active.evaluate(el=>el.open))await active.locator('summary').click();
 await panel.getByRole('textbox',{name:'Raison de fin de prière',exact:true}).fill('Fin du bonus sans retirer la sanction');
 await panel.locator('[data-divine-action="end"]').click();
 await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');return Store.listParticipants().find(p=>p.id==='ally').caracs.FM===50;});
 assert.equal((await caps()).length,1);check('DR plafonnés visibles et Terminer une prière conserve la sanction autonome');
 await advanceDays(7);assert.equal((await caps()).length,1,'sept jours ne font pas une semaine impériale');
 await page.reload({waitUntil:'domcontentloaded'});await ready();assert.equal((await caps()).length,1,'native IndexedDB garde sanction et ancre après reload');
 assert.equal((await state()).extensions.v5.gameClock.campaignSeconds,7*86400);
 await advanceDays(1);assert.equal((await caps()).length,0);assert.equal((await state()).extensions.v5.gameClock.campaignSeconds,8*86400);
 check('Le menu de temps garde le plafond après sept jours et reload, puis l’expire exactement au huitième');
 await page.getByRole('button',{name:'Annuler',exact:true}).click();await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');return JSON.parse(Store.getFullJSON()).extensions.v5.gameClock.campaignSeconds===7*86400;});assert.equal((await caps()).length,1);
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Rétablir',exact:false}).click();await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');return JSON.parse(Store.getFullJSON()).extensions.v5.gameClock.campaignSeconds===8*86400;});assert.equal((await caps()).length,0);
 check('Annuler/Rétablir rétablissent ensemble le curseur de temps et la sanction');
 await page.getByRole('tab',{name:'Jouer',exact:true}).click();
 panel=await prepare('divine:blessing:myrmidia:courage',23);assert.match(await panel.locator('.workspace-divine-preview').innerText(),/Prière réussie\s*·\s*4 DR/);
 assert.deepEqual(errors,[]);receipt.passed=true;
}catch(error){receipt.error=error.stack;if(page)await page.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;
}finally{receipt.completedAt=new Date().toISOString();writeFileSync(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');await browser?.close();await new Promise(done=>server.close(done));}
console.log(JSON.stringify(receipt));
