/**
 * Pure migration pipeline for persisted WFRP state.
 *
 * It accepts the historical local/file shape and Firebase's object maps, and returns
 * a schema v2 envelope without mutating the input. It deliberately does not write
 * storage or execute extension fields.
 */
export const CURRENT_SCHEMA_VERSION = 2;

export class MigrationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'MigrationError';
    this.details = details;
  }
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function safeSet(target, key, value) {
  Object.defineProperty(target, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

// JSON.parse peut fournir une propriété propre nommée __proto__. Copier avec
// Object.assign sur un objet normal la traiterait comme un setter de prototype.
const clone = value => {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone);
  const out = {};
  for (const [key, child] of Object.entries(value)) safeSet(out, key, clone(child));
  return out;
};

function pushReport(report, bucket, path, detail) {
  report[bucket].push({ path, ...(detail || {}) });
}

function collection(value, path, report) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((item, index) => ({ item, key: String(index), fromMap: false }));
  }
  if (isObject(value)) {
    return Object.entries(value).map(([key, item]) => ({ item, key, fromMap: true }));
  }
  pushReport(report, 'rejected', path, { reason: 'collection-invalide' });
  return [];
}

function withExtensions(item, known, path, report) {
  const out = {};
  for (const key of known) {
    if (Object.prototype.hasOwnProperty.call(item, key)) out[key] = clone(item[key]);
  }
  const unknown = {};
  for (const [key, value] of Object.entries(item)) {
    if (!known.includes(key) && key !== 'extensions') safeSet(unknown, key, clone(value));
  }
  if (isObject(item.extensions)) {
    for (const [key, value] of Object.entries(item.extensions)) safeSet(unknown, key, clone(value));
  }
  if (Object.keys(unknown).length) out.extensions = unknown;
  return out;
}

function addInvalidField(item, field, value) {
  const extensions = isObject(item.extensions) ? item.extensions : {};
  const invalidFields = isObject(extensions.invalidFields) ? extensions.invalidFields : {};
  safeSet(invalidFields, field, clone(value));
  safeSet(extensions, 'invalidFields', invalidFields);
  safeSet(item, 'extensions', extensions);
}

function sanitizeNumericMap(item, field, path, report) {
  if (!Object.prototype.hasOwnProperty.call(item, field)) return;
  const value = item[field];
  if (!isObject(value)) {
    if (value !== null && value !== undefined) {
      addInvalidField(item, field, value);
      pushReport(report, 'repaired', path + '/' + field, {
        from: value, reason: 'carte-numerique-invalide'
      });
    }
    delete item[field];
    return;
  }
  const clean = {};
  const invalid = {};
  for (const [key, nested] of Object.entries(value)) {
    if (nested !== null && nested !== '' && Number.isFinite(Number(nested))) {
      safeSet(clean, key, clone(nested));
    } else {
      safeSet(invalid, key, clone(nested));
      pushReport(report, 'repaired', path + '/' + field + '/' + key, {
        from: nested, reason: 'valeur-non-finie-retirée'
      });
    }
  }
  item[field] = clean;
  if (Object.keys(invalid).length) {
    const extensions = isObject(item.extensions) ? item.extensions : {};
    const invalidFields = isObject(extensions.invalidFields) ? extensions.invalidFields : {};
    safeSet(invalidFields, field, invalid);
    safeSet(extensions, 'invalidFields', invalidFields);
    safeSet(item, 'extensions', extensions);
  }
}

function validateFiniteNumbers(item, fields, path, report) {
  const invalid = {};
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(item, field)) continue;
    const value = item[field];
    if (value !== null && value !== '' && !Number.isFinite(Number(value))) {
      invalid[field] = clone(value);
      delete item[field];
      pushReport(report, 'repaired', path + '/' + field, {
        from: value, reason: 'nombre-non-fini-retiré-et-conservé-dans-extensions'
      });
    }
  }
  if (Object.keys(invalid).length) {
    item.extensions = {
      ...(isObject(item.extensions) ? item.extensions : {}),
      invalidFields: { ...(isObject(item.extensions?.invalidFields) ? item.extensions.invalidFields : {}), ...invalid }
    };
  }
}

