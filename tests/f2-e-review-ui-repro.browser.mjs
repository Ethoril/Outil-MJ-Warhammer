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
  await page.evaluate(async origin=>{window.renderResolutionPanel=(await import(`${origin}/js/ui/resolution-panel.js`)).renderResolutionPanel;window.calls=[];window.handlers=new Proxy({}, {get:()=> (...args)=>window.calls.push(args)});},origin);
  const findings=await page.evaluate(()=>{
    const failures=[];
    const actor={id:'shooter',name:'Tireur',camp:'PJ',zone:'active',hp:12,caracs:{E:30},equipment:[{id:'mortar',name:'Mortier à main',kind:'weapon',extensions:{v5:{}}}],skills:[],states:[]};
    const mortarAction={id:'mortar-action',name:'Mortier à main',note:'Mortier à main',type:'skill',base:40,extensions:{fiche:{equipmentId:'mortar'}}};
    let panel=window.renderResolutionPanel({draft:{actorId:'shooter',actionKey:'mortar-action',type:'skill',round:4,v5Clock:{turnIndex:11},v5Context:{bombPayload:true}},actor,participants:[actor],actions:[mortarAction],actionKey:'mortar-action',type:'skill',target:null,groups:{allies:[],adversaries:[]},defense:{options:[],option:{value:'Ag',statLabel:'Ag',v5:{kind:'test',slModifier:0}}},canCalculate:false,canApply:false,handlers:window.handlers});
    document.body.replaceChildren(panel);
    const fuse=panel.querySelector('[aria-label="Délai de la mèche en Tours du porteur"]');
    if(!fuse)failures.push('délai de bombe UI absent');
    else{fuse.value='2';fuse.dispatchEvent(new Event('input',{bubbles:true}));const payload=window.calls.at(-1)?.[0]?.v5Context||{};if(payload.currentRound!==4||payload.currentTurnIndex!==11)failures.push(`pose bombe ne transmet pas Round/Tour de l’horloge: ${JSON.stringify(payload)}`);}
    if(!panel.textContent.includes('Délai de la mèche en Tours du porteur'))failures.push('libellé utilise Rounds au lieu de Tours du porteur');

    const ally={id:'ally',name:'Allié',camp:'PJ',zone:'active',hp:12,caracs:{E:30},equipment:[],skills:[],states:[]};
    const action={id:'fumble-action',name:'Frappe',type:'attack',base:40,damage:3};
    panel=window.renderResolutionPanel({draft:{actorId:'shooter',actionKey:'fumble-action',type:'attack',attackRoll:66,preview:{fumble:true,input:{actor},success:false,actionType:'Test',ruleVersion:'V5'},v5Context:{fumbleRoll:10,allyCandidates:['ally']}},actor,participants:[actor,ally],actions:[action],actionKey:'fumble-action',type:'attack',target:ally,groups:{allies:[ally],adversaries:[]},defense:{options:[],option:{value:'Ag',statLabel:'Ag',v5:{kind:'test',slModifier:0}}},canCalculate:false,canApply:false,handlers:window.handlers});
    document.body.replaceChildren(panel);
    const units=panel.querySelector('[aria-label="Dé des unités du jet pour les DR (0–9)"]');
    if(!units||units.min!=='0'||units.max!=='9')failures.push(`Oops 10 units input should be 0–9, got ${units?`${units.min}–${units.max}`:'missing'}`);

    const volley={id:'volley',name:'Arquebuse à salve',kind:'weapon',keywords:[{id:'salve',parameter:'7'}],extensions:{v5:{}}},gunner={...actor,equipment:[volley]};
    const volleyAction={id:'volley-action',name:'Arquebuse à salve',note:'Arquebuse à salve',type:'attack',base:40,damage:4,extensions:{fiche:{equipmentId:'volley'}}};
    panel=window.renderResolutionPanel({draft:{actorId:'shooter',actionKey:'volley-action',type:'attack',v5Context:{}},actor:gunner,participants:[gunner,ally],actions:[volleyAction],actionKey:'volley-action',type:'attack',target:ally,groups:{allies:[],adversaries:[ally]},previousWeaponAttacks:[{weaponId:'volley',actionType:'attack',turnId:'current'},{weaponId:'volley',actionType:'attack',turnId:'current'},{weaponId:'other',actionType:'attack',turnId:'current'}],defense:{options:[],option:{value:'Ag',statLabel:'Ag',v5:{kind:'test',slModifier:0}}},canCalculate:false,canApply:false,handlers:window.handlers});
    document.body.replaceChildren(panel);
    if(!panel.textContent.includes('Salve : −2 DR'))failures.push('UI does not show the same-Tour cumulative Salve penalty in DR');
    const crew=panel.querySelector('[aria-label="Nombre de servants"]');
    if(!crew||crew.tagName!=='INPUT'||crew.type!=='number'||crew.min!=='1')failures.push('effectif UI devrait accepter tout nombre positif de servants sans plafond inventé');
    else{crew.value='3';crew.dispatchEvent(new Event('input',{bubbles:true}));const payload=window.calls.at(-1)?.[0]?.v5Context||{};if(payload.crewCount!==3)failures.push(`UI ne transmet pas 3 servants: ${JSON.stringify(payload)}`);}
    return failures;
  });
  assert.deepEqual(findings,[],'E UI review reproductions');
  console.log('F2-E UI review: fuse reads owner-turn clock, names Turns, and Oops 10 units die is 0–9.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
