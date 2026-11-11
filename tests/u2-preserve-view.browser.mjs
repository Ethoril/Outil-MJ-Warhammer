// U2 (05/11) : un rendu (ici, 1 PV retiré depuis la fiche) ne referme pas les sections de fiche ouvertes par le MJ
// et ne fait pas sauter le défilement de la page. Application complète, vrai Store, harnais de f2-i-complete.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
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
 const hp=()=>page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');return JSON.parse(Store.getFullJSON()).combat.participants.find(p=>p.id==='hero').hp;});
 const combat=page.locator('#workspace-root');await combat.locator('[data-workspace-select="hero"]').click();
 const sheet=combat.locator('[data-sheet-role="actor"][data-actor-id="hero"]');
 const fiche=sheet.locator('details.fiche-consultation');
 await fiche.locator(':scope > summary').click();
 // Depuis U4 (05/11), les sections de la fiche sont des onglets : l'onglet choisi doit le rester.
 const tabs=fiche.getByRole('tab');
 assert.ok(await tabs.count()>=2,'au moins deux onglets dans la fiche');
 const second=tabs.nth(1);await second.click();
 const sectionTitle=(await second.innerText()).trim();
 assert.equal(await second.getAttribute('aria-selected'),'true','onglet choisi avant le rendu');
 // Page défilée tout en bas, dans la section ouverte : si elle se refermait, la page raccourcirait et le défilement
 // serait ramené en arrière. Le clic passe par le gestionnaire du bouton, sans défilement de Playwright.
 const minus=sheet.locator('[data-focus-key="hp-minus-hero"]');
 await page.evaluate(()=>{const s=document.scrollingElement;s.scrollTop=s.scrollHeight;});
 const before=await page.evaluate(()=>document.scrollingElement.scrollTop);
 assert.ok(before>0,`la page doit être défilée pour mesurer un saut (scrollTop=${before})`);
 await minus.evaluate(el=>el.click());
 await page.waitForFunction(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');return JSON.parse(Store.getFullJSON()).combat.participants.find(p=>p.id==='hero').hp===19;});
 await page.waitForTimeout(150);
 assert.equal(await hp(),19,'1 PV retiré');
 const after=await page.evaluate(()=>document.scrollingElement.scrollTop);
 assert.ok(Math.abs(after-before)<=1,`le défilement ne saute pas (avant ${before}, après ${after})`);
 const reopened=combat.locator('[data-sheet-role="actor"][data-actor-id="hero"] details.fiche-consultation');
 assert.equal(await reopened.evaluate(el=>el.open),true,'la fiche reste ouverte après le rendu');
 const tabAfter=reopened.getByRole('tab',{name:sectionTitle,exact:true});
 assert.equal(await tabAfter.getAttribute('aria-selected'),'true',`l'onglet « ${sectionTitle} » reste choisi après le rendu`);
 assert.deepEqual(errors,[],'aucune erreur JavaScript');
 console.log(`U2 navigateur : fiche ouverte et onglet « ${sectionTitle} » conservé après −1 PV, défilement ${before} → ${after}.`);
}finally{await browser.close();await new Promise(done=>server.close(done));}
