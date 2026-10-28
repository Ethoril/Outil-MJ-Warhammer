import test from 'node:test';
import assert from 'node:assert/strict';
import { previewV5ActionCosts, commitV5ActionCosts } from '../js/core/v5-action-costs.js';
import { createStore } from '../js/core/store.js';

const p=(id,fate)=>({id,profileId:id,kind:id==='hero'?'PJ':'PNJ',zone:'active',hp:20,maxHp:20,caracs:{CC:60,CT:60,F:30,E:30,FM:60,I:40,Ag:40},skills:[],states:[],equipment:[],extensions:{v5:{fate}}});

test('F2-L: attack costs stay with the attacker while cancellation Destin is paid by the target',()=>{
  const state={revision:0,round:1,currentActorId:'hero',participants:[p('hero',2),p('foe',1)],v5ActionLedger:{appliedActions:[],quotaUsage:[]}};
  const plan=previewV5ActionCosts({state,actionId:'split-payer',actorId:'hero',costs:[{id:'attack-fate',resource:'fate',amount:1},{id:'cancel-fate',resource:'fate',amount:1,actorId:'foe'}]});
  assert.equal(plan.ready,true);
  const committed=commitV5ActionCosts(plan,state,{resolveAction:paid=>({status:'applied',state:paid})});
  assert.equal(committed.status,'applied');
  assert.deepEqual(committed.state.participants.map(row=>row.extensions.v5.fate),[1,0]);
});

test('F2-L: manual Destin assignment records the MJ reason and can be undone',async()=>{
  const store=createStore({storage:null}); await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[p('hero',0)],log:[],diceLines:[],combat:{round:0,currentActorId:null,order:[],participants:[]}});
  await store.setFate('hero',3,{reason:'Attribution MJ après la séance'});
  assert.equal(store.getFate('hero').balance,3);
  assert.match(store.getLog()[0].detail.reason,/Attribution MJ/);
  assert.equal(await store.undo(),true);
  assert.equal(store.getFate('hero').balance,0);
});

test('F2-L: V4 profile Chance conversion reaches the durable Fortune registry view',async()=>{
  const {convertLegacyV4Profile}=await import('../js/core/v5-legacy-conversion.js');
  const profile=convertLegacyV4Profile({id:'legacy-pj',kind:'PJ',extensions:{v4:{determination:4,resilience:2}}});
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[profile],log:[],diceLines:[],combat:{round:0,currentActorId:null,order:[],participants:[]}});
  assert.equal(store.getFortune('legacy-pj').balance,4);
  assert.equal(store.getFate('legacy-pj').balance,2);
});

