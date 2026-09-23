import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import {
  advanceSceneClock,
  createIntention,
  createScene,
  createSceneEvent,
  evaluateSceneEvent,
  proposeSceneEvent,
  resolveSceneEvent,
  SceneEventError
} from '../js/core/scene-events.js';

test('E15 scène — intentions structurées et condition de round', () => {
  const intention = createIntention({ id: 'chief', participantId: 'p', motivation: 'Fuir', objective: 'Atteindre la porte' });
  const event = createSceneEvent({
    id: 'arrival', condition: { type: 'roundAtLeast', round: 3 },
    consequence: { type: 'note', text: 'Le chef arrive' }
  });
  const scene = createScene({ id: 's', round: 3, intentions: [intention], events: [event] });
  assert.equal(evaluateSceneEvent(scene, event).eligible, true);
  const proposal = proposeSceneEvent(scene, event);
  assert.equal(proposal.status, 'proposed');
  assert.deepEqual(proposal.consequence, { type: 'note', text: 'Le chef arrive' });
});

test('E15 scène — conditions PV/hors combat/manuelle n’exécutent aucun texte', () => {
  const scene = createScene({ id: 's', round: 1, participants: [{ id: 'p', hp: 0 }] });
  const down = createSceneEvent({ id: 'down', condition: { type: 'participantDown', participantId: 'p' }, consequence: { type: 'reinforcement', participantId: 'r' } });
  assert.equal(proposeSceneEvent(scene, down).status, 'proposed');
  const manual = createSceneEvent({ id: 'manual', condition: { type: 'manual', text: '1 + 1' }, consequence: { type: 'note', text: '<script>bad</script>' } });
  assert.equal(proposeSceneEvent(scene, manual).status, 'not-eligible');
  assert.equal(proposeSceneEvent(scene, manual, { manual: true }).consequence.text, '<script>bad</script>');
  assert.throws(() => createSceneEvent({ id: 'bad', condition: { type: 'eval', code: 'alert(1)' }, consequence: { type: 'note' } }), SceneEventError);
});

test('E15 scène — occurrence résolue une seule fois et horloge bornée manuellement', () => {
  const event = createSceneEvent({ id: 'event', condition: { type: 'manual' }, consequence: { type: 'note', text: 'ok' }, recurring: false });
  const scene = createScene({ id: 's', round: 1, events: [event], clocks: [{ id: 'threat', value: 2, max: 3 }] });
  const resolved = resolveSceneEvent(scene, event);
  const twice = resolveSceneEvent(resolved, event);
  assert.equal(twice.resolvedOccurrences.length, 1);
  const advanced = advanceSceneClock(resolved, 'threat', 5);
  assert.equal(advanced.clocks[0].value, 3);
  const unbounded = advanceSceneClock({ ...scene, clocks: [{ id: 'open', value: 2, max: null }] }, 'open', 5);
  assert.equal(unbounded.clocks[0].value, 7);
  assert.equal(scene.clocks[0].value, 2);
});

test('E15 scène — événement récurrent distingue les occurrences par round', () => {
  const event = createSceneEvent({ id: 'pulse', condition: { type: 'roundAtLeast', round: 1 }, consequence: { type: 'note', text: 'pulse' }, recurring: true });
  const scene = createScene({ id: 's', round: 1 });
  const r1 = resolveSceneEvent(scene, event);
  const r2 = resolveSceneEvent({ ...scene, round: 2, resolvedOccurrences: r1.resolvedOccurrences }, event);
  assert.equal(r1.resolvedOccurrences.length, 1);
  assert.equal(r2.resolvedOccurrences.length, 2);
});

test('E15 Store — conséquence confirmée atomique, déduplication et undo', async () => {
  let saved = null;
  const persistence = {
    async load() { return saved && structuredClone(saved); },
    async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; }
  };
  const actor = { id: 'actor', name: 'Chef', hp: 10, maxHp: 10, zone: 'active', states: [] };
  const bench = { id: 'reinforcement', name: 'Renfort', hp: 8, maxHp: 8, zone: 'bench', states: [] };
  const scene = {
    schemaVersion: 2, id: 'scene', status: 'active', revision: 0, round: 2,
    currentActorId: 'actor', order: ['actor'], participants: [actor, bench],
    events: [], clocks: [{ id: 'threat', label: 'Menace', value: 1, max: 2 }],
    resolvedOccurrences: [],
    reserve: [], activeScene: null, combat: { round: 2, currentActorId: 'actor', order: ['actor'], participants: [actor, bench] },
    log: [], diceLines: []
  };
  const store = createStore({ persistence: { ...persistence, async load() { return saved || { ...scene, activeScene: scene }; } } });
  await store.ready;
  const reinforcement = createSceneEvent({ id: 'reinforce', condition: { type: 'manual' }, consequence: { type: 'reinforcement', participantId: 'reinforcement' } });
  const stateEvent = createSceneEvent({ id: 'state', condition: { type: 'manual' }, consequence: { type: 'addState', participantId: 'reinforcement', state: { name: 'Sonné', level: 2, duration: 3 } } });
  const clockEvent = createSceneEvent({ id: 'clock', condition: { type: 'manual' }, consequence: { type: 'advanceClock', clockId: 'threat', amount: 5 } });

  for (const event of [reinforcement, stateEvent, clockEvent]) {
    const preview = store.previewSceneEvent(event, { confirmed: true });
    assert.equal(preview.status, 'proposed', event.id);
    assert.equal((await store.applySceneEvent(event, { confirmed: true, baseRevision: preview.baseRevision, sceneRevision: preview.sceneRevision })).status, 'applied');
  }
  const active = store.getActiveScene();
  assert.equal(active.participants.find(item => item.id === 'reinforcement').zone, 'active');
  assert.deepEqual(active.order, ['actor', 'reinforcement']);
  const appliedState = active.participants.find(item => item.id === 'reinforcement').states[0];
  assert.equal(appliedState.name, 'Sonné');
  assert.equal(appliedState.level, 2);
  assert.equal(appliedState.duration, 3);
  assert.equal(active.clocks[0].value, 2);
  assert.equal((await store.applySceneEvent(clockEvent, { confirmed: true })).status, 'duplicate');

  await store.undo();
  assert.equal(store.getActiveScene().clocks[0].value, 1);
  await store.undo();
  assert.equal(store.getActiveScene().participants.find(item => item.id === 'reinforcement').states.length, 0);
  await store.undo();
  assert.equal(store.getActiveScene().participants.find(item => item.id === 'reinforcement').zone, 'bench');
  await store.redo(); await store.redo(); await store.redo();
  assert.equal(store.getActiveScene().clocks[0].value, 2);
});
