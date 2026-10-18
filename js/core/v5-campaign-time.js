import { currentMagicRound, endBeastForm } from './v5-magic-effects.js';
import { advanceMagicConsequences } from './v5-magic-time.js';
import { expireSpellEffects } from './v5-magic-effects.js';

const clone = value => structuredClone(value);
const needs = (path, message, code = 'unresolved-campaign-duration') => ({ path, code, message });

function hasAttestedRoundTransition(clock, fromRound, toRound) {
  if (!clock || !Number.isSafeInteger(fromRound) || !Number.isSafeInteger(toRound) || toRound !== fromRound + 1) return false;
  const receipt = clock.lastEvent;
  if (receipt?.kind !== 'combat-transition' || typeof receipt.payloadFingerprint !== 'string') return false;
  try {
    const event = JSON.parse(receipt.payloadFingerprint);
    const from = event.from, to = event.to, current = clock.combat;
    return event.kind === 'combat-transition' && event.id === receipt.id
      && event.baseRevision === receipt.baseRevision && from?.round === fromRound && to?.round === toRound
      && current?.round === toRound && current?.sceneId === to?.sceneId
      && current?.turnIndex === to?.turnIndex && current?.currentActorId === to?.currentActorId;
  } catch { return false; }
}

function hasTrustedRoundProgress(effect, referenceRound, clock) {
  if (!Number.isSafeInteger(referenceRound)) return true;
  const previousRound = Number.isSafeInteger(effect.campaignReferenceRound)
    ? effect.campaignReferenceRound : effect.appliedAtRound;
  if (!Number.isSafeInteger(previousRound)) return referenceRound === 1;
  if (previousRound > referenceRound) return false;
  if (referenceRound === previousRound) return true;
  return hasAttestedRoundTransition(clock, previousRound, referenceRound);
}

