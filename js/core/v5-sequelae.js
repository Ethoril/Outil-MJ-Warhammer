import { aftermathKit } from './v5-aftermath.js';
import { BONE_DAYS, MAJOR_BONE_EXTRA_DAYS, MUSCLE_DAYS, IMMOBILIZATION_WEEK_DAYS, REBIND_WINDOW_DAYS, sequelaPhase } from './v5-sequela-effects.js';

/**
 * Suivi des séquelles durables et temporaires (F2-J2, V5 livre de base p.177-179), dans le registre de convalescence de J1.
 * Chaque séquelle porte un identifiant stable dérivé de l'occurrence F2-I ; les Tests utilisent la compétence réelle et un d100 saisi.
 * Les DR sont des DR V5 : « +2 SL » du livre est +2 DR (plus facile), « −1 SL » est −1 DR.
 */
const { assertState, receipt, result, commit, priorReceipt, runTest, testFacts, healerProblem, validRoll, validScore, ID, clone } = aftermathKit;

const SIDED_PARTS = new Set(['hand', 'arm', 'foot', 'leg', 'ear', 'eye']);
const COUNTED_PARTS = new Set(['finger', 'toe']);
const UPPER = new Set(['hand', 'arm']);
const LOWER = new Set(['foot', 'leg']);
const d10Valid = value => Number.isSafeInteger(value) && value >= 1 && value <= 10;
const sideValid = side => side === 'left' || side === 'right';
/** Maladresse de Guérison (p.170) : 1d10 Blessures pour le patient, sans descendre sous 1. */
const fumbleFactsValid = (d10, wounds) => (d10 === null || d10Valid(d10)) && Number.isSafeInteger(wounds) && wounds >= 0;
const healingFumbleDamage = (test, d10, wounds) => test.fumble ? Math.min(d10, Math.max(0, wounds - 1)) : 0;

const TEXT = { hand: 'main', arm: 'bras', foot: 'pied', leg: 'jambe', ear: 'oreille', eye: 'œil', finger: 'doigt(s)', toe: 'orteil(s)', teeth: 'dents', nose: 'nez', tongue: 'langue' };

/** Pertes issues d'un choc d'amputation confirmé (partie de la table, éventuellement composée). */
function lossesOfShock(shock, index) {
  const part = shock.part;
  const loss = (suffix, partName, extra = {}) => ({ key: `shock:${index}:${suffix}`, kind: 'loss', part: partName, label: `Perte : ${TEXT[partName] || partName}`, ...extra });
  switch (part) {
    case 'finger': return [loss('finger', 'finger')];
    case 'hand': return [loss('hand', 'hand')];
    case 'arm': case 'arm-function': return [loss('arm', 'arm')];
    case 'foot': return [loss('foot', 'foot')];
    case 'leg': return [loss('leg', 'leg')];
    case 'legs': return [loss('leg-left', 'leg', { side: 'left' }), loss('leg-right', 'leg', { side: 'right' })];
    case 'ear': return [loss('ear', 'ear')];
    case 'eye': return [loss('eye', 'eye')];
    case 'eye-and-nose': return [loss('eye', 'eye'), loss('nose', 'nose')];
    case 'nose': return [loss('nose', 'nose')];
    case 'teeth': return [loss('teeth', 'teeth')];
    case 'tongue': return [loss('tongue', 'tongue')];
    case 'tongue-and-teeth': return [loss('tongue', 'tongue'), loss('teeth', 'teeth')];
    case 'toe': case 'toes': return [loss('toe', 'toe')];
    default: return [];
  }
}

