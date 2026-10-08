import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.js':'text/javascript','.json':'application/json','.css':'text/css'};
const server=createServer(async(req,res)=>{try{if(req.url==='/qa-reference'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><meta charset="utf-8"><title>Recette références</title><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"><div id="panel-rules"></div>');return;}const path=resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!path.startsWith(resolve(root)+sep)||!(await stat(path)).isFile())throw new Error('404');res.writeHead(200,{'Content-Type':types[extname(path)]||'text/plain'});res.end(await readFile(path));}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined)});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://docs.google.com/**',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.goto(url+'/qa-reference');
 await page.evaluate(async()=>{const module=await import('/js/ui/rules-view.js');module.renderReferenceTables();});
 await page.locator('.rules-search').fill('Hardy');await page.waitForFunction(()=>document.querySelector('.rules-list').textContent.includes('Dur à cuire'));
 assert.match(await page.locator('.rules-list').innerText(),/Dur à cuire/);
 await page.locator('.rules-search').fill('Impact');assert.match(await page.locator('.rules-list').innerText(),/Percutante/);
 await page.locator('.rules-search').fill('Purification');assert.match(await page.locator('.rules-list').innerText(),/consultation uniquement/);
 await page.locator('.rules-search').fill('');assert.match(await page.locator('.rules-list').textContent(),/source complémentaire et édition à confirmer/);
 await page.locator('.btn-reload-keywords').click();await page.waitForFunction(()=>document.querySelector('[role="alert"]')?.textContent.includes('Actualisation échouée'));
 assert.match(await page.locator('.rules-list').innerText(),/dernier ensemble valide/);assert.equal(await page.locator('.toast-success').count(),0);assert.equal(await page.locator('.btn-reload-keywords').isEnabled(),true);
 await page.locator('.rules-search').fill('Hardy');assert.match(await page.locator('.rules-list').innerText(),/Dur à cuire/);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.dataset.theme='dark');
 await page.screenshot({path:resolve(root,'tmp/fiches-pj-receipt/reference-browser-preview.png'),fullPage:true});assert.deepEqual(errors,[]);
 console.log('Aides navigateur : alias/talents/magie/source locale/échec honnête/hors ligne/recherche/mobile sans erreur OK');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
