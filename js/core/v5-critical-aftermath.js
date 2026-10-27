import { getV5CriticalEffect, V5_CRITICAL_TABLE_VERSION, V5_CRIT_DATA } from '../data/v5-crits.js';
import { acquireV5Conditions } from './v5-effects.js';

export const V5_CRITICAL_AFTERMATH_RULE_VERSION = 'v5-critical-aftermath-2026-10-27.1';
export const CRITICAL_DEATH_FIELD = 'criticalDeath';
export const CRITICAL_AFTERMATH_FIELD = 'criticalAftermath';

const clone = value => structuredClone(value);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validRound = round => Number.isSafeInteger(round) && round >= 0;
const validDR = dr => Number.isSafeInteger(dr);
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const effectKey = state => normalize(state?.key || state?.name).replace(/[^a-z]/g, '');

function withV5(participant, patch) {
  const next = clone(participant);
  next.extensions = { ...(next.extensions || {}), v5: { ...(next.extensions?.v5 || {}), ...patch } };
  return next;
}

function validateTest(test) {
  return isRecord(test) && typeof test.success === 'boolean' && Number.isSafeInteger(test.sl)
    && !(test.success && test.sl < 0) && !(!test.success && test.sl > 0);
}

/** Capture the exact V5 table identity and mechanical outputs as a durable sequela record. */
export function createCriticalAftermathRecord(participant, {
  table, effectRoll, location = null, resolutionId, criticalIndex = 0, authorId = null, round = null
} = {}) {
  if (!participant?.id) return { status: 'blocked', reason: 'Personnage cible requis.' };
  if (!Object.hasOwn(V5_CRIT_DATA, table)) return { status: 'blocked', reason: 'Table critique V5 invalide.' };
  if (!Number.isSafeInteger(effectRoll) || effectRoll < 1) return { status: 'blocked', reason: 'Jet d’effet critique requis.' };
  if (typeof resolutionId !== 'string' || !resolutionId.trim()) return { status: 'blocked', reason: 'Identifiant de résolution requis.' };
  if (!Number.isSafeInteger(criticalIndex) || criticalIndex < 0) return { status: 'blocked', reason: 'Index de critique invalide.' };
  if (round !== null && !validRound(round)) return { status: 'blocked', reason: 'Round du critique invalide.' };
  const entry = getV5CriticalEffect(table, effectRoll);
  if (!entry) return { status: 'blocked', reason: 'Ligne critique V5 introuvable.' };
  const record = {
    id: `${resolutionId}:aftermath:${participant.id}:${criticalIndex}`,
    criticalWoundId: `${resolutionId}:crit:${participant.id}:${criticalIndex}`,
    participantId: participant.id,
    resolutionId,
    criticalIndex,
    source: 'L06-V5-critical-table',
    ruleVersion: V5_CRITICAL_AFTERMATH_RULE_VERSION,
    tableVersion: V5_CRITICAL_TABLE_VERSION,
    table,
    effectRoll,
    effectMax: entry.max,
    effectName: entry.name,
    location: location || table,
    authorId,
    round,
    sequela: {
      extraWounds: entry.parsed.extraWounds,
      states: clone(entry.parsed.states),
      reminders: [...entry.parsed.reminders],
      injuries: clone(entry.parsed.injuries || []),
      durableEffects: clone(entry.parsed.durableEffects || []),
      criticalDeath: entry.parsed.death === true
    },
    source: clone(entry.source),
    status: 'active'
  };
  const rows = participant.extensions?.v5?.[CRITICAL_AFTERMATH_FIELD] || [];
  const existing = rows.find(row => row.id === record.id);
  if (existing) return { status: 'duplicate', participant, record: clone(existing) };
  const next = withV5(participant, { [CRITICAL_AFTERMATH_FIELD]: [...rows, record] });
  return { status: 'applied', participant: next, record };
}

const currentCriticalIds = participant => (participant.extensions?.v5?.criticalWounds || [])
  .map(row => row.id).filter(id => typeof id === 'string' && id.length);
const hasUnconscious = participant => (participant.states || []).some(state => effectKey(state) === 'inconscient' && Number(state.level ?? 1) > 0);

/**
 * Reconcile the multiple-critical-wound countdown. The current Round is the
 * anchor; death can only be decided by the MJ after the due Round is reached.
 */
