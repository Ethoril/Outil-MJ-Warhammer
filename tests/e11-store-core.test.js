import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

function memoryPersistence() {
  let state = null;
  return {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; }
  };
}

test('Store — scène et combat partagent les mêmes participants, suspension/reprise conserve les PV', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'profile', name: 'Garde', hp: 12, initiative: 30 });
  await store.savePersistentCharacter({ id: 'character', name: 'Garde', hp: 9, states: [] });
  await store.saveEncounter({ id: 'encounter', title: 'Cour', entries: [{ id: 'entry', profileId: 'profile', zone: 'active', persistentCharacterId: 'character' }] });
  await store.launchEncounter('encounter');
  const participant = store.listParticipants()[0];
  assert.equal(store.getActiveScene().participants[0].id, participant.id);
  await store.updateParticipant(participant.id, { hp: 4 });
  assert.equal(store.getActiveScene().participants[0].hp, 4);
  await store.suspendActiveScene();
  const suspended = store.listSuspendedScenes()[0];
  assert.equal(store.getCombat().participants.size, 0);
  await store.resumeScene(suspended.id);
  const activeSceneId = store.getActiveScene().id;
  assert.equal(store.listParticipants()[0].hp, 4);
  const preview = store.previewClosure();
  const result = await store.closeScene({ preview });
  assert.equal(result.ok, true);
  assert.equal(store.getActiveScene(), null);
  assert.equal(store.getCombat().participants.size, 0);
  assert.equal(store.listPersistentCharacters()[0].hp, 4);
  assert.equal(store.listArchives().length, 1);
  await store.undo();
  assert.equal(store.listArchives().length, 0);
  assert.equal(store.getActiveScene().id, activeSceneId);
  assert.equal(store.listPersistentCharacters()[0].hp, 9);
  await store.redo();
  assert.equal(store.getActiveScene(), null);
  assert.equal(store.listArchives().length, 1);
  const archiveId = store.listArchives()[0].id;
  await store.deleteArchive(archiveId);
  assert.equal(store.listArchives().length, 0);
  await store.undo();
  assert.equal(store.listArchives().length, 1);
  await store.redo();
  assert.equal(store.listArchives().length, 0);
});

test('Store — une simulation appliquée ne passe qu’une fois par la résolution', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addParticipant({ id: 'actor', name: 'Attaquant', hp: 10, zone: 'active' });
  await store.addParticipant({ id: 'target', name: 'Cible', hp: 10, armor: { body: 0 }, caracs: { E: 30 }, zone: 'active' });
  const simulation = store.simulateAction({ actorId: 'actor', targetId: 'target', action: { type: 'attack', base: 60, damage: 2 }, roll: 40 });
  const result = await store.applySimulation(simulation);
  assert.equal(result.status, 'applied');
  assert.equal(store.getCombat().participants.get('target').hp, 9);
  assert.equal(store.getLog()[0].kind, 'resolution');
  assert.equal(store.getLog()[0].detail.roll, 40);
  assert.equal(store.canUndo(), true);
});

test('Store — une résolution est appliquée après commit et un rejeu reste duplicate', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addParticipant({ id: 'actor-resolution', name: 'Attaquant', hp: 10, zone: 'active' });
  await store.addParticipant({ id: 'target-resolution', name: 'Cible', hp: 10, armor: { body: 0 }, caracs: { E: 30 }, zone: 'active' });
  const preview = store.previewResolution({
    actorId: 'actor-resolution', targetId: 'target-resolution',
    action: { type: 'attack', base: 60, damage: 2 }, roll: 40
  });
  const result = await store.applyResolution(preview);
  assert.equal(result.status, 'applied');
  assert.equal(store.getCombat().participants.get('target-resolution').hp, 9);
  assert.equal(store.getLog()[0].detail.resolutionId, preview.resolutionId);
  assert.equal((await store.applyResolution(preview)).status, 'duplicate');
});

test('Store — une résolution en file recalcule le draft et ne remplace pas une mutation concurrente', async () => {
  let state = null;
  let hold = false;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let signalSave;
  const saveStarted = new Promise(resolve => { signalSave = resolve; });
  const persistence = {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) {
      if (hold) { signalSave(); await gate; }
      state = structuredClone(next);
      return { ok: true };
    }
  };
  const store = createStore({ persistence });
  await store.ready;
  await store.addParticipant({ id: 'actor-race', name: 'Attaquant', hp: 10, zone: 'active' });
  await store.addParticipant({ id: 'target-race', name: 'Cible', hp: 10, armor: { body: 0 }, caracs: { E: 30 }, zone: 'active' });
  const preview = store.previewResolution({ actorId: 'actor-race', targetId: 'target-race', action: { type: 'attack', base: 60, damage: 2 }, roll: 40 });
  hold = true;
  const edit = store.updateParticipant('target-race', { hp: 8 });
  const apply = store.applyResolution(preview);
  await saveStarted;
  release();
  await edit;
  assert.equal((await apply).status, 'stale');
  assert.equal(store.getCombat().participants.get('target-race').hp, 8);
});

test('Store — plusieurs scènes suspendues restent indépendantes et une seule reprend à la fois', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.addProfile({ id: 'p', name: 'Profil', hp: 10 });
  await store.saveEncounter({ id: 'a', title: 'A', entries: [{ id: 'a1', profileId: 'p', zone: 'active' }] });
  await store.saveEncounter({ id: 'b', title: 'B', entries: [{ id: 'b1', profileId: 'p', zone: 'active' }] });
  await store.launchEncounter('a');
  const sceneA = store.getActiveScene();
  await store.suspendActiveScene();
  await store.launchEncounter('b');
  const sceneB = store.getActiveScene();
  await store.suspendActiveScene();
  assert.equal(store.listSuspendedScenes().length, 2);
  await store.resumeScene(sceneA.id);
  assert.equal(store.getActiveScene().id, sceneA.id);
  await assert.rejects(store.resumeScene(sceneB.id), /active|active ou suspendue/i);
});
