import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCriticalAftermathRecord } from '../js/core/v5-critical-aftermath.js';

const clone = structuredClone;
function memoryPersistence() {
  let saved = null;
  return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } };
}
const base = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 5, maxHp: 20, caracs: { E: 30, Int: 50 }, skills: [], talents: [], states: [], extensions: { v5: {} }, ...extra });
const healerSheet = (extra = {}) => base('healer', { hp: 20, skills: [{ id: 'heal', name: 'Guérison', carac: 'Int', total: 60, advances: 10, status: 'resolved' }], ...extra });
// Un critique réel de la table F2-I (Blessure béante au bras : chirurgie exigée, Hémorragique 2).
function woundedPatient() {
  const stored = createCriticalAftermathRecord(base('patient'), { table: 'ARM', effectRoll: 56, resolutionId: 'res1' });
  const patient = stored.participant;
  patient.extensions.v5.criticalWounds = [{ id: stored.record.criticalWoundId, name: 'Blessure béante', location: 'Bras', stateIds: ['st-bleed'] }];
  patient.states = [{ id: 'st-bleed', key: 'hemorragique', name: 'Hémorragique', level: 2 }];
  return { patient, record: stored.record };
}
async function setup({ participants, extensions = {}, persistence = memoryPersistence() } = {}) {
  const store = createStore({ storage: null, persistence });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants }, log: [], diceLines: [], extensions: { v5: extensions } });
  return { store, persistence };
}
const hp = (store, id) => store.listParticipants().find(row => row.id === id).hp;

test('incidents are born from an F2-I occurrence or a real wounds-lost cause, never from nothing', async () => {
  const { patient, record } = woundedPatient();
  const { store } = await setup({ participants: [patient, healerSheet(), base('whole', { hp: 20 })] });
  assert.deepEqual(store.listAftermathProposals().map(row => [row.participantId, row.criticalId, row.requiresSurgery]), [['patient', record.id, true]]);
  assert.equal((await store.registerAftermathIncident({ operationId: 'o0', participantId: 'patient' })).receipt.reason, 'incident-source-required');
  assert.equal((await store.registerAftermathIncident({ operationId: 'o1', participantId: 'patient', criticalId: 'no:such:record' })).receipt.reason, 'critical-occurrence-not-found');
  assert.equal((await store.registerAftermathIncident({ operationId: 'o2', participantId: 'whole', cause: 'rien' })).receipt.reason, 'no-wounds-lost');
  assert.equal((await store.registerAftermathIncident({ operationId: 'o3', participantId: 'ghost', cause: 'x' })).receipt.reason, 'unknown-subject');
  // La chirurgie vient de la table, pas de la saisie.
  const created = await store.registerAftermathIncident({ operationId: 'o4', participantId: 'patient', criticalId: record.id, requiresSurgery: false });
  assert.equal(created.receipt.status, 'applied');
  const incident = store.getAftermathState().incidents[0];
  assert.deepEqual([incident.requiresSurgery, incident.surgeryCompleted, incident.source], [true, false, { kind: 'critical', criticalId: record.id, criticalWoundId: record.criticalWoundId }]);
  // Migration répétée : aucune seconde création, et plus de proposition.
  assert.equal((await store.registerAftermathIncident({ operationId: 'o5', participantId: 'patient', criticalId: record.id })).receipt.reason, 'incident-for-source-already-exists');
  assert.equal(store.getAftermathState().incidents.length, 1);
  assert.deepEqual(store.listAftermathProposals(), []);
  const lost = await store.registerAftermathIncident({ operationId: 'o6', participantId: 'patient', cause: 'chute dans l’escalier' });
  assert.equal(lost.receipt.status, 'applied');
  assert.equal(store.getAftermathState().incidents[1].source.kind, 'wounds-lost');
});

