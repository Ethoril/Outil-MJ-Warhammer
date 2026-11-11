import { openU1Settings } from './helpers/u1-drawer.mjs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

// Parcours navigateur F2-J : un critique appliqué par l'interface crée l'occurrence F2-I, le panneau propose le suivi lié,
// un soin passe par la compétence Guérison du soigneur et un d100, un saut de trois jours liste chaque Test quotidien.
const root=fileURLToPath(new URL('../',import.meta.url)),base='/Outil-MJ-Warhammer/';
const server=createStaticServer({ root, base, headers: { 'Cache-Control': 'no-store' } });
const person=(id,name,kind='PJ',extra={})=>({id,name,kind,camp:kind==='PJ'?'pj':'ennemi',zone:'active',initiative:id==='hero'?60:30,hp:20,maxHp:20,caracs:{CC:60,CT:50,F:40,E:30,BE:3,I:40,Ag:35,Dex:35,Int:30,FM:35,Soc:25},skills:[{id:'dodge',name:'Esquive',status:'resolved',total:45,carac:'Ag'}],talents:[],equipment:[],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},...extra});
const hero=person('hero','Héros','PJ',{caracs:{CC:60,CT:50,F:40,E:30,BE:3,I:40,Ag:35,Dex:35,Int:50,FM:35,Soc:25},skills:[{id:'dodge',name:'Esquive',status:'resolved',total:45,carac:'Ag'},{id:'heal',name:'Guérison',status:'resolved',total:60,carac:'Int',advances:10}],actions:[{id:'sword',note:'Coup d’épée',type:'attack',attr:'CC',base:60,damage:20,qualities:[]}]});
const fixture=()=>({schemaVersion:3,reserve:[],diceLines:[],log:[],extensions:{v5:{combatId:'f2-j-review-browser',turnIndex:1}},combat:{round:1,currentActorId:'hero',order:['hero','foe','cripple'],participants:[hero,person('foe','Garde','PNJ',{hp:2,maxHp:20,states:[{id:'ko',key:'inconscient',name:'Inconscient',level:1}],actions:[]}),person('cripple','Éclopé','PJ',{hp:10,maxHp:20})]}});

await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await launchBrowser();
try{
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 const origin=`http://127.0.0.1:${server.address().port}${base}`;await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});await page.locator('#tab-combat').click();
 const load=async state=>page.evaluate(async s=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;await Store.loadFromJSON(s);},state),read=async()=>page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');return JSON.parse(Store.getFullJSON());});
 await load(fixture());
 const combat=page.locator('#workspace-root'),panel=combat.locator('[aria-label="Suivi des séquelles et convalescence"]'),card=name=>panel.locator('.workspace-aftermath-incident').filter({has:page.locator('h4',{hasText:name})}),status=panel.locator('.workspace-aftermath-status');
 const participant=async id=>(await read()).combat.participants.find(row=>row.id===id);

 // 1. Un critique appliqué par l'interface crée l'occurrence F2-I ; aucune occurrence, aucun suivi proposé avant.
 // U3 : « Suites de combat » est fermé pendant le combat ; le MJ l'ouvre, U2 le garde ouvert ensuite.
 const aftermath=combat.locator('details.workspace-aftermath');assert.equal(await aftermath.evaluate(el=>el.open),false,'Suites de combat fermé pendant le combat');await aftermath.locator(':scope > summary').click();
 await panel.waitFor();
 await panel.locator('summary',{hasText:'Critiques à suivre (0)'}).waitFor();
 await combat.locator('[data-workspace-select="hero"]').click();
 await openU1Settings(combat);await combat.getByRole('combobox',{name:'Nature du Test'}).selectOption('melee');
 await combat.getByRole('textbox',{name:'Attaque (CC 60)'}).fill('1');await combat.getByRole('button',{name:'Calculer'}).click();
 const effect=combat.getByRole('textbox',{name:'Gravité (d100 + 210)'});await effect.fill('45');await effect.press('Tab');
 await combat.locator('.workspace-resolution-footer').getByRole('button',{name:/Appliquer/}).click();
 const occurrence=(await participant('foe')).extensions.v5.criticalAftermath;assert.ok(occurrence?.length,'le critique appliqué par l’interface crée l’occurrence F2-I');

 // Même partie : ouvrir et soigner dans Campagne le critique réellement appliqué dans Jouer.
 await aftermath.locator('.workspace-aftermath-link').click();
 await page.locator('#tab-campaign[aria-selected="true"]').waitFor();
 const campaign=page.locator('#workspace-campaign');
 await campaign.locator('[data-campaign-person="foe"]').click();
 const detail=campaign.locator('.campaign-detail');
 await detail.locator('summary',{hasText:'Critiques à suivre (1)'}).click();
 await detail.getByRole('button',{name:/^Ouvrir le suivi de/}).click();
 await page.waitForFunction(()=>/Enregistré/.test(document.querySelector('#workspace-campaign .workspace-aftermath-status')?.textContent||''));
 const opened=(await read()).extensions.v5.aftermathRegister;
 assert.equal(opened.incidents.length,1);
 assert.equal(opened.incidents[0].source.criticalId,occurrence[0].id);
 const treatment=detail.locator('details',{hasText:'Guérison'}).first();
 await treatment.locator('summary').click();
 await treatment.getByLabel('Soigneur').selectOption({label:'Héros'});
 await treatment.getByLabel('Compétence').selectOption({index:0});
 await treatment.getByLabel(/^d100/).fill('20');
 await treatment.getByLabel('Fournitures médicales disponibles').check();
 await treatment.getByRole('button',{name:'Enregistrer le Test de soin'}).click();
 await page.waitForFunction(()=>/Blessure\(s\) rendue\(s\)/.test(document.querySelector('#workspace-campaign .workspace-aftermath-status')?.textContent||''));
 assert.equal((await participant('foe')).hp,9);
 await page.locator('#tab-combat').click();
 await card('Garde').waitFor();
 assert.equal((await participant('foe')).hp,9);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});
 const reloaded=await read();
 assert.equal(reloaded.combat.participants.find(row=>row.id==='foe').hp,9);
 assert.equal(reloaded.extensions.v5.aftermathRegister.incidents[0].source.criticalId,occurrence[0].id);
 assert.deepEqual(errors,[],`aucune erreur UI attendue : ${errors.join('; ')}`);
 console.log('PASS — critique Jouer, soin Campagne, retour et rechargement');
} finally { await browser.close(); server.close(); }
