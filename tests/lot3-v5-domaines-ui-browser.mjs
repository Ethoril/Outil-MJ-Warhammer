import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import contracts from '../js/data/v5-spell-contracts.json' with {type:'json'};
import {workspaceHarness} from './helpers/lot3-workspace-harness.mjs';

const root=resolve('.');
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/harness'){res.setHeader('Content-Type','text/html');res.end(workspaceHarness);return;}const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root+'\\')&&!path.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',extname(path)==='.js'?'application/javascript':extname(path)==='.json'?'application/json':'text/css');res.end(await readFile(path));}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('Erreur de page : '+e.message);});
const choose=async(name,active='',allies=false)=>{
 await page.goto('http://127.0.0.1:'+server.address().port+'/harness?active='+encodeURIComponent(active)+(allies?'&allies=1':''));await page.waitForFunction(()=>window.ready);
 await page.click('[data-action-key="v5-magic:cast"]');await page.locator('[data-focus-key="magic-spell"]').selectOption(await page.evaluate(n=>window.__TEST__.getSpellContract(n).id,name));
};
let facts=0,clauses=0;
try{
 // Regression centrale : aucun clic Calculer avant le choix de la clause et ses dés.
 for(const [name,kind] of [['Firewall','trigger'],['Mystifying Miasma','move'],['Doppelganger','detect'],['Shroud of Invisibility','noise'],['Barkskin','end']]){
  await choose(name,name);
  const effectId=await page.evaluate(()=>window.__TEST__.Store.listParticipants().flatMap(p=>p.extensions.v5.spellEffects || []).find(e=>e.spellId).id);
  await page.getByLabel('Effet actif',{exact:true}).selectOption(effectId);
  await page.getByLabel('Destinataire de la clause',{exact:true}).selectOption('foe');
  await page.getByLabel('Clause à résoudre',{exact:true}).selectOption(kind);
  if(kind==='trigger'){
   assert.equal(await page.getByLabel('Clause : localisation d100',{exact:true}).count(),1,'sans aperçu préalable');
   await page.getByRole('button',{name:'Résoudre la clause du sort',exact:true}).click();await page.waitForFunction(()=>document.body.textContent.includes('saisir'));
   await page.getByLabel('Clause : localisation d100',{exact:true}).fill('34');const wards=page.getByLabel('Clause : Protection d10',{exact:true});await wards.fill('');await wards.pressSequentially('1 5',{delay:20});assert.equal(await wards.inputValue(),'1 5','D1 : clavier conserve le séparateur');await wards.fill('');await wards.pressSequentially('1 10',{delay:20});
  }
  if(['move','detect'].includes(kind))await page.getByLabel('Clause : jet secondaire d100',{exact:true}).fill('98');
  await page.getByRole('button',{name:'Résoudre la clause du sort',exact:true}).click();await page.waitForTimeout(50);clauses++;
  if(kind==='trigger')assert.equal(await page.evaluate(()=>window.__TEST__.Store.listParticipants().find(p=>p.id==='foe').hp),20);
 }
 for(const c of contracts.filter(c=>c.isBookV5&&c.domain!=='arcane'&&c.domain!=='petty'&&c.effects.facts?.length)){
  await choose(c.id);
  const who=/^Vous$/i.test(c.target)?'Mage':'Cible';
  for(const f of c.effects.facts){const label=f.label+(f.perTarget?' — '+who:'');const control=page.getByLabel(label,{exact:true});
   if(f.type==='boolean')await control.selectOption(String(f.expected??true));
   else if(f.type==='select')await control.selectOption(f.options[0][0]);
   else if(f.type==='object'){assert.equal(await control.evaluate(e=>e.tagName),'SELECT');assert.equal(await control.locator('option[value="absent"]').count(),0);await control.selectOption('blade');}
   else await control.fill(String(f.min??0));
   facts++;
  }
 }
 await choose('Flaming Hearts','',true);
 await page.locator('summary',{hasText:'Cibles multiples'}).click();
 await page.getByLabel('Cible du sort : Cible',{exact:true}).check();
 await page.getByLabel('Tenter Frénésie — Cible',{exact:true}).check();
 assert.equal(await page.getByLabel('Frénésie : d100 — Cible',{exact:true}).count(),1);
 await page.getByLabel('Frénésie : d100 — Cible',{exact:true}).fill('25');
 assert.deepEqual(errors,[]);console.log('Domaines V5 : vraie workspace-view, '+facts+' faits/objets, '+clauses+' clauses sans aperçu préalable, Frénésie facultative et Protections multiples : OK.');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
