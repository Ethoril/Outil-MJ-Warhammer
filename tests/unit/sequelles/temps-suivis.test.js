// T8 · CA28 à CA30 : l'avance du temps demande les Tests quotidiens des personnages suivis, en rencontre ou non.
import test from 'node:test';
import assert from 'node:assert/strict';
import { storeWith, sheet, asFollowed, combatOf } from './soins-scenario.helper.js';

const DAY = 86400;
async function setup() {
  const followed = asFollowed(sheet('Hilda', { caracs: { E: 30, Int: 50 }, skills: [{ id: 'res', name: 'Résistance', carac: 'E', total: 45, advances: 15 }] }));
  const store = await storeWith({ reserve: [followed.profile], persistentCharacters: [followed.character], combat: combatOf([sheet('présent')]) });
  await store.registerAftermathIncident({ operationId: 'a', participantId: 'suivi:pc-Hilda', cause: 'chute' });
  await store.registerAftermathIncident({ operationId: 'b', participantId: 'présent', cause: 'combat' });
  const [off, present] = store.getAftermathState().incidents.map(row => row.id);
  return { store, off, present };
}

test('CA28, CA29 — l’aperçu demande le Test du personnage suivi hors rencontre, avec le score de sa fiche', async () => {
  const { store, off, present } = await setup();
  const preview = store.previewAftermathAdvance({ days: 1, expectedRevision: store.getAftermathState().revision });
  assert.deepEqual(preview.requiredDailyChecks.map(row => [row.incidentId, row.participantName, row.score]), [[off, 'Hilda', 45], [present, 'présent', 30]]);
  assert.deepEqual(preview.absentIncidents, [], 'CA30 : un personnage suivi n’est jamais « hors du combat, aucun Test attendu »');
});

test('CA28 — l’avance du calendrier exige puis joue le Test du personnage suivi', async () => {
  const { store, off, present } = await setup();
  const missing = await store.advanceAftermathCalendar({ operationId: 'j0', days: 1, dailyTests: [{ incidentId: present, day: 0, roll: 10 }] });
  assert.equal(missing.receipt.reason, 'daily-tests-required');
  assert.deepEqual(missing.receipt.missingDailyChecks.map(row => row.incidentId), [off]);
  // Résistance 45, +2 DR : 65. Un 70 échoue : infection.
  const done = await store.advanceAftermathCalendar({ operationId: 'j1', days: 1, dailyTests: [{ incidentId: off, day: 0, roll: 70 }, { incidentId: present, day: 0, roll: 10 }] });
  assert.equal(done.receipt.status, 'applied', done.receipt.reason);
  assert.deepEqual(done.receipt.processedDailyChecks.map(row => [row.incidentId, row.score, row.success]), [[off, 45, false], [present, 30, true]]);
  assert.deepEqual(store.getAftermathState().incidents.map(row => row.infection), [true, false]);
});

test('CA28 — le temps de campagne demande aussi ces Tests, puis avance avec eux', async () => {
  const { store, off, present } = await setup();
  const blocked = await store.advanceCampaignTime({ seconds: DAY, reason: 'Une nuit' });
  assert.equal(blocked.ok, false);
  const need = (blocked.needsInput || []).find(row => row.code === 'aftermath-daily-tests');
  assert.deepEqual((need?.requiredDailyChecks || []).map(row => row.incidentId), [off, present]);
  const done = await store.advanceCampaignTime({ seconds: DAY, reason: 'Une nuit', dailyTests: [{ incidentId: off, day: 0, roll: 20 }, { incidentId: present, day: 0, roll: 20 }] });
  assert.equal(done.ok, true, JSON.stringify(done));
  assert.equal(store.getAftermathState().calendar.currentDay, 1);
  assert.deepEqual(store.getAftermathState().incidents.map(row => row.dailyChecks.length), [1, 1]);
});

test('CA30 — seuls les suivis sans sujet (scène suspendue, ancien suivi) restent sans Test', async () => {
  const old = { schemaVersion: 1, revision: 1, calendar: { schemaVersion: 1, originDay: 0, currentDay: 0 }, receipts: [], diseases: [], sequelae: [],
    incidents: [{ id: 'vieux', participantId: 'disparu', source: { kind: 'wounds-lost', cause: 'combat' }, subjectKind: 'person', injuryDay: 0, status: 'open', bandaged: false, requiresSurgery: false, surgeryCompleted: true, infection: false, dailyChecks: [], treatments: [] }] };
  const store = await storeWith({ extensions: { v5: { aftermathRegister: old } } });
  const preview = store.previewAftermathAdvance({ days: 1, expectedRevision: 1 });
  assert.deepEqual([preview.requiredDailyChecks, preview.absentIncidents], [[], [{ incidentId: 'vieux', participantId: 'disparu' }]]);
  assert.equal((await store.advanceAftermathCalendar({ operationId: 'j', days: 1 })).receipt.status, 'applied');
});
