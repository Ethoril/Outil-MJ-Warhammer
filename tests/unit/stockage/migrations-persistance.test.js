import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_SCHEMA_VERSION, MigrationError, migrateSnapshot, migrateLegacyStorage } from '../../../js/core/migrations.js';
import { createPersistence } from '../../../js/core/persistence.js';
import { indexedDB } from 'fake-indexeddb';
import { createStore, KEY } from '../../../js/core/store.js';
import { Profile } from '../../../js/core/models.js';

describe('Migrations et persistance E04', () => {
function fakeIndexedDB() {
  const databases = new Map();
  let failStore = null;
  let failError = null;

  class Request {
    constructor() {
      this.result = undefined;
      this.error = null;
      this.onsuccess = null;
      this.onerror = null;
      this.onupgradeneeded = null;
      this.onblocked = null;
    }
    success(result) {
      this.result = result;
      queueMicrotask(() => this.onsuccess?.({ target: this }));
    }
    fail(error) {
      this.error = error;
      queueMicrotask(() => this.onerror?.({ target: this }));
    }
  }

  class Store {
    constructor(tx, name, records) {
      this.tx = tx;
      this.name = name;
      this.records = records;
    }
    put(value) {
      const request = new Request();
      this.tx.pending++;
      queueMicrotask(() => {
        if (this.tx.aborted) return;
        const failure = this.tx.db.consumeFailure(this.name);
        if (failure) {
          const error = failure;
          request.fail(error);
          this.tx.fail(error);
          return;
        }
        this.records.set(value.id ?? value.contextId, structuredClone(value));
        request.success(value);
        this.tx.doneRequest();
      });
      return request;
    }
    get(key) {
      const request = new Request();
      this.tx.pending++;
      queueMicrotask(() => {
        if (this.tx.aborted) return;
        request.success(this.records.has(key) ? structuredClone(this.records.get(key)) : undefined);
        this.tx.doneRequest();
      });
      return request;
    }
    getAll() {
      const request = new Request();
      this.tx.pending++;
      queueMicrotask(() => {
        if (this.tx.aborted) return;
        request.success([...this.records.values()].map(value => structuredClone(value)));
        this.tx.doneRequest();
      });
      return request;
    }
    delete(key) {
      const request = new Request();
      this.tx.pending++;
      queueMicrotask(() => {
        if (this.tx.aborted) return;
        this.records.delete(key);
        request.success(undefined);
        this.tx.doneRequest();
      });
      return request;
    }
  }

  class Transaction {
    constructor(db, names) {
      this.db = db;
      this.names = names;
      this.pending = 0;
      this.completed = false;
      this.aborted = false;
      this.error = null;
      this.before = new Map(names.map(name => [
        name,
        new Map([...db.records.get(name).entries()].map(([key, value]) => [key, structuredClone(value)]))
      ]));
      this.oncomplete = null;
      this.onerror = null;
      this.onabort = null;
    }
    objectStore(name) {
      if (!this.names.includes(name)) throw new Error('store hors transaction');
      return new Store(this, name, this.db.records.get(name));
    }
    doneRequest() {
      this.pending--;
      if (this.pending === 0 && !this.completed) queueMicrotask(() => this.completeIfIdle());
    }
    completeIfIdle() {
      if (this.pending !== 0 || this.completed || this.aborted) return;
      this.completed = true;
      this.oncomplete?.({ target: this });
    }
    restore() {
      for (const [name, snapshot] of this.before) {
        const records = this.db.records.get(name);
        records.clear();
        for (const [key, value] of snapshot) records.set(key, structuredClone(value));
      }
    }
    fail(error) {
      if (this.completed) return;
      this.error = error;
      this.aborted = true;
      this.completed = true;
      this.restore();
      queueMicrotask(() => {
        this.onerror?.({ target: this });
        this.onabort?.({ target: this });
      });
    }
    abort() {
      this.fail(this.error || new Error('fake IndexedDB transaction aborted'));
    }
  }

  class DB {
    constructor(name, records) {
      this.name = name;
      this.records = records;
      this.objectStoreNames = { contains: key => records.has(key) };
      this.onversionchange = null;
    }
    createObjectStore(name) {
      this.records.set(name, new Map());
      return {};
    }
    consumeFailure(name) {
      if (failStore !== name) return false;
      failStore = null;
      const error = failError;
      failError = null;
      return error;
    }
    transaction(names) {
      return new Transaction(this, names);
    }
    close() {}
  }

  return {
    failNext(name, error = new Error('fake IndexedDB failure on ' + name)) {
      failStore = name;
      failError = error;
    },
    open(name) {
      const request = new Request();
      queueMicrotask(() => {
        let entry = databases.get(name);
        const upgrade = !entry;
        if (!entry) {
          entry = { records: new Map() };
          databases.set(name, entry);
        }
        const db = new DB(name, entry.records);
        request.result = db;
        if (upgrade) request.onupgradeneeded?.({ target: request });
        request.success(db);
      });
      return request;
    }
  };
}

const envelope = () => ({
  schemaVersion: 2,
  appVersion: '3.6.0',
  exportedAt: '2026-09-05T10:00:00Z',
  contextId: 'guest',
  reserve: [{ id: 'prof', name: 'Renaut', hp: 14, maxHp: 14, customRule: { keep: true } }],
  combat: {
    round: 3,
    currentActorId: 'part',
    order: ['part'],
    participants: [{ id: 'part', profileId: 'prof', name: 'Renaut', hp: 9, maxHp: 14, states: ['Sonné|2', 'Hémorragique'] }]
  },
  log: [{ kind: 'roll', text: 'jet' }],
  diceLines: [{ id: 'line', participantId: 'part', targetId: 'part', base: '45' }]
});

test('E04 migration — enveloppe v2 préserve hp/maxHp/états/extensions sans muter la source', () => {
  const source = envelope();
  const before = structuredClone(source);
  const { data, report } = migrateSnapshot(source);
  assert.equal(data.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(data.reserve[0].hp, 14);
  assert.equal(data.reserve[0].maxHp, 14);
  assert.equal(data.combat.participants[0].hp, 9);
  assert.deepEqual(data.combat.participants[0].states, ['Sonné|2', 'Hémorragique']);
  assert.deepEqual(data.reserve[0].extensions, { customRule: { keep: true } });
  assert.deepEqual(source, before);
  assert.equal(report.rejected.length, 0);
});

test('E04 migration — une enveloppe arbitraire ou incomplète est refusée', () => {
  const empty = migrateSnapshot({ reserve: [], combat: {} });
  assert.deepEqual(empty.data.reserve, []);
  assert.deepEqual(empty.data.combat.participants, []);
  assert.throws(
    () => migrateSnapshot({ foo: 'bar' }),
    error => error instanceof MigrationError && error.details.reason === 'reserve-et-combat-requis'
  );
  assert.throws(
    () => migrateSnapshot({ reserve: [], combat: null }),
    error => error instanceof MigrationError && error.details.reason === 'reserve-et-combat-requis'
  );
});

test('E04 migration — ancien format, turnIndex et références orphelines produisent un rapport', () => {
  const source = {
    reserve: [{ id: 'p', name: 'P', hp: 14 }],
    combat: {
      round: 1,
      turnIndex: 1,
      order: ['p1', 'p2', 'ghost'],
      participants: [
        { id: 'p1', profileId: 'p', name: 'A', hp: 4, maxHp: 14, states: ['Hémorragique|3'] },
        { id: 'p2', profileId: 'missing', name: 'B', hp: 8 }
      ]
    },
    diceLines: [{ id: 'd', participantId: 'p1', targetId: 'ghost', unknownField: 'keep' }],
    log: ['ancienne entrée']
  };
  const { data, report } = migrateSnapshot(source);
  assert.equal(data.schemaVersion, 3);
  assert.equal(data.combat.currentActorId, 'p2');
  assert.deepEqual(data.combat.order, ['p1', 'p2']);
  assert.equal(data.combat.participants[1].profileId, null);
  assert.equal(data.diceLines[0].targetId, null);
  assert.equal(data.diceLines[0].extensions.unknownField, 'keep');
  assert.equal(data.log[0], 'ancienne entrée');
  assert.ok(report.migrated.some(item => item.path === 'combat.turnIndex'));
  assert.ok(report.repaired.some(item => item.reason === 'profil-orphelin'));
  assert.ok(report.repaired.some(item => item.reason === 'participant-orphelin'));
});

test('E04 migration — Firebase maps récupèrent la clé comme id et conservent les données', () => {
  const { data, report } = migrateSnapshot({
    reserve: { prof: { name: 'Map profile', hp: 10 } },
    combat: {
      meta: { round: 2, turnIndex: 0, order: ['part'] },
      participants: { part: { profileId: 'prof', name: 'Map participant', hp: 10 } }
    },
    diceLines: { line: { participantId: 'part', base: 40 } }
  });
  assert.equal(data.reserve[0].id, 'prof');
  assert.equal(data.combat.participants[0].id, 'part');
  assert.equal(data.combat.currentActorId, 'part');
  assert.equal(data.diceLines[0].id, 'line');
  assert.ok(report.repaired.some(item => item.change === 'id-récupéré-de-la-clé-de-map'));
});

test('E04 migration — extensions et cartes numériques restent inertes', () => {
  const source = JSON.parse(`{
    "reserve": [{
      "id": "p",
      "caracs": {"E": 35, "BAD": "NaN", "__proto__": {"polluted": true}},
      "armor": {"body": 2, "head": "Infinity"},
      "__proto__": {"polluted": true},
      "constructor": {"marker": "kept"}
    }],
    "combat": {"participants": []},
    "__proto__": {"polluted": true},
    "constructor": {"rootMarker": "kept"}
  }`);
  const { data, report } = migrateSnapshot(source);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.getPrototypeOf(data.extensions), Object.prototype);
  assert.equal(Object.prototype.hasOwnProperty.call(data.extensions, '__proto__'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(data.extensions, 'constructor'), true);
  assert.equal(Object.getPrototypeOf(data.reserve[0].extensions), Object.prototype);
  assert.equal(Object.prototype.hasOwnProperty.call(data.reserve[0].extensions, '__proto__'), true);
  assert.equal(data.reserve[0].caracs.E, 35);
  assert.equal(data.reserve[0].caracs.BAD, undefined);
  assert.equal(data.reserve[0].armor.body, 2);
  assert.equal(data.reserve[0].armor.head, undefined);
  assert.equal(data.reserve[0].extensions.invalidFields.caracs.BAD, 'NaN');
  assert.ok(report.repaired.some(item => item.reason === 'valeur-non-finie-retirée'));
});

test('E04 migration — version future refusée sans modifier l’entrée', () => {
  const source = { schemaVersion: 99, reserve: [{ id: 'p', hp: 10 }], combat: {} };
  const before = structuredClone(source);
  assert.throws(() => migrateSnapshot(source), error => error instanceof MigrationError);
  assert.deepEqual(source, before);
});

test('E04 migration — nombre invalide neutralisé et conservé dans extensions', () => {
  const { data, report } = migrateSnapshot({
    reserve: [{ id: 'p', hp: 'pas-un-nombre' }],
    combat: { round: 'NaN', participants: [] }
  });
  assert.equal(data.reserve[0].hp, undefined);
  assert.equal(data.reserve[0].extensions.invalidFields.hp, 'pas-un-nombre');
  assert.equal(data.combat.round, 0);
  assert.equal(data.combat.extensions.round, 'NaN');
  assert.ok(report.repaired.some(item => item.reason.includes('nombre-non-fini')));
});

test('E04 migration — lecture des anciennes clés sans suppression ni écriture', () => {
  const values = new Map([
    ['wfrp.reserve.v1', JSON.stringify([{ id: 'p', hp: 10 }])],
    ['wfrp.combat.v1', JSON.stringify({ round: 1, participants: [] })],
    ['wfrp.log.v1', JSON.stringify([])],
    ['wfrp.dice.v1', JSON.stringify([])],
    ['wfrp.sync.ts.v1', '1234']
  ]);
  let writes = 0;
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: () => { writes++; throw new Error('write interdite'); }
  };
  const { data } = migrateLegacyStorage(storage);
  assert.equal(data.schemaVersion, 3);
  assert.equal(data.extensions.legacySyncTimestamp, '1234');
  assert.equal(writes, 0);
  assert.equal(values.has('wfrp.reserve.v1'), true);
});

test('E04 persistence — état, outbox et restauration sont atomiques et isolés par contexte', async () => {
  const indexedDB = fakeIndexedDB();
  const guest = createPersistence({ indexedDB, dbName: 'e04', contextId: 'guest' });
  const account = createPersistence({ indexedDB, dbName: 'e04', contextId: 'account:user' });
  await guest.saveAtomic({
    state: { schemaVersion: 2, reserve: [{ id: 'p' }] },
    operations: [{ id: 'op-1', payload: { path: 'reserve/p' }, sequence: 1 }],
    restore: { reason: 'import', state: { schemaVersion: 2, reserve: [] } }
  });
  assert.deepEqual(await guest.load(), { schemaVersion: 2, reserve: [{ id: 'p' }] });
  assert.equal((await guest.listOutbox())[0].id, 'op-1');
  assert.equal((await guest.listRestorePoints())[0].reason, 'import');
  assert.equal(await account.load(), null);
  assert.deepEqual(await account.listOutbox(), []);
  assert.equal(await account.deleteRestorePoint((await guest.listRestorePoints())[0].id), true);
  assert.equal((await guest.listRestorePoints()).length, 1, 'un contexte ne peut pas supprimer le point d’un autre');
  await guest.ack('op-1');
  assert.deepEqual(await guest.listOutbox(), []);
});

test('E04 persistence — un abandon après state restaure les trois stores', async () => {
  const indexedDB = fakeIndexedDB();
  const persistence = createPersistence({ indexedDB, dbName: 'rollback', contextId: 'guest' });
  indexedDB.failNext('outbox');
  await assert.rejects(
    persistence.saveAtomic({
      state: { schemaVersion: 2, reserve: [{ id: 'p' }] },
      operations: [{ id: 'op-after-state' }],
      restore: { id: 'restore-after-state', state: { schemaVersion: 2, reserve: [] } }
    }),
    /fake IndexedDB failure on outbox/
  );
  assert.equal(await persistence.load(), null);
  assert.deepEqual(await persistence.listOutbox(), []);
  assert.deepEqual(await persistence.listRestorePoints(), []);
});

test('E04 persistence — une erreur de quota est propagée sans état partiel', async () => {
  const indexedDB = fakeIndexedDB();
  const persistence = createPersistence({ indexedDB, dbName: 'quota', contextId: 'guest' });
  const quotaError = new Error('quota dépassé');
  quotaError.name = 'QuotaExceededError';
  indexedDB.failNext('contexts', quotaError);
  await assert.rejects(
    persistence.saveAtomic({ state: { schemaVersion: 2, reserve: [], combat: {} } }),
    error => error.name === 'QuotaExceededError'
  );
  assert.equal(await persistence.load(), null);
});

test('E04 persistence — conservation des dix restaurations les plus récentes', async () => {
  const persistence = createPersistence({ indexedDB: fakeIndexedDB(), dbName: 'restore-cap', contextId: 'guest' });
  for (let i = 0; i < 12; i++) {
    await persistence.saveAtomic({
      restore: { id: 'r' + i, createdAt: i, state: { n: i } }
    });
  }
  const points = await persistence.listRestorePoints();
  assert.equal(points.length, 10);
  assert.deepEqual(points.map(point => point.id), ['guest:r11', 'guest:r10', 'guest:r9', 'guest:r8', 'guest:r7', 'guest:r6', 'guest:r5', 'guest:r4', 'guest:r3', 'guest:r2']);
});

test('E04 persistence — erreur d’API est propagée avant toute écriture', async () => {
  const persistence = createPersistence({ indexedDB: fakeIndexedDB(), dbName: 'errors', contextId: 'guest' });
  await assert.rejects(
    persistence.saveAtomic({ operations: [{ payload: 'sans id' }] }),
    /opération doit avoir un id stable/
  );
});
});

