import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import registry from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };
import { resolveDivineAccess, createDivineAccessGrant, revokeDivineAccessGrant, consumeDivineAccessGrant } from '../../../js/core/v5-divine-access.js';
import { createSyncSession, normalizeRemoteDocument } from '../../../js/core/sync-session.js';
import { validateSyncDocument } from '../../../js/core/sync-protocol.js';
import { sanitizeMagicEnvelope } from '../../../js/core/sanitize.js';
import { migrateSnapshot } from '../../../js/core/migrations.js';
import { createStore } from '../../../js/core/store.js';

describe('accès exact par sujet', () => {
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
 const {createSyncDocument,createOperation,applyOperation}=await import('../../../js/core/sync-protocol.js');
 const created=createDivineAccessGrant(current([]),{actorId:'a',subjectKey:'fiche:one',contract:blessing,scope:'once',reason:'Deux répliques',revision:4,id:'shared-once'});
 const base=createSyncDocument({schemaVersion:3,extensions:{v5:{divineAccess:created.state}}},{revision:7});
 const a=consumeDivineAccessGrant(created.state,{grantId:'shared-once',executionId:'client-a',revision:5});
 const b=consumeDivineAccessGrant(created.state,{grantId:'shared-once',executionId:'client-b',revision:5});
 assert.equal(a.ok,true);assert.equal(b.ok,true,'chaque réplique peut calculer son état local pendant la coupure');
 const first=applyOperation(base,createOperation({deviceId:'device-a',sequence:1,baseRevision:7,state:{schemaVersion:3,extensions:{v5:{divineAccess:a.state}}}}));
 const second=applyOperation(first.document,createOperation({deviceId:'device-b',sequence:1,baseRevision:7,state:{schemaVersion:3,extensions:{v5:{divineAccess:b.state}}}}));
 assert.equal(first.status,'applied');assert.equal(second.status,'conflict');
});
});

