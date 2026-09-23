/** Pure E08 order and turn transitions. */

export const ORDER_MODES = Object.freeze({ AUTOMATIC: 'automatic', MANUAL: 'manual' });

const clone = value => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone);
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    Object.defineProperty(out, key, { value: clone(child), writable: true, enumerable: true, configurable: true });
  }
  return out;
};

function activeParticipants(participants) {
  if (!Array.isArray(participants)) return [];
  const seen = new Set();
  return participants.filter(participant => {
    if (!participant || typeof participant.id !== 'string' || !participant.id || seen.has(participant.id)) return false;
    seen.add(participant.id);
    return participant.zone === 'active';
  }).map(clone);
}

function initiativeOrder(participants) {
  return activeParticipants(participants).sort((a, b) => {
    const initiativeA = Number(a.initiative) || 0;
    const initiativeB = Number(b.initiative) || 0;
    return initiativeB - initiativeA || String(a.name || '').localeCompare(String(b.name || '')) || a.id.localeCompare(b.id);
  }).map(participant => participant.id);
}

function activeIds(participants) {
  return new Set(activeParticipants(participants).map(participant => participant.id));
}

/** Return the one order used by both the visible track and the turn engine. */
export function effectiveOrder(participants, { mode = ORDER_MODES.AUTOMATIC, order = [] } = {}) {
  const ids = activeIds(participants);
  if (mode !== ORDER_MODES.MANUAL) return initiativeOrder(participants);
  const kept = [];
  for (const id of Array.isArray(order) ? order : []) {
    if (typeof id === 'string' && ids.has(id) && !kept.includes(id)) kept.push(id);
  }
  return kept.concat(initiativeOrder(participants).filter(id => !kept.includes(id)));
}

/** Explicitly reorder the manual track; the caller can pass null to append. */
export function moveInOrder(order, movedId, beforeId = null) {
  const current = Array.isArray(order) ? [...order] : [];
  const index = current.indexOf(movedId);
  if (index < 0) return current;
  current.splice(index, 1);
  const target = beforeId == null ? current.length : current.indexOf(beforeId);
  current.splice(target < 0 ? current.length : target, 0, movedId);
  return current;
}

/** Insert a reinforcement after the current actor by default. */
export function insertReinforcement(order, participantId, currentActorId = null) {
  const current = Array.isArray(order) ? order.filter(id => id !== participantId) : [];
  const index = currentActorId == null ? -1 : current.indexOf(currentActorId);
  current.splice(index < 0 ? current.length : index + 1, 0, participantId);
  return current;
}

/** Change initiative sorting mode without triggering a turn or end-of-turn effect. */
export function setOrderMode(participants, { mode = ORDER_MODES.AUTOMATIC, order = [], currentActorId = null } = {}) {
  const nextOrder = effectiveOrder(participants, { mode, order });
  const ids = new Set(nextOrder);
  return {
    mode,
    order: nextOrder,
    currentActorId: ids.has(currentActorId) ? currentActorId : (nextOrder[0] || null)
  };
}

/** Select the next active actor; changing the order never applies effects itself. */
export function nextTurn({ participants = [], order = [], currentActorId = null, round = 0 } = {}) {
  const active = activeIds(participants);
  const validOrder = (Array.isArray(order) ? order : []).filter(id => active.has(id));
  if (!validOrder.length) return { order: [], currentActorId: null, round };
  const currentIndex = validOrder.indexOf(currentActorId);
  if (currentIndex < 0) return { order: validOrder, currentActorId: validOrder[0], round };
  const nextIndex = (currentIndex + 1) % validOrder.length;
  return {
    order: validOrder,
    currentActorId: validOrder[nextIndex],
    round: nextIndex === 0 ? round + 1 : round
  };
}

/** Remove or bench a participant, selecting the next survivor without ending a turn. */
export function removeFromCombat({ participants = [], order = [], currentActorId = null, participantId } = {}) {
  const remaining = activeParticipants(participants).filter(participant => participant.id !== participantId);
  const previousOrder = (Array.isArray(order) ? order : []).filter(id => id !== participantId && activeIds(remaining).has(id));
  if (currentActorId !== participantId) return { order: previousOrder, currentActorId: activeIds(remaining).has(currentActorId) ? currentActorId : (previousOrder[0] || null) };
  const oldIndex = Array.isArray(order) ? order.indexOf(participantId) : -1;
  const oldOrder = Array.isArray(order) ? order : [];
  const candidateIds = oldOrder.slice(oldIndex + 1).concat(oldOrder.slice(0, Math.max(0, oldIndex)));
  const survivor = candidateIds.find(id => activeIds(remaining).has(id)) || previousOrder[0] || null;
  return { order: previousOrder, currentActorId: survivor };
}
