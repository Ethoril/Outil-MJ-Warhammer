import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const server=createStaticServer({ root, pages: { '/qa-reference': '<!doctype html><meta charset="utf-8"><title>Recette références</title><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"><div id="panel-rules"></div>' } });
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
const browser=await launchBrowser();
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://docs.google.com/**',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.goto(url+'/qa-reference');
 await page.evaluate(async()=>{const module=await import('/js/ui/rules-view.js');module.renderReferenceTables();});
 for (const [id, label] of [['v5-jets','Jets'],['v5-elan','Élan'],['v5-critiques','critiques'],['v5-etats','États']]) {
   await page.locator(`[data-rule-target="${id}"]`).click();
   const rule = page.locator(`[data-rule-id="${id}"]`);
   assert.equal(await rule.getAttribute('open'), '');
   assert.match((await rule.locator('summary').first().innerText()).toLocaleLowerCase(), new RegExp(label.toLocaleLowerCase()));
 }
 await page.locator('.rules-search').fill('Hardy');await page.waitForFunction(()=>document.querySelector('.rules-list').textContent.includes('Dur à cuire'));
 assert.match(await page.locator('.rules-list').innerText(),/Dur à cuire/);
 await page.locator('.rules-search').fill('Impact');assert.match(await page.locator('.rules-list').innerText(),/Percutante/);
 await page.locator('.rules-search').fill('Purification');assert.match(await page.locator('.rules-list').innerText(),/consultation uniquement/);
 await page.locator('.rules-search').fill('');assert.match(await page.locator('.rules-list').textContent(),/Source d’une autre édition ou d’un supplément : adaptation V5 à vérifier/);
 await page.locator('.btn-reload-keywords').click();await page.waitForFunction(()=>document.querySelector('[role="alert"]')?.textContent.includes('Actualisation échouée'));
 assert.match(await page.locator('.rules-list').innerText(),/dernier ensemble valide/);assert.equal(await page.locator('.toast-success').count(),0);assert.equal(await page.locator('.btn-reload-keywords').isEnabled(),true);
 await page.locator('.rules-search').fill('Hardy');assert.match(await page.locator('.rules-list').innerText(),/Dur à cuire/);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.dataset.theme='dark');
 await page.screenshot({path:resolve(root,'tmp/fiches-pj-receipt/reference-browser-preview.png'),fullPage:true});assert.deepEqual(errors,[]);
 console.log('Aides navigateur : alias/talents/magie/source locale/échec honnête/hors ligne/recherche/mobile sans erreur OK');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
