import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceAftermathCalendar, aftermathDate, aftermathEnduranceScore, aftermathHealer, careForDisease, closeAftermathIncident,
  createAftermathState, previewAftermathAdvance, registerDisease, registerWoundIncident, treatInfection, treatSurgicalIncident,
  treatWoundIncident, validateAftermathState
} from '../js/core/v5-aftermath.js';

const wounds = { kind: 'wounds-lost', cause: 'chute de cheval' };
const register = (state, options = {}) => registerWoundIncident(state, {
  id: 'injury-1', operationId: 'register-1', expectedRevision: state.revision,
  participantId: 'participant-1', source: wounds, ...options
});
const advance = (state, operationId, days, dailyTests = [], enduranceScores = { 'participant-1': 30 }) => advanceAftermathCalendar(state, {
  operationId, expectedRevision: state.revision, days, dailyTests, enduranceScores
});
const healer = (extra = {}) => ({ participantId: 'healer', skill: 'heal', skillId: 'heal', score: 60, intelligenceBonus: 5, advances: 10, hasSurgeryTalent: false, ...extra });
const treat = (state, operationId, extra = {}) => treatWoundIncident(state, {
  operationId, expectedRevision: state.revision, incidentId: 'injury-1', healer: healer(), roll: 20, wounds: 8, supplies: true, ...extra
});

test('calendar is independent, whole-day, and counts an eight-day Imperial week', () => {
  let state = createAftermathState({ originDay: 17 });
  assert.deepEqual(aftermathDate(state), { day: 17, dayInImperialWeek: 1 });
  for (let i = 1; i <= 8; i += 1) {
    const out = advance(state, `advance-${i}`, 1);
    assert.equal(out.receipt.status, 'applied');
    state = out.state;
  }
  assert.deepEqual(aftermathDate(state), { day: 25, dayInImperialWeek: 1 });
  assert.equal(advance(state, 'fractional', 0.5).receipt.reason, 'positive-whole-days-required');
});

test('incident needs a valid source, is idempotent by operation, and one critical opens one incident', () => {
  assert.throws(() => register(createAftermathState(), { source: undefined }), TypeError);
  assert.throws(() => register(createAftermathState(), { source: { kind: 'critical' } }), TypeError);
  const critical = { kind: 'critical', criticalId: 'res:aftermath:participant-1:0' };
  const first = register(createAftermathState(), { source: critical });
  const replay = register(first.state, { source: critical, id: 'different-incident' });
  assert.deepEqual(replay.receipt, first.receipt);
  const duplicate = register(first.state, { source: critical, id: 'other', operationId: 'other-op' });
  assert.equal(duplicate.receipt.reason, 'incident-for-source-already-exists');
  assert.equal(duplicate.state.incidents.length, 1);
});

test('the preview lists every day of the jump; later days are conditional and the engine rolls only what is needed', () => {
  const state = register(createAftermathState()).state;
  const preview = previewAftermathAdvance(state, { days: 3, expectedRevision: state.revision });
  assert.deepEqual(preview.requiredDailyChecks.map(check => [check.day, check.conditional, check.difficultyDR]), [[0, false, 2], [1, true, 2], [2, true, 2]]);
  const missing = advance(state, 'skip-tests', 3, [{ incidentId: 'injury-1', day: 0, roll: 10 }]);
  assert.equal(missing.receipt.reason, 'daily-tests-required');
  assert.deepEqual(missing.receipt.missingDailyChecks.map(check => check.day), [1]);
  assert.equal(missing.state.calendar.currentDay, 0);
  // Infection le jour 0 : les jets des jours 1 et 2 sont ignorés, jamais inventés ni comptés.
  const infected = advance(state, 'infected-day-0', 3, [0, 1, 2].map(day => ({ incidentId: 'injury-1', day, roll: day === 0 ? 99 : 10 })));
  assert.equal(infected.receipt.status, 'applied');
  assert.equal(infected.state.calendar.currentDay, 3);
  assert.equal(infected.state.incidents[0].infection, true);
  assert.deepEqual(infected.state.incidents[0].dailyChecks.map(check => [check.day, check.success]), [[0, false]]);
  assert.deepEqual(infected.receipt.ignoredDailyTests.map(item => item.day), [1, 2]);
  // Réussite le jour 0 : le jour 1 devient indispensable.
  const passed = advance(state, 'passed-day-0', 2, [{ incidentId: 'injury-1', day: 0, roll: 10 }]);
  assert.equal(passed.receipt.reason, 'daily-tests-required');
  const both = advance(state, 'passed-both', 2, [{ incidentId: 'injury-1', day: 0, roll: 10 }, { incidentId: 'injury-1', day: 1, roll: 90 }]);
  assert.deepEqual(both.state.incidents[0].dailyChecks.map(check => [check.day, check.success]), [[0, true], [1, false]]);
  assert.equal(both.state.incidents[0].infection, true);
  assert.equal(advance(state, 'foreign', 1, [{ incidentId: 'injury-1', day: 5, roll: 10 }]).receipt.reason, 'unexpected-daily-test');
  assert.equal(advance(state, 'no-score', 1, [{ incidentId: 'injury-1', day: 0, roll: 10 }], {}).receipt.reason, 'endurance-score-missing');
});

