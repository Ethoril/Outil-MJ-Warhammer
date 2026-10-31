import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import registry from '../../../js/data/v5-talent-contracts.json' with { type: 'json' };
import { getReferenceCatalogue, aggregateTalents } from '../../../js/core/reference-catalog.js';
import { evaluateTalentContractsV2, validateTalentContractV2, reduceV5ConditionProposals } from '../../../js/core/talent-contract-v2.js';
import { previewV5ActionCosts, commitV5ActionCosts, prepareV5ActionState } from '../../../js/core/v5-action-costs.js';
import { acquireV5Conditions, createV5TimedEffect, recoverV5Condition, expireV5Effects, advanceV5Effects, healV5Wounds, V5_CONDITION_KEYS } from '../../../js/core/v5-effects.js';
import { evaluateTalentContracts, EXCLUDED_BASE_CHARACTERISTIC_TALENTS } from '../../../js/core/talent-contracts.js';
import { spawnSync } from 'node:child_process';
import { createStore } from '../../../js/core/store.js';
import registry_v5TestTalentContracts from '../../../js/data/v5-test-talent-contracts.json' with { type: 'json' };
import { currentV5TalentHashes, V5_TALENT_CONTRACTS, previewV5TalentConditions, acquiredV5Talents, previewV5ReactionOpportunities } from '../../../js/core/v5-talents.js';
import coverage from '../../../js/data/v5-talent-coverage.json' with { type: 'json' };
import { v5TalentCoverage, importedPjTalentPriorities } from '../../../js/core/v5-talent-coverage.js';
import { defenseOptions } from '../../../js/ui/resolution-panel.js';
import registry_v5QualityTalentContracts from '../../../js/data/v5-quality-talent-contracts.json' with { type: 'json' };
import { previewResolution, applyResolution, previewHpLoss } from '../../../js/core/resolution.js';
import { previewV5WeaponConditions, v5QualityMechanicalStatus } from '../../../js/core/v5-talent-qualities.js';
import { buildV5StoreActionInput, annotateV5StoreActionPreview, applyV5StoreAction, v5StoreActionResult } from '../../../js/core/v5-store-action.js';
import { buildCombatTest, hasMomentum } from '../../../js/core/v5-combat-rules.js';
import { applicableV5TalentTestFields, buildV5TalentTestContext } from '../../../js/core/v5-talent-tests.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { keywordMechanicalStatus } from '../../../js/core/keywords.js';
import { registerV5ReactionOpportunities, listV5ReactionOpportunities, validateV5ReactionInput, closeV5ReactionOpportunities } from '../../../js/core/v5-reactions.js';
import { sharedState } from '../../../js/core/sync-protocol.js';
import { migrateSnapshot } from '../../../js/core/migrations.js';

describe('Contrats de talent v2', () => {
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
  assert.equal(getReferenceCatalogue().talents.length,214);
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
});

describe('Contrats de talent', () => {
const hash = 'sha256:' + 'a'.repeat(64);
const ranged = { field: 'kind', op: 'eq', value: 'ranged' };
// Synthetic contracts exercise primitives; this does not activate any source talent.
const clause = (overrides = {}) => ({ id: 'base', event: 'damage.beforeProtection', role: 'attacker', when: [ranged],
  effect: { op: 'modifyDamage', stackGroup: 'synthetic-bonus', stack: 'max', amount: 1 }, ...overrides });
const contract = (overrides = {}) => ({ schemaVersion: 1, talentId: 'synthetic-talented-shot', edition: 'V5',
  status: 'validated', ruleVersion: 'synthetic.1', source: { effectHash: hash, reference: 'Test only' }, clauses: [clause()], ...overrides });
const evaluate = (overrides = {}) => evaluateTalentContracts({ contracts: [contract()],
  acquisitions: [{ talentId: 'synthetic-talented-shot', rank: 2 }], sourceHashes: { 'synthetic-talented-shot': hash },
  event: 'damage.beforeProtection', role: 'attacker', context: { kind: 'ranged' }, ...overrides });

test('contracts: a new talent is data with traceable operation, source and version', () => {
  const p = evaluate(); assert.equal(p.ready, true); assert.equal(p.proposals[0].amount, 1);
  assert.equal(p.proposals[0].origins[0].ruleVersion, 'synthetic.1');
  assert.equal(p.proposals[0].origins[0].source.effectHash, hash);
});
test('contracts: aim replaces the smaller bonus through explicit max stacking', () => {
  const aimed = clause({ id: 'aimed', when: [ranged, { field: 'aimed', op: 'eq', value: true }],
    effect: { op: 'modifyDamage', stackGroup: 'synthetic-bonus', stack: 'max', amount: 2 } });
  const p = evaluate({ contracts: [contract({ clauses: [clause(), aimed] })], context: { kind: 'ranged', aimed: true } });
  assert.equal(p.proposals.length, 1); assert.equal(p.proposals[0].amount, 2);
  assert.equal(p.proposals[0].origins.length, 2);
});
test('contracts: missing aim is an explicit pending question and prevents ready status', () => {
  const c = clause({ when: [ranged, { field: 'aimed', op: 'eq', value: true }] });
  const p = evaluate({ contracts: [contract({ clauses: [c] })] });
  assert.equal(p.ready, false); assert.deepEqual(p.unresolved[0].fields, ['aimed']); assert.equal(p.proposals.length, 0);
});
test('contracts: irrelevant melee does not ask missing aim', () => {
  const c = clause({ when: [ranged, { field: 'aimed', op: 'eq', value: true }] });
  const p = evaluate({ contracts: [contract({ clauses: [c] })], context: { kind: 'melee' } });
  assert.equal(p.ready, true); assert.deepEqual(p.unresolved, []); assert.equal(p.trace[0].status, 'notApplicable');
});
test('contracts: omitted rank does not become zero', () => {
  const c = clause({ effect: { op: 'modifyDamage', stackGroup: 'rank', stack: 'add', amount: { base: 1, perRank: 2 } } });
  assert.equal(evaluate({ contracts: [contract({ clauses: [c] })] }).proposals[0].amount, 5);
  const p = evaluate({ contracts: [contract({ clauses: [c] })], acquisitions: [{ talentId: 'synthetic-talented-shot' }] });
  assert.deepEqual(p.unresolved[0].fields, ['talent.rank']);
});
test('contracts: rank does not multiply a fixed amount by default', () => {
  assert.equal(evaluate({ acquisitions: [{ talentId: 'synthetic-talented-shot', rank: 4 }] }).proposals[0].amount, 1);
});
test('contracts: specialization is matched explicitly and missing data is exposed', () => {
  const c = clause({ when: [{ field: 'terrain', op: 'matchesSpecialization' }], requireSpecialization: true });
  const contracts = [contract({ clauses: [c] })];
  assert.equal(evaluate({ contracts, acquisitions: [{ talentId: 'synthetic-talented-shot', specialization: 'forest' }], context: { terrain: 'forest' } }).proposals.length, 1);
  assert.equal(evaluate({ contracts, acquisitions: [{ talentId: 'synthetic-talented-shot', specialization: 'forest' }], context: { terrain: 'city' } }).proposals.length, 0);
  assert.deepEqual(evaluate({ contracts, context: { terrain: 'forest' } }).unresolved[0].fields, ['talent.specialization']);
});
for (const [input, status] of [
  [{ contracts: [contract({ status: 'draft' })] }, 'draft'],
  [{ sourceHashes: {} }, 'sourceUnavailable'],
  [{ sourceHashes: { 'synthetic-talented-shot': 'sha256:' + 'b'.repeat(64) } }, 'sourceChanged'],
  [{ contracts: [] }, 'uncovered']
]) test(`contracts: ${status} never produces an effect`, () => {
  const p = evaluate(input); assert.equal(p.proposals.length, 0); assert.equal(p.trace[0].status, status);
});
test('contracts: the ten permanent characteristic talents stay excluded even with a validated contract', () => {
  assert.equal(EXCLUDED_BASE_CHARACTERISTIC_TALENTS.length, 10);
  for (const talentId of EXCLUDED_BASE_CHARACTERISTIC_TALENTS) {
    const p = evaluate({ contracts: [contract({ talentId })], acquisitions: [{ talentId, rank: 1 }], sourceHashes: { [talentId]: hash } });
    assert.equal(p.proposals.length, 0); assert.equal(p.trace[0].status, 'excludedBaseCharacteristic');
  }
});
test('contracts: defender and event clauses run only in their declared phase', () => {
  assert.equal(evaluate({ role: 'defender' }).proposals.length, 0);
  assert.equal(evaluate({ event: 'test.beforeRoll' }).proposals.length, 0);
  const c = clause({ role: 'defender' });
  assert.equal(evaluate({ role: 'defender', contracts: [contract({ clauses: [c] })] }).proposals.length, 1);
});
test('contracts: additive groups and unique quality effects retain both origins', () => {
  const add = clause({ effect: { op: 'modifyDamage', stackGroup: 'addition', stack: 'add', amount: 2 } });
  const quality = clause({ id: 'quality', effect: { op: 'addQuality', key: 'impact', stackGroup: 'impact', stack: 'unique' } });
  const p = evaluate({ contracts: [contract({ clauses: [add, { ...add, id: 'second' }, quality, { ...quality, id: 'second-quality' }] })] });
  assert.equal(p.proposals[0].amount, 4); assert.equal(p.proposals[1].op, 'addQuality');
  assert.equal(p.proposals[1].origins.length, 2);
});
test('contracts: different groups are not silently merged', () => {
  const c = clause({ id: 'other', effect: { op: 'modifyDamage', stackGroup: 'other', stack: 'max', amount: 2 } });
  assert.equal(evaluate({ contracts: [contract({ clauses: [clause(), c] })] }).proposals.length, 2);
});
test('contracts: group policy conflicts are rejected', () => {
  const c = clause({ id: 'other', effect: { op: 'modifyDamage', stackGroup: 'synthetic-bonus', stack: 'add', amount: 2 } });
  assert.throws(() => evaluate({ contracts: [contract({ clauses: [clause(), c] })] }), /cumul/);
});
test('contracts: unsupported operations, formulas and costs fail explicitly', () => {
  for (const effect of [
    { op: 'changeCharacteristic', stackGroup: 'x', stack: 'add', amount: 5 },
    { op: 'modifyDamage', stackGroup: 'x', stack: 'add', amount: 'rank * 2' },
    { op: 'modifyDamage', stackGroup: 'x', stack: 'add', amount: 1, cost: 'momentum' }
  ]) assert.throws(() => evaluate({ contracts: [contract({ clauses: [clause({ effect })] })] }));
  assert.throws(() => evaluate({ contracts: [contract({ clauses: [clause({ quota: 'oncePerTurn' })] })] }), /non couvert/);
});
test('contracts: unsupported predicates and hidden nested formulas are rejected', () => {
  assert.throws(() => evaluate({ contracts: [contract({ clauses: [clause({ when: [{ field: 'unknown', op: 'eq', value: true }] })] })] }));
  assert.throws(() => evaluate({ contracts: [contract({ clauses: [clause({ effect: { op: 'modifyDamage', stack: 'add', stackGroup: 'x', amount: { base: 1, perRank: 1, expression: 'x' } } })] })] }));
});
test('contracts: duplicate identities and unconverted editions are rejected', () => {
  assert.throws(() => evaluate({ contracts: [contract(), contract()] }));
  assert.throws(() => evaluate({ acquisitions: [{ talentId: 'synthetic-talented-shot', rank: 1 }, { talentId: 'synthetic-talented-shot', rank: 2 }] }));
  assert.throws(() => evaluate({ contracts: [contract({ edition: 'V4' })] }));
});
test('contracts: different specialized acquisitions can coexist', () => {
  const c = clause({ when: [{ field: 'terrain', op: 'matchesSpecialization' }] });
  const p = evaluate({ contracts: [contract({ clauses: [c] })], context: { terrain: 'forest' },
    acquisitions: [{ talentId: 'synthetic-talented-shot', specialization: 'forest' }, { talentId: 'synthetic-talented-shot', specialization: 'city' }] });
  assert.equal(p.proposals.length, 1); assert.equal(p.proposals[0].origins[0].specialization, 'forest');
});
test('contracts: named loss exceptions cannot become blanket Momentum immunity', () => {
  const c = clause({ event: 'momentum.beforeLoss', when: [{ field: 'momentum.lossReason', op: 'eq', value: 'oppositionLost' }],
    effect: { op: 'preventMomentumLoss', key: 'oppositionLost', stackGroup: 'guard', stack: 'unique' } });
  const contracts = [contract({ clauses: [c] })];
  assert.equal(evaluate({ contracts, event: 'momentum.beforeLoss', context: { momentum: { lossReason: 'oppositionLost' } } }).proposals.length, 1);
  assert.equal(evaluate({ contracts, event: 'momentum.beforeLoss', context: { momentum: { lossReason: 'woundsLost' } } }).proposals.length, 0);
});
test('contracts: preview does not mutate inputs and the plan survives JSON unchanged', () => {
  const contracts = [contract()], before = structuredClone(contracts);
  const p = evaluate({ contracts }); assert.deepEqual(contracts, before);
  assert.ok(Object.isFrozen(p.proposals[0].origins[0]));
  assert.deepEqual(JSON.parse(JSON.stringify(p)), p);
});
test('contracts: unsafe rank arithmetic cannot create unbounded effects', () => {
  const c = clause({ effect: { op: 'modifyDamage', stackGroup: 'x', stack: 'add', amount: { base: 0, perRank: 2 } } });
  assert.throws(() => evaluate({ contracts: [contract({ clauses: [c] })], acquisitions: [{ talentId: 'synthetic-talented-shot', rank: Number.MAX_SAFE_INTEGER }] }));
});

test('contracts: test phase yields distinct DR, Advantage and Disadvantage proposals', () => {
  const clauses = [
    clause({ id: 'dr', event: 'test.beforeRoll', effect: { op: 'modifySL', amount: -1, stackGroup: 'dr', stack: 'add' } }),
    clause({ id: 'a', event: 'test.beforeRoll', effect: { op: 'grantAdvantage', stackGroup: 'a', stack: 'unique' } }),
    clause({ id: 'd', event: 'test.beforeRoll', effect: { op: 'grantDisadvantage', stackGroup: 'd', stack: 'unique' } })
  ];
  const p = evaluate({ event: 'test.beforeRoll', contracts: [contract({ clauses })] });
  assert.deepEqual(p.proposals.map(x => x.op), ['modifySL', 'grantAdvantage', 'grantDisadvantage']);
  assert.equal(p.proposals[0].amount, -1);
  assert.throws(() => evaluate({ contracts: [contract({ clauses: [clause({ effect: clauses[0].effect })] })] }), /phase/);
});
test('contracts: condition acquisition reduction is scoped and cannot be negative', () => {
  const c = clause({ event: 'condition.beforeAcquire', when: [{ field: 'condition.id', op: 'eq', value: 'bleeding' }],
    effect: { op: 'reduceConditionAcquisition', key: 'bleeding', stackGroup: 'bleeding-reduction', stack: 'max', amount: 1 } });
  assert.equal(evaluate({ event: 'condition.beforeAcquire', context: { condition: { id: 'bleeding' } }, contracts: [contract({ clauses: [c] })] }).proposals[0].amount, 1);
  assert.equal(evaluate({ event: 'condition.beforeAcquire', context: { condition: { id: 'stunned' } }, contracts: [contract({ clauses: [c] })] }).proposals.length, 0);
  assert.throws(() => evaluate({ contracts: [contract({ clauses: [{ ...c, effect: { ...c.effect, amount: -1 } }] })] }));
});
test('contracts: declared set membership and numeric bounds use known context', () => {
  const c = clause({ when: [{ field: 'weapon.group', op: 'in', value: ['bow', 'crossbow'] }, { field: 'weapon.reach', op: 'gte', value: 2 }] });
  assert.equal(evaluate({ contracts: [contract({ clauses: [c] })], context: { weapon: { group: 'bow', reach: 2 } } }).proposals.length, 1);
  assert.equal(evaluate({ contracts: [contract({ clauses: [c] })], context: { weapon: { group: 'bow', reach: 1 } } }).proposals.length, 0);
  assert.deepEqual(evaluate({ contracts: [contract({ clauses: [c] })], context: { weapon: { group: 'bow' } } }).unresolved[0].fields, ['weapon.reach']);
});
});

describe('Controle V5 24', () => {
const registry = registry_v5TestTalentContracts;
const unverifiedSourceV4TalentIds=['talent-controlled-corruption','talent-wilful-corruption','talent-disciple-of-change','talent-double-life','talent-suffused-with-magic','talent-extra-spell'];

const owned=(id,extra={})=>({id,name:id,rank:1,status:'resolved',...extra});
const skill=name=>{const found=getReferenceCatalogue().skills.find(row=>row.nom===name);assert.ok(found,`Compétence publique inconnue : ${name}`);return found.id;};
const envelope=store=>{const value=JSON.parse(store.getFullJSON());delete value.exportedAt;return value;};
function memory(){let saved=null,reject=false;return {load:async()=>structuredClone(saved),saveAtomic:async({state})=>{if(reject)throw new Error('Disque de recette 2.4 indisponible');saved=structuredClone(state);return {ok:true};},snapshot:()=>structuredClone(saved),reject:value=>{reject=value;}};}
async function setup({actorTalents=[],targetTalents=[],actor={},target={}}={}){
 const persistence=memory(),store=createStore({persistence});await store.ready;
 const person=(id,talents,extra)=>({id,name:'Personnage synthétique '+id,kind:'PJ',camp:id==='control24-a'?'pj':'ennemi',zone:'active',hp:40,maxHp:40,initiative:50,caracs:{CC:60,CT:50,F:30,E:30,Ag:40,Soc:50},states:[],talents,armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{hasMomentum:false}},...extra});
 await store.loadFromJSON({schemaVersion:3,extensions:{v5:{combatId:'control24-combat',turnIndex:1}},reserve:[],combat:{round:1,currentActorId:'control24-a',order:['control24-a','control24-t'],participants:[person('control24-a',actorTalents,actor),person('control24-t',targetTalents,target)]},diceLines:[],log:[]});
 return {store,persistence,actorId:'control24-a',targetId:'control24-t'};
}
const person=(ctx,id)=>ctx.store.listParticipants().find(row=>row.id===id);
const testInput=(ctx,id,name,extra={})=>({resolutionId:id,actorId:ctx.actorId,action:{id:'context-test',type:'skill',attr:'Soc',base:50,extensions:{fiche:{skillId:skill(name)}}},roll:61,v5:{kind:'test'},...extra});
const hitInput=(ctx,id,extra={})=>({resolutionId:id,actorId:ctx.actorId,targetId:ctx.targetId,action:{id:'synthetic-club',type:'attack',attr:'CC',base:60,damage:3,qualities:['assommante']},roll:10,defense:{base:60,roll:40,v5:{kind:'melee'}},v5:{kind:'melee'},...extra});
const stun=subject=>(subject.states||[]).filter(row=>row.key==='sonne').reduce((sum,row)=>sum+row.level,0);
const proposals=p=>(p.talentPlans||[]).flatMap(row=>row.proposals||[]);

// Expectations come from the published V5 clauses, using Store commands rather than evaluator stubs.
test('Contrôle 2.4 — Discrétion urbaine donne Avantage, conserve seuil et ne modifie rien en aperçu',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-alley-cat')]});const before=envelope(ctx.store);
 const raw=testInput(ctx,'control24-urban','Discrétion (Urbaine)');const waiting=ctx.store.previewResolution(raw);
 assert.equal(waiting.test.score,50);assert.equal(waiting.test.advantage.net,1);assert.equal(waiting.choiceRequired,true);
 const reverse=ctx.store.previewResolution({...raw,v5:{kind:'test',choice:'reverse'}});assert.equal(reverse.roll,16);assert.equal(reverse.sl,4);assert.equal(reverse.success,true);
 assert.deepEqual(envelope(ctx.store),before);assert.equal((await ctx.store.applyResolution(waiting)).status,'manual');
 assert.equal(ctx.store.previewResolution(testInput(ctx,'control24-rural-other','Discrétion (Rurale)')).test.advantage.net,0);
});

test('Contrôle 2.4 — compétence liée à la fiche bat un contexte contrefait et un nom seul reste manuel',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-alley-cat')]});
 const canonical=testInput(ctx,'control24-authority','Charme',{v5:{kind:'test',context:{skillId:skill('Discrétion (Urbaine)')}}});
 assert.equal(ctx.store.previewResolution(canonical).test.advantage.net,0);
 const nameOnly={...testInput(ctx,'control24-name-only','Charme'),action:{type:'skill',base:50,note:'Discrétion (Urbaine)'}};
 assert.equal(ctx.store.previewResolution(nameOnly).test.advantage.net,0);
});

test('Contrôle 2.4 — Menteur et Orateur exigent leurs circonstances explicites',async()=>{
 for(const [id,field] of [['talent-cat-tongued','lying'],['talent-public-speaker','influencingGroup']]){
  const ctx=await setup({actorTalents:[owned(id)]}),raw=testInput(ctx,'control24-'+field,'Charme');
  const missing=ctx.store.previewResolution(raw);assert.ok(missing.unresolved.length>0);assert.equal((await ctx.store.applyResolution(missing)).status,'manual');
  const no=ctx.store.previewResolution({...raw,v5:{kind:'test',context:{[field]:false}}});assert.equal(no.test.advantage.net,0);
  const yes=ctx.store.previewResolution({...raw,v5:{kind:'test',choice:'reverse',context:{[field]:true}}});assert.equal(yes.roll,16);assert.equal(yes.test.advantage.net,1);
 }
});

test('Contrôle 2.4 — avantages linguistiques excluent Magick et respectent les IDs spécialisés',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-linguistics')]});
 assert.equal(ctx.store.previewResolution(testInput(ctx,'control24-language','Langue (Reikspiel)')).test.advantage.net,1);
 assert.equal(ctx.store.previewResolution(testInput(ctx,'control24-magick','Langue (Magick)')).test.advantage.net,0);
});

test('Contrôle 2.4 — Résistance compare la menace choisie, ne réussit jamais automatiquement',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-resistant',{specialization:'poison'})]});const raw=testInput(ctx,'control24-threat','Résistance');
 const matching=ctx.store.previewResolution({...raw,roll:98,v5:{kind:'test',context:{resistingThreat:true,threatId:'poison'}}});
 assert.equal(matching.test.advantage.net,1);assert.equal(matching.success,false);
 assert.equal(ctx.store.previewResolution({...raw,v5:{kind:'test',context:{resistingThreat:true,threatId:'maladie'}}}).test.advantage.net,0);
 const missing=ctx.store.previewResolution({...raw,v5:{kind:'test',context:{resistingThreat:true}}});assert.ok(missing.unresolved.length>0);
});

test('Contrôle 2.4 — DR ou unités exige choix explicite, conserve réussite et peut choisir le moindre résultat',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-master-of-disguise')]});const raw=testInput(ctx,'control24-sl-choice','Divertissement (Interprétation)',{roll:28});
 const missing=ctx.store.previewResolution(raw);assert.ok(missing.unresolved.length>0);assert.equal((await ctx.store.applyResolution(missing)).status,'manual');
 const dr=ctx.store.previewResolution({...raw,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':false}}});assert.equal(dr.sl,3);assert.equal(dr.success,true);
 const units=ctx.store.previewResolution({...raw,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':true}}});assert.equal(units.sl,8);assert.equal(units.test.score,50);assert.equal(units.success,true);
 const zero=ctx.store.previewResolution({...raw,roll:20,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':true}}});assert.equal(zero.sl,0);assert.equal(zero.success,true);assert.equal(zero.test.zeroOutcome,'marginalSuccess');
 const failed=ctx.store.previewResolution({...raw,roll:98});assert.equal(failed.success,false);assert.equal(failed.unresolved.length,0);
 const hundred=ctx.store.previewResolution({...raw,roll:100,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':true}}});assert.equal(hundred.success,false);assert.ok(!hundred.test.details.talentSLReplacement);assert.equal(hundred.unresolved.length,0);
});

test('Contrôle 2.4 — choix unités utilise jet final inversé et choix de l’option non retenue ne bloque pas',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-master-of-disguise')]});const raw=testInput(ctx,'control24-final-units','Divertissement (Interprétation)',{v5:{kind:'test',choice:'reverse',advantageSources:[{id:'control24-assisted',label:'Circonstance décidée par le MJ'}],talentChoices:{'talent-master-of-disguise:sl:reverse':true}}});
 const reverse=ctx.store.previewResolution(raw);assert.equal(reverse.roll,16);assert.equal(reverse.sl,6);assert.equal(reverse.success,true);assert.equal(reverse.unresolved.length,0);
 const zero=ctx.store.previewResolution({...raw,roll:6,action:{...raw.action,base:90},v5:{kind:'test',choice:'reverse',disadvantageSources:[{id:'control24-forced',label:'Désavantage déclaré'}],talentChoices:{'talent-master-of-disguise:sl:reverse':true}}});assert.equal(zero.roll,60);assert.equal(zero.sl,0);assert.equal(zero.success,true);assert.equal(zero.test.zeroOutcome,'marginalSuccess');assert.equal(zero.unresolved.length,0);
 const keep=ctx.store.previewResolution({...raw,v5:{...raw.v5,choice:'keep',talentChoices:{}}});assert.equal(keep.success,false);assert.equal(keep.unresolved.length,0);
});

test('Contrôle 2.4 — défenseur applique son propre choix DR/unités dans une opposition',async()=>{
 const ctx=await setup({targetTalents:[owned('talent-master-of-disguise')]});
 const raw={...testInput(ctx,'control24-defender-sl','Charme',{roll:24}),targetId:ctx.targetId,action:{type:'opposition',base:50},defense:{base:50,roll:28,label:'Interprétation',extensions:{fiche:{skillId:skill('Divertissement (Interprétation)')}},v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':true}}}};
 const p=ctx.store.previewResolution(raw);assert.equal(p.opposition.defender.sl,8);assert.equal(p.opposition.winner,'defender');assert.equal(p.unresolved.length,0);
 const zero=ctx.store.previewResolution({...raw,defense:{...raw.defense,roll:20}});assert.equal(zero.opposition.defender.sl,0);assert.equal(zero.opposition.defender.success,true);assert.equal(zero.opposition.defender.zeroOutcome,'marginalSuccess');assert.equal(zero.opposition.winner,'attacker');assert.equal(zero.unresolved.length,0);
});

test('Contrôle 2.4 — source publique modifiée ou absente bloque bonus même avec acquisition résolue',()=>{
 const canonical=getReferenceCatalogue();const contracts=registry.contracts.filter(row=>row.talentId==='talent-alley-cat');
 for(const catalogue of [{talents:canonical.talents.filter(row=>row.id!=='talent-alley-cat')},{talents:canonical.talents.map(row=>row.id==='talent-alley-cat'?{...row,description:row.description+' contrôle divergence'}:row)}]){
  const plan=evaluateTalentContractsV2({contracts,acquisitions:[{talentId:'talent-alley-cat',rank:1}],sourceHashes:currentV5TalentHashes(catalogue),event:'test.beforeRoll',role:'actor',context:{skillId:skill('Discrétion (Urbaine)')}});
  assert.equal(plan.proposals.length,0);assert.ok(plan.trace.some(row=>['sourceChanged','sourceUnavailable'].includes(row.status)));
 }
});
test('Contrôle 2.4 — acquisition non résolue ne donne aucun avantage ni qualité',async()=>{
 const ctx=await setup({actorTalents:[{name:'Chat de gouttière',rank:1},owned('talent-strike-to-stun',{status:'unresolved'})]});
 assert.equal(ctx.store.previewResolution(testInput(ctx,'control24-unresolved','Discrétion (Urbaine)')).test.advantage.net,0);
 const p=ctx.store.previewResolution(hitInput(ctx,'control24-unresolved-quality',{action:{type:'attack',base:60,damage:3,qualities:[]},v5:{kind:'melee',context:{weaponImprovised:true,silentTakedown:false}}}));
 assert.ok(!p.input.action.qualities.some(row=>row.id==='assommante'));assert.equal(stun(person(ctx,ctx.targetId)),0);
});

test('Contrôle 2.4 — décision contextuelle et son origine sont durables, annulables et rechargeables',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-master-of-disguise')]});const raw=testInput(ctx,'control24-durable-choice','Divertissement (Interprétation)',{roll:28,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':true}}});
 const before=envelope(ctx.store),p=ctx.store.previewResolution(raw);assert.equal((await ctx.store.applyResolution(p)).status,'applied');
 const detail=ctx.store.getLog()[0].detail;assert.equal(detail.sl,8);assert.ok(proposals(detail).some(row=>row.origins?.some(origin=>origin.talentId==='talent-master-of-disguise')));
 const reloaded=createStore({persistence:ctx.persistence});await reloaded.ready;assert.deepEqual(reloaded.getLog()[0].detail,detail);
 const exported=JSON.parse(reloaded.getFullJSON());assert.equal(exported.log[0].detail.sl,8);await reloaded.undo();assert.deepEqual(JSON.parse(JSON.stringify(reloaded.listParticipants())),before.combat.participants);
 await reloaded.redo();assert.equal(reloaded.getLog()[0].detail.sl,8);
});

test('Contrôle 2.4 — disque et révision périmée conservent décision/partie/historique',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-master-of-disguise')]});const p=ctx.store.previewResolution(testInput(ctx,'control24-disk','Divertissement (Interprétation)',{roll:28,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':true}}}));
 const before={state:envelope(ctx.store),saved:ctx.persistence.snapshot(),history:ctx.store.getHistory()};ctx.persistence.reject(true);
 assert.equal((await ctx.store.applyResolution(p)).status,'error');assert.deepEqual(envelope(ctx.store),before.state);assert.deepEqual(ctx.persistence.snapshot(),before.saved);assert.deepEqual(ctx.store.getHistory(),before.history);
 ctx.persistence.reject(false);await ctx.store.updateParticipant(ctx.actorId,{notes:'Révision suivante synthétique'});assert.equal((await ctx.store.applyResolution(p)).status,'stale');
});

