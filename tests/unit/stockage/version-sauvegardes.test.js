// ARCH-10 : numéro de schéma des sauvegardes et chaîne de migrations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENT_SCHEMA_VERSION, SCHEMA_MIGRATIONS, MigrationError, LEGACY_SCHEMA_KEY,
  applySchemaMigrations, migrateSnapshot, migrateLegacyStorage, readSchemaVersion
} from '../../../js/core/migrations.js';
import { SYNC_PROTOCOL_VERSION } from '../../../js/core/sync-protocol.js';
import { createStore, KEY } from '../../../js/core/store.js';
import { userMessage } from '../../../js/ui/messages.js';

const memoryPersistence = (initial = null) => {
  let state = initial && structuredClone(initial);
  let writes = 0;
  return {
    get writes() { return writes; },
    get state() { return state; },
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) { writes++; state = structuredClone(next); return { ok: true }; }
  };
};
const memoryStorage = (entries = []) => {
  const values = new Map(entries);
  const writes = [];
  return {
    values, writes,
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => { writes.push(key); values.set(key, String(value)); },
    removeItem: key => values.delete(key)
  };
};

test('ARCH-10 — garde-fou : chaque version de 0 à la version courante a son étape, dans l’ordre', () => {
  assert.equal(SCHEMA_MIGRATIONS.length, CURRENT_SCHEMA_VERSION,
    `Le schéma courant est ${CURRENT_SCHEMA_VERSION} : ajoutez l’étape ${SCHEMA_MIGRATIONS.length} → ${SCHEMA_MIGRATIONS.length + 1} dans SCHEMA_MIGRATIONS.`);
  SCHEMA_MIGRATIONS.forEach((step, index) => {
    assert.equal(step.from, index, `étape ${index} hors d’ordre`);
    assert.equal(step.to, index + 1);
    assert.equal(typeof step.migrate, 'function');
    assert.ok(step.description, 'chaque étape dit ce qu’elle transforme');
  });
  assert.equal(SCHEMA_MIGRATIONS.at(-1).to, CURRENT_SCHEMA_VERSION);
});

test('ARCH-10 — garde-fou : le protocole de synchronisation suit le schéma', () => {
  // sync-protocol refuse tout état partagé dont schemaVersion diffère de SYNC_PROTOCOL_VERSION :
  // monter le schéma sans le protocole couperait la synchronisation.
  assert.equal(SYNC_PROTOCOL_VERSION, CURRENT_SCHEMA_VERSION);
});

