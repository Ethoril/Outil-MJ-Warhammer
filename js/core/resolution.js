import { locationProtection, mergeEquipmentQualities, ammunitionCompatibility, equipmentAttackContext } from './equipment.js';
import { keywordMechanicalStatus } from './keywords.js';
import { getReferenceStatus, getReferenceCatalogue } from './reference-catalog.js';
import { ENGINES } from '../data/keyword-engines.js';
/** Pure E12 action resolution. It never reads DOM, mutates a Store or rolls implicitly. */
import {
  getLocationName
} from './dice.js';
import { isCriticalRoll, isFumbleRoll } from './roll-qualities.js';
import { actionHasDamage, actionWeaponDamage, computeDamage, evaluateWeaponDamage, formatDamageFormula, formatWeaponDamage, strengthBonusOf } from './damage.js';
import { normalizeQualities } from './quality-normalization.js';
import { acquireV5Conditions } from './v5-effects.js';
import { selectV5Test, resolveV5Opposition, reverseV5Roll } from './v5-roll.js';
import { buildV5RollDecision } from './v5-decision.js';
import { previewMomentumEvents } from './v5-momentum.js';
import { buildCombatTest, hasMomentum, withMomentum, conditionLevels, v5ShieldDefense, V5_COMBAT_RULE_VERSION } from './v5-combat-rules.js';
import { evaluateV5Talents, previewV5TalentConditions, currentV5TalentHashes, V5_TALENT_IDS } from './v5-talents.js';
import { getV5CriticalEffect, V5_CRITICAL_TABLE_VERSION } from '../data/v5-crits.js';
import { previewV5ActionQualities, previewV5WeaponConditions, v5QualityMechanicalStatus } from './v5-talent-qualities.js';

export { damageBreakdown, formatDamageFormula, formatWeaponDamage, describeWeaponDamage } from './damage.js';

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const signedValue = value => { const number = Number(value) || 0; return number < 0 ? `−${Math.abs(number)}` : `+${number}`; };
const knownHp = actor => actor?.hp !== null && actor?.hp !== undefined && actor?.hp !== '' && Number.isFinite(Number(actor.hp));
const DETAIL_TYPE_LABELS = { attack: 'Attaque', skill: 'Compétence', defense: 'Défense', opposition: 'Opposition' };

/** « gravité 43 + 10 = 53 → Côtes fracturées » ; « gravité non tirée » tant que le d100 manque. */
function describeSeverity(part) {
  const base = part.effectRollBase ?? part.effectRoll;
  if (base === null || base === undefined) return 'gravité non tirée';
  const roll = part.bonus ? `${base} + ${part.bonus} = ${part.effectRoll}` : `${part.effectRoll}`;
  return `gravité ${roll}${part.effect?.name ? ` → ${part.effect.name}` : ''}`;
}

/** Phrases du journal pour un critique ; les anciennes entrées (sans localisation) restent « Coup critique ». */
function describeCritical(detail) {
  const critical = detail.critical;
  if (!critical) return [];
  const first = critical.details;
  if (!isRecord(first) && critical.second) {
    const second = critical.second;
    return [`Critique d’excédent : ${second.location.name} · ${describeSeverity(second)}`, ...(second.parsed?.reminders || []).map(text => `À arbitrer : ${text}`)];
  }
  if (!isRecord(first) || !isRecord(first.location) || first.locationRoll === null || first.locationRoll === undefined) {
    return [detail.actionType && detail.actionType !== 'attack' ? 'Réussite critique' : 'Coup critique'];
  }
  const parts = [`Critique : localisation ${first.locationRoll} → ${first.location.name} · ${describeSeverity(first)}`];
  const second = critical.second;
  if (isRecord(second) && isRecord(second.location)) {
    parts.push(`Critique d’excédent : ${second.location.name} · ${describeSeverity(second)}`);
  }
  const application = critical.application;
  if (isRecord(application)) {
    const applied = [
      ...(application.extraWounds ? [`+${application.extraWounds} Blessure${application.extraWounds > 1 ? 's' : ''}`] : []),
      ...(Array.isArray(application.states) ? application.states.map(state => state.key === 'a-terre' ? state.name : `${state.name} ${state.level}`) : [])
    ];
    if (applied.length) parts.push(`Effets appliqués : ${applied.join(', ')}`);
  }
  const parsed = [first, second].map(part => part?.parsed).filter(isRecord);
  const reminders = parsed.flatMap(item => Array.isArray(item.reminders) ? item.reminders : []);
  if (reminders.length) parts.push(`À arbitrer : ${reminders.join(' ; ')}`);
  if (parsed.some(item => item.death)) parts.push('Mort instantanée');
  if (isRecord(critical.secondHint) && isRecord(critical.secondHint.location)) {
    parts.push(`Second critique possible au ${critical.secondHint.location.name} (jet inversé ${critical.secondHint.locationRoll})`);
  }
  return parts;
}

/**
 * Détail d'une entrée de journal de résolution en phrases courtes, sans clé
 * technique : les valeurs vides et les objets non reconnus sont omis.
 */