test('Contrôle 2.4 — Assommante exige tête et seuil de Blessures perdues réel, seuil inclus',async()=>{
 const ctx=await setup();const p=ctx.store.previewResolution(hitInput(ctx,'control24-stun-threshold'));assert.equal(p.location.name,'Tête');assert.equal(p.damage.finalDamage,3);
 assert.equal((await ctx.store.applyResolution(p)).status,'applied');assert.equal(person(ctx,ctx.targetId).hp,37);assert.equal(stun(person(ctx,ctx.targetId)),1);
 const after=await setup({target:{armor:{head:1,body:0,arms:0,legs:0}}});const low=after.store.previewResolution(hitInput(after,'control24-below-threshold'));assert.equal(low.damage.finalDamage,2);assert.equal((await after.store.applyResolution(low)).status,'applied');assert.equal(stun(person(after,after.targetId)),0);
 const body=await setup();const offHead=body.store.previewResolution(hitInput(body,'control24-off-head',{roll:23,defense:{base:20,roll:81,v5:{kind:'melee'}}}));assert.notEqual(offHead.location.name,'Tête');assert.equal((await body.store.applyResolution(offHead)).status,'applied');assert.equal(stun(person(body,body.targetId)),0);
});

test('Contrôle 2.4 — protection et PV restants ne peuvent provoquer un Sonné avec dégâts théoriques',async()=>{
 const ctx=await setup({target:{hp:2}});const p=ctx.store.previewResolution(hitInput(ctx,'control24-real-hp',{criticalRolls:{secondEffect:1}}));assert.equal(p.damage.finalDamage,3);assert.equal((await ctx.store.applyResolution(p)).status,'applied');assert.equal(person(ctx,ctx.targetId).hp,0);assert.equal(stun(person(ctx,ctx.targetId)),0);
 const armored=await setup({target:{armor:{head:20,body:0,arms:0,legs:0}}});const zero=armored.store.previewResolution(hitInput(armored,'control24-absorbed',{action:{type:'attack',base:60,damage:3,qualities:['assommante','inoffensive']}}));assert.equal(zero.damage.finalDamage,0);assert.equal((await armored.store.applyResolution(zero)).status,'applied');assert.equal(stun(person(armored,armored.targetId)),0);
});

test('Contrôle 2.4 — qualité temporaire Frappe assommante ne multiplie pas rang et ne change pas arme source',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-strike-to-stun',{rank:4})]});const action={type:'attack',base:60,damage:3,qualities:[]};const before=structuredClone(action);
 const p=ctx.store.previewResolution(hitInput(ctx,'control24-improvised',{action,v5:{kind:'melee',context:{weaponImprovised:true,silentTakedown:false}}}));assert.deepEqual(action,before);assert.equal(p.input.action.qualities.filter(row=>row.id==='assommante').length,1);
 assert.equal((await ctx.store.applyResolution(p)).status,'applied');assert.equal(stun(person(ctx,ctx.targetId)),1);assert.deepEqual(action,before);
 const ordinary=ctx.store.previewResolution(hitInput(ctx,'control24-ordinary',{action,v5:{kind:'melee',context:{weaponImprovised:false}}}));assert.ok(!ordinary.input.action.qualities.some(row=>row.id==='assommante'));
});

test('Contrôle 2.4 — Mâchoires réduit Sonné Assommante une fois puis provenance/reload/undo persistent',async()=>{
 const ctx=await setup({targetTalents:[owned('talent-iron-jaw')]});const first=ctx.store.previewResolution(hitInput(ctx,'control24-iron-first'));assert.equal((await ctx.store.applyResolution(first)).status,'applied');assert.equal(stun(person(ctx,ctx.targetId)),0);
 const saved=ctx.persistence.snapshot();assert.equal(saved.extensions.v5.actionLedger.quotaUsage.find(row=>row.quotaId==='talent-iron-jaw:first-stunned').used,1);
 const reloaded=createStore({persistence:ctx.persistence});await reloaded.ready;const second=reloaded.previewResolution(hitInput({...ctx,store:reloaded},'control24-iron-second',{v5:{kind:'melee',choice:'keep'}}));assert.equal((await reloaded.applyResolution(second)).status,'applied');assert.equal(stun(reloaded.listParticipants().find(row=>row.id===ctx.targetId)),1);
 const state=reloaded.listParticipants().find(row=>row.id===ctx.targetId).states.find(row=>row.key==='sonne');assert.equal(state.source.kind,'quality');assert.equal(state.source.keywordId,'assommante');
 await reloaded.undo();assert.equal(stun(reloaded.listParticipants().find(row=>row.id===ctx.targetId)),0);await reloaded.redo();assert.equal(stun(reloaded.listParticipants().find(row=>row.id===ctx.targetId)),1);
});

test('Contrôle 2.4 — Battement annule aussi l’effet Assommante de la touche remplacée',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-beat-blade')]});const p=ctx.store.previewResolution(hitInput(ctx,'control24-beat-stun',{v5:{kind:'melee',actorSize:3,targetSize:3,talentChoices:{'talent-beat-blade:replace-damage':true}}}));assert.equal(p.damage,null);assert.equal((await ctx.store.applyResolution(p)).status,'applied');assert.equal(stun(person(ctx,ctx.targetId)),0);assert.equal(person(ctx,ctx.targetId).hp,40);
});

test('Contrôle 2.4 — coup ciblé conserve seuil et neutralisation p135 ne supprime pas cette pénalité',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-strike-to-stun')]});
 const targeted=ctx.store.previewResolution(hitInput(ctx,'control24-called-shot',{v5:{kind:'melee',context:{weaponImprovised:true,calledShot:true,calledShotLocation:'head',silentTakedown:false}}}));assert.equal(targeted.test.score,60);assert.equal(targeted.sl,3);
 const invalid=ctx.store.previewResolution(hitInput(ctx,'control24-silent-invalid',{v5:{kind:'melee',context:{weaponImprovised:true,calledShot:true,silentTakedown:true}}}));assert.ok(invalid.unresolved.some(row=>/Neutralisation silencieuse/.test(row)));assert.equal((await ctx.store.applyResolution(invalid)).status,'manual');
 const raw={resolutionId:'control24-silent-test',actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'opposition',base:60,attr:'CC',extensions:{fiche:{skillId:skill('Corps à corps (Bagarre)')}}},roll:61,defense:{base:30,roll:81,label:'Résistance',v5:{kind:'test'}},v5:{kind:'melee',choice:'reverse',context:{silentTakedown:true,outsideCombat:true,targetUnaware:true,calledShot:false}}};
 const p=ctx.store.previewResolution(raw);assert.equal(p.test.advantage.net,1);assert.equal(p.roll,16);assert.equal(p.damage,null);assert.equal(p.critical,null);assert.ok(p.reminders.some(row=>/Inconscient/.test(row)));
 const before=person(ctx,ctx.targetId);assert.equal((await ctx.store.applyResolution(p)).status,'applied');assert.equal(person(ctx,ctx.targetId).hp,before.hp);assert.equal(stun(person(ctx,ctx.targetId)),0);assert.ok(!person(ctx,ctx.targetId).states.some(row=>row.key==='inconscient'));assert.equal(person(ctx,ctx.actorId).extensions.v5.hasMomentum,false);
});
test('Contrôle 2.4 — Dur à cuire et dix bonus de caractéristiques ne sont jamais ajoutés dans action',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-hardy'),owned('talent-very-strong'),owned('talent-very-resilient')]});const before=person(ctx,ctx.actorId);
 const p=ctx.store.previewResolution(hitInput(ctx,'control24-no-double'));assert.equal((await ctx.store.applyResolution(p)).status,'applied');const after=person(ctx,ctx.actorId);assert.equal(after.maxHp,before.maxHp);assert.deepEqual(after.caracs,before.caracs);
});

test('Contrôle 2.4 — les 214 identités distinguent couverture vérifiée et sources V4 en attente',()=>{
 const catalogue=getReferenceCatalogue();assert.equal(coverage.items.length,214);assert.equal(new Set(coverage.items.map(row=>row.talentId)).size,214);
 assert.deepEqual(coverage.items.filter(row=>row.family==='supplement_v4_non_verifie').map(row=>row.talentId).sort(),[...unverifiedSourceV4TalentIds].sort());
 for(const row of catalogue.talents){const item=v5TalentCoverage(row.id);assert.ok(item.clauses.length>0);for(const clause of item.clauses){assert.ok(['automatic','assisted','reminder','excluded','deferred','owned','pending'].includes(clause.mode));assert.ok(clause.text?.trim());}
   if(unverifiedSourceV4TalentIds.includes(row.id)){assert.equal(item.status,'sourceUnverified');assert.ok(item.clauses.every(clause=>clause.mode==='pending'));assert.ok(!item.clauses.some(clause=>['automatic','assisted'].includes(clause.mode)));}
   else assert.equal(item.status,'verified');
 }
 const publicSpeaker=v5TalentCoverage('talent-public-speaker');assert.ok(publicSpeaker.clauses.some(row=>row.mode==='automatic'));assert.ok(publicSpeaker.clauses.some(row=>row.mode==='assisted'));assert.ok(publicSpeaker.clauses.some(row=>row.mode==='reminder'));assert.ok(!publicSpeaker.clauses.some(row=>row.mode==='pending'));
 const resistant=v5TalentCoverage('talent-resistant');assert.ok(resistant.clauses.some(row=>row.mode==='automatic'));assert.ok(resistant.clauses.some(row=>row.mode==='assisted'));
 assert.ok(v5TalentCoverage('talent-strong-minded').clauses.some(row=>row.mode==='assisted'));
 const changed=v5TalentCoverage('talent-public-speaker',{talents:catalogue.talents.map(row=>row.id==='talent-public-speaker'?{...row,description:row.description+' divergence synthétique'}:row)});assert.equal(changed.status,'sourceChanged');assert.ok(changed.clauses.every(row=>!['automatic','assisted'].includes(row.mode)));
 const absent=v5TalentCoverage('talent-public-speaker',{talents:[]});assert.equal(absent.status,'sourceUnavailable');assert.ok(absent.clauses.every(row=>!['automatic','assisted'].includes(row.mode)));
});

test('Contrôle 2.4 — dix caractéristiques déjà intégrées et magie/prière restent séparées des automatiques',()=>{
 assert.equal(coverage.items.filter(row=>row.clauses.some(clause=>clause.mode==='excluded')).length,10);
 assert.ok(v5TalentCoverage('talent-chaos-magic').clauses.some(row=>row.mode==='deferred'));
 // Béni et Invocation : le moteur divin les prend en charge (couverture du lot espèces, 28/10) ; rappel au MJ, plus différé.
 for(const id of ['talent-bless','talent-invoke'])assert.ok(v5TalentCoverage(id).clauses.some(row=>row.mode==='reminder'));
 assert.ok(v5TalentCoverage('talent-arcane-magic').clauses.some(row=>row.mode==='automatic'));assert.ok(v5TalentCoverage('talent-petty-magic').clauses.every(row=>row.mode==='owned'));
 assert.ok(v5TalentCoverage('talent-hardy').clauses.every(row=>row.mode==='owned'));
 assert.ok(v5TalentCoverage('talent-small').clauses.some(row=>row.mode==='assisted'));
 assert.ok(v5TalentCoverage('talent-riposte').clauses.some(row=>row.mode==='automatic'));
 assert.ok(v5TalentCoverage('talent-reaction-strike').clauses.some(row=>row.mode==='assisted'));assert.ok(!v5TalentCoverage('talent-reaction-strike').clauses.some(row=>row.mode==='pending'));assert.deepEqual(coverage.items.filter(row=>row.clauses.some(c=>c.mode==='pending')).map(row=>row.talentId).sort(),[...unverifiedSourceV4TalentIds].sort());
});

const imported=(charId,fingerprint,talents,extra={})=>({kind:'PJ',ficheSnapshot:{charId,source:{fingerprint},coverage:{talents:'present'},talents},...extra});
test('Contrôle 2.4 — priorité vient seulement de snapshots réellement importés et déduplique copies/scènes',()=>{
 const first=imported('synthetic-priority-a','snapshot-a',[owned('talent-public-speaker',{rank:2}),owned('talent-resistant',{specialization:'poison'}),owned('talent-resistant',{specialization:'maladie'})]);
 const second=imported('synthetic-priority-b','snapshot-b',[owned('talent-alley-cat')]);
 const e={reserve:[first,{kind:'PJ',talents:[owned('talent-strike-to-stun')]}],persistentCharacters:[structuredClone(first)],combat:{participants:[second,structuredClone(first)]},suspendedScenes:[{combat:{participants:[structuredClone(second)]}}]};
 const result=importedPjTalentPriorities(e);assert.equal(result.characters,2);assert.equal(result.acquisitions,5);assert.equal(result.ambiguousCharacters,0);assert.equal(result.items.find(row=>row.talentId==='talent-resistant').characters,1);assert.equal(result.items.find(row=>row.talentId==='talent-resistant').acquisitions,2);assert.ok(!result.items.some(row=>row.talentId==='talent-strike-to-stun'));
 const replacement=importedPjTalentPriorities({reserve:[imported('synthetic-new','snapshot-new',[owned('talent-trapper')])]});assert.deepEqual(replacement.items.map(row=>row.talentId),['talent-trapper']);assert.deepEqual(importedPjTalentPriorities({}).items,[]);
});

test('Contrôle 2.4 — snapshots divergents signalent ambiguïté, pas d’union de talents inventée',()=>{
 const result=importedPjTalentPriorities({reserve:[imported('synthetic-ambiguous','old',[owned('talent-public-speaker')])],combat:{participants:[imported('synthetic-ambiguous','new',[owned('talent-alley-cat')])]}});
 assert.equal(result.characters,1);assert.equal(result.ambiguousCharacters,1);assert.equal(result.acquisitions,0);assert.deepEqual(result.items,[]);
});

test('Contrôle 2.4 — Mains agiles Bagarre exige toucher en attaque, ne bonifie pas la défense Bagarre',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-fast-hands')],targetTalents:[owned('talent-fast-hands')]});
 const action={type:'attack',base:60,damage:3,extensions:{fiche:{skillId:skill('Corps à corps (Bagarre)')}}};
 const missing=ctx.store.previewResolution(hitInput(ctx,'control24-touch-missing',{action}));assert.ok(missing.unresolved.some(row=>/touchingOpponent/.test(row)));
 const punch=ctx.store.previewResolution(hitInput(ctx,'control24-normal-punch',{action,v5:{kind:'melee',context:{touchingOpponent:false}}}));assert.equal(punch.test.advantage.net,0);
 const touch=ctx.store.previewResolution(hitInput(ctx,'control24-touch',{action,v5:{kind:'melee',choice:'keep',context:{touchingOpponent:true}},defense:{base:60,roll:40,label:'Bagarre',extensions:{fiche:{skillId:skill('Corps à corps (Bagarre)')}},v5:{kind:'melee',context:{touchingOpponent:true}}}}));assert.equal(touch.test.advantage.net,1);assert.equal(touch.opposition.defender.advantage.net,0);
 const skillPreview=ctx.store.previewResolution({...testInput(ctx,'control24-fast-defender','Charme',{roll:28}),targetId:ctx.targetId,action:{type:'opposition',base:50},defense:{base:50,roll:61,label:'Escamotage',extensions:{fiche:{skillId:skill('Escamotage')}},v5:{kind:'test',choice:'reverse'}}});assert.equal(skillPreview.opposition.defender.roll,16);assert.equal(skillPreview.opposition.defender.advantage.net,1);
});

test('Contrôle 2.4 — Orateur et Menteur cumulent sources distinctes puis Désavantage annule une pour une',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-public-speaker'),owned('talent-cat-tongued')]});const raw=testInput(ctx,'control24-two-advantages','Charme',{v5:{kind:'test',choice:'reverse',context:{lying:true,influencingGroup:true}}});
 const two=ctx.store.previewResolution(raw);assert.equal(two.roll,16);assert.equal(two.test.advantage.net,2);assert.equal(two.sl,5);assert.equal(two.test.score,50);
 const cancelled=ctx.store.previewResolution({...raw,v5:{...raw.v5,disadvantageSources:[{id:'control24-counter',label:'Désavantage déclaré'}]}});assert.equal(cancelled.test.advantage.net,1);assert.equal(cancelled.sl,4);assert.equal(cancelled.roll,16);
});

test('Contrôle 2.4 — arme publiée non improvisée bat déclaration MJ incompatible et un nom seul ne suffit pas',async()=>{
 const item=getReferenceCatalogue().items.find(row=>row.name==='Épée'||row.name==='Sword'||(/epee/.test(row.id)&&row.kind==='weapon'));assert.ok(item,'Arme ordinaire publiée requise pour la recette');
 const ctx=await setup({actorTalents:[owned('talent-strike-to-stun')],actor:{equipment:[{id:'synthetic-sword',baseId:item.id,kind:'weapon',name:'Arme improvisée (nom trompeur)',keywords:[]}]} });
 const linked=ctx.store.previewResolution(hitInput(ctx,'control24-equipment-authority',{action:{type:'attack',base:60,damage:3,qualities:[],extensions:{fiche:{equipmentId:'synthetic-sword'}}},v5:{kind:'melee',context:{weaponImprovised:true,silentTakedown:false}}}));assert.ok(!linked.input.action.qualities.some(row=>row.id==='assommante'));
});

test('Contrôle 2.4 — source actualisée après aperçu refuse confirmation sans toucher partie/révision/historique',()=>{
 for(const talentId of ['talent-public-speaker','talent-master-of-disguise','talent-strike-mighty-blow']){
  const source=`
   import assert from 'node:assert/strict';
   import {readFile} from 'node:fs/promises';
   import {createStore} from './js/core/store.js';
   import {getReferenceCatalogue,refreshReferences} from './js/core/reference-catalog.js';
   const store=createStore({persistence:{load:async()=>null,saveAtomic:async()=>({ok:true})}});await store.ready;
   const actor={id:'race-a',name:'Auteur synthétique',kind:'PJ',camp:'pj',zone:'active',hp:40,maxHp:40,caracs:{CC:60,E:30,F:30},states:[],talents:[{id:'${talentId}',status:'resolved',rank:1}],extensions:{v5:{hasMomentum:false}}};
   const target={id:'race-t',name:'Cible synthétique',kind:'Créature',camp:'ennemi',zone:'active',hp:40,maxHp:40,caracs:{CC:30,E:30},armor:{head:0,body:0,arms:0,legs:0},states:[]};
   await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'race-a',order:['race-a','race-t'],participants:[actor,target]},log:[]});
   const name='${talentId}'==='talent-master-of-disguise'?'Divertissement (Interprétation)':'Charme';
   const skill=getReferenceCatalogue().skills.find(row=>row.nom===name).id;
   const raw='${talentId}'==='talent-strike-mighty-blow'?{actorId:'race-a',targetId:'race-t',resolutionId:'race-result',action:{type:'attack',base:60,damage:4},roll:23,defense:{base:30,roll:81,v5:{kind:'melee'}},v5:{kind:'melee'}}:
    {actorId:'race-a',resolutionId:'race-result',action:{type:'skill',base:50,extensions:{fiche:{skillId:skill}}},roll:28,v5:{kind:'test',context:{influencingGroup:true},talentChoices:{'talent-master-of-disguise:sl:keep':true}}};
   const p=store.previewResolution(raw);assert.equal(p.unresolved.length,0);assert.ok(p.talentPlans.some(plan=>plan.proposals.length));
   const before=JSON.parse(store.getFullJSON());delete before.exportedAt;const revision=store.getLocalRevision();const history=store.getHistory();
   const oldText=getReferenceCatalogue().talents.find(row=>row.id==='${talentId}').description;
   const refreshed=await refreshReferences({storage:null,forceRefresh:true,fetchImpl:async url=>{const sheet=decodeURIComponent(url.split('&sheet=')[1]);let csv=await readFile('./js/data/reference-source-csv/'+sheet+'.csv','utf8');if(sheet==='Talents'){assert.ok(csv.includes(oldText));csv=csv.replace(oldText,'Description synthétique volontairement changée.');}return {ok:true,text:async()=>csv};}});
   assert.equal(refreshed.ok,true,refreshed.status?.error);assert.equal(store.getLocalRevision(),revision);assert.equal((await store.applyResolution(p)).status,'manual');
   const after=JSON.parse(store.getFullJSON());delete after.exportedAt;assert.deepEqual(after,before);assert.deepEqual(store.getHistory(),history);
  `;
  const result=spawnSync(process.execPath,['--input-type=module','-e',source],{cwd:new URL('../../..',import.meta.url),encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);
 }
});

test('Contrôle 2.4 — priorité PJ exclut les snapshots importés de PNJ/créatures et types indéfinis',()=>{
 for(const kind of ['Créature','PNJ',undefined]){
  const participant=imported('synthetic-not-pj','snapshot-not-pj',[owned('talent-public-speaker')],{kind});
  const result=importedPjTalentPriorities({combat:{participants:[participant]}});
  assert.equal(result.characters,0);assert.equal(result.acquisitions,0);assert.deepEqual(result.items,[]);
 }
});

test('Contrôle 2.4 — opposition silencieuse garde les doubles réussis et victoire/défaite hors critiques de combat',async()=>{
 for(const [roll,choice] of [[61,'reverse'],[44,'keep'],[81,'keep']]){
  const ctx=await setup({actorTalents:[owned('talent-strike-to-stun')],actor:{extensions:{v5:{hasMomentum:true}}},target:{extensions:{v5:{hasMomentum:true}}}});
  const physics=id=>{const row=person(ctx,id);return {hp:row.hp,maxHp:row.maxHp,states:structuredClone(row.states),momentum:row.extensions.v5.hasMomentum};};
  const before=[physics(ctx.actorId),physics(ctx.targetId)];
  const p=ctx.store.previewResolution({resolutionId:'control24-silent-double-'+roll,actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'opposition',base:60,attr:'CC',extensions:{fiche:{skillId:skill('Corps à corps (Bagarre)')}}},roll,defense:{base:30,roll:22,label:'Résistance',v5:{kind:'test'}},v5:{kind:'melee',choice,context:{silentTakedown:true,outsideCombat:true,targetUnaware:true,calledShot:false}}});
  assert.deepEqual(p.unresolved,[]);assert.equal(p.choiceRequired,false);assert.equal(p.damage,null);assert.equal(p.critical,null);assert.equal(p.defenderCritical,null);assert.ok(p.reminders.some(row=>/Sonné et alarme/.test(row)));
  assert.equal((await ctx.store.applyResolution(p)).status,'applied');assert.deepEqual([physics(ctx.actorId),physics(ctx.targetId)],before);
 }
});

test('Contrôle 2.4 — défense Corps à corps déguisée en Résistance ne valide pas neutralisation p135',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-strike-to-stun')]});const before=envelope(ctx.store);
 const p=ctx.store.previewResolution({resolutionId:'control24-silent-wrong-defense-kind',actorId:ctx.actorId,targetId:ctx.targetId,action:{type:'opposition',base:60,attr:'CC',extensions:{fiche:{skillId:skill('Corps à corps (Bagarre)')}}},roll:44,defense:{base:30,roll:22,label:'Résistance',v5:{kind:'melee'}},v5:{kind:'melee',choice:'keep',context:{silentTakedown:true,outsideCombat:true,targetUnaware:true,calledShot:false}}});
 assert.ok(p.unresolved.some(row=>/Neutralisation silencieuse/.test(row)));assert.equal(p.critical,null);assert.equal(p.defenderCritical,null);assert.equal((await ctx.store.applyResolution(p)).status,'manual');assert.deepEqual(envelope(ctx.store),before);
});

test('Contrôle 2.4 — arbitrage MJ unités0 conserve réussite et choix DR, puis reçu durable annulable',async()=>{
 const ctx=await setup({actorTalents:[owned('talent-master-of-disguise')]});const raw=testInput(ctx,'control24-zero-mj','Divertissement (Interprétation)',{roll:20});const before=envelope(ctx.store);
 const dr=ctx.store.previewResolution({...raw,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':false}}});assert.equal(dr.sl,3);assert.equal(dr.success,true);
 const zero=ctx.store.previewResolution({...raw,v5:{kind:'test',talentChoices:{'talent-master-of-disguise:sl:keep':true}}});assert.equal(zero.sl,0);assert.equal(zero.success,true);assert.equal(zero.test.zeroOutcome,'marginalSuccess');assert.deepEqual(envelope(ctx.store),before);
 assert.equal((await ctx.store.applyResolution(zero)).status,'applied');const detail=ctx.store.getLog()[0].detail;assert.equal(detail.sl,0);assert.equal(detail.test.success,true);assert.equal(detail.test.zeroOutcome,'marginalSuccess');assert.ok(envelope(ctx.store).appliedResolutionIds.includes(raw.resolutionId));
 const reloaded=createStore({persistence:ctx.persistence});await reloaded.ready;assert.deepEqual(reloaded.getLog()[0].detail,detail);assert.equal(JSON.parse(reloaded.getFullJSON()).log[0].detail.sl,0);
 await reloaded.undo();assert.ok(!envelope(reloaded).appliedResolutionIds?.includes(raw.resolutionId));assert.deepEqual(JSON.parse(JSON.stringify(reloaded.listParticipants())),before.combat.participants);
 await reloaded.redo();assert.ok(envelope(reloaded).appliedResolutionIds.includes(raw.resolutionId));assert.equal(reloaded.getLog()[0].detail.test.success,true);assert.equal(reloaded.getLog()[0].detail.test.zeroOutcome,'marginalSuccess');
});

test('Contrôle 2.4 — Petit homebrew raccordé sans recalcul PV/taille, avec rappel des décisions MJ',async()=>{
 const small=v5TalentCoverage('talent-small');assert.equal(small.status,'verified');assert.ok(small.clauses.some(row=>row.mode==='assisted'));assert.ok(!small.clauses.some(row=>row.mode==='pending'));assert.match(small.description,/coût 1 Momentum/);assert.doesNotMatch(small.description,/coût 1 Avantage V4/);
 const ctx=await setup({actorTalents:[owned('talent-small')],actor:{extensions:{v5:{hasMomentum:false},fiche:{size:'Petite'}}}});const before=structuredClone(person(ctx,ctx.actorId));
 const p=ctx.store.previewResolution(testInput(ctx,'control24-small-manual','Charme',{roll:20,v5:{kind:'test',actorSize:'small',targetSize:'average'}}));assert.equal(p.test.score,50);assert.equal(p.sl,3);assert.equal(p.input.v5.actorSize,'small');assert.ok(!proposals(p).some(row=>row.origins?.some(origin=>origin.talentId==='talent-small')));assert.equal((await ctx.store.applyResolution(p)).status,'applied');
 const after=person(ctx,ctx.actorId);assert.equal(after.hp,before.hp);assert.equal(after.maxHp,before.maxHp);assert.deepEqual(after.caracs,before.caracs);assert.deepEqual(after.states,before.states);assert.equal(after.extensions.fiche.size,before.extensions.fiche.size);assert.equal(after.extensions.v5.hasMomentum,false);
 const baseline=await setup();const mechanics={v5:{kind:'melee',actorSize:2,targetSize:3}};const withSmall=ctx.store.previewResolution(hitInput(ctx,'control24-small-hit',mechanics)),withoutSmall=baseline.store.previewResolution(hitInput(baseline,'control24-baseline-hit',mechanics));assert.equal(withSmall.score.base,withoutSmall.score.base+10);assert.ok(proposals(withSmall).some(row=>row.origins?.some(origin=>origin.talentId==='talent-small')));assert.equal(person(ctx,ctx.actorId).maxHp,before.maxHp);assert.deepEqual(person(ctx,ctx.actorId).caracs,before.caracs);
});
});