function inspectParticipant(participant, path, referenceRound, clock, needsInput) {
  const v5 = participant?.extensions?.v5 || {};
  for (const [index, effect] of (Array.isArray(v5.spellEffects) ? v5.spellEffects : []).entries()) {
    const calendar = Number.isFinite(effect?.durationMinutes) || Number.isFinite(effect?.remainingMinutes)
      || ['minutes', 'hours', 'days', 'weeks'].includes(effect?.durationType);
    if (!calendar) continue;
    if (Number.isFinite(effect.remainingMinutes)) {
      if (effect.remainingMinutes < 0) needsInput.push(needs(`${path}.extensions.v5.spellEffects[${index}].remainingMinutes`, 'Temps restant négatif.'));
    } else if (Number.isFinite(effect.expiresAtRound) && Number.isFinite(effect.appliedAtRound) && Number.isSafeInteger(referenceRound)) {
      // Le processeur magique existant sait avancer cette ancre selon D-11.
    } else {
      needsInput.push(needs(`${path}.extensions.v5.spellEffects[${index}]`, 'Durée calendaire sans temps restant ni ancre exploitable.'));
    }
  }
  for (const [index, effect] of (Array.isArray(v5.miscastEffects) ? v5.miscastEffects : []).entries()) {
    if (effect.remainingMinutes !== undefined && !Number.isFinite(effect.remainingMinutes)) {
      needsInput.push(needs(`${path}.extensions.v5.miscastEffects[${index}].remainingMinutes`, 'Temps restant d’incident invalide.'));
    }
    if (Number.isFinite(effect.expiresAtRound) && !Number.isFinite(effect.remainingMinutes)
      && !Number.isSafeInteger(effect.appliedAtRound)) {
      needsInput.push(needs(`${path}.extensions.v5.miscastEffects[${index}]`, 'Échéance d’incident en Rounds sans durée calendaire exploitable.'));
    }
    if ((Number.isFinite(effect.expiresAtRound) || Number.isFinite(effect.remainingMinutes))
      && referenceRound > 1 && !Number.isSafeInteger(effect.appliedAtRound)) {
      needsInput.push(needs(`${path}.extensions.v5.miscastEffects[${index}].appliedAtRound`, 'Round de pose absent : impossible de réconcilier l’échéance d’incident après les Tours déjà joués.'));
    } else if (Number.isSafeInteger(effect.appliedAtRound) && effect.appliedAtRound < referenceRound
      && !Number.isFinite(effect.expiresAtRound)) {
      needsInput.push(needs(`${path}.extensions.v5.miscastEffects[${index}].expiresAtRound`, 'Échéance d’incident absente après des Tours déjà joués.'));
    }
    if (Number.isSafeInteger(referenceRound) && Number.isSafeInteger(effect.campaignReferenceRound)
      && effect.campaignReferenceRound > referenceRound) {
      needsInput.push(needs(`${path}.extensions.v5.miscastEffects[${index}].campaignReferenceRound`, 'Repère campagne postérieur au Round du sujet.'));
    }
    if ((Number.isFinite(effect.expiresAtRound) || Number.isFinite(effect.remainingMinutes))
      && Number.isSafeInteger(referenceRound) && !hasTrustedRoundProgress(effect, referenceRound, clock)) {
      needsInput.push(needs(`${path}.extensions.v5.miscastEffects[${index}].campaignReferenceRound`, 'Aucune transition de Round attestée ne relie l’ancre de l’incident au Round courant.'));
    }
  }
  for (const [index, effect] of (Array.isArray(v5.divineEffects) ? v5.divineEffects : []).entries()) {
    if (effect?.deadline?.kind === 'campaign-time' && effect?.type !== 'prayer-sl-cap') {
      // Une échéance valide est retirée par expireDivineAtClock ; seule une échéance illisible bloque l'avance.
      if (!(Number.isSafeInteger(effect.deadline.atSeconds) && effect.deadline.atSeconds >= 0))
        needsInput.push(needs(`${path}.extensions.v5.divineEffects[${index}].deadline`, 'Échéance calendaire divine invalide.'));
    }
  }
  for (const [index, state] of (Array.isArray(participant?.states) ? participant.states : []).entries()) {
    if (!['talent-pending', 'talent-active'].includes(state?.kind)) continue;
    if (state.remainingMinutes !== undefined && (!Number.isFinite(state.remainingMinutes) || state.remainingMinutes < 0)) {
      needsInput.push(needs(`${path}.states[${index}].remainingMinutes`, 'Temps restant du talent invalide.'));
    } else if (Number.isFinite(state.remainingMinutes) && referenceRound > 1) {
      needsInput.push(needs(`${path}.states[${index}].v5Timing.acquiredRound`, 'Round de pose du talent absent : sa durée ne peut pas être réconciliée avec les Tours déjà joués.'));
    }
  }
  if (v5.beastForm && !Number.isFinite(v5.beastForm.remainingMinutes)) {
    needsInput.push(needs(`${path}.extensions.v5.beastForm.remainingMinutes`, 'Temps restant de Forme bestiale absent ou invalide.'));
  } else if (v5.beastForm && v5.beastForm.remainingMinutes < 0) {
    needsInput.push(needs(`${path}.extensions.v5.beastForm.remainingMinutes`, 'Temps restant de Forme bestiale négatif.'));
  } else if (v5.beastForm && referenceRound > 1 && !Number.isSafeInteger(v5.beastForm.appliedAtRound)) {
    needsInput.push(needs(`${path}.extensions.v5.beastForm.appliedAtRound`, 'Round de pose de la Forme bestiale absent après des Tours joués; la prochaine échéance ne peut pas être établie sans fabriquer une phase.'));
  }
  if (v5.burnout?.active && !v5.burnout.permanent && !Number.isFinite(v5.burnout.days)) {
    needsInput.push(needs(`${path}.extensions.v5.burnout.days`, 'Durée d’épuisement magique absente ou invalide.'));
  } else if (v5.burnout?.active && !v5.burnout.permanent && v5.burnout.days < 0) {
    needsInput.push(needs(`${path}.extensions.v5.burnout.days`, 'Durée d’épuisement magique négative.'));
  }
}

function temporalProjection(participant) {
  const v5 = participant?.extensions?.v5 || {};
  return {
    spellEffects: v5.spellEffects || [],
    miscastEffects: v5.miscastEffects || [],
    divineEffects: v5.divineEffects || [],
    beastForm: v5.beastForm ?? null,
    burnout: v5.burnout ?? null,
    timedTalentStates: (participant?.states || []).filter(state => ['talent-pending', 'talent-active'].includes(state?.kind))
  };
}

