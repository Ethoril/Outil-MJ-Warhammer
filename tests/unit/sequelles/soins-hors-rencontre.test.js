// T6 · CA15, CA17, CA18, CA32, CA33 : soigner un personnage suivi hors rencontre.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { storeWith, woundedPatient, healerSheet, sheet, asFollowed, combatOf, memoryPersistence } from './soins-scenario.helper.js';

const followedPair = () => {
  const { patient, record } = woundedPatient();
  const a = asFollowed(patient), b = asFollowed(healerSheet());
  return { envelope: { reserve: [a.profile, b.profile], persistentCharacters: [a.character, b.character] }, record };
};
const P = 'suivi:pc-patient', H = 'suivi:pc-healer';
const patientOf = store => store.listAftermathSubjects().find(row => row.id === P);

test('CA17 — une Blessure Critique reçue en rencontre est opérée, ses séquelles ouvertes et son suivi clos hors rencontre', async () => {
  const { patient, record } = woundedPatient();
  const store = await storeWith({ combat: combatOf([patient, healerSheet()]) });
  // PJ sans fiche : gardés à la fin du combat.
  await store.registerAftermathIncident({ operationId: 'i', participantId: 'patient', criticalId: record.id });
  const incidentId = store.getAftermathState().incidents[0].id;
  await store.updateParticipant('healer', { hp: 19 });
  await store.registerAftermathIncident({ operationId: 'ih', participantId: 'healer', cause: 'combat', bandaged: true });
  await store.endEncounter({ keepIds: ['patient', 'healer'] });
  const [pcPatient, pcHealer] = store.listPersistentCharacters();
  const patientId = `suivi:${pcPatient.id}`, healerId = `suivi:${pcHealer.id}`;
  assert.equal(pcPatient.extensions.v5.criticalAftermath[0].id, record.id, 'la fiche du critique est reportée sur le personnage');
  assert.equal((await store.treatAftermathSurgicalIncident({ operationId: 's', incidentId, healerId, roll: 20 })).receipt.reason, 'surgery-success');
  assert.equal((await store.openAftermathSequelae({ operationId: 'o', incidentId })).receipt.reason, 'nothing-to-follow');
  assert.equal((await store.closeAftermathIncident({ operationId: 'c0', incidentId, temporaryEffectsEnded: true })).receipt.reason, 'critical-states-remaining');
  const heal = await store.treatAftermathWound({ operationId: 'w', incidentId, healerId, roll: 20, supplies: true, surgeryChoice: 'sl' });
  assert.deepEqual([heal.receipt.status, heal.receipt.healed, heal.receipt.bleedingRemoved], ['applied', 9, 1]);
  const closed = await store.closeAftermathIncident({ operationId: 'c1', incidentId, temporaryEffectsEnded: true });
  assert.equal(closed.receipt.reason, 'critical-healed');
  const after = store.listAftermathSubjects().find(row => row.id === patientId);
  assert.deepEqual([after.hp, after.states, after.extensions.v5.criticalWounds], [14, [], []]);
  assert.equal(store.getAftermathState().incidents[0].status, 'closed');
});

test('CA18 — chaque opération hors rencontre s’annule par ↶ et survit au rechargement, à l’export et à l’import', async () => {
  const persistence = memoryPersistence();
  const { envelope } = followedPair();
  const store = await storeWith(envelope, persistence);
  await store.registerAftermathIncident({ operationId: 'i', participantId: P, cause: 'chute' });
  const incidentId = store.getAftermathState().incidents[0].id;
  await store.treatAftermathWound({ operationId: 'w', incidentId, healerId: H, roll: 20, supplies: true, surgeryChoice: 'sl' });
  assert.equal(patientOf(store).hp, 14);
  assert.equal(await store.undo(), true);
  assert.equal(patientOf(store).hp, 5);
  assert.equal(store.getAftermathState().incidents[0].treatments.length, 0);
  assert.equal(await store.redo(), true);
  assert.equal(patientOf(store).hp, 14);
  const reopened = createStore({ storage: null, persistence });
  await reopened.ready;
  assert.equal(patientOf(reopened).hp, 14, 'rechargement');
  assert.equal(reopened.getAftermathState().incidents[0].treatments[0].healerId, H);
  const imported = await storeWith(JSON.parse(store.getFullJSON()));
  assert.equal(patientOf(imported).hp, 14, 'export puis import');
  assert.deepEqual(imported.getAftermathState().incidents[0], store.getAftermathState().incidents[0]);
});