describe('accès — contrôle indépendant (E3)', () => {
const blessing = id => registry.contracts.find(row => row.id === id);
const battle = blessing('divine:blessing:myrmidia:battle');
const conscience = blessing('divine:blessing:myrmidia:conscience');
const miracle = blessing('divine:miracle:bouclier-de-myrmidia');
const sun = blessing('divine:miracle:soleil-flamboyant');
const talent = (contract = battle) => ({
  id: contract.requiredTalent.id,
  status: 'resolved',
  rank: 1,
  specialization: contract.requiredTalent.specialization
});
const knownPrayer = contract => ({ status: 'resolved', nom: contract.catalogueName || contract.name });
const subjectKey = 'profile:actor-a';
const accessState = grants => ({ schemaVersion: 1, grants });
const grant = (contract, overrides = {}) => ({
  id: 'grant-test', actorId: 'actor-a', subjectKey,
  tradition: contract.requiredTalent.specialization,
  prayerId: contract.id,
  scope: 'durable', sceneId: null,
  reason: 'Arbitrage MJ explicite', decisionId: 'DIV-02', createdBy: 'MJ',
  status: 'active', createdRevision: 1,
  ...overrides
});
const resolver = async () => (await import('../../../js/core/v5-divine-access.js')).resolveDivineAccess;
const accessApi = () => import('../../../js/core/v5-divine-access.js');

function actor(id = 'priest', { access = false, learned = false, skill = 60 } = {}) {
  return {
    id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, persistentCharacterId: `persistent-${id}`,
    hp: 20, maxHp: 30,
    caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
    skills: [{ name: 'Prière', status: 'resolved', carac: 'Soc', total: skill }],
    talents: access ? [talent(), talent(miracle)] : [],
    prayers: learned ? [knownPrayer(miracle), knownPrayer(sun)] : [],
    equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
    extensions: { v5: { divine: { sin: 0 } } }
  };
}
async function divineStore({ access = false, learned = false, skill = 60, persistence } = {}) {
  const { createStore } = await import('../../../js/core/store.js');
  const store = createStore({ ...(persistence ? { persistence } : {}) });
  await store.ready;
  const priest = actor('priest', { access, learned, skill });
  const ally = actor('ally');
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], diceLines: [], log: [],
    extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [
      priest, ally
    ] },
    activeScene: { id: 'scene-a', status: 'active', round: 1, currentActorId: 'priest',
      order: ['priest', 'ally'], participants: [structuredClone(priest), structuredClone(ally)] }
  });
  return store;
}
const prayerInput = (roll = 45, extra = {}) => ({ actorId: 'priest', targetIds: ['ally'], roll,
  canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  facts: { targets: { ally: { withinRange: true, ally: true } } },
  expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest', moment: 'afterEffects' }, ...extra });
const snapshot = store => {
  const value = JSON.parse(store.getFullJSON());
  delete value.exportedAt;
  return value;
};
const inState = (store, fn) => fn(snapshot(store));

test('E3 indépendant — Béni ouvre chaque bénédiction du culte sans acquisition nominative', async () => {
  const resolve = await resolver();
  const actor = { id: 'actor-a', talents: [talent()], prayers: [] };
  for (const contract of [battle, conscience]) {
    assert.ok(contract, 'contrat de bénédiction canonique attendu');
    const result = resolve(accessState([]), { actor, subjectKey, contract, activeScene: { id: 'scene-a', status: 'active' } }).access;
    assert.equal(result.allowed, true, contract.id);
    assert.equal(result.mode, 'sheet', contract.id);
    assert.equal(result.grantId ?? null, null, contract.id);
  }
});

test('E3 indépendant — Invocation exige le miracle exact appris sur la fiche', async () => {
  const resolve = await resolver();
  const actor = { id: 'actor-a', talents: [talent(miracle)], prayers: [] };
  assert.equal(resolve(accessState([]), { actor, subjectKey, contract: miracle, activeScene: { id: 'scene-a' } }).access.allowed, false);
  actor.prayers.push(knownPrayer(miracle));
  const result = resolve(accessState([]), { actor, subjectKey, contract: miracle, activeScene: { id: 'scene-a' } }).access;
  assert.equal(result.allowed, true);
  assert.equal(result.mode, 'sheet');
});

test('E3 indépendant — une dérogation est liée au sujet, à la tradition et à la prière exacts', async () => {
  const resolve = await resolver();
  const actor = { id: 'actor-a', talents: [], prayers: [] };
  const allowed = resolve(accessState([grant(battle)]), { actor, subjectKey, contract: battle, activeScene: { id: 'scene-a' } }).access;
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.mode, 'grant');
  assert.equal(allowed.grantId, 'grant-test');

  for (const wrong of [
    grant(battle, { subjectKey: 'profile:actor-b' }),
    grant(battle, { tradition: 'Ulric' }),
    grant(conscience, { prayerId: conscience.id }),
    grant(battle, { status: 'revoked' }),
    grant(battle, { status: 'consumed' })
  ]) {
    assert.equal(resolve(accessState([wrong]), { actor, subjectKey, contract: battle, activeScene: { id: 'scene-a' } }).access.allowed, false,
      `aucun accès depuis la dérogation non correspondante ${JSON.stringify(wrong)}`);
  }
  const samePersistentSubject = resolve(accessState([grant(battle, { actorId: 'actor-previous-scene' })]), {
    actor: { ...actor, id: 'actor-new-scene' }, subjectKey, contract: battle, activeScene: null
  }).access;
  assert.equal(samePersistentSubject.allowed, true,
    'un grant durable suit le même sujet stable entre deux identifiants de projection de combat');
  const unusedOnceFollowsSubject = resolve(accessState([grant(battle, { actorId: 'actor-previous-session', scope: 'once' })]), {
    actor: { ...actor, id: 'actor-new-session' }, subjectKey, contract: battle, activeScene: null
  }).access;
  assert.equal(unusedOnceFollowsSubject.allowed, true,
    'une utilisation non consommée suit le sujet stable; elle ne signifie pas une scène');
});

test('E3 indépendant — une autorisation de scène ne déborde pas sur une autre scène', async () => {
  const resolve = await resolver();
  const actor = { id: 'actor-a', talents: [], prayers: [] };
  const sceneGrant = grant(battle, { scope: 'scene', sceneId: 'scene-a' });
  assert.equal(resolve(accessState([sceneGrant]), { actor, subjectKey, contract: battle, activeScene: { id: 'scene-a', status: 'active' } }).access.allowed, true);
  assert.equal(resolve(accessState([sceneGrant]), { actor, subjectKey, contract: battle, activeScene: { id: 'scene-b', status: 'active' } }).access.allowed, false);
  assert.equal(resolve(accessState([grant(battle, { scope: 'once' })]), { actor, subjectKey, contract: battle, activeScene: null }).access.allowed, true);
  assert.equal(resolve(accessState([grant(battle, { scope: 'durable' })]), { actor, subjectKey, contract: battle, activeScene: { id: 'scene-z' } }).access.allowed, true);
});

test('E3 indépendant — une dérogation ne masque jamais l’absence du contrat ou son blocage source', async () => {
  const resolve = await resolver();
  // Plus aucun contrat bloqué dans le registre (les neuf d'Up in Arms sont raccordés) : cas adversarial synthétique.
  assert.equal(registry.contracts.some(row => row.status === 'blocked'), false);
  const blocked = { ...structuredClone(miracle), status: 'blocked' };
  const actor = { id: 'actor-a', talents: [], prayers: [] };
  const result = resolve(accessState([grant(blocked)]), { actor, subjectKey, contract: blocked, activeScene: null }).access;
  assert.equal(result.allowed, false, 'la résolution d’accès ne certifie pas un contrat bloqué');
  assert.equal(resolve(accessState([grant(battle)]), { actor, subjectKey, contract: null, activeScene: null }).access.allowed, false);
});

test('E3 indépendant — créer une dérogation dérive culte et prière du contrat, exige portée et motif', async () => {
  const { createDivineAccessGrant } = await accessApi();
  const current = { schemaVersion: 1, grants: [] };
  const created = createDivineAccessGrant(current, {
    actorId: 'actor-a', subjectKey, contract: battle, scope: 'once', sceneId: null,
    reason: 'La fiche a été perdue pendant la séance', revision: 7, id: 'grant-once'
  });
  assert.equal(created.ok, true, created.error);
  assert.equal(created.grant.id, 'grant-once');
  assert.equal(created.grant.actorId, 'actor-a');
  assert.equal(created.grant.tradition, battle.requiredTalent.specialization);
  assert.equal(created.grant.prayerId, battle.id);
  assert.equal(created.grant.scope, 'once');
  assert.equal(created.grant.status, 'active');
  assert.equal(created.grant.createdRevision, 7);
  assert.match(created.grant.reason, /fiche a été perdue/);
  assert.deepEqual(current, { schemaVersion: 1, grants: [] }, 'la transition pure ne mutile pas son entrée');
  for (const invalid of [
    { scope: 'même-scène', sceneId: 'scene-a', reason: 'Motif' },
    { scope: 'scene', sceneId: null, reason: 'Motif' },
    { scope: 'once', sceneId: 'scene-a', reason: 'Motif' },
    { scope: 'durable', sceneId: null, reason: '  ' },
    { scope: 'durable', sceneId: null, reason: 'Motif', actorId: '' }
  ]) {
    const rejected = createDivineAccessGrant(current, {
      actorId: 'actor-a', subjectKey, contract: battle, revision: 7, id: 'invalid', ...invalid
    });
    assert.equal(rejected.ok, false, JSON.stringify(invalid));
    assert.deepEqual(current, { schemaVersion: 1, grants: [] });
  }
});

test('E3 indépendant — transitions pures révocation/consommation sont tracées, à usage unique et non réutilisables', async () => {
  const { createDivineAccessGrant, revokeDivineAccessGrant, consumeDivineAccessGrant } = await accessApi();
  const created = createDivineAccessGrant({ schemaVersion: 1, grants: [] }, {
    actorId: 'actor-a', subjectKey, contract: battle, scope: 'once', sceneId: null,
    reason: 'Usage unique pour réparer une fiche', revision: 4, id: 'grant-pure'
  });
  assert.equal(created.ok, true, created.error);
  const consumed = consumeDivineAccessGrant(created.state, {
    grantId: 'grant-pure', executionId: 'exec-pure', revision: 5
  });
  assert.equal(consumed.ok, true, consumed.error);
  assert.equal(consumed.grant.status, 'consumed');
  assert.equal(consumed.grant.consumedBy, 'exec-pure');
  assert.equal(consumed.grant.consumedRevision, 5);
  assert.equal(consumeDivineAccessGrant(consumed.state, {
    grantId: 'grant-pure', executionId: 'exec-second', revision: 6
  }).ok, false, 'un grant consommé ne peut être rejoué avec un autre executionId');
  assert.equal(revokeDivineAccessGrant(consumed.state, {
    grantId: 'grant-pure', reason: 'Révocation tardive', revision: 6
  }).ok, false, 'une entrée consommée reste reçue, mais ne peut être mutée comme active');

  const durable = createDivineAccessGrant({ schemaVersion: 1, grants: [] }, {
    actorId: 'actor-a', subjectKey, contract: battle, scope: 'durable', sceneId: null,
    reason: 'Accès durable décidé par le MJ', revision: 10, id: 'grant-durable'
  });
  assert.equal(durable.ok, true, durable.error);
  const revoked = revokeDivineAccessGrant(durable.state, {
    grantId: 'grant-durable', reason: 'L’exception prend fin', revision: 11
  });
  assert.equal(revoked.ok, true, revoked.error);
  assert.equal(revoked.grant.status, 'revoked');
  assert.equal(revoked.grant.revokedRevision, 11);
  assert.equal(revoked.grant.revokedReason, 'L’exception prend fin');
  assert.equal(revokeDivineAccessGrant(revoked.state, {
    grantId: 'grant-durable', reason: 'Double révocation', revision: 12
  }).ok, false, 'une deuxième révocation ne modifie pas le reçu');
});

test('E3 indépendant — aucun état contradictoire ou registre incomplet ne confère un droit', async () => {
  const { resolveDivineAccess, createDivineAccessGrant } = await accessApi();
  const actor = { id: 'actor-a', talents: [], prayers: [] };
  const valid = grant(battle);
  for (const malformed of [
    { ...valid, reason: '' },
    { ...valid, decisionId: 'UNKNOWN' },
    { ...valid, createdBy: 'client' },
    { ...valid, status: 'active', revokedRevision: 8, revokedReason: 'Révoqué' },
    { ...valid, status: 'active', consumedBy: 'exec-old', consumedRevision: 8 },
    { ...valid, scope: 'once', status: 'active', consumedBy: 'exec-old', consumedRevision: 8 }
  ]) {
    const result = resolveDivineAccess(accessState([malformed]), {
      actor, subjectKey, contract: battle, activeScene: { id: 'scene-a', status: 'active' }
    }).access;
    assert.equal(result.allowed, false, `entrée incohérente refusée: ${JSON.stringify(malformed)}`);
  }
  const duplicated = resolveDivineAccess(accessState([valid, { ...valid }]), {
    actor, subjectKey, contract: battle, activeScene: null
  }).access;
  assert.equal(duplicated.allowed, false, 'registre non canonique complet refusé avant choix de grant');
  const refusedAppend = createDivineAccessGrant(accessState([{ ...valid, reason: '' }]), {
    actorId: 'actor-a', subjectKey, contract: battle, scope: 'durable', sceneId: null,
    reason: 'Ne pas réparer silencieusement le registre', revision: 8, id: 'new-grant'
  });
  assert.equal(refusedAppend.ok, false, 'une transition ne doit pas étendre un registre malformé');
});

test('E3 indépendant — consommations once: preview et tentative refusée préservent le grant, échec de Prière au commit le consomme', async () => {
  const store = await divineStore({ access: false, learned: false, skill: 30 });
  const granted = await store.grantDivineAccess('priest', battle.id, {
    scope: 'once', reason: 'Fiche originale indisponible', baseRevision: store.getLocalRevision()
  });
  assert.equal(granted.ok, true, granted.error);
  const grantId = granted.grant?.id;
  assert.ok(grantId);
  const grantStatus = () => store.getDivineAccessGrants('priest').find(row => row.id === grantId)?.status;
  const beforePreview = snapshot(store);
  const refusedPrecondition = store.previewDivineExecution(battle.id, prayerInput(95, { canSpeak: false }));
  assert.equal(refusedPrecondition.ready, false, 'refus de précondition ne constitue pas une tentative commise');
  assert.equal(grantStatus(), 'active');
  const failedAttempt = store.previewDivineExecution(battle.id, prayerInput(95));
  assert.equal(failedAttempt.ready, true, failedAttempt.error);
  assert.equal(failedAttempt.preview.prayer.success, false, 'le d100 dépasse le seuil de Prière');
  assert.equal(grantStatus(), 'active', 'l’aperçu ne consomme aucune autorisation');
  assert.deepEqual(snapshot(store), beforePreview, 'le preview reste purement consultatif');
  const applied = await store.applyDivineExecution(battle.id, { preview: failedAttempt });
  assert.equal(applied.ready, true, applied.error);
  assert.equal(applied.receipt.prayer.success, false);
  assert.equal(grantStatus(), 'consumed', 'la tentative commise consomme même après échec du Test');
  assert.equal(store.getDivineAccessGrants('priest').find(row => row.id === grantId)?.consumedBy, applied.executionId);
  const afterFirstCommit = snapshot(store);
  await assert.rejects(async () => store.applyDivineExecution(battle.id, { preview: failedAttempt }), /modifié|périmé|recalculez|déjà/i,
    'le même preview ne consomme ni n’exécute une deuxième fois');
  assert.deepEqual(snapshot(store), afterFirstCommit);
  assert.equal(store.previewDivineExecution(battle.id, prayerInput(45)).ready, false,
    'la même permission once ne permet pas un second lancement');
});

test('E3 indépendant — grant once est restitué par Undo et consommé de nouveau par Redo/reload', async () => {
  const store = await divineStore({ access: false, learned: false });
  const granted = await store.grantDivineAccess('priest', battle.id, {
    scope: 'once', reason: 'Dérogation unique pour la scène', baseRevision: store.getLocalRevision()
  });
  const execution = store.previewDivineExecution(battle.id, prayerInput(45));
  assert.equal(execution.ready, true, execution.error);
  const result = await store.applyDivineExecution(battle.id, { preview: execution });
  assert.equal(result.ready, true, result.error);
  const grantId = granted.grant.id;
  assert.equal(store.getDivineAccessGrants('priest').find(row => row.id === grantId)?.status, 'consumed');
  const reloaded = await divineStore();
  await reloaded.loadFromJSON(snapshot(store));
  assert.equal(reloaded.getDivineAccessGrants('priest').find(row => row.id === grantId)?.status, 'consumed');
  await store.undo();
  assert.equal(store.getDivineAccessGrants('priest').find(row => row.id === grantId)?.status, 'active');
  assert.equal(store.getDivineAccessGrants('priest').find(row => row.id === grantId)?.consumedBy, undefined);
  await store.redo();
  assert.equal(store.getDivineAccessGrants('priest').find(row => row.id === grantId)?.status, 'consumed');
});

test('E3 indépendant — refus de persistance atomique ne publie ni effet ni consommation', async () => {
  let refusing = false;
  const store = await divineStore({ access: false, learned: false,
    persistence: { load: async () => null, saveAtomic: async () => refusing
      ? { ok: false, error: 'QA atomic persistence refusal' } : { ok: true } }
  });
  const granted = await store.grantDivineAccess('priest', battle.id, {
    scope: 'once', reason: 'Autorisation unique testée sur panne', baseRevision: store.getLocalRevision()
  });
  assert.equal(granted.ok, true, granted.error);
  const grantId = granted.grant.id;
  const preview = store.previewDivineExecution(battle.id, prayerInput(45));
  assert.equal(preview.ready, true, preview.error);
  const before = snapshot(store);
  refusing = true;
  const refused = await store.applyDivineExecution(battle.id, { preview });
  assert.equal(refused.ok, false);
  assert.deepEqual(snapshot(store), before);
  assert.equal(store.getDivineAccessGrants('priest').find(row => row.id === grantId)?.status, 'active');
  assert.equal((store.getParticipants?.() || store.listParticipants()).flatMap(row => row.extensions?.v5?.divineEffects || []).length, 0);
  refusing = false;
  const committed = await store.applyDivineExecution(battle.id, { preview });
  assert.equal(committed.ready, true, committed.error);
  assert.equal(store.getDivineAccessGrants('priest').find(row => row.id === grantId)?.status, 'consumed');
});

test('E3 indépendant — migration sans grants initialise un registre vide sans changer les données source', async () => {
  const { migrateSnapshot } = await import('../../../js/core/migrations.js');
  const old = { schemaVersion: 3, reserve: [], diceLines: [], log: [],
    combat: { round: 0, order: [], participants: [] },
    extensions: { v5: { turnIndex: 0, unrelated: { keep: true } } }
  };
  const before = structuredClone(old);
  const migrated = migrateSnapshot(old).data;
  assert.deepEqual(old, before, 'la migration est pure');
  assert.deepEqual(migrated.extensions.v5.divineAccess, { schemaVersion: 1, grants: [] });
  assert.deepEqual(migrated.extensions.v5.unrelated, { keep: true });
});

test('E3 indépendant — identité de sujet empêche deux PNJ clonés du même modèle de partager un grant', async () => {
  const resolve = await resolver();
  const npcA = { id: 'npc-instance-a', talents: [], prayers: [] };
  const npcB = { id: 'npc-instance-b', talents: [], prayers: [] };
  const instanceGrant = grant(battle, { actorId: npcA.id, subjectKey: 'instance:npc-instance-a', scope: 'scene', sceneId: 'scene-a' });
  assert.equal(resolve(accessState([instanceGrant]), {
    actor: npcA, subjectKey: 'instance:npc-instance-a', contract: battle, activeScene: { id: 'scene-a', status: 'active' }
  }).access.allowed, true);
  assert.equal(resolve(accessState([instanceGrant]), {
    actor: npcB, subjectKey: 'instance:npc-instance-b', contract: battle, activeScene: { id: 'scene-a', status: 'active' }
  }).access.allowed, false, 'une copie du même gabarit PNJ garde une identité d’instance distincte');
});

test('E3 indépendant — révocation ou changement de scène rend les previews stale et laisse l’état sans effet partiel', async () => {
  const store = await divineStore({ access: false, learned: false });
  const granted = await store.grantDivineAccess('priest', battle.id, {
    scope: 'scene', reason: 'Arbitrage pour la scène actuelle', baseRevision: store.getLocalRevision()
  });
  const staleOnRevoke = store.previewDivineExecution(battle.id, prayerInput(45));
  assert.equal(staleOnRevoke.ready, true, staleOnRevoke.error);
  const revoked = await store.revokeDivineAccessGrant(granted.grant.id, {
    reason: 'Fin de l’exception décidée par le MJ', baseRevision: store.getLocalRevision()
  });
  assert.equal(revoked.ok, true, revoked.error);
  const beforeApply = snapshot(store);
  await assert.rejects(async () => store.applyDivineExecution(battle.id, { preview: staleOnRevoke }), /changé|périmé|révoqué|recalculez/i);
  assert.deepEqual(snapshot(store), beforeApply, 'aucun effet/receipt n’est engagé par une capture stale');

  const secondSceneGrant = await store.grantDivineAccess('priest', battle.id, {
    scope: 'scene', reason: 'Nouvelle décision pour contrôler la fin de scène', baseRevision: store.getLocalRevision()
  });
  assert.equal(secondSceneGrant.ok, true, secondSceneGrant.error);
  const durable = await store.grantDivineAccess('priest', battle.id, {
    scope: 'durable', reason: 'Continuer à la prochaine scène', baseRevision: store.getLocalRevision()
  });
  assert.equal(durable.ok, true, durable.error);
  const nextEncounterActor = snapshot(store).combat.participants.find(row => row.id === 'priest');
  nextEncounterActor.id = 'priest-next-encounter';
  const staleOnScene = store.previewDivineExecution(battle.id, prayerInput(45));
  assert.equal(staleOnScene.ready, true, staleOnScene.error);
  await store.suspendActiveScene();
  const beforeSceneApply = snapshot(store);
  await assert.rejects(async () => store.applyDivineExecution(battle.id, { preview: staleOnScene }), /changé|périmé|recalculez/i);
  assert.deepEqual(snapshot(store), beforeSceneApply);
  const grants = store.getDivineAccessGrants('priest');
  assert.equal(grants.find(row => row.id === secondSceneGrant.grant.id)?.status, 'active',
    'suspendre la scène ne révoque pas silencieusement le journal de décision');
  assert.equal(grants.find(row => row.id === durable.grant.id)?.status, 'active');
  const { resolveDivineAccess } = await accessApi();
  const laterScene = resolveDivineAccess({ schemaVersion: 1, grants }, {
    actor: nextEncounterActor, subjectKey: grants.find(row => row.id === durable.grant.id).subjectKey,
    contract: battle, activeScene: { id: 'scene-b', status: 'active' }
  }).access;
  assert.equal(laterScene.allowed, true, laterScene.reason);
  assert.equal(laterScene.grantId, durable.grant.id);
});

test('E3 indépendant — blocked V4 et contrat falsifié restent refusés même avec un grant concordant', async () => {
  // Plus aucun contrat bloqué dans le registre : un contrat inconnu est refusé de la même façon, un contrat marqué bloqué ne s'aperçoit pas.
  const store = await divineStore({ access: false, learned: false });
  const grantResult = await store.grantDivineAccess('priest', 'divine:miracle:contrat-inconnu', {
    scope: 'durable', reason: 'Ne doit pas contourner la source', baseRevision: store.getLocalRevision()
  });
  assert.equal(grantResult.ok, false, 'un contrat sans source ne peut recevoir une dérogation');
  assert.equal(store.previewDivineExecution({ ...structuredClone(miracle), status: 'blocked' }, prayerInput(45)).ready, false);
  const forged = structuredClone(battle);
  forged.effects = [{ type: 'characteristic-modifier', characteristic: 'CC', value: 999 }];
  assert.equal(store.previewDivineExecution(forged, prayerInput(45)).ready, false);
});
});