function advanceParticipant(participant, { seconds, referenceRound, clock, path, needsInput }) {
  inspectParticipant(participant, path, referenceRound, clock, needsInput);
  let next = clone(participant);
  const minutes = seconds / 60;
  next.states = (next.states || []).flatMap(state => {
    if (!['talent-pending', 'talent-active'].includes(state?.kind) || !Number.isFinite(state.remainingMinutes)) return [state];
    const left = state.remainingMinutes - minutes;
    return left > 1e-12 ? [{ ...state, remainingMinutes: left }] : [];
  });
  if (next.extensions?.v5?.spellEffects?.length) {
    // The legacy combat expiry projects remainingMinutes to hundredths. When its
    // round anchor is also present, restore that exact D-11 projection before
    // applying elapsed campaign time, within the known half-hundredth rounding.
    const combatSubject = path.startsWith('combat.participants');
    for (const [index, effect] of next.extensions.v5.spellEffects.entries()) {
      if (!Number.isFinite(effect.remainingMinutes) || !Number.isFinite(effect.expiresAtRound)) continue;
      if (!combatSubject || !Number.isSafeInteger(referenceRound)) continue;
      const exact = Math.max(0, (effect.expiresAtRound - referenceRound) / 6);
      if (Math.abs(effect.remainingMinutes - exact) <= 0.0050000001) {
        effect.remainingMinutes = exact;
      } else {
        needsInput.push(needs(`${path}.extensions.v5.spellEffects[${index}]`, 'Temps restant et échéance en Rounds contradictoires.'));
      }
    }
    next = expireSpellEffects(next, { advanceMinutes: minutes, referenceRound }).participant;
    if ((next.extensions?.v5?.spellEffects || []).some(effect => Number.isFinite(effect.remainingMinutes) && effect.remainingMinutes > 0 && effect.remainingMinutes < 1e-12)) {
      next.extensions.v5.spellEffects = next.extensions.v5.spellEffects.map(effect => Number.isFinite(effect.remainingMinutes) && effect.remainingMinutes < 1e-12
        ? { ...effect, remainingMinutes: 0 } : effect);
      next = expireSpellEffects(next, { advanceMinutes: 0, referenceRound }).participant;
    }
  }
  if (next.extensions?.v5?.beastForm && Number.isFinite(next.extensions.v5.beastForm.remainingMinutes)) {
    const beast = next.extensions.v5.beastForm;
    const left = beast.remainingMinutes - minutes;
    if (left <= 1e-12) next = endBeastForm(next).participant;
    else next = { ...next, extensions: { ...next.extensions, v5: { ...next.extensions.v5, beastForm: {
      ...beast, remainingMinutes: left,
      ...(Number.isFinite(beast.expiresAtRound) ? { expiresAtRound: beast.expiresAtRound - minutes * 6 } : {})
    } } } };
  }
  if (Number.isSafeInteger(referenceRound) && next.extensions?.v5?.miscastEffects?.length) {
    const effects = next.extensions.v5.miscastEffects;
    for (const [index, effect] of effects.entries()) {
      if (!Number.isFinite(effect.expiresAtRound) || !Number.isSafeInteger(effect.appliedAtRound)) continue;
      const storedRemaining = Number.isFinite(effect.remainingMinutes)
        ? effect.remainingMinutes : (effect.expiresAtRound - effect.appliedAtRound) / 6;
      const previousRound = Number.isSafeInteger(effect.campaignReferenceRound)
        ? effect.campaignReferenceRound : effect.appliedAtRound;
      const expectedRemaining = storedRemaining - (referenceRound - previousRound) / 6;
      const anchoredRemaining = (effect.expiresAtRound - referenceRound) / 6;
      if (!Number.isFinite(expectedRemaining) || Math.abs(expectedRemaining - anchoredRemaining) > 1e-9) {
        needsInput.push(needs(`${path}.extensions.v5.miscastEffects[${index}]`, 'Temps restant et ancre de Round de l’incident contradictoires.'));
        continue;
      }
      effect.remainingMinutes = Math.max(0, anchoredRemaining);
      effect.campaignReferenceRound = referenceRound;
    }
  }
  next = advanceMagicConsequences(next, { currentRound: Number.isSafeInteger(referenceRound) ? referenceRound : null, minutes });
  const v5 = next.extensions?.v5;
  if (v5?.miscastEffects?.some(effect => Number.isFinite(effect.remainingMinutes) && effect.remainingMinutes > 0 && effect.remainingMinutes < 1e-12)) {
    v5.miscastEffects = v5.miscastEffects.map(effect => Number.isFinite(effect.remainingMinutes) && effect.remainingMinutes < 1e-12
      ? { ...effect, remainingMinutes: 0 } : effect);
    next = advanceMagicConsequences(next, { minutes: 0 });
  }
  if (next.extensions?.v5?.burnout?.active && !next.extensions.v5.burnout.permanent
    && Number.isFinite(next.extensions.v5.burnout.days) && next.extensions.v5.burnout.days < 1e-12) {
    next.extensions.v5.burnout = null;
  }
  return next;
}

