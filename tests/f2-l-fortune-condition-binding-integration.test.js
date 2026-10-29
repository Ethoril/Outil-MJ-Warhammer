import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { ficheSnapshot } from '../js/core/fiche-sync.js';

function memory() {
  let state;
  return {
    load: async () => state && structuredClone(state),
    saveAtomic: async ({ state: next }) => { state = structuredClone(next); return { ok: true }; }
  };
}

test('F2-L integration — recoverCondition fortune retires one Sonné level and first PJ binding keeps the spent balance', async () => {
  const persistence = memory(), store = createStore({ persistence }); await store.ready;
  await store.addProfile({ id: 'recovery-binding-pj', name: 'PJ lié après dépense', kind: 'PJ', hp: 40, maxHp: 40,
    initiative: 60, caracs: { E: 30 } });
  for (const id of ['recovery-binding-a', 'recovery-binding-b']) {
    await store.saveEncounter({ id, title: id, entries: [{ id: `${id}:entry`, profileId: 'recovery-binding-pj', quantity: 1, zone: 'active' }] });
  }

  await store.launchEncounter('recovery-binding-a');
  const first = store.listParticipants()[0].id;
  await createCombatEngine(store).start();
  await store.setFortune(first, 3);
  const acquired = await store.acquireConditions(first, [{ name: 'Sonné', level: 2 }], { resolutionId: 'recovery-binding-stun' });
  assert.equal(acquired.status, 'applied');
  assert.equal(store.listParticipants().find(row => row.id === first).states.find(state => state.key === 'sonne')?.level, 2);

  const recovered = await store.recoverCondition(first, 'sonne', { method: 'fortune' });
  assert.equal(recovered.status, 'applied');
  assert.equal(recovered.removed.length, 1);
  assert.equal(store.listParticipants().find(row => row.id === first).states.find(state => state.key === 'sonne')?.level, 1);
  assert.equal(store.getFortune(first).balance, 2, 'real recovery spends exactly one of three Fortune points');

  await store.suspendActiveScene();
  await store.launchEncounter('recovery-binding-b');
  const second = store.listParticipants()[0].id;
  await store.applyFicheSync([{ profileId: 'recovery-binding-pj',
    snapshot: ficheSnapshot('recovery-binding-fiche', { nom: 'PJ lié après dépense', chance: '9' }) }]);
  assert.equal(store.getFortune(second).characterId, 'fiche:recovery-binding-fiche');
  assert.equal(store.getFortune(second).balance, 2, 'first explicit binding retains the Sonné recovery debit');
});