describe('Integration du store E04', () => {
function legacyStorage(values) {
  const writes = [];
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { writes.push([key, value]); values.set(key, value); },
    writes
  };
}

function waitFor(check, timeout = 500) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (await check()) return resolve();
      if (Date.now() - started > timeout) return reject(new Error('condition non atteinte'));
      setTimeout(tick, 5);
    };
    tick();
  });
}

test('E04 Store — réhydrate journal/extensions dans IDB et conserve la source legacy brute', async () => {
  const values = new Map([
    [KEY.RESERVE, JSON.stringify([{ id: 'p', name: 'Garde', hp: 10, customRule: { keep: true } }])],
    [KEY.COMBAT, JSON.stringify({ round: 2, participants: [] })],
    [KEY.LOG, JSON.stringify(['entrée historique'])],
    [KEY.DICE, JSON.stringify([])],
    [KEY.TS, '42']
  ]);
  const storage = legacyStorage(values);
  const persistence = createPersistence({ indexedDB, dbName: 'e04-store-hydrate', contextId: 'guest' });
  const store = createStore({ storage, persistence, appVersion: '3.5.1' });

  const ready = await store.ready;
  assert.deepEqual(ready, { ok: true });
  assert.equal(store.getProfile('p').name, 'Garde');
  assert.deepEqual(store.getProfile('p').extensions, { customRule: { keep: true } });
  assert.equal(store.getLog()[0].text, 'entrée historique');
  assert.deepEqual(storage.writes, [], 'la migration ne réécrit jamais localStorage');

  const restores = await persistence.listRestorePoints();
  assert.equal(restores.length, 1);
  assert.equal(restores[0].reason, 'migration');
  assert.equal(restores[0].state.format, 'legacy-localStorage');
  assert.equal(restores[0].state.keys[KEY.RESERVE], values.get(KEY.RESERVE));

  store.addProfile(new Profile({ id: 'q', name: 'Bête', hp: 7 }));
  await waitFor(async () => (await persistence.load())?.reserve?.some(profile => profile.id === 'q'));
  const saved = await persistence.load();
  assert.ok(saved.reserve.some(profile => profile.id === 'q'));
  persistence.close();
});

