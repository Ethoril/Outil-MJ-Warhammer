/** Pure structured scene intentions, events and manual clocks for E15. */

const clone = value => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone);
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    Object.defineProperty(out, key, { value: clone(child), writable: true, enumerable: true, configurable: true });
  }
  return out;
};

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export class SceneEventError extends Error {
  constructor(message, code = 'INVALID_SCENE_EVENT') {
    super(message);
    this.name = 'SceneEventError';
    this.code = code;
  }
}

function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new SceneEventError(`${field} requis`);
  return value.trim();
}

export function createScene({ id, round = 0, participants = [], intentions = [], events = [], clocks = [] } = {}) {
  if (typeof id !== 'string' || !id.trim()) throw new SceneEventError('sceneId requis');
  if (!Number.isInteger(round) || round < 0) throw new SceneEventError('round invalide');
  return { id, round, participants: clone(participants), intentions: intentions.map(clone), events: events.map(clone), clocks: clocks.map(clone), resolvedOccurrences: [] };
}

export function createIntention({ id, participantId = null, motivation = '', objective = '', retreatCondition = '' } = {}) {
  return {
    id: text(id, 'id'), participantId,
    motivation: String(motivation || ''), objective: String(objective || ''), retreatCondition: String(retreatCondition || '')
  };
}

export function createSceneEvent({ id, condition, consequence, recurring = false } = {}) {
  if (!isRecord(condition) || typeof condition.type !== 'string') throw new SceneEventError('condition structurée requise');
  if (!isRecord(consequence) || typeof consequence.type !== 'string') throw new SceneEventError('conséquence structurée requise');
  const allowed = new Set(['roundAtLeast', 'hpBelow', 'participantDown', 'previousResolved', 'manual']);
  if (!allowed.has(condition.type)) throw new SceneEventError('condition inconnue');
  return { id: text(id, 'id'), condition: clone(condition), consequence: clone(consequence), recurring: Boolean(recurring) };
}

export function createSceneClock({ id, label = '', value = 0, max = null } = {}) {
  if (typeof id !== 'string' || !id.trim()) throw new SceneEventError('clockId requis');
  if (!Number.isFinite(Number(value))) throw new SceneEventError('valeur de jauge invalide');
  if (max !== null && max !== undefined && (!Number.isFinite(Number(max)) || Number(max) < 0)) throw new SceneEventError('maximum de jauge invalide');
  return { id, label: String(label || id), value: Number(value), max: max == null ? null : Number(max) };
}

function participant(scene, participantId) {
  if (Array.isArray(scene.participants)) return scene.participants.find(item => item?.id === participantId) || null;
  if (isRecord(scene.participants)) return scene.participants[participantId] || null;
  return null;
}

function occurrenceId(scene, event) {
  const suffix = event.recurring ? `round:${scene.round}` : 'once';
  return `${scene.id}:${event.id}:${suffix}`;
}

/** Check one explicit condition; free text is never interpreted. */
export function evaluateSceneEvent(scene, event, { manual = false } = {}) {
  const condition = event.condition;
  let eligible = false;
  if (condition.type === 'roundAtLeast') eligible = scene.round >= Number(condition.round);
  else if (condition.type === 'hpBelow') eligible = Number(participant(scene, condition.participantId)?.hp) < Number(condition.hp);
  else if (condition.type === 'participantDown') eligible = Number(participant(scene, condition.participantId)?.hp) <= 0;
  else if (condition.type === 'previousResolved') eligible = (scene.resolvedOccurrences || []).includes(condition.occurrenceId);
  else if (condition.type === 'manual') eligible = manual;
  return { eligible, occurrenceId: occurrenceId(scene, event), reason: eligible ? 'condition-true' : 'condition-false' };
}

/** Return a proposal only; applying its consequence belongs to E07 commands. */
export function proposeSceneEvent(scene, event, options = {}) {
  const evaluation = evaluateSceneEvent(scene, event, options);
  const resolved = Array.isArray(scene.resolvedOccurrences) && scene.resolvedOccurrences.includes(evaluation.occurrenceId);
  if (!evaluation.eligible || resolved) return { status: resolved ? 'already-resolved' : 'not-eligible', evaluation };
  return { status: 'proposed', evaluation, event: clone(event), consequence: clone(event.consequence) };
}

