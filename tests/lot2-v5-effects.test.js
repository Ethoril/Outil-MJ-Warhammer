import test from 'node:test';
import assert from 'node:assert/strict';
import { acquireV5Conditions, recoverV5Condition, createV5TimedEffect, expireV5Effects, advanceV5Effects, healV5Wounds, V5_CONDITION_KEYS } from '../js/core/v5-effects.js';
const actor = extra => ({id:'target',hp:20,maxHp:20,caracs:{E:50},armor:{head:1,body:2,arms:1,legs:1},states:[],extensions:{v5:{hasMomentum:true},custom:'keep'},...extra});
const state = (name,level=1,extra={}) => ({name,level,...extra});
const count = (participant,key) => participant.states.filter(effect=>effect.key===key).reduce((total,effect)=>total+effect.level,0);
const endRound = round => ({phase:'endOfRound',round,actorId:'other',turn:8});
const endTurn = (actorId='target',round=1,turn=1) => ({phase:'endOfTurn',actorId,round,turn});
const success = sl => ({success:true,sl});
const failure = sl => ({success:false,sl});

for(const key of V5_CONDITION_KEYS)test(`V5 Effects — ${key} acquisition preserves correct stackability`,()=>{
  const before=actor({caracs:{E:100}}),isUnique=['souille','a-terre','surpris','inconscient'].includes(key);
  const one=acquireV5Conditions(before,[{key,level:2}],{authorId:'source',targetId:'target',round:1});
  assert.equal(count(one.participant,key),isUnique?1:2);
  const two=acquireV5Conditions(one.participant,[{key,level:2}],{authorId:'source',round:2});
  assert.equal(count(two.participant,key),isUnique?1:4);
  assert.equal(two.acquiredInstances,isUnique?0:2);
  assert.equal(one.participant.extensions.custom,'keep');
  assert.equal(one.participant.extensions.v5.hasMomentum,false);
  assert.equal(before.states.length,0);
});
test('V5 Effects — legacy duration is not a level; new occurrence preserves its own duration and metadata',()=>{
  const before=actor({states:['Sonné|2',state('Mystère',1,{custom:{owner:'unknown'},source:'legacy'})]});
  const result=acquireV5Conditions(before,[state('Sonné',2,{duration:5,custom:'new'})]);
  assert.equal(count(result.participant,'sonne'),3);
  assert.deepEqual(result.participant.states.filter(s=>s.key==='sonne').map(s=>s.duration),[2,5]);
  assert.deepEqual(result.participant.states.find(s=>s.key==='mystere').custom,{owner:'unknown'});
  assert.equal(result.participant.states.find(s=>s.key==='mystere').source,'legacy');
  assert.notDeepEqual(result.participant,before);
});
test('V5 Effects — excess Stunned causes Unconscious, removes all Stunned and loses Momentum once',()=>{
  const before=actor({caracs:{E:30},states:[state('Sonné',2)]});
  const result=acquireV5Conditions(before,[state('Sonné',2)]);
  assert.equal(count(result.participant,'sonne'),0);
  assert.equal(count(result.participant,'inconscient'),1);
  assert.equal(result.acquiredInstances,4);
  assert.equal(count(result.participant,'extenue'),1);
  assert.equal(result.removed.reduce((n,s)=>n+s.level,0),4);
  assert.equal(result.ready,true);
});
test('V5 Effects — an unknown Toughness does not invent unconsciousness',()=>{
  const result=acquireV5Conditions(actor({caracs:{}}),[state('Sonné',1)]);
  assert.equal(result.ready,false);assert.equal(count(result.participant,'inconscient'),0);
  assert.ok(result.needsInput.some(item=>item.field==='toughnessBonus'));
});
test('V5 Effects — reacquiring Prone does not lose regained Momentum or refresh duration',()=>{
  const before=actor({states:[state('À Terre',1,{duration:2})]});
  const result=acquireV5Conditions(before,[state('À Terre',1,{duration:9})]);
  assert.equal(result.acquiredInstances,0);assert.equal(result.participant.extensions.v5.hasMomentum,true);
  assert.equal(result.participant.states[0].duration,2);
});
test('V5 Effects — bleed and poison occur at Round end, never another actor’s or own Turn end',()=>{
  const before=actor({states:[state('Hémorragique',2),state('Empoisonné',1)]});
  assert.equal(advanceV5Effects(before,endTurn('other')).participant.hp,20);
  assert.equal(advanceV5Effects(before,endTurn()).participant.hp,20);
  const result=advanceV5Effects(before,endRound(1));
  assert.equal(result.participant.hp,17);assert.equal(result.hpDelta,-3);assert.equal(result.ready,true);
  assert.equal(result.participant.extensions.v5.hasMomentum,false);
});
test('V5 Effects — fire adds one Damage per additional instance, uses lowest armour and explicit d10',()=>{
  const before=actor({caracs:{E:30},states:[state('Enflammé',3)]});
  const result=advanceV5Effects(before,endRound(1),{fireRoll:5});
  assert.equal(result.participant.hp,17);assert.equal(result.hpDelta,-3);
  assert.match(result.reminders[0],/1d10\(5\) \+ 2 − BE\(3\) − PA\(1\) = 3/);
});
test('V5 Effects — missing fire dice/protection does not guess Damage',()=>{
  const before=actor({armor:{},states:[state('Enflammé',1)]});
  const result=advanceV5Effects(before,endRound(1));
  assert.equal(result.participant.hp,20);assert.equal(result.ready,false);
  assert.ok(result.needsInput.some(item=>item.field==='fireRoll'));
  assert.ok(result.needsInput.some(item=>item.field==='fireArmour'));
  assert.throws(()=>advanceV5Effects(before,endRound(1),{fireRoll:0,fireArmour:0}));
});
test('V5 Effects — fire wholly absorbed causes no Momentum loss or false critical',()=>{
  const result=advanceV5Effects(actor({states:[state('Enflammé',1)]}),endRound(1),{fireRoll:1});
  assert.equal(result.participant.hp,20);assert.equal(result.participant.extensions.v5.hasMomentum,true);
  assert.deepEqual(result.criticalRequests,[]);
});
test('V5 Effects — fire to exactly zero requests a Body critical; ordinary Wounds stop at zero',()=>{
  const result=advanceV5Effects(actor({hp:2,caracs:{E:30},states:[state('Enflammé',1)]}),endRound(1),{fireRoll:6});
  assert.equal(result.participant.hp,0);
  assert.deepEqual(result.criticalRequests,[{location:'BODY',reason:'ablaze-zero-wounds',bonus:0}]);
  assert.equal(count(result.participant,'inconscient'),0);
});
test('V5 Effects — bleeding at zero requests Endurance instead of forcing Unconscious or critical',()=>{
  const before=actor({hp:1,states:[state('Hémorragique',3)]});
  const missing=advanceV5Effects(before,endRound(1));assert.equal(missing.ready,false);assert.equal(count(missing.participant,'inconscient'),0);
  const resisted=advanceV5Effects(before,endRound(1),{bleedingEnduranceTest:success(0)});
  assert.equal(resisted.participant.hp,0);assert.equal(count(resisted.participant,'inconscient'),0);assert.deepEqual(resisted.criticalRequests,[]);
  const collapsed=advanceV5Effects(before,endRound(1),{bleedingEnduranceTest:failure(-1)});
  assert.equal(count(collapsed.participant,'inconscient'),1);
});
for(const [roll,death,remaining] of [[1,true,3],[5,false,3],[10,false,2]])test(`V5 Effects — unconscious bleeding at zero uses death d10 ${roll}`,()=>{
  const result=advanceV5Effects(actor({hp:0,states:[state('Hémorragique',3),state('Inconscient')]}),endRound(1),{bleedingDeathRoll:roll});
  assert.equal(result.death,death);assert.equal(count(result.participant,'hemorragique'),remaining);
});
test('V5 Effects — ten Bleeding instances at zero and unconscious are fatal without a guessed die',()=>{
  const result=advanceV5Effects(actor({hp:0,states:[state('Hémorragique',10),state('Inconscient')]}),endRound(1));
  assert.equal(result.death,true);assert.equal(result.ready,true);
});
test('V5 Effects — poison at zero neither creates a critical nor forces Unconscious',()=>{
  const result=advanceV5Effects(actor({hp:1,states:[state('Empoisonné',2)]}),endRound(1));
  assert.equal(result.participant.hp,0);assert.equal(count(result.participant,'inconscient'),0);assert.deepEqual(result.criticalRequests,[]);
});
test('V5 Effects — poison death needs an explicit deadline and Test at BE intervals',()=>{
  const before=actor({hp:0,states:[state('Empoisonné'),state('Inconscient')],caracs:{E:30}});
  assert.equal(advanceV5Effects(before,endRound(3)).ready,false);
  const waiting=advanceV5Effects(before,endRound(3),{poisonDeathDueRound:4});assert.equal(waiting.ready,true);assert.equal(waiting.death,false);
  const resisted=advanceV5Effects(before,endRound(4),{poisonDeathDueRound:4,poisonEnduranceTest:success(0)});
  assert.equal(resisted.death,false);assert.equal(resisted.participant.extensions.v5.poisonDeathDueRound,7);
  assert.equal(advanceV5Effects(before,endRound(4),{poisonDeathDueRound:4,poisonEnduranceTest:failure(-1)}).death,true);
});
test('V5 Effects — zero-SL and higher recovery remove one then one per SL after the first',()=>{
  for(const [sl,remaining]of [[0,3],[1,3],[3,1]]){
    const result=recoverV5Condition(actor({states:[state('Sonné',4)]}),'sonne',{method:'endurance',test:success(sl),transition:endRound(2)});
    assert.equal(count(result.participant,'sonne'),remaining);
  }
});
test('V5 Effects — ending Stunned adds Fatigued only when absent; ending Poisoned adds one',()=>{
  const stunned=recoverV5Condition(actor({states:[state('Sonné')]}),'sonne',{method:'endurance',test:success(0),transition:endRound(2)});
  assert.equal(count(stunned.participant,'extenue'),1);
  const existing=recoverV5Condition(actor({states:[state('Sonné'),state('Exténué',2)]}),'sonne',{method:'endurance',test:success(0),transition:endRound(2)});
  assert.equal(count(existing.participant,'extenue'),2);
  const poison=recoverV5Condition(actor({states:[state('Empoisonné'),state('Exténué',2)]}),'empoisonne',{method:'heal',test:success(0)});
  assert.equal(count(poison.participant,'extenue'),3);assert.equal(poison.participant.extensions.v5.hasMomentum,false);
});
test('V5 Effects — deafened recovery occurs once per minute, not each Round',()=>{
  const before=acquireV5Conditions(actor(),[state('Assourdi',4)],{round:1}).participant;
  const premature=recoverV5Condition(before,'assourdi',{method:'endurance',test:success(2),transition:endRound(6)});
  assert.equal(premature.ready,false);assert.equal(count(premature.participant,'assourdi'),4);
  const due=recoverV5Condition(before,'assourdi',{method:'endurance',test:success(2),transition:endRound(7)});
  assert.equal(count(due.participant,'assourdi'),2);
  assert.equal(recoverV5Condition(due.participant,'assourdi',{method:'endurance',test:success(0),transition:endRound(8)}).ready,false);
  assert.equal(count(recoverV5Condition(due.participant,'assourdi',{method:'endurance',test:success(0),transition:endRound(13)}).participant,'assourdi'),1);
});
test('V5 Effects — Blinded removes one at its owner Turn end, with source recovery locks respected',()=>{
  const before=actor({states:[state('Aveuglé',1,{v5Recovery:{kind:'medicalAttention'}}),state('Aveuglé',2)]});
  assert.equal(count(advanceV5Effects(before,endTurn('other')).participant,'aveugle'),3);
  const one=advanceV5Effects(before,endTurn());assert.equal(count(one.participant,'aveugle'),2);
  const two=advanceV5Effects(one.participant,endTurn('target',2));assert.equal(count(two.participant,'aveugle'),1);
  const lock=advanceV5Effects(two.participant,endTurn('target',3));assert.equal(count(lock.participant,'aveugle'),1);
  assert.equal(count(recoverV5Condition(lock.participant,'aveugle',{method:'medical-attention',medicalAttention:true}).participant,'aveugle'),0);
});
test('V5 Effects — Fortune removes even a locked Condition without inventing that its cause ended',()=>{
  const result=recoverV5Condition(actor({states:[state('Inconscient',1,{v5Recovery:{kind:'causeEnded'}})]}),'inconscient',{method:'fortune',transition:endTurn()});
  assert.equal(count(result.participant,'inconscient'),0);assert.match(result.reminders[0],/cause persiste/);
  const reloaded=JSON.parse(JSON.stringify(result.participant));
  const returned=advanceV5Effects(reloaded,endRound(1));
  assert.equal(count(returned.participant,'inconscient'),1);
  assert.deepEqual(returned.participant.extensions.v5.pendingConditionReacquisition,[]);
});
test('V5 Effects — Surprise ends after a first attack attempt or at Round end',()=>{
  const before=actor({states:[state('Surpris')]});
  assert.equal(count(advanceV5Effects(before,endTurn()).participant,'surpris'),1);
  assert.equal(count(advanceV5Effects(before,{phase:'attackAttempt',targetId:'other',round:1}).participant,'surpris'),1);
  assert.equal(count(advanceV5Effects(before,{phase:'attackAttempt',targetId:'target',round:1}).participant,'surpris'),0);
  assert.equal(count(advanceV5Effects(before,endRound(1)).participant,'surpris'),0);
});
test('V5 Effects — timed expiration follows author clock while effect belongs to another target',()=>{
  const timed=createV5TimedEffect({id:'temporary',name:'Effet',level:1,unknown:{retained:true}},{authorId:'caster',targetId:'target',expiry:{phase:'endOfTurn',round:3,turn:6,actorId:'caster'}});
  const before=actor({states:[timed]});
  assert.equal(expireV5Effects(before,endTurn('caster',3,5)).participant.states.length,1);
  assert.equal(expireV5Effects(before,endTurn('other',4,9)).participant.states.length,1);
  assert.equal(expireV5Effects(before,endTurn('caster',3,6)).participant.states.length,0);
  assert.deepEqual(JSON.parse(JSON.stringify(timed)).unknown,{retained:true});
  assert.throws(()=>createV5TimedEffect(timed,{authorId:'caster',targetId:'target',expiry:{phase:'endOfTurn',round:3}}));
});
test('V5 Effects — legacy numerical duration decrements only on the target’s Turn',()=>{
  const before=actor({states:[state('Effet',1,{duration:2,custom:{retained:true}})]});
  assert.equal(advanceV5Effects(before,endTurn('other')).participant.states[0].duration,2);
  const own=advanceV5Effects(before,endTurn());assert.equal(own.participant.states[0].duration,1);assert.deepEqual(own.participant.states[0].custom,{retained:true});
  assert.equal(advanceV5Effects(own.participant,endTurn('target',2)).participant.states.length,0);
});
test('V5 Effects — expiry instant distinguishes before and after periodic effects',()=>{
  const timed=moment=>createV5TimedEffect(state('Enflammé'),{authorId:'caster',targetId:'target',expiry:{phase:'endOfRound',round:2,moment}});
  const before=advanceV5Effects(actor({states:[timed('beforeEffects')]}),endRound(2));assert.equal(before.ready,true);assert.equal(before.participant.hp,20);
  const after=advanceV5Effects(actor({states:[timed('afterEffects')]}),endRound(2),{fireRoll:8});assert.equal(after.participant.hp,18);assert.equal(after.participant.states.length,0);
});
test('V5 Effects — healing removes Bleeding by actual recovered Wounds, bounded by max Wounds',()=>{
  const result=healV5Wounds(actor({hp:19,states:[state('Hémorragique',3)]}),5);
  assert.equal(result.participant.hp,20);assert.equal(count(result.participant,'hemorragique'),2);
  const blocked=healV5Wounds(actor({hp:0,states:[state('Empoisonné')]}),5);assert.equal(blocked.participant.hp,0);assert.ok(blocked.reminders.length);
});
test('V5 Effects — explicit recoveries reject wrong method/time; Broken needs disengagement',()=>{
  assert.equal(recoverV5Condition(actor({states:[state('Sonné')]}),'sonne',{method:'unknown',test:success(2)}).ready,false);
  assert.equal(recoverV5Condition(actor({states:[state('Sonné')]}),'sonne',{method:'endurance',test:success(2),transition:endTurn()}).ready,false);
  assert.equal(recoverV5Condition(actor({states:[state('Brisé')]}),'brise',{method:'cool',test:success(0),transition:endRound(1)}).ready,false);
  assert.equal(count(recoverV5Condition(actor({states:[state('Brisé')]}),'brise',{method:'cool',test:success(0),engaged:false,transition:endRound(1)}).participant,'brise'),0);
});
test('V5 Effects — no implicit randomness and source inputs remain untouched',()=>{
  const original=Math.random,before=actor({states:[state('Enflammé'),state('Aveuglé')]}),snapshot=structuredClone(before);
  Math.random=()=>{throw new Error('Implicit random draw forbidden');};
  try{advanceV5Effects(before,endRound(1),{fireRoll:8});acquireV5Conditions(before,[state('Hémorragique')]);recoverV5Condition(before,'aveugle',{method:'fortune'});}
  finally{Math.random=original;}
  assert.deepEqual(before,snapshot);
});