test('the daily Endurance Test is a real +2 DR Test on the patient score', () => {
  const state = register(createAftermathState()).state;
  // Score 30, jet 80 : 3 − 8 = −5 DR, +2 = −3 : échec. Jet 40 : 3 − 4 = −1, +2 = +1 : réussite.
  assert.equal(advance(state, 'a', 1, [{ incidentId: 'injury-1', day: 0, roll: 80 }]).state.incidents[0].infection, true);
  const ok = advance(state, 'b', 1, [{ incidentId: 'injury-1', day: 0, roll: 40 }]);
  assert.deepEqual([ok.state.incidents[0].dailyChecks[0].success, ok.state.incidents[0].dailyChecks[0].sl], [true, 1]);
});

test('bandaging before the end of the first day suppresses the infection check', () => {
  let state = register(createAftermathState(), { bandaged: true }).state;
  assert.deepEqual(previewAftermathAdvance(state, { days: 1, expectedRevision: state.revision }).requiredDailyChecks, []);
  state = advance(state, 'bandaged-day', 1).state;
  assert.equal(state.incidents[0].dailyChecks.length, 0);
});

test('Heal recovers Intelligence Bonus + DR from a real Test, needs supplies, and is once per incident', () => {
  const state = register(createAftermathState()).state;
  assert.equal(treat(state, 'no-supplies', { supplies: false }).receipt.reason, 'medical-supplies-required');
  assert.equal(treat(state, 'no-healer', { healer: null }).receipt.reason, 'healer-skill-required');
  assert.equal(treat(state, 'bad-roll', { roll: 0 }).receipt.reason, 'invalid-test-facts');
  // Score 60, jet 20 : 6 − 2 = 4 DR ; Bonus d'Intelligence 5.
  const treated = treat(state, 'heal-success');
  assert.deepEqual([treated.receipt.success, treated.receipt.sl, treated.receipt.healed], [true, 4, 9]);
  assert.equal(treated.state.incidents[0].bandaged, true);
  assert.equal(treat(treated.state, 'heal-again', { roll: 10 }).receipt.reason, 'treatment-already-used-for-incident');
  // Difficulté du MJ en DR : −2 → 2 DR.
  assert.equal(treat(state, 'hard', { difficultyDR: -2 }).receipt.healed, 7);
  // Échec sans maladresse : le soin est consommé, rien n'est soigné, pas de bandage.
  const failed = treat(state, 'failed', { roll: 90 });
  assert.deepEqual([failed.receipt.success, failed.receipt.healed, failed.state.incidents[0].bandaged], [false, 0, false]);
  assert.equal(treat(failed.state, 'retry', { roll: 10 }).receipt.reason, 'treatment-already-used-for-incident');
});

