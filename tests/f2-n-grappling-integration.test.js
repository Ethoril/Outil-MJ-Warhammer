import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const clone=structuredClone;
const memory=()=>{let saved;return{async load(){return saved&&clone(saved);},async saveAtomic({state}){saved=clone(state);return{ok:true};}};};
const fighter=(id,bagarre,force)=>({id,name:id,kind:'PJ',camp:id==='holder'?'pj':'npc',zone:'active',hp:20,maxHp:20,caracs:{CC:50,F:40,E:30,Ag:30},states:[],skills:[{id:bagarre,name:'Bagarre',total:50},{id:force,name:'Force',total:40}],equipment:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{hasMomentum:false}}});
const person=(store,id)=>store.listParticipants().find(row=>row.id===id);
const input=(store,{actorId,targetId,skillId,roll,defenseRoll,declared=false,grappleAction,defenseSkillId})=>({actorId,targetId,action:{id:`act-${skillId}`,type:'attack',attr:'CC',base:50,damage:4,extensions:{fiche:{skillId}}},roll,defense:{type:'skill',attr:'CC',base:50,roll:defenseRoll,label:'Bagarre',v5:{kind:'melee',choice:'keep',context:{skillId:defenseSkillId}}},v5:{kind:'melee',choice:'keep',context:{skillId,grappleDeclared:declared||undefined,grappleAction}}});
async function fixture(){
 const persistence=memory(),store=createStore({storage:null,persistence});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'holder',order:['holder','held'],participants:[fighter('holder','bh','fh'),fighter('held','bt','ft')]},log:[],diceLines:[]});
 return{store,persistence};
}

test('F2-N intégré : trois Tours engagent, blessent sans PA, puis libèrent; Undo, Redo et reload gardent le lien',async()=>{
 const{store,persistence}=await fixture();
 let preview=store.previewResolution(input(store,{actorId:'holder',targetId:'held',skillId:'bh',defenseSkillId:'bt',roll:25,defenseRoll:70,declared:true}));
 assert.equal(preview.grapple.status,'grappled');
 const appliedEntry=await store.applyResolution(preview);assert.equal(appliedEntry.status,'applied',JSON.stringify({reason:appliedEntry.reason,unresolved:preview.unresolved,grapple:preview.grapple}));
 let held=person(store,'held'),holder=person(store,'holder');
 assert.equal(held.states.filter(row=>row.key==='enchevetre').reduce((n,row)=>n+row.level,0),1);
 assert.equal(held.hp,20,'prise sans Blessures ordinaires');
 assert.equal(holder.extensions.v5.grapples[0].status,'active');
 await store.setRoundTurn(2,'holder');
 preview=store.previewResolution(input(store,{actorId:'holder',targetId:'held',skillId:'fh',defenseSkillId:'ft',roll:30,defenseRoll:70,grappleAction:'damage'}));
 assert.equal(preview.grapple.status,'ready');
 assert.equal(preview.damage,null,'les dégâts armés ne s’appliquent pas dans l’empoignade');
 const appliedDamage=await store.applyResolution(preview);assert.equal(appliedDamage.status,'applied',JSON.stringify({reason:appliedDamage.reason,unresolved:preview.unresolved,grapple:preview.grapple}));
 assert.equal(person(store,'held').hp,13,'BF 4 + 6 DR - BE 3, sans PA');
 await store.setRoundTurn(3,'held');
 preview=store.previewResolution(input(store,{actorId:'held',targetId:'holder',skillId:'ft',defenseSkillId:'fh',roll:20,defenseRoll:70,grappleAction:'escape'}));
 assert.equal(preview.grapple.status,'ready');
 const appliedEscape=await store.applyResolution(preview);assert.equal(appliedEscape.status,'applied',JSON.stringify({reason:appliedEscape.reason,unresolved:preview.unresolved,grapple:preview.grapple}));
 assert.equal(person(store,'holder').extensions.v5.grapples[0].status,'released');
 assert.equal(person(store,'held').states.filter(row=>row.key==='enchevetre').reduce((n,row)=>n+row.level,0),0);
 const released=clone(person(store,'holder').extensions.v5.grapples);
 assert.equal(await store.undo(),true);assert.equal(person(store,'holder').extensions.v5.grapples[0].status,'active');
 assert.equal(await store.redo(),true);assert.deepEqual(person(store,'holder').extensions.v5.grapples,released);
 const reloaded=createStore({storage:null,persistence});await reloaded.ready;
 assert.deepEqual(person(reloaded,'holder').extensions.v5.grapples,released);
});

test('F2-N intégré : sous empoignade, le Tour bloque une autre Action et accepte la déclaration Force',async()=>{
 const{store}=await fixture();const link={id:'grapple:preexisting',initiatorId:'holder',targetId:'held',status:'active'};
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:2,currentActorId:'holder',order:['holder','held'],participants:[fighter('holder','bh','fh'),fighter('held','bt','ft')]},extensions:{v5:{combatId:'f2-n-turn-gate',turnIndex:2}},log:[],diceLines:[]});
 await store.updateParticipant('holder',{extensions:{v5:{hasMomentum:false,grapples:[link]}}});
 await store.updateParticipant('held',{extensions:{v5:{hasMomentum:false,grapples:[link]}}});
 const unrelated=input(store,{actorId:'holder',targetId:'held',skillId:'bh',defenseSkillId:'bt',roll:40,defenseRoll:70});
 const blocked=store.previewResolution(unrelated);
 assert.equal(blocked.ready,false);assert.equal(blocked.code,'F2_GRAPPLE_FIRST_ACTION');
 const force=input(store,{actorId:'holder',targetId:'held',skillId:'fh',defenseSkillId:'ft',roll:30,defenseRoll:70,grappleAction:'damage'});
 assert.equal(store.previewResolution(force).grapple?.status,'ready');
 const spent=await store.applyResolution(store.previewResolution(force));assert.equal(spent.status,'applied');
 assert.ok(person(store,'held').hp<20,'le Test Force déclaré applique les Blessures d’empoignade');
 assert.equal(await store.undo(),true);assert.equal(person(store,'held').hp,20,'Undo annule les dégâts du Test imposé');
});