export function updateCriticalDeathCountdown(participant, { round, toughnessBonus } = {}) {
  if (!participant?.id) return { status: 'blocked', reason: 'Personnage requis.' };
  if (!validRound(round)) return { status: 'blocked', reason: 'Round courant invalide.' };
  if (!Number.isSafeInteger(toughnessBonus) || toughnessBonus < 0) return { status: 'blocked', reason: 'Bonus d’Endurance invalide.' };
  if (participant.extensions?.v5?.dead === true) return { status: 'already-dead', participant };

  const criticalIds = currentCriticalIds(participant);
  const current = participant.extensions?.v5?.[CRITICAL_DEATH_FIELD] || null;
  const eligible = criticalIds.length > toughnessBonus && hasUnconscious(participant);
  if (!eligible) {
    if (current?.status === 'countdown' || current?.status === 'awaiting-mj') {
      const reason = criticalIds.length <= toughnessBonus ? 'critical-count-restored' : 'unconscious-removed';
      const cancelled = { ...current, status: 'cancelled', cancelledAtRound: round, cancelReason: reason };
      return { status: 'cancelled', participant: withV5(participant, { [CRITICAL_DEATH_FIELD]: cancelled }), countdown: cancelled };
    }
    // A refusal covers one episode only: once it ends, a later Unconscious episode opens a new countdown.
    if (current?.status === 'declined') {
      const closed = { ...current, status: 'cancelled', cancelledAtRound: round, cancelReason: 'declined-episode-ended' };
      return { status: 'not-eligible', participant: withV5(participant, { [CRITICAL_DEATH_FIELD]: closed }), countdown: closed };
    }
    return { status: 'not-eligible', participant };
  }
  if (current?.status === 'declined' || current?.status === 'confirmed') return { status: current.status, participant, countdown: clone(current) };
  if (current?.status === 'cancelled' && current.cancelReason === 'critical-wound-healed'
      && current.criticalIds?.some(id => !criticalIds.includes(id))
      && criticalIds.every(id => current.criticalIds.includes(id))) {
    return { status: 'cancelled', participant, countdown: clone(current) };
  }
  if (current?.status === 'countdown' || current?.status === 'awaiting-mj') {
    const lostCritical = current.criticalIds?.some(id => !criticalIds.includes(id));
    if (lostCritical) {
      const cancelled = { ...current, status: 'cancelled', cancelledAtRound: round, cancelReason: 'critical-wound-healed' };
      return { status: 'cancelled', participant: withV5(participant, { [CRITICAL_DEATH_FIELD]: cancelled }), countdown: cancelled };
    }
  }
  const countdown = current?.status === 'countdown' || current?.status === 'awaiting-mj'
    ? { ...current, currentCriticalCount: criticalIds.length, lastCheckedRound: round }
    : {
      id: `critical-death:${participant.id}:${round}`,
      status: 'countdown',
      startedRound: round,
      dueRound: round + toughnessBonus,
      toughnessBonus,
      criticalIds,
      currentCriticalCount: criticalIds.length,
      lastCheckedRound: round,
      ruleVersion: V5_CRITICAL_AFTERMATH_RULE_VERSION
    };
  if (round >= countdown.dueRound) countdown.status = 'awaiting-mj';
  return { status: countdown.status, participant: withV5(participant, { [CRITICAL_DEATH_FIELD]: countdown }), countdown };
}

/** Resolve an explicit MJ decision at or after the critical-death deadline. */
export function decideCriticalDeath(participant, { decision, round } = {}) {
  const countdown = participant?.extensions?.v5?.[CRITICAL_DEATH_FIELD];
  if (!validRound(round) || !countdown || !['awaiting-mj', 'countdown'].includes(countdown.status) || round < countdown.dueRound) {
    return { status: 'blocked', reason: 'Le décompte de mort par blessures critiques n’a pas atteint son échéance.' };
  }
  if (currentCriticalIds(participant).length <= countdown.toughnessBonus || !hasUnconscious(participant)
      || countdown.criticalIds?.some(id => !currentCriticalIds(participant).includes(id))) {
    return { status: 'blocked', reason: 'La Blessure Critique ou l’état Inconscient requis n’est plus présent.' };
  }
  if (decision !== 'confirm' && decision !== 'decline') return { status: 'confirmation-required', participant, countdown: clone(countdown) };
  const nextCount = { ...countdown, status: decision === 'confirm' ? 'confirmed' : 'declined', decidedAtRound: round, decidedBy: 'MJ' };
  const next = withV5(participant, { [CRITICAL_DEATH_FIELD]: nextCount });
  if (decision === 'confirm') {
    next.hp = 0;
    next.extensions.v5.dead = true;
  }
  return { status: decision === 'confirm' ? 'dead' : 'declined', participant: next, countdown: nextCount };
}

