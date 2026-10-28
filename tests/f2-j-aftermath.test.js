import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceAftermathCalendar,
  aftermathDate,
  createAftermathState,
  previewAftermathAdvance,
  registerWoundIncident,
  treatInfection,
  treatSurgicalIncident,
  treatWoundIncident,
  validateAftermathState
} from '../js/core/v5-aftermath.js';
import { createStore } from '../js/core/store.js';

const register = (state, options = {}) => registerWoundIncident(state, {
  id: 'injury-1', operationId: 'register-1', expectedRevision: state.revision,
  participantId: 'participant-1', ...options
});

function advance(state, operationId, days, dailyChecks = []) {
  return advanceAftermathCalendar(state, {
    operationId, expectedRevision: state.revision, days, dailyChecks
  });
}

test('calendar is independent, whole-day, and counts an eight-day Imperial week', () => {
  let state = createAftermathState({ originDay: 17 });
  assert.deepEqual(aftermathDate(state), { day: 17, dayInImperialWeek: 1 });
  for (let i = 1; i <= 8; i += 1) {
    const out = advance(state, `advance-${i}`, 1);
    assert.equal(out.receipt.status, 'applied');
    state = out.state;
  }
  assert.deepEqual(aftermathDate(state), { day: 25, dayInImperialWeek: 1 });
  const fractional = advance(state, 'fractional', 0.5);
  assert.equal(fractional.receipt.reason, 'positive-whole-days-required');
});

test('incident registration is idempotent by operation identifier', () => {
  const state = createAftermathState();
  const first = register(state, { operationId: 'same-operation' });
  const replay = register(first.state, { operationId: 'same-operation', id: 'different-incident' });
  assert.deepEqual(replay.state, first.state);
  assert.deepEqual(replay.receipt, first.receipt);
});

test('calendar preview blocks a jump that would skip an untreated wound infection test', () => {
  let state = register(createAftermathState()).state;
  const preview = previewAftermathAdvance(state, { days: 2, expectedRevision: state.revision });
  assert.deepEqual(preview.requiredDailyChecks.map(check => check.day), [0, 1]);
  const refused = advance(state, 'skip-tests', 2);
  assert.equal(refused.receipt.status, 'refused');
  assert.equal(refused.receipt.reason, 'daily-tests-required');
  assert.equal(refused.state.calendar.currentDay, 0);
  const advanced = advance(state, 'record-tests', 2, [
    { incidentId: 'injury-1', day: 0, success: true, sl: 0 },
    { incidentId: 'injury-1', day: 1, success: false, sl: -1 }
  ]);
  assert.equal(advanced.state.calendar.currentDay, 2);
  assert.equal(advanced.state.incidents[0].infection, true);
  let newIncident = register(createAftermathState()).state;
  newIncident = advance(newIncident, 'infect-on-first-day', 2, [
    { incidentId: 'injury-1', day: 0, success: false, sl: -1 }
  ]).state;
  assert.equal(newIncident.calendar.currentDay, 2);
  assert.equal(newIncident.incidents[0].dailyChecks.length, 1);
});

test('bandaging before the end of the first day suppresses the infection check', () => {
  let state = register(createAftermathState(), { bandaged: true }).state;
  assert.deepEqual(previewAftermathAdvance(state, { days: 1, expectedRevision: state.revision }).requiredDailyChecks, []);
  state = advance(state, 'bandaged-day', 1).state;
  assert.equal(state.incidents[0].dailyChecks.length, 0);
});

test('Heal recovery uses Intelligence Bonus + SL, needs supplies, and is once per incident', () => {
  let state = register(createAftermathState()).state;
  const noSupplies = treatWoundIncident(state, {
    operationId: 'no-supplies', expectedRevision: state.revision, incidentId: 'injury-1',
    skill: 'heal', intelligenceBonus: 3, wounds: 8, testSL: 2
  });
  assert.equal(noSupplies.receipt.reason, 'medical-supplies-required');
  const treated = treatWoundIncident(state, {
    operationId: 'heal-success', expectedRevision: state.revision, incidentId: 'injury-1',
    skill: 'heal', intelligenceBonus: 3, wounds: 8, supplies: true, testSL: 2
  });
  assert.equal(treated.receipt.healed, 5);
  assert.equal(treated.state.incidents[0].bandaged, true);
  const duplicate = treatWoundIncident(treated.state, {
    operationId: 'heal-again', expectedRevision: treated.state.revision, incidentId: 'injury-1',
    skill: 'heal', intelligenceBonus: 3, wounds: 3, supplies: true, testSL: 1
  });
  assert.equal(duplicate.receipt.reason, 'treatment-already-used-for-incident');
});

