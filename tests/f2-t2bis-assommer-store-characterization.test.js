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
  const {store,persistence}=await fixture();
  await store.updateParticipant('target',{states:[{id:'already-stunned',key:'sonne',name:'Sonné',level:3}]});
  const preview=store.previewResolution({resolutionId:'assommer-declared-knockout',actorId:'attacker',targetId:'target',roll:11,
    action:{type:'attack',attr:'CC',base:60,damage:5,qualities:['assommante']},
    defense:{type:'skill',attr:'CC',base:50,roll:98,v5:{kind:'melee'}},
    criticalRolls:{location:9,effect:50},v5:{kind:'melee',context:{knockout:true,calledShot:true,calledShotLocation:'head'}}});
  assert.deepEqual(preview.unresolved,[]);
  assert.equal(preview.location?.key,'HEAD');
  assert.equal(preview.damage?.finalDamage>0,true,'un coup retenu conserve les dégâts ordinaires');
  assert.equal(preview.critical?.details,undefined,'la déclaration avant le jet permet d’ignorer la Blessure Critique');
  assert.equal(preview.critical?.extraWounds||0,0);
  assert.ok(preview.weaponConditions?.proposed?.some(row=>row.key==='sonne'),JSON.stringify(preview.weaponConditions));
  assert.ok(preview.targetConditionApplication.some(row=>row.key==='inconscient'),'le total de Sonné strictement supérieur au BE met la cible Inconsciente');
  assert.equal((await store.applyResolution(preview)).status,'applied');
  assert.ok(byId(store,'target').states.some(row=>row.key==='inconscient'&&row.source?.kind==='knockout'));
  const reloaded=createStore({storage:null,persistence});await reloaded.ready;
  assert.ok(byId(reloaded,'target').states.some(row=>row.key==='inconscient'&&row.source?.kind==='knockout'),'Inconscient survit au rechargement');
  assert.equal(await reloaded.undo(),true);
  assert.ok(!byId(reloaded,'target').states.some(row=>row.key==='inconscient'),'Undo retire Inconscient');
});

test('T2 bis — knockout needs more Stunned Conditions than TB and still suppresses an excess Critical Wound',async()=>{
  const {store}=await fixture(1,30);
  await store.updateParticipant('target',{states:[{id:'two-stuns',key:'sonne',name:'Sonné',level:2}]});
  const preview=store.previewResolution({resolutionId:'knockout-equal-be',actorId:'attacker',targetId:'target',roll:11,
    action:{type:'attack',attr:'CC',base:60,damage:5,qualities:['assommante']},
    defense:{type:'skill',attr:'CC',base:50,roll:98,v5:{kind:'melee'}},
    v5:{kind:'melee',context:{knockout:true,calledShot:true,calledShotLocation:'head'}},criticalRolls:{location:9,effect:50,secondEffect:60}});
  assert.equal(preview.damage.finalDamage>1,true);
  assert.equal(preview.critical,null,'pulling the blow suppresses both the ordinary and excess Critical Wound');
  assert.ok(!preview.targetConditionApplication.some(row=>row.key==='inconscient'),'2 existing Sonné + 1 new = BE 3, not more than BE');
});

test('T2 bis — a defended or missed pull-blow cannot knock the target unconscious',async()=>{
  const {store}=await fixture();
  const preview=store.previewResolution({resolutionId:'knockout-defended',actorId:'attacker',targetId:'target',roll:90,
    action:{type:'attack',attr:'CC',base:40,damage:5,qualities:['assommante']},
    defense:{type:'skill',attr:'CC',base:80,roll:10,v5:{kind:'melee'}},
    v5:{kind:'melee',context:{knockout:true}}});
  assert.equal(preview.hit,false);
  assert.deepEqual(preview.weaponConditions.proposed,[]);
  assert.ok(!preview.targetConditionApplication.some(row=>row.key==='inconscient'));
});

test('T2 bis — Assommer requires explicit declaration and refuses excluded weapons and attack kinds',async()=>{
  const {store}=await fixture();
  await store.updateParticipant('target',{states:[{id:'already-stunned',key:'sonne',name:'Sonné',level:3}]});
  const base={actorId:'attacker',targetId:'target',roll:11,action:{type:'attack',attr:'CC',base:100,damage:5,qualities:['assommante']},defense:{type:'skill',attr:'CC',base:50,roll:98,v5:{kind:'melee'}},criticalRolls:{location:9,effect:50}};
  const undeclared=store.previewResolution({...base,resolutionId:'knockout-undeclared',v5:{kind:'melee'}});
  assert.ok(!undeclared.targetConditionApplication?.some(row=>row.key==='inconscient'));
  for(const [id,changes] of [['ranged',{v5:{kind:'ranged',context:{knockout:true}}}],['spell',{v5:{kind:'melee',context:{knockout:true,attackNature:'spell'}}}],['miracle',{v5:{kind:'melee',context:{knockout:true,attackNature:'miracle'}}}],['ablaze',{action:{...base.action,qualities:['assommante','enflamme']},v5:{kind:'melee',context:{knockout:true}}}],['missing-pummel',{action:{...base.action,qualities:[]},v5:{kind:'melee',context:{knockout:true}}}]]){
    const preview=store.previewResolution({ ...base,...changes,resolutionId:'knockout-'+id });
    assert.ok(preview.unresolved.some(row=>row.startsWith('Assommer :')),id+': '+JSON.stringify(preview.unresolved));
    assert.ok(!preview.targetConditionApplication?.some(row=>row.source?.kind==='knockout'),id+': une déclaration invalide ne doit pas proposer Inconscient');
    if(id==='spell')assert.ok(preview.critical?.details,'une déclaration de coup retenu invalide ne supprime pas le critique ordinaire');
    if(id==='ablaze')assert.ok(preview.input.action.qualities.some(row=>(typeof row==='string'?row:row.id)==='enflamme'),'une déclaration invalide ne retire aucune Qualité');
  }
  const removed=store.previewResolution({...base,resolutionId:'knockout-dropped-qualities',action:{...base.action,qualities:['assommante','devastatrice','taille','empaleuse','perforante']},v5:{kind:'melee',context:{knockout:true}}});
  assert.deepEqual(removed.input.action.qualities.map(q=>typeof q==='string'?q:q.id),['assommante']);
});