test('E04 Store — un import remplaçant attend IDB et laisse l’état vivant intact en cas d’échec', async () => {
  let fail = false;
  const initial = {
    schemaVersion: 2,
    reserve: [{ id: 'old', name: 'Ancien', hp: 8 }],
    combat: { round: 0, order: [], participants: [] },
    log: [],
    diceLines: []
  };
  const persistence = {
    async load() { return structuredClone(initial); },
    async saveAtomic({ state }) {
      if (fail) throw new Error('quota dépassé');
      return { saved: state !== undefined };
    }
  };
  const store = createStore({ persistence, appVersion: '3.5.1' });
  assert.deepEqual(await store.ready, { ok: true });
  fail = true;
  await assert.rejects(
    store.loadFromJSON(JSON.stringify({
      schemaVersion: 2,
      reserve: [{ id: 'new', name: 'Nouveau', hp: 12 }],
      combat: { round: 0, order: [], participants: [] },
      log: [],
      diceLines: []
    })),
    /quota dépassé/
  );
  assert.equal(store.getProfile('old').name, 'Ancien');
  assert.equal(store.getProfile('new'), null);
});

test('E04 Store — une erreur d’hydratation met le Store en récupération sans écrire', async () => {
  let writes = 0;
  let unavailable = true;
  const persistence = {
    async load() {
      if (unavailable) throw new Error('IDB indisponible');
      return { schemaVersion: 2, reserve: [], combat: { round: 0, order: [], participants: [] }, log: [], diceLines: [] };
    },
    async saveAtomic() { writes++; }
  };
  const store = createStore({ persistence });
  const ready = await store.ready;
  assert.equal(ready.ok, false);
  store.addProfile(new Profile({ id: 'blocked', name: 'Bloqué', hp: 1 }));
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(writes, 0);
  assert.equal(store.getProfile('blocked'), null);
  unavailable = false;
  assert.deepEqual(await store.retryHydration(), { ok: true });
  store.addProfile(new Profile({ id: 'allowed', name: 'Rétabli', hp: 1 }));
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(writes, 1);
});

