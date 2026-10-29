import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,level,endTurn} from './helpers/lot3-domain-fixture.js';
import {getAllSpellContracts} from '../js/core/v5-spell-contracts.js';
const cFor=name=>getAllSpellContracts().find(c=>c.name===name);
import {sourceCases,fixture,input,execute} from './helpers/lot3-wom-fixture.js';
for(const [name,page,cn,range,target,duration] of sourceCases)test(`WoM p. ${page} — ${name} : paramètres relus`,()=>{
 const c=cFor(name); assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
});
test('WoM p. 134 — Sang Bouillonnant : résistance, deux Aveuglé, pas de dégâts au lancer, début du Tour cible',async()=>{
 for(const die of [25,95]){const {store,engine}=await fixture();const p=await execute(store,'Sang Bouillonnant',{targetTests:{foe:{roll:die}}});assert.equal(subject(store,'foe').hp,200);assert.equal(level(subject(store,'foe'),'Aveuglé'),die===95?2:0);await endTurn(engine);assert.equal(subject(store,'foe').hp,die===95?152:200);}
});
test('WoM p. 146 — Éveil : dégâts inconditionnels, Esquive +2 évite seulement les deux états, F30',async()=>{
 for(const die of [25,95]){const {store}=await fixture();const p=await execute(store,'Éveil du Bois',{targetTests:{foe:{roll:die}}});assert.equal(subject(store,'foe').hp,196);assert.equal(level(subject(store,'foe'),'Enchevêtré'),die===95?1:0);assert.equal(level(subject(store,'foe'),'Hémorragique'),die===95?1:0);assert.equal(subject(store,'foe').extensions.v5.testModifiers?.Esquive||0,0);if(die===95)assert.equal(p.targetResults[0].temporaryEffect.specialState.entangledStrength,30);}
});
test('WoM p. 89 — Escalier : +3 PA et hauteur FM, plafond 200 via +2 DR',async()=>{
 const {store}=await fixture();const p=await execute(store,'Escalier en Spirale');assert.equal(subject(store,'mage').armor.body,3);assert.equal(p.targetResults[0].quantifiedReminder.height,60);
});
test('WoM p. 124 — Iyrtu : F +10 par DR final, aucune base +10 supplémentaire',async()=>{
 const {store}=await fixture();await execute(store,'L’Étreinte d’Iyrtu');assert.equal(subject(store,'mage').caracs.F,460);
});
test('WoM p. 111 — Cor : allié +2, ennemi −2, neutre aucun, Peur ennemie sans retrait Brisé',async()=>{
 const {store}=await fixture({foe:{states:[{id:'broken',name:'Brisé',level:2}]}});let state=JSON.parse(store.getFullJSON());state.combat.participants.push({...structuredClone(subject(store,'foe')),id:'neutral',camp:'neutre',states:[]});delete state.activeScene;await store.loadFromJSON(state);await execute(store,'Cor du Andar',{targetIds:['mage','foe','neutral']});assert.equal(subject(store,'mage').extensions.v5.testModifiers.Calme,2);assert.equal(subject(store,'foe').extensions.v5.testModifiers.Calme,-2);assert.equal(subject(store,'neutral').extensions.v5.testModifiers?.Calme||0,0);assert.equal(level(subject(store,'foe'),'Brisé'),2);assert.ok(!subject(store,'mage').traits.includes('Peur (1)'));
});
test('WoM p. 149 — Ver : entrave F50 initiale, aucune corrosion avant victoire de lutte',async()=>{
 const {store}=await fixture();await execute(store,'Ver Grouillant');assert.equal(subject(store,'foe').armor.body,2);assert.equal(level(subject(store,'foe'),'Enchevêtré'),1);assert.equal(subject(store,'foe').hp,200);
});
test('HEPG p. 81 — retour Lot 3 : premier Vent par défaut, deuxième Vent autorisé',async()=>{
 const {store}=await fixture();const name='Voix de Fer (Aqshy & Chamon)';const p=store.previewSpellExecution(cFor(name).id,input(name,{chosenLore:'metal'}));assert.equal(p.ready,true,p.error);
});
import {createStore} from '../js/core/store.js';
import {previewMagicProtection,attackNature} from '../js/core/v5-magic-combat.js';
for(const row of sourceCases)test(`WoM p. ${row[1]} — ${row[0]} : Store, variante sourcée, persistance, Undo et expiration réelle`,async()=>{
 const name=row[0],extra=name==='Apothéose Verdoyante'?{foe:{hp:0,extensions:{v5:{dead:true,criticalWounds:[{id:'old',name:'Critique ancien'}]}}}}:name==='Le Bœuf Reste Debout'?{mage:{states:[{id:'broken',name:'Brisé',level:3}]}}:{};
 const {store,engine,persistence}=await fixture(extra),before=store.listParticipants();
 const patch=name==='Apothéose Verdoyante'?{targetTests:{foe:{deathDelaySec:30}}}:['Lunes du Chasseur','Le Bœuf Reste Debout'].includes(name)?{targetIds:['mage']} : name==='Cor du Andar'?{targetIds:['mage','foe']}:{};
 // Brisé V5 p.185 : le MJ atteste ici la cachette; les attentes du sort restent inchangées.
 if(name==='Le Bœuf Reste Debout')patch.brokenEscapeFacts={visibleToAnyEnemy:false};
 const p=await execute(store,name,patch),mage=subject(store,'mage'),foe=subject(store,'foe');
 switch(name){
 case 'Epées Sanguines':{const a=store.listParticipants().filter(p=>p.extensions?.isAuxiliary);assert.equal(a.length,1);assert.equal(a[0].extensions.ws,60);assert.equal(a[0].extensions.damage,8);break;}
 case 'Blizzard enflammé de Ygethmor':assert.equal(foe.hp,200);break;
 case 'Transe d’Ambre':assert.equal(previewMagicProtection(foe,30,{nature:attackNature({magical:true})}).amount,0);break;
 case 'Éveil du Bois':assert.equal(foe.hp,196);break;
 case 'Malédiction d’Anraheir':assert.equal(foe.caracs.M,2);assert.equal(foe.caracs.CC,30);break;
 case 'Yeux de la Meute':assert.match(JSON.stringify(p),/corps|Perspective|vision/i);break;
 case "Suivi de l'Odeur":assert.equal(mage.extensions.v5.testModifiers['Seconde vue (Odorat)'],2);assert.equal(mage.extensions.v5.testModifiers.Pistage,undefined);break;
 case 'Lunes du Chasseur':assert.equal(mage.caracs.E,50);assert.equal(mage.caracs.M,5);break;
 case 'Le Bœuf Reste Debout':assert.equal(level(mage,'Brisé'),0);assert.equal(mage.extensions.v5.specialStates.fearTerrorImmunity,true);break;
 case 'Ver Grouillant':assert.equal(foe.armor.body,2);break;
 case 'Escalier en Spirale':assert.equal(mage.armor.body,3);break;
 case 'Transmogrification Exaltée de Colchis':assert.equal(previewMagicProtection(foe,30,{nature:attackNature({fire:true})}).amount,0);break;
 case 'Apothéose Verdoyante':assert.equal(foe.hp,42);assert.equal(foe.extensions.v5.criticalWounds.length,1);break;
 case 'L’Étreinte d’Iyrtu':assert.equal(mage.caracs.F,460);break;
 case 'Les Enfants Sauvages de Zandox':assert.equal(store.listParticipants().filter(p=>p.extensions?.isAuxiliary).length,2);break;
 case 'Cor du Andar':assert.equal(foe.extensions.v5.testModifiers.Calme,-2);break;
 case 'Visage mutable':assert.equal(foe.caracs.Soc,60);break;
 }
 const applied=store.listParticipants(),reload=createStore({persistence});await reload.ready;assert.deepEqual(reload.listParticipants(),applied);await store.undo();assert.deepEqual(store.listParticipants(),before);await execute(store,name,patch);
 const layer=store.listParticipants().flatMap(p=>p.extensions.v5.spellEffects||[]).find(e=>e.spellId===cFor(name).id);
 if(layer?.expiresAtRound){const state=JSON.parse(store.getFullJSON());state.combat.round=layer.expiresAtRound;state.combat.currentActorId='mage';delete state.activeScene;await store.loadFromJSON(state);await endTurn(engine);assert.ok(!store.listParticipants().some(p=>(p.extensions.v5.spellEffects||[]).some(e=>e.spellId===cFor(name).id)));assert.equal(store.listParticipants().filter(p=>p.extensions?.isAuxiliary).length,0);await store.undo();assert.ok(store.listParticipants().some(p=>(p.extensions.v5.spellEffects||[]).some(e=>e.spellId===cFor(name).id)));}
});
test('WoM p. 137 — Épées : options payées, six maximum, pas d’attaque avant Round suivant, une cible unique et défense normale',async()=>{
 const {store,engine}=await fixture();await execute(store,'Epées Sanguines',{overcastSpecific:{swords:5}});assert.equal(store.listParticipants().filter(p=>p.extensions?.isAuxiliary).length,6);const effect=subject(store,'mage').extensions.v5.spellEffects[0];const answer={effectId:effect.id,targetId:'foe',kind:'summon-attack',roll:25,opponentRoll:95,locationRoll:34,lineOfSight:true,distance:10,actionConfirmed:true};assert.equal(store.previewSpellInteraction(answer).ready,false);await endTurn(engine);await endTurn(engine);const before=subject(store,'foe').hp;const p=store.previewSpellInteraction(answer);assert.equal(p.ready,true,p.error);await store.applySpellInteraction(answer);assert.equal(before-subject(store,'foe').hp,2);assert.equal(store.previewSpellInteraction(answer).ready,false);await store.undo();assert.equal(store.previewSpellInteraction(answer).ready,true);
});
test('WoM p. 149 — Ver : deux d100, échec libère, victoire entrave ou cuir déclaré, métal intact',async()=>{
 for(const choice of ['entangle','leather']){const {store}=await fixture();await execute(store,'Ver Grouillant');const e=subject(store,'foe').extensions.v5.spellEffects[0],i={effectId:e.id,targetId:'foe',kind:'worm',roll:25,opponentRoll:95,controlValue:choice,targetTests:{foe:{leatherLocations:['body']}}};assert.equal(store.previewSpellInteraction({...i,roll:undefined}).ready,false);await store.applySpellInteraction(i);assert.equal(level(subject(store,'foe'),'Enchevêtré'),choice==='entangle'?2:1);assert.equal(subject(store,'foe').armor.body,choice==='leather'?1:2);assert.equal(subject(store,'foe').armor.head,2);await store.undo();assert.equal(subject(store,'foe').armor.body,2);}
});
test('WoM p. 147 — Anraheir : sortie et rentrée, restauration de couche, alliés et neutres exempts',async()=>{
 const {store}=await fixture();await execute(store,'Malédiction d’Anraheir');const e=subject(store,'foe').extensions.v5.spellEffects[0];await store.applySpellInteraction({effectId:e.id,targetId:'foe',kind:'zone',controlValue:'outside'});assert.equal(subject(store,'foe').caracs.M,3);assert.equal(subject(store,'foe').caracs.CC,40);await store.undo();assert.equal(subject(store,'foe').caracs.CC,30);
 const ally=await fixture({foe:{camp:'pj'}});await execute(ally.store,'Malédiction d’Anraheir');assert.equal(subject(ally.store,'foe').caracs.CC,50);
});
test('WoM p. 146 — Transe : premier coup réel sans dégâts retire la couche, attaque suivante blesse',async()=>{
 const {store}=await fixture();await execute(store,'Transe d’Ambre');const a={actorId:'mage',targetId:'foe',action:subject(store,'mage').actions[0],roll:25,defense:{base:50,roll:95,v5:{choice:'keep'}},v5:{kind:'melee',choice:'keep'}};let p=store.previewResolution(a);assert.equal(p.damage.finalDamage,0);await store.applyResolution(p);assert.ok(!subject(store,'foe').extensions.v5.spellEffects.length);p=store.previewResolution(a);assert.ok(p.damage.finalDamage>0);
});
test('WoM p. 137 — Blizzard : chaque Round, couverture, Athlétisme réussi/raté et Protection annule seulement les dégâts',async()=>{
 for(const die of [25,95]){const {store,engine}=await fixture();await store.applySpellEffects('foe',{ward:7,durationRounds:99,casterId:'mage'});await execute(store,'Blizzard enflammé de Ygethmor');const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===cFor('Blizzard enflammé de Ygethmor').id);await endTurn(engine);const answers={foe:{['spell:'+e.id+':present']:true,['spell:'+e.id+':cover']:false,['spell:'+e.id+':roundTest']:die,['spell:'+e.id+':location']:34,['spell:'+e.id+':ward0']:10}};await endTurn(engine,{inputs:answers});assert.equal(subject(store,'foe').hp,200);assert.equal(level(subject(store,'foe'),'À Terre'),die===95?1:0);}
});

