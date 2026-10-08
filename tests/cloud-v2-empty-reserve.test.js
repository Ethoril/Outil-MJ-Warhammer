import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateSnapshot } from '../js/core/migrations.js';
import { migrateV2SyncDocument, createMigratingTransport, initializeV3Root } from '../js/core/sync-migration.js';

// Anonymous shape of the v2 cloud backup: Firebase omitted reserve and participants.
const emptyCloud = () => ({
  revision: 27,
  state: {
    schemaVersion: 2,
    combat: { round: 3, orderMode: 'manual', extensions: { retained: 'combat context' } },
    diceLines: { roll: { id: 'roll', type: 'skill', base: 42, mod: -10, note: 'Jet préparé anonyme', extensions: { retained: true } } },
    extensions: { retained: { custom: 'cloud metadata' } }
  }
});

test('v2 cloud missing empty reserve and participants migrates without changing its source', () => {
  const source = emptyCloud(), before = structuredClone(source);
  const migrated = migrateV2SyncDocument(source);
  assert.equal(migrated.revision, 27);
  assert.equal(migrated.state.schemaVersion, 3);
  assert.deepEqual(migrated.state.reserve, []);
  assert.deepEqual(migrated.state.combat.participants, []);
  assert.equal(migrated.state.combat.round, 3);
  assert.equal(migrated.state.combat.orderMode, 'manual');
  assert.equal(migrated.state.combat.extensions.retained, 'combat context');
  assert.equal(migrated.state.diceLines[0].id, 'roll');
  assert.equal(migrated.state.diceLines[0].base, 42);
  assert.equal(migrated.state.diceLines[0].mod, -10);
  assert.deepEqual(migrated.state.diceLines[0].extensions, { retained: true });
  assert.deepEqual(migrated.state.extensions.retained, { custom: 'cloud metadata' });
  assert.deepEqual(source, before);
  assert.ok(!Object.hasOwn(source.state, 'reserve'));
});

test('file snapshots still require their reserve collection', () => {
  assert.throws(() => migrateSnapshot(emptyCloud().state), /incomplète/);
});

test('present invalid v2 reserve values are rejected, never interpreted as omitted lists', () => {
  for (const value of [null, undefined, '', 'bad', false, 0]) {
    const source = emptyCloud(); source.state.reserve = value;
    assert.throws(() => migrateV2SyncDocument(source), error => error.code === 'INVALID_STATE');
    assert.ok(Object.hasOwn(source.state, 'reserve'));
    assert.equal(source.state.reserve, value);
  }
});

test('cloud normalization never repairs an absent or invalid combat object', () => {
  for (const value of [undefined, null, [], '', 0]) {
    const source = emptyCloud();
    if (value === undefined) delete source.state.combat;
    else source.state.combat = value;
    assert.throws(() => migrateV2SyncDocument(source), error => error.code === 'INVALID_STATE');
  }
});

test('migrating transport refuses malformed cloud state before any write', async () => {
  for (const value of [null, undefined, 'bad', false, 0]) {
    const source = emptyCloud(); source.state.reserve = value;
    const before = structuredClone(source), writes = [], reads = [];
    const transport = createMigratingTransport({
      current: 'v3', legacy: 'v2',
      read: async path => { reads.push(path); return path === 'v2' ? source : null; },
      transact: async path => { writes.push(path); throw Error('must never write'); }
    });
    await assert.rejects(transport.read(), error => error.code === 'INVALID_STATE');
    assert.deepEqual(reads, ['v3', 'v2']);
    assert.deepEqual(writes, []);
    assert.deepEqual(source, before);
  }
});

test('empty cloud reserve initializes only a fresh v3 root and preserves the revision', async () => {
  const source = emptyCloud(), before = structuredClone(source), writes = [];
  let next;
  const transport = createMigratingTransport({
    current: 'v3', legacy: 'v2', read: async path => path === 'v2' ? source : null,
    transact: async (path, update) => { writes.push(path); next = update(null); return { root: next }; }
  });
  assert.deepEqual(await transport.read(), next);
  assert.equal(next.revision, 27);
  assert.deepEqual(writes, ['v3']);
  assert.deepEqual(source, before);
  assert.equal(initializeV3Root({ malformed: true }, next), undefined);
});

test('existing v3 roots bypass legacy reconstruction and are never overwritten', async () => {
  for (const existing of [migrateV2SyncDocument(emptyCloud()), { malformed: true }]) {
    const reads = [], writes = [];
    const transport = createMigratingTransport({
      current: 'v3', legacy: 'v2',
      read: async path => { reads.push(path); return existing; },
      transact: async path => { writes.push(path); throw Error('must never write'); }
    });
    assert.equal(await transport.read(), existing);
    assert.deepEqual(reads, ['v3']);
    assert.deepEqual(writes, []);
  }
});