test('V5 Effects — expiry of the final Stunned/Poisoned occurrence also acquires Fatigued',()=>{
  for(const name of ['Sonné','Empoisonné']){
    const before=actor({states:[state(name,1,{duration:1})]});
    const result=advanceV5Effects(before,endTurn());
    assert.equal(count(result.participant,'extenue'),1);
    assert.equal(result.participant.extensions.v5.hasMomentum,false);
  }
});
test('V5 Effects — newly acquired Unconscious plus Poisoned records the next BE deadline when the clock is known',()=>{
  const result=acquireV5Conditions(actor({caracs:{E:30},states:[state('Empoisonné')]}),[state('Inconscient')],{round:4});
  assert.equal(result.participant.extensions.v5.poisonDeathDueRound,7);
  assert.equal(advanceV5Effects(result.participant,endRound(6)).ready,true);
});

test('V5 Effects — a supplied recovery is consumed only at the declared clock phase',()=>{
  const before=actor({states:[state('Sonné',3)]});
  const inputs={recoveries:[{condition:'sonne',method:'endurance',test:success(1)}]};
  const end=advanceV5Effects(before,endTurn(),inputs);assert.equal(end.ready,true);assert.equal(count(end.participant,'sonne'),3);
  const round=advanceV5Effects(end.participant,endRound(1),inputs);assert.equal(count(round.participant,'sonne'),2);
  const start=advanceV5Effects(round.participant,{phase:'startOfTurn',actorId:'target',round:2,turn:2},inputs);assert.equal(start.ready,true);assert.equal(count(start.participant,'sonne'),2);
});

