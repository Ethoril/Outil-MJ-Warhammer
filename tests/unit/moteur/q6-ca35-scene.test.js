import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';

test('Obstiné choisi pendant la préparation reste décompté dans la scène lancée', async () => {
  const store = createStore({ storage: null }); await store.ready;
  await store.addProfile({ id: 'rider-profile', name: 'Cavalier', kind: 'PJ', hp: 20, initiative: 40,
    caracs: { I: 40, Ag: 40 }, skills: [{ id: 'ride', name: 'Chevaucher', status: 'resolved', total: 50 }],
    talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }], extensions: { v5: { mounted: true, mountId: 'horse' } } });
  await store.saveEncounter({ id: 'ambush', entries: [{ id: 'rider-entry', profileId: 'rider-profile', zone: 'active', camp: 'ambush' }] });
  await store.startTalentSession();
  const staging = store.previewEncounterLaunch('ambush');
  const rider = staging.scene.participants[0];
  assert.equal(store.getObstinateStatus(rider.id, rider, staging.scene).available, true);
  const preview = store.previewCombatInitialization({ staging, startCombat: true, surprisedCamp: 'ambush', diceById: { [rider.id]: 5 },
    mountedRideTests: { [rider.id]: { score: 50, roll: 30, conditionContext: { preRollTalent: 'strong-minded' } } } });
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput));
  assert.equal(preview.mountedFall[0].test.roll, 30);
  assert.equal((await store.applyCombatInitialization(preview)).status, 'applied');
  assert.equal(store.getObstinateStatus(rider.id).available, false, 'l’usage suit le cavalier dans la scène active');
  await store.undo();
  assert.equal(store.getObstinateStatus(rider.id, rider, staging.scene).available, true);
});

test('Scène préparée : le quota déjà utilisé pour cette entrée bloque le choix avant et pendant le lancement', async () => {
  const store = createStore({ storage: null }); await store.ready;
  await store.addProfile({ id: 'rider-profile', name: 'Cavalier', kind: 'PJ', hp: 20, initiative: 40, caracs: { I: 40, Ag: 40 },
    talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }], extensions: { v5: { mounted: true, mountId: 'horse' } } });
  await store.saveEncounter({ id: 'ambush', entries: [{ id: 'rider-entry', profileId: 'rider-profile', zone: 'active', camp: 'ambush' }] });
  await store.startTalentSession();
  await store.executeCommand('test-quota', draft => {
    const scopeKey = JSON.stringify([draft.extensions.v5.talentSessionId]);
    draft.extensions.v5.actionLedger = { appliedActions: [], quotaUsage: [{ actorId: 'copy:ambush:rider-entry:0', quotaId: 'talent:strong-minded', scope: 'session', scopeKey, used: 1 }] };
    return draft;
  });
  const staging = store.previewEncounterLaunch('ambush'), rider = staging.scene.participants[0];
  assert.equal(store.getObstinateStatus(rider.id, rider, staging.scene).available, false);
  const preview = store.previewCombatInitialization({ staging, startCombat: true, surprisedCamp: 'ambush', diceById: { [rider.id]: 5 },
    mountedRideTests: { [rider.id]: { score: 50, roll: 30, conditionContext: { preRollTalent: 'strong-minded' } } } });
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput));
  await assert.rejects(async () => store.applyCombatInitialization(preview), /déjà utilisé/);
  assert.equal(store.getActiveScene(), null);
});

test('Scène préparée avec cavalier et monture réellement présents : usage et annulation', async () => {
  const store = createStore({ storage: null }); await store.ready;
  await store.addProfile({ id: 'rider-profile', name: 'Cavalier', kind: 'PJ', hp: 20, initiative: 40, caracs: { I: 40, Ag: 40 },
    talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }] });
  await store.addProfile({ id: 'horse-profile', name: 'Destrier', kind: 'Créature', hp: 20, initiative: 30, caracs: { I: 30 } });
  await store.saveEncounter({ id: 'ambush-horse', entries: [
    { id: 'rider-entry', profileId: 'rider-profile', zone: 'active', camp: 'ambush' },
    { id: 'horse-entry', profileId: 'horse-profile', zone: 'active', camp: 'ambush' }
  ] });
  await store.startTalentSession();
  // La monture est une entrée réelle de la scène prévisualisée.
  const horseId = store.previewEncounterLaunch('ambush-horse').scene.participants.find(row => row.profileId === 'horse-profile').id;
  await store.updateProfile('rider-profile', { extensions: { v5: { mounted: true, mountId: horseId } } });
  const staging = store.previewEncounterLaunch('ambush-horse');
  const [rider, horse] = staging.scene.participants;
  assert.equal(horse.id, horseId);
  assert.equal(rider.extensions.v5.mountId, horse.id, 'la monture du cavalier figure réellement dans la scène');
  const preview = store.previewCombatInitialization({ staging, startCombat: true, surprisedCamp: 'ambush', diceById: { [rider.id]: 5, [horse.id]: 4 },
    mountedRideTests: { [rider.id]: { score: 50, roll: 30, conditionContext: { preRollTalent: 'strong-minded' } } } });
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput));
  assert.equal(preview.mountedFall[0].test.roll, 30);
  assert.equal((await store.applyCombatInitialization(preview)).status, 'applied');
  assert.equal(store.getObstinateStatus(rider.id).available, false);
  await store.undo();
  assert.equal(store.getObstinateStatus(rider.id, rider, staging.scene).available, true);
});
