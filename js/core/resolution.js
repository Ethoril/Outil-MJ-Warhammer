/** Pure E12 action resolution. It never reads DOM, mutates a Store or rolls implicitly. */
import {
  SL, getCritEffect, getLocationName, getReverseRoll, isDouble
} from './dice.js';
import { applyTargetBonus, isCriticalRoll, isFumbleRoll } from './roll-qualities.js';
import { actionHasDamage, actionWeaponDamage, computeDamage, evaluateWeaponDamage, formatDamageFormula, formatWeaponDamage, strengthBonusOf } from './damage.js';
import { normalizeQualities } from './quality-normalization.js';
import { normalizeState } from './effects.js';
import { parseCriticalEffect } from './criticals.js';

export { damageBreakdown, formatDamageFormula, formatWeaponDamage, describeWeaponDamage } from './damage.js';

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const signedValue = value => { const number = Number(value) || 0; return number < 0 ? `−${Math.abs(number)}` : `+${number}`; };
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
  if (!isRecord(first) || !isRecord(first.location) || first.locationRoll === null || first.locationRoll === undefined) {
    return [detail.actionType && detail.actionType !== 'attack' ? 'Réussite critique' : 'Coup critique'];
  }
  const parts = [`Critique : localisation ${first.locationRoll} → ${first.location.name} · ${describeSeverity(first)}`];
  const second = critical.second;
  if (isRecord(second) && isRecord(second.location)) {
    parts.push(`Second critique (PV sous zéro) : ${second.location.name} · ${describeSeverity(second)}`);
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
  if (present(detail.roll)) parts.push(`Jet : ${detail.roll}`);
  if (present(detail.targetScore)) parts.push(`Seuil : ${detail.targetScore}`);
  if (present(detail.sl)) parts.push(`DR : ${signedValue(detail.sl)}`);
  const opposition = isRecord(detail.opposition) && isRecord(detail.opposition.defender) ? detail.opposition : null;
  if (opposition) {
    const { label, score, roll } = opposition.defender;
    const hit = present(detail.hit) ? ` · ${detail.hit ? 'touché' : 'pas de touche'}` : '';
    parts.push(`Opposition : défense ${label} ${score} (d100 ${roll}) · DR net ${signedValue(opposition.netSl)}${hit}`);
  } else if (present(detail.hit)) parts.push(detail.hit ? 'Touché' : 'Pas de touche');
  // La localisation du critique remplace la ligne « Localisation » (c'est la même zone).
  const criticalLocated = isRecord(detail.critical?.details) && isRecord(detail.critical.details.location) && present(detail.critical.details.locationRoll);
  if (!criticalLocated && isRecord(detail.location) && present(detail.location.roll) && detail.location.name) parts.push(`Localisation : ${detail.location.roll} → ${detail.location.name}`);
  const damage = isRecord(detail.damage) ? formatDamageFormula(detail.damage) : '';
  if (damage) parts.push(`Dégâts : ${damage}`);
  const weapon = isRecord(detail.weapon) && detail.weapon.status === 'manual' ? formatWeaponDamage(detail.weapon) : '';
  if (weapon) parts.push(`Arme : ${weapon}`);
  parts.push(...describeCritical(detail));
  if (detail.fumble) parts.push('Maladresse');
  return parts;
}
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const ATTACK_TYPES = new Set(['attack', 'attaque']);
const OPPOSITION_TYPES = new Set(['opposition', 'opposed']);
const SKILL_TYPES = new Set(['skill']);
const DEFENSE_TYPES = new Set(['defense']);
const PENALTY_STATES = new Set(['sonne', 'aveugle', 'extenue', 'brise']);
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

function stateKey(state) {
  if (typeof state === 'string') return state.split('|', 1)[0].trim().toLocaleLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return typeof state?.key === 'string' ? state.key : stateKey(state?.name || '');
}

