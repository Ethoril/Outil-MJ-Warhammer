import {weaponAttackNature,magicWeaponHitConditions,magicWeaponFumbleConditions,magicWeaponBonus,magicWeaponQualities,previewMagicProtection,reactionReminders} from './v5-magic-combat.js';
import{previewSmall}from'./v5-talent-small.js';
import {applyAlliedShield,previewAlliedShields} from './v5-talent-shield.js';
import {finishImmediateAttack} from './v5-talent-attacks.js';
import {resolveSizeOpposition} from './v5-talent-size.js';
import {previewTalentReplacement,resoluteException,applyForgeProtection,lodgedHarpoon} from './v5-talent-replacements.js';
import {previewSituationAfter} from './v5-talent-situations.js';
import { previewV5TalentTestModifiers } from './v5-talent-tests.js';
import { previewV5TalentActivation,refreshV5TalentEffects,previewV5FrenzyExit,noTestV5TalentAction,sourceActive } from './v5-talent-actions.js';
import { prepareV5TalentCriticalRolls,previewV5CombatPrelude,computeV5WeaponReachGuide,computeV5WeaponRangeBands } from './v5-talent-combat.js';
import { locationProtection, mergeEquipmentQualities, ammunitionCompatibility, equipmentAttackContext, equipmentQualities, applyWeaponSkillRules, weaponSkillGroupInfo } from './equipment.js';
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
import { planNaturalAttack, inferNaturalAttackKey } from './creature-combat.js';
import { applyHeadCriticals } from './creature-heads.js';
import { acquireV5Conditions,healV5Wounds } from './v5-effects.js';
import { slExtremeLayers } from './v5-divine-effects-tests.js';
import { hasArcaneMagicLore } from './v5-magic-attributes.js';
import {divineSocialRestriction} from './v5-divine-access.js';
import { previewV5Test,selectV5Test, resolveV5Opposition, reverseV5Roll } from './v5-roll.js';
import { buildV5RollDecision } from './v5-decision.js';
import { previewMomentumEvents } from './v5-momentum.js';
import { buildCombatTest, hasMomentum, withMomentum, conditionLevels, inferV5Kind,v5ShieldDefense, V5_COMBAT_RULE_VERSION } from './v5-combat-rules.js';
import { evaluateV5Talents, previewV5TalentConditions, currentV5TalentHashes, V5_TALENT_IDS } from './v5-talents.js';
import { getV5CriticalEffect, V5_CRITICAL_TABLE_VERSION } from '../data/v5-crits.js';
import { previewV5ActionQualities, v5ActionQualityContext, previewV5WeaponConditions, v5QualityMechanicalStatus } from './v5-talent-qualities.js';
import { consumeDivineLayers } from './v5-divine-effects-gear.js';
import { refreshEffectLayers } from './v5-magic-effects.js';
import { previewFamiliarCondition } from './familiars.js';
import { applyPrayerSLCaps,getPrayerSLModifiers } from './v5-divine-prayer-caps.js';

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
  if(detail.test?.automatic)parts.push('Réussite automatique, sans jet.');else if (present(detail.roll)) parts.push(`Jet : ${detail.roll}`);
  if (present(detail.targetScore)) parts.push(`Seuil : ${detail.targetScore}`);
  if (present(detail.sl)) parts.push(`DR : ${signedValue(detail.sl)}${detail.slBonus ? ` (${detail.slBonus > 0 ? 'Pointue' : 'Imprécise'} ${signedValue(detail.slBonus)})` : ''}`);
  if(detail.resultTier?.label)parts.push(`Palier : ${detail.resultTier.label}`);
  if(detail.extraordinaryShot)parts.push(`Tir extraordinaire (${detail.extraordinaryShot.talentId}) : ${detail.extraordinaryShot.description} · difficulté MJ ${signedValue(detail.extraordinaryShot.difficulty)} DR.`);
  if(detail.lethalDeath?.confirmedBy==='explicit-gm')parts.push('Mort directe : option de table activée et confirmation explicite du MJ ; cible marquée morte (0 PV).');
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
  if(detail.defenderDamage)parts.push('Riposte : '+formatDamageFormula(detail.defenderDamage)+' Blessures sur l’attaquant.');
  if (detail.defenderCritical) parts.push(...describeCritical({ actionType: 'attack', critical: detail.defenderCritical }).map(text => `Défenseur → attaquant : ${text}`));
  for (const change of detail.momentum || []) parts.push(`Élan (${change.participantId}) : ${change.before ? 'oui' : 'non'} → ${change.after ? 'oui' : 'non'}`);
  if (detail.damageReplacedByTalent) parts.push('Battement : toutes les Blessures et conséquences du critique remplacées ; la cible peut encore Esquiver.');
  for (const plan of detail.talentPlans || []) for (const proposal of plan.proposals || []) {
    if (proposal.op === 'modifyDamage') parts.push('Talent : +' + proposal.amount + ' Dégât (' + proposal.origins.map(origin => origin.talentId).join(', ') + ')');
    if (proposal.op === 'reduceConditionAcquisition') parts.push('Talent : ' + proposal.amount + ' acquisition(s) de ' + proposal.key + ' évitée(s).');
  }
  for (const condition of [...(detail.weaponConditions?.applied||[]),...(detail.defenderWeaponConditions?.applied||[])]) parts.push('Assommante : ' + condition.level + ' état Sonné appliqué.');
  for(const state of detail.actorConditionApplication||[])if(state.source?.keywordId==='a-poudre-noire')parts.push('À Poudre noire : '+state.level+' état(s) Brisé acquis.');
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
    parts.push(`Règle ${rule.name || rule.id} : ${rule.status === 'homebrew-covered' ? 'automatisée (homebrew Petit validé par le MJ)' : rule.status === 'covered' ? 'automatisée' : 'à arbitrer'}${origin ? ` · ${origin}` : ''}${rule.effectVersion ? ` · version ${shortVersion(rule.effectVersion)}` : ''}${rule.effect ? ` · ${rule.effect}` : ''}`);
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
/** Plan de l'attaque naturelle déclarée dans `v5.context.naturalAttack` (mêmes options que le calcul des coûts du Store) ; `null` sans déclaration. */
export function naturalPlanOf(actor, v5) {
  const context = v5?.context;
  if (!actor || !context?.naturalAttack) return null;
  return planNaturalAttack(actor, context.naturalAttack, { used: context.naturalUsed, charged: context.charged ?? v5.charging, actorSize: naturalSizes(v5).actorSize, targetSize: naturalSizes(v5).targetSize });
}
// Les Tailles viennent du champ de l'interface (`v5.actorSize`) ou, pour le Store, du contexte.
const naturalSizes = v5 => ({ actorSize: v5?.context?.actorSize ?? v5?.actorSize, targetSize: v5?.context?.targetSize ?? v5?.targetSize });
/**
 * Décisions du MJ des 23 et 24/10 : l'attaque ordinaire de mêlée d'un profil qui porte le nom d'un Trait d'attaque naturelle (Bite, Tail,
 * Horns, Tentacles…) suit la formule V5 du Trait, avec le bonus de Taille (livres V4). Rien ne s'ajoute à un tir, une attaque gratuite ou
 * une attaque bonus ; les coûts et quotas ne sont pas posés ici. `null` hors de ces cas.
 */
function inferredNaturalPlan(actor, action, v5) {
  if (!actor || !attackType(action.type)) return null;
  const key = inferNaturalAttackKey(actor, action);
  if (!key) return null;
  const context = v5?.context || {};
  const ordinary = v5?.kind !== 'ranged' && v5?.extraAttack !== true && !context.freeAttackTalent && !action.extensions?.v5?.freeAttack;
  return planNaturalAttack(actor, key, { ordinary, charged: context.charged ?? v5?.charging, actorSize: naturalSizes(v5).actorSize, targetSize: naturalSizes(v5).targetSize });
}
const foldKey = text => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function normalizeResolutionInput(input = {}) {
  if (!isRecord(input)) throw new ResolutionError('Entrée de résolution invalide');
  const actor = isRecord(input.actor) ? clone(input.actor) : null;
  const action = isRecord(input.action) ? clone(input.action) : {};
  // Attaque naturelle choisie (Trait de créature) : ses dégâts calculés remplacent ceux de l'action (« imprimé » : l'action garde les siens).
  // Dégâts saisis à la main sur une action personnalisée (sans marque de bestiaire) : remplacés par la formule, le MJ en est averti.
  const typedDamage = !action.extensions?.v5?.kind && hasOwn(action, 'damage') && action.damage !== '' && Number.isFinite(Number(action.damage)) ? Number(action.damage) : null;
  let damageReplaced = null;
  const replaceDamage = formula => {
    if (typedDamage !== null && typedDamage !== Number(formula)) damageReplaced = `Dégâts de l’action (${typedDamage}) remplacés par la formule V5 du Trait (${Number(formula)}) ; saisissez une attaque d’arme pour garder les vôtres.`;
    action.damage = Number(formula); delete action.damageFormula;
  };
  const natural = naturalPlanOf(actor, input.v5);
  if (natural && /^\d+$/.test(String(natural.damageFormula))) replaceDamage(natural.damageFormula);
  else if (natural?.noDamage) { action.damage = 0; delete action.damageFormula; }
  else if (!natural) {
    const inferred = inferredNaturalPlan(actor, action, input.v5);
    if (inferred && /^\d+$/.test(String(inferred.damageFormula))) replaceDamage(inferred.damageFormula);
    // Formule sans valeur (Morsure sans chiffre de Trait) : le chiffre imprimé reste la Valeur, le bonus de Taille s'y ajoute.
    else if (inferred?.sizeBonus && Number.isFinite(Number(action.damage)) && !action.damageFormula) action.damage = Number(action.damage) + inferred.sizeBonus;
  }
  if (action.extensions?.fiche?.requiresLink) {
    const linkedItem=actor?.equipment?.find(item=>item.id===action.extensions?.fiche?.equipmentId)||action.extensions?.equipment||null;
    const unresolvedWeaponGroup=linkedItem?.kind==='weapon'&&!weaponSkillGroupInfo(linkedItem.category,linkedItem);
    const selectedWeaponGroup=weaponSkillGroupInfo(input.v5?.context?.weaponTrainingGroup,linkedItem);
    const selectedSkillId=input.v5?.context?.weaponSkillId;
    const selectedSkillRef=selectedSkillId&&getReferenceCatalogue().skills.find(row=>row.id===selectedSkillId);
    const actorSkills=actor?.skills?.length?actor.skills:actor?.ficheSnapshot?.skills||[];
    const selectedSkillRow=selectedSkillId&&actorSkills.find(row=>row.id===selectedSkillId);
    const resolvedSkillChoice=selectedSkillRef&&(selectedSkillRow?.status!=='open'&&selectedSkillRow?.status!=='ambiguous'&&selectedSkillRow?.status!=='unresolved'||input.v5?.context?.weaponAdvances!==undefined&&input.v5.context.weaponAdvances!=='');
    if(!(unresolvedWeaponGroup&&selectedWeaponGroup)&&!resolvedSkillChoice)throw new ResolutionError('Lier une compétence à cette arme avant de résoudre son attaque', 'SKILL_LINK_REQUIRED');
  }
  const target = isRecord(input.target) ? clone(input.target) : null;
  const entered=input.roll??input.dieRoll??input.enteredRoll;
  const noTestAction=!attackType(action.type)&&!input.defense&&noTestV5TalentAction(actor,input.v5?.context?.talentAction,target);
  const automaticNoRoll=(entered==null||entered==='')&&(noTestAction||previewV5TalentTestModifiers(actor,{action,settings:input.v5||{},kind:inferV5Kind(action),role:attackType(action.type)?'attacker':'actor'}).forceSuccess);
  const roll = parseRoll(automaticNoRoll?1:entered);
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
  const qualities = normalizeQualities(merged ? [...(action.qualities || []), ...equipmentQualities(ammunition)] : action.qualities || input.qualities || []);
  action.qualities = qualities;
  const resolutionId = String(input.resolutionId || input.id || defaultResolutionId(actor, action, target, baseRevision, roll));
  if (!resolutionId.trim()) throw new ResolutionError('resolutionId invalide');
  // Defender settings describe the Test actually chosen (Melee or Dodge).
  const defense = isRecord(input.defense) ? {
    ...(isRecord(input.defense.extensions) ? { extensions: clone(input.defense.extensions) } : {}),
    ...(typeof input.defense.type === 'string' ? { type: input.defense.type } : {}),
    ...(input.defense.damage!==undefined?{damage:input.defense.damage}:{}),
    ...(input.defense.damageFormula?{damageFormula:input.defense.damageFormula}:{}),
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
    baseRevision,automaticNoRoll,noTestAction,
    ...(damageReplaced ? { damageReplaced } : {}),
    ...(input.round !== undefined ? { round: input.round } : {}),
    ...(isRecord(input.prayerSLContext) ? { prayerSLContext: clone(input.prayerSLContext) } : {}),
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
    attackContext: equipmentAttackContext(weaponItem,input.v5?.context||{}),
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
  read('injureEffect', 'injureEffect');read('injureSecondEffect','injureSecondEffect');read('injureEffectAlternative','injureEffectAlternative');read('injureSecondEffectAlternative','injureSecondEffectAlternative');
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

/** Bonus de gravité des couches divines actives de celui qui INFLIGE le critique (ex. Morsure du loup) ; les critiques subis ne les lisent pas. */
const divineCriticalSeverityBonus = inflicter => (inflicter?.extensions?.v5?.divineEffects || [])
  .reduce((sum, layer) => sum + (Number(layer?.criticalSeverityBonus) || 0), 0);

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

/** Registre des Blessures Critiques d'attaque : un enregistrement stable par critique appliqué (principal puis secondaire). */
function appendCriticalWoundRecords(participant, criticals, { resolutionId, authorId, round, beforeStates = [], source='attack' }) {
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
      round, resolutionId, authorId, stateIds: index === 0 ? stateIds : [] }))];
}

