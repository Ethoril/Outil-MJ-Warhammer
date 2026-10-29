import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url)),mime={'.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const pathName=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathName==='/blank'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<main></main>');return;}const file=resolve(root,`.${pathName}`);if(!file.startsWith(resolve(root)+sep)||!statSync(file).isFile())throw new Error('missing');res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(readFileSync(file));}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'});
try{
  const page=await browser.newPage(),origin=`http://127.0.0.1:${server.address().port}`;
  await page.goto(`${origin}/blank`);
  await page.evaluate(async origin=>{window.renderResolutionPanel=(await import(`${origin}/js/ui/resolution-panel.js`)).renderResolutionPanel;window.calls=[];window.handlers=new Proxy({}, {get:()=> (...args)=>window.calls.push(args)});},origin);
  const actor={id:'archer',name:'Archer',kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,caracs:{CT:60,F:30,E:30,Ag:40},skills:[],states:[],extensions:{v5:{}},
    equipment:[
      {id:'bow',kind:'weapon',name:'Arc de test',category:'Arc',damage:'+4',range:'50',keywords:[{id:'empaleuse'}]},
      {id:'arrows',kind:'ammunition',name:'Flèches (12)',category:'Arc'},
    ]};
  const target={id:'target',name:'Cible',kind:'PNJ',camp:'foe',zone:'active',hp:20,maxHp:20,caracs:{E:30,Ag:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const action={id:'ranged-attack',type:'attack',note:'Arc de test',attr:'CT',base:60,damage:4,
    qualities:[{id:'empaleuse'}],extensions:{fiche:{equipmentId:'bow'},equipment:actor.equipment[0]}};
  await page.evaluate(({actor,target,action})=>{const panel=window.renderResolutionPanel({draft:{},actor,target,participants:[actor,target],actions:[action],actionKey:action.id,type:'attack',
    groups:{adversaries:[target],allies:[]},defense:{options:[],value:'Ag',option:{value:'Ag',statLabel:'Ag',mod:0,v5:{kind:'test',slModifier:0}}},canCalculate:false,canApply:false,handlers:window.handlers});document.body.replaceChildren(panel);},{actor,target,action});
  const ammo=page.getByRole('combobox',{name:'Munition'});
  assert.equal(await ammo.count(),1,'la munition reste un choix facultatif si le stock est représenté dans l’inventaire');
  assert.equal(await ammo.inputValue(),'','aucune munition n’est présélectionnée');
  assert.equal(await ammo.locator('option').first().textContent(),'Aucune munition ajoutée');
  assert.equal(await page.evaluate(()=>window.calls.length),0,'le panneau n’impose ni ne choisit de munition');
  assert.equal(await page.getByText('Protection et bouclier pour cette attaque').count(),1,'le flux de résolution du tir demeure disponible');
  console.log('PASS : UI du tir Empaleuse, munition non sélectionnée et choix facultatif vérifiés.');
}finally{await browser.close();server.close();}