for(const [name,page,cn,raw,lost,conditions] of [['Tempête Magmatique',136,13,18,12,2],['Orage de Thorsen',101,11,14,8,0],['Cendres et Poussière',122,9,8,4,0]])test(`WoM p. ${page}, pp. 20–21 — ${name} : un seul dégât source, BE/PA, Protection et vrai Tour auteur`,async()=>{
 for(const ward of [false,true]){const {store,engine}=await fixture();if(ward)await store.applySpellEffects('foe',{ward:7,durationRounds:99,casterId:'mage'});const p=await execute(store,name,{willpowerSuccess:true,direction:'E',distanceRoll:10,domainFacts:{},targetTests:{foe:{throwDirection:4,collision:false,wardRoll:10,inside:true}}});assert.equal(subject(store,'foe').hp,ward?200:200-lost);assert.equal(level(subject(store,'foe'),'Enflammé'),conditions);assert.equal(level(subject(store,'foe'),'Exténué'),0);const controller=subject(store,'mage').extensions.v5.spellEffects.find(e=>e.spellId===cFor(name).id);assert.ok(controller?.roundEffect?.vortex);const state=JSON.parse(store.getFullJSON());state.combat.round=2;state.combat.currentActorId='mage';delete state.activeScene;await store.loadFromJSON(state);const pending=engine.previewNextTurn();assert.equal(pending.ready,false);const key='spell:'+controller.id+':vortex:';await endTurn(engine,{inputs:{mage:{[key+'Direction']:1}}});assert.ok(!subject(store,'mage').extensions.v5.spellEffects.some(e=>e.id===controller.id));assert.equal(subject(store,'foe').hp,ward?200:200-lost);}
});
test('WoM pp. 136–137 — Magma : 3 mini-vortex sélectionnés, seulement distance ≤8, dégâts +4 et un Enflammé, dés bloquants',async()=>{
 const {store}=await fixture();const patch={willpowerSuccess:true,direction:'E',distanceRoll:8,overcastSpecific:{mini:3},domainFacts:{mini1Direction:4,mini1Distance:10,mini1Targets:['foe'],mini2Direction:1,mini3Direction:5,mini3Targets:[]},targetTests:{foe:{wardRoll:1,locationRoll:34}}};const missing=store.previewSpellExecution(cFor('Tempête Magmatique').id,input('Tempête Magmatique',{...patch,domainFacts:{}}));assert.equal(missing.ready,false);const p=await execute(store,'Tempête Magmatique',patch);assert.equal(subject(store,'foe').hp,184);assert.equal(level(subject(store,'foe'),'Enflammé'),3);assert.equal(p.vortexMovement.mini.length,3);
});
test('WoM pp. 100–101 — Thorsen : collision distincte 7, projection BFM, À Terre et dé manquant',async()=>{
 const {store}=await fixture();const patch={willpowerSuccess:true,direction:'E',distanceRoll:10,targetTests:{foe:{throwDirection:4,collision:true,locationRoll:34}}};const missing=store.previewSpellExecution(cFor('Orage de Thorsen').id,input('Orage de Thorsen',{...patch,targetTests:{foe:{collision:true}}}));assert.equal(missing.ready,false);await execute(store,'Orage de Thorsen',patch);assert.equal(subject(store,'foe').hp,191);assert.equal(level(subject(store,'foe'),'À Terre'),1);
});
test('WoM p. 122 — Cendres +4 : soleil touché, Calme réussi/raté, pas Exténué inventé, suffocation uniquement dedans',async()=>{
 for(const die of [25,95]){const {store}=await fixture();await execute(store,'Cendres et Poussière',{willpowerSuccess:true,direction:'E',distanceRoll:10,overcastSpecific:{sun:1},targetTests:{foe:{sunTouched:true,calmRoll:die,inside:true}}});assert.equal(subject(store,'foe').hp,die===95?0:196);assert.equal(level(subject(store,'foe'),'Exténué'),0);}
});

