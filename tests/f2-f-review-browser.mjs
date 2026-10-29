import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import reference from '../js/data/reference-snapshot.json' with { type: 'json' };
import L22 from '../js/data/bestiary/L22.json' with { type: 'json' };
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';

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
  const ratling=reference.equipment.items.find(item=>item.id==='weapon-armes-a-distance-ingenierie-mitrailleuse-ratling-skaven');
  const actor={id:'f-review-actor',name:'Porteur F',kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,caracs:{CC:60,CT:60,F:40,E:40,FM:40,Ag:40,Int:40},skills:[],talents:[],states:[],armor:{head:0,body:0,arms:0,legs:0},equipment:[pavise,ratling,{id:'antler-test',name:'Antler Hilted Blade',kind:'weapon',category:'Base',damage:'BF+4',keywords:[],extensions:{}},{id:'leviathan-test',name:'Leviathan Plate',kind:'armour',ap:2,locations:['body'],layer:'rigid',keywords:[],extensions:{}}],actions:[
    {id:'antler-attack',name:'Antler Hilted Blade',type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{fiche:{equipmentId:'antler-test'}}},
    {id:'focus-test',name:'Focalisation (Aqshy)',type:'test',attr:'FM',base:50,extensions:{}},
    {id:'warp-attack',name:'Warp Blade',type:'attack',attr:'CC',base:60,damage:6,qualities:[],extensions:{}}
  ],extensions:{v5:{corruptionPoints:0}}};
  const target={...actor,id:'f-review-target',name:'Cible F',camp:'ennemi',equipment:[],actions:[],extensions:{v5:{}}};
  const profile=L22.profiles.find(row=>row.name==='Rat Ogre Bonebreaker');
  const bonebreaker=buildParticipantFromBestiary(profile.id,{library:L22.profiles,idFactory:(()=>{let i=0;return()=>`bonebreaker-browser-${++i}`})()});
  bonebreaker.id='f-bonebreaker';bonebreaker.name='Rat Ogre Bonebreaker test';bonebreaker.zone='active';bonebreaker.camp='ennemi';bonebreaker.extensions.v5.corruptionPoints=0;
  await page.evaluate(async state=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;await Store.loadFromJSON(JSON.stringify(state));},{schemaVersion:3,reserve:[],diceLines:[],log:[],combat:{round:1,currentActorId:actor.id,orderMode:'manual',order:[actor.id,target.id,bonebreaker.id],participants:[actor,target,bonebreaker]},extensions:{v5:{combatId:'f-review',turnIndex:1}}});
  await page.locator('#tab-combat').click();
  await page.locator('[data-action-key="antler-attack"]').click();
  const workspace=page.locator('#workspace-root');
  assert.equal(await workspace.getByLabel('Origine de la poignée en bois de Grand Cerf').count(),1);
  // Warp Blade : score et d100 du Test de Résistance saisis dans le panneau, gardés d’un rendu à l’autre, oubliés au changement de cible.
  await page.locator('[data-action-key="warp-attack"]').click();
  const foe=name=>workspace.getByRole('group',{name:'Adversaires'}).getByRole('button',{name,exact:true});
  await foe('Cible F').click();
  const warpScore=workspace.getByLabel('Warp Blade : score de Résistance de la cible (Test +2 DR si >1 Blessure)',{exact:true});
  const warpRoll=workspace.getByLabel('Warp Blade : jet d100 du Test de Résistance de la cible',{exact:true});
  await warpScore.fill('110');await warpScore.press('Tab');
  await warpRoll.fill('61');await warpRoll.press('Tab');
  await page.waitForFunction(()=>document.querySelector('[aria-label="Warp Blade : jet d100 du Test de Résistance de la cible"]')?.value==='61');
  assert.equal(await warpScore.inputValue(),'110','un score V5 au-delà de 100 reste saisi');
  assert.equal(await warpScore.getAttribute('max'),null,'le score n’est pas plafonné à 100');
  await foe('Rat Ogre Bonebreaker test').click();await foe('Cible F').click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="Warp Blade : jet d100 du Test de Résistance de la cible"]')?.value==='');
  assert.equal(await warpScore.inputValue(),'','les réponses de l’ancienne cible sont oubliées');
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
  const secondAction=workspace.getByRole('button',{name:'Dépenser la seconde Action au prochain Tour'});
  assert.equal(await secondAction.isDisabled(),true,'l’action restante est désactivée après la première dépense du Tour');
  await page.evaluate(async()=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.nextTurn();});
  await page.locator('[data-workspace-select="f-review-actor"]').click();
  await page.waitForFunction(()=>{const button=[...document.querySelectorAll('.workspace-pavise-setup button')].find(row=>row.textContent.includes('seconde Action'));return button?.disabled===true;});
  await page.evaluate(async()=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');do await Store.nextTurn();while(Store.getCombat().currentActorId!=='f-review-actor');});
  await page.waitForFunction(()=>document.querySelector('.workspace-pavise-setup')?.textContent.includes('seconde Action au prochain Tour'));
  await page.waitForFunction(()=>{const button=[...document.querySelectorAll('.workspace-pavise-setup button')].find(row=>row.textContent.includes('seconde Action'));return button&&!button.disabled;});
  await secondAction.click();
  await page.waitForFunction(()=>document.querySelector('.workspace-pavise-setup')?.textContent.includes('Planté face au north'));
  assert.equal(await workspace.getByLabel('Objet porté contenant de la malepierre').count(),1);
  await workspace.getByLabel('Objet porté contenant de la malepierre').selectOption(`equipment:${ratling.id}`);
  await workspace.getByLabel('Jour déclaré par le MJ').fill('Jour navigateur');
  await workspace.getByRole('button',{name:'Déclarer l’exposition quotidienne'}).click();
  await page.waitForFunction(()=>document.querySelector('.workspace-corruption-panel')?.textContent.includes('Malepierre portée : Mitrailleuse Ratling Skaven · Jour navigateur'));
  await page.locator('[data-workspace-select="f-bonebreaker"]').click();
  await page.waitForFunction(()=>document.querySelector('.workspace-corruption-panel')?.textContent.includes('Rat Ogre Bonebreaker — Warpstone Shard*'));
  await workspace.getByLabel('Objet porté contenant de la malepierre').selectOption(`attack:${bonebreaker.actions.find(row=>row.name==='Warpstone Shard*').id}`);
  await workspace.getByLabel('Jour déclaré par le MJ').fill('Jour Bonebreaker');
  await workspace.getByRole('button',{name:'Déclarer l’exposition quotidienne'}).click();
  await page.waitForFunction(()=>document.querySelector('.workspace-corruption-panel')?.textContent.includes('Malepierre portée : Warpstone Shard* · Jour Bonebreaker'));
  assert.deepEqual(errors,[],`aucune erreur UI attendue : ${errors.join('; ')}`);
}finally{await browser.close();await new Promise(done=>server.close(done));}