describe('Qualites V5 24', () => {
const registry = registry_v5QualityTalentContracts;
const talents = (...names) => aggregateTalents(names.map(nom => ({ nom }))).items;
const actor = extra => ({ id: 'a', name: 'Auteur synthétique', zone: 'active', hp: 20, maxHp: 20, caracs: { E: 30, F: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [], talents: [], ...extra });
const target = extra => actor({ id: 't', name: 'Cible synthétique', ...extra });
const raw = extra => ({ actor: actor(), target: target(), baseRevision: 2, round: 1, roll: 10,
  action: { id: 'club', type: 'attack', base: 40, damage: 4, qualities: ['assommante'] },
  defense: { base: 40, roll: 32, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, ...extra });
const state = p => ({ revision: p.baseRevision, round: p.input.round, participants: [p.input.actor, p.input.target], appliedResolutionIds: [], v5ActionLedger: { appliedActions: [], quotaUsage: [] } });
const envelope = (a = actor(), t = target()) => ({ localRevision: 2, combat: { round: 1, currentActorId: 'a', order: ['a', 't'], participants: [a, t] }, extensions: { v5: { combatId: 'synthetic-combat', turnIndex: 1 } }, appliedResolutionIds: [] });
const storePreview = (e, r) => { const prepared = buildV5StoreActionInput(e, r); return annotateV5StoreActionPreview(previewResolution(prepared), prepared); };
const command = (e, r) => ({ actorId: 'a', targetId: 't', ...raw(), actor: undefined, target: undefined, ...r });

test('2.4 Assommante pins effect text, V5 edition and source; source change cannot silently retain an engine', () => {
  const c = getReferenceCatalogue(), row = registry.qualityContracts[0];
  assert.equal(row.effectHash, 'sha256:' + createHash('sha256').update(row.effect).digest('hex'));
  assert.equal(v5QualityMechanicalStatus('assommante').status, 'covered');
  for (const changed of [{ effect: row.effect + ' change' }, { edition: 'V4' }, { source: 'another book' }]) {
    const catalogue = { ...c, keywords: c.keywords.map(word => word.id === row.id ? { ...word, ...changed } : word) };
    const p = previewV5WeaponConditions({ qualities: [{ id: row.id }], hit: true, location: { key: 'HEAD' }, target: target(), damage: { finalDamage: 3 }, resolutionId: 'p', catalogue });
    assert.equal(p.proposed.length, 0); assert.equal(p.warnings.length, 1);
  }
});
test('2.4 Frappe pin detects changed public source and retains the explicit approved local override', () => {
  const c = getReferenceCatalogue();
  const changed = { ...c, talents: c.talents.map(row => row.id === 'talent-strike-to-stun' ? { ...row, description: row.description + ' changed' } : row) };
  assert.equal(currentV5TalentHashes(changed)['talent-strike-to-stun'], 'source-text-changed');
  assert.ok(registry.approvedOverrides['talent-strike-to-stun'].reference.includes('p.135'));
  assert.equal(registry.contracts[0].clauses.some(row => row.effects.some(effect => effect.op === 'suppressQuality')), false);
});
test('2.4 a real head hit at the BE threshold acquires one sourced Sonné only when applied', () => {
  const p = previewResolution(raw());
  assert.equal(p.damage.finalDamage, 3); assert.equal(p.weaponConditions.proposed.length, 1);
  assert.equal(p.input.target.states.length, 0); assert.equal(p.mechanics.find(row => row.id === 'assommante').status, 'covered');
  const result = applyResolution(p, state(p));
  assert.equal(result.status, 'applied'); assert.equal(result.state.participants[1].hp, 17);
  assert.equal(result.state.participants[1].states.filter(row => row.key === 'sonne').length, 1);
  const condition = result.state.participants[1].states.find(row => row.key === 'sonne');
  assert.equal(condition.source.kind, 'quality'); assert.equal(condition.source.keywordId, 'assommante');
  assert.equal(condition.authorId, 'a'); assert.equal(condition.targetId, 't'); assert.equal(condition.v5Timing.acquiredRound, 1);
  assert.equal(applyResolution(p, result.state).status, 'duplicate');
});
test('2.4 body hits, lost opposition, protected hits, capped real wounds and zero damage never add Pummel Sonné', () => {
  const cases = [
    raw({ roll: 15 }),
    raw({ defense: { base: 80, roll: 23, v5: { kind: 'melee' } } }),
    raw({ target: target({ armor: { head: 1, body: 0, arms: 0, legs: 0 } }) }),
    raw({ target: target({ hp: 2 }) }),
    raw({ target: target({ armor: { head: 6, body: 0, arms: 0, legs: 0 } }), action: { type: 'attack', base: 40, damage: 4, qualities: ['assommante', 'inoffensive'] } })
  ];
  for (const r of cases) assert.equal(previewResolution(r).weaponConditions.proposed.length, 0);
});
test('2.4 unknown toughness or current wounds blocks the applicable head-hit acquisition', () => {
  for (const t of [target({ caracs: { F: 30 } }), target({ hp: null })]) {
    const p = previewResolution(raw({ target: t }));
    assert.ok(p.unresolved.some(text => text.includes('Assommante')));
    assert.equal(applyResolution(p, state(p)).status, 'manual');
  }
});
test('2.4 an explicit improvised declaration adds Assommante temporarily, never equipment or source action', () => {
  const a = actor({ talents: talents('Frappe assommante') }), action = { type: 'attack', base: 40, damage: 4, qualities: [] };
  const p = previewResolution(raw({ actor: a, action, v5: { kind: 'melee', context: { weaponImprovised: true } } }));
  assert.equal(p.input.action.qualities.filter(row => row.id === 'assommante').length, 1);
  assert.deepEqual(action.qualities, []); assert.equal(a.equipment, undefined);
  assert.equal(p.weaponConditions.proposed.length, 1);
  assert.equal(previewResolution(p.input).weaponConditions.proposed.length, 1, 'replay remains idempotent');
});
test('2.4 only normalized acquisition activates; duplicate ranks and Pummel aliases never duplicate conditions', () => {
  const action = { type: 'attack', base: 40, damage: 4, qualities: [] }, v5 = { kind: 'melee', context: { weaponImprovised: true } };
  const unacquired = previewResolution(raw({ actor: actor({ talents: [{ name: 'Frappe assommante', rank: 1 }] }), action, v5 }));
  assert.equal(unacquired.input.action.qualities.length, 0);
  const p = previewResolution(raw({ actor: actor({ talents: talents('Frappe assommante', 'Frappe assommante') }), action: { ...action, qualities: ['assommante', 'Pummel'] }, v5 }));
  assert.equal(p.input.action.qualities.length, 1); assert.equal(p.targetConditionApplication.filter(row => row.key === 'sonne').length, 1);
});
test('2.4 linked published improvised equipment is authoritative; custom names require the MJ declaration', () => {
  const item = getReferenceCatalogue().items.find(row => row.id === 'weapon-armes-corps-a-corps-base-arme-improvisee');
  const weapon = { ...structuredClone(item), id: 'real-item' }, a = actor({ talents: talents('Frappe assommante'), equipment: [weapon] });
  const action = { type: 'attack', base: 40, damage: 4, extensions: { fiche: { equipmentId: weapon.id } } };
  const p = previewResolution(raw({ actor: a, action }));
  assert.ok(p.input.action.qualities.some(row => row.id === 'assommante'));
  assert.equal(a.equipment[0].keywords.some(row => row.id === 'assommante'), false);
  const custom = actor({ talents: talents('Frappe assommante'), equipment: [{ id: 'real-item', kind: 'weapon', name: 'Arme improvisée', category: 'Base', custom: true, keywords: [] }] });
  assert.ok(previewResolution(raw({ actor: custom, action })).unresolved.some(text => text.includes('weapon.improvised')));
});
test('2.4 unknown improvised status is requested only when its addition could affect this attack', () => {
  const a = actor({ talents: talents('Frappe assommante') });
  const knownPummel = previewResolution(raw({ actor: a }));
  assert.equal(knownPummel.unresolved.some(text => text.includes('weapon.improvised')), false);
  const normal = previewResolution(raw({ actor: a, action: { type: 'attack', base: 40, damage: 4, qualities: [] }, v5: { kind: 'melee', context: { weaponImprovised: false } } }));
  assert.equal(normal.unresolved.some(text => text.includes('weapon.improvised')), false);
  const skill = previewResolution(raw({ actor: a, action: { type: 'skill', base: 40 }, defense: undefined, v5: { kind: 'test' } }));
  assert.equal(skill.unresolved.some(text => text.includes('weapon.improvised')), false);
});
test('2.4 called shots use a separate -2 DR penalty and the declared location, including excess critical location', () => {
  const p = previewResolution(raw({ roll: 15, action: { type: 'attack', base: 80, damage: 4, qualities: ['assommante'] }, v5: { kind: 'melee', context: { calledShot: true, calledShotLocation: 'head' } } }));
  assert.equal(p.test.details.modifiers.find(row => row.id === 'called-shot').amount, -2);
  assert.equal(p.location.key, 'HEAD'); assert.equal(p.location.calledShot, true); assert.equal(p.weaponConditions.proposed.length, 1);
  const missing = previewResolution(raw({ v5: { kind: 'melee', context: { calledShot: true } } }));
  assert.equal(applyResolution(missing, state(missing)).status, 'manual');
  const excess = previewResolution(raw({ target: target({ hp: 5 }), roll: 15, action: { type: 'attack', base: 80, damage: 40, qualities: ['assommante'] }, criticalRolls: { secondEffect: 20 }, v5: { kind: 'melee', context: { calledShot: true, calledShotLocation: 'head' } } }));
  assert.equal(excess.critical.second.location.key, 'HEAD');
});
test('2.4 quality and critical Sonné are reduced together once before Momentum and durable actor quota', () => {
  const t = target({ talents: talents('Mâchoires d’acier'), extensions: { v5: { hasMomentum: true } } }), e = envelope(actor(), t);
  const r = command(e, { roll: 11, defense: { base: 40, roll: 32, v5: { kind: 'melee', choice: 'keep' } }, action: { type: 'attack', base: 90, damage: 4, qualities: ['assommante'] }, criticalRolls: { location: 2, effect: 20 }, v5: { kind: 'melee', context: { calledShot: true, calledShotLocation: 'head' } } });
  const p = storePreview(e, r);
  assert.equal(p.weaponConditions.proposed.length, 1); assert.equal(p.talentUsageRequests.length, 1);
  assert.equal(p.targetConditionApplication.filter(row => row.key === 'sonne').reduce((sum, row) => sum + row.level, 0), 1);
  const result = applyV5StoreAction(p, e, current => applyResolution(p, current));
  assert.equal(result.status, 'applied'); assert.equal(result.state.v5ActionLedger.quotaUsage.length, 1);
  assert.equal(result.state.participants[1].states.filter(row => row.key === 'sonne').reduce((sum, row) => sum + row.level, 0), 1);
  assert.equal(result.state.participants[1].extensions.v5.hasMomentum, false);
  const next = v5StoreActionResult(e, result); next.localRevision++;
  const again = storePreview(next, { ...r, roll: 10, resolutionId: 'again', criticalRolls: undefined });
  assert.equal(again.talentUsageRequests.length, 0); assert.equal(again.weaponConditions.applied.length, 1);
});
test('2.4 declining the preview consumes no Mâchoires quota; a sole Pummel acquisition can be fully suppressed', () => {
  const e = envelope(actor(), target({ talents: talents('Mâchoires d’acier') })), r = command(e);
  const p = storePreview(e, r), same = storePreview(e, r);
  assert.equal(p.weaponConditions.applied.length, 0); assert.equal(same.talentUsageRequests.length, 1);
  assert.equal(e.extensions.v5.actionLedger, undefined);
  const result = applyV5StoreAction(p, e, current => applyResolution(p, current));
  assert.equal(result.status, 'applied'); assert.equal(result.state.participants[1].states.length, 0); assert.equal(result.state.v5ActionLedger.quotaUsage[0].used, 1);
});
test('2.4 Battement suppresses Pummel and attacker critical conditions while retaining the independent defensive critical', () => {
  const p = previewResolution(raw({ actor: actor({ talents: talents('Battement') }), roll: 22, action: { type: 'attack', base: 90, damage: 40, qualities: ['assommante'] },
    defense: { base: 30, roll: 22, v5: { kind: 'melee' } }, defenderCriticalRolls: { location: 2, effect: 20 },
    v5: { kind: 'melee', actorSize: 3, targetSize: 3, talentChoices: { 'talent-beat-blade:replace-damage': true }, context: { calledShot: true, calledShotLocation: 'head' } },
    authorNextTurnEnd: { phase: 'endOfTurn', actorId: 'a', round: 2, turn: 3 } }));
  assert.equal(p.damage, null); assert.equal(p.critical, null); assert.equal(p.weaponConditions.proposed.length, 0); assert.ok(p.defenderCritical);
  const result = applyResolution(p, state(p)); assert.equal(result.status, 'applied'); assert.equal(result.state.participants[1].hp, 20); assert.ok(result.state.participants[0].states.length > 0);
});
test('2.4 a silent flag cannot simulate an ordinary combat attack or erase a called-shot penalty', () => {
  const p = previewResolution(raw({ actor: actor({ talents: talents('Frappe assommante') }), v5: { kind: 'melee', context: { silentTakedown: true, outsideCombat: true, targetUnaware: true, calledShot: true, calledShotLocation: 'head' } } }));
  assert.equal(p.damage, null); assert.equal(p.critical, null); assert.equal(p.test.details.modifiers.find(row => row.id === 'called-shot').amount, -2);
  assert.equal(p.test.advantage.net, 0); assert.equal(applyResolution(p, state(p)).status, 'manual');
});
test('2.4 approved silent neutralisation grants Advantage to the explicit Melee/Endurance Test and keeps outcomes manual', () => {
  const p = previewResolution(raw({ actor: actor({ talents: talents('Frappe assommante') }), action: { type: 'opposition', base: 65, qualities: [], extensions: { fiche: { skillId: 'skill-43_6f_72_70_73_20_e0_20_63_6f_72_70_73-42_61_73_65' } } },
    defense: { base: 30, roll: 78, label: 'Résistance', v5: { kind: 'test' } },
    v5: { kind: 'melee', choice: 'keep', context: { silentTakedown: true, outsideCombat: true, targetUnaware: true } } }));
  assert.equal(p.test.advantage.net, 1); assert.equal(p.attack, false); assert.equal(p.damage, null); assert.equal(p.unresolved.length, 0); assert.ok(p.reminders[0].includes('Inconscient'));
  const result = applyResolution(p, state(p)); assert.equal(result.status, 'applied'); assert.equal(result.state.participants[1].hp, 20); assert.equal(result.state.participants[1].states.length, 0); assert.equal(result.state.participants[0].extensions?.v5?.hasMomentum, undefined);
});

test('2.4 a changed cached public reference disables the actual preview and application, not only a hash helper', () => {
  for (const kind of ['talent', 'quality']) {
    const childSource = `
      import assert from 'node:assert/strict';
      import snapshot from './js/data/reference-snapshot.json' with { type: 'json' };
      const pack = structuredClone(snapshot);
      if ('${kind}' === 'talent') pack.talents.entries.find(row => row.id === 'talent-strike-to-stun').description += ' changed';
      else pack.equipment.keywords.find(row => row.id === 'assommante').edition = 'V4';
      globalThis.localStorage = { getItem: () => JSON.stringify({ data: pack, updatedAt: '2030-01-01T00:00:00Z' }) };
      const { previewResolution, applyResolution } = await import('./js/core/resolution.js');
      const a = { id:'a', hp:20, caracs:{E:30,F:30}, states:[], talents:[{id:'talent-strike-to-stun',rank:1,status:'resolved'}] };
      const t = { id:'t', hp:20, caracs:{E:30}, armor:{head:0,body:0,arms:0,legs:0}, states:[] };
      const preview = previewResolution({ actor:a,target:t,baseRevision:2,round:1,roll:10, action:{type:'attack',base:40,damage:4,qualities:'${kind}'==='quality'?['assommante']:[]},defense:{base:40,roll:32,v5:{kind:'melee'}},v5:{kind:'melee',context:{weaponImprovised:true}} });
      assert.equal(preview.weaponConditions.proposed.length,0);
      if ('${kind}' === 'talent') { assert.equal(preview.input.action.qualities.length,0); assert.ok(preview.talentPlans.some(plan => plan.trace.some(row => row.status === 'sourceChanged'))); }
      else { assert.equal(preview.mechanics.find(row=>row.id==='assommante').status,'manual'); assert.equal(applyResolution(preview,{revision:2,round:1,participants:[a,t]}).status,'manual'); }
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', childSource], { cwd: new URL('../../..', import.meta.url), encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
  }
});
test('2.4 an imported defensive skill identity cannot be disguised as Endurance by its editable label', () => {
  const p = previewResolution(raw({ actor: actor({ talents: talents('Frappe assommante') }), action: { type: 'opposition', base: 65, qualities: [], extensions: { fiche: { skillId: 'skill-43_6f_72_70_73_20_e0_20_63_6f_72_70_73-42_61_73_65' } } },
    defense: { base: 30, roll: 78, label: 'Résistance', extensions: { fiche: { skillId: 'skill-43_68_61_72_6d_65-base' } }, v5: { kind: 'test' } },
    v5: { kind: 'melee', choice: 'keep', context: { silentTakedown: true, outsideCombat: true, targetUnaware: true } } }));
  assert.ok(p.unresolved.some(row => row.includes('Neutralisation silencieuse'))); assert.equal(applyResolution(p,state(p)).status, 'manual');
});

test('2.4 opposition Endurance UI option is a Test, and successful doubles on both sides remain manual p135 outcomes', () => {
  const endurance = defenseOptions(target(), [], { includeEndurance: true }).find(row => row.value === 'E');
  assert.equal(endurance.v5.kind, 'test');
  const p = previewResolution(raw({ actor: actor({ talents: talents('Frappe assommante') }), roll: 11,
    action: { type: 'opposition', base: 65, qualities: [], extensions: { fiche: { skillId: 'skill-43_6f_72_70_73_20_e0_20_63_6f_72_70_73-42_61_73_65' } } },
    defense: { base: endurance.base, roll: 22, label: endurance.statLabel, v5: endurance.v5 },
    criticalRolls: { location: 2, effect: 100 }, defenderCriticalRolls: { location: 2, effect: 20 },
    v5: { kind: 'melee', choice: 'keep', context: { silentTakedown: true, outsideCombat: true, targetUnaware: true } } }));
  assert.equal(p.test.critical, true); assert.equal(p.defenderTest.critical, true); assert.equal(p.unresolved.length, 0);
  assert.equal(p.critical?.application, undefined); assert.equal(p.defenderCritical, null); assert.equal(p.damage, null);
  const result = applyResolution(p, state(p)); assert.equal(result.status, 'applied');
  for (const participant of result.state.participants) { assert.equal(participant.hp,20); assert.equal(participant.states.length,0); assert.equal(participant.extensions?.v5?.hasMomentum,undefined); }
});
test('2.4 a melee-misclassified p135 Endurance defense is refused and never previews an ordinary defensive critical', () => {
  const p = previewResolution(raw({ actor: actor({ talents: talents('Frappe assommante') }), roll: 11,
    action: { type: 'opposition', base: 65, qualities: [], extensions: { fiche: { skillId: 'skill-43_6f_72_70_73_20_e0_20_63_6f_72_70_73-42_61_73_65' } } },
    defense: { base: 30, roll: 22, label: 'E', v5: { kind: 'melee' } }, defenderCriticalRolls: { location: 2, effect: 20 },
    v5: { kind: 'melee', choice: 'keep', context: { silentTakedown: true, outsideCombat: true, targetUnaware: true } } }));
  assert.ok(p.unresolved.some(row=>row.includes('Neutralisation silencieuse'))); assert.equal(p.defenderCritical,null);
  const result=applyResolution(p,state(p));assert.equal(result.status,'manual');
  for (const participant of result.state.participants) { assert.equal(participant.hp,20);assert.equal(participant.states.length,0); }
});
});

describe('Tests V5 24', () => {
const registry = registry_v5TestTalentContracts;
const skill = name => getReferenceCatalogue().skills.find(row => row.nom === name).id;
const row = (id, extra = {}) => ({ id: 'talent-' + id, name: id, status: 'resolved', rank: 1, ...extra });
const actor = (ids, extra = {}) => ({ id: 'a', hp: 12, states: [], talents: ids.map(id => typeof id === 'string' ? row(id) : id), ...extra });
const action = (skillName, extra = {}) => ({ type: 'test', label: 'Nom sans signification mécanique', base: 60,
  ...(skillName ? { extensions: { fiche: { skillId: skill(skillName) } } } : {}), ...extra });
const build = (ids, skillName, settings = {}, extra = {}) => buildCombatTest({ actor: actor(ids),
  target: actor([], { id: 'b' }), action: action(skillName), roll: 47, v5: { kind: 'test', ...settings }, ...extra });
const hashes = Object.fromEntries(Object.entries(registry.sourceDescriptions).map(([id, text]) => [id, 'sha256:' + createHash('sha256').update(text).digest('hex')]));
const evaluate = (ids, context, extra = {}) => evaluateTalentContractsV2({ contracts: registry.contracts,
  acquisitions: ids.map(id => typeof id === 'string' ? { talentId: 'talent-' + id, rank: 1 } : id),
  sourceHashes: hashes, event: 'test.beforeRoll', role: 'actor', context, ...extra });
const known = name => buildV5TalentTestContext(action(name), {});

test('2.4 35 contracts pin current public texts, all validate and retain scoped descriptions', () => {
  assert.equal(registry.contracts.length, 35);
  for (const contract of registry.contracts) {
    assert.equal(validateTalentContractV2(contract), true);
    assert.equal(contract.source.effectHash, hashes[contract.talentId]);
    assert.equal(registry.sourceDescriptions[contract.talentId], getReferenceCatalogue().talents.find(row => row.id === contract.talentId).description);
  }
  assert.equal(registry.contracts.some(row => row.talentId === 'talent-strong-minded'), false, 'once per session remains manual');
});

test('2.4 imported canonical skill wins contextual spoof and labels never supply identity', () => {
  const imported = action('Discrétion (Rurale)');
  assert.equal(buildV5TalentTestContext(imported, { context: { skillId: skill('Discrétion (Urbaine)') } }).skillId, skill('Discrétion (Rurale)'));
  assert.equal(build(['alley-cat'], 'Discrétion (Rurale)', { context: { skillId: skill('Discrétion (Urbaine)') } }).test.advantage.net, 0);
  const manual = build(['alley-cat'], null, { context: { skillId: skill('Discrétion (Urbaine)') } });
  assert.equal(manual.test.advantage.net, 1);
  const named = build(['alley-cat'], null, {}, { action: action(null, { label: 'Discrétion (Urbaine)' }) });
  assert.equal(named.test.advantage.net, 0);
  assert.ok(named.unresolved.some(text => text.includes('skillId')));
  const none = build(['alley-cat','linguistics'], null, { context: { skillId: 'none' } });
  assert.equal(none.unresolved.length, 0); assert.equal(none.test.advantage.net, 0);
  const unknown = build(['alley-cat'], null, { context: { skillId: 'unregistered' } });
  assert.ok(unknown.unresolved.length);
});

test('2.4 Alley Cat and Rover select exact urban/rural specialization, never unspecialized', () => {
  for (const [talent, yes, no] of [['alley-cat', 'Discrétion (Urbaine)', 'Discrétion (Rurale)'], ['rover', 'Discrétion (Rurale)', 'Discrétion (Urbaine)']]) {
    assert.equal(build([talent], yes).test.advantage.net, 1);
    assert.equal(build([talent], no).test.advantage.net, 0);
    assert.equal(build([talent], 'Discrétion').test.advantage.net, 0);
  }
});

test('2.4 Cat-tongued/Public Speaker require their applicable Charm purpose; other skills ignore unknown purpose', () => {
  for (const [talent, field] of [['cat-tongued', 'lying'], ['public-speaker', 'influencingGroup']]) {
    assert.equal(build([talent], 'Charme', { context: { [field]: true } }).test.advantage.net, 1);
    assert.equal(build([talent], 'Charme', { context: { [field]: false } }).unresolved.length, 0);
    assert.ok(build([talent], 'Charme').unresolved.some(text => text.includes(field)));
    assert.equal(build([talent], 'Pari').unresolved.length, 0);
  }
  assert.equal(build(['public-speaker'], 'Commandement').test.advantage.net, 0, 'narrative subsequent Commandement is no automatic advantage');
});

test('2.4 Fast Hands touches with Brawling attack, cannot boost Brawling defense, and boosts Sleight of Hand', () => {
  const p = build(['fast-hands'], 'Corps à corps (Bagarre)', { kind: 'melee', context: { touchingOpponent: true } }, {action:action('Corps à corps (Bagarre)',{type:'attack'})});
  assert.equal(p.test.advantage.net, 1);
  assert.equal(build(['fast-hands'], 'Corps à corps (Bagarre)', { kind: 'melee', context: { touchingOpponent: false } }, {action:action('Corps à corps (Bagarre)',{type:'attack'})}).test.advantage.net, 0);
  assert.ok(build(['fast-hands'], 'Corps à corps (Bagarre)', { kind: 'melee' }, {action:action('Corps à corps (Bagarre)',{type:'attack'})}).unresolved.some(text => text.includes('touchingOpponent')));
  const defending = buildCombatTest({ actor: actor([]), target: actor(['fast-hands']), action: action(null),
    defense: { ...action('Corps à corps (Bagarre)'), roll: 47, v5: { kind: 'melee', context: { touchingOpponent: true } } }, roll: 40, v5: { kind: 'melee' } }, 'defender');
  assert.equal(defending.test.advantage.net, 0);
  assert.equal(build(['fast-hands'], 'Escamotage').test.advantage.net, 1);
});

test('2.4 Linguistics communication languages benefit; Magick and unknown skills never do', () => {
  assert.equal(build(['linguistics'], 'Langue (Reikspiel)').test.advantage.net, 1);
  assert.equal(build(['linguistics'], 'Langue (Magick)').test.advantage.net, 0);
  assert.equal(build(['linguistics'], 'Langue (Magick)').unresolved.length, 0);
  assert.equal(build(['linguistics'], 'Recherche').test.advantage.net, 0);
});

test('2.4 talent names, nonresolved rows, absent/changed sources never activate', () => {
  const p = build([], 'Escalade', {}, { actor: actor([], { talents: [{ name: 'Grimpeur', rank: 1 }] }) });
  assert.equal(p.test.advantage.net, 0);
  const context = known('Escalade');
  const absent = evaluate(['scale-sheer-surface'], context, { sourceHashes: {} });
  assert.equal(absent.proposals.length, 0); assert.equal(absent.trace[0].status, 'sourceUnavailable');
  const changed = evaluate(['scale-sheer-surface'], context, { sourceHashes: { ...hashes, 'talent-scale-sheer-surface': 'changed' } });
  assert.equal(changed.proposals.length, 0); assert.equal(changed.trace[0].status, 'sourceChanged');
});

test('2.4 consolidated ranks remain one advantage; distinct applicable talents stack then cancel', () => {
  assert.equal(build([row('scale-sheer-surface', { rank: 9 })], 'Escalade').test.advantage.net, 1);
  const p = build(['cat-tongued', 'public-speaker'], 'Charme', { context: { lying: true, influencingGroup: true } });
  assert.equal(p.test.advantage.net, 2); assert.equal(p.test.advantage.slModifier, 1);
  const cancelled = build(['cat-tongued', 'public-speaker'], 'Charme', { context: { lying: true, influencingGroup: true },
    disadvantageSources: [{ id: 'one' }, { id: 'two' }] });
  assert.equal(cancelled.test.advantage.net, 0);
});

for (const [talent, name] of [
  ['dicer','Pari'],['menacing','Intimidation'],['strong-swimmer','Natation'],['dealmaker','Marchandage'],
  ['field-dressing','Guérison'],['inspiring','Commandement'],['orientation','Orientation'],
  ['gregarious','Ragot'],['bookish','Recherche'],['briber','Subornation'],['trapper','Piégeage'],
  ['super-numerate','Évaluation'],['roughrider','Chevaucher'],['crack-the-whip',"Conduite d'attelage"],
  ['pilot','Voile (Barge)'],['tunnel-fighter','Discrétion (Souterrains)']
]) test('2.4 simple acquired ' + talent + ' covers its canonical skill and excludes another', () => {
  assert.equal(build([talent], name).test.advantage.net, 1);
  assert.equal(build([talent], name === 'Pari' ? 'Escalade' : 'Pari').test.advantage.net, 0);
});

for (const [talent, name, field] of [
  ['sprinter','Athlétisme','running'],['nose-for-trouble','Intuition','potentialDanger'],['catfall','Athlétisme','falling'],['panhandle','Charme','begging'],
  ['iron-will','Calme','resistingInfluence'],['contortionist','Athlétisme','escapingBonds'],
  ['carouser','Résistance','resistingPoisonOrAlcohol']
]) test('2.4 conditional ' + talent + ' requires its declared purpose only for relevant skill', () => {
  assert.equal(build([talent], name, { context: { [field]: true } }).test.advantage.net, 1);
  assert.equal(build([talent], name, { context: { [field]: false } }).test.advantage.net, 0);
  assert.ok(build([talent], name).unresolved.some(text => text.includes(field)));
  assert.equal(build([talent], 'Pari').unresolved.length, 0);
});

test('2.4 v3 Commanding Presence offers DR or units only on a successful combat Command Test', () => {
  const ok = build(['commanding-presence'], 'Commandement', { context: { inCombat: true } }, { roll: 41 });
  assert.equal(ok.test.advantage.net, 0, 'plus d’Avantage : l’effet a été échangé avec Exaltant');
  assert.equal(ok.talentSLChoices.length, 1);
  assert.equal(build(['commanding-presence'], 'Commandement', { context: { inCombat: false } }, { roll: 41 }).talentSLChoices.length, 0);
  assert.equal(build(['commanding-presence'], 'Commandement', { context: { inCombat: true } }, { roll: 98 }).talentSLChoices.length, 0);
  assert.equal(build(['commanding-presence'], 'Pari', { context: { inCombat: true } }, { roll: 41 }).talentSLChoices.length, 0);
});

test('2.4 Resistant compares selected acquired threat; automatic session success stays manual', () => {
  const ids = [row('resistant', { specialization: 'Poison' }), row('resistant', { specialization: 'Maladie' })];
  const p = build(ids, 'Résistance', { context: { resistingThreat: true, threatId: 'Poison' } });
  assert.equal(p.test.advantage.net, 1);
  assert.equal(build(ids, 'Résistance', { context: { resistingThreat: false } }).unresolved.length, 0);
  assert.ok(build(ids, 'Résistance', { context: { resistingThreat: true } }).unresolved.some(text => text.includes('threatId')));
  assert.equal(build(ids, 'Résistance', { context: { resistingThreat: true, threatId: 'Magie' } }).test.advantage.net, 0);
  const failed = build(ids, 'Résistance', { context: { resistingThreat: true, threatId: 'Poison' }, choice: 'keep' }, { roll: 98 });
  assert.equal(failed.test.options[0].result.success, false);
});

test('2.4 Master of Disguise requires explicit SL/unit choice on success and may choose a LOWER units value', () => {
  const missing = build(['master-of-disguise'], 'Divertissement (Interprétation)', {}, { roll: 41 });
  assert.ok(missing.unresolved.some(text => text.includes('choices.')));
  assert.deepEqual(missing.talentSLChoices.map(({ key, sl, units }) => ({ key, sl, units })), [{ key: 'talent-master-of-disguise:sl:keep', sl: 2, units: 1 }]);
  assert.equal(build(['master-of-disguise'], 'Divertissement (Interprétation)', { talentChoices: { 'talent-master-of-disguise:sl:keep': false } }, { roll: 41 }).test.options[0].result.sl, 2);
  const units = build(['master-of-disguise'], 'Divertissement (Interprétation)', { talentChoices: { 'talent-master-of-disguise:sl:keep': true } }, { roll: 41 });
  assert.equal(units.test.options[0].result.sl, 1); assert.equal(units.unresolved.length, 0);
  assert.equal(units.test.initialRoll, 41);
});

test('2.4 failed SL replacement never asks a choice and other specialization never qualifies', () => {
  const failed = build(['master-of-disguise'], 'Divertissement (Interprétation)', {}, { roll: 98 });
  assert.equal(failed.talentSLChoices.length, 0); assert.equal(failed.unresolved.length, 0);
  assert.equal(build(['master-of-disguise'], 'Divertissement (Comédie)').talentSLChoices.length, 0);
  assert.throws(() => build(['master-of-disguise'], 'Divertissement (Interprétation)', { talentChoices: { 'talent-master-of-disguise:sl:keep': 'auto' } }), /Choix explicite/);
});

test('2.4 inversion options own independent units from final roll; unchosen successful option never blocks chosen failure', () => {
  const settings = { advantageSources: [{ id: 'synthetic' }], choice: 'keep' };
  const kept = build(['master-of-disguise'], 'Divertissement (Interprétation)', settings, { roll: 74 });
  assert.equal(kept.unresolved.length, 0);
  assert.equal(kept.test.options[0].result.success, false);
  assert.equal(kept.talentSLChoices[0].optionId, 'reverse');
  assert.equal(kept.talentSLChoices[0].units, 7);
  const reversed = build(['master-of-disguise'], 'Divertissement (Interprétation)', { ...settings, choice: 'reverse', talentChoices: { 'talent-master-of-disguise:sl:reverse': true } }, { roll: 74 });
  assert.equal(reversed.test.options[1].result.sl, 7);
  assert.equal(reversed.test.options[1].result.roll, 47);
  assert.equal(reversed.test.initialRoll, 74);
});

test('2.4 both successful keep/reverse options require independent choices on selected branch', () => {
  const settings = { advantageSources: [{ id: 'synthetic' }], talentChoices: { 'talent-master-of-disguise:sl:keep': false }, choice: 'reverse' };
  const p = build(['master-of-disguise'], 'Divertissement (Interprétation)', settings, { roll: 53 });
  assert.equal(p.talentSLChoices.length, 2);
  assert.ok(p.unresolved.some(text => text.includes('choices.')));
  const resolved = build(['master-of-disguise'], 'Divertissement (Interprétation)', { ...settings, talentChoices: { ...settings.talentChoices, 'talent-master-of-disguise:sl:reverse': true } }, { roll: 53 });
  assert.equal(resolved.unresolved.length, 0); assert.equal(resolved.test.options[1].result.sl, 5);
});

test('2.4 literal units zero keeps marginal success, explicit DR choice and independent critical', () => {
  const zero = build(['master-of-disguise'], 'Divertissement (Interprétation)', { talentChoices: { 'talent-master-of-disguise:sl:keep': true } }, { roll: 20 });
  assert.equal(zero.test.options[0].result.sl, 0); assert.equal(zero.test.options[0].result.success, true);
  assert.equal(zero.test.options[0].result.zeroOutcome, 'marginalSuccess');
  assert.equal(zero.talentSLChoices[0].units, 0); assert.equal(zero.talentSLChoices[0].sl, 4);
  const dr = build(['master-of-disguise'], 'Divertissement (Interprétation)', { talentChoices: { 'talent-master-of-disguise:sl:keep': false } }, { roll: 20 });
  assert.equal(dr.test.options[0].result.sl, 4); assert.equal(dr.test.options[0].result.success, true);
  assert.equal(zero.test.options[0].result.details.talentSLReplacement.from, 4);
  const critical = build(['master-of-disguise'], 'Divertissement (Interprétation)', { talentChoices: { 'talent-master-of-disguise:sl:keep': true } }, { roll: 11 });
  assert.equal(critical.test.options[0].result.critical, true); assert.equal(critical.test.options[0].result.sl, 1);
});

test('2.4 Old Salt and Numismatics share explicit units operation with their distinct conditions', () => {
  const old = build(['old-salt'], 'Voile (Barge)', { context: { onOcean: true }, talentChoices: { 'talent-old-salt:sl:keep': true } });
  assert.equal(old.test.options[0].result.sl, 7);
  assert.equal(build(['old-salt'], 'Voile (Barge)', { context: { onOcean: false } }).talentSLChoices.length, 0);
  assert.ok(build(['old-salt'], 'Voile (Barge)').unresolved.some(text => text.includes('onOcean')));
  const coins = build(['numismatics','super-numerate'], 'Évaluation', { choice: 'keep', context: { estimatingObject: true }, talentChoices: { 'talent-numismatics:sl:keep': true } });
  assert.equal(coins.test.advantage.net, 1); assert.equal(coins.test.options[0].result.sl, 7);
  assert.equal(build(['numismatics'], 'Évaluation', { context: { estimatingObject: false } }).talentSLChoices.length, 0);
});

test('2.4 defender owns independent canonical skill and successful unit choice', () => {
  const make = settings => buildCombatTest({ actor: actor(['master-of-disguise']), target: actor(['master-of-disguise']),
    action: action('Pari'), defense: { ...action('Divertissement (Interprétation)'), roll: 47, v5: { kind: 'test', ...settings } }, roll: 42, v5: { kind: 'test' } }, 'defender');
  assert.ok(make({}).unresolved.some(text => text.includes('choices.')));
  const p = make({ talentChoices: { 'talent-master-of-disguise:sl:keep': true } });
  assert.equal(p.test.options[0].result.sl, 7); assert.equal(p.unresolved.length, 0);
});

test('2.4 UI descriptors require only applicable acquired contexts and canonical threat options', () => {
  assert.deepEqual(applicableV5TalentTestFields(actor(['public-speaker']), skill('Pari')), []);
  assert.equal(applicableV5TalentTestFields(actor(['public-speaker']), skill('Charme'))[0].field, 'influencingGroup');
  const fields = applicableV5TalentTestFields(actor([row('resistant', { specialization: 'Poison' })]), skill('Résistance'));
  assert.deepEqual(fields.find(row => row.field === 'threatId').options, [{ value: 'Poison', label: 'Poison' }]);
});

test('2.4 declarative action-before qualities require unique operation keys and called-shot modifier applies once', () => {
  const prototype = { ...structuredClone(registry.contracts[0]), clauses: [{ id: 'quality', event: 'action.before', role: 'attacker',
    when: [{ field: 'weapon.improvised', op: 'eq', value: true }], effects: [{ op: 'addQuality', key: 'assommante', stackGroup: 'synthetic-quality', stack: 'unique' }] }] };
  assert.equal(validateTalentContractV2(prototype), true);
  assert.equal(evaluateTalentContractsV2({ contracts: [prototype], acquisitions: [{ talentId: prototype.talentId }], sourceHashes: hashes,
    event: 'action.before', role: 'attacker', context: { weapon: { improvised: true } } }).proposals[0].key, 'assommante');
  delete prototype.clauses[0].effects[0].key;
  assert.throws(() => validateTalentContractV2(prototype), /Cible/);
  const normal = build([], 'Corps à corps (Base)', { kind: 'melee', context: { calledShot: true } });
  assert.equal(normal.test.options[0].result.sl, 0);
  const ignored = build([], 'Corps à corps (Base)', { kind: 'melee', context: { calledShot: true }, calledShotPenaltyIgnored: true });
  assert.equal(ignored.test.options[0].result.sl, 2);
});

test('2.4 literal units never turn failed or automatically failed tests into success', () => {
  for (const roll of [80, 97, 100]) {
    const p = build(['master-of-disguise'], 'Divertissement (Interprétation)', { talentChoices: { 'talent-master-of-disguise:sl:keep': true } }, { roll });
    assert.equal(p.test.options[0].result.success, false);
    assert.equal(p.talentSLChoices.length, 0);
    assert.equal(p.test.options[0].result.details.talentSLReplacement, undefined);
    assert.equal(p.unresolved.length, 0);
    if (roll === 100) {
      assert.equal(p.test.options[0].result.fumble, true);
      assert.equal(p.test.options[0].result.sl, -5);
    }
  }
});

test('2.4 literal units use final forced inverse and preserve each option success', () => {
  const forced = build(['master-of-disguise'], 'Divertissement (Interprétation)', {
    disadvantageSources: [{ id: 'synthetic-unfavourable' }], choice: 'reverse',
    talentChoices: { 'talent-master-of-disguise:sl:reverse': true } }, { roll: 2 });
  assert.equal(forced.test.initialRoll, 2);
  assert.equal(forced.test.forcedInversion, true);
  assert.equal(forced.test.options[0].id, 'reverse');
  assert.equal(forced.test.options[0].result.roll, 20);
  assert.equal(forced.test.options[0].result.sl, 0);
  assert.equal(forced.test.options[0].result.success, true);
  assert.equal(forced.test.options[0].result.zeroOutcome, 'marginalSuccess');
  const failKeep = build(['master-of-disguise'], 'Divertissement (Interprétation)', {
    advantageSources: [{ id: 'synthetic-favourable' }], choice: 'keep',
    talentChoices: { 'talent-master-of-disguise:sl:keep': true, 'talent-master-of-disguise:sl:reverse': true } }, { roll: 70 });
  assert.equal(failKeep.test.options[0].result.success, false);
  assert.equal(failKeep.test.options[0].result.sl, -1);
  assert.equal(failKeep.test.options[1].result.success, true);
  assert.equal(failKeep.test.options[1].result.sl, 7);
  assert.equal(failKeep.unresolved.length, 0);
});

test('2.4 defender zero choice preserves its own success and source independent from initiator', () => {
  const p = buildCombatTest({ actor: actor(['master-of-disguise']), target: actor(['master-of-disguise']),
    action: action('Divertissement (Interprétation)'), roll: 47,
    defense: { ...action('Divertissement (Interprétation)'), roll: 20,
      v5: { kind: 'test', talentChoices: { 'talent-master-of-disguise:sl:keep': true } } },
    v5: { kind: 'test', talentChoices: { 'talent-master-of-disguise:sl:keep': false } } }, 'defender');
  assert.equal(p.test.options[0].result.sl, 0);
  assert.equal(p.test.options[0].result.success, true);
  assert.equal(p.test.options[0].result.zeroOutcome, 'marginalSuccess');
  assert.equal(p.unresolved.length, 0);
});

test('2.4 literal zero choice remains successful in durable result, reload, undo and redo', async () => {
  let saved = null;
  const persistence = { load: async () => structuredClone(saved),
    saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ persistence });
  await store.ready;
  const source = actor(['master-of-disguise'], { name: 'Acteur synthétique', kind: 'PJ', camp: 'pj',
    zone: 'active', maxHp: 12, initiative: 60, caracs: { Soc: 60 }, extensions: { v5: { hasMomentum: false } } });
  await store.loadFromJSON({ schemaVersion: 3, extensions: { v5: { combatId: 'literal-units-combat', turnIndex: 1 } },
    reserve: [], combat: { round: 1, currentActorId: 'a', order: ['a'], participants: [source] }, diceLines: [], log: [] });
  const participantsBefore = JSON.parse(JSON.stringify(store.listParticipants()));
  const p = store.previewResolution({ resolutionId: 'literal-zero-result', actorId: 'a',
    action: action('Divertissement (Interprétation)'), roll: 20,
    v5: { kind: 'test', talentChoices: { 'talent-master-of-disguise:sl:keep': true } } });
  assert.equal(p.sl, 0); assert.equal(p.success, true); assert.equal(p.test.zeroOutcome, 'marginalSuccess');
  assert.equal(p.unresolved.length, 0);
  assert.equal((await store.applyResolution(p)).status, 'applied');
  assert.ok(JSON.parse(store.getFullJSON()).appliedResolutionIds.includes('literal-zero-result'));
  const detail = store.getLog()[0].detail;
  assert.equal(detail.sl, 0); assert.equal(detail.test.success, true); assert.equal(detail.test.zeroOutcome, 'marginalSuccess');
  assert.equal(detail.input.v5.talentChoices['talent-master-of-disguise:sl:keep'], true);
  const reloaded = createStore({ persistence });
  await reloaded.ready;
  assert.deepEqual(reloaded.getLog()[0].detail, detail);
  await reloaded.undo();
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.listParticipants())), participantsBefore);
  assert.equal((JSON.parse(reloaded.getFullJSON()).appliedResolutionIds || []).includes('literal-zero-result'), false);
  assert.deepEqual(reloaded.getLog()[0].detail, detail, 'journal is intentionally independent from command undo');
  await reloaded.redo();
  assert.ok(JSON.parse(reloaded.getFullJSON()).appliedResolutionIds.includes('literal-zero-result'));
  assert.equal(reloaded.getLog()[0].detail.sl, 0);
  assert.equal(reloaded.getLog()[0].detail.test.success, true);
  assert.equal(reloaded.getLog()[0].detail.test.zeroOutcome, 'marginalSuccess');
});

test('v3 : les cases de contexte affichées suivent les contrats (Sprinter, Flair, Présence imposante, Exaltant)', () => {
  const fields = (id, name) => applicableV5TalentTestFields(actor([id]), skill(name)).map(item => [item.field, item.label]);
  assert.deepEqual(fields('sprinter', 'Athlétisme'), [['running', 'Le Test sert à courir']]);
  assert.deepEqual(fields('nose-for-trouble', 'Intuition'), [['potentialDanger', 'Le Test d’Intuition est lié à un danger potentiel']]);
  assert.deepEqual(fields('commanding-presence', 'Commandement'), [['inCombat', 'Le Test de Commandement est effectué en combat']]);
  assert.deepEqual(fields('inspiring', 'Commandement'), []);
  assert.deepEqual(fields('sprinter', 'Pari'), []);
});
});

describe('Couts daction V5', () => {
const actor = extra => ({id:'a',hp:10,extensions:{v5:{hasMomentum:true,resources:{fortune:2,focus:3}}},...extra});
const state = extra => ({revision:4,participants:[actor(),{id:'t',hp:10}],...extra});
const clock = {encounterId:'enc',round:1,turnId:'a-turn-1'};
const request = extra => ({state:state(),actionId:'action-1',actorId:'a',clock,costs:[{id:'extra-attack',resource:'momentum',amount:1}],extraAttack:true,...extra});
const apply = draft => ({status:'applied',state:{...draft,participants:draft.participants.map(row=>row.id==='t'?{...row,hp:5}:row)}});

test('2.3 costs — Élan payé avant résultat, Blessures/quota/révision dans une seule transition', () => {
  const raw=request(),before=structuredClone(raw.state),plan=previewV5ActionCosts(raw);
  assert.equal(plan.ready,true);
  const result=commitV5ActionCosts(plan,raw.state,{resolveAction:draft=>{
    assert.equal(draft.participants[0].extensions.v5.hasMomentum,false,'extra Test sees Momentum already spent');
    return apply(draft);
  }});
  assert.equal(result.status,'applied');assert.equal(result.state.revision,5);
  assert.equal(result.state.participants[1].hp,5);
  assert.equal(result.state.v5ActionLedger.quotaUsage[0].used,1);
  assert.deepEqual(raw.state,before);
});

test('2.3 costs — regagner Élan ne permet pas second paiement attaqueextra au mêmeTour', () => {
  const first=commitV5ActionCosts(previewV5ActionCosts(request()),state(),{resolveAction:draft=>{
    const next=apply(draft);next.state.participants[0].extensions.v5.hasMomentum=true;return next;
  }});
  const next=previewV5ActionCosts(request({state:first.state,actionId:'action-2'}));
  assert.equal(next.ready,false);assert.match(next.unresolved[0].reason,/Quota/);
  const later=previewV5ActionCosts(request({state:first.state,actionId:'action-2',clock:{...clock,turnId:'a-turn-2'}}));
  assert.equal(later.ready,true);
});

test('2.3 costs — exemption coût et quota talent indépendants', () => {
  const raw=request({exemptions:[{costId:'extra-attack',sourceId:'synthetic-free-extra'}],quotas:[{id:'synthetic:once',scope:'turn',maximum:1}]});
  const plan=previewV5ActionCosts(raw);
  assert.equal(plan.paid.length,0);assert.equal(plan.waived.length,1);
  assert.equal(plan.usages.length,1,'exemption does not consume paid-Momentum quota');
  const applied=commitV5ActionCosts(plan,raw.state,{resolveAction:apply});
  assert.equal(applied.state.participants[0].extensions.v5.hasMomentum,true);
  assert.equal(previewV5ActionCosts({...raw,state:applied.state,actionId:'next'}).ready,false,'talent quota consumed despite free cost');
  const paid=previewV5ActionCosts(request({state:applied.state,actionId:'paid-after-free'}));assert.equal(paid.ready,true,'paid extra quota remains independent');
});

for(const [scope,change] of [['turn',{turnId:'a-turn-2'}],['round',{round:2}],['encounter',{encounterId:'enc2'}]]) test(`2.3 costs — quota ${scope} change seulement avec son horloge explicite`,()=>{
  const raw=request({costs:[],extraAttack:false,quotas:[{id:'talent:q',scope,maximum:1}]});
  const first=commitV5ActionCosts(previewV5ActionCosts(raw),raw.state,{resolveAction:apply});
  assert.equal(previewV5ActionCosts({...raw,state:first.state,actionId:'next'}).ready,false);
  assert.equal(previewV5ActionCosts({...raw,state:first.state,actionId:'next',clock:{...clock,...change}}).ready,true);
});

test('2.3 costs — plusieurs ressources explicites additionnées sans solde négatif',()=>{
  const raw=request({extraAttack:false,costs:[{id:'fortune1',resource:'fortune',amount:1},{id:'fortune2',resource:'fortune',amount:1},{id:'focus',resource:'focus',amount:2}]});
  const result=commitV5ActionCosts(previewV5ActionCosts(raw),raw.state,{resolveAction:apply});
  assert.deepEqual(result.state.participants[0].extensions.v5.resources,{fortune:0,focus:1});
  assert.equal(result.state.participants[0].extensions.v5.hasMomentum,true);
  const excessive=previewV5ActionCosts({...raw,costs:[{id:'fortune',resource:'fortune',amount:3}]});
  assert.equal(excessive.ready,false);assert.match(excessive.unresolved[0].reason,/insuffisante/);
});

test('2.3 costs — solde ou identité d’horloge inconnus refusés sans valeur implicite',()=>{
  const missing=previewV5ActionCosts(request({costs:[{id:'fate',resource:'fate',amount:1}],extraAttack:false}));
  assert.equal(missing.ready,false);assert.equal(missing.balances[0].before,null);
  for(const absent of ['encounterId','turnId']){
    const incomplete={...clock};delete incomplete[absent];
    const plan=previewV5ActionCosts(request({clock:incomplete}));assert.equal(plan.ready,false);
    assert.ok(plan.unresolved.some(row=>row.field===`clock.${absent}`));
  }
  const round=previewV5ActionCosts(request({costs:[],extraAttack:false,clock:{encounterId:'enc'},quotas:[{id:'q',scope:'round',maximum:1}]}));
  assert.equal(round.ready,false);
});

test('2.3 costs — résultat refusé ou erreur résolveur conserve ressources, quota et Blessures',()=>{
  const raw=request(),copy=structuredClone(raw.state),plan=previewV5ActionCosts(raw);
  const refused=commitV5ActionCosts(plan,raw.state,{resolveAction:()=>({status:'manual'})});
  assert.equal(refused.status,'blocked');assert.deepEqual(refused.state,copy);
  assert.throws(()=>commitV5ActionCosts(plan,raw.state,{resolveAction:()=>{throw new Error('atomic failure');}}),/atomic failure/);
  assert.deepEqual(raw.state,copy);
});

test('2.3 costs — duplication, révision et changement solde invalident correctement aperçu',()=>{
  const raw=request(),plan=previewV5ActionCosts(raw),applied=commitV5ActionCosts(plan,raw.state,{resolveAction:apply});
  assert.equal(commitV5ActionCosts(plan,applied.state,{resolveAction:()=>{throw new Error('must not run');}}).status,'duplicate');
  assert.equal(commitV5ActionCosts(plan,{...raw.state,revision:5},{resolveAction:apply}).status,'stale');
  const changed=structuredClone(raw.state);changed.participants[0].hp=9;
  assert.equal(commitV5ActionCosts(plan,changed,{resolveAction:apply}).status,'stale');
  const current=previewV5ActionCosts({...raw,state:applied.state});assert.equal(current.duplicate,true);assert.equal(current.ready,false);
});

test('2.3 costs — plan sérialisé, état rechargé et annulation par snapshot conservent tous les usages',()=>{
  const raw=request(),plan=JSON.parse(JSON.stringify(previewV5ActionCosts(raw))),before=JSON.parse(JSON.stringify(raw.state));
  const applied=commitV5ActionCosts(plan,before,{resolveAction:apply});
  const reload=JSON.parse(JSON.stringify(applied.state));
  assert.equal(commitV5ActionCosts(plan,reload,{resolveAction:apply}).status,'duplicate');
  assert.equal(previewV5ActionCosts({...raw,state:structuredClone(before),actionId:'after-undo'}).ready,true);
  assert.equal(before.participants[0].extensions.v5.hasMomentum,true);
  assert.equal(before.v5ActionLedger,undefined);
});

test('2.3 costs — identifiants, expressions et quotas réservés non déclaratifs rejetés',()=>{
  for(const changes of [
    {actionId:''},{costs:[{id:'x',resource:'momentum',amount:2}]},{costs:[{id:'x',resource:'fortune',amount:'rank'}]},
    {costs:[{id:'x',resource:'fortune',amount:1,expression:'Math.random()'}]},
    {costs:[{id:'x',resource:'constructor',amount:1}]},
    {quotas:[{id:'system:paid-momentum-extra-attack',scope:'turn',maximum:99}]},
    {quotas:[{id:'q',scope:'unknown',maximum:1}]},{exemptions:[{costId:'missing',sourceId:'talent'}]},
    {costs:[{id:'x',resource:'fortune',amount:1},{id:'x',resource:'focus',amount:1}]}
  ])assert.throws(()=>previewV5ActionCosts(request(changes)));
});

test('2.3 costs — aucune opération ne lance de dé',()=>{
  const old=Math.random;Math.random=()=>{throw new Error('no RNG');};
  try{const raw=request();assert.equal(commitV5ActionCosts(previewV5ActionCosts(raw),raw.state,{resolveAction:apply}).status,'applied');}finally{Math.random=old;}
});

test('2.3 costs — préparation fournit exactement état payé pour comparaison et confirmation sans mutation',()=>{
  const raw=request(),plan=previewV5ActionCosts(raw),before=structuredClone(raw.state);
  const prepared=prepareV5ActionState(plan,raw.state);
  assert.equal(prepared.status,'prepared');assert.equal(prepared.state.participants[0].extensions.v5.hasMomentum,false);
  assert.equal(prepared.state.v5ActionLedger.appliedActions.length,0,'candidate is not committed');
  assert.deepEqual(raw.state,before);
  const applied=commitV5ActionCosts(plan,raw.state,{resolveAction:draft=>{assert.deepEqual(draft,prepared.state);return apply(draft);}});
  assert.equal(applied.status,'applied');
});
});

describe('Controle V5', () => {
const memory=()=>{let state;return {load:async()=>state&&structuredClone(state),saveAtomic:async({state:next})=>{state=structuredClone(next);return {ok:true};}};};
async function encounterStore(){
  const persistence=memory(),store=createStore({persistence});await store.ready;
  await store.addProfile({id:'fixture-profile',name:'Contrôle synthétique',hp:20,maxHp:20,initiative:50,caracs:{E:30},armor:{head:0,body:0,arms:0,legs:0}});
  for(const id of ['fixture-a','fixture-b'])await store.saveEncounter({id,title:'Scène de contrôle',entries:[{id:`${id}:entry`,profileId:'fixture-profile',quantity:2,zone:'active'}]});
  await store.launchEncounter('fixture-a');const engine=createCombatEngine(store);await engine.start();return {store,engine,persistence};
}

test('Contrôle indépendant V5 — pause A après cinq Tours, B deux Tours, reprise A conserve horloge et échéance',async()=>{
  const {store,engine,persistence}=await encounterStore();
  const [author,target]=store.listParticipants();
  const effect=createV5TimedEffect({id:'fixture-expiry',name:'Effet de contrôle',level:1},{authorId:author.id,targetId:target.id,expiry:{phase:'endOfTurn',round:4,turn:7,actorId:author.id}});
  await store.acquireConditions(target.id,[effect],{authorId:author.id,targetId:target.id});
  for(let i=0;i<5;i++)assert.equal((await engine.nextTurn()).status,'applied');
  assert.equal(JSON.parse(store.getFullJSON()).extensions.v5.turnIndex,6);
  const sceneA=store.getActiveScene();assert.equal(sceneA.extensions.v5.turnIndex,6);
  await store.suspendActiveScene();await store.launchEncounter('fixture-b');await engine.start();
  for(let i=0;i<2;i++)await engine.nextTurn();
  assert.equal(JSON.parse(store.getFullJSON()).extensions.v5.turnIndex,3);
  await store.suspendActiveScene();await store.resumeScene(sceneA.id);
  assert.equal(JSON.parse(store.getFullJSON()).extensions.v5.turnIndex,6);
  assert.equal(store.getActiveScene().extensions.v5.turnIndex,6);
  assert.ok(store.listParticipants().find(item=>item.id===target.id).states.some(state=>state.id==='fixture-expiry'));
  const reloaded=createStore({persistence});await reloaded.ready;const resumed=createCombatEngine(reloaded);
  await resumed.nextTurn();
  assert.ok(reloaded.listParticipants().find(item=>item.id===target.id).states.some(state=>state.id==='fixture-expiry'));
  await resumed.nextTurn();
  assert.ok(!reloaded.listParticipants().find(item=>item.id===target.id).states.some(state=>state.id==='fixture-expiry'));
  await reloaded.undo();
  assert.ok(reloaded.listParticipants().find(item=>item.id===target.id).states.some(state=>state.id==='fixture-expiry'));
});

test('Contrôle indépendant V5 — jet obligatoire manquant bloque toute mutation, sa modalité devenue périmée reste sans effet',async()=>{
  const {store,engine}=await encounterStore();const [burning,other]=store.listParticipants();
  await store.acquireConditions(burning.id,[{name:'Enflammé',level:1}]);await engine.nextTurn();
  const before=store.getFullJSON(),pending=await engine.nextTurn();
  assert.equal(pending.status,'requires-input');assert.ok(pending.requests.some(request=>request.field==='fireRoll'));
  const afterMissing=JSON.parse(store.getFullJSON()),beforeMissing=JSON.parse(before);delete afterMissing.exportedAt;delete beforeMissing.exportedAt;assert.deepEqual(afterMissing,beforeMissing);
  await store.updateParticipant(other.id,{hp:19});
  const stale=await engine.nextTurn({baseRevision:pending.baseRevision,inputs:{[burning.id]:{fireRoll:8}}});
  assert.equal(stale.status,'stale');assert.equal(store.getCombat().round,1);
  assert.equal(store.listParticipants().find(item=>item.id===burning.id).hp,20);
  const options={baseRevision:store.getLocalRevision(),inputs:{[burning.id]:{fireRoll:6}}};
  const committing=engine.nextTurn(options);options.inputs[burning.id].fireRoll=10;
  assert.equal((await committing).status,'applied');
  assert.equal(store.listParticipants().find(item=>item.id===burning.id).hp,17,'The committed explicit d10 must remain 6, not the later mutated 10');
});

test('Contrôle indépendant V5 — critique conserve auteur, cible, verrou des soins et version ; effet Précise V4 reste visible et bloqué',async()=>{
  const {store}=await encounterStore();const [author,target]=store.listParticipants();
  assert.equal(keywordMechanicalStatus('empaleuse').word.edition,'V5');
  const input={actorId:author.id,targetId:target.id,action:{type:'attack',base:60,damage:4},roll:22,defense:{base:20,roll:81},criticalRolls:{location:2,effect:49}};
  const preview=store.previewResolution(input);assert.equal((await store.applyResolution(preview)).status,'applied');
  const blinded=store.listParticipants().find(item=>item.id===target.id).states.find(state=>state.key==='aveugle');
  assert.deepEqual(blinded.v5Recovery,{kind:'medicalAttention'});
  assert.equal(blinded.authorId,author.id);assert.equal(blinded.targetId,target.id);
  assert.equal(blinded.source.authorId,author.id);assert.equal(blinded.source.targetId,target.id);
  assert.equal(store.getLog()[0].detail.ruleVersion,'v5-combat-2026-10-09.24.6');
  const legacy=store.previewResolution({...input,action:{...input.action,qualities:['Précise']}});
  assert.ok(legacy.mechanicalWarnings.some(warning=>warning.keywordId==='precise'));
  assert.equal((await store.applyResolution(legacy)).status,'manual');
});

test('Contrôle indépendant 2.3 — comparaison sur Élan payé, résultat atomique, quota après rechargement et acteur distinct',()=>{
  const participant=id=>({id,hp:20,extensions:{v5:{hasMomentum:true,resources:{fortune:2}}}});
  const initial={revision:9,participants:[participant('control-attacker'),participant('control-other'),{id:'control-target',hp:20}]};
  const original=structuredClone(initial);
  const clock={encounterId:'control-encounter',round:3,turnId:'control-turn-5'};
  const request={state:initial,actorId:'control-attacker',actionId:'control-extra-attack',clock,extraAttack:true,costs:[{id:'momentum-extra',resource:'momentum',amount:1}]};
  const plan=previewV5ActionCosts(request);
  const paid=prepareV5ActionState(plan,initial);
  const bonusFor=state=>evaluateTalentContractsV2({contracts:registry.contracts,acquisitions:[{talentId:'talent-strike-mighty-blow'}],
    sourceHashes:Object.fromEntries(registry.contracts.map(item=>[item.talentId,item.source.effectHash])),event:'damage.beforeProtection',role:'attacker',
    context:{kind:'melee',weapon:{isMelee:true},attack:{hit:true,usedAdvantageV5:hasMomentum(state.participants[0])}}}).proposals[0].amount;
  assert.equal(bonusFor(initial),2);
  assert.equal(bonusFor(paid.state),1,'Paying Momentum changes the actual bonus used for this extra attack');
  const result=commitV5ActionCosts(JSON.parse(JSON.stringify(plan)),initial,{resolveAction:draft=>{
    assert.deepEqual(draft,paid.state);
    const damage=5+bonusFor(draft);draft.participants[2].hp-=damage;draft.participants[0].extensions.v5.hasMomentum=true;
    return {status:'applied',state:draft};
  }});
  assert.equal(result.state.participants[2].hp,14);
  assert.equal(result.state.revision,10);
  const reload=JSON.parse(JSON.stringify(result.state));
  assert.equal(commitV5ActionCosts(plan,reload,{resolveAction:()=>assert.fail('Duplicate must never resolve again')}).status,'duplicate');
  const repeat=previewV5ActionCosts({...request,state:reload,actionId:'control-second-attack'});
  assert.equal(repeat.ready,false,'Regained Momentum does not bypass the paid-extra quota');
  assert.ok(repeat.unresolved.some(row=>row.field.startsWith('quota.')));
  assert.equal(previewV5ActionCosts({...request,state:reload,actorId:'control-other',actionId:'control-other-attack'}).ready,true,'Usage belongs to its actor');
  assert.equal(previewV5ActionCosts({...request,state:reload,actionId:'control-next-turn',clock:{...clock,turnId:'control-turn-6'}}).ready,true);
  assert.deepEqual(initial,original,'All plans and compositions preserve the original snapshot');
});

test('Contrôle indépendant 2.3 — Battement brouillon reste inactif et schéma 1 conserve son refus des champs v2',()=>{
  const sourceHashes=Object.fromEntries(registry.contracts.map(item=>[item.talentId,item.source.effectHash]));
  const plan=evaluateTalentContractsV2({contracts:registry.contracts.map(item=>item.talentId==='talent-beat-blade'?{...item,status:'draft'}:item),acquisitions:[{talentId:'talent-beat-blade'}],sourceHashes,
    event:'action.afterAttack',role:'attacker',context:{kind:'melee',attack:{hit:true},actor:{id:'control-a',size:3},target:{id:'control-t',size:3},
      authorNextTurnEnd:{phase:'endOfTurn',round:4,turn:9,actorId:'control-a'}},choices:{'talent-beat-blade:replace-damage':true}});
  assert.deepEqual(plan.proposals,[]);assert.equal(plan.trace[0].status,'draft');
  const legacy={schemaVersion:1,talentId:'control-schema-one',edition:'V5',status:'validated',ruleVersion:'control-legacy.1',
    source:{effectHash:'sha256:'+'d'.repeat(64),reference:'Contrôle synthétique'},clauses:[{id:'ordinary',event:'damage.beforeProtection',role:'attacker',when:[],
      effect:{op:'modifyDamage',amount:1,stackGroup:'control-schema-one',stack:'max'}}]};
  const input={contracts:[legacy],acquisitions:[{talentId:legacy.talentId}],sourceHashes:{[legacy.talentId]:legacy.source.effectHash},event:'damage.beforeProtection',role:'attacker'};
  assert.equal(evaluateTalentContracts(input).proposals[0].amount,1);
  const upgraded=structuredClone(legacy);upgraded.clauses[0].costs=[{id:'new-cost',resource:'fortune',amount:1}];
  assert.throws(()=>evaluateTalentContracts({...input,contracts:[upgraded]}),/Champ de contrat non couvert/);
  assert.throws(()=>evaluateTalentContracts({...input,contracts:[registry.contracts[0]]}),/Contrat V5 invalide/);
});

test('Contrôle indépendant V5 — Assourdi acquis par critique ancre sa minute au Round canonique de la scène',async()=>{
  const {store,engine}=await encounterStore();
  for(let i=0;i<8;i++)assert.equal((await engine.nextTurn()).status,'applied');
  assert.equal(store.getCombat().round,5);
  const [author,target]=store.listParticipants();
  const input={actorId:author.id,targetId:target.id,action:{type:'attack',base:60,damage:4},roll:22,defense:{base:20,roll:81},criticalRolls:{location:2,effect:9}};
  const preview=store.previewResolution(input);assert.equal((await store.applyResolution(preview)).status,'applied');
  const deafened=store.listParticipants().find(item=>item.id===target.id).states.find(state=>state.key==='assourdi');
  assert.equal(deafened.v5Timing.acquiredRound,5);
  const premature=await store.recoverCondition(target.id,deafened.id,{method:'endurance',test:{success:true,sl:1},transition:{phase:'endOfRound',round:1000}});
  assert.equal(premature.status,'requires-input','A client-supplied later Round must not bypass the real six-Round delay');
  assert.ok(premature.requests.some(request=>request.field==='minuteElapsed'));
  for(let i=0;i<12;i++)assert.equal((await engine.nextTurn()).status,'applied');
  assert.equal(store.getCombat().round,11);
  const recovered=await store.recoverCondition(target.id,deafened.id,{method:'endurance',test:{success:true,sl:1},transition:{phase:'endOfRound'}});
  assert.equal(recovered.status,'applied');
  assert.equal(store.listParticipants().find(item=>item.id===target.id).states.some(state=>state.key==='assourdi'),false);
});

test('Contrôle indépendant V5 — un critique Sonné rend Inconscient le porteur du poison avec échéance BE persistée',async()=>{
  const {store,engine,persistence}=await encounterStore();const [author,target]=store.listParticipants();
  assert.equal((await store.acquireConditions(target.id,[{name:'Empoisonné',level:2},{name:'Sonné',level:3}],{round:999})).status,'applied');
  const poisoned=store.listParticipants().find(item=>item.id===target.id);
  assert.ok(poisoned.states.every(state=>state.v5Timing.acquiredRound===1),'Store acquisition must use its actual Round');
  const input={actorId:author.id,targetId:target.id,action:{type:'attack',base:60,damage:4},roll:22,defense:{base:20,roll:81},criticalRolls:{location:2,effect:20}};
  const preview=store.previewResolution(input);assert.equal((await store.applyResolution(preview)).status,'applied');
  const unconscious=store.listParticipants().find(item=>item.id===target.id);
  assert.ok(unconscious.states.some(state=>state.key==='inconscient'));
  assert.equal(unconscious.extensions.v5.poisonDeathDueRound,4);
  assert.equal((await engine.nextTurn()).status,'applied');
  const firstRoundEnd=await engine.nextTurn();
  assert.equal(firstRoundEnd.status,'applied','Known acquisition clock must not request a guessed poison death deadline');
  const reloaded=createStore({persistence});await reloaded.ready;
  assert.equal(reloaded.listParticipants().find(item=>item.id===target.id).extensions.v5.poisonDeathDueRound,4);
});
});

describe('Effets V5', () => {
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
});

describe('Reactions V5', () => {
const clock = { encounterId: 'encounter', round: 2, turnId: 'scene:3:actor' };
const action = { id: 'blade', type: 'attack', base: 60, attr: 'CC', mod: 0, damage: 4, qualities: [] };
const actor = { id: 'actor', name: 'Recette synthétique', hp: 40, zone: 'active', talents: [{ id: 'talent-furious-assault', status: 'resolved', rank: 1 }], extensions: { v5: { hasMomentum: true } } };
const target = { id: 'target', name: 'Cible synthétique', hp: 40, zone: 'active' };
const state = () => ({ schemaVersion: 3, reserve: [], persistentCharacters: [], localRevision: 5, combat: { round: 2, participants: [structuredClone(actor), structuredClone(target)] }, extensions: {}, log: [], diceLines: [] });
const source = (extra = {}) => ({ resolutionId: 'source-resolution', input: { actor: structuredClone(actor), target: structuredClone(target), action: structuredClone(action) }, targetId: 'target', attack: true, hit: true, test: { kind: 'melee' }, ...extra });
const request = reactionId => ({ actorId: 'actor', targetId: 'target', action: structuredClone(action), roll: 50, v5: { reactionId } });
const registered = () => registerV5ReactionOpportunities(state(), source(), { clock });

test('Réactions V5 — opportunité après touche, liée au résultat/auteur/cible/arme, sans snapshot fiche ni mutation', () => {
  const input = state(), resolution = source(), saved = structuredClone(input), random = Math.random;
  Math.random = () => { throw new Error('Aucun tirage pour une opportunité'); };
  let next;
  try { next = registerV5ReactionOpportunities(input, resolution, { clock }); } finally { Math.random = random; }
  const list = listV5ReactionOpportunities(next, 'actor', { clock });
  assert.equal(list.length, 1);
  assert.equal(list[0].sourceResolutionId, 'source-resolution');
  assert.equal(list[0].actorId, 'actor'); assert.equal(list[0].targetId, 'target');
  assert.equal(list[0].action.id, 'blade'); assert.equal(list[0].actor, undefined);
  assert.equal(list[0].quotas[0].scope, 'round'); assert.equal(list[0].costs[0].resource, 'momentum');
  assert.deepEqual(input, saved);
});

test('Réactions V5 — entrée injecte coûts/quota durables, refuse auteur/cible/arme/dégâts différents', () => {
  const next = registered(), opportunity = listV5ReactionOpportunities(next, 'actor', { clock })[0];
  const supplied = request(opportunity.id); supplied.v5.costs = []; supplied.v5.quotas = [];
  const plan = validateV5ReactionInput(next, supplied, { clock });
  assert.equal(plan.ready, true); assert.deepEqual(plan.input.v5.costs, opportunity.costs); assert.deepEqual(plan.input.v5.quotas, opportunity.quotas); assert.equal(plan.input.v5.extraAttack, true);
  for (const mutate of [row => row.actorId = 'foreign', row => row.targetId = 'foreign', row => row.action.id = 'different-weapon', row => row.action.damage = 100]) {
    const changed = request(opportunity.id); mutate(changed);
    assert.equal(validateV5ReactionInput(next, changed, { clock }).ready, false);
  }
  assert.deepEqual(supplied.v5.costs, []);
});

test('Réactions V5 — même horloge obligatoire ; autre résolution appliquée ferme toutes les offres', () => {
  const next = registered(), opportunity = listV5ReactionOpportunities(next, 'actor', { clock })[0];
  for (const changed of [{ ...clock, round: 3 }, { ...clock, turnId: 'other-turn' }, { ...clock, encounterId: 'other-encounter' }, {}]) {
    assert.equal(listV5ReactionOpportunities(next, 'actor', { clock: changed }).length, 0);
    assert.equal(validateV5ReactionInput(next, request(opportunity.id), { clock: changed }).ready, false);
  }
  const closed = registerV5ReactionOpportunities(next, source({ resolutionId: 'another-result', attack: false }), { clock });
  assert.equal(listV5ReactionOpportunities(closed, 'actor', { clock }).length, 0);
  assert.equal(validateV5ReactionInput(closed, request(opportunity.id), { clock }).ready, false);
  assert.equal(listV5ReactionOpportunities(next, 'actor', { clock }).length, 1);
});

test('Réactions V5 — miss/tir/Élan absent/contexte absent ne créent pas attaque automatique', () => {
  for (const resolution of [source({ hit: false }), source({ test: { kind: 'ranged' } }), source({ attack: false })]) assert.equal(listV5ReactionOpportunities(registerV5ReactionOpportunities(state(), resolution, { clock }), 'actor', { clock }).length, 0);
  const absent = state(); absent.combat.participants[0].extensions.v5.hasMomentum = false;
  assert.equal(listV5ReactionOpportunities(registerV5ReactionOpportunities(absent, source(), { clock }), 'actor', { clock }).length, 0);
  assert.deepEqual(registerV5ReactionOpportunities(state(), source(), { clock: {} }).extensions.v5.reactionOpportunities, []);
});

test('Réactions V5 — quota Round et paiement Élan Tour restent distincts, aucun nouveau offer après usage', () => {
  const next = registered(), opportunity = listV5ReactionOpportunities(next, 'actor', { clock })[0];
  const pure = { revision: 5, participants: next.combat.participants, v5ActionLedger: { appliedActions: [], quotaUsage: [] } };
  const cost = previewV5ActionCosts({ state: pure, actorId: 'actor', actionId: 'reaction-result', clock, extraAttack: true, costs: opportunity.costs, quotas: opportunity.quotas, exemptions: opportunity.exemptions });
  const paid = prepareV5ActionState(cost, pure);
  assert.equal(paid.status, 'prepared'); assert.equal(paid.state.participants[0].extensions.v5.hasMomentum, false);
  assert.equal(paid.state.v5ActionLedger.quotaUsage.length, 2);
  assert.ok(paid.state.v5ActionLedger.quotaUsage.some(row => row.scope === 'round'));
  assert.ok(paid.state.v5ActionLedger.quotaUsage.some(row => row.scope === 'turn'));
  const after = structuredClone(next); after.extensions.v5.actionLedger = paid.state.v5ActionLedger;
  // Winning that extra attack can regain Momentum but cannot refund the quota.
  assert.equal(listV5ReactionOpportunities(registerV5ReactionOpportunities(after, source({ resolutionId: 'reaction-result' }), { clock }), 'actor', { clock }).length, 0);
});

test('Réactions V5 — migration/sauvegarde/cloud conservent l’offre et fermeture annulable par snapshot', () => {
  const next = registered(), offer = listV5ReactionOpportunities(next, 'actor', { clock })[0];
  const restored = migrateSnapshot(JSON.parse(JSON.stringify(sharedState(next)))).data;
  assert.equal(validateV5ReactionInput(restored, request(offer.id), { clock }).ready, true);
  const before = structuredClone(next), closed = closeV5ReactionOpportunities(next);
  assert.equal(closed.extensions.v5.reactionOpportunities.length, 0);
  assert.equal(listV5ReactionOpportunities(before, 'actor', { clock }).length, 1);
});

test('Réactions V5 — talent retiré ou source absente/modifiée bloque une offre persistée sans exception', () => {
  const next = registered(), opportunity = listV5ReactionOpportunities(next, 'actor', { clock })[0];
  assert.match(opportunity.source.effectHash, /^sha256:[0-9a-f]{64}$/);
  assert.equal(typeof opportunity.source.reference, 'string');
  assert.equal(validateV5ReactionInput(next, request(opportunity.id), { clock }).ready, true);
  const removed = structuredClone(next); removed.combat.participants[0].talents = [];
  const noTalent = validateV5ReactionInput(removed, request(opportunity.id), { clock });
  assert.equal(noTalent.ready, false); assert.match(noTalent.reason, /possède plus le talent/);
  const changed = structuredClone(next); changed.extensions.v5.reactionOpportunities[0].source.effectHash = 'sha256:' + '0'.repeat(64);
  const noSource = validateV5ReactionInput(changed, request(opportunity.id), { clock });
  assert.equal(noSource.ready, false); assert.match(noSource.reason, /source du talent/);
  const legacy = structuredClone(next); delete legacy.extensions.v5.reactionOpportunities[0].source;
  assert.doesNotThrow(() => validateV5ReactionInput(legacy, request(opportunity.id), { clock }));
  assert.equal(validateV5ReactionInput(legacy, request(opportunity.id), { clock }).ready, false);
});
});

describe('Talents restants V5', () => {
const owned=(id,rank=1,specialization)=>({id:'talent-'+id,status:'resolved',rank,...(specialization?{specialization}:{})});
const skill=name=>getReferenceCatalogue().skills.find(s=>s.nom===name).id;
const subject=(id,talents=[],extra={})=>({id,name:id,kind:'PJ',camp:id==='a'?'pj':'ennemi',hp:40,maxHp:40,zone:'active',caracs:{CC:60,CT:60,F:40,E:30,Ag:40,FM:40,Soc:60,Int:60},talents,states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{hasMomentum:false}},...extra});
async function setup(talents=[],defenderTalents=[],extra={}){let saved=null;const persistence={load:async()=>structuredClone(saved),saveAtomic:async({state})=>{saved=structuredClone(state);return{ok:true};}};const store=createStore({persistence});await store.ready;await store.loadFromJSON({schemaVersion:3,reserve:[],extensions:{v5:{combatId:'talent-test',turnIndex:1}},combat:{round:1,currentActorId:'a',order:['a','b'],participants:[subject('a',talents,extra.actor),subject('b',defenderTalents,extra.target)]},diceLines:[],log:[]});return {store,persistence};}
const melee=(id,extra={})=>({resolutionId:id,actorId:'a',targetId:'b',action:{type:'attack',base:60,attr:'CC',damage:5},roll:24,defense:{base:30,roll:82,v5:{kind:'melee'}},v5:{kind:'melee'},...extra});
const generic=(name,context={},extra={})=>({resolutionId:'generic',actorId:'a',action:{type:'skill',base:60,attr:'Int',extensions:{fiche:{skillId:skill(name)}}},roll:20,v5:{kind:'test',context},...extra});
test('Talents complémentaires : chaque contrat a la source publique exacte et un schéma valide',()=>{for(const c of V5_TALENT_CONTRACTS){const src=getReferenceCatalogue().talents.find(t=>t.id===c.talentId);assert.equal(c.source.effectHash,'sha256:'+createHash('sha256').update(src.description).digest('hex'));assert.equal(currentV5TalentHashes()[c.talentId],c.source.effectHash);assert.equal(validateTalentContractV2(c),true);}});
test('Matraqueur : seuil V5 réel, tête seulement, acquisition après réductions et undo durable',async()=>{const{store,persistence}=await setup([owned('bludgeoner',2)],[owned('iron-jaw')]);const raw=melee('pummel',{roll:10,action:{type:'attack',base:60,attr:'CC',damage:5,qualities:['assommante']},defense:{base:30,roll:82,v5:{kind:'melee'}}});const p=store.previewResolution(raw);assert.equal(p.weaponConditions.proposed[0].level,3);assert.equal(p.weaponConditions.applied[0].level,2);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[1].states.find(s=>s.key==='sonne').level,2);const reload=createStore({persistence});await reload.ready;await reload.undo();assert.equal(reload.listParticipants()[1].states.length,0);assert.equal(reload.listParticipants()[1].hp,40);const blocked=store.previewResolution({...raw,resolutionId:'threshold',protectionContext:{manualAp:30}});assert.equal(blocked.weaponConditions.proposed.length,0);const body=store.previewResolution({...raw,resolutionId:'body',roll:25});assert.equal(body.weaponConditions.proposed.length,0);});
test('Matraqueur ne donne aucun bonus à un ancien Test de Force',async()=>{const{store}=await setup([owned('bludgeoner',3)]);const p=store.previewResolution({actorId:'a',action:{type:'skill',attr:'F',base:60},roll:25,v5:{kind:'test'}});assert.equal(p.sl,4);});
for(const [id,key,kind,input,want]of [['ambidextrous','offHand','melee',-2,0],['sharpshooter','cover','ranged',-3,0],['sniper','longRange','ranged',-2,0],['sniper','extremeRange','ranged',-3,-1],['enclosed-fighter','confined','melee',-3,0]])test(id+' : seule la pénalité typée pertinente disparaît',async()=>{const{store}=await setup([owned(id)]);const p=store.previewResolution(melee('penalty',{v5:{kind,slModifier:-1,context:{penalties:{[key]:input}}},defense:kind==='melee'?{base:30,roll:82,v5:{kind:'melee'}}:undefined}));assert.equal(p.test.details.modifiers.find(m=>m.id==='penalty:'+key).amount,want);assert.equal(p.test.details.modifiers.find(m=>m.id==='difficulty').amount,-1);});
test('Tir mortel et Frappe précise : ciblé −1, supprimé avec Visée ou Avantage net',async()=>{for(const[id,kind,aimed,advantage]of[['deadeye-shot','ranged',true,0],['careful-strike','melee',false,1]]){const{store}=await setup([owned(id)]);const raw=melee('called',{v5:{kind,aimed:false,context:{calledShot:true,calledShotLocation:'body'}}});assert.equal(store.previewResolution(raw).test.details.modifiers.find(m=>m.id==='called-shot').amount,-1);const p=store.previewResolution({...raw,v5:{...raw.v5,aimed,advantageSources:advantage?[{id:'explicit',label:'Avantage déclaré'}]:[],choice:'keep'}});assert.equal(p.test.details.modifiers.find(m=>m.id==='called-shot').amount,0);}});
test('Infatigable ne modifie que la Force opposée et plafonne son bonus à +3',async()=>{for(const rank of[1,2,4]){const{store}=await setup([owned('strong-back',rank)]);const raw={actorId:'a',action:{type:'skill',attr:'F',base:60},roll:25,v5:{kind:'test',context:{opposedTest:true}}};assert.equal(store.previewResolution(raw).sl,4+(rank===1?1:3));assert.equal(store.previewResolution({...raw,v5:{kind:'test',context:{opposedTest:false}}}).sl,4);}});
test('Savant exige une spécialité acquise exacte et la compétence importée reste prioritaire',async()=>{const{store}=await setup([owned('savant',1,'Politique')]);const raw=generic('Savoir (Politique)');assert.equal(store.previewResolution(raw).test.advantage.net,1);assert.equal(store.previewResolution(generic('Savoir (Géographie)',{skillId:skill('Savoir (Politique)')})).test.advantage.net,0);});
test('Lecture rapide double les DR réussis du Test étendu uniquement',async()=>{const{store}=await setup([owned('speedreader')]);const raw=generic('Recherche',{extendedTest:true});const p=store.previewResolution(raw);assert.equal(p.sl,8);assert.equal(store.previewResolution(generic('Recherche',{extendedTest:false})).sl,4);assert.equal(store.previewResolution({...raw,roll:91}).success,false);});
test('Bonus après réussite : Sapeur échoué reste échoué, réussite +rang',async()=>{const{store}=await setup([owned('underminer',2)]);const p=store.previewResolution(melee('sapper'));assert.equal(p.sl,6);assert.equal(store.previewResolution(melee('failed',{roll:91})).success,false);});
test('Inlassable ignore rang+1 Exténué pour la pénalité sans retirer les États et respecte la pire autre pénalité',async()=>{const{store}=await setup([owned('tireless',1)],[],{actor:{states:[{name:'Exténué',level:4},{name:'Empoisonné',level:3}]}});const p=store.previewResolution(melee('fatigue'));assert.equal(p.score.statePenalty,3);assert.equal(store.listParticipants()[0].states.find(s=>s.key==='extenue').level,4);});
test('Endurci toujours ; Cœur vaillant et Persévérant une fois par rencontre, événements mixtes idempotents',async()=>{const{store,persistence}=await setup([], [owned('implacable'),owned('stout-hearted'),owned('tenacious')]);const acquisitions=[{name:'Hémorragique',level:2},{name:'Brisé',level:2},{name:'Exténué',level:2}];assert.equal((await store.acquireConditions('b',acquisitions,{resolutionId:'mixed'})).status,'applied');const after=store.listParticipants()[1];for(const k of['hemorragique','brise','extenue'])assert.equal(after.states.find(s=>s.key===k).level,1);assert.equal((await store.acquireConditions('b',acquisitions,{resolutionId:'mixed'})).status,'duplicate');const reload=createStore({persistence});await reload.ready;assert.equal((await reload.acquireConditions('b',acquisitions,{resolutionId:'mixed-2'})).status,'applied');const states=reload.listParticipants()[1].states;assert.equal(states.filter(s=>s.key==='hemorragique').reduce((s,x)=>s+x.level,0),2);assert.equal(states.filter(s=>s.key==='brise').reduce((s,x)=>s+x.level,0),3);await reload.undo();assert.equal(reload.listParticipants()[1].states.find(s=>s.key==='brise').level,1);});
test('Charge berserk et Tir sûr : dégâts avant BE/PA et pas de bonus de charge sans Charge',async()=>{const{store}=await setup([owned('berserk-charge'),owned('sure-shot')]);const baseline=store.previewResolution(melee('base'));const charge=store.previewResolution(melee('charge',{v5:{kind:'melee',charging:true,choice:'keep'}}));assert.equal(charge.damage.talentDamage,2);assert.equal(charge.damage.finalDamage,baseline.damage.finalDamage+2);const ranged=store.previewResolution(melee('ranged',{defense:undefined,v5:{kind:'ranged'}}));assert.equal(ranged.damage.talentDamage,1);});
test('Artilleur respecte le groupe exact et ne supprime Dangereuse que temporairement',async()=>{const{store}=await setup([owned('gunner')]);const raw=melee('gun',{action:{type:'attack',base:60,damage:5,qualities:['dangereuse']},v5:{kind:'ranged',context:{weaponGroup:'Poudre Noire'}},defense:undefined});assert.ok(!store.previewResolution(raw).input.action.qualities.some(q=>q.id==='dangereuse'));assert.ok(raw.action.qualities.includes('dangereuse'));assert.ok(store.previewResolution({...raw,v5:{kind:'ranged',context:{weaponGroup:'Arc'}}}).input.action.qualities.some(q=>q.id==='dangereuse'));});
test('Rechargement rapide : indice réduit de 1 sans devenir négatif ; Mèche courte ajoute son rang',async()=>{const{store}=await setup([owned('rapid-reload'),owned('short-fuse',2)]);const raw=melee('reload',{action:{type:'attack',base:60,damage:5,qualities:[{id:'recharge',parameter:'1'},{id:'explosion',parameter:'3'}]},v5:{kind:'ranged',context:{weaponGroup:'Explosifs'}},defense:undefined});const p=store.previewResolution(raw);assert.equal(p.input.action.qualities.find(q=>q.id==='recharge').parameter,'0');assert.equal(p.input.action.qualities.find(q=>q.id==='explosion').parameter,'5');assert.equal(raw.action.qualities[0].parameter,'1');});
test('Frappe blessante exige deux gravités et un choix, le plus bas reste sélectionnable',async()=>{const{store}=await setup([owned('strike-to-injure')]);const raw=melee('injure',{roll:22,criticalRolls:{location:2,effect:80,injureEffect:20},v5:{kind:'melee',talentChoices:{'injure:first':false}}});const first=store.previewResolution(raw);assert.equal(first.critical.details.effectRollBase,80);const second=store.previewResolution({...raw,v5:{kind:'melee',talentChoices:{'injure:first':true}}});assert.equal(second.critical.details.effectRollBase,20);const missing=store.previewResolution({...raw,v5:{kind:'melee'}});assert.ok(missing.unresolved.some(x=>x.includes('Frappe blessante')));assert.equal((await store.applyResolution(missing)).status,'manual');assert.equal((await store.applyResolution(second)).status,'applied');});
test('Frappe blessante et Inoffensive exigent deux paires et appliquent le minimum de la paire choisie',async()=>{const{store}=await setup([owned('strike-to-injure')]);const raw=melee('pairs',{roll:22,action:{type:'attack',base:60,damage:5,qualities:['inoffensive']},criticalRolls:{location:2,effect:80,effectAlternative:30,injureEffect:70,injureEffectAlternative:10},v5:{kind:'melee',talentChoices:{'injure:first':true}}});assert.equal(store.previewResolution(raw).critical.details.effectRollBase,10);});
test('Riposte inflige ses dégâts normaux après victoire, pas après défaite ; undo et critique indépendant',async()=>{const{store}=await setup([], [owned('riposte')]);const raw=melee('riposte',{roll:41,defense:{base:60,roll:24,damage:5,v5:{kind:'melee'}}});const p=store.previewResolution(raw);assert.equal(p.hit,false);assert.equal(p.defenderDamage.finalDamage,4);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[0].hp,36);assert.equal(store.listParticipants()[1].hp,40);await store.undo();assert.equal(store.listParticipants()[0].hp,40);const fail=store.previewResolution({...raw,defense:{...raw.defense,roll:92}});assert.equal(fail.defenderDamage,null);});
test('Renversement conserve un Élan déjà acquis sur touche avec défense réussie, mais ne le crée pas',async()=>{const{store}=await setup([], [owned('reversal')],{target:{extensions:{v5:{hasMomentum:true}}}});const raw=melee('reversal',{roll:10,defense:{base:60,roll:25,v5:{kind:'melee',choice:'keep'}}});const p=store.previewResolution(raw);assert.equal(p.hit,true);assert.equal(p.momentum.find(x=>x.participantId==='b').after,true);});
test('Commandant : Action réussie puis seule la prochaine attaque à équipage utilise la compétence, reload et undo',async()=>{const{store,persistence}=await setup([owned('crew-commander')]);const command=generic('Commandement',{talentAction:'crew-commander',crewWithinVoice:true,crewRangedBase:80},{targetId:'b',resolutionId:'command'});assert.equal((await store.applyResolution(store.previewResolution(command))).status,'applied');const reload=createStore({persistence});await reload.ready;const shot={resolutionId:'shot',actorId:'b',targetId:'a',action:{type:'attack',attr:'CT',base:30,damage:5,qualities:[{id:'equipage',parameter:'2'}]},roll:90,v5:{kind:'ranged'}};const p=reload.previewResolution(shot);assert.equal(p.test.score,80);assert.equal(p.success,false);assert.equal((await reload.applyResolution(p)).status,'applied');assert.ok(!reload.listParticipants().find(p=>p.id==='b').states.some(s=>s.key==='crew-next-shot'));await reload.undo();assert.equal(reload.previewResolution({...shot,resolutionId:'restored'}).test.score,80);const ordinary=reload.previewResolution({...shot,resolutionId:'ordinary',action:{...shot.action,qualities:[]}});assert.equal(ordinary.test.score,30);});
test('Commandant : mauvais Test ou échec ne crée aucun remplacement',async()=>{const{store}=await setup([owned('crew-commander')]);const failed=generic('Commandement',{talentAction:'crew-commander',crewWithinVoice:true,crewRangedBase:80},{targetId:'b',roll:92});assert.equal(store.previewResolution(failed).talentActionChanges.length,0);const wrong=store.previewResolution({...failed,action:{...failed.action,extensions:{fiche:{skillId:skill('Charme')}}},roll:25});assert.ok(wrong.unresolved.some(s=>s.includes('Commandement')));});
test('Distraire : victoire seulement, Élan et Avantage bloqués, échéance de l’auteur',async()=>{const{store}=await setup([owned('distract')],[],{target:{extensions:{v5:{hasMomentum:true}}}});const raw=generic('Athlétisme',{talentAction:'distract',withinTwoYards:true},{targetId:'b',action:{type:'opposition',base:60,attr:'Ag',extensions:{fiche:{skillId:skill('Athlétisme')}}},roll:24,defense:{base:30,roll:82,extensions:{fiche:{skillId:skill('Perception')}},v5:{kind:'test'}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal((await store.applyResolution(p)).status,'applied');const target=store.listParticipants().find(p=>p.id==='b');assert.equal(target.extensions.v5.hasMomentum,false);assert.equal(target.states.find(s=>s.key==='distracted').v5Timing.expiry.actorId,'a');const next=store.previewResolution(melee('distracted',{actorId:'b',targetId:'a',v5:{kind:'melee',advantageSources:[{id:'declared',label:'Avantage'}]}}));assert.equal(next.test.advantage.net,0);});
test('Frénésie : test de FM, bonus +1, attaque gratuite une par Round, sans Élan ; sortie Sonné donne Exténué',async()=>{const{store}=await setup([owned('frenzy')]);const raw={resolutionId:'frenzy',actorId:'a',action:{type:'skill',attr:'FM',base:40},roll:20,v5:{kind:'test',context:{talentAction:'frenzy'}}};const start=store.previewResolution(raw);assert.deepEqual(start.unresolved,[]);assert.equal((await store.applyResolution(start)).status,'applied');assert.equal(store.previewResolution(melee('normal')).damage.talentDamage,1);const free=melee('free',{v5:{kind:'melee',extraAttack:true,context:{freeAttackTalent:'frenzy'}}});const p=store.previewResolution(free);assert.equal(p.actionCosts.ready,true);assert.equal(p.actionCosts.paid.length,0);assert.equal((await store.applyResolution(p)).status,'applied');const repeated=store.previewResolution({...free,resolutionId:'second-free'});assert.equal(repeated.actionCosts.ready,false);assert.equal((await store.applyResolution(repeated)).status,'manual');await store.acquireConditions('a',[{name:'Sonné',level:1}],{resolutionId:'end-frenzy'});const actor=store.listParticipants().find(p=>p.id==='a');assert.ok(!actor.states.some(s=>s.key==='frenzy'));assert.ok(actor.states.some(s=>s.key==='extenue'));});
test('Contrôle de Frénésie : entrée automatique et sortie sans Exténué',async()=>{const{store}=await setup([owned('frenzy'),owned('battle-rage')]);const raw={resolutionId:'controlled-frenzy',actorId:'a',action:{type:'skill',attr:'FM',base:40},roll:92,v5:{kind:'test',context:{talentAction:'frenzy'}}};const p=store.previewResolution(raw);assert.equal(p.success,true);assert.equal(p.test.automatic,true);assert.equal((await store.applyResolution(p)).status,'applied');await store.acquireConditions('a',[{name:'Sonné',level:1}],{resolutionId:'controlled-end'});assert.ok(!store.listParticipants()[0].states.some(s=>s.key==='extenue'));});
test('Obstiné : choix avant jet, séance explicite, négatifs retirés mais positifs conservés, quota et undo',async()=>{const{store,persistence}=await setup([owned('strong-minded')]);const raw=generic('Perception',{preRollTalent:'strong-minded',penalties:{offHand:-2}},{v5:{kind:'test',slModifier:-3,slModifiers:[{id:'positive',label:'Bonus',amount:1}],disadvantageSources:[{id:'bad',label:'Désavantage'}],context:{preRollTalent:'strong-minded',penalties:{offHand:-2}}}});assert.equal(store.previewResolution(raw).actionCosts.ready,false);await store.startTalentSession();const p=store.previewResolution(raw);assert.equal(p.test.advantage.net,0);assert.equal(p.sl,5);assert.equal(p.actionCosts.ready,true);assert.equal((await store.applyResolution(p)).status,'applied');const reload=createStore({persistence});await reload.ready;assert.equal(reload.previewResolution({...raw,resolutionId:'second'}).actionCosts.ready,false);await reload.undo();assert.equal(reload.previewResolution({...raw,resolutionId:'undo'}).actionCosts.ready,true);});
test('Résistance : une réussite par menace et séance, avant jet, 0 DR sans critique ni relance',async()=>{const{store}=await setup([owned('resistant',1,'Poison'),owned('resistant',1,'Maladie')]);await store.startTalentSession();const raw=generic('Résistance',{preRollTalent:'resistant',resistingThreat:true,threatId:'Poison'},{roll:99});const p=store.previewResolution(raw);assert.equal(p.success,true);assert.equal(p.sl,0);assert.equal(p.critical,null);assert.equal(p.fumble,null);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.previewResolution({...raw,resolutionId:'poison-again'}).actionCosts.ready,false);const other={...raw,resolutionId:'disease',v5:{...raw.v5,context:{...raw.v5.context,threatId:'Maladie'}}};assert.equal(store.previewResolution(other).actionCosts.ready,true);await store.startTalentSession();assert.equal(store.previewResolution({...raw,resolutionId:'new-session'}).actionCosts.ready,true);});

test('Retranchement renforce les seuls couverts léger et moyen même sans défense de tir',async()=>{const{store}=await setup([], [owned('entrenchment')]);for(const cover of[-1,-2,-3,0]){const p=store.previewResolution(melee('cover'+cover,{defense:undefined,v5:{kind:'ranged',context:{penalties:{cover}}}}));assert.equal(p.test.details.modifiers.filter(m=>m.id==='talent:entrenchment').reduce((s,m)=>s+m.amount,0),[-1,-2].includes(cover)?-1:0);}});
test('Démolisseur abaisse le couvert avant de déterminer le bénéfice de Retranchement',async()=>{const{store}=await setup([owned('demolisher')],[owned('entrenchment')]);const raw=melee('hackcover',{action:{type:'attack',base:60,damage:5,qualities:['taille']},v5:{kind:'melee',context:{penalties:{cover:-3}}}});const p=store.previewResolution(raw);assert.equal(p.input.v5.context.penalties.cover,-2);assert.equal(p.test.details.modifiers.find(m=>m.id==='talent:entrenchment').amount,-1);assert.equal(raw.v5.context.penalties.cover,-3);});
test('Obstiné peut être employé en défense : quota propre à la cible, reload et undo',async()=>{const{store,persistence}=await setup([], [owned('strong-minded')]);await store.startTalentSession();const raw=melee('defense-session',{defense:{base:60,roll:25,v5:{kind:'melee',slModifier:-3,context:{preRollTalent:'strong-minded'}}}});const p=store.previewResolution(raw);assert.equal(p.defenderTest.details.totalModifier,0);assert.equal((await store.applyResolution(p)).status,'applied');const reload=createStore({persistence});await reload.ready;assert.ok(reload.previewResolution({...raw,resolutionId:'again'}).unresolved.some(x=>x.includes('Défense')));await reload.undo();assert.ok(!reload.previewResolution({...raw,resolutionId:'restored'}).unresolved.some(x=>x.includes('Défense')));});
test('Obstiné ne demande pas de choisir une pénalité d’États qu’il ignore',async()=>{const{store}=await setup([owned('strong-minded')],[],{actor:{states:[{name:'Sonné',level:1},{name:'À terre',level:1}]}});await store.startTalentSession();const p=store.previewResolution(generic('Perception',{preRollTalent:'strong-minded',involvesMovement:true}));assert.equal(p.score.statePenalty,0);assert.ok(!p.unresolved.some(x=>x.includes('pénalités différentes')));});
test('Résistance automatique sans aucun jet saisi ; un Test ordinaire exige encore un d100',async()=>{const{store}=await setup([owned('resistant',1,'Poison')]);await store.startTalentSession();const raw=generic('Résistance',{preRollTalent:'resistant',resistingThreat:true,threatId:'Poison'},{roll:''});const p=store.previewResolution(raw);assert.equal(p.test.automatic,true);assert.equal(p.input.automaticNoRoll,true);assert.equal((await store.applyResolution(p)).status,'applied');assert.throws(()=>store.previewResolution(generic('Perception',{}, {roll:''})),/d100/);});
test('Sans peur immunise le groupe acquis à la Peur, sans immunité à Terreur et sans autre compétence',async()=>{const{store}=await setup([owned('fearless',1,'Orques')]);const good=generic('Calme',{psychologyKind:'fear',enemyGroup:'Orques'},{roll:''});assert.equal(store.previewResolution(good).test.automatic,true);assert.equal(store.previewResolution({...good,roll:91,v5:{kind:'test',context:{psychologyKind:'terror',enemyGroup:'Orques'}}}).success,false);assert.equal(store.previewResolution({...good,roll:91,action:generic('Perception').action}).success,false);});
test('Inébranlable évite automatiquement le Test de Calme de poudre noire, sans ignorer les autres Calme',async()=>{const{store}=await setup([owned('unshakeable')]);assert.equal(store.previewResolution(generic('Calme',{blackpowderBrokenTest:true},{roll:''})).test.automatic,true);assert.equal(store.previewResolution(generic('Calme',{blackpowderBrokenTest:false},{roll:91})).success,false);});
test('Flagellant ignore une pénalité critique mais conserve celle d’une amputation',async()=>{const{store}=await setup([owned('flagellant')]);const p=store.previewResolution(generic('Perception',{penalties:{critical:-3,amputation:-2}}));assert.equal(p.test.details.modifiers.find(m=>m.id==='penalty:critical').amount,0);assert.equal(p.test.details.modifiers.find(m=>m.id==='penalty:amputation').amount,-2);});
test('Sapeur supprime l’Avantage de l’adversaire lié à sa position À terre',async()=>{const{store}=await setup([], [owned('underminer')],{target:{states:[{name:'À terre',level:1}]}});const p=store.previewResolution(melee('prone-sapper'));assert.equal(p.test.advantage.advantage.some(x=>x.id==='target-prone'),false);});
test('Calculs de situation : équipage, monture, véhicule, réparation et terrain exact',async()=>{const{previewV5TalentMeasure}=await import('../../../js/core/v5-talent-measures.js');const p=subject('a',[owned('waterman'),owned('old-salt'),owned('roughrider'),owned('crack-the-whip'),owned('tinker'),owned('striding-gait',1,'Forêt')]);for(const situation of['crewRiver','crewOcean'])assert.equal(previewV5TalentMeasure(p,{situation}).value,2);for(const situation of['pursuitMounted','pursuitVehicle'])assert.equal(previewV5TalentMeasure(p,{situation,base:7}).value,8);assert.equal(previewV5TalentMeasure(p,{situation:'repair',base:5,hasSkillAdvance:true}).value,2.5);assert.equal(previewV5TalentMeasure(p,{situation:'repair',base:5,hasSkillAdvance:false}).value,5);assert.equal(previewV5TalentMeasure(p,{situation:'movement',base:4,terrainPenalty:2,terrain:'Forêt'}).value,4);assert.equal(previewV5TalentMeasure(p,{situation:'movement',base:4,terrainPenalty:2,terrain:'Désert'}).value,2);});
test('Riposte : excédent à 0 nécessite sa gravité et utilise sa localisation normale',async()=>{const{store}=await setup([], [owned('riposte')],{actor:{hp:2}});const raw=melee('riposte-excess',{roll:41,defense:{base:60,roll:24,damage:5,v5:{kind:'melee'}}});const p=store.previewResolution(raw);assert.equal(p.defenderDamage.finalDamage,4);assert.equal(p.defenderCritical.excessWounds,2);assert.equal(p.defenderCritical.second.location.id,p.defenderDamage.location.id);assert.equal((await store.applyResolution(p)).status,'manual');const ready=store.previewResolution({...raw,defenderCriticalRolls:{secondEffect:1}});assert.equal(ready.defenderCritical.second.bonus,20);assert.equal((await store.applyResolution(ready)).status,'applied');assert.equal(store.listParticipants()[0].hp,0);});

test('Arts martiaux : Atout importé choisi une fois par Tour, temporaire et sans muter l’arme',async()=>{const art={...owned('martial-arts',2),acquisitions:[{}, {qualityId:'assommante'}]};const{store,persistence}=await setup([art]);const choose={resolutionId:'martial-choice',actorId:'a',action:{type:'skill',base:0},roll:'',v5:{kind:'test',context:{talentAction:'martial-arts',beginningOfTurn:true,martialQuality:'assommante'}}};const p=store.previewResolution(choose);assert.deepEqual(p.unresolved,[]);assert.equal(p.test.noTest,true);assert.equal((await store.applyResolution(p)).status,'applied');const raw=melee('bare-hands',{action:{type:'attack',base:60,attr:'CC',damage:5,qualities:['inoffensive']},v5:{kind:'melee',context:{weaponUnarmed:true}}});const hit=store.previewResolution(raw);assert.ok(hit.input.action.qualities.some(q=>q.id==='assommante'));assert.ok(!hit.input.action.qualities.some(q=>q.id==='inoffensive'));assert.deepEqual(raw.action.qualities,['inoffensive']);const reload=createStore({persistence});await reload.ready;assert.equal(reload.previewResolution({...choose,resolutionId:'second-choice'}).actionCosts.ready,false);await reload.undo();assert.ok(!reload.listParticipants()[0].states.some(s=>s.key==='martial-arts-quality'));const unknown=store.previewResolution({...choose,v5:{...choose.v5,context:{...choose.v5.context,martialQuality:'rapide'}}});assert.ok(unknown.unresolved.some(x=>x.includes('Atout connu')));});
test('Arts martiaux : une attaque ne peut pas servir de choix gratuit sans jet',async()=>{const{store}=await setup([{...owned('martial-arts',2),knownQualityIds:['rapide']}]);const p=store.previewResolution(melee('wrong-martial',{v5:{kind:'melee',context:{talentAction:'martial-arts',beginningOfTurn:true,martialQuality:'rapide'}}}));assert.ok(p.unresolved.some(x=>x.includes('action propre')));assert.equal((await store.applyResolution(p)).status,'manual');});
test('Combat instinctif laisse choisir le moins bon des deux d10, sans inventer une Initiative absente',async()=>{const{store}=await setup([owned('combat-reflexes')],[],{actor:{caracs:{I:43}}});const raw={resolutionId:'initiative',actorId:'a',action:{type:'skill',base:0},roll:'',v5:{kind:'test',context:{talentAction:'combat-reflexes',beginningOfCombat:true,initiativeFirst:9,initiativeSecond:2,initiativeChoice:'second'}}};const p=store.previewResolution(raw);assert.equal(p.talentActionChanges[0].patch.initiative,6);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[0].initiative,6);await store.undo();assert.equal(store.listParticipants()[0].initiative,0);});
test('Coude-à-coude paie l’Élan avant le don, seulement aux alliés acquis déclarés',async()=>{const{store}=await setup([owned('drilled')],[owned('drilled')],{actor:{extensions:{v5:{hasMomentum:true}}},target:{camp:'pj'}});const raw={resolutionId:'drilled',actorId:'a',action:{type:'skill',base:0},roll:'',v5:{kind:'test',context:{talentAction:'drilled',shoulderAllyIds:['b']}}};const p=store.previewResolution(raw);assert.equal(p.actionCosts.paid[0].resource,'momentum');assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[0].extensions.v5.hasMomentum,false);assert.equal(store.listParticipants()[1].extensions.v5.hasMomentum,true);await store.undo();assert.equal(store.listParticipants()[0].extensions.v5.hasMomentum,true);const wrong=store.previewResolution({...raw,v5:{...raw.v5,context:{...raw.v5.context,shoulderAllyIds:['a']}}});assert.ok(wrong.unresolved.some(x=>x.includes('allié')));});
test('Sortie de Frénésie : Persévérant réduit Exténué et consomme son quota, quelle que soit la sortie',async()=>{const{store}=await setup([owned('frenzy'),owned('tenacious')]);const raw={resolutionId:'start-fr',actorId:'a',action:{type:'skill',base:40,attr:'FM'},roll:20,v5:{kind:'test',context:{talentAction:'frenzy'}}};assert.equal((await store.applyResolution(store.previewResolution(raw))).status,'applied');const end={resolutionId:'end-fr',actorId:'a',action:{type:'skill',base:0},roll:'',v5:{kind:'test',context:{talentAction:'end-frenzy',nearbyEnemiesDefeated:true}}};const p=store.previewResolution(end);assert.deepEqual(p.unresolved,[]);assert.equal((await store.applyResolution(p)).status,'applied');assert.ok(!store.listParticipants()[0].states.some(s=>s.key==='extenue'));await store.applyResolution(store.previewResolution({...raw,resolutionId:'start-again'}));await store.acquireConditions('a',[{name:'Sonné',level:1}],{resolutionId:'stun-again'});assert.ok(store.listParticipants()[0].states.some(s=>s.key==='extenue'));});
test('Maniement de deux armes : seconde attaque exonérée une fois par Tour, Parade temporaire',async()=>{
 const weapon=(id,name)=>({id,kind:'weapon',name,category:'Base',grip:'one-hand',damage:'BF+4'});
 const {store}=await setup([owned('dual-wielder')],[],{actor:{equipment:[weapon('main','Épée'),weapon('dagger','Dague')]}});
 const primary=store.previewResolution(melee('dual-primary',{action:{type:'attack',base:60,attr:'CC',damage:5,extensions:{fiche:{equipmentId:'main'}}}}));assert.equal((await store.applyResolution(primary)).status,'applied');
 await store.updateParticipant('a',{extensions:{v5:{hasMomentum:false}}});
 const raw=melee('dual',{action:{type:'attack',base:60,attr:'CC',damage:5,extensions:{fiche:{equipmentId:'dagger'}}},v5:{kind:'melee',extraAttack:true,context:{freeAttackTalent:'dual-wielder',dualWielding:true,secondWeaponAttack:true,weaponDagger:true,primaryResolutionId:'dual-primary'}}});
 assert.equal(store.previewResolution(raw).actionCosts.ready,false,'V5 v3 p.119 : sans Élan, pas d’attaque de seconde arme');
 await store.updateParticipant('a',{extensions:{v5:{hasMomentum:true}}});
 const p=store.previewResolution(raw);assert.equal(p.actionCosts.ready,true);assert.equal(p.actionCosts.paid.length,0);assert.ok(p.input.action.qualities.some(q=>q.id==='parade'));assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.previewResolution({...raw,resolutionId:'another'}).actionCosts.ready,false);
});

test('Robuste ajoute deux soins après un Test, avec plafond, retrait d’Hémorragique et undo',async()=>{const{store}=await setup([owned('robust')],[],{actor:{hp:39,maxHp:40,states:[{name:'Hémorragique',level:2}]}});const raw=generic('Résistance',{recoveryTest:true,recoveredWounds:0},{v5:{kind:'test',context:{recoveryTest:true,recoveredWounds:0},talentChoices:{'talent-robust:extra-healing':true}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[0].hp,40);assert.equal(store.listParticipants()[0].states.find(s=>s.key==='hemorragique').level,1);await store.undo();assert.equal(store.listParticipants()[0].hp,39);assert.equal(store.listParticipants()[0].states.find(s=>s.key==='hemorragique').level,2);});
test('Robuste respecte l’interdiction des soins sous Empoisonné à zéro Blessure',async()=>{const{store}=await setup([owned('robust')],[],{actor:{hp:0,states:[{name:'Empoisonné',level:1}]}});const raw=generic('Résistance',{recoveryTest:true,recoveredWounds:3},{v5:{kind:'test',context:{recoveryTest:true,recoveredWounds:3},talentChoices:{'talent-robust:extra-healing':true}}});const p=store.previewResolution(raw);assert.ok(p.reminders.some(x=>x.includes('impossible')));assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[0].hp,0);});
test('Cracheur de dragon augmente Brisé après Calme Accessible échoué, puis Cœur vaillant réduit ; undo',async()=>{const{store}=await setup([owned('stout-hearted')],[owned('dragon-belcher',2)]);const raw=generic('Calme',{blackpowderBrokenTest:true,blackpowderShooterId:'b'},{roll:92});const p=store.previewResolution(raw);assert.equal(p.test.details.modifiers.find(m=>m.id==='quality:blackpowder-calm').amount,2);assert.equal(p.success,false);assert.equal(p.actorConditionApplication[0].level,2);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[0].states.find(s=>s.key==='brise').level,2);assert.equal(store.listParticipants()[1].states.length,0);await store.undo();assert.equal(store.listParticipants()[0].states.length,0);const good=store.previewResolution({...raw,resolutionId:'calm',roll:25});assert.equal(good.actorConditionApplication.length,0);});
test('Inébranlable empêche Brisé et les suppléments de Cracheur de dragon sans jet',async()=>{const{store}=await setup([owned('unshakeable')],[owned('dragon-belcher',3)]);const p=store.previewResolution(generic('Calme',{blackpowderBrokenTest:true,blackpowderShooterId:'b'},{roll:''}));assert.deepEqual(p.unresolved,[]);assert.equal(p.actorConditionApplication.length,0);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[0].states.length,0);});
test('Riposte applique les propres dégâts de Frappe puissante et Sonné de Matraqueur, puis Mâchoires',async()=>{const{store}=await setup([owned('iron-jaw')],[owned('riposte'),owned('bludgeoner',2),owned('strike-mighty-blow',2)],{target:{extensions:{v5:{hasMomentum:true}}}});const raw=melee('riposte-pummel',{roll:41,defense:{base:60,roll:10,damage:5,qualities:['assommante'],v5:{kind:'melee',choice:'keep'}}});const p=store.previewResolution(raw);assert.equal(p.defenderDamage.talentDamage,2);assert.equal(p.defenderWeaponConditions.proposed[0].level,3);assert.equal(p.defenderWeaponConditions.applied[0].level,2);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[0].states.find(s=>s.key==='sonne').level,2);});

test('Baratiner : opposition canonique, minutes selon DR, temps explicite, reload et undo',async()=>{const{store,persistence}=await setup([owned('blather')],[],{target:{caracs:{FM:100}}});const raw=generic('Charme',{talentAction:'blather',caughtInAct:true,convictionUnit:'minute'},{targetId:'b',action:{type:'opposition',attr:'Soc',base:60,extensions:{fiche:{skillId:skill('Charme')}}},roll:25,defense:{base:30,roll:82,extensions:{fiche:{skillId:skill('Calme')}},v5:{kind:'test'}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal(p.talentActionChanges[0].add[0].remainingMinutes,4);assert.equal((await store.applyResolution(p)).status,'applied');const reload=createStore({persistence});await reload.ready;assert.equal(reload.listParticipants()[1].states.find(s=>s.key==='conviction').remainingMinutes,4);await reload.advanceTalentMinutes(2.5);assert.equal(reload.listParticipants()[1].states.find(s=>s.key==='conviction').remainingMinutes,1.5);await reload.advanceTalentMinutes(2);assert.ok(!reload.listParticipants()[1].states.some(s=>s.key==='conviction'));await reload.undo();assert.equal(reload.listParticipants()[1].states.find(s=>s.key==='conviction').remainingMinutes,1.5);});
test('Baratiner : DR au-dessus du BFM donne conviction sans échéance ; échec ne crée aucun effet',async()=>{const{store}=await setup([owned('blather')],[],{target:{caracs:{FM:30}}});const raw=generic('Charme',{talentAction:'blather',caughtInAct:true,convictionUnit:'turn'},{targetId:'b',action:{type:'opposition',attr:'Soc',base:60,extensions:{fiche:{skillId:skill('Charme')}}},roll:25,defense:{base:30,roll:82,extensions:{fiche:{skillId:skill('Calme')}},v5:{kind:'test'}}});const p=store.previewResolution(raw);assert.equal(p.talentActionChanges[0].add[0].v5Timing,undefined);assert.equal(p.talentActionChanges[0].add[0].remainingMinutes,undefined);assert.equal(store.previewResolution({...raw,roll:95,defense:{...raw.defense,roll:10}}).talentActionChanges.length,0);});
test('Ergoteur : pénalité contextuelle, sortie par Calme/Charme, attaque met fin au débat',async()=>{const{store}=await setup([owned('argumentative')]);const start={resolutionId:'debate',actorId:'a',targetId:'b',action:{type:'skill',base:0},roll:'',v5:{kind:'test',context:{talentAction:'argumentative',debateBegun:true}}};assert.equal((await store.applyResolution(store.previewResolution(start))).status,'applied');const unrelated=store.previewResolution(generic('Perception',{relatedToDebate:false},{actorId:'b'}));assert.equal(unrelated.test.details.modifiers.find(m=>m.id==='talent:argumentative').amount,-3);const related=store.previewResolution(generic('Perception',{relatedToDebate:true},{actorId:'b'}));assert.ok(!related.test.details.modifiers.some(m=>m.id==='talent:argumentative'));const leave=generic('Calme',{talentAction:'leave-debate'},{resolutionId:'leave-debate',actorId:'b',targetId:'a',action:{type:'opposition',attr:'FM',base:60,extensions:{fiche:{skillId:skill('Calme')}}},roll:25,defense:{base:30,roll:82,extensions:{fiche:{skillId:skill('Charme')}},v5:{kind:'test'}}});const p=store.previewResolution(leave);assert.deepEqual(p.unresolved,[]);assert.equal((await store.applyResolution(p)).status,'applied');assert.ok(!store.listParticipants()[1].states.some(s=>s.key==='debate'));await store.undo();const attack=store.previewResolution(melee('interrupt-debate'));assert.equal((await store.applyResolution(attack)).status,'applied');assert.ok(!store.listParticipants()[1].states.some(s=>s.key==='debate'));});

test('Vigilance lie la réussite à une Surprise unique, puis consomme le garde une seule fois',async()=>{const{store,persistence}=await setup([owned('combat-aware')],[],{actor:{caracs:{I:50}}});const raw=generic('Perception',{talentAction:'combat-aware',surpriseEventId:'ambush-1',avoidingSurprise:true,normallyAllowedSurpriseTest:true},{roll:''});const p=store.previewResolution(raw);assert.equal(p.test.automatic,true);assert.equal((await store.applyResolution(p)).status,'applied');const reload=createStore({persistence});await reload.ready;await reload.acquireConditions('a',[{name:'Surpris'}],{resolutionId:'surprise-1',surpriseEventId:'ambush-1'});assert.ok(!reload.listParticipants()[0].states.some(s=>s.key==='surpris'));await reload.acquireConditions('a',[{name:'Surpris'}],{resolutionId:'surprise-2',surpriseEventId:'ambush-2'});assert.ok(reload.listParticipants()[0].states.some(s=>s.key==='surpris'));});
test('Impitoyable exige la fin du Tour adverse et crée seulement le Mouvement de poursuite',async()=>{const{store}=await setup([owned('relentless')]);const raw=generic('Athlétisme',{talentAction:'relentless',enemyDisengaged:true,afterEnemyTurn:true},{targetId:'b',action:{type:'skill',attr:'Ag',base:60,extensions:{fiche:{skillId:skill('Athlétisme')}}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[0].states.find(s=>s.key==='pursuit-move').pursuedId,'b');const wrong=store.previewResolution({...raw,v5:{kind:'test',context:{...raw.v5.context,afterEnemyTurn:false}}});assert.ok(wrong.unresolved.some(s=>s.includes('fin du Tour')));});
test('Orateur doit réellement charmer le groupe avant Commandement et retire ses Brisé',async()=>{const{store}=await setup([owned('public-speaker')],[],{target:{states:[{name:'Brisé',level:2}]}});const command=generic('Commandement',{talentAction:'public-speaker'},{resolutionId:'command'});assert.ok(store.previewResolution(command).unresolved.some(s=>s.includes('préalablement')));const charm=generic('Charme',{influencingGroup:true,influencedIds:['b']},{resolutionId:'charm',roll:25,v5:{kind:'test',choice:'keep',context:{influencingGroup:true,influencedIds:['b']}}});assert.equal((await store.applyResolution(store.previewResolution(charm))).status,'applied');assert.equal((await store.applyResolution(store.previewResolution(command))).status,'applied');assert.ok(!store.listParticipants()[1].states.some(s=>s.key==='brise'));await store.undo();assert.ok(store.listParticipants()[1].states.some(s=>s.key==='brise'));});
test('Seigneur de guerre remplace Calme contre Peur seulement et cesse quand l’auteur est Brisé',async()=>{const{store}=await setup([owned('war-leader')],[],{target:{camp:'pj'}});const command=generic('Commandement',{talentAction:'war-leader',inBattle:true,influencedIds:['b']},{resolutionId:'war-command'});assert.equal((await store.applyResolution(store.previewResolution(command))).status,'applied');const fear=generic('Calme',{psychologyKind:'fear'},{actorId:'b',action:{type:'skill',attr:'FM',base:20,extensions:{fiche:{skillId:skill('Calme')}}},roll:42});assert.equal(store.previewResolution(fear).score.target,60);assert.equal(store.previewResolution({...fear,v5:{kind:'test',context:{psychologyKind:'terror'}}}).score.target,20);await store.acquireConditions('a',[{name:'Brisé'}]);assert.equal(store.previewResolution(fear).score.target,20);});
test('Flagellant n’invente pas l’accès à Frénésie et conserve son origine pour les dégâts',async()=>{const{store}=await setup([owned('flagellant'),owned('frenzy')]);const raw={resolutionId:'flag-fr',actorId:'a',action:{type:'skill',base:0},roll:'',v5:{kind:'test',context:{talentAction:'flagellant',woundSuffered:true}}};const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.previewResolution(melee('frenzied')).damage.talentDamage,1);const{store:without}=await setup([owned('flagellant')]);assert.ok(without.previewResolution(raw).unresolved.some(s=>s.includes('accès acquis')));});

test('Combat déloyal remplace réellement par une Blessure et Sonné, soumis aux réductions',async()=>{const{store}=await setup([owned('dirty-fighting')],[owned('iron-jaw')]);const raw=melee('low-blow',{v5:{kind:'melee',context:{specialAttack:'dirty-fighting',calledShot:true,calledShotLocation:'body',weaponUnarmed:true}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal(p.damage.finalDamage,1);assert.equal(p.critical,null);assert.equal(p.targetConditionApplication.length,0);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[1].hp,39);await store.undo();assert.equal(store.listParticipants()[1].hp,40);const wrong=store.previewResolution({...raw,v5:{...raw.v5,context:{...raw.v5.context,weaponUnarmed:false}}});assert.ok(wrong.unresolved.some(s=>s.includes('mains nues')));});
test('Désarmer garde le d10 et la direction explicites, bloque l’arme, coûte Élan si attrapée',async()=>{const{store}=await setup([owned('disarm')],[],{actor:{extensions:{v5:{hasMomentum:true}}}});const raw=melee('disarm',{roll:20,v5:{kind:'melee',choice:'keep',actorSize:3,targetSize:3,context:{specialAttack:'disarm',targetUnarmed:false,targetWeaponBound:false,disarmedWeaponId:'weapon-b',disarmDistance:7,disarmDirection:'nord',catchWeapon:true}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal(p.damage,null);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[1].hp,40);assert.equal(store.listParticipants()[1].states.find(s=>s.key==='disarmed').distanceFeet,7);assert.equal(store.listParticipants()[0].extensions.v5.hasMomentum,false);const blocked=store.previewResolution(melee('disarmed-action',{actorId:'b',targetId:'a',action:{type:'attack',base:60,damage:5,attr:'CC',extensions:{fiche:{equipmentId:'weapon-b'}}}}));assert.ok(blocked.unresolved.some(s=>s.includes('désarmée')));});
test('Harponneur : profil d’arbalète et projectile générique fonctionnent sans munition suivie',async()=>{const catalogue=getReferenceCatalogue(),crossbow=structuredClone(catalogue.items.find(item=>item.id==='weapon-armes-a-distance-arbalete-arbalete-2m'));assert.ok(crossbow,'le profil d’arbalète doit provenir du catalogue');const{store}=await setup([owned('harpooner')],[],{actor:{equipment:[crossbow]},target:{skills:[{id:skill('Guérison'),name:'Guérison',total:60}]}});const raw=melee('harpoon-no-ammo',{action:{type:'attack',base:60,attr:'CT',damage:5,qualities:['empaleuse'],extensions:{fiche:{equipmentId:crossbow.id}}},roll:20,defense:undefined,v5:{kind:'ranged',context:{weaponGroup:'Arbalète'}},criticalRolls:{location:25,effect:1}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal(p.projectileLodging.genericProjectile,true);assert.equal(p.projectileLodging.ammunitionType,'carreau');assert.equal((await store.applyResolution(p)).status,'applied');const bolt=store.listParticipants()[1].extensions.v5.lodgedProjectiles.find(row=>row.resolutionId==='harpoon-no-ammo');assert.equal(bolt.genericProjectile,true);assert.equal(bolt.ammunitionType,'carreau');});
test('Porte-bouclier repousse sans dégâts, quota de Round durable et undo',async()=>{const{store,persistence}=await setup([owned('shieldsman')],[],{actor:{extensions:{v5:{hasMomentum:true}}}});const raw=melee('shield-push',{v5:{kind:'melee',context:{specialAttack:'shieldsman',shieldAvailable:true,pushDistance:2}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[1].hp,40);assert.equal(store.listParticipants()[1].states.find(s=>s.key==='pushed').distanceYards,2);const reload=createStore({persistence});await reload.ready;assert.equal(reload.previewResolution({...raw,resolutionId:'second-push'}).postActionCosts[0].ready,false);await reload.undo();assert.ok(!reload.listParticipants()[1].states.some(s=>s.key==='pushed'));});
test('Déterminé préserve l’Élan contre l’État seul, sans protéger des Blessures ou opposition perdue',async()=>{const{store}=await setup([owned('resolute')],[],{actor:{extensions:{v5:{hasMomentum:true}}}});await store.acquireConditions('a',[{name:'Sonné'}],{resolutionId:'resolute-stun',tryResolute:true,resoluteRoll:20});assert.equal(store.listParticipants()[0].extensions.v5.hasMomentum,true);await store.undo();await store.acquireConditions('a',[{name:'Sonné'}],{resolutionId:'resolute-fail',tryResolute:true,resoluteRoll:90});assert.equal(store.listParticipants()[0].extensions.v5.hasMomentum,false);});
test('Feu de forge ne change pas la fiche et ignore un PA métallique supplémentaire si déjà Pénétrante',async()=>{const{store}=await setup([owned('forgefire')]);const raw=melee('forge',{action:{type:'attack',attr:'CC',base:60,damage:5,qualities:['perforante']},v5:{kind:'melee',context:{forgeAuthorIds:['a'],forgeEngagedIds:['a'],forgeDistances:{a:0},hitMetalAP:2}},protectionContext:{manualAp:3}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal(p.protection.ap,2);assert.equal(p.protection.forgeIgnoredAP,1);assert.equal(store.listParticipants()[0].states.length,0);const far=store.previewResolution({...raw,v5:{...raw.v5,context:{...raw.v5.context,forgeDistances:{a:5}}}});assert.equal(far.protection.ap,3);});
test('Harponneur suit chaque carreau critique, réduit Mouvement avec plancher et retrait undo',async()=>{const catalogue=getReferenceCatalogue();const crossbow=structuredClone(catalogue.items.find(item=>item.id==='weapon-armes-a-distance-arbalete-arbalete-2m'));const bolts=structuredClone(catalogue.items.find(item=>item.id==='ammunition-livre-de-base-arbalete-carreaux-12'));assert.ok(crossbow&&bolts,'le profil d’arbalète et les carreaux doivent provenir du catalogue');const{store,persistence}=await setup([owned('harpooner')],[],{actor:{equipment:[crossbow,bolts]},target:{skills:[{id:skill('Guérison'),name:'Guérison',total:60}]}});const raw=melee('harpoon',{action:{type:'attack',base:60,attr:'CT',damage:5,qualities:['empaleuse'],extensions:{fiche:{equipmentId:crossbow.id}}},ammunitionId:bolts.id,roll:20,defense:undefined,v5:{kind:'ranged',context:{weaponGroup:'Arbalète'}},criticalRolls:{location:25,effect:1}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal((await store.applyResolution(p)).status,'applied');const bolt=store.listParticipants()[1].extensions.v5.lodgedProjectiles.find(row=>row.resolutionId==='harpoon');assert.ok(bolt);assert.equal(bolt.ammunitionId,bolts.id);const{previewV5TalentMeasure}=await import('../../../js/core/v5-talent-measures.js');assert.equal(previewV5TalentMeasure(store.listParticipants()[1],{situation:'harpoonMovement',base:1}).value,1);assert.equal(previewV5TalentMeasure(store.listParticipants()[1],{situation:'harpoonMovement',base:4}).value,3);const extraction=store.previewV5ProjectileExtraction({participantId:'b',projectileId:bolt.id,method:'heal-test',skillId:skill('Guérison'),roll:25});assert.equal(extraction.ready,true,extraction.error);assert.equal((await store.applyV5ProjectileExtraction(extraction)).status,'applied');await store.undo();assert.ok(store.listParticipants()[1].extensions.v5.lodgedProjectiles.some(row=>row.id===bolt.id&&!row.removed));});

test('Effrayant Grande demande deux réussites par cible, une par Tour, sans ajouter un élan refusé',async()=>{const{store,persistence}=await setup([owned('frightening')]);const start={resolutionId:'fear-start',actorId:'a',action:{type:'skill',base:0},roll:'',v5:{kind:'test',actorSize:4,context:{talentAction:'frightening',frightenedIds:['b']}}};assert.equal((await store.applyResolution(store.previewResolution(start))).status,'applied');const fear=store.listParticipants()[1].states.find(s=>s.key==='fear-of-talent');const attack=store.previewResolution(melee('fear-attack',{v5:{kind:'melee',choice:'keep'}}));assert.equal(attack.test.advantage.net,1);await store.nextTurn();const overcome=generic('Calme',{talentAction:'overcome-fear',fearEffectId:fear.id},{resolutionId:'fear-test',actorId:'b'});assert.equal((await store.applyResolution(store.previewResolution(overcome))).status,'applied');assert.equal(store.listParticipants()[1].states.find(s=>s.key==='fear-of-talent').successes,1);const reload=createStore({persistence});await reload.ready;assert.equal(reload.previewResolution({...overcome,resolutionId:'again'}).actionCosts.ready,false);const{withMomentum}=await import('../../../js/core/v5-combat-rules.js');assert.equal(withMomentum(reload.listParticipants()[1],true).extensions.v5.hasMomentum,false);await reload.undo();assert.equal(reload.listParticipants()[1].states.find(s=>s.key==='fear-of-talent').successes,0);});
test('Haine contrôle par rencontre et fin de Round, sans supprimer son bonus de groupe',async()=>{const{store}=await setup([owned('hatred',1,'Orques')]);const raw=generic('Calme',{talentAction:'hatred',psychologySpecialty:'Orques',enemyGroup:'Orques'},{roll:90});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[0].states.find(s=>s.key==='hatred').controlled,false);assert.equal(store.previewResolution({...raw,resolutionId:'same-encounter'}).actionCosts.ready,false);const retry=store.previewResolution({...raw,resolutionId:'retry',v5:{kind:'test',context:{...raw.v5.context,hatredRetry:true,endOfRound:true}}});assert.ok(retry.unresolved.some(s=>s.includes('après le premier')));});
test('Vice : pénalité par jour, témoin, compulsion, Exténué réduit et annulable',async()=>{const{store}=await setup([owned('vice',1,'Alcool'),owned('tenacious')]);const raw=generic('Calme',{talentAction:'vice',psychologySpecialty:'Alcool',abstinentDays:2},{resolutionId:'vice',action:{type:'skill',base:60,attr:'FM',extensions:{fiche:{skillId:skill('Calme')}}},roll:90});const p=store.previewResolution(raw);assert.equal(p.test.details.modifiers.find(s=>s.id==='talent:vice-abstinence').amount,-4);assert.equal((await store.applyResolution(p)).status,'applied');assert.ok(store.previewResolution(melee('vice-attack')).unresolved.some(s=>s.includes('compulsion')));const exhausted={resolutionId:'vice-end',actorId:'a',action:{type:'skill',base:0},roll:'',v5:{kind:'test',context:{talentAction:'vice-exhausted',psychologySpecialty:'Alcool',insensible:true}}};assert.equal((await store.applyResolution(store.previewResolution(exhausted))).status,'applied');assert.ok(!store.listParticipants()[0].states.some(s=>s.key==='extenue'));await store.undo();assert.ok(store.listParticipants()[0].states.some(s=>s.key==='vice'));const social=store.previewResolution(generic('Charme',{viceWitness:true,mandatoryTest:true},{action:{type:'skill',base:60,attr:'Soc',extensions:{fiche:{skillId:skill('Charme')}}}}));assert.equal(social.test.details.modifiers.find(s=>s.id==='talent:vice-witness').amount,-2);});
test('Tricheur remplace le seul jet adverse et annule seulement les bénéfices typés Escamotage',async()=>{const{store}=await setup([owned('cardsharp')]);const raw=generic('Pari',{cardsharpUse:true,cardsharpOpponentRoll:90},{targetId:'b',roll:22,action:{type:'opposition',base:60,attr:'Int',extensions:{fiche:{skillId:skill('Pari')}}},defense:{base:60,roll:10,extensions:{fiche:{skillId:skill('Pari')}},v5:{kind:'test',slModifiers:[{id:'escamotage:bonus',label:'Escamotage',amount:2},{id:'mj',label:'Arbitrage',amount:1}]}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal(p.defenderTest.roll,90);assert.ok(!p.defenderTest.details.modifiers.some(s=>s.id.startsWith('escamotage')));assert.equal(p.defenderTest.details.modifiers.find(s=>s.id==='mj').amount,1);assert.equal(raw.defense.roll,10);assert.ok(store.previewResolution({...raw,roll:23}).unresolved.some(s=>s.includes('double')));});

test('Grande taille : BF aux attaques normales, défense −2, aucune double contribution en attaque gratuite',async()=>{const{store}=await setup([owned('large')],[],{actor:{caracs:{CC:60,F:40}}});const raw=melee('large',{v5:{kind:'melee',actorSize:4,targetSize:3}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal(p.damage.talentDamage,4);assert.equal(p.defenderTest.details.modifiers.find(s=>s.id==='talent:large-defense').amount,-2);const extra=store.previewResolution({...raw,resolutionId:'extra',v5:{...raw.v5,extraAttack:true}});assert.equal(extra.damage.talentDamage,undefined);const{previewV5TalentMeasure}=await import('../../../js/core/v5-talent-measures.js');assert.equal(previewV5TalentMeasure(store.listParticipants()[0],{situation:'defensiveSizeWeight'}).value,2);});
test('Grande taille : Force opposée automatique à deux catégories, Critique du plus petit à une catégorie',async()=>{const{store}=await setup([owned('large')]);const raw={resolutionId:'strength-size',actorId:'a',targetId:'b',action:{type:'opposition',attr:'F',base:30},roll:95,defense:{attr:'F',base:60,roll:22,v5:{kind:'test',context:{opposedTest:true}}},v5:{kind:'test',actorSize:4,targetSize:2,context:{opposedTest:true}}};assert.equal(store.previewResolution(raw).opposition.winner,'attacker');const one=store.previewResolution({...raw,v5:{...raw.v5,targetSize:3}});assert.equal(one.opposition.winner,'defender');assert.equal(store.previewResolution({...raw,defense:{...raw.defense,roll:23},v5:{...raw.v5,targetSize:3}}).opposition.winner,'attacker');});
test('Piétinement emploie réellement Bagarre et BF, paie Élan avant le jet et ignore le bonus de Grande taille',async()=>{const{store}=await setup([owned('large')],[],{actor:{extensions:{v5:{hasMomentum:true}}}});const raw=melee('stomp',{action:{type:'attack',base:90,damage:20,attr:'CC'},v5:{kind:'melee',actorSize:4,targetSize:3,context:{talentAction:'stomp'}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal(p.score.base,60);assert.equal(p.damage.weaponDamage,4);assert.equal(p.damage.talentDamage,undefined);assert.equal(p.actionCosts.paid[0].resource,'momentum');assert.equal((await store.applyResolution(p)).status,'applied');});
test('Combat au contact conserve le choix du vainqueur, transforme la vraie arme et se termine pour Élan',async()=>{const{store}=await setup([owned('in-fighter')],[],{actor:{extensions:{v5:{hasMomentum:true}}}});const raw=melee('contact-start',{action:{type:'opposition',base:60,attr:'CC',extensions:{fiche:{skillId:skill('Corps à corps (Base)')}}},v5:{kind:'melee',choice:'keep',context:{talentAction:'in-fighter',winnerChoosesContact:true}}});assert.equal((await store.applyResolution(store.previewResolution(raw))).status,'applied');const contact=store.previewResolution(melee('contact-hit',{v5:{kind:'melee',choice:'keep',context:{weaponReach:'Longue'}},defense:{base:30,roll:82,v5:{kind:'melee',context:{weaponReach:'Courte'}}}}));assert.equal(contact.input.action.damage,'BF +1');assert.ok(contact.input.action.qualities.some(s=>s.id==='inoffensive'));const end={resolutionId:'contact-end',actorId:'a',targetId:'b',action:{type:'skill',base:0},roll:'',v5:{kind:'test',context:{talentAction:'end-contact',beginningOfTurn:true}}};const p=store.previewResolution(end);assert.deepEqual(p.unresolved,[]);assert.equal((await store.applyResolution(p)).status,'applied');assert.ok(store.listParticipants().every(p=>!p.states.some(s=>s.key==='in-fighter-contact')));await store.undo();assert.ok(store.listParticipants()[1].states.some(s=>s.key==='in-fighter-contact'));});

test('Frappe réactive : Initiative puis arme de main directrice, même chargeur et un seul usage par Round',async()=>{const blade={id:'blade',type:'attack',attr:'CC',base:60,damage:5};const{store}=await setup([owned('reaction-strike')],[],{actor:{caracs:{I:55,CC:60,F:40,E:30},actions:[blade]}});const check={resolutionId:'reaction-init',actorId:'a',targetId:'b',action:{type:'skill',attr:'I',base:55},roll:20,v5:{kind:'test',context:{talentAction:'reaction-strike',receivedCharge:true,chargeEventId:'charge-1',mainHandActionId:'blade'}}};assert.equal((await store.applyResolution(store.previewResolution(check))).status,'applied');const ready=store.listParticipants()[0].states.find(s=>s.key==='reaction-strike-ready');const hit=melee('reaction-hit',{action:blade,v5:{kind:'melee',context:{freeAttackTalent:'reaction-strike',mainHand:true,attackOpportunityId:ready.id}}});const p=store.previewResolution(hit);assert.deepEqual(p.unresolved,[]);assert.equal(p.actionCosts.waived[0].waivedBy[0],'talent-reaction-strike');assert.equal((await store.applyResolution(p)).status,'applied');assert.ok(!store.listParticipants()[0].states.some(s=>s.key==='reaction-strike-ready'));assert.equal(store.previewResolution({...hit,resolutionId:'duplicate-round'}).actionCosts.ready,false);});
test('Fin glorieuse permet uniquement la réaction identifiée sous Inconscient et ne restaure aucune Action',async()=>{const{store}=await setup([owned('glorious-demise')]);await store.acquireConditions('a',[{name:'Inconscient'}],{resolutionId:'fall'});const condition=store.listParticipants()[0].states.find(s=>s.key==='inconscient'),raw=melee('last-hit',{v5:{kind:'melee',context:{freeAttackTalent:'glorious-demise',triggerConditionId:condition.id,immediateReaction:true}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal(p.actionCosts.ready,true);assert.equal((await store.applyResolution(p)).status,'applied');assert.ok(store.listParticipants()[0].states.some(s=>s.key==='inconscient'));assert.ok(store.previewResolution(melee('normal-next')).unresolved.some(s=>s.includes('Inconscient')));assert.equal(store.previewResolution({...raw,resolutionId:'twice'}).actionCosts.ready,false);await store.undo();assert.ok(!store.listParticipants()[0].states.some(s=>s.key==='glorious-spent'));});
test('Tir rapide suit l’Initiative de combat et consomme l’attaque du Round',async()=>{const{store}=await setup([owned('fast-shot')],[owned('fast-shot')],{actor:{initiative:3},target:{initiative:8}});const raw=melee('early-shot',{action:{type:'attack',attr:'CT',base:60,damage:5,qualities:['pistolet']},defense:undefined,v5:{kind:'ranged',context:{freeAttackTalent:'fast-shot',weaponLoaded:true,actorEngaged:false,beforeFirstTurn:true,fastShotActorIds:['a','b']}}});assert.ok(store.previewResolution(raw).unresolved.some(s=>s.includes('Initiative la plus élevée')));const first={...raw,resolutionId:'b-first',actorId:'b',targetId:'a'};assert.equal((await store.applyResolution(store.previewResolution(first))).status,'applied');assert.equal((await store.applyResolution(store.previewResolution(raw))).status,'applied');assert.ok(store.previewResolution(melee('normal-shot')).unresolved.some(s=>s.includes('Action du Round')));assert.equal(store.previewResolution({...raw,resolutionId:'twice-fast'}).actionCosts.ready,false);});
test('Coude-à-coude couvre un allié sans ce talent, avec source du protecteur et adversaire commun',async()=>{const{store}=await setup([owned('drilled')],[],{target:{camp:'pj'}});await store.addParticipant(subject('enemy',[],{camp:'ennemi'}));const grant={resolutionId:'drilled-cover',actorId:'a',targetId:'b',action:{type:'skill',base:0},roll:'',v5:{kind:'test',context:{talentAction:'drilled-help',commonEnemyId:'enemy',bothEngaged:true}}};assert.equal((await store.applyResolution(store.previewResolution(grant))).status,'applied');const leave={resolutionId:'free-disengage',actorId:'b',targetId:'enemy',action:{type:'skill',base:0},roll:'',v5:{kind:'test',context:{talentAction:'drilled-disengage',drilledAuthorId:'a',bothEngaged:true}}};const p=store.previewResolution(leave);assert.deepEqual(p.unresolved,[]);assert.equal((await store.applyResolution(p)).status,'applied');assert.ok(store.listParticipants()[1].states.some(s=>s.key==='disengaged'));});
test('Porte-bouclier protège l’allié adjacent sans modifier son armure et demande disponibilité à chaque attaque',async()=>{const{store}=await setup([owned('shieldsman')],[],{actor:{extensions:{v5:{hasMomentum:true}}},target:{camp:'pj'}});const grant={resolutionId:'shield-cover',actorId:'a',targetId:'b',action:{type:'skill',base:0},roll:'',v5:{kind:'test',context:{talentAction:'shield-ally',adjacent:true,allyHasShield:false,shieldAvailable:true,shieldRating:2}}};assert.equal((await store.applyResolution(store.previewResolution(grant))).status,'applied');const effect=store.listParticipants()[1].states.find(s=>s.key==='shield-ally');const raw=melee('against-shielded',{v5:{kind:'melee',context:{alliedShieldEffectIds:[effect.id],guardStillAdjacent:true,guardShieldAvailable:true}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal(p.protection.alliedShieldAP,2);assert.equal(p.protection.ap,2);assert.equal(store.listParticipants()[1].armor.body,0);assert.ok(store.previewResolution({...raw,v5:{kind:'melee',context:{...raw.v5.context,guardStillAdjacent:false}}}).unresolved.some(s=>s.includes('adjacence')));});

test('Tourbillon de mort applique le même jet à tous les engagés, alliés compris, et Fortune une seule fois',async()=>{const{store,persistence}=await setup([owned('whirlwind-of-death')],[],{actor:{extensions:{v5:{resourceCharacterId:'test-a'}}}});await store.setFortune('a',2);await store.addParticipant(subject('friend',[],{camp:'pj',hp:40}));await store.addParticipant(subject('enemy',[],{camp:'ennemi',hp:40,caracs:{E:50},armor:{head:0,body:2,arms:0,legs:0}}));const raw=melee('whirlwind',{roll:24,v5:{kind:'melee',context:{specialAttack:'whirlwind-of-death',engagedIds:['b','friend','enemy'],allEngagedIncluded:true}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal(p.secondaryTargets.length,2);assert.equal(p.secondaryTargets[0].damage.weaponDamage,p.damage.weaponDamage);assert.equal(p.secondaryTargets[0].location.name,p.location.name);assert.equal(p.critical,null);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.getFortune('a').balance,1);assert.ok(store.listParticipants().find(p=>p.id==='friend').hp<40);const reload=createStore({persistence});await reload.ready;await reload.undo();assert.equal(reload.getFortune('a').balance,2);assert.equal(reload.listParticipants().find(p=>p.id==='friend').hp,40);});
test('Tourbillon : aucun critique du jet ; critiques distincts à zéro pour ennemis, aucun pour alliés',async()=>{const{store}=await setup([owned('whirlwind-of-death')],[],{actor:{extensions:{v5:{resourceCharacterId:'test-a'}}}});await store.setFortune('a',1);await store.addParticipant(subject('friend',[],{camp:'pj',hp:1}));await store.addParticipant(subject('enemy',[],{camp:'ennemi',hp:1}));const raw=melee('whirlwind-critical',{roll:22,v5:{kind:'melee',context:{specialAttack:'whirlwind-of-death',engagedIds:['b','friend','enemy'],allEngagedIncluded:true}}});const p=store.previewResolution(raw);assert.equal(p.critical,null);assert.equal(p.secondaryTargets.find(s=>s.participantId==='friend').critical,null);assert.equal(p.secondaryTargets.find(s=>s.participantId==='enemy').critical.second.pending,true);assert.equal((await store.applyResolution(p)).status,'manual');const ready=store.previewResolution({...raw,v5:{...raw.v5,context:{...raw.v5.context,whirlwindRolls:{enemy:{secondEffect:1}}}}});assert.deepEqual(ready.unresolved,[]);assert.equal((await store.applyResolution(ready)).status,'applied');assert.equal(store.listParticipants().find(s=>s.id==='enemy').hp,0);});
test('Tourbillon avec deux armes permet d’inverser sans ajouter un DR d’Avantage supplémentaire',async()=>{const{store}=await setup([owned('whirlwind-of-death'),owned('dual-wielder')],[],{actor:{extensions:{v5:{resourceCharacterId:'test-a',hasMomentum:true}}}});await store.setFortune('a',1);const raw=melee('whirlwind-dual',{roll:24,v5:{kind:'melee',choice:'reverse',context:{specialAttack:'whirlwind-of-death',engagedIds:['b'],allEngagedIncluded:true,dualWielding:true,weaponDagger:false}}});const p=store.previewResolution(raw);assert.equal(p.roll,42);assert.equal(p.sl,2);assert.equal(p.test.advantage.slModifier,0);assert.deepEqual(p.unresolved,[]);});

test('Désarmer : attraper emploie l’Élan gagné après opposition, sans modifier le jet',async()=>{const{store}=await setup([owned('disarm')]);const context={specialAttack:'disarm',targetUnarmed:false,targetWeaponBound:false,disarmedWeaponId:'enemy-blade',disarmDistance:3,disarmDirection:'nord',catchWeapon:true};const raw=melee('catch-after-result',{roll:20,v5:{kind:'melee',actorSize:3,targetSize:3,context}});const caught=store.previewResolution(raw),dropped=store.previewResolution({...raw,v5:{...raw.v5,context:{...context,catchWeapon:false}}});assert.equal(caught.test.sl,dropped.test.sl);assert.equal(caught.test.advantage.net,0);assert.equal(caught.postActionCosts[0].ready,true);assert.deepEqual(caught.unresolved,[]);assert.equal((await store.applyResolution(caught)).status,'applied');assert.equal(store.listParticipants()[0].extensions.v5.hasMomentum,false);assert.equal(store.listParticipants()[1].states.find(s=>s.key==='disarmed').heldBy,'a');await store.undo();assert.ok(!store.listParticipants()[1].states.some(s=>s.key==='disarmed'));});
test('Porte-bouclier en défense remplace Riposte et critique, puis dépense l’Élan gagné',async()=>{const{store}=await setup([], [owned('shieldsman'),owned('riposte')]);const raw=melee('defender-push',{roll:85,defense:{type:'attack',attr:'CC',base:60,damage:5,roll:22,v5:{kind:'melee',context:{specialAttack:'shieldsman',shieldAvailable:true,pushDistance:1.5}}}});const p=store.previewResolution(raw);assert.equal(p.opposition.winner,'defender');assert.deepEqual(p.unresolved,[]);assert.equal(p.defenderDamage,null);assert.equal(p.defenderCritical,null);assert.equal(p.defenderTest.advantage.net,0);assert.equal(p.postActionCosts[0].ready,true);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[0].hp,40);assert.equal(store.listParticipants()[1].extensions.v5.hasMomentum,false);assert.equal(store.listParticipants()[0].states.find(s=>s.key==='pushed').distanceYards,1.5);});
test('Feu de forge contribue aussi à la vraie arme de Riposte',async()=>{const{store}=await setup([], [owned('forgefire'),owned('riposte')],{target:{caracs:{CC:60,F:40,E:30,FM:40}}});const context={forgeAuthorIds:['b'],forgeEngagedIds:['b'],forgeDistances:{b:0}};const raw=melee('forge-riposte',{roll:85,defense:{type:'attack',attr:'CC',base:60,damage:5,roll:24,v5:{kind:'melee',context}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.ok(p.input.defense.qualities.some(q=>q.id==='perforante'));assert.ok(p.talentPlans.flatMap(r=>r.proposals).some(p=>p.origins?.some(o=>o.talentId==='talent-forgefire')));assert.equal(store.listParticipants()[1].states.length,0);});
test('Grande taille provoque Peur 1 sur attitude agressive : DR cumulés et quota Round',async()=>{const{store}=await setup([owned('large')]);const raw={resolutionId:'large-fear',actorId:'a',action:{type:'skill',base:0},roll:'',v5:{kind:'test',actorSize:4,context:{talentAction:'large-fear',aggressive:true,frightenedIds:['b'],frightenedSizes:{b:3}}}};assert.equal((await store.applyResolution(store.previewResolution(raw))).status,'applied');const fear=store.listParticipants()[1].states.find(s=>s.key==='fear-of-talent');assert.equal(fear.rating,1);assert.equal(fear.mode,'sl');const calm=generic('Calme',{talentAction:'overcome-fear',fearEffectId:fear.id},{actorId:'b',resolutionId:'large-calm'});assert.equal((await store.applyResolution(store.previewResolution(calm))).status,'applied');assert.ok(!store.listParticipants()[1].states.some(s=>s.key==='fear-of-talent'));await store.undo();assert.ok(store.listParticipants()[1].states.some(s=>s.key==='fear-of-talent'));});
test('Peur : surmonter la source au degré supérieur libère aussi des sources inférieures',async()=>{const{store}=await setup([owned('frightening')]);await store.addParticipant(subject('scary',[owned('large')],{camp:'pj'}));for(const [id,actorId,owner]of[['big-fear','a','frightening'],['lesser-fear','scary','large-fear']]){const p=store.previewResolution({resolutionId:id,actorId,action:{type:'skill',base:0},roll:'',v5:{kind:'test',actorSize:4,context:{talentAction:owner,aggressive:true,frightenedIds:['b'],frightenedSizes:{b:3}}}});assert.equal((await store.applyResolution(p)).status,'applied');}await store.nextTurn();const fears=store.listParticipants()[1].states.filter(s=>s.key==='fear-of-talent');const lower=fears.find(s=>s.rating===1),higher=fears.find(s=>s.rating===2);assert.ok(store.previewResolution(generic('Calme',{talentAction:'overcome-fear',fearEffectId:lower.id},{actorId:'b'})).unresolved.some(s=>s.includes('plus élevé')));await store.updateParticipant('b',{states:fears.map(s=>({...s,successes:s.id===higher.id?1:0}))});const done=store.previewResolution(generic('Calme',{talentAction:'overcome-fear',fearEffectId:higher.id},{actorId:'b'}));assert.equal((await store.applyResolution(done)).status,'applied');assert.equal(store.listParticipants()[1].states.filter(s=>s.key==='fear-overcome').length,2);});
test('Combattant au contact retire seulement le DR d’allonge adverse',async()=>{for(const has of[false,true]){const{store}=await setup(has?[owned('in-fighter')]:[]);const p=store.previewResolution(melee('long-weapon',{defense:{base:30,roll:82,v5:{kind:'melee',slModifiers:[{id:'mj',label:'MJ',amount:1}],context:{longerWeaponDefense:true}}}}));assert.equal(p.defenderTest.details.modifiers.some(s=>s.id==='longer-weapon-defense'),!has);assert.equal(p.defenderTest.details.modifiers.find(s=>s.id==='mj').amount,1);}});
test('Frappe réactive expire après une autre Action et invalide une arme modifiée',async()=>{const blade={id:'blade',type:'attack',attr:'CC',base:60,damage:5};const{store}=await setup([owned('reaction-strike')],[],{actor:{actions:[blade],caracs:{I:55,CC:60,F:40,E:30}}});const check={resolutionId:'init',actorId:'a',targetId:'b',action:{type:'skill',attr:'I',base:55},roll:20,v5:{kind:'test',context:{talentAction:'reaction-strike',receivedCharge:true,chargeEventId:'charge',mainHandActionId:'blade'}}};assert.equal((await store.applyResolution(store.previewResolution(check))).status,'applied');const ready=store.listParticipants()[0].states.find(s=>s.key==='reaction-strike-ready'),raw=melee('reaction',{action:{...blade,damage:9},v5:{kind:'melee',context:{freeAttackTalent:'reaction-strike',mainHand:true,attackOpportunityId:ready.id}}});assert.ok(store.previewResolution(raw).unresolved.some(s=>s.includes('main directrice')));assert.equal((await store.applyResolution(store.previewResolution(generic('Perception')))).status,'applied');assert.ok(!store.listParticipants()[0].states.some(s=>s.key==='reaction-strike-ready'));});
test('Fin glorieuse : une autre résolution ferme la fenêtre immédiate de l’État ancien',async()=>{const{store}=await setup([owned('glorious-demise')]);await store.acquireConditions('a',[{name:'Sonné'}],{resolutionId:'stun'});const trigger=store.listParticipants()[0].states.find(s=>s.key==='sonne');assert.equal((await store.applyResolution(store.previewResolution(generic('Perception')))).status,'applied');const p=store.previewResolution(melee('late-glory',{v5:{kind:'melee',context:{freeAttackTalent:'glorious-demise',triggerConditionId:trigger.id,immediateReaction:true}}}));assert.ok(p.unresolved.some(s=>s.includes('immédiate')));});
test('Tourbillon : Frappe blessante choisit quatre dés Inoffensive pour une cible secondaire',async()=>{const{store}=await setup([owned('whirlwind-of-death'),owned('strike-to-injure')]);await store.setFortune('a',1);await store.addParticipant(subject('enemy',[],{hp:1}));const context={specialAttack:'whirlwind-of-death',engagedIds:['b','enemy'],allEngagedIncluded:true,whirlwindRolls:{enemy:{secondEffect:80,secondEffectAlternative:70,injureSecondEffect:20,injureSecondEffectAlternative:30}},whirlwindChoices:{enemy:{'injure:second':true}}};const p=store.previewResolution(melee('whirlwind-injure',{action:{type:'attack',attr:'CC',base:60,damage:5,qualities:['inoffensive']},v5:{kind:'melee',context}}));assert.deepEqual(p.unresolved,[]);assert.equal(p.secondaryTargets[0].critical.second.effectRollBase,20);assert.equal(context.whirlwindRolls.enemy.secondEffect,80);assert.equal((await store.applyResolution(p)).status,'applied');});
test('Tourbillon : sortie de Frénésie de la cible secondaire respecte Persévérant et son quota durable',async()=>{const{store,persistence}=await setup([owned('whirlwind-of-death')]);await store.setFortune('a',1);await store.addParticipant(subject('enemy',[owned('frenzy'),owned('tenacious')],{caracs:{FM:60,F:40,E:30,CC:60}}));const enter={resolutionId:'enemy-frenzy',actorId:'enemy',action:{type:'skill',attr:'FM',base:60},roll:20,v5:{kind:'test',context:{talentAction:'frenzy'}}};await store.updateParticipant('enemy',{states:[{id:'enemy-frenzy',key:'frenzy',name:'Frénésie',kind:'talent-active',level:1,source:(await import('../../../js/core/v5-talent-situations.js')).situationPlan(store.listParticipants().find(p=>p.id==='enemy'),'frenzy').proposals[0].origins[0]}]});const raw=melee('whirlwind-stun',{roll:10,action:{type:'attack',attr:'CC',base:60,damage:5,qualities:['assommante']},v5:{kind:'melee',context:{specialAttack:'whirlwind-of-death',engagedIds:['b','enemy'],allEngagedIncluded:true}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal((await store.applyResolution(p)).status,'applied');const enemy=store.listParticipants().find(p=>p.id==='enemy');assert.ok(enemy.states.some(s=>s.key==='sonne'));assert.ok(!enemy.states.some(s=>s.key==='frenzy'||s.key==='extenue'));const reload=createStore({persistence});await reload.ready;await reload.acquireConditions('enemy',[{name:'Exténué'}],{resolutionId:'later-fatigue'});assert.equal(reload.listParticipants().find(p=>p.id==='enemy').states.find(s=>s.key==='extenue').level,1);});

const smallSetup=(a=[owned('small')],b=[],extra={})=>setup(a,b,{actor:{hp:200,maxHp:200,...extra.actor},target:{hp:200,maxHp:200,...extra.target}});
test('Petit : données de taille absentes bloquent une attaque, sans mutation du profil importé',async()=>{const{store}=await smallSetup();const before=store.listParticipants();const p=store.previewResolution(melee('small-size-missing'));assert.ok(p.unresolved.some(s=>s.includes('Petit')));assert.equal((await store.applyResolution(p)).status,'manual');assert.deepEqual(store.listParticipants(),before);});
test('Petit : +10 au toucher du plus petit, aucun bonus à Charme ni aux caractéristiques',async()=>{const{store}=await smallSetup();const p=store.previewResolution(melee('small-hit',{v5:{kind:'melee',actorSize:2,targetSize:3}}));assert.equal(p.score.base,70);assert.equal(store.previewResolution(generic('Charme',{}, {targetId:'b'})).score.base,60);assert.equal(store.listParticipants()[0].caracs.CC,60);});
test('Petit : défense de mêlée −2 DR par écart ; Esquive conserve son Test sans qualité d’arme',async()=>{const{store}=await smallSetup([], [owned('small')]);const raw=melee('small-defense',{v5:{kind:'melee',actorSize:4,targetSize:2}});const p=store.previewResolution(raw);assert.equal(p.defenderTest.details.modifiers.find(m=>m.id==='talent:small-defense').amount,-4);const dodge=store.previewResolution({...raw,defense:{base:30,roll:82,v5:{kind:'test'}}});assert.ok(!dodge.defenderTest.details.modifiers.some(m=>m.id==='talent:small-defense'));assert.deepEqual(dodge.input.defense.qualities,[]);});
test('Petit et Grande taille : la pénalité de taille est remplacée, jamais additionnée',async()=>{const{store}=await smallSetup([owned('large')], [owned('small')]);const p=store.previewResolution(melee('both-sizes',{v5:{kind:'melee',actorSize:4,targetSize:2}}));assert.equal(p.defenderTest.details.modifiers.filter(m=>m.id.includes('-defense')).reduce((n,m)=>n+m.amount,0),-4);});
test('Petit : Percutante puis multiplication avant BE/PA ; application, rechargement et annulation',async()=>{const{store,persistence}=await smallSetup([], [owned('small')],{target:{armor:{head:5,body:5,arms:5,legs:5}}});const before=store.listParticipants();const raw=melee('small-multiplier',{v5:{kind:'melee',actorSize:4,targetSize:2}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal(p.damage.bonusPercutante,4);assert.equal(p.damage.unmultipliedDamage,22);assert.equal(p.damage.preProtectionDamage,44);assert.equal(p.damage.finalDamage,36);assert.equal(p.damage.damageMultiplier,2);assert.equal(p.critical,null);assert.equal(Boolean(p.input.v5.extraAttack),false);assert.equal((await store.applyResolution(p)).status,'applied');const reload=createStore({persistence});await reload.ready;assert.equal(reload.listParticipants()[1].hp,164);assert.equal(reload.listParticipants()[1].maxHp,200);assert.deepEqual(reload.listParticipants()[1].caracs,before[1].caracs);await reload.undo();assert.deepEqual(reload.listParticipants(),before);});
test('Petit : unités 0 restent 0 pour Percutante, qui demeure manuelle hors comparaison homebrew',async()=>{const{store}=await smallSetup([], [owned('small')]);const raw=melee('small-zero',{roll:20,v5:{kind:'melee',actorSize:4,targetSize:2}});assert.equal(store.previewResolution(raw).damage.bonusPercutante,0);const baseline=await setup();const ordinary=baseline.store.previewResolution(melee('ordinary-percutante',{action:{type:'attack',base:60,attr:'CC',damage:5,qualities:['percutante']}}));assert.equal((await baseline.store.applyResolution(ordinary)).status,'manual');});
test('Petit : écart 1 Dévastatrice temporaire et ×1, rapports inversés pour un porteur plus grand',async()=>{const{store}=await smallSetup();const raw=melee('small-bigger',{roll:29,defense:{base:90,roll:91,v5:{kind:'melee'}},v5:{kind:'melee',actorSize:3,targetSize:2}});const p=store.previewResolution(raw);assert.equal(p.input.action.qualities.some(q=>q.id==='devastatrice'),true);assert.equal(p.damage.sl,9);assert.equal(p.damage.damageMultiplier,undefined);assert.deepEqual(raw.action?.qualities,undefined);assert.deepEqual(store.listParticipants()[0].caracs,{CC:60,CT:60,F:40,E:30,Ag:40,FM:40,Soc:60,Int:60});});
test('Petit : le plus grand en défense bénéficie des qualités et dégâts de Riposte, aucune qualité sur Esquive',async()=>{const{store}=await smallSetup([owned('small')],[owned('riposte')]);const raw=melee('small-riposte',{roll:41,action:{type:'attack',base:20,attr:'CC',damage:5},defense:{base:60,roll:24,damage:5,v5:{kind:'melee'}},v5:{kind:'melee',actorSize:2,targetSize:4}});const p=store.previewResolution(raw);assert.equal(p.hit,false);assert.equal(p.defenderDamage.damageMultiplier,2);assert.equal(p.defenderDamage.bonusPercutante,4);assert.equal(p.defenderDamage.finalDamage,25);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[0].hp,175);});
test('Petit : Force opposée dans les deux sens, critique nécessaire à écart 1, victoire automatique à écart 2',async()=>{const{store}=await smallSetup();const raw={resolutionId:'small-strength',actorId:'a',targetId:'b',action:{type:'opposition',attr:'F',base:60},roll:22,defense:{attr:'F',base:30,roll:91,v5:{kind:'test'}},v5:{kind:'test',actorSize:2,targetSize:3}};assert.equal(store.previewResolution(raw).opposition.winner,'attacker');assert.equal(store.previewResolution({...raw,roll:23}).opposition.winner,'defender');assert.equal(store.previewResolution({...raw,v5:{...raw.v5,targetSize:4}}).opposition.winner,'defender');assert.equal(store.previewResolution({...raw,roll:91,defense:{...raw.defense,roll:22},v5:{...raw.v5,actorSize:4,targetSize:2}}).opposition.winner,'attacker');});
const smallPsych=(id,actorSize=2,targetSize=4)=>({resolutionId:id,actorId:'a',targetId:'b',action:{type:'skill',base:0},roll:'',v5:{kind:'test',actorSize,targetSize,context:{talentAction:'small-psychology',aggressive:true}}});
test('Petit : Peur d’écart 1, DR cumulés, gain d’Élan interdit et disparition après Calme réussi',async()=>{const{store}=await smallSetup();const raw=smallPsych('small-fear',2,3);assert.equal((await store.applyResolution(store.previewResolution(raw))).status,'applied');const fear=store.listParticipants()[0].states.find(s=>s.key==='fear-of-talent');assert.equal(fear.rating,1);const{withMomentum}=await import('../../../js/core/v5-combat-rules.js');assert.equal(withMomentum(store.listParticipants()[0],true).extensions.v5.hasMomentum,false);const calm=generic('Calme',{talentAction:'overcome-fear',fearEffectId:fear.id,psychologyKind:'fear'},{resolutionId:'small-overcome-fear'});assert.equal((await store.applyResolution(store.previewResolution(calm))).status,'applied');assert.ok(store.listParticipants()[0].states.some(s=>s.key==='fear-overcome'));assert.equal(withMomentum(store.listParticipants()[0],true).extensions.v5.hasMomentum,true);});
test('Petit : Terreur de la créature agressive, échec p184, Brisé réduit, Peur ensuite, reload et undo',async()=>{const{store,persistence}=await smallSetup([owned('small'),owned('stout-hearted')]);assert.equal((await store.applyResolution(store.previewResolution(smallPsych('small-terror')))).status,'applied');const before=store.listParticipants(),terror=before[0].states.find(s=>s.key==='terror-of-talent');assert.equal(terror.rating,2);const calm=generic('Calme',{talentAction:'overcome-terror',terrorEffectId:terror.id,psychologyKind:'terror'},{resolutionId:'small-terror-fail',roll:95,action:{type:'skill',attr:'FM',base:40,extensions:{fiche:{skillId:skill('Calme')}}}});const p=store.previewResolution(calm);assert.equal(p.test.sl,-5);assert.equal(p.actorConditionApplication[0].level,5);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[0].states.find(s=>s.key==='brise').level,5);assert.ok(store.listParticipants()[0].states.some(s=>s.key==='fear-of-talent'));assert.ok(!store.listParticipants()[0].states.some(s=>s.key==='terror-of-talent'));const reload=createStore({persistence});await reload.ready;await reload.undo();assert.deepEqual(reload.listParticipants(),before);});
test('Petit : Terreur réussie donne immunité à la Terreur de rencontre ; prochain grand adversaire ne cause que Peur',async()=>{const{store}=await smallSetup();await store.applyResolution(store.previewResolution(smallPsych('terror-first')));const terror=store.listParticipants()[0].states.find(s=>s.key==='terror-of-talent');const calm=generic('Calme',{talentAction:'overcome-terror',terrorEffectId:terror.id,psychologyKind:'terror'},{resolutionId:'terror-success'});assert.equal((await store.applyResolution(store.previewResolution(calm))).status,'applied');assert.ok(store.listParticipants()[0].states.some(s=>s.key==='terror-immunity'));await store.addParticipant(subject('c',[],{hp:200,maxHp:200}));const p=store.previewResolution({...smallPsych('terror-other',2,5),targetId:'c'});assert.equal(p.talentActionChanges[0].add[0].key,'fear-of-talent');assert.equal(p.talentActionChanges[0].add[0].rating,3);});
test('Petit : emprunt du plus grand sans talent pour Psychologie et départ libre sans jet ni ressource',async()=>{const{store}=await smallSetup([], [owned('small')]);const psycho=store.previewResolution(smallPsych('borrowed-terror',4,2));assert.equal(psycho.talentActionChanges[0].participantId,'b');assert.equal((await store.applyResolution(psycho)).status,'applied');const raw={...smallPsych('borrowed-leave',4,2),v5:{kind:'test',actorSize:4,targetSize:2,context:{talentAction:'small-disengage',bothEngaged:true}}};const p=store.previewResolution(raw);assert.equal(p.test.noTest,true);assert.deepEqual(p.unresolved,[]);assert.equal((await store.applyResolution(p)).status,'applied');assert.equal(store.listParticipants()[0].states.find(s=>s.key==='disengaged').opponentId,'b');});
test('Petit : Piétinement emprunté emploie Bagarre, BF seul comme profil et paie un Élan avant le Test',async()=>{const{store}=await smallSetup([], [owned('small')],{actor:{extensions:{v5:{hasMomentum:true}},skills:[{id:skill('Corps à corps (Bagarre)'),status:'resolved',total:55}]}});const raw=melee('small-stomp',{action:{type:'attack',base:90,attr:'CC',damage:99},v5:{kind:'melee',actorSize:4,targetSize:2,context:{talentAction:'stomp'}}});const p=store.previewResolution(raw);assert.equal(p.score.base,55);assert.equal(p.damage.weaponDamage,4);assert.equal(p.damage.damageMultiplier,undefined);assert.deepEqual(p.input.action.qualities,[]);assert.equal(p.actionCosts.paid[0].resource,'momentum');assert.equal((await store.applyResolution(p)).status,'applied');const repeat=store.previewResolution({...raw,resolutionId:'small-stomp-again'});assert.equal(repeat.actionCosts.ready,false);});
test('Petit : Frénésie ignore Peur/Terreur, mais conserve la restriction de Distraire',async()=>{const{store}=await smallSetup([owned('small'),owned('frenzy')]);const start={resolutionId:'target-frenzy',actorId:'a',action:{type:'skill',attr:'FM',base:40},roll:20,v5:{kind:'test',context:{talentAction:'frenzy'}}};assert.equal((await store.applyResolution(store.previewResolution(start))).status,'applied');const psych=store.previewResolution(smallPsych('immune',2,4));assert.equal(psych.talentActionChanges.length,0);const{withMomentum}=await import('../../../js/core/v5-combat-rules.js');const target=store.listParticipants()[0],source=target.states.find(s=>s.key==='frenzy').source;const distracted={...target,states:[...target.states,{key:'distracted',kind:'talent-active',restriction:'noMomentumOrAdvantage',source}]};assert.equal(withMomentum(distracted,true).extensions.v5.hasMomentum,false);});
test('Petit : Tourbillon recalcule qualité/multiplicateur pour chaque cible, même si seul un destinataire secondaire possède Petit',async()=>{const{store}=await smallSetup([owned('whirlwind-of-death')],[],{actor:{extensions:{v5:{resourceCharacterId:'test-a'}}}});await store.setFortune('a',1);await store.addParticipant(subject('c',[owned('small')],{hp:200,maxHp:200}));const raw=melee('small-whirlwind',{v5:{kind:'melee',actorSize:4,targetSize:3,context:{specialAttack:'whirlwind-of-death',engagedIds:['b','c'],allEngagedIncluded:true,whirlwindSizes:{c:2}}}});const p=store.previewResolution(raw);assert.deepEqual(p.unresolved,[]);assert.equal(p.damage.damageMultiplier,undefined);assert.equal(p.secondaryTargets[0].damage.damageMultiplier,2);assert.equal(p.secondaryTargets[0].damage.bonusPercutante,4);assert.equal(p.mechanics.find(m=>m.id==='percutante').status,'homebrew-covered');assert.equal((await store.applyResolution(p)).status,'applied');});
test('Tourbillon : un double réussi qui perd l’opposition ne provoque toujours aucun critique du jet',async()=>{const{store}=await setup([owned('whirlwind-of-death')],[],{actor:{extensions:{v5:{resourceCharacterId:'test-a'}}}});await store.setFortune('a',1);const p=store.previewResolution(melee('whirlwind-missed-double',{roll:55,defense:{base:60,roll:23,v5:{kind:'melee'}},v5:{kind:'melee',context:{specialAttack:'whirlwind-of-death',engagedIds:['b'],allEngagedIncluded:true}}}));assert.equal(p.success,true);assert.equal(p.hit,false);assert.equal(p.critical,null);});

 test('Petit : Tourbillon ne valide Percutante que pour ses comparaisons ; une qualité déjà portée reste manuelle pour l’autre cible',async()=>{const{store}=await smallSetup([owned('whirlwind-of-death')],[owned('small')],{actor:{extensions:{v5:{resourceCharacterId:'test-a'}}}});await store.setFortune('a',1);await store.addParticipant(subject('c',[],{hp:200,maxHp:200}));const raw=melee('scoped-percutante',{action:{type:'attack',base:60,attr:'CC',damage:5,qualities:['percutante']},v5:{kind:'melee',actorSize:4,targetSize:2,context:{specialAttack:'whirlwind-of-death',engagedIds:['b','c'],allEngagedIncluded:true}}});const p=store.previewResolution(raw);assert.ok(p.mechanicalWarnings.some(m=>m.participantId==='c'));assert.equal((await store.applyResolution(p)).status,'manual');assert.equal(store.getFortune('a').balance,1);assert.equal(store.listParticipants().find(s=>s.id==='b').hp,200);});
});

describe('Integration des talents V5', () => {
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
});
