import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

const root=fileURLToPath(new URL('..',import.meta.url)),base='/Outil-MJ-Warhammer/';
const server=createStaticServer({ root, base, headers: { 'Cache-Control': 'no-store' } });
await new Promise(done=>server.listen(0,'127.0.0.1',done));const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});page.setDefaultTimeout(8000);
 await page.goto(`http://127.0.0.1:${server.address().port}${base}`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});
 await page.evaluate(async()=>{
  const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;
  const fighter=(id,name,camp,extra={})=>({id,name,kind:'PJ',camp,zone:'active',initiative:id==='rider'?50:40,hp:30,maxHp:30,caracs:{CC:40,CT:40,F:40,E:40,I:40,Ag:45,Dex:40,Int:40,FM:40,Soc:40,M:4},skills:[],actions:[],equipment:[],traits:[],talents:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},...extra});
  const rider=fighter('rider','Cavalier','ambush',{talents:[{id:'talent-strong-minded',status:'resolved',rank:1}],skills:[{id:'skill-ride',name:'Chevaucher',carac:'Ag',status:'resolved',total:55}],extensions:{v5:{mounted:true,mountId:'horse'}}});
  const horse=fighter('horse','Destrier','ambush',{kind:'Créature',size:'large',caracs:{F:50,I:30}}),foe=fighter('foe','Brigand','heroes');
  await Store.loadFromJSON({schemaVersion:3,reserve:[],diceLines:[],log:[],extensions:{v5:{combatId:'ambush-test',turnIndex:1}},combat:{round:0,currentActorId:null,order:['rider','horse','foe'],participants:[rider,horse,foe]}});
  await Store.startTalentSession();
 });
 await page.locator('#tab-combat').click();await page.locator('#combat-banner .combat-banner-primary').click();
 const dialog=page.locator('dialog.tool-sheet');await dialog.waitFor({state:'visible'});
 for(const [id,die] of [['rider',5],['horse',4],['foe',3]]){const characteristic=dialog.locator(`input[name="characteristic:${id}"]`);if(await characteristic.count()&&await characteristic.isEditable()&&await characteristic.inputValue()==='')await characteristic.fill('40');const input=dialog.locator(`input[name="die:${id}"]`);if(await input.isEditable())await input.fill(String(die));}
 await dialog.locator('select[name="surprisedCamp"]').selectOption('ambush');await dialog.getByRole('button',{name:'Calculer / actualiser l’ordre'}).click();
 await dialog.locator('[data-focus-key="initiative-ride-obstinate-rider"]').selectOption('strong-minded');
 await dialog.locator('[data-mounted-rider="rider"][data-field="roll"]').fill('40');await dialog.getByRole('button',{name:'Calculer / actualiser l’ordre'}).click();
 await dialog.getByRole('button',{name:'Confirmer et appliquer'}).click();
 await page.waitForFunction(async()=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');return Store.getCombat().round===1;});
 assert.equal(await page.evaluate(async()=>(await import('/Outil-MJ-Warhammer/js/main.js')).Store.getObstinateStatus('rider').available),false);
 await page.evaluate(async()=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.undo();});
 assert.equal(await page.evaluate(async()=>(await import('/Outil-MJ-Warhammer/js/main.js')).Store.getObstinateStatus('rider').available),true);
 console.log('Embuscade : choix, application au cavalier et undo OK');
}finally{await browser.close();await new Promise(done=>server.close(done));}
