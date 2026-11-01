import { applyStateChanges, createCompactStateCommand } from './commands.js';

/** Visit both sides of compact history entries using the current state as anchor. */
function visitHistory(history, current, visit) {
  for (const [key, direction] of [['past', 'inverse'], ['future', 'result']]) {
    let cursor = current;
    const entries = history?.[key] || [];
    for (let i = entries.length - 1; i >= 0; i--) {
      const command = entries[i];
      const compact = command.data?.compactState === 1;
      const other = compact ? applyStateChanges(cursor, command[direction].changes) : command[direction]?.state;
      if (!other) continue;
      const before = direction === 'inverse' ? other : cursor;
      const after = direction === 'inverse' ? cursor : other;
      visit(command, before, after, key, i);
      cursor = other;
    }
  }
}

/** Journal ownership uses stable encounter/scene IDs, never display names. */
export function encounterJournalScope(state, encounterId) {
  if (typeof encounterId !== 'string' || !encounterId.trim()) throw new TypeError('Identifiant de rencontre requis');
  const sceneIds = new Set();
  const participantIds = new Set();
  const collect = value => {
    for (const scene of [value?.activeScene, ...(value?.suspendedScenes || []), ...(value?.archives || [])]) {
      if (scene?.encounterId !== encounterId) continue;
      if (scene.id) sceneIds.add(scene.id);
      for (const participant of scene.participants || []) if (participant.id) participantIds.add(participant.id);
    }
  };
  collect(state);
  // Relaunching or closing combat can leave older participants only in undo
  // snapshots. Include them so deletion also purges those older receipts.
  for (const command of [...(state?.history?.past || []), ...(state?.history?.future || [])]) {
    collect(command.result?.state);
    collect(command.inverse?.state);
  }
  visitHistory(state?.history, state, (command, before, after) => {
    if (command.data?.compactState === 1) { collect(before); collect(after); }
  });
  return { encounterId, sceneIds: [...sceneIds], participantIds: [...participantIds] };
}

export function journalEntryBelongsToEncounter(entry, scope) {
  const explicitEncounter = entry?.encounterId ?? entry?.detail?.encounterId;
  if (explicitEncounter) return explicitEncounter === scope.encounterId;
  const explicitScene = entry?.sceneId ?? entry?.detail?.sceneId;
  if (explicitScene) return scope.sceneIds.includes(explicitScene);
  return scope.participantIds.includes(entry?.actorId) || scope.participantIds.includes(entry?.targetId)
    || scope.participantIds.includes(entry?.detail?.input?.actor?.id)
    || scope.participantIds.includes(entry?.detail?.input?.target?.id);
}

export function purgeEncounterJournal(state, scope) {
  if (!state) return state;
  const linked = entry => journalEntryBelongsToEncounter(entry, scope);
  const removed = new Set((state.log || []).filter(linked).map(entry => entry.detail?.resolutionId).filter(Boolean));
  const ledger = state.extensions?.v5?.actionLedger;
  const ownedClocks = new Set([scope.encounterId, ...scope.sceneIds]);
  const quotaBelongs = entry => {
    try { return ownedClocks.has(JSON.parse(entry.scopeKey)[0]); } catch { return false; }
  };
  const cleanedLedger = ledger ? {
    appliedActions: ledger.appliedActions.filter(entry => !ownedClocks.has(entry.encounterId)),
    quotaUsage: ledger.quotaUsage.filter(entry => !quotaBelongs(entry))
  } : null;
  return { ...state,
    ...((cleanedLedger || state.extensions?.v5?.reactionOpportunities) ? { extensions: { ...state.extensions, v5: { ...state.extensions.v5, ...(cleanedLedger ? { actionLedger: cleanedLedger } : {}), ...(state.extensions.v5.reactionOpportunities ? { reactionOpportunities: state.extensions.v5.reactionOpportunities.filter(entry => !ownedClocks.has(entry.encounterId)) } : {}) } } } : {}),
    log: (state.log || []).filter(entry => !linked(entry)),
    archives: (state.archives || []).filter(entry => !linked(entry)),
    appliedResolutionIds: (state.appliedResolutionIds || []).filter(id => !removed.has(id)) };
}

export function purgeEncounterJournalHistory(history, scope, currentState = null) {
  const clean = command => ({ ...command,
    result: command.result?.state ? { ...command.result, state: purgeEncounterJournal(command.result.state, scope) } : command.result,
    inverse: command.inverse?.state ? { ...command.inverse, state: purgeEncounterJournal(command.inverse.state, scope) } : command.inverse });
  const result = { ...history, past: history.past.map(clean), future: history.future.map(clean) };
  if (currentState) visitHistory(history, currentState, (command, before, after, key, i) => {
    if (command.data?.compactState !== 1) return;
    result[key][i] = createCompactStateCommand({ id: command.id, type: command.type, baseRevision: command.baseRevision,
      before: purgeEncounterJournal(before, scope), after: purgeEncounterJournal(after, scope) });
  });
  else if ([...history.past, ...history.future].some(command => command.data?.compactState === 1)) {
    throw new Error('État courant requis pour purger un historique compact.');
  }
  return result;
}

/** Attach ownership to new receipts, including end-of-turn and management logs. */
export function tagNewEncounterLogs(before, next) {
  const scene = next.activeScene || before.activeScene;
  if (!scene?.encounterId) return next;
  const old = new Map();
  for (const entry of before.log || []) {
    const key = JSON.stringify(entry);
    old.set(key, (old.get(key) || 0) + 1);
  }
  const log = (next.log || []).map(entry => {
    const key = JSON.stringify(entry);
    const count = old.get(key) || 0;
    if (count) { old.set(key, count - 1); return entry; }
    if (entry.encounterId || entry.sceneId) return entry;
    return { ...entry, encounterId: scene.encounterId, sceneId: scene.id };
  });
  return { ...next, log };
}