test('E04 Store — prévisualise et restaure un point scoped, avec sauvegarde avant remplacement', async () => {
  const persistence = createPersistence({ indexedDB, dbName: 'e04-store-restore-api', contextId: 'guest' });
  const store = createStore({ persistence, appVersion: '3.5.1' });
  assert.deepEqual(await store.ready, { ok: true });
  const target = {
    schemaVersion: 2,
    reserve: [{ id: 'restored', name: 'Restauré', hp: 12 }],
    combat: { round: 0, order: [], participants: [] },
    log: [], diceLines: [], localRevision: 4
  };
  await persistence.saveAtomic({
    state: JSON.parse(store.getFullJSON()),
    restore: { id: 'chosen', reason: 'manual', state: target }
  });
  const listed = await store.listRestorePoints();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, 'guest:chosen');
  const preview = await store.previewRestorePoint('guest:chosen');
  assert.equal(preview.data.reserve[0].id, 'restored');
  assert.equal(preview.counts.profiles, 1);

  await store.addProfile(new Profile({ id: 'before-restore', name: 'Avant', hp: 3 }));
  const revision = store.getLocalRevision();
  const result = await store.restorePoint('guest:chosen', { expectedRevision: revision });
  assert.equal(result.status, 'restored');
  assert.equal(store.getProfile('restored').name, 'Restauré');
  assert.equal(store.getProfile('before-restore'), null);
  const after = await persistence.listRestorePoints();
  assert.ok(after.some(point => point.reason === 'restore-before'));
  persistence.close();
});