test('V5 Effects — newly added Deafened occurrences do not reset the existing minute clock',()=>{
  const initial=acquireV5Conditions(actor(),[state('Assourdi')],{round:1}).participant;
  const added=acquireV5Conditions(initial,[state('Assourdi')],{round:5}).participant;
  const recovered=recoverV5Condition(added,'assourdi',{method:'endurance',test:success(0),transition:endRound(7)});
  assert.equal(recovered.ready,true);assert.equal(count(recovered.participant,'assourdi'),1);
});
test('V5 Effects — removing Poisoned clears its death deadline; a later new poisoning gets a new clock',()=>{
  const initial=actor({states:[state('Empoisonné'),state('Inconscient')],extensions:{v5:{poisonDeathDueRound:4}}});
  const cured=recoverV5Condition(initial,'empoisonne',{method:'heal',test:success(0)});
  assert.equal(cured.participant.extensions.v5.poisonDeathDueRound,undefined);
  const poisoned=acquireV5Conditions(cured.participant,[state('Empoisonné')],{round:10});
  assert.equal(poisoned.participant.extensions.v5.poisonDeathDueRound,15);
  assert.throws(()=>recoverV5Condition(initial,'inconscient',{method:'cause-ended',causeEnded:true,amount:-1}));
});


test('Les soins reçus retirent Sonné avec verrou médical puis acquièrent Exténué',()=>{
  const actor={id:'medical-target',hp:10,maxHp:10,states:[{id:'medical-stun',name:'Sonné',level:1,v5Recovery:{kind:'medicalAttention'}}]};
  const before=structuredClone(actor);
  const locked=recoverV5Condition(actor,'medical-stun',{method:'medical-attention',medicalAttention:false});
  assert.equal(locked.removed.length,0);
  const recovered=recoverV5Condition(actor,'medical-stun',{method:'medical-attention',medicalAttention:true});
  assert.equal(recovered.ready,true);
  assert.equal(recovered.removed.length,1);
  assert.equal(recovered.participant.states.some(state=>state.name==='Sonné'),false);
  assert.equal(recovered.participant.states.some(state=>state.name==='Exténué'),true);
  assert.deepEqual(actor,before);
});


