import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import L18 from '../js/data/bestiary/L18.json' with { type: 'json' };
import L22 from '../js/data/bestiary/L22.json' with { type: 'json' };
import L25 from '../js/data/bestiary/L25.json' with { type: 'json' };
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';

// Parcours navigateur F2-H : section « Règles propres au profil », saisies de la décharge, confirmation du crâne, Lasso sans erreur UI.
const root=fileURLToPath(new URL('../',import.meta.url)),base='/Outil-MJ-Warhammer/';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);assert.ok(pathname.startsWith(base));const path=resolve(root,pathname.slice(base.length)||'index.html');assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined)});
const build=(library,id,newId,name,camp)=>{let i=0;const row=buildParticipantFromBestiary(id,{library:library.profiles,idFactory:()=>`${newId}-${++i}`});return {...row,id:newId,name,camp,zone:'active'};};
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}${base}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});
  const garg=build(L25,'E0-P-910','h-garg','Gargantuan H','ennemi');garg.extensions.v5.hasMomentum=true;
  const skull=build(L18,'E0-P-565','h-skull','Crâne H','ennemi');
  const spider=build(L22,'E0-P-744','h-spider','Araignée H','ennemi');
  const hero={id:'h-hero',name:'Héros H',kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,caracs:{CC:60,CT:60,F:40,E:40,FM:40,Ag:40,Int:40,I:40},skills:[],talents:[],states:[],armor:{head:0,body:0,arms:0,legs:0},equipment:[],
    actions:[{id:'h-sword',name:'Épée H',type:'attack',attr:'CC',base:60,damage:4,qualities:[],extensions:{}}],extensions:{v5:{}}};
  const state={schemaVersion:3,reserve:[],diceLines:[],log:[],combat:{round:1,currentActorId:garg.id,orderMode:'manual',order:[garg.id,hero.id,skull.id,spider.id],participants:[garg,hero,skull,spider]},extensions:{v5:{combatId:'h-review',turnIndex:1}}};
  await page.evaluate(async s=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;await Store.loadFromJSON(JSON.stringify(s));},state);
  await page.locator('#tab-combat').click();
  const workspace=page.locator('#workspace-root');

  // Gargantuan : décharge, puis cible ; la section du profil et ses saisies apparaissent.
  await page.locator('[data-workspace-select="h-garg"]').click();
  await workspace.getByRole('button',{name:/Décharge électrique/}).first().click();
  await workspace.getByRole('button',{name:'Héros H'}).first().click();
  await page.waitForFunction(()=>[...document.querySelectorAll('#workspace-root summary')].some(row=>row.textContent.includes('Règles propres au profil')));
  await workspace.locator('summary',{hasText:'Règles propres au profil'}).click();
  await workspace.getByLabel('Gargantuan : cible agrippée au début de son Tour').check();
  await page.waitForFunction(()=>document.querySelector('#workspace-root')?.textContent.includes('Cible : Test d’Endurance Difficile (−1 DR)'));
  assert.equal(await workspace.getByText('Le choc a-t-il infligé des Blessures ?').count(),0,'la question morte a disparu');

  // Héros contre le crâne : case de confirmation du MJ.
  await page.locator('[data-workspace-select="h-hero"]').click();
  await workspace.getByRole('button',{name:/Épée H/}).first().click();
  await workspace.getByRole('button',{name:'Crâne H'}).first().click();
  await page.waitForFunction(()=>[...document.querySelectorAll('#workspace-root summary')].some(row=>row.textContent.includes('Règles propres au profil')));
  await workspace.locator('summary',{hasText:'Règles propres au profil'}).click();
  assert.equal(await workspace.getByLabel('MJ : à 0 Blessure, le crâne redevient un crâne ordinaire').count(),1);

  // Araignée : le Lasso s'ouvre sans erreur et rappelle la soie coupée.
  await page.locator('[data-workspace-select="h-spider"]').click();
  await workspace.getByRole('button',{name:/Lasso de soie/}).first().click();
  await workspace.getByRole('button',{name:'Héros H'}).first().click();
  await page.waitForFunction(()=>document.querySelector('#workspace-root')?.textContent.includes('Soie coupée'));
  assert.deepEqual(errors,[],`aucune erreur UI attendue : ${errors.join('; ')}`);
  console.log('f2-h-review-browser : parcours vert');
}finally{await browser.close();await new Promise(done=>server.close(done));}