/** Séquelles à suivre pour une occurrence F2-I : lésions de la table, effets durables, pertes réellement confirmées. */
export function planSequelae(record) {
  const items = [];
  (record?.sequela?.injuries || []).forEach((injury, i) => {
    const bone = injury.name === 'Broken Bone';
    if (!bone && injury.name !== 'Torn Muscle') return;
    const word = bone ? 'Fracture' : 'Déchirure musculaire';
    items.push({ key: `injury:${i}`, kind: bone ? 'broken-bone' : 'torn-muscle', severity: injury.severity, part: injury.part, label: `${word} ${injury.severity === 'major' ? 'majeure' : 'mineure'} (${TEXT[injury.part] || { head: 'tête', body: 'corps' }[injury.part] || injury.part})` });
  });
  (record?.sequela?.durableEffects || []).forEach((effect, i) => {
    switch (effect.kind) {
      case 'reset-limb': items.push({ key: `d${i}`, kind: 'reset-limb', part: effect.part, label: `Remise en place : ${effect.part === 'knee' ? 'genou' : 'épaule'}` }); break;
      case 'medical-attention-required': items.push({ key: `d${i}`, kind: 'medical-attention', condition: effect.condition, label: 'Soins médicaux requis' }); break;
      case 'surgery-deadline': items.push({ key: `d${i}`, kind: 'surgery-deadline', label: 'Chirurgie avant l’échéance (BE jours)' }); break;
      case 'disease': items.push({ key: `d${i}`, kind: 'disease', name: effect.name, label: `Maladie : ${effect.name}` }); break;
      case 'permanent-sensory-loss': items.push({ key: `d${i}`, kind: 'loss', part: 'ear', label: 'Perte : oreille' }); break;
      case 'permanent-functional-loss':
        if (effect.part === 'legs') items.push({ key: `d${i}:left`, kind: 'loss', part: 'leg', side: 'left', label: 'Perte : jambe' }, { key: `d${i}:right`, kind: 'loss', part: 'leg', side: 'right', label: 'Perte : jambe' });
        else items.push({ key: `d${i}`, kind: 'loss', part: 'leg', label: 'Perte : jambe' });
        break;
      case 'scar': items.push({ key: `d${i}`, kind: 'scar', label: 'Cicatrice de duel' }); break;
      case 'post-encounter-test': items.push({ key: `d${i}`, kind: 'post-encounter-test', difficultyDR: effect.difficultySL ?? 0, label: 'Test de Résistance après la rencontre' }); break;
      default: break;
    }
  });
  const shocks = [record?.amputationShock, ...(record?.amputationShocks || [])].filter(row => row?.amputationOccurred === true);
  const covered = new Set(items.filter(item => item.kind === 'loss' && item.part === 'leg').map(() => 'leg'));
  shocks.forEach((shock, index) => {
    // Perte fonctionnelle certaine (jambe(s) inutilisable(s)) : déjà suivie ci-dessus, le choc ne l'ajoute pas une seconde fois.
    if (covered.has('leg') && ['leg', 'legs'].includes(shock.part)) return;
    items.push(...lossesOfShock(shock, index));
  });
  return items.map(item => ({ ...item, id: `${record.id}:j2:${item.key}` }));
}

/** Faits manquants d'une séquelle avant que ses effets puissent s'appliquer. */
function missingFacts(item, facts) {
  const need = [];
  const sided = item.kind === 'loss' ? SIDED_PARTS.has(item.part) || COUNTED_PARTS.has(item.part) : ['arm', 'leg'].includes(item.part);
  if (sided && !sideValid(facts.side ?? item.side)) need.push('side');
  if (item.kind === 'loss' && (COUNTED_PARTS.has(item.part) || item.part === 'teeth') && !(Number.isSafeInteger(facts.count) && facts.count >= 1)) need.push('count');
  if (item.kind === 'broken-bone' && !d10Valid(facts.d10)) need.push('d10');
  return need;
}

/** Faits à saisir pour une séquelle planifiée (côté, 1d10, nombre) : ce que le registre ne peut ni lire ni deviner. */
export const requiredSequelaFacts = item => missingFacts(item, item.side ? { side: item.side } : {});

function build(item, incident, facts, toughnessBonus) {
  const base = {
    id: item.id, participantId: incident.participantId, incidentId: incident.id, key: item.key, kind: item.kind, label: item.label,
    source: { criticalId: incident.source.criticalId, criticalWoundId: incident.source.criticalWoundId }, startDay: incident.injuryDay, status: 'open', history: []
  };
  const data = { ...base, ...Object.fromEntries(['part', 'severity', 'condition', 'name', 'difficultyDR'].filter(k => item[k] !== undefined).map(k => [k, item[k]])) };
  return finish(data, { ...(item.side ? { side: item.side } : {}), ...facts }, toughnessBonus);
}

