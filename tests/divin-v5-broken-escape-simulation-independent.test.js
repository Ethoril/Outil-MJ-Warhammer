import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../js/core/store.js';

function persistence(){let saved=null;return{async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};}
function actor(id,{camp='pj',state=false,initiative=60}={}){return{id,name:id,kind:'PJ',camp,zone:'active',initiative,hp:20,maxHp:30,caracs:{CC:45,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,arms:0,legs:0},states:state?[{id:'broken',key:'brise',name:'Brisé',level:1}]:[],traits:[],equipment:[],talents:[],skills:[{id:'athletics',name:'Athlétisme',carac:'Ag',status:'resolved',total:60}],actions:[{id:'blade',type:'attack',base:45,damage:3}],extensions:{v5:{divine:{sin:0}}}};}
const snapshot=store=>{const value=JSON.parse(store.getFullJSON());delete value.exportedAt;return value;};

test('Simulation indépendante — une seconde Action après Sprint hors vue est bloquée en preview, Test actionnel et commit',async()=>{
 const store=createStore({persistence:persistence(),storage:null});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','enemy'],participants:[actor('priest',{state:true}),actor('enemy',{camp:'ennemi',initiative:30})]},diceLines:[],log:[],extensions:{v5:{turnIndex:1,combatId:'broken-simulation-independent'}}});
 const flee=store.previewBrokenEscape({actorId:'priest',action:'flee',facts:{visibleToAnyEnemy:true,engagedEnemyIds:[],moveMode:'walk',visibleToAnyEnemyAfter:true}});
 assert.equal(flee.ready,true,flee.error);assert.equal((await store.applyBrokenEscape(flee))?.status,'applied');
 const sprint=store.previewBrokenEscape({actorId:'priest',action:'sprint',facts:{visibleToAnyEnemyAfter:false},roll:23});
 assert.equal(sprint.ready,true,sprint.error);assert.equal((await store.applyBrokenEscape(sprint))?.status,'applied');
 const before=snapshot(store);
 const freeTest=store.previewResolution({actorId:'priest',action:{id:'free-test',type:'skill',base:60,attr:'Ag'},roll:23,v5:{kind:'test',context:{isAction:false,runningOrHiding:false,involvesMovement:false,requiresSight:false,reliesOnSight:false}},brokenEscapeFacts:{visibleToAnyEnemy:false}});
 assert.equal(freeTest.ready,true,freeTest.error||JSON.stringify(freeTest));assert.deepEqual(snapshot(store),before,'un Test nonActionnel reste disponible et le preview reste pur');
 const actionTest=store.previewResolution({actorId:'priest',action:{id:'action-test',type:'skill',base:60,attr:'Ag'},roll:23,v5:{kind:'test',context:{isAction:true,runningOrHiding:false,involvesMovement:false,requiresSight:false,reliesOnSight:false}},brokenEscapeFacts:{visibleToAnyEnemy:false}});
 const simulation=store.simulateAction({v5:{kind:'ranged'},actorId:'priest',targetId:'enemy',action:{id:'blade',type:'attack',base:45,damage:3},roll:25,brokenEscapeFacts:{visibleToAnyEnemy:false}});
 let applied;try{applied=await store.applySimulation(simulation);}catch(error){applied={status:'rejected',reason:error?.message||String(error)};}
 const after=snapshot(store),failures=[];
 if(actionTest.ready!==false)failures.push('Test de Compétence explicitement actionnel accepté après que Sprint a consommé Action');
 if(simulation.ready!==false)failures.push('simulateAction accepte une nouvelle attaque Actionnelle après Sprint hors vue');
 if(applied?.status==='applied')failures.push('applySimulation applique effectivement une deuxième attaque Actionnelle');
 if(JSON.stringify(after)!==JSON.stringify(before))failures.push('la route Simulation a muté participants, journal ou quotas malgré la dépense du Tour');
 assert.deepEqual(failures,[],failures.join('; '));
});

async function afterSprint(){
 const store=createStore({persistence:persistence(),storage:null});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','enemy'],participants:[actor('priest',{state:true}),actor('enemy',{camp:'ennemi',initiative:30})]},diceLines:[],log:[],extensions:{v5:{turnIndex:1,combatId:'broken-simulation-reaction-independent'}}});
 const flee=store.previewBrokenEscape({actorId:'priest',action:'flee',facts:{visibleToAnyEnemy:true,engagedEnemyIds:[],moveMode:'walk',visibleToAnyEnemyAfter:true}});
 assert.equal(flee.ready,true,flee.error);assert.equal((await store.applyBrokenEscape(flee))?.status,'applied');
 const sprint=store.previewBrokenEscape({actorId:'priest',action:'sprint',facts:{visibleToAnyEnemyAfter:false},roll:23});
 assert.equal(sprint.ready,true,sprint.error);assert.equal((await store.applyBrokenEscape(sprint))?.status,'applied');
 return store;
}
function attackInput(extra={}){return{actorId:'priest',targetId:'enemy',action:{id:'blade',type:'attack',base:45,damage:3},roll:25,brokenEscapeFacts:{visibleToAnyEnemy:false},...extra};}

