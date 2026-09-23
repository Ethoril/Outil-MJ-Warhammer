import { Profile, Participant, DiceLine, uid, cloneValue } from './models.js';
import { sanitizeArray, sanitizeProfile, sanitizeParticipant } from './sanitize.js';
import { migrateSnapshot, migrateLegacyStorage } from './migrations.js';
import { createStateCommand } from './commands.js';
import { createHistory, recordCommand, canUndo as historyCanUndo, canRedo as historyCanRedo, undo as historyUndo, redo as historyRedo, historySnapshot, markExternalBoundary } from './history.js';
import { ORDER_MODES, effectiveOrder, moveInOrder, insertReinforcement, setOrderMode as computeOrderMode, nextTurn as computeNextTurn, removeFromCombat } from './turn-order.js';
import { createEncounter, normalizeEncounter, setEncounterEntry, removeEncounterEntry, duplicateEncounter, launchEncounter, addImprovisedParticipant, suspendScene, resumeScene } from './encounters.js';
import { previewClosure as buildClosurePreview, applyClosure as applySceneClosure, retainArchives, exportArchive as formatArchive } from './closure.js';
import { previewResolution as buildResolutionPreview, applyResolution as applyActionResolution } from './resolution.js';
import { simulateAction, applySimulation as applyActionSimulation, discardSimulation } from './simulation.js';
import { deriveReminders, pendingReminders, resolveReminder } from './reminders.js';
import { createScene, createIntention, createSceneEvent, createSceneClock, proposeSceneEvent, resolveSceneEvent, applySceneEvent, advanceSceneClock } from './scene-events.js';
import { sharedState } from './sync-protocol.js';

export const KEY = { RESERVE: 'wfrp.reserve.v1', COMBAT: 'wfrp.combat.v1', LOG: 'wfrp.log.v1', DICE: 'wfrp.dice.v1', TS: 'wfrp.sync.ts.v1' };