test('ARCH-10 — une sauvegarde sans numéro est lue comme la version 0 sans modifier l’entrée', () => {
  assert.equal(readSchemaVersion({}), 0);
  assert.equal(readSchemaVersion({ schemaVersion: null }), 0);
  const source = { reserve: [{ id: 'garde', name: 'Garde', hp: 12 }], combat: { round: 1, participants: [] } };
  const before = structuredClone(source);
  const { data, report } = migrateSnapshot(source);
  assert.deepEqual(source, before, 'la lecture ne réécrit pas la source');
  assert.equal(data.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(data.reserve[0].name, 'Garde');
  const entry = report.migrated.find(row => row.path === 'schemaVersion');
  assert.equal(entry.from, 'absent');
  assert.deepEqual(entry.steps.map(step => `${step.from}>${step.to}`), SCHEMA_MIGRATIONS.map(step => `${step.from}>${step.to}`));
  assert.deepEqual(entry.steps.slice(0, 3).map(step => `${step.from}>${step.to}`), ['0>1', '1>2', '2>3']);
});

test('ARCH-10 — une sauvegarde à jour ne traverse aucune étape', () => {
  const { data, report } = migrateSnapshot({ schemaVersion: CURRENT_SCHEMA_VERSION, reserve: [], combat: {} });
  assert.equal(data.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(report.migrated.some(row => row.path === 'schemaVersion'), false);
});

test('ARCH-10 — la chaîne applique les étapes dans l’ordre, chacune sur une copie', () => {
  const calls = [];
  const steps = [
    { from: 1, to: 2, description: 'renomme pv en hp', migrate: (data, { report }) => {
      calls.push(1);
      data.reserve = data.reserve.map(({ pv, ...row }) => ({ ...row, hp: pv }));
      report.migrated.push({ path: 'reserve/pv', to: 'hp' });
      return data;
    } },
    { from: 0, to: 1, description: 'pose la liste', migrate: data => { calls.push(0); return { ...data, reserve: data.reserve ?? [] }; } },
    { from: 2, to: 3, description: 'double les PV', migrate: data => { calls.push(2); data.reserve.forEach(row => { row.hp *= 2; }); return data; } }
  ];
  const report = { migrated: [], repaired: [], rejected: [], warnings: [] };
  const source = { schemaVersion: 1, reserve: [{ id: 'a', pv: 5 }] };
  const before = structuredClone(source);
  const result = applySchemaMigrations(source, { steps, targetVersion: 3, report });
  assert.deepEqual(calls, [1, 2], 'départ à la version lue, étapes en ordre croissant');
  assert.deepEqual(result.data.reserve, [{ id: 'a', hp: 10 }]);
  assert.equal(result.data.schemaVersion, 3);
  assert.deepEqual(result.applied, [{ from: 1, to: 2 }, { from: 2, to: 3 }]);
  assert.deepEqual(report.migrated, [{ path: 'reserve/pv', to: 'hp' }]);
  assert.deepEqual(source, before, 'étapes pures : l’entrée reste intacte');
  // Une sauvegarde déjà migrée ne rejoue pas la transformation.
  calls.length = 0;
  const again = applySchemaMigrations(result.data, { steps, targetVersion: 3 });
  assert.deepEqual(calls, []);
  assert.deepEqual(again.data.reserve, [{ id: 'a', hp: 10 }]);
});

test('ARCH-10 — une chaîne trouée est refusée', () => {
  const steps = [{ from: 0, to: 1, description: 'x', migrate: data => data }];
  assert.throws(() => applySchemaMigrations({}, { steps, targetVersion: 2 }),
    error => error instanceof MigrationError && error.details.reason === 'etape-manquante' && error.details.from === 1);
});

test('ARCH-10 — une version invalide est refusée', () => {
  for (const schemaVersion of [-1, 1.5, '3']) {
    assert.throws(() => migrateSnapshot({ schemaVersion, reserve: [], combat: {} }),
      error => error instanceof MigrationError && error.details.reason === 'version-invalide');
  }
});

test('ARCH-10 — une version future est refusée avec un message en français, sans toucher l’entrée', () => {
  const source = { schemaVersion: CURRENT_SCHEMA_VERSION + 1, reserve: [{ id: 'p' }], combat: {} };
  const before = structuredClone(source);
  let caught;
  assert.throws(() => migrateSnapshot(source), error => { caught = error; return error instanceof MigrationError; });
  assert.equal(caught.details.reason, 'version-future');
  assert.match(caught.message, new RegExp(`schéma ${CURRENT_SCHEMA_VERSION + 1}, cet outil lit jusqu’au schéma ${CURRENT_SCHEMA_VERSION}`));
  assert.match(userMessage(caught), /version plus récente de l’outil/);
  assert.deepEqual(source, before);
});

test('ARCH-10 — import d’un fichier de version future : refusé, partie en cours intacte', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.addProfile({ id: 'garde', name: 'Garde', hp: 12 });
  const writes = persistence.writes;
  const future = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION + 1, reserve: [], combat: {} });
  assert.throws(() => store.previewImport(future), error => error.details?.reason === 'version-future');
  await assert.rejects(async () => store.loadFromJSON(future), error => error.details?.reason === 'version-future');
  assert.equal(store.getProfile('garde').name, 'Garde');
  assert.equal(persistence.writes, writes, 'aucune écriture');
});

