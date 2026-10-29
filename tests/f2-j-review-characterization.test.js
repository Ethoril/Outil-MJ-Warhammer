import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { advanceAftermathCalendar, createAftermathState, registerWoundIncident } from '../js/core/v5-aftermath.js';

// Revue J1 du 29/10 : trois défauts bloquants, reproduits ici avant correction.
const clone = structuredClone;
function memoryPersistence() {
  let saved = null;
  return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } };
}
const patient = { id: 'patient', name: 'Patient', kind: 'PJ', camp: 'pj', zone: 'active', hp: 5, maxHp: 10, caracs: { E: 30, Int: 40 }, skills: [], talents: [], states: [], extensions: { v5: {} } };
const healer = { id: 'healer', name: 'Soigneur', kind: 'PJ', camp: 'pj', zone: 'active', hp: 10, maxHp: 10, caracs: { E: 30, Int: 50 }, skills: [{ id: 'heal', name: 'Guérison', carac: 'Int', total: 60, advances: 10, status: 'resolved' }], talents: [], states: [], extensions: { v5: {} } };
const seeded = { schemaVersion: 1, revision: 1, calendar: { schemaVersion: 1, originDay: 0, currentDay: 0 }, receipts: [], incidents: [{ id: 'seeded', participantId: 'patient', source: { kind: 'critical', criticalId: 'res:aftermath:patient:0' }, subjectKind: 'person', injuryDay: 0, status: 'open', bandaged: false, requiresSurgery: false, surgeryCompleted: true, infection: false, dailyChecks: [], treatments: [] }] };
async function setup(register = null) {
  const store = createStore({ storage: null, persistence: memoryPersistence() });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants: [clone(patient), clone(healer)] }, log: [], diceLines: [], extensions: { v5: register ? { aftermathRegister: clone(register) } : {} } });
  return store;
}

test('défaut 1 — aucun incident sans occurrence criticalAftermath vérifiable', async () => {
  const store = await setup();
  const out = await store.registerAftermathIncident({ id: 'arbitrary', operationId: 'arbitrary-op', participantId: 'patient' });
  assert.equal(out.receipt.status, 'refused', 'un incident créé depuis le panneau, sans occurrence ni provenance, doit être refusé');
  assert.equal(store.getAftermathState().incidents.length, 0);
});

test('défaut 2 — un soin sans soigneur ni d100 est refusé, quel que soit le « résultat » fourni', async () => {
  const store = await setup(seeded);
  const out = await store.treatAftermathWound({ operationId: 'free-result', incidentId: 'seeded', participantId: 'patient', skill: 'heal', intelligenceBonus: 9, supplies: true, testSL: 9, difficultySL: 0 });
  assert.equal(out.receipt.status, 'refused');
  assert.equal(store.listParticipants().find(row => row.id === 'patient').hp, 5, 'le patient ne doit pas être soigné par un DR saisi à la main');
});

test('défaut 3 — une infection au jour 0 ne bloque pas un saut de trois jours dont l’aperçu liste les jours 0 à 2', () => {
  let state = registerWoundIncident(createAftermathState(), { id: 'i1', operationId: 'r1', expectedRevision: 0, participantId: 'patient' }).state;
  const out = advanceAftermathCalendar(state, {
    operationId: 'jump', expectedRevision: state.revision, days: 3,
    dailyChecks: [0, 1, 2].map(day => ({ incidentId: 'i1', day, success: day !== 0, sl: day === 0 ? -1 : 1 }))
  });
  assert.equal(out.receipt.status, 'applied', `refus inattendu : ${out.receipt.reason}`);
  assert.equal(out.state.calendar.currentDay, 3);
});