export function describeResolutionDetail(detail) {
  if (!isRecord(detail)) return [];
  const parts = [];
  const present = value => value !== null && value !== undefined;
  if (present(detail.actionType)) parts.push(`Type : ${DETAIL_TYPE_LABELS[detail.actionType] || detail.actionType}`);
  if (detail.ruleVersion) parts.push(`Règle : ${detail.ruleVersion}`);
  if (detail.test?.initialRoll != null && detail.test.initialRoll !== detail.roll) parts.push(`Jet initial : ${detail.test.initialRoll} · choix : ${detail.test.optionId}`);
  if (present(detail.roll)) parts.push(`Jet : ${detail.roll}`);
  if (present(detail.targetScore)) parts.push(`Seuil : ${detail.targetScore}`);
  if (present(detail.sl)) parts.push(`DR : ${signedValue(detail.sl)}${detail.slBonus ? ` (${detail.slBonus > 0 ? 'Pointue' : 'Imprécise'} ${signedValue(detail.slBonus)})` : ''}`);
  const opposition = isRecord(detail.opposition) && isRecord(detail.opposition.defender) ? detail.opposition : null;
  if (opposition) {
    const { label, score, roll } = opposition.defender;
    const hit = present(detail.hit) ? ` · ${detail.hit ? 'touché' : 'pas de touche'}` : '';
    parts.push(`Opposition : défense ${label} ${score} (d100 ${roll}) · DR net ${signedValue(opposition.netSl)}${hit}`);
  } else if (present(detail.hit)) parts.push(detail.hit ? 'Touché' : 'Pas de touche');
  // Ordinary damage and the Critical Wound have independent V5 locations.
  if (detail.location?.calledShot) parts.push('Coup ciblé : ' + detail.location.name);
  if (isRecord(detail.location) && present(detail.location.roll) && detail.location.name) parts.push(`Localisation : ${detail.location.roll} → ${detail.location.name}`);
  const damage = isRecord(detail.damage) ? formatDamageFormula(detail.damage) : '';
  if (damage) parts.push(`Dégâts : ${damage}`);
  const weapon = isRecord(detail.weapon) && detail.weapon.status === 'manual' ? formatWeaponDamage(detail.weapon) : '';
  if (weapon) parts.push(`Arme : ${weapon}`);
  parts.push(...describeCritical(detail));
  if (detail.defenderCritical) parts.push(...describeCritical({ actionType: 'attack', critical: detail.defenderCritical }).map(text => `Défenseur → attaquant : ${text}`));
  for (const change of detail.momentum || []) parts.push(`Élan (${change.participantId}) : ${change.before ? 'oui' : 'non'} → ${change.after ? 'oui' : 'non'}`);
  if (detail.damageReplacedByTalent) parts.push('Battement : toutes les Blessures et conséquences du critique remplacées ; la cible peut encore Esquiver.');
  for (const plan of detail.talentPlans || []) for (const proposal of plan.proposals || []) {
    if (proposal.op === 'modifyDamage') parts.push('Talent : +' + proposal.amount + ' Dégât (' + proposal.origins.map(origin => origin.talentId).join(', ') + ')');
    if (proposal.op === 'reduceConditionAcquisition') parts.push('Mâchoires d’acier : ' + proposal.amount + ' Sonné évité ; premier usage de la rencontre.');
  }
  for (const condition of detail.weaponConditions?.applied || []) parts.push('Assommante : ' + condition.level + ' état Sonné appliqué.');
  for (const reminder of detail.reminders || []) parts.push(reminder);
  if (detail.fumble) parts.push('Maladresse');
  // Read only the stored receipt: refreshing today's catalogue must never rewrite history.
  const shortVersion = value => String(value).split(':').map(part => /^[a-f0-9]{32,}$/i.test(part) ? part.slice(0, 12) : part).join(':');
  if (detail.referenceVersion) parts.push(`Référentiel utilisé : ${shortVersion(detail.referenceVersion)}`);
  const sourceAction = detail.action?.extensions?.fiche;
  if (sourceAction?.equipmentId) parts.push(`Arme de la fiche : ${detail.action.note || sourceAction.equipmentId} (exemplaire ${sourceAction.equipmentId})`);
  if (detail.ammunitionId) parts.push(`Munition : exemplaire ${detail.ammunitionId}`);
  for (const source of Array.isArray(detail.ammunitionSources) ? detail.ammunitionSources.filter(isRecord) : []) {
    parts.push(`${source.kind === 'ammunition' ? 'Munition' : 'Arme'} ${source.equipmentId} : ${source.keywordId}${source.parameter ? ` (${source.parameter})` : ''}`);
  }
  const protection = isRecord(detail.protection) ? detail.protection : null;
  const pieceName = item => item.name || item.item?.name || item.id || item.equipmentId || 'pièce';
  if (protection) {
    if (present(protection.ap)) parts.push(`Protection retenue : ${protection.ap} PA${protection.arbitrated ? ' (arbitrage MJ)' : ''}`);
    if (protection.counted?.length) parts.push(`Armures comptées : ${protection.counted.map(pieceName).join(', ')}`);
    if (protection.ignored?.length) parts.push(`Armures écartées : ${protection.ignored.map(pieceName).join(', ')}`);
    if (protection.shield?.name) parts.push(`Bouclier : ${protection.shield.name} · ${protection.shieldAp || 0} PA`);
  }
  for (const rule of Array.isArray(detail.mechanics) ? detail.mechanics.filter(isRecord) : []) {
    const origin = [rule.edition, rule.source].filter(Boolean).join(' · ');
    parts.push(`Règle ${rule.name || rule.id} : ${rule.status === 'covered' ? 'automatisée' : 'à arbitrer'}${origin ? ` · ${origin}` : ''}${rule.effectVersion ? ` · version ${shortVersion(rule.effectVersion)}` : ''}${rule.effect ? ` · ${rule.effect}` : ''}`);
  }
  return parts;
}
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const ATTACK_TYPES = new Set(['attack', 'attaque']);
const OPPOSITION_TYPES = new Set(['opposition', 'opposed']);
const SKILL_TYPES = new Set(['skill']);
const DEFENSE_TYPES = new Set(['defense']);
export const MAX_APPLIED_RESOLUTION_IDS = 500;

function safeSet(target, key, value) {
  Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
}

const clone = value => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone);
  const out = {};
  for (const [key, child] of Object.entries(value)) safeSet(out, key, clone(child));
  return out;
};

export class ResolutionError extends Error {
  constructor(message, code = 'INVALID_RESOLUTION', details = {}) {
    super(message);
    this.name = 'ResolutionError';
    this.code = code;
    this.details = details;
  }
}

function parseRoll(value) {
  if (typeof value === 'string' && value.trim() === '00') return 100;
  const roll = Number(value);
  if (!Number.isInteger(roll) || roll < 1 || roll > 100) {
    throw new ResolutionError('Le résultat d100 doit être compris entre 1 et 100', 'INVALID_ROLL', { value });
  }
  return roll;
}

