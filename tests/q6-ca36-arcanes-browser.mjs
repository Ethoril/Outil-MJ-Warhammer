import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { clickU1Magic } from './helpers/u1-drawer.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.css':'text/css; charset=utf-8' };
const server = createServer((req, res) => { try {
  const path = new URL(req.url, 'http://localhost').pathname;
  if(path==='/harness'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><html lang="fr"><head><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head><body><main id="mount"></main></body></html>');return;}
  const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(resolve(root)+sep)||!statSync(file).isFile())throw Error('missing');
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(readFileSync(file));
}catch{res.writeHead(404).end();} });
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await launchBrowser();
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});page.setDefaultTimeout(8000);
  await page.goto(`http://127.0.0.1:${server.address().port}/harness`);
  await page.evaluate(async()=>{
    const {createStore}=await import('/js/core/store.js'),{initWorkspaceView}=await import('/js/ui/workspace-view.js'),{getSpellContract}=await import('/js/core/v5-spell-contracts.js');
    const store=createStore({storage:null});await store.ready;
    const person=(id,camp,extra={})=>({id,name:id==='mage'?'Mage':'Orc',kind:camp==='pj'?'PJ':'PNJ',camp,zone:'active',initiative:id==='mage'?60:30,hp:20,maxHp:20,
      caracs:{CC:40,CT:40,F:40,E:40,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:40,M:4},skills:[],actions:[],talents:[],equipment:[],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},...extra});
    const contract=getSpellContract('Destruction des Arcanes');
    const mage=person('mage','pj',{talents:[{id:'talent-strong-minded',status:'resolved',rank:1}],skills:[{name:'Focalisation',status:'resolved',total:70},{name:'Langue (Magick)',status:'resolved',total:80}],spells:[{id:contract.id,name:contract.name}],extensions:{v5:{magic:{lore:'high'},channelling:{sl:30,type:'high'}}}});
    await store.loadFromJSON({schemaVersion:3,reserve:[],diceLines:[],log:[],extensions:{v5:{}},combat:{round:1,currentActorId:'mage',order:['mage','foe'],participants:[mage,person('foe','ennemi')]}});
    await store.startTalentSession();window.__store=store;
    const view=initWorkspaceView({Store:store,mount:document.querySelector('#mount'),showNavigation:false,actions:{renderRules(){},renderLog(){},applyResolution:preview=>store.applyResolution(preview)}});window.__view=view;view.setSpace('play');
  });
  await clickU1Magic(page,'cast');
  await page.selectOption('[data-focus-key="magic-spell"]',await page.evaluate(async()=>(await import('/js/core/v5-spell-contracts.js')).getSpellContract('Destruction des Arcanes').id));
  await page.selectOption('[data-focus-key="magic-arcane-item-present-foe"]','present');
  await page.selectOption('[data-focus-key="arcane-focalisation-obstinate-foe"]','strong-minded');
  await page.fill('[data-focus-key="magic-arcane-focalisationRoll-foe"]','25');
  await page.fill('[data-focus-key="magic-arcane-randomMagicItem-foe"]','Anneau');
  await page.fill('[data-roll-input="attack"]','25');
  await page.click('[data-focus-key="calculate"]');
  const preview=page.locator('.workspace-magic-result');await preview.waitFor();
  assert.match(await preview.innerText(),/Focalisation/);
  await page.click('[data-focus-key="apply"]');
  await page.waitForFunction(()=>window.__store.getObstinateStatus('mage').available===false);
  await page.evaluate(()=>window.__store.undo());
  assert.equal(await page.evaluate(()=>window.__store.getObstinateStatus('mage').available),true);
  console.log('Arcanes : choix de Focalisation, application au mage et undo OK');
}finally{await browser.close();await new Promise(done=>server.close(done));}
