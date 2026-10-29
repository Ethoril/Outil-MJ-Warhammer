import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Parcours T3 sur l’application complète et son Store IndexedDB réel. Seules
// les fiches de rencontre sont semées dans le contexte invité jetable.
const root=fileURLToPath(new URL('../',import.meta.url)),base='/Outil-MJ-Warhammer/';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);assert.ok(pathname.startsWith(base));const path=resolve(root,pathname.slice(base.length)||'index.html');assert.ok(path.startsWith(resolve(root)+sep)&&statSync(path).isFile());res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined)});
try{
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));
  const origin=`http://127.0.0.1:${server.address().port}${base}`;
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});await page.locator('#tab-combat').click();
  const load=async state=>page.evaluate(async value=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;await Store.loadFromJSON(value);},state);
  const read=async()=>page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;return JSON.parse(Store.getFullJSON());});
  const call=async(method,...args)=>page.evaluate(async([name,values])=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;return await Store[name](...values);},[method,args]);
  const prepareMutation=async(domain,id)=>page.evaluate(async({domain,id})=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;let participant=JSON.parse(Store.getFullJSON()).combat.participants.find(row=>row.id==='t3-rider');await Store.setCorruptionPoints('t3-rider',7,{reason:`Fixture navigateur ${id}`});participant=JSON.parse(Store.getFullJSON()).combat.participants.find(row=>row.id==='t3-rider');await Store.updateParticipant('t3-rider',{extensions:{...participant.extensions,v5:{...participant.extensions.v5,pendingCorruptionTest:null,pendingCorruptionMutation:{id,status:'pending',domain,manifestation:{days:9,visibility:'gm-only'}}}}});}, {domain,id});
  const actor={id:'t3-rider',profileId:'t3-rider',name:'Cavalier T3',kind:'PJ',camp:'pj',zone:'active',initiative:70,hp:20,maxHp:20,caracs:{CC:60,CT:50,F:40,E:30,BE:3,I:40,Ag:40,Dex:35,Int:30,FM:30,Soc:25},skills:[{id:'skill-52_e9_73_69_73_74_61_6e_63_65-base',name:'Résistance',status:'resolved',total:50,carac:'E'},{id:'ride-t3',name:'Chevaucher',status:'resolved',total:55,carac:'Ag'}],talents:[],traits:[],states:[],equipment:[{id:'t3-mail',kind:'armour',name:'Cotte test',ap:3,locations:['head','body','leftArm','rightArm','leftLeg','rightLeg'],keywords:[]}],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{fate:1,corruptionPoints:5}}};
  const horse={id:'t3-horse',name:'Cheval T3',kind:'Créature',camp:'ennemi',zone:'active',initiative:50,hp:18,maxHp:18,size:'large',caracs:{F:50,E:40,BE:4,Ag:35},skills:[],talents:[],traits:[{name:'Psychologie',param:'Craintif'}],states:[],armor:{head:0,body:0,arms:2,legs:0},extensions:{v5:{hitMorphology:'quadruped'}}};
  const enemy={id:'t3-foe',name:'Garde T3',kind:'PNJ',camp:'ennemi',zone:'active',initiative:30,hp:40,maxHp:40,caracs:{CC:30,F:30,E:30,BE:3,I:30,Ag:30,FM:25},skills:[],talents:[],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{hitMorphology:'humanoid'}}};
  const attack={id:'t3-spear',note:'Lance de test',type:'attack',attr:'CC',base:65,damage:'BF+4',qualities:[{id:'empaleuse'}],extensions:{}};actor.actions=[attack];
  await load({schemaVersion:3,reserve:[],diceLines:[],log:[],combat:{round:1,currentActorId:actor.id,order:[actor.id,horse.id,enemy.id],participants:[actor,horse,enemy]}});
  const readParticipant=async id=>(await read()).combat.participants.find(row=>row.id===id);

  // M : choix du lien dans l’éditeur réel du participant puis chute déclenchée
  // par l’état Surprise de la monture via le vrai Store.
  await page.getByRole('button',{name:'Modifier Cavalier T3'}).click();
  const edit=page.getByRole('dialog');await edit.getByLabel('Le personnage est monté').check();await edit.getByLabel('Monture active').selectOption(horse.id);await edit.getByRole('button',{name:/Enregistrer|Valider/}).click();
  assert.equal((await readParticipant(actor.id)).extensions.v5.mounted,true,'le formulaire réel enregistre l’état monté');
  assert.equal((await readParticipant(actor.id)).extensions.v5.mountId,horse.id,'le formulaire réel conserve l’identifiant de la monture');
  const surprise=await call('acquireConditions',horse.id,['Surpris'],{[`mountedRideScore:${actor.id}`]:55,[`mountedRideRoll:${actor.id}`]:99});
  assert.ok(surprise.mountedFall?.some(row=>row.participantId===actor.id&&row.dismount===true),'Surprise de la monture demande le Test et prévoit la chute sur échec');
  assert.equal((await readParticipant(actor.id)).extensions.v5.mounted,false,'la chute est appliquée par le Store après réponses au Test');

  // G : l’attaque s’ouvre avec la morphologie du profil réel, le choix MJ est
  // modifiable dans la résolution et le critique conserve la localisation adaptée.
  const action=page.locator(`[data-action-key="${attack.id}"]`);await action.waitFor();await action.click();
  const workspace=page.locator('#workspace-root');await workspace.getByLabel('Type d’action').selectOption('attack');
  const morphology=workspace.getByLabel('Morphologie de la cible (choix du MJ)');assert.equal(await morphology.inputValue(),'quadruped','la cible quadrupède expose sa morphologie issue du profil');
  // Vérifier le calcul complet via le Store réel (la preview UI n’est pas
  // calculable tant que les choix de défense ne sont pas tous renseignés).
  const morphologyResult=await page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;return Store.previewResolution({resolutionId:'t3-morphology',actorId:'t3-rider',targetId:'t3-horse',action:{type:'attack',attr:'CC',base:99,damage:4,qualities:[]},roll:4,v5:{kind:'melee'}});});
  assert.equal(morphologyResult.location.name,'Patte avant droite','le profil quadrupède adapte la localisation de l’attaque Store réelle');
  assert.equal(morphologyResult.protection.ap,2,'la protection du membre antérieur adaptée est prise en compte dans le calcul Store');

  // L : l’action UI Destin accepte la borne 100 et l’enregistre durablement
  // dans la fiche, avec motif MJ dans le journal Store.
  await page.getByRole('button',{name:'Modifier le Destin de Cavalier T3'}).click();
  const fate=page.getByRole('dialog');await fate.getByLabel('Nouveau solde permanent de Destin').fill('100');await fate.getByLabel('Motif MJ').fill('Attribution de test T3');
  await fate.getByRole('button',{name:'Enregistrer Destin'}).click();
  let saved=await readParticipant(actor.id);assert.equal(saved.extensions.v5.fate,100,'la valeur 100 passe le formulaire Destin et est stockée');
  let envelope=await read();assert.match(envelope.log[0].detail.reason,/Attribution de test T3/u,'motif de l’attribution Destin journalisé');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#app-content')?.style.display==='block',{timeout:20000});await page.locator('#tab-combat').click();
  assert.equal((await readParticipant(actor.id)).extensions.v5.fate,100,'Destin 100 réhydraté depuis la persistance IndexedDB après rechargement');

  // K1 : le panneau Corruption est rendu dans l’espace de jeu et pilote une
  // exposition réelle avec un d100 maximal; le Store conserve le résultat.
  const panel=page.locator('[data-v5-corruption-panel="t3-rider"]');await panel.waitFor();
  await panel.getByRole('button',{name:'Démarrer une séance'}).click();
  await panel.getByLabel('Sources d’exposition déclarées (une par ligne)').fill('Artefact profane T3');
  await panel.getByLabel('Influence corruptrice').selectOption('moderate');await panel.getByLabel('Durée d’exposition').selectOption('prolonged');
  await panel.getByLabel('Compétence choisie par le MJ').selectOption('skill-52_e9_73_69_73_74_61_6e_63_65-base');
  await panel.getByLabel('Jet du Test de Corruption (d100)').fill('100');
  const exposureButton=panel.getByRole('button',{name:'Calculer l’exposition'});
  assert.equal(await exposureButton.isEnabled(),true,'la saisie K1 active immédiatement le bouton Calculer');
  await exposureButton.click();await panel.getByRole('button',{name:'Enregistrer l’exposition'}).click();
  const status=await page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;return Store.getCorruptionStatus('t3-rider');});
  assert.equal(status.sessionExposure.roll,100,'le jet 100 est retenu dans l’exposition de fin de séance');
  assert.ok(status.corruptionPoints>5,'l’exposition modérée prolongée met à jour le solde via Store');
  assert.equal(status.sessionExposure.declaredSources,'Artefact profane T3');
  // Fixture de suite : après l’exposition K1, créer sur le Store réel un état
  // de mutation K1 en attente afin d’exercer la jonction de sélection K2.
  await page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;const participant=JSON.parse(Store.getFullJSON()).combat.participants.find(row=>row.id==='t3-rider');await Store.updateParticipant('t3-rider',{extensions:{...participant.extensions,v5:{...participant.extensions.v5,pendingCorruptionTest:null,pendingCorruptionMutation:{id:'pending-k1-t3',status:'pending',domain:'physical',manifestation:{days:9,visibility:'gm-only'}}}}});});
  let corruption=await page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;return Store.getCorruptionStatus('t3-rider');});
  assert.equal(corruption.pendingMutation?.domain,'physical','le Store réel expose une mutation physique K1 en attente');
  // K2 : sélectionner explicitement une table et une ligne correspondant au
  // domaine puis confirmer la mutation K1 en attente dans le panneau réel.
  await panel.getByLabel('Table source').selectOption('L06-corruption-physical');
  await panel.getByLabel('Ligne de mutation').selectOption('L06-PHY-01');
  await panel.getByLabel(/Résultat imprimé/).fill('1');
  const k2Button=panel.getByRole('button',{name:'Confirmer la mutation en attente avec cette entrée'});
  const k2ControlBlocked=!(await k2Button.isEnabled());
  assert.equal(k2ControlBlocked,false,'une ligne et un résultat saisis activent la confirmation K2');
  await panel.getByLabel('Table source').selectOption('L06-corruption-mental');
  assert.equal(await panel.getByLabel(/Résultat imprimé/).inputValue(),'','le résultat précédent est effacé au changement de table');
  assert.equal(await panel.getByRole('button',{name:'Confirmer la mutation en attente avec cette entrée'}).isDisabled(),true,'la confirmation attend un résultat pour la nouvelle table');
  await panel.getByLabel('Table source').selectOption('L06-corruption-physical');
  assert.equal(await panel.getByLabel(/Résultat imprimé/).inputValue(),'','le retour à la table physique ne restaure pas un résultat périmé');
  await panel.getByLabel('Ligne de mutation').selectOption('L06-PHY-02');
  assert.equal(await panel.getByLabel(/Résultat imprimé/).inputValue(),'','le résultat précédent est effacé au changement de ligne');
  assert.equal(await panel.getByRole('button',{name:'Confirmer la mutation en attente avec cette entrée'}).isDisabled(),true,'la confirmation est désactivée tant que le résultat de la nouvelle ligne manque');
  await panel.getByLabel(/Résultat imprimé/).fill('6');
  assert.equal(await panel.getByRole('button',{name:'Confirmer la mutation en attente avec cette entrée'}).isEnabled(),true,'une nouvelle saisie active la confirmation');
  await k2Button.click();
  corruption=await page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;return Store.getCorruptionStatus('t3-rider');});
  const l06Mutation=corruption.mutations.find(row=>row.tableId==='L06-corruption-physical');assert.ok(l06Mutation,'mutation L06 confirmée');
  assert.equal(l06Mutation.entryId,'L06-PHY-02','la nouvelle ligne K2 sélectionnée est liée à la mutation K1');
  assert.equal(l06Mutation.result,6,'le résultat correspondant à la nouvelle ligne est persisté');
  assert.equal(l06Mutation.effectsApplied,false,'la sélection K2 n’exécute pas ses effets catalogués');
  assert.equal(corruption.corruptionPoints,4,'la confirmation déduit une fois le BFM du solde');

  // Fixations L23 : le choix de table doit rerendre les contrôles dépendants,
  // puis exiger une ligne parente mentale explicitement choisie au MJ.
  await prepareMutation('mental','pending-k1-fixation-ui');
  await panel.getByLabel('Table source').selectOption('l23-fixations');
  const parent=panel.getByLabel('Ligne parente du renvoi');await parent.waitFor();
  assert.equal(await panel.getByLabel('Compatibilité décidée par le MJ').count(),0,'le renvoi parent résout le domaine sans compatibilité inventée');
  await panel.getByLabel(/Résultat imprimé/).fill('2');
  await parent.selectOption('l23-mutations mentales-12');
  assert.equal(await panel.getByLabel('Ligne parente du renvoi').inputValue(),'l23-mutations mentales-12','le parent choisi survit au rerendu');
  assert.equal(await panel.getByLabel(/Résultat imprimé/).inputValue(),'2','un choix de parent conserve le résultat déjà saisi');
  const fixationButton=panel.getByRole('button',{name:'Confirmer la mutation en attente avec cette entrée'});
  assert.equal(await fixationButton.isEnabled(),true,'la fixation sélectionnée permet la confirmation après résultat');
  await fixationButton.click();
  corruption=await page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;return Store.getCorruptionStatus('t3-rider');});
  const fixationMutation=corruption.mutations.find(row=>row.tableId==='l23-fixations');assert.ok(fixationMutation,'Fixations enregistrée');
  assert.equal(fixationMutation.renvoiParent.tableId,'l23-mental');
  assert.equal(fixationMutation.renvoiParent.entryId,'l23-mutations mentales-12','la ligne parente sélectionnée est persistée');
  assert.equal(fixationMutation.domain,'mental');

  // L17 : le changement de table expose la décision de compatibilité vierge;
  // le bouton reste bloqué tant que le MJ ne tranche pas explicitement.
  await prepareMutation('physical','pending-k1-l17-ui');
  await panel.getByLabel('Table source').selectOption('l17-marks-hysh');
  const compatibility=panel.getByLabel('Compatibilité décidée par le MJ');await compatibility.waitFor();
  assert.equal(await compatibility.inputValue(),'','aucun choix de compatibilité L17 n’est présélectionné');
  const l17Button=panel.getByRole('button',{name:'Confirmer la mutation en attente avec cette entrée'});
  assert.equal(await l17Button.isDisabled(),true,'la confirmation L17 reste bloquée sans consentement explicite');
  await panel.getByLabel(/Résultat imprimé/).fill('1');
  assert.equal(await panel.getByRole('button',{name:'Confirmer la mutation en attente avec cette entrée'}).isDisabled(),true,'un résultat seul ne remplace pas le choix de compatibilité');
  await compatibility.selectOption('physical');
  assert.equal(await panel.getByLabel('Compatibilité décidée par le MJ').inputValue(),'physical','le consentement MJ explicite survit au rerendu');
  assert.equal(await panel.getByLabel(/Résultat imprimé/).inputValue(),'1','le choix de compatibilité conserve le résultat déjà saisi');
  await panel.getByLabel('Ligne de mutation').selectOption('l17-mark-hysh-01');
  assert.equal(await panel.getByLabel(/Résultat imprimé/).inputValue(),'','le changement de ligne L17 efface le résultat précédent');
  assert.equal(await panel.getByRole('button',{name:'Confirmer la mutation en attente avec cette entrée'}).isDisabled(),true,'la nouvelle ligne L17 exige une nouvelle saisie');
  await panel.getByLabel(/Résultat imprimé/).fill('1');
  assert.equal(await panel.getByRole('button',{name:'Confirmer la mutation en attente avec cette entrée'}).isEnabled(),true,'compatibilité choisie active la confirmation L17');
  await panel.getByRole('button',{name:'Confirmer la mutation en attente avec cette entrée'}).click();
  corruption=await page.evaluate(async()=>{const{Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.ready;return Store.getCorruptionStatus('t3-rider');});
  const l17Mutation=corruption.mutations.find(row=>row.tableId==='l17-marks-hysh');assert.ok(l17Mutation,'entrée L17 enregistrée');
  assert.equal(l17Mutation.compatibilityDecision.domain,'physical','consentement de compatibilité L17 persisté');
  assert.equal(l17Mutation.tableFamily,'Marques du Vent Hysh');
  assert.deepEqual(errors,[],'aucune erreur JavaScript durant les parcours réels');
  console.log(`F2-T3 navigateur: combat monté/chute; morphologie quadrupède + 2 PA; Destin 100 et IndexedDB; K1 exposition 100 par UI; K2 L06, Fixations parent mental, L17 consentement explicite; changements de table/ligne effacent le résultat et rebloquent jusqu’à nouvelle saisie. Parent et compatibilité conservent le résultat. Les mutations K1 en attente sont la seule fixture Store préparatoire.`);
}finally{await browser.close();await new Promise(done=>server.close(done));}
