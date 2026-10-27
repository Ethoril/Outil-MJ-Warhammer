import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution, applyResolution } from '../js/core/resolution.js';
import { previewCombatFailure } from '../js/core/v5-combat-fumbles.js';

const q = (id, parameter = '') => ({ id, parameter });

test('T2 bis characterization — Explosion secondaire réduit les dégâts par PA d’armure en inventaire', () => {
  const actor={id:'shooter',camp:'hero',zone:'active',hp:20,caracs:{CT:60,F:40,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const primary={id:'primary',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const secondary={id:'secondary',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{E:30},states:[],skills:[],
    equipment:[{id:'mail',kind:'armour',name:'Cotte',ap:2,layer:'mail',locations:['head','body','leftArm','rightArm','leftLeg','rightLeg'],keywords:[]}],extensions:{v5:{}}};
  const participants=[actor,primary,secondary];
  const preview=previewResolution({actor,target:primary,baseRevision:0,round:1,roll:21,
    action:{type:'attack',attr:'CT',base:60,damage:8,qualities:[q('explosion','3')]},attackContext:{ranged:true},
    v5:{kind:'ranged',context:{explosionTargetIds:['primary','secondary'],explosionLocationRollsById:{secondary:35}}},v5State:{participants}});
  assert.equal(preview.secondaryTargets[0].damage.targetArmour,2);
  assert.equal(preview.secondaryTargets[0].damage.finalDamage,3,'8 dégâts − BE 3 − PA d’inventaire 2');
  const applied=applyResolution(preview,{revision:0,round:1,participants,appliedResolutionIds:[]});
  assert.equal(applied.status,'applied');
  assert.equal(applied.state.participants.find(row=>row.id==='secondary').hp,17);
});

test('T2 bis characterization — Maladresse 10 transmet le BF du tireur aux dégâts sur l’allié', () => {
  const actor={id:'shooter',camp:'hero',zone:'active',hp:12,caracs:{F:40,E:30},states:[],equipment:[]};
  const ally={id:'ally',camp:'hero',zone:'active',hp:12,maxHp:12,caracs:{E:30},states:[],equipment:[]};
  const normalized={actor,action:{type:'attack',damage:'BF+2'},resolutionId:'fumble-ally',v5State:{participants:[actor,ally]}};
  const result=previewCombatFailure({normalized,fumble:{expanded:false},context:{fumbleRoll:10,allyCandidates:['ally'],fumbleAllySelectionRoll:50,fumbleAllyUnitsRoll:3}});
  const hit=result.effects.find(effect=>effect.type==='hit-ally');
  assert.equal(hit.damage,6,'BF 4 + arme 2; le dé des unités (3) intervient séparément dans les DR');
});