test('E04 Store — une édition pendant la lecture d’un point rend la restauration périmée', async () => {
  let release;
  let writes = 0;
  const target = {
    schemaVersion: 2,
    reserve: [{ id: 'restored-race', name: 'Ne doit pas écraser', hp: 12 }],
    combat: { round: 0, order: [], participants: [] }, log: [], diceLines: []
  };
  const persistence = {
    async load() { return { schemaVersion: 2, reserve: [], combat: { round: 0, order: [], participants: [] }, log: [], diceLines: [] }; },
    async saveAtomic({ state }) { writes++; return { ok: true, state }; },
    async listRestorePoints() {
      return new Promise(resolve => { release = () => resolve([{ id: 'guest:race', contextId: 'guest', createdAt: 1, reason: 'manual', state: target }]); });
    }
  };
  const store = createStore({ persistence });
  assert.deepEqual(await store.ready, { ok: true });
  const pending = store.restorePoint('guest:race');
  while (typeof release !== 'function') await new Promise(resolve => setTimeout(resolve, 0));
  await store.addProfile(new Profile({ id: 'kept-race', name: 'Conservé', hp: 3 }));
  release();
  assert.equal((await pending).status, 'stale');
  assert.equal(store.getProfile('kept-race').name, 'Conservé');
  assert.equal(store.getProfile('restored-race'), null);
  assert.equal(writes, 1);
});

