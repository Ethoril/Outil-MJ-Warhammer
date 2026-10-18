import { normalizeEffects, normalizeState, resolveEffectCapability } from './effects.js';
import { cloneValue, normalizeAction, normalizeCaracs, normalizeTags, profileActionSource, normalizeFicheFields } from './models.js';
import { validateDivineAccessRegistry } from './v5-divine-access.js';
import { validateGameClock } from './v5-game-time.js';

export function normalizeSearchText(value) {
  return String(value ?? '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
export function sanitizeArray(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return Object.values(val);
  return [];
}

const magicRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const magicNumber = (value, min, max, integer = false) => {
  if (!['number', 'string'].includes(typeof value) || value === '' || !Number.isFinite(Number(value))) return undefined;
  const number = Math.max(min, Math.min(max, Number(value)));
  return integer ? Math.trunc(number) : number;
};
// 100 reçus couvrent deux fenêtres d'Undo (50 commandes). Les anciens aperçus sont aussi refusés par leur révision.
export const MAGIC_EXECUTION_LIMIT = 100;
export const HIGH_MAGIC_EXECUTION_LIMIT = 50;

function magicNumericMap(value, min, max, absent = false) {
  if (!magicRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, raw]) => {
    // Caractéristique absente : « – » ou null (Dex d'un animal) survivent telles quelles.
    const number = absent && (raw === '–' || raw === null) ? raw : magicNumber(raw, min, max);
    return number === undefined ? [] : [[key, number]];
  }));
}

// Les anciennes formes sans métadonnées récentes restent jouables si leur retour est exploitable.
function validBeastForm(value) {
  if (!magicRecord(value) || !magicRecord(value.originalParticipant) || !magicRecord(value.originalParticipant.caracs)) return false;
  const finite = number => ['number', 'string'].includes(typeof number) && number !== '' && Number.isFinite(Number(number));
  const original = value.originalParticipant;
  if (![original.hp, original.maxHp].every(number => finite(number) && Number(number) >= 0)) return false;
  if (['durationMinutes', 'remainingMinutes', 'expiresAtRound'].some(key => value[key] != null && (!finite(value[key]) || Number(value[key]) < 0))) return false;
  if (value.beastProfile != null && !magicRecord(value.beastProfile)) return false;
  const maps = [value.beastProfile?.caracs, original.caracs, original.baseCaracs, value.originalBaseCaracs].filter(map => map != null);
  return maps.every(map => magicRecord(map) && Object.values(map).every(number => number === null || number === '–' || finite(number)));
}