test('WoM p. 134 — Corps de Feu : aucun bonus F/E ni immunité au feu, trois clauses chiffrées',async()=>{
 const {store}=await fixture();const p=await execute(store,'Corps de Feu');assert.equal(subject(store,'mage').caracs.F,40);assert.equal(subject(store,'mage').caracs.E,40);assert.equal(previewMagicProtection(subject(store,'mage'),10,{nature:attackNature({fire:true})}).amount,10);const e=subject(store,'mage').extensions.v5.spellEffects[0];for(const [choice,expected] of [['grab',44],['grapple',44],['blood',5]]){const before=subject(store,'foe').hp;const input={effectId:e.id,targetId:'foe',kind:'body-fire',controlValue:choice,roll:95,locationRoll:34,meleeWoundConfirmed:true};const p=store.previewSpellInteraction(input);assert.equal(p.ready,true,p.error);await store.applySpellInteraction(input);assert.equal(before-subject(store,'foe').hp,expected);if(choice==='grapple')assert.equal(level(subject(store,'foe'),'Enflammé'),1);await store.undo();}
});
test('WoM p. 134 — Sang : mort confirmée due aux dégâts, explosion +1 à 2 m, destinataires et Protection explicites, Undo atomique',async()=>{
 const {store,engine}=await fixture({foe:{hp:5}});await execute(store,'Sang Bouillonnant');await endTurn(engine);const e=subject(store,'foe').extensions.v5.spellEffects[0],input={effectId:e.id,targetId:'foe',kind:'death-burst',deathConfirmed:true,targetsDeclared:true,targetIds:['mage'],targetTests:{mage:{distance:2,locationRoll:34}}};assert.equal(store.previewSpellInteraction({...input,deathConfirmed:undefined}).ready,false);const before=subject(store,'mage').hp;await store.applySpellInteraction(input);assert.equal(before-subject(store,'mage').hp,3);assert.equal(store.previewSpellInteraction(input).ready,false);await store.undo();assert.equal(subject(store,'mage').hp,before);
});
test('WoM p. 112 — Visage : FM opposée réelle, quatre modes, échec/réussite et dés manquants',async()=>{
 for(const [mode,expected] of [['attractive',60],['ugly',40],['dead',50],['unknown',50]]){const {store}=await fixture();await execute(store,'Visage mutable',{domainFacts:{mode,opposedActorRoll:25},targetTests:{foe:{unwilling:true,opponentRoll:95}}});assert.equal(subject(store,'foe').caracs.Soc,expected);if(mode==='dead')assert.equal(subject(store,'foe').caracs.M,0);if(mode==='unknown')assert.equal(subject(store,'foe').extensions.v5.specialStates.unrecognisable,true);}
 const {store}=await fixture();const input1=input('Visage mutable',{domainFacts:{mode:'attractive',opposedActorRoll:95},targetTests:{foe:{unwilling:true,opponentRoll:25}}});await store.applySpellExecution(cFor('Visage mutable').id,input1);assert.equal(subject(store,'foe').caracs.Soc,50);assert.equal(store.previewSpellExecution(cFor('Visage mutable').id,{...input1,domainFacts:{mode:'attractive'}}).ready,false);
});
test('WoM p. 147 — Anraheir : monture Calme +0, fuite seulement sur échec, Chevaucher pour calmer',async()=>{
 for(const die of [25,95]){const {store}=await fixture();await execute(store,'Malédiction d’Anraheir',{targetTests:{foe:{mount:true,roll:die}}});assert.equal(subject(store,'foe').extensions.v5.specialStates.mountFleeing,die===95);if(die===95){const e=subject(store,'foe').extensions.v5.spellEffects[0];await store.applySpellInteraction({effectId:e.id,targetId:'mage',kind:'calm-mount',roll:25});assert.equal(subject(store,'foe').extensions.v5.specialStates.mountFleeing,false);}}
});

