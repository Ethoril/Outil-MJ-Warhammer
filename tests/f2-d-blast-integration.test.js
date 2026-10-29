import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const persistence=()=>{let saved=null;return{async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};};
const q=(id,parameter='')=>({id,parameter});
const person=(id,camp)=>({id,name:id,camp,kind:camp==='allies'?'PJ':'PNJ',zone:'active',hp:20,maxHp:20,
  caracs:{CC:50,CT:60,F:30,E:30},skills:[],states:[],equipment:[],armor:{},extensions:{v5:{hasMomentum:false}}});

for(const quality of ['explosion','dispersion'])test(`F2-D Store blast — ${quality} cible les sélections MJ, annule et persiste`,async()=>{
  const io=persistence(),store=createStore({storage:null,persistence:io});await store.ready;
  const actor=person('actor','allies'),primary=person('primary','foes'),secondary=person('secondary','foes'),outside=person('outside','foes');
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'actor',order:['actor','primary'],participants:[actor,primary,secondary,outside]},log:[],diceLines:[]});
  const context=quality==='explosion'?{explosionTargetIds:['primary','secondary'],explosionLocationRollsById:{secondary:35}}:{spreadRangeBand:'short',spreadTargetIds:['primary','secondary'],spreadLocationRollsById:{secondary:35}};
  const plan=store.previewResolution({actorId:'actor',targetId:'primary',resolutionId:`store-${quality}`,roll:21,round:1,
    action:{id:'blast-weapon',type:'attack',attr:'CT',base:60,damage:quality==='explosion'?'BF+2':4,qualities:[q(quality,'3'),...(quality==='explosion'?[q('devastatrice')]:[])]},
    attackContext:{ranged:true},v5:{kind:'ranged',context}});
  assert.equal(plan.unresolved.length,0,plan.unresolved.join('; '));
  assert.equal((await store.applyResolution(plan)).status,'applied');
  const applied=store.listParticipants();
  assert.ok(applied.find(row=>row.id==='primary').hp<20);
  assert.ok(applied.find(row=>row.id==='secondary').hp<20);
  assert.equal(applied.find(row=>row.id==='outside').hp,20);
  const snapshot=store.getFullJSON(),restored=createStore({storage:null,persistence:io});await restored.ready;await restored.loadFromJSON(snapshot);
  assert.ok(restored.listParticipants().find(row=>row.id==='secondary').hp<20);
  assert.equal(await store.undo(),true);
  assert.equal(store.listParticipants().find(row=>row.id==='primary').hp,20);
  assert.equal(store.listParticipants().find(row=>row.id==='secondary').hp,20);
});
