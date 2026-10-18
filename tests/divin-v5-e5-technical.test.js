import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRemoteDocument } from '../js/core/sync-session.js';
import { validateSyncDocument } from '../js/core/sync-protocol.js';

const canonicalClock = () => ({
  schemaVersion: 1,
  revision: 0,
  campaignSeconds: 0,
  combat: { sceneId: null, round: 0, turnIndex: 1, currentActorId: null },
  lastEvent: null,
});

const documentFor = (state) => ({ revision: 0, receipts: {}, state });

test('E5 contrôle technique — RTDB peut restaurer les nulls retirés quand la racine canonique confirme leur absence', () => {
  const gameClock = canonicalClock();
  delete gameClock.lastEvent;
  delete gameClock.combat.sceneId;
  delete gameClock.combat.currentActorId;
  const raw = documentFor({
    schemaVersion: 3,
    combat: { round: 0, currentActorId: null, order: [], participants: [] },
    extensions: { v5: { gameClock } },
  });

  const decoded = normalizeRemoteDocument(raw);
  assert.deepEqual(decoded.state.extensions.v5.gameClock, canonicalClock());
  assert.throws(() => validateSyncDocument(raw), /clock|projection/i,
    'les imports/protocol locaux restent stricts et ne passent pas par le décodeur RTDB');
});

test('E5 contrôle technique — une clock RTDB tronquée ne remplace pas un acteur actif par null', () => {
  const state = {
    schemaVersion: 3,
    combat: { round: 1, currentActorId: 'priest', order: ['priest'], participants: [] },
    extensions: { v5: { gameClock: { ...canonicalClock(), combat: { round: 1, turnIndex: 1 } } } },
  };
  assert.throws(() => normalizeRemoteDocument(documentFor(state)), /clock|projection|combat/i);
});

test('E5 contrôle technique — une clock RTDB tronquée ne remplace pas la scène active par null', () => {
  const state = {
    schemaVersion: 3,
    combat: { round: 1, currentActorId: 'priest', order: ['priest'], participants: [] },
    activeScene: { id: 'scene-active', status: 'active', participants: [] },
    extensions: { v5: { gameClock: { ...canonicalClock(), combat: { round: 1, turnIndex: 1, currentActorId: 'priest' } } } },
  };
  assert.throws(() => normalizeRemoteDocument(documentFor(state)), /clock|projection|combat|scene/i);
});

test('E5 contrôle technique — lastEvent omis après une révision non initiale ne se répare pas', () => {
  const clock = { ...canonicalClock(), revision: 1 };
  delete clock.lastEvent;
  const raw = documentFor({
    schemaVersion: 3,
    combat: { round: 0, currentActorId: null, order: [], participants: [] },
    extensions: { v5: { gameClock: clock } },
  });
  assert.throws(() => normalizeRemoteDocument(raw), /clock|reçu/i);
});

const dropNullLeaves = (value) => {
  if (Array.isArray(value)) return value.map(dropNullLeaves);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([, child]) => child !== null)
    .map(([key, child]) => [key, dropNullLeaves(child)]));
};

async function makeRoundAdvanceDocument() {
  const { createGameClock, deriveTurnPhasePlan, advanceGameClock } = await import('../js/core/v5-game-time.js');
  const initialState = {
    combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [] },
  };
  const clock = createGameClock(initialState);
  const from = clock.combat;
  const to = { ...from, round: 2, turnIndex: from.turnIndex + 1, currentActorId: 'ally' };
  const phases = deriveTurnPhasePlan({ from, to });
  const advanced = advanceGameClock(clock, {
    id: 'clock-v1:0:technical-round-advance-1', baseRevision: clock.revision, kind: 'combat-transition',
    sceneId: from.sceneId, from, to, phases,
  });
  assert.equal(advanced.ok, true);
  assert.ok(phases.some(row => row.phase === 'startOfRound' && row.sceneId === null && row.actorId === null));
  const canonical = documentFor({
    schemaVersion: 3,
    combat: { round: 2, currentActorId: 'ally', order: ['priest', 'ally'], participants: [] },
    extensions: { v5: { gameClock: advanced.clock } },
  });
  return { advanced, canonical };
}