/** Death printed in a critical table is a request for an explicit MJ decision. */
export function decideImmediateCriticalDeath(participant, { criticalId, decision } = {}) {
  if (!participant?.id || !criticalId || (decision !== 'confirm' && decision !== 'decline')) {
    return { status: 'confirmation-required', participant };
  }
  const rows = participant.extensions?.v5?.[CRITICAL_AFTERMATH_FIELD] || [];
  const record = rows.find(row => row.id === criticalId);
  if (!record || record.sequela?.criticalDeath !== true) return { status: 'blocked', participant, reason: 'Critique mortel introuvable.' };
  if (record.deathDecision) return { status: 'duplicate', participant, record: clone(record) };
  const next = clone(participant);
  next.extensions = { ...(next.extensions || {}), v5: { ...(next.extensions?.v5 || {}) } };
  next.extensions.v5[CRITICAL_AFTERMATH_FIELD] = rows.map(row => row.id === criticalId
    ? { ...row, deathDecision: { outcome: decision, decidedBy: 'MJ' } }
    : row);
  if (decision === 'confirm') {
    next.hp = 0;
    next.extensions.v5.dead = true;
  }
  return { status: decision === 'confirm' ? 'dead' : 'declined', participant: next,
    record: next.extensions.v5[CRITICAL_AFTERMATH_FIELD].find(row => row.id === criticalId) };
}

function hasLuckTalent(participant) {
  return (participant.talents || []).some(talent => normalize(talent?.id).includes('talent-luck')
    || normalize(talent?.id).includes('talent-lucky')
    || normalize(talent?.name || talent?.nom).includes('chanceux')
    || normalize(talent?.name || talent?.nom).includes('lucky'));
}

/** Sudden Death is disabled unless the MJ has enabled the table option explicitly. */
export function previewSuddenDeath(participant, {
  tableOptionEnabled = false, secondaryNpcConfirmed = false
} = {}) {
  if (tableOptionEnabled !== true) return { status: 'disabled', ready: false, reason: 'Option Mort subite désactivée.' };
  if (!participant?.id || participant.kind !== 'PNJ' || secondaryNpcConfirmed !== true || hasLuckTalent(participant)) {
    return { status: 'ineligible', ready: false, reason: 'Mort subite réservée aux PNJ secondaires sans Talent Chanceux.' };
  }
  if (Number(participant.hp) !== 0) return { status: 'ineligible', ready: false, reason: 'Mort subite disponible seulement à 0 Blessure.' };
  return { status: 'choice-required', ready: true, participantId: participant.id, outcomes: ['dead', 'unconscious'],
    tableOptionEnabled: true, secondaryNpcConfirmed: true, ruleVersion: V5_CRITICAL_AFTERMATH_RULE_VERSION };
}

export function decideSuddenDeath(participant, plan, outcome) {
  if (!plan?.ready || plan.status !== 'choice-required' || plan.participantId !== participant?.id) return { status: 'blocked', participant, reason: plan?.reason || 'Choix de mort subite invalide.' };
  const currentEligibility = previewSuddenDeath(participant, { tableOptionEnabled: plan.tableOptionEnabled, secondaryNpcConfirmed: plan.secondaryNpcConfirmed });
  if (!currentEligibility.ready) return { status: 'blocked', participant, reason: currentEligibility.reason };
  if (outcome !== 'dead' && outcome !== 'unconscious') return { status: 'confirmation-required', participant, plan };
  const next = clone(participant);
  next.extensions = { ...(next.extensions || {}), v5: { ...(next.extensions?.v5 || {}) } };
  if (outcome === 'dead') next.extensions.v5.dead = true;
  else {
    const receipt = acquireV5Conditions(next, [{ name: 'Inconscient', source: { kind: 'sudden-death' } }]);
    Object.assign(next, receipt.participant);
  }
  next.hp = 0;
  return { status: outcome, participant: next, decisionBy: 'MJ', ruleVersion: V5_CRITICAL_AFTERMATH_RULE_VERSION };
}

/** Resolve the V5 amputation-shock thresholds from an explicit Resistance Test. */
function amputationOutcomes(value, conditional=false, found=[]) {
  if(Array.isArray(value)){for(const row of value)amputationOutcomes(row,conditional,found);return found;}
  if(!isRecord(value))return found;
  if(value.kind==='amputation'||value.amputation===true)found.push({conditional,part:value.part||null,difficultySL:value.difficultySL});
  for(const [key,child] of Object.entries(value)){
    const childIsConditional=conditional||['onFailure','onSuccess','conditional','if'].includes(key);
    if(child&&typeof child==='object')amputationOutcomes(child,childIsConditional,found);
  }
  return found;
}

export function amputationShockRequirements(record) {
  return amputationOutcomes(record?.sequela?.durableEffects||record?.sequela?.injuries||[])
    .map(row=>({part:row.part,difficultyDR:row.difficultySL,conditional:row.conditional}));
}

