// U6 (05/11, D5) : Circonstances est un onglet du panneau latéral ; il ne recouvre plus le plateau et l'onglet
// actif survit à un rendu (−1 PV). Application complète, vrai Store, harnais de u2-preserve-view.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { launchBrowser } from './helpers/browser.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),base='/Outil-MJ-Warhammer/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);assert.ok(pathname.startsWith(base));const path=resolve(root,pathname.slice(base.length)||'index.html');assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404);res.end('Not found');}});
const skills=Array.from({length:12},(_,i)=>({id:`skill-${i}`,name:`Compétence ${i}`,status:'resolved',total:30+i,carac:'Ag'}));
const person=(id,name,kind='PJ')=>({id,name,kind,camp:kind==='PJ'?'pj':'ennemi',zone:'active',initiative:id==='hero'?60:30,hp:20,maxHp:20,caracs:{CC:60,CT:50,F:40,E:30,BE:3,I:40,Ag:35,Dex:35,Int:30,FM:35,Soc:25},skills,talents:[{id:'t1',name:'Ambidextre'}],equipment:[{id:'sword',name:'Épée',kind:'weapon'}],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},actions:[{id:'sword',note:'Coup d’épée',type:'attack',attr:'CC',base:60,damage:4,qualities:[]}]});
const fixture={schemaVersion:3,reserve:[],diceLines:[],log:[],extensions:{v5:{combatId:'u2-browser',turnIndex:1}},combat:{round:1,currentActorId:'hero',order:['hero','foe'],participants:[person('hero','Héros'),person('foe','Garde','PNJ')]}};

await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await launchBrowser();
try{
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:640}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}${base}`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});await page.locator('#tab-combat').click();
 await page.evaluate(async s=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;await Store.loadFromJSON(s);},JSON.stringify(fixture));
 const combat=page.locator('#workspace-root');await combat.locator('[data-workspace-select="hero"]').click();
 const side=combat.locator('.workspace-side'),toggle=combat.locator('[data-circumstances-toggle]'),drawer=combat.locator('.workspace-resolution-drawer');
 await side.getByRole('tab',{name:'Règles',exact:true}).click();
 // Avant : aucun tiroir flottant, le bloc vit dans l'onglet.
 assert.equal(await drawer.evaluate(el=>el.closest('#workspace-side-panel-circumstances')!==null),true,'le bloc est dans le panneau latéral');
 assert.equal(await drawer.isHidden(),true,'fermé tant que l’onglet n’est pas affiché');
 await toggle.click();
 const tab=side.getByRole('tab',{name:'Circonstances',exact:true});
 assert.equal(await tab.getAttribute('aria-selected'),'true','le bouton affiche l’onglet Circonstances');
 assert.equal(await drawer.isVisible(),true,'contenu visible');
 assert.notEqual(await drawer.evaluate(el=>getComputedStyle(el).position),'fixed','plus de tiroir flottant');
 // Rien ne recouvre le plateau : le bloc reste dans la boîte du panneau latéral.
 const [sb,db]=await Promise.all([side.boundingBox(),drawer.boundingBox()]);
 assert.ok(db.x>=sb.x-1&&db.x+db.width<=sb.x+sb.width+1,'le bloc ne déborde pas du panneau');
 // L'onglet survit à un rendu.
 await combat.locator('[data-sheet-role="actor"][data-actor-id="hero"] [data-focus-key="hp-minus-hero"]').evaluate(el=>el.click());
 await page.waitForTimeout(300);
 assert.equal(await tab.getAttribute('aria-selected'),'true','onglet Circonstances conservé après le rendu');
 assert.equal(await drawer.isVisible(),true,'contenu toujours visible après le rendu');
 // Aucune perte de fonction : un réglage du bloc reste utilisable et le bouton affiche le compte.
 const box=drawer.locator('input[type="checkbox"]').first();
 if(await box.count()){const was=await box.isChecked();await box.setChecked(!was);assert.equal(await box.isChecked(),!was,'une case du bloc se coche depuis l’onglet');}
 // Fermer revient à l'onglet précédent.
 await drawer.getByRole('button',{name:'Fermer',exact:true}).click();
 assert.equal(await side.getByRole('tab',{name:'Règles',exact:true}).getAttribute('aria-selected'),'true','Fermer revient à Règles');
 assert.equal(await toggle.getAttribute('aria-expanded'),'false','bouton replié');
 // Choisir un autre onglet ferme aussi le bloc (aria-expanded suit).
 await toggle.click();await side.getByRole('tab',{name:'Journal',exact:true}).click();
 assert.equal(await toggle.getAttribute('aria-expanded'),'false','changer d’onglet replie l’état du bouton');
 // Rechargement avec l'onglet Circonstances mémorisé : le panneau s'initialise sans erreur (placeholder avant tout rendu).
 await toggle.click();
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});await page.locator('#tab-combat').click();
 assert.equal(await page.locator('.workspace-side').getByRole('tab',{name:'Circonstances',exact:true}).count(),1,'le panneau latéral se construit avec l’onglet mémorisé');
 assert.deepEqual(errors,[],'aucune erreur JavaScript');
 console.log('U6 navigateur : Circonstances en onglet, rien ne recouvre le plateau, onglet conservé, Fermer revient à l’onglet précédent.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