test('a heal uses the healer’s sheet skill and the MJ d100; typed results are ignored; Undo/Redo and reload keep it', async () => {
  const { patient } = woundedPatient();
  const persistence = memoryPersistence();
  const { store } = await setup({ participants: [patient, healerSheet(), base('novice')], persistence });
  await store.registerAftermathIncident({ operationId: 'r', participantId: 'patient', cause: 'combat' });
  const incidentId = store.getAftermathState().incidents[0].id;
  const heal = (operationId, extra) => store.treatAftermathWound({ operationId, incidentId, supplies: true, ...extra });
  assert.equal((await heal('free', { testSL: 9, intelligenceBonus: 9 })).receipt.reason, 'healer-required');
  assert.equal((await heal('novice', { healerId: 'novice', roll: 20 })).receipt.reason, 'skill-missing');
  assert.equal((await heal('no-roll', { healerId: 'healer' })).receipt.reason, 'invalid-test-facts');
  assert.equal(hp(store, 'patient'), 5);
  // Score 60, jet 20 : 4 DR ; Int 50 → Bonus 5 : 9 Blessures rendues.
  const done = await heal('real', { healerId: 'healer', roll: 20, testSL: -9 });
  assert.deepEqual([done.receipt.status, done.receipt.sl, done.receipt.healed, hp(store, 'patient')], ['applied', 4, 9, 14]);
  assert.equal((await heal('again', { healerId: 'healer', roll: 10 })).receipt.reason, 'treatment-already-used-for-incident');
  assert.equal(await store.undo(), true);
  assert.equal(hp(store, 'patient'), 5);
  assert.equal(store.getAftermathState().incidents[0].treatments.length, 0);
  assert.equal(await store.redo(), true);
  const saved = JSON.parse(store.getFullJSON());
  const reloaded = createStore({ storage: null, persistence });
  await reloaded.ready;
  await reloaded.loadFromJSON(saved);
  assert.equal(hp(reloaded, 'patient'), 14);
  assert.equal(reloaded.getAftermathState().incidents[0].treatments[0].healerId, 'healer');
});

test('a fumble costs d10 Wounds from the patient without going under one', async () => {
  const { store } = await setup({ participants: [base('patient', { hp: 3 }), healerSheet()] });
  await store.registerAftermathIncident({ operationId: 'r', participantId: 'patient', cause: 'combat' });
  const incidentId = store.getAftermathState().incidents[0].id;
  const fumble = await store.treatAftermathWound({ operationId: 'f', incidentId, healerId: 'healer', roll: 77, supplies: true, d10: 9 });
  assert.deepEqual([fumble.receipt.fumble, fumble.receipt.fumbleDamage, hp(store, 'patient')], [true, 2, 1]);
});

test('a three-day jump asks for each daily Test, applies with an infection on day 0 and reads the patient’s Endurance', async () => {
  const { store } = await setup({ participants: [base('patient', { hp: 5, caracs: { E: 30, Int: 40 } }), healerSheet()] });
  await store.registerAftermathIncident({ operationId: 'r', participantId: 'patient', cause: 'combat' });
  const preview = store.previewAftermathAdvance({ days: 3, expectedRevision: store.getAftermathState().revision });
  assert.deepEqual(preview.requiredDailyChecks.map(row => [row.day, row.conditional, row.score, row.participantName]), [[0, false, 30, 'patient'], [1, true, 30, 'patient'], [2, true, 30, 'patient']]);
  const incidentId = store.getAftermathState().incidents[0].id;
  const jump = (operationId, rolls) => store.advanceAftermathCalendar({ operationId, days: 3, dailyTests: rolls.map(([day, roll]) => ({ incidentId, day, roll })) });
  assert.equal((await jump('few', [[1, 10]])).receipt.reason, 'daily-tests-required');
  assert.equal(store.getAftermathState().calendar.currentDay, 0);
  const applied = await jump('all', [[0, 99], [1, 10], [2, 10]]);
  assert.equal(applied.receipt.status, 'applied');
  assert.deepEqual([store.getAftermathState().calendar.currentDay, store.getAftermathState().incidents[0].infection], [3, true]);
  assert.equal(await store.undo(), true);
  assert.equal(store.getAftermathState().calendar.currentDay, 0);
});

