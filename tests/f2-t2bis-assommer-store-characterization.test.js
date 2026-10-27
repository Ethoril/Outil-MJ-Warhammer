import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const copy=structuredClone;
const memory=()=>{let saved=null;return{async load(){return saved&&copy(saved);},async saveAtomic({state}){saved=copy(state);return{ok:true};}};};
const fighter=(id,extra={})=>({id,name:id,kind:'PJ',camp:id==='target'?'ennemi':'pj',zone:'active',hp:20,maxHp:20,
  caracs:{CC:60,F:40,E:30,BE:3,Ag:30},skills:[],talents:[],equipment:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},...extra});
async function fixture(targetHp=20,targetE=30){
  const persistence=memory(),store=createStore({storage:null,persistence});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'attacker',order:['attacker','target'],participants:[fighter('attacker'),fighter('target',{hp:targetHp,maxHp:20,caracs:{CC:50,F:30,E:targetE,BE:Math.floor(targetE/10),Ag:30}})]},log:[],diceLines:[],extensions:{v5:{combatId:'assommer-characterization'}}});
  return{store,persistence};
}
const byId=(store,id)=>store.listParticipants().find(row=>row.id===id);

test('T2 bis characterization — Store applies and undoes Assommante Sonné at Head when Wounds lost meet TB',async()=>{
  const {store,persistence}=await fixture();
  // Roll 90 reverses to 9, the Head hit location. Assommante/Pummel is the published quality.
  const preview=store.previewResolution({resolutionId:'assommer-pummel-head',actorId:'attacker',targetId:'target',roll:90,
    action:{type:'attack',attr:'CC',base:100,damage:5,qualities:['assommante']},defense:{type:'skill',attr:'CC',base:50,roll:98,v5:{kind:'melee'}},v5:{kind:'melee'}});
  assert.deepEqual(preview.unresolved,[]);
  assert.ok(preview.weaponConditions?.proposed?.some(row=>row.key==='sonne'),JSON.stringify(preview.weaponConditions));
  const applied=await store.applyResolution(preview);assert.equal(applied.status,'applied');
  assert.ok(byId(store,'target').states.some(row=>row.key==='sonne'&&row.source?.keywordId==='assommante'));
  const reloaded=createStore({storage:null,persistence});await reloaded.ready;
  assert.ok(byId(reloaded,'target').states.some(row=>row.key==='sonne'));
  assert.equal(await reloaded.undo(),true);
  assert.ok(!byId(reloaded,'target').states.some(row=>row.key==='sonne'),'Undo retire l’État Assommante créé par la résolution');
  const afterUndo=createStore({storage:null,persistence});await afterUndo.ready;
  assert.ok(!byId(afterUndo,'target').states.some(row=>row.key==='sonne'));
});

test('T2 bis characterization — Assommante does not stun when a Head hit deals fewer Wounds than TB',async()=>{
  const {store}=await fixture(20,40);
  const preview=store.previewResolution({resolutionId:'assommer-below-tb',actorId:'attacker',targetId:'target',roll:90,
    action:{type:'attack',attr:'CC',base:100,damage:2,qualities:['assommante']},defense:{type:'skill',attr:'CC',base:50,roll:98,v5:{kind:'melee'}},v5:{kind:'melee'}});
  assert.equal(preview.damage?.finalDamage,3);
  assert.equal(preview.weaponConditions?.proposed?.length,0,'la cible ne perd que 3 Blessures, sous son BE 4');
  assert.ok(!preview.weaponConditions?.proposed?.some(row=>row.key==='sonne'));
  const applied=await store.applyResolution(preview);assert.equal(applied.status,'applied');
  assert.ok(!byId(store,'target').states.some(row=>row.key==='sonne'));
});

test('T2 bis characterization — declared knockout pull-blow keeps ordinary damage but suppresses the Head Critical Wound',async()=>{
  const {store}=await fixture();
  const preview=store.previewResolution({resolutionId:'assommer-declared-knockout',actorId:'attacker',targetId:'target',roll:11,
    action:{type:'attack',attr:'CC',base:60,damage:5,qualities:['assommante']},
    defense:{type:'skill',attr:'CC',base:50,roll:98,v5:{kind:'melee'}},
    criticalRolls:{location:9,effect:50},v5:{kind:'melee',context:{knockout:true}}});
  assert.deepEqual(preview.unresolved,[]);
  assert.equal(preview.damage?.finalDamage>0,true,'un coup retenu conserve les dégâts ordinaires');
  assert.equal(preview.critical?.details,undefined,'la déclaration avant le jet permet d’ignorer la Blessure Critique');
  assert.equal(preview.critical?.extraWounds||0,0);
  assert.ok(preview.weaponConditions?.proposed?.some(row=>row.key==='sonne'),JSON.stringify(preview.weaponConditions));
});