function itemId(entry, path, report) {
  const item = entry.item;
  if (!isObject(item)) {
    pushReport(report, 'rejected', path, { key: entry.key, reason: 'objet-attendu' });
    return null;
  }
  let id = item.id;
  if ((typeof id !== 'string' || !id.trim()) && entry.fromMap && entry.key) {
    id = entry.key;
    pushReport(report, 'repaired', path, { key: entry.key, change: 'id-récupéré-de-la-clé-de-map' });
  }
  if (typeof id !== 'string' || !id.trim()) {
    pushReport(report, 'rejected', path, { key: entry.key, reason: 'id-manquant' });
    return null;
  }
  return id;
}

const PROFILE_KEYS = ['id', 'name', 'kind', 'initiative', 'hp', 'maxHp', 'caracs', 'armor', 'diceLines', 'actions', 'group', 'tags', 'notes', 'favorite'];
const PARTICIPANT_KEYS = ['id', 'profileId', 'persistentCharacterId', 'improvised', 'name', 'kind', 'initiative', 'hp', 'maxHp', 'states', 'zone', 'camp', 'color', 'armor', 'caracs', 'actions', 'tags', 'notes', 'source'];
const DICE_KEYS = ['id', 'participantId', 'type', 'attr', 'base', 'mod', 'note', 'damage', 'targetId', 'qualities', 'valuesX', 'capacity'];
const COMBAT_KEYS = ['round', 'currentActorId', 'order', 'participants', 'meta', 'orderMode', 'extensions'];

function migrateProfiles(raw, report) {
  const seen = new Set();
  const out = [];
  for (const entry of collection(raw, 'reserve', report)) {
    const id = itemId(entry, 'reserve/' + entry.key, report);
    if (!id) continue;
    if (seen.has(id)) {
      pushReport(report, 'rejected', 'reserve/' + entry.key, { id, reason: 'id-duplique' });
      continue;
    }
    seen.add(id);
    const item = { ...entry.item, id };
    validateFiniteNumbers(item, ['initiative', 'hp', 'maxHp'], 'reserve/' + id, report);
    sanitizeNumericMap(item, 'caracs', 'reserve/' + id, report);
    sanitizeNumericMap(item, 'armor', 'reserve/' + id, report);
    out.push(withExtensions(item, PROFILE_KEYS, 'reserve/' + id, report));
  }
  return out;
}

function migrateParticipants(raw, profiles, report) {
  const profileIds = new Set(profiles.map(p => p.id));
  const seen = new Set();
  const out = [];
  for (const entry of collection(raw, 'combat.participants', report)) {
    const id = itemId(entry, 'combat/participants/' + entry.key, report);
    if (!id) continue;
    if (seen.has(id)) {
      pushReport(report, 'rejected', 'combat/participants/' + entry.key, { id, reason: 'id-duplique' });
      continue;
    }
    seen.add(id);
    const item = { ...entry.item, id };
    if (typeof item.profileId === 'string' && item.profileId && !profileIds.has(item.profileId)) {
      pushReport(report, 'repaired', 'combat/participants/' + id + '/profileId', {
        from: item.profileId, to: null, reason: 'profil-orphelin'
      });
      item.profileId = null;
    }
    validateFiniteNumbers(item, ['initiative', 'hp', 'maxHp'], 'combat/participants/' + id, report);
    sanitizeNumericMap(item, 'caracs', 'combat/participants/' + id, report);
    sanitizeNumericMap(item, 'armor', 'combat/participants/' + id, report);
    out.push(withExtensions(item, PARTICIPANT_KEYS, 'combat/participants/' + id, report));
  }
  return out;
}

function migrateDiceLines(raw, participantIds, report) {
  const out = [];
  const seen = new Set();
  for (const entry of collection(raw, 'diceLines', report)) {
    const id = itemId(entry, 'diceLines/' + entry.key, report);
    if (!id) continue;
    if (seen.has(id)) {
      pushReport(report, 'rejected', 'diceLines/' + entry.key, { id, reason: 'id-duplique' });
      continue;
    }
    seen.add(id);
    const item = { ...entry.item, id };
    for (const field of ['participantId', 'targetId']) {
      if (item[field] == null || item[field] === '') {
        if (field in item) item[field] = null;
        continue;
      }
      if (typeof item[field] !== 'string' || !participantIds.has(item[field])) {
        pushReport(report, 'repaired', 'diceLines/' + id + '/' + field, {
          from: item[field], to: null, reason: 'participant-orphelin'
        });
        item[field] = null;
      }
    }
    validateFiniteNumbers(item, ['mod', 'damage', 'valuesX', 'capacity'], 'diceLines/' + id, report);
    out.push(withExtensions(item, DICE_KEYS, 'diceLines/' + id, report));
  }
  return out;
}