describe('accès — codec de synchronisation', () => {
const persistence = {
  async load() { return { schemaVersion: 3, reserve: [], combat: { round: 0, order: [], participants: [] } }; },
  async saveAtomic() {},
  async readSession() { return { protocolVersion: 3, sequence: 0, baseRevision: 0 }; },
  async listOutbox() { return []; }
};

test('remote RTDB supprime grants:[] seulement: le décodeur restaure le registre vide sans assouplir les imports locaux', async () => {
  let adopted = null;
  const session = createSyncSession({
    persistence,
    deviceId: 'codec-test',
    transport: {
      async read() {
        return { revision: 0, receipts: {}, state: {
          schemaVersion: 3,
          extensions: { v5: { divineAccess: { schemaVersion: 1 } } }
        } };
      },
      async transaction() { throw new Error('not used'); }
    },
    onRemoteState(state) { adopted = state; }
  });
  await session.open();
  assert.deepEqual(adopted?.extensions?.v5?.divineAccess, { schemaVersion: 1, grants: [] });
  const malformed = { schemaVersion: 3, extensions: { v5: { divineAccess: { schemaVersion: 1 } } } };
  assert.throws(() => validateSyncDocument({ revision: 0, receipts: {}, state: malformed }), /Registre de dérogations divines mal formé/);
  assert.throws(() => sanitizeMagicEnvelope(malformed), /Registre de dérogations divines mal formé/);
  assert.throws(() => normalizeRemoteDocument({ revision: 0, receipts: {}, state: {
    schemaVersion: 3, extensions: { v5: { divineAccess: { schemaVersion: 1, unexpected: true } } }
  } }), /Registre de dérogations divines mal formé/);
});

test('codec sync — ne crée pas de registre divin absent dans une racine vide', () => {
  assert.deepEqual(normalizeRemoteDocument({ revision: 0, state: {}, receipts: {} }), {
    revision: 0, state: {}, receipts: {}
  });
  assert.deepEqual(sanitizeMagicEnvelope({}), {});
  assert.deepEqual(sanitizeMagicEnvelope({ extensions: { v5: {} } }), { extensions: { v5: {} } });
  assert.throws(() => normalizeRemoteDocument({ revision: 0, receipts: {}, state: {
    schemaVersion: 3,
    extensions: { v5: { divineAccess: { schemaVersion: 1, grants: [], unexpected: true } } }
  } }), /Registre de dérogations divines mal formé/);
});

test('migration applicative — initialise le registre sur un snapshot complet, pas sur une racine protocole vide', () => {
  const source = {
    schemaVersion: 3,
    reserve: [],
    combat: { round: 0, order: [], participants: [] },
    extensions: { v5: { unrelated: { keep: true } } }
  };
  const before = structuredClone(source);
  const migrated = migrateSnapshot(source).data;
  assert.deepEqual(source, before);
  assert.deepEqual(migrated.extensions.v5.divineAccess, { schemaVersion: 1, grants: [] });
  assert.deepEqual(migrated.extensions.v5.unrelated, { keep: true });
  assert.deepEqual(normalizeRemoteDocument({ revision: 0, state: {}, receipts: {} }).state, {});
});

test('RTDB-omitted sceneId:null is restored for once/durable rows only at the remote boundary', () => {
  const base = {
    actorId: 'a', subjectKey: 'fiche:a', tradition: 'Myrmidia', prayerId: 'p',
    reason: 'Motif', decisionId: 'DIV-02', createdBy: 'MJ', createdRevision: 1
  };
  const grants = [
    { ...base, id: 'once-active', scope: 'once', status: 'active' },
    { ...base, id: 'durable-active', scope: 'durable', status: 'active' },
    { ...base, id: 'once-consumed', scope: 'once', status: 'consumed', consumedBy: 'execution', consumedRevision: 2 },
    { ...base, id: 'durable-revoked', scope: 'durable', status: 'revoked', revokedRevision: 2, revokedReason: 'Fin' },
    { ...base, id: 'scene-active', scope: 'scene', status: 'active', sceneId: 'scene-1' }
  ];
  const raw = { revision: 2, receipts: {}, state: {
    schemaVersion: 3,
    extensions: { v5: { divineAccess: { schemaVersion: 1, grants } } }
  } };
  const decoded = normalizeRemoteDocument(raw);
  const normalized = decoded.state.extensions.v5.divineAccess.grants;
  assert.deepEqual(normalized.slice(0, 4).map(row => row.sceneId), [null, null, null, null]);
  assert.equal(normalized[4].sceneId, 'scene-1');
  assert.throws(() => validateSyncDocument(raw), /Entrée de dérogation divine invalide/);
  const invalidScene = structuredClone(raw);
  invalidScene.state.extensions.v5.divineAccess.grants[4].sceneId = undefined;
  delete invalidScene.state.extensions.v5.divineAccess.grants[4].sceneId;
  assert.throws(() => normalizeRemoteDocument(invalidScene), /Entrée de dérogation divine invalide/);
});
});

