import test from 'node:test';
import assert from 'node:assert/strict';
import L22 from '../js/data/bestiary/L22.json' with { type: 'json' };
import { previewResolution } from '../js/core/resolution.js';
import { previewSupplementalEquipment } from '../js/core/v5-supplemental-equipment.js';

test('F counter-review: Warp Blade Endurance is a real V5 test with converted +2 DR', () => {
  const actor={id:'attacker',caracs:{CC:80,F:40},skills:[{name:'Melee (Basic)',total:80}],equipment:[],states:[]};
  const target={id:'victim',hp:30,caracs:{E:40},equipment:[],states:[]};
  const preview=previewResolution({actor,target,action:{type:'attack',name:'Warp Blade',base:80,damage:10,qualities:[]},
    v5:{kind:'melee',context:{warpBladeEnduranceTest:{score:40,roll:61}}},roll:31,baseRevision:1});
  assert.equal(preview.supplementalEquipment.enduranceTest?.score,40);
  assert.equal(preview.supplementalEquipment.enduranceTest?.roll,61);
  assert.ok(preview.supplementalEquipment.enduranceTest?.details.modifiers.some(row=>row.amount===2), 'V4 +20 becomes V5 +2 DR');
  assert.ok(preview.targetConditionApplication.some(row=>row.name==='Sonné'), 'failed test should apply Sonné');
});

test('F counter-review: actual Bonebreaker critical without a wound does not expose the target', () => {
  const profile=L22.profiles.find(row=>row.name==='Rat Ogre Bonebreaker');
  const shard=profile.attacks.find(row=>row.name==='Warpstone Shard*');
  const actualAttack={name:shard.name,damage:shard.damage,qualities:shard.qualities};
  const result=previewSupplementalEquipment({item:actualAttack,actor:{id:'bonebreaker'},target:{id:'victim'},
    hit:true,damage:{finalDamage:0},critical:{severity:'critical'}});
  assert.equal(result.exposure,null);
});
