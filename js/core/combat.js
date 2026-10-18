import { previewV5Turn } from './v5-turn.js';
import { uid } from './models.js';
import { advanceEndOfTurn } from './effects.js';

export function computeEndOfTurn(p, d10Roll = 1) {
  return advanceEndOfTurn(p, { d10Roll });
}

export function createCombatEngine(Store) {
  function orderedActiveParticipants() {
    const st = Store.getCombat();
    const active = Array.from(st.participants.values()).filter(p => p.zone === 'active');
    const byId = new Map(active.map(p => [p.id, p]));
    const ids = Store.getEffectiveOrder?.() || active
      .sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name))
      .map(p => p.id);
    return ids.map(id => byId.get(id)).filter(Boolean);
  }

  function actorAtTurn() {
    const st = Store.getCombat();
    return st.currentActorId ? (st.participants.get(st.currentActorId) ?? null) : null;
  }

  function start() {
    const st = Store.getCombat();
    const activeParticipants = orderedActiveParticipants();

    if (activeParticipants.length === 0) {
      return Store.log('Aucun combattant en zone active');
    }

    const round = st.round === 0 ? 1 : st.round;
    const firstActor = activeParticipants[0];
    const result = typeof Store.executeCommand === 'function'
      ? Store.executeCommand('start-combat', draft => ({
        ...draft,
        combat: { ...draft.combat, round, currentActorId: firstActor.id },
        extensions: { ...(draft.extensions || {}), v5: { ...(draft.extensions?.v5 || {}), turnIndex: st.round === 0 ? 1 : draft.extensions?.v5?.turnIndex || 1,
          combatId: st.round === 0 ? uid() : draft.extensions?.v5?.combatId || uid() } },
        log: [{ kind: 'management', actorId: firstActor.id, actorName: firstActor.name, text: `Combat démarré. Round ${round}. Tour: ${firstActor.name}` }, ...(draft.log || [])].slice(0, 300)
      }))
      : Store.setRoundTurn(round, firstActor.id);
    if (typeof Store.executeCommand !== 'function') return Store.log({ kind: 'management', actorId: firstActor.id, actorName: firstActor.name, text: `Combat démarré. Round ${round}. Tour: ${firstActor.name}` });
    return result;
  }

  function previewNextTurn(options = {}) {
    return previewV5Turn(JSON.parse(Store.getFullJSON()), options);
  }

  function nextTurnV5(supplied = {}) {
    const options = structuredClone(supplied);
    const expected = options.baseRevision ?? Store.getLocalRevision();
    if (expected !== Store.getLocalRevision()) return { status: 'stale', requiresPreview: true };
    const preview = previewNextTurn(options);
    if (!preview.ready) return preview;
    const finish = result => result?.ok === false ? result : { status: 'applied', ok: true, persistence: result };
    const fail = error => {
      if (error.code === 'V5_TURN_STALE') return { status: 'stale', requiresPreview: true };
      if (error.code === 'V5_TURN_INPUT') return error.preview;
      throw error;
    };
    try {
      const commit = Store.executeCommand('end-turn-v5', draft => {
        if (draft.localRevision !== expected) throw Object.assign(new Error('Le combat a changé'), { code: 'V5_TURN_STALE' });
        const current = previewV5Turn(draft, options);
        if (!current.ready) throw Object.assign(new Error('Des données sont requises'), { code: 'V5_TURN_INPUT', preview: current });
        return current.state;
      });
      return commit && typeof commit.then === 'function' ? commit.then(finish).catch(fail) : finish(commit);
    } catch (error) { return fail(error); }
  }

  function nextTurn(options = {}) {
    if (!Store.usesPersistence?.() && Store.consumeTurnSelection?.()) return;
    return nextTurnV5(options);
  }

  return { actorAtTurn, start, nextTurn, previewNextTurn };
}
