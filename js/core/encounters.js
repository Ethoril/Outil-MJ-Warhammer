/** Pure E11 encounter and scene lifecycle operations. */
import { cloneValue, normalizeAction, normalizeTags, uid } from './models.js';
import { normalizeEffects } from './effects.js';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const statuses = new Set(['prepared', 'active', 'suspended', 'closed']);

function requiredText(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function cloneParticipant(profile, options, idFactory) {
  const persistent = options.persistentCharacter || null;
  const baseHp = persistent ? Number(persistent.hp) || 0 : Number(profile.hp) || 0;
  const states = persistent ? normalizeEffects(persistent.states) : [];
  return {
    id: idFactory(),
    profileId: profile.id || null,
    persistentCharacterId: persistent?.id || options.persistentCharacterId || null,
    improvised: false,
    name: requiredText(options.name, profile.name || 'Sans-nom'),
    kind: profile.kind || 'Créature',
    initiative: Number(options.initiative ?? profile.initiative) || 0,
    hp: baseHp,
    maxHp: Number(profile.maxHp ?? profile.hp) || 0,
    states,
    zone: options.zone === 'active' ? 'active' : 'bench',
    camp: requiredText(options.camp, 'neutre'),
    color: options.color || 'default',
    armor: cloneValue(profile.armor || {}),
    caracs: cloneValue(profile.caracs || {}),
    tags: normalizeTags(profile.tags),
    notes: typeof profile.notes === 'string' ? profile.notes : '',
    actions: (profile.actions || profile.diceLines || []).map(normalizeAction),
    source: { profileId: profile.id || null, encounterEntryId: options.entryId || null }
  };
}

export function normalizeEncounter(input = {}, idFactory = uid) {
  if (!isRecord(input)) throw new TypeError('Rencontre invalide');
  const status = statuses.has(input.status) ? input.status : 'prepared';
  const entries = Array.isArray(input.entries) ? input.entries : (Array.isArray(input.composition) ? input.composition : []);
  return {
    id: requiredText(input.id, idFactory()),
    title: requiredText(input.title || input.name, 'Rencontre sans titre'),
    notes: typeof input.notes === 'string' ? input.notes : '',
    status,
    entries: entries.map(entry => ({
      id: requiredText(entry?.id, idFactory()),
      profileId: requiredText(entry?.profileId, ''),
      quantity: Math.max(1, Math.floor(Number(entry?.quantity) || 1)),
      camp: requiredText(entry?.camp, 'neutre'),
      zone: entry?.zone === 'active' ? 'active' : 'bench',
      persistentCharacterId: entry?.persistentCharacterId || null,
      namePrefix: typeof entry?.namePrefix === 'string' ? entry.namePrefix : '',
      notes: typeof entry?.notes === 'string' ? entry.notes : ''
    })),
    reinforcements: Array.isArray(input.reinforcements) ? cloneValue(input.reinforcements) : [],
    tags: normalizeTags(input.tags),
    extensions: isRecord(input.extensions) ? cloneValue(input.extensions) : {}
  };
}

export function createEncounter(input = {}, idFactory = uid) {
  return normalizeEncounter({ ...input, status: 'prepared' }, idFactory);
}

export function setEncounterEntry(encounter, profileId, options = {}, idFactory = uid) {
  const next = normalizeEncounter(encounter, idFactory);
  if (!profileId) throw new TypeError('profileId requis');
  const entry = {
    id: options.id || idFactory(), profileId,
    quantity: Math.max(1, Math.floor(Number(options.quantity) || 1)),
    camp: requiredText(options.camp, 'neutre'), zone: options.zone === 'active' ? 'active' : 'bench',
    persistentCharacterId: options.persistentCharacterId || null,
    namePrefix: typeof options.namePrefix === 'string' ? options.namePrefix : '',
    notes: typeof options.notes === 'string' ? options.notes : ''
  };
  const index = next.entries.findIndex(item => item.id === entry.id);
  if (index < 0) next.entries.push(entry); else next.entries[index] = entry;
  return next;
}

export function removeEncounterEntry(encounter, entryId, idFactory = uid) {
  const next = normalizeEncounter(encounter, idFactory);
  next.entries = next.entries.filter(entry => entry.id !== entryId);
  return next;
}

export function duplicateEncounter(encounter, idFactory = uid) {
  const source = normalizeEncounter(encounter, idFactory);
  return normalizeEncounter({ ...source, id: idFactory(), title: `${source.title} (copie)`, status: 'prepared', entries: source.entries.map(entry => ({ ...entry, id: idFactory() })) }, idFactory);
}

export function launchEncounter(encounter, { profiles = [], persistentCharacters = [], activeScene = null, now = null, idFactory = uid } = {}) {
  const model = normalizeEncounter(encounter, idFactory);
  if (activeScene && ['active', 'suspended'].includes(activeScene.status)) {
    throw new Error('Une autre scène est déjà active ou suspendue');
  }
  const profileMap = new Map((Array.isArray(profiles) ? profiles : []).filter(profile => profile?.id).map(profile => [profile.id, profile]));
  const persistentMap = new Map((Array.isArray(persistentCharacters) ? persistentCharacters : []).filter(character => character?.id).map(character => [character.id, character]));
  const participants = [];
  for (const entry of model.entries) {
    const profile = profileMap.get(entry.profileId);
    if (!profile) throw new Error(`Profil introuvable pour l’entrée ${entry.id}`);
    for (let index = 0; index < entry.quantity; index++) {
      const persistent = index === 0 && entry.persistentCharacterId ? persistentMap.get(entry.persistentCharacterId) : null;
      const name = entry.namePrefix ? `${entry.namePrefix} ${index + 1}` : (entry.quantity > 1 ? `${profile.name} ${index + 1}` : profile.name);
      participants.push(cloneParticipant(profile, { ...entry, name, persistentCharacter: persistent, entryId: entry.id }, idFactory));
    }
  }
  const scene = {
    id: idFactory(), encounterId: model.id, title: model.title, notes: model.notes,
    status: 'active', round: 0, currentActorId: null, order: [], participants,
    reinforcements: cloneValue(model.reinforcements), events: [], startedAt: now || null,
    extensions: cloneValue(model.extensions)
  };
  // The scene and combat projections share one visible track from the moment
  // the encounter is launched. Bench participants stay out of the order.
  scene.order = participants.filter(item => item.zone === 'active')
    .sort((a, b) => Number(b.initiative) - Number(a.initiative) || String(a.name).localeCompare(String(b.name)) || a.id.localeCompare(b.id))
    .map(item => item.id);
  return scene;
}

export function addImprovisedParticipant(scene, participant = {}, idFactory = uid) {
  if (!isRecord(scene) || scene.status !== 'active') throw new Error('Scène active requise');
  const next = cloneValue(scene);
  const hp = Number(participant.hp) || 0;
  next.participants = Array.isArray(next.participants) ? next.participants : [];
  next.participants.push({
    id: participant.id || idFactory(), profileId: null, persistentCharacterId: null, improvised: true,
    name: requiredText(participant.name, 'Profil improvisé'), kind: requiredText(participant.kind, 'PNJ'),
    initiative: Number(participant.initiative) || 0, hp, maxHp: Number(participant.maxHp ?? hp) || 0,
    states: normalizeEffects(participant.states), zone: participant.zone === 'active' ? 'active' : 'bench',
    camp: requiredText(participant.camp, 'neutre'), armor: cloneValue(participant.armor || {}), caracs: cloneValue(participant.caracs || {}),
    tags: normalizeTags(participant.tags), notes: typeof participant.notes === 'string' ? participant.notes : '', actions: [], source: { improvised: true }
  });
  return next;
}

export function suspendScene(scene) {
  if (!isRecord(scene) || scene.status !== 'active') throw new Error('Seule une scène active peut être suspendue');
  return { ...cloneValue(scene), status: 'suspended', suspendedAt: new Date().toISOString() };
}

export function resumeScene(scene, { activeScene = null } = {}) {
  if (!isRecord(scene) || scene.status !== 'suspended') throw new Error('Scène suspendue requise');
  if (activeScene && activeScene.id !== scene.id && ['active', 'suspended'].includes(activeScene.status)) throw new Error('Une autre scène est déjà active ou suspendue');
  return { ...cloneValue(scene), status: 'active' };
}

export function closeScene(scene) {
  if (!isRecord(scene) || !['active', 'suspended'].includes(scene.status)) throw new Error('Scène active ou suspendue requise');
  return { ...cloneValue(scene), status: 'closed', closedAt: new Date().toISOString() };
}
