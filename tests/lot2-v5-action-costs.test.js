import test from 'node:test';
import assert from 'node:assert/strict';
import { previewV5ActionCosts, prepareV5ActionState, commitV5ActionCosts } from '../js/core/v5-action-costs.js';

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
