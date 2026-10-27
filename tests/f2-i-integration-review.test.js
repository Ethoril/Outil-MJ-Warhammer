import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { createCriticalAftermathRecord, updateCriticalDeathCountdown, CRITICAL_DEATH_FIELD } from '../js/core/v5-critical-aftermath.js';

const clone=structuredClone;
const memory=()=>{let saved=null;return{async load(){return saved&&clone(saved);},async saveAtomic({state}){saved=clone(state);return{ok:true};}};};
const person=(id,extra={})=>({id,name:id,kind:'PJ',camp:id==='foe'?'ennemi':'pj',zone:'active',hp:0,maxHp:20,caracs:{CC:50,F:40,E:20,BE:2,Ag:30},skills:[{id:'force',name:'Force',total:40},{id:'bagarre',name:'Bagarre',total:50}],talents:[],equipment:[],states:[{id:`${id}-unconscious`,key:'inconscient',name:'Inconscient',level:1}],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},...extra});
async function fixture(participants,round=1){
 const persistence=memory(),store=createStore({storage:null,persistence});await store.ready;
 const snapshot={schemaVersion:3,reserve:[],combat:{round,currentActorId:'hero',order:['hero','foe'],participants},log:[],diceLines:[],extensions:{v5:{combatId:'f2-i-review',turnIndex:1}}};
 snapshot.extensions.v5.gameClock=createGameClock(snapshot);await store.loadFromJSON(snapshot);return{store,persistence};
}
const byId=(store,id)=>store.listParticipants().find(row=>row.id===id);

test('F2-I integration review: nextTurn reconciles an existing critical countdown through the due Round',async()=>{
 const p=person('hero',{extensions:{v5:{criticalWounds:Array.from({length:3},(_,i)=>({id:`crit-${i}`,name:`Crit ${i}`}))}}});
 const countdown=updateCriticalDeathCountdown(p,{round:1,toughnessBonus:2});Object.assign(p,countdown.participant);
 const{store,persistence}=await fixture([p,person('foe')]);
 while(store.getCombat().round<3)await store.nextTurn();
 assert.equal(byId(store,'hero').extensions.v5[CRITICAL_DEATH_FIELD].status,'awaiting-mj');
});

test('F2-I integration review: absent BE and E stay unknown during Round reconciliation',async()=>{
 const p=person('hero',{caracs:{CC:50},extensions:{v5:{criticalWounds:[{id:'a'},{id:'b'},{id:'c'}]}}});
 const{store}=await fixture([p,person('foe')]);
 while(store.getCombat().round<4)await store.nextTurn();
 const after=byId(store,'hero');
 assert.equal(after.extensions.v5.criticalDeath,undefined,'un BE absent ne doit pas être inventé à zéro ni démarrer un décompte');
 assert.notEqual(after.extensions.v5.dead,true,'des données incomplètes ne doivent pas provoquer une mort automatique');
});

test('F2-I integration review: absent BE and E do not start countdown on unconscious transition',async()=>{
 const p=person('hero',{caracs:{CC:50},states:[],extensions:{v5:{criticalWounds:[{id:'a'},{id:'b'},{id:'c'}]}}});
 const{store}=await fixture([p,person('foe')]);
 const applied=await store.applySpellEffects('hero',{id:'spell-ko-unknown-be',spellName:'Sommeil',conditions:[{name:'Inconscient',level:1}]},{resolutionId:'spell-ko-unknown-be',source:{kind:'spell'}});
 assert.equal(applied.ok,true);
 const after=byId(store,'hero');
 assert.ok(after.states.some(row=>row.key==='inconscient'));
 assert.equal(after.extensions.v5.criticalDeath,undefined,'l’inconscience ne doit pas fabriquer BE=0 si E et BE sont absents');
 assert.notEqual(after.extensions.v5.dead,true);
});

test('F2-I integration review: explicit BE zero is known and starts the countdown',async()=>{
 const p=person('hero',{caracs:{CC:50,BE:0},states:[],extensions:{v5:{criticalWounds:[{id:'a'},{id:'b'},{id:'c'}]}}});
 const{store}=await fixture([p,person('foe')]);
 const applied=await store.applySpellEffects('hero',{id:'spell-ko-be-zero',spellName:'Sommeil',conditions:[{name:'Inconscient',level:1}]},{resolutionId:'spell-ko-be-zero',source:{kind:'spell'}});
 assert.equal(applied.ok,true);
 assert.equal(byId(store,'hero').extensions.v5.criticalDeath?.status,'awaiting-mj','BE 0 explicite reste connu et atteint le terme immédiat du décompte');
});

