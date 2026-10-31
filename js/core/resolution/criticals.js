import { clone } from './common.js';
import { getLocationName } from '../dice.js';
import { appendageCriticalLocation, deriveHitMorphology, resolveCreatureHitLocation } from '../v5-hit-morphology.js';
import { reverseV5Roll } from '../v5-roll.js';
import { getV5CriticalEffect, V5_CRITICAL_TABLE_VERSION } from '../../data/v5-crits.js';
import { createCriticalAftermathRecord, updateCriticalDeathCountdown } from '../v5-critical-aftermath.js';
import { locationProtection } from '../equipment.js';

export function locationSide(name) {
  if (/gauche/i.test(name)) return 'left';
  if (/droit/i.test(name)) return 'right';
  return null;
}

export function locationOf(roll) {
  const named = getLocationName(roll);
  return { roll, ...named, side: locationSide(named.name) };
}
export function creatureLocationOf(roll, target, context = {}) {
  const baseLocation = locationOf(roll);
  return resolveCreatureHitLocation({ roll: baseLocation.roll, morphology: context.hitMorphology !== undefined ? context.hitMorphology : deriveHitMorphology(target), spiderLegSide: context.spiderLegSide, baseLocation });
}
export const criticalTableLocation = (location, context = {}) => context.hitAppendage ? appendageCriticalLocation(location, context.hitAppendage) : location;
export const CALLED_SHOT_LOCATIONS = Object.freeze({ head: { key: 'HEAD', name: 'Tête', side: null }, body: { key: 'BODY', name: 'Corps', side: null },
  leftArm: { key: 'ARM', name: 'Bras Gauche', side: 'left' }, rightArm: { key: 'ARM', name: 'Bras Droit', side: 'right' },
  leftLeg: { key: 'LEG', name: 'Jambe Gauche', side: 'left' }, rightLeg: { key: 'LEG', name: 'Jambe Droite', side: 'right' } });
export function attackLocation(normalized, roll, target) {
  const context = normalized.v5.context || {};
  if (context.calledShot !== true) {
    return creatureLocationOf(reverseV5Roll(roll), target, context);
  }
  const selected = CALLED_SHOT_LOCATIONS[context.calledShotLocation];
  return selected ? { roll: null, ...selected, calledShot: true } : null;
}

/** Bonus de gravité des couches divines actives de celui qui INFLIGE le critique (ex. Morsure du loup) ; les critiques subis ne les lisent pas. */
export const divineCriticalSeverityBonus = inflicter => (inflicter?.extensions?.v5?.divineEffects || [])
  .reduce((sum, layer) => sum + (Number(layer?.criticalSeverityBonus) || 0), 0);

/** V5 severity: entered d100 plus +10 per excess Wound; no global cap at 100. */
export function criticalSeverity(location, base, severityBonus, { inoffensive = false, alternative = null } = {}) {
  const bonus = Number(severityBonus) || 0;
  const needsAlternative = inoffensive && alternative === null;
  const effectRollBase = needsAlternative || base === undefined || base === null ? null : inoffensive ? Math.min(base, alternative) : base;
  const effectRoll = effectRollBase === null ? null : effectRollBase + bonus;
  const found = location && effectRoll !== null ? getV5CriticalEffect(location.key, effectRoll) : null;
  const effect = found ? clone(found) : null;
  return { effectRollBase, bonus, effectRoll, effect, needsAlternative, ...(inoffensive ? { effectRollCandidates: [base ?? null, alternative], effectAlternativeRoll: alternative } : {}), tableVersion: V5_CRITICAL_TABLE_VERSION, parsed: effect ? clone(effect.parsed) : null };
}

export function criticalDetails(rolls, location, acharnement, inoffensive = false) {
  const severity = criticalSeverity(location, rolls?.effect, acharnement, { inoffensive, alternative: rolls?.effectAlternative ?? null });
  return {
    pending: !location || severity.effectRoll === null,
    needsLocation: !location,
    locationRoll: location?.roll ?? null,
    location,
    ...severity
  };
}

/** Excess damage triggers a separate Critical Wound at the ordinary hit location. */
export function secondCritical(reversed, rolls, acharnement, inoffensive = false, ordinaryLocation = null) {
  const location = ordinaryLocation || locationOf(reversed);
  const severity = criticalSeverity(location, rolls?.secondEffect, acharnement, { inoffensive, alternative: rolls?.secondEffectAlternative ?? null });
  return { locationRoll: location.roll, location, ...severity, pending: severity.effectRoll === null };
}

export const criticalItemLabel = (key, name, level) => key === 'a-terre' ? name : `${name} ${level}`;

