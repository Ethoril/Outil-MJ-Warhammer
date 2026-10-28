import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const actor={id:'hero',name:'Héros',kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,fortune:3,caracs:{CC:50,FM:50,E:30,Ag:40},skills:[],talents:[],states:[],equipment:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{fate:1}}};
const action={id:'test',name:'Épreuve',type:'test',attr:'CC',base:50};
const input=extra=>({actorId:'hero',action,roll:44,resolutionId:'fortune-before-roll',v5:{kind:'test',fortuneForAdvantage:true,...extra}});

async function setup(){
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'hero',order:['hero'],participants:[actor]}});
  await store.setFortune('hero',3);
  return store;
}

test('F2-L counter-review: direct Chance → Avantage requires a prior Store declaration',async()=>{
  const store=await setup();
  assert.throws(()=>store.previewResolution(input()),/déclaration préalable.*avant le jet/i);
});

test('F2-L counter-review: a Store declaration authorizes one real roll and is consumed on apply',async()=>{
  const store=await setup();
  const declared=await store.declareV5FortuneAdvantage('hero',{enabled:true,baseRevision:store.getLocalRevision()});
  assert.equal(declared.status,'applied');assert.ok(declared.declarationId);
  const preview=store.previewResolution(input({fortuneAdvantageDeclarationId:declared.declarationId}));
  assert.equal(preview.test.advantage.advantage.length,1);
  await store.applyResolution(preview);
  assert.equal(store.getFortune('hero').balance,2);
  assert.throws(()=>store.previewResolution(input({fortuneAdvantageDeclarationId:declared.declarationId})),/déclaration préalable.*avant le jet/i);
});
