import { creatureSizeOf } from './creature-size.js';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fold = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const v5 = participant => participant?.extensions?.v5 || {};

export const V5_RIDE_SKILL_ID = 'skill-43_68_65_76_61_75_63_68_65_72-base';
export const V5_ROUGHRIDER_TALENT_ID = 'talent-roughrider';
export const V5_TRICK_RIDER_TALENT_ID = 'talent-trick-rider';
export const MOUNT_LINK_FIELD = 'mountId';

/** Resolve the durable rider -> mount reference without matching by name or profile template. */
export function resolveMountedMount(rider, participants = []) {
  if (!isRecord(rider)) return { mounted: false, mount: null, unresolved: ['Participant cavalier invalide.'] };
  if (v5(rider).mounted !== true) return { mounted: false, mount: null, unresolved: [] };
  const mountId = v5(rider)[MOUNT_LINK_FIELD];
  if (typeof mountId !== 'string' || !mountId.trim()) {
    return { mounted: true, mount: null, unresolved: ['Monture liée requise pour appliquer le combat monté.'] };
  }
  const mount = (Array.isArray(participants) ? participants : []).find(row => row?.id === mountId);
  if (!mount) return { mounted: true, mount: null, unresolved: ['Monture liée introuvable dans les participants actifs.'] };
  if (mount.id === rider.id) return { mounted: true, mount: null, unresolved: ['Un participant ne peut pas être sa propre monture.'] };
  if (mount.zone !== 'active') return { mounted: true, mount: null, unresolved: ['La monture liée doit être active dans la rencontre.'] };
  return { mounted: true, mount, unresolved: [] };
}

const participantSize = (participant, explicitChoice) => {
  if (typeof explicitChoice === 'string' && explicitChoice.trim()) return creatureSizeOf({ size: explicitChoice.trim() });
  return creatureSizeOf(participant);
};

const sizeComparison = (larger, smaller, largerChoice, smallerChoice) => {
  const a = participantSize(larger, largerChoice), b = participantSize(smaller, smallerChoice);
  if (a.assumed || b.assumed) return { result: null, unresolved: ['Choisir explicitement la taille du cavalier, de la cible ou de la monture avant de calculer cette règle.'] };
  return { result: a.rank > b.rank ? 1 : a.rank < b.rank ? -1 : 0, unresolved: [] };
};

const reachRank = value => {
  const key = fold(value);
  if (['long', 'longue'].includes(key)) return 1;
  if (['treslong', 'treslongue', 'verylong'].includes(key)) return 2;
  if (['massive', 'considerable'].includes(key)) return 3;
  if (['trescourte', 'veryshort', 'courte', 'short', 'personnelle', 'personal', 'moyen', 'moyenne', 'average'].includes(key)) return 0;
  return null;
};

const source = (id, label) => ({ id, label });

/** Situation modifiers for an attack involving a mounted attacker and/or rider target.
 * `sizeChoices` may explicitly supply `actor`, `target`, `actorMount`, or `targetMount` size keys.
 */
export function planMountedAttack({ actor, target, actorMount = null, targetMount = null, weapon, kind = 'melee', sizeChoices = {} } = {}) {
  const actorMounted = v5(actor).mounted === true;
  const targetMounted = v5(target).mounted === true;
  const plan = { active: actorMounted || targetMounted, advantageSources: [], disadvantageSources: [], unresolved: [] };
  if (!plan.active) return plan;

  const category = fold(weapon?.category);
  const melee = kind === 'melee';
  if (melee && actorMounted && ['cavalerie', 'cavalry'].includes(category) && v5(actor).mountId && !isRecord(actorMount)) {
    if (!isRecord(actorMount)) plan.unresolved.push('Monture de l’attaquant montée requise pour une arme de cavalerie.');
  }
  // A legacy mounted flag can exist without a declared mount link. Keep ordinary
  // attacks resolvable in that case; never invent a mount or size comparison.
  // When a mount was explicitly linked but cannot be resolved, require correction.
  if (melee && targetMounted && !isRecord(targetMount) && v5(target).mountId) {
    plan.unresolved.push('Monture liée de la cible montée introuvable pour résoudre l’attaque contre le cavalier.');
  }
  if (plan.unresolved.length) return plan;

  if (melee && actorMounted && isRecord(actorMount) && ['cavalerie', 'cavalry'].includes(category)) {
    const comparison = sizeComparison(actorMount, target, sizeChoices.actorMount, sizeChoices.target);
    plan.unresolved.push(...comparison.unresolved);
    if (comparison.result === 1) plan.advantageSources.push(source('mounted:cavalry-against-smaller', 'Arme de cavalerie contre une cible plus petite que la monture'));
  }

  if (melee && targetMounted && isRecord(targetMount)) {
    const comparison = sizeComparison(targetMount, actor, sizeChoices.targetMount, sizeChoices.actor);
    plan.unresolved.push(...comparison.unresolved);
    if (comparison.result === 1) {
      const reach = reachRank(weapon?.reach);
      if (reach === null) plan.unresolved.push('Allonge de l’arme requise pour attaquer un cavalier protégé par sa monture.');
      else if (reach < 1) plan.disadvantageSources.push(source('mounted:protected-rider', 'Cavalier visé, attaquant plus petit que la monture'));
    }
  }
  return plan;
}

