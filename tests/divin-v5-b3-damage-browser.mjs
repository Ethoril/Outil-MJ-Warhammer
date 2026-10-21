/** B03 : saisie réelle, projection inerte et transaction persistée du Courroux. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url)),output=resolve(root,'tmp/gpt-phase-b/b3-browser');mkdirSync(output,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const file=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html');assert.ok(file.startsWith(resolve(root)+sep)&&statSync(file).isFile());res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(file));}catch{res.writeHead(404).end();}});
const receipt={passed:false,checks:[],screenshots:[]};let browser,page;
const snapshot=()=>page.evaluate(async()=>{const{Store}=await import('/js/main.js');await Store.whenIdle();const state=JSON.parse(Store.getFullJSON());delete state.exportedAt;return state;});
const ready=()=>page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block');
const openPanel=async()=>{const panel=page.locator('[data-divine-panel]');await panel.waitFor();if(!await panel.evaluate(el=>el.open))await panel.locator('summary').first().click();return panel;};
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:900}});await context.route('https://**',route=>route.abort());
 page=await context.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});await ready();
 await page.evaluate(async()=>{
  const{Store}=await import('/js/main.js');
  const person=id=>({id,name:id==='priest'?'Prêtre B03':'Allié B03',kind:'PJ',camp:'pj',zone:'active',initiative:60,hp:30,maxHp:30,
   caracs:{CC:40,CT:40,F:30,E:50,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:10,body:10,arms:10,legs:10},states:[],traits:[],equipment:[],
   skills:[{id:'pray',name:'Prière',carac:'Soc',status:'resolved',total:60},{id:'endurance',name:'Résistance',carac:'E',status:'resolved',total:50}],
   talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],extensions:{v5:{divine:{sin:2},hasMomentum:true}}});
  await Store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[person('priest'),person('ally')]},diceLines:[],log:[],extensions:{v5:{turnIndex:1}}});
 });
 await page.getByRole('tab',{name:'Jouer',exact:true}).click();const actor=page.locator('[data-workspace-select="priest"]');if(await actor.count())await actor.click();let panel=await openPanel();
 await panel.getByRole('combobox',{name:'Culte',exact:true}).selectOption('Myrmidia');
 await panel.getByRole('combobox',{name:'Prière divine',exact:true}).selectOption('divine:blessing:myrmidia:battle');
 await panel.getByRole('checkbox',{name:'Destinataire Allié B03',exact:true}).check();
 const range=panel.getByRole('combobox',{name:'Allié B03 · Portée / zone confirmée',exact:true});if(await range.count())await range.selectOption('true');
 await panel.getByRole('combobox',{name:'Le personnage peut prononcer la prière',exact:true}).selectOption('true');
 await panel.getByRole('spinbutton',{name:'Jet de Prière (d100)',exact:true}).fill('99');
 const before=await snapshot();await panel.locator('[data-divine-action="calculate"]').click();
 await panel.getByRole('spinbutton',{name:'Jet de Courroux (d100)',exact:true}).fill('31');await panel.locator('[data-divine-action="calculate"]').click();
 assert.equal(await panel.locator('[data-divine-action="apply"]').isEnabled(),false);
 assert.equal(await panel.getByRole('textbox',{name:'Conséquences du Courroux traitées par le MJ',exact:true}).count(),0);
 await panel.getByRole('spinbutton',{name:'Jet de Blessures du Courroux (1d10)',exact:true}).fill('4');
 await panel.getByRole('spinbutton',{name:'Jet de Résistance du Courroux (d100)',exact:true}).fill('99');await panel.locator('[data-divine-action="calculate"]').click();
 assert.match(await panel.locator('.workspace-divine-preview').innerText(),/30 → 24/);
 assert.equal(await panel.locator('[data-divine-action="apply"]').isEnabled(),true);assert.deepEqual(await snapshot(),before);
 receipt.checks.push('51–55 : vrais champs de dés obligatoires, pas de texte de remplacement ; projection inerte de six Blessures');
 for(const width of [1440,390]){await page.setViewportSize({width,height:width===390?844:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const file=`wrath-damage-${width}.png`;await page.screenshot({path:resolve(output,file),fullPage:true});receipt.screenshots.push(file);}
 await panel.locator('[data-divine-action="apply"]').click();await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');return JSON.parse(Store.getFullJSON()).extensions.v5.divineExecutions?.length===1;});
 let state=await snapshot(),priest=state.combat.participants.find(row=>row.id==='priest');assert.equal(priest.hp,24);assert.equal(priest.extensions.v5.divine.sin,1);assert.equal(priest.extensions.v5.hasMomentum,false);assert.ok(priest.states.some(row=>row.name==='Sonné'));assert.equal(state.combat.participants.find(row=>row.id==='ally').hp,30);
 assert.equal(state.extensions.v5.divineExecutions[0].wrathDamageReceipt.proof.sinAtTest,2);
 receipt.checks.push('Application réelle : prêtre seul, Sonné, Momentum perdu, deux Péchés pour le calcul puis décrément');
 await page.getByRole('button',{name:'Annuler',exact:true}).click();await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');return !JSON.parse(Store.getFullJSON()).extensions.v5.divineExecutions?.length;});assert.deepEqual((await snapshot()).combat,before.combat);
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Rétablir',exact:false}).click();await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');return JSON.parse(Store.getFullJSON()).extensions.v5.divineExecutions?.length===1;});
 await page.reload({waitUntil:'domcontentloaded'});await ready();state=await snapshot();priest=state.combat.participants.find(row=>row.id==='priest');assert.equal(priest.hp,24);assert.ok(priest.states.some(row=>row.name==='Sonné'));assert.equal(state.extensions.v5.divineExecutions[0].wrathDamageReceipt.damage.woundsLost,6);
 receipt.checks.push('Annuler, Rétablir et rechargement IndexedDB natif conservent PV, États et reçu sourcé');assert.deepEqual(errors,[]);receipt.passed=true;
}catch(error){receipt.error=error.stack;if(page)await page.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}finally{receipt.completedAt=new Date().toISOString();writeFileSync(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');await browser?.close();await new Promise(done=>server.close(done));}
console.log(JSON.stringify(receipt));
