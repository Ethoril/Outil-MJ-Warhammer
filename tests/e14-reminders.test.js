import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REMINDER_DECISIONS,
  deriveReminders,
  pendingReminders,
  resolveReminder
} from '../js/core/reminders.js';

test('E14 rappels — hémorragie et expiration sont dédupliquées par scène/transition/effet', () => {
  const snapshot = {
    sceneId: 'scene-1',
    states: [
      { id: 'hem-1', key: 'hemorragique', name: 'Hémorragique', duration: null },
      { id: 'stun-1', key: 'sonne', name: 'Sonné', duration: 1 }
    ]
  };
  const first = deriveReminders(snapshot, { id: 'end-2', type: 'endTurn' });
  const second = deriveReminders(snapshot, { id: 'end-2', type: 'endTurn' });
  assert.equal(first.length, 3);
  assert.equal(first.filter(item => item.kind === 'automatic-announced').length, 1);
  assert.equal(first.filter(item => item.kind === 'effect-expiring').length, 1);
  assert.deepEqual(first, second);
});

test('E14 rappels — choix ignorer/résoudre/report restent persistables', () => {
  const initial = deriveReminders({ sceneId: 's', states: [{ id: 'e', name: 'Sonné', duration: 1 }] }, { id: 't', type: 'endTurn' });
  const id = initial.find(item => item.kind === 'effect-expiring').id;
  const ignored = resolveReminder(initial, id, REMINDER_DECISIONS.IGNORE, { actorId: 'p' });
  assert.equal(pendingReminders(ignored).length, 1, 'le rappel de transition reste indépendant');
  assert.equal(ignored.find(item => item.id === id).choice.actorId, 'p');
  const rebuilt = deriveReminders({ sceneId: 's', states: [{ id: 'e', name: 'Sonné', duration: 1 }] }, { id: 't', type: 'endTurn' }, ignored);
  assert.equal(rebuilt.find(item => item.id === id).status, 'ignore');
  const snoozed = resolveReminder(initial, id, REMINDER_DECISIONS.SNOOZE);
  assert.equal(snoozed.find(item => item.id === id).status, 'snooze');
});

test('E14 rappels — conséquences et renforts attendus sont proposés sans exécution', () => {
  const reminders = deriveReminders({
    sceneId: 's',
    consequences: [{ id: 'c', text: 'Choisir le report', resolved: false }],
    reinforcements: [{ id: 'r', expectedAt: 3, arrived: false, text: 'Le chef arrive' }]
  }, { id: 'round-3', type: 'startTurn', round: 3, actorId: 'a' });
  assert.deepEqual(reminders.map(item => item.kind), ['startTurn', 'consequence', 'reinforcement']);
  assert.equal(reminders.find(item => item.effectId === 'r').status, 'pending');
});