test('ARCH-10 — IndexedDB de version future : réhydratation refusée, rien n’est réécrit', async () => {
  const saved = { schemaVersion: CURRENT_SCHEMA_VERSION + 1, reserve: [{ id: 'x', name: 'Futur' }], combat: {}, log: [], diceLines: [] };
  const persistence = memoryPersistence(saved);
  const store = createStore({ persistence });
  const ready = await store.ready;
  assert.equal(ready.ok, false);
  assert.equal(ready.error.details.reason, 'version-future');
  await Promise.resolve(store.addProfile({ id: 'garde', name: 'Garde', hp: 12 })).catch(() => {});
  assert.equal(persistence.writes, 0);
  assert.deepEqual(persistence.state, saved);
});

test('ARCH-10 — aller-retour export/import : la version est écrite et relue par le même chemin', async () => {
  const source = createStore({ persistence: memoryPersistence() });
  await source.ready;
  await source.addProfile({ id: 'garde', name: 'Garde', hp: 12, initiative: 30 });
  const exported = JSON.parse(source.getFullJSON({ includeHistory: false }));
  assert.equal(exported.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.notEqual(exported.schemaVersion, exported.appVersion, 'version de schéma distincte de celle de l’outil');

  const target = createStore({ persistence: memoryPersistence() });
  await target.ready;
  const preview = target.previewImport(JSON.stringify(exported));
  assert.equal(preview.report.migrated.some(row => row.path === 'schemaVersion'), false);
  await target.loadFromJSON(JSON.stringify(exported));
  assert.equal(target.getProfile('garde').name, 'Garde');
  assert.equal(JSON.parse(target.getFullJSON()).schemaVersion, CURRENT_SCHEMA_VERSION);
});

test('ARCH-10 — repli localStorage : la version est écrite à chaque sauvegarde', async () => {
  const storage = memoryStorage();
  const store = createStore({ storage });
  await store.ready;
  await store.addProfile({ id: 'garde', name: 'Garde', hp: 12 });
  assert.equal(KEY.SCHEMA, LEGACY_SCHEMA_KEY);
  assert.equal(storage.values.get(KEY.SCHEMA), String(CURRENT_SCHEMA_VERSION));
  const reread = createStore({ storage });
  await reread.ready;
  assert.equal(reread.getProfile('garde').name, 'Garde');
});

test('ARCH-10 — repli localStorage sans clé de version : lu, rien n’est réécrit à la lecture', async () => {
  const storage = memoryStorage([[KEY.RESERVE, JSON.stringify([{ id: 'garde', name: 'Garde', hp: 12 }])]]);
  const store = createStore({ storage });
  await store.ready;
  assert.equal(store.getProfile('garde').name, 'Garde');
  assert.deepEqual(storage.writes, []);
  assert.equal(migrateLegacyStorage(storage).data.schemaVersion, CURRENT_SCHEMA_VERSION);
});

test('ARCH-10 — repli localStorage de version future : rien n’est lu ni écrasé', async () => {
  const futureReserve = JSON.stringify([{ id: 'futur', name: 'Futur' }]);
  const storage = memoryStorage([[KEY.SCHEMA, String(CURRENT_SCHEMA_VERSION + 1)], [KEY.RESERVE, futureReserve]]);
  assert.throws(() => migrateLegacyStorage(storage), error => error.details?.reason === 'version-future');
  const store = createStore({ storage });
  await store.ready;
  assert.equal(store.getProfile('futur') ?? null, null);
  await store.addProfile({ id: 'garde', name: 'Garde', hp: 12 });
  assert.equal(storage.values.get(KEY.RESERVE), futureReserve, 'la sauvegarde future reste intacte');
  assert.equal(storage.values.get(KEY.SCHEMA), String(CURRENT_SCHEMA_VERSION + 1));
});
