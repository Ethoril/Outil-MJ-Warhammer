import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { encounterJournalScope, purgeEncounterJournal, purgeEncounterJournalHistory } from '../js/core/encounter-journal.js';

function memoryPersistence() {
  let state = null;
  let reject = false;
  return {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) {
      if (reject) throw new Error('Disque indisponible');
      state = structuredClone(next); return { ok: true };
    },
    snapshot: () => structuredClone(state),
    rejectWrites: value => { reject = value; }
  };
}

async function sceneStore() {
  const persistence = memoryPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.addProfile({ id: 'p', name: 'Même nom', hp: 20, caracs: { E: 30 }, initiative: 40 });
  for (const id of ['a', 'b']) await store.saveEncounter({ id, title: 'Même titre', entries: [{ id: `${id}:entry`, profileId: 'p', quantity: 2, zone: 'active' }] });
  await store.launchEncounter('a');
  return { store, persistence };
}

async function resolved(store, resolutionId) {
  const [actor, target] = store.listParticipants();
  const preview = store.previewResolution({ actorId: actor.id, targetId: target.id, resolutionId,
    action: { type: 'attack', base: 60, damage: 4 }, roll: 42, defense: { base: 30, roll: 76 } });
  const result = await store.applyResolution(preview);
  assert.equal(result.status, 'applied', result.reason);
  return preview;
}

test('Lot2 — suppression purge reçus, archives et marqueurs de sa rencontre, conserve une autre au même titre', async () => {
  const { store, persistence } = await sceneStore();
  const previewA = await resolved(store, 'resolution-a');
  const sceneA = store.getActiveScene();
  await store.log({ text: 'Note sans acteur' });
  assert.equal(store.getLog()[0].encounterId, 'a');
  await store.executeCommand('archive-fixture', draft => ({ ...draft,
    archives: [{ id: sceneA.id, encounterId: 'a', participants: sceneA.participants }, { id: 'archive-b', encounterId: 'b', participants: [] }] }));
  await store.suspendActiveScene();
  await store.launchEncounter('b');
  const previewB = await resolved(store, 'resolution-b');
  await store.deleteEncounter('a');
  assert.equal(store.getActiveScene().encounterId, 'b');
  assert.equal(store.listSuspendedScenes().length, 0);
  assert.ok(!store.getLog().some(entry => entry.encounterId === 'a' || entry.detail?.resolutionId === previewA.resolutionId));
  assert.ok(store.getLog().some(entry => entry.detail?.resolutionId === previewB.resolutionId));
  const saved = persistence.snapshot();
  assert.deepEqual(saved.archives.map(entry => entry.encounterId), ['b']);
  assert.ok(!saved.appliedResolutionIds.includes(previewA.resolutionId));
  assert.ok(saved.appliedResolutionIds.includes(previewB.resolutionId));
  for (const command of saved.history.past) for (const value of [command.result?.state, command.inverse?.state]) {
    assert.ok(!value.log.some(entry => entry.encounterId === 'a'));
    assert.ok(!value.archives.some(entry => entry.encounterId === 'a'));
  }
});

test('Lot2 — annuler puis recharger une suppression ne ressuscite pas le journal purgé', async () => {
  const { store, persistence } = await sceneStore();
  await resolved(store, 'resolution-purge');
  await store.deleteEncounter('a');
  await store.undo();
  assert.equal(store.getActiveScene().encounterId, 'a');
  assert.ok(!store.getLog().some(entry => entry.detail?.resolutionId === 'resolution-purge'));
  const reloaded = createStore({ persistence }); await reloaded.ready;
  assert.equal(reloaded.getActiveScene().encounterId, 'a');
  assert.ok(!reloaded.getLog().some(entry => entry.detail?.resolutionId === 'resolution-purge'));
  await reloaded.redo();
  assert.equal(reloaded.getActiveScene(), null);
  assert.ok(!reloaded.getLog().some(entry => entry.encounterId === 'a'));
});

