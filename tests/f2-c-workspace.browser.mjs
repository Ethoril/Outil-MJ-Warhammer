import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url)),mime={'.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/blank'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<main id="mount"></main>');return;}const file=resolve(root,`.${pathname}`);if(!file.startsWith(resolve(root)+sep)||!statSync(file).isFile())throw new Error('not found');res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(readFileSync(file));}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'});
try{
 const page=await browser.newPage(),origin=`http://127.0.0.1:${server.address().port}`;await page.goto(`${origin}/blank`);
 await page.addStyleTag({path:resolve(root,'MJ.css')});await page.addStyleTag({path:resolve(root,'js/ui/workspace.css')});
 await page.evaluate(async origin=>{
   const [{initWorkspaceView},{createStore}]=await Promise.all([import(`${origin}/js/ui/workspace-view.js`),import(`${origin}/js/core/store.js`)]);
   const listeners=new Map(),bus={on(event,fn){if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event).add(fn);},emit(event,...args){for(const fn of listeners.get(event)||[])fn(...args);}};
   const store=createStore({bus,persistence:{async load(){return null;},async saveAtomic(){return{ok:true};}}});await store.ready;
   const weapon={id:'custom-engineering',kind:'weapon',name:'Objet d’ingénierie',category:'Ingénierie',source:'',range:'',hands:1,damage:2,keywords:[]};
   const action={id:'custom-attack',type:'attack',note:weapon.name,base:'',attr:'',damage:2,qualities:[],extensions:{fiche:{bindingVersion:1,equipmentId:weapon.id,requiresLink:true}}};
   const actor={id:'actor',name:'Attaquant',kind:'PJ',camp:'pj',zone:'active',hp:10,maxHp:10,caracs:{CC:40,CT:65,F:40,E:30,Ag:30},skills:[],equipment:[weapon],actions:[action],states:[],armor:{head:0,body:0,arms:0,legs:0}};
   const target={id:'target',name:'Cible',kind:'Créature',camp:'ennemi',zone:'active',hp:20,maxHp:20,caracs:{CC:35,CT:30,F:30,E:30,Ag:30},skills:[],equipment:[],actions:[],states:[],armor:{head:0,body:0,arms:0,legs:0}};
   await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]},diceLines:[],log:[]});
   const noop=()=>{};const view=initWorkspaceView({Store:store,Bus:bus,mount:document.querySelector('#mount'),actions:{renderRules:noop,renderLog:noop,getFortune:()=>0,adjustHp:noop,setStates:noop,applyResolution:noop,acquireStates:noop}});view.setSpace('play');window.f2Workspace={store,view};
 },origin);
 const panel=page.locator('.workspace-resolution');
 await page.getByLabel('Groupe d’arme à confirmer par le MJ').selectOption('Ingénierie tir');
 assert.equal(await page.getByLabel('Nature du Test').inputValue(),'ranged','formulaire: nature affichée Tir');
 await page.getByLabel('Augmentations de la spécialité (MJ, si la fiche ne les fournit pas)').fill('3');
 await page.getByLabel('Augmentations de la spécialité (MJ, si la fiche ne les fournit pas)').dispatchEvent('change');
 await page.getByLabel('Score de compétence (prérempli depuis l’action, à confirmer par le MJ)').fill('45');
 await page.getByLabel('Score de compétence (prérempli depuis l’action, à confirmer par le MJ)').dispatchEvent('change');
 await panel.locator('[data-roll-input="attack"]').fill('30');
 await panel.getByRole('button',{name:'Calculer',exact:true}).click();
 const preview=await page.evaluate(()=>window.f2Workspace.view.getViewState().resolution.preview);
 assert.equal(preview.input.v5.kind,'ranged','v5Input envoie Tir au moteur depuis le même choix de groupe');
 assert.equal(preview.input.attackContext.ranged,true,'la résolution reçoit la nature à distance');
 assert.equal(preview.input.action.attr,'CT');
 assert.equal(preview.input.action.base,45);
 assert.equal(preview.weaponSkillReceipt.group,'Ingénierie','le libellé visuel Ingénierie tir ne devient pas une spécialité inventée');
 assert.equal(preview.weaponSkillReceipt.trained,true);
 await page.evaluate(async()=>{const actor=window.f2Workspace.store.listParticipants().find(row=>row.id==='actor');await window.f2Workspace.store.updateParticipant('actor',{actions:actor.actions.map(action=>({...action,extensions:{...action.extensions,fiche:{...action.extensions.fiche,requiresLink:false}}}))});});
 await page.getByLabel('Type d’action').selectOption('skill');
 await panel.locator('[data-roll-input="attack"]').fill('30');
 await panel.getByRole('button',{name:'Calculer',exact:true}).click();
 const generic=await page.evaluate(()=>window.f2Workspace.view.getViewState().resolution.preview);
 assert.equal(generic.input.v5.kind,'test','un ancien groupe d’arme ne requalifie pas un Test générique');
 console.log('F2-C workspace: choix Ingénierie tir → v5Input → previewResolution vérifié.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