describe('accès — codec de synchronisation, contrôle indépendant', () => {
const emptyRoot = { revision: 0, state: {}, receipts: {} };
const stateWithoutRegistry = {
  schemaVersion: 3,
  reserve: [],
  combat: { round: 0, order: [], participants: [] }
};
const doc = state => ({ revision: 0, receipts: {}, state });

test('E05 codec indépendant — root absent ou vide ne crée pas extensions/divineAccess', () => {
  assert.deepEqual(normalizeRemoteDocument(null), emptyRoot);
  assert.deepEqual(normalizeRemoteDocument({}), emptyRoot);
  assert.deepEqual(normalizeRemoteDocument(doc({})), emptyRoot);
  const decoded = normalizeRemoteDocument(doc(stateWithoutRegistry));
  assert.deepEqual(decoded.state, stateWithoutRegistry,
    'un état partagé sans registre n’acquiert aucun accès par normalisation');
  assert.equal(Object.hasOwn(decoded.state, 'extensions'), false);
  const existingV5 = normalizeRemoteDocument(doc({
    ...stateWithoutRegistry,
    extensions: { v5: { turnIndex: 0, unrelated: { keep: true } } }
  }));
  assert.deepEqual(existingV5.state.extensions.v5, { turnIndex: 0, unrelated: { keep: true } },
    'un registre absent reste absent même au milieu d’extensions V5 déjà présentes');
});

test('E3 indépendant — la migration réelle Store initialise un registre vide et préserve les extensions', async () => {
  const old = {
    schemaVersion: 3, reserve: [], diceLines: [], log: [],
    combat: { round: 0, order: [], participants: [] },
    extensions: { v5: { turnIndex: 0, unrelated: { keep: true } } }
  };
  const before = structuredClone(old);
  const migrated = migrateSnapshot(old).data;
  assert.deepEqual(old, before, 'la migration de snapshot ne modifie pas sa source');
  assert.deepEqual(migrated.extensions.v5.divineAccess, { schemaVersion: 1, grants: [] });
  assert.deepEqual(migrated.extensions.v5.unrelated, { keep: true });
  const store = createStore();
  await store.ready;
  await store.loadFromJSON(old);
  const actualStoreSnapshot = JSON.parse(store.getFullJSON());
  assert.deepEqual(actualStoreSnapshot.extensions.v5.divineAccess, { schemaVersion: 1, grants: [] },
    'le chemin réel de chargement Store applique la migration; ce n’est pas une réparation du codec remote');
});

test('E05 codec indépendant — seul le tableau vide omis par RTDB est restauré au registre explicite', () => {
  const raw = doc({
    ...stateWithoutRegistry,
    extensions: { v5: { divineAccess: { schemaVersion: 1 } } }
  });
  const decoded = normalizeRemoteDocument(raw);
  assert.deepEqual(decoded.state.extensions.v5.divineAccess, { schemaVersion: 1, grants: [] });
  assert.throws(() => validateSyncDocument(raw), /Registre de dérogations divines mal formé/,
    'la validation de protocole ordinaire ne doit pas adopter la réparation remote RTDB');
  assert.throws(() => sanitizeMagicEnvelope(raw.state), /Registre de dérogations divines mal formé/,
    'l’import/local sanitation reste strict');
});

test('E05 codec indépendant — formes malformed de registre explicite sont refusées sans les remplacer par un tableau vide', () => {
  const malformed = [
    null,
    [],
    { schemaVersion: 2, grants: [] },
    { schemaVersion: 1, grants: null },
    { schemaVersion: 1, grants: [], unexpected: true },
    { schemaVersion: 1, grants: [{}] }
  ];
  for (const registry of malformed) {
    const raw = doc({
      ...stateWithoutRegistry,
      extensions: { v5: { divineAccess: registry } }
    });
    assert.throws(() => normalizeRemoteDocument(raw), /Registre de dérogations divines mal formé|Entrée de dérogation divine invalide/,
      `la forme invalide ${JSON.stringify(registry)} ne doit pas être réparée`);
  }
});
});