test('V5 Effects — a newly Deafened acquisition without a clock explicitly needs its current Round',()=>{
  const before=actor(),result=acquireV5Conditions(before,[state('Assourdi')]);
  assert.equal(result.ready,false);assert.ok(result.needsInput.some(item=>item.field==='currentRound'));
  assert.equal(result.participant.states[0].v5Timing,undefined);assert.deepEqual(before.states,[]);
});

test('V5 Effects — unconscious poison acquisition cannot silently omit a deadline or Toughness',()=>{
  const poison=actor({states:[state('Empoisonné')]});
  const noRound=acquireV5Conditions(poison,[state('Inconscient')]);
  assert.equal(noRound.ready,false);assert.ok(noRound.needsInput.some(item=>item.field==='currentRound'));
  assert.equal(noRound.participant.extensions.v5.poisonDeathDueRound,undefined);
  const noBonus=acquireV5Conditions({...poison,caracs:{}},[state('Inconscient')],{round:6});
  assert.equal(noBonus.ready,false);assert.ok(noBonus.needsInput.some(item=>item.field==='toughnessBonus'));
  assert.equal(noBonus.participant.extensions.v5.poisonDeathDueRound,undefined);
  const knownDeadline={...poison,states:[state('Empoisonné'),state('Inconscient')],extensions:{v5:{poisonDeathDueRound:8}}};
  assert.equal(acquireV5Conditions(knownDeadline,[state('Hémorragique')]).ready,true,'Existing known deadline is preserved');
});

