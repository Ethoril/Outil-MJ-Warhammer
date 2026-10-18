/** Independent component gestures with a controlled Store, separate from the real-app integration recipe. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = join(ROOT, 'tmp/divin/campaign-ui-independent');
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head><body><button id="open">Ouvrir temps</button><script type="module">
import {openCampaignTimeDialog} from '/js/ui/v5-campaign-time-dialog.js';
const probe={revision:5,calls:[],mode:'blocked',closed:0};
const Store={getLocalRevision:()=>probe.revision,getFullJSON:()=>JSON.stringify({extensions:{v5:{gameClock:{revision:0,campaignSeconds:0}}}}),
 advanceCampaignTime:async(...args)=>{probe.calls.push(args);if(probe.mode==='pending')return new Promise(resolve=>probe.finish=resolve);if(probe.mode==='false')return false;return {ok:false,status:'requires-input',needsInput:[{path:'persistentCharacters[0].extensions.v5.spellEffects[0]',message:'Durée calendaire sans ancre : personnage durable.'}]};}};
document.querySelector('#open').onclick=()=>openCampaignTimeDialog({Store}).then(()=>probe.closed++);window.__probe=probe;
</script></body></html>`;
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/__independent__'){res.writeHead(200,{'Content-Type':'text/html'}).end(html);return;}const path=resolve(ROOT,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(ROOT))throw Error('outside root');const info=await stat(path);if(!info.isFile())throw Error('not file');res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'}).end(await readFile(path));}catch{res.writeHead(404).end('absent');}});
await mkdir(OUT,{recursive:true});await new Promise(done=>server.listen(0,'127.0.0.1',done));
const checks=[],failures=[];let browser;
try{
 browser=await chromium.launch({headless:true,...(existsSync(edge)?{executablePath:edge}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();page.setDefaultTimeout(5000);
 const fresh=async()=>{await page.goto(`http://127.0.0.1:${server.address().port}/__independent__`,{waitUntil:'networkidle'});await page.getByRole('button',{name:'Ouvrir temps'}).click();};
 const fill=async()=>{await page.getByRole('spinbutton',{name:'Durée écoulée'}).fill('1');await page.getByRole('textbox',{name:'Motif MJ'}).fill('Contrôle indépendant');};
 const record=async(name,fn)=>{try{await fn();checks.push(name);}catch(error){failures.push({name,error:error.message});}};
 await record('motif manquant conserve une explication précise',async()=>{await fresh();await page.getByRole('spinbutton',{name:'Durée écoulée'}).fill('1');await page.getByRole('button',{name:'Avancer le temps'}).click();assert.match(await page.getByRole('alert').innerText(),/Précisez le motif/i);assert.equal(await page.evaluate(()=>__probe.calls.length),0);});
 await record('stale local indique fermer et rouvrir sans soumission',async()=>{await fresh();await fill();await page.evaluate(()=>__probe.revision++);await page.getByRole('button',{name:'Avancer le temps'}).click();assert.match(await page.getByRole('alert').innerText(),/Fermez.*rouvrez/is);assert.equal(await page.evaluate(()=>__probe.calls.length),0);});
 await record('needs-input conserve chemin ou message localisé',async()=>{await fresh();await fill();await page.getByRole('button',{name:'Avancer le temps'}).click();assert.match(await page.getByRole('alert').innerText(),/personnage durable|persistentCharacters/);assert.equal(await page.evaluate(()=>__probe.calls.length),1);assert.equal(await page.getByRole('dialog').count(),1);await page.screenshot({path:join(OUT,'blocked-mobile.png')});});
 await record('save=false conserve formulaire et saisie',async()=>{await fresh();await fill();await page.evaluate(()=>__probe.mode='false');await page.getByRole('button',{name:'Avancer le temps'}).click();assert.equal(await page.getByRole('dialog').count(),1);assert.equal(await page.getByRole('textbox',{name:'Motif MJ'}).inputValue(),'Contrôle indépendant');assert.equal(await page.evaluate(()=>__probe.closed),0);});
 await record('Escape et Cancel sans soumission et focus retourné',async()=>{await fresh();await fill();await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.evaluate(()=>document.activeElement.id),'open');assert.equal(await page.evaluate(()=>__probe.calls.length),0);await page.getByRole('button',{name:'Ouvrir temps'}).click();await fill();await page.getByRole('button',{name:'Annuler',exact:true}).click();await page.locator('dialog').waitFor({state:'detached'});assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.evaluate(()=>__probe.calls.length),0);});
 await record('double submit et Escape pendant sauvegarde ne doublent pas commande',async()=>{await fresh();await fill();await page.evaluate(()=>__probe.mode='pending');await page.getByRole('button',{name:'Avancer le temps'}).click();await page.locator('form').evaluate(form=>form.requestSubmit());await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>__probe.calls.length),1);assert.equal(await page.getByRole('dialog').count(),1);assert.equal(await page.getByRole('button',{name:'Avancer le temps'}).isDisabled(),true);await page.evaluate(()=>__probe.finish({ok:true,status:'applied'}));await page.waitForFunction(()=>document.querySelector('dialog')===null);});
 const receipt={ok:failures.length===0,kind:'independent-component-gestures-controlled-store',checks,failures};
 await writeFile(join(OUT,'receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
 assert.deepEqual(failures,[]);
 await context.close();
}finally{await browser?.close();await new Promise(done=>server.close(done));}
