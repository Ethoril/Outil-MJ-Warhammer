import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import contracts from '../js/data/v5-spell-contracts.json' with {type:'json'};
import {elvenWorkspaceHarness} from './helpers/lot3-elven-workspace-harness.mjs';
const root=resolve('.'),errors=[];
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/harness'){res.setHeader('Content-Type','text/html');res.end(elvenWorkspaceHarness);return;}const p=resolve(root,'.'+decodeURIComponent(url.pathname));if(!p.startsWith(root+'\\')&&!p.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',extname(p)==='.js'?'application/javascript':extname(p)==='.json'?'application/json':'text/css');res.end(await readFile(p));}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'}),page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});
page.on('pageerror',e=>{errors.push(e.message);console.log(e.message);});
const contractFor=name=>contracts.find(c=>c.name===name);
const choose=async(name,active=false)=>{const c=contractFor(name);await page.goto('http://127.0.0.1:'+server.address().port+'/harness?spell='+c.id+(active?'&active='+encodeURIComponent(name):''));await page.waitForFunction(()=>window.ready);await page.click('[data-action-key="v5-magic:cast"]');await page.locator('[data-focus-key="magic-spell"]').selectOption(c.id);};
const field=text=>page.getByLabel(text,{exact:true});let facts=0,clauses=0;
try{
 for(const c of contracts.filter(c=>['high','elven-arcane','elven-petty'].includes(c.domain)&&c.effects.facts?.length)){
  await choose(c.name);const who=c.target==='Vous'?'Mage':'Cible';
  for(const f of c.effects.facts){if(f.requiredIfOvercast)continue;const x=field(f.label+(f.perTarget?' — '+who:''));if(await x.count()===0)continue;
   if(f.type==='boolean')await x.selectOption(String(f.expected??true));else if(f.type==='select')await x.selectOption(f.options[0][0]);else if(f.type==='object')await x.selectOption('blade');else if(f.type==='effect'){assert.equal(await x.evaluate(e=>e.tagName),'SELECT');}else if(f.type==='spell')await x.selectOption({index:1});else await x.fill(f.type==='text'?'Poison déclaré':String(f.min??25));facts++;
  }
  if(c.attributePolicy==='first-wind-default'){const winds=field('Domaine d’Arcane ou attribut de Haute Magie/elfique');assert.equal(await winds.count(),1);assert.equal(await winds.locator('option').count(),3);await winds.selectOption({index:2});}
 }
 // Le d100 conditionnel apparaît par le geste de choix, sans clic Calculer.
 for(const c of contracts.filter(c=>c.domain==='high'&&c.effects.optionRules))for(const f of c.effects.facts || [])if(f.requiredIfOvercast){
  await choose(c.name);const option=c.overcast.specific.find(o=>o.id===f.requiredIfOvercast);await field(option.label+' ('+option.cost+' DR'+(option.repeat?' par palier':'')+')').fill('1');assert.equal(await field(f.label).count(),1,c.name+' '+f.key);await field(f.label).fill('25');facts++;
 }
 await choose('Impasse',true);await field('Impasse : cible de la suppression').selectOption('effect');const effectSelect=field('Impasse : couche active à supprimer — Cible');assert.ok(await effectSelect.locator('option').count()>=3);await effectSelect.selectOption({index:1});await field('Impasse : cible de la suppression').selectOption('spell');await field('Impasse : sort observé ou lu dans le grimoire').selectOption('true');await field('Impasse : sort indisponible — Cible').selectOption({index:1});
 for(const [name,kind,target] of [['Convocation Ardente','immersion','foe'],['Œil Invisible','eye-refocus','mage'],["Malédiction d'Attraction des Flèches",'missile-reroll','foe'],['Glamour de Teclis','control','foe'],['Voix de Fer (Aqshy & Chamon)','iron-listener','foe'],['Tempête','tempest-move','foe'],['Coruscation de Finreir','flight','mage']]){
  await choose(name,true);const id=await page.evaluate(n=>window.__TEST__.Store.listParticipants().flatMap(p=>p.extensions?.v5?.spellEffects || []).find(e=>e.spellId===window.__TEST__.getSpellContract(n).id).id,name);await field('Effet actif').selectOption(id);await field('Destinataire de la clause').selectOption(target);await field('Clause à résoudre').selectOption(kind);
  if(['missile-reroll','control','iron-listener','tempest-move'].includes(kind))await field('Clause : jet secondaire d100').fill('25');
  if(kind==='missile-reroll'){await field('Action de tir de l’attaquant').selectOption('arrow');await field('Tir physique ou munition magique (pas un projectile magique)').check();await field('Tir initial raté confirmé').check();await field('Tir initial : d100').fill('95');}
  if(kind==='control'){await field('Modification du sort').selectOption('direction');await field('Nombre d’échecs de Navigation déclaré').fill('3');}
  if(kind==='tempest-move')await field('Tempête : cible en vol ou au sol').selectOption('air');
  if(kind==='flight')await field('Position de vol').selectOption('ground');
  const before=await page.evaluate(()=>window.__TEST__.Store.getLocalRevision());await page.getByRole('button',{name:'Résoudre la clause du sort',exact:true}).click();await page.waitForFunction(r=>window.__TEST__.Store.getLocalRevision()>r,before);clauses++;
  if(kind==='control'){await field('Modification du sort').selectOption('duration');assert.equal(await field('Clause : jet secondaire d100').count(),0);const rev=await page.evaluate(()=>window.__TEST__.Store.getLocalRevision());await page.getByRole('button',{name:'Résoudre la clause du sort',exact:true}).click();await page.waitForFunction(r=>window.__TEST__.Store.getLocalRevision()>r,rev);assert.ok(await page.evaluate(()=>window.__TEST__.Store.getLog().some(l=>l.text.includes('Glamour prolongé'))));}

 }
 await choose("Masque de l'Esprit (Shyish & Ulgu)",true);await field('Lecture d’esprit ou divination contre Mage').selectOption('true');facts++;
 await choose('Tempête');assert.equal(await field('Résultat du Test de Force Mentale du Vortex').count(),0);await field('Tempête : direction aléatoire d10 (sans Test de FM)').fill('4');await field('Tempête : déplacement 2d10 mètres').fill('10');
 await mkdir('tmp/lot3',{recursive:true});await page.screenshot({path:'tmp/lot3/lot3-elfiques-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'tmp/lot3/lot3-elfiques-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);await writeFile('tmp/lot3/lot3-elfiques-ui-receipt.json',JSON.stringify({facts,clauses,errors,source:'HEPG pp. 80–89 ; vraie workspace-view'},null,2));console.log('Elfiques : '+facts+' champs, '+clauses+' clauses, choix conditionnels, premier Vent, couches/sorts réels et mouvement : OK.');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
