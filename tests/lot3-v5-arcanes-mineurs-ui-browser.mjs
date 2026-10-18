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
 for(const c of contracts.filter(c=>c.isBookV5&&['arcane','petty'].includes(c.domain)&&c.effects.facts?.length)){
  await choose(c.id);const who=/^Vous$/i.test(c.target)?'Mage':'Cible';
  for(const f of c.effects.facts){const control=page.getByLabel(f.label+(f.perTarget?' — '+who:''),{exact:true});
   if(await control.count()===0)continue;
   if(f.type==='boolean')await control.selectOption(String(f.expected??true));
   else if(f.type==='select')await control.selectOption(f.options[0][0]);
   else if(f.type==='object')await control.selectOption('blade');
   else await control.fill(f.type==='text'?'Rat local':String(f.min??1));facts++;
  }
 }
 for(const [name,kind] of [['Light','control'],['Marsh Lights','control'],['Sounds','control'],['Move Object','opposed-move'],['Corrosive Blood','blood'],['Flight','flight'],['Sleep','noise']]){
  await choose(name,name);const id=await page.evaluate(n=>window.__TEST__.Store.listParticipants().flatMap(p=>p.extensions.v5.spellEffects || []).find(e=>e.spellId===window.__TEST__.getSpellContract(n).id).id,name);
  await page.getByLabel('Effet actif',{exact:true}).selectOption(id);await page.getByLabel('Destinataire de la clause',{exact:true}).selectOption('mage');await page.getByLabel('Clause à résoudre',{exact:true}).selectOption(kind);
  if(kind==='control'){const control=page.getByLabel('Modification du sort',{exact:true});await control.selectOption({index:1});await page.getByLabel('Clause : jet secondaire d100',{exact:true}).fill('25');if(name==='Marsh Lights')await page.getByLabel('Ligne de vue confirmée',{exact:true}).selectOption('true');}
  if(kind==='opposed-move'){await page.getByLabel('Destinataire de la clause',{exact:true}).selectOption('foe');await page.getByLabel('Clause : jet secondaire d100',{exact:true}).fill('25');await page.getByLabel('Clause : Force adverse d100',{exact:true}).fill('95');}
  if(kind==='blood'){await page.getByLabel('Tous les engagés sont déclarés',{exact:true}).check();await page.getByLabel('Sang corrosif : engagé Cible',{exact:true}).check();await page.getByLabel('Localisation d100 — Cible',{exact:true}).fill('34');const wards=page.getByLabel('Protection d10 — Cible',{exact:true});await wards.fill('');await wards.pressSequentially('1 5',{delay:20});assert.equal(await wards.inputValue(),'1 5','D1 Sang corrosif : séparateur conservé au clavier');await wards.fill('1');await page.getByLabel('Clause : dégâts communs d10',{exact:true}).fill('9');}
  if(kind==='flight')await page.getByLabel('Position de vol',{exact:true}).selectOption('ground');
  const before=await page.evaluate(()=>window.__TEST__.Store.getLocalRevision());await page.getByRole('button',{name:'Résoudre la clause du sort',exact:true}).click();await page.waitForFunction(rev=>window.__TEST__.Store.getLocalRevision()>rev,before);clauses++;
 }
 await choose('Breath');await page.getByLabel('Souffle : Test de CT du lanceur (d100)',{exact:true}).fill('25');await page.getByLabel('Souffle : distance au lanceur (m) — Cible',{exact:true}).fill('10');await page.getByLabel('Souffle : Esquive (d100) — Cible',{exact:true}).fill('95');
 await page.getByLabel('Domaine d’Arcane ou attribut de Haute Magie/elfique',{exact:true}).selectOption('fire');
 await page.getByLabel('Souffle : opposition — Cible',{exact:true}).selectOption('false');assert.equal(await page.getByLabel('Souffle : Esquive (d100) — Cible',{exact:true}).count(),0);await page.getByLabel('Souffle : opposition — Cible',{exact:true}).selectOption('true');
 await choose('Chain Attack');await page.locator('summary',{hasText:'Cibles multiples'}).click();await page.getByLabel('Cible du sort : Mage',{exact:true}).check();await page.getByLabel('Rebond : distance depuis la cible précédente (m) — Mage',{exact:true}).fill('4');await page.getByLabel('Rebond : cible la plus proche confirmée — Mage',{exact:true}).selectOption('true');
 await choose('Push');await page.locator('summary',{hasText:'Cibles multiples'}).click();await page.getByLabel('Cible du sort : Cible',{exact:true}).check();await page.getByLabel('Dégâts du sort : d10 — Cible',{exact:true}).fill('9');await page.getByLabel('Créatures heurtées par Poussée (déclarées par le MJ) : Mage',{exact:true}).check();await page.getByLabel('Collision : Taille de la créature heurtée — Mage',{exact:true}).fill('4');await page.getByLabel('Collision : Taille de la créature repoussée — Mage',{exact:true}).fill('4');
 await choose('Aethyric Arms');await page.getByLabel('Arme aethyrique : modèle (V5 p. 301)',{exact:true}).selectOption('spear');await page.getByLabel('Arme aethyrique : valeur du Corps à corps utilisé (si absent de la fiche)',{exact:true}).fill('55');await page.locator('[data-roll-input="attack"]').fill('25');await page.getByRole('button',{name:'Calculer',exact:true}).click();const result=page.locator('.workspace-magic-result');assert.match(await result.innerText(),/55.*BF.*4|Lance.*55/s);assert.match(await result.innerText(),/sans Charge|une main/);await page.locator('[data-focus-key="apply"]').click();await page.waitForFunction(()=>window.__TEST__.Store.listParticipants().some(p=>(p.actions || []).some(a=>a.note?.includes('aethyrique'))));assert.equal(await page.locator('[data-action-key]').filter({hasText:/Lance aethyrique/}).count(),1,'D2 : une action visible, au score déclaré');
 assert.deepEqual(errors,[]);console.log('Lot 2 : vraie workspace-view, '+facts+' faits, '+clauses+' clauses, clavier Sang corrosif, arme unique/profil et collisions : gestes OK.');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