test('F2-I integration review: real resolution does not infer BE zero from null or empty BE/E',async()=>{
 for(const [caracs,expected] of [[{CC:50,BE:null,E:null},undefined],[{CC:50,BE:'',E:''},undefined],
  [{CC:50,BE:null,E:20},'countdown'],[{CC:50,BE:0},'awaiting-mj']]){
  const hero=person('hero',{hp:20,maxHp:20,caracs,extensions:{v5:{criticalWounds:[{id:'prior-a'},{id:'prior-b'}]}}});
  const{store}=await fixture([hero,person('foe',{hp:20,states:[]})]);
  const preview=store.previewResolution({resolutionId:'crit-unknown-be',actorId:'foe',targetId:'hero',roll:22,
   action:{type:'attack',attr:'CC',base:60,damage:5},v5:{kind:'melee'},criticalRolls:{location:2,effect:45}});
  assert.ok(preview.critical?.details,'résolution réelle avec critique attendu '+JSON.stringify(preview.critical));
  const applied=await store.applyResolution(preview);assert.equal(applied.status,'applied',(applied.reason||applied.error||JSON.stringify(applied))+' critical='+JSON.stringify(preview.critical));
  const after=byId(store,'hero');
  assert.equal(after.extensions.v5.criticalWounds.length,3,'le registre du critique doit être écrit');
  assert.equal(after.extensions.v5.criticalDeath?.status,expected,'BE/E absents ou vides restent inconnus, E valide sert de fallback, et BE=0 explicite reste valide');
 }
});

test('F2-I integration review: a spell effect causing Inconscient starts the countdown atomically',async()=>{
 const p=person('hero',{states:[],extensions:{v5:{criticalWounds:Array.from({length:3},(_,i)=>({id:`prior-crit-${i}`,name:`Crit ${i}`}))}}});
 const{store,persistence}=await fixture([p,person('foe')]);
 const applied=await store.applySpellEffects('hero',{id:'spell-ko',spellName:'Sommeil',conditions:[{name:'Inconscient',level:1}]},{resolutionId:'spell-ko',source:{kind:'spell'}});
 assert.equal(applied.ok,true);
 const after=byId(store,'hero');
 assert.ok(after.states.some(row=>row.key==='inconscient'));
 assert.equal(after.extensions.v5.criticalDeath?.status,'countdown','le décompte doit commencer avec le changement d’État, sans attendre nextTurn');
 assert.equal(after.extensions.v5.criticalDeath?.startedRound,1);
 const reloaded=createStore({storage:null,persistence});await reloaded.ready;
 assert.equal(byId(reloaded,'hero').extensions.v5.criticalDeath.status,'countdown');
 assert.equal(await reloaded.undo(),true);
 assert.equal(byId(reloaded,'hero').states.some(row=>row.key==='inconscient'),false,'Undo retire l’Inconscient acquis');
 assert.equal(byId(reloaded,'hero').extensions.v5.criticalDeath,undefined,'Undo retire aussi le décompte atomique');
});

test('F2-I integration review: direct Store acquisition of Inconscient reconciles in the same command',async()=>{
 const p=person('hero',{states:[],extensions:{v5:{criticalWounds:[{id:'c1'},{id:'c2'},{id:'c3'}]}}});
 const{store}=await fixture([p,person('foe')]);
 const applied=await store.acquireConditions('hero',[{name:'Inconscient',level:1}],{resolutionId:'direct-ko'});
 assert.equal(applied.status,'applied');
 assert.equal(byId(store,'hero').extensions.v5.criticalDeath.status,'countdown');
});