/** Perte de PV proposée par un aperçu : dégâts de l'arme + Blessures en plus des critiques cochés. */
export function previewHpLoss(preview) {
  return (Number(preview?.damage?.finalDamage) || 0) + (Number(preview?.critical?.application?.extraWounds) || 0);
}

/** Resolve and compare through the same pure V5 action calculation. No random draw. */
export function previewResolution(input) {
  const initial=normalizeResolutionInput(input);
  const weaponItem = initial.actor?.equipment?.find(item => item.id === initial.action?.extensions?.fiche?.equipmentId);
  const weaponSkillContext=initial.v5?.context||{};
  const sourceQualities=weaponItem?normalizeQualities([...equipmentQualities(weaponItem),...(initial.action.qualities||[])]):initial.action.qualities;
  const weaponSkillPreview=applyWeaponSkillRules(initial.actor,initial.action,{weapon:weaponItem||initial.action?.extensions?.equipment||null,context:weaponSkillContext,sourceQualities});
  if(weaponSkillPreview.receipt){
    initial.action={...initial.action,...weaponSkillPreview.action};
    initial.action.qualities=weaponSkillPreview.action.qualities;
  }
  if(weaponSkillPreview.receipt?.applied.includes('improvised-weapon-profile')){
    initial.action={...initial.action,contactImprovised:true,sourceQualities:weaponSkillPreview.action.sourceQualities};
  }
  const prelude=previewV5CombatPrelude(initial);initial.combatPrelude=prelude;
  const prepared = previewV5ActionQualities(initial,weaponSkillPreview.receipt?{sourceQualities:weaponSkillPreview.action.qualities}:undefined);
  const normalized = prepared.normalized;
  const weaponSkill = applyWeaponSkillRules(normalized.actor, normalized.action, {
    weapon: weaponItem || normalized.action?.extensions?.equipment || null,
    context: normalized.v5?.context || {}
  });
  normalized.action = { ...normalized.action, ...weaponSkill.action };
  normalized.weaponSkillReceipt = weaponSkill.receipt || normalized.weaponSkillReceipt;
  normalized.weaponSkillUnresolved = [...new Set([...(normalized.weaponSkillUnresolved||[]), ...weaponSkill.unresolved])];
  if (weaponSkill.slModifier !== undefined) {
    const sources=weaponSkill.receipt?.applied?.filter(id=>id==='ballistic-skill-minus-1-dr'||id==='powder-skill-engineering-minus-2-dr')||[];
    const applied=new Set(normalized.v5.weaponSkillModifierSources||[]);
    const fresh=sources.filter(id=>!applied.has(id));
    if(fresh.length){normalized.v5.slModifier=(Number(normalized.v5.slModifier)||0)+weaponSkill.slModifier;normalized.v5.weaponSkillModifierSources=[...applied,...fresh];}
  }
  normalized.qualityTalentPlan = prepared.plan;
  const actorSkillId=normalized.action?.extensions?.fiche?.skillId||normalized.v5?.context?.skillId;
  const defenderSkillId=normalized.defense?.extensions?.fiche?.skillId||normalized.defense?.v5?.context?.skillId;
  const attachPrayerModifiers=(subject,skillId,settings)=>{
    if(skillId!=='skill-50_72_69_e8_72_65-base'||normalized.noTestAction)return [];
    const checked=getPrayerSLModifiers(subject,normalized.prayerSLContext||{});
    if(checked.ok)settings.slModifiers=[...(settings.slModifiers||[]),...checked.modifiers];
    return checked.needsInput.map(row=>row.message);
  };
  const actorPrayerNeeds=attachPrayerModifiers(normalized.actor,actorSkillId,normalized.v5);
  const defenderPrayerNeeds=normalized.defense?attachPrayerModifiers(normalized.target,defenderSkillId,normalized.defense.v5):[];
  const prepareSocial=(subject,action,settings)=>{if(normalized.noTestAction)return {applies:false,needsInput:[]};const rule=divineSocialRestriction(subject,action,settings);if(rule.applies){const modifier=settings.slModifier??action.extensions?.v5?.slModifier??0;if(Number.isInteger(modifier))settings.slModifier=Math.min(-3,modifier);}return rule;};
  const actorSocial=prepareSocial(normalized.actor,normalized.action,normalized.v5),defenderSocial=normalized.defense?prepareSocial(normalized.target,normalized.defense,normalized.defense.v5):{applies:false,needsInput:[]};
  const actorPlan = buildCombatTest(normalized);
  const defenderPlan = normalized.defense ? buildCombatTest(normalized, 'defender') : null;
  const capSocial=(plan,rule)=>{plan?.unresolved.push(...rule.needsInput.map(row=>row.label));if(!rule.applies||plan?.kind!=='test'||!plan.test?.options?.length)return;const original=plan.test,result=original.options[0].result,mods=result.details.modifiers.filter(row=>row.id!=='system:wrath-social-ceiling'),total=mods.reduce((n,row)=>n+row.amount,0)+(result.details.advantageSl||0);if(total>-3)mods.push({id:'system:wrath-social-ceiling',label:'Courroux : difficulté sociale au mieux −3 DR',amount:-3-total});plan.test=previewV5Test({score:result.score,roll:original.initialRoll,kind:result.kind,slModifiers:mods,advantageSources:original.advantage.advantage,disadvantageSources:original.advantage.disadvantage});};
  capSocial(actorPlan,actorSocial);if(defenderPlan)capSocial(defenderPlan,defenderSocial);
  if(actorSocial.applies||defenderSocial.applies)normalized.divineSocialRestrictions={...(actorSocial.applies?{actor:{ceiling:-3,sources:actorSocial.records.map(row=>({recordId:row.id,source:row.source}))}}:{}),...(defenderSocial.applies?{defender:{ceiling:-3,sources:defenderSocial.records.map(row=>({recordId:row.id,source:row.source}))}}:{})};
  actorPlan.unresolved.push(...actorPrayerNeeds);
  if(defenderPlan)defenderPlan.unresolved.push(...defenderPrayerNeeds);
  const capPrayerOptions=(plan,subject,skillId)=>{
    const byOption=new Map();
    if(plan?.kind!=='test'||skillId!=='skill-50_72_69_e8_72_65-base'||normalized.noTestAction)return byOption;
    const options=[];
    for(const option of plan.test.options||[]){
      const capped=applyPrayerSLCaps(subject,option.result);
      if(!capped.ok){plan.unresolved.push(...capped.needsInput.map(row=>row.message));continue;}
      byOption.set(option.id,capped.caps);options.push({...option,result:capped.test});
    }
    if(options.length===plan.test.options.length)plan.test={...plan.test,options};
    return byOption;
  };
  const actorPrayerCaps=capPrayerOptions(actorPlan,normalized.actor,actorSkillId);
  const defenderPrayerCaps=capPrayerOptions(defenderPlan,normalized.target,defenderSkillId);
  const choose = (plan, choice) => selectV5Test(plan.test, choice || plan.test.options[0].id);
  const actorTest = choose(actorPlan, normalized.v5.choice);
  const defenderTest = defenderPlan ? choose(defenderPlan, normalized.defense.v5.choice) : null;
  const missingActorChoice = actorPlan.test.choiceRequired && !normalized.v5.choice;
  const missingDefenderChoice = defenderPlan?.test.choiceRequired && !normalized.defense.v5.choice;
  const result = resolvedV5Action(normalized, actorPlan, actorTest, defenderPlan, defenderTest);
  const adjustmentFor=(byOption,test)=>{
    const caps=byOption.get(test.optionId)||[];return caps.length?{rawSL:caps[0].rawSL,effectiveSL:caps[0].effectiveSL,caps}:null;
  };
  const actorPrayerAdjustment=adjustmentFor(actorPrayerCaps,actorTest);
  const defenderPrayerAdjustment=defenderTest?adjustmentFor(defenderPrayerCaps,defenderTest):null;
  if(actorPrayerAdjustment)result.prayerSLAdjustment=actorPrayerAdjustment;
  if(defenderPrayerAdjustment)result.defenderPrayerSLAdjustment=defenderPrayerAdjustment;
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
  let { actor, action, target } = normalized;
  const criticalTalentPlans=[];const supplementaryTalentPlans=[...(normalized.combatPrelude?.plans||[])];
  const criticalReady=[];
  const defenseSupport={...normalized,actor:target,target:actor,v5:normalized.defense?.v5||{},combatPrelude:{forge:normalized.combatPrelude?.defenderForge,alliedShield:normalized.combatPrelude?.defenderShield}};
  const prepareCritical=(subject,rolls,settings,role,inoffensive,parts)=>{
    const result=prepareV5TalentCriticalRolls(subject,rolls,{settings,role,inoffensive,parts,context:{...v5ActionQualityContext(role==='attacker'?normalized:{...normalized,actor:target,target:actor,action:{...normalized.defense,type:'attack'},v5:normalized.defense.v5}),kind:role==='attacker'?actorPlan.kind:defenderPlan?.kind}});
    criticalTalentPlans.push(result.plan);criticalReady.push(...result.unresolved);return result.rolls;
  };
  const magicFlags=actor?.extensions?.v5?.specialStates,psychologyKind=normalized.v5.context?.psychologyKind;
  const magicFearImmune=magicFlags?.fearTerrorImmunity && ['fear','terror'].includes(psychologyKind) || magicFlags?.fearImmune && (psychologyKind==='fear' || psychologyKind==='terror' && magicFlags?.terrorAsFear);
  if(magicFearImmune)actorTest={...actorTest,success:true,sl:Math.max(0,actorTest.sl),fumble:false,critical:false};
  const extremeLayer = normalized.noTestAction ? null : slExtremeLayers(actor)[0];
  const slExtreme = extremeLayer ? { before: actorTest.sl, after: actorTest.success ? Math.max(actorTest.sl, extremeLayer.slExtreme.magnitude) : Math.min(actorTest.sl, -extremeLayer.slExtreme.magnitude) } : null;
  if (slExtreme) actorTest = { ...actorTest, sl: slExtreme.after };
  let roll = actorTest.roll, targetScore = actorTest.score, success = actorTest.success, sl = actorTest.sl;
  const penalties = { value: actorPlan.penalty, names: actorPlan.penaltyStates };
  const slBonus = actorTest.details.modifiers.filter(item => item.id.startsWith('quality-')).reduce((sum, item) => sum + item.amount, 0);
  let doubled = actorTest.details.doubled;
  let criticalClassification = isCriticalRoll(roll, doubled, action.qualities);
  let fumbleClassification = isFumbleRoll(roll, doubled, action.qualities);
  let opposition = defenderTest ? resolveV5Opposition(actorTest, defenderTest) : null;
  let opposed = opposition ? { mode: 'opposed', attacker: { ...actorTest },
    defender: { ...defenderTest, label: normalized.defense.label, base: normalized.defense.base, mod: defenderTest.details.totalModifier, statePenalty: defenderPlan.penalty }, netSl: opposition.netSl,
    winner: opposition.winner === 'initiator' ? 'attacker' : 'defender', tie: opposition.tie } : null;
  opposed=resolveSizeOpposition(opposed,normalized.combatPrelude?.large,actorTest,defenderTest);
  let targetLevels = conditionLevels(target);
  const context = normalized.v5.context || {};
  let cannotDefend = targetLevels.has('surpris') || targetLevels.has('inconscient') || context.targetHelpless === true || context.targetCannotDefend === true;
  let helpless = (targetLevels.has('inconscient') || context.targetHelpless === true || context.targetCannotDefend === true)
    && (actorPlan.kind === 'melee' || (actorPlan.kind === 'ranged' && (context.pointBlank === true || context.shotRange==='point-blank')));
  let hit = helpless && !opposed ? true : opposed ? opposed.winner === 'attacker' : success;
  let engagedShot=null,engagedUnresolved=[],lethalDeath=null,lethalUnresolved=[];
  if(actorPlan.kind==='ranged'&&context.targetEngaged===true&&actorTest.advantage?.net<0&&actorTest.optionId==='reverse'&&!hit){
    const ordinaryPlan=previewV5Test({score:actorTest.score,roll:normalized.roll,kind:actorTest.kind,slModifiers:actorTest.details.modifiers,advantageSources:actorTest.advantage.advantage,disadvantageSources:actorTest.advantage.disadvantage.filter(row=>row.id!=='target-engaged')}),ordinary=selectV5Test(ordinaryPlan,ordinaryPlan.options[0].id);
    const wouldHit=defenderTest?resolveV5Opposition(ordinary,defenderTest).winner==='initiator':ordinary.success;
    if(wouldHit){
      const ids=context.engagedTargetIds,die=Number(context.engagedTargetRoll),participants=normalized.v5State?.participants||[];
      if(!Array.isArray(ids)||ids.length<2||new Set(ids).size!==ids.length||!ids.includes(normalized.target?.id)||!ids.every(id=>typeof id==='string'&&participants.some(row=>row.id===id&&row.zone==='active')))engagedUnresolved.push('Tir engagé : désigner tous les combattants actifs de la mêlée (cible initiale comprise).');
      else if(!Number.isInteger(die)||die<1||die>100)engagedUnresolved.push('Tir engagé : saisir le dé de sélection aléatoire d100.');
      else {
        const index=Math.floor((die-1)*ids.length/100),selectedId=ids[index],selected=participants.find(row=>row.id===selectedId);
        let selectedDefense=selectedId===normalized.target?.id?normalized.defense:context.engagedDefensesById?.[selectedId];
        const validDefense=!selectedDefense?false:Number.isFinite(Number(selectedDefense.base))&&Number.isInteger(Number(selectedDefense.roll))&&Number(selectedDefense.roll)>=1&&Number(selectedDefense.roll)<=100;
        if((!selectedDefense||!validDefense)&&normalized.defense)engagedUnresolved.push('Tir engagé : fournir le Test de défense de la cible tirée au sort.');
        else {
          const intendedTargetId=normalized.target?.id||null;
          normalized={...normalized,target:selected,targetId:selected?.id||null,defense:selectedDefense};target=selected;
          actorTest=ordinary;roll=actorTest.roll;targetScore=actorTest.score;success=actorTest.success;sl=actorTest.sl;doubled=actorTest.details.doubled;
          criticalClassification=isCriticalRoll(roll,doubled,action.qualities);fumbleClassification=isFumbleRoll(roll,doubled,action.qualities);
          defenderPlan=selectedDefense?buildCombatTest(normalized,'defender'):null;
          defenderTest=selectedDefense?selectV5Test(defenderPlan.test,selectedDefense.v5?.choice||defenderPlan.test.options[0].id):null;
          targetLevels=conditionLevels(target);cannotDefend=targetLevels.has('surpris')||targetLevels.has('inconscient')||context.targetHelpless===true||context.targetCannotDefend===true;
          helpless=(targetLevels.has('inconscient')||context.targetHelpless===true||context.targetCannotDefend===true)&&(actorPlan.kind==='melee'||(actorPlan.kind==='ranged'&&(context.pointBlank===true||context.shotRange==='point-blank')));
          opposition=defenderTest?resolveV5Opposition(actorTest,defenderTest):null;
          opposed=opposition?{mode:'opposed',attacker:{...actorTest},defender:{...defenderTest,label:selectedDefense.label,base:selectedDefense.base,mod:defenderTest.details.totalModifier,statePenalty:defenderPlan.penalty},netSl:opposition.netSl,winner:opposition.winner==='initiator'?'attacker':'defender',tie:opposition.tie}:null;
          hit=helpless&&!opposed?true:opposed?opposed.winner==='attacker':true;
          engagedShot={roll:die,selectedIndex:index,selectedTargetId:selectedId,intendedTargetId,candidates:[...ids],reason:'forced-disadvantage-miss'};
        }
      }
    }
  }
  let trip=null,tripFall=null,tripUnresolved=[];const tripSelected=context.trip===true&&opposed?.winner==='attacker';
  if(context.trip===true&&opposed){
    if(!tripSelected)trip={winner:opposed.winner,conditionApplied:false,costId:'combat:trip:momentum'};
    else {
      trip={winner:'attacker',conditionApplied:true,targetCondition:{key:'aterre',name:'À Terre',level:1,source:{kind:'trip',authorId:actor?.id}} ,costId:'combat:trip:momentum'};
      if(target?.extensions?.v5?.mounted===true){
        const knownToughness=Number(target.caracs?.E),declaredToughness=Number(context.tripFallToughnessScore),toughness=Number.isFinite(knownToughness)?knownToughness:context.tripFallToughnessConfirmed===true&&Number.isFinite(declaredToughness)?declaredToughness:null,tb=toughness===null?null:Math.floor(toughness/10);
        if(tb===null)tripUnresolved.push('Croche-pied monté : Bonus d’Endurance de la cible requis.');
        else {
          const rawDamage=Math.max(0,6-tb),fallProtection=previewMagicProtection(target,rawDamage,{wardRoll:context.tripFallWardRoll,nature:{fall:true},calm:context.tripFallCalmTest||null});
          if(!fallProtection.ready)tripUnresolved.push('Chute du Croche-pied : '+(fallProtection.error||'Protection de chute à résoudre.'));
          const damageLoss=fallProtection.ready?fallProtection.amount:0,criticals=[];let enduranceTest=null;
          if(fallProtection.ready&&damageLoss>tb){
            const roll=Number(context.tripFallEnduranceRoll);
            if(!Number.isInteger(roll)||roll<1||roll>100)tripUnresolved.push('Chute du Croche-pied : Test d’Endurance +0 requis (d100).');
            else {
              enduranceTest=previewV5Test({score:toughness,roll,kind:'test'}).options[0].result;
              if(!enduranceTest.success){
                const legRoll=Number(context.tripLegLocationRoll),legEffect=Number(context.tripLegCriticalEffectRoll),leg=Number.isInteger(legRoll)&&legRoll>=1&&legRoll<=100?locationOf(legRoll):null;
                if(!leg||leg.key!=='LEG')tripUnresolved.push('Chute du Croche-pied : saisir une localisation d100 de Jambe pour la Blessure Critique.');
                if(!Number.isInteger(legEffect)||legEffect<1||legEffect>100)tripUnresolved.push('Chute du Croche-pied : saisir le d100 d’effet Critique de Jambe.');
                if(leg&&leg.key==='LEG'&&Number.isInteger(legEffect))criticals.push(criticalDetails({effect:legEffect},leg,0));
                if(enduranceTest.sl<=-5){const locationRoll=Number(context.tripExtraLocationRoll),effectRoll=Number(context.tripExtraCriticalEffectRoll),location=Number.isInteger(locationRoll)&&locationRoll>=1&&locationRoll<=100?locationOf(locationRoll):null;
                  if(!location)tripUnresolved.push('Chute du Croche-pied : localisation d100 supplémentaire requise pour l’Échec éclatant.');
                  if(!Number.isInteger(effectRoll)||effectRoll<1||effectRoll>100)tripUnresolved.push('Chute du Croche-pied : d100 d’effet Critique supplémentaire requis.');
                  if(location&&Number.isInteger(effectRoll))criticals.push(criticalDetails({effect:effectRoll},location,0));
                }
              }
            }
          }
          const effects=criticals.map(detail=>criticalApplication(criticalItems(detail,null,[])));
          tripFall={yards:2,rawDamage,damageLoss,toughnessBonus:tb,armourApplied:false,protection:fallProtection,enduranceTest,criticals,extraCriticalWounds:effects.reduce((sum,row)=>sum+row.extraWounds,0),criticalStates:effects.flatMap(row=>row.states)};
        }
      }
    }
  }
  if(context.lethalIntent===true&&hit){
    if(!helpless)
      lethalUnresolved.push('Mort directe : seules les attaques de mêlée ou de tir à bout portant contre une cible sans défense sont admissibles.');
    else if(context.lethalTableEnabled!==true)lethalUnresolved.push('Mort directe : activer explicitement l’option létale de la table avant confirmation.');
    else if(context.confirmLethalDeath!==true)lethalUnresolved.push('Mort directe : confirmation explicite du MJ requise avant application.');
    else lethalDeath={targetId:target?.id,confirmedBy:'explicit-gm',tableOptionEnabled:true};
  }
  let scatter=null,scatterUnresolved=[];
  if(context.throwingWeapon===true&&attackType(action.type)&&actorPlan.kind==='ranged'&&!hit){
    const direction=Number(context.scatterDirectionRoll),dice=context.scatterDistanceRolls,distance=Number(context.shooterTargetDistanceYards);
    if(!Number.isInteger(direction)||direction<1||direction>10)scatterUnresolved.push('Déviation : saisir le résultat de direction d10 (1 à 10).');
    else if(direction===9||direction===10)scatter={directionRoll:direction,direction:direction===9?'aux pieds du tireur':'aux pieds de la cible',distanceYards:0};
    else if(!Array.isArray(dice)||dice.length!==2||dice.some(value=>!Number.isInteger(value)||value<1||value>10))scatterUnresolved.push('Déviation : saisir les deux dés de distance d10.');
    else if(!Number.isFinite(distance)||distance<0)scatterUnresolved.push('Déviation : saisir la distance tireur-cible en yards pour plafonner le résultat.');
    else {const rolled=dice[0]+dice[1],maximum=Math.floor(distance/2);scatter={directionRoll:direction,direction:['','haut-gauche','haut','haut-droite','gauche','droite','bas-gauche','bas','bas-droite'][direction],distanceRolls:[...dice],distanceYards:Math.min(rolled,maximum),rolledDistanceYards:rolled,maximumYards:maximum};}
  }
  const criticalAttack = !(context.specialAttack==='whirlwind-of-death'||hit&&['dirty-fighting','disarm','shieldsman'].includes(context.specialAttack)) && attackType(action.type) && normalized.v5.context?.silentTakedown !== true && success && criticalClassification.critique;
  const criticalLocationRoll = normalized.criticalRolls?.location;
  const location = hit && attackType(action.type) ? attackLocation(normalized, roll) : null;
  const criticalLocation = criticalAttack && criticalLocationRoll != null ? locationOf(criticalLocationRoll) : null;
  const inoffensive = action.qualities.some(q => q.id === 'inoffensive') && keywordMechanicalStatus('inoffensive').status === 'covered';
  const talentContext = { kind: actorPlan.kind, charging:actorPlan.charging, aimed: normalized.v5.aimed,
    weapon: { isMelee: typeof normalized.attackContext?.ranged === 'boolean' ? !normalized.attackContext.ranged : actorPlan.kind === 'melee' },
    actor: { id: actor?.id, size: normalized.v5.actorSize }, target: { id: target?.id, size: normalized.v5.targetSize },
    attack: { success, hit: attackType(action.type) && context.silentTakedown !== true && hit, usedAdvantageV5: actorTest.advantage.net > 0 },
    authorNextTurnEnd: normalized.authorNextTurnEnd };
  const damageTalents = evaluateV5Talents(actor, { event: 'damage.beforeProtection', role: 'attacker', context: talentContext });
  const beatTalents = evaluateV5Talents(actor, { event: 'action.afterAttack', role: 'attacker', context: talentContext,
    choices: normalized.v5.talentChoices || {}, excludeTalents: [V5_TALENT_IDS.furiousAssault] });
  const frenzyDamage=actorPlan.kind==='melee'&&(actor.states||[]).some(s=>s.key==='frenzy'&&sourceActive(s))?1:0;
  // Fureur d’Ulric : en Frénésie, +1d10 explosif (relancé et ajouté sur 10) au premier coup de mêlée touché du Tour, au lieu de l’attaque gratuite.
  const furyLayer=frenzyDamage&&hit?(actor.extensions?.v5?.divineEffects||[]).find(layer=>layer?.frenzyFury):null;
  const furyTurnId=normalized.v5Clock?.turnId??null;
  const furyDue=Boolean(furyLayer)&&furyLayer.frenzyFury.lastTurnId!==furyTurnId;
  const furyDice=context.ulricFuryDice;
  const furyValid=Array.isArray(furyDice)&&furyDice.length>0&&furyDice.every((die,index)=>Number.isInteger(die)&&die>=1&&die<=10&&(index<furyDice.length-1?die===10:die<10));
  const furyDamage=furyDue&&furyValid?furyDice.reduce((sum,die)=>sum+die,0):0;
  const damageBonus = (normalized.combatPrelude?.large?.damageBonus||0)+frenzyDamage+furyDamage+damageTalents.proposals.filter(row => row.op === 'modifyDamage').reduce((sum, row) => sum + row.amount, 0);
  let replacement = beatTalents.proposals.find(row => row.op === 'replaceDamage');
  const activeEffects = beatTalents.proposals.filter(row => row.op === 'createActiveEffect').map(row => ({
    ...clone(row.timedEffect), id: normalized.resolutionId + ':' + row.key, key: row.key, name: 'Battement', level: 1, duration: null }));
  const talentCriticalRolls=criticalAttack?prepareCritical(actor,normalized.criticalRolls,normalized.v5,'attacker',inoffensive,['first']):normalized.criticalRolls;
  let criticalFirst = criticalAttack && !replacement ? criticalDetails(talentCriticalRolls, criticalLocation, divineCriticalSeverityBonus(actor), inoffensive) : null;
  let damage = null;
  let protection = null;
  // Preserve every protection consulted, including pieces/criticals it suppresses.
  const protectionReceipts = [];
  const unresolved = [...(normalized.combatPrelude?.unresolved||[]),...actorPlan.unresolved, ...(defenderPlan?.unresolved || []), ...actorPlan.restrictions, ...(defenderPlan?.restrictions || []),...scatterUnresolved,...engagedUnresolved,...lethalUnresolved,...tripUnresolved];
  if(furyDue&&!furyValid)unresolved.push('Fureur d’Ulric : saisir le d10 de dégâts (relancer et ajouter sur 10).');
  // Bénédiction de Protection : un ennemi qui attaque le porteur doit réussir un Test de Calme Accessible (+2 DR) ; le MJ saisit le résultat dans v5.context.protectionCalm.
  const attackDeterrentLayer = attackType(action.type) && actor?.camp !== target?.camp
    ? (target?.extensions?.v5?.divineEffects || []).find(layer => layer?.attackDeterrent) : null;
  // Arbitrage MJ : un Test de Calme déjà réussi dispense cet ennemi de la bénédiction jusqu'à sa fin.
  if (attackDeterrentLayer && !(attackDeterrentLayer.attackDeterrent.passedAttackerIds || []).includes(actor?.id)) {
    const calm = context.protectionCalm;
    if (calm?.success === false) unresolved.push('Bénédiction de Protection : Test de Calme échoué, l’attaquant doit choisir une autre cible ou une autre Action.');
    else if (calm?.success !== true) unresolved.push('Bénédiction de Protection : saisir le Test de Calme Accessible (+2 DR) de l’attaquant.');
  }
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
  action.qualities = magicWeaponQualities(actor,action,normalized.v5.kind==='ranged');
  const allQualities = [...action.qualities, ...(normalized.defense?.qualities || [])];
  const approvedHomebrewQualities=[...(normalized.combatPrelude?.small?.approvedQualities||[]),...(normalized.combatPrelude?.small?.defenderApprovedQualities||[])];
  const mechanicalWarnings = allQualities.filter(q => !approvedHomebrewQualities.includes(q.id)&&Object.hasOwn(ENGINES, q.id)
    && (keywordMechanicalStatus(q.id).status !== 'covered' || ['target-score-bonus', 'add-units-die'].includes(ENGINES[q.id].engine)))
    .map(q => ({ keywordId: q.id, reason: 'description-mecanique-v5-requise' }));
  // Weapon damage of a landed attack (`BF+4` read with the attacker's F). A
  // `manual` status (unknown expression, F missing) means no automatic damage:
  // the MJ arbitrates instead of silently getting 0.
  let weapon = null;
  const protectionTalent=evaluateV5Talents(actor,{event:'protection.before',role:'attacker',context:{kind:actorPlan.kind,weapon:{impale:action.qualities.some(q=>q.id==='empaleuse')}}});
  supplementaryTalentPlans.push(protectionTalent);
  const ignoredArmourFlaws=protectionTalent.proposals.filter(row=>row.op==='ignoreArmourFlaw').map(row=>row.key);
  if(frenzyDamage)supplementaryTalentPlans.push({proposals:[{op:'modifyDamage',amount:1,origins:[actor.states.find(s=>s.key==='frenzy').source]}]});
  const weaponDamage = actionWeaponDamage(action);
  const strengthBonus = strengthBonusOf(actor?.caracs);
  if (!replacement && context.silentTakedown !== true && hit && attackType(action.type) && target && (hasOwn(action, 'damage') || hasOwn(action, 'damageFormula'))) {
    weapon = evaluateWeaponDamage(weaponDamage, strengthBonus);
  }
  // S-06 : nature de l'attaque (contact ou distance, magique, feu ; métal, projectile organique, origine selon le MJ) pour filtrer Protections, réductions, immunités et PA conditionnels.
  const nature=weaponAttackNature({actor,action,ranged:normalized.attackContext?.ranged,kind:normalized.v5.kind,declared:normalized.v5.context?.attackNature});
  // Normal damage always uses the final roll reversed, independently of critical dice.
  if (weapon) {
    protection = locationProtection(target, { ...normalized.protectionContext, ignoredArmourFlaws,
      ranged: normalized.attackContext?.ranged ?? (normalized.v5.kind === 'ranged' ? true : normalized.v5.kind === 'melee' ? false : normalized.protectionContext.ranged), defenseProvided: Boolean(normalized.defense),
      location, attackRoll: roll,
      hitLocationRoll: location?.roll, critical: criticalAttack, qualities: action.qualities, nature });
    protection=applyAlliedShield(normalized,applyForgeProtection(normalized,protection));
    protectionReceipts.push(protection);
    const targetArmour = protection.ap;

    // Souffle de Fumée (V5 p.357) : aucun dégât, ni ceux de l'action ni le NR.
    if (targetArmour !== null && !mechanicalWarnings.length && naturalPlanOf(actor, normalized.v5)?.noDamage !== true)     damage = computeDamage({
      weaponDamage,
      strengthBonus,
      damageBonus:damageBonus+magicWeaponBonus(actor,action,nature.ranged,Number(action.damage) || 0),
      sl: opposed ? opposed.netSl : sl,
      roll,
      targetToughnessBonus: Math.floor((Number(target.caracs?.E) || 0) / 10),
      targetArmour,
      qualities: action.qualities,damageMultiplier:normalized.combatPrelude?.small?.multiplier||1,approvedQualities:normalized.combatPrelude?.small?.approvedQualities||[]
    });
  }

  const special=previewTalentReplacement(normalized,{hit,test:actorTest,opposed,damage,location,qualityContext:v5ActionQualityContext(normalized)});damage=special.damage;if(special.replacement)replacement=special.replacement;supplementaryTalentPlans.push(...special.plans);unresolved.push(...special.unresolved);

  let magicProtection=null;
  if(damage && target){
    if(target.extensions?.v5?.damageCapToSlOnly && nature.magical!==true){
      const capped=Math.max(0,(opposed ? opposed.netSl : sl));
      damage={...damage,rawDamage:capped,net:capped,finalDamage:capped,absorption:0,be:0,paEffectif:0,targetArmour:0,magicDamageCap:true};
    }
    magicProtection=previewMagicProtection(target,damage.finalDamage,{wardRoll:normalized.v5.context?.magicWardRoll,nature,calm:normalized.v5.context?.reductionCalm});
    if(!magicProtection.ready)unresolved.push(magicProtection.error);
    damage={...damage,finalDamage:magicProtection.amount,magicProtection};
    if(magicProtection.wardSaved)criticalFirst=null;
  }
  // Critical hits use their own random location; normal weapon damage keeps the reversed final hit roll.
  if (criticalFirst?.location) {
    const guard = locationProtection(target, { ...normalized.protectionContext, ignoredArmourFlaws, location: criticalFirst.location,
      ranged: normalized.attackContext?.ranged ?? (normalized.v5.kind === 'ranged' ? true : normalized.v5.kind === 'melee' ? false : normalized.protectionContext.ranged), defenseProvided: Boolean(normalized.defense), attackRoll: roll, hitLocationRoll: criticalFirst.locationRoll,
      critical: true, qualities: action.qualities, nature });
    protectionReceipts.push(guard);
    if (guard.criticalIgnored) criticalFirst = null;
    else { criticalFirst.protection = guard; unresolved.push(...guard.manual.map(reason => `Protection du critique : ${reason}`)); }
  }
  const hpBefore = Math.max(0, Number(target?.hp) || 0);
  const excess = damage ? Math.max(0, damage.finalDamage - hpBefore) : 0;
  const second = !replacement && knownHp(target) && (excess>0||normalized.combatPrelude?.whirlwind?.active&&damage&&damage.finalDamage>=hpBefore) ? secondCritical(reverseV5Roll(roll), prepareCritical(actor,normalized.criticalRolls,normalized.v5,'attacker',inoffensive,['second']), excess * 10 + divineCriticalSeverityBonus(actor), inoffensive, location) : null;
  let criticalBlock = criticalFirst || second ? { kind: 'Critique', expanded: criticalClassification.élargi,
    acharnement: false, details: criticalFirst, ...(second ? { second, excessWounds: excess } : {}),
    ...(weapon?.status === 'manual' ? { secondHint: { locationRoll: reverseV5Roll(roll), location } } : {}) } : null;
  if (criticalBlock) {
    criticalBlock.items = criticalItems(criticalFirst, second, normalized.criticalDeclined);
    criticalBlock.application = criticalApplication(criticalBlock.items);
  } else if (context.silentTakedown !== true && !attackType(action.type) && actorTest.critical) criticalBlock = { kind: 'Critique', details: null };
  let defenderCritical = null;
  const defenderCriticalClassification = defenderTest ? isCriticalRoll(defenderTest.roll, defenderTest.details.doubled, normalized.defense.qualities) : null;
  // Nature de l'arme qui frappe pour la défense (critique défensif, Riposte) : contact, enchantement, réponses du MJ.
  const defenderNature = () => weaponAttackNature({ actor: target, action: { ...normalized.defense, type: 'attack' }, ranged: false, declared: normalized.defense?.v5?.context?.attackNature });
  const defenderFumbleClassification = defenderTest ? isFumbleRoll(defenderTest.roll, defenderTest.details.doubled, normalized.defense.qualities) : null;
  if (!(opposed?.winner==='defender'&&normalized.defense?.v5?.context?.specialAttack==='shieldsman')&&context.silentTakedown !== true && ['melee', 'ranged'].includes(defenderTest?.kind) && defenderTest.success && defenderCriticalClassification.critique) {
    const critLocation = normalized.defenderCriticalRolls?.location != null ? locationOf(normalized.defenderCriticalRolls.location) : null;
    const defenderRolls=prepareCritical(target,normalized.defenderCriticalRolls,normalized.defense.v5,'defender',normalized.defense.qualities.some(q=>q.id==='inoffensive'),['first']);
    const details = criticalDetails(defenderRolls, critLocation, divineCriticalSeverityBonus(target), normalized.defense.qualities.some(q => q.id === 'inoffensive'));
    const guard = critLocation ? locationProtection(actor, { location: critLocation, attackRoll: defenderTest.roll,
      hitLocationRoll: critLocation.roll, critical: true, ranged: false, qualities: normalized.defense.qualities,
      nature: defenderNature() }) : null;
    if (guard) protectionReceipts.push(guard);
    if (!guard?.criticalIgnored) {
      if (guard) { details.protection = guard; unresolved.push(...guard.manual.map(reason => `Protection du critique défensif : ${reason}`)); }
      const items = criticalItems(details, null, normalized.defenderCriticalDeclined);
      defenderCritical = { kind: 'Critique', targetId: actor?.id, details, items, application: criticalApplication(items) };
    }
  }
  let defenderDamage=null;
  const riposte=evaluateV5Talents(target,{event:'damage.beforeProtection',role:'defender',context:{kind:defenderPlan?.kind||'none',oppositionWon:opposed?.winner==='defender'}});
  supplementaryTalentPlans.push(riposte);
  if(riposte.proposals.some(row=>row.op==='riposte')){
    if(!knownHp(actor)||normalized.defense?.damage===undefined&&!normalized.defense?.damageFormula)unresolved.push('Riposte : Blessures de l’attaquant et dégâts de l’arme utilisée en défense requis.');
    else {
      const loc=locationOf(reverseV5Roll(defenderTest.roll));let guard=locationProtection(actor,{location:loc,attackRoll:defenderTest.roll,critical:defenderTest.critical,ranged:false,qualities:normalized.defense.qualities,nature:defenderNature()});
      guard=applyAlliedShield(defenseSupport,applyForgeProtection(defenseSupport,guard));
      protectionReceipts.push(guard);unresolved.push(...guard.manual.map(x=>'Riposte : '+x));
      const riposteBonuses=evaluateV5Talents(target,{event:'damage.beforeProtection',role:'attacker',context:{kind:defenderPlan.kind,charging:false,aimed:false,weapon:{isMelee:defenderPlan.kind==='melee'},actor:{id:target.id,size:normalized.v5.targetSize},target:{id:actor.id,size:normalized.v5.actorSize},attack:{hit:true,success:defenderTest.success,usedAdvantageV5:defenderTest.advantage.net>0}}});supplementaryTalentPlans.push(riposteBonuses);unresolved.push(...riposteBonuses.unresolved.flatMap(p=>p.fields.map(f=>'Riposte : préciser '+f+'.')));
      const riposteBonus=riposteBonuses.proposals.filter(p=>p.op==='modifyDamage').reduce((sum,p)=>sum+p.amount,0)+((target.states||[]).some(s=>s.key==='frenzy'&&sourceActive(s))?1:0);
      if(guard.ap!==null)defenderDamage={location:loc,protection:guard,...computeDamage({weaponDamage:actionWeaponDamage(normalized.defense),strengthBonus:strengthBonusOf(target?.caracs),damageBonus:riposteBonus,sl:-opposed.netSl,roll:defenderTest.roll,targetToughnessBonus:Math.floor((Number(actor?.caracs?.E)||0)/10),targetArmour:guard.ap,qualities:normalized.defense.qualities,damageMultiplier:normalized.combatPrelude?.small?.defenderMultiplier||1,approvedQualities:normalized.combatPrelude?.small?.defenderApprovedQualities||[]})};
    }
  }
  const defenseShield=normalized.defense?.v5?.context?.specialAttack==='shieldsman'?previewTalentReplacement({...normalized,actor:target,target:actor,action:{...normalized.defense,type:'attack'},v5:normalized.defense.v5},{hit:opposed?.winner==='defender',test:defenderTest,opposed:opposed?{...opposed,winner:opposed.winner==='defender'?'attacker':'defender'}:null,damage:defenderDamage,location:defenderDamage?.location,qualityContext:{}}):{plans:[],unresolved:[],changes:[],reminders:[]};supplementaryTalentPlans.push(...defenseShield.plans);unresolved.push(...defenseShield.unresolved);if(defenseShield.replacement){defenderDamage=null;defenderCritical=null;}
  const riposteExcess=defenderDamage&&knownHp(actor)?Math.max(0,defenderDamage.finalDamage-Number(actor.hp)):0;
  if(riposteExcess>0){
    const rolls=prepareCritical(target,normalized.defenderCriticalRolls,normalized.defense.v5,'defender',normalized.defense.qualities.some(q=>q.id==='inoffensive'),['second']);
    const extra=secondCritical(reverseV5Roll(defenderTest.roll),rolls,riposteExcess*10+divineCriticalSeverityBonus(target),normalized.defense.qualities.some(q=>q.id==='inoffensive'),defenderDamage.location);
    defenderCritical={...(defenderCritical||{kind:'Critique',targetId:actor.id,details:null}),second:extra,excessWounds:riposteExcess};
    defenderCritical.items=criticalItems(defenderCritical.details,extra,normalized.defenderCriticalDeclined);defenderCritical.application=criticalApplication(defenderCritical.items);
  }
  if(!defenseShield.replacement&&riposte.proposals.some(p=>p.op==='riposte')&&defenderDamage===null&&!unresolved.some(s=>s.startsWith('Riposte :')))unresolved.push('Riposte : dégâts de l’arme à arbitrer.');
  const weaponConditions = previewV5WeaponConditions({ qualities: action.qualities, hit: attackType(action.type) && hit,
    location, target, actor, damage, resolutionId: normalized.resolutionId, replaced: Boolean(replacement) });
  unresolved.push(...weaponConditions.unresolved);
  mechanicalWarnings.push(...weaponConditions.warnings);
  const defenderWeaponConditions=previewV5WeaponConditions({qualities:normalized.defense?.qualities||[],hit:Boolean(defenderDamage),location:defenderDamage?.location,target:actor,actor:target,damage:defenderDamage,resolutionId:normalized.resolutionId+':riposte'});
  unresolved.push(...defenderWeaponConditions.unresolved);mechanicalWarnings.push(...defenderWeaponConditions.warnings);
  supplementaryTalentPlans.push(...(defenderWeaponConditions.talentPlans||[]));
  const blackpowderStates=[];
  if(context.blackpowderBrokenTest===true){
    const word=v5QualityMechanicalStatus('a-poudre-noire');
    if(word.status!=='covered')unresolved.push('À Poudre noire : source à revalider.');
    if(actorSkillId!=='skill-43_61_6c_6d_65-base'||normalized.defense)unresolved.push('À Poudre noire : Test de Calme non opposé requis.');
    const shooter=(normalized.v5State?.participants||[]).find(p=>p.id===context.blackpowderShooterId);
    if(!shooter||shooter.id===actor.id)unresolved.push('À Poudre noire : désigner l’auteur du tir subi, même si le tir a raté.');
    if(shooter){const extra=evaluateV5Talents(shooter,{event:'condition.beforeAcquire',role:'attacker',context:{blackpowderBrokenTest:true,test:{success:actorTest.success},condition:{id:'brise'}}});supplementaryTalentPlans.push(extra);if(!actorTest.success&&word.status==='covered')blackpowderStates.push({id:normalized.resolutionId+':blackpowder:broken',key:'brise',name:'Brisé',level:1+extra.proposals.filter(p=>p.op==='increaseConditionAcquisition').reduce((sum,p)=>sum+p.amount,0),source:{kind:'quality',keywordId:'a-poudre-noire',authorId:shooter.id}});}
  }
  unresolved.push(...criticalReady);
  const magicHitStates = hit && attackType(action.type) && target && !replacement ? magicWeaponHitConditions(actor, action, nature.ranged, damage?.finalDamage || 0).map(row => ({ id: `${normalized.resolutionId}:magic-weapon:${row.name}`, key: row.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(), name: row.name, level: 1, source: { kind: 'magic-weapon', spellName: row.spellName } })) : [];
  // Attaque naturelle : états de la touche (Langue, Constricteur, Toile, Souffle) selon le plan du Trait ; rappels du plan joints au détail.
  const naturalPlan = naturalPlanOf(actor, normalized.v5), naturalReminders = [], { actorSize: naturalActorSize, targetSize: naturalTargetSize } = naturalSizes(normalized.v5);
  const naturalHitStates = [];
  // Cornes en attaque ordinaire : la Charge du Trait (Livre de base V5 p.358) est demandée, comme pour l'attaque naturelle choisie.
  if (normalized.damageReplaced) naturalReminders.push(normalized.damageReplaced);
  const inferredNatural = !naturalPlan && inferredNaturalPlan(actor, action, normalized.v5);
  if (inferredNatural) {
    if (inferredNatural.key === 'horns') unresolved.push(...inferredNatural.unresolved.filter(text => /Charge/.test(text)));
    naturalReminders.push(...inferredNatural.reminders.filter(text => /^Taille :/.test(text)));
  }
  if (naturalPlan) {
    naturalReminders.push(...naturalPlan.reminders);
    unresolved.push(...naturalPlan.unresolved.filter(text => !/Trait absent|déjà/.test(text)));
    const dealt = damage?.finalDamage > 0, smaller = Number.isInteger(naturalActorSize) && Number.isInteger(naturalTargetSize) && naturalActorSize > naturalTargetSize;
    for (const effect of naturalPlan.effects) {
      if (!effect.state || !hit || !attackType(action.type) || !target || replacement) continue;
      const applies = effect.trigger === 'touche' || effect.trigger === 'cible perdante' || (effect.trigger === 'dégâts' && dealt) || (effect.trigger === 'cible plus petite blessée' && dealt && smaller);
      if (applies) naturalHitStates.push({ id: `${normalized.resolutionId}:natural:${naturalPlan.key}:${foldKey(effect.state)}`, key: foldKey(effect.state), name: effect.state, level: 1, source: { kind: 'creature', trait: naturalPlan.key, ...(Number.isInteger(effect.strength) ? { strength: effect.strength } : {}) } });
    }
  }
  const targetConditionApplication = [...(criticalBlock?.application?.states || []).map(row => ({ ...clone(row), source: { ...(row.source || {}), kind: 'critical' } })), ...weaponConditions.proposed,...magicHitStates,...naturalHitStates,...special.states,...(trip?.conditionApplied?[trip.targetCondition]:[]),...(tripFall?.criticalStates||[])];
  const conditionChanges = {}, talentUsageRequests = [], conditionTalentPlans = [];
  const conditionPlan = (participant, states, role, authorId) => {
    if (!participant || !states?.length) return;
    const reduced = previewV5TalentConditions(participant, states, { state: normalized.v5State, clock: normalized.v5Clock,
      actionId: normalized.resolutionId + ':condition:' + participant.id });
    states.splice(0, states.length, ...reduced.states);
    talentUsageRequests.push(...reduced.usageRequests);
    conditionTalentPlans.push(reduced.plan);
    unresolved.push(...reduced.plan.unresolved.flatMap(row => row.fields.map(field => 'Talent : préciser ' + field + '.')));
    const receipt = acquireV5Conditions(participant, states, { resolutionId: normalized.resolutionId, authorId, targetId: participant.id, round: normalized.round, source: {} });
    conditionChanges[role] = receipt;
    unresolved.push(...receipt.needsInput.map(item => `${role === 'actor' ? 'Attaquant' : 'Cible'} : ${item.label}`));
  };
  // Un homoncule n'acquiert Hémorragique, Exténué, Empoisonné ni maladie que d'une source magique : l'aperçu les montre refusés.
  const familiarConditionRefusals = [];
  if (target) refuseFamiliarConditions(target, targetConditionApplication, nature?.magical === true, familiarConditionRefusals);
  conditionPlan(target, targetConditionApplication, 'target', actor?.id);
  if (criticalBlock?.application) criticalBlock.application.states = targetConditionApplication.filter(row => row.source?.kind !== 'quality');
  weaponConditions.applied = targetConditionApplication.filter(row => row.source?.kind === 'quality');
  const activation=previewV5TalentActivation(normalized,actorTest,opposed);supplementaryTalentPlans.push(activation.plan);unresolved.push(...activation.unresolved);
  const magicFumbleStates=!actorTest.success&&fumbleClassification.maladresse&&!replacement?magicWeaponFumbleConditions(actor,action,nature.ranged).filter(row=>!(row.exceptLore&&hasArcaneMagicLore(actor,row.exceptLore))).map(row=>({id:`${normalized.resolutionId}:magic-weapon-fumble:${row.name}`,key:row.name.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(),name:row.name,level:1,source:{kind:'magic-weapon',spellName:row.spellName}})):[];
  // Chaque source est jugée sur sa propre nature (règle de l'homoncule) : l'attaque ou l'arme enchantée de l'acteur, celle du défenseur, la poudre noire.
  const defenderMagical=target?defenderNature().magical===true:false;
  const kept=(rows,magical)=>{const copy=[...rows];if(actor)refuseFamiliarConditions(actor,copy,magical,familiarConditionRefusals);return copy;};
  const actorConditionApplication=[...kept(activation.conditions||[],nature?.magical===true),...kept(magicFumbleStates,nature?.magical===true),...kept((defenderCritical?.application?.states||[]).map(row=>({...row,source:{...row.source,kind:'critical'}})),defenderMagical),...kept(defenderWeaponConditions.proposed,defenderMagical),...kept(blackpowderStates,false)];
  conditionPlan(actor,actorConditionApplication,'actor',context.blackpowderBrokenTest?context.blackpowderShooterId:target?.id);
  if(defenderCritical?.application)defenderCritical.application.states=actorConditionApplication.filter(row=>row.source?.kind==='critical');
  defenderWeaponConditions.applied=actorConditionApplication.filter(row=>row.source?.keywordId==='assommante');
  const momentum = [];
  const planMomentum = (participant, events, exceptions=[]) => {
    if (!participant?.id) return;
    momentum.push({ participantId: participant.id, ...previewMomentumEvents({ hasMomentum: hasMomentum(participant), events, exceptions }) });
  };
  const actorEvents = [], targetEvents = [];
  if(normalized.combatPrelude?.targetIncomingMomentum)targetEvents.push({id:normalized.resolutionId+':slayer-charge',type:'chargeEnemy'});
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
  actorEvents.push(event('woundsLost', { amount: Math.min(Math.max(0, Number(actor?.hp) || 0), (defenderCritical?.application.extraWounds || 0)+(defenderDamage?.finalDamage||0)) }));
  actorEvents.push(event('conditionAcquired', { instances: conditionChanges.actor?.acquiredInstances || 0 }));
  const reversal=evaluateV5Talents(target,{event:'momentum.beforeLoss',role:'defender',context:{kind:defenderPlan?.kind||'none',test:{success:defenderTest?.success||false},attack:{hit:Boolean(hit&&attackType(action.type))}}});supplementaryTalentPlans.push(reversal);
  const resoluteActor=resoluteException(normalized,conditionChanges.actor?.participant||actor,normalized.v5,conditionChanges.actor?.acquiredInstances||0),resoluteTarget=resoluteException(normalized,conditionChanges.target?.participant||target,normalized.defense?.v5,conditionChanges.target?.acquiredInstances||0);supplementaryTalentPlans.push(...resoluteActor.plans,...resoluteTarget.plans);unresolved.push(...resoluteActor.unresolved,...resoluteTarget.unresolved);
  planMomentum(actor, actorEvents,resoluteActor.exceptions); planMomentum(target, targetEvents,[...resoluteTarget.exceptions,...reversal.proposals.filter(x=>x.op==='preventMomentumLoss').map(x=>({reason:x.key,talentId:x.origins[0].talentId,applies:true}))]);

  const bolt=lodgedHarpoon(normalized,criticalFirst,hit);supplementaryTalentPlans.push(...bolt.plans);
  const talentActionChanges=[...activation.changes,...special.changes,...defenseShield.changes,...bolt.changes,...finishImmediateAttack(normalized)];const situationAfter=previewSituationAfter(normalized,actorTest);talentActionChanges.push(...situationAfter.changes);supplementaryTalentPlans.push(...situationAfter.plans);
  for(const[subject,settings]of[[actor,normalized.v5],[target,normalized.defense?.v5]])if(subject){const active=(subject.states||[]).filter(s=>s.key==='debate'&&sourceActive(s));
    if(active.length){supplementaryTalentPlans.push({proposals:[{op:'activeDebate',origins:active.map(s=>s.source)}]});if(attackType(action.type)||settings?.context?.importantProblem===true)talentActionChanges.push({participantId:subject.id,removeIds:active.map(s=>s.id)});}}

  const healingPlan=evaluateV5Talents(actor,{event:'healing.afterTest',role:'actor',context:{recoveryTest:context.recoveryTest===true&&!attackType(action.type)},choices:normalized.v5.talentChoices||{}});supplementaryTalentPlans.push(healingPlan);
  unresolved.push(...healingPlan.unresolved.flatMap(p=>p.fields.map(f=>'Robuste : préciser '+f+'.')));
  if(context.recoveryTest===true&&!attackType(action.type)){
    if(!Number.isSafeInteger(context.recoveredWounds)||context.recoveredWounds<0)unresolved.push('Récupération : nombre normal de Blessures rendues par le Test requis.');
    else{const amount=context.recoveredWounds+healingPlan.proposals.filter(p=>p.op==='modifyHealing').reduce((sum,p)=>sum+p.amount,0),healing=healV5Wounds(actor,amount);
      const altered=healing.participant.states.filter(s=>JSON.stringify(s)!==JSON.stringify((actor.states||[]).find(old=>old.id===s.id))),removed=(actor.states||[]).filter(s=>!healing.participant.states.some(after=>after.id===s.id&&JSON.stringify(after)===JSON.stringify(s))).map(s=>s.id);
      talentActionChanges.push({participantId:actor.id,patch:{hp:healing.participant.hp},removeIds:removed,add:altered});activation.reminders.push('Récupération après Test : '+healing.hpDelta+' Blessure(s) effectivement rendue(s).',...healing.reminders);
    }
  }
  for(const[role,participant]of[['actor',actor],['target',target]]){
    if(!participant)continue;const predicted=conditionChanges[role]?.participant||participant;
    const exit=previewV5FrenzyExit(predicted,{round:normalized.round,resolutionId:normalized.resolutionId,state:normalized.v5State,clock:normalized.v5Clock,nearbyEnemiesDefeated:role==='actor'&&normalized.v5.context?.talentAction==='end-frenzy'&&normalized.v5.context.nearbyEnemiesDefeated===true});
    supplementaryTalentPlans.push(...exit.plans);talentUsageRequests.push(...exit.usageRequests);unresolved.push(...exit.unresolved);
    if(exit.ended)talentActionChanges.push({participantId:participant.id,removeKeys:['frenzy'],add:exit.participant.states.filter(s=>!predicted.states.some(before=>before.id===s.id))});
  }
  const secondaryTargets=[];
  if(normalized.combatPrelude?.whirlwind?.active&&hit&&damage){
    for(const id of context.engagedIds.filter(id=>id!==target.id)){
      const victim=normalized.v5State.participants.find(p=>p.id===id);
      let guard=locationProtection(victim,{...(context.whirlwindProtection?.[id]||{}),location,attackRoll:roll,hitLocationRoll:location.roll,critical:false,ranged:false,defenseProvided:false,qualities:action.qualities,nature});
      const supportInput={...normalized,target:victim,v5:{...normalized.v5,context:{...context,...context.whirlwindSupport?.[id]}},combatPrelude:{forge:normalized.combatPrelude?.forge,alliedShield:previewAlliedShields({...normalized,target:victim,v5:{...normalized.v5,context:context.whirlwindSupport?.[id]||{}}})}};
      supplementaryTalentPlans.push(...supportInput.combatPrelude.alliedShield.plans);unresolved.push(...supportInput.combatPrelude.alliedShield.unresolved);
      guard=applyAlliedShield(supportInput,applyForgeProtection(supportInput,guard));
      protectionReceipts.push(guard);unresolved.push(...guard.manual.map(message=>victim.name+' : '+message));
      if(guard.ap===null)continue;
      const victimInput={...normalized,target:victim,action:{...action,qualities:action.qualities.filter(q=>!q.talentOrigins?.some(o=>o.talentId==='talent-small'))},defense:undefined,v5:{...normalized.v5,targetSize:context.whirlwindSizes?.[id]}};const small=previewSmall(victimInput);supplementaryTalentPlans.push(...small.plans);unresolved.push(...small.unresolved);approvedHomebrewQualities.push(...small.approvedQualities);
      const unsupported=victimInput.action.qualities.filter(q=>!small.approvedQualities.includes(q.id)&&Object.hasOwn(ENGINES,q.id)&&(keywordMechanicalStatus(q.id).status!=='covered'||['target-score-bonus','add-units-die'].includes(ENGINES[q.id].engine)));
      mechanicalWarnings.push(...unsupported.map(q=>({keywordId:q.id,reason:'description-mecanique-v5-requise-hors-comparaison-petit',participantId:victim.id})));if(unsupported.length)continue;
      const dealt=computeDamage({weaponDamage,strengthBonus,damageBonus,sl:opposed.netSl,roll,targetToughnessBonus:Math.floor((Number(victim.caracs?.E)||0)/10),targetArmour:guard.ap,qualities:victimInput.action.qualities,damageMultiplier:small.multiplier,approvedQualities:small.approvedQualities});
      const excess=Math.max(0,dealt.finalDamage-Number(victim.hp)),enemy=victim.camp!==actor.camp;
      const rawRolls=context.whirlwindRolls?.[id]||{},settings={...normalized.v5,talentChoices:{...normalized.v5.talentChoices,...context.whirlwindChoices?.[id]}};
      const second=enemy&&dealt.finalDamage>=Number(victim.hp)?secondCritical(reverseV5Roll(roll),prepareCritical(actor,normalizeCriticalRolls(rawRolls),settings,'attacker',inoffensive,['second']),excess*10+divineCriticalSeverityBonus(actor),inoffensive,location):null;
      if(second?.pending)unresolved.push(victim.name+' : gravité réelle du critique de Tourbillon requise.');
      const critical=second?{kind:'Critique',second,excessWounds:excess,items:criticalItems(null,second,context.whirlwindDeclined?.[id]||[])}:null;if(critical)critical.application=criticalApplication(critical.items);
      const words=previewV5WeaponConditions({qualities:action.qualities,hit:true,location,target:victim,actor,damage:dealt,resolutionId:normalized.resolutionId+':'+id});
      supplementaryTalentPlans.push(...(words.talentPlans||[]));unresolved.push(...words.unresolved);mechanicalWarnings.push(...words.warnings);
      if(critical?.application)refuseFamiliarConditions(victim,critical.application.states,nature?.magical===true,familiarConditionRefusals);
      const incoming=[...(critical?.application.states||[]).map(s=>({...s,source:{...s.source,kind:'critical'}})),...words.proposed];
      refuseFamiliarConditions(victim,incoming,nature?.magical===true,familiarConditionRefusals);
      const reduced=previewV5TalentConditions(victim,incoming,{state:normalized.v5State,clock:normalized.v5Clock,actionId:normalized.resolutionId+':condition:'+id});
      conditionTalentPlans.push(reduced.plan);talentUsageRequests.push(...reduced.usageRequests);unresolved.push(...reduced.plan.unresolved.flatMap(r=>r.fields.map(f=>victim.name+' : préciser '+f)));
      const receipt=acquireV5Conditions(victim,reduced.states,{resolutionId:normalized.resolutionId,authorId:actor.id,targetId:id,round:normalized.round,source:{}});unresolved.push(...receipt.needsInput.map(r=>victim.name+' : '+r.label));
      let after=withMomentum({...receipt.participant,hp:Math.max(0,Number(victim.hp)-dealt.finalDamage-(critical?.application.extraWounds||0))},false);
      const exit=previewV5FrenzyExit(after,{round:normalized.round,resolutionId:normalized.resolutionId,state:normalized.v5State,clock:normalized.v5Clock});after=exit.participant;supplementaryTalentPlans.push(...exit.plans);talentUsageRequests.push(...exit.usageRequests);unresolved.push(...exit.unresolved);
      secondaryTargets.push({participantId:id,name:victim.name,before:clone(victim),participant:after,damage:dealt,location,critical,conditions:reduced.states});
    }
  }

  unresolved.push(...criticalReady);
  if(actorPlan.crewSkill){talentActionChanges.push({participantId:actor.id,removeIds:[actorPlan.crewSkill.id]});supplementaryTalentPlans.push({proposals:[{op:'substituteCrewSkill',origins:[actorPlan.crewSkill.source]}]});}
  return {
    resolutionId: normalized.resolutionId,
    baseRevision: normalized.baseRevision,
    input: normalized,
    status: 'preview',
    ruleVersion: V5_COMBAT_RULE_VERSION,
    test: actorTest,
    ...(slExtreme ? { slExtreme } : {}),
    defenderTest,
    momentum,
    conditionChanges,
    talentUsageRequests,
    talentPlans: [normalized.qualityTalentPlan, ...(actorPlan.talentPlans || []), ...(defenderPlan?.talentPlans || []), damageTalents, beatTalents, ...(weaponConditions.talentPlans||[]), ...criticalTalentPlans, ...supplementaryTalentPlans, ...conditionTalentPlans].filter(Boolean),
    talentSLChoices: { actor: actorPlan.talentSLChoices || [], defender: defenderPlan?.talentSLChoices || [] },
    weaponConditions,
    targetConditionApplication,actorConditionApplication,defenderWeaponConditions,familiarConditionRefusals,
    reminders: [...familiarConditionRefusals.map(row => `${row.name || 'Homoncule'} : ${row.message}`),...(magicFearImmune?['Le Bœuf Reste Debout : immunité aux Tests de Peur et Terreur pour la durée.']:[]),...activation.reminders,...special.reminders,...naturalReminders,...(hit&&attackType(action.type)&&target?reactionReminders(target,nature):[]),...(hit&&target&&damage?.finalDamage>0&&(target.extensions?.v5?.spellEffects||[]).some(e=>e.specialState?.festeringWoundTest)?[`Domaine de Nurgle (D-C51) : ${target.name||target.id} subit des Blessures ; proposer au MJ de jouer le Test de Blessure Suppurée (V5 p. 180). Rien n’est appliqué par l’outil.`]:[]),...(context.silentTakedown === true ? ['Neutralisation silencieuse : Blessures égales au BF et Inconscient si victoire ; Sonné et alarme si la cible gagne. Ces conséquences restent à arbitrer.'] : [])],
    activeEffects,talentActionChanges,secondaryTargets,
    damageReplacedByTalent: replacement ? clone(replacement) : null,defenderDamageReplacedByTalent:defenseShield.replacement||null,
    unresolved,
    weaponSkillReceipt: normalized.weaponSkillReceipt,
    defenderCritical,defenderDamage,
    actionType: action.type,
    attack: attackType(action.type),
    ulricFury: furyDue&&furyValid?{turnId:furyTurnId}:null,
    score: { base: actorTest.score, mod: actorTest.details.totalModifier, statePenalty: penalties.value, penaltyStates: penalties.names, target: targetScore },
    roll,
    success,
    hit,
    scatter,
    engagedShot,
    lethalDeath,
    trip,
    tripFall,
    extraordinaryShot:actorPlan.extraordinaryShot||null,
    reachGuide:actorPlan.kind==='melee'?computeV5WeaponReachGuide(context.weaponReach||(actor?.equipment?.find(item=>item.id===action?.extensions?.fiche?.equipmentId)||action?.extensions?.equipment)?.reach||action?.reach):null,
    rangeBands:actorPlan.kind==='ranged'?computeV5WeaponRangeBands(context.weaponRangeYards??(actor?.equipment?.find(item=>item.id===action?.extensions?.fiche?.equipmentId)||action?.extensions?.equipment)?.range??action?.range,actor):null,
    sl,
    resultTier: actorTest.resultTier,
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
    mechanics: [...new Set([...allQualities.map(q => q.id),...secondaryTargets.flatMap(s=>s.damage.activeQualities.map(q=>q.id)),...(context.blackpowderBrokenTest?['a-poudre-noire']:[]),
      ...(v5ShieldDefense(normalized).confirmed ? ['protectrice'] : []),
      ...protectionReceipts.flatMap(guard => guard.evaluatedKeywords || [])])].map(id => {
      const coverage = v5QualityMechanicalStatus(id);
      return { id, name: coverage.word?.name ?? id, status: approvedHomebrewQualities.includes(id)?'homebrew-covered':coverage.status, engine: coverage.engine?.engine ?? null,
        effectVersion: coverage.effectVersion ?? null, effect: coverage.word?.effect ?? null, edition: coverage.word?.edition ?? null,
        source: coverage.word?.source ?? null, limitations: coverage.limitations || [] };
    }),
    opposition: opposed
      || (OPPOSITION_TYPES.has(action.type) ? { mode: 'manual', reason: 'aucune-convention-locale-vérifiée' } : null),
    application: { status: 'pending', applied: false }
  };
}

