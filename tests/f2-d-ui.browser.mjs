import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url));
const mime={'.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const pathName=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathName==='/blank'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<main></main>');return;}const file=resolve(root,`.${pathName}`);if(!file.startsWith(resolve(root)+sep)||!statSync(file).isFile())throw new Error('missing');res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(readFileSync(file));}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'});
try{
  const page=await browser.newPage(),origin=`http://127.0.0.1:${server.address().port}`;
  await page.goto(`${origin}/blank`);
  await page.evaluate(async origin=>{window.renderResolutionPanel=(await import(`${origin}/js/ui/resolution-panel.js`)).renderResolutionPanel;window.calls=[];window.handlers=new Proxy({}, {get:()=> (...args)=>window.calls.push(args)});},origin);
  const render=async({actor,target,action,type='attack',draft={}})=>page.evaluate(({actor,target,action,type,draft})=>{
    const panel=window.renderResolutionPanel({draft,actor,participants:[actor,target].filter(Boolean),actions:[action],actionKey:action.id,type,target,
      groups:{adversaries:target?[target]:[],allies:[]},defense:{options:[],value:'Ag',option:{value:'Ag',statLabel:'Ag',mod:0,v5:{kind:'test',slModifier:0}}},
      canCalculate:false,canApply:false,handlers:window.handlers});document.body.replaceChildren(panel);
  },{actor,target,action,type,draft});
  const actor={id:'hero',name:'Hero',kind:'PJ',camp:'allies',hp:20,maxHp:20,caracs:{CC:60,F:40,E:30,Ag:40},skills:[],states:[],
    equipment:[{id:'shield',kind:'shield',name:'Bouclier',ap:2,encumbrance:1,keywords:[{id:'bouclier'}]}],extensions:{v5:{}}};
  const target={id:'foe',name:'Foe',kind:'PNJ',camp:'foes',hp:20,maxHp:20,caracs:{CC:30,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  const attack={id:'attack',type:'attack',note:'Attaque test',attr:'CC',base:60,damage:99,qualities:[]};
  await render({actor,target,action:attack,draft:{v5Context:{actorShieldId:'shield'}}});
  const shieldAttack=page.getByRole('checkbox',{name:'Frapper avec ce bouclier (arme improvisée, allonge Personnelle)'});
  assert.equal(await shieldAttack.count(),1,'l’option d’attaque au bouclier apparaît après sélection du bouclier porté');
  await shieldAttack.check();
  assert.equal(await page.evaluate(()=>window.calls.at(-1)[0].v5Context.attackWithShield),true,'le choix est transmis au contexte de résolution');

  const trapped={...actor,states:[{id:'net-condition',key:'empetre',name:'Empêtré',level:1,strength:50,source:{hookedNet:true}}]};
  const escape={id:'escape',type:'test',note:'Sortie d’entrave',attr:'F',base:40};
  await render({actor:trapped,target:null,action:escape,type:'test',draft:{v5Context:{netEscapeConditionId:'net-condition'}}});
  await page.getByText('Circonstances des Tests').click();
  const damage=page.locator('input[aria-label="Filet à crochets : dégâts MJ (armure ignorée)"]');
  assert.equal(await damage.count(),1,'le montant MJ n’est demandé que si l’état vient d’un filet à crochets');
  await damage.fill('4');await damage.dispatchEvent('change');
  assert.equal(await page.evaluate(()=>window.calls.at(-1)[0].v5Context.hookedNetDamage),4,'le montant choisi rejoint le contexte de l’évasion');
  console.log('F2-D UI browser: sélection attaque bouclier et saisie de dégâts d’évasion du filet à crochets vérifiées.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
