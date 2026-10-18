const clone = value => JSON.parse(JSON.stringify(value));
const CAMPAIGN_SECONDS_PER_UNIT = Object.freeze({ seconds: 1, minutes: 60, hours: 3600, days: 86400 });

/** Convert an explicit MJ campaign duration without rounding a fractional second. */
export function campaignDurationSeconds(value, unit = 'seconds') {
  const factor = CAMPAIGN_SECONDS_PER_UNIT[unit];
  const rawSeconds = value * factor;
  const seconds = Math.round(rawSeconds);
  const machineTolerance = Math.min(1e-9, Number.EPSILON * Math.max(1, Math.abs(rawSeconds)) * 2);
  const exactSeconds = unit === 'seconds'
    ? Number.isSafeInteger(value) && value === seconds
    : Math.abs(rawSeconds - seconds) <= machineTolerance;
  if (!Number.isFinite(value) || !Number.isSafeInteger(factor) || !Number.isSafeInteger(seconds) || seconds < 1 || !exactSeconds) {
    throw new TypeError('Durée de campagne positive en secondes entières requise');
  }
  return seconds;
}
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => own(value, key));

function assertPosition(value, label = 'position') {
  if (!exactKeys(value, ['sceneId', 'round', 'turnIndex', 'currentActorId'])
    || !(value.sceneId === null || (typeof value.sceneId === 'string' && value.sceneId.length > 0))
    || !Number.isSafeInteger(value.round) || value.round < 0
    || !Number.isSafeInteger(value.turnIndex) || value.turnIndex < 1
    || !(value.currentActorId === null || (typeof value.currentActorId === 'string' && value.currentActorId.length > 0))) {
    throw new TypeError(`${label} de clock invalide`);
  }
  return { sceneId: value.sceneId, round: value.round, turnIndex: value.turnIndex, currentActorId: value.currentActorId };
}

function assertEventId(id, baseRevision, label = 'événement') {
  if (typeof id !== 'string' || !id) throw new TypeError(`${label} sans identifiant CAS`);
  const prefix = `clock-v1:${baseRevision}:`;
  if (!id.startsWith(prefix) || !id.slice(prefix.length).trim()) {
    throw new TypeError(`${label} : identifiant CAS incompatible avec sa révision de base`);
  }
  return id;
}

function assertLastEvent(value) {
  if (value === null) return null;
  if (!exactKeys(value, ['id', 'baseRevision', 'resultRevision', 'payloadFingerprint', 'kind', 'validatedPhases'])
    || typeof value.id !== 'string' || !value.id
    || !Number.isSafeInteger(value.baseRevision) || value.baseRevision < 0
    || !Number.isSafeInteger(value.resultRevision) || value.resultRevision !== value.baseRevision + 1
    || typeof value.payloadFingerprint !== 'string' || !value.payloadFingerprint
    || !['combat-transition', 'campaign-time-advance'].includes(value.kind)
    || !Array.isArray(value.validatedPhases)) {
    throw new TypeError('reçu de clock invalide');
  }
  assertEventId(value.id, value.baseRevision, 'reçu de clock');
  let event;
  try { event = JSON.parse(value.payloadFingerprint); }
  catch { throw new TypeError('empreinte de payload de clock invalide'); }
  if (stableValue(event) !== value.payloadFingerprint || event.id !== value.id || event.baseRevision !== value.baseRevision
    || event.kind !== value.kind) throw new TypeError('empreinte de payload de clock incohérente');
  let expectedPhases;
  if (value.kind === 'combat-transition') {
    const canonical = validateCombatEvent(event);
    expectedPhases = canonical.phases;
  } else {
    validateCampaignEvent(event);
    expectedPhases = [];
  }
  if (stableValue(value.validatedPhases) !== stableValue(expectedPhases)) throw new TypeError('phases validées du reçu de clock invalides');
  return clone(value);
}