export const replayResolution = previewResolution;

/**
 * Règle de l'homoncule (`previewFamiliarCondition`) appliquée à l'aperçu : retire de `states` (sur place) ceux que `subject` ne peut pas
 * acquérir de cette source et les note dans `refusals` avec la raison. `magical` : nature magique de l'attaque (sort, arme enchantée,
 * qualité Magique, créature au Trait Magique ou déclaration du MJ, L17 p. 187).
 */
function refuseFamiliarConditions(subject, states, magical, refusals) {
  for (let index = states.length - 1; index >= 0; index--) {
    const check = previewFamiliarCondition(subject, states[index], { magical });
    if (check.ok) continue;
    refusals.unshift({ participantId: subject.id, name: subject.name, ...check.receipt });
    states.splice(index, 1);
  }
}

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
  for(const receipt of(preview.mechanics||[]).filter(r=>r.status==='homebrew-covered')){const live=v5QualityMechanicalStatus(receipt.id);if(live.word?.effect!==receipt.effect||live.word?.edition!==receipt.edition||live.word?.source!==receipt.source)return{status:'manual',reason:'Qualité de Petit modifiée : recalcul requis.',state:clone(currentState),resolution:clone(preview)};}
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
  // Plusieurs têtes : le critique à la tête ne touche qu'une tête (`v5.context.headId`, sinon la première valide).
  const headHit = preview.attack && target ? applyHeadCriticals(target, [preview.critical?.details, preview.critical?.second], preview.input.v5?.context?.headId) : null;
  const rawConditions = preview.targetConditionApplication || criticalEffects.states;
  // Seuls les Sonné issus des critiques à la tête sont retirés (un Sonné d'un autre critique reste).
  let toStrip = headHit?.stripStunned ? headHit.stunnedCount : 0;
  const targetConditions = rawConditions.filter(condition => !(condition.key === 'sonne' && toStrip > 0 && toStrip--));
  if ((preview.attack || preview.tripFall || preview.trip?.conditionApplied) && preview.targetId && (preview.damage || criticalEffects.extraWounds || targetConditions.length || headHit || preview.lethalDeath || preview.tripFall)) {
    if (!target) return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    if (JSON.stringify(target) !== JSON.stringify(preview.input.target)) {
      return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    }
    const updated = clone(target);
    if (headHit) {
      updated.extensions ??= {};
      updated.extensions.v5 = { ...(updated.extensions.v5 || {}), heads: headHit.registry };
    }
    const oldHp = Number(updated.hp) || 0;
    updated.hp = Math.max(0, oldHp - previewHpLoss(preview) - (preview.tripFall?.damageLoss||0) - (preview.tripFall?.extraCriticalWounds||0));
    if(preview.lethalDeath?.targetId===updated.id){updated.hp=0;updated.extensions??={};updated.extensions.v5={...(updated.extensions.v5||{}),dead:true};}
    if(preview.tripFall){updated.extensions??={};updated.extensions.v5={...(updated.extensions.v5||{}),mounted:false};}
    if (targetConditions.length) {
      const receipt = acquireV5Conditions(updated, targetConditions, { resolutionId: preview.resolutionId, authorId: preview.input.actor?.id, targetId: updated.id, round: preview.input.round, source: {} });
      if (!receipt.ready) return { status: 'manual', reason: receipt.needsInput[0].label, state: clone(currentState), resolution: clone(preview) };
      Object.assign(updated, receipt.participant);
    }
    appendCriticalWoundRecords(updated, [preview.critical?.details, preview.critical?.second],
      { resolutionId: preview.resolutionId, authorId: preview.input.actor?.id, round: preview.input.round, beforeStates: target.states || [] });
    if(preview.tripFall?.criticals?.length)appendCriticalWoundRecords(updated,preview.tripFall.criticals,{resolutionId:preview.resolutionId+':fall',authorId:preview.input.actor?.id,round:preview.input.round,beforeStates:target.states||[],source:'fall'});
    nextState.participants = participantListWithUpdate(currentState, preview.targetId, updated);
  }
  const defenderEffects = preview.defenderCritical?.application;
  if ((defenderEffects||preview.defenderDamage||preview.actorConditionApplication?.length) && preview.input.actor?.id) {
    const liveActor = participantById(nextState, preview.input.actor.id);
    if (!liveActor) return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    const updated = clone(liveActor);
    updated.hp = Math.max(0, (Number(updated.hp) || 0) - (defenderEffects?.extraWounds||0) - (preview.defenderDamage?.finalDamage||0));
    if (preview.actorConditionApplication?.length) {
      const receipt = acquireV5Conditions(updated, preview.actorConditionApplication, { resolutionId: preview.resolutionId, authorId: preview.input.v5.context?.blackpowderShooterId||preview.input.target?.id, targetId: updated.id, round: preview.input.round, source: {} });
      if (!receipt.ready) return { status: 'manual', reason: receipt.needsInput[0].label, state: clone(currentState), resolution: clone(preview) };
      Object.assign(updated, receipt.participant);
    }
    appendCriticalWoundRecords(updated, [preview.defenderCritical?.details, preview.defenderCritical?.second],
      { resolutionId: preview.resolutionId, authorId: preview.input.target?.id, round: preview.input.round, beforeStates: liveActor.states || [] });
    nextState.participants = participantListWithUpdate(nextState, updated.id, updated);
  }
  if (preview.activeEffects?.length) {
    const live = participantById(nextState, preview.targetId);
    if (!live) return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    const updated = { ...clone(live), states: [...(live.states || []), ...clone(preview.activeEffects)] };
    nextState.participants = participantListWithUpdate(nextState, live.id, updated);
  }
  for(const row of preview.secondaryTargets||[]){const live=participantById(nextState,row.participantId);if(!live||JSON.stringify(live)!==JSON.stringify(row.before))return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};const secondaryUpdated=clone(row.participant);appendCriticalWoundRecords(secondaryUpdated,[row.critical?.second],{resolutionId:preview.resolutionId,authorId:preview.input.actor?.id,round:preview.input.round,beforeStates:live.states||[]});nextState.participants=participantListWithUpdate(nextState,live.id,secondaryUpdated);}
  for (const change of preview.momentum || []) {
    const live = participantById(nextState, change.participantId);
    if (live) nextState.participants = participantListWithUpdate(nextState, live.id, withMomentum(live, change.after));
  }
  for(const change of preview.talentActionChanges||[]){
    const live=participantById(nextState,change.participantId);if(!live)return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
    let updated={...clone(live),...clone(change.patch||{}),states:[...(live.states||[]).filter(s=>!change.removeKeys?.includes(s.key)&&!change.removeIds?.includes(s.id)),...(change.add||[])]};
    if(typeof change.momentum==='boolean')updated=withMomentum(updated,change.momentum);nextState.participants=participantListWithUpdate(nextState,live.id,updated);
  }
  for(const p of Array.isArray(nextState.participants)?nextState.participants:Object.values(nextState.participants))nextState.participants=participantListWithUpdate(nextState,p.id,refreshV5TalentEffects(p,{round:preview.input.round,resolutionId:preview.resolutionId}));
  // Coup Critique infligé par l'attaquant (cible principale ou secondaire) ou par le défenseur : les couches divines « consumeOn: critical » (Sauvagerie) prennent fin dans la même commande.
  if (preview.attack) {
    const inflicters = [];
    if ((preview.critical?.details || preview.critical?.second || (preview.secondaryTargets || []).some(row => row.critical?.details || row.critical?.second)) && preview.input.actor?.id) inflicters.push(preview.input.actor.id);
    if ((preview.defenderCritical?.details || preview.defenderCritical?.second) && preview.targetId) inflicters.push(preview.targetId);
    for (const id of inflicters) {
      const live = participantById(nextState, id);
      const consumed = live && consumeDivineLayers(live, 'critical');
      if (consumed) nextState.participants = participantListWithUpdate(nextState, live.id, refreshEffectLayers(consumed, live));
    }
  }
  // Bénédiction de Protection : retenir le Test de Calme réussi pour cet attaquant jusqu'à la fin de la bénédiction.
  if (preview.attack && preview.input.v5?.context?.protectionCalm?.success === true && preview.input.actor?.id && preview.targetId) {
    const liveTarget = participantById(nextState, preview.targetId);
    const layer = liveTarget && (liveTarget.extensions?.v5?.divineEffects || []).find(row => row?.attackDeterrent);
    if (liveTarget && layer) {
      const updated = clone(liveTarget);
      const updatedLayer = updated.extensions.v5.divineEffects.find(row => row?.attackDeterrent);
      updatedLayer.attackDeterrent = { ...updatedLayer.attackDeterrent,
        passedAttackerIds: [...new Set([...(updatedLayer.attackDeterrent.passedAttackerIds || []), preview.input.actor.id])] };
      nextState.participants = participantListWithUpdate(nextState, liveTarget.id, updated);
    }
  }
  // Fureur d’Ulric : marquer le Tour du premier coup de mêlée touché (le d10 n’est plus redemandé ce Tour).
  if (preview.ulricFury && preview.input.actor?.id) {
    const liveActor = participantById(nextState, preview.input.actor.id);
    const layer = liveActor && (liveActor.extensions?.v5?.divineEffects || []).find(row => row?.frenzyFury);
    if (liveActor && layer) {
      const updated = clone(liveActor);
      const updatedLayer = updated.extensions.v5.divineEffects.find(row => row?.frenzyFury);
      updatedLayer.frenzyFury = { ...updatedLayer.frenzyFury, lastTurnId: preview.ulricFury.turnId };
      nextState.participants = participantListWithUpdate(nextState, liveActor.id, updated);
    }
  }
  nextState.revision = currentState.revision + 1;
  nextState.appliedResolutionIds = [...appliedIds, preview.resolutionId].slice(-MAX_APPLIED_RESOLUTION_IDS);
  const resolution = clone(preview);
  if(preview.lethalDeath)resolution.lethalDeath={...clone(preview.lethalDeath),application:{hp:0,dead:true}};
  if(preview.tripFall)resolution.tripFall={...clone(preview.tripFall),application:{hpLoss:preview.tripFall.damageLoss+(preview.tripFall.extraCriticalWounds||0),mounted:false,prone:preview.trip?.conditionApplied===true}};
  resolution.application = { status: 'applied', applied: true, revision: nextState.revision };
  return { status: 'applied', state: nextState, resolution };
}
