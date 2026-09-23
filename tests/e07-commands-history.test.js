import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CommandError,
  createCommand,
  createStateCommand,
  executeCommand,
  inverseCommand,
  replayCommand
} from '../js/core/commands.js';
import {
  DEFAULT_HISTORY_MAX_BYTES,
  MAX_HISTORY_COMMANDS,
  canRedo,
  canUndo,
  createHistory,
  markExternalBoundary,
  recordCommand,
  redo,
  undo
} from '../js/core/history.js';

const command = (id, n, dice = [42]) => createCommand({
  id, type: 'damage', baseRevision: n,
  data: { targetId: 'p', amount: n },
  result: { dice, damage: n },
  inverse: { amount: -n }
});

test('E07 commandes — valeur complète clonée et inverse disponible', () => {
  const before = { hp: 10, states: [] };
  const after = { hp: 7, states: ['Hémorragique'] };
  const c = createStateCommand({ id: 'cmd-1', type: 'damage+state', before, after, baseRevision: 3 });
  assert.equal(c.baseRevision, 3);
  assert.deepEqual(c.result.state, after);
  assert.deepEqual(c.inverse.state, before);
  c.result.state.hp = 0;
  assert.equal(after.hp, 7);
});

test('E07 commandes — exécution et erreur sont atomiques', () => {
  const state = { hp: 10 };
  const c = command('cmd-1', 3);
  const run = executeCommand(state, c, (draft, data, result) => {
    draft.hp -= result.damage;
    draft.lastTarget = data.targetId;
    return draft;
  });
  assert.deepEqual(run.state, { hp: 7, lastTarget: 'p' });
  assert.deepEqual(state, { hp: 10 });
  assert.throws(
    () => executeCommand(state, c, draft => { draft.hp = 0; throw new Error('échec'); }),
    /échec/
  );
  assert.deepEqual(state, { hp: 10 });
  assert.throws(() => inverseCommand(state, createCommand({ id: 'no-inverse', type: 'x' }), () => state), CommandError);
});

test('E07 commandes — rejeu restitue les dés enregistrés sans nouveau tirage', () => {
  let randomCalls = 0;
  const c = command('roll-1', 2, [17]);
  const result = replayCommand({ hp: 10 }, c, (draft, _data, recorded) => {
    randomCalls++;
    draft.roll = recorded.dice[0];
    draft.hp -= recorded.damage;
    return draft;
  });
  assert.deepEqual(result.state, { hp: 8, roll: 17 });
  assert.equal(randomCalls, 1, 'le handler lit le résultat, aucun tirage interne du protocole');
  assert.deepEqual(c.result.dice, [17]);
});

test('E07 historique — undo/redo consomme les commandes et borne à 50', () => {
  let history = createHistory({ limit: 100 });
  assert.equal(history.limit, MAX_HISTORY_COMMANDS);
  for (let i = 1; i <= 55; i++) history = recordCommand(history, command('cmd-' + i, i));
  assert.equal(history.past.length, 50);
  assert.equal(history.past[0].id, 'cmd-6');
  assert.equal(canUndo(history), true);
  const undone = undo(history);
  assert.equal(undone.command.id, 'cmd-55');
  assert.equal(undone.history.future.at(-1).id, 'cmd-55');
  const redone = redo(undone.history);
  assert.equal(redone.command.id, 'cmd-55');
  assert.equal(redone.history.future.length, 0);
  const branched = recordCommand(undone.history, command('cmd-new', 56));
  assert.equal(branched.future.length, 0);
});

test('E07 historique — budget UTF-8 borné, hydratation tronquée et grosse commande refusée', () => {
  const small = createHistory({ maxBytes: 500 });
  let history = small;
  for (let i = 0; i < 8; i++) history = recordCommand(history, command('small-' + i, i));
  assert.ok(JSON.stringify([...history.past, ...history.future]).length <= 500);
  assert.equal(createHistory().maxBytes, DEFAULT_HISTORY_MAX_BYTES);
  assert.throws(
    () => recordCommand(small, createCommand({ id: 'huge', type: 'import', data: { text: 'x'.repeat(1000) } })),
    /trop volumineuse/
  );
  const hydrated = {
    limit: 50, maxBytes: 500,
    past: [command('old', 0), createCommand({ id: 'huge-hydrated', type: 'import', data: { text: 'x'.repeat(1000) } })],
    future: [], boundary: null
  };
  const normalized = recordCommand(hydrated, command('last', 1));
  assert.ok(JSON.stringify([...normalized.past, ...normalized.future]).length <= 500);
  assert.equal(normalized.past.at(-1).id, 'last');
});

test('E07 historique — une mise à jour externe ferme la frontière applicable', () => {
  let history = recordCommand(createHistory(), command('local-1', 0));
  history = markExternalBoundary(history, { reason: 'remote-sync', revision: 4 });
  assert.equal(canUndo(history), false);
  assert.equal(canRedo(history), false);
  assert.deepEqual(history.boundary, { reason: 'remote-sync', revision: 4 });
  const local = recordCommand(history, command('local-after', 4));
  assert.equal(undo(local).command.id, 'local-after');
  assert.equal(local.boundary.reason, 'remote-sync');
});