/** Applique les faits saisis et calcule les échéances ; `status` reste 'needs-facts' tant qu'un fait manque. */
function finish(sequela, facts, toughnessBonus) {
  const next = { ...sequela };
  const missing = missingFacts(next, facts);
  if (facts.side !== undefined && sideValid(facts.side)) next.side = facts.side;
  if (next.kind === 'loss') {
    if (facts.count !== undefined && Number.isSafeInteger(facts.count)) next.count = facts.count;
    if (UPPER.has(next.part)) next.primary = facts.primary === true;
    next.relearned = next.relearned || 0;
  }
  if (next.kind === 'broken-bone' && facts.primary !== undefined) next.primary = facts.primary === true;
  if (next.kind === 'torn-muscle' && !missing.length) {
    const phase = Math.max(0, MUSCLE_DAYS - toughnessBonus);
    next.toughnessBonus = toughnessBonus;
    next.reducedDays = next.reducedDays || 0;
    if (next.severity === 'major') { next.partialDay = next.startDay + phase; next.endDay = next.partialDay + phase; } else next.endDay = next.startDay + phase - next.reducedDays;
  }
  if (next.kind === 'broken-bone' && !missing.length) {
    next.d10 = facts.d10;
    next.durationDays = BONE_DAYS + facts.d10 + (next.severity === 'major' ? MAJOR_BONE_EXTRA_DAYS : 0);
    next.endDay = next.startDay + next.durationDays;
    next.immobilization = next.immobilization || { state: 'none', waiver: false, attempts: [] };
  }
  if (next.kind === 'surgery-deadline') next.deadlineDay = next.startDay + toughnessBonus;
  if ((next.kind === 'loss' || next.kind === 'scar') && !missing.length) next.status = 'permanent';
  else if (missing.length) next.status = 'needs-facts';
  else if (next.status === 'needs-facts') next.status = 'open';
  next.missing = missing;
  return next;
}

function findIncident(state, incidentId) { return state.incidents.find(row => row.id === incidentId); }
const lossCollision = (state, sequela, side) => {
  if (sequela.kind !== 'loss' || !SIDED_PARTS.has(sequela.part)) return false;
  const group = UPPER.has(sequela.part) ? UPPER : LOWER.has(sequela.part) ? LOWER : new Set([sequela.part]);
  return state.sequelae.some(row => row.id !== sequela.id && row.participantId === sequela.participantId && row.kind === 'loss' && row.status === 'permanent' && group.has(row.part) && row.side === side);
};

