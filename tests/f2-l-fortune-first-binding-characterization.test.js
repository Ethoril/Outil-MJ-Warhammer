import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
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

test('F2-L characterization — first PJ fiche binding adopts one spent anonymous scene balance; copies remain separate before binding', async () => {
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
  await createCombatEngine(store).start();
  await store.setFortune(firstPj.id, 3);
  await store.setFortune(firstNpc.id, 3);
  await store.acquireConditions(firstPj.id, [{ name: 'Sonné', level: 2 }], { resolutionId: 'binding-stun' });
  await store.recoverCondition(firstPj.id, 'sonne', { method: 'fortune' });
  await store.setFortune(firstNpc.id, 2);
  const firstPjIdentity = store.getFortune(firstPj.id).characterId;
  const firstNpcIdentity = store.getFortune(firstNpc.id).characterId;

  await store.suspendActiveScene();
  await store.launchEncounter('binding-scene-b');
  const secondPj = store.listParticipants().find(row => row.profileId === 'binding-pj');
  const secondNpc = store.listParticipants().find(row => row.profileId === 'binding-npc');
  assert.notEqual(firstPjIdentity, store.getFortune(secondPj.id).characterId,
    'PJ scene copies without a persistent identity are still independent before explicit binding');
  assert.notEqual(firstNpcIdentity, store.getFortune(secondNpc.id).characterId,
    'anonymous PNJ scene copies remain independent');
  assert.equal(store.getFortune(secondPj.id).balance, null);
  assert.equal(store.getFortune(secondNpc.id).balance, null);

  await store.applyFicheSync([{ profileId: 'binding-pj', snapshot: ficheSnapshot('binding-fiche', { nom: 'PJ sans fiche', chance: '9' }) }]);
  assert.equal(store.getFortune(secondPj.id).characterId, 'fiche:binding-fiche');
  assert.equal(store.getFortune(secondPj.id).balance, 2,
    'an explicit, unique PJ binding adopts the only existing local Fortune pool from its suspended copy');
  assert.equal(store.getFortune('binding-pj').balance, 2);
  const envelope = JSON.parse(store.getFullJSON());
  const suspendedNpc = envelope.suspendedScenes[0].participants.find(row => row.id === firstNpc.id);
  assert.equal(getV5Fortune(envelope, suspendedNpc).balance, 2);
  assert.equal(store.getFortune(secondNpc.id).balance, null,
    'binding a PJ does not join anonymous PNJ copies to its resource pool');
  assert.equal(envelope.extensions.v5.characterResources.length, 2,
    'one PJ pool and the independently spent anonymous PNJ pool remain registered');
});
