import test from 'node:test';
import assert from 'node:assert/strict';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };
import { resolveDivineAccess, createDivineAccessGrant, revokeDivineAccessGrant, consumeDivineAccessGrant } from '../js/core/v5-divine-access.js';
const blessing=registry.contracts.find(row=>row.id==='divine:blessing:myrmidia:battle');
const conscience=registry.contracts.find(row=>row.id==='divine:blessing:myrmidia:conscience');
const miracle=registry.contracts.find(row=>row.id==='divine:miracle:bouclier-de-myrmidia');
const talent=contract=>({id:contract.requiredTalent.id,status:'resolved',rank:1,specialization:contract.requiredTalent.specialization});
const actor={id:'a',kind:'PJ',talents:[],prayers:[]};
const grant=(contract=blessing,overrides={})=>({id:'g',actorId:'a',subjectKey:'fiche:one',tradition:contract.requiredTalent.specialization,prayerId:contract.id,scope:'once',sceneId:null,reason:'Motif précis',decisionId:'DIV-02',createdBy:'MJ',commandId:'c1',status:'active',createdRevision:1,...overrides});
const current=rows=>({schemaVersion:1,grants:rows});

test('accès exact par sujet, prière, culte et portée',()=>{
 const valid=grant();assert.equal(resolveDivineAccess(current([valid]),{actor,subjectKey:'fiche:one',contract:blessing}).access.allowed,true);
 for(const bad of [grant(blessing,{subjectKey:'fiche:two'}),grant(blessing,{tradition:'Ulric'}),grant(conscience,{prayerId:conscience.id}),grant(blessing,{status:'revoked',revokedRevision:2,revokedReason:'Fin'})])
  assert.equal(resolveDivineAccess(current([bad]),{actor,subjectKey:'fiche:one',contract:blessing}).access.allowed,false);
 const scene=grant(blessing,{scope:'scene',sceneId:'s'});
 assert.equal(resolveDivineAccess(current([scene]),{actor,subjectKey:'fiche:one',contract:blessing,activeScene:{id:'s',status:'active'}}).access.allowed,true);
 assert.equal(resolveDivineAccess(current([grant(blessing,{scope:'scene',actorId:'old',sceneId:'s'})]),{actor,subjectKey:'fiche:one',contract:blessing,activeScene:{id:'s',status:'active'}}).access.allowed,true);
 assert.equal(resolveDivineAccess(current([scene]),{actor,subjectKey:'fiche:one',contract:blessing,activeScene:{id:'s',status:'suspended'}}).access.allowed,false);
});

test('une grant once non consommée suit le sujet stable au-delà de son actorId de création',()=>{
 const unused=grant(blessing,{actorId:'actor-previous-session',scope:'once'});
 const resolved=resolveDivineAccess(current([unused]),{actor:{...actor,id:'actor-new-session'},subjectKey:'fiche:one',contract:blessing}).access;
 assert.equal(resolved.allowed,true,'une utilisation est liée au sujet; seul le scope scene est limité à actorId et sceneId');
 assert.equal(resolved.scope,'once');
});

test('une grant scène suit le même sujet stable dans la scène active après remplacement de participant',()=>{
 const sceneGrant=grant(blessing,{actorId:'actor-before-reimport',scope:'scene',sceneId:'scene-one'});
 const resolved=resolveDivineAccess(current([sceneGrant]),{actor:{...actor,id:'actor-after-reimport'},subjectKey:'fiche:one',
  contract:blessing,activeScene:{id:'scene-one',status:'active'}}).access;
 assert.equal(resolved.allowed,true);
 assert.equal(resolveDivineAccess(current([sceneGrant]),{actor:{...actor,id:'actor-after-reimport'},subjectKey:'fiche:one',
  contract:blessing,activeScene:{id:'scene-two',status:'active'}}).access.allowed,false);
});

