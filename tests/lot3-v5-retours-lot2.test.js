import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../js/core/store.js';
import {magicGrantedActions} from '../js/core/v5-magic-combat.js';
import {createCombatEngine} from '../js/core/combat.js';
import {sourceCases,fixture,execute,spellInput,contractFor} from './helpers/lot3-arcane-fixture.js';
import {encounter,subject,endTurn,level,cast} from './helpers/lot3-domain-fixture.js';
const rowFor=name=>sourceCases.find(r=>r[0]===name);
test('Retours Lot 2 D3 : catégorie calculable par véritable aperçu sans fait, jamais par déclaration mjInput',async()=>{
 const names=['Arrow Shield','Dome','Teleport','Eavesdrop','Light','Magic Flame','Marsh Lights','Sounds','Chain Attack'];
 for(const name of names){const row=rowFor(name),{store}=await fixture(row),c=contractFor(name),input=spellInput(row,{domainFacts:{},targetTests:{},mjChoice:undefined,mjDuration:undefined,willpowerSuccess:undefined});const p=store.previewSpellExecution(c.id,input);assert.equal(p.ready,true,c.name+' : '+p.error);}
 const push=contractFor('Push'),distract=contractFor('Distracting');assert.ok(!push.effects.facts?.some(f=>f.key==='collisionDeclared'));assert.ok(!distract.effects.facts?.some(f=>f.key==='nearbyDeclared'));
});
test('Retours Lot 2 D2/D3 — V5 p. 301 : arme unique, score réellement lu sur la fiche, aperçu du modèle',async()=>{
 const row=rowFor('Aethyric Arms'),{store}=await fixture(row);await store.updateParticipant('mage',{skills:[...subject(store,'mage').skills,{name:'Corps à corps (Base)',total:55}]});
 const input=spellInput(row);delete input.domainFacts.weaponSkillScore;const p=store.previewSpellExecution(contractFor(row[0]).id,input);assert.equal(p.ready,true,p.error);await store.applySpellExecution(contractFor(row[0]).id,input);const mage=subject(store,'mage'),weapons=[...mage.actions,...magicGrantedActions(mage)].filter(a=>a.note?.includes('aethyrique'));assert.equal(weapons.length,1);assert.equal(weapons[0].base,55);assert.ok(p.targetResults[0].actions.some(a=>a.kind==='conjured-weapon'&&a.summary.includes('Épée')));
});
test('Retours Lot 2 D4 — V5 p. 255 : invisibilité finit aussi sur Choc/Éblouissant/Enchevêtrement/Sommeil/Chute',async()=>{
 for(const name of ['Shock','Dazzle','Entangle','Sleep','Drop']){const {store}=await fixture(rowFor(name));await cast(store,contractFor('Shroud of Invisibility'),{targetIds:['mage']});await execute(store,rowFor(name),{sl:12,roll:undefined});assert.ok(!subject(store,'mage').extensions.v5.spellEffects.some(e=>e.specialState?.invisible),name);}
});
test('Retours Lot 2 D5 — V5 p. 245 : zone maximale de Poussée ne se surpuissante pas',()=>assert.ok(!contractFor('Push').overcast.options.includes('aoe')));
test('Retours Lot 2 mutations — V5 p. 243 : Chaîne, égalité B=BE arrête, BFM rebonds, distance exacte et motif',async()=>{
 const row=rowFor('Chain Attack'),{store}=await encounter({foe:{caracs:{E:50},armor:{head:0,body:0,arms:0,legs:0}}});
 const p=await execute(store,row,{targetIds:['foe','mage'],targetTests:{mage:{nearest:true,distance:6}}});assert.equal(p.targetResults[0].woundsLost,5);assert.equal(p.targetResults[1].woundsLost,0);assert.match(p.targetResults[1].actions[0].summary,/Blessures.*5.*BE.*5/);
 const enough=await encounter({foe:{caracs:{E:0},armor:{head:0,body:0,arms:0,legs:0}}});const outside=spellInput(row,{targetIds:['foe','mage'],targetTests:{mage:{nearest:true,distance:6.01}}});assert.equal(enough.store.previewSpellExecution(contractFor(row[0]).id,outside).ready,false);
});
test('Retours Lot 2 mutations — V5 p. 242 : Source, quantités exactes à chaque vrai Round, plafond BI',async()=>{
 const row=rowFor('Spring'),{store,engine}=await fixture(row);await execute(store,row);const amounts=[];
 for(let r=1;r<=6;r++){await endTurn(engine);await endTurn(engine);const log=store.getLog().find(l=>l.detail?.quantity!==undefined);assert.ok(log,'reçu quantifié structuré');amounts.push(log.detail.quantity);}
 assert.deepEqual(amounts,[1,2,3,4,5,5]);
});
test('Retours Lot 2 D7 : apply/Undo/reload conserve exactement les alias de couches magiques',async()=>{
 const {store,persistence}=await encounter();await store.applySpellEffects('mage',{durationRounds:5,apModifiers:{all:1}});await store.applySpellEffects('mage',{durationRounds:3,statModifiers:{CC:10}});await store.undo();const before=store.listParticipants(),reloaded=createStore({persistence});await reloaded.ready;assert.equal(before[0].extensions.v5.spellEffects.length,1);assert.deepEqual(before[0].extensions.spellEffects,before[0].extensions.v5.spellEffects);assert.deepEqual(reloaded.listParticipants(),before);
});
test('Retours Lot 2 — V5 p. 131 : Souffle CT raté touche quand Esquive est pire, égalité au tireur',async()=>{
 const {store}=await fixture(rowFor('Breath'));const p=await execute(store,rowFor('Breath'),{ctRoll:95,targetTests:{foe:{distance:10,dodgeRoll:95}}});assert.equal(p.targetResults[0].breath.shot.success,false);assert.equal(p.targetResults[0].breath.shot.sl,p.targetResults[0].breath.defended.sl);assert.equal(subject(store,'foe').hp,35);
});
test('Retours Lot 2 D6 — V5 p. 243 : froid, prochain Round automatique en dernier, ordre courant préservé et défense +1',async()=>{
 const {store}=await fixture(rowFor('Breath'));const state=JSON.parse(store.getFullJSON());const third={...structuredClone(subject(store,'foe')),id:'third',name:'Third',initiative:10};state.combat.participants.push(third);state.combat.order=['mage','foe','third'];state.combat.orderMode='automatic';delete state.activeScene;await store.loadFromJSON(state);await store.updateParticipant('mage',{talents:[{id:'talent-arcane-magic',status:'resolved',specialization:'Bêtes',rank:1}]});
 await execute(store,rowFor('Breath'),{chosenLore:'beasts'});const p=store.previewResolution({actorId:'foe',targetId:'mage',action:{type:'attack',attr:'CC',base:50,damage:3},roll:25,defense:{attr:'CC',base:50,roll:25,v5:{kind:'melee',choice:'keep'}},v5:{kind:'melee',choice:'keep',actorSize:3,targetSize:3}});
 const modifiers=JSON.stringify(p);assert.match(modifiers,/spell-cold-defense/);assert.match(modifiers,/Défense contre le Souffle froid[^}]*"amount":1/);
 const engine=createCombatEngine(store);await endTurn(engine);assert.equal(store.getCombat().currentActorId,'foe');await endTurn(engine);assert.equal(store.getCombat().currentActorId,'third');await endTurn(engine);assert.deepEqual(store.getCombat().order,['mage','third','foe']);
 assert.deepEqual(store.getEffectiveOrder(),['mage','third','foe'],'ordre visible = moteur');
});
test('Retours Lot 2 mutations — V5 p. 243 : Chaîne exactement six rebonds, septième refusé ; 6m admis, 6.01m refusé',async()=>{
 const row=rowFor('Chain Attack'),{store}=await fixture(row);const state=JSON.parse(store.getFullJSON()),template=structuredClone(subject(store,'foe'));state.combat.participants=state.combat.participants.slice(0,1);const ids=[];
 for(let n=0;n<8;n++){const id='chain-'+n;ids.push(id);state.combat.participants.push({...structuredClone(template),id,name:id,caracs:{...template.caracs,E:0},armor:{head:0,body:0,arms:0,legs:0},armorLocations:{head:0,body:0,rightArm:0,leftArm:0,rightLeg:0,leftLeg:0}});}state.combat.order=['mage',...ids];delete state.activeScene;await store.loadFromJSON(state);
 const p=await execute(store,row,{targetIds:ids,targetTests:Object.fromEntries(ids.map(id=>[id,{nearest:true,distance:6}]))});assert.deepEqual(p.targetResults.map(r=>r.woundsLost),[10,9,8,7,6,5,4,0]);assert.match(p.targetResults[7].actions[0].summary,/limite de 6 rebonds/);
});
