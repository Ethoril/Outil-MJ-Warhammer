import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../js/core/store.js';
import {createCombatEngine} from '../js/core/combat.js';
import {getDivineContract} from '../js/core/v5-divine-store.js';
import {buildExpiry} from '../js/ui/v5-divine-form-model.js';
const HOWL='divine:miracle:ulric:howl-of-the-wolf';
const person=(id,initiative)=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',initiative,hp:40,maxHp:40,caracs:{CC:50,CT:40,F:40,E:40,I:50,Ag:50,Dex:50,Int:60,FM:60,Soc:60,M:4},skills:[{name:'Prière',status:'resolved',total:60},{name:'Langue (Magick)',total:200}],talents:[{id:'talent-invoke',status:'resolved',rank:1,specialization:'Ulric'}],prayers:[{name:getDivineContract(HOWL).catalogueName,status:'resolved'}],states:[],equipment:[],traits:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}}});
async function fixture(mode='v5',middle=80){
 let saved;const persistence={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return {ok:true};}};
 const store=createStore({persistence,storage:null});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'A',order:['A','B','C'],participants:[person('A',100),person('B',middle),person('C',1)]},log:[],diceLines:[],extensions:{v5:{turnIndex:1,combatId:'a12'}}});
 const engine=createCombatEngine(store);const next=async()=>{if(mode==='v5'){const p=await engine.nextTurn();assert.equal(p.status,'applied',JSON.stringify(p));}else await store.nextTurn();return `${store.getCombat().round}:${store.getCombat().currentActorId}`;};
 await next();assert.equal(store.getCombat().currentActorId,'B');return {store,next,persistence};
}
async function add(store,kind){
 if(kind==='manual'){await store.addParticipant(person('N',50));return 'N';}
 if(kind==='magic'){
  const input={actorId:'B',targetIds:['B'],roll:22,miscastRoll:15,attributeActive:false,domainFacts:{minutesToDawn:1,sunlight:false}};
  const p=store.previewSpellExecution('Destrier d’Ombre',input);assert.equal(p.ready,true,p.error);await store.applySpellExecution('Destrier d’Ombre',input);
 }else{
  const contract=getDivineContract(HOWL),actor=store.listParticipants().find(p=>p.id==='B');
  const input={actorId:'B',targetIds:[],roll:45,canSpeak:true,choices:{range:0,targets:0,duration:0,effect:0},expiry:buildExpiry({contract,actor,choices:{},round:1,phase:'endOfTurn'})};
  const preview=store.previewDivineExecution(HOWL,input);assert.equal(preview.ready,true,JSON.stringify(preview.needsInput));assert.equal((await store.applyDivineExecution(HOWL,{preview})).ready,true);
 }
 const created=store.listParticipants().find(p=>!['A','B','C'].includes(p.id));assert.ok(created);assert.ok(created.initiative>1&&created.initiative<80);return created.id;
}
for(const mode of ['v5','legacy'])for(const kind of ['manual','magic','divine'])test(`A12 caracterisation : ${kind}, ${mode}`,async()=>{
 const {store,next}=await fixture(mode);const id=await add(store,kind);const seq=[];for(let i=0;i<3;i++)seq.push((await next()).replace(id,'N'));
 // Arbitrage R15 : les trois voies publiques inserent le nouveau participant a son rang.
 assert.deepEqual(seq,['1:N','1:C','2:A']);
});
for(const kind of ['manual','magic','divine'])test(`A12 : rang deja passe attend le prochain Round, ${kind}`,async()=>{
 const {store,next}=await fixture('v5',10);const id=await add(store,kind);const seq=[];for(let i=0;i<4;i++)seq.push((await next()).replace(id,'N'));
 assert.deepEqual(seq,['1:C','2:A','2:N','2:B']);
});
for(const [name,expected] of [['N',['1:N','1:C','2:A']],['Aa',['1:C','2:A','2:Aa']]])test('A12 : egalite Initiative, ordre des noms '+name,async()=>{
 const {store,next}=await fixture();await store.addParticipant(person(name,80));const seq=[];for(let i=0;i<3;i++)seq.push(await next());assert.deepEqual(seq,expected);
});
for(const kind of ['magic','divine'])test('A12 : ordre atomique, Annuler/Retablir et reload, '+kind,async()=>{
 const {store,persistence}=await fixture();const before=store.getCombat().order.slice();const id=await add(store,kind);const after=store.getCombat().order.slice();assert.deepEqual(after,['A','B',id,'C']);
 await store.undo();assert.deepEqual(store.getCombat().order,before);assert.ok(!store.listParticipants().some(p=>p.id===id));
 await store.redo();assert.deepEqual(store.getCombat().order,after);const reloaded=createStore({persistence,storage:null});await reloaded.ready;
 assert.deepEqual(reloaded.getCombat().order,after);assert.equal((await createCombatEngine(reloaded).nextTurn()).status,'applied');assert.equal(reloaded.getCombat().currentActorId,id);
});
