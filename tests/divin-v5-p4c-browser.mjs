/** P4c B4 : invocations divines (Hurlement du loup, Roi de la Nature, Œil de l'aigle), application réelle, gestes réels, IndexedDB native. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'tmp/divin/p4c-browser');mkdirSync(output,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';const path=resolve(root,relative);assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':types[extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404).end('Resource unavailable');}});
const receipt={passed:false,scope:'Application réelle, IndexedDB native, invocations divines (summon-creature), mobile simulé',checks:[],screenshots:[]};
const check=description=>{receipt.checks.push(description);console.log('PASS — '+description);};let browser,page;
const HOWL='divine:miracle:ulric:howl-of-the-wolf',KING='divine:miracle:taal:king-of-the-wild',EAGLE='divine:miracle:il-de-l-aigle';
const ready=()=>page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block');
const people=()=>page.evaluate(async()=>{const{Store}=await import('/js/main.js');await Store.whenIdle();return JSON.parse(JSON.stringify(Store.listParticipants()));});
const person=async id=>(await people()).find(p=>p.id===id);
const fullState=()=>page.evaluate(async()=>{const{Store}=await import('/js/main.js');await Store.whenIdle();return JSON.parse(Store.getFullJSON());});
const waitFor=async(predicate,message)=>{const deadline=Date.now()+7000;let last;while(Date.now()<deadline){last=await predicate();if(last)return last;await page.waitForTimeout(80);}throw new Error('Délai dépassé : '+message);};
const summons=async()=>(await people()).filter(p=>p.extensions?.v5?.divineSummon);
const layersOf=async()=>((await person('priest')).extensions?.v5?.divineEffects||[]).filter(layer=>layer.type==='summon-creature');
/** Aucun doublon de la créature : ids uniques, ordre sans répétition, une seule créature par couche. */
const noDuplicate=async(label,expected)=>{
 const state=await fullState(),ids=state.combat.participants.map(p=>p.id),order=state.combat.order||[];
 assert.equal(new Set(ids).size,ids.length,`participants sans doublon (${label})`);
 assert.equal(new Set(order).size,order.length,`ordre sans doublon (${label})`);
 const linked=state.combat.participants.filter(p=>p.extensions?.v5?.divineSummon);
 assert.equal(new Set(linked.map(p=>p.extensions.v5.divineSummon.layerId)).size,linked.length,`une créature par couche (${label})`);
 if(expected!==undefined)assert.equal(linked.length,expected,`${expected} créature(s) liée(s) (${label})`);
 return state;
};
const loadState=async()=>{
 await page.evaluate(async()=>{
  const{Store}=await import('/js/main.js');
  const{getAllDivineContracts}=await import('/js/core/v5-divine-store.js');
  const base={caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0},actions:[],skills:[],talents:[],prayers:[],traits:[],equipment:[],hp:20,maxHp:30,zone:'active',extensions:{v5:{}}};
  const priest={...base,id:'priest',name:'Prêtresse',kind:'PJ',camp:'pj',init:60,
   skills:[{id:'pray',name:'Pray',status:'resolved',total:60}],
   talents:['Ulric','Taal','Myrmidia'].flatMap(specialization=>[{id:'talent-invoke',status:'resolved',specialization,rank:1},{id:'talent-bless',status:'resolved',specialization,rank:1}]),
   prayers:getAllDivineContracts().filter(row=>row.type==='miracle').map(row=>({name:row.catalogueName,status:'resolved'})),
   extensions:{v5:{divine:{sin:0}}}};
  const ally={...base,id:'ally',name:'Allié',kind:'PJ',camp:'pj',init:30};
  const foe={...base,id:'foe',name:'Brigand',kind:'PNJ',camp:'pnj',init:20};
  await Store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally','foe'],participants:[priest,ally,foe]},diceLines:[],log:[],extensions:{v5:{turnIndex:1}}});
 });
 await page.getByRole('tab',{name:'Jouer',exact:true}).click();
 const actorButton=page.locator('[data-workspace-select="priest"]');if(await actorButton.count())await actorButton.click();
};
const openPanel=async()=>{const panel=page.locator('[data-divine-panel]');await panel.waitFor();if(!await panel.evaluate(el=>el.open))await panel.locator('summary').first().click();return panel;};
const choose=async(panel,contractId)=>{await panel.getByRole('combobox',{name:'Prière divine',exact:true}).selectOption(contractId);return panel;};
const baseFields=async(panel,roll=45)=>{
 await panel.getByRole('combobox',{name:'Le personnage peut prononcer la prière',exact:true}).selectOption('true');
 await panel.getByRole('spinbutton',{name:'Jet de Prière (d100)',exact:true}).fill(String(roll));
};
const calculate=async panel=>{await panel.locator('[data-divine-action="calculate"]').click();const preview=panel.locator('.workspace-divine-preview');await preview.waitFor();return preview;};
const apply=panel=>panel.locator('[data-divine-action="apply"]').click();
const nextTurn=async()=>{
 const before=(await fullState()).combat,button=page.getByRole('button',{name:/Tour suivant/}).first();await button.click();
 await waitFor(async()=>{const c=(await fullState()).combat;return c.currentActorId!==before.currentActorId||c.round!==before.round;},'passage au Tour suivant');
};
const undo=async()=>{await page.getByRole('button',{name:'Annuler',exact:true}).click();};
const redo=async()=>{await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Rétablir',exact:false}).click();};
const shots=async prefix=>{
 for(const width of [1440,390])for(const mode of ['dark','light']){
  await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(v=>document.documentElement.dataset.theme=v,mode);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`pas de débordement horizontal (${prefix} ${width} ${mode})`);
  const file=`${prefix}-${width}-${mode}.png`;await page.screenshot({path:resolve(output,file),fullPage:true});receipt.screenshots.push(file);
 }
 await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>document.documentElement.dataset.theme='dark');
};
/** Lance Hurlement du loup par gestes (prêtre cible, à portée, fin du Tour du prêtre). */
const castHowl=async({roll=45}={})=>{
 const panel=await choose(await openPanel(),HOWL);
 assert.equal(await panel.getByRole('checkbox',{name:/^Destinataire /}).count(),0,'cible implicite : aucune case à cocher');
 const range=panel.getByRole('combobox',{name:'Prêtresse · Portée / zone confirmée',exact:true});if(await range.count())await range.selectOption('true');
 await baseFields(panel,roll);
 await panel.getByRole('combobox',{name:'Fin de l’effet (choix du MJ)',exact:true}).selectOption('endOfTurn');
 const preview=await calculate(panel);
 return {panel,preview};
};
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:900}});await context.route('https://**',route=>route.abort());
 page=await context.newPage();page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});await ready();
 await loadState();

 // 1. Hurlement du loup : aperçu inerte, application, piste des Tours, ciblage.
 let {panel,preview}=await castHowl();
 const previewText=await preview.innerText();
 assert.match(previewText,/Invocation : .*Loup.*24 Blessure/i,'l’aperçu nomme la créature et ses Blessures');
 assert.equal((await summons()).length,0,'l’aperçu reste inerte');await noDuplicate('aperçu',0);
 await shots('howl-apercu');
 await apply(panel);
 await waitFor(async()=>(await summons()).length===1,'loup créé');
 let wolf=(await summons())[0];
 assert.equal(wolf.caracs.CC,45);assert.equal(wolf.caracs.FM,35);assert.equal(wolf.maxHp,24);assert.equal(wolf.hp,24);
 assert.equal(wolf.extensions.v5.divineSummon.ownerId,'priest');assert.equal(wolf.zone,'active');
 assert.equal((await layersOf()).length,1,'une couche summon-creature sur le prêtre');
 assert.equal(wolf.extensions.v5.divineSummon.layerId,(await layersOf())[0].id);
 let state=await noDuplicate('après application',1);
 assert.deepEqual(state.combat.order,['priest','ally','foe'],'combat.order inchangé : la créature s’intercale par son initiative, sans réécrire l’ordre');
 const trackRow=page.locator(`[data-workspace-select="${wolf.id}"]`);await trackRow.first().waitFor();
 assert.equal(await trackRow.count(),1,'une seule ligne du loup dans la piste des Tours');
 assert.match(await trackRow.first().innerText(),/Loup/i);
 check('Hurlement du loup : aperçu inerte, loup CC 45 / FM 35 / 24 Blessures créé une seule fois, couche sur le prêtre, ligne unique dans la piste');
 await shots('howl-actif');
 panel=await openPanel();
 await choose(panel,'divine:blessing:myrmidia:battle');
 assert.equal(await panel.locator(`[aria-label="Destinataire ${wolf.name}"]`).count(),1,'le loup est ciblable par une bénédiction normale');
 const actives=panel.locator('details.workspace-v5-context-details').filter({hasText:'Prières actives du personnage'});
 if(!await actives.evaluate(el=>el.open))await actives.locator('summary').click();
 assert.ok((await actives.innerText()).includes('Invocation : '+wolf.name));
 check('Le loup est ciblable et la prière active affiche « Invocation : loup »');

 await page.reload({waitUntil:'domcontentloaded'});await ready();
 assert.equal((await summons()).length,1,'le loup survit au rechargement (IndexedDB)');await noDuplicate('rechargement',1);
 assert.deepEqual((await person(wolf.id)).caracs,wolf.caracs);
 check('Rechargement : une seule créature active, profil conservé');

 await page.getByRole('tab',{name:'Jouer',exact:true}).click();
 await nextTurn();
 await undo();await waitFor(async()=>(await fullState()).combat.currentActorId==='priest','Annuler le Tour');
 assert.equal((await summons()).length,1,'Annuler le Tour garde le loup');
 await undo();await waitFor(async()=>(await summons()).length===0,'Annuler la prière retire le loup');
 state=await noDuplicate('après Annuler',0);assert.equal((await layersOf()).length,0);assert.ok(!state.combat.order.includes(wolf.id),'ordre purgé du loup');
 await redo();await waitFor(async()=>(await summons()).length===1,'Rétablir la prière');
 await noDuplicate('Rétablir 1',1);
 await redo();await waitFor(async()=>(await fullState()).combat.currentActorId!=='priest','Rétablir le Tour');
 await noDuplicate('Rétablir 2',1);assert.equal((await summons())[0].id,wolf.id,'même identifiant déterministe après Rétablir');
 check('Annuler/Rétablir en chaîne (Tour puis prière) : le loup disparaît et revient sans doublon, même identifiant');

 let guard=0,sawPending=false;
 while((await layersOf()).length&&guard++<30){
  await nextTurn();const now=await fullState(),links=now.combat.participants.filter(p=>p.extensions?.v5?.divineSummon);
  assert.ok(links.length<=1,'jamais deux loups pendant les Tours');await noDuplicate('Tours');
  if(links.length&&!(await layersOf()).length){
   assert.equal(now.combat.currentActorId,links[0].id,'seul l’acteur courant survit à l’expiration');assert.equal(links[0].extensions.v5.divineSummon.endedPending,true,'marqué endedPending');sawPending=true;
  }
 }
 assert.ok(guard<30,'la couche expire');
 if(sawPending)await nextTurn();
 await waitFor(async()=>(await summons()).length===0,'loup retiré après expiration');
 state=await noDuplicate('expiration',0);assert.ok(!state.combat.order.includes(wolf.id));assert.notEqual(state.combat.currentActorId,wolf.id);
 assert.ok(state.log.some(row=>/disparaît/.test(row.text)&&row.text.includes(wolf.name)),'le journal note la disparition');
 assert.equal(await page.locator(`[data-workspace-select="${wolf.id}"]`).count(),0,'le loup a quitté la piste des Tours');
 check(`Échéance par Tours : le loup disparaît (${sawPending?'acteur courant : endedPending puis retrait à la commande suivante':'sans passage par endedPending'}), ordre, journal et piste purgés`);

 await loadState();({panel}=await castHowl());await apply(panel);await waitFor(async()=>(await summons()).length===1,'second loup');
 await panel.locator('summary').filter({hasText:'Prières actives du personnage'}).click();
 await page.getByRole('textbox',{name:'Raison de fin de prière',exact:true}).fill('Fin demandée par le MJ');
 await page.locator('[data-divine-action="end"]').click();
 await waitFor(async()=>(await summons()).length===0,'Terminer la prière retire le loup');
 await noDuplicate('Terminer',0);assert.equal((await layersOf()).length,0);
 await undo();await waitFor(async()=>(await summons()).length===1,'Annuler Terminer');await noDuplicate('Annuler Terminer',1);
 await redo();await waitFor(async()=>(await summons()).length===0,'Rétablir Terminer');await noDuplicate('Rétablir Terminer',0);
 check('Terminer la prière retire le loup ; Annuler le ramène, Rétablir le retire encore, sans doublon');

 // 2. Roi de la Nature : animal parmi la liste fermée, position saisie, durée en minutes sur l'horloge de campagne.
 await loadState();panel=await choose(await openPanel(),KING);
 assert.equal(await panel.getByRole('checkbox',{name:/^Destinataire /}).count(),0,'cible implicite : aucune case à cocher');
 const kingRange=panel.getByRole('combobox',{name:'Prêtresse · Portée / zone confirmée',exact:true});if(await kingRange.count())await kingRange.selectOption('true');
 await baseFields(panel);
 assert.equal(await panel.getByRole('combobox',{name:'Fin de l’effet (choix du MJ)',exact:true}).count(),0,'durée en minutes : pas de fin de Round à choisir');
 const beast=panel.getByRole('combobox',{name:'Bête invoquée',exact:true}),position=panel.getByRole('textbox',{name:'Position d’apparition',exact:true});
 const beastOptions=await beast.locator('option').evaluateAll(list=>list.map(o=>({value:o.value,text:o.textContent})));
 assert.equal(beastOptions.filter(o=>o.value).length,6,'six animaux proposés');
 preview=await calculate(panel);
 assert.equal(await panel.locator('[data-divine-action="apply"]').isDisabled(),true,'sans animal ni position, rien ne s’applique');
 assert.match(await preview.innerText(),/Bête invoquée|Position d’apparition/,'les données manquantes sont listées');
 await beast.selectOption(beastOptions.find(o=>o.value).value);
 preview=await calculate(panel);
 assert.equal(await panel.locator('[data-divine-action="apply"]').isDisabled(),true,'la position reste requise');
 await position.fill('Au pied du chêne, derrière le Brigand');
 preview=await calculate(panel);
 await waitFor(async()=>!await panel.locator('[data-divine-action="apply"]').isDisabled(),'Roi de la Nature prêt');
 assert.match(await preview.innerText(),/Échéance calendaire : 6 min/,'durée Soc 60 = 6 minutes de campagne');
 assert.equal((await summons()).length,0,'aperçu inerte');
 await shots('king-apercu');await apply(panel);
 await waitFor(async()=>(await summons()).length===1,'animal créé');
 const animal=(await summons())[0];state=await noDuplicate('Roi de la Nature',1);
 assert.equal(animal.extensions.v5.divineSummon.profileKey,beastOptions.find(o=>o.value).value);
 assert.match(JSON.stringify(animal),/Au pied du chêne/,'la position saisie est conservée sur la créature');
 await page.locator(`[data-workspace-select="${animal.id}"]`).first().waitFor();
 check('Roi de la Nature : animal parmi 6, position obligatoire et conservée, aperçu inerte, créature dans la piste');
 // Les Tours ne l'expirent pas : seule l'horloge de campagne le fait.
 for(let i=0;i<4;i++)await nextTurn();
 assert.equal((await summons()).length,1,'des Rounds de combat n’expirent pas une durée en minutes');
 const advance=async minutes=>{
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Temps de campagne',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Temps de campagne',exact:true});await dialog.waitFor();
  await dialog.getByRole('spinbutton',{name:'Durée écoulée',exact:true}).fill(String(minutes));
  await dialog.getByRole('combobox',{name:'Unité de durée',exact:true}).selectOption('minutes');
  await dialog.getByRole('textbox',{name:'Motif MJ',exact:true}).fill('Recette invocation');
  await dialog.getByRole('button',{name:'Avancer le temps',exact:true}).click();await dialog.waitFor({state:'hidden'});
 };
 await advance(5);assert.equal((await summons()).length,1,'5 minutes : la créature reste (borne basse)');
 await page.reload({waitUntil:'domcontentloaded'});await ready();assert.equal((await summons()).length,1);
 await page.getByRole('tab',{name:'Jouer',exact:true}).click();
 await advance(1);await waitFor(async()=>(await summons()).length===0,'6 minutes : l’animal disparaît');
 state=await noDuplicate('Roi expiré',0);assert.equal((await layersOf()).length,0);
 await undo();await waitFor(async()=>(await summons()).length===1,'Annuler l’avance du temps');await noDuplicate('Annuler horloge',1);
 await redo();await waitFor(async()=>(await summons()).length===0,'Rétablir l’avance du temps');await noDuplicate('Rétablir horloge',0);
 check('Roi de la Nature : 5 min il reste, 6 min il part (horloge de campagne), Annuler/Rétablir sans doublon, rechargement conservé');

 // 3. Œil de l'aigle : capteur hors ordre, absent de la piste des Tours.
 await loadState();panel=await choose(await openPanel(),EAGLE);
 assert.equal(await panel.getByRole('checkbox',{name:/^Destinataire /}).count(),0,'Œil de l’aigle : aucune case à cocher');
 const eagleRange=panel.getByRole('combobox',{name:'Prêtresse · Portée / zone confirmée',exact:true});if(await eagleRange.count())await eagleRange.selectOption('true');
 await baseFields(panel);await panel.getByRole('combobox',{name:'Fin de l’effet (choix du MJ)',exact:true}).selectOption('endOfRound');
 preview=await calculate(panel);assert.match(await preview.innerText(),/capteur hors de l’ordre du combat/);
 await apply(panel);await waitFor(async()=>(await summons()).length===1,'capteur créé');
 const sensor=(await summons())[0];state=await noDuplicate('Œil de l’aigle',1);
 assert.match(sensor.name,/Aigle/);
 assert.equal(await page.locator(`[data-workspace-select="${sensor.id}"]`).count(),0,'le capteur n’est pas dans la piste des Tours');
 assert.ok(!(state.combat.order||[]).includes(sensor.id));
 for(let i=0;i<4;i++){await nextTurn();assert.notEqual((await fullState()).combat.currentActorId,sensor.id,'le capteur ne joue jamais');}
 await shots('eagle');
 let eagleGuard=0;while((await layersOf()).length&&eagleGuard++<30)await nextTurn();
 await waitFor(async()=>(await summons()).length===0,'capteur retiré à l’échéance');await noDuplicate('capteur expiré',0);
 check('Œil de l’aigle : capteur absent de la piste et de l’ordre, ne prend jamais la main, retiré à l’échéance');

 // 4. Sans cocher de cible : le prêtre est la cible implicite (Hurlement du loup, Roi de la Nature), aucun fait de portée demandé.
 for(const contractId of [HOWL,KING]){
  await loadState();panel=await choose(await openPanel(),contractId);
  assert.equal(await panel.getByRole('combobox',{name:/zone confirmée/}).count(),0,'aucun fait « Portée / zone confirmée » à renseigner ('+contractId+')');
  assert.equal(await panel.getByRole('checkbox',{checked:true}).count(),0,'aucun destinataire coché ('+contractId+')');
  await baseFields(panel);
  if(contractId===HOWL)await panel.getByRole('combobox',{name:'Fin de l’effet (choix du MJ)',exact:true}).selectOption('endOfTurn');
  else{
   const beast=panel.getByRole('combobox',{name:'Bête invoquée',exact:true}),options=await beast.locator('option').evaluateAll(list=>list.map(o=>o.value).filter(Boolean));
   await beast.selectOption(options[0]);await panel.getByRole('textbox',{name:'Position d’apparition',exact:true}).fill('Devant la prêtresse');
  }
  preview=await calculate(panel);
  assert.doesNotMatch(await preview.innerText(),/cibles? explicites?/i,'l’aperçu ne réclame pas de cible ('+contractId+')');
  await waitFor(async()=>!await panel.locator('[data-divine-action="apply"]').isDisabled(),'prêt sans cible ('+contractId+')');
  assert.equal((await summons()).length,0,'aperçu inerte');
  await apply(panel);await waitFor(async()=>(await summons()).length===1,'créature créée sans cible ('+contractId+')');
  const created=(await summons())[0];
  assert.equal(created.extensions.v5.divineSummon.ownerId,'priest');assert.equal((await layersOf()).length,1,'la couche est sur le prêtre');
  assert.equal(created.extensions.v5.divineSummon.layerId,(await layersOf())[0].id);await noDuplicate('sans cible '+contractId,1);
 }
 check('Hurlement du loup et Roi de la Nature sans cocher de cible : aucun fait de portée, aperçu prêt, créature et couche sur le prêtre');

 assert.deepEqual(errors,[],'aucune erreur navigateur');receipt.passed=true;
}catch(error){receipt.error=error.stack;if(page)await page.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;
}finally{receipt.completedAt=new Date().toISOString();writeFileSync(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');await browser?.close();await new Promise(done=>server.close(done));}
console.log(JSON.stringify(receipt));