test('Lot2 — purge atomique : rejet du disque conserve rencontre, journal et annulation', async () => {
  const { store, persistence } = await sceneStore();
  await resolved(store, 'resolution-preserved');
  const before = { scene: store.getActiveScene(), log: store.getLog(), history: store.getHistory(), durable: persistence.snapshot() };
  persistence.rejectWrites(true);
  const rejected = await store.deleteEncounter('a');
  assert.equal(rejected.ok, false);
  assert.deepEqual(store.getActiveScene(), before.scene);
  assert.deepEqual(store.getLog(), before.log);
  assert.deepEqual(store.getHistory(), before.history);
  assert.deepEqual(persistence.snapshot(), before.durable);
});

test('Lot2 — anciens reçus retrouvés via scènes des instantanés, jamais par nom', () => {
  const oldScene = { id: 'old-scene', encounterId: 'a', participants: [{ id: 'old-actor' }] };
  const log = [{ id: 'legacy', actorId: 'old-actor', detail: { resolutionId: 'old-resolution' } },
    { id: 'other', encounterId: 'b', actorId: 'old-actor', detail: { resolutionId: 'other-resolution' } },
    { id: 'name-only', actorName: 'Même nom', text: 'Sans rattachement prouvé' }];
  const snapshot = { activeScene: oldScene, log, archives: [], appliedResolutionIds: ['old-resolution', 'other-resolution'] };
  const history = { past: [], future: [{ result: { state: snapshot }, inverse: { state: snapshot } }] };
  const state = { activeScene: null, log, archives: [], history, appliedResolutionIds: snapshot.appliedResolutionIds };
  const scope = encounterJournalScope(state, 'a');
  const clean = purgeEncounterJournal(state, scope);
  assert.deepEqual(clean.log.map(entry => entry.id), ['other', 'name-only']);
  assert.deepEqual(clean.appliedResolutionIds, ['other-resolution']);
  assert.deepEqual(purgeEncounterJournalHistory(history, scope).future[0].result.state.log, clean.log);
});

test('Lot2 — fin de Tour étiquetée et purgée même après recommencer', async () => {
  const { store } = await sceneStore();
  const engine = createCombatEngine(store);
  await engine.start(); await engine.nextTurn();
  assert.equal(store.getLog()[0].encounterId, 'a');
  const oldActorId = store.getLog()[0].actorId;
  await store.restartCombat();
  assert.ok(!store.listParticipants().some(entry => entry.id === oldActorId));
  await store.deleteEncounter('a');
  assert.ok(!store.getLog().some(entry => entry.encounterId === 'a' || entry.actorId === oldActorId));
});

test('Lot2 — Élan manuel perd seulement sur Blessures perdues ou État acquis ; pause est annulable', async () => {
  const { store } = await sceneStore();
  const actor = store.listParticipants()[0];
  const gain = () => store.updateParticipant(actor.id, { extensions: { v5: { hasMomentum: true } } });
  const has = () => store.listParticipants().find(item => item.id === actor.id)?.extensions?.v5?.hasMomentum === true;
  await gain(); await store.updateParticipant(actor.id, { hp: 20 }); assert.equal(has(), true);
  await store.updateParticipant(actor.id, { states: [{ name: 'Sonné', level: 1 }] }); assert.equal(has(), false);
  await gain(); await store.updateParticipant(actor.id, { states: [] }); assert.equal(has(), true);
  await store.updateParticipant(actor.id, { hp: 19 }); assert.equal(has(), false);
  await gain(); await store.suspendActiveScene();
  assert.equal(store.listSuspendedScenes()[0].participants.find(item => item.id === actor.id).extensions.v5.hasMomentum, false);
  await store.undo(); assert.equal(has(), true);
  await store.suspendActiveScene(); await store.resumeScene(store.listSuspendedScenes()[0].id); assert.equal(has(), false);
});

test('Lot2 — Élan transitoire ne vient pas du profil au lancement/recommencement', async () => {
  const { store } = await sceneStore();
  await store.updateProfile('p', { extensions: { v5: { hasMomentum: true } } });
  await store.restartCombat();
  assert.ok(store.listParticipants().every(item => item.extensions?.v5?.hasMomentum !== true));
});