test('E04 Store — l’import verrouille les mutations concurrentes et clone l’état en file', async () => {
  let release;
  const savedStates = [];
  const persistence = {
    async load() {
      return { schemaVersion: 2, reserve: [], combat: { round: 0, order: [], participants: [] }, log: [], diceLines: [] };
    },
    async saveAtomic({ state }) {
      savedStates.push(state);
      if (savedStates.length === 1) {
        return new Promise(resolve => { release = () => resolve({ saved: true }); });
      }
      return { saved: true };
    }
  };
  const store = createStore({ persistence });
  await store.ready;
  const pending = store.loadFromJSON(JSON.stringify({
    schemaVersion: 2,
    reserve: [{ id: 'imported', name: 'Importé', hp: 12 }],
    combat: { round: 0, order: [], participants: [] },
    log: [],
    diceLines: []
  }));
  assert.equal(store.addProfile(new Profile({ id: 'raced', name: 'Course', hp: 1 })), false);
  await waitFor(() => typeof release === 'function');
  release();
  await pending;
  assert.equal(store.getProfile('raced'), null);
  assert.equal(store.getProfile('imported').name, 'Importé');

  // Le snapshot est figé avant l’exécution de la transaction, même si l’objet
  // passé à addProfile est ensuite modifié par le code appelant.
  const profile = new Profile({ id: 'cloned', name: 'Avant', hp: 3 });
  store.addProfile(profile);
  profile.name = 'Après';
  await new Promise(resolve => queueMicrotask(resolve));
  assert.equal(savedStates.at(-1).reserve.find(item => item.id === 'cloned')?.name, 'Avant');
  release();
});
});
