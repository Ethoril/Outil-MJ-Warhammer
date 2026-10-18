import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateSnapshot } from '../js/core/migrations.js';
import { sameSharedState } from '../js/core/sync-protocol.js';
test('2.5 RTDB: null, empty branches and numeric array maps represent the same shared snapshot',()=>{
  const local={schemaVersion:3,combat:{participants:[{id:'a',hp:0,states:[],extensions:{v5:{hasMomentum:false}}}],empty:null},reserve:[],extensions:{v5:{unused:{}}}};
  const cloud={combat:{participants:{0:{extensions:{v5:{hasMomentum:false}},hp:0,id:'a'}}},schemaVersion:3};
  const original=JSON.stringify(local);assert.equal(sameSharedState(local,cloud),true);assert.equal(JSON.stringify(local),original);
});
test('2.5 RTDB: local history and journal do not create an external boundary',()=>{
  assert.equal(sameSharedState({schemaVersion:3,history:{past:[{id:'undo'}]},log:[{id:'private'}],localRevision:99},{schemaVersion:3}),true);
});
test('2.5 RTDB: actual wounds, momentum, Fortune and quota changes remain external edits',()=>{
  for(const field of ['hp','hasMomentum','fortune','used'])assert.equal(sameSharedState({extensions:{v5:{[field]:0}}},{extensions:{v5:{[field]:1}}}),false);
  assert.equal(sameSharedState({enabled:false},{}),false);assert.equal(sameSharedState({balance:0},{}),false);assert.equal(sameSharedState({name:''},{}),false);
});

test('2.5 RTDB: legacy duplicate orderMode is equivalent, distinct or future extensions are preserved',()=>{
  const a={combat:{orderMode:'automatic'}};
  const migrated=migrateSnapshot({schemaVersion:3,reserve:[],combat:{round:0,order:[],participants:[],orderMode:'manual'},log:[],diceLines:[]}).data;
  assert.equal(migrated.combat.orderMode,'manual');assert.equal(migrated.combat.extensions?.orderMode,undefined);
  assert.equal(sameSharedState(a,{combat:{orderMode:'automatic',extensions:{orderMode:'automatic'}}}),true);
  assert.equal(sameSharedState(a,{combat:{orderMode:'automatic',extensions:{orderMode:'manual'}}}),false);
  assert.equal(sameSharedState(a,{combat:{orderMode:'automatic',extensions:{future:{keep:true}}}}),false);
});
