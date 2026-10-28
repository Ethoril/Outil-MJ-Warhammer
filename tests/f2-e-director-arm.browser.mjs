import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url));
const mime={'.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/blank'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<main></main>');return;}const file=resolve(root,`.${pathname==='/'?'/index.html':pathname}`);if(!file.startsWith(resolve(root)+sep)||!statSync(file).isFile())throw new Error('not found');res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(readFileSync(file));}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'});
try{
  const page=await browser.newPage(),origin=`http://127.0.0.1:${server.address().port}`;
  await page.goto(`${origin}/blank`);
  const result=await page.evaluate(async origin=>{
    const {renderResolutionPanel} = await import(`${origin}/js/ui/resolution-panel.js`);
    const {previewResolution} = await import(`${origin}/js/core/resolution.js`);
    const actor={id:'shooter',name:'Tireur',camp:'PJ',zone:'active',hp:20,caracs:{CT:40,E:30},equipment:[{id:'gun',name:'Pistolet à poudre noire',kind:'weapon',category:'Poudre Noire',damageMaximum:10,keywords:[{id:'a-poudre-noire'}]}],skills:[],states:[]};
    const target={id:'target',name:'Cible',camp:'ennemi',zone:'active',hp:12,caracs:{E:30},equipment:[],skills:[],states:[]};
    const action={id:'shot',name:'Pistolet à poudre noire',type:'attack',attr:'CT',base:40,damage:4,qualities:['a-poudre-noire'],extensions:{fiche:{equipmentId:'gun'}}};
    const calls=[];const handlers=new Proxy({}, {get:()=> (...args)=>calls.push(args)});
    const panel=renderResolutionPanel({draft:{actorId:actor.id,actionKey:action.id,type:'attack',attackRoll:99,round:1,
      preview:{fumble:true,combatFailure:{misfire:{outcome:{id:'catastrophe'}}},input:{actor},success:false,actionType:'attack',ruleVersion:'V5'},
      v5Context:{powderIncidentRoll:9,weaponDamageMaximum:10}},actor,participants:[actor,target],actions:[action],actionKey:action.id,type:'attack',target,
      groups:{allies:[actor],adversaries:[target]},defense:{options:[],option:{value:'Ag',statLabel:'Ag',v5:{kind:'test',slModifier:0}}},canCalculate:false,canApply:false,handlers});
    document.body.replaceChildren(panel);
    const side=panel.querySelector('[aria-label="Bras directeur touché : choix du MJ"]');
    if(!side)return {error:'select bras directeur absent'};
    side.value='right';side.dispatchEvent(new Event('change',{bubbles:true}));
    const payload=calls.at(-1)?.[0]?.v5Context;
    const participants=[actor,target];
    const preview=previewResolution({actor,target,action,roll:99,round:1,baseRevision:0,v5State:{participants},attackContext:{ranged:true},
      v5:{kind:'ranged',context:{...payload,weaponDamageMaximum:10,powderIncidentRoll:9}}});
    return {selected:side.value,payloadSide:payload?.weaponExplosionArmSide,effect:preview.combatFailure.effects.find(row=>row.type==='weapon-explosion')?.armSide,unresolved:preview.unresolved};
  },origin);
  assert.equal(result.error,undefined,result.error);
  assert.equal(result.selected,'right');
  assert.equal(result.payloadSide,'right');
  assert.equal(result.effect,'right','le côté choisi dans l’interface arrive jusqu’à l’effet de résolution');
  assert.equal(result.unresolved.length,0,result.unresolved.join('; '));
  console.log('F2-E UI bras directeur: sélection droite transmise à l’effet d’explosion.');
}finally{await browser.close();await new Promise(done=>server.close(done));}