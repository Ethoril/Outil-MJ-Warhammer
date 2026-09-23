/** Pure E13 closing, selective persistence and local archive helpers. */
import { cloneValue } from './models.js';
import { normalizeEffects } from './effects.js';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
export const DEFAULT_ARCHIVE_LIMIT = 50;

function participantList(scene) {
  return Array.isArray(scene?.participants) ? scene.participants : [];
}

function persistentStates(states) {
  return normalizeEffects(states).filter(state => state.duration === null);
}

function stateFingerprint(states) {
  return JSON.stringify(normalizeEffects(states));
}

export function previewClosure(scene, { persistentCharacters = [], selections = {}, authorities = {}, includeStates = true } = {}) {
  if (!isRecord(scene) || !['active', 'suspended'].includes(scene.status)) throw new Error('Scène active ou suspendue requise');
  const characters = new Map((Array.isArray(persistentCharacters) ? persistentCharacters : []).filter(item => item?.id).map(item => [item.id, item]));
  const reports = [];
  const conflicts = [];
  const assignments = new Map();
  const selectedCharacter = participant => hasOwn(selections, participant.id)
    ? (selections[participant.id] || null)
    : (participant.persistentCharacterId || null);
  for (const participant of participantList(scene)) {
    const characterId = selectedCharacter(participant);
    if (!characterId) continue;
    if (!assignments.has(characterId)) assignments.set(characterId, []);
    assignments.get(characterId).push(participant);
  }
  const usedCharacters = new Map();
  const sourceParticipants = {};
  for (const participant of participantList(scene)) {
    const characterId = selectedCharacter(participant);
    if (!characterId) continue;
    const character = characters.get(characterId);
    if (!character) {
      conflicts.push({ participantId: participant.id, reason: 'personnage-persistant-introuvable', characterId });
      continue;
    }
    const assigned = assignments.get(characterId) || [];
    const authority = authorities?.[characterId] || null;
    if (assigned.length > 1 && authority !== participant.id) {
      if (!authority || !assigned.some(item => item.id === authority)) {
        if (!usedCharacters.has(characterId)) {
          conflicts.push({
            participantId: participant.id, participantIds: assigned.map(item => item.id), characterId,
            reason: 'personnage-persistant-associe-plusieurs-fois', authorityParticipantId: authority,
            requiresAuthority: true
          });
          usedCharacters.set(characterId, participant.id);
        }
      }
      continue;
    }
    if (usedCharacters.has(characterId)) continue;
    usedCharacters.set(characterId, participant.id);
    sourceParticipants[participant.id] = {
      participantId: participant.id,
      hp: Number(participant.hp) || 0,
      states: normalizeEffects(participant.states)
    };
    reports.push({
      participantId: participant.id, characterId, name: participant.name, characterName: character.name || participant.name,
      hpBefore: Number(character.hp) || 0, hpAfter: Number(participant.hp) || 0,
      statesBefore: persistentStates(character.states), statesAfter: includeStates ? persistentStates(participant.states) : persistentStates(character.states),
      selected: true
    });
  }
  return {
    sceneId: scene.id, sceneRevision: scene.revision ?? null, reports, conflicts,
    sourceParticipants, ready: conflicts.length === 0, generatedAt: new Date().toISOString()
  };
}

export function applyClosure(scene, preview, { persistentCharacters = [], selectedParticipantIds = null, archiveId = null, now = null } = {}) {
  if (!isRecord(scene) || !isRecord(preview) || preview.sceneId !== scene.id) throw new Error('Aperçu de clôture invalide');
  if (hasOwn(preview, 'sceneRevision') && (scene.revision ?? null) !== preview.sceneRevision) {
    return { status: 'stale', requiresPreview: true, scene: cloneValue(scene), reason: 'revision-scene-modifiee' };
  }
  for (const [participantId, source] of Object.entries(preview.sourceParticipants || {})) {
    const participant = participantList(scene).find(item => item.id === participantId);
    if (!participant || (Number(participant.hp) || 0) !== source.hp || stateFingerprint(participant.states) !== stateFingerprint(source.states)) {
      return { status: 'stale', requiresPreview: true, scene: cloneValue(scene), reason: 'participant-modifie' };
    }
  }
  if (preview.conflicts?.length) return { status: 'conflict', conflicts: cloneValue(preview.conflicts), scene: cloneValue(scene) };
  const selected = selectedParticipantIds ? new Set(selectedParticipantIds) : null;
  const characters = new Map((Array.isArray(persistentCharacters) ? persistentCharacters : []).filter(item => item?.id).map(item => [item.id, cloneValue(item)]));
  const updates = [];
  for (const report of preview.reports || []) {
    if (selected && !selected.has(report.participantId)) continue;
    const character = characters.get(report.characterId);
    if (!character) return { status: 'conflict', conflicts: [{ ...report, reason: 'personnage-persistant-introuvable' }], scene: cloneValue(scene) };
    character.hp = report.hpAfter;
    character.states = normalizeEffects(report.statesAfter);
    updates.push(character);
  }
  const closedScene = { ...cloneValue(scene), status: 'closed', closedAt: now || new Date().toISOString() };
  const appliedPreview = { ...preview, reports: preview.reports?.filter(report => !selected || selected.has(report.participantId)) || [] };
  const archive = createArchive(closedScene, appliedPreview, { id: archiveId || `archive-${scene.id}`, createdAt: now || new Date().toISOString() });
  return { status: 'applied', scene: closedScene, characterUpdates: updates, archive };
}

export function createArchive(scene, preview, { id = `archive-${scene?.id || 'scene'}`, createdAt = null } = {}) {
  return {
    id, sceneId: scene?.id || null, encounterId: scene?.encounterId || null, title: scene?.title || 'Séance',
    createdAt: createdAt || new Date().toISOString(), reports: cloneValue(preview?.reports || []), conflicts: cloneValue(preview?.conflicts || []),
    events: cloneValue(scene?.events || []), round: Number(scene?.round) || 0
  };
}

export function retainArchives(archives = [], limit = DEFAULT_ARCHIVE_LIMIT) {
  const bounded = Number(limit);
  if (!Number.isInteger(bounded) || bounded < 0) throw new RangeError('La rétention doit être un entier positif ou nul');
  if (bounded === 0) return [];
  return (Array.isArray(archives) ? archives : []).map(cloneValue).slice(-bounded);
}

export function exportArchive(archive, format = 'json') {
  const copy = cloneValue(archive);
  if (format === 'json') return JSON.stringify(copy, null, 2);
  if (format !== 'markdown') throw new TypeError('Format d’archive invalide');
  const lines = [`# ${copy.title || 'Séance'}`, '', `- Date : ${copy.createdAt || 'inconnue'}`, `- Round : ${copy.round ?? 0}`, ''];
  if (!copy.reports?.length) lines.push('Aucun personnage persistant reporté.');
  for (const report of copy.reports || []) lines.push(`- **${report.characterName || report.name}** : PV ${report.hpBefore} → ${report.hpAfter}${report.statesAfter?.length ? ` ; états : ${report.statesAfter.map(state => state.name || state.key || state).join(', ')}` : ''}`);
  if (copy.conflicts?.length) lines.push('', '## Ambiguïtés', ...copy.conflicts.map(conflict => `- ${conflict.reason || 'Conflit'} (${conflict.participantId || 'participant'})`));
  return lines.join('\n');
}