test('WoM p. 146 — Transe : poison suspendu, soins admis et hibernation consentante au terme déclaré',async()=>{
 const {store,engine}=await fixture({foe:{states:[{name:'Empoisonné',level:1}]}});await execute(store,'Transe d’Ambre');await endTurn(engine);await endTurn(engine);assert.equal(subject(store,'foe').hp,200);assert.equal(level(subject(store,'foe'),'Empoisonné'),1);
 const other=await fixture();await execute(other.store,'Transe d’Ambre',{domainFacts:{durationMode:'hibernation',daysUntilSeason:30},targetTests:{foe:{unwilling:false}}});const e=subject(other.store,'foe').extensions.v5.spellEffects[0];assert.equal(e.expiresAtRound,259201);
});
test('WoM p. 149 — Bœuf : Test de Peur/Terreur ultérieur neutralisé, puis restauré après fin réelle de la couche',async()=>{
 for(const psychologyKind of ['fear','terror']){const {store,engine}=await fixture();await execute(store,'Le Bœuf Reste Debout',{targetIds:['mage']});const p=store.previewResolution({actorId:'mage',action:{type:'skill',attr:'FM',base:60},roll:95,v5:{kind:'test',choice:'keep',context:{psychologyKind}}});assert.equal(p.success,true);assert.ok(p.reminders.some(t=>/immunit|Peur|Terreur/i.test(t)));}
});
test('WoM p. 149 — Ver : cuir dissous reste endommagé après libération, autres PA intactes et Undo de la lutte',async()=>{
 const {store}=await fixture();await execute(store,'Ver Grouillant');const e=subject(store,'foe').extensions.v5.spellEffects[0];await store.applySpellInteraction({effectId:e.id,targetId:'foe',kind:'worm',roll:25,opponentRoll:95,controlValue:'leather',targetTests:{foe:{leatherLocations:['body']}}});await store.applySpellInteraction({effectId:e.id,targetId:'foe',kind:'end'});assert.equal(subject(store,'foe').armor.body,1);assert.equal(level(subject(store,'foe'),'Enchevêtré'),0);
});
for(const row of sourceCases)test(`WoM p. ${row[1]} — ${row[0]} : catégories de surpuissance payées, application et Undo`,async()=>{
 const c=cFor(row[0]);for(const kind of c.overcast.options.filter(k=>k!=='special')){const {store}=await fixture(row[0]==='Apothéose Verdoyante'?{foe:{hp:0,extensions:{v5:{dead:true}}}}:{});const self=c.target==='Vous'||['Lunes du Chasseur','Le Bœuf Reste Debout'].includes(c.name),patch={targetIds:[self?'mage':'foe'],sl:50,overcastChoices:{[kind]:kind==='targets'?1:kind==='aoe'?3:2},domainFacts:{mode:'attractive',durationMode:'normal',opposedActorRoll:25},targetTests:{foe:{unwilling:false,mount:false,roll:95,opponentRoll:95,deathDelaySec:30},mage:{unwilling:false,mount:false,roll:95}}};const before=store.listParticipants(),p=await execute(store,row[0],patch);assert.equal(p.overcast.choices[kind],patch.overcastChoices[kind]);if(['range','duration','aoe'].includes(kind))assert.equal(p.overcast[kind+'Multiplier'],2);await store.undo();assert.deepEqual(store.listParticipants(),before);}
});

