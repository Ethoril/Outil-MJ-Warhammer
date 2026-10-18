/** T5 acceptance: panneau de prières piloté par le contrat, application réelle, gestes réels, IndexedDB native. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'tmp/divin/t5-browser');mkdirSync(output,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';const path=resolve(root,relative);assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':types[extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404).end('Resource unavailable');}});
const receipt={passed:false,scope:'Application réelle, IndexedDB native, formulaire de prière généré depuis le contrat, mobile simulé',checks:[],screenshots:[]};
const check=description=>receipt.checks.push(description);let browser,page;
const ready=()=>page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block');
const people=()=>page.evaluate(async()=>{const{Store}=await import('/js/main.js');await Store.whenIdle();return JSON.parse(JSON.stringify(Store.listParticipants()));});
const person=async id=>(await people()).find(p=>p.id===id);
const fullState=()=>page.evaluate(async()=>{const{Store}=await import('/js/main.js');await Store.whenIdle();return JSON.parse(Store.getFullJSON());});
const waitFor=async(predicate,message)=>{const deadline=Date.now()+7000;let last;while(Date.now()<deadline){last=await predicate();if(last)return last;await page.waitForTimeout(80);}throw new Error('Délai dépassé : '+message);};
const loadState=async()=>{
 await page.evaluate(async()=>{
  const{Store}=await import('/js/main.js');
  const{getAllDivineContracts}=await import('/js/core/v5-divine-store.js');
  const base={caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0},actions:[],skills:[],talents:[],prayers:[],traits:[],equipment:[],hp:20,maxHp:30,zone:'active',extensions:{v5:{}}};
  const state=(id,key,name)=>({id,key,name,level:1});
  const priest={...base,id:'priest',name:'Prêtresse',kind:'PJ',camp:'pj',init:60,
   skills:[{id:'pray',name:'Pray',status:'resolved',total:60}],
   talents:['Sigmar','Rhya','Morr'].flatMap(specialization=>[{id:'talent-invoke',status:'resolved',specialization,rank:1},{id:'talent-bless',status:'resolved',specialization,rank:1}]),
   prayers:getAllDivineContracts().filter(row=>row.type==='miracle').map(row=>({name:row.catalogueName,status:'resolved'})),
   equipment:[{id:'ham-1',name:'Marteau de guerre',kind:'weapon',category:'Marteau'},{id:'axe-1',name:'Hache de bataille',kind:'weapon',category:'Hache'}],
   extensions:{v5:{divine:{sin:0}}}};
  const ally={...base,id:'ally',name:'Allié',kind:'PJ',camp:'pj',init:30,states:[state('al-1','assourdi','Assourdi')]};
  const ghoul={...base,id:'ghoul',name:'Goule',kind:'PNJ',camp:'pnj',init:20,traits:['Mort-vivant']};
  const cultist={...base,id:'cultist',name:'Cultiste',kind:'PNJ',camp:'pnj',init:10,states:[state('cu-1','assourdi','Assourdi'),state('cu-2','brise','Brisé')]};
  await Store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally','ghoul','cultist'],participants:[priest,ally,ghoul,cultist]},diceLines:[],log:[],extensions:{v5:{turnIndex:1}}});
 });
 await page.getByRole('tab',{name:'Jouer',exact:true}).click();
 const actorButton=page.locator('[data-workspace-select="priest"]');if(await actorButton.count())await actorButton.click();
};
const openPanel=async()=>{const panel=page.locator('[data-divine-panel]');await panel.waitFor();if(!await panel.evaluate(el=>el.open))await panel.locator('summary').first().click();return panel;};
const choose=async(panel,contractId)=>{await panel.getByRole('combobox',{name:'Prière divine',exact:true}).selectOption(contractId);assert.equal(await panel.evaluate(el=>el.open),true,'le panneau reste ouvert');return panel;};
const baseFields=async(panel,roll=45)=>{
 await panel.getByRole('combobox',{name:'Le personnage peut prononcer la prière',exact:true}).selectOption('true');
 await panel.getByRole('spinbutton',{name:'Jet de Prière (d100)',exact:true}).fill(String(roll));
};
const calculate=async panel=>{await panel.locator('[data-divine-action="calculate"]').click();return panel.locator('.workspace-divine-preview');};
const apply=panel=>panel.locator('[data-divine-action="apply"]').click();
const shots=async(prefix,{theme=['dark','light']}={})=>{
 for(const width of [1440,390])for(const mode of theme){
  await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(v=>document.documentElement.dataset.theme=v,mode);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`pas de débordement horizontal (${prefix} ${width} ${mode})`);
  const file=`${prefix}-${width}-${mode}.png`;await page.screenshot({path:resolve(output,file),fullPage:true});receipt.screenshots.push(file);
 }
 await page.setViewportSize({width:1440,height:900});
};
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:900}});await context.route('https://**',route=>route.abort());
 page=await context.newPage();page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});await ready();
 await loadState();

 // 1. Dégâts directs : Feu de l'âme, jet saisi (commun et par cible), allié dans la zone.
 let panel=await choose(await openPanel(),'divine:miracle:sigmar:soulfire');
 await panel.getByRole('checkbox',{name:'Destinataire Goule',exact:true}).check();
 await panel.getByRole('checkbox',{name:'Destinataire Allié',exact:true}).check();
 const warning=panel.getByText('Allié est un allié du prêtre',{exact:false});
 await warning.waitFor();assert.equal(await warning.getAttribute('role'),'status','l’avertissement de zone est annoncé');
 for(const name of ['Goule','Allié'])await panel.getByRole('combobox',{name:`${name} · Portée / zone confirmée`,exact:true}).selectOption('true');
 await panel.getByRole('combobox',{name:'Allié · Serviteur de la Ruine, orque ou gobelin',exact:true}).selectOption('false');
 await baseFields(panel);
 let preview=await calculate(panel);
 assert.match(await preview.innerText(),/À fournir avant d’appliquer/i);
 assert.equal(await panel.locator('[data-divine-action="apply"]').isDisabled(),true,'sans jet de dégâts, rien ne s’applique');
 const jetField=panel.getByRole('spinbutton',{name:'Jet de dégâts commun (1d10)',exact:true});
 assert.equal(await jetField.getAttribute('aria-invalid'),'true','le champ bloquant est signalé');
 await shots('t5-bloquant',{theme:['dark']});
 await preview.getByRole('button',{name:/Jet 1d10 de Blessures/}).first().click();
 assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Jet de dégâts commun (1d10)','le lien place le focus sur le champ');
 check('L’aperçu liste la donnée manquante (jet de dégâts), signale le champ et le lien donne le focus');
 await jetField.fill('6');
 await panel.getByRole('spinbutton',{name:'Allié · Jet de dégâts propre (facultatif)',exact:true}).fill('3');
 preview=await calculate(panel);
 await waitFor(async()=>/Effets projetés/i.test(await preview.innerText().catch(()=>'')),'projection');
 const text=await preview.innerText();
 assert.match(text,/Goule : 8 Blessure\(s\) perdue\(s\) \(1d10 = 6, 2 DR, bonus ciblé \+2\) · 20 → 12/);
 assert.match(text,/Allié : 3 Blessure\(s\) perdue\(s\) \(1d10 = 3, 2 DR\) · 20 → 17/);
 assert.match(text,/Rappels du MJ/i);
 assert.equal((await person('ghoul')).hp,20,'l’aperçu reste inerte');
 await shots('t5-soulfire');
 await apply(panel);
 await waitFor(async()=>(await person('ghoul')).hp===12&&(await person('ally')).hp===17,'application des dégâts');
 await panel.locator('.workspace-divine-receipt').waitFor();
 assert.match(await panel.locator('.workspace-divine-receipt').innerText(),/Goule : 8 Blessure\(s\) perdue\(s\)/);
 const log=(await fullState()).log.map(row=>row.text);
 assert.ok(log.some(line=>/ghoul perd 8 Blessure\(s\) \(1d10 = 6, 2 DR\)/.test(line)),'le journal garde dés, DR et Blessures perdues');
 check('Dégâts directs : jet commun et jet propre saisis, projection nommée, application, reçu et journal avec dé, DR et Blessures perdues');
 await page.getByRole('button',{name:'Annuler',exact:true}).click();
 await waitFor(async()=>(await person('ghoul')).hp===20&&(await person('ally')).hp===20,'Annuler');
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Rétablir',exact:false}).click();
 await waitFor(async()=>(await person('ghoul')).hp===12,'Rétablir');
 check('Annuler puis Rétablir rendent et reprennent les Blessures de toutes les cibles');

 // 2. Retrait d'État avec choix : Secours de Rhya.
 await loadState();panel=await choose(await openPanel(),'divine:miracle:rhya:rhya-s-succour');
 await panel.getByRole('checkbox',{name:'Destinataire Cultiste',exact:true}).check();
 await panel.getByRole('combobox',{name:'Cultiste · Portée / zone confirmée',exact:true}).selectOption('true');
 await baseFields(panel);
 preview=await calculate(panel);
 assert.match(await preview.innerText(),/État retiré chez Cultiste|Cultiste/);
 const removal=panel.getByRole('combobox',{name:'Cultiste · État retiré',exact:true});
 assert.deepEqual(await removal.locator('option').allTextContents(),['Choisir un État','Assourdi','Brisé','Aucun État retiré'],'liste des États actuels de la cible');
 await removal.selectOption({label:'Assourdi'});
 preview=await calculate(panel);
 await waitFor(async()=>/Cultiste : État\(s\) retiré\(s\) : Assourdi/.test(await preview.innerText().catch(()=>'')),'projection du retrait');
 assert.deepEqual((await person('cultist')).states.map(s=>s.key),['assourdi','brise'],'aperçu inerte');
 await apply(panel);
 await waitFor(async()=>(await person('cultist')).states.map(s=>s.key).join()==='brise','retrait appliqué');
 assert.match(await panel.locator('.workspace-divine-receipt').innerText(),/État\(s\) retiré\(s\) : Assourdi/);
 assert.ok((await fullState()).log.some(row=>/Cultiste : État\(s\) retiré\(s\) : Assourdi/.test(row.text)),'le journal nomme l’État retiré');
 check('Retrait d’État : choix parmi les États de la cible, aperçu inerte, reçu et journal nomment l’État retiré');

 // 3. Arme désignée : Marteau enflammé de Sigmar, puis rechargement, Annuler, Rétablir.
 await loadState();panel=await choose(await openPanel(),'divine:miracle:sigmar:sigmar-s-fiery-hammer');
 await baseFields(panel);
 await panel.getByRole('combobox',{name:'Fin de l’effet (choix du MJ)',exact:true}).selectOption('endOfRound');
 preview=await calculate(panel);
 assert.match(await preview.innerText(),/Arme maniée par le prêtre/);
 await panel.getByRole('combobox',{name:'Arme maniée par le prêtre',exact:true}).selectOption({label:'Marteau de guerre'});
 await panel.getByRole('checkbox',{name:/L’arme est bien de la classe attendue/}).check();
 preview=await calculate(panel);
 await waitFor(async()=>/Échéance : fin du Round 6/.test(await preview.innerText().catch(()=>'')),'échéance calculée');
 assert.match(await preview.innerText(),/Rappels du MJ/i);
 await apply(panel);
 const bonus=async()=>((await person('priest')).extensions?.v5?.weaponBonuses||[]).find(row=>row.equipmentId);
 await waitFor(bonus,'bonus d’arme posé');
 assert.equal((await bonus()).equipmentId,'ham-1');assert.equal((await bonus()).classConfirmed,true);
 assert.match(await panel.locator('.workspace-divine-receipt').innerText(),/bonus d’arme sur ham-1/);
 await page.reload({waitUntil:'domcontentloaded'});await ready();
 assert.equal((await bonus())?.equipmentId,'ham-1','le bonus survit au rechargement (IndexedDB)');
 await page.getByRole('button',{name:'Annuler',exact:true}).click();await waitFor(async()=>!(await bonus()),'Annuler du bonus');
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Rétablir',exact:false}).click();await waitFor(bonus,'Rétablir du bonus');
 check('Arme désignée : liste d’équipement de la fiche, confirmation de classe, échéance calculée, rechargement, Annuler et Rétablir');

 // 4. Durée calendaire : l'échéance vient de l'horloge de jeu.
 await loadState();panel=await choose(await openPanel(),'divine:miracle:morr:stay-morr-s-hand');
 await panel.getByRole('checkbox',{name:'Destinataire Allié',exact:true}).check();
 for(const label of ['Cible à portée de contact','À 0 Blessure','Consentante'])await panel.getByRole('combobox',{name:`Allié · ${label}`,exact:true}).selectOption('true');
 await baseFields(panel);
 preview=await calculate(panel);
 await waitFor(async()=>/Échéance calendaire : 6 h de temps de campagne/.test(await preview.innerText().catch(()=>'')),'échéance calendaire');
 assert.equal(await panel.getByRole('combobox',{name:'Fin de l’effet (choix du MJ)',exact:true}).count(),0,'pas de fin de Round demandée pour une durée en heures');
 check('Durée en heures : échéance calendaire affichée depuis l’horloge de jeu, sans fin de Round à choisir');

 // 5. Bénédiction (régression) : le formulaire historique reste utilisable.
 await loadState();panel=await choose(await openPanel(),'divine:blessing:sigmar:battle');
 await panel.getByRole('checkbox',{name:'Destinataire Allié',exact:true}).check();
 await panel.getByRole('combobox',{name:'Allié · Portée / zone confirmée',exact:true}).selectOption('true');
 await baseFields(panel);await panel.getByRole('combobox',{name:'Fin de l’effet (choix du MJ)',exact:true}).selectOption('endOfRound');
 preview=await calculate(panel);await waitFor(async()=>!await panel.locator('[data-divine-action="apply"]').isDisabled(),'bénédiction prête');
 await panel.locator('summary',{hasText:'Extensions de la prière'}).click();
 assert.equal(await panel.getByRole('spinbutton',{name:'Extensions de portée',exact:true}).count(),1);
 check('Bénédiction : cases de faits, extensions et échéance inchangées');
 assert.deepEqual(errors,[]);receipt.passed=true;
}catch(error){receipt.error=error.stack;if(page)await page.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;
}finally{receipt.completedAt=new Date().toISOString();writeFileSync(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');await browser?.close();await new Promise(done=>server.close(done));}
console.log(JSON.stringify(receipt));
