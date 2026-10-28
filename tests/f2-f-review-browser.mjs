import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import reference from '../js/data/reference-snapshot.json' with { type: 'json' };

const root=fileURLToPath(new URL('../',import.meta.url)),base='/Outil-MJ-Warhammer/';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);assert.ok(pathname.startsWith(base));const path=resolve(root,pathname.slice(base.length)||'index.html');assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined)});
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}${base}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});
  const pavise=reference.equipment.items.find(item=>item.id==='shield-armures-bouclier-pavois-pavise');
  const actor={id:'f-review-actor',name:'Porteur F',kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,caracs:{CC:60,CT:60,F:40,E:40,FM:40,Ag:40,Int:40},skills:[],talents:[],states:[],armor:{head:0,body:0,arms:0,legs:0},equipment:[pavise,{id:'antler-test',name:'Antler Hilted Blade',kind:'weapon',category:'Base',damage:'BF+4',keywords:[],extensions:{}},{id:'leviathan-test',name:'Leviathan Plate',kind:'armour',ap:2,locations:['body'],layer:'rigid',keywords:[],extensions:{}}],actions:[
    {id:'antler-attack',name:'Antler Hilted Blade',type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:'antler-test'}}},
    {id:'focus-test',name:'Focalisation (Aqshy)',type:'test',attr:'FM',base:50,extensions:{}}
  ],extensions:{v5:{}}};
  const target={...actor,id:'f-review-target',name:'Cible F',camp:'ennemi',equipment:[],actions:[],extensions:{v5:{}}};
  await page.evaluate(async state=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;await Store.loadFromJSON(state);},{schemaVersion:3,reserve:[],diceLines:[],log:[],combat:{round:1,currentActorId:actor.id,orderMode:'manual',order:[actor.id,target.id],participants:[actor,target]},extensions:{v5:{combatId:'f-review',turnIndex:1}}});
  await page.locator('#tab-combat').click();
  await page.locator('[data-action-key="antler-attack"]').click();
  const workspace=page.locator('#workspace-root');
  assert.equal(await workspace.getByLabel('Origine de la poignée en bois de Grand Cerf').count(),1);
  await page.locator('[data-action-key="focus-test"]').click();
  assert.equal(await workspace.getByLabel('Objet de focalisation utilisé').count(),1);
  assert.equal(await workspace.getByText('Le bonus s’applique uniquement à Focalisation dans le domaine indiqué; le bâton ne réduit pas le niveau d’incantation.',{exact:true}).count(),1);
  assert.equal(await workspace.getByLabel('Encombrement de la pièce métallique équivalente (MJ)').count(),1);
  await workspace.getByLabel('Encombrement de la pièce métallique équivalente (MJ)').fill('4');
  await workspace.getByRole('button',{name:'Enregistrer la référence métal'}).click();
  await page.waitForFunction(()=>document.querySelector('.workspace-leviathan-encumbrance')?.textContent.includes('léviathan 3 Encombrement'));
  await workspace.getByLabel('Direction choisie par le MJ').selectOption('north');
  await workspace.getByRole('button',{name:'Dépenser la première Action de mise en place'}).click();
  await page.waitForFunction(()=>document.querySelector('.workspace-pavise-setup')?.textContent.includes('Première Action dépensée'));
  await page.evaluate(async()=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');Store.nextTurn();Store.nextTurn();});
  await page.waitForFunction(()=>document.querySelector('.workspace-pavise-setup')?.textContent.includes('seconde Action au prochain Tour'));
  await workspace.getByRole('button',{name:'Dépenser la seconde Action au prochain Tour'}).click();
  await page.waitForFunction(()=>document.querySelector('.workspace-pavise-setup')?.textContent.includes('Planté face au north'));
  assert.deepEqual(errors,[],`aucune erreur UI attendue : ${errors.join('; ')}`);
}finally{await browser.close();await new Promise(done=>server.close(done));}