test('animal incidents use Animal Care; a fumble applies d10 damage but leaves at least one Wound', () => {
  let state = createAftermathState();
  state = registerWoundIncident(state, {
    id: 'animal-incident', operationId: 'register-animal', expectedRevision: state.revision,
    participantId: 'horse-1', subjectKind: 'animal'
  }).state;
  const wrongSkill = treatWoundIncident(state, {
    operationId: 'wrong-skill', expectedRevision: state.revision, incidentId: 'animal-incident',
    skill: 'heal', intelligenceBonus: 2, wounds: 2, supplies: true, testSL: 1
  });
  assert.equal(wrongSkill.receipt.reason, 'wrong-skill-for-subject');
  const fumble = treatWoundIncident(state, {
    operationId: 'animal-fumble', expectedRevision: state.revision, incidentId: 'animal-incident',
    skill: 'animal-care', intelligenceBonus: 2, wounds: 2, supplies: true, fumble: true, d10: 7
  });
  assert.equal(fumble.receipt.fumbleDamage, 1);
  assert.equal(fumble.receipt.currentWoundsAfter, 1);
  assert.equal(fumble.state.incidents[0].bandaged, false);
});

test('combat Healing cannot be easier than Challenging (+0)', () => {
  const state = register(createAftermathState()).state;
  const result = treatWoundIncident(state, {
    operationId: 'combat-easy', expectedRevision: state.revision, incidentId: 'injury-1',
    skill: 'heal', intelligenceBonus: 2, wounds: 4, supplies: true, difficultySL: 1,
    testSL: 1, inCombat: true
  });
  assert.equal(result.receipt.reason, 'combat-heal-cannot-be-easier-than-challenging');
});

test('untreated infection clears only on successful Heal -1 or an adapted remedy', () => {
  let state = register(createAftermathState()).state;
  state = advance(state, 'infection-trigger', 1, [
    { incidentId: 'injury-1', day: 0, success: false, sl: -1 }
  ]).state;
  const failed = treatInfection(state, {
    operationId: 'failed-infection-care', expectedRevision: state.revision,
    incidentId: 'injury-1', testSL: -1
  });
  assert.equal(failed.state.incidents[0].infection, true);
  const healed = treatInfection(failed.state, {
    operationId: 'successful-infection-care', expectedRevision: failed.state.revision,
    incidentId: 'injury-1', testSL: 0
  });
  assert.equal(healed.state.incidents[0].infection, false);
});

test('surgery needs a Surgery talent and a Challenging (+0) Heal Test', () => {
  let state = register(createAftermathState(), { requiresSurgery: true }).state;
  const unqualified = treatSurgicalIncident(state, {
    operationId: 'no-surgeon', expectedRevision: state.revision, incidentId: 'injury-1', testSL: 2
  });
  assert.equal(unqualified.receipt.reason, 'surgery-talent-required');
  const tooEasy = treatSurgicalIncident(state, {
    operationId: 'easy-surgery', expectedRevision: state.revision, incidentId: 'injury-1',
    hasSurgeryTalent: true, difficultySL: 1, testSL: 2
  });
  assert.equal(tooEasy.receipt.reason, 'challenging-heal-test-required');
  const surgery = treatSurgicalIncident(state, {
    operationId: 'surgery', expectedRevision: state.revision, incidentId: 'injury-1',
    hasSurgeryTalent: true, difficultySL: 0, testSL: 0
  });
  assert.equal(surgery.state.incidents[0].surgeryCompleted, true);
  assert.equal(validateAftermathState(surgery.state).revision, surgery.state.revision);
});

test('Store keeps the calendar, incident and treatment in Undo/Redo and after reload', async () => {
  let saved = null;
  const persistence = {
    async load() { return saved && structuredClone(saved); },
    async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; }
  };
  const store = createStore({ storage: null, persistence });
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3, reserve: [],
    combat: { round: 0, currentActorId: null, order: [], participants: [{
      id: 'patient', name: 'Patient', kind: 'PJ', camp: 'pj', zone: 'active', hp: 5, maxHp: 10,
      caracs: { E: 30 }, states: [], extensions: { v5: {} }
    }] },
    log: [], diceLines: [], extensions: { v5: {} }
  });
  const registered = await store.registerAftermathIncident({ id: 'incident-a', operationId: 'register-a', participantId: 'patient' });
  assert.equal(registered.receipt.status, 'applied');
  const treated = await store.treatAftermathWound({ operationId: 'treat-a', incidentId: 'incident-a', participantId: 'patient', skill: 'heal', intelligenceBonus: 2, supplies: true, testSL: 1, difficultySL: 0 });
  assert.equal(treated.receipt.healed, 3);
  assert.equal(store.listParticipants()[0].hp, 8);
  assert.equal(await store.undo(), true);
  assert.equal(store.listParticipants()[0].hp, 5);
  assert.equal(store.getAftermathState().incidents[0].treatments.length, 0);
  assert.equal(await store.redo(), true);
  assert.equal(store.listParticipants()[0].hp, 8);
  const reloaded = createStore({ storage: null, persistence });
  await reloaded.ready;
  assert.equal(reloaded.getAftermathState().incidents[0].treatments[0].kind, 'heal');
  assert.equal(reloaded.listParticipants()[0].hp, 8);
});