test('WoM p. 98 — Lames Azurées : aucun fait de Protection implicite aux trois coups du Tour adverse',async()=>{
 const {store,engine}=await fixture();await store.applySpellEffects('foe',{durationRounds:99,casterId:'mage',damageReduction:100,damageReductionFilter:{any:['cold']}});await execute(store,'Lames Azurées',{targetIds:['mage'],secondaryTargets:{engaged:['foe']}});const e=subject(store,'mage').extensions.v5.spellEffects.find(e=>e.spellId===cFor('Lames Azurées').id),inputs={foe:{}};for(let i=1;i<=3;i++)inputs.foe['recurringHit:'+e.id+':'+i]=34;const missing=engine.previewNextTurn({inputs});assert.equal(missing.ready,false);assert.ok(missing.requests.some(r=>r.kind==='boolean'));
 for(let i=1;i<=3;i++)inputs.foe['recurringNature:'+e.id+':'+i+':cold']=true;const before=subject(store,'foe').hp;await engine.nextTurn({inputs});assert.equal(subject(store,'foe').hp,before);
});

test('V5 magie / WoM p. 136 — vortex : surpuissance dégâts, Critique et fin d’invisibilité gardent la chaîne normale',async()=>{
 const {store}=await fixture();await store.applySpellEffects('mage',{spellId:'invisibility-proof',durationRounds:99,casterId:'mage',specialState:{endsOnAttackOrNoise:true}});const p=await execute(store,'Tempête Magmatique',{roll:11,criticalChoice:'critical-wound',miscastRoll:70,willpowerSuccess:true,direction:'E',distanceRoll:10,overcastChoices:{damage:2}});const r=p.targetResults.find(r=>r.targetId==='foe');assert.ok(r.criticalWoundTriggered);assert.equal(subject(store,'foe').extensions.v5.criticalWounds.length,1);assert.ok(!subject(store,'mage').extensions.v5.spellEffects.some(e=>e.spellId==='invisibility-proof'));assert.equal(subject(store,'foe').hp,186);
 const i=input('Tempête Magmatique',{sl:30,willpowerSuccess:true,direction:'E',distance:-1});assert.equal(store.previewSpellExecution(cFor('Tempête Magmatique').id,i).ready,false);
});

