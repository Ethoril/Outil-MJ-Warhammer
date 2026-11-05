// U5 (05/11) : barre de PV avec segment de dégâts prévisualisés, micro-transitions coupées sous prefers-reduced-motion. Application complète, vrai Store, harnais de u2-preserve-view.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url)),base='/Outil-MJ-Warhammer/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);assert.ok(pathname.startsWith(base));const path=resolve(root,pathname.slice(base.length)||'index.html');assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404);res.end('Not found');}});
const skills=Array.from({length:12},(_,i)=>({id:`skill-${i}`,name:`Compétence ${i}`,status:'resolved',total:30+i,carac:'Ag'}));
const person=(id,name,kind='PJ')=>({id,name,kind,camp:kind==='PJ'?'pj':'ennemi',zone:'active',initiative:id==='hero'?60:30,hp:20,maxHp:20,caracs:{CC:60,CT:50,F:40,E:30,BE:3,I:40,Ag:35,Dex:35,Int:30,FM:35,Soc:25},skills,talents:[{id:'t1',name:'Ambidextre'}],equipment:[{id:'sword',name:'Épée',kind:'weapon'}],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},actions:[{id:'sword',note:'Coup d’épée',type:'attack',attr:'CC',base:60,damage:4,qualities:[]}]});
const fixture={schemaVersion:3,reserve:[],diceLines:[],log:[],extensions:{v5:{combatId:'u2-browser',turnIndex:1}},combat:{round:1,currentActorId:'hero',order:['hero','foe'],participants:[person('hero','Héros'),person('foe','Garde','PNJ')]}};

await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined)});
try{
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:640}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}${base}`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});await page.locator('#tab-combat').click();
 await page.evaluate(async s=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;await Store.loadFromJSON(s);},JSON.stringify(fixture));
 const measure=(hp,max,loss)=>page.evaluate(async([hp,max,loss])=>{const{hpBar}=await import('/Outil-MJ-Warhammer/js/ui/workspace/helpers.js');const bar=hpBar({hp,maxHp:max},loss);const fill=bar.querySelector('.workspace-hp-fill'),seg=bar.querySelector('.workspace-hp-loss');return{fill:fill.style.width,seg:seg?[seg.style.left,seg.style.width]:null};},[hp,max,loss]);
 assert.deepEqual(await measure(20,20,0),{fill:'100%',seg:null},'sans aperçu : pas de segment');
 assert.deepEqual(await measure(20,20,5),{fill:'75%',seg:['75%','25%']},'5 PV sur 20 : segment de 25 % à droite des PV restants');
 assert.deepEqual(await measure(4,20,9),{fill:'0%',seg:['0%','20%']},'la perte est bornée aux PV restants');
 await page.locator('#tab-combat').click();
 const view=await page.evaluate(async()=>{const el=document.createElement('button');el.className='x';const host=document.querySelector('.workspace-view');host.append(el);const d=getComputedStyle(el).transitionDuration;el.remove();return d;});
 assert.ok(view.split(',').every(d=>{const ms=parseFloat(d)*1000;return ms>=120&&ms<=180;}),`transitions de 120 à 180 ms sur les boutons (${view})`);
 await page.emulateMedia({reducedMotion:'reduce'});
 const reduced=await page.evaluate(()=>{const el=document.createElement('button');document.querySelector('.workspace-view').append(el);const d=getComputedStyle(el).transitionDuration;el.remove();return d;});
 assert.match(reduced,/^0s/,'aucune transition sous prefers-reduced-motion');
 assert.deepEqual(errors,[],'aucune erreur JavaScript');
 console.log('U5 navigateur : segment de dégâts prévisualisés, transitions 120–180 ms, coupées sous reduced-motion.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