/** Effets proposés (Blessures en plus, états simples) de chaque critique, cochés sauf s'ils sont déclinés. */
export function criticalItems(first, second, declined) {
  const items = [];
  [['first', first], ['second', second]].forEach(([crit, part]) => {
    const parsed = part?.parsed;
    if (!parsed) return;
    const push = item => items.push({ ...item, crit, applied: !declined.includes(item.id) });
    if (parsed.extraWounds > 0) {
      const amount = parsed.extraWounds;
      push({ id: `${crit}-wounds`, kind: 'wounds', label: `+${amount} Blessure${amount > 1 ? 's' : ''}`, amount });
    }
    parsed.states.forEach(condition => {
      const { key, name, level } = condition;
      push({ id: `${crit}-state-${key}`, kind: 'state', label: criticalItemLabel(key, name, level), level, key, name, condition: clone(condition) });
    });
  });
  return items;
}

/** Somme des items appliqués : `{ extraWounds, states: [{ key, name, level }] }`. */
export function criticalApplication(items) {
  const application = { extraWounds: 0, states: [] };
  items.filter(item => item.applied).forEach(item => {
    if (item.kind === 'wounds') { application.extraWounds += item.amount; return; }
    application.states.push(clone(item.condition || { key: item.key, name: item.name, level: item.level }));
  });
  return application;
}

/** Registre des Blessures Critiques d'attaque : un enregistrement stable par critique appliqué (principal puis secondaire). */
export function appendCriticalWoundRecords(participant, criticals, { resolutionId, authorId, round, beforeStates = [], source='attack' }) {
  const present = (criticals || []).filter(detail => detail && !detail.pending);
  if (!present.length) return;
  const previousIds = new Set(beforeStates.map(state => state.id));
  const added = (participant.states || []).filter(state => !previousIds.has(state.id));
  const criticalStates = added.filter(state => state.source?.kind === 'critical');
  const stateIds = criticalStates.length ? added.filter(state => state.source?.kind === 'critical' || ['stunned-over-toughness', 'stunned-ended'].includes(state.source?.kind)).map(state => state.id) : [];
  participant.extensions ??= {};
  participant.extensions.v5 ??= {};
  participant.extensions.v5.criticalWounds = [...(participant.extensions.v5.criticalWounds || []),
    ...present.map((detail, index) => ({ id: `${resolutionId}:crit:${participant.id}:${index}`, source,
      location: detail.location?.name ?? null, name: detail.effect?.name ?? null, effectRoll: detail.effectRoll ?? null,
      // Les acquisitions des deux critiques sont groupées : leurs États communs sont rattachés au premier enregistrement.
      round, resolutionId, authorId, stateIds: index === 0 ? stateIds.filter(id => !criticalStates.some(state => state.id === id)) : [] }))];
  // Chaque critique reçoit ses propres États (par clé de la table) ; ce qui n'est rattachable à aucun reste sur le premier enregistrement.
  const unclaimed = [...criticalStates], claimed = new Map();
  present.forEach((detail,index)=>{
    const table=detail.location?.key,effectRoll=detail.effectRoll;
    if(!table||!Number.isSafeInteger(effectRoll))return;
    const stored=createCriticalAftermathRecord(participant,{table,effectRoll,location:detail.location?.name||table,resolutionId,criticalIndex:index,authorId,round});
    if(stored.status==='applied')Object.assign(participant,stored.participant);
    const own = [];
    for (const wanted of stored.record?.sequela?.states || []) {
      const at = unclaimed.findIndex(state => state.key === wanted.key);
      if (at >= 0) own.push(unclaimed.splice(at, 1)[0].id);
    }
    claimed.set(index, own);
  });
  participant.extensions.v5.criticalWounds = participant.extensions.v5.criticalWounds.map(row => {
    const index = present.findIndex((detail, i) => row.id === `${resolutionId}:crit:${participant.id}:${i}`);
    if (index < 0) return row;
    const extra = index === 0 ? unclaimed.map(state => state.id) : [];
    return { ...row, stateIds: [...row.stateIds, ...(claimed.get(index) || []), ...extra] };
  });
  const numericCarac=value=>((typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isFinite(Number(value)))?Number(value):null;
  const roundNumber=Number.isSafeInteger(round)?round:null,rawBe=numericCarac(participant.caracs?.BE),endurance=numericCarac(participant.caracs?.E),be=rawBe!==null&&Number.isSafeInteger(rawBe)&&rawBe>=0?rawBe:endurance!==null&&endurance>=0?Math.floor(endurance/10):null;
  if(roundNumber!==null&&be!==null){const countdown=updateCriticalDeathCountdown(participant,{round:roundNumber,toughnessBonus:be});if(countdown.participant)Object.assign(participant,countdown.participant);}
}

/** Perte de PV proposée par un aperçu : dégâts de l'arme + Blessures en plus des critiques cochés. */
export function previewHpLoss(preview) {
  return (Number(preview?.damage?.finalDamage) || 0) + (Number(preview?.critical?.application?.extraWounds) || 0);
}

/** Resolve and compare through the same pure V5 action calculation. No random draw. */
// Incidental damage (fumbles, detonations) has no attack roll: Weak Points and
// Partial need one, so they are read as a non-critical hit and fall back to the
// piece's printed AP instead of silently counting no armour at all.
export function incidentalArmour(participant, location) {
  const guard=locationProtection(participant,{location,critical:false,ranged:false,defenseProvided:false});
  return guard.ap??guard.baseAp??0;
}
