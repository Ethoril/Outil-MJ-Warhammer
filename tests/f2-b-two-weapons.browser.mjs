import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url));
const mime={'.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/blank'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<main></main>');return;}const file=resolve(root,`.${pathname==='/'?'/index.html':pathname}`);if(!file.startsWith(resolve(root)+sep)||!statSync(file).isFile())throw new Error('not found');res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(readFileSync(file));}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'});
try{
 const page=await browser.newPage(),origin=`http://127.0.0.1:${server.address().port}`;
 await page.goto(`${origin}/blank`);
 await page.evaluate(async origin=>{window.renderResolutionPanel=(await import(`${origin}/js/ui/resolution-panel.js`)).renderResolutionPanel;window.calls=[];window.handlers=new Proxy({}, {get:()=> (...args)=>window.calls.push(args)});},origin);
 const data=JSON.parse(readFileSync(new URL('../js/data/reference-snapshot.json',import.meta.url),'utf8'));
 const weapons=data.equipment.items, sword=weapons.find(row=>row.kind==='weapon'&&row.name==='Épée'),pistol=weapons.find(row=>row.kind==='weapon'&&row.name==='Pistolet'),greatsword=weapons.find(row=>row.kind==='weapon'&&row.name==='Espadon de Hoeth Haut Elfe');
 assert.ok(sword&&pistol&&greatsword);
 const actor={id:'a',name:'PJ',kind:'PJ',camp:'pj',zone:'active',caracs:{CC:60,CT:60},skills:[{id:'cc',name:'Corps à corps (Base)',group:'Corps à corps',specialty:'Base',total:60,advances:10,status:'resolved'},{id:'gun',name:'Projectiles (Poudre noire)',group:'Projectiles',specialty:'Poudre noire',total:60,advances:10,status:'resolved'}],equipment:[sword,pistol,greatsword],states:[],extensions:{v5:{hasMomentum:true}}};
 const target={id:'b',name:'Cible',camp:'ennemi',zone:'active',caracs:{CC:40,Ag:40},skills:[],equipment:[],states:[],hp:10,armor:{}};
 const render=async item=>page.evaluate(({item,actor,target})=>{const action={id:'action-'+item.id,type:'attack',note:item.name,attr:item.category==='Poudre Noire'?'CT':'CC',base:60,damage:5,extensions:{fiche:{equipmentId:item.id}}};const panel=window.renderResolutionPanel({draft:{actorId:'a',actionKey:action.id,type:'attack',v5Kind:item.category==='Poudre Noire'?'ranged':'melee',attackRoll:'25',v5Context:{}},actor,participants:[actor,target],actions:[action],actionKey:action.id,type:'attack',target,groups:{adversaries:[target],allies:[]},defense:{options:[],value:'Ag',option:{value:'Ag',statLabel:'Ag',mod:0,v5:{kind:'test',slModifier:0}}},previousWeaponAttacks:[{actionId:'primary-sword',weaponId:actor.equipment.find(row=>row.name==='Épée').id,weaponName:'Épée',actionType:'attack',hit:false}],canCalculate:false,canApply:false,handlers:window.handlers});document.body.replaceChildren(panel);},{item,actor,target});
 await render(pistol);
 const selector=page.getByLabel('Attaque précédente pour l’attaque immédiate de l’autre arme');
 assert.equal(await selector.count(),1,'une vraie arme du catalogue permet le choix de seconde arme au tir');
 assert.ok((await selector.locator('option').allTextContents()).some(text=>text.includes('Épée')),'l’attaque précédente à une main est sélectionnable');
 await selector.selectOption('primary-sword');
 const payload=await page.evaluate(()=>window.calls.at(-1)[0]);assert.equal(payload.extraAttack,true);assert.equal(payload.v5Context.secondWeaponAttack,true);assert.equal(payload.v5Context.primaryResolutionId,'primary-sword');
 await render(greatsword);
 assert.equal(await page.getByLabel('Attaque précédente pour l’attaque immédiate de l’autre arme').count(),0,'un espadon ne propose pas une seconde arme');
 await page.evaluate(async origin=>{
  const {createStore}=await import(`${origin}/js/core/store.js`),{initWorkspaceView}=await import(`${origin}/js/ui/workspace-view.js`);
  const store=createStore({storage:null});await store.ready;
  const actor={id:'actor-ui',name:'PJ',kind:'PJ',camp:'pj',zone:'active',initiative:60,hp:30,maxHp:30,caracs:{CC:60,CT:60,Ag:40,E:40,FM:50,Soc:60,M:4},skills:[{id:'cc-ui',name:'Corps à corps (Base)',status:'resolved',total:60}],actions:[{id:'strike-ui',name:'Frappe',type:'attack',attr:'CC',base:60,damage:5}],equipment:[],states:[],extensions:{v5:{hasMomentum:true}}};
  const first={id:'target-first',name:'Première cible',kind:'PNJ',camp:'ennemi',zone:'active',initiative:40,hp:0,maxHp:20,caracs:{CC:40,Ag:30,E:30,FM:30,M:4},skills:[],actions:[],equipment:[],states:[{key:'inconscient',name:'Inconscient',level:1}],armor:{}};
  const second={...first,id:'target-second',name:'Autre cible',hp:20,states:[]};
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],extensions:{v5:{combatId:'ui-combat',turnIndex:1}},combat:{round:1,currentActorId:actor.id,order:[actor.id,first.id,second.id],orderMode:'manual',participants:[actor,first,second]}});
  window.workspace=initWorkspaceView({Store:store,mount:document.body,showNavigation:false});window.workspace.setSpace('play');
  if(!window.workspace.openResolution({id:'strike-ui',participantId:actor.id,targetId:first.id},{roll:25}))throw new Error('Impossible d’ouvrir l’attaque de test');
 },origin);
 await page.getByRole('checkbox',{name:'Activer l’option létale de la table pour cette résolution'}).check();
 await page.getByRole('checkbox',{name:'Déclarer une intention létale contre Première cible'}).check();
 await page.getByRole('checkbox',{name:'Je confirme explicitement la mort de Première cible'}).check();
 const before=await page.evaluate(()=>window.workspace.getViewState().resolution.v5Context);
 assert.equal(before.lethalIntent,true);assert.equal(before.lethalTableEnabled,true);assert.equal(before.confirmLethalDeath,true);
 await page.getByRole('button',{name:'Autre cible',exact:true}).click();
 const after=await page.evaluate(()=>window.workspace.getViewState().resolution.v5Context);
 assert.equal(after.lethalIntent,undefined);assert.equal(after.lethalTableEnabled,undefined);assert.equal(after.confirmLethalDeath,undefined);
 console.log('F2-B navigateur: Épée du catalogue → Pistolet, Espadon refusé et confirmations létales purgées au changement de cible.');
}finally{await browser.close();await new Promise(done=>server.close(done));}

