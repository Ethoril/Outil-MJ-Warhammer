import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameClock, readCombatPosition, reconcileGameClockPosition, deriveTurnPhasePlan, advanceGameClock, validateGameClock } from '../js/core/v5-game-time.js';
import { migrateSnapshot } from '../js/core/migrations.js';
import { sanitizeMagicEnvelope } from '../js/core/sanitize.js';
import { normalizeRemoteDocument } from '../js/core/sync-session.js';

const state = (overrides = {}) => ({
  combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [] },
  extensions: { v5: { turnIndex: 3 } },
  ...overrides
});

const position = (round, turnIndex, currentActorId, sceneId = null) => ({ sceneId, round, turnIndex, currentActorId });

 test('position canonique et migration initialisent sans temps écoulé', () => {
  const input = state({ activeScene: { id: 'scene-1', status: 'active', extensions: { v5: { turnIndex: 8 } } } });
  assert.deepEqual(readCombatPosition(input), position(1, 8, 'a', 'scene-1'));
  assert.deepEqual(createGameClock(input), {
    schemaVersion: 1, revision: 0, campaignSeconds: 0,
    combat: position(1, 8, 'a', 'scene-1'),
    lastEvent: null
  });
  const migrated = migrateSnapshot({ reserve: [], combat: { round: 1, currentActorId: 'a', order: ['a'], participants: [] } }).data;
  assert.equal(migrated.extensions.v5.gameClock.campaignSeconds, 0);
  assert.equal(migrated.extensions.v5.gameClock.combat.round, 1);
  assert.equal(sanitizeMagicEnvelope({ reserve: [], combat: { participants: [] } }).extensions, undefined,
    'la sanitation seule ne crée aucune branche clock');
});

test('la clock valide strictement et une réconciliation neutre ne produit aucune phase', () => {
  const clock = createGameClock(state());
  assert.throws(() => validateGameClock({ ...clock, revision: -1 }), /clock|révision/i);
  const result = reconcileGameClockPosition(clock, position(2, 3, 'b'));
  assert.equal(result.changed, true);
  assert.equal(result.clock.combat.round, 2);
  assert.equal(result.clock.campaignSeconds, 0);
  assert.equal(result.clock.revision, 0);
  assert.equal(result.clock.lastEvent, null);
  assert.equal(reconcileGameClockPosition(result.clock, result.clock.combat).changed, false);
});

test('le plan de phases ne contient que la transition de Tour réellement calculée', () => {
  const phases = deriveTurnPhasePlan({ from: position(1, 3, 'a'), to: position(1, 4, 'b') });
  assert.deepEqual(phases.map(item => item.phase), [
    'endOfTurn', 'endOfTurn', 'expiry', 'endOfCasterTurn', 'startOfTurn', 'startOfTurn'
  ]);
  assert.deepEqual(phases.filter(item => item.phase === 'endOfTurn').map(item => item.moment), ['beforeEffects', 'afterEffects']);
  assert.throws(() => deriveTurnPhasePlan({ from: position(1, 3, 'a'), to: position(3, 4, 'b') }), /Round|transition/i);
  const roundPhases = deriveTurnPhasePlan({ from: position(1, 5, 'b'), to: position(2, 6, 'a') });
  assert.deepEqual(roundPhases.map(item => item.phase), [
    'endOfTurn', 'endOfTurn', 'expiry', 'endOfCasterTurn',
    'endOfRound', 'endOfRound', 'startOfRound', 'startOfTurn', 'startOfTurn'
  ]);
  assert.ok(!roundPhases.some(item => item.phase === 'attackAttempt'));
});

test('CAS clock : incrément uniquement au Round suivant, retry final idempotent, ID réutilisé/refus ancien stales', () => {
  const clock = createGameClock(state());
  const from = clock.combat;
  const to = position(1, 4, 'b');
  const event = { id: 'clock-v1:0:dev-device-turn-1', baseRevision: 0, kind: 'combat-transition', sceneId: null, from, to,
    phases: deriveTurnPhasePlan({ from, to }) };
  const oneTurn = advanceGameClock(clock, event);
  assert.equal(oneTurn.ok, true);
  assert.equal(oneTurn.status, 'applied');
  assert.equal(oneTurn.clock.campaignSeconds, 0);
  assert.equal(oneTurn.clock.revision, 1);
  assert.equal(oneTurn.clock.lastEvent.payloadFingerprint.length > 0, true);
  assert.equal(advanceGameClock(oneTurn.clock, event).status, 'duplicate');
  const changedTo = position(1, 4, 'c');
  const changedPayload = { ...event, to: changedTo, phases: deriveTurnPhasePlan({ from, to: changedTo }) };
  assert.equal(advanceGameClock(oneTurn.clock, changedPayload).status, 'conflict');
  assert.equal(advanceGameClock(clock, { ...event, phases: [...event.phases, { phase: 'attackAttempt' }] }).status, 'invalid');
  const roundTo = position(2, 5, 'a');
  const nextEvent = { id: 'clock-v1:1:dev-device-turn-2', baseRevision: 1, kind: 'combat-transition', sceneId: null,
    from: oneTurn.clock.combat, to: roundTo, phases: deriveTurnPhasePlan({ from: oneTurn.clock.combat, to: roundTo }) };
  const next = advanceGameClock(oneTurn.clock, nextEvent);
  assert.equal(next.clock.campaignSeconds, 10);
  assert.equal(advanceGameClock(next.clock, event).status, 'stale');
  const rest = { id: 'clock-v1:2:dev-device-time-3', baseRevision: 2, kind: 'campaign-time-advance', seconds: 60, reason: 'Repos décidé par MJ' };
  assert.equal(advanceGameClock(next.clock, rest).clock.campaignSeconds, 70);
});

test('validation RTDB restaure les nulls d’un reçu ultérieur sans contourner la révision CAS stricte', () => {
  const clock0 = createGameClock(state());
  const advance = (clock, round, turnIndex, actor, nonce) => {
    const from = clock.combat;
    const to = position(round, turnIndex, actor);
    return advanceGameClock(clock, { id: `clock-v1:${clock.revision}:${nonce}`, baseRevision: clock.revision,
      kind: 'combat-transition', sceneId: from.sceneId, from, to, phases: deriveTurnPhasePlan({ from, to }) });
  };
  const first = advance(clock0, 1, 4, 'b', 'dev-first');
  const second = advance(first.clock, 2, 5, 'a', 'dev-second');
  assert.equal(second.ok, true);
  const dropNulls = value => Array.isArray(value) ? value.map(dropNulls)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value)
      .filter(([, child]) => child !== null).map(([key, child]) => [key, dropNulls(child)])) : value;
  const raw = dropNulls({ revision: 0, receipts: {}, state: {
    schemaVersion: 3,
    combat: { round: 2, currentActorId: 'a', order: ['a', 'b'], participants: [] },
    extensions: { v5: { gameClock: second.clock } }
  } });
  const rawStartOfRound = raw.state.extensions.v5.gameClock.lastEvent.validatedPhases
    .find(row => row.phase === 'startOfRound');
  assert.equal(Object.hasOwn(rawStartOfRound, 'actorId'), false);
  const remote = normalizeRemoteDocument(raw);
  assert.deepEqual(remote.state.extensions.v5.gameClock, second.clock);
});