test('animal incidents use Animal Care; a fumble costs d10 Wounds but leaves at least one', () => {
  const animal = register(createAftermathState(), { id: 'animal', operationId: 'register-animal', participantId: 'horse', subjectKind: 'animal' }).state;
  const options = { incidentId: 'animal', wounds: 2, healer: healer({ skill: 'animal-care' }) };
  assert.equal(treat(animal, 'wrong', { ...options, healer: healer() }).receipt.reason, 'wrong-skill-for-subject');
  assert.equal(treat(animal, 'no-d10', { ...options, roll: 77 }).receipt.reason, 'fumble-d10-required');
  const fumble = treat(animal, 'fumble', { ...options, roll: 77, d10: 7 });
  assert.deepEqual([fumble.receipt.fumble, fumble.receipt.fumbleDamage, fumble.receipt.currentWoundsAfter, fumble.receipt.healed], [true, 1, 1, 0]);
  assert.equal(fumble.state.incidents[0].bandaged, false);
});

test('combat Healing cannot be easier than Challenging (+0 DR)', () => {
  const state = register(createAftermathState()).state;
  assert.equal(treat(state, 'combat-easy', { difficultyDR: 1, inCombat: true }).receipt.reason, 'combat-heal-cannot-be-easier-than-challenging');
  assert.equal(treat(state, 'combat-hard', { difficultyDR: -1, inCombat: true }).receipt.status, 'applied');
});

test('untreated infection clears only on a successful Heal −1 Test or an adapted remedy', () => {
  let state = register(createAftermathState()).state;
  state = advance(state, 'infection-trigger', 1, [{ incidentId: 'injury-1', day: 0, roll: 99 }]).state;
  const care = (current, operationId, extra) => treatInfection(current, { operationId, expectedRevision: current.revision, incidentId: 'injury-1', ...extra });
  assert.equal(care(state, 'free', {}).receipt.reason, 'healer-skill-required');
  const failed = care(state, 'failed', { healer: healer(), roll: 96 });
  assert.equal(failed.state.incidents[0].infection, true);
  // Score 60, jet 60 : 6 − 6 = 0, −1 = −1 : échec ; jet 50 : 1 − 1 = 0 : réussite marginale refusée par le −1 ? 6 − 5 − 1 = 0 : réussite.
  assert.equal(care(failed.state, 'marginal-fail', { healer: healer(), roll: 60 }).state.incidents[0].infection, true);
  const healed = care(failed.state, 'healed', { healer: healer(), roll: 50 });
  assert.equal(healed.state.incidents[0].infection, false);
  assert.equal(care(state, 'remedy', { remedy: true }).state.incidents[0].infection, false);
});

test('surgery needs the Surgery talent and a Challenging (+0 DR) Heal Test, and gates closing a critical', () => {
  const critical = { kind: 'critical', criticalId: 'c1' };
  let state = register(createAftermathState(), { source: critical, requiresSurgery: true }).state;
  const operate = (current, operationId, extra) => treatSurgicalIncident(current, { operationId, expectedRevision: current.revision, incidentId: 'injury-1', ...extra });
  assert.equal(operate(state, 'no-surgeon', { healer: healer(), roll: 10 }).receipt.reason, 'surgery-talent-required');
  assert.equal(operate(state, 'no-healer', {}).receipt.reason, 'healer-skill-required');
  const surgeon = healer({ hasSurgeryTalent: true });
  const failed = operate(state, 'fail', { healer: surgeon, roll: 90 });
  assert.equal(failed.state.incidents[0].surgeryCompleted, false);
  assert.equal(closeAftermathIncident(failed.state, { operationId: 'close-early', expectedRevision: failed.state.revision, incidentId: 'injury-1', temporaryEffectsEnded: true }).receipt.reason, 'surgery-not-completed');
  const done = operate(failed.state, 'success', { healer: surgeon, roll: 60 });
  assert.equal(done.state.incidents[0].surgeryCompleted, true);
  assert.equal(validateAftermathState(done.state).revision, done.state.revision);
});

