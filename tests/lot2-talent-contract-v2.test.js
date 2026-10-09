import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import registry from '../js/data/v5-talent-contracts.json' with {type:'json'};
import {getReferenceCatalogue} from '../js/core/reference-catalog.js';
import {evaluateTalentContractsV2,validateTalentContractV2,reduceV5ConditionProposals} from '../js/core/talent-contract-v2.js';
import {previewV5ActionCosts,commitV5ActionCosts} from '../js/core/v5-action-costs.js';
import {acquireV5Conditions} from '../js/core/v5-effects.js';

const hash=text=>'sha256:'+createHash('sha256').update(text).digest('hex');
const sourceHashes=Object.fromEntries(getReferenceCatalogue().talents.map(item=>[item.id,hash(item.description)]));
const contract=id=>registry.contracts.find(item=>item.talentId===id);
const state=()=>({revision:1,participants:[{id:'a',hp:10,caracs:{E:30},states:[],extensions:{v5:{hasMomentum:true,resources:{fortune:2}}}}]});
const evaluate=(talentId,options={})=>evaluateTalentContractsV2({contracts:registry.contracts,acquisitions:[{talentId}],sourceHashes,
  event:'damage.beforeProtection',role:'attacker',context:{kind:'ranged',aimed:false,attack:{success:true,hit:true}},...options});
const clock={encounterId:'enc',round:1,turnId:'a-turn-1'};
const iron=extra=>evaluate('talent-iron-jaw',{event:'condition.beforeAcquire',role:'defender',context:{condition:{id:'sonne',instances:2}},
  state:state(),actorId:'a',actionId:'gain-stunned',clock,...extra});

test('2.3 real contracts — cinq identités traçables, cinq validées, descriptions publiques épinglées',()=>{
  assert.equal(registry.contracts.length,5);
  assert.equal(registry.contracts.filter(item=>item.status==='validated').length,5);
  for(const item of registry.contracts){assert.equal(validateTalentContractV2(item),true);assert.equal(item.source.effectHash,sourceHashes[item.talentId]);assert.equal(hash(registry.sourceDescriptions[item.talentId]),item.source.effectHash);}
  assert.equal(getReferenceCatalogue().talents.length,206);
  assert.equal(contract('talent-beat-blade').status,'validated');
});

test('2.3 real Tir précis — +1 sans visée, +2 avec visée, aucun multiplicateur rang implicite',()=>{
  for(const [aimed,amount] of [[false,1],[true,2]]){
    const plan=evaluate('talent-accurate-shot',{acquisitions:[{talentId:'talent-accurate-shot',rank:4}],context:{kind:'ranged',aimed,attack:{success:true,hit:true}}});
    assert.equal(plan.ready,true);assert.equal(plan.proposals.length,1);assert.equal(plan.proposals[0].amount,amount);
  }
});

test('2.3 real Tir précis — échec, mêlée et défense n’obtiennent pas le bonus',()=>{
  for(const context of [{kind:'ranged',aimed:true,attack:{success:false,hit:false}},{kind:'melee',aimed:true,attack:{success:true,hit:true}},{kind:'ranged',aimed:true,attack:{success:true,hit:false}}]){
    const plan=evaluate('talent-accurate-shot',{context});assert.equal(plan.ready,true);assert.equal(plan.proposals.length,0);
  }
  assert.equal(evaluate('talent-accurate-shot',{role:'defender'}).proposals.length,0);
});

test('2.3 real Tir précis — visée inconnue garde plan non prêt sans inventer le petit bonus',()=>{
  const plan=evaluate('talent-accurate-shot',{context:{kind:'ranged',attack:{success:true,hit:true}}});
  assert.equal(plan.ready,false);assert.equal(plan.proposals.length,0);assert.ok(plan.unresolved.every(row=>row.fields.includes('aimed')));
});