function migrateLog(raw, report) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return clone(raw);
  if (isObject(raw)) {
    pushReport(report, 'repaired', 'log', { reason: 'map-convertie-en-liste' });
    return Object.values(clone(raw));
  }
  pushReport(report, 'rejected', 'log', { reason: 'collection-invalide' });
  return [];
}

function normaliseMeta(combat, report) {
  const source = isObject(combat) ? combat : {};
  const meta = isObject(source.meta) ? source.meta : source;
  const rawOrder = Array.isArray(meta.order)
    ? meta.order
    : (isObject(meta.order) ? Object.values(meta.order) : []);
  const participantIds = new Set(report._participantIds);
  const order = [];
  const seen = new Set();
  rawOrder.forEach((id, index) => {
    if (typeof id !== 'string' || !participantIds.has(id)) {
      pushReport(report, 'repaired', 'combat.order/' + index, { from: id, reason: 'participant-orphelin' });
      return;
    }
    if (seen.has(id)) {
      pushReport(report, 'repaired', 'combat.order/' + index, { from: id, reason: 'id-duplique' });
      return;
    }
    seen.add(id);
    order.push(id);
  });

  let currentActorId = meta.currentActorId;
  if (currentActorId === undefined && source.currentActorId !== undefined) currentActorId = source.currentActorId;
  const legacyTurnIndex = meta.turnIndex !== undefined ? meta.turnIndex : source.turnIndex;
  if (currentActorId === undefined && legacyTurnIndex !== undefined) {
    const index = Number(legacyTurnIndex);
    if (Number.isInteger(index) && index >= 0 && index < order.length) currentActorId = order[index];
    else currentActorId = null;
    pushReport(report, 'migrated', 'combat.turnIndex', { to: currentActorId, reason: 'tour-vers-currentActorId' });
  }
  if (currentActorId == null || currentActorId === '') {
    currentActorId = null;
  } else if (typeof currentActorId !== 'string' || !participantIds.has(currentActorId)) {
    pushReport(report, 'repaired', 'combat.currentActorId', { from: currentActorId, to: null, reason: 'participant-orphelin' });
    currentActorId = null;
  }

  const base = withExtensions(source, COMBAT_KEYS, 'combat', report);
  const extensions = {};
  if (base.extensions) {
    for (const [key, value] of Object.entries(base.extensions)) safeSet(extensions, key, value);
  }
  if (isObject(source.meta)) {
    const metaKnown = ['round', 'currentActorId', 'order', 'turnIndex', 'orderMode', 'extensions'];
    const metaExtensions = withExtensions(source.meta, metaKnown, 'combat.meta', report);
    if (metaExtensions.extensions) extensions.meta = metaExtensions.extensions;
  }
  for (const key of Object.keys(base)) {
    if (!['round', 'currentActorId', 'order', 'participants', 'meta', 'extensions'].includes(key)) {
      safeSet(extensions, key, base[key]);
    }
  }
  if (legacyTurnIndex !== undefined) extensions.turnIndex = clone(legacyTurnIndex);
  const roundIsFinite = meta.round == null || meta.round === '' || Number.isFinite(Number(meta.round));
  if (!roundIsFinite) {
    pushReport(report, 'repaired', 'combat/round', {
      from: meta.round, to: 0, reason: 'nombre-non-fini'
    });
    extensions.round = clone(meta.round);
  }
  return {
    round: roundIsFinite ? Number(meta.round || 0) : 0,
    currentActorId,
    order,
    ...(meta.orderMode === 'manual' || meta.orderMode === 'automatic' ? { orderMode: meta.orderMode } : {}),
    participants: report._participants,
    ...(Object.keys(extensions).length ? { extensions } : {})
  };
}

function rootExtensions(raw) {
  const known = ['schemaVersion', 'appVersion', 'exportedAt', 'contextId', 'reserve', 'combat', 'log', 'diceLines', 'history', 'localRevision', 'syncPending', 'encounters', 'persistentCharacters', 'archives', 'activeScene', 'suspendedScenes', 'reminderChoices', 'appliedResolutionIds', 'extensions'];
  const extensions = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!known.includes(key)) safeSet(extensions, key, clone(value));
  }
  if (isObject(raw.extensions)) {
    for (const [key, value] of Object.entries(raw.extensions)) safeSet(extensions, key, clone(value));
  }
  return extensions;
}

