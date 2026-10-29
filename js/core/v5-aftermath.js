import { previewV5Test } from './v5-roll.js';
import { effectiveSkillScore } from './v5-magic-talents.js';
import { hasV5Talent } from './v5-talents.js';

const clone = value => structuredClone(value);
const ID = value => typeof value === 'string' && value.trim().length > 0;
const SOURCE_KINDS = ['critical', 'wounds-lost'];
const fold = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const characteristic = (values, key) => values?.[Object.keys(values || {}).find(k => k.toLowerCase() === String(key).toLowerCase())];

function assertDay(value, label = 'jour') {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} invalide`);
  return value;
}

function validSource(source) {
  if (!source || typeof source !== 'object' || !SOURCE_KINDS.includes(source.kind)) return false;
  return source.kind === 'critical' ? ID(source.criticalId) : ID(source.cause);
}

function assertState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)
    || state.schemaVersion !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0
    || !state.calendar || state.calendar.schemaVersion !== 1
    || !Number.isSafeInteger(state.calendar.originDay) || state.calendar.originDay < 0
    || !Number.isSafeInteger(state.calendar.currentDay) || state.calendar.currentDay < state.calendar.originDay
    || !Array.isArray(state.incidents) || !Array.isArray(state.receipts)
    || (state.diseases !== undefined && !Array.isArray(state.diseases))) {
    throw new TypeError('registre de convalescence invalide');
  }
  const ids = new Set();
  for (const incident of state.incidents) {
    if (!incident || !ID(incident.id) || ids.has(incident.id) || !ID(incident.participantId) || !validSource(incident.source)
      || !Number.isSafeInteger(incident.injuryDay) || incident.injuryDay < state.calendar.originDay
      || !['open', 'closed', 'archived'].includes(incident.status) || typeof incident.bandaged !== 'boolean'
      || typeof incident.requiresSurgery !== 'boolean' || typeof incident.surgeryCompleted !== 'boolean'
      || !['person', 'animal'].includes(incident.subjectKind)
      || typeof incident.infection !== 'boolean' || !Array.isArray(incident.dailyChecks)
      || !Array.isArray(incident.treatments)) throw new TypeError('incident de blessure invalide');
    ids.add(incident.id);
  }
  for (const disease of state.diseases || []) {
    if (!disease || !ID(disease.id) || ids.has(disease.id) || !ID(disease.participantId) || !ID(disease.label)
      || !Number.isSafeInteger(disease.remainingDays) || disease.remainingDays < 0
      || !['active', 'ended'].includes(disease.status) || !Array.isArray(disease.careLog)) throw new TypeError('maladie invalide');
    ids.add(disease.id);
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

function result(state, rec) {
  return { state: clone(state), receipt: rec };
}

/** Seal a mutated copy: bump the revision and append the receipt. */
function commit(next, rec) {
  next.revision += 1;
  rec.resultRevision = next.revision;
  next.receipts.push(rec);
  return { state: next, receipt: rec };
}

function priorReceipt(state, operationId) {
  if (!ID(operationId)) throw new TypeError('identifiant d’opération requis');
  return state.receipts.find(item => item.id === operationId) || null;
}

/** A real V5 Test from a sheet score and a d100 typed by the MJ; DR modifiers are expressed in V5 DR. */
function runTest(score, roll, amount, id, label) {
  const slModifiers = amount ? [{ id, label, amount }] : [];
  return previewV5Test({ score, roll, kind: 'test', slModifiers }).options[0].result;
}
const testFacts = test => ({ roll: test.roll, score: test.score, success: test.success, sl: test.sl, fumble: test.fumble, critical: test.critical });
/** Same healer, same d100 on the same incident right after the last applied operation of that kind: a double click. */
const isDoubleSubmission = (state, kind, incidentId, healerId, roll) => {
  const last = state.receipts.at(-1);
  return Boolean(last) && last.status === 'applied' && last.kind === kind && last.incidentId === incidentId && last.healerId === healerId && last.roll === roll;
};
const validScore = score => Number.isSafeInteger(score) && score >= 0;
const validRoll = roll => Number.isInteger(roll) && roll >= 1 && roll <= 100;

export function createAftermathState({ originDay = 0 } = {}) {
  assertDay(originDay, 'jour d’origine');
  return {
    schemaVersion: 1,
    revision: 0,
    calendar: { schemaVersion: 1, originDay, currentDay: originDay },
    incidents: [],
    diseases: [],
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

const SKILL_PATTERNS = {
  heal: /^(guerison|heal)(\s*\(|$)/,
  'animal-care': /^(soins? aux animaux|animal care)(\s*\(|$)/,
  endurance: /^(resistance|endurance)(\s*\(|$)/
};
const SKILL_DEFAULT_CARAC = { heal: 'Int', 'animal-care': 'Int', endurance: 'E' };

/** Sheet skills usable for a purpose (`heal`, `animal-care`, `endurance`), with the engine's effective score. */
export function aftermathSkills(participant, purpose) {
  const pattern = SKILL_PATTERNS[purpose];
  if (!pattern) return [];
  return (participant?.skills || []).flatMap(skill => {
    if (!pattern.test(fold(skill?.name || skill?.nom))) return [];
    const total = Number(skill.total ?? skill.score ?? skill.value);
    if (!Number.isFinite(total) || total < 0) return [];
    const score = effectiveSkillScore(participant, total, skill.carac || SKILL_DEFAULT_CARAC[purpose]);
    return [{ id: skill.id ?? skill.name, name: skill.name || skill.nom, score: Math.floor(score), advances: Number(skill.advances) || 0 }];
  });
}

/**
 * Healer facts read from the participant's sheet. `skillId` selects among several matching skills;
 * the Intelligence Bonus is the tens digit of the current Intelligence.
 */
export function aftermathHealer(participant, purpose, skillId = null) {
  const skills = aftermathSkills(participant, purpose);
  const skill = skillId == null ? (skills.length === 1 ? skills[0] : null) : skills.find(row => String(row.id) === String(skillId));
  if (!skill) return { ok: false, reason: skills.length > 1 && skillId == null ? 'skill-choice-required' : 'skill-missing' };
  const int = Number(characteristic(participant.caracs, 'Int'));
  return {
    ok: true,
    healer: {
      participantId: participant.id, skill: purpose, skillId: skill.id, skillName: skill.name, score: skill.score,
      advances: skill.advances, intelligenceBonus: Number.isFinite(int) ? Math.floor(int / 10) : 0,
      hasSurgeryTalent: hasV5Talent(participant, 'talent-surgery')
    }
  };
}

/** Endurance score of a patient: the Endurance skill of the sheet, else the Basic skill's base, the Endurance characteristic. */
export function aftermathEnduranceScore(participant) {
  const skills = aftermathSkills(participant, 'endurance');
  if (skills.length) return skills[0].score;
  const value = Number(characteristic(participant?.caracs, 'E'));
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

/** A usable healer: a sheet skill with an Advance (Heal and Animal Care are Advanced skills). */
const healerProblem = (healer, skills) => (!validHealer(healer, skills) ? 'healer-skill-required' : (healer.advances >= 1 ? null : 'heal-advance-required'));
function validHealer(healer, skills) {
  return healer && ID(healer.participantId) && skills.includes(healer.skill) && validScore(healer.score)
    && Number.isSafeInteger(healer.intelligenceBonus) && healer.intelligenceBonus >= 0;
}

export function registerWoundIncident(stateValue, {
  id, operationId, expectedRevision, participantId, source, subjectKind = 'person', bandaged = false, requiresSurgery = false
} = {}) {
  const state = assertState(stateValue);
  const opId = operationId || id;
  if (!ID(opId) || !ID(id) || !ID(participantId) || !validSource(source) || !['person', 'animal'].includes(subjectKind)
    || typeof bandaged !== 'boolean' || typeof requiresSurgery !== 'boolean') {
    throw new TypeError('identité, provenance ou faits de l’incident invalides');
  }
  const prior = state.receipts.find(item => item.id === opId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, opId, 'incident', 'refused', reason));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  if (source.kind === 'critical' && state.incidents.some(item => item.source.kind === 'critical' && item.source.criticalId === source.criticalId && item.participantId === participantId)) {
    return refusal('incident-for-source-already-exists');
  }
  if (state.incidents.some(item => item.id === id)) return refusal('incident-already-exists');
  const next = clone(state);
  next.incidents.push({
    id, participantId, source: clone(source), subjectKind, injuryDay: state.calendar.currentDay, status: 'open', bandaged,
    requiresSurgery, surgeryCompleted: !requiresSurgery,
    infection: false, dailyChecks: [], treatments: []
  });
  return commit(next, receipt(state, opId, 'incident', 'applied', 'incident-registered', { incidentId: id, source }));
}

const advanceRefusal = (state, reason) => ({ status: 'refused', reason, fromDay: state.calendar.currentDay, toDay: null, requiredDailyChecks: [], absentIncidents: [] });

/**
 * Every Endurance Test (+2 DR) an advance would require, day by day. A test after the first one of an incident only
 * counts if the incident is not infected by then, so it is flagged `conditional`: the MJ rolls it, the engine ignores it
 * when an earlier day already caused the infection.
 */
export function previewAftermathAdvance(stateValue, { days, expectedRevision, absentParticipantIds = [] } = {}) {
  const state = assertState(stateValue);
  if (expectedRevision !== state.revision) return advanceRefusal(state, 'revision-conflict');
  if (!Number.isSafeInteger(days) || days < 1) return advanceRefusal(state, 'positive-whole-days-required');
  const toDay = state.calendar.currentDay + days;
  if (!Number.isSafeInteger(toDay)) return advanceRefusal(state, 'calendar-overflow');
  const requiredDailyChecks = [];
  const absentIncidents = [];
  for (const incident of state.incidents) {
    if (incident.status !== 'open') continue;
    if (absentParticipantIds.includes(incident.participantId)) { absentIncidents.push({ incidentId: incident.id, participantId: incident.participantId }); continue; }
    if (incident.bandaged || incident.infection) continue;
    const first = Math.max(state.calendar.currentDay, incident.injuryDay);
    for (let day = first; day < toDay; day += 1) {
      requiredDailyChecks.push({
        incidentId: incident.id, participantId: incident.participantId, day, test: 'endurance', difficultyDR: 2,
        conditional: day > first, ruleId: 'F-L06-0304'
      });
    }
  }
  return { status: 'ready', fromDay: state.calendar.currentDay, toDay, days, requiredDailyChecks, absentIncidents };
}

export function advanceAftermathCalendar(stateValue, {
  operationId, expectedRevision, days, dailyTests = [], enduranceScores = {}, absentParticipantIds = []
} = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const preview = previewAftermathAdvance(state, { days, expectedRevision, absentParticipantIds });
  const refusal = (reason, details = {}) => result(state, receipt(state, operationId, 'advance-calendar', 'refused', reason, details));
  if (preview.status !== 'ready') return refusal(preview.reason);
  if (!Array.isArray(dailyTests) || !enduranceScores || typeof enduranceScores !== 'object') throw new TypeError('Tests quotidiens invalides');
  const allowed = new Set(preview.requiredDailyChecks.map(check => `${check.incidentId}:${check.day}`));
  const byKey = new Map();
  for (const test of dailyTests) {
    const key = `${test?.incidentId}:${test?.day}`;
    if (!test || !ID(test.incidentId) || !Number.isSafeInteger(test.day) || !validRoll(test.roll) || byKey.has(key)) return refusal('invalid-or-duplicate-daily-test');
    if (!allowed.has(key)) return refusal('unexpected-daily-test');
    byKey.set(key, test);
  }
  const next = clone(state);
  const missing = [];
  const processed = [];
  const ignored = [];
  for (const incident of next.incidents) {
    const required = preview.requiredDailyChecks.filter(check => check.incidentId === incident.id);
    for (const check of required) {
      const supplied = byKey.get(`${incident.id}:${check.day}`);
      if (incident.infection) { if (supplied) ignored.push({ incidentId: incident.id, day: check.day, reason: 'already-infected' }); continue; }
      if (!supplied) { missing.push(check); break; }
      const score = enduranceScores[incident.participantId];
      if (!validScore(score)) return refusal('endurance-score-missing', { participantId: incident.participantId });
      const test = runTest(score, supplied.roll, 2, 'aftermath:open-wound', 'Blessure non traitée (Résistance +2 DR)');
      const record = { day: check.day, ...testFacts(test) };
      incident.dailyChecks.push(record);
      processed.push({ incidentId: incident.id, participantId: incident.participantId, ...record });
      if (!test.success) incident.infection = true;
    }
  }
  if (missing.length) return refusal('daily-tests-required', { requiredDailyChecks: preview.requiredDailyChecks, missingDailyChecks: missing });
  next.calendar.currentDay = preview.toDay;
  for (const disease of next.diseases || []) {
    if (disease.status !== 'active') continue;
    disease.remainingDays = Math.max(0, disease.remainingDays - days);
    if (!disease.remainingDays) disease.status = 'ended';
  }
  return commit(next, receipt(state, operationId, 'advance-calendar', 'applied', 'calendar-advanced', {
    fromDay: preview.fromDay, toDay: preview.toDay, days, processedDailyChecks: processed, ignoredDailyTests: ignored, absentIncidents: preview.absentIncidents
  }));
}

export function treatWoundIncident(stateValue, {
  operationId, expectedRevision, incidentId, healer, roll, wounds = 0, supplies = false, difficultyDR = 0, d10 = null, inCombat = false, bleedingOnly = false, surgeryChoice = null
} = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'treatment', 'refused', reason, { incidentId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const incident = state.incidents.find(item => item.id === incidentId);
  if (!incident) return refusal('unknown-incident');
  if (incident.status !== 'open') return refusal('incident-closed');
  const woundHealUsed = incident.treatments.some(item => ['heal', 'animal-care'].includes(item.kind));
  if (typeof bleedingOnly !== 'boolean') return refusal('invalid-test-facts');
  // V5 p.170 : le soin de Blessures est unique par incident, mais le même Test retire encore un Hémorragique par Blessure qu'il aurait rendue.
  if (bleedingOnly && !woundHealUsed) return refusal('wound-heal-not-used-yet');
  if (!bleedingOnly && woundHealUsed) return refusal('treatment-already-used-for-incident');
  { const problem = healerProblem(healer, ['heal', 'animal-care']); if (problem) return refusal(problem); }
  if ((incident.subjectKind === 'animal' && healer.skill !== 'animal-care')
    || (incident.subjectKind === 'person' && healer.skill !== 'heal')) return refusal('wrong-skill-for-subject');
  if (supplies !== true) return refusal('medical-supplies-required');
  if (!validRoll(roll) || !Number.isSafeInteger(wounds) || wounds < 0 || !Number.isSafeInteger(difficultyDR)
    || typeof inCombat !== 'boolean' || (d10 !== null && (!Number.isSafeInteger(d10) || d10 < 1 || d10 > 10))) return refusal('invalid-test-facts');
  if (inCombat && difficultyDR > 0) return refusal('combat-heal-cannot-be-easier-than-challenging');
  const test = runTest(healer.score, roll, difficultyDR, 'aftermath:heal-difficulty', 'Difficulté du soin');
  if (test.fumble && d10 === null) return refusal('fumble-d10-required');
  // Talent Chirurgie (p.127) : hors combat, le soigneur choisit les DR ou le chiffre des unités du d100 (un 0 vaut 0).
  const talentChoice = healer.hasSurgeryTalent === true && !inCombat && test.success;
  if (talentChoice && !['sl', 'units'].includes(surgeryChoice)) return refusal('surgery-talent-choice-required');
  const gained = talentChoice && surgeryChoice === 'units' ? roll % 10 : test.sl;
  const planned = test.success ? healer.intelligenceBonus + gained : 0;
  const healed = bleedingOnly ? 0 : planned;
  const fumbleDamage = test.fumble ? Math.min(d10, Math.max(0, wounds - 1)) : 0;
  const treatment = {
    operationId, day: state.calendar.currentDay, kind: bleedingOnly ? 'bleeding-care' : healer.skill, healerId: healer.participantId, skillId: healer.skillId,
    ...testFacts(test), difficultyDR, inCombat, bleedingOnly, amountChoice: talentChoice ? surgeryChoice : null, healed, bleedingToRemove: bleedingOnly ? planned : 0, fumbleDamage, d10: test.fumble ? d10 : null
  };
  const next = clone(state);
  const target = next.incidents.find(item => item.id === incidentId);
  target.treatments.push(treatment);
  if (test.success) target.bandaged = true;
  return commit(next, receipt(state, operationId, 'treatment', 'applied', test.fumble ? 'healing-fumble' : (test.success ? 'healing-success' : 'healing-failed'), {
    incidentId, skill: healer.skill, healerId: healer.participantId, ...testFacts(test), healed, amountChoice: talentChoice ? surgeryChoice : null, bleedingOnly, bleedingToRemove: bleedingOnly ? planned : 0, fumbleDamage, currentWoundsAfter: wounds - fumbleDamage
  }));
}

export function treatInfection(stateValue, {
  operationId, expectedRevision, incidentId, healer = null, roll = null, remedy = false
} = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'infection-treatment', 'refused', reason, { incidentId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const incident = state.incidents.find(item => item.id === incidentId);
  if (!incident) return refusal('unknown-incident');
  if (!incident.infection) return refusal('no-infection-to-treat');
  if (!remedy && isDoubleSubmission(state, 'infection-treatment', incidentId, healer?.participantId, roll)) return refusal('duplicate-submission');
  if (typeof remedy !== 'boolean') return refusal('invalid-remedy-or-test');
  let test = null;
  if (!remedy) {
    { const problem = healerProblem(healer, ['heal', 'animal-care']); if (problem) return refusal(problem); }
    if (!validRoll(roll)) return refusal('invalid-test-facts');
    test = runTest(healer.score, roll, -1, 'aftermath:infection-difficulty', 'Infection (Guérison −1 DR)');
  }
  const cured = remedy || test.success;
  const next = clone(state);
  const target = next.incidents.find(item => item.id === incidentId);
  if (cured) target.infection = false;
  // Soignée par un Test de Guérison, la blessure est traitée : pas de nouvelle infection le lendemain (p.171).
  if (test?.success) target.bandaged = true;
  target.treatments.push({ operationId, day: state.calendar.currentDay, kind: 'infection', remedy, healerId: healer?.participantId ?? null, ...(test ? testFacts(test) : {}), cured });
  return commit(next, receipt(state, operationId, 'infection-treatment', 'applied', remedy ? 'adapted-remedy-applied' : (cured ? 'successful-heal-minus-one' : 'infection-treatment-failed'), {
    incidentId, healerId: healer?.participantId ?? null, ...(test ? testFacts(test) : {})
  }));
}

export function treatSurgicalIncident(stateValue, {
  operationId, expectedRevision, incidentId, healer, roll, surgeryRequired = false, d10 = null, wounds = 0
} = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'surgery', 'refused', reason, { incidentId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const incident = state.incidents.find(item => item.id === incidentId);
  if (!incident) return refusal('unknown-incident');
  if (incident.status !== 'open') return refusal('incident-closed');
  const surgeryDone = incident.treatments.some(item => item.kind === 'surgery' && item.succeeded === true);
  if (!(incident.requiresSurgery || surgeryRequired === true) || surgeryDone) return refusal('surgery-not-required');
  { const problem = healerProblem(healer, ['heal']); if (problem) return refusal(problem); }
  if (healer.hasSurgeryTalent !== true) return refusal('surgery-talent-required');
  if (!validRoll(roll) || !Number.isSafeInteger(wounds) || wounds < 0 || (d10 !== null && (!Number.isSafeInteger(d10) || d10 < 1 || d10 > 10))) return refusal('invalid-test-facts');
  if (isDoubleSubmission(state, 'surgery', incidentId, healer.participantId, roll)) return refusal('duplicate-submission');
  const test = runTest(healer.score, roll, 0, 'aftermath:surgery-difficulty', 'Chirurgie (Guérison +0 DR)');
  // Maladresse : comme un soin (p.170), 1d10 Blessures sans descendre sous 1.
  if (test.fumble && d10 === null) return refusal('fumble-d10-required');
  const fumbleDamage = test.fumble ? Math.min(d10, Math.max(0, wounds - 1)) : 0;
  const next = clone(state);
  const target = next.incidents.find(item => item.id === incidentId);
  if (test.success) target.surgeryCompleted = true;
  target.treatments.push({ operationId, day: state.calendar.currentDay, kind: 'surgery', healerId: healer.participantId, skillId: healer.skillId, ...testFacts(test), succeeded: test.success, fumbleDamage, d10: test.fumble ? d10 : null });
  return commit(next, receipt(state, operationId, 'surgery', 'applied', test.success ? 'surgery-success' : (test.fumble ? 'surgery-fumble' : 'surgery-failed'), { incidentId, healerId: healer.participantId, ...testFacts(test), fumbleDamage, currentWoundsAfter: wounds - fumbleDamage }));
}

/**
 * Close an incident. Facts the engine cannot read from the register (states removed from the sheet, temporary effects
 * ended) come from the Store/MJ as booleans; the register itself still has to be clean: surgery done, no infection.
 */
export function closeAftermathIncident(stateValue, {
  operationId, expectedRevision, incidentId, statesCleared = true, temporaryEffectsEnded = false, surgeryRequired = false
} = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'close-incident', 'refused', reason, { incidentId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const incident = state.incidents.find(item => item.id === incidentId);
  if (!incident) return refusal('unknown-incident');
  if (incident.status !== 'open') return refusal('incident-closed');
  const surgeryDone = incident.treatments.some(item => item.kind === 'surgery' && item.succeeded === true);
  if ((incident.requiresSurgery || surgeryRequired === true) && !surgeryDone) return refusal('surgery-not-completed');
  if (incident.infection) return refusal('infection-still-active');
  if (incident.source.kind === 'critical' && statesCleared !== true) return refusal('critical-states-remaining');
  if (incident.source.kind === 'critical' && temporaryEffectsEnded !== true) return refusal('temporary-effects-not-confirmed');
  const next = clone(state);
  const target = next.incidents.find(item => item.id === incidentId);
  target.status = 'closed';
  target.closedDay = state.calendar.currentDay;
  return commit(next, receipt(state, operationId, 'close-incident', 'applied', incident.source.kind === 'critical' ? 'critical-healed' : 'incident-closed', { incidentId }));
}

export function registerDisease(stateValue, {
  id, operationId, expectedRevision, participantId, label, durationDays
} = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  if (!ID(id) || !ID(participantId) || !ID(label)) throw new TypeError('identité de la maladie invalide');
  const refusal = reason => result(state, receipt(state, operationId, 'disease', 'refused', reason));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  if (!Number.isSafeInteger(durationDays) || durationDays < 1) return refusal('positive-whole-days-required');
  if (state.incidents.some(item => item.id === id) || (state.diseases || []).some(item => item.id === id)) return refusal('disease-already-exists');
  const next = clone(state);
  next.diseases ??= [];
  next.diseases.push({ id, participantId, label: label.trim(), startDay: state.calendar.currentDay, remainingDays: durationDays, status: 'active', careLog: [] });
  return commit(next, receipt(state, operationId, 'disease', 'applied', 'disease-registered', { diseaseId: id }));
}

/**
 * Daily care of a patient with a disease (V5 p.182): the carer needs an Advance in Heal; a Challenging (+0 DR) Heal Test
 * protects the carer for the day, each DR after the first protects one other character; a day of rest under care
 * shortens the disease by one extra day.
 */
export function careForDisease(stateValue, {
  operationId, expectedRevision, diseaseId, healer, roll, difficultyDR = 0, rested = false
} = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'disease-care', 'refused', reason, { diseaseId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const disease = (state.diseases || []).find(item => item.id === diseaseId);
  if (!disease) return refusal('unknown-disease');
  if (disease.status !== 'active') return refusal('disease-ended');
  { const problem = healerProblem(healer, ['heal']); if (problem) return refusal(problem); }
  if (!validRoll(roll) || !Number.isSafeInteger(difficultyDR) || typeof rested !== 'boolean') return refusal('invalid-test-facts');
  const today = state.calendar.currentDay;
  if (disease.careLog.some(row => row.day === today && row.healerId === healer.participantId)) return refusal('care-already-recorded-today');
  const test = runTest(healer.score, roll, difficultyDR, 'aftermath:disease-care', 'Soins quotidiens (Guérison +0 DR)');
  const next = clone(state);
  const target = next.diseases.find(item => item.id === diseaseId);
  // Chaque soigneur fait son Test de protection ; le jour de maladie gagné par le repos ne l'est qu'une fois par jour.
  const restGained = rested && !disease.careLog.some(row => row.day === today && row.rested);
  target.careLog.push({ day: today, healerId: healer.participantId, rested });
  if (restGained) {
    target.remainingDays = Math.max(0, target.remainingDays - 1);
    if (!target.remainingDays) target.status = 'ended';
  }
  const carerProtected = test.success;
  const othersProtected = test.success ? Math.max(0, test.sl - 1) : 0;
  return commit(next, receipt(state, operationId, 'disease-care', 'applied', carerProtected ? 'carer-protected' : 'carer-not-protected', {
    diseaseId, healerId: healer.participantId, ...testFacts(test), carerProtected, othersProtected, rested, restGained, remainingDays: target.remainingDays
  }));
}

/** Archive the incident of a patient who left the combat: the history stays, no Test is expected any more. */
export function archiveAftermathIncident(stateValue, { operationId, expectedRevision, incidentId } = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'archive-incident', 'refused', reason, { incidentId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const incident = state.incidents.find(item => item.id === incidentId);
  if (!incident) return refusal('unknown-incident');
  if (incident.status !== 'open') return refusal('incident-closed');
  const next = clone(state);
  const target = next.incidents.find(item => item.id === incidentId);
  target.status = 'archived';
  target.archivedDay = state.calendar.currentDay;
  return commit(next, receipt(state, operationId, 'archive-incident', 'applied', 'incident-archived', { incidentId }));
}
