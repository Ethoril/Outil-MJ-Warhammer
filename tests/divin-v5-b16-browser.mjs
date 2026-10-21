/** B16 : absolution et pénitence d’Altdorf dans les vrais champs. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url)),output=resolve(root,'tmp/gpt-phase-b/b16/browser');mkdirSync(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{try{const file=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html');assert.ok(file.startsWith(resolve(root)+sep)&&statSync(file).isFile());res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(readFileSync(file));}catch{res.writeHead(404).end();}});
let browser,page;const receipt={passed:false,checks:[],screenshots:[]};
const snap=()=>page.evaluate(async()=>{const{Store}=await import('/js/main.js');await Store.whenIdle();const s=JSON.parse(Store.getFullJSON());delete s.exportedAt;return s;});
const ready=()=>page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block');
const openPanel=async()=>{const panel=page.locator('[data-divine-panel]');await panel.waitFor();if(!await panel.evaluate(el=>el.open))await panel.locator('summary').first().click();return panel;};
const summoned=async()=>(await snap()).combat.participants.filter(row=>row.extensions?.v5?.divineWrathSummon);
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:900}});await context.route('https://**',route=>route.abort());page=await context.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});await ready();
 await page.evaluate(async()=>{const{Store}=await import('/js/main.js');const person=id=>({id,name:id==='priest'?'Prêtre B16':'Allié B16',kind:'PJ',camp:'pj',zone:'active',initiative:60,hp:20,maxHp:30,caracs:{CC:40,CT:40,F:30,E:40,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,arms:0,legs:0},states:[],skills:[{id:'skill-50_72_69_e8_72_65-base',name:'Prière',status:'resolved',carac:'Soc',total:60},{id:'skill-43_61_6c_6d_65-base',name:'Calme',status:'resolved',carac:'FM',total:50}],talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],extensions:{v5:{hasMomentum:true,divine:{sin:id==='priest'?3:0}}}});await Store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[person('priest'),person('ally')]},extensions:{v5:{combatId:"b15-browser",turnIndex:1}}});});


 await page.getByRole('tab',{name:'Jouer',exact:true}).click();const actor=page.locator('[data-workspace-select="priest"]');if(await actor.count())await actor.click();const panel=await openPanel();
 const sinOf=async()=>(await snap()).combat.participants.find(r=>r.id==='priest').extensions.v5.divine.sin;
 await panel.getByRole('combobox',{name:'Culte de l’absolution',exact:true}).selectOption('Myrmidia');await panel.getByRole('spinbutton',{name:'Péchés à retirer (décision MJ)',exact:true}).fill('2');await panel.getByRole('textbox',{name:'Motif MJ de l’absolution',exact:true}).fill('Don au temple');await panel.getByRole('button',{name:'Préparer l’absolution',exact:true}).click();
 await panel.getByRole('combobox',{name:'Peut prononcer la Prière de récupération',exact:true}).selectOption('true');await panel.getByRole('spinbutton',{name:'Jet de récupération du Courroux (d100)',exact:true}).fill('35');await panel.locator('[data-divine-action="recovery-calculate"]').click();
 assert.ok((await panel.innerText()).includes('2 Péché(s) seront retirés'));assert.equal(await sinOf(),3,'aperçu inerte');
 for(const width of [1440,390]){await page.setViewportSize({width,height:width===390?844:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'pas de débordement '+width);const file='b16-absolution-'+width+'.png';await page.screenshot({path:resolve(output,file),fullPage:true});receipt.screenshots.push(file);}
 await page.setViewportSize({width:1440,height:900});await panel.locator('[data-divine-action="recovery-apply"]').click();await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');return Store.listParticipants().find(r=>r.id==='priest').extensions.v5.divine.sin===1;});
 receipt.checks.push('Absolution MJ : Test partagé, 2 Péchés retirés dans les vrais champs, aperçu inerte');
 await panel.getByRole('combobox',{name:'Type d’absolution',exact:true}).selectOption('altdorf');await panel.getByRole('combobox',{name:'Pèlerinage accompli (confirmation MJ)',exact:true}).selectOption('true');await panel.getByRole('button',{name:'Préparer l’absolution',exact:true}).click();
 await panel.getByRole('combobox',{name:'Peut prononcer la Prière de récupération',exact:true}).selectOption('true');await panel.getByRole('spinbutton',{name:'Jet de récupération du Courroux (d100)',exact:true}).fill('97');await panel.locator('[data-divine-action="recovery-calculate"]').click();await panel.locator('[data-divine-action="recovery-apply"]').click();
 await page.waitForFunction(async()=>{const{Store}=await import('/js/main.js');return Store.listParticipants().find(r=>r.id==='priest').states.some(s=>s.name==='Exténué');});assert.equal(await sinOf(),1);
 receipt.checks.push('Pénitence d’Altdorf : échec ordinaire = Exténué, Péchés inchangés');
 await page.reload({waitUntil:'domcontentloaded'});await ready();assert.equal(await sinOf(),1);
 await page.evaluate(async()=>{const{Store}=await import('/js/main.js');await Store.undo();if(Store.listParticipants().find(r=>r.id==='priest').states.some(s=>s.name==='Exténué'))throw Error('Undo incomplet');await Store.undo();if(Store.listParticipants().find(r=>r.id==='priest').extensions.v5.divine.sin!==3)throw Error('Undo absolution incomplet');await Store.redo();await Store.redo();});
 receipt.checks.push('IndexedDB natif, Annuler et Rétablir des deux commandes');
 assert.deepEqual(errors,[]);receipt.passed=true;
}catch(error){receipt.error=error.stack;if(page)await page.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}finally{receipt.completedAt=new Date().toISOString();writeFileSync(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');await browser?.close();await new Promise(done=>server.close(done));}console.log(JSON.stringify(receipt));
