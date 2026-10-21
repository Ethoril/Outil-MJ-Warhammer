/** B02 : vrai panneau, IndexedDB native, attribution humaine puis Prière elfique. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'tmp/gpt-phase-b/b2-browser');mkdirSync(output,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{
 const file=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html');
 assert.ok(file.startsWith(resolve(root)+sep)&&statSync(file).isFile());
 res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(file));
}catch{res.writeHead(404).end();}});
const receipt={passed:false,checks:[],screenshots:[]},MATH='divine:miracle:mathlann:waterlungs';
let browser,page;
const snapshot=()=>page.evaluate(async()=>{const {Store}=await import('/js/main.js');await Store.whenIdle();return JSON.parse(Store.getFullJSON());});
const ready=()=>page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block');
const openPanel=async()=>{const panel=page.locator('[data-divine-panel]');await panel.waitFor();if(!await panel.evaluate(el=>el.open))await panel.locator('summary').first().click();return panel;};
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:900}});
 await context.route('https://**',route=>route.abort());
 page=await context.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});await ready();
 await page.evaluate(async math=>{
  const {Store}=await import('/js/main.js');const {getDivineContract}=await import('/js/core/v5-divine-store.js');
  const priest={id:'priest',name:'Prêtre mixte',kind:'PJ',camp:'pj',zone:'active',initiative:60,hp:20,maxHp:20,
   caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},
   armor:{head:0,body:0,arms:0,legs:0},states:[],traits:[],equipment:[],
   skills:[{id:'pray',name:'Prière',status:'resolved',total:60}],
   talents:[{id:'talent-invoke',status:'resolved',rank:1,specialization:'Mathlann'},{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],
   prayers:[{name:getDivineContract(math).catalogueName,status:'resolved'}],extensions:{v5:{divine:{sin:5}}}};
  await Store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:priest.id,order:[priest.id],participants:[priest]},diceLines:[],log:[],extensions:{v5:{turnIndex:1}}});
 },MATH);
 await page.getByRole('tab',{name:'Jouer',exact:true}).click();
 const selectActor=page.locator('[data-workspace-select="priest"]');if(await selectActor.count())await selectActor.click();
 let panel=await openPanel();
 await panel.getByRole('combobox',{name:'Culte',exact:true}).selectOption('Mathlann');
 assert.match(await panel.innerText(),/Mathlann : culte elfe exempt du Péché et du Courroux/);
 assert.equal(await panel.getByRole('spinbutton',{name:'Total de Péchés',exact:true}).count(),0);
 receipt.checks.push('Mathlann : exemption sourcée visible, aucune saisie de Péchés');
 await panel.getByRole('combobox',{name:'Culte',exact:true}).selectOption('Myrmidia');
 // Le label est l'API du formulaire ; ouvrir le groupe par son résumé visible.
 const sinSummary=panel.locator('summary').filter({hasText:/^Péchés :/});await sinSummary.click();
 await panel.getByRole('spinbutton',{name:'Total de Péchés',exact:true}).fill('6');
 await panel.getByRole('textbox',{name:'Raison de l’ajustement des Péchés',exact:true}).fill('Contrôle B02 du culte humain');
 await panel.locator('[data-divine-action="sin"]').click();
 await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');return Store.listParticipants()[0].extensions.v5.divine.sin===6;});
 receipt.checks.push('Myrmidia : attribution humaine par les vrais champs et bouton');
 await panel.getByRole('combobox',{name:'Culte',exact:true}).selectOption('Mathlann');
 await panel.getByRole('combobox',{name:'Prière divine',exact:true}).selectOption(MATH);
 await panel.getByRole('checkbox',{name:'Destinataire Prêtre mixte',exact:true}).check();
 const range=panel.getByRole('combobox',{name:'Prêtre mixte · Portée / zone confirmée',exact:true});if(await range.count())await range.selectOption('true');
 await panel.getByRole('combobox',{name:'Le personnage peut prononcer la prière',exact:true}).selectOption('true');
 await panel.getByRole('spinbutton',{name:'Jet de Prière (d100)',exact:true}).fill('99');
 await panel.locator('[data-divine-action="calculate"]').click();
 assert.match(await panel.locator('.workspace-divine-preview').innerText(),/Prière ratée/);
 assert.equal(await panel.locator('[data-divine-action="apply"]').isEnabled(),true);
 assert.equal(await panel.getByRole('spinbutton',{name:'Jet de Courroux (d100)',exact:true}).count(),0);
 assert.equal((await snapshot()).extensions.v5.divineExecutions?.length||0,0);
 await panel.locator('[data-divine-action="apply"]').click();
 await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');return JSON.parse(Store.getFullJSON()).extensions.v5.divineExecutions?.length===1;});
 let state=await snapshot();assert.equal(state.combat.participants[0].extensions.v5.divine.sin,6);
 assert.equal(state.extensions.v5.divineExecutions[0].wrath.exempt,true);
 assert.equal(state.extensions.v5.divineExecutions[0].prayer.fumble,true);
 receipt.checks.push('Maladresse elfique réellement appliquée sans Courroux et sans effacer les Péchés humains ; aperçu inerte');
 await page.getByRole('button',{name:'Annuler',exact:true}).click();
 await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');return !JSON.parse(Store.getFullJSON()).extensions.v5.divineExecutions?.length;});
 await page.getByRole('button',{name:'Menu',exact:true}).click();
 await page.getByRole('button',{name:'Rétablir',exact:false}).click();
 await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');return JSON.parse(Store.getFullJSON()).extensions.v5.divineExecutions?.length===1;});
 await page.reload({waitUntil:'domcontentloaded'});await ready();
 state=await snapshot();assert.equal(state.combat.participants[0].extensions.v5.divine.sin,6);
 assert.equal(state.extensions.v5.divineExecutions[0].wrath.exemption.source.printedPage,99);
 receipt.checks.push('Annuler, Rétablir et reload IndexedDB natif conservent le reçu et le total humain');
 await page.getByRole('tab',{name:'Jouer',exact:true}).click();panel=await openPanel();
 await panel.getByRole('combobox',{name:'Culte',exact:true}).selectOption('Mathlann');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const file=`elf-cult-${width}.png`;await page.screenshot({path:resolve(output,file),fullPage:true});receipt.screenshots.push(file);
 }
 assert.deepEqual(errors,[]);receipt.passed=true;
}catch(error){receipt.error=error.stack;if(page)await page.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;
}finally{receipt.completedAt=new Date().toISOString();writeFileSync(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');await browser?.close();await new Promise(done=>server.close(done));}
console.log(JSON.stringify(receipt));
