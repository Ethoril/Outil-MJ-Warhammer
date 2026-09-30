import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { userMessage } from '../js/ui/messages.js';

function memoryPersistence() {
  let state = null;
  return {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; }
  };
}

async function launched(options = {}) {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'garde', name: 'Garde', hp: 12, initiative: 30 });
  await store.addProfile({ id: 'archer', name: 'Archer', hp: 8, initiative: 50 });
  await store.addProfile({ id: 'chien', name: 'Chien', hp: 6, initiative: 20 });
  await store.saveEncounter({
    id: 'rencontre', title: 'Cour',
    entries: [
      { id: 'e1', profileId: 'garde', quantity: 2, zone: 'active', ...options.first },
      { id: 'e2', profileId: 'archer', quantity: 1, zone: 'bench' }
    ]
  });
  await store.launchEncounter('rencontre');
  return store;
}

const shape = store => store.listParticipants().map(item => ({ name: item.name, profileId: item.profileId, zone: item.zone, hp: item.hp, maxHp: item.maxHp, states: item.states }));

test('restartCombat — retour au lancement, annulable', async () => {
  const store = await launched();
  const scene = store.getActiveScene();
  const initial = shape(store);
  const [first, second] = store.listParticipants().filter(item => item.zone === 'active');
  const benched = store.listParticipants().find(item => item.zone === 'bench');
  await store.updateParticipant(first.id, { hp: 3, states: ['Sonné|2'] });
  await store.setRoundTurn(2, second.id);
  await store.moveParticipant(benched.id, 'active');
  await store.addProfilesToCombat(['chien'], { zone: 'active' });
  assert.equal(store.listParticipants().length, 4);
  const before = { scene: store.getActiveScene(), combat: shape(store) };

  await store.restartCombat();
  const after = store.getActiveScene();
  assert.equal(after.id, scene.id);
  assert.equal(after.startedAt, scene.startedAt);
  assert.equal(after.status, 'active');
  assert.equal(after.round, 0);
  assert.equal(after.currentActorId, null);
  assert.equal(store.getCombat().round, 0);
  assert.equal(store.getCombat().currentActorId, null);
  assert.deepEqual(shape(store), initial.map(item => ({ ...item })));
  assert.equal(store.listParticipants().some(item => item.profileId === 'chien'), false);
  assert.deepEqual(store.getCombat().order, after.order);
  assert.equal(store.listEncounters()[0].status, 'active');
  assert.match(store.getLog()[0].text, /Combat « Cour » recommencé : retour au lancement\./);

  await store.undo();
  assert.deepEqual(shape(store), before.combat);
  assert.equal(store.getCombat().round, 2);
  assert.equal(store.getActiveScene().id, scene.id);
});

test('restartCombat — la relance prend les profils modifiés', async () => {
  const store = await launched();
  await store.updateProfile('garde', { hp: 20 });
  await store.restartCombat();
  assert.deepEqual(store.listParticipants().filter(item => item.profileId === 'garde').map(item => item.hp), [20, 20]);
});

test('restartCombat — un personnage persistant reprend les PV de sa fiche', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'garde', name: 'Garde', hp: 12, initiative: 30 });
  await store.savePersistentCharacter({ id: 'perso', name: 'Garde', hp: 9, states: [] });
  await store.saveEncounter({ id: 'rencontre', title: 'Cour', entries: [{ id: 'e1', profileId: 'garde', zone: 'active', persistentCharacterId: 'perso' }] });
  await store.launchEncounter('rencontre');
  await store.updateParticipant(store.listParticipants()[0].id, { hp: 1 });
  await store.restartCombat();
  assert.equal(store.listParticipants()[0].hp, 9);
});

test('restartCombat — combat sans scène : PV au maximum, états vidés', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'garde', name: 'Garde', hp: 12, initiative: 30 });
  await store.addProfilesToCombat(['garde'], { zone: 'active' });
  const [participant] = store.listParticipants();
  await store.updateParticipant(participant.id, { hp: 2, states: ['Sonné|2'] });
  await store.setRoundTurn(3, participant.id);
  await store.restartCombat();
  const [after] = store.listParticipants();
  assert.equal(after.id, participant.id);
  assert.equal(after.zone, 'active');
  assert.equal(after.hp, 12);
  assert.deepEqual(after.states, []);
  assert.equal(store.getCombat().round, 0);
  assert.equal(store.getCombat().currentActorId, null);
  assert.equal(store.getLog()[0].text, 'Combat recommencé : PV remis au maximum.');
});

test('restartCombat — aucun combat, rencontre supprimée ou vidée : message lisible', async () => {
  const empty = createStore({ persistence: memoryPersistence() });
  await empty.ready;
  assert.throws(() => empty.restartCombat(), error => /Aucun combat à recommencer/.test(error.message) && userMessage(error) === 'Aucun combat en cours à recommencer.');

  const store = await launched();
  await store.saveEncounter({ ...store.listEncounters()[0], entries: [] });
  assert.throws(() => store.restartCombat(), error => userMessage(error) === 'La rencontre n’a plus aucun combattant : complétez sa composition avant de recommencer.');
  assert.equal(store.listParticipants().length, 3);
  await store.deleteEncounter('rencontre');
  assert.throws(() => store.restartCombat(), error => userMessage(error) === 'La rencontre d’origine n’existe plus : clôturez la séance, puis relancez une rencontre.');
});

test('restartCombat — ordre d’initiative et mode automatique, projections identiques', async () => {
  const store = await launched();
  const [first, second] = store.getEffectiveOrder();
  await store.moveInOrder(second, first);
  assert.equal(store.getOrderMode(), 'manual');
  await store.restartCombat();
  assert.equal(store.getOrderMode(), 'automatic');
  const scene = store.getActiveScene();
  assert.deepEqual(store.listParticipants().map(item => item.id).sort(), scene.participants.map(item => item.id).sort());
  assert.deepEqual(store.getEffectiveOrder(), scene.order);
});

test('restartCombat — les choix de rappels de la scène sont effacés', async () => {
  const store = await launched();
  const sceneId = store.getActiveScene().id;
  await store.executeCommand('resolve-reminder', draft => ({
    ...draft,
    reminderChoices: [
      { id: `${sceneId}:t1:consequence:a`, status: 'resolve' },
      { id: 'autre-scene:t1:consequence:b', status: 'resolve' }
    ]
  }));
  assert.equal(store.listReminderChoices().length, 2);
  await store.restartCombat();
  assert.deepEqual(store.listReminderChoices().map(item => item.id), ['autre-scene:t1:consequence:b']);
});