test('2.3 real Coup puissant — bonus dépend Avantage V5 net explicitement déclaré et arme de mêlée',()=>{
  for(const [usedAdvantageV5,amount] of [[false,1],[true,2]]){
    const plan=evaluate('talent-strike-mighty-blow',{context:{kind:'melee',weapon:{isMelee:true},attack:{hit:true,usedAdvantageV5}}});
    assert.equal(plan.proposals[0].amount,amount);
  }
  const ranged=evaluate('talent-strike-mighty-blow',{context:{kind:'ranged',weapon:{isMelee:false},attack:{success:true,hit:true}}});
  assert.equal(ranged.ready,true);assert.equal(ranged.proposals.length,0);
  const unknown=evaluate('talent-strike-mighty-blow',{context:{kind:'melee',weapon:{isMelee:true},attack:{success:true,hit:true}}});
  assert.equal(unknown.ready,false);assert.equal(unknown.proposals.length,0);
});

test('2.3 real Mâchoires d’acier — première acquisition réduction et usage dans une même action atomique',()=>{
  const current=state(),talent=iron({state:current});assert.equal(talent.ready,true);assert.equal(talent.proposals[0].amount,1);
  const costs=previewV5ActionCosts({state:current,actionId:'gain-stunned',actorId:'a',clock,costs:talent.costs,quotas:talent.quotas});
  const applied=commitV5ActionCosts(costs,current,{resolveAction:draft=>{
    const reduced=reduceV5ConditionProposals([{key:'sonne',name:'Sonné',level:2,source:{kind:'critical',resolutionId:'critical-1'}}],talent.proposals);
    const receipt=acquireV5Conditions(draft.participants[0],reduced);
    return {status:'applied',state:{...draft,participants:[receipt.participant]}};
  }});
  assert.equal(applied.status,'applied');assert.equal(applied.state.participants[0].states[0].level,1);
  assert.equal(applied.state.participants[0].extensions.v5.hasMomentum,false);
  const second=iron({state:applied.state,actionId:'gain-again'});
  assert.equal(second.ready,true);assert.equal(second.proposals.length,0);assert.ok(second.trace.some(row=>row.status==='quotaExhausted'));
});

test('2.3 real Mâchoires d’acier — acquisition1 réduite0 consomme usage, conserve Élan et aucun État',()=>{
  const current=state(),talent=iron({state:current,context:{condition:{id:'sonne',instances:1}}});
  const plan=previewV5ActionCosts({state:current,actionId:'gain-stunned',actorId:'a',clock,quotas:talent.quotas});
  const applied=commitV5ActionCosts(plan,current,{resolveAction:draft=>{
    const reduced=reduceV5ConditionProposals([{key:'sonne',name:'Sonné',level:1}],talent.proposals);
    return {status:'applied',state:{...draft,participants:[acquireV5Conditions(draft.participants[0],reduced).participant]}};
  }});
  assert.deepEqual(applied.state.participants[0].states,[]);
  assert.equal(applied.state.participants[0].extensions.v5.hasMomentum,true);
  assert.equal(applied.state.v5ActionLedger.quotaUsage[0].used,1);
});

test('2.3 real Mâchoires d’acier — autre État, zero proposé et rencontre suivante distincts',()=>{
  for(const condition of [{id:'hemorragique',instances:2},{id:'sonne',instances:0}])assert.equal(iron({context:{condition}}).quotas.length,0);
  const current=state(),first=iron({state:current});
  const plan=previewV5ActionCosts({state:current,actionId:'gain-stunned',actorId:'a',clock,quotas:first.quotas});
  const applied=commitV5ActionCosts(plan,current,{resolveAction:draft=>({status:'applied',state:draft})});
  const next=iron({state:applied.state,actionId:'gain-later',clock:{...clock,encounterId:'enc2'}});
  assert.equal(next.proposals[0].amount,1);
});

test('2.3 real Mâchoires d’acier — registre ou rencontre inconnu bloque, aucun reset déduit',()=>{
  assert.equal(iron({state:undefined}).ready,false);
  assert.equal(iron({clock:{turnId:'a-turn-1',round:1}}).ready,false);
});

