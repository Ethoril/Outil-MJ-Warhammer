import assert from 'node:assert/strict';
import {sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const server=createStaticServer({ root });
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;
try{
 browser=await launchBrowser();
 const context=await browser.newContext({serviceWorkers:'block'});await blockExternalNetwork(context, server);
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block');
 await page.evaluate(async()=>{
  const {Store}=await import('/js/main.js');const {getAllDivineContracts}=await import('/js/core/v5-divine-store.js');
  const priest={id:'priest',name:'Prêtresse',kind:'PJ',camp:'pj',zone:'active',init:60,hp:20,maxHp:20,caracs:{Soc:60,FM:50,I:40,M:4},skills:[{name:'Prière',status:'resolved',total:60}],talents:['Taal','Ulric','Myrmidia'].flatMap(specialization=>[{id:'talent-invoke',status:'resolved',rank:1,specialization},{id:'talent-bless',status:'resolved',rank:1,specialization}]),prayers:getAllDivineContracts().filter(c=>c.type==='miracle').map(c=>({name:c.catalogueName,status:'resolved'})),extensions:{v5:{divine:{sin:0}}}};
  await Store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest'],participants:[priest]},diceLines:[],log:[],extensions:{v5:{turnIndex:1}}});
 });
 await page.getByRole('tab',{name:'Jouer',exact:true}).click();
 const panel=page.locator('[data-divine-panel]');await panel.locator('summary').first().click();
 const prayer=panel.getByRole('combobox',{name:'Prière divine',exact:true});
 for(const id of ['divine:miracle:il-de-l-aigle','divine:miracle:ulric:howl-of-the-wolf','divine:miracle:taal:king-of-the-wild']){
  await prayer.selectOption(id);
  assert.equal(await panel.getByRole('group',{name:'Destinataires de la prière',exact:true}).count(),0,id+' : aucun groupe Destinataires');
  assert.equal(await panel.getByRole('checkbox',{name:/^Destinataire /}).count(),0,id+' : aucune case de cible');
  assert.equal(await panel.getByText('Cible : le prêtre (cible implicite).',{exact:true}).count(),1);
 }
 await prayer.selectOption('divine:blessing:myrmidia:battle');
 assert.equal(await panel.getByRole('group',{name:'Destinataires de la prière',exact:true}).count(),1);
 assert.equal(await panel.getByRole('checkbox',{name:'Destinataire Prêtresse',exact:true}).count(),1);
 assert.deepEqual(errors,[]);console.log('PASS — A3 : cibles implicites masquées, bénédiction normale ciblable.');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