export function previewAmputationShock({ participant, criticalId, difficultyDR, test, amputationOccurred } = {}) {
  if (!participant?.id) return { status: 'blocked', reason: 'Personnage concerné requis.' };
  if (typeof criticalId !== 'string' || !criticalId.trim()) return { status: 'blocked', reason: 'Blessure Critique d’amputation requise.' };
  const record=(participant.extensions?.v5?.[CRITICAL_AFTERMATH_FIELD]||[]).find(row=>row.id===criticalId);
  if(!record)return{status:'blocked',reason:'Blessure Critique introuvable.'};
  const amputationKinds=amputationShockRequirements(record).map(row=>({part:row.part,difficultySL:row.difficultyDR,conditional:row.conditional}));
  if(!amputationKinds.length)return{status:'blocked',reason:'Cette Blessure Critique ne prévoit aucune amputation.'};
  const isConditional=amputationKinds.every(row=>row.conditional);
  if(isConditional&&amputationOccurred!==true){
    if(amputationOccurred===false)return{status:'blocked',reason:'Aucune amputation n’a été confirmée pour cette Blessure Critique.'};
    return{status:'requires-input',reason:'Confirmer qu’une amputation conditionnelle a effectivement eu lieu.'};
  }
  if(amputationOccurred===false)return{status:'blocked',reason:'Aucune amputation n’a été confirmée pour cette Blessure Critique.'};
  const sourceDifficulties=[...new Set(amputationKinds.map(row=>row.difficultySL).filter(Number.isSafeInteger))];
  if(sourceDifficulties.length!==1)return{status:'blocked',reason:'Difficulté source d’amputation absente ou ambiguë.'};
  if (!validDR(difficultyDR)) return { status: 'blocked', reason: 'Difficulté de Résistance de l’amputation requise.' };
  if(difficultyDR!==sourceDifficulties[0])return{status:'blocked',reason:'Difficulté différente de la table V5 pour cette amputation.'};
  if (!validateTest(test)) return { status: 'requires-input', reason: 'Résultat explicite du Test de Résistance requis.' };
  const states = [];
  if (!test.success) {
    states.push({ name: 'À Terre', level: 1 });
    if (test.sl <= -1) states.push({ name: 'Sonné', level: 1 });
    if (test.sl <= -4) states.push({ name: 'Inconscient', level: 1 });
  }
  return {
    status: 'ready', ready: true, participantId: participant.id, criticalId, difficultyDR, amputationOccurred:true,
    amputatedPart:amputationKinds.find(row=>row.part)?.part||null,
    test: clone(test), states, surgeryRequired: true,
    ruleVersion: V5_CRITICAL_AFTERMATH_RULE_VERSION
  };
}

export function applyAmputationShock(participant, plan) {
  if (!plan?.ready || plan.participantId !== participant?.id || plan.amputationOccurred!==true) return { status: 'blocked', participant, reason: plan?.reason || 'Plan de choc d’amputation invalide.' };
  const record = (participant.extensions?.v5?.[CRITICAL_AFTERMATH_FIELD] || []).find(row => row.id === plan.criticalId);
  if (!record) return { status: 'stale', participant, reason: 'Blessure Critique d’amputation introuvable.' };
  const verified=previewAmputationShock({participant,criticalId:plan.criticalId,difficultyDR:plan.difficultyDR,test:plan.test,amputationOccurred:plan.amputationOccurred});
  if(!verified.ready||JSON.stringify(verified.states)!==JSON.stringify(plan.states))return{status:'blocked',participant,reason:verified.reason||'Le choc ne correspond pas à une amputation admissible.'};
  if (record.amputationShock) return { status: 'duplicate', participant, record: clone(record) };
  const context = { resolutionId: plan.criticalId, targetId: participant.id, source: { kind: 'amputation-shock', criticalId: plan.criticalId } };
  const effects = verified.states.length ? acquireV5Conditions(participant, verified.states.map(state => ({ ...state, source: context.source })), context) : { participant: clone(participant), acquiredInstances: 0 };
  const next = clone(effects.participant);
  const rows = next.extensions?.v5?.[CRITICAL_AFTERMATH_FIELD] || [];
  next.extensions ??= {};
  next.extensions.v5 = { ...(next.extensions.v5 || {}), [CRITICAL_AFTERMATH_FIELD]: rows.map(row => row.id === plan.criticalId
    ? { ...row, amputationShock: { amputationOccurred:true,part:verified.amputatedPart,difficultyDR: plan.difficultyDR, test: clone(plan.test), acquiredStates: verified.states.map(state => state.name), surgeryRequired: true } }
    : row) };
  return { status: 'applied', participant: next, record: next.extensions.v5[CRITICAL_AFTERMATH_FIELD].find(row => row.id === plan.criticalId) };
}