export function createStore({ storage = typeof localStorage !== 'undefined' ? localStorage : null, sync = null, persistence = null, persistenceFactory = null, contextId = 'guest', appVersion = 'unknown', bus = null, now = () => new Date().toLocaleTimeString(), onSyncStatus = null, onLocalStatus = null, onReady = null } = {}) {
  const CLIENT_ID = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : uid();

  let reserve = new Map();
  let combat = { round: 0, currentActorId: null, order: [], participants: new Map() };
  let log = [];
  let diceLines = [];
  let stateExtensions = {};
  let encounters = [];
  let persistentCharacters = [];
  let archives = [];
  let activeScene = null;
  let suspendedScenes = [];
  let reminderChoices = [];
  let lastReminderTransition = {};
  let appliedResolutionIds = [];
  let historyState = createHistory();
  let pendingCommandBefore = null;
  let pendingCommandType = null;
  let orderMode = ORDER_MODES.AUTOMATIC;
  let localRevision = 0;
  let lastRemoteRevision = -1;
  let turnSelectionPending = false;
  let lastAppliedTimestamp = 0;
  let hydrationComplete = !persistence;
  let hydrationFailed = false;
  let persistenceQueue = Promise.resolve();
  // All persistent commands are serialized before they can observe or replace
  // live state.  This is separate from the IDB write queue: a later command
  // must be built from the durable result of the previous one, otherwise a
  // rejected first write could roll back a second command.
  let commandQueue = Promise.resolve();
  let latestPersistenceToken = null;
  let operationSequence = 0;
  let hydrationInFlight = null;
  let importInFlight = null;
  let resolveReady;
  const readyPromise = new Promise(resolve => { resolveReady = resolve; });
  let syncEnabled = !persistence;
  let syncSession = null;
  let syncSessionReady = false;
  let syncSessionStarting = false;
  let syncContextId = null;
  let syncAttachEpoch = 0;
  let pendingProtocolState = false;
  let guestImportCandidate = null;
  let legacyImportCandidate = null;

  let batchDepth = 0;
  let savePending = false;
  const pendingEvents = new Set();

  function parseTimestamp(ts) {
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') {
      const parsed = Date.parse(ts);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  }

  function validateCommandEnvelope(value) {
    const visit = (node, path = '$') => {
      if (typeof node === 'number' && !Number.isFinite(node)) throw new Error(`Valeur numérique invalide dans ${path}`);
      if (Array.isArray(node)) return node.forEach((child, index) => visit(child, `${path}[${index}]`));
      if (node && typeof node === 'object') Object.entries(node).forEach(([key, child]) => visit(child, `${path}.${key}`));
    };
    visit(value);
    if (!value || value.schemaVersion !== 2 || !Array.isArray(value.reserve) || !value.combat || typeof value.combat !== 'object') {
      throw new Error('Enveloppe de commande invalide');
    }
    for (const [index, profile] of value.reserve.entries()) {
      if (!profile || typeof profile.id !== 'string' || !profile.id.trim()) throw new Error(`Profil invalide à reserve[${index}]`);
    }
    const participants = Array.isArray(value.combat.participants) ? value.combat.participants : [];
    for (const [index, participant] of participants.entries()) {
      if (!participant || typeof participant.id !== 'string' || !participant.id.trim()) throw new Error(`Participant invalide à combat.participants[${index}]`);
    }
    if (!Array.isArray(value.log) || !Array.isArray(value.diceLines)) throw new Error('Journal ou lignes de dés invalides');
    return value;
  }

  function emitBus(event, payload) {
    if (batchDepth > 0) {
      if (event === 'combat:update') {
        pendingEvents.add('combat');
      } else {
        pendingEvents.add(event);
      }
    } else {
      if (bus && bus.emit) bus.emit(event, payload);
    }
  }

  function repairMaxHp(list) {
    list.forEach(p => {
      if (p.maxHp === undefined || p.maxHp === null) {
        const prof = p.profileId ? reserve.get(p.profileId) : null;
        p.maxHp = prof ? Number(prof.hp) : Number(p.hp);
      }
    });
    return list;
  }

  const dirtyPaths = new Map();
  let firstFlush = true;

  function markDirty(path, val) {
    dirtyPaths.set(path, val);
  }

  // Le journal ne contient que des objets depuis le lot 10. Les entrées écrites avant
  // sont des chaînes : les accepter en les étiquetant 'legacy' plutôt que les jeter.
  // Appelée depuis load() ET loadFromJSON() — ces deux chemins ont divergé quatre fois.
  function normalizeLogEntries(list) {
    if (!Array.isArray(list)) return [];
    const out = list.map(item => {
      if (typeof item === 'string') return { id: uid(), ts: 0, time: '', kind: 'legacy', text: item };
      return (item && typeof item === 'object') ? item : null;
    }).filter(Boolean);
    if (out.length > 300) out.length = 300;
    return out;
  }

  function cleanupDiceLinesForParticipants(participantIds) {
    const ids = new Set(participantIds);
    const kept = [];
    diceLines.forEach(dl => {
      // Une ligne attachée à un combattant appartient au combat et ne doit pas
      // survivre à son retrait. Les lignes sans participantId sont des jets
      // indépendants (par exemple un d100 du MJ) et restent dans l'affichage.
      if (dl.participantId && ids.has(dl.participantId)) {
        markDirty(`diceLines/${dl.id}`, null);
        return;
      }
      if (dl.targetId && ids.has(dl.targetId)) {
        dl.targetId = null;
        markDirty(`diceLines/${dl.id}`, dl);
      }
      kept.push(dl);
    });
    diceLines = kept;
  }

  let lastSnapshot = null;
  let pendingRestore = null;

  function beginCommand(type = 'state-change') {
    // The legacy localStorage façade keeps its historical snapshot/undo
    // behavior. Structured command history is produced by executeCommand;
    // direct legacy mutators must not make every old UI keystroke undoable.
    if (persistence && pendingCommandBefore === null && canMutate()) {
      pendingCommandBefore = JSON.parse(JSON.stringify(currentEnvelope()));
      delete pendingCommandBefore.history;
      pendingCommandType = type;
    }
  }

  function commitPendingCommand() {
    if (!pendingCommandBefore) return;
    const before = pendingCommandBefore;
    const after = JSON.parse(JSON.stringify(currentEnvelope()));
    delete after.history;
    localRevision++;
    after.localRevision = localRevision;
    try {
      historyState = recordCommand(historyState, createStateCommand({
        id: `${CLIENT_ID}:command:${localRevision}`,
        type: pendingCommandType || 'state-change',
        before,
        after,
        baseRevision: localRevision - 1
      }));
    } finally {
      pendingCommandBefore = null;
      pendingCommandType = null;
    }
  }

  function recordSnapshot(reason = 'manual') {
    if (!persistence) beginCommand(reason);
    // Tout est cloné en profondeur, y compris la réserve et les participants.
    // Array.from(map.values()) ne rendrait que des références vivantes : une modification
    // en place postérieure à l'instantané (Object.assign dans updateProfile ou
    // updateParticipant) le contaminerait, et undo() restaurerait un état incohérent —
    // les éléments supprimés reviendraient, mais les champs modifiés depuis resteraient.
    lastSnapshot = JSON.parse(JSON.stringify({
      timestamp: new Date().toISOString(),
      reserve: Array.from(reserve.values()),
      combat: {
        round: combat.round,
        currentActorId: combat.currentActorId,
        order: combat.order,
        participants: Array.from(combat.participants.values())
      },
      log,
      diceLines,
      extensions: stateExtensions
    }));
    if (persistence) pendingRestore = { id: uid(), reason, state: lastSnapshot };
  }

  function applyDataToState(data, { includeLog = false, includeHistory = true } = {}) {
    stateExtensions = data.extensions && typeof data.extensions === 'object' && !Array.isArray(data.extensions)
      ? JSON.parse(JSON.stringify(data.extensions)) : {};
    encounters = Array.isArray(data.encounters) ? cloneValue(data.encounters) : [];
    persistentCharacters = Array.isArray(data.persistentCharacters) ? cloneValue(data.persistentCharacters) : [];
    archives = Array.isArray(data.archives) ? cloneValue(data.archives) : [];
    activeScene = data.activeScene && typeof data.activeScene === 'object' ? cloneValue(data.activeScene) : null;
    suspendedScenes = Array.isArray(data.suspendedScenes) ? cloneValue(data.suspendedScenes) : [];
    reminderChoices = Array.isArray(data.reminderChoices) ? cloneValue(data.reminderChoices) : [];
    appliedResolutionIds = Array.isArray(data.appliedResolutionIds) ? [...data.appliedResolutionIds] : [];
    pendingProtocolState = Boolean(data.syncPending);
    localRevision = Number.isInteger(data.localRevision) && data.localRevision >= 0 ? data.localRevision : localRevision;
    if (includeHistory) historyState = data.history ? historySnapshot(data.history) : createHistory();
    orderMode = data.combat?.meta?.orderMode || data.combat?.orderMode || ORDER_MODES.AUTOMATIC;
    const rawReserve = sanitizeArray(data.reserve);
    const validProfiles = rawReserve.map(sanitizeProfile).filter(Boolean);
    if (rawReserve.length !== validProfiles.length)
      console.warn(`[Sync] ${rawReserve.length - validProfiles.length} profil(s) rejeté(s) (schéma invalide)`);
    reserve = new Map(validProfiles.map(o => [o.id, new Profile(o)]));

    const c = data.combat || {};
    const meta = c.meta || c;
    combat.round = Number(meta.round) || 0;

    const rawParts = sanitizeArray(c.participants);
    const validParts = repairMaxHp(rawParts.map(sanitizeParticipant).filter(Boolean));
    combat.participants = new Map(validParts.map(p => [p.id, new Participant(p)]));

    const validIds = new Set(combat.participants.keys());
    const rawOrder = sanitizeArray(meta.order || c.order).filter(id => typeof id === 'string' && validIds.has(id));
    combat.order = rawOrder;

    if (meta.currentActorId !== undefined || c.currentActorId !== undefined) {
      const cur = meta.currentActorId !== undefined ? meta.currentActorId : c.currentActorId;
      combat.currentActorId = (typeof cur === 'string' && validIds.has(cur)) ? cur : null;
    } else if (c.turnIndex !== undefined && Number(c.turnIndex) >= 0 && Number(c.turnIndex) < rawOrder.length) {
      combat.currentActorId = rawOrder[Number(c.turnIndex)] || null;
    } else {
      combat.currentActorId = null;
    }

    // Older snapshots stored the newly introduced scene and combat projections
    // independently. Rehydrate either side from the populated projection so a
    // reload cannot drop persistent-character links or live HP changes.
    if (activeScene && activeScene.status === 'active') {
      const sceneParticipants = Array.isArray(activeScene.participants) ? activeScene.participants : [];
      if (combat.participants.size === 0 && sceneParticipants.length) {
        combat.round = Number(activeScene.round) || 0;
        combat.currentActorId = activeScene.currentActorId || null;
        combat.order = Array.isArray(activeScene.order) ? [...activeScene.order] : [];
        const restored = repairMaxHp(sceneParticipants.map(sanitizeParticipant).filter(Boolean));
        combat.participants = new Map(restored.map(p => [p.id, new Participant(p)]));
      } else if (combat.participants.size && sceneParticipants.length === 0) {
        activeScene = { ...activeScene, round: combat.round, currentActorId: combat.currentActorId, order: [...combat.order], participants: cloneValue(Array.from(combat.participants.values())) };
      }
    }

    if (includeLog) log = normalizeLogEntries(data.log);
    // Le journal ne provient PLUS de Firebase (Lot 9.2) — local uniquement
    diceLines = sanitizeArray(data.diceLines).map(x => new DiceLine(x));
  }

  const pendingSync = new Map();
  let syncTimer = null;
  let syncInFlight = false;
  let syncRetryDelay = 300;

  function reportSyncStatus(status) {
    if (typeof onSyncStatus === 'function') onSyncStatus(status);
  }

  function reportLocalStatus(status) {
    if (typeof onLocalStatus === 'function') onLocalStatus(status);
  }

  function canMutate() {
    return !importInFlight && (!persistence || (hydrationComplete && !hydrationFailed));
  }

  function mergePathUpdates(target, incoming) {
    for (const [path, value] of Object.entries(incoming)) {
      // Un remplacement/suppression d'un parent rend obsolètes ses enfants.
      for (const existingPath of target.keys()) {
        if (existingPath === path || existingPath.startsWith(`${path}/`)) target.delete(existingPath);
      }
      // Si le parent est déjà en file, intégrer le dernier enfant dans sa
      // valeur évite d'envoyer deux chemins qui se recouvrent à Firebase.
      const parentPath = [...target.keys()].find(existingPath => path.startsWith(`${existingPath}/`));
      if (parentPath) {
        const parentValue = target.get(parentPath);
        const mergedParent = parentValue && typeof parentValue === 'object'
          ? JSON.parse(JSON.stringify(parentValue)) : {};
        let cursor = mergedParent;
        const segments = path.slice(parentPath.length + 1).split('/');
        segments.forEach((segment, index) => {
          if (index === segments.length - 1) cursor[segment] = JSON.parse(JSON.stringify(value));
          else {
            if (!cursor[segment] || typeof cursor[segment] !== 'object') cursor[segment] = {};
            cursor = cursor[segment];
          }
        });
        target.set(parentPath, mergedParent);
        continue;
      }
      target.set(path, value === undefined ? value : JSON.parse(JSON.stringify(value)));
    }
  }

  function scheduleSync(delay = 300) {
    if (syncTimer || syncInFlight || pendingSync.size === 0) return;
    syncTimer = setTimeout(() => {
      syncTimer = null;
      flushSync();
    }, delay);
  }

  function flushSync() {
    if (syncInFlight || pendingSync.size === 0 || !(sync && sync.dbRef)) return;
    const batch = new Map([...pendingSync].map(([path, value]) => [path, value === undefined ? value : JSON.parse(JSON.stringify(value))]));
    pendingSync.clear();
    syncInFlight = true;
    reportSyncStatus('sending');
    const updates = Object.fromEntries(batch);
    let write;
    try {
      if (sync.update) write = sync.update(sync.dbRef, updates);
      else if (sync.set) write = sync.set(sync.dbRef, updates);
      else write = Promise.resolve();
    } catch (error) {
      write = Promise.reject(error);
    }
    Promise.resolve(write).then(() => {
      syncInFlight = false;
      syncRetryDelay = 300;
      reportSyncStatus(pendingSync.size > 0 ? 'pending' : 'synced');
      scheduleSync();
    }).catch(error => {
      console.error('❌ Erreur sync → Firebase:', error);
      // Les modifications arrivées pendant l'envoi restent prioritaires en cas
      // de chevauchement ; le lot échoué est remis avant leurs chemins.
      const retry = new Map(batch);
      mergePathUpdates(retry, Object.fromEntries(pendingSync));
      pendingSync.clear();
      mergePathUpdates(pendingSync, Object.fromEntries(retry));
      syncInFlight = false;
      reportSyncStatus('error');
      scheduleSync(syncRetryDelay);
      syncRetryDelay = Math.min(syncRetryDelay * 2, 10000);
    });
  }

  function enqueueSync(updates) {
    if (!syncEnabled || !sync || !sync.dbRef) return;
    mergePathUpdates(pendingSync, updates);
    reportSyncStatus('pending');
    scheduleSync();
  }

  function currentEnvelope() {
    // Combat remains the canonical live editing surface.  When an active scene
    // exists, mirror its participant snapshot before serialising so legacy and
    // persistent stores cannot diverge after a direct combat mutation.
    if (activeScene && activeScene.status === 'active') {
      activeScene = {
        ...activeScene,
        round: combat.round,
        currentActorId: combat.currentActorId,
        order: [...combat.order],
        participants: cloneValue(Array.from(combat.participants.values()))
      };
    }
    return {
      schemaVersion: 2,
      appVersion,
      exportedAt: new Date().toISOString(),
      contextId,
      reserve: Array.from(reserve.values()),
      combat: {
        round: combat.round,
        currentActorId: combat.currentActorId,
        order: combat.order,
        orderMode,
        participants: Array.from(combat.participants.values())
      },
      log,
      diceLines,
      history: historyState,
      localRevision,
      encounters: cloneValue(encounters),
      persistentCharacters: cloneValue(persistentCharacters),
      archives: cloneValue(archives),
      ...(activeScene ? { activeScene: cloneValue(activeScene) } : {}),
      ...(suspendedScenes.length ? { suspendedScenes: cloneValue(suspendedScenes) } : {}),
      ...(reminderChoices.length ? { reminderChoices: cloneValue(reminderChoices) } : {}),
      ...(appliedResolutionIds.length ? { appliedResolutionIds: [...appliedResolutionIds] } : {}),
      ...(pendingProtocolState ? { syncPending: true } : {}),
      ...(Object.keys(stateExtensions).length ? { extensions: stateExtensions } : {})
    };
  }

  function restoreSourcePreview(record) {
    if (!record || typeof record !== 'object') throw new Error('Point de restauration invalide');
    const source = record.state;
    let migrated;
    if (source && source.format === 'legacy-localStorage' && source.keys && typeof source.keys === 'object') {
      const legacyStorage = {
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(source.keys, key) ? source.keys[key] : null;
        }
      };
      migrated = migrateLegacyStorage(legacyStorage, { appVersion, contextId });
    } else {
      migrated = migrateSnapshot(source, { appVersion, contextId });
    }
    const data = migrated.data;
    const incomingProfileIds = new Set(data.reserve.map(profile => profile.id));
    const incomingParticipantIds = new Set(data.combat.participants.map(participant => participant.id));
    return {
      id: record.id,
      contextId: record.contextId,
      createdAt: record.createdAt,
      reason: record.reason || 'manual',
      sourceFormat: source?.format || 'snapshot-v2',
      data,
      report: migrated.report,
      counts: {
        profiles: data.reserve.length,
        participants: data.combat.participants.length,
        rejected: migrated.report.rejected.length,
        repaired: migrated.report.repaired.length,
        replacedProfiles: [...reserve.keys()].filter(id => incomingProfileIds.has(id)).length,
        replacedParticipants: [...combat.participants.keys()].filter(id => incomingParticipantIds.has(id)).length
      }
    };
  }

  // History commands describe editable shared state.  The journal and other
  // device-local choices continue evolving while a command is in the undo
  // stack, so replaying an older snapshot must not resurrect an old journal.
  function preserveLocalStateDuringHistory(state) {
    const current = currentEnvelope();
    return {
      ...state,
      // The journal is appended by independent local events and is therefore
      // intentionally outside command undo/redo. Other collections remain in
      // the snapshot because commands such as closure and reminder decisions
      // must be reversible.
      log: cloneValue(current.log)
    };
  }

  function resolutionLogEntry(preview, resolution) {
    const input = preview?.input || {};
    const actor = input.actor || {};
    const target = input.target || {};
    const actionType = preview?.actionType || input.action?.type || 'action';
    const targetLabel = target.name || preview?.targetId || 'cible';
    const outcome = preview?.success ? 'réussite' : 'échec';
    return {
      id: uid(), ts: Date.now(), kind: 'resolution',
      actorId: actor.id || input.actorId || null,
      targetId: target.id || preview?.targetId || null,
      actorName: actor.name || null, targetName: target.name || null,
      text: `${actionType} — ${outcome} sur ${targetLabel} (d100 ${preview?.roll ?? '?'})`,
      detail: {
        resolutionId: preview?.resolutionId || null,
        actionType,
        roll: preview?.roll ?? null,
        targetScore: preview?.score?.target ?? null,
        sl: preview?.sl ?? null,
        damage: preview?.damage || null,
        critical: preview?.critical || null,
        fumble: preview?.fumble || null,
        application: resolution?.application || null
      }
    };
  }

  function sameValue(left, right) {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  }

  function hasSharedStateChange(before, after) {
    return !sameValue(sharedState(before || {}), sharedState(after || {}));
  }

  function mirrorSceneToCombat(state, scene) {
    const participants = Array.isArray(scene?.participants) ? cloneValue(scene.participants) : [];
    const ids = new Set(participants.map(item => item?.id).filter(Boolean));
    const order = (Array.isArray(scene?.order) ? scene.order : []).filter(id => ids.has(id));
    return {
      ...state,
      combat: {
        ...(state.combat || {}),
        round: Number(scene?.round) || 0,
        currentActorId: ids.has(scene?.currentActorId) ? scene.currentActorId : null,
        order,
        participants
      }
    };
  }

  function mirrorCombatToScene(state, scene, revision = null) {
    if (!scene) return state;
    const nextScene = {
      ...cloneValue(scene),
      round: Number(state.combat?.round) || 0,
      currentActorId: state.combat?.currentActorId || null,
      order: Array.isArray(state.combat?.order) ? [...state.combat.order] : [],
      participants: cloneValue(state.combat?.participants || [])
    };
    if (Number.isInteger(revision)) nextScene.revision = revision;
    return { ...state, activeScene: nextScene };
  }

  /** Keep the scene and combat projections coherent at every command boundary. */
  function synchronizeSceneCombat(before, next, revision, intent = {}) {
    if (!next?.activeScene) {
      // Closing or suspending a scene also clears the old combat projection.
      if (before?.activeScene && !next.activeScene) {
        return { ...next, combat: { ...(next.combat || {}), round: 0, currentActorId: null, order: [], participants: [] } };
      }
      return next;
    }
    const sceneChanged = !sameValue(before?.activeScene, next.activeScene);
    const combatChanged = !sameValue(before?.combat, next.combat);
    if (!sceneChanged && !combatChanged) return next;
    // A command that edits the scene explicitly wins.  Combat actions then
    // mirror back into the scene, preserving the same participant objects.
    // Commands are allowed to touch both projections because hydration and
    // migration add canonical fields to each one.  Preserve the projection
    // the mutator actually edited instead of letting those derived fields
    // make combat overwrite an explicit scene consequence.
    const sceneRequested = intent.sceneRequested ?? sceneChanged;
    const combatRequested = intent.combatRequested ?? combatChanged;
    let result = sceneChanged && (!combatChanged || (sceneRequested && !combatRequested))
      ? mirrorSceneToCombat(next, next.activeScene)
      : mirrorCombatToScene(next, next.activeScene, revision);
    if (sceneChanged && combatChanged && next.activeScene?.status === 'active' && sceneRequested && combatRequested) {
      // Launch/add-improvised mutations intentionally originate in the scene;
      // regular combat mutations originate in combat.  A complete scene shape
      // with participants is the safe source for a newly created scene.
      const wasAbsent = !before?.activeScene;
      const wasSuspendedResume = before?.activeScene?.status === 'suspended';
      result = (wasAbsent || wasSuspendedResume) ? mirrorSceneToCombat(next, next.activeScene) : result;
    }
    return result;
  }

  function publishRevisionedStateIfNeeded(sharedChanged) {
    if (!sharedChanged || !syncSession || !syncSessionReady) return Promise.resolve(null);
    pendingProtocolState = false;
    const state = currentEnvelope();
    return syncSession.enqueue({ state, localState: state })
      .then(() => syncSession.flush({ localState: currentEnvelope() }))
      .catch(error => { reportSyncStatus('error'); return { ok: false, error }; });
  }

  function queuePersistenceSave(updates = {}, restore = null, stateOverride = null, { includeOperation = true } = {}) {
    if (!persistence) return;
    const operationEntries = includeOperation && Object.keys(updates).length ? [{
      operationId: `${CLIENT_ID}:${++operationSequence}`,
      sequence: operationSequence,
      createdAt: Date.now(),
      updates: JSON.parse(JSON.stringify(updates))
    }] : [];
    // Le clic utilisateur et l’exécution IDB sont séparés par une file : les
    // références vivantes doivent donc être clonées avant d’attendre, sinon
    // une modification suivante contaminerait la transaction en vol.
    const state = JSON.parse(JSON.stringify(stateOverride || currentEnvelope()));
    const restoreCopy = restore ? {
      id: restore.id || uid(),
      reason: restore.reason || 'manual',
      state: JSON.parse(JSON.stringify(restore.state))
    } : null;
    const token = {};
    latestPersistenceToken = token;
    reportLocalStatus('saving');
    persistenceQueue = persistenceQueue
      .then(() => persistence.saveAtomic({ state, operations: operationEntries, restore: restoreCopy }))
      .then(() => {
        if (latestPersistenceToken === token) reportLocalStatus('saved');
        return { ok: true };
      })
      .catch(error => {
        console.error('❌ Erreur de sauvegarde IndexedDB:', error);
        if (latestPersistenceToken === token) reportLocalStatus('error');
        return { ok: false, error };
      });
    return persistenceQueue;
  }

  function persistLocal({ updates = {}, restore = null, includeOperation = true } = {}) {
    const rObj = Array.from(reserve.values());
    const cObj = {
      round: combat.round,
      currentActorId: combat.currentActorId,
      order: combat.order,
      participants: Array.from(combat.participants.values())
    };

    if (persistence) {
      return queuePersistenceSave(updates, restore, null, { includeOperation });
    } else if (storage) {
      try {
        storage.setItem(KEY.RESERVE, JSON.stringify(rObj));
        storage.setItem(KEY.COMBAT, JSON.stringify(cObj));
        storage.setItem(KEY.LOG, JSON.stringify(log));
        storage.setItem(KEY.DICE, JSON.stringify(diceLines));
        if (lastAppliedTimestamp) {
          storage.setItem(KEY.TS, String(lastAppliedTimestamp));
        }
        reportLocalStatus('saved');
      } catch (e) {
        console.error('❌ Erreur de sauvegarde localStorage:', e);
        reportLocalStatus('error');
        // Entrée normalisée, pas une chaîne brute : depuis le lot 10 le journal ne contient
        // que des objets, et une chaîne insérée ici ne serait pas rendue — l'avertissement
        // deviendrait invisible précisément quand il compte.
        log.unshift({
          id: uid(), ts: Date.now(), time: now(), kind: 'management',
          actorId: null, targetId: null,
          text: '⚠️ Erreur de sauvegarde locale (quota dépassé ?)', detail: null
        });
        if (log.length > 300) log.length = 300;
      }
    }

    return { ok: true, rObj, cObj };
  }

  function save(fullSync = false) {
    if (batchDepth > 0) {
      savePending = true;
      return;
    }
    if (persistence && !hydrationComplete) {
      savePending = true;
      return Promise.resolve({ ok: false, error: new Error('Persistance encore en cours') });
    }
    if (persistence && hydrationFailed) {
      return Promise.resolve({ ok: false, error: new Error('Persistance en mode récupération') });
    }

    // Le journal et les autres données locales ne doivent pas créer un faux
    // état partagé. Une sauvegarde sans modification de données partagées ne
    // fait donc aucun envoi.
    if (!fullSync && dirtyPaths.size === 0) {
      return persistLocal();
    }

    const ts = Date.now();
    lastAppliedTimestamp = ts;

    const updates = {};
    updates['writer'] = CLIENT_ID;
    updates['timestamp'] = ts;

    if (firstFlush) {
      updates['log'] = null; // Purge du nœud log vestige (§9.2)
      firstFlush = false;
    }

    // Sans update(), les clés à chemin ('reserve/xxx') seraient invalides dans un set() :
    // on retombe alors sur l'instantané complet, c'est-à-dire le comportement d'avant le lot 9.
    const peutEcrireParChemin = !!(sync && sync.update);

    // Ne PAS retomber sur l'instantané complet quand rien n'est marqué : Store.log() sauvegarde
    // sans rien salir, et le journal n'est plus synchronisé. Un lot vide ne doit donc pousser
    // que writer et timestamp, qui suffisent à garder l'arbitrage cohérent.
    if (fullSync || !peutEcrireParChemin) {
      const reserveMap = {};
      reserve.forEach((p, id) => { reserveMap[id] = p; });
      updates['reserve'] = reserveMap;

      const partMap = {};
      combat.participants.forEach((p, id) => { partMap[id] = p; });
      updates['combat'] = {
        meta: { round: combat.round, currentActorId: combat.currentActorId, order: combat.order },
        participants: partMap
      };

      const diceMap = {};
      diceLines.forEach(dl => { diceMap[dl.id] = dl; });
      updates['diceLines'] = diceMap;
    } else {
      for (const [path, val] of dirtyPaths.entries()) {
        updates[path] = val;
      }
    }

    const restore = pendingRestore;
    pendingRestore = null;
    dirtyPaths.clear();
    // Include history in the same envelope as the mutation and outbox entry.
    // The persistence queue therefore observes one coherent command boundary.
    commitPendingCommand();
    const protocolReady = Boolean(syncSession && syncSessionReady);
    const persisted = persistLocal({
      updates,
      restore,
      includeOperation: !protocolReady && !(persistence && syncSession)
    });
    if (persistence && persisted?.then && restore) {
      persisted.then(result => {
        if (!result?.ok && !pendingRestore) pendingRestore = restore;
      });
    }
    const hasSharedChange = Object.keys(updates).some(key => key !== 'writer' && key !== 'timestamp');
    if (persistence && syncSession && !protocolReady && hasSharedChange) {
      // A click may happen while account reconciliation is still opening. Do
      // not emit a legacy path update; replay the captured local envelope as
      // one v2 operation once the session is ready.
      pendingProtocolState = true;
    }
    if (protocolReady) {
      const protocolState = currentEnvelope();
      return Promise.resolve(persisted).then(result => {
        if (result?.ok === false) return result;
        return syncSession.enqueue({ state: protocolState, localState: protocolState })
          // A successful local commit must enter the remote queue without
          // waiting for another user action; flush itself remains serialized
          // and will retain the outbox when the network is unavailable.
          .then(() => syncSession.flush({ localState: currentEnvelope() }))
          .then(() => result);
      }).catch(error => {
        reportSyncStatus('error');
        return { ok: false, error };
      });
    }
    if (persistence && syncSession) return persisted;
    enqueueSync(updates);
    return persisted;
  }

  function load() {
    if (!storage) return;
    try {
      const r = JSON.parse(storage.getItem(KEY.RESERVE) || '[]');
      reserve = new Map(r.map(o => [o.id, new Profile(o)]));
      const c = JSON.parse(storage.getItem(KEY.COMBAT) || 'null');
      if (c) {
        combat.round = c.round || 0;
        combat.order = Array.isArray(c.order) ? c.order : [];
        const validParts = repairMaxHp((c.participants || []).map(sanitizeParticipant).filter(Boolean));
        combat.participants = new Map(validParts.map(p => [p.id, new Participant(p)]));

        const validIds = new Set(combat.participants.keys());
        if (c.currentActorId !== undefined) {
          combat.currentActorId = (typeof c.currentActorId === 'string' && validIds.has(c.currentActorId)) ? c.currentActorId : null;
        } else if (c.turnIndex !== undefined && Number(c.turnIndex) >= 0 && Number(c.turnIndex) < combat.order.length) {
          const migrated = combat.order[Number(c.turnIndex)];
          combat.currentActorId = validIds.has(migrated) ? migrated : null;
        } else {
          combat.currentActorId = null;
        }

        let repairedCount = 0;
        combat.participants.forEach(p => {
          if ((!p.caracs || Object.keys(p.caracs).length === 0) && p.profileId) {
            const prof = reserve.get(p.profileId);
            if (prof && prof.caracs) {
              p.caracs = { ...prof.caracs };
              repairedCount++;
            }
          }
        });
        if (repairedCount > 0) {
          console.log(`[Auto-Repair] ${repairedCount} combattants réparés.`);
          save();
        }
      }
      log = normalizeLogEntries(JSON.parse(storage.getItem(KEY.LOG) || '[]'));
      const d = JSON.parse(storage.getItem(KEY.DICE) || '[]');
      diceLines = (Array.isArray(d) ? d : []).map(x => new DiceLine(x));
      lastAppliedTimestamp = Number(storage.getItem(KEY.TS) || '0') || 0;
      // Lecture complete du stockage : l’état local initial est confirmé.
      // Une écriture ultérieure en quota dépassé repassera explicitement en erreur.
      reportLocalStatus('saved');
    } catch (e) {
      console.warn('Load error', e);
      reportLocalStatus('error');
    }
  }

  function setOrderByInitiative() {
    const arr = Array.from(combat.participants.values());
    arr.sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));
    combat.order = arr.map(p => p.id);
  }

  function effectiveCombatOrder() {
    return effectiveOrder(Array.from(combat.participants.values()), {
      mode: orderMode,
      order: combat.order
    });
  }

  const api = {
    executeCommand(type, mutator, { restore = null, recordHistory = true } = {}) {
      if (!canMutate()) throw new Error('Store non prêt');
      if (typeof mutator !== 'function') throw new TypeError('Mutateur de commande requis');
      const run = () => {
        // Build every value from a clone.  In the persistent path this function
        // does not mutate the live Store until IDB has committed the candidate.
        const fullBefore = JSON.parse(JSON.stringify(currentEnvelope()));
        const before = JSON.parse(JSON.stringify(fullBefore));
        delete before.history;
        const draft = JSON.parse(JSON.stringify(before));
        let next;
        try {
          next = mutator(draft);
        } catch (error) {
          throw error;
        }
        if (next === undefined) throw new Error('La commande n’a produit aucun état');
        validateCommandEnvelope(next);
        // Canonicalize through the same migration/sanitize pipeline used by
        // hydration.  The exact canonical value is what both IDB and the live
        // Store receive, while the strict check above prevents NaN/future data
        // from being silently repaired during a command.
        const sceneRequested = !sameValue(before?.activeScene, next?.activeScene);
        const combatRequested = !sameValue(before?.combat, next?.combat);
        let canonical = migrateSnapshot(next, { appVersion, contextId }).data;
        canonical = synchronizeSceneCombat(before, canonical, localRevision + 1, { sceneRequested, combatRequested });
        // A scene revision is the CAS token used by closure previews.  Keep it
        // monotone with the command revision so a stale preview cannot be
        // silently regenerated over a live combat edit.
        if (canonical.activeScene && canonical.activeScene.status === 'active'
          && (!sameValue(before.activeScene, canonical.activeScene) || !sameValue(before.combat, canonical.combat))) {
          canonical.activeScene.revision = localRevision + 1;
        }
        canonical = { ...canonical, syncPending: pendingProtocolState };
        validateCommandEnvelope(canonical);
        const after = JSON.parse(JSON.stringify(canonical));
        delete after.history;
        const baseRevision = localRevision;
        const nextRevision = recordHistory ? baseRevision + 1 : baseRevision;
        after.localRevision = nextRevision;
        // Journal mutations are local durable data, but they are not undoable
        // state commands.  Keeping them outside the structured history means a
        // profile edit followed by a log entry still undoes the profile edit in
        // one gesture, and a local log never consumes a shared revision.
        const nextHistory = recordHistory
          ? recordCommand(historyState, createStateCommand({
            id: `${CLIENT_ID}:command:${nextRevision}`,
            type,
            baseRevision,
            before,
            after
          }))
          : historyState;
        const protocolReady = Boolean(syncSession && syncSessionReady);
        const remoteNeeded = recordHistory && (hasSharedStateChange(before, after) || pendingProtocolState);
        const markPending = !protocolReady && Boolean(syncSession) && hasSharedStateChange(before, after);
        const operationQueued = protocolReady && remoteNeeded;
        const persistedState = { ...after, history: nextHistory, syncPending: pendingProtocolState || markPending };
        // A restore point may be supplied as a factory so queued commands
        // snapshot the state immediately before their own commit, rather than
        // the state observed when the caller first requested the restore.
        const restoreForCommit = typeof restore === 'function'
          ? restore({ before: JSON.parse(JSON.stringify(fullBefore)), after: JSON.parse(JSON.stringify(after)) })
          : restore;
        if (persistence) {
          const durable = protocolReady && remoteNeeded
            // sync-session.enqueue writes state, outbox operation and session
            // in one IDB transaction.  This is the only safe ordering for an
            // account command: a crash cannot leave state without its v2 op.
            ? syncSession.enqueue({ state: persistedState, localState: persistedState, restore: restoreForCommit })
            : queuePersistenceSave({}, restoreForCommit, persistedState, { includeOperation: false });
          return Promise.resolve(durable)
            .then(result => {
              if (result?.ok === false) return result;
              historyState = nextHistory;
              localRevision = nextRevision;
              pendingProtocolState = Boolean(persistedState.syncPending);
              applyDataToState(after, { includeLog: true, includeHistory: false });
              emitBus('reserve'); emitBus('combat'); emitBus('log');
              if (!protocolReady) {
                // The v2 session may still be opening (or offline).  Keep a
                // durable replay marker so reconciliation cannot adopt a
                // remote empty root over this local command.
                if (syncSession) pendingProtocolState = Boolean(persistedState.syncPending);
                return result;
              }
              // Local-only commands (journal/history) are durable but never
              // become remote operations. A pending pre-handshake state is
              // published once, then its local marker is cleared.
              pendingProtocolState = false;
              if (remoteNeeded && !operationQueued) {
                syncSession.enqueue({ state: currentEnvelope(), localState: currentEnvelope() })
                  .then(() => syncSession.flush({ localState: currentEnvelope() }))
                  .catch(() => reportSyncStatus('error'));
              } else if (operationQueued) {
                syncSession.flush({ localState: currentEnvelope() }).catch(() => reportSyncStatus('error'));
              } else {
                queuePersistenceSave({}, null, { ...currentEnvelope(), syncPending: false }, { includeOperation: false });
              }
              // Flushing is deliberately detached from the command promise:
              // a slow/offline network must not serialize or block the next
              // local command after its IDB transaction has committed.
              return result;
            });
        }

        // The localStorage compatibility path is intentionally synchronous for
        // the historical E02 tests.  It still applies only after command
        // validation, and save failures are reported by the legacy adapter.
        const previousHistory = historyState;
        try {
          historyState = nextHistory;
          localRevision = nextRevision;
          applyDataToState(after, { includeLog: true, includeHistory: false });
          const persisted = save(true);
          emitBus('reserve'); emitBus('combat'); emitBus('log');
          return persisted;
        } catch (error) {
          historyState = previousHistory;
          localRevision = baseRevision;
          throw error;
        }
      };

      if (!persistence) return run();
      const task = commandQueue.then(run);
      commandQueue = task.catch(() => {});
      return task;
    },
    batch(fn) {
      batchDepth++;
      try {
        fn();
      } finally {
        batchDepth--;
        if (batchDepth === 0) {
          if (savePending) {
            savePending = false;
            save();
          }
          const events = Array.from(pendingEvents);
          pendingEvents.clear();
          if (bus && bus.emit) events.forEach(e => bus.emit(e));
        }
      }
    },

    addProfile(p) {
      if (!canMutate()) return false;
      if (persistence) {
        const captured = JSON.parse(JSON.stringify(p));
        return api.executeCommand('add-profile', draft => ({ ...draft, reserve: [...(draft.reserve || []), captured] }));
      }
      beginCommand('add-profile');
      reserve.set(p.id, p);
      markDirty(`reserve/${p.id}`, p);
      save();
      emitBus('reserve');
    },
    updateProfile(id, patch, { propagate = false } = {}) {
      if (!canMutate()) return false;
      const p = reserve.get(id); if (!p) return;
      if (persistence) {
        const capturedPatch = JSON.parse(JSON.stringify(patch || {}));
        return api.executeCommand('update-profile', draft => {
        const profiles = (draft.reserve || []).map(item => item.id === id ? { ...item, ...capturedPatch } : item);
        const participants = propagate ? (draft.combat?.participants || []).map(item => item.profileId !== id ? item : {
          ...item,
          name: capturedPatch.name ?? item.name,
          kind: capturedPatch.kind ?? item.kind,
          initiative: capturedPatch.initiative ?? item.initiative,
          maxHp: capturedPatch.hp ?? item.maxHp,
          ...(capturedPatch.caracs ? { caracs: cloneValue(capturedPatch.caracs) } : {}),
          ...(capturedPatch.armor ? { armor: cloneValue(capturedPatch.armor) } : {}),
          ...(capturedPatch.actions ? { actions: cloneValue(capturedPatch.actions) } : {})
        }) : draft.combat?.participants;
        return { ...draft, reserve: profiles, ...(propagate ? { combat: { ...draft.combat, participants } } : {}) };
        });
      }
      beginCommand('update-profile');
      Object.assign(p, patch);
      markDirty(`reserve/${id}`, p);
      // Profiles are reusable templates; active participant copies are frozen
      // at import/launch time. Propagation is available only through the
      // explicit third argument and is never inferred from profile updates.
      if (propagate) {
        for (const part of combat.participants.values()) if (part.profileId === id) {
          Object.assign(part, { name: patch.name ?? part.name, kind: patch.kind ?? part.kind, initiative: patch.initiative ?? part.initiative, maxHp: patch.hp ?? part.maxHp });
          if (patch.caracs) part.caracs = cloneValue(patch.caracs);
          if (patch.armor) part.armor = cloneValue(patch.armor);
          markDirty(`combat/participants/${part.id}`, part);
        }
      }
      save(); emitBus('reserve'); if (propagate) emitBus('combat');
    },
    removeProfile(id) {
      if (!canMutate()) return false;
      if (!reserve.has(id)) return;
      if (persistence) return api.executeCommand('remove-profile', draft => ({ ...draft, reserve: (draft.reserve || []).filter(item => item.id !== id) }));
      beginCommand('remove-profile');
      recordSnapshot('delete-profile');
      reserve.delete(id); markDirty(`reserve/${id}`, null); save(); emitBus('reserve');
    },
    clearReserve() {
      if (!canMutate()) return false;
      if (persistence) return api.executeCommand('clear-reserve', draft => ({
        ...draft,
        reserve: [],
        log: [{ id: uid(), ts: Date.now(), kind: 'management', text: `Réserve: supprimé ${(draft.reserve || []).length} profil(s)` }, ...(draft.log || [])].slice(0, 300)
      }));
      beginCommand('clear-reserve');
      recordSnapshot('clear-reserve');
      const count = reserve.size; reserve.clear(); markDirty('reserve', null); save(); emitBus('reserve');
      this.log(`Réserve: supprimé ${count} profil(s)`);
    },
    duplicateProfile(id) {
      const p = reserve.get(id); if (!p) return;
      let baseName = p.name; const match = p.name.match(/^(.*?)(\s\d+)?$/); if (match && match[2]) baseName = match[1];
      let maxNum = 0;
      for (const other of reserve.values()) {
        if (other.name === baseName) maxNum = Math.max(maxNum, 1);
        else if (other.name.startsWith(baseName + " ")) { const s = other.name.substring(baseName.length + 1); if (!isNaN(s)) maxNum = Math.max(maxNum, parseInt(s)); }
      }
      const newProfile = new Profile({ ...p, id: uid(), name: `${baseName} ${maxNum + 1}`, armor: { ...p.armor }, caracs: { ...p.caracs }, diceLines: p.diceLines });
      this.addProfile(newProfile);
    },
    listProfiles() { return Array.from(reserve.values()); },
    getProfile(id) { return reserve.get(id) || null; },

    addParticipant(p) {
      if (!canMutate()) return false;
      if (persistence) {
        const captured = JSON.parse(JSON.stringify(p));
        return api.executeCommand('add-participant', draft => {
        const participants = [...(draft.combat?.participants || []), captured];
        const order = participants.slice().sort((a, b) => Number(b.initiative) - Number(a.initiative) || String(a.name).localeCompare(String(b.name))).map(item => item.id);
        return { ...draft, combat: { ...draft.combat, participants, order } };
        });
      }
      beginCommand('add-participant');
      combat.participants.set(p.id, p); markDirty(`combat/participants/${p.id}`, p); this.rebuildOrder(); save(); emitBus('combat');
    },
    removeParticipant(id) {
      if (!canMutate()) return false;
      const participant = combat.participants.get(id); if (!participant) return;
      if (persistence) return api.executeCommand('remove-participant', draft => {
        const participants = (draft.combat?.participants || []).filter(item => item.id !== id);
        const transition = participant.zone === 'active' ? removeFromCombat({ participants: draft.combat?.participants || [], order: draft.combat?.order || [], currentActorId: draft.combat?.currentActorId, participantId: id }) : null;
        return {
          ...draft,
          combat: { ...draft.combat, participants, order: transition ? transition.order : (draft.combat?.order || []).filter(item => item !== id), currentActorId: transition ? transition.currentActorId : (draft.combat?.currentActorId === id ? null : draft.combat?.currentActorId) },
          diceLines: (draft.diceLines || []).filter(line => line.participantId !== id).map(line => line.targetId === id ? { ...line, targetId: null } : line),
          log: [{ id: uid(), ts: Date.now(), kind: 'management', actorId: id, actorName: participant.name, text: `Combat: retiré ${participant.name}` }, ...(draft.log || [])].slice(0, 300)
        };
      });
      beginCommand('remove-participant');
      recordSnapshot('remove-participant');
      const turnTransition = participant.zone === 'active' ? removeFromCombat({ participants: Array.from(combat.participants.values()), order: combat.order, currentActorId: combat.currentActorId, participantId: id }) : null;
      combat.participants.delete(id);
      combat.order = turnTransition ? turnTransition.order : combat.order.filter(x => x !== id);
      if (turnTransition) combat.currentActorId = turnTransition.currentActorId;
      else if (combat.currentActorId === id) combat.currentActorId = null;
      if (turnTransition && combat.currentActorId) turnSelectionPending = true;
      markDirty(`combat/participants/${id}`, null); markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order });
      cleanupDiceLinesForParticipants([id]);
      log.forEach(entry => { if (entry?.actorId === id && !entry.actorName) entry.actorName = participant.name; if (entry?.targetId === id && !entry.targetName) entry.targetName = participant.name; });
      save(); emitBus('combat');
    },
    updateParticipant(id, patch) {
      if (!canMutate()) return false;
      const p = combat.participants.get(id); if (!p) return;
      if (persistence) {
        const capturedPatch = JSON.parse(JSON.stringify(patch || {}));
        return api.executeCommand('update-participant', draft => ({ ...draft, combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(item => item.id === id ? { ...item, ...capturedPatch } : item) } }));
      }
      Object.assign(p, patch); markDirty(`combat/participants/${id}`, p); save();
      if ('zone' in patch) emitBus('combat'); else emitBus('combat:update', { id, patch });
    },

    moveParticipant(id, zone, beforeId = null) {
      if (!canMutate()) return false;
      const p = combat.participants.get(id); if (!p) return;
      if (persistence) return api.executeCommand('move-participant', draft => {
        const participants = (draft.combat?.participants || []).map(item => item.id === id ? { ...item, zone } : item);
        const remaining = (draft.combat?.order || []).filter(item => item !== id);
        const active = remaining.filter(item => participants.find(p => p.id === item)?.zone === 'active');
        const bench = remaining.filter(item => participants.find(p => p.id === item)?.zone === 'bench');
        const target = zone === 'active' ? active : bench;
        target.splice(beforeId && target.includes(beforeId) ? target.indexOf(beforeId) : target.length, 0, id);
        return { ...draft, combat: { ...draft.combat, participants, order: [...active, ...bench], orderMode: zone === 'active' && beforeId !== null ? ORDER_MODES.MANUAL : orderMode } };
      });
      p.zone = zone; if (zone === 'active' && beforeId !== null) orderMode = ORDER_MODES.MANUAL;
      const remainingOrder = combat.order.filter(xId => xId !== id);
      const activeOrder = remainingOrder.filter(xId => combat.participants.get(xId)?.zone === 'active');
      const benchOrder = remainingOrder.filter(xId => combat.participants.get(xId)?.zone === 'bench');
      const targetArr = zone === 'active' ? activeOrder : benchOrder;
      if (beforeId && targetArr.includes(beforeId)) targetArr.splice(targetArr.indexOf(beforeId), 0, id); else targetArr.push(id);
      combat.order = [...activeOrder, ...benchOrder];
      markDirty(`combat/participants/${id}`, p); markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order, orderMode }); save(); emitBus('combat');
    },

    listParticipants() { return combat.order.map(id => combat.participants.get(id)).filter(Boolean); },

    setRoundTurn(round, currentActorId) {
      if (!canMutate()) return false;
      if (persistence) return api.executeCommand('set-round-turn', draft => ({ ...draft, combat: { ...draft.combat, round, currentActorId } }));
      beginCommand('set-round-turn'); combat.round = round; combat.currentActorId = currentActorId;
      markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order }); save(); emitBus('combat');
    },
    rebuildOrder() {
      if (persistence) return api.executeCommand('rebuild-order', draft => {
        const participants = draft.combat?.participants || [];
        const order = participants.slice().sort((a, b) => Number(b.initiative) - Number(a.initiative) || String(a.name).localeCompare(String(b.name))).map(participant => participant.id);
        return { ...draft, combat: { ...draft.combat, order } };
      });
      setOrderByInitiative();
      markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order });
    },

    getEffectiveOrder() { return effectiveCombatOrder(); },
    getOrderMode() { return orderMode; },
    setOrderMode(mode = ORDER_MODES.AUTOMATIC) {
      if (!canMutate()) return false;
      if (persistence) return api.executeCommand('set-order-mode', draft => {
        const result = computeOrderMode(draft.combat?.participants || [], {
          mode, order: draft.combat?.order || [], currentActorId: draft.combat?.currentActorId || null
        });
        return { ...draft, combat: { ...draft.combat, order: result.order, currentActorId: result.currentActorId, orderMode: result.mode } };
      });
      beginCommand('set-order-mode');
      const result = computeOrderMode(Array.from(combat.participants.values()), {
        mode, order: combat.order, currentActorId: combat.currentActorId
      });
      orderMode = result.mode;
      combat.order = result.order;
      combat.currentActorId = result.currentActorId;
      markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order, orderMode });
      save(); emitBus('combat');
      return true;
    },
    moveInOrder(id, beforeId = null) {
      if (!canMutate() || !combat.participants.has(id)) return false;
      if (persistence) return api.executeCommand('move-in-order', draft => ({
        ...draft,
        combat: { ...draft.combat, order: moveInOrder(draft.combat?.order || [], id, beforeId), orderMode: ORDER_MODES.MANUAL }
      }));
      beginCommand('move-in-order');
      orderMode = ORDER_MODES.MANUAL;
      combat.order = moveInOrder(combat.order, id, beforeId);
      markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order, orderMode });
      save(); emitBus('combat');
      return true;
    },
    insertReinforcement(id) {
      if (!canMutate() || !combat.participants.has(id)) return false;
      if (persistence) return api.executeCommand('insert-reinforcement', draft => ({
        ...draft,
        combat: { ...draft.combat, order: insertReinforcement(draft.combat?.order || [], id, draft.combat?.currentActorId || null), orderMode: ORDER_MODES.MANUAL }
      }));
      beginCommand('insert-reinforcement');
      orderMode = ORDER_MODES.MANUAL;
      combat.order = insertReinforcement(combat.order, id, combat.currentActorId);
      markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order, orderMode });
      save(); emitBus('combat');
      return true;
    },
    nextTurn() {
      if (!canMutate()) return false;
      if (persistence) return api.executeCommand('next-turn', draft => {
        const result = computeNextTurn({
          participants: draft.combat?.participants || [], order: effectiveOrder(draft.combat?.participants || [], {
            mode: draft.combat?.orderMode || ORDER_MODES.AUTOMATIC, order: draft.combat?.order || []
          }), currentActorId: draft.combat?.currentActorId || null, round: draft.combat?.round || 0
        });
        return { ...draft, combat: { ...draft.combat, order: result.order, currentActorId: result.currentActorId, round: result.round } };
      });
      beginCommand('next-turn');
      const result = computeNextTurn({
        participants: Array.from(combat.participants.values()),
        order: effectiveCombatOrder(), currentActorId: combat.currentActorId, round: combat.round
      });
      combat.order = result.order;
      combat.currentActorId = result.currentActorId;
      combat.round = result.round;
      markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order, orderMode });
      save(); emitBus('combat');
      return result;
    },
    consumeTurnSelection() {
      const pending = turnSelectionPending;
      turnSelectionPending = false;
      return pending;
    },
    usesPersistence() { return Boolean(persistence); },

    getCombat() { return combat; },
    getReserve() { return reserve; },
    getDiceLines() { return diceLines; },
    getLog() { return log; },

    addDiceLine(dl) {
      if (!canMutate()) return false;
      if (persistence) {
        const captured = JSON.parse(JSON.stringify(dl));
        return api.executeCommand('add-dice-line', draft => ({ ...draft, diceLines: [...(draft.diceLines || []), new DiceLine(captured)] }));
      }
      beginCommand('add-dice-line');
      const newLine = new DiceLine(dl); diceLines.push(newLine); markDirty(`diceLines/${newLine.id}`, newLine); save(); emitBus('combat');
    },
    updateDiceLine(id, patch, noRender = false) {
      if (!canMutate()) return false;
      const i = diceLines.findIndex(x => x.id === id); if (i < 0) return;
      if (persistence) {
        const capturedPatch = JSON.parse(JSON.stringify(patch || {}));
        return api.executeCommand('update-dice-line', draft => ({ ...draft, diceLines: (draft.diceLines || []).map(item => item.id === id ? { ...item, ...capturedPatch } : item) }));
      }
      beginCommand('update-dice-line'); Object.assign(diceLines[i], patch); markDirty(`diceLines/${id}`, diceLines[i]); save(); if (!noRender) emitBus('combat');
    },
    removeDiceLine(id) {
      if (!canMutate()) return false;
      beginCommand('remove-dice-line');
      if (!diceLines.some(item => item.id === id)) return;
      if (persistence) return api.executeCommand('remove-dice-line', draft => ({ ...draft, diceLines: (draft.diceLines || []).filter(item => item.id !== id) }));
      recordSnapshot('delete-dice-line'); diceLines = diceLines.filter(x => x.id !== id); markDirty(`diceLines/${id}`, null); save(); emitBus('combat');
    },
    duplicateDiceLine(id) {
      const src = diceLines.find(x => x.id === id); if (!src) return;
      this.addDiceLine(new DiceLine({ ...src, id: uid() }));
    },

    importFromReserve(ids) {
      if (!canMutate()) return false;
      const selectedIds = Array.isArray(ids) ? [...ids] : [];
      if (persistence) return api.executeCommand('import-reserve', draft => {
        const profiles = new Map((draft.reserve || []).map(profile => [profile.id, profile]));
        const participants = [...(draft.combat?.participants || [])];
        const lines = [...(draft.diceLines || [])];
        for (const id of selectedIds) {
          const prof = profiles.get(id); if (!prof) continue;
          const participant = {
            id: uid(), profileId: prof.id, name: prof.name, kind: prof.kind,
            initiative: prof.initiative, hp: prof.hp, maxHp: prof.hp,
            armor: JSON.parse(JSON.stringify(prof.armor || {})),
            caracs: JSON.parse(JSON.stringify(prof.caracs || {})),
            actions: JSON.parse(JSON.stringify(prof.actions || [])),
            tags: JSON.parse(JSON.stringify(prof.tags || [])),
            notes: prof.notes || '', zone: 'bench', states: []
          };
          participants.push(participant);
          for (const template of Array.isArray(prof.diceLines) ? prof.diceLines : []) {
            lines.push({ ...JSON.parse(JSON.stringify(template)), id: uid(), participantId: participant.id });
          }
        }
        const order = participants.slice().sort((a, b) => Number(b.initiative) - Number(a.initiative) || String(a.name).localeCompare(String(b.name))).map(item => item.id);
        return {
          ...draft,
          combat: { ...draft.combat, participants, order },
          diceLines: lines,
          log: [{ id: uid(), ts: Date.now(), kind: 'management', text: `Import: ${selectedIds.length} participant(s)` }, ...(draft.log || [])].slice(0, 300)
        };
      });
      beginCommand('import-reserve');
      this.batch(() => {
        selectedIds.forEach(id => {
          const prof = reserve.get(id); if (!prof) return;
          const p = new Participant({
            profileId: prof.id, name: prof.name, kind: prof.kind,
            initiative: prof.initiative, hp: prof.hp, maxHp: prof.hp,
            armor: { ...prof.armor }, caracs: { ...prof.caracs }, zone: 'bench'
          });
          this.addParticipant(p);

          if (prof.diceLines && Array.isArray(prof.diceLines)) {
            prof.diceLines.forEach(tpl => {
              this.addDiceLine(new DiceLine({
                participantId: p.id,
                base: tpl.base,
                note: tpl.note,
                damage: tpl.damage || 0,
                qualities: tpl.qualities || []
              }));
            });
          }
        });
        this.log(`Import: ${selectedIds.length} participant(s)`);
      });
    },
    exportToReserve() {
      if (!canMutate()) return false;
      if (persistence) return api.executeCommand('export-reserve', draft => {
        const byProfile = new Map((draft.combat?.participants || []).filter(participant => participant.profileId).map(participant => [participant.profileId, participant]));
        const reserve = (draft.reserve || []).map(profile => {
          const participant = byProfile.get(profile.id);
          return participant ? { ...profile, hp: participant.hp, maxHp: participant.maxHp } : profile;
        });
        const count = reserve.filter(profile => byProfile.has(profile.id)).length;
        return { ...draft, reserve, log: [{ id: uid(), ts: Date.now(), kind: 'management', text: `Export → Réserve: ${count} profil(s) mis à jour` }, ...(draft.log || [])].slice(0, 300) };
      });
      beginCommand('export-reserve');
      let n = 0; combat.participants.forEach(p => {
        if (!p.profileId) return;
        const prof = reserve.get(p.profileId); if (!prof) return;
        prof.hp = p.hp;
        markDirty(`reserve/${prof.id}`, prof);
        n++;
      });
      save(); this.log(`Export → Réserve: ${n} profil(s) mis à jour`); emitBus('reserve');
    },

    canUndo() { return historyCanUndo(historyState) || Boolean(lastSnapshot); },
    canRedo() { return historyCanRedo(historyState); },
    getHistory() { return historySnapshot(historyState); },
    captureSnapshot() { recordSnapshot(); },
    undo() {
      if (!canMutate()) return false;
      if (historyCanUndo(historyState)) {
        const applyUndo = () => {
          const transition = historyUndo(historyState);
          if (!transition.command) return false;
          const nextRevision = localRevision + 1;
          const beforeHistory = historyState;
          const beforeRevision = localRevision;
          const state = preserveLocalStateDuringHistory(JSON.parse(JSON.stringify(transition.command.inverse.state)));
          state.localRevision = nextRevision;
          const sharedChanged = hasSharedStateChange(transition.command.result.state, transition.command.inverse.state);
          const protocolReady = Boolean(syncSession && syncSessionReady);
          const operationQueued = protocolReady && sharedChanged;
          const persistState = { ...state, history: transition.history, ...(!protocolReady && syncSession && sharedChanged ? { syncPending: true } : {}) };
          const finish = result => {
            if (result?.ok === false) return false;
            historyState = transition.history;
            localRevision = nextRevision;
            try { applyDataToState(state, { includeLog: true, includeHistory: false }); }
            catch (error) { historyState = beforeHistory; localRevision = beforeRevision; throw error; }
            lastSnapshot = null;
            emitBus('reserve'); emitBus('combat'); emitBus('log');
            if (operationQueued) {
              pendingProtocolState = false;
              syncSession.flush({ localState: currentEnvelope() }).catch(() => reportSyncStatus('error'));
            } else {
              if (!protocolReady && syncSession && sharedChanged) pendingProtocolState = true;
              publishRevisionedStateIfNeeded(sharedChanged);
            }
            return true;
          };
          if (persistence) {
            const durable = operationQueued
              ? syncSession.enqueue({ state: persistState, localState: persistState })
              : queuePersistenceSave({}, null, persistState, { includeOperation: false });
            return Promise.resolve(durable).then(finish);
          }
          historyState = transition.history;
          localRevision = nextRevision;
          applyDataToState(state, { includeLog: true, includeHistory: false });
          save(true);
          emitBus('reserve'); emitBus('combat'); emitBus('log');
          return true;
        };
        if (!persistence) return applyUndo();
        const task = commandQueue.then(applyUndo);
        commandQueue = task.catch(() => {});
        return task;
      }
      if (!lastSnapshot) return false;
      const snap = lastSnapshot;
      lastSnapshot = null;
      applyDataToState(snap);
      if (Array.isArray(snap.log)) {
        log = snap.log;
      }
      save(true);
      emitBus('reserve');
      emitBus('combat');
      emitBus('log');
      this.log('⏪ Action annulée.');
      return true;
    },
    redo() {
      if (!canMutate() || !historyCanRedo(historyState)) return false;
      const applyRedo = () => {
        const transition = historyRedo(historyState);
        if (!transition.command) return false;
        const nextRevision = localRevision + 1;
        const state = preserveLocalStateDuringHistory(JSON.parse(JSON.stringify(transition.command.result.state)));
        state.localRevision = nextRevision;
        const sharedChanged = hasSharedStateChange(transition.command.inverse.state, transition.command.result.state);
        const protocolReady = Boolean(syncSession && syncSessionReady);
        const operationQueued = protocolReady && sharedChanged;
        const persistState = { ...state, history: transition.history, ...(!protocolReady && syncSession && sharedChanged ? { syncPending: true } : {}) };
        const finish = result => {
          if (result?.ok === false) return false;
          historyState = transition.history;
          localRevision = nextRevision;
          applyDataToState(state, { includeLog: true, includeHistory: false });
          emitBus('reserve'); emitBus('combat'); emitBus('log');
          if (operationQueued) {
            pendingProtocolState = false;
            syncSession.flush({ localState: currentEnvelope() }).catch(() => reportSyncStatus('error'));
          } else {
            if (!protocolReady && syncSession && sharedChanged) pendingProtocolState = true;
            publishRevisionedStateIfNeeded(sharedChanged);
          }
          return true;
        };
        if (persistence) {
          const durable = operationQueued
            ? syncSession.enqueue({ state: persistState, localState: persistState })
            : queuePersistenceSave({}, null, persistState, { includeOperation: false });
          return Promise.resolve(durable).then(finish);
        }
        historyState = transition.history;
        localRevision = nextRevision;
        applyDataToState(state, { includeLog: true, includeHistory: false });
        save(true);
        emitBus('reserve'); emitBus('combat'); emitBus('log');
        return true;
      };
      if (!persistence) return applyRedo();
      const task = commandQueue.then(applyRedo);
      commandQueue = task.catch(() => {});
      return task;
    },

    log(entry) {
      if (!canMutate()) return false;
      if (persistence) {
        let persistentItem;
        if (typeof entry === 'string') {
          persistentItem = { id: uid(), ts: Date.now(), time: now(), kind: 'management', text: entry };
        } else if (entry && typeof entry === 'object') {
          const actor = entry.actorId ? (combat.participants.get(entry.actorId) || reserve.get(entry.actorId)) : null;
          const target = entry.targetId ? (combat.participants.get(entry.targetId) || reserve.get(entry.targetId)) : null;
          persistentItem = {
            id: entry.id || uid(), ts: entry.ts || Date.now(), time: entry.time || now(),
            kind: entry.kind || 'management', actorId: entry.actorId || null, targetId: entry.targetId || null,
            actorName: entry.actorName || actor?.name || null, targetName: entry.targetName || target?.name || null,
            text: entry.text || '', detail: entry.detail || null
          };
        } else return;
        return api.executeCommand('append-log', draft => ({
          ...draft, log: [persistentItem, ...(draft.log || [])].slice(0, 300)
        }), { recordHistory: false });
      }
      let item;
      if (typeof entry === 'string') {
        item = { id: uid(), ts: Date.now(), time: now(), kind: 'management', text: entry };
      } else if (entry && typeof entry === 'object') {
        const actor = entry.actorId ? (combat.participants.get(entry.actorId) || reserve.get(entry.actorId)) : null;
        const target = entry.targetId ? (combat.participants.get(entry.targetId) || reserve.get(entry.targetId)) : null;
        item = {
          id: entry.id || uid(),
          ts: entry.ts || Date.now(),
          time: entry.time || now(),
          kind: entry.kind || 'management',
          actorId: entry.actorId || null,
          targetId: entry.targetId || null,
          actorName: entry.actorName || actor?.name || null,
          targetName: entry.targetName || target?.name || null,
          text: entry.text || '',
          detail: entry.detail || null
        };
      } else {
        return;
      }
      log.unshift(item);
      if (log.length > 300) log.length = 300;
      const persisted = save();
      emitBus('log');
      return persisted;
    },
    clearLog() {
      if (!canMutate()) return false;
      if (persistence) return api.executeCommand('clear-log', draft => ({ ...draft, log: [] }), { recordHistory: false });
      beginCommand('clear-log'); recordSnapshot('clear-log'); log = []; save(); emitBus('log'); return true;
    },
    resetCombat() {
      if (!canMutate()) return false;
      if (persistence) return api.executeCommand('reset-combat', draft => ({
        ...draft,
        combat: { ...draft.combat, round: 0, currentActorId: null, order: [], participants: [] },
        diceLines: [],
        log: [{ id: uid(), ts: Date.now(), kind: 'management', text: 'Combat terminé.' }, ...(draft.log || [])].slice(0, 300)
      }));
      beginCommand('reset-combat');
      recordSnapshot('end-combat');
      cleanupDiceLinesForParticipants(combat.participants.keys());
      combat = { round: 0, currentActorId: null, order: [], participants: new Map() };
      markDirty('combat', { meta: { round: 0, currentActorId: null, order: [] }, participants: null });
      save(); this.log('Combat terminé.'); emitBus('combat');
    },

    getLocalRevision() { return localRevision; },
    listEncounters() { return cloneValue(encounters); },
    saveEncounter(input) {
      const model = normalizeEncounter(input);
      return api.executeCommand('save-encounter', draft => ({ ...draft, encounters: [...(draft.encounters || []).filter(item => item.id !== model.id), model] }));
    },
    deleteEncounter(id) {
      return api.executeCommand('delete-encounter', draft => ({ ...draft, encounters: (draft.encounters || []).filter(item => item.id !== id) }));
    },
    duplicateEncounter(id) {
      const source = encounters.find(item => item.id === id);
      if (!source) throw new Error('Rencontre introuvable');
      const model = duplicateEncounter(source);
      return api.executeCommand('duplicate-encounter', draft => ({ ...draft, encounters: [...(draft.encounters || []), model] }));
    },
    setEncounterEntry(id, profileId, options = {}) {
      const source = encounters.find(item => item.id === id);
      if (!source) throw new Error('Rencontre introuvable');
      const next = setEncounterEntry(source, profileId, options);
      return api.executeCommand('edit-encounter-entry', draft => ({ ...draft, encounters: (draft.encounters || []).map(item => item.id === id ? next : item) }));
    },
    listPersistentCharacters() { return cloneValue(persistentCharacters); },
    savePersistentCharacter(input) {
      const character = cloneValue(input || {});
      if (!character.id) character.id = uid();
      return api.executeCommand('save-persistent-character', draft => ({ ...draft, persistentCharacters: [...(draft.persistentCharacters || []).filter(item => item.id !== character.id), character] }));
    },
    deletePersistentCharacter(id) {
      return api.executeCommand('delete-persistent-character', draft => ({ ...draft, persistentCharacters: (draft.persistentCharacters || []).filter(item => item.id !== id) }));
    },
    getActiveScene() { return cloneValue(activeScene); },
    listSuspendedScenes() { return cloneValue(suspendedScenes); },
    launchEncounter(idOrEncounter) {
      const encounter = typeof idOrEncounter === 'string' ? encounters.find(item => item.id === idOrEncounter) : idOrEncounter;
      if (!encounter) throw new Error('Rencontre introuvable');
      return api.executeCommand('launch-encounter', draft => ({
        ...draft,
        activeScene: launchEncounter(encounter, { profiles: draft.reserve || [], persistentCharacters: draft.persistentCharacters || [], activeScene: draft.activeScene || null }),
        encounters: (draft.encounters || []).map(item => item.id === encounter.id ? { ...item, status: 'active' } : item)
      }));
    },
    addImprovisedParticipant(participant) {
      if (!activeScene) throw new Error('Aucune scène active');
      return api.executeCommand('add-improvised-participant', draft => ({ ...draft, activeScene: addImprovisedParticipant(draft.activeScene, participant) }));
    },
    suspendActiveScene() {
      if (!activeScene) throw new Error('Aucune scène active');
      return api.executeCommand('suspend-scene', draft => ({
        ...draft, activeScene: null,
        suspendedScenes: [...(draft.suspendedScenes || []), suspendScene(draft.activeScene)],
        combat: { ...draft.combat, round: 0, currentActorId: null, order: [], participants: [] },
        encounters: (draft.encounters || []).map(item => item.id === draft.activeScene.encounterId ? { ...item, status: 'suspended' } : item)
      }));
    },
    resumeScene(id) {
      const scene = suspendedScenes.find(item => item.id === id);
      if (!scene) throw new Error('Scène suspendue introuvable');
      return api.executeCommand('resume-scene', draft => ({
        ...draft,
        activeScene: resumeScene(scene, { activeScene: draft.activeScene || null }),
        suspendedScenes: (draft.suspendedScenes || []).filter(item => item.id !== id),
        encounters: (draft.encounters || []).map(item => item.id === scene.encounterId ? { ...item, status: 'active' } : item)
      }));
    },
    previewClosure(options = {}) {
      if (!activeScene) throw new Error('Aucune scène active');
      return buildClosurePreview(activeScene, { persistentCharacters, ...options });
    },
    closeScene(options = {}) {
      if (!activeScene) throw new Error('Aucune scène active');
      const initialPreview = options.preview || buildClosurePreview(activeScene, { persistentCharacters, ...options });
      if (!initialPreview.ready) return { status: 'conflict', conflicts: cloneValue(initialPreview.conflicts), preview: initialPreview };
      if (options.preview && options.preview.sceneRevision !== (activeScene.revision ?? null)) {
        return { status: 'stale', requiresPreview: true, preview: initialPreview };
      }
      return api.executeCommand('close-scene', draft => {
        const scene = draft.activeScene;
        // An explicit preview is an approval boundary. Rebuilding it here
        // could silently include a later HP/state edit and close the wrong
        // characters. applyClosure performs the revision/participant CAS.
        const preview = options.preview || buildClosurePreview(scene, { persistentCharacters: draft.persistentCharacters || [], selections: options.selections, authorities: options.authorities, includeStates: options.includeStates });
        const result = applySceneClosure(scene, preview, { persistentCharacters: draft.persistentCharacters || [], selectedParticipantIds: options.selectedParticipantIds, archiveId: options.archiveId });
        if (result.status !== 'applied') throw new Error(result.reason || 'Clôture à revoir');
        const participantIds = new Set((scene.participants || []).map(item => item?.id).filter(Boolean));
        return {
          ...draft,
          activeScene: null,
          diceLines: (draft.diceLines || [])
            .filter(line => !participantIds.has(line.participantId))
            .map(line => participantIds.has(line.targetId) ? { ...line, targetId: null } : line),
          persistentCharacters: (draft.persistentCharacters || []).map(character => result.characterUpdates.find(update => update.id === character.id) || character),
          archives: retainArchives([...(draft.archives || []), result.archive]),
          encounters: (draft.encounters || []).map(item => item.id === scene.encounterId ? { ...item, status: 'closed' } : item)
        };
      });
    },
    listArchives() { return cloneValue(archives); },
    exportArchive(id, format = 'json') {
      const archive = archives.find(item => item.id === id);
      if (!archive) throw new Error('Archive introuvable');
      return formatArchive(archive, format);
    },
    deleteArchive(id) {
      return api.executeCommand('delete-archive', draft => ({ ...draft, archives: (draft.archives || []).filter(item => item.id !== id) }));
    },
    previewResolution(input = {}) {
      const combatState = { revision: localRevision, participants: Array.from(combat.participants.values()), appliedResolutionIds };
      const actor = input.actor || combat.participants.get(input.actorId);
      const target = input.target || (input.targetId ? combat.participants.get(input.targetId) : null);
      return buildResolutionPreview({ ...input, actor, target, baseRevision: input.baseRevision ?? localRevision });
    },
    applyResolution(preview) {
      let semanticResult = null;
      const commit = api.executeCommand('apply-resolution', draft => {
        const current = {
          revision: draft.localRevision || 0,
          participants: draft.combat?.participants || [],
          appliedResolutionIds: draft.appliedResolutionIds || []
        };
        let result;
        try { result = applyActionResolution(preview, current); }
        catch (error) { error.code = error.code || 'RESOLUTION_INVALID'; throw error; }
        if (result.status === 'duplicate') {
          const error = new Error('Résultat déjà appliqué');
          error.code = 'RESOLUTION_DUPLICATE';
          throw error;
        }
        if (result.status !== 'applied') {
          const error = new Error(result.reason || 'Résolution périmée');
          error.code = result.status === 'stale' ? 'RESOLUTION_STALE' : 'RESOLUTION_MANUAL';
          throw error;
        }
        semanticResult = result;
        return {
          ...draft,
          combat: { ...draft.combat, participants: result.state.participants },
          appliedResolutionIds: result.state.appliedResolutionIds,
          log: [resolutionLogEntry(preview, result.resolution), ...(draft.log || [])].slice(0, 300)
        };
      });
      return Promise.resolve(commit).then(persisted => {
        if (persisted?.ok === false) return { status: 'error', reason: 'Résolution non sauvegardée' };
        return { ...semanticResult, status: 'applied', persistence: persisted };
      }).catch(error => {
        if (error?.code === 'RESOLUTION_DUPLICATE') return { status: 'duplicate', resolution: preview };
        if (error?.code === 'RESOLUTION_STALE') return { status: 'stale', requiresPreview: true };
        if (error?.code === 'RESOLUTION_MANUAL') return { status: 'manual', reason: error.message };
        if (error?.code === 'RESOLUTION_INVALID') return { status: 'error', reason: error.message };
        throw error;
      });
    },
    simulateAction(input = {}) {
      return simulateAction({ revision: localRevision, participants: Array.from(combat.participants.values()) }, { ...input, baseRevision: input.baseRevision ?? localRevision, actor: input.actor || combat.participants.get(input.actorId), target: input.target || (input.targetId ? combat.participants.get(input.targetId) : null) });
    },
    applySimulation(simulation) {
      let semanticResult = null;
      // applyActionSimulation has already executed the pure resolution. Passing
      // result.resolution back through applyResolution would apply it twice and
      // immediately report a duplicate. Commit the returned state once through
      // the Store command boundary so it remains undoable and revisioned.
      const commit = api.executeCommand('apply-simulation', draft => {
        const current = {
          revision: draft.localRevision || 0,
          participants: draft.combat?.participants || [],
          appliedResolutionIds: draft.appliedResolutionIds || []
        };
        const result = applyActionSimulation(simulation, current);
        if (result.status === 'duplicate') {
          const error = new Error('Simulation déjà appliquée');
          error.code = 'SIMULATION_DUPLICATE';
          throw error;
        }
        if (result.status !== 'applied') {
          const error = new Error(result.reason || 'Simulation périmée');
          error.code = result.status === 'stale' ? 'SIMULATION_STALE' : 'SIMULATION_INVALID';
          throw error;
        }
        semanticResult = result;
        return {
          ...draft,
          combat: { ...draft.combat, participants: result.state.participants },
          appliedResolutionIds: result.state.appliedResolutionIds,
          log: [resolutionLogEntry(simulation.preview, result.resolution), ...(draft.log || [])].slice(0, 300)
        };
      });
      return Promise.resolve(commit).then(persisted => {
        if (persisted?.ok === false) return { status: 'error', reason: 'Simulation non sauvegardée' };
        return { ...semanticResult, status: 'applied', persistence: persisted };
      }).catch(error => {
        if (error?.code === 'SIMULATION_DUPLICATE') return { status: 'duplicate', simulation };
        if (error?.code === 'SIMULATION_STALE') return { status: 'stale', requiresPreview: true };
        if (error?.code === 'SIMULATION_INVALID') return { status: 'error', reason: error.message };
        throw error;
      });
    },
    getSimulationState() {
      return { revision: localRevision, participants: cloneValue(Array.from(combat.participants.values())), appliedResolutionIds: [...appliedResolutionIds] };
    },
    discardSimulation(simulation) { return discardSimulation(simulation); },
    getReminders(transition = {}) {
      lastReminderTransition = cloneValue(transition || {});
      if (!activeScene) return [];
      const actorId = transition.actorId || activeScene.currentActorId;
      const actor = (activeScene.participants || []).find(item => item?.id === actorId);
      const snapshot = {
        ...activeScene,
        sceneId: activeScene.id,
        states: actor?.states || [],
        consequences: activeScene.consequences || [],
        reinforcements: activeScene.reinforcements || []
      };
      return pendingReminders(deriveReminders(snapshot, transition, reminderChoices));
    },
    listReminderChoices() { return cloneValue(reminderChoices); },
    resolveReminder(id, decision, details = {}) {
      if (!activeScene) return false;
      const transition = lastReminderTransition || {};
      const actorId = transition.actorId || activeScene.currentActorId;
      const actor = (activeScene.participants || []).find(item => item?.id === actorId);
      const snapshot = { ...activeScene, sceneId: activeScene.id, states: actor?.states || [], consequences: activeScene.consequences || [], reinforcements: activeScene.reinforcements || [] };
      const next = resolveReminder(deriveReminders(snapshot, transition, reminderChoices), id, decision, details);
      const choice = next.find(item => item.id === id)?.choice;
      if (!choice) return false;
      return api.executeCommand('resolve-reminder', draft => ({ ...draft, reminderChoices: [...(draft.reminderChoices || []).filter(item => item.id !== id), choice] }));
    },
    saveReminderDecision({ reminderId, decision, details = {} } = {}) {
      return api.resolveReminder(reminderId, decision, details);
    },
    createIntention(input) { return api.executeCommand('create-intention', draft => ({ ...draft, activeScene: { ...draft.activeScene, intentions: [...(draft.activeScene?.intentions || []), createIntention(input)] } })); },
    createSceneEvent(input) { return createSceneEvent(input); },
    saveSceneEvent(event) {
      if (!activeScene) throw new Error('Aucune scène active');
      const value = createSceneEvent(event);
      return api.executeCommand('save-scene-event', draft => ({ ...draft, activeScene: { ...draft.activeScene, events: [...(draft.activeScene.events || []).filter(item => item.id !== value.id), value] } }));
    },
    deleteSceneEvent(id) {
      if (!activeScene) throw new Error('Aucune scène active');
      return api.executeCommand('delete-scene-event', draft => ({ ...draft, activeScene: { ...draft.activeScene, events: (draft.activeScene.events || []).filter(item => item.id !== id) } }));
    },
    createSceneClock(input) { return createSceneClock(input); },
    saveSceneClock(clock) {
      if (!activeScene) throw new Error('Aucune scène active');
      const value = createSceneClock(clock);
      return api.executeCommand('save-scene-clock', draft => ({ ...draft, activeScene: { ...draft.activeScene, clocks: [...(draft.activeScene.clocks || []).filter(item => item.id !== value.id), value] } }));
    },
    deleteSceneClock(id) {
      if (!activeScene) throw new Error('Aucune scène active');
      return api.executeCommand('delete-scene-clock', draft => ({ ...draft, activeScene: { ...draft.activeScene, clocks: (draft.activeScene.clocks || []).filter(item => item.id !== id) } }));
    },
    proposeSceneEvent(event, options = {}) { return activeScene ? proposeSceneEvent(activeScene, event, options) : { status: 'not-eligible' }; },
    previewSceneEvent(event, options = {}) {
      if (!activeScene) return { status: 'not-eligible', reason: 'Aucune scène active' };
      const proposal = proposeSceneEvent(activeScene, event, { manual: Boolean(options.confirmed || options.manual) });
      return { ...proposal, baseRevision: localRevision, sceneRevision: activeScene.revision ?? null };
    },
    applySceneEvent(event, options = {}) {
      let semanticResult = null;
      const commit = api.executeCommand('apply-scene-event', draft => {
        const scene = draft.activeScene;
        if (!scene) {
          const error = new Error('Aucune scène active'); error.code = 'SCENE_EVENT_INVALID'; throw error;
        }
        if (options.baseRevision !== undefined && options.baseRevision !== draft.localRevision) {
          const error = new Error('Scène périmée'); error.code = 'SCENE_EVENT_STALE'; throw error;
        }
        if (options.sceneRevision !== undefined && options.sceneRevision !== (scene.revision ?? null)) {
          const error = new Error('Aperçu de scène périmé'); error.code = 'SCENE_EVENT_STALE'; throw error;
        }
        const result = applySceneEvent(scene, event, { manual: Boolean(options.confirmed || options.manual) });
        if (result.status === 'duplicate') {
          const error = new Error('Occurrence déjà résolue'); error.code = 'SCENE_EVENT_DUPLICATE'; throw error;
        }
        if (result.status !== 'applied') {
          const error = new Error('Condition de scène non satisfaite'); error.code = 'SCENE_EVENT_NOT_ELIGIBLE'; throw error;
        }
        semanticResult = result;
        return { ...draft, activeScene: result.scene };
      });
      return Promise.resolve(commit).then(persisted => {
        if (persisted?.ok === false) return { status: 'error', reason: 'Événement non sauvegardé' };
        return { ...semanticResult, persistence: persisted };
      }).catch(error => {
        if (error?.code === 'SCENE_EVENT_DUPLICATE') return { status: 'duplicate' };
        if (error?.code === 'SCENE_EVENT_STALE') return { status: 'stale', requiresPreview: true };
        if (error?.code === 'SCENE_EVENT_NOT_ELIGIBLE') return { status: 'not-eligible' };
        if (error?.code === 'SCENE_EVENT_INVALID') return { status: 'error', reason: error.message };
        throw error;
      });
    },
    resolveSceneEvent(event) {
      if (!activeScene) throw new Error('Aucune scène active');
      return api.executeCommand('resolve-scene-event', draft => ({ ...draft, activeScene: resolveSceneEvent(draft.activeScene, event) }));
    },
    advanceSceneClock(clockId, amount = 1) {
      if (!activeScene) throw new Error('Aucune scène active');
      return api.executeCommand('advance-scene-clock', draft => ({ ...draft, activeScene: advanceSceneClock(draft.activeScene, clockId, amount) }));
    },
    importParsedProfiles(profiles = []) {
      const captured = cloneValue(profiles);
      return api.executeCommand('import-text-profiles', draft => ({ ...draft, reserve: [...(draft.reserve || []), ...captured.map(profile => ({ ...profile, id: profile.id || uid() }))] }));
    },

    getFullJSON() {
      const data = currentEnvelope();
      return JSON.stringify(data, null, 2);
    },
    async listRestorePoints() {
      if (!persistence || typeof persistence.listRestorePoints !== 'function') return [];
      const points = await persistence.listRestorePoints();
      return Array.isArray(points) ? points.map(point => ({
        id: point.id,
        contextId: point.contextId,
        createdAt: point.createdAt,
        reason: point.reason || 'manual',
        sourceFormat: point.state?.format || 'snapshot-v2',
        localRevision: Number.isInteger(point.state?.localRevision) ? point.state.localRevision : null
      })) : [];
    },
    async previewRestorePoint(id) {
      if (!persistence || typeof persistence.listRestorePoints !== 'function') {
        throw new Error('Points de restauration indisponibles');
      }
      if (typeof id !== 'string' || !id.trim()) throw new TypeError('restore id invalide');
      const baseRevision = localRevision;
      const points = await persistence.listRestorePoints();
      const point = points.find(item => item?.id === id);
      if (!point) throw new Error('Point de restauration introuvable');
      return { ...restoreSourcePreview(point), baseRevision };
    },
    async restorePoint(id, options = {}) {
      if (!persistence || typeof persistence.listRestorePoints !== 'function') {
        throw new Error('Points de restauration indisponibles');
      }
      if (typeof id !== 'string' || !id.trim()) throw new TypeError('restore id invalide');
      const lookupRevision = localRevision;
      const expectedRevision = options.expectedRevision ?? options.expectedLocalRevision ?? options.expected?.localRevision ?? lookupRevision;
      if (expectedRevision !== undefined && expectedRevision !== localRevision) {
        return { status: 'stale', expectedRevision, currentRevision: localRevision };
      }
      const preview = await api.previewRestorePoint(id);
      if (options.expectedPointRevision !== undefined
        && options.expectedPointRevision !== preview.data.localRevision) {
        return { status: 'stale', expectedPointRevision: options.expectedPointRevision, pointRevision: preview.data.localRevision ?? null };
      }
      const importData = {
        ...preview.data,
        // The restore itself is a visible management action, while the
        // journal remains local and bounded like a regular import.
        log: [{ id: uid(), ts: Date.now(), kind: 'management', text: '↩️ Point de restauration chargé.' }, ...(preview.data.log || [])].slice(0, 300)
      };
      const beforeRestoreId = uid();
      const persisted = await api.executeCommand('restore-point', draft => {
        if (draft.localRevision !== expectedRevision) {
          const error = new Error('État modifié pendant la prévisualisation');
          error.code = 'RESTORE_STALE';
          throw error;
        }
        return importData;
      }, {
        restore: ({ before }) => ({ id: beforeRestoreId, reason: 'restore-before', state: before })
      }).catch(error => {
        if (error?.code === 'RESTORE_STALE') return { status: 'stale', expectedRevision, currentRevision: localRevision };
        throw error;
      });
      if (persisted?.status === 'stale') return persisted;
      if (persisted?.ok === false) throw persisted?.error || new Error('Restauration non sauvegardée');
      return { status: 'restored', id, ...preview.report, report: preview.report, counts: preview.counts, persistence: persisted };
    },
    previewImport(jsonStr) {
      const raw = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      const migrated = migrateSnapshot(raw, { appVersion, contextId });
      const incomingProfileIds = new Set(migrated.data.reserve.map(profile => profile.id));
      const incomingParticipantIds = new Set(migrated.data.combat.participants.map(participant => participant.id));
      return {
        data: migrated.data,
        report: migrated.report,
        counts: {
          profiles: migrated.data.reserve.length,
          participants: migrated.data.combat.participants.length,
          rejected: migrated.report.rejected.length,
          repaired: migrated.report.repaired.length,
          replacedProfiles: [...reserve.keys()].filter(id => incomingProfileIds.has(id)).length,
          replacedParticipants: [...combat.participants.keys()].filter(id => incomingParticipantIds.has(id)).length
        }
      };
    },
    loadFromJSON(jsonStr) {
      try {
        if (persistence && !canMutate()) {
          return Promise.reject(new Error('Persistance non prête : import suspendu'));
        }
        const preview = this.previewImport(jsonStr);
        if (!persistence) {
          recordSnapshot('import-replace');
          applyDataToState(preview.data, { includeLog: true });
          save(true); emitBus('reserve'); emitBus('combat'); emitBus('log'); this.log('📂 Données chargées.');
          return preview.report;
        }
        // L’import remplaçant suit la même commande atomique que les gestes
        // utilisateur : migration, historique, nouvel état et restauration
        // sont écrits avant que le Store vivant ne change.
        const restore = { id: uid(), reason: 'import-replace', state: currentEnvelope() };
        pendingRestore = null;
        const importData = {
          ...preview.data,
          log: [{ id: uid(), ts: Date.now(), kind: 'management', text: '📂 Données chargées.' }, ...(preview.data.log || [])].slice(0, 300)
        };
        const importTransaction = api.executeCommand('import-replace', () => importData, { restore }).then(result => {
          if (result?.ok === false) throw result?.error || new Error('Import non sauvegardé');
          pendingRestore = null;
          return preview.report;
        }).catch(error => {
          pendingRestore = null;
          throw error;
        });
        importInFlight = importTransaction;
        return importTransaction.finally(() => { importInFlight = null; });
      } catch (e) {
        console.error('Erreur chargement:', e);
        throw e;
      }
    }
  };

  async function hydratePersistence() {
    let readyResult;
    try {
      const persisted = await persistence.load();
      if (persisted) {
        applyDataToState(migrateSnapshot(persisted, { appVersion, contextId }).data, { includeLog: true });
      } else if (storage && contextId === 'guest') {
        const migrated = migrateLegacyStorage(storage, { appVersion, contextId });
        applyDataToState(migrated.data, { includeLog: true });
        const legacyKeys = Object.values(KEY).reduce((raw, key) => {
          raw[key] = storage.getItem(key);
          return raw;
        }, {});
        await persistence.saveAtomic({
          state: migrated.data,
          // Garder la source brute permet une restauration fidèle même si la
          // migration enrichit ou répare des champs à l’import.
          restore: {
            reason: 'migration',
            state: { format: 'legacy-localStorage', contextId, keys: legacyKeys }
          }
        });
      } else {
        applyDataToState({ reserve: [], combat: {}, log: [], diceLines: [] }, { includeLog: true });
        await persistence.saveAtomic({ state: currentEnvelope() });
      }
      if (combat.order.length === 0 && combat.participants.size > 0) setOrderByInitiative();
      hydrationComplete = true;
      hydrationFailed = false;
      readyResult = { ok: true };
      reportLocalStatus('saved');
    } catch (error) {
      // L’état mémoire est potentiellement vide ou partiel. Le laisser
      // modifiable ferait courir le risque d’écraser la source au prochain
      // clic. Le Store reste consultable pour export/récupération, mais toute
      // écriture est refusée tant qu’une réhydratation n’a pas réussi.
      hydrationComplete = false;
      hydrationFailed = true;
      console.error('❌ Erreur de réhydratation IndexedDB:', error);
      reportLocalStatus('error');
      readyResult = { ok: false, error };
    } finally {
      resolveReady(readyResult || { ok: false, error: new Error('Persistance non initialisée') });
      if (typeof onReady === 'function') onReady(readyResult);
      if (readyResult?.ok && savePending) {
        savePending = false;
        save();
      }
    }
    return readyResult;
  }

  api.retryHydration = () => {
    if (!persistence) return Promise.resolve({ ok: true });
    if (hydrationInFlight) return hydrationInFlight;
    hydrationInFlight = hydratePersistence().finally(() => { hydrationInFlight = null; });
    return hydrationInFlight;
  };

  api.switchContext = async (nextContextId) => {
    if (!persistenceFactory || typeof nextContextId !== 'string' || !nextContextId.trim()) {
      throw new Error('Changement de contexte indisponible');
    }
    if (nextContextId === contextId) return { ok: true };
    await persistenceQueue;
    await syncSession?.idle?.();
    syncSession?.stop?.();
    lastRemoteRevision = -1;
    contextId = nextContextId;
    syncSession = null;
    syncContextId = null;
    syncSessionReady = false;
    pendingProtocolState = false;
    legacyImportCandidate = null;
    hydrationComplete = false;
    hydrationFailed = false;
    applyDataToState({ reserve: [], combat: {}, log: [], diceLines: [] }, { includeLog: true });
    // Clear the previous context immediately while the new IDB context loads.
    if (bus && bus.emit) {
      bus.emit('reserve'); bus.emit('combat'); bus.emit('log');
    }
    persistence = persistenceFactory(contextId);
    hydrationInFlight = hydratePersistence().finally(() => { hydrationInFlight = null; });
    return hydrationInFlight.then(result => {
      if (result?.ok && bus && bus.emit) {
        bus.emit('reserve'); bus.emit('combat'); bus.emit('log');
      }
      return result;
    });
  };

  api.whenIdle = () => Promise.all([persistenceQueue, syncSession?.idle?.()]);
  api.detachSync = () => {
    syncAttachEpoch++;
    lastRemoteRevision = -1;
    syncSession?.stop?.();
    syncSession = null;
    syncContextId = null;
    syncSessionReady = false;
    pendingProtocolState = false;
    sync = null;
    syncSessionStarting = false;
  };
  api.resolveSyncRemote = options => {
    if (!syncSession) return Promise.reject(new Error('Session distante indisponible'));
    return syncSession.resolveRemote({ ...(options || {}), localState: options?.localState ?? currentEnvelope() });
  };
  api.resolveSyncLocal = options => {
    if (!syncSession) return Promise.reject(new Error('Session distante indisponible'));
    const local = options?.localState ?? currentEnvelope();
    return syncSession.resolveLocal({ ...(options || {}), state: options?.state ?? local, localState: local });
  };
  api.exportSyncConflict = () => syncSession?.exportConflict() || null;
  api.importGuestSnapshot = snapshot => {
    if (!snapshot) return Promise.reject(new Error('Aucune donnée invitée à importer'));
    // loadFromJSON already commits the v2 operation (and starts its background
    // flush) as one command.  A second full save here would publish a duplicate
    // operation and advance the remote revision twice on explicit legacy import.
    return Promise.resolve(api.loadFromJSON(JSON.stringify(snapshot)));
  };

  if (persistence) {
    hydrationInFlight = hydratePersistence().finally(() => { hydrationInFlight = null; });
  }
  else {
    load();
    if (combat.order.length === 0 && combat.participants.size > 0) setOrderByInitiative();
    resolveReady({ ok: true });
  }

  let syncListenerStarted = false;

  function startSyncListener() {
    if (syncListenerStarted) return;
    if (!(sync && sync.onValue && sync.dbRef)) return;
    syncListenerStarted = true;

    sync.onValue(sync.dbRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      if (data.writer === CLIENT_ID) return;

      const incomingTs = parseTimestamp(data.timestamp);
      if (incomingTs && lastAppliedTimestamp && incomingTs < lastAppliedTimestamp) {
        console.warn('⚠️ Données serveur plus anciennes que l\'état local — ignorées');
        api.log('⚠️ Données serveur plus anciennes que l\'état local — conservées localement en attente de résolution');
        return;
      }

      try {
        // Les anciens listeners Firebase pouvaient ne livrer qu’un sous-ensemble
        // du document. Compléter les branches absentes avec l’état courant évite
        // qu’un événement de journal ou de métadonnées ne soit interprété comme
        // un document vide, tout en faisant passer le résultat par la migration
        // commune avant application.
        const current = currentEnvelope();
        const migrated = migrateSnapshot({
          ...data,
          reserve: data.reserve ?? current.reserve,
          combat: data.combat ?? current.combat,
          diceLines: data.diceLines ?? current.diceLines
        }, { appVersion, contextId });
        applyDataToState(migrated.data);
        if (incomingTs) {
          lastAppliedTimestamp = incomingTs;
        }
        persistLocal();
        if (bus && bus.emit) {
          bus.emit('reserve');
          bus.emit('combat');
          bus.emit('log');
        }
        console.log('🔄 Sync Firebase → Local');
      } catch (e) {
        console.error('❌ Erreur sync Firebase → Local:', e);
      }
    });
  }

  // L'authentification Firebase est asynchrone : le handle de synchro n'existe pas
  // encore quand main.js construit le Store. Sans ce point d'attache, sync resterait
  // null pour toujours et l'application tournerait en localStorage seul, sans erreur
  // ni symptôme visible.
  api.attachSync = (handle) => {
    if (!handle || syncListenerStarted) return;
    sync = handle;
    if (persistence) {
      // E05 lit/réconcilie le serveur avant toute publication. Les mutations
      // locales arrivées avant cette étape restent dans l’outbox de transition
      // et sont converties ou écartées explicitement par sync-session.
      if (typeof handle.createSession !== 'function') {
        reportSyncStatus('connected');
        return;
      }
      const requestedContext = handle.contextId || contextId;
      // Authentication may switch directly from account A to account B. A
      // session is scoped to its context and cannot be reused for the other
      // account.
      if (syncSession && syncContextId === requestedContext) return;
      if (contextId === 'guest' && requestedContext.startsWith('account:')) {
        const candidate = currentEnvelope();
        const hasGuestData = candidate.reserve.length > 0 || candidate.combat.participants.length > 0
          || candidate.log.length > 0 || candidate.diceLines.length > 0;
        guestImportCandidate = hasGuestData ? JSON.parse(JSON.stringify(candidate)) : null;
      }
      const attachEpoch = ++syncAttachEpoch;
      lastRemoteRevision = -1;
      syncSessionStarting = true;
      const startSession = () => {
        if (attachEpoch !== syncAttachEpoch) return Promise.resolve(null);
        syncSession = handle.createSession({
          persistence,
          contextId: requestedContext,
          deviceId: `${requestedContext}:${CLIENT_ID}`,
          onStatus: status => reportSyncStatus(status),
          onConflict: conflict => {
            reportSyncStatus('conflict');
            if (bus && bus.emit) bus.emit('sync:conflict', conflict);
          },
          onRemoteState: (data, root = {}) => {
            const remoteData = cloneValue(data || {});
            const remoteRoot = cloneValue(root || {});
            const current = currentEnvelope();
            const remoteRevision = Number.isInteger(remoteRoot.revision) ? remoteRoot.revision : null;
            const remoteChanged = remoteRevision !== null
              ? remoteRevision > lastRemoteRevision
              : !sameValue(sharedState(remoteData), sharedState(current));
            if (!remoteChanged) return null;
            // Build the complete next envelope before touching the live store.
            // sync-session persists this candidate together with its session and
            // invokes commit only after that transaction succeeds.
            const nextHistory = markExternalBoundary(historyState, {
              reason: 'remote-sync', revision: remoteRoot.revision ?? 0
            });
            const nextLocalRevision = localRevision + 1;
            const nextData = {
              ...current,
              ...remoteData,
              log: current.log,
              diceLines: remoteData.diceLines ?? current.diceLines,
              history: nextHistory,
              archives: current.archives,
              reminderChoices: current.reminderChoices,
              appliedResolutionIds: current.appliedResolutionIds,
              syncPending: false,
              localRevision: nextLocalRevision
            };
            return {
              state: nextData,
              commit: () => {
                if (attachEpoch !== syncAttachEpoch) return;
                if (remoteRevision !== null) lastRemoteRevision = Math.max(lastRemoteRevision, remoteRevision);
                historyState = nextHistory;
                localRevision = nextLocalRevision;
                applyDataToState(nextData);
                if (bus && bus.emit) {
                  bus.emit('reserve'); bus.emit('combat'); bus.emit('log');
                }
              }
            };
          }
        });
        syncContextId = requestedContext;
        return syncSession.open({ initialState: currentEnvelope() })
        .then(() => syncSession.reconcile({ localState: currentEnvelope() }))
        .then(result => {
            if (attachEpoch !== syncAttachEpoch) return result;
            syncSessionReady = result.status === 'synced' || result.status === 'pending';
            // Only offer the guest snapshot when reconciliation found an
            // empty remote root and there is no account-local work to publish.
            // Keep this decision from the initial read: flush() can retain
            // remoteAvailable=false after creating the first remote root.
            const guestImportEligible = result.status === 'pending'
              && result.remoteAvailable === false
              && !pendingProtocolState
              && (!Array.isArray(result.outbox) || result.outbox.length === 0);
            const readyState = currentEnvelope();
            const replay = pendingProtocolState && (result.status === 'pending' || result.status === 'synced')
              ? syncSession.enqueue({ state: readyState, localState: readyState })
                .then(() => syncSession.flush({ localState: currentEnvelope() }))
                .then(value => {
                  pendingProtocolState = false;
                  return persistence.saveAtomic({ state: currentEnvelope() }).then(() => value);
                })
              : result.status === 'pending'
                ? syncSession.flush({ localState: readyState })
                : Promise.resolve(result);
            return replay.then(async value => {
              // The old root is read only as a migration source. It is never
              // attached to the v2 session and cannot trigger a write before
              // the user explicitly imports it.
              if (typeof handle.legacyMigration === 'function' && requestedContext.startsWith('account:')) {
                try {
                  const legacy = await handle.legacyMigration();
                  if (legacy && value?.remoteAvailable === false) {
                    const migrated = migrateSnapshot(legacy, { appVersion, contextId: requestedContext });
                    const hasData = migrated.data.reserve.length > 0
                      || migrated.data.combat.participants.length > 0
                      || migrated.data.log.length > 0;
                    if (hasData) legacyImportCandidate = JSON.parse(JSON.stringify(migrated.data));
                  }
                } catch (error) {
                  console.warn('⚠️ Migration distante legacy indisponible:', error);
                }
              }
              if (guestImportCandidate && attachEpoch === syncAttachEpoch) {
                // A guest draft is only offered when the account has no v2
                // document and the read completed online. Never surface an
                // import action beside an already-synced account: importing
                // it replaces the account state with this older snapshot.
                if (guestImportEligible && bus?.emit) {
                  bus.emit('sync:guest-import-available', { snapshot: guestImportCandidate, contextId: requestedContext });
                }
                guestImportCandidate = null;
              }
              if (legacyImportCandidate && attachEpoch === syncAttachEpoch && bus?.emit) {
                bus.emit('sync:guest-import-available', {
                  snapshot: legacyImportCandidate,
                  contextId: requestedContext,
                  kind: 'legacy'
                });
                legacyImportCandidate = null;
              }
              return value;
            });
          });
      };
      const contextSwitch = requestedContext !== contextId && persistenceFactory
        ? api.switchContext(requestedContext)
        : Promise.resolve({ ok: true });
      contextSwitch.then(startSession).catch(error => {
        if (attachEpoch !== syncAttachEpoch) return;
        syncSessionReady = false;
        console.error('❌ Réconciliation Firebase → Local impossible:', error);
        reportSyncStatus('error');
      }).finally(() => {
        if (attachEpoch === syncAttachEpoch) syncSessionStarting = false;
      });
      return;
    }
    startSyncListener();
    // Instantané complet explicite : à la connexion, rien n'est marqué comme sale et il faut
    // pourtant pousser tout le travail fait avant l'authentification.
    save(true);
  };

  api.ready = readyPromise;

  startSyncListener();

  return api;
}
