import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url));
const mime={'.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const pathName=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathName==='/blank'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<main></main>');return;}const file=resolve(root,'.'+pathName);if(!file.startsWith(resolve(root)+sep)||!statSync(file).isFile())throw new Error('missing');res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(readFileSync(file));}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'});
try{
  const page=await browser.newPage(),origin='http://127.0.0.1:'+server.address().port;
  await page.goto(origin+'/blank');
  await page.evaluate(async origin=>{window.renderResolutionPanel=(await import(origin+'/js/ui/resolution-panel.js')).renderResolutionPanel;window.calls=[];window.handlers=new Proxy({}, {get:()=> (...args)=>window.calls.push(args)});},origin);
  const actor={id:'attacker',name:'Attaquant',kind:'PJ',camp:'allies',hp:20,maxHp:20,caracs:{CC:60,F:40,E:30,Ag:40},skills:[],talents:[],equipment:[],states:[],extensions:{v5:{}}};
  const target={id:'target',name:'Cible',kind:'PNJ',camp:'foes',hp:20,maxHp:20,caracs:{CC:30,E:30},skills:[],talents:[],equipment:[],states:[],extensions:{v5:{}}};
  await page.evaluate(({actor,target})=>{const panel=window.renderResolutionPanel({draft:{},actor,participants:[actor,target],actions:[{id:'weapon',type:'attack',attr:'CC',base:60,damage:5,qualities:['assommante']}],actionKey:'weapon',type:'attack',target,
    groups:{adversaries:[target],allies:[]},defense:{options:[],value:'Ag',option:{value:'Ag',statLabel:'Ag',mod:0,v5:{kind:'test',slModifier:0}}},canCalculate:false,canApply:false,handlers:window.handlers});document.body.replaceChildren(panel);},{actor,target});
  const declaration=page.getByRole('checkbox',{name:/Assommer — déclarer avant le jet/});
  assert.equal(await declaration.count(),1,'le choix est offert comme déclaration explicite avant le jet');
  await declaration.check();
  assert.equal(await page.evaluate(()=>window.calls.at(-1)[0].v5Context.knockout),true,'la déclaration rejoint le contexte de résolution');
  await page.evaluate(({actor,target})=>{const panel=window.renderResolutionPanel({draft:{v5Context:{knockout:true}},actor,participants:[actor,target],actions:[{id:'weapon',type:'attack',attr:'CC',base:60,damage:5,qualities:['assommante']}],actionKey:'weapon',type:'attack',target,groups:{adversaries:[target],allies:[]},defense:{options:[],value:'Ag',option:{value:'Ag',statLabel:'Ag',mod:0,v5:{kind:'test',slModifier:0}}},canCalculate:false,canApply:false,handlers:window.handlers});document.body.replaceChildren(panel);},{actor,target});
  assert.ok((await page.locator('body').innerText()).includes('Blessures Critiques sont ignorées'),'le panneau rappelle que les critiques sont ignorées');
  assert.ok((await page.locator('body').innerText()).includes('Damaging, Hack, Impale et Penetrating'),'le panneau rappelle les qualités retirées');
  console.log('T2 bis UI browser: déclaration Assommer explicite et rappel des effets du coup retenu vérifiés.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