function sanitizeMagicFields(value) {
  if (!magicRecord(value)) return {};
  const out = cloneValue(value);
  const numeric = (keys, min, max, integer = false) => {
    for (const key of keys) {
      if (!Object.hasOwn(out, key) || out[key] == null) continue;
      const number = magicNumber(out[key], min, max, integer);
      if (number === undefined) delete out[key]; else out[key] = number;
    }
  };
  numeric(['sin'], 0, Number.MAX_SAFE_INTEGER, true);
  numeric(['ward', 'threshold', 'rangedOpponentPenaltySl'], -1000, 1000);
  numeric(['fortune', 'fate', 'temporaryFortune', 'temporaryFate', 'remainingTempFortune', 'remainingTempFate', 'tempFortunePoints', 'tempFatePoints', 'magicTalentRank', 'casterLileathRank'], 0, 1000, true);
  numeric(['damageReduction', 'magicShieldBonusSl', 'bonusActions'], 0, 1000);
  // Leçons divines porte un modificateur de SL négatif source-validé. Les
  // sanctions de dégâts et les anciens effets gardent leur normalisation usuelle.
  if (out.type !== 'prayer-sl-modifier') numeric(['amount'], 0, 1000);
  numeric(['damage', 'damageBonus', 'value'], -1000, 1000);
  numeric(['ap', 'count'], 0, 1000);
  numeric(['hp', 'maxHp', 'originalMaxHp', 'initialBeastHp'], 0, 1000000);
  numeric(['M', 'movement'], 0, 1000);
  numeric(['durationMinutes', 'remainingMinutes', 'durationRounds', 'durationDays', 'days', 'remainingDays'], 0, 1000000);
  numeric(['expiresAtRound', 'appliedAtRound'], -1000000, 1000000);
  for (const key of ['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc']) if (out[key] !== '–') numeric([key], 0, 1000);
  for (const key of ['active', 'permanent', 'ignoreCriticalPenalties', 'equipmentDropped', 'isJade', 'damageCapToSlOnly', 'banished', 'dead', 'needsCorruptionTest']) if (Object.hasOwn(out, key) && typeof out[key] !== 'boolean') delete out[key];
  for (const key of ['baseCaracs', 'originalBaseCaracs', 'caracs']) if (Object.hasOwn(out, key)) out[key] = magicNumericMap(out[key], 0, 1000, true);
  for (const key of ['statModifiers', 'testModifiers', 'apModifiers']) if (Object.hasOwn(out, key)) out[key] = magicNumericMap(out[key], -1000, 1000);
  for (const key of ['magicAp', 'magicApFloor', 'armor', 'armorLocations']) if (Object.hasOwn(out, key)) {
    // Armure naturelle d'une forme (Peau, +1 PA) : le nom est du texte, conservé avec les PA.
    const name = key === 'armor' && magicRecord(out[key]) && typeof out[key].name === 'string' ? { name: out[key].name } : {};
    out[key] = { ...magicNumericMap(out[key], 0, 1000), ...name };
  }
  if (Object.hasOwn(out, 'baseArmor')) out.baseArmor = magicRecord(out.baseArmor) && ('flat' in out.baseArmor || 'extension' in out.baseArmor)
    ? { ...out.baseArmor, flat: out.baseArmor.flat == null ? out.baseArmor.flat : magicNumericMap(out.baseArmor.flat, 0, 1000), extension: out.baseArmor.extension == null ? out.baseArmor.extension : magicNumericMap(out.baseArmor.extension, 0, 1000) }
    : magicNumericMap(out.baseArmor, 0, 1000);
  for (const key of ['channelling', 'channellingReserve', 'reserve']) if (Object.hasOwn(out, key)) {
    if (!magicRecord(out[key])) { delete out[key]; continue; }
    out[key] = { ...out[key], sl: magicNumber(out[key].sl, 0, 10000, true) ?? 0 };
    if (!['winds', 'high'].includes(out[key].type)) out[key]={type:null,sl:0};
  }
  if (Object.hasOwn(out, 'cadaiRunes')) {
    if (!magicRecord(out.cadaiRunes)) delete out.cadaiRunes;
    else {
      const max = magicNumber(out.cadaiRunes.max, 0, 1000, true);
      out.cadaiRunes = { ...out.cadaiRunes, ...(max === undefined ? {} : { max }), deployed: magicNumber(out.cadaiRunes.deployed, 0, max ?? 1000, true) ?? 0 };
      if (max === undefined) delete out.cadaiRunes.max;
    }
  }
  for (const key of ['beastForm', 'beastProfile', 'originalParticipant', 'fields', 'daemonbaneMaxHp', 'resources', 'defense', 'burnout', 'magic', 'weaponBonus', 'divine']) if (Object.hasOwn(out, key) && out[key] != null) {
    if (key === 'beastForm' && !validBeastForm(out[key])) { delete out[key]; continue; }
    if (!magicRecord(out[key])) delete out[key]; else out[key] = sanitizeMagicFields(out[key]);
  }
  for (const key of ['divineEffects', 'spellEffects', 'miscastEffects', 'wards', 'damageReductions', 'weaponBonuses', 'attacks', 'characterResources', 'conditionalAp']) if (Object.hasOwn(out, key)) {
    out[key] = sanitizeArray(out[key]).filter(magicRecord).map(sanitizeMagicFields);
    if (key === 'wards') out[key] = out[key].filter(row => Number.isFinite(row.threshold));
  }
  if (Object.hasOwn(out, 'divineExecutions')) out.divineExecutions = sanitizeArray(out.divineExecutions).filter(row=>magicRecord(row)&&typeof row.executionId==='string'&&typeof row.actorId==='string'&&typeof row.contractId==='string').slice(-100);
  if (Object.hasOwn(out, 'appliedSpellExecutions')) out.appliedSpellExecutions = [...new Set(sanitizeArray(out.appliedSpellExecutions).filter(id => typeof id === 'string' && id))].slice(-MAGIC_EXECUTION_LIMIT);
  if (Object.hasOwn(out, 'highMagicExecutions')) out.highMagicExecutions = sanitizeArray(out.highMagicExecutions)
    .filter(row => magicRecord(row) && typeof row.id === 'string' && typeof row.actorId === 'string' && typeof row.spellId === 'string')
    .slice(-HIGH_MAGIC_EXECUTION_LIMIT).map(row => ({ ...row, rerolledCorruption: sanitizeArray(row.rerolledCorruption).filter(id => typeof id === 'string') }));
  return out;
}