function optionalRootCollections(raw) {
  const result = {};
  for (const key of ['encounters', 'persistentCharacters', 'archives', 'activeScene', 'suspendedScenes', 'reminderChoices', 'appliedResolutionIds']) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) safeSet(result, key, clone(raw[key]));
  }
  return result;
}

export function migrateSnapshot(input, options = {}) {
  if (!isObject(input)) throw new MigrationError('Enveloppe de sauvegarde invalide', { reason: 'objet-attendu' });
  const raw = clone(input);
  const hasReserve = Object.prototype.hasOwnProperty.call(raw, 'reserve');
  const hasCombat = Object.prototype.hasOwnProperty.call(raw, 'combat');
  if (!hasReserve || !hasCombat || !isObject(raw.combat)
      || (!Array.isArray(raw.reserve) && !isObject(raw.reserve))) {
    throw new MigrationError('Enveloppe de sauvegarde incomplète', {
      reason: 'reserve-et-combat-requis'
    });
  }
  const report = { migrated: [], repaired: [], rejected: [], warnings: [] };
  let version = raw.schemaVersion;
  if (version === undefined) {
    version = 0;
    pushReport(report, 'migrated', 'schemaVersion', { from: 'absent', to: CURRENT_SCHEMA_VERSION });
  } else if (!Number.isInteger(version) || version < 0) {
    throw new MigrationError('schemaVersion invalide', { schemaVersion: version });
  } else if (version > CURRENT_SCHEMA_VERSION) {
    throw new MigrationError('Version de sauvegarde future inconnue', { schemaVersion: version });
  } else if (version < CURRENT_SCHEMA_VERSION) {
    pushReport(report, 'migrated', 'schemaVersion', { from: version, to: CURRENT_SCHEMA_VERSION });
  }

  const reserve = migrateProfiles(raw.reserve, report);
  const participants = migrateParticipants(
    isObject(raw.combat) ? raw.combat.participants : undefined,
    reserve,
    report
  );
  report._participants = participants;
  report._participantIds = participants.map(p => p.id);
  const combat = normaliseMeta(raw.combat, report);
  delete report._participants;
  delete report._participantIds;
  const participantIds = new Set(participants.map(p => p.id));
  const diceLines = migrateDiceLines(raw.diceLines, participantIds, report);

  const result = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: raw.appVersion ?? options.appVersion ?? 'unknown',
    exportedAt: raw.exportedAt ?? options.exportedAt ?? new Date().toISOString(),
    contextId: raw.contextId ?? options.contextId ?? 'guest',
    reserve,
    combat,
    log: migrateLog(raw.log, report),
    diceLines,
    ...(raw.history && typeof raw.history === 'object' ? { history: clone(raw.history) } : {}),
    ...(Number.isInteger(raw.localRevision) && raw.localRevision >= 0 ? { localRevision: raw.localRevision } : {}),
    ...(raw.syncPending ? { syncPending: true } : {}),
    ...optionalRootCollections(raw)
  };
  const extensions = rootExtensions(raw);
  if (Object.keys(extensions).length) result.extensions = extensions;
  return { data: result, report };
}

export function migrateLegacyStorage(storage, options = {}) {
  if (!storage || typeof storage.getItem !== 'function') {
    throw new MigrationError('Stockage legacy invalide', { reason: 'getItem-requis' });
  }
  const read = key => {
    const value = storage.getItem(key);
    if (value == null) return null;
    try { return JSON.parse(value); }
    catch {
      throw new MigrationError('Donnée legacy illisible : ' + key, { key });
    }
  };
  const raw = {
    reserve: read('wfrp.reserve.v1') ?? [],
    combat: read('wfrp.combat.v1') ?? {},
    log: read('wfrp.log.v1') ?? [],
    diceLines: read('wfrp.dice.v1') ?? []
  };
  const result = migrateSnapshot(raw, { ...options, contextId: options.contextId ?? 'guest' });
  const timestamp = storage.getItem('wfrp.sync.ts.v1');
  if (timestamp != null) {
    result.data.extensions = {
      ...(result.data.extensions || {}),
      legacySyncTimestamp: timestamp
    };
    result.report.migrated.push({
      path: 'wfrp.sync.ts.v1',
      to: 'extensions.legacySyncTimestamp',
      reason: 'métadonnée conservée sans exécution'
    });
  }
  return result;
};