test('fiche prioritaire; Béni ouvre les bénédictions du culte, Invoke exige miracle acquis',()=>{
 const blessed={...actor,talents:[talent(blessing)],prayers:[]};
 const sheet=resolveDivineAccess(current([grant()]),{actor:blessed,subjectKey:'fiche:one',contract:conscience}).access;
 assert.equal(sheet.allowed,true);assert.equal(sheet.mode,'sheet');
 const invoker={...actor,talents:[talent(miracle)],prayers:[]};
 assert.equal(resolveDivineAccess(current([]),{actor:invoker,subjectKey:'fiche:one',contract:miracle}).access.allowed,false);
 invoker.prayers=[{status:'resolved',nom:miracle.catalogueName||miracle.name}];
 assert.equal(resolveDivineAccess(current([]),{actor:invoker,subjectKey:'fiche:one',contract:miracle}).access.mode,'sheet');
});

test('transitions once idempotentes, motivées et immuables',()=>{
 const empty=current([]),created=createDivineAccessGrant(empty,{actorId:'a',subjectKey:'fiche:one',contract:blessing,scope:'once',reason:'Motif précis',revision:2,id:'g2',commandId:'c2'});
 assert.equal(created.ok,true);assert.equal(created.state.grants[0].status,'active');assert.deepEqual(empty.grants,[]);
 assert.equal(createDivineAccessGrant(empty,{actorId:'a',subjectKey:'fiche:one',contract:blessing,scope:'once',reason:' ',revision:2,id:'g3'}).ok,false);
 const consumed=consumeDivineAccessGrant(created.state,{grantId:'g2',executionId:'e1',revision:3,commandId:'c4'});assert.equal(consumed.ok,true);assert.equal(consumed.grant.status,'consumed');
 assert.equal(consumeDivineAccessGrant(consumed.state,{grantId:'g2',executionId:'e2',revision:4}).ok,false);
 const revoked=revokeDivineAccessGrant(created.state,{grantId:'g2',reason:'Fin',revision:4,commandId:'c6'});assert.equal(revoked.ok,true);assert.equal(revoked.grant.status,'revoked');
});

test('grant actif mal formé ou incohérent ne donne aucun accès',()=>{
 for(const bad of [grant(blessing,{reason:undefined}),grant(blessing,{consumedBy:'old-execution'}),grant(blessing,{scope:'scene',sceneId:null})])
  assert.equal(resolveDivineAccess(current([bad]),{actor,subjectKey:'fiche:one',contract:blessing,activeScene:{id:'s',status:'active'}}).access.allowed,false);
});

test('réconciliation offline E05 n’accepte qu’un des deux commits once concurrents',async()=>{
 const {createSyncDocument,createOperation,applyOperation}=await import('../js/core/sync-protocol.js');
 const created=createDivineAccessGrant(current([]),{actorId:'a',subjectKey:'fiche:one',contract:blessing,scope:'once',reason:'Deux répliques',revision:4,id:'shared-once'});
 const base=createSyncDocument({schemaVersion:3,extensions:{v5:{divineAccess:created.state}}},{revision:7});
 const a=consumeDivineAccessGrant(created.state,{grantId:'shared-once',executionId:'client-a',revision:5});
 const b=consumeDivineAccessGrant(created.state,{grantId:'shared-once',executionId:'client-b',revision:5});
 assert.equal(a.ok,true);assert.equal(b.ok,true,'chaque réplique peut calculer son état local pendant la coupure');
 const first=applyOperation(base,createOperation({deviceId:'device-a',sequence:1,baseRevision:7,state:{schemaVersion:3,extensions:{v5:{divineAccess:a.state}}}}));
 const second=applyOperation(first.document,createOperation({deviceId:'device-b',sequence:1,baseRevision:7,state:{schemaVersion:3,extensions:{v5:{divineAccess:b.state}}}}));
 assert.equal(first.status,'applied');assert.equal(second.status,'conflict');
});