function migrateSpellNames(value,inSpells=false){
  if(Array.isArray(value))return value.map(row=>migrateSpellNames(row,inSpells));
  if(!magicRecord(value))return inSpells && value==='empête'?'Tempête':value;
  const result={};for(const [key,v] of Object.entries(value)){const spellField=['spellName','canonicalName'].includes(key) || ['nom','name'].includes(key) && (inSpells || value.spellId==='spell-audit-1e7a5eaec18c122bde64' || value.id==='spell-audit-1e7a5eaec18c122bde64');Object.defineProperty(result,key,{value:spellField && v==='empête'?'Tempête':migrateSpellNames(v,key==='spells'),enumerable:true,writable:true,configurable:true});}return result;
}
export function sanitizeMagicSubject(subject,{synchronizeAliases=true}={}) {
  subject=migrateSpellNames(subject);
  if (!magicRecord(subject)) return subject;
  // Les champs de fiche ordinaires restent ceux de leur normaliseur ; seuls leurs alias magiques sont traités ici.
  const aliasKeys = ['channelling', 'channellingReserve', 'spellEffects', 'baseCaracs', 'baseArmor', 'testModifiers', 'fortune', 'temporaryFortune', 'fate', 'temporaryFate'];
  const aliases = Object.fromEntries(aliasKeys.filter(key => Object.hasOwn(subject, key)).map(key => [key, subject[key]]));
  const clean = sanitizeMagicFields(aliases), out = { ...subject, ...clean };
  for (const key of Object.keys(aliases)) if (!Object.hasOwn(clean, key)) delete out[key];
  if (magicRecord(subject.extensions)) {
    const extAliases = Object.fromEntries(aliasKeys.filter(key => Object.hasOwn(subject.extensions, key)).map(key => [key, subject.extensions[key]]));
    const cleanExt = sanitizeMagicFields(extAliases);
    out.extensions = { ...subject.extensions, ...cleanExt };
    for (const key of Object.keys(extAliases)) if (!Object.hasOwn(cleanExt, key)) delete out.extensions[key];
    if (Object.hasOwn(subject.extensions, 'v5')) out.extensions.v5 = sanitizeMagicFields(subject.extensions.v5);
    const canonical=out.extensions.v5;
    if(synchronizeAliases && Array.isArray(canonical?.spellEffects)){out.spellEffects=cloneValue(canonical.spellEffects);out.extensions.spellEffects=cloneValue(canonical.spellEffects);}
    if(synchronizeAliases && magicRecord(canonical?.channelling)){out.channelling=cloneValue(canonical.channelling);out.channellingReserve=cloneValue(canonical.channelling);out.extensions.channelling=cloneValue(canonical.channelling);out.extensions.channellingReserve=cloneValue(canonical.channelling);}
  }
  return out;
}

