import test from 'node:test';
import assert from 'node:assert/strict';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };

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
const resolver = async () => (await import('../js/core/v5-divine-access.js')).resolveDivineAccess;
const accessApi = () => import('../js/core/v5-divine-access.js');

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
  const { createStore } = await import('../js/core/store.js');
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
  const blocked = registry.contracts.find(row => row.status === 'blocked');
  assert.ok(blocked, 'le registre conserve un contrat source bloqué comme cas adversarial');
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
  const { migrateSnapshot } = await import('../js/core/migrations.js');
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
  const { getAllDivineContracts } = await import('../js/core/v5-divine-store.js');
  const blocked = getAllDivineContracts().find(row => row.status === 'blocked');
  assert.ok(blocked);
  const store = await divineStore({ access: false, learned: false });
  const grantResult = await store.grantDivineAccess('priest', blocked.id, {
    scope: 'durable', reason: 'Ne doit pas contourner la source', baseRevision: store.getLocalRevision()
  });
  assert.equal(grantResult.ok, false, 'un contrat source bloqué ne peut recevoir une dérogation');
  const forged = structuredClone(battle);
  forged.effects = [{ type: 'characteristic-modifier', characteristic: 'CC', value: 999 }];
  assert.equal(store.previewDivineExecution(forged, prayerInput(45)).ready, false);
});