test('F2-L: temporary Fate is spent before permanent Fate and permanent spend survives reload in the profile',async()=>{
  let saved;const persistence={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
  const store=createStore({storage:null,persistence});await store.ready;
  const actor=p('hero',0),profile={...p('foe-profile',1),kind:'PJ'};
  await store.loadFromJSON({schemaVersion:3,reserve:[profile],log:[],diceLines:[],combat:{round:1,currentActorId:'hero',order:['hero'],participants:[actor]}});
  await store.addProfilesToCombat(['foe-profile'],{zone:'active'});
  let foe=store.listParticipants().find(row=>row.profileId==='foe-profile');assert.ok(foe);
  await store.updateParticipant(foe.id,{extensions:{...foe.extensions,v5:{...foe.extensions.v5,spellEffects:[{id:'temporary-fate',remainingTempFate:1}]}}});
  const foeId=foe.id,attack=resolutionId=>store.previewResolution({actorId:'hero',targetId:foeId,resolutionId,roll:20,action:{type:'attack',attr:'CC',base:90,damage:10},defense:{base:30,roll:40,v5:{kind:'melee'}},v5:{kind:'melee',context:{fateAction:'cancel-attack'}}});
  let preview=attack('fate-temp-first');assert.equal(preview.ready,true,preview.unresolved?.join('; '));await store.applyResolution(preview);
  foe=store.listParticipants().find(row=>row.id===foeId);assert.equal(foe.extensions.v5.spellEffects[0].remainingTempFate,0);assert.equal(foe.extensions.v5.fate,1);assert.equal(store.getProfile('foe-profile').extensions.v5.fate,1);
  preview=attack('fate-permanent-second');assert.equal(preview.ready,true,preview.unresolved?.join('; '));await store.applyResolution(preview);
  const liveFoe=store.listParticipants().find(row=>row.id===foeId);assert.equal(liveFoe.extensions.v5.fate,0);assert.equal(store.getProfile('foe-profile').extensions.v5.fate,0);
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(reload.getProfile('foe-profile').extensions.v5.fate,0);
});

test('F2-L: automatic Fate succeeds on an opposition and forces at least +1 DR',async()=>{
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'hero',order:['hero','foe'],participants:[p('hero',1),p('foe',0)]}});
  const preview=store.previewResolution({actorId:'hero',targetId:'foe',resolutionId:'fate-auto',action:{type:'opposition',attr:'F',base:10},defense:{attr:'F',base:90,roll:1,v5:{kind:'test',context:{opposedTest:true}}},v5:{kind:'test',context:{opposedTest:true,fateAction:'automatic-success',fateChosenRoll:99}}});
  assert.equal(preview.ready,true,preview.unresolved?.join('; '));
  assert.equal(preview.opposition.winner,'attacker');assert.ok(preview.opposition.netSl>=1);
  await store.applyResolution(preview);assert.equal(store.getFate('hero').balance,0);
});

test('F2-L: automatic Fate resolves a simple test using an MJ-chosen result without rolling dice',async()=>{
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'hero',order:['hero'],participants:[p('hero',1)]}});
  const preview=store.previewResolution({actorId:'hero',resolutionId:'fate-no-die',action:{type:'test',attr:'F',base:10},v5:{kind:'test',context:{fateAction:'automatic-success',fateChosenRoll:43}}});
  assert.equal(preview.ready,true,preview.unresolved?.join('; '));assert.equal(preview.success,true);assert.ok(preview.sl>=1);
  await store.applyResolution(preview);assert.equal(store.getFate('hero').balance,0);
});

test('F2-L: automatic Fate lets the MJ choose a critical hit location',async()=>{
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'hero',order:['hero','foe'],participants:[p('hero',1),p('foe',0)]}});
  const preview=store.previewResolution({actorId:'hero',targetId:'foe',resolutionId:'fate-critical-location',criticalRolls:{effect:1},action:{type:'attack',attr:'CC',base:90,damage:1},attackContext:{ranged:false},defense:{base:30,roll:67,v5:{kind:'melee'}},v5:{kind:'melee',context:{fateAction:'automatic-success',fateChosenRoll:11,fateCriticalLocation:'head'}}});
  assert.equal(preview.ready,true,preview.unresolved?.join('; '));
  assert.equal(preview.critical.details.location.name,'Tête');
});

test('F2-L: survival spends the target Fate, suppresses lethal damage and benches the target',async()=>{
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'hero',order:['hero','foe'],participants:[{...p('hero',0),extensions:{v5:{}}},{...p('foe',1),hp:4}]}});
  const preview=store.previewResolution({actorId:'hero',targetId:'foe',resolutionId:'fate-survive',roll:20,action:{type:'attack',attr:'CC',base:90,damage:10},attackContext:{ranged:false},defense:{base:30,roll:40,v5:{kind:'melee'}},v5:{kind:'melee',context:{fateAction:'survive'}}});
  assert.equal(preview.ready,true,preview.unresolved?.join('; '));assert.ok(preview.fateSurvival);
  await store.applyResolution(preview);
  assert.equal(store.getFate('foe').balance,0);
  assert.equal(store.listParticipants().find(row=>row.id==='foe').zone,'bench');
  assert.equal(store.listParticipants().find(row=>row.id==='foe').hp,4);
});