test('E5 contrôle technique — RTDB récursif restaure uniquement les nulls des phases attestés par un vrai reçu', async () => {
  const { advanced, canonical } = await makeRoundAdvanceDocument();
  const raw = dropNullLeaves(canonical);
  assert.ok(raw.state.extensions.v5.gameClock.lastEvent.validatedPhases
    .some(row => row.phase === 'startOfRound' && !Object.hasOwn(row, 'sceneId') && !Object.hasOwn(row, 'actorId')));

  const decoded = normalizeRemoteDocument(raw);
  assert.deepEqual(decoded.state.extensions.v5.gameClock, advanced.clock,
    'le payload fingerprint conserve les valeurs null canoniques supprimées par RTDB');
});

test('E5 contrôle technique — un acteur non nul attesté par le reçu ne se répare pas en null ou omission', async () => {
  const { canonical } = await makeRoundAdvanceDocument();
  for (const mutate of [
    row => { delete row.actorId; },
    row => { row.actorId = 'forged-actor'; },
  ]) {
    const raw = dropNullLeaves(canonical);
    const startOfTurn = raw.state.extensions.v5.gameClock.lastEvent.validatedPhases
      .find(row => row.phase === 'startOfTurn');
    assert.equal(startOfTurn.actorId, 'ally');
    mutate(startOfTurn);

    assert.throws(() => normalizeRemoteDocument(raw), /clock|reçu|phase|transition/i,
      'un champ non nul absent ou modifié malgré le payload fingerprint doit rester une erreur de cohérence');
  }
});

test('E5 contrôle technique — un ID versionné ne peut pas être rejoué à une autre base de clock', async () => {
  const { createGameClock, deriveTurnPhasePlan, advanceGameClock } = await import('../js/core/v5-game-time.js');
  const clockAtStart = createGameClock({
    combat: { round: 1, currentActorId: 'a', order: ['a', 'b', 'c', 'd'], participants: [] },
  });
  const makeEvent = (clock, id, actorId) => {
    const from = clock.combat;
    const to = { ...from, turnIndex: from.turnIndex + 1, currentActorId: actorId };
    return { id, baseRevision: clock.revision, kind: 'combat-transition', sceneId: from.sceneId,
      from, to, phases: deriveTurnPhasePlan({ from, to }) };
  };
  const firstEvent = makeEvent(clockAtStart, 'clock-v1:0:first', 'b');
  const first = advanceGameClock(clockAtStart, firstEvent);
  assert.equal(first.status, 'applied');
  const secondEvent = makeEvent(first.clock, 'clock-v1:1:second', 'c');
  const second = advanceGameClock(first.clock, secondEvent);
  assert.equal(second.status, 'applied');

  const reusedIdAtNewBase = makeEvent(second.clock, firstEvent.id, 'd');
  assert.equal(reusedIdAtNewBase.baseRevision, 2);
  assert.notEqual(advanceGameClock(second.clock, reusedIdAtNewBase).status, 'applied',
    'le nonce historique de base 0 ne doit pas réussir à la révision 2');
});

test('E5 contrôle technique — une clock avancée doit conserver son reçu de dernière révision', async () => {
  const { createGameClock, deriveTurnPhasePlan, advanceGameClock, validateGameClock } = await import('../js/core/v5-game-time.js');
  const initial = createGameClock({
    combat: { round: 1, currentActorId: 'a', order: ['a', 'b', 'c'], participants: [] },
  });
  const advance = (clock, actorId, nonce) => {
    const from = clock.combat;
    const to = { ...from, turnIndex: from.turnIndex + 1, currentActorId: actorId };
    return advanceGameClock(clock, { id: `clock-v1:${clock.revision}:${nonce}`, baseRevision: clock.revision,
      kind: 'combat-transition', sceneId: from.sceneId, from, to, phases: deriveTurnPhasePlan({ from, to }) });
  };
  const one = advance(initial, 'b', 'one');
  const two = advance(one.clock, 'c', 'two');
  assert.equal(two.clock.revision, 2);
  assert.throws(() => validateGameClock({ ...two.clock, lastEvent: null }), /clock|reçu|revision/i,
    'une clock revision>0 sans son reçu CAS final ne doit pas être canonique');
});
