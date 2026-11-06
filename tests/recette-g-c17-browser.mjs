/** T5 acceptance: panneau de prières piloté par le contrat, application réelle, gestes réels, IndexedDB native. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'tmp/divin/t5-browser');mkdirSync(output,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';const path=resolve(root,relative);assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':types[extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404).end('Resource unavailable');}});
const receipt={passed:false,scope:'Application réelle, IndexedDB native, formulaire de prière généré depuis le contrat, mobile simulé',checks:[],screenshots:[]};
const check=description=>receipt.checks.push(description);let browser,page;
const ready=()=>page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block');
const people=()=>page.evaluate(async()=>{const{Store}=await import('/js/main.js');await Store.whenIdle();return JSON.parse(JSON.stringify(Store.listParticipants()));});
const person=async id=>(await people()).find(p=>p.id===id);
const fullState=()=>page.evaluate(async()=>{const{Store}=await import('/js/main.js');await Store.whenIdle();return JSON.parse(Store.getFullJSON());});
const waitFor=async(predicate,message)=>{const deadline=Date.now()+7000;let last;while(Date.now()<deadline){last=await predicate();if(last)return last;await page.waitForTimeout(80);}throw new Error('Délai dépassé : '+message);};
const loadState=async()=>{
 await page.evaluate(async()=>{
  const{Store}=await import('/js/main.js');
  const{getAllDivineContracts}=await import('/js/core/v5-divine-store.js');
  const base={caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0},actions:[],skills:[],talents:[],prayers:[],traits:[],equipment:[],hp:20,maxHp:30,zone:'active',extensions:{v5:{}}};
  const state=(id,key,name)=>({id,key,name,level:1});
  const priest={...base,id:'priest',name:'Prêtresse',kind:'PNJ',cult:'Myrmidia',camp:'pj',init:60,actions:[{id:'act',type:'attack',note:'Arme',attr:'CC',base:40,damage:4}],
   skills:[{id:'pray',name:'Pray',status:'resolved',total:60}],
   talents:['Myrmidia'].flatMap(specialization=>[{id:'talent-invoke',status:'resolved',specialization,rank:1},{id:'talent-bless',status:'resolved',specialization,rank:1}]),
   prayers:getAllDivineContracts().filter(row=>row.type==='miracle').map(row=>({name:row.catalogueName,status:'resolved'})),
   equipment:[{id:'ham-1',name:'Marteau de guerre',kind:'weapon',category:'Marteau'},{id:'axe-1',name:'Hache de bataille',kind:'weapon',category:'Hache'}],
   extensions:{v5:{divine:{sin:0}}}};
  const ally={...base,id:'ally',name:'Allié',kind:'PJ',camp:'pj',init:30,states:[state('al-1','assourdi','Assourdi')]};
  const ghoul={...base,id:'ghoul',name:'Goule',kind:'PNJ',camp:'pnj',init:20,traits:['Mort-vivant']};
  const cultist={...base,id:'cultist',name:'Cultiste',kind:'PNJ',camp:'pnj',init:10,states:[state('cu-1','assourdi','Assourdi'),state('cu-2','brise','Brisé')]};
  await Store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally','ghoul','cultist'],participants:[priest,ally,ghoul,cultist]},diceLines:[],log:[],extensions:{v5:{turnIndex:1}}});
 });
 await page.getByRole('tab',{name:'Jouer',exact:true}).click();
 const actorButton=page.locator('[data-workspace-select="priest"]');if(await actorButton.count())await actorButton.click();
};
const openPanel=async()=>{const panel=page.locator('[data-divine-panel]');await panel.waitFor();if(!await panel.evaluate(el=>el.open))await panel.locator('summary').first().click();return panel;};
const choose=async(panel,contractId)=>{await panel.getByRole('combobox',{name:'Prière divine',exact:true}).selectOption(contractId);assert.equal(await panel.evaluate(el=>el.open),true,'le panneau reste ouvert');return panel;};
const baseFields=async(panel,roll=45)=>{
 await panel.getByRole('combobox',{name:'Le personnage peut prononcer la prière',exact:true}).selectOption('true');
 await panel.getByRole('spinbutton',{name:'Jet de Prière (d100)',exact:true}).fill(String(roll));
};
const calculate=async panel=>{await panel.locator('[data-divine-action="calculate"]').click();return panel.locator('.workspace-divine-preview');};
const apply=panel=>panel.locator('[data-divine-action="apply"]').click();
const shots=async(prefix,{theme=['dark','light']}={})=>{
 for(const width of [1440,390])for(const mode of theme){
  await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(v=>document.documentElement.dataset.theme=v,mode);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`pas de débordement horizontal (${prefix} ${width} ${mode})`);
  const file=`${prefix}-${width}-${mode}.png`;await page.screenshot({path:resolve(output,file),fullPage:true});receipt.screenshots.push(file);
 }
 await page.setViewportSize({width:1440,height:900});
};
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await launchBrowser();
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:900}});await context.route('https://**',route=>route.abort());
 page=await context.newPage();page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});await ready();
 await loadState();

 await loadState();const panel=await openPanel();
 assert.equal(await panel.getByRole('combobox',{name:'Culte',exact:true}).inputValue(),'Myrmidia');
 assert.equal(await panel.getByRole('group',{name:'Le personnage peut prononcer la prière',exact:true}).getByRole('button',{name:'Oui',exact:true}).getAttribute('aria-pressed'),'true');
 await choose(panel,'divine:blessing:myrmidia:protection');
 await panel.getByRole('checkbox',{name:'Destinataire Allié',exact:true}).check();
 assert.equal(await panel.getByRole('group',{name:'Allié · Portée / zone confirmée',exact:true}).getByRole('button',{name:'Oui',exact:true}).getAttribute('aria-pressed'),'true');
 await panel.getByRole('spinbutton',{name:'Jet de Prière (d100)',exact:true}).fill('25');
 await panel.getByRole('combobox',{name:'Fin de l’effet (choix du MJ)',exact:true}).selectOption('endOfTurn');
 const ext=panel.locator('details').filter({hasText:'Extensions de la prière'}).first();if(!await ext.evaluate(el=>el.open))await ext.locator('summary').click();
 await panel.getByLabel('Extensions de portée',{exact:true}).fill('99');
 await panel.locator('[data-divine-action="calculate"]').click();
 const extension=panel.locator('details').filter({hasText:'Extensions de la prière'}).first();
 await extension.locator('summary').click();
 const drawer=page.locator('.workspace-resolution-drawer');if(await drawer.isVisible())await page.locator('[data-circumstances-toggle]').click();
 await panel.locator('.workspace-divine-needs').getByRole('button',{name:'Dépenses dans les paliers de DR disponibles',exact:true}).click();
 assert.equal(await extension.evaluate(el=>el.open),true);
 assert.equal(await panel.getByLabel('Extensions de portée',{exact:true}).evaluate(el=>document.activeElement===el),true);
} finally {await browser?.close();await new Promise(done=>server.close(done));}