/** V5 p. 168: Trick Rider is the sole mounted-Dodge exemption. */
export function planMountedDodge(participant) {
  if (v5(participant).mounted !== true) return { disadvantageSources: [] };
  const hasTrickRider = (Array.isArray(participant?.talents) ? participant.talents : [])
    .some(talent => talent?.id === V5_TRICK_RIDER_TALENT_ID && talent.status === 'resolved');
  return { disadvantageSources: hasTrickRider ? [] : [source('mounted:dodge', 'Esquive à cheval')] };
}

/** Horse strength may replace the rider's BF only for a mounted charge, and by player choice. */
export function planMountedChargeDamage({ actor, mount, charging = false, useMountStrengthBonus = false } = {}) {
  if (!charging || v5(actor).mounted !== true) return { available: false, useMountStrengthBonus: false, strengthBonus: null, unresolved: [] };
  if (useMountStrengthBonus !== true) return { available: false, useMountStrengthBonus: false, strengthBonus: null, unresolved: [] };
  if (!isRecord(mount)) return { available: false, useMountStrengthBonus: false, strengthBonus: null, unresolved: ['Monture liée requise pour employer sa Force en charge.'] };
  const rawForce = mount.caracs?.F;
  const force = Number(rawForce);
  if (rawForce === null || rawForce === undefined || (typeof rawForce === 'string' && rawForce.trim() === '') || !Number.isFinite(force)) {
    return { available: false, useMountStrengthBonus: false, strengthBonus: null, unresolved: ['Force de la monture requise pour employer sa BF en charge.'] };
  }
  return { available: true, useMountStrengthBonus: true, strengthBonus: Math.floor(force / 10), unresolved: [] };
}

const hasTrait = (traits, names) => (Array.isArray(traits) ? traits : []).some(raw => {
  const name = typeof raw === 'string' ? raw : raw?.name ?? raw?.nom ?? '';
  const parameter = typeof raw === 'object' ? raw?.param ?? raw?.parameter : '';
  return names.has(fold(name)) || names.has(fold(parameter));
});

/** One distinct mounted rider event per concurrent state family. Incapacitation remains the sole automatic fall trigger. */
export function mountedRiderEventsFor(keys = []) {
  const values = [...keys];
  if (values.some(key => ['inconscient','unconscient','aterre','prone'].includes(key))) return ['rider-prone'];
  return [
    ...(values.some(key => ['surpris','surprised'].includes(key)) ? ['rider-surprised'] : []),
    ...(values.some(key => ['sonne','stunned'].includes(key)) ? ['rider-stunned'] : [])
  ];
}

/** Legacy participant-level answers are safe only when that rider has a single Ride Test. */
export function mountedRideAnswerFor({ participantId, event, requiredPlanCount = 1, answersById = {} } = {}) {
  const participantAnswers = answersById?.[participantId];
  if (!participantAnswers || typeof participantAnswers !== 'object' || Array.isArray(participantAnswers)) return {};
  const eventAnswer = participantAnswers[event];
  if (eventAnswer && typeof eventAnswer === 'object' && !Array.isArray(eventAnswer)) return eventAnswer;
  return requiredPlanCount <= 1 ? participantAnswers : {};
}

/** Fall trigger and required Ride test. Applying the fall remains a Store/MJ decision. */
export function planMountedFall({ event, restraint = null, riderEntangled = false, mountTraits = [], fallPreventedByEquipment = false } = {}) {
  if (fallPreventedByEquipment === true && ['rider-dead', 'rider-unconscious', 'rider-prone'].includes(event)) {
    return { falls: false, requiredTest: null, opposedStrengthSize: null, dismount: false };
  }
  const automatic = ['rider-dead', 'rider-unconscious', 'rider-prone', 'mount-dead', 'mount-unconscious', 'mount-prone'].includes(event);
  if (automatic) return { falls: true, requiredTest: null, opposedStrengthSize: null, dismount: true };

  let modifier = null, purpose = 'stay-mounted';
  if (event === 'rider-surprised') modifier = 4;
  else if (event === 'rider-stunned') modifier = 0;
  else if (event === 'mount-surprised' && hasTrait(mountTraits, new Set(['skittish', 'craintif']))) modifier = 4;
  else if (event === 'rider-restrained' && ['held', 'anchored'].includes(restraint)) purpose = 'keep-saddle-and-use-mount-size', modifier = 0;
  else if (event === 'mount-entangled' && riderEntangled !== true && hasTrait(mountTraits, new Set(['skittish', 'craintif']))) modifier = 0;

  const requiredTest = modifier === null ? null : { skillId: V5_RIDE_SKILL_ID, modifier, purpose };
  return {
    falls: false,
    requiredTest,
    opposedStrengthSize: requiredTest?.purpose === 'keep-saddle-and-use-mount-size' ? 'mount' : null,
    dismount: requiredTest === null ? false : 'on-failed-test'
  };
}