test('2.3 condition reductions — plafonnées0 et métadonnées distinctes conservées',()=>{
  const original=[{key:'sonne',name:'Sonné',level:1,id:'old',duration:2,v5Recovery:{kind:'medicalAttention'}},{key:'sonne',name:'Sonné',level:2,id:'new',source:{authorId:'x'}}];
  const reduced=reduceV5ConditionProposals(original,[{op:'reduceConditionAcquisition',key:'sonne',amount:2}]);
  assert.deepEqual(reduced,[{...original[1],level:1}]);assert.equal(original[0].level,1);
  assert.deepEqual(reduceV5ConditionProposals(original,[{op:'reduceConditionAcquisition',key:'sonne',amount:20}]),[]);
});

test('2.3 Battement — catalogue brouillon reste inactif même si choix exprimé',()=>{
  const plan=evaluate('talent-beat-blade',{contracts:[{...contract('talent-beat-blade'),status:'draft'}],event:'action.afterAttack',context:{kind:'melee',attack:{success:true,hit:true},actor:{id:'a',size:3},target:{id:'t',size:3}},choices:{'talent-beat-blade:replace-damage':true}});
  assert.equal(plan.proposals.length,0);assert.equal(plan.trace[0].status,'draft');
});

const beat=(extra={})=>{
  // Prototype capability test only. This local copy does not validate or activate the published draft.
  const prototype={...structuredClone(contract('talent-beat-blade')),status:'validated'};
  return evaluate('talent-beat-blade',{contracts:[prototype],event:'action.afterAttack',context:{kind:'melee',attack:{success:true,hit:true},actor:{id:'a',size:3},target:{id:'t',size:3},authorNextTurnEnd:{phase:'endOfTurn',round:2,turn:4,actorId:'a'}},choices:{'talent-beat-blade:replace-damage':true},...extra});
};

test('2.3 Battement prototype — choix oui crée remplacement et échéance auteur, exception Esquive explicite',()=>{
  const plan=beat();assert.equal(plan.ready,true);assert.equal(plan.proposals[0].op,'replaceDamage');
  assert.equal(plan.proposals[0].scope,'allDamage');
  const active=plan.proposals[1].timedEffect;
  assert.equal(active.restriction,'cannotOpposeWithMelee');assert.equal(active.advantageFilter,'meleeAttacksAgainstTarget');
  assert.deepEqual(active.v5Timing,{authorId:'a',targetId:'t',expiry:{phase:'endOfTurn',round:2,turn:4,actorId:'a',moment:'afterEffects'}});
});

test('2.3 Battement prototype — choix non ne demande pas échéance, plus grande cible inapplicable',()=>{
  assert.equal(beat({choices:{'talent-beat-blade:replace-damage':false},context:{kind:'melee',attack:{success:true,hit:true},actor:{size:3},target:{size:3}}}).proposals.length,0);
  const large=beat({context:{kind:'melee',attack:{success:true,hit:true},actor:{size:3},target:{size:4}}});
  assert.equal(large.ready,true);assert.equal(large.proposals.length,0);
});

test('2.3 Battement prototype — choix, taille ou fin prochain Tour inconnus empêchent application',()=>{
  assert.equal(beat({choices:{}}).ready,false);
  assert.equal(beat({context:{kind:'melee',attack:{success:true,hit:true},actor:{id:'a',size:3},target:{id:'t'}}}).ready,false);
  assert.equal(beat({context:{kind:'melee',attack:{success:true,hit:true},actor:{id:'a',size:3},target:{id:'t',size:3}}}).ready,false);
  assert.throws(()=>beat({context:{kind:'melee',attack:{success:true,hit:true},actor:{id:'a',size:3},target:{id:'t',size:3},authorNextTurnEnd:{phase:'endOfTurn',round:2,turn:4,actorId:'t'}}}),/auteur/);
});