function validateCombatEvent(event) {
  if (!exactKeys(event, ['id', 'baseRevision', 'kind', 'sceneId', 'from', 'to', 'phases'])
    || typeof event.id !== 'string' || !event.id || !Number.isSafeInteger(event.baseRevision) || event.baseRevision < 0
    || event.kind !== 'combat-transition' || !Array.isArray(event.phases)) throw new TypeError('événement de combat invalide');
  assertEventId(event.id, event.baseRevision, 'événement de combat');
  const from = assertPosition(event.from, 'position avant transition');
  const to = assertPosition(event.to, 'position après transition');
  if (event.sceneId !== from.sceneId || from.sceneId !== to.sceneId) throw new TypeError('scène de transition incohérente');
  const phases = deriveTurnPhasePlan({ from, to });
  if (stableValue(event.phases) !== stableValue(phases)) throw new TypeError('plan de phases absent ou non canonique');
  return { from, to, phases };
}

function validateCampaignEvent(event) {
  if (!exactKeys(event, ['id', 'baseRevision', 'kind', 'seconds', 'reason'])
    || typeof event.id !== 'string' || !event.id || !Number.isSafeInteger(event.baseRevision) || event.baseRevision < 0
    || event.kind !== 'campaign-time-advance' || !Number.isSafeInteger(event.seconds) || event.seconds < 1
    || typeof event.reason !== 'string' || !event.reason.trim()) throw new TypeError('événement de campagne invalide');
  assertEventId(event.id, event.baseRevision, 'événement de campagne');
  return event;
}

/** Strictly validate a canonical game clock; callers may normalize only at a trusted migration/remote boundary. */
export function validateGameClock(value) {
  if (!exactKeys(value, ['schemaVersion', 'revision', 'campaignSeconds', 'combat', 'lastEvent']) || value.schemaVersion !== 1
    || !Number.isSafeInteger(value.revision) || value.revision < 0
    || !Number.isSafeInteger(value.campaignSeconds) || value.campaignSeconds < 0
    || !own(value, 'combat') || !own(value, 'lastEvent')) {
    throw new TypeError('clock de jeu invalide');
  }
  const combat = assertPosition(value.combat, 'projection combat');
  const lastEvent = assertLastEvent(value.lastEvent);
  if ((value.revision === 0 && lastEvent !== null) || (value.revision > 0 && lastEvent === null)) {
    throw new TypeError('reçu de clock requis selon la révision');
  }
  if (lastEvent && (lastEvent.resultRevision !== value.revision || lastEvent.baseRevision + 1 !== value.revision)) {
    throw new TypeError('reçu de clock incompatible avec sa révision');
  }
  return { schemaVersion: 1, revision: value.revision, campaignSeconds: value.campaignSeconds, combat, lastEvent };
}

/** Read the persisted combat authority, including the scene's V5 turn serial. */
export function readCombatPosition(state = {}) {
  const activeScene = state.activeScene?.status === 'active' ? state.activeScene : null;
  const combat = state.combat || {};
  const turnIndex = activeScene?.extensions?.v5?.turnIndex
    ?? state.extensions?.v5?.turnIndex ?? 1;
  return assertPosition({
    sceneId: activeScene?.id || null,
    round: Number.isSafeInteger(combat.round) && combat.round >= 0 ? combat.round : 0,
    turnIndex: Number.isSafeInteger(turnIndex) && turnIndex >= 1 ? turnIndex : 1,
    currentActorId: typeof combat.currentActorId === 'string' && combat.currentActorId ? combat.currentActorId : null
  });
}

/** Create an initial clock during a real snapshot migration; this never advances campaign time. */
export function createGameClock(state = {}) {
  return { schemaVersion: 1, revision: 0, campaignSeconds: 0, combat: readCombatPosition(state), lastEvent: null };
}

/** Neutral reconciliation for scene/order/manual position changes; it creates no phase and consumes no time. */
export function reconcileGameClockPosition(clockValue, positionValue) {
  const clock = validateGameClock(clockValue);
  const combat = assertPosition(positionValue);
  const changed = JSON.stringify(clock.combat) !== JSON.stringify(combat);
  return { clock: changed ? { ...clock, combat } : clock, changed };
}