export function sanitizeMagicEnvelope(envelope,options={}) {
  envelope=migrateSpellNames(envelope);
  const out = { ...envelope }, subjects = value => sanitizeArray(value).map(subject=>sanitizeMagicSubject(subject,options));
  for (const key of ['reserve', 'persistentCharacters']) if (Object.hasOwn(out, key)) out[key] = subjects(out[key]);
  const scene = value => value && { ...value, ...(Object.hasOwn(value, 'participants') ? { participants: subjects(value.participants) } : {}), ...(value.combat ? { combat: { ...value.combat, participants: subjects(value.combat.participants) } } : {}) };
  if (out.combat) out.combat = { ...out.combat, participants: subjects(out.combat.participants), ...(out.combat.extensions ? { extensions: sanitizeMagicFields(out.combat.extensions) } : {}) };
  if (out.activeScene) out.activeScene = scene(out.activeScene);
  if (out.suspendedScenes) out.suspendedScenes = sanitizeArray(out.suspendedScenes).filter(magicRecord).map(scene);
  if (magicRecord(out.extensions)) {
    const rootExtensions={...out.extensions};
    if (magicRecord(rootExtensions.v5)) {
      const rootV5=sanitizeMagicFields(rootExtensions.v5);
      // Preserve absence. A divine-access registry is created only by the
      // explicit access/migration command or restored by the RTDB decoder
      // when that exact registry was present before RTDB removed empty grants.
      if (Object.hasOwn(rootV5, 'divineAccess')) {
        rootV5.divineAccess=validateDivineAccessRegistry(rootV5.divineAccess);
      }
      // A clock is validated only when a real migration/command put it in the
      // envelope. Protocol sanitation must preserve an intentionally empty root.
      if (Object.hasOwn(rootV5, 'gameClock')) rootV5.gameClock=validateGameClock(rootV5.gameClock);
      rootExtensions.v5=rootV5;
    }
    out.extensions=rootExtensions;
  }
  return out;
}

export function sanitizeProfile(o) {
  o = sanitizeMagicSubject(o);
  if (!o || typeof o !== 'object' || !o.id || typeof o.id !== 'string') return null;
  const profile = {
    id: String(o.id),
    name: (typeof o.name === 'string' && o.name.trim()) ? o.name.trim() : 'Sans-nom',
    kind: ['PJ', 'PNJ', 'Créature'].includes(o.kind) ? o.kind : 'Créature',
    initiative: Number(o.initiative) || 0,
    hp: Number(o.hp) || 0,
    maxHp: o.maxHp == null ? Number(o.hp) || 0 : Number(o.maxHp),
    ...normalizeFicheFields(o),
    caracs: normalizeCaracs(o.caracs),
    armor: (o.armor && typeof o.armor === 'object') ? cloneValue(o.armor) : { head: 0, body: 0, arms: 0, legs: 0 },
    diceLines: sanitizeArray(profileActionSource(o)).map(normalizeAction),
    group: typeof o.group === 'string' ? o.group.trim() : '',
    tags: normalizeTags(o.tags),
    notes: typeof o.notes === 'string' ? o.notes : '',
    favorite: Boolean(o.favorite),
    extensions: (o.extensions && typeof o.extensions === 'object' && !Array.isArray(o.extensions)) ? o.extensions : {}
  };
  // `actions` reste lisible mais n'est jamais une seconde copie énumérable.
  Object.defineProperty(profile, 'actions', { enumerable: false, configurable: true, get: () => profile.diceLines });
  return profile;
}

