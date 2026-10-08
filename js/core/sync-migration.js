import { migrateSnapshot } from './migrations.js';
import { createSyncDocument, validateSyncDocument, SyncProtocolError } from './sync-protocol.js';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function migrateV2SyncDocument(raw) {
  if (raw == null) return null;
  if (!record(raw) || !Number.isSafeInteger(raw.revision) || raw.revision < 0 || !record(raw.state)
    || Object.keys(raw).some(key => !['revision', 'state', 'receipts'].includes(key))) throw new SyncProtocolError('Session cloud v2 invalide : aucune reprise appliquée.');
  if (raw.state.schemaVersion !== undefined && raw.state.schemaVersion !== 2) throw new SyncProtocolError('Version de session source incompatible.');
  if (raw.receipts !== undefined && (!record(raw.receipts) || Object.values(raw.receipts).some(value => !Number.isSafeInteger(value) || value < 0))) throw new SyncProtocolError('Reçus de session v2 invalides.');
  let data;
  try { ({ data } = migrateSnapshot(raw.state)); } catch (cause) { throw new SyncProtocolError(`Session v2 non migrable : ${cause.message}`, "INVALID_STATE"); }
  return createSyncDocument(data, { revision: raw.revision, receipts: {} });
}
/** A fresh v3 path may be initialized once. Existing roots, even malformed ones, are never overwritten. */
export function initializeV3Root(current, migrated) {
  if (current != null) return undefined;
  return migrated == null ? undefined : validateSyncDocument(migrated);
}
export function createMigratingTransport({ current, legacy, read, transact, subscribe }) {
  return {
    async read() {
      const existing = await read(current);
      if (existing != null) return existing;
      const previous = await read(legacy);
      if (previous == null) return null;
      const migrated = migrateV2SyncDocument(previous);
      const result = await transact(current, value => initializeV3Root(value, migrated));
      // Another client can win initialization. Always return the winning root.
      return result.root ?? await read(current);
    },
    transaction(operation) { return transact(current, operation); },
    subscribe(callback) { return subscribe(current, callback); }
  };
}