function advanceRows(rows, { seconds, referenceRound, clock, path, needsInput, processedSubjects }) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row, index) => {
    if (!row || typeof row !== 'object') return row;
    const rowReferenceRound = typeof referenceRound === 'function' ? referenceRound(row) : referenceRound;
    const next = advanceParticipant(row, { seconds, referenceRound: rowReferenceRound, clock, path: `${path}[${index}]`, needsInput });
    if (JSON.stringify(next) !== JSON.stringify(row)) processedSubjects.push({ path: `${path}[${index}]`, id: row.id ?? null });
    return next;
  });
}

/** Advances only campaign-time data already present in one Store command snapshot. */
export function advanceCampaignSnapshot(snapshot, { seconds, clock } = {}) {
  if (!snapshot || typeof snapshot !== 'object' || !Number.isSafeInteger(seconds) || seconds < 1) {
    throw new TypeError('Snapshot ou durée de campagne invalide');
  }
  const needsInput = [], processedSubjects = [];
  const next = clone(snapshot);
  const referenceRound = currentMagicRound(next.combat || {});
  const activeRoundByPersistentId = new Map();
  for (const participant of next.combat?.participants || []) {
    if (typeof participant?.persistentCharacterId === 'string' && participant.persistentCharacterId) {
      activeRoundByPersistentId.set(participant.persistentCharacterId, referenceRound);
    }
  }
  const linkedCombatRound = row => typeof row?.persistentCharacterId === 'string'
    ? (activeRoundByPersistentId.get(row.persistentCharacterId) ?? null) : null;
  const sceneRound = scene => Number.isSafeInteger(scene?.round) && scene.round > 0 ? scene.round : null;

  const persistentById = new Map((next.persistentCharacters || []).filter(row => row?.id).map(row => [row.id, row]));
  const checkLinkedCopies = (rows, path) => {
    for (const [index, row] of (rows || []).entries()) {
      if (typeof row?.persistentCharacterId !== 'string' || !row.persistentCharacterId) continue;
      const persistent = persistentById.get(row.persistentCharacterId);
      if (persistent && JSON.stringify(temporalProjection(row)) !== JSON.stringify(temporalProjection(persistent))) {
        needsInput.push(needs(`${path}[${index}].persistentCharacterId`, 'Les couches temporelles du sujet et de sa fiche persistante divergent.'));
      }
    }
  };
  checkLinkedCopies(next.combat?.participants, 'combat.participants');
  checkLinkedCopies(next.reserve, 'reserve');
  if (next.activeScene?.status !== 'active') checkLinkedCopies(next.activeScene?.participants, 'activeScene.participants');
  (next.suspendedScenes || []).forEach((scene, index) => checkLinkedCopies(scene?.participants, `suspendedScenes[${index}].participants`));

  if (next.combat && Array.isArray(next.combat.participants)) {
    next.combat = { ...next.combat, participants: advanceRows(next.combat.participants, {
      seconds, referenceRound, clock, path: 'combat.participants', needsInput, processedSubjects
    }) };
  }
  next.reserve = advanceRows(next.reserve, { seconds, referenceRound: linkedCombatRound, clock, path: 'reserve', needsInput, processedSubjects });
  next.persistentCharacters = advanceRows(next.persistentCharacters, {
    seconds, referenceRound: row => activeRoundByPersistentId.get(row?.id) ?? null,
    clock, path: 'persistentCharacters', needsInput, processedSubjects
  });
  if (next.activeScene?.status !== 'active') {
    if (next.activeScene?.participants) next.activeScene = { ...next.activeScene,
      participants: advanceRows(next.activeScene.participants, {
        seconds, referenceRound: sceneRound(next.activeScene),
        clock: null, path: 'activeScene.participants', needsInput, processedSubjects
      }) };
  }
  next.suspendedScenes = (next.suspendedScenes || []).map((scene, sceneIndex) => ({
    ...scene,
    participants: advanceRows(scene?.participants, { seconds, referenceRound: sceneRound(scene), clock: null, path: `suspendedScenes[${sceneIndex}].participants`, needsInput, processedSubjects })
  }));
  if (needsInput.length) return { ok: false, status: 'requires-input', snapshot: null, needsInput, processedSubjects: [] };
  return { ok: true, status: 'applied', snapshot: next, needsInput: [], processedSubjects };
}
