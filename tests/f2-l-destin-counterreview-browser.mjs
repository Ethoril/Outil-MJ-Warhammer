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
  await page.evaluate(async()=>{
    const {openV5FateDialog}=await import('/js/ui/v5-fate-dialog.js');
    const {renderResolutionPanel}=await import('/js/ui/resolution-panel.js');
    const {previewResolution}=await import('/js/core/resolution.js');
    window.__dialogSubmit=null;
    window.__openFate=()=>openV5FateDialog({participantName:'Elyse',fate:{balance:3,permanent:3,legacyResilience:true,baseRevision:4},getCurrentRevision:()=>4,submit:async(amount,options)=>{window.__dialogSubmit={amount,options};return{ok:true};}});
    const actor={id:'actor',name:'MJ',kind:'PJ',camp:'pj',zone:'active',caracs:{CC:50,E:30,Ag:40},extensions:{v5:{}}};
    const action={id:'test',name:'Test',type:'test',attr:'CC',base:50};
    const handlers={select(){},input(){},roll(){},calculate(){},compare(){},choose(){},apply(){},cancel(){}};
    window.__renderResolution=(hasRoll,withPreview)=>renderResolutionPanel({draft:{attackRoll:hasRoll?'44':'',...(withPreview?{preview:previewResolution({actor,action,roll:44})}:{})},actor,participants:[actor],actions:[action],actionKey:'test',type:'test',target:null,groups:{allies:[],adversaries:[]},defense:{options:[],option:{value:'CC',statLabel:'CC'}},canCalculate:true,canApply:true,handlers});
  });
  await page.evaluate(()=>{window.__fatePromise=window.__openFate();});
  const loss=page.getByRole('checkbox',{name:'La perte permanente de Résilience V4 réduit aussi le maximum de Chance'});
  check(await loss.count()===1,'le dialogue Destin V4 affiche la case de perte de Résilience');
  await loss.check();await page.getByRole('spinbutton',{name:'Nouveau solde permanent de Destin'}).fill('1');await page.getByRole('textbox',{name:'Motif MJ'}).fill('Perte actée');await page.getByRole('button',{name:'Enregistrer Destin'}).click();
  const receipt=await page.evaluate(()=>window.__dialogSubmit);
  await page.evaluate(()=>window.__fatePromise);
  check(receipt?.amount===1&&receipt?.options?.permanentResilienceLoss===true,'le formulaire transmet le signal au Store sans erreur UI');
  await page.evaluate(()=>{document.body.replaceChildren(window.__renderResolution(false,false));});
  const available=page.getByRole('checkbox',{name:'Dépenser 1 Point de Chance pour obtenir Avantage avant le jet'});
  check(await available.count()===1&&await available.isEnabled(),'Chance → Avantage est disponible avant le d100');
  for(const withPreview of [false,true]){
    await page.evaluate(value=>{document.body.replaceChildren(window.__renderResolution(true,value));},withPreview);
    const chance=page.getByRole('checkbox',{name:'Dépenser 1 Point de Chance pour obtenir Avantage avant le jet'});
    check(await chance.count()===1&&await chance.isDisabled(),`Chance → Avantage est verrouillé après roll${withPreview?' et aperçu':''}`);
  }
  check(errors.length===0,'aucune erreur navigateur : '+errors.join('; '));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
if(failures.length)process.exitCode=1;