test('Simulation indépendante — aucune Action seconde ne passe par simulation/commit, même avec marqueurs de réaction forgés',async t=>{
 const cases=[
  ['attaque ordinaire',attackInput({v5:{kind:'ranged'}})],
  ['isReaction non validé',attackInput({v5:{kind:'ranged',context:{isReaction:true}}})],
  ['reactionId racine inventé',attackInput({reactionId:'invented-reaction',v5:{kind:'ranged'}})],
  ['reactionId V5 inventé',attackInput({v5:{kind:'ranged',reactionId:'invented-reaction'}})]
 ];
 for(const [label,input] of cases){await t.test(label,async()=>{
  const store=await afterSprint(),before=snapshot(store),simulation=store.simulateAction(input);
  let applied;try{applied=await store.applySimulation(simulation);}catch(error){applied={status:'rejected',reason:error?.message||String(error)};}
  const after=snapshot(store),failures=[];
  if(simulation.ready!==false)failures.push('simulateAction accepte une seconde Action après Sprint hors vue');
  if(applied?.status==='applied')failures.push('applySimulation applique une deuxième Action après Sprint hors vue');
  if(JSON.stringify(after)!==JSON.stringify(before))failures.push('la tentative modifie l’état malgré le quota Action consommé');
  assert.deepEqual(failures,[],`${label}: ${failures.join('; ')}`);
 });}
});

async function afterFleeHidden(){
 const store=createStore({persistence:persistence(),storage:null});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','enemy'],participants:[actor('priest',{state:true}),actor('enemy',{camp:'ennemi',initiative:30})]},diceLines:[],log:[],extensions:{v5:{turnIndex:1,combatId:'broken-simulation-classification'}}});
 const flee=store.previewBrokenEscape({actorId:'priest',action:'flee',facts:{visibleToAnyEnemy:true,engagedEnemyIds:[],moveMode:'walk',visibleToAnyEnemyAfter:false}});
 assert.equal(flee.ready,true,flee.error);assert.equal((await store.applyBrokenEscape(flee))?.status,'applied');return store;
}

test('Simulation indépendante — un Test de compétence ambigu sous Brisé exige sa classification avant et après Sprint',async t=>{
 const input=(context={runningOrHiding:false,involvesMovement:false})=>({actorId:'priest',action:{id:'generic-skill',type:'skill',base:60,attr:'Ag'},roll:23,v5:{kind:'test',context},brokenEscapeFacts:{visibleToAnyEnemy:false}});
 const store=await afterSprint(),before=snapshot(store),unknown=store.previewResolution(input());
 const directBefore=snapshot(store);let direct;try{direct=await store.applyResolution(unknown);}catch(error){direct={status:'rejected',reason:error?.message||String(error)};}
 const afterDirect=snapshot(store);
 const simulation=store.simulateAction(input());let simulationApply;try{simulationApply=await store.applySimulation(simulation);}catch(error){simulationApply={status:'rejected',reason:error?.message||String(error)};}
 const afterSimulation=snapshot(store);
 const action=store.previewResolution(input({isAction:true,runningOrHiding:false,involvesMovement:false}));
 const free=store.previewResolution(input({isAction:false,runningOrHiding:false,involvesMovement:false}));
 const hidden=await afterFleeHidden(),hiddenBefore=snapshot(hidden),unknownBeforeSpend=hidden.previewResolution(input());
 const freeBeforeSpend=hidden.previewResolution(input({isAction:false,runningOrHiding:false,involvesMovement:false}));
 const freeCommit=await hidden.applyResolution(freeBeforeSpend);const hiddenAfter=snapshot(hidden);
 const failures=[];
 if(unknown.ready!==false)failures.push('Test Compétence isAction absent accepté après Sprint au lieu de demander une classification');
 if(direct?.status==='applied')failures.push('applyResolution direct applique le Test Compétence non classé après Sprint');
 if(JSON.stringify(afterDirect)!==JSON.stringify(directBefore))failures.push('applyResolution direct mute le Store après refus manquant');
 if(simulation.ready!==false)failures.push('simulateAction accepte le Test Compétence non classé après Sprint');
 if(simulationApply?.status==='applied')failures.push('applySimulation applique le Test Compétence non classé après Sprint');
 if(JSON.stringify(afterSimulation)!==JSON.stringify(before))failures.push('applySimulation mute le Store après dépense Sprint');
 if(action.ready!==false)failures.push('isAction=true devrait être bloqué par quota Action déjà dépensé');
 if(free.ready!==true)failures.push('isAction=false explicite doit rester un Test libre disponible après Sprint');
 if(unknownBeforeSpend.ready!==false)failures.push('Test Compétence ambigu avant dépense accepté sans classification explicite');
 if(freeBeforeSpend.ready!==true||freeCommit?.status!=='applied')failures.push('isAction=false explicite doit rester testable avant dépense');
 const spentBefore=before.extensions?.v5?.actionLedger?.quotaUsage||[],spentAfter=hiddenAfter.extensions?.v5?.actionLedger?.quotaUsage||[];
 if(JSON.stringify(spentAfter)!==JSON.stringify(hiddenBefore.extensions?.v5?.actionLedger?.quotaUsage||[]))failures.push('Test isAction=false a inventé une dépense Action');
 assert.deepEqual(failures,[],failures.join('; '));
});