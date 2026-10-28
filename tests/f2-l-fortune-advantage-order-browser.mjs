import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url)),mime={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=createServer((req,res)=>{try{const file=join(root,normalize(decodeURIComponent((req.url||'/').split('?')[0])));if(!file.startsWith(root)||!statSync(file).isFile())throw new Error('not found');res.writeHead(200,{'Content-Type':mime[extname(file)]||'text/plain; charset=utf-8'});res.end(readFileSync(file));}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const failures=[],check=(ok,label)=>{console.log(`${ok?'PASS':'FAIL'} — ${label}`);if(!ok)failures.push(label);};
const executable=[process.env.PLAYWRIGHT_EXECUTABLE_PATH,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean).find(path=>{try{return statSync(path).isFile();}catch{return false;}});
let browser;
try{
  browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{})});
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.setContent('<main><div id="mount"></div></main>');
  await page.evaluate(async()=>{
    const {createStore}=await import('/js/core/store.js'),{initWorkspaceView}=await import('/js/ui/workspace-view.js');
    const store=createStore({storage:null});await store.ready;
    const actor={id:'hero',name:'Héros',kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,caracs:{CC:50,FM:50,E:30,Ag:40},skills:[],talents:[],states:[],equipment:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{fate:1}},actions:[{id:'test',name:'Épreuve',type:'test',attr:'CC',base:50}]};
    await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'hero',order:['hero'],participants:[actor]}});
    await store.setFortune('hero',3);
    const view=initWorkspaceView({Store:store,Combat:{},Bus:{on(){return()=>{};}},mount:document.querySelector('#mount'),actions:{renderOverview(content){content.textContent='Rappel';},renderLog(content){content.textContent='Journal';},applyResolution:preview=>store.applyResolution(preview)}});
    const action=store.listParticipants()[0].actions[0];window.__store=store;window.__view=view;view.openResolution({...action,participantId:'hero'});
  });
  const chance=page.getByRole('checkbox',{name:'Dépenser 1 Point de Chance pour obtenir Avantage avant le jet'});
  check(await chance.count()===1&&await chance.isEnabled(),'parcours Workspace : option disponible avant la saisie');
  await chance.check();await page.waitForFunction(()=>window.__view.getViewState().resolution.fortuneAdvantageDeclarationId);
  check(await chance.isChecked(),'le Store enregistre la déclaration avant le d100');
  const roll=page.locator('#mount .workspace-resolution-rolls input[data-roll-input="attack"]');await roll.fill('44');
  check(await chance.isDisabled(),'le choix se verrouille dès la saisie du jet');
  await page.getByRole('button',{name:'Calculer',exact:true}).click();
  await page.getByText(/Avantage.*Chance dépensé/i).waitFor({state:'attached',timeout:3000}).catch(()=>{});
  const preview=await page.evaluate(()=>window.__view.getViewState().resolution.preview);
  check(preview?.ready===true&&preview?.test?.advantage?.advantage?.length===1,'l’aperçu conserve la déclaration et applique Avantage');
  const apply=page.getByRole('button',{name:'Enregistrer le résultat',exact:true});
  check(await apply.isEnabled(),'le résultat est applicable');await apply.click();
  await page.waitForFunction(()=>window.__store.getFortune('hero').balance===2);
  const remaining=await page.evaluate(()=>({fortune:window.__store.getFortune('hero').balance,receipts:JSON.parse(window.__store.getFullJSON()).extensions.v5.fortuneAdvantageDeclarations||[]}));
  check(remaining.fortune===2&&remaining.receipts.length===0,'une Chance est payée et le reçu est consommé par le Store');
  check(errors.length===0,'aucune erreur navigateur : '+errors.join('; '));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
if(failures.length)process.exitCode=1;