/** Mark one occurrence resolved exactly once, without executing its consequence. */
export function resolveSceneEvent(scene, event) {
  const evaluation = evaluateSceneEvent(scene, event, { manual: true });
  const resolved = Array.isArray(scene.resolvedOccurrences) ? [...scene.resolvedOccurrences] : [];
  if (!resolved.includes(evaluation.occurrenceId)) resolved.push(evaluation.occurrenceId);
  return { ...clone(scene), resolvedOccurrences: resolved };
}

/** Apply one confirmed structured consequence without interpreting free text. */
export function applySceneEvent(scene, event, { manual = false } = {}) {
  const evaluation = evaluateSceneEvent(scene, event, { manual });
  const resolved = Array.isArray(scene.resolvedOccurrences) && scene.resolvedOccurrences.includes(evaluation.occurrenceId);
  if (resolved) return { status: 'duplicate', occurrenceId: evaluation.occurrenceId, scene: clone(scene) };
  if (!evaluation.eligible) return { status: 'not-eligible', occurrenceId: evaluation.occurrenceId, evaluation, scene: clone(scene) };

  const next = clone(scene);
  const consequence = event.consequence || {};
  let result = { type: consequence.type };
  if (consequence.type === 'note') {
    const note = String(consequence.text || consequence.note || '').trim();
    if (!note) throw new SceneEventError('note de conséquence vide');
    next.notes = [...(Array.isArray(next.notes) ? next.notes : []), {
      id: `${evaluation.occurrenceId}:note`, text: note, occurrenceId: evaluation.occurrenceId
    }];
    result.note = note;
  } else if (consequence.type === 'addState') {
    const target = participant(next, consequence.participantId);
    if (!target) throw new SceneEventError('participant de conséquence introuvable');
    const state = clone(consequence.state || {
      name: consequence.name, key: consequence.key, level: consequence.level,
      duration: consequence.duration, source: consequence.source || { kind: 'scene-event', occurrenceId: evaluation.occurrenceId }
    });
    if (!state || typeof state !== 'object' || !String(state.name || state.key || '').trim()) throw new SceneEventError('état de conséquence invalide');
    target.states = [...(Array.isArray(target.states) ? target.states : []), state];
    result.participantId = target.id; result.state = state;
  } else if (consequence.type === 'reinforcement') {
    const target = participant(next, consequence.participantId || consequence.id);
    if (!target) throw new SceneEventError('renfort de conséquence introuvable');
    target.zone = 'active';
    const ids = (Array.isArray(next.order) ? next.order : []).filter(id => id !== target.id);
    const currentIndex = ids.indexOf(next.currentActorId);
    ids.splice(currentIndex < 0 ? ids.length : currentIndex + 1, 0, target.id);
    next.order = ids;
    result.participantId = target.id;
  } else if (consequence.type === 'advanceClock') {
    const amount = Number(consequence.amount ?? 1);
    if (!Number.isFinite(amount)) throw new SceneEventError('incrément de jauge invalide');
    const clock = (next.clocks || []).find(item => item.id === consequence.clockId);
    if (!clock) throw new SceneEventError('jauge de conséquence introuvable');
    clock.value = (Number(clock.value) || 0) + amount;
    if (clock.max !== null && clock.max !== undefined && Number.isFinite(Number(clock.max))) {
      clock.value = Math.min(Number(clock.max), clock.value);
    }
    result.clockId = clock.id; result.value = clock.value;
  } else {
    throw new SceneEventError('conséquence inconnue');
  }
  next.resolvedOccurrences = [...(Array.isArray(next.resolvedOccurrences) ? next.resolvedOccurrences : []), evaluation.occurrenceId];
  return { status: 'applied', occurrenceId: evaluation.occurrenceId, scene: next, result };
}

/** Advance a manually configured clock; no distance or subsystem rule is inferred. */
export function advanceSceneClock(scene, clockId, amount = 1) {
  if (!Number.isFinite(Number(amount))) throw new SceneEventError('incrément de jauge invalide');
  const clocks = (Array.isArray(scene.clocks) ? scene.clocks : []).map(clock => {
    if (clock.id !== clockId) return clone(clock);
    const next = clone(clock);
    next.value = (Number(next.value) || 0) + Number(amount);
    if (next.max !== null && next.max !== undefined && Number.isFinite(Number(next.max))) {
      next.value = Math.min(Number(next.max), next.value);
    }
    return next;
  });
  return { ...clone(scene), clocks };
}
