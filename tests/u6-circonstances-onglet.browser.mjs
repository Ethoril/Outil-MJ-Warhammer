// U6 (05/11, D5), revu par la refonte E4b (CA15a, 21/11) : l'onglet « Circonstances » du panneau latéral a disparu ; les
// circonstances vivent dans la résolution (puces déduites + panneau « autres… », replié par défaut). Le panneau survit à un
// rendu (−1 PV), Fermer le replie, et une ancienne mémoire d'onglet « Circonstances » ne casse rien au rechargement.
// Application complète, vrai Store, harnais de u2-preserve-view.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),base='/Outil-MJ-Warhammer/';
const server=createStaticServer({ root, base, headers: { 'Cache-Control': 'no-store' } });
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
 assert.equal(await side.getByRole('tab',{name:'Circonstances',exact:true}).count(),0,'plus d’onglet « Circonstances »');
 assert.equal(await drawer.evaluate(el=>el.closest('.workspace-center')!==null),true,'le panneau « autres… » vit dans la case centrale, avec la résolution');
 assert.equal(await drawer.isHidden(),true,'replié par défaut : les circonstances utiles sont en puces');
 await toggle.click();
 assert.equal(await drawer.isVisible(),true,'« + autres… » ouvre le panneau');
 assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 const pertinent=drawer.locator('.workspace-circumstances-pertinent [data-circumstance]');
 const count=await pertinent.count();
 assert.ok(count>0&&count<=12,`au plus 12 circonstances pertinentes (${count})`);
 // Le panneau survit à un rendu.
 await combat.locator('[data-sheet-role="actor"][data-actor-id="hero"] [data-focus-key="hp-minus-hero"]').evaluate(el=>el.click());
 await page.waitForTimeout(300);
 assert.equal(await drawer.isVisible(),true,'panneau toujours ouvert après le rendu');
 // Aucune perte de fonction : une case se coche, le bouton compte les circonstances actives.
 const box=pertinent.first();const was=await box.isChecked();await box.setChecked(!was);
 await page.waitForTimeout(200);
 assert.equal(await drawer.locator('.workspace-circumstances-pertinent [data-circumstance]').first().isChecked(),!was,'une case du panneau se coche');
 assert.match(await toggle.textContent(),was?/^\+ autres…$/:/\(1\)/,'le bouton compte les circonstances actives');
 // Les réglages détaillés restent accessibles, repliés.
 const more=drawer.locator('.workspace-circumstances-more');
 assert.equal(await more.evaluate(el=>el.open),false,'réglages détaillés repliés');
 await more.locator(':scope > summary').click();
 assert.equal(await more.evaluate(el=>el.open),true,'réglages détaillés dépliables');
 // Fermer replie le panneau.
 await drawer.getByRole('button',{name:'Fermer',exact:true}).click();
 assert.equal(await drawer.isHidden(),true,'Fermer replie le panneau');
 assert.equal(await toggle.getAttribute('aria-expanded'),'false','bouton replié');
 // Rechargement avec un ancien onglet « Circonstances » mémorisé : le panneau latéral se construit sans erreur.
 await page.evaluate(()=>{for(const key of Object.keys(localStorage)){try{const value=JSON.parse(localStorage.getItem(key));if(value&&typeof value==='object'&&!Array.isArray(value)&&'tab' in value&&'collapsed' in value)localStorage.setItem(key,JSON.stringify({...value,tab:'circumstances'}));}catch{}}});
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});await page.locator('#tab-combat').click();
 assert.equal(await page.locator('.workspace-side').getByRole('tab',{name:'Règles',exact:true}).count(),1,'le panneau latéral se construit');
 assert.equal(await page.locator('.workspace-side').getByRole('tab',{name:'Circonstances',exact:true}).count(),0);
 assert.deepEqual(errors,[],'aucune erreur JavaScript');
 console.log('U6 navigateur (E4b) : plus d’onglet Circonstances, panneau « autres… » dans la case centrale, conservé au rendu, Fermer le replie.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
