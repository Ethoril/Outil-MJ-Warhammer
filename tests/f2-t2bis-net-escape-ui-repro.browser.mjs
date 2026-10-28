import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Reproduction isolée : application complète, vrai Store, seed JSON de test.
const root=fileURLToPath(new URL('../',import.meta.url)),base='/Outil-MJ-Warhammer/';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);assert.ok(pathname.startsWith(base));const path=resolve(root,pathname.slice(base.length)||'index.html');assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404);res.end('Not found');}});
const actor={id:'net-actor',name:'Acteur filet',kind:'PJ',camp:'pj',zone:'active',initiative:60,hp:20,maxHp:20,caracs:{CC:40,CT:40,F:40,E:30,BE:3,I:40,Ag:40,Dex:35,Int:30,FM:35,Soc:25},skills:[],talents:[],traits:[],states:[{id:'net-state',key:'enchevetre',name:'Empêtré',level:2,strength:35,source:{hookedNet:true,authorId:'net-source',escapeStrength:35}}],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},actions:[{id:'net-escape',note:'Sortir du filet',type:'test',attr:'F',base:50,damage:null,qualities:[]}]};
const target={id:'net-source',name:'Source du filet',kind:'PNJ',camp:'ennemi',zone:'active',initiative:30,hp:20,maxHp:20,caracs:{CC:35,CT:30,F:30,E:30,BE:3,I:30,Ag:30},skills:[],talents:[],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}}};
const seed={schemaVersion:3,reserve:[],diceLines:[],log:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]}};
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined)});
try{
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(12000);
 const origin=`http://127.0.0.1:${server.address().port}${base}`;await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});await page.locator('#tab-combat').click();
 await page.evaluate(async value=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;await Store.loadFromJSON(value);},seed);
 const play=page.locator('#workspace-root'),action=play.locator('[data-action-key="net-escape"]');await action.waitFor();await action.click();
 const type=play.getByLabel('Type d’action');assert.equal(await type.locator('option[value="test"]').count(),1,'Le menu réel propose maintenant un Test explicite.');
 let summary=play.getByText('Circonstances des Tests');if(!(await summary.evaluate(el=>el.closest('details')?.open)))await summary.click();await play.getByLabel('Sortie d’entrave : état Empêtré').selectOption('net-state');
 const roll=play.locator('[data-roll-input="attack"]');await roll.fill('20');
 await play.getByLabel('Jet d100 opposé — Force 35').fill('20');
 await type.selectOption('skill');await play.getByRole('button',{name:'Calculer',exact:true}).click();let preview=play.locator('.workspace-result-live');await preview.waitFor();
 assert.match(await preview.innerText(),/Entrave : le Test de sortie doit être un Test de Force/u,'une compétence ordinaire ne peut pas contourner la garde de Force');
 await play.getByRole('button',{name:'Annuler le résultat calculé'}).click();await type.selectOption('test');const hookedDamage=play.getByLabel('Filet à crochets : dégâts MJ (armure ignorée)');await hookedDamage.fill('0');await hookedDamage.dispatchEvent('change');await play.getByRole('button',{name:'Calculer',exact:true}).click();preview=play.locator('.workspace-result-live');await preview.waitFor();
 let text=await preview.innerText();assert.doesNotMatch(text,/Entrave : le Test de sortie doit être un Test de Force/u);assert.match(text,/Sortie de filet : Force/u);
 await preview.getByRole('button',{name:/Appliquer|Enregistrer le résultat/}).click();
 const level=await page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');return Store.listParticipants().find(row=>row.id==='net-actor').states.find(row=>row.id==='net-state')?.level??0;});
 assert.equal(level,0,'l’application du Test de Force retire les états Empêtré prévus par les DR nets');
 console.log('Sortie de filet : la Compétence reste bloquée, le type Test permet la Force opposée et le résultat est appliqué.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
