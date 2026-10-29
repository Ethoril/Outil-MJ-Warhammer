import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { ficheSnapshot } from '../js/core/fiche-sync.js';
import { getV5Fortune } from '../js/core/v5-resources.js';

function memory() {
  let state;
  return {
    load: async () => state && structuredClone(state),
    saveAtomic: async ({ state: next }) => { state = structuredClone(next); return { ok: true }; },
    snapshot: () => structuredClone(state)
  };
}

test('F2-L characterization — anonymous PJ scene balances stay separate until MJ resolves first fiche binding', async () => {
  const persistence = memory(), store = createStore({ persistence }); await store.ready;
  await store.addProfile({ id: 'binding-pj', name: 'PJ sans fiche', kind: 'PJ', hp: 20, maxHp: 20 });
  await store.addProfile({ id: 'binding-npc', name: 'Modèle PNJ', kind: 'PNJ', hp: 20, maxHp: 20 });
  for (const id of ['binding-scene-a', 'binding-scene-b']) {
    await store.saveEncounter({ id, title: id, entries: [
      { id: `${id}:pj`, profileId: 'binding-pj', zone: 'active' },
      { id: `${id}:npc`, profileId: 'binding-npc', zone: 'active' }
    ] });
  }

  await store.launchEncounter('binding-scene-a');
  const firstPj = store.listParticipants().find(row => row.profileId === 'binding-pj');
  const firstNpc = store.listParticipants().find(row => row.profileId === 'binding-npc');
  await store.setFortune(firstPj.id, 3);
  await store.setFortune(firstNpc.id, 3);
  const spend = store.previewResolution({ resolutionId: 'binding-spend', actorId: firstPj.id,
    action: { type: 'test', attr: 'CC', base: 50 }, roll: 61,
    v5: { kind: 'test', costs: [{ id: 'binding-spent-fortune', resource: 'fortune', amount: 1 }] } });
  assert.equal((await store.applyResolution(spend)).status, 'applied');
  await store.setFortune(firstNpc.id, 2);
  assert.equal(store.getFortune(firstPj.id).balance, 2, 'the suspended PJ pool must contain the spent point before binding');
  const firstPjIdentity = store.getFortune(firstPj.id).characterId;
  const firstNpcIdentity = store.getFortune(firstNpc.id).characterId;

  await store.suspendActiveScene();
  await store.launchEncounter('binding-scene-b');
  const secondPj = store.listParticipants().find(row => row.profileId === 'binding-pj');
  const secondNpc = store.listParticipants().find(row => row.profileId === 'binding-npc');
  await store.setFortune(secondPj.id, 4);
  assert.notEqual(firstPjIdentity, store.getFortune(secondPj.id).characterId,
    'PJ scene copies without a persistent identity are still independent before explicit binding');
  assert.notEqual(firstNpcIdentity, store.getFortune(secondNpc.id).characterId,
    'anonymous PNJ scene copies remain independent');
  assert.equal(store.getFortune(secondPj.id).balance, 4);
  assert.equal(store.getFortune(secondNpc.id).balance, null);

  const firstBinding = [{ profileId: 'binding-pj', snapshot: ficheSnapshot('binding-fiche', { nom: 'PJ sans fiche', chance: '9' }) }];
  await assert.rejects(store.applyFicheSync(firstBinding), /copies de ce PJ ont des soldes de Chance différents/,
    'different independent scene balances require an explicit MJ choice');
  assert.match(store.getFortune(secondPj.id).characterId, /^copy:/,
    'the rejected association leaves the second copy anonymous and its balance intact');
  assert.equal(store.getFortune(secondPj.id).balance, 4);
  await store.setFortune(secondPj.id, 2);
  await store.applyFicheSync(firstBinding);
  assert.equal(store.getFortune(secondPj.id).characterId, 'fiche:binding-fiche');
  assert.equal(store.getFortune(secondPj.id).balance, 2,
    'after the MJ equalizes the scene copies, the explicit PJ binding preserves their spent balance');
  assert.equal(store.getFortune('binding-pj').balance, 2);
  const envelope = JSON.parse(store.getFullJSON());
  const suspendedNpc = envelope.suspendedScenes[0].participants.find(row => row.id === firstNpc.id);
  assert.equal(getV5Fortune(envelope, suspendedNpc).balance, 2);
  assert.equal(store.getFortune(secondNpc.id).balance, null,
    'binding a PJ does not join anonymous PNJ copies to its resource pool');
  assert.equal(envelope.extensions.v5.characterResources.length, 2,
    'one PJ pool and the independently spent anonymous PNJ pool remain registered');
});
