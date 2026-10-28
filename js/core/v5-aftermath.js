const clone = value => structuredClone(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const ID = value => typeof value === 'string' && value.trim().length > 0;

function assertDay(value, label = 'jour') {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} invalide`);
  return value;
}

function assertState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)
    || state.schemaVersion !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0
    || !state.calendar || state.calendar.schemaVersion !== 1
    || !Number.isSafeInteger(state.calendar.originDay) || state.calendar.originDay < 0
    || !Number.isSafeInteger(state.calendar.currentDay) || state.calendar.currentDay < state.calendar.originDay
    || !Array.isArray(state.incidents) || !Array.isArray(state.receipts)) {
    throw new TypeError('registre de convalescence invalide');
  }
  const ids = new Set();
  for (const incident of state.incidents) {
    if (!incident || !ID(incident.id) || ids.has(incident.id) || !ID(incident.participantId)
      || !Number.isSafeInteger(incident.injuryDay) || incident.injuryDay < state.calendar.originDay
      || !['open', 'closed'].includes(incident.status) || typeof incident.bandaged !== 'boolean'
      || typeof incident.requiresSurgery !== 'boolean' || typeof incident.surgeryCompleted !== 'boolean'
      || !['person', 'animal'].includes(incident.subjectKind)
      || typeof incident.infection !== 'boolean' || !Array.isArray(incident.dailyChecks)
      || !Array.isArray(incident.treatments)) throw new TypeError('incident de blessure invalide');
    ids.add(incident.id);
  }
  return state;
}

function receipt(state, id, kind, status, reason, details = {}) {
  return {
    id, kind, status, reason,
    baseRevision: state.revision,
    resultRevision: state.revision + (status === 'applied' ? 1 : 0),
    day: state.calendar.currentDay,
    ...clone(details)
  };
}

function result(state, rec, applied) {
  const next = clone(state);
  if (applied) {
    next.revision += 1;
    next.receipts.push(rec);
  }
  return { state: next, receipt: rec };
}

export function createAftermathState({ originDay = 0 } = {}) {
  assertDay(originDay, 'jour d’origine');
  return {
    schemaVersion: 1,
    revision: 0,
    calendar: { schemaVersion: 1, originDay, currentDay: originDay },
    incidents: [],
    receipts: []
  };
}

export function validateAftermathState(state) {
  assertState(state);
  return clone(state);
}

export function aftermathDate(state) {
  assertState(state);
  const day = state.calendar.currentDay;
  return { day, dayInImperialWeek: ((day - state.calendar.originDay) % 8) + 1 };
}

export function registerWoundIncident(stateValue, {
  id, operationId, expectedRevision, participantId, subjectKind = 'person', bandaged = false, requiresSurgery = false
} = {}) {
  const state = assertState(stateValue);
  const opId = operationId || id;
  if (!ID(opId) || !ID(id) || !ID(participantId) || !['person', 'animal'].includes(subjectKind)
    || typeof bandaged !== 'boolean' || typeof requiresSurgery !== 'boolean') {
    throw new TypeError('identité ou faits de l’incident invalides');
  }
  const prior = state.receipts.find(item => item.id === opId);
  if (prior) return { state: clone(state), receipt: prior };
  if (expectedRevision !== state.revision) return result(state, receipt(state, opId, 'incident', 'refused', 'revision-conflict'));
  if (state.incidents.some(item => item.id === id)) return result(state, receipt(state, opId, 'incident', 'refused', 'incident-already-exists'));
  const next = clone(state);
  next.revision += 1;
  next.incidents.push({
    id, participantId, subjectKind, injuryDay: state.calendar.currentDay, status: 'open', bandaged,
    requiresSurgery, surgeryCompleted: !requiresSurgery,
    infection: false, dailyChecks: [], treatments: []
  });
  const rec = receipt(state, opId, 'incident', 'applied', 'incident-registered', { incidentId: id });
  rec.resultRevision = next.revision;
  next.receipts.push(rec);
  return { state: next, receipt: rec };
}

function addReceipt(state, operationId) {
  if (!ID(operationId)) throw new TypeError('identifiant d’opération requis');
  return state.receipts.find(item => item.id === operationId) || null;
}

export function previewAftermathAdvance(stateValue, { days, expectedRevision } = {}) {
  const state = assertState(stateValue);
  if (expectedRevision !== state.revision) return { status: 'refused', reason: 'revision-conflict', fromDay: state.calendar.currentDay, toDay: null, requiredDailyChecks: [] };
  if (!Number.isSafeInteger(days) || days < 1) return { status: 'refused', reason: 'positive-whole-days-required', fromDay: state.calendar.currentDay, toDay: null, requiredDailyChecks: [] };
  const toDay = state.calendar.currentDay + days;
  if (!Number.isSafeInteger(toDay)) return { status: 'refused', reason: 'calendar-overflow', fromDay: state.calendar.currentDay, toDay: null, requiredDailyChecks: [] };
  const requiredDailyChecks = [];
  for (let day = state.calendar.currentDay; day < toDay; day += 1) {
    for (const incident of state.incidents) {
      if (incident.status !== 'open' || incident.bandaged || incident.infection || day < incident.injuryDay) continue;
      if (!incident.dailyChecks.some(check => check.day === day)) {
        requiredDailyChecks.push({ incidentId: incident.id, participantId: incident.participantId, day, test: 'endurance', difficultySL: 2, ruleId: 'F-L06-0304' });
      }
    }
  }
  return { status: 'ready', fromDay: state.calendar.currentDay, toDay, days, requiredDailyChecks };
}

export function advanceAftermathCalendar(stateValue, {
  operationId, expectedRevision, days, dailyChecks = []
} = {}) {
  const state = assertState(stateValue);
  const prior = addReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const preview = previewAftermathAdvance(state, { days, expectedRevision });
  const refusal = (reason, details = {}) => result(state, receipt(state, operationId, 'advance-calendar', 'refused', reason, details));
  if (preview.status !== 'ready') return refusal(preview.reason);
  if (!Array.isArray(dailyChecks)) throw new TypeError('résultats des Tests quotidiens invalides');
  const seen = new Set();
  for (const check of dailyChecks) {
    if (!check || !ID(check.incidentId) || !Number.isSafeInteger(check.day) || typeof check.success !== 'boolean'
      || !Number.isSafeInteger(check.sl) || seen.has(`${check.incidentId}:${check.day}`)) {
      return refusal('invalid-or-duplicate-daily-test');
    }
    if (check.success !== (check.sl >= 0)) return refusal('daily-test-result-conflicts-with-sl');
    seen.add(`${check.incidentId}:${check.day}`);
  }
  const next = clone(state);
  const requiredKeys = new Set();
  const checksByKey = new Map(dailyChecks.map(check => [`${check.incidentId}:${check.day}`, check]));
  const missingDailyChecks = [];
  for (const incident of next.incidents) {
    if (incident.status !== 'open' || incident.bandaged || incident.infection) continue;
    for (let day = Math.max(state.calendar.currentDay, incident.injuryDay); day < preview.toDay; day += 1) {
      if (incident.infection) break;
      const key = `${incident.id}:${day}`;
      requiredKeys.add(key);
      const check = checksByKey.get(key);
      if (!check) {
        missingDailyChecks.push({ incidentId: incident.id, participantId: incident.participantId, day, test: 'endurance', difficultySL: 2, ruleId: 'F-L06-0304' });
        break;
      }
      if (incident.dailyChecks.some(item => item.day === day)) return refusal('daily-test-already-recorded');
      incident.dailyChecks.push({ day, success: check.success, sl: check.sl });
      if (!check.success) incident.infection = true;
    }
  }
  if (missingDailyChecks.length) return refusal('daily-tests-required', { requiredDailyChecks: preview.requiredDailyChecks, missingDailyChecks });
  if ([...checksByKey.keys()].some(key => !requiredKeys.has(key))) return refusal('unexpected-daily-test');
  next.calendar.currentDay = preview.toDay;
  next.revision += 1;
  const rec = receipt(state, operationId, 'advance-calendar', 'applied', 'calendar-advanced', {
    fromDay: preview.fromDay, toDay: preview.toDay, days, processedDailyChecks: clone(dailyChecks)
  });
  rec.resultRevision = next.revision;
  next.receipts.push(rec);
  return { state: next, receipt: rec };
}

export function treatWoundIncident(stateValue, {
  operationId, expectedRevision, incidentId, skill, intelligenceBonus = 0,
  wounds = 0, supplies = false, difficultySL = 0, testSL = null, fumble = false, d10 = null,
  inCombat = false
} = {}) {
  const state = assertState(stateValue);
  const prior = addReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'treatment', 'refused', reason, { incidentId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const incident = state.incidents.find(item => item.id === incidentId);
  if (!incident) return refusal('unknown-incident');
  if (incident.status !== 'open') return refusal('incident-closed');
  if (incident.treatments.some(item => ['heal', 'animal-care'].includes(item.kind))) return refusal('treatment-already-used-for-incident');
  if (!['heal', 'animal-care'].includes(skill)) return refusal('unknown-treatment-skill');
  if ((incident.subjectKind === 'animal' && skill !== 'animal-care')
    || (incident.subjectKind === 'person' && skill !== 'heal')) return refusal('wrong-skill-for-subject');
  if (typeof supplies !== 'boolean' || !supplies) return refusal('medical-supplies-required');
  if (!Number.isSafeInteger(intelligenceBonus) || intelligenceBonus < 0 || !Number.isSafeInteger(wounds) || wounds < 1
    || !Number.isSafeInteger(difficultySL) || (!fumble && !Number.isSafeInteger(testSL))
    || (fumble && testSL !== null && !Number.isSafeInteger(testSL)) || typeof fumble !== 'boolean'
    || (d10 !== null && (!Number.isSafeInteger(d10) || d10 < 1 || d10 > 10))) return refusal('invalid-test-facts');
  if (inCombat && difficultySL > 0) return refusal('combat-heal-cannot-be-easier-than-challenging');
  if (fumble && d10 === null) return refusal('fumble-d10-required');
  const healed = fumble ? 0 : testSL >= 0 ? Math.max(0, intelligenceBonus + testSL) : 0;
  const fumbleDamage = fumble ? Math.min(d10, wounds - 1) : 0;
  const treatment = { operationId, day: state.calendar.currentDay, kind: skill, fumble, healed, fumbleDamage, testSL, difficultySL };
  const next = clone(state);
  const target = next.incidents.find(item => item.id === incidentId);
  target.treatments.push(treatment);
  if (!fumble && testSL >= 0) target.bandaged = true;
  const rec = receipt(state, operationId, 'treatment', 'applied', fumble ? 'healing-fumble' : (testSL >= 0 ? 'healing-success' : 'healing-failed'), { incidentId, skill, healed, fumbleDamage, currentWoundsAfter: Math.max(1, wounds - fumbleDamage) });
  next.revision += 1;
  rec.resultRevision = next.revision;
  next.receipts.push(rec);
  return { state: next, receipt: rec };
}

export function treatInfection(stateValue, {
  operationId, expectedRevision, incidentId, remedy = false, testSL = null, difficultySL = -1
} = {}) {
  const state = assertState(stateValue);
  const prior = addReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'infection-treatment', 'refused', reason, { incidentId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const incident = state.incidents.find(item => item.id === incidentId);
  if (!incident) return refusal('unknown-incident');
  if (!incident.infection) return refusal('no-infection-to-treat');
  if (typeof remedy !== 'boolean' || !Number.isSafeInteger(difficultySL)
    || (!remedy && (!Number.isSafeInteger(testSL) || difficultySL !== -1))) return refusal('invalid-remedy-or-test');
  if (remedy || testSL >= 0) {
    const next = clone(state);
    next.incidents.find(item => item.id === incidentId).infection = false;
    next.revision += 1;
    const rec = receipt(state, operationId, 'infection-treatment', 'applied', remedy ? 'adapted-remedy-applied' : 'successful-heal-minus-one', { incidentId, testSL });
    rec.resultRevision = next.revision;
    next.receipts.push(rec);
    return { state: next, receipt: rec };
  }
  const rec = receipt(state, operationId, 'infection-treatment', 'applied', 'infection-treatment-failed', { incidentId, testSL });
  const next = clone(state);
  next.revision += 1;
  rec.resultRevision = next.revision;
  next.receipts.push(rec);
  return { state: next, receipt: rec };
}

export function treatSurgicalIncident(stateValue, {
  operationId, expectedRevision, incidentId, hasSurgeryTalent = false, difficultySL = 0, testSL = null
} = {}) {
  const state = assertState(stateValue);
  const prior = addReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'surgery', 'refused', reason, { incidentId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const incident = state.incidents.find(item => item.id === incidentId);
  if (!incident) return refusal('unknown-incident');
  if (!incident.requiresSurgery || incident.surgeryCompleted) return refusal('surgery-not-required');
  if (!hasSurgeryTalent || typeof hasSurgeryTalent !== 'boolean') return refusal('surgery-talent-required');
  if (difficultySL !== 0 || !Number.isSafeInteger(testSL)) return refusal('challenging-heal-test-required');
  const next = clone(state);
  const target = next.incidents.find(item => item.id === incidentId);
  target.surgeryCompleted = testSL >= 0;
  target.treatments.push({ operationId, day: state.calendar.currentDay, kind: 'surgery', difficultySL, testSL, succeeded: testSL >= 0 });
  next.revision += 1;
  const rec = receipt(state, operationId, 'surgery', 'applied', testSL >= 0 ? 'surgery-success' : 'surgery-failed', { incidentId, difficultySL, testSL });
  rec.resultRevision = next.revision;
  next.receipts.push(rec);
  return { state: next, receipt: rec };
}