test('2.3 source — description changée ou absente ne produit aucun effet automatique',()=>{
  for(const overrides of [{sourceHashes:{}},{sourceHashes:{'talent-accurate-shot':'sha256:'+'f'.repeat(64)}}]){
    const plan=evaluate('talent-accurate-shot',overrides);assert.equal(plan.proposals.length,0);assert.ok(['sourceChanged','sourceUnavailable'].includes(plan.trace[0].status));
  }
});

test('2.3 schema2 — les formules, champs cachés et opérations non couvertes sont rejetés',()=>{
  const original=contract('talent-accurate-shot');
  for(const change of [draft=>draft.clauses[0].effects[0].amount='rank * 2',draft=>draft.clauses[0].effects[0].op='changeCharacteristic',
    draft=>draft.clauses[0].effects[0].expression='Math.random()',draft=>draft.clauses[0].when[0].otherField='ignored']){
    const draft=structuredClone(original);change(draft);assert.throws(()=>validateTalentContractV2(draft));
  }
});

test('2.3 schema2 — plan immuable sérialisable et sans tirage implicite',()=>{
  const old=Math.random;Math.random=()=>{throw new Error('no RNG');};
  try{const plan=evaluate('talent-accurate-shot');assert.deepEqual(JSON.parse(JSON.stringify(plan)),plan);assert.ok(Object.isFrozen(plan));}finally{Math.random=old;}
});

const syntheticActive=(id,amount=1)=>({schemaVersion:2,talentId:id,edition:'V5',status:'validated',ruleVersion:'synthetic.1',source:{effectHash:'sha256:'+'b'.repeat(64),reference:'Synthetic test only'},clauses:[{id:'active',event:'action.before',role:'actor',when:[],effects:[{op:'grantExtraAttack',stackGroup:id,stack:'unique'}],costs:[{id:`${id}:fortune`,resource:'fortune',amount}]}]});
test('2.3 schema2 — coûts de deux talents contrôlés ensemble et ne dépassent pas Fortune connue',()=>{
  const contracts=[syntheticActive('synthetic-one',1),syntheticActive('synthetic-two',2)];
  const plan=evaluateTalentContractsV2({contracts,acquisitions:contracts.map(item=>({talentId:item.talentId})),sourceHashes:Object.fromEntries(contracts.map(item=>[item.talentId,item.source.effectHash])),event:'action.before',role:'actor',state:state(),actorId:'a',actionId:'combo',clock});
  assert.equal(plan.ready,false);assert.equal(plan.extraAttack,true);assert.equal(plan.costPlan.balances[0].amount,3);
  assert.ok(plan.unresolved.some(item=>item.fields.includes('resources.fortune')));
});

test('2.3 schema2 — opération attaqueextra porte automatiquement quota paiement Élan',()=>{
  const talent=syntheticActive('synthetic-extra');talent.clauses[0].costs=[{id:'extra',resource:'momentum',amount:1}];
  const evaluateCurrent=current=>evaluateTalentContractsV2({contracts:[talent],acquisitions:[{talentId:talent.talentId}],sourceHashes:{[talent.talentId]:talent.source.effectHash},event:'action.before',role:'actor',state:current,actorId:'a',actionId:'extra-1',clock});
  const current=state(),plan=evaluateCurrent(current);assert.equal(plan.ready,true);assert.equal(plan.costPlan.usages[0].maximum,1);
  const applied=commitV5ActionCosts(plan.costPlan,current,{resolveAction:draft=>{draft.participants[0].extensions.v5.hasMomentum=true;return {status:'applied',state:draft};}});
  const next=evaluateTalentContractsV2({contracts:[talent],acquisitions:[{talentId:talent.talentId}],sourceHashes:{[talent.talentId]:talent.source.effectHash},event:'action.before',role:'actor',state:applied.state,actorId:'a',actionId:'extra-2',clock});
  assert.equal(next.proposals.length,0);assert.ok(next.trace.some(item=>item.status==='quotaExhausted'));
});