test('CA15 — maladresse, infection, maladie, perte de caractéristique et cicatrices hors rencontre', async () => {
  const { envelope } = followedPair();
  const store = await storeWith(envelope);
  await store.registerAftermathIncident({ operationId: 'i', participantId: P, cause: 'chute' });
  const incidentId = store.getAftermathState().incidents[0].id;
  const fumble = await store.treatAftermathWound({ operationId: 'w', incidentId, healerId: H, roll: 100, d10: 9, supplies: true });
  assert.deepEqual([fumble.receipt.reason, fumble.receipt.fumbleDamage, patientOf(store).hp], ['healing-fumble', 4, 1], 'jamais sous 1 Blessure');
  assert.equal((await store.recordAftermathCharacteristicLoss({ operationId: 'l', participantId: P, carac: 'Ag', amount: 3, reason: 'Fracture mal soignée' })).receipt.status, 'applied');
  assert.equal((await store.decideAftermathImpressiveScars({ operationId: 'c', participantId: P, agreed: false })).receipt.status, 'applied');
  assert.deepEqual(store.listAftermathSequelae().characteristics, { [P]: store.listAftermathSequelae().characteristics[P] });
  assert.ok(store.listAftermathSequelae().characteristics[P], 'les pertes permanentes sont comptées pour le personnage suivi');
  assert.equal((await store.archiveAftermathIncident({ operationId: 'a', incidentId })).receipt.reason, 'subject-still-present');
});

test('CA32 — ouvrir une maladie pour un personnage suivi hors rencontre, puis la soigner', async () => {
  const { envelope } = followedPair();
  const store = await storeWith(envelope);
  const opened = await store.registerAftermathDisease({ operationId: 'd', participantId: P, label: 'Fièvre des marais', durationDays: 3 });
  assert.equal(opened.receipt.status, 'applied');
  const disease = store.getAftermathState().diseases[0];
  assert.deepEqual([disease.participantId, disease.ownerId, disease.ownerLabel], [P, 'pc-patient', 'patient']);
  const care = await store.careForAftermathDisease({ operationId: 'c', diseaseId: disease.id, healerId: H, roll: 20, rested: true });
  assert.deepEqual([care.receipt.status, care.receipt.remainingDays], ['applied', 2]);
  assert.equal((await store.registerAftermathDisease({ operationId: 'd2', participantId: 'suivi:inconnu', label: 'Fièvre', durationDays: 3 })).receipt.reason, 'unknown-subject');
});

test('CA33 — suivi de Blessures perdues : ouvert s’il en a perdu, refusé sinon', async () => {
  const whole = asFollowed(sheet('entier', { hp: 20 }));
  const { envelope } = followedPair();
  const store = await storeWith({ reserve: [...envelope.reserve, whole.profile], persistentCharacters: [...envelope.persistentCharacters, whole.character] });
  assert.equal((await store.registerAftermathIncident({ operationId: 'a', participantId: 'suivi:pc-entier', cause: 'rien' })).receipt.reason, 'no-wounds-lost');
  assert.equal((await store.registerAftermathIncident({ operationId: 'b', participantId: P, cause: 'chute' })).receipt.status, 'applied');
  assert.deepEqual(store.listAftermathProposals().map(row => [row.participantId, row.requiresSurgery]), [[P, true]], 'le critique non suivi d’un personnage hors rencontre est proposé');
});