function statePenalty(states) {
  if (!Array.isArray(states)) return { value: 0, names: [] };
  const names = [];
  for (const state of states) {
    const key = stateKey(state);
    if (PENALTY_STATES.has(key) && !names.includes(key)) names.push(key);
  }
  return { value: names.length * 10, names };
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

function defaultResolutionId(actor, action, target, baseRevision, roll) {
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
  const target = isRecord(input.target) ? clone(input.target) : null;
  const roll = parseRoll(input.roll ?? input.dieRoll ?? input.enteredRoll);
  if (hasOwn(input, 'baseRevision') && (!Number.isInteger(input.baseRevision) || input.baseRevision < 0)) {
    throw new ResolutionError('baseRevision invalide', 'INVALID_REVISION', { value: input.baseRevision });
  }
  const baseRevision = input.baseRevision ?? 0;
  const type = String(action.type || 'test').trim().toLocaleLowerCase();
  const qualities = normalizeQualities(action.qualities || input.qualities || []);
  const resolutionId = String(input.resolutionId || input.id || defaultResolutionId(actor, action, target, baseRevision, roll));
  if (!resolutionId.trim()) throw new ResolutionError('resolutionId invalide');
  // Optional defender side of an opposed attack; absent means the historic
  // attacker-only resolution, byte for byte.
  const defense = isRecord(input.defense) ? {
    roll: parseRoll(input.defense.roll),
    base: parseInteger(input.defense.base, 0),
    mod: parseInteger(input.defense.mod, 0),
    label: typeof input.defense.label === 'string' && input.defense.label.trim() ? input.defense.label.trim() : 'CC'
  } : null;
  return {
    resolutionId,
    baseRevision,
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

/** WFRP opposed test: higher SL wins, then the higher score; a perfect tie is no hit. */
function opposedOutcome(attacker, defense, target) {
  const penalties = statePenalty(target?.states);
  const score = Math.max(0, defense.base + defense.mod - penalties.value);
  const defender = {
    label: defense.label, base: defense.base, mod: defense.mod, statePenalty: penalties.value,
    score, roll: defense.roll, success: defense.roll <= score, sl: SL(score, defense.roll)
  };
  const netSl = attacker.sl - defender.sl;
  const winner = netSl > 0 ? 'attacker' : netSl < 0 ? 'defender'
    : attacker.score > defender.score ? 'attacker' : attacker.score < defender.score ? 'defender' : 'tie';
  return { mode: 'opposed', attacker, defender, netSl, winner };
}

function locationOf(roll) {
  const named = getLocationName(roll);
  return { roll, ...named, side: locationSide(named.name) };
}

/** Gravité d'un critique : d100 saisi (+10 Acharnement, plafonné à 100) lu sur la table de la zone. */
function criticalSeverity(location, base, acharnement) {
  const bonus = acharnement ? 10 : 0;
  const effectRollBase = base ?? null;
  const effectRoll = effectRollBase === null ? null : Math.min(100, effectRollBase + bonus);
  const found = location && effectRoll !== null ? getCritEffect(location.key, effectRoll) : null;
  const effect = found ? clone(found) : null;
  return { effectRollBase, bonus, effectRoll, effect, parsed: effect ? parseCriticalEffect(effect.eff) : null };
}

function criticalDetails(rolls, location, acharnement) {
  const severity = criticalSeverity(location, rolls?.effect, acharnement);
  return {
    pending: !location || severity.effectRoll === null,
    needsLocation: !location,
    locationRoll: location?.roll ?? null,
    location,
    ...severity
  };
}

/** Second critique : cible qui passe sous zéro, à la localisation du jet d'attaque inversé. */
function secondCritical(reversed, rolls, acharnement) {
  const location = locationOf(reversed);
  const severity = criticalSeverity(location, rolls?.secondEffect, acharnement);
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
    parsed.states.forEach(({ key, name, level }) => push({
      id: `${crit}-state-${key}`, kind: 'state', label: criticalItemLabel(key, name, level), level, key, name
    }));
  });
  return items;
}

/** Somme des items appliqués : `{ extraWounds, states: [{ key, name, level }] }`. */
function criticalApplication(items) {
  const application = { extraWounds: 0, states: [] };
  items.filter(item => item.applied).forEach(item => {
    if (item.kind === 'wounds') { application.extraWounds += item.amount; return; }
    const known = application.states.find(state => state.key === item.key);
    if (!known) application.states.push({ key: item.key, name: item.name, level: item.level });
    else if (item.key !== 'a-terre') known.level += item.level;
  });
  return application;
}

/** Perte de PV proposée par un aperçu : dégâts de l'arme + Blessures en plus des critiques cochés. */
export function previewHpLoss(preview) {
  return (Number(preview?.damage?.finalDamage) || 0) + (Number(preview?.critical?.application?.extraWounds) || 0);
}

/** Preview one action, preserving the exact supplied d100 and any critical dice. */
export function previewResolution(input) {
  const normalized = normalizeResolutionInput(input);
  const { actor, action, target, roll } = normalized;
  const penalties = statePenalty(actor?.states);
  const preQualityTarget = Math.max(0, action.base + action.mod - penalties.value);
  const qualityTarget = applyTargetBonus(preQualityTarget, action.qualities);
  const targetScore = qualityTarget.target;
  const success = roll <= targetScore;
  const sl = SL(targetScore, roll);
  const doubled = isDouble(roll);
  const criticalClassification = isCriticalRoll(roll, doubled, action.qualities);
  const fumbleClassification = isFumbleRoll(roll, doubled, action.qualities);
  // With a defense, an attack lands when the attacker wins the opposed test,
  // even on a failed own roll; without one, hitting is succeeding.
  const opposed = attackType(action.type) && normalized.defense
    ? opposedOutcome({ score: targetScore, roll, success, sl }, normalized.defense, target) : null;
  const hit = opposed ? opposed.winner === 'attacker' : success;
  const acharnement = attackType(action.type) && success && hit && Number(target?.hp) <= 0;
  let kind = null;
  let expanded = false;
  if (success && hit && criticalClassification.critique) {
    kind = 'Critique';
    expanded = criticalClassification.élargi;
  } else if (!success && fumbleClassification.maladresse) {
    kind = 'Maladresse';
    expanded = fumbleClassification.élargi;
  } else if (acharnement) {
    kind = 'Critique';
  }

  // Coup critique d'une attaque : la localisation vient d'un nouveau d100, pas du jet inversé.
  const criticalAttack = kind === 'Critique' && attackType(action.type);
  const criticalLocationRoll = normalized.criticalRolls?.location;
  const location = !hit ? null
    : criticalAttack ? (criticalLocationRoll === undefined ? null : locationOf(criticalLocationRoll))
      : locationOf(getReverseRoll(roll));
  const criticalFirst = criticalAttack ? criticalDetails(normalized.criticalRolls, location, acharnement) : null;
  let damage = null;
  // Weapon damage of a landed attack (`BF+4` read with the attacker's F). A
  // `manual` status (unknown expression, F missing) means no automatic damage:
  // the MJ arbitrates instead of silently getting 0.
  let weapon = null;
  const weaponDamage = actionWeaponDamage(action);
  const strengthBonus = strengthBonusOf(actor?.caracs);
  if (hit && attackType(action.type) && target && (hasOwn(action, 'damage') || hasOwn(action, 'damageFormula'))) {
    weapon = evaluateWeaponDamage(weaponDamage, strengthBonus);
  }
  // Sans localisation du critique, l'armure de la zone est inconnue : pas de dégâts calculés.
  if (weapon && !criticalFirst?.needsLocation) {
    const armour = target.armor || {};
    const targetArmour = location?.key === 'HEAD' ? armour.head
      : location?.key === 'ARM' ? armour.arms
        : location?.key === 'BODY' ? armour.body
          : location?.key === 'LEG' ? armour.legs : 0;
    damage = computeDamage({
      weaponDamage,
      strengthBonus,
      sl: opposed ? opposed.netSl : sl,
      roll,
      targetToughnessBonus: Math.floor((Number(target.caracs?.E) || 0) / 10),
      targetArmour,
      qualities: action.qualities
    });
  }

  let criticalBlock = kind === 'Critique' ? { kind, expanded, acharnement, details: criticalFirst } : null;
  if (criticalAttack) {
    // Second critique : PV avant le coup ≥ 0 et PV avant − dégâts normaux < 0 (Blessures du critique exclues).
    const hpBefore = Number(target?.hp);
    const reversed = getReverseRoll(roll);
    const second = damage && hpBefore >= 0 && hpBefore - damage.finalDamage < 0
      ? secondCritical(reversed, normalized.criticalRolls, acharnement) : null;
    const items = criticalItems(criticalFirst, second, normalized.criticalDeclined);
    criticalBlock = {
      ...criticalBlock,
      ...(second ? { second } : {}),
      // Dégâts non calculables : pas de table pour le second critique, seulement son rappel
      // (cible encore à 0 PV ou plus : déjà sous zéro, elle ne peut plus y passer).
      ...(weapon?.status === 'manual' && location && hpBefore >= 0 ? { secondHint: { locationRoll: reversed, location: locationOf(reversed) } } : {}),
      items,
      application: criticalApplication(items)
    };
  }

  return {
    resolutionId: normalized.resolutionId,
    baseRevision: normalized.baseRevision,
    input: normalized,
    status: 'preview',
    actionType: action.type,
    attack: attackType(action.type),
    score: { base: action.base, mod: action.mod, statePenalty: penalties.value, penaltyStates: penalties.names, target: targetScore },
    roll,
    success,
    hit,
    sl,
    double: doubled,
    critical: criticalBlock,
    fumble: kind === 'Maladresse' ? { expanded } : null,
    location,
    targetId: target?.id || null,
    damage,
    weapon,
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
  const appliedIds = Array.isArray(currentState.appliedResolutionIds) ? currentState.appliedResolutionIds : [];
  if (preview.application?.applied || appliedIds.includes(preview.resolutionId)) {
    return { status: 'duplicate', state: clone(currentState), resolution: clone(preview) };
  }
  if (currentState.revision !== preview.baseRevision) {
    return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
  }
  const carriesDamage = preview.input.action.damage !== undefined || preview.input.action.damageFormula !== undefined;
  if (preview.attack && carriesDamage && !preview.targetId) {
    return { status: 'manual', reason: 'cible-requise-pour-les-dégâts', state: clone(currentState), resolution: clone(preview) };
  }
  if (preview.attack && preview.critical?.details?.needsLocation) {
    return { status: 'manual', reason: 'localisation-du-critique-requise', state: clone(currentState), resolution: clone(preview) };
  }
  const nextState = clone(currentState);
  const target = participantById(currentState, preview.targetId);
  const criticalEffects = preview.critical?.application || { extraWounds: 0, states: [] };
  if (preview.attack && preview.targetId && (preview.damage || criticalEffects.extraWounds || criticalEffects.states.length)) {
    if (!target) return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    if (JSON.stringify(target) !== JSON.stringify(preview.input.target)) {
      return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    }
    const updated = clone(target);
    const oldHp = Number(updated.hp) || 0;
    updated.hp = oldHp - previewHpLoss(preview);
    const states = Array.isArray(updated.states) ? [...updated.states] : [];
    const findState = key => states.findIndex(state => stateKey(state).replace(/-/g, ' ') === key.replace(/-/g, ' '));
    // Même état déjà présent : niveau augmenté, durée conservée ; « À Terre » ne double jamais.
    for (const { key, name, level } of criticalEffects.states) {
      const at = findState(key);
      if (at < 0) states.push(normalizeState({ name, level, duration: null, source: { kind: 'critical', resolutionId: preview.resolutionId } }, states.length));
      else if (key !== 'a-terre') {
        const known = typeof states[at] === 'string' ? normalizeState(states[at], at) : states[at];
        states[at] = { ...known, level: (Number(known.level) || 1) + level };
      }
    }
    if (updated.hp <= 0 && findState('a-terre') < 0) {
      states.push({ name: 'À Terre', key: 'a-terre', level: 1, duration: null, source: { kind: 'resolution', resolutionId: preview.resolutionId } });
    }
    if (states.length || Array.isArray(updated.states)) updated.states = states;
    nextState.participants = participantListWithUpdate(currentState, preview.targetId, updated);
  }
  nextState.revision = currentState.revision + 1;
  nextState.appliedResolutionIds = [...appliedIds, preview.resolutionId].slice(-MAX_APPLIED_RESOLUTION_IDS);
  const resolution = clone(preview);
  resolution.application = { status: 'applied', applied: true, revision: nextState.revision };
  return { status: 'applied', state: nextState, resolution };
}