export function sanitizeParticipant(o) {
  o = sanitizeMagicSubject(o);
  const base = sanitizeProfile(o);
  if (!base) return null;
  return {
    ...base,
    actions: Array.isArray(o.actions) ? o.actions.map(normalizeAction) : [],
    profileId: o.profileId || null,
    persistentCharacterId: o.persistentCharacterId || null,
    improvised: Boolean(o.improvised),
    maxHp: o.maxHp == null ? o.maxHp : Number(o.maxHp),
    // Les sauvegardes E04 peuvent encore contenir des chaînes ; conserver aussi
    // les objets modernes et leurs extensions lors de la normalisation.
    states: normalizeEffects(o.states),
    zone: ['active', 'bench'].includes(o.zone) ? o.zone : 'bench',
    camp: typeof o.camp === 'string' && o.camp.trim() ? o.camp.trim() : 'neutre',
    color: ['default', 'red', 'green', 'blue', 'purple', 'orange'].includes(o.color) ? o.color : 'default',
    tags: normalizeTags(o.tags),
    notes: typeof o.notes === 'string' ? o.notes : '',
    source: o.source == null ? null : cloneValue(o.source),
    extensions: (o.extensions && typeof o.extensions === 'object' && !Array.isArray(o.extensions)) ? o.extensions : {},
    ...(Array.isArray(o.traits) ? { traits: cloneValue(o.traits) } : {}),
    ...(Array.isArray(o.spellEffects) ? { spellEffects: cloneValue(o.spellEffects) } : {}),
    // null reste null (solde absent) : il ne devient pas 0.
    ...(o.fortune === null ? { fortune: null } : Number.isFinite(Number(o.fortune)) ? { fortune: Number(o.fortune) } : {}),
    ...(o.temporaryFortune === null ? { temporaryFortune: null } : Number.isFinite(Number(o.temporaryFortune)) ? { temporaryFortune: Number(o.temporaryFortune) } : {}),
    ...(o.fate === null ? { fate: null } : Number.isFinite(Number(o.fate)) ? { fate: Number(o.fate) } : {}),
    ...(o.temporaryFate === null ? { temporaryFate: null } : Number.isFinite(Number(o.temporaryFate)) ? { temporaryFate: Number(o.temporaryFate) } : {}),
    ...(o.channelling && typeof o.channelling === 'object' ? { channelling: cloneValue(o.channelling) } : {}),
    ...(o.channellingReserve && typeof o.channellingReserve === 'object' ? { channellingReserve: cloneValue(o.channellingReserve) } : {})
  };
}

export function parseState(s) {
  if (s && typeof s === 'object' && !Array.isArray(s)) {
    const name = typeof s.name === 'string' ? s.name : (typeof s.key === 'string' ? s.key : '');
    const duration = s.duration ?? s.remainingTurns ?? s.turns;
    const turns = duration === null || duration === undefined || duration === '' || !Number.isFinite(Number(duration))
      ? null : (Number(duration) > 0 ? Math.floor(Number(duration)) : null);
    return { name, turns };
  }
  if (typeof s !== 'string') return { name: '', turns: null };
  const idx = s.indexOf('|');
  if (idx === -1) return { name: s, turns: null };
  return { name: s.slice(0, idx), turns: parseInt(s.slice(idx + 1)) || null };
}

const MODE_LABELS = Object.freeze({ automatic: 'Automatique', reminder: 'Rappel', manual: 'Manuel' });

export function makeStateBadge(rawState, index = 0) {
  const state = normalizeState(rawState, index);
  const { name, turns } = parseState(state);
  const level = state.level > 1 ? ` ×${state.level}` : '';
  const duration = turns === null ? '' : ` · ${turns} tour${turns > 1 ? 's' : ''}`;
  const capability = resolveEffectCapability(state);
  const el = document.createElement('span');
  el.className = 'badge warn state-badge';
  el.title = 'Cliquer pour retirer';
  el.dataset.stateId = state.id;
  el.dataset.mode = capability.mode;
  el.title = `Cliquer pour retirer · ${MODE_LABELS[capability.mode] || 'Manuel'}`;
  el.textContent = `${name}${level}${duration} · ${MODE_LABELS[capability.mode] || 'Manuel'}`;
  return el;
}
