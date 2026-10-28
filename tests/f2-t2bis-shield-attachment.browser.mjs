import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url));
const mime={'.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const pathName=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathName==='/blank'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<main></main>');return;}const file=resolve(root,`.${pathName}`);if(!file.startsWith(resolve(root)+sep)||!statSync(file).isFile())throw new Error('missing');res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(readFileSync(file));}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'});
try{
  const page=await browser.newPage(),origin=`http://127.0.0.1:${server.address().port}`;
  await page.goto(`${origin}/blank`);
  await page.evaluate(async origin=>{window.renderResolutionPanel=(await import(`${origin}/js/ui/resolution-panel.js`)).renderResolutionPanel;window.calls=[];window.handlers=new Proxy({}, {get:()=> (...args)=>window.calls.push(args)});},origin);
  const actor={id:'hero',name:'Hero',kind:'PJ',camp:'allies',hp:20,maxHp:20,caracs:{CC:60,Ag:40,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const target={id:'foe',name:'Foe',kind:'PNJ',camp:'foes',hp:20,maxHp:20,caracs:{CC:30,E:30},skills:[],states:[],equipment:[{id:'shield',kind:'shield',name:'Bouclier',ap:2,keywords:[{id:'bouclier'}]}],extensions:{v5:{}}};
  const action={id:'attack',type:'attack',note:'Attaque test',attr:'CC',base:60,damage:4,qualities:[]};
  await page.evaluate(({actor,target,action})=>{
    const panel=window.renderResolutionPanel({draft:{protectionContext:{shieldId:'shield'}},actor,participants:[actor,target],actions:[action],actionKey:action.id,type:'attack',target,
      groups:{adversaries:[target],allies:[]},defense:{options:[],value:'Ag',option:{value:'Ag',statLabel:'Ag',mod:0,v5:{kind:'test',slModifier:0}}},canCalculate:false,canApply:false,handlers:window.handlers});document.body.replaceChildren(panel);
  },{actor,target,action});
  await page.getByText('Protection et bouclier pour cette attaque').click();
  const attached=page.getByRole('checkbox',{name:'Bouclier attaché au bras ou en bandoulière'});
  assert.equal(await attached.count(),1,'the attack panel exposes the shield attachment fact');
  await attached.check();
  const attachedContext=await page.evaluate(()=>window.calls.at(-1)[0].protectionContext);
  await page.evaluate(({actor,target,action,protectionContext})=>{
    const panel=window.renderResolutionPanel({draft:{protectionContext},actor,participants:[actor,target],actions:[action],actionKey:action.id,type:'attack',target,
      groups:{adversaries:[target],allies:[]},defense:{options:[],value:'Ag',option:{value:'Ag',statLabel:'Ag',mod:0,v5:{kind:'test',slModifier:0}}},canCalculate:false,canApply:false,handlers:window.handlers});document.body.replaceChildren(panel);
  },{actor,target,action,protectionContext:attachedContext});
  await page.getByText('Protection et bouclier pour cette attaque').click();
  assert.equal(await page.getByRole('combobox',{name:'Bras non directeur'}).count(),1,'attaching the shield requests the non-dominant arm');
  await page.getByRole('combobox',{name:'Bras non directeur'}).selectOption('right');
  const last=await page.evaluate(()=>window.calls.at(-1)[0]);
  assert.equal(last.protectionContext.nonDominantArmSide,'right','the explicit side is passed in protectionContext');
  console.log('T2 bis attached-shield UI: attachment toggle and non-dominant arm choice propagated.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