test('surgery and closing a critical: states must be gone from the sheet, temporary effects confirmed by the MJ', async () => {
  const { patient, record } = woundedPatient();
  const surgeon = healerSheet({ id: 'surgeon', talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }] });
  const { store } = await setup({ participants: [patient, healerSheet(), surgeon] });
  await store.registerAftermathIncident({ operationId: 'r', participantId: 'patient', criticalId: record.id });
  const incidentId = store.getAftermathState().incidents[0].id;
  assert.equal((await store.treatAftermathSurgicalIncident({ operationId: 's0', incidentId, healerId: 'healer', roll: 10 })).receipt.reason, 'surgery-talent-required');
  assert.equal((await store.closeAftermathIncident({ operationId: 'c0', incidentId, temporaryEffectsEnded: true })).receipt.reason, 'surgery-not-completed');
  assert.equal((await store.treatAftermathSurgicalIncident({ operationId: 's1', incidentId, healerId: 'surgeon', roll: 10 })).receipt.reason, 'surgery-success');
  // Hémorragique est toujours sur la fiche : le critique n'est pas guéri.
  assert.equal((await store.closeAftermathIncident({ operationId: 'c1', incidentId, temporaryEffectsEnded: true })).receipt.reason, 'critical-states-remaining');
  await store.updateParticipant('patient', { states: [] });
  assert.equal((await store.closeAftermathIncident({ operationId: 'c2', incidentId, temporaryEffectsEnded: false })).receipt.reason, 'temporary-effects-not-confirmed');
  const closed = await store.closeAftermathIncident({ operationId: 'c3', incidentId, temporaryEffectsEnded: true });
  assert.equal(closed.receipt.reason, 'critical-healed');
  const after = store.listParticipants().find(row => row.id === 'patient');
  assert.deepEqual(after.extensions.v5.criticalWounds, []);
  assert.equal(after.extensions.v5.criticalAftermath.length, 1, 'l’occurrence F2-I et ses effets durables restent');
  assert.equal(await store.undo(), true);
  assert.equal(store.listParticipants().find(row => row.id === 'patient').extensions.v5.criticalWounds.length, 1);
});

test('old saves without a register stay readable; an existing register survives with unknown extensions', async () => {
  const { store } = await setup({ participants: [base('patient')], extensions: { unknownSentinel: { kept: true } } });
  assert.equal(store.getAftermathState().incidents.length, 0);
  await store.registerAftermathIncident({ operationId: 'r', participantId: 'patient', cause: 'combat' });
  const saved = JSON.parse(store.getFullJSON());
  assert.deepEqual(saved.extensions.v5.unknownSentinel, { kept: true });
  assert.equal(saved.extensions.v5.aftermathRegister.incidents.length, 1);
});

test('disease care goes through the healer’s sheet and a d100', async () => {
  const { store } = await setup({ participants: [base('patient'), healerSheet(), base('apprentice', { skills: [{ id: 'heal', name: 'Guérison', carac: 'Int', total: 40, advances: 0 }] })] });
  const registered = await store.registerAftermathDisease({ operationId: 'd', participantId: 'patient', label: 'Fièvre des marais', durationDays: 6 });
  assert.equal(registered.receipt.status, 'applied');
  const diseaseId = store.getAftermathState().diseases[0].id;
  assert.equal((await store.careForAftermathDisease({ operationId: 'c0', diseaseId, healerId: 'apprentice', roll: 10, rested: true })).receipt.reason, 'heal-advance-required');
  const care = await store.careForAftermathDisease({ operationId: 'c1', diseaseId, healerId: 'healer', roll: 20, rested: true });
  assert.deepEqual([care.receipt.carerProtected, care.receipt.othersProtected, store.getAftermathState().diseases[0].remainingDays], [true, 3, 5]);
});