function parseInteger(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function attackType(type) {
  return ATTACK_TYPES.has(String(type || '').trim().toLocaleLowerCase());
}

function participantById(state, id) {
  if (!isRecord(state) || !id) return null;
  if (Array.isArray(state.participants)) return state.participants.find(item => item?.id === id) || null;
  if (isRecord(state.participants)) return state.participants[id] || null;
  return null;
}

function participantListWithUpdate(state, id, update) {
  if (Array.isArray(state.participants)) {
    return state.participants.map(item => item?.id === id ? update : item);
  }
  const participants = clone(state.participants || {});
  safeSet(participants, id, update);
  return participants;
}

export function defaultResolutionId(actor, action, target, baseRevision, roll) {
  const actorId = actor?.id || 'actor';
  const actionId = action?.id || action?.actionId || action?.note || action?.type || 'action';
  const targetId = target?.id || 'none';
  return `resolution-${actorId}-${actionId}-${targetId}-r${baseRevision}-d${roll}`;
}

/** Canonicalize inputs without drawing a random value. */
export function normalizeResolutionInput(input = {}) {
  if (!isRecord(input)) throw new ResolutionError('Entrée de résolution invalide');
  const actor = isRecord(input.actor) ? clone(input.actor) : null;
  const action = isRecord(input.action) ? clone(input.action) : {};
  if (action.extensions?.fiche?.requiresLink) throw new ResolutionError('Lier une compétence à cette arme avant de résoudre son attaque', 'SKILL_LINK_REQUIRED');
  const target = isRecord(input.target) ? clone(input.target) : null;
  const roll = parseRoll(input.roll ?? input.dieRoll ?? input.enteredRoll);
  if (hasOwn(input, 'baseRevision') && (!Number.isInteger(input.baseRevision) || input.baseRevision < 0)) {
    throw new ResolutionError('baseRevision invalide', 'INVALID_REVISION', { value: input.baseRevision });
  }
  if (input.round !== undefined && (!Number.isSafeInteger(input.round) || input.round < 1)) {
    throw new ResolutionError('Round de résolution invalide', 'INVALID_ROUND', { value: input.round });
  }
  const baseRevision = input.baseRevision ?? 0;
  const type = String(action.type || 'test').trim().toLocaleLowerCase();
  const weaponItem = actor?.equipment?.find(item => item.id === action.extensions?.fiche?.equipmentId);
  const ammunition = actor?.equipment?.find(item => item.id === input.ammunitionId && item.kind === 'ammunition');
  if(input.ammunitionId && !ammunition) throw new ResolutionError('Munition déclarée introuvable', 'AMMUNITION_NOT_FOUND');
  if(ammunition){const compatibility=ammunitionCompatibility(weaponItem,ammunition);if(compatibility.status==='incompatible'||(compatibility.status==='manual'&&input.ammunitionArbitrated!==true))throw new ResolutionError('La compatibilité de cette munition avec cette arme doit être vérifiée', 'AMMUNITION_INCOMPATIBLE', compatibility);}
  const merged = ammunition && weaponItem ? mergeEquipmentQualities(weaponItem, ammunition) : null;
  const qualities = normalizeQualities(merged?.qualities || action.qualities || input.qualities || []);
  const resolutionId = String(input.resolutionId || input.id || defaultResolutionId(actor, action, target, baseRevision, roll));
  if (!resolutionId.trim()) throw new ResolutionError('resolutionId invalide');
  // Defender settings describe the Test actually chosen (Melee or Dodge).
  const defense = isRecord(input.defense) ? {
    ...(isRecord(input.defense.extensions) ? { extensions: clone(input.defense.extensions) } : {}),
    ...(typeof input.defense.type === 'string' ? { type: input.defense.type } : {}),
    ...(typeof input.defense.attr === 'string' ? { attr: input.defense.attr } : {}),
    roll: parseRoll(input.defense.roll),
    base: parseInteger(input.defense.base, 0),
    mod: parseInteger(input.defense.mod, 0),
    v5: isRecord(input.defense.v5) ? clone(input.defense.v5) : {},
    qualities: normalizeQualities(input.defense.qualities || []),
    label: typeof input.defense.label === 'string' && input.defense.label.trim() ? input.defense.label.trim() : 'CC'
  } : null;
  return {
    resolutionId,
    baseRevision,
    ...(input.round !== undefined ? { round: input.round } : {}),
    v5: isRecord(input.v5) ? clone(input.v5) : {},
    ...(isRecord(input.v5State) ? { v5State: clone(input.v5State) } : {}),
    v5Clock: isRecord(input.v5Clock) ? clone(input.v5Clock) : {},
    ...(isRecord(input.authorNextTurnEnd) ? { authorNextTurnEnd: clone(input.authorNextTurnEnd) } : {}),
    defenderCriticalRolls: normalizeCriticalRolls(input.defenderCriticalRolls),
    defenderCriticalDeclined: Array.isArray(input.defenderCriticalDeclined) ? input.defenderCriticalDeclined.map(String) : [],
    actor,
    action: {
      ...action,
      type,
      base: parseInteger(action.base, 0),
      mod: parseInteger(action.mod, 0),
      qualities
    },
    target,
    roll,
    criticalRolls: normalizeCriticalRolls(input.criticalRolls),
    attackContext: equipmentAttackContext(weaponItem),
    protectionContext: isRecord(input.protectionContext) ? clone(input.protectionContext) : {},
    ...(ammunition ? { ammunitionId: ammunition.id, ...(input.ammunitionArbitrated === true ? { ammunitionArbitrated: true } : {}), ammunitionSources: merged?.sources || [] } : {}),
    criticalDeclined: Array.isArray(input.criticalDeclined) ? input.criticalDeclined.map(String) : [],
    ...(defense ? { defense } : {})
  };
}

/** Jets de critique saisis : `location`, `effect` (gravité), `secondEffect` (gravité du second critique). */
function normalizeCriticalRolls(raw) {
  if (!isRecord(raw)) return null;
  const out = {};
  const read = (name, ...keys) => {
    const key = keys.find(item => raw[item] !== undefined && raw[item] !== null);
    if (key) out[name] = parseRoll(raw[key]);
  };
  read('location', 'location', 'locationRoll');
  read('effect', 'effect', 'effectRoll');
  read('secondEffect', 'secondEffect');
  read('effectAlternative', 'effectAlternative');
  read('secondEffectAlternative', 'secondEffectAlternative');
  return out;
}

/** Action type for the UI: explicit known type, else attack when it carries damage, else skill. */
export function inferActionType(action) {
  const type = String(action?.type || '').trim().toLocaleLowerCase();
  if (ATTACK_TYPES.has(type)) return 'attack';
  if (SKILL_TYPES.has(type)) return 'skill';
  if (DEFENSE_TYPES.has(type)) return 'defense';
  if (OPPOSITION_TYPES.has(type)) return 'opposition';
  return actionHasDamage(action) ? 'attack' : 'skill';
}

function locationSide(name) {
  if (/gauche/i.test(name)) return 'left';
  if (/droit/i.test(name)) return 'right';
  return null;
}

function locationOf(roll) {
  const named = getLocationName(roll);
  return { roll, ...named, side: locationSide(named.name) };
}
const CALLED_SHOT_LOCATIONS = Object.freeze({ head: { key: 'HEAD', name: 'Tête', side: null }, body: { key: 'BODY', name: 'Corps', side: null },
  leftArm: { key: 'ARM', name: 'Bras Gauche', side: 'left' }, rightArm: { key: 'ARM', name: 'Bras Droit', side: 'right' },
  leftLeg: { key: 'LEG', name: 'Jambe Gauche', side: 'left' }, rightLeg: { key: 'LEG', name: 'Jambe Droite', side: 'right' } });
function attackLocation(normalized, roll) {
  const context = normalized.v5.context || {};
  if (context.calledShot !== true) return locationOf(reverseV5Roll(roll));
  const selected = CALLED_SHOT_LOCATIONS[context.calledShotLocation];
  return selected ? { roll: null, ...selected, calledShot: true } : null;
}

/** V5 severity: entered d100 plus +10 per excess Wound; no global cap at 100. */
function criticalSeverity(location, base, severityBonus, { inoffensive = false, alternative = null } = {}) {
  const bonus = Number(severityBonus) || 0;
  const needsAlternative = inoffensive && alternative === null;
  const effectRollBase = needsAlternative || base === undefined || base === null ? null : inoffensive ? Math.min(base, alternative) : base;
  const effectRoll = effectRollBase === null ? null : effectRollBase + bonus;
  const found = location && effectRoll !== null ? getV5CriticalEffect(location.key, effectRoll) : null;
  const effect = found ? clone(found) : null;
  return { effectRollBase, bonus, effectRoll, effect, needsAlternative, ...(inoffensive ? { effectRollCandidates: [base ?? null, alternative], effectAlternativeRoll: alternative } : {}), tableVersion: V5_CRITICAL_TABLE_VERSION, parsed: effect ? clone(effect.parsed) : null };
}

function criticalDetails(rolls, location, acharnement, inoffensive = false) {
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
function secondCritical(reversed, rolls, acharnement, inoffensive = false, ordinaryLocation = null) {
  const location = ordinaryLocation || locationOf(reversed);
  const severity = criticalSeverity(location, rolls?.secondEffect, acharnement, { inoffensive, alternative: rolls?.secondEffectAlternative ?? null });
  return { locationRoll: location.roll, location, ...severity, pending: severity.effectRoll === null };
}

const criticalItemLabel = (key, name, level) => key === 'a-terre' ? name : `${name} ${level}`;

/** Effets proposés (Blessures en plus, états simples) de chaque critique, cochés sauf s'ils sont déclinés. */
function criticalItems(first, second, declined) {
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
function criticalApplication(items) {
  const application = { extraWounds: 0, states: [] };
  items.filter(item => item.applied).forEach(item => {
    if (item.kind === 'wounds') { application.extraWounds += item.amount; return; }
    application.states.push(clone(item.condition || { key: item.key, name: item.name, level: item.level }));
  });
  return application;
}

/** Perte de PV proposée par un aperçu : dégâts de l'arme + Blessures en plus des critiques cochés. */
export function previewHpLoss(preview) {
  return (Number(preview?.damage?.finalDamage) || 0) + (Number(preview?.critical?.application?.extraWounds) || 0);
}

/** Resolve and compare through the same pure V5 action calculation. No random draw. */
export function previewResolution(input) {
  const prepared = previewV5ActionQualities(normalizeResolutionInput(input));
  const normalized = prepared.normalized;
  normalized.qualityTalentPlan = prepared.plan;
  const actorPlan = buildCombatTest(normalized);
  const defenderPlan = normalized.defense ? buildCombatTest(normalized, 'defender') : null;
  const choose = (plan, choice) => selectV5Test(plan.test, choice || plan.test.options[0].id);
  const actorTest = choose(actorPlan, normalized.v5.choice);
  const defenderTest = defenderPlan ? choose(defenderPlan, normalized.defense.v5.choice) : null;
  const missingActorChoice = actorPlan.test.choiceRequired && !normalized.v5.choice;
  const missingDefenderChoice = defenderPlan?.test.choiceRequired && !normalized.defense.v5.choice;
  const result = resolvedV5Action(normalized, actorPlan, actorTest, defenderPlan, defenderTest);
  const consequence = (plan, test, otherPlan, otherTest, role, unknownOther) => {
    const option = role === 'actor' ? resolvedV5Action(normalized, plan, test, otherPlan, otherTest)
      : resolvedV5Action(normalized, otherPlan, otherTest, plan, test);
    const criticals = [option.critical, option.defenderCritical].filter(Boolean);
    const complete = !unknownOther && !option.unresolved.length && !option.mechanicalWarnings.length
      && !option.protection?.manual?.length && !criticals.some(critical => critical.details?.pending || critical.second?.pending)
      && (!option.hit || !option.attack || (option.damageReplacedByTalent || (option.damage && knownHp(normalized.target))));
    return { certainty: complete ? 'complete' : 'partial', hit: option.hit,
      location: option.location?.name || null,
      woundsLost: complete ? Math.min(Math.max(0, Number(normalized.target?.hp) || 0), previewHpLoss(option)) : null,
      importantEffects: criticals.map(critical => critical === option.defenderCritical ? 'Critique défensif sur l’attaquant' : 'Blessure critique sur la cible'),
      costs: normalized.v5.extraAttack ? ['Élan : 1 (payé avant le jet)'] : [], preview: option };
  };
  result.decisions = {
    actor: buildV5RollDecision(actorPlan.test, { baseRevision: normalized.baseRevision,
      evaluateOutcome: test => consequence(actorPlan, test, defenderPlan, defenderTest, 'actor', missingDefenderChoice) }),
    ...(defenderPlan ? { defender: buildV5RollDecision(defenderPlan.test, { baseRevision: normalized.baseRevision, recommendationPreference: 'min',
      evaluateOutcome: test => consequence(defenderPlan, test, actorPlan, actorTest, 'defender', missingActorChoice) }) } : {})
  };
  result.choiceRequired = Boolean(missingActorChoice || missingDefenderChoice);
  return result;
}

function resolvedV5Action(normalized, actorPlan, actorTest, defenderPlan, defenderTest) {
  const { actor, action, target } = normalized;
  const roll = actorTest.roll, targetScore = actorTest.score, success = actorTest.success, sl = actorTest.sl;
  const penalties = { value: actorPlan.penalty, names: actorPlan.penaltyStates };
  const slBonus = actorTest.details.modifiers.filter(item => item.id.startsWith('quality-')).reduce((sum, item) => sum + item.amount, 0);
  const doubled = actorTest.details.doubled;
  const criticalClassification = isCriticalRoll(roll, doubled, action.qualities);
  const fumbleClassification = isFumbleRoll(roll, doubled, action.qualities);
  const opposition = defenderTest ? resolveV5Opposition(actorTest, defenderTest) : null;
  const opposed = opposition ? { mode: 'opposed', attacker: { ...actorTest },
    defender: { ...defenderTest, label: normalized.defense.label, base: normalized.defense.base, mod: defenderTest.details.totalModifier, statePenalty: defenderPlan.penalty }, netSl: opposition.netSl,
    winner: opposition.winner === 'initiator' ? 'attacker' : 'defender', tie: opposition.tie } : null;
  const targetLevels = conditionLevels(target);
  const context = normalized.v5.context || {};
  const cannotDefend = targetLevels.has('surpris') || targetLevels.has('inconscient') || context.targetHelpless === true || context.targetCannotDefend === true;
  const helpless = (targetLevels.has('inconscient') || context.targetHelpless === true || context.targetCannotDefend === true)
    && (actorPlan.kind === 'melee' || (actorPlan.kind === 'ranged' && context.pointBlank === true));
  const hit = helpless && !opposed ? true : opposed ? opposed.winner === 'attacker' : success;
  const criticalAttack = attackType(action.type) && normalized.v5.context?.silentTakedown !== true && success && criticalClassification.critique;
  const criticalLocationRoll = normalized.criticalRolls?.location;
  const location = hit && attackType(action.type) ? attackLocation(normalized, roll) : null;
  const criticalLocation = criticalAttack && criticalLocationRoll != null ? locationOf(criticalLocationRoll) : null;
  const inoffensive = action.qualities.some(q => q.id === 'inoffensive') && keywordMechanicalStatus('inoffensive').status === 'covered';
  const talentContext = { kind: actorPlan.kind, aimed: normalized.v5.aimed,
    weapon: { isMelee: typeof normalized.attackContext?.ranged === 'boolean' ? !normalized.attackContext.ranged : actorPlan.kind === 'melee' },
    actor: { id: actor?.id, size: normalized.v5.actorSize }, target: { id: target?.id, size: normalized.v5.targetSize },
    attack: { success, hit: attackType(action.type) && context.silentTakedown !== true && hit, usedAdvantageV5: actorTest.advantage.net > 0 },
    authorNextTurnEnd: normalized.authorNextTurnEnd };
  const damageTalents = evaluateV5Talents(actor, { event: 'damage.beforeProtection', role: 'attacker', context: talentContext });
  const beatTalents = evaluateV5Talents(actor, { event: 'action.afterAttack', role: 'attacker', context: talentContext,
    choices: normalized.v5.talentChoices || {}, excludeTalents: [V5_TALENT_IDS.furiousAssault] });
  const damageBonus = damageTalents.proposals.filter(row => row.op === 'modifyDamage').reduce((sum, row) => sum + row.amount, 0);
  const replacement = beatTalents.proposals.find(row => row.op === 'replaceDamage');
  const activeEffects = beatTalents.proposals.filter(row => row.op === 'createActiveEffect').map(row => ({
    ...clone(row.timedEffect), id: normalized.resolutionId + ':' + row.key, key: row.key, name: 'Battement', level: 1, duration: null }));
  let criticalFirst = criticalAttack && !replacement ? criticalDetails(normalized.criticalRolls, criticalLocation, 0, inoffensive) : null;
  let damage = null;
  let protection = null;
  // Preserve every protection consulted, including pieces/criticals it suppresses.
  const protectionReceipts = [];
  const unresolved = [...actorPlan.unresolved, ...(defenderPlan?.unresolved || []), ...actorPlan.restrictions, ...(defenderPlan?.restrictions || [])];
  if (attackType(action.type) && context.calledShot === true && !CALLED_SHOT_LOCATIONS[context.calledShotLocation]) unresolved.push('Coup ciblé : préciser la localisation visée.');
  const actorSkillId = action.extensions?.fiche?.skillId ?? context.skillId;
  const actorSkill = context.silentTakedown === true ? getReferenceCatalogue().skills.find(row => row.id === actorSkillId) : null;
  const defenseSkillId = normalized.defense?.extensions?.fiche?.skillId ?? normalized.defense?.v5?.context?.skillId;
  const enduranceDefense = defenseSkillId ? defenseSkillId === 'skill-52_e9_73_69_73_74_61_6e_63_65-base' : /^(?:Résistance|Resistance|Endurance|E)$/iu.test(normalized.defense?.label || '');
  if (context.silentTakedown === true && (attackType(action.type) || actorPlan.kind !== 'melee' || actorSkill?.groupId !== 'skill-group-43_6f_72_70_73_20_e0_20_63_6f_72_70_73' || !defenderPlan || defenderPlan.kind !== 'test' || !enduranceDefense || context.outsideCombat !== true || context.targetUnaware !== true || context.calledShot === true)) unresolved.push('Neutralisation silencieuse : Test opposé Corps à corps/Résistance hors combat, cible inconsciente du danger et sans Coup ciblé requis ; conséquences spéciales à arbitrer.');
  for (const plan of [normalized.qualityTalentPlan, damageTalents, beatTalents].filter(Boolean)) unresolved.push(...plan.unresolved.flatMap(row => row.fields.map(field => 'Talent : préciser ' + field + '.')));
  if (attackType(action.type) && actorPlan.kind === 'melee' && !normalized.defense && !cannotDefend) unresolved.push('Jet de défense requis pour l’opposition de Corps à corps.');
  if (attackType(action.type) && actorPlan.kind === 'ranged' && normalized.defense && context.rangedOppositionAllowed !== true && !(defenderPlan.kind === 'test' && v5ShieldDefense(normalized).rangedDodgeAllowed)) unresolved.push('Confirmer la règle autorisant cette défense contre un tir.');
  if (Number(actor?.hp) < 0 || Number(target?.hp) < 0) unresolved.push('PV historiques négatifs : migration explicite à 0 requise avant une action V5.');
  const allQualities = [...action.qualities, ...(normalized.defense?.qualities || [])];
  const mechanicalWarnings = allQualities.filter(q => Object.hasOwn(ENGINES, q.id)
    && (keywordMechanicalStatus(q.id).status !== 'covered' || ['target-score-bonus', 'add-units-die'].includes(ENGINES[q.id].engine)))
    .map(q => ({ keywordId: q.id, reason: 'description-mecanique-v5-requise' }));
  // Weapon damage of a landed attack (`BF+4` read with the attacker's F). A
  // `manual` status (unknown expression, F missing) means no automatic damage:
  // the MJ arbitrates instead of silently getting 0.
  let weapon = null;
  const weaponDamage = actionWeaponDamage(action);
  const strengthBonus = strengthBonusOf(actor?.caracs);
  if (!replacement && context.silentTakedown !== true && hit && attackType(action.type) && target && (hasOwn(action, 'damage') || hasOwn(action, 'damageFormula'))) {
    weapon = evaluateWeaponDamage(weaponDamage, strengthBonus);
  }
  // Normal damage always uses the final roll reversed, independently of critical dice.
  if (weapon) {
    protection = locationProtection(target, { ...normalized.protectionContext,
      ranged: normalized.attackContext?.ranged ?? (normalized.v5.kind === 'ranged' ? true : normalized.v5.kind === 'melee' ? false : normalized.protectionContext.ranged), defenseProvided: Boolean(normalized.defense),
      location, attackRoll: roll,
      hitLocationRoll: location?.roll, critical: criticalAttack, qualities: action.qualities });
    protectionReceipts.push(protection);
    const targetArmour = protection.ap;

    if (targetArmour !== null && !mechanicalWarnings.length)     damage = computeDamage({
      weaponDamage,
      strengthBonus,
      damageBonus,
      sl: opposed ? opposed.netSl : sl,
      roll,
      targetToughnessBonus: Math.floor((Number(target.caracs?.E) || 0) / 10),
      targetArmour,
      qualities: action.qualities
    });
  }

  // Critical hits use their own random location; normal weapon damage keeps the reversed final hit roll.
  if (criticalFirst?.location) {
    const guard = locationProtection(target, { ...normalized.protectionContext, location: criticalFirst.location,
      ranged: normalized.attackContext?.ranged ?? (normalized.v5.kind === 'ranged' ? true : normalized.v5.kind === 'melee' ? false : normalized.protectionContext.ranged), defenseProvided: Boolean(normalized.defense), attackRoll: roll, hitLocationRoll: criticalFirst.locationRoll,
      critical: true, qualities: action.qualities });
    protectionReceipts.push(guard);
    if (guard.criticalIgnored) criticalFirst = null;
    else { criticalFirst.protection = guard; unresolved.push(...guard.manual.map(reason => `Protection du critique : ${reason}`)); }
  }
  const hpBefore = Math.max(0, Number(target?.hp) || 0);
  const excess = damage ? Math.max(0, damage.finalDamage - hpBefore) : 0;
  const second = !replacement && knownHp(target) && excess > 0 ? secondCritical(reverseV5Roll(roll), normalized.criticalRolls, excess * 10, inoffensive, location) : null;
  let criticalBlock = criticalFirst || second ? { kind: 'Critique', expanded: criticalClassification.élargi,
    acharnement: false, details: criticalFirst, ...(second ? { second, excessWounds: excess } : {}),
    ...(weapon?.status === 'manual' ? { secondHint: { locationRoll: reverseV5Roll(roll), location } } : {}) } : null;
  if (criticalBlock) {
    criticalBlock.items = criticalItems(criticalFirst, second, normalized.criticalDeclined);
    criticalBlock.application = criticalApplication(criticalBlock.items);
  } else if (context.silentTakedown !== true && !attackType(action.type) && actorTest.critical) criticalBlock = { kind: 'Critique', details: null };
  let defenderCritical = null;
  const defenderCriticalClassification = defenderTest ? isCriticalRoll(defenderTest.roll, defenderTest.details.doubled, normalized.defense.qualities) : null;
  const defenderFumbleClassification = defenderTest ? isFumbleRoll(defenderTest.roll, defenderTest.details.doubled, normalized.defense.qualities) : null;
  if (context.silentTakedown !== true && ['melee', 'ranged'].includes(defenderTest?.kind) && defenderTest.success && defenderCriticalClassification.critique) {
    const critLocation = normalized.defenderCriticalRolls?.location != null ? locationOf(normalized.defenderCriticalRolls.location) : null;
    const details = criticalDetails(normalized.defenderCriticalRolls, critLocation, 0, normalized.defense.qualities.some(q => q.id === 'inoffensive'));
    const guard = critLocation ? locationProtection(actor, { location: critLocation, attackRoll: defenderTest.roll,
      hitLocationRoll: critLocation.roll, critical: true, ranged: false, qualities: normalized.defense.qualities }) : null;
    if (guard) protectionReceipts.push(guard);
    if (!guard?.criticalIgnored) {
      if (guard) { details.protection = guard; unresolved.push(...guard.manual.map(reason => `Protection du critique défensif : ${reason}`)); }
      const items = criticalItems(details, null, normalized.defenderCriticalDeclined);
      defenderCritical = { kind: 'Critique', targetId: actor?.id, details, items, application: criticalApplication(items) };
    }
  }
  const weaponConditions = previewV5WeaponConditions({ qualities: action.qualities, hit: attackType(action.type) && hit,
    location, target, damage, resolutionId: normalized.resolutionId, replaced: Boolean(replacement) });
  unresolved.push(...weaponConditions.unresolved);
  mechanicalWarnings.push(...weaponConditions.warnings);
  const targetConditionApplication = [...(criticalBlock?.application?.states || []).map(row => ({ ...clone(row), source: { ...(row.source || {}), kind: 'critical' } })), ...weaponConditions.proposed];
  const conditionChanges = {}, talentUsageRequests = [], conditionTalentPlans = [];
  const conditionPlan = (participant, states, role, authorId) => {
    if (!participant || !states?.length) return;
    const reduced = previewV5TalentConditions(participant, states, { state: normalized.v5State, clock: normalized.v5Clock,
      actionId: normalized.resolutionId + ':condition:' + participant.id });
    states.splice(0, states.length, ...reduced.states);
    talentUsageRequests.push(...reduced.usageRequests);
    conditionTalentPlans.push(reduced.plan);
    unresolved.push(...reduced.plan.unresolved.flatMap(row => row.fields.map(field => 'Talent : préciser ' + field + '.')));
    const receipt = acquireV5Conditions(participant, states, { resolutionId: normalized.resolutionId, authorId, targetId: participant.id, round: normalized.round, source: role === 'actor' ? { kind: 'critical' } : {} });
    conditionChanges[role] = receipt;
    unresolved.push(...receipt.needsInput.map(item => `${role === 'actor' ? 'Attaquant' : 'Cible'} : ${item.label}`));
  };
  conditionPlan(target, targetConditionApplication, 'target', actor?.id);
  if (criticalBlock?.application) criticalBlock.application.states = targetConditionApplication.filter(row => row.source?.kind !== 'quality');
  weaponConditions.applied = targetConditionApplication.filter(row => row.source?.kind === 'quality');
  conditionPlan(actor, defenderCritical?.application?.states, 'actor', target?.id);
  const momentum = [];
  const planMomentum = (participant, events) => {
    if (!participant?.id) return;
    momentum.push({ participantId: participant.id, ...previewMomentumEvents({ hasMomentum: hasMomentum(participant), events }) });
  };
  const actorEvents = [], targetEvents = [];
  const event = (type, data = {}) => ({ id: `${normalized.resolutionId}:${type}`, type, ...data });
  if (context.outsideCombat !== true && actorPlan.charging) actorEvents.push(event('chargeEnemy'));
  if (context.outsideCombat !== true && actorPlan.kind === 'melee') {
    if (opposed) actorEvents.push(event(hit ? 'opposedMeleeWon' : 'opposedMeleeLost'));
    else if (!success) actorEvents.push(event('meleeTestFailed'));
  }
  if (context.outsideCombat !== true && defenderPlan?.kind === 'melee' && opposed) targetEvents.push(event(hit ? 'opposedMeleeLost' : 'opposedMeleeWon'));
  const criticalEffects = criticalBlock?.application;
  targetEvents.push(event('woundsLost', { amount: Math.min(hpBefore, (damage?.finalDamage || 0) + (criticalEffects?.extraWounds || 0)) }));
  targetEvents.push(event('conditionAcquired', { instances: conditionChanges.target?.acquiredInstances || 0 }));
  actorEvents.push(event('woundsLost', { amount: Math.min(Math.max(0, Number(actor?.hp) || 0), defenderCritical?.application.extraWounds || 0) }));
  actorEvents.push(event('conditionAcquired', { instances: conditionChanges.actor?.acquiredInstances || 0 }));
  planMomentum(actor, actorEvents); planMomentum(target, targetEvents);

  return {
    resolutionId: normalized.resolutionId,
    baseRevision: normalized.baseRevision,
    input: normalized,
    status: 'preview',
    ruleVersion: V5_COMBAT_RULE_VERSION,
    test: actorTest,
    defenderTest,
    momentum,
    conditionChanges,
    talentUsageRequests,
    talentPlans: [normalized.qualityTalentPlan, ...(actorPlan.talentPlans || []), ...(defenderPlan?.talentPlans || []), damageTalents, beatTalents, ...conditionTalentPlans].filter(Boolean),
    talentSLChoices: { actor: actorPlan.talentSLChoices || [], defender: defenderPlan?.talentSLChoices || [] },
    weaponConditions,
    targetConditionApplication,
    reminders: context.silentTakedown === true ? ['Neutralisation silencieuse : Blessures égales au BF et Inconscient si victoire ; Sonné et alarme si la cible gagne. Ces conséquences restent à arbitrer.'] : [],
    activeEffects,
    damageReplacedByTalent: replacement ? clone(replacement) : null,
    unresolved,
    defenderCritical,
    actionType: action.type,
    attack: attackType(action.type),
    score: { base: action.base, mod: actorTest.details.totalModifier, statePenalty: penalties.value, penaltyStates: penalties.names, target: targetScore },
    roll,
    success,
    hit,
    sl,
    slBonus,
    double: doubled,
    critical: criticalBlock,
    fumble: !success && fumbleClassification.maladresse ? { expanded: fumbleClassification.élargi } : null,
    defenderFumble: defenderTest && !defenderTest.success && defenderFumbleClassification.maladresse ? { expanded: defenderFumbleClassification.élargi } : null,
    location,
    targetId: target?.id || null,
    damage,
    weapon,
    protection,
    mechanicalWarnings,
    referenceVersion: getReferenceStatus().contentVersion,
    mechanics: [...new Set([...allQualities.map(q => q.id),
      ...(v5ShieldDefense(normalized).confirmed ? ['protectrice'] : []),
      ...protectionReceipts.flatMap(guard => guard.evaluatedKeywords || [])])].map(id => {
      const coverage = v5QualityMechanicalStatus(id);
      return { id, name: coverage.word?.name ?? id, status: coverage.status, engine: coverage.engine?.engine ?? null,
        effectVersion: coverage.effectVersion ?? null, effect: coverage.word?.effect ?? null, edition: coverage.word?.edition ?? null,
        source: coverage.word?.source ?? null, limitations: coverage.limitations || [] };
    }),
    opposition: opposed
      || (OPPOSITION_TYPES.has(action.type) ? { mode: 'manual', reason: 'aucune-convention-locale-vérifiée' } : null),
    application: { status: 'pending', applied: false }
  };
}

export const replayResolution = previewResolution;

/** Apply a preview once to a revisioned state; stale target/revision requires a new preview. */
export function applyResolution(preview, currentState) {
  if (!isRecord(preview) || preview.status !== 'preview') throw new ResolutionError('Aperçu de résolution invalide');
  if (!isRecord(currentState) || !Number.isInteger(currentState.revision) || currentState.revision < 0) {
    throw new ResolutionError('État courant invalide', 'INVALID_STATE');
  }
  if (hasOwn(currentState, 'round') && (!Number.isSafeInteger(currentState.round) || currentState.round < 1)) {
    throw new ResolutionError('Round de l’état courant invalide', 'INVALID_STATE');
  }
  const appliedIds = Array.isArray(currentState.appliedResolutionIds) ? currentState.appliedResolutionIds : [];
  if (preview.application?.applied || appliedIds.includes(preview.resolutionId)) {
    return { status: 'duplicate', state: clone(currentState), resolution: clone(preview) };
  }
  if (currentState.revision !== preview.baseRevision || (hasOwn(currentState, 'round') && currentState.round !== preview.input.round)) {
    return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
  }
  const carriesDamage = preview.input.action.damage !== undefined || preview.input.action.damageFormula !== undefined;
  if (preview.attack && preview.damage && !knownHp(preview.input.target)) return { status: 'manual', reason: 'PV-de-la-cible-requis', state: clone(currentState), resolution: clone(preview) };
  if (preview.attack && carriesDamage && !preview.targetId) {
    return { status: 'manual', reason: 'cible-requise-pour-les-dégâts', state: clone(currentState), resolution: clone(preview) };
  }
  if (preview.attack && preview.critical?.details?.needsLocation) {
    return { status: 'manual', reason: 'localisation-du-critique-requise', state: clone(currentState), resolution: clone(preview) };
  }
  if (preview.critical?.details?.needsAlternative || preview.critical?.second?.needsAlternative || preview.defenderCritical?.details?.needsAlternative) {
    return { status: 'manual', reason: 'deux-jets-gravite-requis:inoffensive', state: clone(currentState), resolution: clone(preview) };
  }
  if (preview.protection?.manual?.length || preview.mechanicalWarnings?.length) {
    return { status: 'manual', reason: preview.protection?.manual?.[0] || 'version-effet-non-couverte', state: clone(currentState), resolution: clone(preview) };
  }
  // Re-read only the contractual Qualities used by this preview. Editorial
  // reminders remain manual; changing an unrelated reference never invalidates it.
  for (const receipt of (preview.mechanics || []).filter(row => row.status === 'covered')) {
    const live = v5QualityMechanicalStatus(receipt.id);
    if (live.status !== 'covered' || live.effectVersion !== receipt.effectVersion || live.engine?.engine !== receipt.engine
      || live.word?.effect !== receipt.effect || live.word?.edition !== receipt.edition || live.word?.source !== receipt.source)
      return { status: 'manual', reason: `${receipt.name} : source changée, recalcul requis.`, state: clone(currentState), resolution: clone(preview) };
  }
  const liveTalentHashes = currentV5TalentHashes();
  const preparationOrigins = preview.input.qualityTalentPlan?.proposals?.flatMap(row => row.origins) || [];
  const resolutionOrigins = [...preparationOrigins,...(preview.talentPlans || []).flatMap(plan=>(plan.proposals || []).flatMap(row=>row.origins || []))];
  if (resolutionOrigins.some(origin => liveTalentHashes[origin.talentId] !== origin.source.effectHash))
    return { status: 'manual', reason: 'Talent : source changée, recalcul requis.', state: clone(currentState), resolution: clone(preview) };
  if (preview.ruleVersion !== V5_COMBAT_RULE_VERSION) return { status: 'manual', reason: 'ancien-apercu-a-recalculer-en-v5', state: clone(currentState), resolution: clone(preview) };
  if (preview.choiceRequired || preview.unresolved?.length) return { status: 'manual', reason: preview.unresolved?.[0] || 'choix-inversion-requis', state: clone(currentState), resolution: clone(preview) };
  if ([preview.critical, preview.defenderCritical].some(critical => critical?.details?.pending || critical?.second?.pending))
    return { status: 'manual', reason: 'jets-de-critique-requis', state: clone(currentState), resolution: clone(preview) };
  for (const subject of [preview.input.actor, preview.input.target].filter(Boolean)) {
    const live = participantById(currentState, subject.id);
    if (live && JSON.stringify(live) !== JSON.stringify(subject)) return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
  }
  const nextState = clone(currentState);
  const target = participantById(currentState, preview.targetId);
  const criticalEffects = preview.critical?.application || { extraWounds: 0, states: [] };
  const targetConditions = preview.targetConditionApplication || criticalEffects.states;
  if (preview.attack && preview.targetId && (preview.damage || criticalEffects.extraWounds || targetConditions.length)) {
    if (!target) return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    if (JSON.stringify(target) !== JSON.stringify(preview.input.target)) {
      return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    }
    const updated = clone(target);
    const oldHp = Number(updated.hp) || 0;
    updated.hp = Math.max(0, oldHp - previewHpLoss(preview));
    if (targetConditions.length) {
      const receipt = acquireV5Conditions(updated, targetConditions, { resolutionId: preview.resolutionId, authorId: preview.input.actor?.id, targetId: updated.id, round: preview.input.round, source: {} });
      if (!receipt.ready) return { status: 'manual', reason: receipt.needsInput[0].label, state: clone(currentState), resolution: clone(preview) };
      Object.assign(updated, receipt.participant);
    }
    nextState.participants = participantListWithUpdate(currentState, preview.targetId, updated);
  }
  const defenderEffects = preview.defenderCritical?.application;
  if (defenderEffects && preview.input.actor?.id) {
    const liveActor = participantById(nextState, preview.input.actor.id);
    if (!liveActor) return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    const updated = clone(liveActor);
    updated.hp = Math.max(0, (Number(updated.hp) || 0) - defenderEffects.extraWounds);
    if (defenderEffects.states.length) {
      const receipt = acquireV5Conditions(updated, defenderEffects.states, { resolutionId: preview.resolutionId, authorId: preview.input.target?.id, targetId: updated.id, round: preview.input.round, source: { kind: 'critical' } });
      if (!receipt.ready) return { status: 'manual', reason: receipt.needsInput[0].label, state: clone(currentState), resolution: clone(preview) };
      Object.assign(updated, receipt.participant);
    }
    nextState.participants = participantListWithUpdate(nextState, updated.id, updated);
  }
  if (preview.activeEffects?.length) {
    const live = participantById(nextState, preview.targetId);
    if (!live) return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    const updated = { ...clone(live), states: [...(live.states || []), ...clone(preview.activeEffects)] };
    nextState.participants = participantListWithUpdate(nextState, live.id, updated);
  }
  for (const change of preview.momentum || []) {
    const live = participantById(nextState, change.participantId);
    if (live) nextState.participants = participantListWithUpdate(nextState, live.id, withMomentum(live, change.after));
  }
  nextState.revision = currentState.revision + 1;
  nextState.appliedResolutionIds = [...appliedIds, preview.resolutionId].slice(-MAX_APPLIED_RESOLUTION_IDS);
  const resolution = clone(preview);
  resolution.application = { status: 'applied', applied: true, revision: nextState.revision };
  return { status: 'applied', state: nextState, resolution };
}