test('F2-I integration review: Store exposes undoable preview/apply for amputation shock',async()=>{
 const source=createCriticalAftermathRecord(person('hero'),{table:'ARM',effectRoll:115,resolutionId:'amputation-store',round:1});
 const{store,persistence}=await fixture([source.participant,person('foe')]);
 assert.equal(typeof store.previewAmputationShock,'function');
 assert.equal(typeof store.applyAmputationShock,'function');
 const preview=store.previewAmputationShock({participantId:'hero',criticalId:source.record.id,difficultyDR:2,test:{success:false,sl:-1}});
 assert.equal(preview.status,'ready');
 const applied=await store.applyAmputationShock(preview);assert.equal(applied.status,'applied');
 assert.equal(byId(store,'hero').extensions.v5.criticalAftermath[0].amputationShock.test.sl,-1);
 assert.ok(byId(store,'hero').states.some(row=>row.key==='sonne'));
 const duplicate=store.previewAmputationShock({participantId:'hero',criticalId:source.record.id,test:{success:false,sl:-1}});assert.equal(duplicate.status,'duplicate');
 assert.equal((await store.applyAmputationShock(duplicate)).status,'duplicate');
 const appliedReload=createStore({storage:null,persistence});await appliedReload.ready;
 assert.equal(byId(appliedReload,'hero').extensions.v5.criticalAftermath[0].amputationShock.test.sl,-1);
 assert.ok(byId(appliedReload,'hero').states.some(row=>row.key==='sonne'));
 assert.equal(await appliedReload.undo(),true);assert.equal(byId(appliedReload,'hero').extensions.v5.criticalAftermath[0].amputationShock,undefined);
 assert.ok(!byId(appliedReload,'hero').states.some(row=>row.key==='sonne'),'Undo retire l’État généré par le choc');
 const reloaded=createStore({storage:null,persistence});await reloaded.ready;
 assert.equal(byId(reloaded,'hero').extensions.v5.criticalAftermath[0].amputationShock,undefined);
});

test('F2-I integration review: conditional amputation requires MJ occurrence confirmation before Test application',async()=>{
 const source=createCriticalAftermathRecord(person('hero'),{table:'LEG',effectRoll:110,resolutionId:'conditional-store',round:1});
 const{store}=await fixture([source.participant,person('foe')]);
 const missing=store.previewAmputationShock({participantId:'hero',criticalId:source.record.id,test:{success:false,sl:-1}});assert.equal(missing.status,'requires-input');
 const denied=store.previewAmputationShock({participantId:'hero',criticalId:source.record.id,amputationOccurred:false,test:{success:false,sl:-1}});assert.equal(denied.status,'blocked');
 const confirmed=store.previewAmputationShock({participantId:'hero',criticalId:source.record.id,amputationOccurred:true,test:{success:false,sl:-1}});assert.equal(confirmed.status,'ready');
 const result=await store.applyAmputationShock(confirmed);assert.equal(result.status,'applied');assert.equal(byId(store,'hero').extensions.v5.criticalAftermath[0].amputationShock.amputationOccurred,true);
});

test('F2-N boundary review: a grapple present before this Turn does impose the Force gate',async()=>{
 const link={id:'old-grapple',initiatorId:'foe',targetId:'hero',status:'active',createdTurnId:'previous-turn'};
 const hero=person('hero',{states:[],extensions:{v5:{grapples:[link]}}}),foe=person('foe',{extensions:{v5:{grapples:[link]}}});
 const{store}=await fixture([hero,foe]);
 const preview=store.previewResolution({actorId:'hero',targetId:'foe',action:{type:'skill',attr:'Ag',base:30,extensions:{fiche:{skillId:'bagarre'}}},roll:35,v5:{kind:'test',context:{isAction:false,skillId:'bagarre'}}});
 assert.equal(preview.code,'F2_GRAPPLE_FIRST_ACTION');
});

test('F2-I integration review: MJ decisions for countdown persist and undo as commands',async()=>{
 const p=person('hero',{extensions:{v5:{criticalWounds:[{id:'a'},{id:'b'},{id:'c'}]}}});
 const countdown=updateCriticalDeathCountdown(p,{round:1,toughnessBonus:2});Object.assign(p,countdown.participant);
 const{store,persistence}=await fixture([p,person('foe')],3);
 const pending=await store.decideCriticalDeath('hero','confirm',{round:3});assert.notEqual(pending?.ok,false);
 assert.equal(byId(store,'hero').extensions.v5.dead,true);
 const reloaded=createStore({storage:null,persistence});await reloaded.ready;assert.equal(byId(reloaded,'hero').extensions.v5.dead,true);
 assert.equal(await reloaded.undo(),true);assert.equal(byId(reloaded,'hero').extensions.v5.dead,undefined);
});

test('F2-N boundary review: a grapple created during this Turn does not impose the start-of-Turn gate',async()=>{
 const link={id:'mid-turn-grapple',initiatorId:'foe',targetId:'hero',status:'active',createdTurnId:'f2-i-review:1:hero'};
 const hero=person('hero',{states:[],extensions:{v5:{grapples:[link]}}}),foe=person('foe',{extensions:{v5:{grapples:[link]}}});
 const{store}=await fixture([hero,foe]);
 const preview=store.previewResolution({actorId:'hero',targetId:'foe',action:{type:'skill',attr:'Ag',base:30},roll:35,v5:{kind:'test',context:{isAction:false}}});
 assert.notEqual(preview.code,'F2_GRAPPLE_FIRST_ACTION');
});
