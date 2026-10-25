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
 const page=await browser.newPage();const origin=`http://127.0.0.1:${server.address().port}`;
 await page.goto(`${origin}/blank`);
 await page.evaluate(async origin=>{window.renderResolutionPanel=(await import(`${origin}/js/ui/resolution-panel.js`)).renderResolutionPanel;window.calls=[];window.handlers=new Proxy({}, {get:()=> (...args)=>window.calls.push(args)});},origin);
 const render=async ({weapon,action,draft={},withTarget=false})=>page.evaluate(({weapon,action,draft,withTarget})=>{const actor={id:'mj',name:'MJ',caracs:{CC:40,CT:35},skills:[],equipment:[weapon],ficheSnapshot:{skills:[],coverage:{skills:'absent'}},states:[]};const target=withTarget?{id:'target',name:'Cible',camp:'enemy',caracs:{CC:30,Ag:30},skills:[],equipment:[],states:[],hp:10,armor:{}}:null;const panel=window.renderResolutionPanel({draft,actor,participants:[actor,...(target?[target]:[])],actions:[action],actionKey:action.id,type:'attack',target,groups:{adversaries:target?[target]:[],allies:[]},defense:{options:[],value:'Ag',option:{value:'Ag',statLabel:'Ag',mod:0,v5:{kind:'test',slModifier:0}}},canCalculate:false,canApply:false,handlers:window.handlers});document.body.replaceChildren(panel);}, {weapon,action,draft,withTarget});
 const ambiguous={id:'ambiguous',kind:'weapon',name:'Objet d’ingénierie',category:'Ingénierie',source:'',range:'',hands:1,keywords:[]};
 const action={id:'act',note:'Objet d’ingénierie',type:'attack',base:'',attr:'CC',damage:1,qualities:[],extensions:{fiche:{bindingVersion:1,equipmentId:'ambiguous',requiresLink:true}}};
 await render({weapon:ambiguous,action});
 await page.getByLabel('Groupe d’arme à confirmer par le MJ').selectOption('Ingénierie tir');
 const selectPayload=await page.evaluate(()=>window.calls.at(-1)[0]);
 assert.equal(selectPayload.v5Kind,'ranged','le choix Ingénierie tir synchronise la Nature du Test');
 await render({weapon:ambiguous,action,draft:{v5Context:{weaponTrainingGroup:'Ingénierie tir'}},withTarget:true});
 assert.equal(await page.getByLabel('Nature du Test').inputValue(),'ranged','la sélection détermine le contrôle Nature du Test');
 assert.equal(await page.getByLabel('Attaque à distance').inputValue(),'true','la nature choisie alimente aussi la protection/bouclier');
 await page.getByLabel('Augmentations de la spécialité (MJ, si la fiche ne les fournit pas)').fill('1');
 await page.getByLabel('Augmentations de la spécialité (MJ, si la fiche ne les fournit pas)').dispatchEvent('change');
 const advancesPayload=await page.evaluate(()=>window.calls.at(-1)[0]);
 assert.equal(advancesPayload.v5Context.weaponAdvances,1);
 assert.notEqual(advancesPayload.v5Context.weaponSkillScore,0,'base vide ne crée aucun score zéro sur saisie des augmentations');
 await render({weapon:{...ambiguous,id:'ascii',name:'Epee batarde',category:'Deux-Mains'},action:{...action,id:'ascii-action',extensions:{fiche:{bindingVersion:1,equipmentId:'ascii',requiresLink:true}}}});
 assert.ok(await page.getByLabel('Main utilisée pour l’épée bâtarde').count(),'le nom ASCII expose le choix Une/Deux mains');
 await render({weapon:ambiguous,action,draft:{preview:{actionType:'attack',success:true,sl:0,input:{actor:{skills:[],equipment:[]},action:{extensions:{fiche:{equipmentId:ambiguous.id}}}},weaponSkillReceipt:{trained:true,group:'Base',skillId:'base',applied:['fencing-with-basic']}}}});
 const receiptText=await page.locator('.workspace-result-line').allTextContents();
 assert.ok(receiptText.some(text=>text.includes('compétence de base utilisée')),'le reçu ne présente pas Base à zéro comme une spécialité entraînée');
 console.log('F2-C UI: nature Ingénierie, score vide et nom ASCII vérifiés.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
