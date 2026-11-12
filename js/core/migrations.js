/**
 * Pure migration pipeline for persisted WFRP state.
 *
 * It accepts the historical local/file shape and Firebase's object maps, and returns
 * a schema v3 envelope without mutating the input. It deliberately does not write
 * storage or execute extension fields.
 */
import { normalizeCaracs, profileActionSource, normalizeFicheFields, FICHE_DATA_FIELDS, normalizeTokenColor, normalizeTokenImage } from './models.js';
import { normalizeDamageFields } from './damage.js';
import { sanitizeMagicEnvelope } from './sanitize.js';
import { emptyDivineAccess } from './v5-divine-access.js';
import { createGameClock, readCombatPosition, reconcileGameClockPosition } from './v5-game-time.js';

export const CURRENT_SCHEMA_VERSION = 3;

export class MigrationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'MigrationError';
    this.details = details;
  }
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Chaîne des migrations du schéma de sauvegarde (ARCH-10), dans l'ordre.
 *
 * Chaque étape fait passer une sauvegarde brute de `from` à `to = from + 1`.
 * `migrate(data, context)` reçoit une copie (qu'elle peut modifier) et rend la
 * sauvegarde transformée ; elle ne lit ni n'écrit aucun stockage. `context.report`
 * reçoit les entrées de rapport (`migrated`, `repaired`, `rejected`, `warnings`).
 * Une sauvegarde sans numéro est lue comme la version 0, celle d'avant le
 * versionnage. Les étapes 0→1, 1→2 et 2→3 n'ont rien à transformer : la
 * normalisation tolérante de `migrateSnapshot`, rejouée à chaque lecture,
 * absorbe déjà ces anciennes formes. Pour ajouter une migration : voir README,
 * section « Version des sauvegardes ».
 */
export const SCHEMA_MIGRATIONS = Object.freeze([
  Object.freeze({ from: 0, to: 1, description: 'Sauvegarde sans numéro de version : aucune transformation.', migrate: data => data }),
  Object.freeze({ from: 1, to: 2, description: 'Forme v1 : couverte par la normalisation commune.', migrate: data => data }),
  Object.freeze({ from: 2, to: 3, description: 'Forme v2 (session cloud v2 comprise) : couverte par la normalisation commune.', migrate: data => data })
]);

/** Numéro de schéma d'une sauvegarde brute ; une absence se lit comme 0. */
export function readSchemaVersion(raw) {
  const version = isObject(raw) ? raw.schemaVersion : undefined;
  if (version === undefined || version === null) return 0;
  if (!Number.isInteger(version) || version < 0) {
    throw new MigrationError('schemaVersion invalide', { schemaVersion: version, reason: 'version-invalide' });
  }
  return version;
}

/** Erreur levée pour une sauvegarde écrite par une version plus récente de l'outil. */
export function futureSchemaError(version, known = CURRENT_SCHEMA_VERSION) {
  return new MigrationError(
    `Version de sauvegarde future inconnue : schéma ${version}, cet outil lit jusqu’au schéma ${known}. La sauvegarde n’a été ni lue ni modifiée.`,
    { schemaVersion: version, known, reason: 'version-future' }
  );
}

/**
 * Applique la chaîne de migrations à une sauvegarde brute, sans muter l'entrée.
 * Rend `{ data, from, to, applied }` ; `data.schemaVersion` vaut `targetVersion`.
 * Refuse une version future et une chaîne trouée.
 */
export function applySchemaMigrations(input, { steps = SCHEMA_MIGRATIONS, targetVersion = CURRENT_SCHEMA_VERSION, report = null } = {}) {
  if (!isObject(input)) throw new MigrationError('Enveloppe de sauvegarde invalide', { reason: 'objet-attendu' });
  const from = readSchemaVersion(input);
  if (from > targetVersion) throw futureSchemaError(from, targetVersion);
  const context = { report: report || { migrated: [], repaired: [], rejected: [], warnings: [] } };
  let data = clone(input);
  let version = from;
  const applied = [];
  while (version < targetVersion) {
    const step = steps.find(candidate => candidate.from === version);
    if (!step || step.to !== version + 1 || typeof step.migrate !== 'function') {
      throw new MigrationError(`Étape de migration manquante : schéma ${version} vers ${version + 1}`, { reason: 'etape-manquante', from: version });
    }
    data = step.migrate(clone(data), context);
    if (!isObject(data)) throw new MigrationError(`Étape de migration ${step.from} vers ${step.to} invalide`, { reason: 'etape-invalide', from: step.from });
    version = step.to;
    applied.push({ from: step.from, to: step.to });
  }
  safeSet(data, 'schemaVersion', targetVersion);
  return { data, from, to: targetVersion, applied };
}

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

const PROFILE_KEYS = [...FICHE_DATA_FIELDS, 'id', 'name', 'kind', 'initiative', 'hp', 'maxHp', 'caracs', 'armor', 'diceLines', 'actions', 'group', 'tags', 'notes', 'favorite', 'tokenImage', 'tokenColor'];
const PARTICIPANT_KEYS = [...FICHE_DATA_FIELDS, 'id', 'profileId', 'persistentCharacterId', 'improvised', 'name', 'kind', 'initiative', 'hp', 'maxHp', 'states', 'zone', 'camp', 'color', 'armor', 'caracs', 'actions', 'tags', 'notes', 'source'];
const DICE_KEYS = ['id', 'participantId', 'type', 'attr', 'base', 'mod', 'note', 'damage', 'damageFormula', 'targetId', 'qualities', 'valuesX', 'capacity'];
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
    if (isObject(item.caracs)) item.caracs = normalizeCaracs(item.caracs);
    Object.assign(item, normalizeFicheFields(item));
    const tokenImage = normalizeTokenImage(item.tokenImage);
    if (tokenImage) item.tokenImage = tokenImage; else delete item.tokenImage;
    const tokenColor = normalizeTokenColor(item.tokenColor);
    if (tokenColor) item.tokenColor = tokenColor; else delete item.tokenColor;
    sanitizeNumericMap(item, 'armor', 'reserve/' + id, report);
    if (Array.isArray(item.actions)) {
      // `diceLines` fait foi, sauf s'il est vide à côté d'actions remplies ;
      // `actions` n'est qu'un ancien alias (import texte, sauvegardes d'avant 3.7.1).
      if (Array.isArray(item.diceLines) && JSON.stringify(profileActionSource(item)) !== JSON.stringify(item.actions)) {
        pushReport(report, 'repaired', 'reserve/' + id + '/actions', { reason: 'actions-divergentes-ignorees' });
      }
      item.diceLines = profileActionSource(item);
      delete item.actions;
    }
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
    if (isObject(item.caracs)) item.caracs = normalizeCaracs(item.caracs);
    Object.assign(item, normalizeFicheFields(item));
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
    // A damage expression (`BF+4`) is a formula, not a broken number.
    if (typeof item.damage === 'string' && !Number.isFinite(Number(item.damage))) {
      const from = item.damage;
      const { damage, damageFormula } = normalizeDamageFields(item);
      item.damage = damage;
      if (damageFormula) item.damageFormula = damageFormula;
      else delete item.damageFormula;
      pushReport(report, 'migrated', 'diceLines/' + id + '/damage', { from, to: damageFormula ? { damage, damageFormula } : damage });
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
    if (!['round', 'currentActorId', 'order', 'participants', 'meta', 'orderMode', 'extensions'].includes(key)) {
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

function optionalRootCollections(raw, profiles, report) {
  const result = {};
  const scenes = value => {
    if (!isObject(value)) return clone(value);
    return { ...clone(value), participants: migrateParticipants(value.participants, profiles, report) };
  };
  for (const key of ['encounters', 'persistentCharacters', 'archives', 'activeScene', 'suspendedScenes', 'reminderChoices', 'appliedResolutionIds']) {
    if (!Object.hasOwn(raw, key)) continue;
    if (key === 'activeScene') safeSet(result, key, raw[key] ? scenes(raw[key]) : null);
    else if (key === 'suspendedScenes') safeSet(result, key, collection(raw[key], key, report).map(({ item }) => scenes(item)));
    else if (key === 'persistentCharacters') safeSet(result, key, collection(raw[key], key, report).filter(({ item }) => isObject(item)).map(({ item }) => {
      const next = { ...clone(item), ...normalizeFicheFields(item) };
      if (!Object.hasOwn(item, 'armor') && !Object.hasOwn(item, 'armorLocations')) delete next.armorLocations;
      return next;
    }));
    else safeSet(result, key, clone(raw[key]));
  }
  return result;
}

export function migrateSnapshot(input, options = {}) {
  if (!isObject(input)) throw new MigrationError('Enveloppe de sauvegarde invalide', { reason: 'objet-attendu' });
  // Point de lecture unique : la version est lue (absente = 0), une version
  // future est refusée, puis les étapes de migration s'appliquent dans l'ordre.
  const report = { migrated: [], repaired: [], rejected: [], warnings: [] };
  const chain = applySchemaMigrations(input, { report });
  if (chain.from < CURRENT_SCHEMA_VERSION) {
    pushReport(report, 'migrated', 'schemaVersion', {
      from: input.schemaVersion === undefined || input.schemaVersion === null ? 'absent' : chain.from,
      to: CURRENT_SCHEMA_VERSION,
      steps: chain.applied
    });
  }
  const raw = chain.data;
  const prayerCapExists=rows=>(Array.isArray(rows)?rows:[]).some(row=>(row?.extensions?.v5?.divineEffects||[]).some(effect=>effect?.type==='prayer-sl-cap'));
  const hasPrayerCalendarCap=prayerCapExists(raw.combat?.participants)||prayerCapExists(raw.reserve)||prayerCapExists(raw.persistentCharacters)
    ||prayerCapExists(raw.activeScene?.participants)||(raw.suspendedScenes||[]).some(scene=>prayerCapExists(scene?.participants));
  if(hasPrayerCalendarCap&&!raw.extensions?.v5?.gameClock)throw new MigrationError('Sanction calendaire de Prière sans horloge d’origine : migration refusée.',{reason:'prayer-cap-clock-anchor-missing'});
  const hasReserve = Object.prototype.hasOwnProperty.call(raw, 'reserve');
  const hasCombat = Object.prototype.hasOwnProperty.call(raw, 'combat');
  if (!hasReserve || !hasCombat || !isObject(raw.combat)
      || (!Array.isArray(raw.reserve) && !isObject(raw.reserve))) {
    throw new MigrationError('Enveloppe de sauvegarde incomplète', {
      reason: 'reserve-et-combat-requis'
    });
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
    ...optionalRootCollections(raw, reserve, report)
  };
  const extensions = rootExtensions(raw);
  const extensionsV5 = isObject(extensions.v5) ? { ...extensions.v5 } : {};
  if (!Object.prototype.hasOwnProperty.call(extensionsV5, 'divineAccess')) {
    extensionsV5.divineAccess = emptyDivineAccess();
  }
  extensions.v5 = extensionsV5;
  result.extensions = extensions;
  if (!Object.prototype.hasOwnProperty.call(extensionsV5, 'gameClock')) {
    extensionsV5.gameClock = createGameClock(result);
    pushReport(report, 'migrated', 'extensions.v5.gameClock', { from: 'absent', to: 'initiale-sans-temps-écoulé' });
  } else {
    const reconciled = reconcileGameClockPosition(extensionsV5.gameClock, readCombatPosition(result));
    if (reconciled.changed) {
      extensionsV5.gameClock = reconciled.clock;
      pushReport(report, 'repaired', 'extensions.v5.gameClock.combat', { from: 'projection-décalée', to: 'position-canonique-combat', elapsedSeconds: 0, phases: [] });
    }
  }
  extensions.v5 = extensionsV5;
  if (Object.keys(extensions).length) result.extensions = extensions;
  return { data: sanitizeMagicEnvelope(result), report };
}

/** Clé du mode de repli localStorage qui porte le numéro de schéma (absente avant ARCH-10). */
export const LEGACY_SCHEMA_KEY = 'wfrp.schema.v1';

/** `{ schemaVersion }` lu dans le stockage de repli, ou `{}` si la clé est absente. */
export function legacySchemaVersion(storage) {
  const stored = storage.getItem(LEGACY_SCHEMA_KEY);
  if (stored == null || stored === '') return {};
  const version = /^\d+$/.test(String(stored)) ? Number(stored) : stored;
  readSchemaVersion({ schemaVersion: version });
  return { schemaVersion: version };
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
    ...legacySchemaVersion(storage),
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
