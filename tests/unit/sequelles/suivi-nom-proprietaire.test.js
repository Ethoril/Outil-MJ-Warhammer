// T1 · CA1 : à l'ouverture d'un suivi, l'outil enregistre le nom du participant et le titre de la rencontre,
// et le personnage suivi propriétaire s'il existe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { storeWith, sheet, combatOf, asFollowed } from './soins-scenario.helper.js';

const goblin = { id: 'profil-gobelin', name: 'Gobelin', kind: 'Créature', hp: 9, maxHp: 9, caracs: { E: 30, Int: 20 } };
const encounter = { id: 'embuscade', title: 'Embuscade du pont', entries: [{ id: 'ligne', profileId: 'profil-gobelin', quantity: 2, camp: 'ennemi', zone: 'active' }] };

test('CA1 — blessure, maladie et séquelle ouvertes en rencontre : « nom — rencontre »', async () => {
  const store = await storeWith({ reserve: [goblin], encounters: [encounter] });
  await store.launchEncounter('embuscade');
  const second = store.listParticipants().find(row => row.name === 'Gobelin 2');
  assert.ok(second, 'la rencontre numérote ses exemplaires');
  await store.updateParticipant(second.id, { hp: 3 });
  const hurt = store.listParticipants().find(row => row.id === second.id);
  assert.equal(hurt.hp, 3, 'précondition : le gobelin a perdu des Blessures');
  assert.equal((await store.registerAftermathIncident({ operationId: 'i', participantId: second.id, cause: 'combat' })).receipt.status, 'applied');
  assert.equal((await store.registerAftermathDisease({ operationId: 'd', participantId: second.id, label: 'Fièvre', durationDays: 2 })).receipt.status, 'applied');
  assert.equal((await store.recordAftermathCharacteristicLoss({ operationId: 'c', participantId: second.id, carac: 'F', amount: 2, reason: 'Fièvre' })).receipt.status, 'applied');
  assert.equal((await store.decideAftermathImpressiveScars({ operationId: 's', participantId: second.id, agreed: true })).receipt.status, 'applied');
  const state = store.getAftermathState();
  const rows = [state.incidents[0], state.diseases[0], ...state.sequelae];
  assert.equal(rows.length, 4);
  for (const row of rows) {
    assert.equal(row.ownerLabel, 'Gobelin 2 — Embuscade du pont');
    assert.equal(row.ownerId, undefined, 'une copie de profil n’a pas de propriétaire');
  }
});

test('CA1 — sans rencontre, le nom seul ; le registre garde les champs à travers une sauvegarde', async () => {
  const store = await storeWith({ combat: combatOf([sheet('Blessé')]) });
  await store.registerAftermathIncident({ operationId: 'i', participantId: 'Blessé', cause: 'chute' });
  assert.equal(store.getAftermathState().incidents[0].ownerLabel, 'Blessé');
  const reloaded = await storeWith(JSON.parse(store.getFullJSON()));
  assert.equal(reloaded.getAftermathState().incidents[0].ownerLabel, 'Blessé');
});

test('CA1 — un suivi ouvert pour un personnage suivi enregistre son propriétaire', async () => {
  const { profile, character } = asFollowed(sheet('Hilda'));
  const store = await storeWith({ reserve: [profile], persistentCharacters: [character] });
  await store.registerAftermathIncident({ operationId: 'i', participantId: 'suivi:pc-Hilda', cause: 'chute' });
  const incident = store.getAftermathState().incidents[0];
  assert.deepEqual([incident.ownerId, incident.ownerLabel, incident.participantId], ['pc-Hilda', 'Hilda', 'suivi:pc-Hilda']);
});

test('une ancienne ligne sans ces champs reste valide et n’est pas réécrite', async () => {
  const old = { schemaVersion: 1, revision: 1, calendar: { schemaVersion: 1, originDay: 0, currentDay: 0 }, receipts: [], diseases: [], sequelae: [],
    incidents: [{ id: 'vieux', participantId: 'Blessé', source: { kind: 'wounds-lost', cause: 'combat' }, subjectKind: 'person', injuryDay: 0, status: 'open', bandaged: false, requiresSurgery: false, surgeryCompleted: true, infection: false, dailyChecks: [], treatments: [] }] };
  const store = await storeWith({ combat: combatOf([sheet('Blessé')]), extensions: { v5: { aftermathRegister: old } } });
  assert.deepEqual(store.getAftermathState().incidents[0], old.incidents[0]);
});
