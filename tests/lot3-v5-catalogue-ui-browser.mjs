import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import contracts from '../js/data/v5-spell-contracts.json' with {type:'json'};
import {sourceCases} from './helpers/lot3-catalogue-fixture.js';
import {workspaceHarness} from './helpers/lot3-workspace-harness.mjs';
const harness=workspaceHarness.replace('.filter(c=>c.isBookV5)','.filter(c=>true)'),root=resolve('.');
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/harness'){res.setHeader('Content-Type','text/html');res.end(harness);return;}const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root+'\\')&&!path.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',extname(path)==='.js'?'application/javascript':extname(path)==='.json'?'application/json':'text/css');res.end(await readFile(path));}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'}),page=await browser.newPage({viewport:{width:1440,height:1080},serviceWorkers:'block'}),errors=[],receipts=[];
page.on('pageerror',e=>errors.push(e.message));const origin='http://127.0.0.1:'+server.address().port,field=text=>page.getByLabel(text,{exact:true});let facts=0;
const choose=async name=>{await page.goto(origin+'/harness');await page.waitForFunction(()=>window.ready);await page.click('[data-action-key="v5-magic:cast"]');await page.locator('[data-focus-key="magic-spell"]').selectOption(contracts.find(c=>c.name===name).id);};
const optionLabel=o=>o.label+' ('+o.cost+' DR'+(o.repeat?' par palier':'')+')';
const escape=s=>s.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&');
try{
 for(const [name] of sourceCases){const c=contracts.find(c=>c.name===name);await choose(name);
  for(const f of c.effects.facts || []){
   if(f.optionalForSelf)continue;if(f.requiredWhen)continue;if(f.requiredIfOvercast){await field(optionLabel(c.overcast.specific.find(o=>o.id===f.requiredIfOvercast))).fill('1');}
   const controls=f.perTarget?page.getByLabel(new RegExp('^'+escape(f.label)+' — ')):field(f.label);assert.ok(await controls.count(),name+' : '+f.label);
   for(let j=0;j<await controls.count();j++){const control=controls.nth(j);if(f.type==='boolean')await control.selectOption(String(f.expected ?? true));else if(f.type==='select')await control.selectOption(f.options[0][0]);else if(f.type==='object')await control.selectOption({index:1});else await control.fill(f.type==='text'?'Objet et contexte déclarés':String(f.key==='monthsDays'?180:f.max===10?5:f.min ?? 0));assert.ok(await control.inputValue()!=='' || f.type==='number');facts++;}
  }
  for(const o of c.overcast.specific || []){await field(optionLabel(o)).fill('1');assert.equal(await field(optionLabel(o)).inputValue(),'1');facts++;}
  receipts.push({name,controls:(c.effects.facts || []).map(f=>f.label),options:(c.overcast.specific || []).map(o=>o.label)});
 }
 await choose('Polir et Exalter');await field('Polir : lentille ou vitre enchantable').selectOption('true');await field('Astronomie +2 DR (2 DR)').fill('1');await page.fill('[data-roll-input="attack"]','25');await page.click('[data-focus-key="calculate"]');
 assert.equal(await page.isDisabled('[data-focus-key="apply"]'),false);assert.equal(await page.evaluate(()=>window.__TEST__.Store.listParticipants().find(p=>p.id==='foe').extensions.v5.testModifiers?.['Savoir (Astronomie)'] || 0),0);
 await page.click('[data-focus-key="apply"]');await page.waitForFunction(()=>window.__TEST__.Store.listParticipants().find(p=>p.id==='foe').extensions.v5.testModifiers?.['Savoir (Astronomie)']===2);
 await choose('Transformation de Kadon');await page.locator('[data-focus-key="magic-kadon-monster"]').selectOption('manual');await field('Monstre : Taille').selectOption('large');facts++;
 await page.getByLabel('Option +4 DR : transformer une autre créature (sort de Contact, le lanceur ne se transforme pas)',{exact:true}).check();await page.getByRole('button',{name:'Cible',exact:true}).first().click();await field('Kadon : cible non consentante — Cible').selectOption('true');facts++;
 await field('Opposition : Force Mentale du lanceur (d100)').fill('25');await field('Opposition : Force Mentale de la cible (d100) — Cible').fill('95');facts+=2;
 await choose('Visage mutable');await field('Visage : cible non consentante — Cible').selectOption('true');await field('Opposition : Force Mentale du lanceur (d100)').fill('25');await field('Opposition : Force Mentale de la cible (d100) — Cible').fill('95');facts+=3;
 const chain=contracts.find(c=>c.canonicalName==='Chain Attack');await choose(chain.name);await page.evaluate(async()=>{const store=window.__TEST__.Store,p=store.listParticipants().find(p=>p.id==='foe');await store.updateParticipant('foe',{caracs:{...p.caracs,E:50},armor:{head:0,body:0,arms:0,legs:0},armorLocations:{head:0,body:0,rightArm:0,leftArm:0,rightLeg:0,leftLeg:0}});});
 await page.locator('summary').filter({hasText:/^Cibles multiples/}).click();await field('Cible du sort : Mage').check();await field('Rebond : cible la plus proche confirmée — Mage').selectOption('true');await field('Rebond : distance depuis la cible précédente (m) — Mage').fill('6');facts+=2;await page.fill('[data-roll-input="attack"]','25');await page.click('[data-focus-key="calculate"]');assert.match(await page.locator('.workspace-magic-result').innerText(),/Chaîne arrêtée.*Blessures.*5.*BE.*5/);await page.click('[data-focus-key="apply"]');assert.ok(await page.evaluate(()=>window.__TEST__.Store.getLog().some(l=>/Chaîne arrêtée.*Blessures/.test(l.text))));
 // HEPG81 : attribut du premier Vent avant tout choix du Vent.
 await choose('Bannissement Mineur (Hysh & Shyish)');assert.equal(await page.getByLabel(/Appliquer l’attribut de Vent/).count(),1);const wind=field('Domaine d’Arcane ou attribut de Haute Magie/elfique');assert.equal(await wind.inputValue(),'');assert.equal(await wind.locator('option').count(),3);await wind.selectOption('death');assert.equal(await wind.inputValue(),'death');
 // Dialogue de la vraie fin de Tour : quatre étapes explicitement distinctes.
 await choose('Tempête Magmatique');await page.evaluate(async()=>{
  const {createCombatEngine}=await import('/js/core/combat.js');const {openV5EffectInputDialog}=await import('/js/ui/v5-effect-dialog.js');const Store=window.__TEST__.Store;
  await Store.applySpellExecution('Tempête Magmatique',{actorId:'mage',targetIds:['foe'],sl:50,attributeActive:false,willpowerSuccess:true,direction:'E',distanceRoll:9,locationRoll:34,overcastSpecific:{mini:3}});
  await Store.applySpellEffects('foe',{ward:7,durationRounds:10,casterId:'mage'});
  const state=JSON.parse(Store.getFullJSON());state.combat.round=2;state.combat.currentActorId='mage';delete state.activeScene;await Store.loadFromJSON(state);
  const button=document.createElement('button');button.textContent='Tester étapes du vortex';button.onclick=async()=>{const engine=createCombatEngine(Store);const pending=await engine.nextTurn();await openV5EffectInputDialog({pending,submit:(inputs,baseRevision)=>engine.nextTurn({inputs,baseRevision}),getCurrentRevision:()=>Store.getLocalRevision(),title:'Étapes distinctes du vortex'});};document.body.append(button);
 });
 await page.getByRole('button',{name:'Tester étapes du vortex',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Étapes distinctes du vortex'});
 await dialog.getByLabel('Tempête Magmatique : vortex principal direction aléatoire',{exact:true}).fill('4');await dialog.getByRole('button',{name:'Confirmer les effets',exact:true}).click();
 await dialog.getByLabel('Tempête Magmatique : vortex principal déplacement 2d10',{exact:true}).fill('8');await dialog.getByRole('button',{name:'Confirmer les effets',exact:true}).click();
 await dialog.getByLabel('Tempête Magmatique : vortex principal toutes les cibles traversées, y compris aucune',{exact:true}).selectOption('foe');await dialog.getByRole('button',{name:'Confirmer les effets',exact:true}).click();
 for(const label of ['Tempête Magmatique : mini-vortex 1 direction aléatoire','Tempête Magmatique : mini-vortex 2 direction aléatoire','Tempête Magmatique : mini-vortex 3 direction aléatoire']){const control=dialog.getByLabel(label,{exact:true});if(label.includes('cibles'))await control.selectOption('foe');else await control.fill('4');}
 await dialog.getByRole('button',{name:'Confirmer les effets',exact:true}).click();
 for(let i=1;i<=3;i++)await dialog.getByLabel('Tempête Magmatique : mini-vortex '+i+' déplacement 2d10',{exact:true}).fill('10');
 await dialog.getByRole('button',{name:'Confirmer les effets',exact:true}).click();
 for(let i=1;i<=3;i++)await dialog.getByLabel('Tempête Magmatique : mini-vortex '+i+' toutes les cibles traversées, y compris aucune',{exact:true}).selectOption('foe');
 await dialog.getByRole('button',{name:'Confirmer les effets',exact:true}).click();
 const labels=await dialog.locator('input[aria-label]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));
 assert.ok(labels.some(l=>l.includes('vortex principal')));for(let i=1;i<=3;i++)assert.ok(labels.some(l=>l.includes('mini-vortex '+i)));assert.equal(new Set(labels).size,labels.length);
 for(const label of labels)await dialog.getByLabel(label,{exact:true}).fill('34');await dialog.getByRole('button',{name:'Confirmer les effets',exact:true}).click();
 const wards=await dialog.locator('input[aria-label]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')).filter(s=>s.includes('d10 de chaque Protection')));assert.equal(wards.length,4);assert.equal(new Set(wards).size,4);
 await mkdir('tmp/lot3',{recursive:true});await page.screenshot({path:'tmp/lot3/lot5a-vortex-dialog.png',fullPage:true});
 for(const label of wards)await dialog.getByLabel(label,{exact:true}).fill('10');await dialog.getByRole('button',{name:'Confirmer les effets',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await choose('Armure d’étain');await page.screenshot({path:'tmp/lot3/lot5a-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await choose('Flamme Inextinguible');await field('Durée BFM mois (6 DR)').fill('1');await field('Flamme : jours des BFM mois calendaires (MJ)').fill('180');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'tmp/lot3/lot5a-mobile.png',fullPage:true});await page.evaluate(()=>document.documentElement.dataset.theme='dark');await page.screenshot({path:'tmp/lot3/lot5a-mobile-dark.png',fullPage:true});
 assert.deepEqual(errors,[]);await writeFile('tmp/lot3/lot5a-ui-receipt.json',JSON.stringify({facts,application:'Polir : vrai calcul et application +2',firstWind:true,vortexStages:4,errors,spells:receipts},null,2));console.log('Lot 5A : '+facts+' gestes, application, premier Vent et quatre étapes de vortex : OK.');
}catch(error){await mkdir('tmp/lot3',{recursive:true});await page.screenshot({path:'tmp/lot3/lot5a-error.png',fullPage:true});throw error;}finally{await browser.close();await new Promise(ok=>server.close(ok));}