test('a critical is healed only once states and temporary effects are over; infection blocks closing', () => {
  const critical = { kind: 'critical', criticalId: 'c1' };
  let state = register(createAftermathState(), { source: critical }).state;
  const close = (current, operationId, extra) => closeAftermathIncident(current, { operationId, expectedRevision: current.revision, incidentId: 'injury-1', ...extra });
  assert.equal(close(state, 'states', { statesCleared: false, temporaryEffectsEnded: true }).receipt.reason, 'critical-states-remaining');
  assert.equal(close(state, 'effects', { temporaryEffectsEnded: false }).receipt.reason, 'temporary-effects-not-confirmed');
  const infected = advance(state, 'infected', 1, [{ incidentId: 'injury-1', day: 0, roll: 99 }]).state;
  assert.equal(close(infected, 'infected-close', { temporaryEffectsEnded: true }).receipt.reason, 'infection-still-active');
  const closed = close(state, 'ok', { temporaryEffectsEnded: true });
  assert.deepEqual([closed.receipt.reason, closed.state.incidents[0].status], ['critical-healed', 'closed']);
  assert.equal(close(closed.state, 'again', { temporaryEffectsEnded: true }).receipt.reason, 'incident-closed');
});

test('disease care: an Advance in Heal, a +0 DR Test protecting the carer and DR−1 others, one extra day off for rest', () => {
  let state = createAftermathState();
  state = registerDisease(state, { id: 'd1', operationId: 'disease', expectedRevision: 0, participantId: 'patient', label: 'Fièvre', durationDays: 5 }).state;
  const care = (current, operationId, extra) => careForDisease(current, { operationId, expectedRevision: current.revision, diseaseId: 'd1', healer: healer(), roll: 20, rested: true, ...extra });
  assert.equal(care(state, 'untrained', { healer: healer({ advances: 0 }) }).receipt.reason, 'heal-advance-required');
  const first = care(state, 'care-1');
  assert.deepEqual([first.receipt.carerProtected, first.receipt.othersProtected, first.state.diseases[0].remainingDays], [true, 3, 4]);
  assert.equal(care(first.state, 'care-2').receipt.reason, 'care-already-recorded-today');
  const failed = care(state, 'failed', { roll: 90, rested: false });
  assert.deepEqual([failed.receipt.carerProtected, failed.receipt.othersProtected, failed.state.diseases[0].remainingDays], [false, 0, 5]);
  // Le calendrier retire les jours écoulés ; la maladie se termine à zéro.
  const later = advance(first.state, 'later', 4);
  assert.deepEqual([later.state.diseases[0].remainingDays, later.state.diseases[0].status], [0, 'ended']);
  assert.equal(care(later.state, 'after-end', { operationId: 'x' }).receipt.reason, 'disease-ended');
});

test('healer and Endurance facts are read from the sheet with the engine score functions', () => {
  const sheet = {
    id: 'sheet', caracs: { Int: 47, E: 35 }, talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }],
    skills: [{ id: 'heal', name: 'Guérison', carac: 'Int', total: 52, advances: 5 }, { id: 'ac', name: 'Soin aux animaux', carac: 'Int', total: 41, advances: 0 }]
  };
  const found = aftermathHealer(sheet, 'heal');
  assert.deepEqual([found.ok, found.healer.score, found.healer.intelligenceBonus, found.healer.hasSurgeryTalent, found.healer.advances], [true, 52, 4, true, 5]);
  assert.equal(aftermathHealer(sheet, 'animal-care').healer.score, 41);
  assert.equal(aftermathHealer({ id: 'bare', skills: [], caracs: {} }, 'heal').reason, 'skill-missing');
  // Écart de caractéristique : même fonction que le reste du moteur (Int 47 au lieu de 40 de base : +7).
  const shifted = { ...sheet, extensions: { v5: { baseCaracs: { Int: 40 } } } };
  assert.equal(aftermathHealer(shifted, 'heal').healer.score, 59);
  assert.equal(aftermathEnduranceScore(sheet), 35);
  assert.equal(aftermathEnduranceScore({ ...sheet, skills: [{ name: 'Résistance', carac: 'E', total: 48 }] }), 48);
});