test('V5 Effects — zero Toughness does not invent a poison death interval on acquisition',()=>{
  const result=acquireV5Conditions(actor({caracs:{E:9},states:[state('Empoisonné')]}),[state('Inconscient')],{round:3});
  assert.equal(result.ready,false);assert.ok(result.needsInput.some(item=>item.field==='poisonDeathDueRound'));
  assert.equal(result.participant.extensions.v5.poisonDeathDueRound,undefined);
});


test('V5 Effects — zero Toughness poison accepts explicit acquisition and subsequent survival deadlines',()=>{
  const poisoned=actor({caracs:{E:9},states:[state('Empoisonné')]});
  const acquired=acquireV5Conditions(poisoned,[state('Inconscient')],{round:3,poisonDeathDueRound:5});
  assert.equal(acquired.ready,true);assert.equal(acquired.participant.extensions.v5.poisonDeathDueRound,5);
  const omitted=advanceV5Effects(acquired.participant,endRound(5),{poisonEnduranceTest:success(0)});
  assert.equal(omitted.ready,false);assert.ok(omitted.needsInput.some(item=>item.field==='nextPoisonDeathDueRound'));
  const resisted=advanceV5Effects(acquired.participant,endRound(5),{poisonEnduranceTest:success(0),nextPoisonDeathDueRound:8});
  assert.equal(resisted.ready,true);assert.equal(resisted.participant.extensions.v5.poisonDeathDueRound,8);
  const failed=advanceV5Effects(acquired.participant,endRound(5),{poisonEnduranceTest:failure(-1)});
  assert.equal(failed.ready,true);assert.equal(failed.death,true);
  assert.throws(()=>acquireV5Conditions(poisoned,[state('Inconscient')],{round:3,poisonDeathDueRound:2}),/Round explicite/);
  assert.throws(()=>advanceV5Effects(acquired.participant,endRound(5),{poisonEnduranceTest:success(0),nextPoisonDeathDueRound:5}),/Prochain Round/);
});