export function openSequelae(stateValue, { operationId, expectedRevision, incidentId, record, toughnessBonus = null, facts = {} } = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'sequelae-open', 'refused', reason, { incidentId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const incident = findIncident(state, incidentId);
  if (!incident) return refusal('unknown-incident');
  if (incident.status !== 'open') return refusal('incident-closed');
  if (incident.source.kind !== 'critical' || !record || record.id !== incident.source.criticalId) return refusal('critical-occurrence-not-found');
  const plan = planSequelae(record);
  if (!plan.length) return refusal('nothing-to-follow');
  const fresh = plan.filter(item => !(state.sequelae || []).some(row => row.id === item.id));
  if (!fresh.length) return refusal('sequelae-already-open');
  if (fresh.some(item => ['torn-muscle', 'surgery-deadline'].includes(item.kind)) && !(Number.isSafeInteger(toughnessBonus) && toughnessBonus >= 0)) return refusal('toughness-bonus-required');
  if (facts && typeof facts !== 'object') return refusal('invalid-facts');
  const next = clone(state);
  next.sequelae ??= [];
  for (const item of fresh) {
    const made = build(item, incident, facts[item.key] || {}, toughnessBonus ?? 0);
    if (made.status === 'permanent' && lossCollision(next, made, made.side)) { made.status = 'needs-facts'; made.missing = ['side']; delete made.side; }
    next.sequelae.push(made);
  }
  return commit(next, receipt(state, operationId, 'sequelae-open', 'applied', 'sequelae-opened', { incidentId, sequelaIds: fresh.map(item => item.id) }));
}

export function setSequelaFacts(stateValue, { operationId, expectedRevision, sequelaId, facts = {}, toughnessBonus = null } = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'sequela-facts', 'refused', reason, { sequelaId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const sequela = (state.sequelae || []).find(row => row.id === sequelaId);
  if (!sequela) return refusal('unknown-sequela');
  if (sequela.status !== 'needs-facts') return refusal('facts-already-set');
  if (!facts || typeof facts !== 'object') return refusal('invalid-facts');
  if (sequela.kind === 'torn-muscle' && !(Number.isSafeInteger(toughnessBonus) && toughnessBonus >= 0)) return refusal('toughness-bonus-required');
  if (facts.count !== undefined && !(Number.isSafeInteger(facts.count) && facts.count >= 1)) return refusal('invalid-facts');
  if (facts.d10 !== undefined && !d10Valid(facts.d10)) return refusal('invalid-facts');
  if (facts.side !== undefined && !sideValid(facts.side)) return refusal('invalid-facts');
  const next = clone(state);
  const index = next.sequelae.findIndex(row => row.id === sequelaId);
  const merged = finish(next.sequelae[index], { ...(sequela.side ? { side: sequela.side } : {}), ...facts }, toughnessBonus ?? sequela.toughnessBonus ?? 0);
  if (merged.status === 'needs-facts') return refusal(`facts-missing:${merged.missing.join(',')}`);
  if (lossCollision(state, merged, merged.side)) return refusal('part-already-lost');
  next.sequelae[index] = merged;
  return commit(next, receipt(state, operationId, 'sequela-facts', 'applied', 'sequela-facts-set', { sequelaId }));
}

const immobilizationWindow = (sequela, day) => {
  const state = sequela.immobilization?.state;
  if (state === 'bound') return 'already-bound';
  if (state === 'unbound') return day <= sequela.immobilization.rebindDeadline ? null : 'rebind-window-passed';
  return day <= sequela.startDay + IMMOBILIZATION_WEEK_DAYS ? null : 'immobilization-window-passed';
};

/** p.177 : un Test de Guérison dans la semaine (+2 DR, +0 si majeure) immobilise la fracture et dispense du Test final tant qu'elle reste attachée. */
export function immobilizeFracture(stateValue, { operationId, expectedRevision, sequelaId, healer, roll, d10 = null, wounds = 0 } = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'immobilization', 'refused', reason, { sequelaId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const sequela = (state.sequelae || []).find(row => row.id === sequelaId);
  if (!sequela || sequela.kind !== 'broken-bone') return refusal('unknown-sequela');
  if (sequelaPhase(sequela, state.calendar.currentDay) !== 'healing') return refusal('fracture-not-healing');
  { const reason = immobilizationWindow(sequela, state.calendar.currentDay); if (reason) return refusal(reason); }
  { const problem = healerProblem(healer, ['heal']); if (problem) return refusal(problem); }
  if (!validRoll(roll) || !fumbleFactsValid(d10, wounds)) return refusal('invalid-test-facts');
  const dr = sequela.severity === 'major' ? 0 : 2;
  const test = runTest(healer.score, roll, dr, 'aftermath:immobilization', 'Immobilisation (Guérison)');
  if (test.fumble && d10 === null) return refusal('fumble-d10-required');
  const fumbleDamage = healingFumbleDamage(test, d10, wounds);
  const next = clone(state);
  const target = next.sequelae.find(row => row.id === sequelaId);
  const day = state.calendar.currentDay;
  target.immobilization.attempts.push({ day, healerId: healer.participantId, ...testFacts(test), difficultyDR: dr, fumbleDamage, d10: test.fumble ? d10 : null });
  if (test.success) { target.immobilization.state = 'bound'; target.immobilization.waiver = true; target.immobilization.boundDay = day; }
  return commit(next, receipt(state, operationId, 'immobilization', 'applied', test.success ? 'fracture-bound' : 'immobilization-failed', { sequelaId, healerId: healer.participantId, difficultyDR: dr, ...testFacts(test), fumbleDamage }));
}

/** Le bandage est retiré : un nouveau Test de Guérison dans la journée est nécessaire pour éviter le Test d'Endurance final. */
export function unbindFracture(stateValue, { operationId, expectedRevision, sequelaId } = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'unbind', 'refused', reason, { sequelaId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const sequela = (state.sequelae || []).find(row => row.id === sequelaId);
  if (!sequela || sequela.kind !== 'broken-bone') return refusal('unknown-sequela');
  if (sequela.immobilization?.state !== 'bound' || sequelaPhase(sequela, state.calendar.currentDay) !== 'healing') return refusal('not-bound');
  const next = clone(state);
  const target = next.sequelae.find(row => row.id === sequelaId);
  target.immobilization.state = 'unbound';
  target.immobilization.unboundDay = state.calendar.currentDay;
  target.immobilization.rebindDeadline = state.calendar.currentDay + REBIND_WINDOW_DAYS;
  return commit(next, receipt(state, operationId, 'unbind', 'applied', 'binding-removed', { sequelaId, rebindDeadline: target.immobilization.rebindDeadline }));
}

/** Fin de la guérison d'une fracture (p.177) : dispensée si toujours attachée, sinon Résistance +2 DR (+0 si majeure) ; échec = séquelle permanente. */
export function resolveFractureHealing(stateValue, { operationId, expectedRevision, sequelaId, enduranceScore = null, roll = null } = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'fracture-healing', 'refused', reason, { sequelaId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const sequela = (state.sequelae || []).find(row => row.id === sequelaId);
  if (!sequela || sequela.kind !== 'broken-bone') return refusal('unknown-sequela');
  const day = state.calendar.currentDay;
  if (sequelaPhase(sequela, day) !== 'awaiting-test') return refusal(day < sequela.endDay ? 'fracture-still-healing' : 'fracture-already-resolved');
  const waived = sequela.immobilization?.state === 'bound' && sequela.immobilization.waiver === true;
  const next = clone(state);
  const target = next.sequelae.find(row => row.id === sequelaId);
  if (waived) {
    target.status = 'healed';
    target.finalTest = { day, waived: true };
    return commit(next, receipt(state, operationId, 'fracture-healing', 'applied', 'fracture-healed-bound', { sequelaId, waived: true }));
  }
  if (!validScore(enduranceScore)) return refusal('endurance-score-missing');
  if (!validRoll(roll)) return refusal('invalid-test-facts');
  const dr = sequela.severity === 'major' ? 0 : 2;
  const test = runTest(enduranceScore, roll, dr, 'aftermath:fracture-final', 'Fin de guérison (Résistance)');
  target.finalTest = { day, waived: false, difficultyDR: dr, ...testFacts(test) };
  target.status = test.success ? 'healed' : 'permanent';
  return commit(next, receipt(state, operationId, 'fracture-healing', 'applied', test.success ? 'fracture-healed' : 'fracture-badly-healed', { sequelaId, waived: false, difficultyDR: dr, ...testFacts(test) }));
}

/** p.177 : un Test de Guérison réussi raccourcit une déchirure mineure de 1 jour plus 1 par DR après le premier, une seule fois. */
export function treatTornMuscle(stateValue, { operationId, expectedRevision, sequelaId, healer, roll, difficultyDR = 0, d10 = null, wounds = 0 } = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'muscle-heal', 'refused', reason, { sequelaId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const sequela = (state.sequelae || []).find(row => row.id === sequelaId);
  if (!sequela || sequela.kind !== 'torn-muscle') return refusal('unknown-sequela');
  if (sequela.severity === 'major') return refusal('heal-does-not-shorten-major-tear');
  if (sequelaPhase(sequela, state.calendar.currentDay) !== 'healing') return refusal('tear-not-healing');
  if (sequela.healTest) return refusal('muscle-heal-already-used');
  { const problem = healerProblem(healer, ['heal']); if (problem) return refusal(problem); }
  if (!validRoll(roll) || !Number.isSafeInteger(difficultyDR) || !fumbleFactsValid(d10, wounds)) return refusal('invalid-test-facts');
  const test = runTest(healer.score, roll, difficultyDR, 'aftermath:muscle-heal', 'Soin d’une déchirure (Guérison)');
  if (test.fumble && d10 === null) return refusal('fumble-d10-required');
  const fumbleDamage = healingFumbleDamage(test, d10, wounds);
  const reduction = test.success ? 1 + Math.max(0, test.sl - 1) : 0;
  const next = clone(state);
  const target = next.sequelae.find(row => row.id === sequelaId);
  target.history.push({ operationId, day: state.calendar.currentDay, kind: 'muscle-heal', healerId: healer.participantId, ...testFacts(test), difficultyDR, reduction, fumbleDamage, d10: test.fumble ? d10 : null });
  if (test.success) {
    target.healTest = { day: state.calendar.currentDay, reduction };
    target.reducedDays = reduction;
    target.endDay = Math.max(target.startDay, target.endDay - reduction);
  }
  return commit(next, receipt(state, operationId, 'muscle-heal', 'applied', test.success ? 'tear-shortened' : 'tear-heal-failed', { sequelaId, healerId: healer.participantId, difficultyDR, reduction, endDay: target.endDay, ...testFacts(test), fumbleDamage }));
}

/** Épaule ou genou remis en place : le Test de Guérison étendu se joue à la table, le MJ confirme son aboutissement. */
export function confirmResetLimb(stateValue, { operationId, expectedRevision, sequelaId } = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'reset-limb', 'refused', reason, { sequelaId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const sequela = (state.sequelae || []).find(row => row.id === sequelaId);
  if (!sequela || sequela.kind !== 'reset-limb') return refusal('unknown-sequela');
  if (sequela.status !== 'open') return refusal('sequela-already-resolved');
  const next = clone(state);
  const target = next.sequelae.find(row => row.id === sequelaId);
  target.status = 'healed';
  target.resolvedDay = state.calendar.currentDay;
  return commit(next, receipt(state, operationId, 'reset-limb', 'applied', 'limb-reset-confirmed', { sequelaId }));
}

/** Test de Résistance posé « après la rencontre » (Orteil entaillé) : la perte éventuelle suit le choc d'amputation F2-I. */
export function recordPostEncounterTest(stateValue, { operationId, expectedRevision, sequelaId, enduranceScore, roll } = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'post-encounter-test', 'refused', reason, { sequelaId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const sequela = (state.sequelae || []).find(row => row.id === sequelaId);
  if (!sequela || sequela.kind !== 'post-encounter-test') return refusal('unknown-sequela');
  if (sequela.status !== 'open') return refusal('sequela-already-resolved');
  if (!validScore(enduranceScore)) return refusal('endurance-score-missing');
  if (!validRoll(roll)) return refusal('invalid-test-facts');
  const test = runTest(enduranceScore, roll, sequela.difficultyDR ?? 0, 'aftermath:post-encounter', 'Test après la rencontre (Résistance)');
  const next = clone(state);
  const target = next.sequelae.find(row => row.id === sequelaId);
  target.status = test.success ? 'healed' : 'failed';
  target.test = { day: state.calendar.currentDay, ...testFacts(test) };
  return commit(next, receipt(state, operationId, 'post-encounter-test', 'applied', test.success ? 'post-encounter-passed' : 'post-encounter-failed', { sequelaId, ...testFacts(test) }));
}

/** Échéance de chirurgie manquée (Pied écrasé) : le MJ confirme la perte du pied (côté requis) ou l'écarte. */
export function decideSurgeryDeadline(stateValue, { operationId, expectedRevision, sequelaId, footLost, side = null } = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'surgery-deadline', 'refused', reason, { sequelaId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const sequela = (state.sequelae || []).find(row => row.id === sequelaId);
  if (!sequela || sequela.kind !== 'surgery-deadline') return refusal('unknown-sequela');
  if (sequela.status !== 'open') return refusal('sequela-already-resolved');
  if (state.calendar.currentDay <= sequela.deadlineDay) return refusal('deadline-not-reached');
  if (typeof footLost !== 'boolean') return refusal('decision-required');
  if (footLost && !sideValid(side)) return refusal('facts-missing:side');
  const next = clone(state);
  const target = next.sequelae.find(row => row.id === sequelaId);
  target.status = footLost ? 'resolved' : 'waived';
  target.decision = { day: state.calendar.currentDay, footLost, decidedBy: 'MJ' };
  if (footLost) {
    const id = `${sequela.id}:foot-lost`;
    const made = { id, participantId: sequela.participantId, incidentId: sequela.incidentId, key: 'deadline-foot', kind: 'loss', part: 'foot', label: 'Perte : pied (chirurgie manquée)', source: clone(sequela.source), startDay: state.calendar.currentDay, status: 'permanent', side, relearned: 0, history: [] };
    if (lossCollision(next, made, side)) return refusal('part-already-lost');
    next.sequelae.push(made);
  }
  return commit(next, receipt(state, operationId, 'surgery-deadline', 'applied', footLost ? 'foot-lost-confirmed' : 'foot-loss-waived', { sequelaId }));
}

/** p.178 : 100 PX dépensés retirent 1 DR de la pénalité de l'autre main. */
export function recordRelearning(stateValue, { operationId, expectedRevision, sequelaId, hundredsOfXp } = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'relearning', 'refused', reason, { sequelaId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  const sequela = (state.sequelae || []).find(row => row.id === sequelaId);
  if (!sequela || sequela.kind !== 'loss' || !UPPER.has(sequela.part) || sequela.primary !== true || sequela.status !== 'permanent') return refusal('unknown-sequela');
  if (!Number.isSafeInteger(hundredsOfXp) || hundredsOfXp < 1 || sequela.relearned + hundredsOfXp > 2) return refusal('invalid-test-facts');
  const next = clone(state);
  next.sequelae.find(row => row.id === sequelaId).relearned += hundredsOfXp;
  return commit(next, receipt(state, operationId, 'relearning', 'applied', 'hand-relearned', { sequelaId, relearned: sequela.relearned + hundredsOfXp }));
}

/** p.178 : « et que le MJ est d'accord » : les cicatrices impressionnantes sont une décision explicite du MJ pour un personnage. */
export function decideImpressiveScars(stateValue, { operationId, expectedRevision, participantId, agreed } = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason => result(state, receipt(state, operationId, 'scar-decision', 'refused', reason, { participantId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  if (!ID(participantId) || typeof agreed !== 'boolean') return refusal('decision-required');
  const next = clone(state);
  next.sequelae ??= [];
  const id = `scars:${participantId}`;
  const existing = next.sequelae.find(row => row.id === id);
  if (existing) { existing.agreed = agreed; existing.decidedDay = state.calendar.currentDay; }
  else next.sequelae.push({ id, participantId, kind: 'scar-decision', label: 'Cicatrices impressionnantes', status: 'permanent', agreed, decidedDay: state.calendar.currentDay, history: [] });
  return commit(next, receipt(state, operationId, 'scar-decision', 'applied', agreed ? 'scars-agreed' : 'scars-declined', { participantId }));
}

/** p.177 : la caractéristique de base baisse d'abord ; à 0, les Avancements achetés sont retirés. */
export function splitCharacteristicLoss({ base, advances, amount }) {
  if (![base, advances].every(Number.isSafeInteger) || base < 0 || advances < 0) return null;
  const toBase = Math.min(base, amount);
  const toAdvances = Math.min(advances, base - toBase === 0 ? amount - toBase : 0);
  return { appliedToBase: toBase, appliedToAdvances: toAdvances, base: base - toBase, advances: advances - toAdvances };
}

export function recordCharacteristicLoss(stateValue, { operationId, expectedRevision, participantId, carac, amount, base = null, advances = null, reason } = {}) {
  const state = assertState(stateValue);
  const prior = priorReceipt(state, operationId);
  if (prior) return { state: clone(state), receipt: prior };
  const refusal = reason2 => result(state, receipt(state, operationId, 'characteristic-loss', 'refused', reason2, { participantId }));
  if (expectedRevision !== state.revision) return refusal('revision-conflict');
  if (!ID(participantId) || !ID(carac) || !ID(reason)) return refusal('invalid-facts');
  if (!Number.isSafeInteger(amount) || amount < 1) return refusal('invalid-facts');
  const split = base === null && advances === null ? null : splitCharacteristicLoss({ base, advances, amount });
  if ((base !== null || advances !== null) && !split) return refusal('invalid-facts');
  const applied = split ? split.appliedToBase + split.appliedToAdvances : amount;
  const next = clone(state);
  next.sequelae ??= [];
  next.sequelae.push({ id: `characteristic-loss:${operationId}`, participantId, kind: 'characteristic-loss', label: `Perte de ${carac}`, status: 'permanent', carac, requested: amount, applied, split, reason: reason.trim(), day: state.calendar.currentDay, history: [] });
  return commit(next, receipt(state, operationId, 'characteristic-loss', 'applied', 'characteristic-loss-recorded', { participantId, carac, applied, split }));
}

/**
 * Séquelles d'un incident qui ne sont pas terminées (vide = suivi J2 terminé). `ctx` apporte les faits que le registre ne voit pas :
 * l'état de l'amputation F2-I et les maladies du registre.
 */
export function sequelaeOutstanding(state, incidentId, { planned = [], amputation = 'none' } = {}) {
  const incident = findIncident(state, incidentId);
  const day = state.calendar.currentDay;
  const out = planned.filter(item => !(state.sequelae || []).some(row => row.id === item.id)).map(item => ({ sequelaId: item.id, label: item.label, reason: 'not-opened' }));
  for (const s of (state.sequelae || []).filter(row => row.incidentId === incidentId)) {
    const phase = sequelaPhase(s, day);
    const note = reason => out.push({ sequelaId: s.id, label: s.label, reason });
    if (s.status === 'needs-facts') { note('needs-facts'); continue; }
    switch (s.kind) {
      case 'broken-bone': if (!['healed', 'permanent'].includes(s.status)) note(phase === 'healing' ? 'healing' : 'awaiting-test'); break;
      case 'torn-muscle': if (phase !== 'healed') note('healing'); break;
      case 'reset-limb': if (s.status !== 'healed') note('open'); break;
      case 'medical-attention': if (!incident?.treatments.some(item => ['heal', 'animal-care'].includes(item.kind) && item.success === true)) note('medical-attention-needed'); break;
      case 'surgery-deadline': if (!['resolved', 'waived'].includes(s.status) && !incident?.treatments.some(item => item.kind === 'surgery' && item.succeeded === true && item.day <= s.deadlineDay)) note(day > s.deadlineDay ? 'deadline-missed' : 'surgery-needed'); break;
      case 'disease': if (!(state.diseases || []).some(row => row.sequelaId === s.id && row.status === 'ended')) note('disease-active'); break;
      case 'post-encounter-test': if (s.status === 'open' || (s.status === 'failed' && amputation === 'pending')) note(s.status === 'open' ? 'test-needed' : 'amputation-decision-pending'); break;
      default: break;
    }
  }
  return out;
}

/** Ce qu'un saut de `days` jours fait arriver : fins de guérison à tester, phases qui changent, échéances de chirurgie. */
export function previewSequelaeAdvance(state, days) {
  const from = state.calendar.currentDay, to = from + days, events = [];
  for (const s of (state.sequelae || []).filter(row => row.status === 'open')) {
    if (s.kind === 'broken-bone' && s.endDay > from && s.endDay <= to) events.push({ sequelaId: s.id, participantId: s.participantId, day: s.endDay, kind: 'fracture-heals', label: s.label, testNeeded: !(s.immobilization?.state === 'bound' && s.immobilization.waiver) });
    if (s.kind === 'torn-muscle') {
      if (s.partialDay > from && s.partialDay <= to) events.push({ sequelaId: s.id, participantId: s.participantId, day: s.partialDay, kind: 'tear-eases', label: s.label });
      if (s.endDay > from && s.endDay <= to) events.push({ sequelaId: s.id, participantId: s.participantId, day: s.endDay, kind: 'tear-heals', label: s.label });
    }
    if (s.kind === 'surgery-deadline' && s.deadlineDay >= from && s.deadlineDay < to) events.push({ sequelaId: s.id, participantId: s.participantId, day: s.deadlineDay + 1, kind: 'surgery-deadline-passes', label: s.label });
    if (s.kind === 'broken-bone' && s.immobilization?.state === 'unbound' && s.immobilization.rebindDeadline >= from && s.immobilization.rebindDeadline < to) events.push({ sequelaId: s.id, participantId: s.participantId, day: s.immobilization.rebindDeadline + 1, kind: 'rebind-window-passes', label: s.label });
  }
  return events.sort((a, b) => a.day - b.day);
}

/** Décisions en attente au jour courant : tests de fin de guérison, échéances manquées, faits manquants. */
export function pendingSequelaDecisions(state) {
  const day = state.calendar.currentDay, out = [];
  for (const s of state.sequelae || []) {
    if (s.status === 'needs-facts') out.push({ sequelaId: s.id, participantId: s.participantId, kind: 'needs-facts', label: s.label, missing: s.missing });
    else if (s.kind === 'broken-bone' && sequelaPhase(s, day) === 'awaiting-test') out.push({ sequelaId: s.id, participantId: s.participantId, kind: 'fracture-final-test', label: s.label });
    else if (s.kind === 'surgery-deadline' && s.status === 'open' && day > s.deadlineDay) out.push({ sequelaId: s.id, participantId: s.participantId, kind: 'surgery-deadline-missed', label: s.label });
    else if (s.kind === 'post-encounter-test' && s.status === 'open') out.push({ sequelaId: s.id, participantId: s.participantId, kind: 'post-encounter-test', label: s.label });
  }
  return out;
}