function phase(phaseName, position, moment = 'afterEffects') {
  return {
    phase: phaseName,
    sceneId: position.sceneId,
    round: position.round,
    turnIndex: position.turnIndex,
    actorId: position.currentActorId,
    moment
  };
}

/** Derive the only legal end-turn phase sequence from the before/after positions produced by nextTurn. */
export function deriveTurnPhasePlan({ from: fromValue, to: toValue } = {}) {
  const from = assertPosition(fromValue, 'position avant transition');
  const to = assertPosition(toValue, 'position après transition');
  if (from.round < 1 || !from.currentActorId || !to.currentActorId
    || from.sceneId !== to.sceneId
    || to.turnIndex !== from.turnIndex + 1
    || ![from.round, from.round + 1].includes(to.round)) {
    throw new TypeError('transition de Tour invalide pour le plan de phases');
  }
  const phases = [
    phase('endOfTurn', from, 'beforeEffects'),
    phase('endOfTurn', from, 'afterEffects'),
    phase('expiry', from),
    phase('endOfCasterTurn', from)
  ];
  if (to.round > from.round) {
    phases.push(
      phase('endOfRound', from, 'beforeEffects'),
      phase('endOfRound', from, 'afterEffects'),
      phase('startOfRound', { ...to, currentActorId: null })
    );
  }
  phases.push(phase('startOfTurn', to, 'beforeEffects'), phase('startOfTurn', to, 'afterEffects'));
  return phases.map((item, index) => ({ index, ...item }));
}

function stableValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`;
}

function fingerprint(event) {
  return stableValue(event);
}

function fail(status, clock) {
  return { ok: false, status, clock: clone(clock), elapsedSeconds: 0, validatedPhases: [], receipt: null };
}

/** Apply a CAS event. Only combat transitions derived by deriveTurnPhasePlan and explicit campaign seconds are accepted. */
export function advanceGameClock(clockValue, event) {
  const clock = validateGameClock(clockValue);
  if (!event || typeof event !== 'object' || Array.isArray(event)
    || typeof event.id !== 'string' || !event.id
    || !Number.isSafeInteger(event.baseRevision) || event.baseRevision < 0) return fail('invalid', clock);
  const payloadFingerprint = fingerprint(event);
  if (clock.lastEvent?.id === event.id) {
    if (clock.lastEvent.payloadFingerprint !== payloadFingerprint) return fail('conflict', clock);
    return { ok: true, status: 'duplicate', clock: clone(clock), elapsedSeconds: 0,
      validatedPhases: clone(clock.lastEvent.validatedPhases || []), receipt: clone(clock.lastEvent) };
  }
  if (event.baseRevision !== clock.revision) return fail('stale', clock);
  let combat = clock.combat;
  let elapsedSeconds = 0;
  let validatedPhases = [];
  if (event.kind === 'combat-transition') {
    let canonical;
    try { canonical = validateCombatEvent(event); }
    catch { return fail('invalid', clock); }
    const { from, to, phases: expected } = canonical;
    if (stableValue(from) !== stableValue(clock.combat)) return fail('conflict', clock);
    combat = to;
    validatedPhases = expected;
    if (to.round > from.round) elapsedSeconds = 10;
  } else if (event.kind === 'campaign-time-advance') {
    try { validateCampaignEvent(event); }
    catch { return fail('invalid', clock); }
    elapsedSeconds = event.seconds;
  } else {
    return fail('invalid', clock);
  }
  const revision = clock.revision + 1;
  if (!Number.isSafeInteger(revision) || !Number.isSafeInteger(clock.campaignSeconds + elapsedSeconds)) return fail('invalid', clock);
  const receipt = { id: event.id, baseRevision: clock.revision, resultRevision: revision,
    payloadFingerprint, kind: event.kind, validatedPhases: clone(validatedPhases) };
  const next = { schemaVersion: 1, revision, campaignSeconds: clock.campaignSeconds + elapsedSeconds, combat, lastEvent: receipt };
  return { ok: true, status: 'applied', clock: next, elapsedSeconds, validatedPhases: clone(validatedPhases), receipt };
}
