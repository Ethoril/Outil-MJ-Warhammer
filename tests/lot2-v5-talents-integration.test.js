import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution, applyResolution, previewHpLoss } from '../js/core/resolution.js';
import { aggregateTalents, getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { currentV5TalentHashes, acquiredV5Talents, previewV5ReactionOpportunities } from '../js/core/v5-talents.js';
import { expireV5Effects } from '../js/core/v5-effects.js';
import { buildV5StoreActionInput, annotateV5StoreActionPreview, applyV5StoreAction, v5StoreActionResult } from '../js/core/v5-store-action.js';
const talents = (...nom) => aggregateTalents(nom.map(nom => ({nom}))).items;
const actor = extra => ({id:'a',name:'Auteur synthétique',zone:'active',hp:20,maxHp:20,caracs:{E:30,F:30},armor:{head:0,body:0,arms:0,legs:0},states:[],talents:[],...extra});
const target = extra => ({...actor(),id:'t',name:'Cible synthétique',...extra});
const input = extra => ({actor:actor(),target:target(),baseRevision:2,round:1,roll:23,action:{id:'sword',type:'attack',base:65,damage:4},
  defense:{base:30,roll:78,v5:{kind:'melee'}},v5:{kind:'melee'},...extra});
const state = p => ({revision:p.baseRevision,round:p.input.round,participants:[p.input.actor,p.input.target],v5ActionLedger:{appliedActions:[],quotaUsage:[]}});
const beat = extra => input({actor:actor({talents:talents('Battement')}),roll:22,action:{type:'attack',base:65,damage:60},
  v5:{kind:'melee',actorSize:3,targetSize:3,talentChoices:{'talent-beat-blade:replace-damage':true}},
  authorNextTurnEnd:{phase:'endOfTurn',actorId:'a',round:2,turn:3},...extra});
const envelope = (a=actor(),t=target()) => ({localRevision:2,combat:{round:1,currentActorId:'a',order:['a','t'],participants:[a,t]},
  extensions:{v5:{combatId:'synthetic-combat',turnIndex:1}},appliedResolutionIds:[]});
const storePreview = (e,raw) => {const prepared=buildV5StoreActionInput(e,raw);return annotateV5StoreActionPreview(previewResolution(prepared),prepared);};

test('2.3 acquired identities use normalized current snapshot rows; a talent name alone never activates',()=>{
  assert.equal(acquiredV5Talents(actor({talents:[{name:'Coup puissant',rank:1}]})).length,0);
  const a=actor({talents:talents('Coup puissant','Coup puissant')});
  assert.deepEqual(acquiredV5Talents(a),[{talentId:'talent-strike-mighty-blow',rank:2}]);
  assert.equal(previewResolution(input({actor:a})).damage.talentDamage,1,'rank already consolidated, bonus never multiplied');
});
test('2.3 source text changed or missing keeps automation disabled',()=>{
  const rows=getReferenceCatalogue().talents;
  const changed={talents:rows.map(row=>row.id==='talent-accurate-shot'?{...row,description:row.description+' changed'}:row)};
  assert.equal(currentV5TalentHashes(changed)['talent-accurate-shot'],'source-text-changed');
  assert.equal(currentV5TalentHashes({talents:[]})['talent-accurate-shot'],undefined);
});
test('2.3 Tir précis applies +1/+2 before protection, includes explicit visée in replay; failed and melee excluded',()=>{
  const a=actor({talents:talents('Tir précis')});
  const raw=input({actor:a,defense:undefined,action:{type:'attack',attr:'CT',base:60,damage:4},v5:{kind:'ranged',aimed:false}});
  const one=previewResolution(raw),two=previewResolution({...raw,v5:{kind:'ranged',aimed:true}});
  assert.equal(one.damage.talentDamage,1);assert.equal(two.damage.talentDamage,2);
  assert.equal(two.damage.finalDamage,one.damage.finalDamage+1);
  assert.equal(previewResolution({...raw,v5:{kind:'ranged'}}).unresolved.some(text=>text.includes('aimed')),true);
  assert.equal(previewResolution({...raw,roll:98}).damage,null);
  assert.equal(previewResolution(input({actor:a})).damage.talentDamage,undefined);
});
test('2.3 Coup puissant uses effective net Avantage; cancelled or paid Momentum provides only +1',()=>{
  const a=actor({talents:talents('Coup puissant'),extensions:{v5:{hasMomentum:true}}});
  const boosted=previewResolution(input({actor:a,v5:{kind:'melee',choice:'keep'}}));
  assert.equal(boosted.damage.talentDamage,2);
  const cancelled=previewResolution(input({actor:a,v5:{kind:'melee',disadvantageSources:[{id:'cancel'}]}}));
  assert.equal(cancelled.damage.talentDamage,1);
  const e=envelope(a),paid=storePreview(e,{actorId:'a',targetId:'t',action:{type:'attack',base:65,damage:4},roll:23,
    defense:{base:30,roll:78,v5:{kind:'melee'}},v5:{kind:'melee',extraAttack:true}});
  assert.equal(paid.test.advantage.net,0);assert.equal(paid.damage.talentDamage,1);
  const result=applyV5StoreAction(paid,e,current=>applyResolution(paid,current));
  assert.equal(result.status,'applied');assert.equal(result.state.participants[0].extensions.v5.hasMomentum,true,'winning regains after paying');
  const after=v5StoreActionResult(e,result);after.localRevision++;
  assert.equal(storePreview(after,{...paid.input,resolutionId:'another-paid-extra'}).actionCosts.ready,false,'regain does not reset same-turn quota');
});
test('2.3 Battement replaces ordinary/excess damage, all critical wounds/states/death/reminders, without critical dice',()=>{
  const p=previewResolution(beat({criticalRolls:{location:2,effect:100,secondEffect:100}}));
  assert.equal(p.unresolved.length,0);assert.equal(p.damage,null);assert.equal(p.critical,null);assert.equal(previewHpLoss(p),0);
  assert.equal(p.activeEffects.length,1);
  const result=applyResolution(p,state(p));
  assert.equal(result.status,'applied');assert.equal(result.state.participants[1].hp,20);
  assert.deepEqual(result.state.participants[1].states.map(row=>row.kind),['talent-active']);
  assert.equal(p.decisions.actor.options[0].summary.woundsLost,0);
  assert.equal(previewResolution(beat()).critical,null,'unused critical dice are never requested');
});
test('2.3 Battement keeps the independent defensive critical and its consequences',()=>{
  const p=previewResolution(beat({defense:{base:30,roll:22,v5:{kind:'melee'}},defenderCriticalRolls:{location:55,effect:20}}));
  assert.equal(p.critical,null);assert.ok(p.defenderCritical);
  const result=applyResolution(p,state(p));
  assert.equal(result.status,'applied');assert.equal(result.state.participants[1].hp,20);
  assert.ok(result.state.participants[0].hp<20 || result.state.participants[0].states.length>0);
});
test('2.3 Battement false/failed/large/unknown/self contexts never silently replace wounds',()=>{
  const declined=previewResolution(beat({v5:{kind:'melee',talentChoices:{'talent-beat-blade:replace-damage':false}}}));
  assert.equal(declined.damageReplacedByTalent,null);assert.ok(declined.damage);
  const large=previewResolution(beat({v5:{kind:'melee',actorSize:3,targetSize:4,talentChoices:{'talent-beat-blade:replace-damage':true}}}));
  assert.equal(large.damageReplacedByTalent,null);
  assert.equal(previewResolution(beat({roll:98})).damageReplacedByTalent,null);
  assert.equal(previewResolution(beat({v5:{kind:'melee'}})).unresolved.some(text=>text.includes('choices')),true);
  assert.equal(previewResolution(beat({authorNextTurnEnd:undefined})).unresolved.some(text=>text.includes('authorNextTurnEnd')),true);
  assert.equal(previewResolution(beat({target:target({id:'a'})})).unresolved.some(text=>text.includes('distinctFromAuthor')),true);
});
test('2.3 active Battement grants melee attackers Avantage, blocks target Melee opposition, permits Dodge and never boosts ranged',()=>{
  const p=previewResolution(beat()),after=applyResolution(p,state(p)).state;
  const t=after.participants.find(row=>row.id==='t');
  const forbidden=previewResolution(input({target:t,v5:{kind:'melee',choice:'keep'}}));
  assert.equal(forbidden.test.advantage.net,1);assert.ok(forbidden.unresolved.some(text=>text.includes('Battement')));
  const dodge=previewResolution(input({target:t,v5:{kind:'melee',choice:'keep'},defense:{base:40,roll:78,label:'Esquive',v5:{kind:'test'}}}));
  assert.equal(dodge.unresolved.length,0);assert.equal(dodge.test.advantage.net,1);
  const ranged=previewResolution(input({target:t,defense:undefined,v5:{kind:'ranged'},action:{type:'attack',base:60,damage:4}}));
  assert.equal(ranged.test.advantage.net,0);
});
test('2.3 Battement expiry uses the author next end of Turn; target turn and current author turn cannot expire it',()=>{
  const p=previewResolution(beat()),t=applyResolution(p,state(p)).state.participants[1];
  assert.equal(expireV5Effects(t,{phase:'endOfTurn',actorId:'t',round:1,turn:2}).removed.length,0);
  assert.equal(expireV5Effects(t,{phase:'endOfTurn',actorId:'a',round:1,turn:1}).removed.length,0);
  assert.equal(expireV5Effects(JSON.parse(JSON.stringify(t)),{phase:'endOfTurn',actorId:'a',round:2,turn:3}).removed.length,1);
});
test('2.3 Mâchoires reduces critical conditions before momentum and issues one persistent actor quota',()=>{
  const a=actor({talents:talents('Mâchoires d\u0027acier'),extensions:{v5:{hasMomentum:true}}}),e=envelope(a);
  const raw={actorId:'a',targetId:'t',action:{type:'attack',base:70,damage:0},roll:12,
    defense:{base:30,roll:22,v5:{kind:'melee'}},defenderCriticalRolls:{location:2,effect:20},v5:{kind:'melee',choice:'keep'}};
  const p=storePreview(e,raw);
  assert.equal(p.defenderCritical.application.states.filter(row=>row.key==='sonne').reduce((sum,row)=>sum+row.level,0),0);
  assert.equal(p.talentUsageRequests.length,1);assert.equal(p.talentUsageRequests[0].actorId,'a');
  const result=applyV5StoreAction(p,e,current=>applyResolution(p,current));
  assert.equal(result.status,'applied');assert.equal(result.state.v5ActionLedger.quotaUsage[0].used,1);
  const next=v5StoreActionResult(e,result);next.localRevision++;
  const again=storePreview(next,{...raw,resolutionId:'repeat-critical'});
  assert.equal(again.talentUsageRequests.length,0);
  assert.equal(again.defenderCritical.application.states.some(row=>row.key==='sonne'),true);
});

test('2.3 Assaut féroce offers a reaction only after a real melee hit, with post-result Momentum, Round quota and own cost',()=>{
  const a=actor({talents:talents('Assaut féroce')}),e=envelope(a);
  const p=storePreview(e,{actorId:'a',targetId:'t',action:{type:'attack',base:65,damage:4},roll:23,
    defense:{base:30,roll:78,v5:{kind:'melee'}},v5:{kind:'melee'}});
  assert.equal(p.unresolved.length,0,'ordinary action never pays a reaction in advance');
  assert.equal(p.talentUsageRequests.length,0);
  const applied=applyV5StoreAction(p,e,current=>applyResolution(p,current));
  const clock={encounterId:'synthetic-combat',round:1,turnId:'a-turn-1'};
  const offered=previewV5ReactionOpportunities(p,applied.state,clock);
  assert.equal(offered.proposals.length,1);
  assert.equal(offered.proposals[0].costs[0].resource,'momentum');
  assert.equal(offered.proposals[0].quotas[0].scope,'round');
  assert.equal(previewV5ReactionOpportunities({...p,hit:false},applied.state,clock).proposals.length,0);
  assert.equal(previewV5ReactionOpportunities({...p,test:{...p.test,kind:'ranged'}},applied.state,clock).proposals.length,0);
  const withoutMomentum=structuredClone(applied.state);withoutMomentum.participants[0].extensions.v5.hasMomentum=false;
  assert.equal(previewV5ReactionOpportunities(p,withoutMomentum,clock).proposals.length,0);
});

test('2.3 Coup puissant respects the actual source weapon even if the MJ changes Test nature',()=>{
  const a=actor({talents:talents('Coup puissant'),equipment:[{id:'bow',kind:'weapon',range:'24',category:'Arc'}]});
  const p=previewResolution(input({actor:a,action:{type:'attack',base:65,damage:4,extensions:{fiche:{equipmentId:'bow'}}},v5:{kind:'melee'}}));
  assert.equal(p.damage.talentDamage,undefined);
});
