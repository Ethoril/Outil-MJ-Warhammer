import { advanceEndOfTurn } from './effects.js';
import { effectiveOrder, nextTurn as computeNextTurn } from './turn-order.js';

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
        log: [{ kind: 'management', actorId: firstActor.id, actorName: firstActor.name, text: `Combat démarré. Round ${round}. Tour: ${firstActor.name}` }, ...(draft.log || [])].slice(0, 300)
      }))
      : Store.setRoundTurn(round, firstActor.id);
    if (typeof Store.executeCommand !== 'function') return Store.log({ kind: 'management', actorId: firstActor.id, actorName: firstActor.name, text: `Combat démarré. Round ${round}. Tour: ${firstActor.name}` });
    return result;
  }

  function decrementStates(id) {
    const p = Store.getCombat().participants.get(id);
    if (!p) return;
    if (Store.usesPersistence?.() && typeof Store.executeCommand === 'function') {
      return Store.executeCommand('decrement-states', draft => {
        const current = (draft.combat?.participants || []).find(participant => participant.id === id);
        if (!current) return draft;
        const d10Roll = (Math.floor(Math.random() * 100) + 1) % 10 + 1;
        const res = computeEndOfTurn(current, d10Roll);
        const effectLogs = res.logs.map(entry => ({
          kind: 'effect', actorId: id, actorName: current.name,
          text: typeof entry === 'string' ? entry : (entry?.text || String(entry ?? '')),
          detail: typeof entry === 'object' ? entry.detail || null : null
        }));
        if (res.hpDelta !== 0) effectLogs.unshift({ kind: 'damage', actorId: id, actorName: current.name, text: `${current.name} : ${current.hp} → ${res.newHp}` });
        return {
          ...draft,
          combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(participant => participant.id === id ? { ...participant, states: res.nextStates, hp: res.newHp } : participant) },
          log: [...effectLogs, ...(draft.log || [])].slice(0, 300)
        };
      });
    }
    const d10Roll = (Math.floor(Math.random() * 100) + 1) % 10 + 1;
    const res = computeEndOfTurn(p, d10Roll);
    res.logs.forEach(l => Store.log(l));

    const patch = {};
    if (JSON.stringify(res.nextStates) !== JSON.stringify(p.states)) patch.states = res.nextStates;
    if (res.hpDelta !== 0) {
      patch.hp = res.newHp;
      Store.log({ kind: 'damage', actorId: p.id, actorName: p.name, text: `${p.name} : PV ${p.hp} → ${res.newHp}` });
    }
    if (Object.keys(patch).length) Store.updateParticipant(id, patch);
  }

  function nextTurn() {
    const st = Store.getCombat();
    if (st.round === 0) return;
    if (Store.usesPersistence?.() && typeof Store.executeCommand === 'function') {
      return Store.executeCommand('end-turn', draft => {
        const participants = draft.combat?.participants || [];
        const active = participants.filter(participant => participant.zone === 'active');
        const order = effectiveOrder(participants, {
          mode: draft.combat?.orderMode,
          order: draft.combat?.order || []
        });
        const current = participants.find(participant => participant.id === draft.combat?.currentActorId) || null;
        const roll = (Math.floor(Math.random() * 100) + 1) % 10 + 1;
        const effect = current ? advanceEndOfTurn(current, { d10Roll: roll }) : { nextStates: [], newHp: current?.hp, hpDelta: 0, logs: [] };
        const updatedParticipants = participants.map(participant => participant.id === current?.id
          ? { ...participant, states: effect.nextStates, hp: effect.newHp }
          : participant);
        const transition = computeNextTurn({
          participants: active, order, currentActorId: draft.combat?.currentActorId || null, round: draft.combat?.round || 0
        });
        const nextActor = participants.find(participant => participant.id === transition.currentActorId);
        const effectLogs = current ? effect.logs.map(entry => ({
          kind: 'effect', actorId: current.id, actorName: current.name,
          text: typeof entry === 'string' ? entry : (entry?.text || String(entry ?? '')),
          detail: typeof entry === 'object' ? entry.detail || null : null
        })) : [];
        if (current && effect.hpDelta !== 0) effectLogs.unshift({
          kind: 'damage', actorId: current.id, actorName: current.name,
          text: `${current.name} : ${current.hp} → ${effect.newHp}`
        });
        effectLogs.unshift({
          kind: 'management', actorId: nextActor?.id || null, actorName: nextActor?.name || null,
          text: `▶ ${transition.round !== (draft.combat?.round || 0) ? `Round ${transition.round} — ` : ''}Tour de ${nextActor?.name || '–'}`
        });
        return {
          ...draft,
          combat: { ...draft.combat, participants: updatedParticipants, order: transition.order, currentActorId: transition.currentActorId, round: transition.round },
          log: [...effectLogs, ...(draft.log || [])].slice(0, 300)
        };
      });
    }
    // Historical localStorage mode used a preselected survivor after a
    // removal.  The persistent v2 command path advances the selected actor
    // normally; retaining this compatibility shim cannot affect production
    // persistence or its shared order protocol.
    if (!Store.usesPersistence?.() && Store.consumeTurnSelection?.()) return;
    const activeParticipants = orderedActiveParticipants();
    if (activeParticipants.length === 0) return;

    const order = Store.getEffectiveOrder?.() || activeParticipants.map(p => p.id);
    const currentActor = actorAtTurn();
    const d10Roll = currentActor ? (Math.floor(Math.random() * 100) + 1) % 10 + 1 : 1;
    const currentEffect = currentActor ? advanceEndOfTurn(currentActor, { d10Roll }) : null;
    const transition = computeNextTurn({
      participants: activeParticipants, order, currentActorId: st.currentActorId, round: st.round
    });
    const nextActor = activeParticipants.find(p => p.id === transition.currentActorId);
    const result = Store.executeCommand?.('end-turn', draft => {
      const participants = (draft.combat?.participants || []).map(participant => {
        if (!currentActor || participant.id !== currentActor.id) return participant;
        return { ...participant, states: currentEffect.nextStates, hp: currentEffect.newHp };
      });
      const logs = [...(draft.log || [])];
      if (currentActor) {
        currentEffect.logs.forEach(entry => logs.unshift({
          kind: 'effect',
          actorId: currentActor.id,
          actorName: currentActor.name,
          text: typeof entry === 'string' ? entry : (entry?.text || String(entry ?? '')),
          detail: typeof entry === 'object' ? entry.detail || null : null
        }));
        if (currentEffect.hpDelta !== 0) logs.unshift({ kind: 'damage', actorId: currentActor.id, actorName: currentActor.name, text: `${currentActor.name} : PV ${currentActor.hp} → ${currentEffect.newHp}` });
      }
      logs.unshift({ kind: 'management', actorId: nextActor?.id || null, actorName: nextActor?.name || null, text: `▶ ${transition.round !== st.round ? `Round ${transition.round} — ` : ''}Tour de ${nextActor?.name || '–'}` });
      return { ...draft, combat: { ...draft.combat, participants, order: transition.order, currentActorId: transition.currentActorId, round: transition.round }, log: logs.slice(0, 300) };
    });
    if (!Store.executeCommand) {
      if (currentActor) decrementStates(currentActor.id);
      Store.setRoundTurn(transition.round, transition.currentActorId);
      Store.log({ kind: 'management', actorId: nextActor.id, actorName: nextActor.name, text: `▶ Tour de ${nextActor.name}` });
    }
    return result;
  }

  return { actorAtTurn, start, nextTurn, decrementStates };
}