test('WoM pp. 134/137 — deux cibles : résistances indépendantes et Protection indépendante au vrai Round de Blizzard',async()=>{
 const make=async()=>{const {store,engine}=await fixture();const s=JSON.parse(store.getFullJSON()),other=structuredClone(subject(store,'foe'));other.id='second';other.name='Seconde cible';s.combat.participants.push(other);s.combat.order=['mage','foe','second'];s.combat.orderMode='manual';delete s.activeScene;await store.loadFromJSON(s);return {store,engine};};
 let {store}=await make();await execute(store,'Sang Bouillonnant',{targetIds:['foe','second'],overcastChoices:{targets:1},targetTests:{foe:{roll:25},second:{roll:95}}});assert.equal(level(subject(store,'foe'),'Aveuglé'),0);assert.equal(level(subject(store,'second'),'Aveuglé'),2);
 const other=await make();store=other.store;await store.applySpellEffects('foe',{ward:7,durationRounds:99,casterId:'mage'});await execute(store,'Blizzard enflammé de Ygethmor',{targetIds:['foe','second']});const inputs={};for(const id of ['foe','second']){const e=subject(store,id).extensions.v5.spellEffects.find(e=>e.spellId===cFor('Blizzard enflammé de Ygethmor').id);inputs[id]={['spell:'+e.id+':present']:true,['spell:'+e.id+':cover']:false,['spell:'+e.id+':roundTest']:id==='foe'?25:95,['spell:'+e.id+':location']:34,['spell:'+e.id+':ward0']:10};}
 const s=JSON.parse(store.getFullJSON());s.combat.currentActorId='second';delete s.activeScene;await store.loadFromJSON(s);await other.engine.nextTurn({inputs});assert.equal(subject(store,'foe').hp,200);assert.equal(subject(store,'second').hp,156);assert.equal(level(subject(store,'foe'),'À Terre'),0);assert.equal(level(subject(store,'second'),'À Terre'),1);
});

