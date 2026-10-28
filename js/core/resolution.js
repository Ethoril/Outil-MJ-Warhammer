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
import { bestiaryProfileStateImmunity, decorateBestiaryProfileAction, planBestiaryProfileAbilities, planBestiaryProfileAbility } from './creature-abilities.js';
import { applyHeadCriticals } from './creature-heads.js';
import { acquireV5Conditions,healV5Wounds } from './v5-effects.js';
import { slExtremeLayers } from './v5-divine-effects-tests.js';
import { hasArcaneMagicLore } from './v5-magic-attributes.js';
import {divineSocialRestriction} from './v5-divine-access.js';
import { previewV5Test,selectV5Test, resolveV5Opposition, reverseV5Roll,refreshV5ResultTier } from './v5-roll.js';
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
import { previewCombatFailure } from './v5-combat-fumbles.js';
import { previewGrappleInitiation, applyGrappleInitiation, previewGrappleAction, applyGrappleAction } from './v5-grappling.js';
import { createCriticalAftermathRecord, updateCriticalDeathCountdown } from './v5-critical-aftermath.js';
import { creatureSizeOf } from './creature-size.js';
import { advanceV5NetEscape, conditionalV5KnifeQualities, entanglementStrength, naturalWeaponDefaults, previewV5Blast, previewV5Fast, previewV5Hack, previewV5HookedNet, previewV5ImpaleProjectile, previewV5Inflict, previewV5Parry, previewV5PistolContact, previewV5Shield, previewV5Slash, previewV5Spread, previewV5TrapBlade, validateV5ShieldHands } from './v5-weapon-qualities.js';
import { consumeV5WeaponShot, initialV5ReloadState } from './v5-reloading.js';
import { appendageCriticalLocation, deriveHitMorphology, resolveCreatureHitLocation } from './v5-hit-morphology.js';
import { mountedRiderEventsFor, mountedRideAnswerFor, planMountedAttack, planMountedChargeDamage, planMountedDodge, planMountedFall, resolveMountedMount, V5_RIDE_SKILL_ID } from './v5-mounted-combat.js';
import { previewSupplementalEquipment } from './v5-supplemental-equipment.js';

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
  if(detail.defenderResultTier?.label)parts.push(`Palier du défenseur : ${detail.defenderResultTier.label}`);
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
  if (detail.spreadPlan?.targets?.length) parts.push(`Dispersion : ${detail.spreadPlan.targets.length} cible(s) choisie(s) par le MJ · bande ${detail.spreadPlan.rangeBand}.`);
  if (detail.projectileLodging) {
    const lodged=detail.projectileLodging;
    const projectileLabel=lodged.genericProjectile?({fleche:'flèche',carreau:'carreau',balle:'balle'}[lodged.ammunitionType]||'générique'):lodged.ammunitionId;
    parts.push(`Empaleuse : projectile ${projectileLabel} fiché; récupération bloquée jusqu’à ${lodged.removal==='surgery'?'chirurgie':'Test de Guérison'}.`);
  }
  if (detail.combatFailure?.fumble?.outcome) parts.push(`Table des maladresses (${detail.combatFailure.fumble.roll}) : ${detail.combatFailure.fumble.outcome.label}`);
  if (detail.combatFailure?.defender?.outcome) parts.push(`Table des maladresses du défenseur (${detail.combatFailure.defender.roll}) : ${detail.combatFailure.defender.outcome.label}`);
  if (detail.combatFailure?.misfire?.outcome) parts.push(`Incident de poudre (${detail.combatFailure.misfire.roll}) : ${detail.combatFailure.misfire.outcome.label}`);
  if (detail.combatFailure?.misfire?.salvo?.outcome) parts.push(`Incident de Salve (${detail.combatFailure.misfire.salvo.roll}) : ${detail.combatFailure.misfire.salvo.outcome.label}`);
  for (const reminder of detail.combatFailure?.reminders || []) parts.push(reminder);
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
// F2-H : actions de profil qui posent des états sans infliger de dégâts ni de critique (Immersion, lasso de soie, crachat).
const NO_DAMAGE_PROFILE_ABILITIES = new Set(['sea-elemental-immersion', 'cliff-spider-lasso', 'farmyard-beast-spit']);
export function normalizeResolutionInput(input = {}) {
  if (!isRecord(input)) throw new ResolutionError('Entrée de résolution invalide');
  const actor = isRecord(input.actor) ? clone(input.actor) : null;
  const action = decorateBestiaryProfileAction(actor, isRecord(input.action) ? clone(input.action) : {});
  const ownedAbility = action.extensions?.v5?.specialProfileAbility;
  if (ownedAbility && planBestiaryProfileAbility(actor, ownedAbility).available === false)
    throw new ResolutionError('Cette action appartient à un autre profil de bestiaire.', 'PROFILE_ACTION_NOT_OWNED');
  if (action.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge'
    && ((input.v5?.context?.f2h?.fatigued === true) || actor?.states?.some(row => ['extenue', 'fatigue', 'fatigued'].includes(foldKey(row.key || row.name)))))
    action.damage = 6;
  if (/griffes du tigre|tiger claws/i.test(String(action.name || action.note || action.extensions?.equipment?.name || ''))) {
    const brawling=(actor?.skills||[]).find(row=>[row.sourceName,row.name,row.nom].filter(Boolean).some(value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/melee\s*\(brawling\)|corps.?a.?corps\s*\(bagarre\)/i))&&Number.isFinite(Number(row.total??row.value)));
    if(!brawling)throw new ResolutionError('Les Griffes du tigre exigent Corps à corps (Bagarre) lié au profil.', 'SKILL_LINK_REQUIRED');
    action.base=Number(brawling.total??brawling.value);action.attr='CC';action.extensions={...(action.extensions||{}),fiche:{...(action.extensions?.fiche||{}),skillId:brawling.id||undefined}};
  }
  if (/warp blade|lame de malepierre/i.test(String(action.name || action.note || action.extensions?.equipment?.name || ''))) {
    const present = new Set((action.qualities || []).map(row => typeof row === 'string' ? row : row?.id));
    action.qualities = [...(action.qualities || []), ...['defensive', 'entaille', 'empaleuse'].filter(id => !present.has(id))];
  }
  if (/warpstone shard|eclat de malepierre|éclat de malepierre/i.test(String(action.name || action.note || action.extensions?.equipment?.name || '')) &&
      !(action.qualities || []).some(row => ['perforante', 'penetrating'].includes(typeof row === 'string' ? row : row?.id))) {
    action.qualities = [...(action.qualities || []), 'perforante'];
  }
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
  const noTestAction=!attackType(action.type)&&!input.defense&&(input.v5?.context?.lightFuseAction===true||input.v5?.context?.bombDetonation===true||typeof input.v5?.context?.recoverDroppedWeaponId==='string'||noTestV5TalentAction(actor,input.v5?.context?.talentAction,target));
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
  let selectedEquipment = actor?.equipment?.find(item => item.id === action.extensions?.fiche?.equipmentId);
  if (input.v5?.context?.attackWithShield === true) {
    const shield = actor?.equipment?.find(item => item.id === input.v5.context.actorShieldId && item.kind === 'shield');
    const improvised = getReferenceCatalogue().items.find(item => item.id === 'weapon-armes-corps-a-corps-base-arme-improvisee');
    if (shield) {
      action.extensions = { ...(action.extensions || {}), fiche: { ...(action.extensions?.fiche || {}), equipmentId: shield.id } };
      action.extensions.equipment = clone(improvised);
      action.damage = 1;
      action.damageFormula = 'BF +1';
      action.qualities = equipmentQualities(improvised);
      action.contactImprovised = true;
      action.reach = 'Personnelle';
      selectedEquipment = shield;
    }
  }
  const weaponItem = input.v5?.context?.attackWithShield === true ? action.extensions?.equipment : selectedEquipment;
  const ammunition = actor?.equipment?.find(item => item.id === input.ammunitionId && item.kind === 'ammunition');
  if(input.ammunitionId && !ammunition) throw new ResolutionError('Munition déclarée introuvable', 'AMMUNITION_NOT_FOUND');
  if(ammunition){const compatibility=ammunitionCompatibility(weaponItem,ammunition);if(compatibility.status==='incompatible'||(compatibility.status==='manual'&&input.ammunitionArbitrated!==true))throw new ResolutionError('La compatibilité de cette munition avec cette arme doit être vérifiée', 'AMMUNITION_INCOMPATIBLE', compatibility);}
  const merged = ammunition && weaponItem ? mergeEquipmentQualities(weaponItem, ammunition) : null;
  let qualities = normalizeQualities(merged ? [...(action.qualities || []), ...equipmentQualities(ammunition)] : action.qualities || input.qualities || []);
  const wieldedPavise=input.v5?.context?.attackWithShield===true&&actor?.equipment?.find(item=>item.id===input.v5.context.actorShieldId&&item.kind==='shield'&&/pavise|pavois/i.test(String(item.name||'')));
  if(wieldedPavise){
    action.damageFormula='BF +2';delete action.damage;
    if(!qualities.some(row=>row.id==='defensive'))qualities.push({id:'defensive'});
  }
  action.qualities = qualities;
  const resolutionId = String(input.resolutionId || input.id || defaultResolutionId(actor, action, target, baseRevision, roll));
  if (!resolutionId.trim()) throw new ResolutionError('resolutionId invalide');
  const v5Settings=isRecord(input.v5)?clone(input.v5):{};
  const v5Context={...(v5Settings.context||{}),...(['cliff-spider-lasso','farmyard-beast-spit'].includes(action.extensions?.v5?.specialProfileAbility)?{rangedOppositionAllowed:true}:{})};
  v5Settings.context=v5Context;
  const actionLabel=foldKey([action.name,action.note,action.skillName,v5Context.skillName].filter(Boolean).join(' '));
  const wulfrikSocial = (actor?.extensions?.v5?.bestiary?.id === 'E0-P-921' || actor?.profileId === 'E0-P-921')
    && v5Context.f2h?.targetChaosFollower === true
    && ['charme', 'charm', 'intimidation', 'commandement', 'leadership'].some(name => actionLabel.includes(name));
  if (wulfrikSocial) v5Settings.slModifier = (Number(v5Settings.slModifier) || 0) + 1;
  if(/focalisation/.test(actionLabel)&&['F-L06-1104','F-L06-1105'].includes(v5Context.focalisationSupplementRuleId)){
    const focus=previewSupplementalEquipment({item:{supplementalRuleId:v5Context.focalisationSupplementRuleId,associatedDomain:v5Context.focalisationAssociatedDomain,robeRank:v5Context.focalisationRobeRank,focusRank:v5Context.focalisationFocusRank},
      spell:{wind:v5Context.focalisationDomain},context:{focusRank:v5Context.focalisationFocusRank}});
    if(focus.casting.focusSL){v5Settings.slModifiers=[...(v5Settings.slModifiers||[]),{id:`supplement:${focus.ruleId}`,label:`${focus.label} · Focalisation (${v5Context.focalisationDomain})`,amount:focus.casting.focusSL}];}
  }
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
    v5: v5Settings,
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
    protectionContext: { ...(isRecord(input.protectionContext) ? clone(input.protectionContext) : {}),
      ...(/warp blade|lame de malepierre/i.test(String(action.name || action.note || action.extensions?.equipment?.name || '')) ? { ignoreMetalArmour: true } : action.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge' ? { ignoreMetalArmour: 'non-magical' } : {}) },
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
function creatureLocationOf(roll, target, context = {}) {
  const baseLocation = locationOf(roll);
  return resolveCreatureHitLocation({ roll: baseLocation.roll, morphology: context.hitMorphology !== undefined ? context.hitMorphology : deriveHitMorphology(target), spiderLegSide: context.spiderLegSide, baseLocation });
}
const criticalTableLocation = (location, context = {}) => context.hitAppendage ? appendageCriticalLocation(location, context.hitAppendage) : location;
const CALLED_SHOT_LOCATIONS = Object.freeze({ head: { key: 'HEAD', name: 'Tête', side: null }, body: { key: 'BODY', name: 'Corps', side: null },
  leftArm: { key: 'ARM', name: 'Bras Gauche', side: 'left' }, rightArm: { key: 'ARM', name: 'Bras Droit', side: 'right' },
  leftLeg: { key: 'LEG', name: 'Jambe Gauche', side: 'left' }, rightLeg: { key: 'LEG', name: 'Jambe Droite', side: 'right' } });
function attackLocation(normalized, roll, target) {
  const context = normalized.v5.context || {};
  if (context.calledShot !== true) {
    return creatureLocationOf(reverseV5Roll(roll), target, context);
  }
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
  present.forEach((detail,index)=>{
    const table=detail.location?.key,effectRoll=detail.effectRoll;
    if(!table||!Number.isSafeInteger(effectRoll))return;
    const stored=createCriticalAftermathRecord(participant,{table,effectRoll,location:detail.location?.name||table,resolutionId,criticalIndex:index,authorId,round});
    if(stored.status==='applied')Object.assign(participant,stored.participant);
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
function incidentalArmour(participant, location) {
  const guard=locationProtection(participant,{location,critical:false,ranged:false,defenseProvided:false});
  return guard.ap??guard.baseAp??0;
}

export function previewResolution(input) {
  const initial=normalizeResolutionInput(input);
  if(initial.v5?.context?.grappleAction){
    initial.v5={...initial.v5,context:{...(initial.v5.context||{}),involvesMovement:true}};
    if(initial.defense?.v5)initial.defense={...initial.defense,v5:{...initial.defense.v5,context:{...(initial.defense.v5.context||{}),involvesMovement:true}}};
  }
  if(initial.v5?.context?.netEscapeConditionId)
    initial.v5={...initial.v5,context:{...(initial.v5.context||{}),involvesMovement:true}};
  const weaponItem = initial.v5?.context?.attackWithShield === true
    ? initial.action?.extensions?.equipment
    : initial.actor?.equipment?.find(item => item.id === initial.action?.extensions?.fiche?.equipmentId)||initial.action?.extensions?.equipment;
  const weaponSkillContext=initial.v5?.context||{};
  if (weaponItem?.baseId === 'weapon-armes-corps-a-corps-base-couteau-bollock') {
    const states=initial.target?.states||[],hasState=(...keys)=>states.some(row=>keys.includes(foldKey(row?.key||row?.name||''))
      &&Number(row.level??1)>0&&!(row.source?.source?.effectHash&&!sourceActive(row)));
    const conditional=conditionalV5KnifeQualities({qualities:[...equipmentQualities(weaponItem),{id:'empaleuse'},{id:'pointue'},...(initial.action.qualities||[])],
      targetSurprised:hasState('surpris','surprised'),targetProne:hasState('a-terre','aterre','prone')}).qualities;
    initial.action={...initial.action,qualities:conditional};
  }
  const sourceQualities=weaponItem?normalizeQualities([...equipmentQualities(weaponItem),...(initial.action.qualities||[])]):initial.action.qualities;
  const salvoQuality=sourceQualities.find(row=>['salve','salvo'].includes(typeof row==='string'?row:row?.id));
  const previousSalvoShots=Number(initial.v5?.context?.salvoPriorShotsThisTurn??(initial.v5State?.standardTurnActions||initial.v5State?.extensions?.v5?.standardTurnActions)?.filter(row=>
    row.actorId===initial.actor?.id&&row.weaponId===weaponItem?.id&&row.encounterId===initial.v5Clock?.encounterId&&row.turnId===initial.v5Clock?.turnId&&row.kind==='action'&&row.actionType==='attack').length??0);
  if(salvoQuality&&attackType(initial.action.type)&&initial.v5?.kind==='ranged'&&Number.isSafeInteger(previousSalvoShots)&&previousSalvoShots>0){
    initial.v5={...(initial.v5||{}),slModifiers:[...(initial.v5?.slModifiers||[]),{id:'f2-e:salvo',label:'Salve : tir(s) antérieur(s) ce Tour',amount:-previousSalvoShots}]};
  }
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
  if(weaponItem?.extensions?.v5?.destroyed===true)normalized.destroyedWeaponUnresolved='Arme détruite : elle ne peut pas être utilisée.';
  if(normalized.v5?.context?.knockout===true){
    const qids=(normalized.action?.qualities||[]).map(q=>typeof q==='string'?q:q?.id),nature=normalized.v5?.context?.attackNature;
    if(!attackType(normalized.action?.type)||normalized.v5?.kind!=='melee'||normalized.action?.attr==='CT'||normalized.attackContext?.ranged===true||['spell','miracle','missile','ranged'].includes(nature)||qids.some(id=>['ablaze','enflamme'].includes(id))||normalized.action?.magical===true)
      normalized.knockoutUnresolved='Assommer : coup retenu impossible avec un projectile, un sort, un miracle ou une arme Enflammée; attaque de mêlée requise.';
    else if(!qids.includes('assommante'))normalized.knockoutUnresolved='Assommer : une arme avec la Qualité Assommante est requise.';
    normalized.knockoutValid=!normalized.knockoutUnresolved;
    if(normalized.knockoutValid)normalized.action={...normalized.action,qualities:normalized.action.qualities.filter(q=>!['devastatrice','taille','empaleuse','perforante'].includes(typeof q==='string'?q:q?.id))};
  }
  let weaponTrapRecovery=null,weaponTrapRecoveryConflict=false;
  const recoveryId=normalized.v5?.context?.recoverDroppedWeaponId,recoveryOwnerId=normalized.v5?.context?.recoverDroppedWeaponOwnerId;
  if(typeof recoveryId==='string'&&recoveryId){
    const roster=Array.isArray(normalized.v5State?.participants)?normalized.v5State.participants:Object.values(normalized.v5State?.participants||{});
    const owners=roster.filter(row=>(!recoveryOwnerId||row.id===recoveryOwnerId)&&row.equipment?.some(item=>item.id===recoveryId&&item.extensions?.v5?.weaponDisposition==='dropped'));
    const owner=owners.length===1?owners[0]:null;
    if(owners.length>1||recoveryOwnerId&&owners.length===0)weaponTrapRecoveryConflict=true;
    if(owner&&normalized.actor?.id){
      const recipient=roster.find(row=>row.id===normalized.actor.id);
      if(owner.id!==normalized.actor.id&&recipient?.equipment?.some(item=>item.id===recoveryId))weaponTrapRecoveryConflict=true;
      else weaponTrapRecovery={weaponId:recoveryId,fromParticipantId:owner.id,toParticipantId:normalized.actor.id,before:clone(owner.equipment.find(item=>item.id===recoveryId))};
    }
  }
  const weaponSkill = applyWeaponSkillRules(normalized.actor, normalized.action, {
    weapon: weaponItem || normalized.action?.extensions?.equipment || null,
    context: normalized.v5?.context || {}
  });
  normalized.action = { ...normalized.action, ...weaponSkill.action };
  if (foldKey(weaponItem?.name || normalized.action?.extensions?.equipment?.name || '') === 'couteau a couille') {
    const targetStates = normalized.target?.states || [];
    const hasState = (...keys) => targetStates.some(row => keys.includes(foldKey(row?.key || row?.name || '')));
    normalized.action.qualities = conditionalV5KnifeQualities({ qualities: normalized.action.qualities,
      targetSurprised: hasState('surpris', 'surprised'), targetProne: hasState('a-terre', 'aterre', 'prone') }).qualities;
  }
  normalized.weaponSkillReceipt = weaponSkill.receipt || normalized.weaponSkillReceipt;
  normalized.weaponSkillUnresolved = [...new Set([...(normalized.weaponSkillUnresolved||[]), ...weaponSkill.unresolved])];
  if (weaponSkill.slModifier !== undefined) {
    const sources=weaponSkill.receipt?.applied?.filter(id=>id==='ballistic-skill-minus-1-dr'||id==='powder-skill-engineering-minus-2-dr')||[];
    const applied=new Set(normalized.v5.weaponSkillModifierSources||[]);
    const fresh=sources.filter(id=>!applied.has(id));
    if(fresh.length){normalized.v5.slModifier=(Number(normalized.v5.slModifier??normalized.action.extensions?.v5?.slModifier)||0)+weaponSkill.slModifier;normalized.v5.weaponSkillModifierSources=[...applied,...fresh];}
  }
  normalized.qualityTalentPlan = prepared.plan;
  const actorSkillId=normalized.action?.extensions?.fiche?.skillId||normalized.v5?.context?.skillId;
  const defenderSkillId=normalized.defense?.extensions?.fiche?.skillId||normalized.defense?.v5?.context?.skillId;
  const mountedRoster = Array.isArray(normalized.v5State?.participants) ? normalized.v5State.participants
    : normalized.v5State?.participants && typeof normalized.v5State.participants === 'object' ? Object.values(normalized.v5State.participants) : [];
  const withPrimary = [normalized.actor, normalized.target, ...mountedRoster].filter((row, index, all) => row && all.findIndex(candidate => candidate?.id === row.id) === index);
  const actorMountLink = resolveMountedMount(normalized.actor, withPrimary);
  const targetMountLink = resolveMountedMount(normalized.target, withPrimary);
  const mountedWeapon = weaponItem || normalized.action?.extensions?.equipment || null;
  const mountedAttackKind = inferV5Kind(normalized.action, normalized.attackContext);
  const mountedCombatPlan = attackType(normalized.action.type) ? planMountedAttack({
    actor: normalized.actor,
    target: normalized.target,
    actorMount: actorMountLink.mount,
    targetMount: targetMountLink.mount,
    weapon: { category: mountedWeapon?.category || normalized.v5?.context?.weaponTrainingGroup, reach: mountedWeapon?.reach || normalized.action?.reach || (!mountedWeapon && mountedAttackKind === 'melee' ? 'Courte' : undefined) },
    kind: mountedAttackKind,
    sizeChoices: normalized.v5?.context?.mountedSizeChoices || {}
  }) : { active: false, advantageSources: [], disadvantageSources: [], unresolved: [] };
  if (attackType(normalized.action.type)) {
    normalized.v5 = { ...normalized.v5,
      advantageSources: [...(normalized.v5?.advantageSources || []), ...mountedCombatPlan.advantageSources],
      disadvantageSources: [...(normalized.v5?.disadvantageSources || []), ...mountedCombatPlan.disadvantageSources] };
  }
  const normalizedDefenseSkill = String(normalized.defense?.skillId || normalized.defense?.skill || normalized.defense?.name || normalized.defense?.label || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const normalizedDefenseAttribute = String(normalized.defense?.attr || normalized.defense?.attribute || normalized.defense?.characteristic || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const isDodgeDefense = defenderSkillId === 'skill-45_73_71_75_69_76_65-base'
    || ['esquive', 'dodge'].includes(normalizedDefenseSkill)
    || ['ag', 'agility', 'agilite'].includes(normalizedDefenseAttribute);
  const mountedDodgePlan = normalized.defense && isDodgeDefense
    ? planMountedDodge(normalized.target) : { disadvantageSources: [] };
  const mountedDodge = normalized.defense && isDodgeDefense
    && normalized.target?.extensions?.v5?.mounted === true;
  if (mountedDodge) {
    // The legacy manual -2 DR is obsolete for every mounted Dodge, including
    // riders whose resolved talent exempts them from the automatic disadvantage.
    const context = normalized.defense.v5?.context || {};
    if (context.penalties && Object.hasOwn(context.penalties, 'mounted')) {
      const penalties = { ...context.penalties }; delete penalties.mounted;
      normalized.defense = { ...normalized.defense, v5: { ...normalized.defense.v5,
        context: { ...context, penalties } } };
    }
  }
  if (normalized.defense && mountedDodgePlan.disadvantageSources.length) {
    const existingDisadvantages = normalized.defense.v5?.disadvantageSources || [];
    const mountedDisadvantage = mountedDodgePlan.disadvantageSources.filter(row => !existingDisadvantages.some(existing => existing.id === row.id));
    normalized.defense = { ...normalized.defense, v5: { ...normalized.defense.v5,
      disadvantageSources: [...existingDisadvantages, ...mountedDisadvantage] } };
  }
  normalized.mountedCombatPlan = mountedCombatPlan;
  normalized.mountedDodgePlan = mountedDodgePlan;
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
  actorPlan.unresolved.push(...mountedCombatPlan.unresolved);
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
  const result = resolvedV5Action(normalized, actorPlan, actorTest, defenderPlan, defenderTest, weaponTrapRecovery,weaponTrapRecoveryConflict);
  const grappleContext=normalized.v5?.context||{};
  const grapplesOf=participant=>(participant?.extensions?.v5?.grapples||[]).filter(row=>row.status==='active');
  const validGrapple=link=>{
    if(!link||!normalized.actor?.id||!normalized.target?.id||![normalized.actor.id,normalized.target.id].includes(link.initiatorId)||![normalized.actor.id,normalized.target.id].includes(link.targetId))return false;
    const held=link.targetId===normalized.actor.id?normalized.actor:normalized.target;
    const alive=subject=>subject&&subject.zone!=='bench'&&subject.extensions?.v5?.dead!==true&&(subject.hp===undefined||Number(subject.hp)>0);
    return alive(normalized.actor)&&alive(normalized.target)&&(held.states||[]).some(state=>state.source?.linkId===link.id
      &&['enchevetre','entangled'].includes(String(state.key||state.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())&&Number(state.level??1)>0);
  };
  const activeGrapple=grapplesOf(normalized.actor).find(validGrapple)||grapplesOf(normalized.target).find(validGrapple);
  if(grappleContext.grappleDeclared===true){
    const skill=normalized.actor?.skills?.find(row=>row.id===(normalized.action?.extensions?.fiche?.skillId||grappleContext.skillId));
    const skillName=String(skill?.name||normalized.action?.name||normalized.action?.skill||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const unarmed=!weaponItem&&!normalized.action?.extensions?.equipment;
    result.grapple=previewGrappleInitiation({actor:normalized.actor,target:normalized.target,declared:true,
      eligibleBrawling:unarmed&&actorPlan.kind==='melee'&&/(bagarre|brawling)/.test(skillName),
      attack:{opposition:result.opposition,hit:result.hit,unresolved:result.unresolved},resolutionId:normalized.resolutionId,round:normalized.round});
    result.unresolved.push(...(result.grapple.unresolved||[]));
    if(result.grapple.ready&&result.grapple.won){result.grapple.suppressOrdinaryDamage=true;result.damage=null;result.targetConditionApplication=[];}
  }else if(activeGrapple&&grappleContext.grappleAction){
    const actorIsInitiator=activeGrapple.initiatorId===normalized.actor?.id;
    const actorSkill=normalized.actor?.skills?.find(row=>row.id===(normalized.action?.extensions?.fiche?.skillId||grappleContext.skillId));
    const defenderSkill=normalized.target?.skills?.find(row=>row.id===(normalized.defense?.extensions?.fiche?.skillId||normalized.defense?.v5?.context?.skillId));
    const actorTestName=String(actorSkill?.name||normalized.action?.name||normalized.action?.skill||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const defenderName=String(defenderSkill?.name||normalized.defense?.label||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(!/(force|strength)/.test(actorTestName)||!/(force|strength)/.test(defenderName)){
      result.grapple={status:'blocked',ready:false,unresolved:['Empoignade : les deux Tests opposés de Force sont requis.']};
      result.unresolved.push(...result.grapple.unresolved);
    }else{
      const plan=previewGrappleAction({actor:normalized.actor,target:normalized.target,link:activeGrapple,action:grappleContext.grappleAction,
        actorIsInitiator,actorTest:{roll:actorTest.roll,sl:actorTest.sl,success:actorTest.success},opponentTest:{roll:defenderTest?.roll,sl:defenderTest?.sl,success:defenderTest?.success},resolutionId:normalized.resolutionId,round:normalized.round});
      result.grapple={...plan,actorIsInitiator};result.unresolved.push(...(plan.unresolved||[]));
      if(plan.ready){result.grapple.suppressOrdinaryDamage=true;result.damage=null;result.critical=null;result.targetConditionApplication=[];}
    }
  }else if(grappleContext.grappleAction){
    result.grapple={status:'blocked',ready:false,unresolved:['Empoignade : le lien actif requis pour cette Action n’existe plus.']};
    result.unresolved.push(...result.grapple.unresolved);
  }
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

function resolvedV5Action(normalized, actorPlan, actorTest, defenderPlan, defenderTest, weaponTrapRecovery=null,weaponTrapRecoveryConflict=false) {
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
  actorTest=refreshV5ResultTier(actorTest);if(defenderTest)defenderTest=refreshV5ResultTier(defenderTest);
  let roll = actorTest.roll, targetScore = actorTest.score, success = actorTest.success, sl = actorTest.sl;
  const penalties = { value: actorPlan.penalty, names: actorPlan.penaltyStates };
  const slBonus = actorTest.details.modifiers.filter(item => item.id.startsWith('quality-')).reduce((sum, item) => sum + item.amount, 0);
  let doubled = actorTest.details.doubled;
  let criticalClassification = isCriticalRoll(roll, doubled, action.qualities);
  let fumbleClassification = isFumbleRoll(roll, doubled, action.qualities);
  const explosionAttack=attackType(action.type)&&action.qualities.some(row=>(typeof row==='string'?row:row?.id)==='explosion');
  const explosionOpposed=explosionAttack&&normalized.v5.context?.explosionOpposed===true;
  const parrySecond=previewV5Parry({qualities:action.qualities,dualWielding:normalized.v5.context?.dualWielding===true,
    isSecondAttack:normalized.v5.context?.secondWeaponAttack===true,firstAttackHit:normalized.v5.context?.firstWeaponAttackHit===true});
  const parryUnopposed=parrySecond.secondAttackUnopposed===true;
  const context = normalized.v5.context || {};
  let opposition = defenderTest ? resolveV5Opposition(actorTest, defenderTest) : null;
  let opposed = opposition && (!explosionAttack||explosionOpposed) && !parryUnopposed ? { mode: 'opposed', attacker: { ...actorTest },
    defender: { ...defenderTest, label: normalized.defense.label, base: normalized.defense.base, mod: defenderTest.details.totalModifier, statePenalty: defenderPlan.penalty }, netSl: opposition.netSl,
    winner: opposition.winner === 'initiator' ? 'attacker' : 'defender', tie: opposition.tie } : null;
  opposed=resolveSizeOpposition(opposed,normalized.combatPrelude?.large,actorTest,defenderTest);
  const fateUnresolved=[];
  if(context.fateAction==='automatic-success'){
    if(!Number.isInteger(Number(context.fateChosenRoll))||Number(context.fateChosenRoll)<1||Number(context.fateChosenRoll)>100)fateUnresolved.push('Destin : choisissez le résultat d100 (1 à 100), sans lancer les dés.');
    if(opposed) opposed={...opposed,winner:'attacker',netSl:Math.max(1,Number(opposed.netSl)||0),tie:false};
    success=true;sl=Math.max(1,Number(sl)||0);
  }
  // Décharge du Gargantuan (L25 p.143) : effet payé en Élan, sans jet d'attaque ni défense ; le coup de 10 ne reçoit aucun DR.
  const dischargeEffect = action.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge';
  if (dischargeEffect) { opposed = null; success = true; sl = 0; }
  let targetLevels = conditionLevels(target);
  const unopposedExplosion=explosionAttack&&!explosionOpposed;
  let cannotDefend = dischargeEffect || targetLevels.has('surpris') || targetLevels.has('inconscient') || context.targetHelpless === true || context.targetCannotDefend === true;
  let helpless = (targetLevels.has('inconscient') || context.targetHelpless === true || context.targetCannotDefend === true)
    && (actorPlan.kind === 'melee' || (actorPlan.kind === 'ranged' && (context.pointBlank === true || context.shotRange==='point-blank')));
  let hit = helpless && !opposed ? true : opposed ? opposed.winner === 'attacker' : success;
  const fumbleSkillId=action.extensions?.fiche?.skillId||context.weaponSkillId||context.skillId;
  const fumbleSkillRef=fumbleSkillId?getReferenceCatalogue().skills.find(row=>row.id===fumbleSkillId):null;
  const fumbleSkill=actor?.skills?.find(row=>row.id===fumbleSkillId)||fumbleSkillRef;
  const fumbleSkillGroup=foldKey(fumbleSkill?.group||String(fumbleSkill?.name||fumbleSkill?.nom||'').split('(')[0]);
  const meleeSkill=/corps\s*a\s*corps/.test(fumbleSkillGroup),rangedSkill=/projectiles/.test(fumbleSkillGroup);
  const socialTest=action.attr==='Soc'||foldKey(fumbleSkill?.carac||'')==='soc';
  const qualifiedCombatTest=!socialTest&&(
    actorPlan.kind==='melee'&&(action.attr==='CC'||meleeSkill)
    ||actorPlan.kind==='ranged'&&(action.attr==='CT'||rangedSkill));
  const linkedFumbleWeapon=actor?.equipment?.find(item=>item.id===action.extensions?.fiche?.equipmentId&&item.kind==='weapon');
  const linkedFumbleWeaponIsRanged=equipmentAttackContext(linkedFumbleWeapon,context)?.ranged===true
    ||Boolean(linkedFumbleWeapon&&/mortier/.test(foldKey(`${linkedFumbleWeapon.name||''} ${linkedFumbleWeapon.category||''}`)));
  const explicitWeaponTest=(context.firing===true||context.reloading===true)&&linkedFumbleWeaponIsRanged&&!socialTest
    &&(!fumbleSkillId||rangedSkill)
    &&(!action.attr||['CT','Ag'].includes(action.attr));
  // Lasso de soie : aucune attaque n'est lancée (L22 p.73), donc aucune maladresse de combat.
  const combatFumbleTableEligible=action.extensions?.v5?.specialProfileAbility!=='cliff-spider-lasso'&&(attackType(action.type)&&!socialTest||qualifiedCombatTest||explicitWeaponTest);
  const combatFailure = previewCombatFailure({ normalized, roll, fumble: combatFumbleTableEligible && !success && fumbleClassification.maladresse ? fumbleClassification : null, context, hit, success, sl });
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
      trip={winner:'attacker',conditionApplied:!targetLevels.has('aterre'),targetCondition:{key:'aterre',name:'À Terre',level:1,source:{kind:'trip',authorId:actor?.id}} ,costId:'combat:trip:momentum'};
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
                const legRoll=Number(context.tripLegLocationRoll),legEffect=Number(context.tripLegCriticalEffectRoll),leg=Number.isInteger(legRoll)&&legRoll>=1&&legRoll<=100?creatureLocationOf(legRoll,target,context):null;
                if(!leg||leg.key!=='LEG')tripUnresolved.push('Chute du Croche-pied : saisir une localisation d100 de Jambe pour la Blessure Critique.');
                if(!Number.isInteger(legEffect)||legEffect<1||legEffect>100)tripUnresolved.push('Chute du Croche-pied : saisir le d100 d’effet Critique de Jambe.');
                if(leg&&leg.key==='LEG'&&Number.isInteger(legEffect))criticals.push(criticalDetails({effect:legEffect},leg,0));
                if(enduranceTest.sl<=-5){const locationRoll=Number(context.tripExtraLocationRoll),effectRoll=Number(context.tripExtraCriticalEffectRoll),location=Number.isInteger(locationRoll)&&locationRoll>=1&&locationRoll<=100?creatureLocationOf(locationRoll,target,context):null;
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
  const thrownEquipment=actor?.equipment?.find(item=>item.id===action?.extensions?.fiche?.equipmentId)||action?.extensions?.equipment;
  const throwingWeapon=weaponSkillGroupInfo(thrownEquipment?.category||context.weaponGroup||action?.category,thrownEquipment)?.specialty==='Lancer';
  if((throwingWeapon||context.throwingWeapon===true)&&attackType(action.type)&&actorPlan.kind==='ranged'&&!hit){
    const direction=Number(context.scatterDirectionRoll),dice=context.scatterDistanceRolls,distance=Number(context.shooterTargetDistanceYards);
    if(!Number.isInteger(direction)||direction<1||direction>10)scatterUnresolved.push('Déviation : saisir le résultat de direction d10 (1 à 10).');
    else if(direction===9||direction===10)scatter={directionRoll:direction,direction:direction===9?'aux pieds du tireur':'aux pieds de la cible',distanceYards:0};
    else if(!Array.isArray(dice)||dice.length!==2||dice.some(value=>!Number.isInteger(value)||value<1||value>10))scatterUnresolved.push('Déviation : saisir les deux dés de distance d10.');
    else if(!Number.isFinite(distance)||distance<0)scatterUnresolved.push('Déviation : saisir la distance tireur-cible en yards pour plafonner le résultat.');
    else {const rolled=dice[0]+dice[1],maximum=distance/2;scatter={directionRoll:direction,direction:['','haut-gauche','haut','haut-droite','gauche','droite','bas-gauche','bas','bas-droite'][direction],distanceRolls:[...dice],distanceYards:Math.min(rolled,maximum),rolledDistanceYards:rolled,maximumYards:maximum};}
  }
  const criticalAttack = !dischargeEffect && !NO_DAMAGE_PROFILE_ABILITIES.has(action.extensions?.v5?.specialProfileAbility) && !(context.specialAttack==='whirlwind-of-death'||hit&&['dirty-fighting','disarm','shieldsman'].includes(context.specialAttack)) && attackType(action.type) && normalized.v5.context?.silentTakedown !== true && normalized.knockoutValid!==true && success && criticalClassification.critique;
  const criticalLocationRoll = normalized.criticalRolls?.location;
  const location = hit && attackType(action.type) ? attackLocation(normalized, roll, target) : null;
  const wulfrikHeadTableChosen = (actor?.extensions?.v5?.bestiary?.id === 'E0-P-921' || actor?.profileId === 'E0-P-921') && context.f2h?.wulfrikHeadCritical === true;
  const fateCriticalLocation=CALLED_SHOT_LOCATIONS[context.fateCriticalLocation];
  if(criticalAttack&&context.fateAction==='automatic-success'&&!fateCriticalLocation)fateUnresolved.push('Destin : choisissez la localisation de la Blessure Critique.');
  const rawCriticalLocation = criticalAttack && context.fateAction==='automatic-success' && fateCriticalLocation ? criticalTableLocation({roll:null,...fateCriticalLocation},context) : criticalAttack && criticalLocationRoll != null ? criticalTableLocation(creatureLocationOf(criticalLocationRoll,target,context),context) : null;
  // Preneur de têtes (L25 p.155) : la table Tête est choisie, aucun jet de localisation n'est utile.
  const criticalLocation = wulfrikHeadTableChosen && criticalAttack ? { ...(rawCriticalLocation || criticalTableLocation({ roll: null, ...CALLED_SHOT_LOCATIONS.head }, context)), key: 'HEAD', name: 'Tête', tableOverride: 'Wulfrik · Preneur de têtes' } : rawCriticalLocation;
  const inoffensive = action.qualities.some(q => q.id === 'inoffensive') && keywordMechanicalStatus('inoffensive').status === 'covered';
  const weaponReferenceId = action.extensions?.fiche?.equipmentId || action.extensions?.equipment?.id;
  const selectedWeapon = actor?.equipment?.find(item => item.id === weaponReferenceId && item.kind === 'weapon') || null;
  const weaponSource = selectedWeapon || action.extensions?.equipment || null;
  const conjuredEffectId=action.spellEffectId||action.extensions?.v5?.spellEffectId||null;
  const conjuredEffect=conjuredEffectId?(actor?.extensions?.v5?.spellEffects||[]).find(row=>row.id===conjuredEffectId):null;
  const conjuredWeaponKey=action.extensions?.v5?.conjuredWeaponKey||action.extensions?.v5?.conjuredWeaponProfile?.key||null;
  const reloadQuality = action.qualities?.find(row => ['a-repetition','recharge','salve','salvo'].includes(typeof row === 'string' ? row : row?.id))
    || (selectedWeapon?.reload!=null?{id:'recharge',parameter:String(selectedWeapon.reload)}:null);
  let weaponReload = null;
  let projectileLodging = null;
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
  let hack=null;
  // Preserve every protection consulted, including pieces/criticals it suppresses.
  const protectionReceipts = [];
  const unopposedAttack=unopposedExplosion||parryUnopposed;
    const mountedDamageRoster = Array.isArray(normalized.v5State?.participants) ? normalized.v5State.participants
      : normalized.v5State?.participants && typeof normalized.v5State.participants === 'object' ? Object.values(normalized.v5State.participants) : [];
    const mountedActorRoster = [actor, ...mountedDamageRoster].filter((row, index, all) => row && all.findIndex(candidate => candidate.id === row.id) === index);
    const mountedActorLink = resolveMountedMount(actor, mountedActorRoster);
    const mountedChargePlan = planMountedChargeDamage({ actor, mount: mountedActorLink.mount,
      charging: actorPlan.charging === true || normalized.v5?.charging === true || normalized.v5?.context?.charged === true,
      useMountStrengthBonus: normalized.v5?.context?.useMountStrengthBonus === true });
    const unresolved = [...fateUnresolved,...(normalized.knockoutUnresolved?[normalized.knockoutUnresolved]:[]),...(normalized.destroyedWeaponUnresolved?[normalized.destroyedWeaponUnresolved]:[]),...(normalized.combatPrelude?.unresolved||[]),...(weaponTrapRecoveryConflict?['Piège-lame : conflit d’identifiant d’équipement ; l’arme lâchée ne peut pas être ramassée sans ambiguïté.']:[]),...actorPlan.unresolved,...mountedChargePlan.unresolved, ...(unopposedAttack?[]:defenderPlan?.unresolved || []), ...actorPlan.restrictions, ...(unopposedAttack?[]:defenderPlan?.restrictions || []),...scatterUnresolved,...engagedUnresolved,...lethalUnresolved,...tripUnresolved,...combatFailure.unresolved];
  if (selectedWeapon?.extensions?.v5?.entanglementLocks?.length && attackType(action.type))
    unresolved.push('Entrave : cette arme est retenue par un état Empêtré actif et ne peut servir à une autre Action.');
  if(conjuredEffect?.weaponLocks?.some(row=>row.weaponKey===conjuredWeaponKey)&&attackType(action.type))
    unresolved.push('Entrave : cette arme conjurée est retenue par un état Empêtré actif et ne peut servir à une autre Action.');
  if(selectedWeapon?.extensions?.v5?.weaponDisposition&&attackType(action.type))unresolved.push(selectedWeapon.extensions.v5.weaponDisposition==='broken'
    ?'Piège-lame : cette arme est brisée et ne peut plus être utilisée.'
    :'Piège-lame : cette arme est lâchée ou saisie et doit être récupérée avant usage.');
  const actorShield=context.actorShieldId?actor?.equipment?.find(item=>item.id===context.actorShieldId&&item.kind==='shield'):null;
  const shieldAttack = context.attackWithShield === true
    ? { ...previewV5Shield({ shield: actorShield, selected: Boolean(actorShield), available: Boolean(actorShield&&!actor?.extensions?.shieldUnavailable?.includes(actorShield.id)), attackWithShield: true }), shieldId: actorShield?.id || null }
    : null;
  if (attackType(action.type) && context.attackWithShield === true && (!shieldAttack?.ready || shieldAttack?.confirmed !== true))
    unresolved.push(...(shieldAttack?.unresolved || ['Bouclier : choisir un bouclier disponible avant de frapper avec.']));
  const offHandWeapon=context.offHandWeaponId?actor?.equipment?.find(item=>item.id===context.offHandWeaponId&&item.kind==='weapon'):null;
  const polearm=/hast|polearm/u.test(foldKey(selectedWeapon?.category||''));
  const shieldHands=actorShield?validateV5ShieldHands({shield:actorShield,weaponHands:context.weaponHands??selectedWeapon?.hands??(/\(\s*2\s*M\s*\)/iu.test(selectedWeapon?.name||'')?2:1),
    weaponEncumbrance:context.weaponEncumbrance??selectedWeapon?.encumbrance,polearm,attached:context.shieldAttached===true,
    offHandWeaponEncumbrance:offHandWeapon?.encumbrance}):{ready:true,allowed:true,reason:null};
  if(attackType(action.type)&&actorShield&&context.attackWithShield!==true&&!shieldHands.ready)unresolved.push(...shieldHands.unresolved);
  else if(attackType(action.type)&&actorShield&&context.attackWithShield!==true&&!shieldHands.allowed)unresolved.push('Bouclier : combinaison des mains incompatible avec cette arme.');
  if(typeof recoveryId==='string'&&!weaponTrapRecovery)unresolved.push('Piège-lame : choisir une arme lâchée, présente dans un inventaire actif, à récupérer explicitement.');
  let netEscape = null;
  if (context.netEscapeConditionId) {
    const conditionId=context.netEscapeConditionId;
    const condition=actor?.states?.find(row=>row.id===conditionId&&['enchevetre','empetre','entangled'].includes(foldKey(row.key||row.name||'')));
    if (!condition) unresolved.push('Entrave : choisir un état Empêtré actif à réduire.');
    else if (action.type!=='test'||action.attr!=='F') unresolved.push('Entrave : le Test de sortie doit être un Test de Force.');
    else {
      const threshold=Number(condition.strength??condition.source?.escapeStrength);
      const progress=Number(actor?.extensions?.v5?.netEscapeProgress?.[conditionId]||0);
      const source=condition.source||{};
      const sourceParticipant=(normalized.v5State?.participants||[]).find(row=>row.id===source.authorId);
      const sourceStrength=['wielder','mancatcher','garrote','druchii-net'].includes(source.entanglementKind)&&sourceParticipant?.caracs?.F!=null
        ? Number(sourceParticipant.caracs.F) : threshold;
      const sourceScore=sourceStrength;
      const opponentRoll=context.netEscapeOpponentRoll;
      if(!Number.isInteger(opponentRoll)||opponentRoll<1||opponentRoll>100)unresolved.push('Filet : saisir le jet d100 du Test opposé de Force de la source.');
      if(!Number.isSafeInteger(sourceScore)||sourceScore<0||sourceScore>100)unresolved.push('Filet : Force de la source requise pour son Test opposé.');
      const sourceTest=Number.isInteger(opponentRoll)&&opponentRoll>=1&&opponentRoll<=100&&Number.isSafeInteger(sourceScore)&&sourceScore>=0&&sourceScore<=100
        ? selectV5Test(previewV5Test({score:sourceScore,roll:opponentRoll,kind:'test'}),'keep') : null;
      const springLoaded=source.entanglementKind==='mancatcher'&&source.springLoaded===true;
      const escape=sourceTest?advanceV5NetEscape({testSl:sl,opponentSl:sourceTest.sl,opponentBonus:springLoaded?2:0,entangled:condition.level}):null;
      if(!escape?.ready&&escape)unresolved.push(...escape.unresolved);
      if (escape?.ready) {
        const hookedNetPlan=previewV5HookedNet({hookedNet:condition.source?.hookedNet===true,struggle:true,damageAmount:context.hookedNetDamage});
        if(!hookedNetPlan.ready)unresolved.push(...hookedNetPlan.unresolved);
        else netEscape={participantId:actor.id,conditionId,before:clone(condition),after:escape.freed
          ? (escape.remainingEntangled?{...clone(condition),level:escape.remainingEntangled}:null)
          : {...clone(condition),level:Number(condition.level||1)+(escape.addEntangledOnFailure?1:0)},
          beforeProgress:progress,afterProgress:null,
          freed:escape.freed,remainingEntangled:escape.remainingEntangled,weaponId:condition.source?.weaponLocked?condition.source.weaponId:null,
          holderId:condition.source?.weaponLocked&&escape.freed&&!escape.remainingEntangled?condition.source.authorId:null,
          conjuredEffectId:condition.source?.weaponLocked&&escape.freed&&!escape.remainingEntangled?(condition.source?.conjuredEffectId||null):null,
          hookedNetDamage:condition.source?.hookedNet===true?hookedNetPlan.damage:0,
          opposition:{actorSl:escape.actorSl,sourceSl:escape.opponentSl,netSl:escape.netSl,sourceRoll:opponentRoll,sourceScore,springLoaded}};
      }
    }
  }
  let entanglementRelease=null;
  if(context.releaseEntanglementLinkId){
    const linkId=context.releaseEntanglementLinkId;
    const weapon=actor?.equipment?.find(row=>(row.extensions?.v5?.entanglementLocks||[]).includes(linkId));
    const conjuredLock=(actor?.extensions?.v5?.spellEffects||[]).flatMap(effect=>(effect.weaponLocks||[]).map(lock=>({effect,lock}))).find(row=>row.lock.linkId===linkId);
    const weaponId=weapon?.id||conjuredLock?.lock.weaponKey;
    const condition=(normalized.v5State?.participants||[target,actor].filter(Boolean)).flatMap(person=>(person.states||[]).map(state=>({person,state})))
      .find(row=>row.state.source?.linkId===linkId&&row.state.source?.authorId===actor?.id&&row.state.source?.weaponId===weaponId);
    if((!weapon&&!conjuredLock)||!condition)unresolved.push('Entrave : l’arme et l’état Empêtré liés doivent encore être actifs pour libérer volontairement le filet.');
    else entanglementRelease={linkId,holderId:actor.id,weaponId,conjuredEffectId:conjuredLock?.effect.id||null,conditionParticipantId:condition.person.id,condition:clone(condition.state)};
  }
  if (attackType(action.type) && actorPlan.kind === 'ranged' && reloadQuality) {
    if (!selectedWeapon) unresolved.push('Recharge : l’arme doit être reliée à un exemplaire durable de l’inventaire pour suivre ses tirs et annuler correctement la mutation.');
    else {
      const current = selectedWeapon.extensions?.v5?.reloadState || initialV5ReloadState({...selectedWeapon,keywords:[...(selectedWeapon.keywords||[]),...(action.qualities||[])]}).state;
      if (!current) unresolved.push('À répétition : compteur de tirs ou Recharge non interprétable; arbitrage MJ requis.');
      else if(selectedWeapon.keywords?.some(row=>(typeof row==='string'?row:row?.id)==='a-repetition'&&row?.asterisk===true)&&current.requiresManualRotation===true&&context.freeHandAvailable!==true)
        unresolved.push('Poivrière : le canon tiré doit être préparé manuellement avant le prochain tir; confirmez que la seconde main est libre (L13 p.103).');
      else {
        const consumed = consumeV5WeaponShot(current);
        if (consumed.status !== 'shot') unresolved.push('À répétition : l’arme doit être rechargée avant un nouveau tir.');
        else {
          const after=consumed.state;
          if(selectedWeapon.keywords?.some(row=>(typeof row==='string'?row:row?.id)==='a-repetition'&&row?.asterisk===true)){
            after.requiresManualRotation=false;
            if(context.freeHandAvailable!==true){
              after.shotsRemaining=0;
              after.requiresReload=true;
              after.reloading=false;
              after.accumulatedSuccesses=0;
              after.requiredSuccesses=after.reloadSuccesses;
            }
          }
          weaponReload = { equipmentId: selectedWeapon.id, before: current, after };
        }
      }
    }
  }
  if(attackType(action.type)&&actorPlan.kind==='ranged'&&selectedWeapon?.keywords?.some(row=>(typeof row==='string'?row:row?.id)==='a-repetition'&&row?.asterisk===true)&&typeof context.freeHandAvailable!=='boolean')
    unresolved.push('Poivrière : indiquez si la seconde main est libre; sinon ce tir perd le bénéfice d’À répétition et impose une recharge complète (L13 p.103).');
  if (attackType(action.type) && actorPlan.kind === 'ranged' && criticalAttack && !(normalized.criticalDeclined||[]).length && hit && action.qualities.some(row=>(typeof row==='string'?row:row?.id)==='empaleuse')) {
    const ammunition=actor?.equipment?.find(item=>item.id===normalized.ammunitionId&&item.kind==='ammunition');
    const projectile=previewV5ImpaleProjectile({qualities:action.qualities,ranged:true,critical:true,ammunitionId:ammunition?.id,
      ammunitionType:ammunition?`${ammunition.name||''} ${ammunition.category||''}`:'',weaponId:selectedWeapon?.id,
      weaponCategory:selectedWeapon?.category,weaponName:selectedWeapon?.name,participantId:target?.id});
    if(!projectile.ready)unresolved.push(...projectile.unresolved);
    else if(projectile.lodgedProjectile)projectileLodging=projectile.lodgedProjectile;
  }
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
  const pistolContact = previewV5PistolContact({ qualities: action.qualities, attack: attackType(action.type),
    engaged: context.targetEngaged === true, ranged: actorPlan.kind === 'ranged' });
  const allowsPistolContactDodge = attackType(action.type) && actorPlan.kind === 'ranged' && (context.targetEngaged === true || context.engaged === true)
    && action.qualities.some(row => (typeof row === 'string' ? row : row?.id) === 'pistolet')
    && /^(?:Esquive|Dodge|Ag)$/iu.test(normalized.defense?.label || normalized.defense?.attr || '');
  if (!explosionAttack && !parryUnopposed && attackType(action.type) && actorPlan.kind === 'ranged' && normalized.defense && context.rangedOppositionAllowed !== true
    && !(defenderPlan.kind === 'test' && v5ShieldDefense(normalized).rangedDodgeAllowed)
    && !allowsPistolContactDodge
    && !(pistolContact.allowed && defenderPlan.kind === 'melee')) unresolved.push('Confirmer la règle autorisant cette défense contre un tir.');
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
  const strengthBonus = mountedChargePlan?.useMountStrengthBonus ? mountedChargePlan.strengthBonus : strengthBonusOf(actor?.caracs);
  let blastPlan=null;
  if(action.qualities.some(row=>(typeof row==='string'?row:row?.id)==='explosion')&&attackType(action.type)&&hit){
    const blastTargets=context.explosionTargetIds;
    const blastWeapon=evaluateWeaponDamage(weaponDamage,strengthBonus);
    if(blastWeapon.status!=='resolved')unresolved.push('Explosion : Dégâts d’arme à interpréter manuellement avant de résoudre les cibles.');
    blastPlan=previewV5Blast({qualities:action.qualities,targetIds:blastTargets,weaponDamage:blastWeapon.status==='resolved'?blastWeapon.value:NaN,
      unitsDie:roll%10,damaging:action.qualities.some(row=>(typeof row==='string'?row:row?.id)==='devastatrice')});
    if(!blastPlan.ready)unresolved.push(...blastPlan.unresolved);
    else {
      const roster=normalized.v5State?.participants||[];
      const missing=blastPlan.targets.filter(row=>!roster.some(person=>person.id===row.participantId&&person.zone==='active'));
      if(missing.length)unresolved.push('Explosion : toutes les cibles désignées doivent être des participants actifs.');
      if(target?.id&&!blastPlan.targets.some(row=>row.participantId===target.id))unresolved.push('Explosion : inclure la cible initiale parmi les cibles désignées par le MJ.');
    }
  }
  let spreadPlan=null;
  if(action.qualities.some(row=>(typeof row==='string'?row:row?.id)==='dispersion')&&attackType(action.type)&&actorPlan.kind==='ranged'&&hit){
    const spreadWeapon=evaluateWeaponDamage(weaponDamage,strengthBonus);
    if(spreadWeapon.status!=='resolved')unresolved.push('Dispersion : Dégâts d’arme à interpréter manuellement avant de résoudre les cibles.');
    spreadPlan=previewV5Spread({qualities:action.qualities,rangeBand:context.spreadRangeBand,targetIds:context.spreadTargetIds,
      weaponDamage:spreadWeapon.status==='resolved'?spreadWeapon.value:NaN,rating:context.spreadRating});
    if(!spreadPlan.ready)unresolved.push(...spreadPlan.unresolved);
    else if(!target?.id||!spreadPlan.targets.some(row=>row.participantId===target.id))unresolved.push('Dispersion : inclure la cible initiale parmi les cibles validées par le MJ.');
    else {
      const roster=normalized.v5State?.participants||[];
      const missing=spreadPlan.targets.filter(row=>!roster.some(person=>person.id===row.participantId&&person.zone==='active'));
      if(missing.length)unresolved.push('Dispersion : toutes les cibles choisies doivent être des participants actifs.');
    }
  }
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
    if(hit&&action.qualities.some(row=>(typeof row==='string'?row:row?.id)==='taille')){
      const struckItemId=context.struckItemId;
      const struck=(protection.counted||[]).find(item=>item.id===struckItemId)||[protection.shield].find(item=>item?.id===struckItemId);
      // No armour or shield piece at this location: Hack has nothing to damage and must not block the attack.
      const pieceAvailable=(protection.counted||[]).length>0||Boolean(protection.shield);
      hack=protection.ap===null?{ready:false,unresolved:['Taille : PA effectifs de la localisation à préciser avant réduction.']}
        :!pieceAvailable?{ready:false,unresolved:[],none:true}
        :previewV5Hack({qualities:action.qualities,hit:true,struckItemId,currentAp:struck?.ap});
      if(hack.none){hack=null;if(protection.ap>0)mechanicalWarnings.push({keywordId:'taille',reason:'taille-aucune-piece-identifiable'});}
      else if(!hack.ready)unresolved.push(...hack.unresolved);
      else {
        protection={...protection,ap:Math.max(0,protection.ap-1),...(struck.kind==='shield'?{shieldAp:Math.max(0,(protection.shieldAp||0)-1)}:{})};
        hack={...hack,struckItemId,struckItemName:struck.name};
      }
    }
    protectionReceipts.push(protection);
    const targetArmour = protection.ap;

    // Souffle de Fumée (V5 p.357) : aucun dégât, ni ceux de l'action ni le NR.
    if (targetArmour !== null && !mechanicalWarnings.length && naturalPlanOf(actor, normalized.v5)?.noDamage !== true && !NO_DAMAGE_PROFILE_ABILITIES.has(action.extensions?.v5?.specialProfileAbility))     damage = computeDamage({
      weaponDamage:blastPlan?.ready?blastPlan.targets.find(row=>row.participantId===target.id)?.damage??weaponDamage:spreadPlan?.ready?spreadPlan.targets.find(row=>row.participantId===target.id)?.damage??weaponDamage:weaponDamage,
      strengthBonus,
      damageBonus:blastPlan?.ready?0:damageBonus+magicWeaponBonus(actor,action,nature.ranged,Number(action.damage) || 0),
      sl: blastPlan?.ready?0:opposed ? opposed.netSl : sl,
      roll,
      targetToughnessBonus: Math.floor((Number(target.caracs?.E) || 0) / 10),
      targetArmour,
      qualities: blastPlan?.ready?action.qualities.filter(row=>(typeof row==='string'?row:row?.id)!=='devastatrice'):action.qualities,
      damageMultiplier:normalized.combatPrelude?.small?.multiplier||1,approvedQualities:normalized.combatPrelude?.small?.approvedQualities||[]
    });
    if(damage&&blastPlan?.ready){damage={...damage,activeQualities:action.qualities,explosionUnitsDie:action.qualities.some(row=>(typeof row==='string'?row:row?.id)==='devastatrice')?roll%10:0};}
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
  const secondLocation = wulfrikHeadTableChosen && location ? { ...location, key: 'HEAD', name: 'Tête', tableOverride: 'Wulfrik · Preneur de têtes' } : criticalTableLocation(location,context);
  const second = !replacement && normalized.knockoutValid!==true && knownHp(target) && (excess>0||normalized.combatPrelude?.whirlwind?.active&&damage&&damage.finalDamage>=hpBefore) ? secondCritical(reverseV5Roll(roll), prepareCritical(actor,normalized.criticalRolls,normalized.v5,'attacker',inoffensive,['second']), excess * 10 + divineCriticalSeverityBonus(actor), inoffensive, secondLocation) : null;
  let criticalBlock = criticalFirst || second ? { kind: 'Critique', expanded: criticalClassification.élargi,
    acharnement: false, details: criticalFirst, ...(second ? { second, excessWounds: excess } : {}),
    ...(weapon?.status === 'manual' ? { secondHint: { locationRoll: reverseV5Roll(roll), location } } : {}) } : null;
  if (criticalBlock) {
    criticalBlock.items = criticalItems(criticalFirst, second, normalized.criticalDeclined);
    criticalBlock.application = criticalApplication(criticalBlock.items);
  } else if (context.silentTakedown !== true && !attackType(action.type) && actorTest.critical) criticalBlock = { kind: 'Critique', details: null };
  let defenderCritical = null,weaponTrap=null;
  const defenderCriticalClassification = defenderTest ? isCriticalRoll(defenderTest.roll, defenderTest.details.doubled, normalized.defense.qualities) : null;
  // Nature de l'arme qui frappe pour la défense (critique défensif, Riposte) : contact, enchantement, réponses du MJ.
  const defenderNature = () => weaponAttackNature({ actor: target, action: { ...normalized.defense, type: 'attack' }, ranged: false, declared: normalized.defense?.v5?.context?.attackNature });
  const defenderFumbleClassification = defenderTest ? isFumbleRoll(defenderTest.roll, defenderTest.details.doubled, normalized.defense.qualities) : null;
  if(attackType(action.type)&&!unopposedExplosion&&!parryUnopposed&&defenderTest&&!defenderTest.success&&defenderFumbleClassification?.maladresse){
    const defenderContext=normalized.defense?.v5?.context||{};
    const defenderFailure=previewCombatFailure({normalized:{...normalized,actor:target,target:actor,action:{...normalized.defense,type:'attack'},resolutionId:`${normalized.resolutionId}:defender`},roll:defenderTest.roll,fumble:defenderFumbleClassification,context:{...defenderContext,fumbleRoll:defenderContext.defenderFumbleRoll??defenderContext.fumbleRoll},hit:false});
    combatFailure.defender=defenderFailure.fumble;combatFailure.defenderMisfire=defenderFailure.misfire;combatFailure.effects.push(...defenderFailure.effects);combatFailure.reminders.push(...defenderFailure.reminders);combatFailure.unresolved.push(...defenderFailure.unresolved);unresolved.push(...defenderFailure.unresolved);
  }
  if (!unopposedExplosion&&!parryUnopposed&&!(opposed?.winner==='defender'&&normalized.defense?.v5?.context?.specialAttack==='shieldsman')&&context.silentTakedown !== true && ['melee', 'ranged'].includes(defenderTest?.kind) && defenderTest.success && defenderCriticalClassification.critique) {
    const critLocation = normalized.defenderCriticalRolls?.location != null ? creatureLocationOf(normalized.defenderCriticalRolls.location,actor,normalized.defense?.v5?.context||{}) : null;
    const defenderRolls=prepareCritical(target,normalized.defenderCriticalRolls,normalized.defense.v5,'defender',normalized.defense.qualities.some(q=>q.id==='inoffensive'),['first']);
    const details = criticalDetails(defenderRolls, critLocation, divineCriticalSeverityBonus(target), normalized.defense.qualities.some(q => q.id === 'inoffensive'));
    const guard = critLocation ? locationProtection(actor, { location: critLocation, attackRoll: defenderTest.roll,
      hitLocationRoll: critLocation.roll, critical: true, ranged: false, qualities: normalized.defense.qualities,
      nature: defenderNature() }) : null;
    if (guard) protectionReceipts.push(guard);
    if (!guard?.criticalIgnored) {
      if (guard) { details.protection = guard; unresolved.push(...guard.manual.map(reason => `Protection du critique défensif : ${reason}`)); }
      const trapContext=normalized.defense?.v5?.context||{},trapChoice=trapContext.trapBladeChoice===true;
      if(trapChoice&&!['blade','other'].includes(trapContext.opponentWeaponType))unresolved.push('Piège-lame : confirmer que l’arme adverse est une lame avant le choix.');
      const hasDisarmTalent=(target?.talents||[]).some(row=>(typeof row==='string'?row:row?.id||row?.talentId)==='talent-disarm');
      const strengthTest=trapContext.trapBladeStrengthTest||{};
      const strengthTestSl=Number.isSafeInteger(strengthTest.base)&&Number.isSafeInteger(strengthTest.roll)
        ?Math.floor(strengthTest.base/10)-Math.floor(strengthTest.roll/10)-3+Number(defenderTest.sl||0):null;
      const strengthTestSuccess=Number.isSafeInteger(strengthTestSl)&&strengthTestSl>=0;
      const trap=previewV5TrapBlade({qualities:normalized.defense.qualities,defensiveCritical:true,opponentWeaponType:trapContext.opponentWeaponType,
        defenderSize:trapContext.defenderSize??normalized.v5.targetSize,opponentSize:trapContext.opponentSize??normalized.v5.actorSize,chooseTrap:trapChoice,
        hasDisarmTalent,spendMomentum:trapContext.trapBladeSpendMomentum===true,catchInFreeHand:trapContext.trapBladeCatch===true,
        chooseBreak:trapContext.trapBladeChooseBreak===true,strengthTestSuccess,meleeSl:defenderTest.sl,
        unbreakable:(selectedWeapon?.keywords||[]).some(row=>(typeof row==='string'?row:row?.id)==='incassable')});
      if(trapChoice&&!trap.ready)unresolved.push(...trap.unresolved);
      if(trapChoice&&trap.available&&trap.trapped){
        if(!selectedWeapon?.id)unresolved.push('Piège-lame : exemplaire durable de l’arme adverse requis.');
        if(trapContext.trapBladeCatch===true&&(!hasDisarmTalent||!trapContext.trapBladeSpendMomentum))unresolved.push('Piège-lame : Talent Désarmement, main libre et dépense d’un Élan requis pour saisir l’arme.');
        if(trapContext.trapBladeChooseBreak===true&&(!Number.isSafeInteger(strengthTest.base)||strengthTest.base<1||strengthTest.base>100||!Number.isSafeInteger(strengthTest.roll)||strengthTest.roll<1||strengthTest.roll>100))unresolved.push('Piège-lame : seuil de Force et d100 du Test très difficile requis.');
        weaponTrap={ready:true,weaponId:selectedWeapon?.id||null,holderId:actor?.id,defenderId:target?.id,
          disposition:trap.break?'broken':trap.catch?'caught':'dropped',break:trap.break||null,catch:trap.catch||null,
          ...(trapContext.trapBladeChooseBreak===true?{strengthTest:{base:strengthTest.base,roll:strengthTest.roll,difficultyModifier:-30,meleeSl:Number(defenderTest.sl)||0,totalSl:strengthTestSl,success:strengthTestSuccess}}:{}),receipt:trap};
        defenderCritical={kind:'Piège-lame',targetId:actor?.id,details:null,items:[],application:{extraWounds:0,states:[]}};
      }else{
        const items = criticalItems(details, null, normalized.defenderCriticalDeclined);
        defenderCritical = { kind: 'Critique', targetId: actor?.id, details, items, application: criticalApplication(items) };
      }
    }
  }
  let defenderDamage=null;
  const riposte=evaluateV5Talents(target,{event:'damage.beforeProtection',role:'defender',context:{kind:defenderPlan?.kind||'none',oppositionWon:opposed?.winner==='defender'}});
  supplementaryTalentPlans.push(riposte);
  if(riposte.proposals.some(row=>row.op==='riposte')){
    if(!knownHp(actor)||normalized.defense?.damage===undefined&&!normalized.defense?.damageFormula)unresolved.push('Riposte : Blessures de l’attaquant et dégâts de l’arme utilisée en défense requis.');
    else {
      const loc=creatureLocationOf(reverseV5Roll(defenderTest.roll),actor,normalized.defense?.v5?.context||{});let guard=locationProtection(actor,{location:loc,attackRoll:defenderTest.roll,critical:defenderTest.critical,ranged:false,qualities:normalized.defense.qualities,nature:defenderNature()});
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
  const hookedNetSource=weaponSource?.extensions?.v5?.hookedNet===true||context.hookedNet===true;
  if(hookedNetSource&&attackType(action.type)&&hit){
    const entangled=weaponConditions.proposed.find(row=>row.key==='enchevetre');
    if(entangled)entangled.source={...(entangled.source||{}),hookedNet:true,weaponId:weaponSource?.id||weaponReferenceId||null,authorId:actor?.id};
  }
  const entailleSpend=Number(context.entailleMomentumSpend||0);
  const slashPlan=previewV5Slash({qualities:action.qualities,criticalDamage:Boolean(criticalBlock?.details||criticalBlock?.second),spendAdvantage:entailleSpend});
  const slash={...slashPlan,momentumSpent:entailleSpend};
  if(!slash.ready)unresolved.push(...slash.unresolved);
  const entaille=action.qualities.some(row=>(typeof row==='string'?row:row?.id)==='entaille');
  if(entaille&&entailleSpend>0&&(entailleSpend!==1||slash.bleedingConditions<2||!hasMomentum(actor)))unresolved.push('Entaille : un Élan disponible est requis pour une Hémorragique supplémentaire.');
  const slashConditions=slash.ready&&slash.bleedingConditions>0&&hit&&!replacement&&target
    ?[{id:`${normalized.resolutionId}:quality:entaille`,key:'hemorragique',name:'Hémorragique',level:slash.bleedingConditions,source:{kind:'quality',keywordId:'entaille',authorId:actor?.id}}]:[];
  const fast=previewV5Fast({qualities:action.qualities,isAttack:attackType(action.type),dualWielding:context.dualWielding===true,secondWeaponAttack:context.secondWeaponAttack===true});
  const immobilisingQuality = action.qualities.find(row => (typeof row === 'string' ? row : row?.id) === 'immobilisante');
  const entanglementKind=context.entanglementKind||selectedWeapon?.extensions?.v5?.entanglementKind
    ||(selectedWeapon?.baseId==='weapon-armes-corps-a-corps-armes-d-hast-mancatcher-2m'?'mancatcher':'wielder');
  const immobilisingStrength=immobilisingQuality?entanglementStrength({kind:entanglementKind,actorStrength:actor?.caracs?.F,
    explicitStrength:context.entanglementStrength??selectedWeapon?.extensions?.v5?.entanglementStrength,
    springLoaded:context.springLoaded===true||selectedWeapon?.extensions?.v5?.springLoaded===true}):null;
  if(immobilisingQuality&&!immobilisingStrength?.ready)unresolved.push(...(immobilisingStrength?.unresolved||['Immobilisante : Force de l’arme requise.']));
  const inflictQualities = immobilisingQuality&&immobilisingStrength?.ready
    ? [{ id: 'inflige', parameter: `Empêtré ${immobilisingStrength.strength}` }] : action.qualities;
  const inflict = previewV5Inflict({ qualities: inflictQualities, hit: attackType(action.type) && hit,
    actorStrength: actor?.caracs?.F, entangling: true, itemId: selectedWeapon?.id });
  let entanglement = null;
  if (!inflict.ready) unresolved.push(...inflict.unresolved);
  else if (inflict.conditions?.length || inflict.condition) {
    const inflictConditions=inflict.conditions||[inflict.condition];
    const bolasHitLegs=selectedWeapon?.baseId==='weapon-armes-a-distance-entraves-bolas'&&location?.key==='LEG';
    const applicableInflictConditions=selectedWeapon?.baseId==='weapon-armes-a-distance-entraves-bolas'
      ?(bolasHitLegs?inflictConditions:[]):inflictConditions;
    const isEntangled=applicableInflictConditions.some(condition=>condition.key==='enchevetre');
    const conjuredLockable=Boolean(conjuredEffect&&conjuredWeaponKey);
    if (isEntangled && !selectedWeapon && !conjuredLockable) unresolved.push('Empêtré : relier un exemplaire durable ou une arme conjurée à un effet actif pour verrouiller puis libérer son usage.');
    const linkId=isEntangled?`entanglement:${normalized.resolutionId}`:null;
    const persistentEntanglementKind=selectedWeapon?.extensions?.v5?.entanglementKind
      ||(selectedWeapon?.baseId==='weapon-armes-corps-a-corps-armes-d-hast-mancatcher-2m'?'mancatcher':immobilisingQuality?entanglementKind:null);
    weaponConditions.proposed.push(...applicableInflictConditions.map((condition,index)=>({ id: `${normalized.resolutionId}:quality:${immobilisingQuality?'immobilisante':'inflige'}${index?`:${index}`:''}`, ...condition,
      source: { kind: 'quality', keywordId: immobilisingQuality?'immobilisante':'inflige', ...(isEntangled?{linkId,authorId:actor?.id,...(selectedWeapon?{weaponId:selectedWeapon.id,weaponLocked:true}:conjuredLockable?{weaponId:conjuredWeaponKey,conjuredEffectId,weaponLocked:true}:{}),...(persistentEntanglementKind?{entanglementKind:persistentEntanglementKind,springLoaded:context.springLoaded===true||selectedWeapon?.extensions?.v5?.springLoaded===true}:{}),...((weaponSource?.extensions?.v5?.hookedNet===true||context.hookedNet===true)?{hookedNet:true}:{})}:{}) } })));
    if(isEntangled)entanglement={linkId,actorId:actor?.id,targetId:target?.id,weaponId:selectedWeapon?.id||conjuredWeaponKey||null,conjuredEffectId:conjuredLockable?conjuredEffectId:null,weaponLocked:Boolean(selectedWeapon||conjuredLockable)};
  }
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
  const supplementalItemId=action?.extensions?.fiche?.equipmentId;
  const selectedSupplementalAmmo=actor?.equipment?.find(item=>item.id===normalized.ammunitionId&&item.kind==='ammunition');
  const supplementalItem=/shard tips/i.test(String(selectedSupplementalAmmo?.name||''))?selectedSupplementalAmmo:
    actor?.equipment?.find(item=>item.id===supplementalItemId)||action?.extensions?.equipment
    ||selectedSupplementalAmmo
    ||(context.supplementalEquipmentRuleId?{supplementalRuleId:context.supplementalEquipmentRuleId,name:action?.name||action?.note}:action?.name||action?.note?{name:action.name||action.note}:null);
  const supplementalEquipment=previewSupplementalEquipment({item:supplementalItem,actor,target,hit,damage,critical:criticalBlock?.details||null,context,spell:context.spell||null,used:attackType(action.type)});
  const supplementalTargetConditions=(supplementalEquipment?.effects||[]).filter(row=>row.state&&row.participantId===target?.id).map((row,index)=>({id:`${normalized.resolutionId}:supplement:${index}`,key:foldKey(row.state).replace(/\s+/g,'-'),name:row.state,level:1,source:{kind:'supplement',ruleId:row.sourceRuleId,authorId:actor?.id}}));
  const supplementalActorConditions=(supplementalEquipment?.effects||[]).filter(row=>row.state&&row.participantId===actor?.id).map((row,index)=>({id:`${normalized.resolutionId}:supplement:actor:${index}`,key:foldKey(row.state).replace(/\s+/g,'-'),name:row.state,level:1,source:{kind:'supplement',ruleId:row.sourceRuleId,authorId:actor?.id}}));
  const targetConditionApplication = [...(criticalBlock?.application?.states || []).map(row => ({ ...clone(row), source: { ...(row.source || {}), kind: 'critical' } })), ...weaponConditions.proposed,...slashConditions,...magicHitStates,...naturalHitStates,...special.states,...supplementalTargetConditions,...(trip?.conditionApplied?[trip.targetCondition]:[]),...(tripFall?.criticalStates||[])];
  const profileAbilityContext = isRecord(context.f2h) ? context.f2h : {};
  const effectiveProfileAbilityContext = { ...profileAbilityContext, test: action.name || action.skillName || '', critical: profileAbilityContext.wulfrikHeadCritical === true, specialAction: action.extensions?.v5?.specialProfileAbility ?? null };
  const profileAbilityPlans = planBestiaryProfileAbilities(actor, effectiveProfileAbilityContext);
  // Blessures restantes de la cible après ce coup : déclenchent les règles « à 0 Blessure » des profils (crâne volant, L18 p.107).
  const targetProfileAbilityPlans = planBestiaryProfileAbilities(target, { ...profileAbilityContext, ...(hit && damage && knownHp(target) ? { wounds: hpBefore - damage.finalDamage } : {}) });
  const lassoReminders = [];
  // Lasso de soie (L22 p.73) : aucun jet d'attaque, seule l'Esquive +0 de la cible compte ; un Enchevêtré par DR d'échec, au moins 1 (E5/E6).
  if (target && !replacement && action.extensions?.v5?.specialProfileAbility === 'cliff-spider-lasso') {
    const failure = defenderTest ? (defenderTest.success ? 0 : Math.max(1, -Number(defenderTest.sl || 0))) : profileAbilityContext.cliffSpiderFailureSL;
    if (Number.isSafeInteger(failure) && failure > 0) targetConditionApplication.push({ id: `${normalized.resolutionId}:f2h:cliff-spider`, key: 'enchevetre', name: 'Enchevêtré', level: failure, strength: Number(actor?.caracs?.F) || 45, source: { kind: 'bestiary-profile', ability: 'cliff-spider-lasso', authorId: actor?.id } });
    else if (defenderTest?.success) lassoReminders.push('Lasso de soie : Esquive réussie, la cible échappe à la soie.');
    else if (!defenderTest) unresolved.push('Araignée de falaise : jouer le Test d’Esquive +0 de la cible (ou saisir ses niveaux d’échec).');
  }
  if (hit && target && !replacement) {
    const profileId = actor?.extensions?.v5?.bestiary?.id || actor?.profileId;
    const specialAbility = action.extensions?.v5?.specialProfileAbility;
    if (specialAbility === 'gargantuan-electric-discharge') {
      if (profileAbilityContext.targetGrappled !== true) unresolved.push('Décharge électrique : confirmer que la cible est toujours agrippée au début du Tour suivant.');
      if (!hasMomentum(actor)) unresolved.push('Décharge électrique : 1 Élan disponible requis.');
      if (damage?.finalDamage > 0 && profileAbilityContext.targetEnduranceSuccess === false)
        targetConditionApplication.push({ id: `${normalized.resolutionId}:f2h:gargantuan-stunned`, key: 'sonne', name: 'Sonné', level: 1, source: { kind: 'bestiary-profile', ability: specialAbility, authorId: actor?.id } });
      else if (damage?.finalDamage > 0 && profileAbilityContext.targetEnduranceSuccess !== true)
        unresolved.push('Décharge électrique : saisir le résultat du Test d’Endurance Difficile (−1 DR) de la cible.');
      if (profileAbilityContext.selfEnduranceSuccess === false)
        supplementalActorConditions.push({ id: `${normalized.resolutionId}:f2h:gargantuan-fatigued`, key: 'extenue', name: 'Exténué', level: 1, source: { kind: 'bestiary-profile', ability: specialAbility, authorId: actor?.id } });
      else if (profileAbilityContext.selfEnduranceSuccess !== true)
        unresolved.push('Décharge électrique : saisir le résultat du Test d’Endurance Moyenne (+2 DR) du Gargantuan.');
    }
    if (specialAbility === 'farmyard-beast-spit') {
      const resistance = profileAbilityContext.farmyardResistance;
      if (resistance === 'fail') targetConditionApplication.push({ id: `${normalized.resolutionId}:f2h:farmyard-spit`, key: 'empoisonne', name: 'Empoisonné', level: 1, source: { kind: 'bestiary-profile', ability: specialAbility, authorId: actor?.id } });
      else if (resistance !== 'pass') unresolved.push('Crachat venimeux : saisir la réussite ou l’échec du Test de Résistance (+0 DR).');
    }
    if (specialAbility === 'sea-elemental-immersion') {
      targetConditionApplication.push(
        { id: `${normalized.resolutionId}:f2h:sea-elemental-entangled`, key: 'enchevetre', name: 'Enchevêtré', level: 1, strength: Number(actor?.caracs?.F) || 59, source: { kind: 'bestiary-profile', ability: specialAbility, authorId: actor?.id, escapeStrength: Number(actor?.caracs?.F) || 59 } },
        { id: `${normalized.resolutionId}:f2h:sea-elemental-suffocation`, key: 'suffocation', name: 'Suffocation', level: 1, source: { kind: 'bestiary-profile', ability: specialAbility, authorId: actor?.id } }
      );
    }
    if (profileId === 'E0-P-004' && naturalPlan?.key === 'web' && targetConditionApplication.some(row => row.key === 'enchevetre')) {
      targetConditionApplication.push({ id: `${normalized.resolutionId}:f2h:arachnarok-web-poison`, key: 'empoisonne', name: 'Empoisonné', level: 1, source: { kind: 'bestiary-profile', ability: 'arachnarok-venom-webs', authorId: actor?.id } });
    }
    // Venin (Difficile) des crocs du Merwyrm (L25 p.145) seulement : les autres Venins passent par leur propre chemin.
    if (profileId === 'E0-P-913' && action.qualities.some(row => (typeof row === 'string' ? row : row?.id) === 'venin') && damage?.finalDamage > 0) {
      const venom = action.qualities.find(row => (typeof row === 'string' ? row : row?.id) === 'venin');
      targetConditionApplication.push({ id: `${normalized.resolutionId}:f2h:creature-venom`, key: 'empoisonne', name: 'Empoisonné', level: 1, recoveryDifficulty: venom?.parameter || venom?.rating || null, source: { kind: 'bestiary-profile', ability: 'merwyrm-fanged-maw-venom', authorId: actor?.id } });
    }
  }
  const profileAbilityReminders = [...profileAbilityPlans, ...targetProfileAbilityPlans].flatMap(plan => plan.reminders).concat(lassoReminders);
  // Grands félins (L23 p.87) : Frappe mortelle (V4 p.160) sur toute frappe de mêlée réussie, quelle que soit la Taille ; au plus BCC attaques en chaîne.
  const deathblow = hit && target && !replacement && actorPlan.kind === 'melee' && action.extensions?.v5?.deathblow === true
    ? { triggered: true, maxChain: Math.floor((Number(actor?.caracs?.CC) || 0) / 10), ruleSource: 'L23 p.87, Frappe mortelle V4 p.160' } : null;
  if (deathblow) profileAbilityReminders.push(`Frappe mortelle : le félin peut avancer à la place de sa cible et attaquer aussitôt un autre adversaire au contact (au plus ${deathblow.maxChain} fois ce Tour). Jouer cette attaque comme une nouvelle résolution.`);
  // Les saisies de la décharge sont demandées par la résolution elle-même ; le plan n'en ajoute pas une seconde formulation.
  const profileAbilityUnresolved = [...profileAbilityPlans, ...targetProfileAbilityPlans].filter(plan => plan.key !== 'gargantuan-electric-discharge').flatMap(plan => plan.unresolved);
  unresolved.push(...profileAbilityUnresolved);
  // Filet pour les participants créés avant l'immunité centrale : retirer sans muter le tableau pendant son parcours.
  if (target) for (const row of targetConditionApplication.filter(row => bestiaryProfileStateImmunity(target, row.key))) {
    targetConditionApplication.splice(targetConditionApplication.indexOf(row), 1);
    mechanicalWarnings.push({ ability: 'Immunité d’état du profil', state: row.name, reason: 'immunité de profil' });
  }
  if(normalized.knockoutValid===true&&hit&&location?.key==='HEAD'&&action.qualities.some(q=>(typeof q==='string'?q:q?.id)==='assommante')){
    const stunned=(target?.states||[]).filter(row=>row.key==='sonne').reduce((sum,row)=>sum+Math.max(1,Number(row.level)||1),0)+targetConditionApplication.filter(row=>row.key==='sonne').reduce((sum,row)=>sum+Math.max(1,Number(row.level)||1),0);
    const toughness=Number(target?.caracs?.BE??Math.floor(Number(target?.caracs?.E||0)/10));
    if(Number.isFinite(toughness)&&stunned>toughness)targetConditionApplication.push({id:`${normalized.resolutionId}:knockout:unconscious`,key:'inconscient',name:'Inconscient',level:1,source:{kind:'knockout',resolutionId:normalized.resolutionId,stunned,toughnessBonus:toughness}});
  }
  const mountedFallPlans = [];
  const mountedRoster = Array.isArray(normalized.v5State?.participants) ? normalized.v5State.participants
    : normalized.v5State?.participants && typeof normalized.v5State.participants === 'object' ? Object.values(normalized.v5State.participants) : [];
  const mountedWithPrimary = [normalized.actor, normalized.target, ...mountedRoster].filter((row, index, all) => row && all.findIndex(candidate => candidate?.id === row.id) === index);
  const mountedRiders = mountedRoster.filter(row => row?.extensions?.v5?.mounted === true && row.extensions.v5.mountId);
  const nextConditionKeys = new Set(targetConditionApplication.map(row => foldKey(row.key || row.name)));
  if (tripFall && target?.extensions?.v5?.mounted === true) mountedFallPlans.push({ participantId: target.id, event: 'rider-prone', ...planMountedFall({ event: 'rider-prone', fallPreventedByEquipment: context.fallPreventedByEquipment === true }) });
  if (target?.extensions?.v5?.mounted === true && !tripFall) for (const event of mountedRiderEventsFor(nextConditionKeys)) mountedFallPlans.push({ participantId: target.id, event, ...planMountedFall({ event, fallPreventedByEquipment: context.fallPreventedByEquipment === true }) });
  const heldTarget = targetConditionApplication.some(row => row.key === 'enchevetre' && row.source?.kind === 'quality'
    && (row.source?.linkId || row.source?.weaponId || row.source?.keywordId === 'immobilisante'));
  const explicitRestraint = context.mountedRestraint === 'anchored' || context.mountedRestraint === 'held';
  if (target?.extensions?.v5?.mounted === true && !tripFall && (heldTarget || explicitRestraint)
    && !mountedFallPlans.some(row => row.participantId === target.id && row.requiredTest)) {
    const restraint = context.mountedRestraint === 'anchored' ? 'anchored' : 'held';
    mountedFallPlans.push({ participantId: target.id, event: 'rider-restrained', restraint,
      ...planMountedFall({ event: 'rider-restrained', restraint }) });
  }
  if (target?.extensions?.v5?.mounted === true && lethalDeath?.targetId === target.id && !mountedFallPlans.some(row => row.participantId === target.id)) {
    mountedFallPlans.push({ participantId: target.id, event: 'rider-dead', ...planMountedFall({ event: 'rider-dead', fallPreventedByEquipment: context.fallPreventedByEquipment === true }) });
  }
  if (context.grappleDeclared === true && opposed?.winner === 'attacker' && hit && target?.extensions?.v5?.mounted === true) {
    mountedFallPlans.push({ participantId: target.id, event: 'rider-restrained', restraint: 'held',
      ...planMountedFall({ event: 'rider-restrained', restraint: 'held' }) });
  }
  if (target && mountedRiders.some(row => row.extensions.v5.mountId === target.id)) {
    const mountEvent = [...nextConditionKeys].some(key => ['surpris','surprised'].includes(key)) ? 'mount-surprised'
      : [...nextConditionKeys].some(key => ['inconscient','unconscient'].includes(key)) ? 'mount-unconscious'
        : [...nextConditionKeys].some(key => ['aterre','prone'].includes(key)) ? 'mount-prone'
          : [...nextConditionKeys].some(key => ['enchevetre','entangled'].includes(key)) ? 'mount-entangled' : null;
    if (mountEvent) for (const rider of mountedRiders.filter(row => row.extensions.v5.mountId === target.id)) {
      const traits = target.traits || target.profile?.traits || [];
      mountedFallPlans.push({ participantId: rider.id, mountId: target.id, event: mountEvent,
        ...planMountedFall({ event: mountEvent, mountTraits: traits, riderEntangled: (rider.states || []).some(row => ['enchevetre','entangled'].includes(foldKey(row.key || row.name))) }) });
    }
    if (lethalDeath?.targetId === target.id) for (const rider of mountedRiders.filter(row => row.extensions.v5.mountId === target.id)) {
      mountedFallPlans.push({ participantId: rider.id, mountId: target.id, event: 'mount-dead', ...planMountedFall({ event: 'mount-dead' }) });
    }
  }
  const mountedRidePlanCounts = new Map();
  for (const plan of mountedFallPlans) if (plan.requiredTest) mountedRidePlanCounts.set(plan.participantId, (mountedRidePlanCounts.get(plan.participantId) || 0) + 1);
  const resolveMountedFallTests = () => { for (const plan of mountedFallPlans) {
    if (!plan.requiredTest) continue;
    const rider = mountedWithPrimary.find(row => row?.id === plan.participantId) || mountedRoster.find(row => row.id === plan.participantId);
    const skill = rider?.skills?.find(row => row?.id === V5_RIDE_SKILL_ID && row.status !== 'unresolved');
    const requiredPlanCount = mountedRidePlanCounts.get(plan.participantId) || 0;
    const riderAnswer = mountedRideAnswerFor({ participantId: plan.participantId, event: plan.event, requiredPlanCount,
      answersById: context.mountedRideTestsById || context.mountedRideTests || {} });
    const singlePlan = requiredPlanCount <= 1;
    const manualScore = riderAnswer.score ?? context.mountedRideScoresById?.[plan.participantId]
      ?? (singlePlan ? context.mountedRideScore : undefined);
    const score = Number.isSafeInteger(skill?.total) ? skill.total : manualScore !== null && manualScore !== undefined && manualScore !== '' && Number.isSafeInteger(Number(manualScore)) ? Number(manualScore) : null;
    const rawRideRoll = riderAnswer.roll ?? (singlePlan ? context.mountedRideRollsById?.[plan.participantId]
      ?? context.mountedRideRoll : undefined);
    const roll = Number(rawRideRoll);
    if (score === null || !Number.isInteger(roll) || roll < 1 || roll > 100) {
      plan.unresolved = ['Test de Chevaucher requis : fournissez le score et le d100 du cavalier.'];
      unresolved.push(...plan.unresolved);
      continue;
    }
    plan.test = { ...selectV5Test(previewV5Test({ score, roll, kind: 'test', slModifiers: [{ id: 'mounted:fall', label: 'Désarçonnement', amount: plan.requiredTest.modifier }] }), 'keep'), skillId: V5_RIDE_SKILL_ID };
    if (plan.dismount === 'on-failed-test' && !plan.test.success) plan.dismount = true;
    else if (plan.dismount === 'on-failed-test') plan.dismount = false;
    if (plan.opposedStrengthSize === 'mount' && plan.test.success) {
      const holder = plan.participantId === normalized.actor?.id ? normalized.target : normalized.actor;
      const holderKey = holder?.id === normalized.actor?.id ? 'holder' : 'holder';
      const forceScores = context.mountedForceScores || {}, forceRolls = context.mountedForceRolls || {};
      const knownScore = subject => {
        const value = subject?.caracs?.F;
        return value !== null && value !== undefined && value !== '' && Number.isSafeInteger(Number(value)) ? Number(value) : null;
      };
      const holderScore = knownScore(holder) ?? (forceScores[holderKey] !== null && forceScores[holderKey] !== undefined && forceScores[holderKey] !== '' && Number.isSafeInteger(Number(forceScores[holderKey])) ? Number(forceScores[holderKey]) : null);
      const riderKey = plan.participantId === normalized.actor?.id ? 'rider' : 'rider';
      const riderScore = knownScore(rider) ?? (forceScores[riderKey] !== null && forceScores[riderKey] !== undefined && forceScores[riderKey] !== '' && Number.isSafeInteger(Number(forceScores[riderKey])) ? Number(forceScores[riderKey]) : null);
      const holderRoll = Number(forceRolls.holder), riderRoll = Number(forceRolls.rider);
      if (holderScore === null || riderScore === null || !Number.isInteger(holderRoll) || holderRoll < 1 || holderRoll > 100 || !Number.isInteger(riderRoll) || riderRoll < 1 || riderRoll > 100) {
        plan.unresolved = [...(plan.unresolved || []), 'Opposition de Force après Chevaucher : saisissez les deux d100 et les scores manquants.'];
        unresolved.push(...plan.unresolved.slice(-1));
      } else {
        const holderTest = selectV5Test(previewV5Test({ score: holderScore, roll: holderRoll, kind: 'test' }), 'keep');
        const riderTest = selectV5Test(previewV5Test({ score: riderScore, roll: riderRoll, kind: 'test' }), 'keep');
        const mount = resolveMountedMount(rider, mountedWithPrimary).mount;
        const choices = context.mountedSizeChoices || {};
        const holderSizeValue = plan.participantId === normalized.actor?.id ? choices.target : choices.actor;
        const mountSizeValue = plan.participantId === normalized.actor?.id ? choices.actorMount : choices.targetMount;
        const holderSize = creatureSizeOf(holderSizeValue ? { size: holderSizeValue } : holder);
        const mountSize = creatureSizeOf(mountSizeValue ? { size: mountSizeValue } : mount);
        if (holderSize.assumed || mountSize.assumed) {
          plan.unresolved = [...(plan.unresolved || []), 'Opposition de Force après Chevaucher : choisissez explicitement la taille de la monture et de son adversaire.'];
          unresolved.push(...plan.unresolved.slice(-1));
        } else {
          const gap = Math.abs(holderSize.rank - mountSize.rank);
          const sizePlan = gap ? { forceWinner: { larger: holderSize.rank > mountSize.rank ? 'attacker' : 'defender', gap } } : null;
          const rawOpposition = resolveV5Opposition(holderTest, riderTest);
          const sized = resolveSizeOpposition({ ...rawOpposition, winner: rawOpposition.winner === 'initiator' ? 'attacker' : 'defender' }, sizePlan, holderTest, riderTest);
          plan.strengthOpposition = { holderId: holder?.id || null, riderId: rider.id, holderTest, riderTest,
            winner: sized.winner === 'attacker' ? holder?.id : rider.id, netSl: sized.netSl, tie: sized.tie,
            holderSize: holderSize.label, riderSize: mountSize.label, sizeGap: gap, sizeAutomatic: sized.sizeAutomatic === true };
        }
      }
    }
  } };
  if(context.entanglementTest===true&&success){
    const testEntanglementStrength=entanglementStrength({kind:entanglementKind,actorStrength:actor?.caracs?.F,
      explicitStrength:context.entanglementStrength??selectedWeapon?.extensions?.v5?.entanglementStrength,
      springLoaded:context.springLoaded===true||selectedWeapon?.extensions?.v5?.springLoaded===true});
    if(action.type!=='test'||action.attr!=='F')unresolved.push('Entrave : l’Action doit être un Test de Force.');
    else if(!target?.id)unresolved.push('Entrave : cible de l’immobilisation requise.');
    else if(!selectedWeapon||entanglementKind!=='mancatcher')unresolved.push('Entrave : arme Mancatcher typée et liée requise pour ce Test de Force.');
    else if(!testEntanglementStrength.ready)unresolved.push(...testEntanglementStrength.unresolved);
    else {
      const linkId=`entanglement:${normalized.resolutionId}`;
      targetConditionApplication.push({id:`${normalized.resolutionId}:quality:entanglement-test`,key:'enchevetre',name:'Empêtré',level:1,
        strength:testEntanglementStrength.strength,source:{kind:'quality',keywordId:'immobilisante',linkId,authorId:actor.id,weaponId:selectedWeapon.id,weaponLocked:true}});
      entanglement={linkId,actorId:actor.id,targetId:target.id,weaponId:selectedWeapon.id,weaponLocked:true};
    }
  }
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
  const actorConditionApplication=[...kept(activation.conditions||[],nature?.magical===true),...kept(magicFumbleStates,nature?.magical===true),...kept((defenderCritical?.application?.states||[]).map(row=>({...row,source:{...row.source,kind:'critical'}})),defenderMagical),...kept(defenderWeaponConditions.proposed,defenderMagical),...kept(blackpowderStates,false),...supplementalActorConditions];
  const actorConditionKeys = new Set(actorConditionApplication.map(row => foldKey(row.key || row.name)));
  if (actor?.extensions?.v5?.mounted === true) for (const event of mountedRiderEventsFor(actorConditionKeys)) mountedFallPlans.push({ participantId: actor.id, event,
    ...planMountedFall({ event, fallPreventedByEquipment: context.fallPreventedByEquipment === true }) });
  mountedRidePlanCounts.clear();
  for (const plan of mountedFallPlans) if (plan.requiredTest) mountedRidePlanCounts.set(plan.participantId, (mountedRidePlanCounts.get(plan.participantId) || 0) + 1);
  resolveMountedFallTests();
  conditionPlan(actor,actorConditionApplication,'actor',context.blackpowderBrokenTest?context.blackpowderShooterId:target?.id);
  if(defenderCritical?.application)defenderCritical.application.states=actorConditionApplication.filter(row=>row.source?.kind==='critical');
  defenderWeaponConditions.applied=actorConditionApplication.filter(row=>row.source?.keywordId==='assommante');
  const momentum = [];
  const planMomentum = (participant, events, exceptions=[]) => {
    if (!participant?.id) return;
    momentum.push({ participantId: participant.id, ...previewMomentumEvents({ hasMomentum: hasMomentum(participant), events, exceptions }) });
  };
  const actorEvents = [], targetEvents = [];
  const event = (type, data = {}) => ({ id: `${normalized.resolutionId}:${type}`, type, ...data });
  if (action.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge' && hasMomentum(actor))
    actorEvents.push(event('spend', { profileAbility: 'gargantuan-electric-discharge' }));
  if(normalized.combatPrelude?.targetIncomingMomentum)targetEvents.push({id:normalized.resolutionId+':slayer-charge',type:'chargeEnemy'});
  // Tueur de champions (L25 p.155) : un seul gain d'Élan par duel, consommé à l'application ; le MJ réarme pour un nouveau duel (28/10).
  const championSlayerUsed = target && !context.f2h?.championSlayerRearm && (actor?.extensions?.v5?.championSlayerDuels || []).includes(target.id);
  const championSlayerGain = (actor?.extensions?.v5?.bestiary?.id === 'E0-P-921' || actor?.profileId === 'E0-P-921') && context.f2h?.singleCombatLeader === true && target && !championSlayerUsed;
  if (championSlayerGain) actorEvents.push(event('profileMomentumGain', { profileAbility: 'wulfrik-champion-slayer' }));
  if (championSlayerUsed && context.f2h?.singleCombatLeader === true) profileAbilityReminders.push('Tueur de champions : l’Élan de ce duel est déjà gagné; réarmer seulement pour un nouveau duel.');
  if (context.outsideCombat !== true && actorPlan.charging) actorEvents.push(event('chargeEnemy'));
  // La décharge du Gargantuan est un effet payé en Élan, pas une attaque opposée : ni gain ni perte d'opposition.
  const profileEffectOnly = action.extensions?.v5?.specialProfileAbility === 'gargantuan-electric-discharge';
  if (context.outsideCombat !== true && actorPlan.kind === 'melee' && !profileEffectOnly) {
    if (opposed) actorEvents.push(event(hit ? 'opposedMeleeWon' : 'opposedMeleeLost'));
    else if (!success) actorEvents.push(event('meleeTestFailed'));
  }
  if (context.outsideCombat !== true && defenderPlan?.kind === 'melee' && opposed && !profileEffectOnly) targetEvents.push(event(hit ? 'opposedMeleeLost' : 'opposedMeleeWon'));
  const criticalEffects = criticalBlock?.application;
  targetEvents.push(event('woundsLost', { amount: Math.min(hpBefore, (damage?.finalDamage || 0) + (criticalEffects?.extraWounds || 0)) }));
  targetEvents.push(event('conditionAcquired', { instances: conditionChanges.target?.acquiredInstances || 0 }));
  actorEvents.push(event('woundsLost', { amount: Math.min(Math.max(0, Number(actor?.hp) || 0), (defenderCritical?.application.extraWounds || 0)+(defenderDamage?.finalDamage||0)) }));
  actorEvents.push(event('conditionAcquired', { instances: conditionChanges.actor?.acquiredInstances || 0 }));
  const reversal=evaluateV5Talents(target,{event:'momentum.beforeLoss',role:'defender',context:{kind:defenderPlan?.kind||'none',test:{success:defenderTest?.success||false},attack:{hit:Boolean(hit&&attackType(action.type))}}});supplementaryTalentPlans.push(reversal);
  const resoluteActor=resoluteException(normalized,conditionChanges.actor?.participant||actor,normalized.v5,conditionChanges.actor?.acquiredInstances||0),resoluteTarget=resoluteException(normalized,conditionChanges.target?.participant||target,normalized.defense?.v5,conditionChanges.target?.acquiredInstances||0);supplementaryTalentPlans.push(...resoluteActor.plans,...resoluteTarget.plans);unresolved.push(...resoluteActor.unresolved,...resoluteTarget.unresolved);
  planMomentum(actor, actorEvents,resoluteActor.exceptions);if(slash.momentumSpent){const change=momentum.find(row=>row.participantId===actor?.id);if(change){change.after=false;change.details=[...(change.details||[]),{eventId:normalized.resolutionId+':entaille-spend',effect:'spend',before:true,after:false,preventedBy:[]}];}} planMomentum(target, targetEvents,[...resoluteTarget.exceptions,...reversal.proposals.filter(x=>x.op==='preventMomentumLoss').map(x=>({reason:x.key,talentId:x.origins[0].talentId,applies:true}))]);
  if(weaponTrap?.disposition==='caught'){
    const change=momentum.find(row=>row.participantId===target?.id);
    if(!change?.after)unresolved.push('Piège-lame : un Élan doit être disponible après le Test de défense pour saisir l’arme.');
    else{change.after=false;change.details=[...(change.details||[]),{eventId:normalized.resolutionId+':trap-blade-catch',effect:'spend',before:true,after:false,preventedBy:[]}];}
  }

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
  const secondaryInflictConditions=(victim,damageDealt,locationValue,resolutionKey)=>{
    const inflictResult=previewV5Inflict({qualities:action.qualities,hit:true,actorStrength:actor?.caracs?.F});
    if(!inflictResult.ready){unresolved.push(...inflictResult.unresolved);return [];}
    const conditions=inflictResult.conditions||[inflictResult.condition].filter(Boolean);
    return conditions.map((condition,index)=>({id:`${resolutionKey}:quality:inflige${index?`:${index}`:''}`,...condition,
      source:{kind:'quality',keywordId:'inflige',authorId:actor?.id}}));
  };
  if(blastPlan?.ready&&hit&&!unresolved.some(message=>message.startsWith('Explosion :'))){
    for(const blastTarget of blastPlan.targets.filter(row=>row.participantId!==target?.id)){
      const victim=(normalized.v5State?.participants||[]).find(person=>person.id===blastTarget.participantId&&person.zone==='active');
      if(!victim)continue;
      if(!knownHp(victim)){unresolved.push(`Explosion : PV actuels et maximum requis pour ${victim.name||victim.id}.`);continue;}
      const blastLocationRoll=Number(context.explosionLocationRollsById?.[victim.id]),blastLocation=Number.isInteger(blastLocationRoll)&&blastLocationRoll>=1&&blastLocationRoll<=100?creatureLocationOf(blastLocationRoll,victim,{hitMorphology:context.hitMorphologiesById?.[victim.id],spiderLegSide:context.spiderLegSidesById?.[victim.id]}):null;
      if(!blastLocation){unresolved.push(`Explosion : choisir un jet de localisation d100 (1–100) pour ${victim.name||victim.id}.`);continue;}
      const guard=locationProtection(victim,{...normalized.protectionContext,location:blastLocation,attackRoll:roll,hitLocationRoll:blastLocationRoll,
        critical:false,ranged:nature.ranged,defenseProvided:false,qualities:action.qualities,nature});
      protectionReceipts.push(guard);unresolved.push(...guard.manual.map(message=>`${victim.name||victim.id} : ${message}`));
      if(guard.ap===null)continue;
      const dealt=computeDamage({weaponDamage:blastTarget.damage,strengthBonus,damageBonus:0,sl:0,roll,
        targetToughnessBonus:Math.floor((Number(victim.caracs?.E)||0)/10),targetArmour:guard.ap,qualities:action.qualities.filter(row=>(typeof row==='string'?row:row?.id)!=='devastatrice'),
        damageMultiplier:normalized.combatPrelude?.small?.multiplier||1,approvedQualities:normalized.combatPrelude?.small?.approvedQualities||[]});
      if(dealt)Object.assign(dealt,{activeQualities:action.qualities,explosionUnitsDie:action.qualities.some(row=>(typeof row==='string'?row:row?.id)==='devastatrice')?roll%10:0});
      const words=previewV5WeaponConditions({qualities:action.qualities.filter(row=>(typeof row==='string'?row:row?.id)!=='inflige'),hit:true,location:blastLocation,target:victim,actor,damage:dealt,resolutionId:`${normalized.resolutionId}:${victim.id}`});
      words.proposed.push(...secondaryInflictConditions(victim,dealt,blastLocation,`${normalized.resolutionId}:${victim.id}`));
      unresolved.push(...words.unresolved);mechanicalWarnings.push(...words.warnings);
      let after=clone(victim);
      if(words.proposed.length){const receipt=acquireV5Conditions(after,words.proposed,{resolutionId:normalized.resolutionId,authorId:actor.id,targetId:victim.id,round:normalized.round,source:{}});
        if(!receipt.ready)unresolved.push(...receipt.needsInput.map(row=>`${victim.name||victim.id} : ${row.label}`));else after=receipt.participant;}
      after.hp=Math.max(0,(Number(after.hp)||0)-dealt.finalDamage);
      secondaryTargets.push({participantId:victim.id,name:victim.name,before:clone(victim),participant:after,damage:dealt,location:blastLocation,critical:null,conditions:words.proposed});
    }
  }
  if(normalized.combatPrelude?.whirlwind?.active&&hit&&damage){
    for(const id of context.engagedIds.filter(id=>id!==target.id)){
      const victim=normalized.v5State.participants.find(p=>p.id===id);
      const victimLocation=creatureLocationOf(reverseV5Roll(roll),victim,{hitMorphology:context.hitMorphologiesById?.[id],spiderLegSide:context.spiderLegSidesById?.[id]});
      let guard=locationProtection(victim,{...(context.whirlwindProtection?.[id]||{}),location:victimLocation,attackRoll:roll,hitLocationRoll:victimLocation.roll,critical:false,ranged:false,defenseProvided:false,qualities:action.qualities,nature});
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
      const second=enemy&&dealt.finalDamage>=Number(victim.hp)?secondCritical(reverseV5Roll(roll),prepareCritical(actor,normalizeCriticalRolls(rawRolls),settings,'attacker',inoffensive,['second']),excess*10+divineCriticalSeverityBonus(actor),inoffensive,victimLocation):null;
      if(second?.pending)unresolved.push(victim.name+' : gravité réelle du critique de Tourbillon requise.');
      const critical=second?{kind:'Critique',second,excessWounds:excess,items:criticalItems(null,second,context.whirlwindDeclined?.[id]||[])}:null;if(critical)critical.application=criticalApplication(critical.items);
      const words=previewV5WeaponConditions({qualities:action.qualities,hit:true,location:victimLocation,target:victim,actor,damage:dealt,resolutionId:normalized.resolutionId+':'+id});
      supplementaryTalentPlans.push(...(words.talentPlans||[]));unresolved.push(...words.unresolved);mechanicalWarnings.push(...words.warnings);
      if(critical?.application)refuseFamiliarConditions(victim,critical.application.states,nature?.magical===true,familiarConditionRefusals);
      const incoming=[...(critical?.application.states||[]).map(s=>({...s,source:{...s.source,kind:'critical'}})),...words.proposed];
      refuseFamiliarConditions(victim,incoming,nature?.magical===true,familiarConditionRefusals);
      const reduced=previewV5TalentConditions(victim,incoming,{state:normalized.v5State,clock:normalized.v5Clock,actionId:normalized.resolutionId+':condition:'+id});
      conditionTalentPlans.push(reduced.plan);talentUsageRequests.push(...reduced.usageRequests);unresolved.push(...reduced.plan.unresolved.flatMap(r=>r.fields.map(f=>victim.name+' : préciser '+f)));
      const receipt=acquireV5Conditions(victim,reduced.states,{resolutionId:normalized.resolutionId,authorId:actor.id,targetId:id,round:normalized.round,source:{}});unresolved.push(...receipt.needsInput.map(r=>victim.name+' : '+r.label));
      let after=withMomentum({...receipt.participant,hp:Math.max(0,Number(victim.hp)-dealt.finalDamage-(critical?.application.extraWounds||0))},false);
      const exit=previewV5FrenzyExit(after,{round:normalized.round,resolutionId:normalized.resolutionId,state:normalized.v5State,clock:normalized.v5Clock});after=exit.participant;supplementaryTalentPlans.push(...exit.plans);talentUsageRequests.push(...exit.usageRequests);unresolved.push(...exit.unresolved);
      secondaryTargets.push({participantId:id,name:victim.name,before:clone(victim),participant:after,damage:dealt,location:victimLocation,critical,conditions:reduced.states});
    }
  }
  if(spreadPlan?.ready&&hit&&damage&&!unresolved.some(message=>message.startsWith('Dispersion :'))){
    for(const spreadTarget of spreadPlan.targets.filter(row=>row.participantId!==target?.id&&!secondaryTargets.some(existing=>existing.participantId===row.participantId))){
      const victim=(normalized.v5State?.participants||[]).find(person=>person.id===spreadTarget.participantId&&person.zone==='active');
      if(!victim)continue;
      if(!knownHp(victim)){unresolved.push(`Dispersion : PV actuels et maximum requis pour ${victim.name||victim.id}.`);continue;}
      const spreadLocationRoll=Number(context.spreadLocationRollsById?.[victim.id]),spreadLocation=Number.isInteger(spreadLocationRoll)&&spreadLocationRoll>=1&&spreadLocationRoll<=100?creatureLocationOf(spreadLocationRoll,victim,{hitMorphology:context.hitMorphologiesById?.[victim.id],spiderLegSide:context.spiderLegSidesById?.[victim.id]}):null;
      if(!spreadLocation){unresolved.push(`Dispersion : choisir un jet de localisation d100 (1–100) pour ${victim.name||victim.id}.`);continue;}
      const guard=locationProtection(victim,{...normalized.protectionContext,location:spreadLocation,attackRoll:roll,hitLocationRoll:spreadLocationRoll,
        critical:false,ranged:true,defenseProvided:false,qualities:action.qualities,nature});
      protectionReceipts.push(guard);unresolved.push(...guard.manual.map(message=>`${victim.name||victim.id} : ${message}`));
      if(guard.ap===null)continue;
      const dealt=computeDamage({weaponDamage:spreadTarget.damage,strengthBonus,damageBonus:damageBonus+magicWeaponBonus(actor,action,nature.ranged,Number(action.damage)||0),
        sl:opposed?opposed.netSl:sl,roll,targetToughnessBonus:Math.floor((Number(victim.caracs?.E)||0)/10),targetArmour:guard.ap,
        qualities:action.qualities,damageMultiplier:normalized.combatPrelude?.small?.multiplier||1,approvedQualities:normalized.combatPrelude?.small?.approvedQualities||[]});
      const secondaryWords=previewV5WeaponConditions({qualities:action.qualities.filter(row=>(typeof row==='string'?row:row?.id)!=='inflige'),hit:true,location:spreadLocation,target:victim,actor,damage:dealt,resolutionId:`${normalized.resolutionId}:${victim.id}`});
      secondaryWords.proposed.push(...secondaryInflictConditions(victim,dealt,spreadLocation,`${normalized.resolutionId}:${victim.id}`));
      unresolved.push(...secondaryWords.unresolved);mechanicalWarnings.push(...secondaryWords.warnings);
      const after=clone(victim);
      if(secondaryWords.proposed.length){const receipt=acquireV5Conditions(after,secondaryWords.proposed,{resolutionId:normalized.resolutionId,authorId:actor.id,targetId:victim.id,round:normalized.round,source:{}});
        if(!receipt.ready)unresolved.push(...receipt.needsInput.map(row=>`${victim.name||victim.id} : ${row.label}`));else Object.assign(after,receipt.participant);}
      after.hp=Math.max(0,(Number(after.hp)||0)-dealt.finalDamage);
      secondaryTargets.push({participantId:victim.id,name:victim.name,before:clone(victim),participant:after,damage:dealt,location:spreadLocation,critical:null,conditions:secondaryWords.proposed});
    }
  }

  unresolved.push(...criticalReady);
  if(actorPlan.crewSkill){talentActionChanges.push({participantId:actor.id,removeIds:[actorPlan.crewSkill.id]});supplementaryTalentPlans.push({proposals:[{op:'substituteCrewSkill',origins:[actorPlan.crewSkill.source]}]});}
  const declaredCombatAction=attackType(action.type)||normalized.v5?.context?.isAction===true;
  const resolvedRecordKinds=new Set(['weapon-explosion','salvo-artillery-hit','salvo-artillery-destroyed','fumble-ally-hit','misfire','critical-follow-up']);
  const consumedCombatEffects=declaredCombatAction?(actor?.extensions?.v5?.combatEffects||[]).filter(row=>row.kind==='next-action-sl'||resolvedRecordKinds.has(row.kind)).map(row=>row.id):[];
  const result = {
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
    profileAbilityPlans: [...profileAbilityPlans, ...targetProfileAbilityPlans],
    deathblow,
    championSlayerDuel: championSlayerGain ? { participantId: actor.id, targetId: target.id } : null,
    supplementalEquipment,
    weaponReload,
    entanglement,
    netEscape,
    entanglementRelease,
    projectileLodging,
    hack,
    slash,
    fast,
    weaponTrap,
    weaponTrapRecovery,
    shieldHands, shieldAttack,
    mountedCombat: normalized.mountedCombatPlan?.active ? clone(normalized.mountedCombatPlan) : null,
    mountedCharge: mountedChargePlan?.available ? clone(mountedChargePlan) : null,
    mountedDodge: normalized.mountedDodgePlan?.disadvantageSources?.length ? clone(normalized.mountedDodgePlan) : null,
    mountedFall: mountedFallPlans.length ? clone(mountedFallPlans) : null,
    blastPlan,
    spreadPlan,
    targetConditionApplication,actorConditionApplication,defenderWeaponConditions,familiarConditionRefusals,
    reminders: [...familiarConditionRefusals.map(row => `${row.name || 'Homoncule'} : ${row.message}`),...profileAbilityReminders,...(supplementalEquipment?.reminders||[]),...(supplementalEquipment?.unresolved||[]),...(magicFearImmune?['Le Bœuf Reste Debout : immunité aux Tests de Peur et Terreur pour la durée.']:[]),...(fast.initiativeBonus?[`Rapide : +${fast.initiativeBonus} Initiative pour cette attaque uniquement; le MJ l’applique à son arbitrage d’ordre, sans modifier l’Initiative de fiche.`]:[]),...activation.reminders,...special.reminders,...naturalReminders,...(hit&&attackType(action.type)&&target?reactionReminders(target,nature):[]),...(hit&&target&&damage?.finalDamage>0&&(target.extensions?.v5?.spellEffects||[]).some(e=>e.specialState?.festeringWoundTest)?[`Domaine de Nurgle (D-C51) : ${target.name||target.id} subit des Blessures ; proposer au MJ de jouer le Test de Blessure Suppurée (V5 p. 180). Rien n’est appliqué par l’outil.`]:[]),...(context.silentTakedown === true ? ['Neutralisation silencieuse : Blessures égales au BF et Inconscient si victoire ; Sonné et alarme si la cible gagne. Ces conséquences restent à arbitrer.'] : [])],
    activeEffects,talentActionChanges,secondaryTargets,
    damageReplacedByTalent: replacement ? clone(replacement) : null,defenderDamageReplacedByTalent:defenseShield.replacement||null,
    unresolved: [...unresolved,...(supplementalEquipment?.unresolved||[])],
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
    reachGuide:actorPlan.kind==='melee'?computeV5WeaponReachGuide(naturalWeaponDefaults({reach:context.weaponReach||(actor?.equipment?.find(item=>item.id===action?.extensions?.fiche?.equipmentId)||action?.extensions?.equipment)?.reach||action?.reach,qualities:action?.qualities,natural:Boolean(naturalPlan||inferredNatural)}).reach):null,
    rangeBands:actorPlan.kind==='ranged'?computeV5WeaponRangeBands(context.weaponRangeYards??(actor?.equipment?.find(item=>item.id===action?.extensions?.fiche?.equipmentId)||action?.extensions?.equipment)?.range??action?.range,actor):null,
    sl,
    resultTier: actorTest.resultTier,
    defenderResultTier: defenderTest?.resultTier||null,
    slBonus,
    double: doubled,
    critical: criticalBlock,
    fumble: !success && fumbleClassification.maladresse ? { expanded: fumbleClassification.élargi } : null,
    combatFailure,
    consumedCombatEffects,
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
  if (normalized.v5?.context?.fateAction === 'cancel-attack' && attackType(action.type)) {
    result.fateAction = { action: 'cancel-attack', cancelled: true };
    result.hit = false; result.damage = null; result.critical = null; result.defenderCritical = null;
    result.targetConditionApplication = null; result.weaponConditions = null; result.entanglement = null;
    result.projectileLodging = null; result.hack = null; result.slash = null; result.spreadPlan = null;
    result.secondaryTargets = []; result.lethalDeath = null; result.tripFall = null; result.trip = null;
    result.reminders = [...result.reminders, 'Destin : attaque annulée avant Blessures et Blessures Critiques.'];
  }
  if(normalized.v5?.context?.fateAction==='survive'){
    const deathResult=criticalBlock?.details?.parsed?.death===true||criticalBlock?.second?.parsed?.death===true;
    const lethal=attackType(action.type)&&target&&hit&&(deathResult||lethalDeath?.targetId===target.id);
    if(lethal){result.fateSurvival={participantId:target.id,removedFromEncounter:true};result.hit=false;result.damage=null;result.critical=null;result.defenderCritical=null;result.targetConditionApplication=null;result.weaponConditions=null;result.entanglement=null;result.projectileLodging=null;result.secondaryTargets=[];result.lethalDeath=null;result.reminders=[...result.reminders,'Destin : le personnage échappe à la mort et quitte la rencontre.'];}
    else {result.unresolved=[...(result.unresolved||[]),'Destin : Survivre exige une attaque infligeant un résultat mortel confirmé (un total à 0 Blessure ne suffit pas).'];result.ready=false;result.status='manual';}
  }
  return result;
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
  // These Fate choices resolve before the attack pipeline: no hit, critical, injury,
  // projectile, weapon, bystander or defender side effects may leak through.
  if(preview.fateAction?.cancelled||preview.fateSurvival){
    const next=clone(currentState);
    if(preview.fateSurvival){const target=participantById(next,preview.targetId);if(!target)return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};const updated=clone(target);updated.zone='bench';next.participants=participantListWithUpdate(next,updated.id,updated);}
    next.revision=currentState.revision+1;next.appliedResolutionIds=[...appliedIds,preview.resolutionId].slice(-MAX_APPLIED_RESOLUTION_IDS);
    const resolution=clone(preview);resolution.application={status:'applied',applied:true,revision:next.revision};
    return{status:'applied',state:next,resolution};
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
  if ((preview.attack || preview.tripFall || preview.trip?.conditionApplied || preview.entanglement || preview.fateSurvival) && preview.targetId && (preview.damage || criticalEffects.extraWounds || targetConditions.length || headHit || preview.lethalDeath || preview.tripFall || preview.entanglement || preview.fateSurvival)) {
    if (!target) return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    if (JSON.stringify(target) !== JSON.stringify(preview.input.target)) {
      return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    }
    const updated = clone(target);
    if(preview.fateSurvival)updated.zone='bench';
    if(preview.hack?.ready&&preview.hack.damage?.itemId){
      updated.extensions??={};updated.extensions.v5={...(updated.extensions.v5||{})};
      const damageByItem={...(updated.extensions.v5.armorDamageByItem||{})};
      damageByItem[preview.hack.damage.itemId]=(Number(damageByItem[preview.hack.damage.itemId])||0)+preview.hack.damage.amount;
      updated.extensions.v5.armorDamageByItem=damageByItem;
    }
    if (headHit) {
      updated.extensions ??= {};
      updated.extensions.v5 = { ...(updated.extensions.v5 || {}), heads: headHit.registry };
    }
    const oldHp = Number(updated.hp) || 0;
    updated.hp = Math.max(0, oldHp - previewHpLoss(preview) - (preview.tripFall?.damageLoss||0) - (preview.tripFall?.extraCriticalWounds||0));
    if(preview.lethalDeath?.targetId===updated.id){updated.hp=0;updated.extensions??={};updated.extensions.v5={...(updated.extensions.v5||{}),dead:true};}
    if(preview.tripFall){updated.extensions??={};updated.extensions.v5={...(updated.extensions.v5||{}),mounted:false};}
    const disguise=(preview.supplementalEquipment?.effects||[]).find(row=>row.participantId===updated.id&&row.disguiseAs);
    if(disguise){updated.extensions??={};updated.extensions.v5={...(updated.extensions.v5||{}),felidWoundDisguises:[...(updated.extensions.v5?.felidWoundDisguises||[]),{id:`${preview.resolutionId}:felid-disguise`,resolutionId:preview.resolutionId,appearance:disguise.disguiseAs,sourceRuleId:disguise.sourceRuleId,wounds:Math.max(0,Number(preview.damage?.finalDamage)||0)}].slice(-100)};}
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
  if (preview.projectileLodging && preview.targetId) {
    const live = participantById(nextState, preview.targetId);
    if (!live) return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    const updated = clone(live); updated.extensions ??= {}; updated.extensions.v5 ??= {};
    const rows = updated.extensions.v5.lodgedProjectiles || [];
    const projectile = { ...clone(preview.projectileLodging), id: `${preview.resolutionId}:projectile`, resolutionId: preview.resolutionId,
      removed: false, source: { kind: 'quality', keywordId: 'empaleuse', authorId: preview.input.actor?.id } };
    if (!rows.some(row => row.id === projectile.id)) updated.extensions.v5.lodgedProjectiles = [...rows, projectile];
    nextState.participants = participantListWithUpdate(nextState, updated.id, updated);
  }
  if(preview.supplementalEquipment?.weaponDispositionUpdate){
    const change=preview.supplementalEquipment.weaponDispositionUpdate,owner=participantById(nextState,preview.input.actor?.id),live=participantById(currentState,preview.input.actor?.id);
    if(!owner||!live||JSON.stringify(live)!==JSON.stringify(preview.input.actor))return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
    const weapon=owner.equipment?.find(row=>row.id===change.itemId);
    if(!weapon)return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
    const updated=clone(owner);updated.equipment=updated.equipment.map(row=>{
      if(row.id!==change.itemId)return row;
      const extensions={...(row.extensions||{})},v5={...(extensions.v5||{})};
      if(change.weaponDisposition)v5.weaponDisposition=change.weaponDisposition;else delete v5.weaponDisposition;
      if(change.fellDaggerBreakNextUse===true)v5.fellDaggerBreakNextUse=true;else delete v5.fellDaggerBreakNextUse;
      extensions.v5=v5;return{...row,extensions};
    });
    nextState.participants=participantListWithUpdate(nextState,updated.id,updated);
  }
  if(preview.weaponTrap?.ready){
    const trap=preview.weaponTrap,holder=participantById(nextState,trap.holderId),weapon=holder?.equipment?.find(row=>row.id===trap.weaponId);
    if(!holder||!weapon||JSON.stringify(participantById(currentState,trap.holderId))!==JSON.stringify(preview.input.actor))return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
    if(trap.catch){
      const recipient=participantById(nextState,trap.defenderId);
      if(!recipient||recipient.equipment?.some(row=>row.id===trap.weaponId))return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
      const updatedHolder=clone(holder);updatedHolder.equipment=updatedHolder.equipment.filter(row=>row.id!==trap.weaponId);
      nextState.participants=participantListWithUpdate(nextState,updatedHolder.id,updatedHolder);
      const updatedRecipient=clone(participantById(nextState,recipient.id)),item=clone(weapon);
      const extensions={...(item.extensions||{})},v5={...(extensions.v5||{})};delete v5.weaponDisposition;
      if(trap.disposition==='broken')v5.weaponDisposition='broken';
      v5.weaponTrap={resolutionId:preview.resolutionId,defenderId:trap.defenderId,caughtBy:trap.defenderId,previousHolderId:trap.holderId};
      if(trap.disposition==='broken')v5.weaponTrap.broken=true;
      extensions.v5=v5;item.extensions=extensions;updatedRecipient.equipment=[...(updatedRecipient.equipment||[]),item];
      nextState.participants=participantListWithUpdate(nextState,updatedRecipient.id,updatedRecipient);
    }else{
      const updated=clone(holder);updated.equipment=updated.equipment.map(row=>row.id!==trap.weaponId?row:{...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),
        weaponDisposition:trap.disposition,weaponTrap:{resolutionId:preview.resolutionId,defenderId:trap.defenderId,broken:trap.disposition==='broken',caughtBy:null}}}});
      nextState.participants=participantListWithUpdate(nextState,updated.id,updated);
    }
  }
  if(preview.weaponTrapRecovery){
    const recovery=preview.weaponTrapRecovery,owner=participantById(nextState,recovery.fromParticipantId),recipient=participantById(nextState,recovery.toParticipantId);
    const item=owner?.equipment?.find(row=>row.id===recovery.weaponId);
    if(!owner||!recipient||!item||item.extensions?.v5?.weaponDisposition!=='dropped'||JSON.stringify(item)!==JSON.stringify(recovery.before)
      ||recovery.fromParticipantId!==recovery.toParticipantId&&recipient.equipment?.some(row=>row.id===recovery.weaponId))return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
    const restored=clone(item),extensions={...(restored.extensions||{})},v5={...(extensions.v5||{})};delete v5.weaponDisposition;
    v5.weaponTrap={...(v5.weaponTrap||{}),recoveredBy:recovery.toParticipantId,recoveredAtResolutionId:preview.resolutionId};extensions.v5=v5;restored.extensions=extensions;
    if(recovery.fromParticipantId===recovery.toParticipantId){const updated=clone(owner);updated.equipment=updated.equipment.map(row=>row.id===recovery.weaponId?restored:row);nextState.participants=participantListWithUpdate(nextState,updated.id,updated);}
    else{const updatedOwner=clone(owner);updatedOwner.equipment=updatedOwner.equipment.filter(row=>row.id!==recovery.weaponId);nextState.participants=participantListWithUpdate(nextState,updatedOwner.id,updatedOwner);const updatedRecipient=clone(participantById(nextState,recipient.id));updatedRecipient.equipment=[...(updatedRecipient.equipment||[]),restored];nextState.participants=participantListWithUpdate(nextState,updatedRecipient.id,updatedRecipient);}
  }
  if (preview.entanglement?.linkId && preview.targetId) {
    const victim=participantById(nextState,preview.targetId);
    const condition=victim?.states?.find(row=>row.source?.linkId===preview.entanglement.linkId);
    if(!victim||!condition)return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
    if(preview.entanglement.weaponLocked){
      const holder=participantById(nextState,preview.entanglement.actorId);
      if(preview.entanglement.conjuredEffectId){
        const effect=holder?.extensions?.v5?.spellEffects?.find(row=>row.id===preview.entanglement.conjuredEffectId);
        if(!holder||!effect)return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
        const updated=clone(holder);updated.extensions.v5.spellEffects=updated.extensions.v5.spellEffects.map(row=>row.id===effect.id?{...row,
          weaponLocks:[...(row.weaponLocks||[]).filter(lock=>lock.linkId!==preview.entanglement.linkId),{linkId:preview.entanglement.linkId,weaponKey:preview.entanglement.weaponId}]}:row);
        nextState.participants=participantListWithUpdate(nextState,updated.id,updated);
      } else {
        const weapon=holder?.equipment?.find(row=>row.id===preview.entanglement.weaponId);
        if(!holder||!weapon)return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
        const updated=clone(holder);
        updated.equipment=updated.equipment.map(row=>row.id===weapon.id?{...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),
          entanglementLocks:[...new Set([...(row.extensions?.v5?.entanglementLocks||[]),preview.entanglement.linkId])]}}}:row);
        nextState.participants=participantListWithUpdate(nextState,updated.id,updated);
      }
    }
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
  if(preview.netEscape){
    const escape=preview.netEscape,live=participantById(nextState,escape.participantId);
    const condition=live?.states?.find(row=>row.id===escape.conditionId);
    if(!live||!condition||JSON.stringify(condition)!==JSON.stringify(escape.before))return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
    const updated=clone(live);updated.states=updated.states.flatMap(row=>row.id!==escape.conditionId?[row]:escape.after?[escape.after]:[]);
    if(escape.hookedNetDamage>0)updated.hp=Math.max(0,(Number(updated.hp)||0)-escape.hookedNetDamage);
    updated.extensions??={};updated.extensions.v5={...(updated.extensions.v5||{}),netEscapeProgress:{...(updated.extensions.v5?.netEscapeProgress||{})}};
    if(escape.afterProgress===null)delete updated.extensions.v5.netEscapeProgress[escape.conditionId];
    else updated.extensions.v5.netEscapeProgress[escape.conditionId]=escape.afterProgress;
    nextState.participants=participantListWithUpdate(nextState,updated.id,updated);
    if(escape.freed&&escape.weaponId&&escape.holderId){
      const holder=participantById(nextState,escape.holderId);
      if(escape.conjuredEffectId){
        const effect=holder?.extensions?.v5?.spellEffects?.find(row=>row.id===escape.conjuredEffectId);
        if(!holder||!effect)return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
        const unlocked=clone(holder);unlocked.extensions.v5.spellEffects=unlocked.extensions.v5.spellEffects.map(row=>row.id===effect.id?{...row,
          weaponLocks:(row.weaponLocks||[]).filter(lock=>lock.linkId!==condition.source?.linkId)}:row);
        nextState.participants=participantListWithUpdate(nextState,unlocked.id,unlocked);
      } else {
        const weapon=holder?.equipment?.find(row=>row.id===escape.weaponId);
        if(!holder||!weapon)return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
        const unlocked=clone(holder);unlocked.equipment=unlocked.equipment.map(row=>row.id===weapon.id?{...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),
          entanglementLocks:(row.extensions?.v5?.entanglementLocks||[]).filter(id=>id!==condition.source?.linkId)}}}:row);
        nextState.participants=participantListWithUpdate(nextState,unlocked.id,unlocked);
      }
    }
  }
  if(preview.entanglementRelease){
    const release=preview.entanglementRelease,holder=participantById(nextState,release.holderId),victim=participantById(nextState,release.conditionParticipantId);
    const weapon=holder?.equipment?.find(row=>row.id===release.weaponId),effect=release.conjuredEffectId?holder?.extensions?.v5?.spellEffects?.find(row=>row.id===release.conjuredEffectId):null;
    const condition=victim?.states?.find(row=>row.id===release.condition.id);
    if(!holder||!victim||(!weapon&&!effect)||!condition||JSON.stringify(condition)!==JSON.stringify(release.condition)
      ||(weapon?!(weapon.extensions?.v5?.entanglementLocks||[]).includes(release.linkId):!(effect.weaponLocks||[]).some(lock=>lock.linkId===release.linkId)))return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
    const updatedVictim=clone(victim);updatedVictim.states=updatedVictim.states.filter(row=>row.id!==condition.id);
    nextState.participants=participantListWithUpdate(nextState,updatedVictim.id,updatedVictim);
    const updatedHolder=clone(participantById(nextState,release.holderId));
    if(effect)updatedHolder.extensions.v5.spellEffects=updatedHolder.extensions.v5.spellEffects.map(row=>row.id===effect.id?{...row,weaponLocks:(row.weaponLocks||[]).filter(lock=>lock.linkId!==release.linkId)}:row);
    else updatedHolder.equipment=updatedHolder.equipment.map(row=>row.id===release.weaponId
      ?{...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),entanglementLocks:(row.extensions?.v5?.entanglementLocks||[]).filter(id=>id!==release.linkId)}}}:row);
    nextState.participants=participantListWithUpdate(nextState,updatedHolder.id,updatedHolder);
  }
  if(preview.grapple?.ready&&preview.grapple?.handled){
    const actorId=preview.input.actor?.id,targetId=preview.input.target?.id;
    let actor=participantById(nextState,actorId),victim=participantById(nextState,targetId);
    if(!actor||!victim)return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
    if(preview.grapple.won&&preview.grapple.link){
      const applied=applyGrappleInitiation(preview.grapple,victim);victim=clone(applied.participant);
      const link={...applied.link,appliedActionIds:[preview.resolutionId]};
      const attach=subject=>{const updated=clone(subject);updated.extensions??={};updated.extensions.v5={...(updated.extensions.v5||{}),grapples:[...(updated.extensions.v5?.grapples||[]).filter(row=>row.id!==link.id),link]};return updated;};
      actor=attach(actor);victim=attach(victim);
      nextState.participants=participantListWithUpdate(nextState,victim.id,victim);nextState.participants=participantListWithUpdate(nextState,actor.id,actor);
    }
  }else if(preview.grapple?.ready&&preview.grapple?.linkId){
    const actorId=preview.input.actor?.id,targetId=preview.input.target?.id;
    let actor=participantById(nextState,actorId),victim=participantById(nextState,targetId);
    const link=(actor?.extensions?.v5?.grapples||[]).find(row=>row.id===preview.grapple.linkId)||(victim?.extensions?.v5?.grapples||[]).find(row=>row.id===preview.grapple.linkId);
    if(!actor||!victim||!link)return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
    const applied=applyGrappleAction(preview.grapple,{actor,target:victim,link});
    if(applied.status==='stale'||applied.status==='blocked')return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
    actor=clone(applied.actor||actor);victim=clone(applied.target||victim);
    if(applied.damage){victim.hp=Math.max(0,(Number(victim.hp)||0)-applied.damage.amount);}
    const nextLink=applied.link;
    const replace=subject=>{const updated=clone(subject);updated.extensions??={};updated.extensions.v5={...(updated.extensions.v5||{}),grapples:(updated.extensions.v5?.grapples||[]).map(row=>row.id===nextLink.id?nextLink:row)};return updated;};
    actor=replace(actor);victim=replace(victim);
    nextState.participants=participantListWithUpdate(nextState,actor.id,actor);nextState.participants=participantListWithUpdate(nextState,victim.id,victim);
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
  if (preview.championSlayerDuel) {
    const live = participantById(nextState, preview.championSlayerDuel.participantId);
    if (live) { const updated = clone(live); updated.extensions ??= {}; updated.extensions.v5 = { ...(updated.extensions.v5 || {}), championSlayerDuels: [...new Set([...(updated.extensions.v5?.championSlayerDuels || []), preview.championSlayerDuel.targetId])].slice(-50) }; nextState.participants = participantListWithUpdate(nextState, live.id, updated); }
  }
  for(const change of preview.talentActionChanges||[]){
    const live=participantById(nextState,change.participantId);if(!live)return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
    let updated={...clone(live),...clone(change.patch||{}),states:[...(live.states||[]).filter(s=>!change.removeKeys?.includes(s.key)&&!change.removeIds?.includes(s.id)),...(change.add||[])]};
    if(typeof change.momentum==='boolean')updated=withMomentum(updated,change.momentum);nextState.participants=participantListWithUpdate(nextState,live.id,updated);
  }
  for(const effect of preview.combatFailure?.effects||[]){
    const live=participantById(nextState,effect.targetId);if(!live)return{status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
    let updated=clone(live);updated.extensions??={};updated.extensions.v5={...(updated.extensions.v5||{})};
    const addPending=entry=>{const rows=updated.extensions.v5.combatEffects||[];updated.extensions.v5.combatEffects=[...rows,{...entry,id:`${preview.resolutionId}:fumble:${rows.length}`}];};
    if(effect.type==='bomb-explosion-target'){
      if(JSON.stringify(live)!==JSON.stringify(effect.targetSnapshot))return {status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
      const damage=Math.max(0,Number(effect.damage)||0),toughness=Math.floor((Number(updated.caracs?.E)||0)/10),armour=incidentalArmour(updated,{key:'BODY'});
      updated.hp=Math.max(0,(Number(updated.hp)||0)-Math.max(0,damage-toughness-armour));
      const historyEntry={resolutionId:preview.resolutionId,equipmentId:preview.input.v5?.context?.bombEquipmentId||null,targetId:effect.targetId,damage,appliedDamage:Math.max(0,damage-toughness-armour),round:preview.input.round||null,source:'L13-0117'};
      if(effect.sourceActorId===updated.id){updated.extensions.v5.combatEffects=(updated.extensions.v5.combatEffects||[]).filter(row=>row.id!==effect.bombEffectId);updated.extensions.v5.bombDetonationHistory=[...(updated.extensions.v5.bombDetonationHistory||[]),historyEntry].slice(-100);}
      else {const source=participantById(nextState,effect.sourceActorId);if(source){const bombActor=clone(source);bombActor.extensions??={};bombActor.extensions.v5={...(bombActor.extensions.v5||{}),combatEffects:(bombActor.extensions.v5.combatEffects||[]).filter(row=>row.id!==effect.bombEffectId),bombDetonationHistory:[...(bombActor.extensions.v5.bombDetonationHistory||[]),historyEntry].slice(-100)};nextState.participants=participantListWithUpdate(nextState,bombActor.id,bombActor);}}
    }
    else if(effect.type==='blackpowder-stock-change'){
      const before=updated.extensions.v5.blackpowderStock;
      if(effect.initialized?Boolean(before):!before||before.projectiles!==effect.before.projectiles||before.powderCharges!==effect.before.powderCharges)return {status:'stale',requiresPreview:true,state:clone(currentState),resolution:clone(preview)};
      const history=before?.history||[];updated.extensions.v5.blackpowderStock={version:1,...effect.after,history:[...history,{resolutionId:preview.resolutionId,source:effect.source,before:effect.before,after:effect.after,debits:effect.debits,round:preview.input.round||null}].slice(-200)};
    }
    else if(effect.type==='wound-loss')updated.hp=Math.max(0,(Number(updated.hp)||0)-effect.amount);
    else if(effect.type==='condition')updated.states=[...(updated.states||[]),{...effect.condition,source:{kind:'fumble',resolutionId:preview.resolutionId,authorId:preview.input.actor?.id}}];
    else if(effect.type==='weapon-damage'||effect.type==='weapon-misfire'){
      const equipmentId=effect.equipmentId||preview.input.action?.extensions?.fiche?.equipmentId;
      const item=updated.equipment?.find(row=>row.id===equipmentId);
      if(item){updated.equipment=updated.equipment.map(row=>row.id===equipmentId?{...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),damage:(Number(row.extensions?.v5?.damage)||0)+(effect.amount||0),misfire:effect.type==='weapon-misfire'?{resolutionId:preview.resolutionId,reloadRequired:effect.reloadRequired===true,dud:effect.explosiveDud===true}:row.extensions?.v5?.misfire}}}:row);}
      if(effect.actsLastNextRound)addPending({kind:'acts-last-next-round',round:(preview.input.round||0)+1});
    } else if(['next-action-sl','lose-next-move','lose-next-action','twisted-ankle'].includes(effect.type))addPending({kind:effect.type,...effect,createdRound:preview.input.round||null,...(Number.isSafeInteger(preview.input.v5Clock?.turnIndex)?{createdTurnIndex:preview.input.v5Clock.turnIndex}:{}),...(preview.input.actor?.id?{createdByActorId:preview.input.actor.id}:{})});
    else if(effect.type==='weapon-explosion'||effect.type==='weapon-discharge'){
      const equipmentId=effect.equipmentId||preview.input.action?.extensions?.fiche?.equipmentId;
      if(effect.type==='weapon-explosion'&&equipmentId&&updated.equipment?.some(row=>row.id===equipmentId))
        updated.equipment=updated.equipment.map(row=>row.id===equipmentId?{...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),destroyed:true,misfire:{resolutionId:preview.resolutionId,table:'blackpowder-catastrophe'}}}}:row);
      const location=effect.location==='torse'?{key:'BODY'}:effect.location==='bras-principal'&&['left','right'].includes(effect.armSide)?{key:'ARM',side:effect.armSide}:null;
      const damage=Math.max(0,Number(effect.damage??preview.input.action?.damage)||0);
      if(!location)return {status:'manual',reason:'bras-directeur-inconnu',state:clone(currentState),resolution:clone(preview)};
      const toughness=Math.floor((Number(updated.caracs?.E)||0)/10), armour=incidentalArmour(updated,location);
      updated.hp=Math.max(0,(Number(updated.hp)||0)-Math.max(0,damage-toughness-armour));
    } else if(effect.type==='salvo-hit'){
      const locationMap={head:{key:'HEAD'},body:{key:'BODY'},left:{key:'ARM',side:'left'},right:{key:'ARM',side:'right'},'left-arm':{key:'ARM',side:'left'},'right-arm':{key:'ARM',side:'right'},'left-leg':{key:'LEG',side:'left'},'right-leg':{key:'LEG',side:'right'}};
      const location=locationMap[effect.location];if(!location)return{status:'manual',reason:'salvo-hit-location-required',state:clone(currentState),resolution:clone(preview)};
      const damage=Math.max(0,Number(effect.damage)||0)+Math.max(0,Number(effect.effectiveSL)||0),toughness=Math.floor((Number(updated.caracs?.E)||0)/10),armour=incidentalArmour(updated,location),appliedDamage=Math.max(0,damage-toughness-armour);
      updated.hp=Math.max(0,(Number(updated.hp)||0)-appliedDamage);
    } else if(effect.type==='salvo-artillery-destroyed'){
      const equipmentId=effect.equipmentId||preview.input.action?.extensions?.fiche?.equipmentId,item=updated.equipment?.find(row=>row.id===equipmentId);
      if(item)updated.equipment=updated.equipment.map(row=>row.id===equipmentId?{...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),destroyed:true,misfire:{resolutionId:preview.resolutionId,table:'salvo-artillery'}}}}:row);
    } else if(effect.type==='griffonsfoot-discharge'){
      const equipmentId=effect.equipmentId;const item=updated.equipment?.find(row=>row.id===equipmentId);
      if(item)updated.equipment=updated.equipment.map(row=>row.id===equipmentId?{...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),loadedCharges:0,griffonsfootReloadProgress:0,griffonsfootReloadRequiredSuccesses:Number(row.keywords?.find(quality=>(typeof quality==='string'?quality:quality?.id)==='recharge')?.parameter)||6,griffonsfootReloading:true,lastDischargeResolutionId:preview.resolutionId}}}:row);
      addPending({kind:'griffonsfoot-reload',projectiles:effect.ammoRequired,powderRequired:true});
    } else if(effect.type==='griffonsfoot-reload-progress'){
      const item=updated.equipment?.find(row=>row.id===effect.equipmentId),v5=item?.extensions?.v5||{};
      const progress=Math.min(effect.requiredSuccesses,(Number(v5.griffonsfootReloadProgress)||0)+effect.successes),done=progress>=effect.requiredSuccesses;
      updated.equipment=(updated.equipment||[]).map(row=>row.id===effect.equipmentId?{...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),griffonsfootReloadProgress:progress,griffonsfootReloadRequiredSuccesses:effect.requiredSuccesses,griffonsfootReloading:!done}}}:row);
    } else if(effect.type==='griffonsfoot-reload'){
      const equipmentId=effect.equipmentId;updated.equipment=(updated.equipment||[]).map(row=>row.id===equipmentId?{...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),loadedCharges:6,lastReloadResolutionId:preview.resolutionId}}}:row);
      updated.extensions.v5.combatEffects=(updated.extensions.v5.combatEffects||[]).filter(row=>row.kind!=='griffonsfoot-reload');
    } else if(effect.type==='reload-progress'){
      const equipmentId=effect.equipmentId;updated.equipment=(updated.equipment||[]).map(row=>{
        if(row.id!==equipmentId)return row;
        const before=Number(row.extensions?.v5?.reloadProgress)||0,progress=Math.min(effect.requiredSuccesses,before+effect.successes);
        const done=progress>=effect.requiredSuccesses;
        const reloadState=row.extensions?.v5?.reloadState||initialV5ReloadState(row).state;
        const synchronizedReloadState=reloadState?{...reloadState,revision:(reloadState.revision||0)+1,
          reloadSuccesses:effect.requiredSuccesses,requiredSuccesses:effect.requiredSuccesses,accumulatedSuccesses:progress,
          reloading:!done,requiresReload:!done,...(done?{shotsRemaining:reloadState.salvoRating>0?(reloadState.salvoReloadMode==='incremental'?Math.min(reloadState.salvoRating,(reloadState.shotsRemaining||0)+1):reloadState.salvoRating):reloadState.repeaterRating}:{} )}:undefined;
        return {...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),reloadProgress:progress,reloadRequiredSuccesses:effect.requiredSuccesses,reloaded:done,
          ...(synchronizedReloadState?{reloadState:synchronizedReloadState}:{})}}};
      });
    } else if(effect.type==='condition'){
      if(!updated.states?.some(row=>row.id===effect.condition.id))updated.states=[...(updated.states||[]),{...effect.condition,source:{kind:'fumble',resolutionId:preview.resolutionId,authorId:preview.input.actor?.id,...(effect.convertedFrom?{ruleId:effect.convertedFrom}:{})}}];
    } else if(effect.type==='light-fuse'||effect.type==='extinguish-fuse'||effect.type==='bomb-fuse'){
      const equipmentId=effect.equipmentId,item=updated.equipment?.find(row=>row.id===equipmentId);
      if(item){updated.equipment=updated.equipment.map(row=>row.id===equipmentId?{...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),fuseLit:effect.type!=='extinguish-fuse',...(effect.type==='bomb-fuse'?{fuseLit:true,bombFuse:true,fuseDueRound:effect.dueRound??((preview.input.round||1)+effect.dueInRounds-1),fuseDueTurnIndex:effect.dueTurnIndex,bombFuseOwnerId:effect.dueActorId||preview.input.actor?.id||null,fuseTurnsRemaining:effect.fuseTurnsRemaining??effect.dueInRounds}:{}),...(effect.type==='light-fuse'?{fuseLit:true}:{}),...(effect.type==='extinguish-fuse'?{fuseDueRound:null,fuseDueTurnIndex:null,bombFuse:false,bombFuseOwnerId:null,fuseTurnsRemaining:null}:{})}}}:row);}
    } else if(effect.type==='volley-recoil'){
      if(!effect.success)updated.hp=Math.max(0,(Number(updated.hp)||0)-Math.abs(Math.min(0,effect.sl)));
      if(effect.astoundingFailure&&effect.armCritical?.effect&&!effect.armCritical.parsed?.death){
        const critical=effect.armCritical,states=critical.parsed?.states||[];
        if(critical.parsed?.extraWounds)updated.hp=Math.max(0,(Number(updated.hp)||0)-critical.parsed.extraWounds);
        const receipt=acquireV5Conditions(updated,states.map(state=>({...state,source:{kind:'critical',resolutionId:preview.resolutionId,authorId:preview.input.actor?.id,ruleId:'L13-0179'}})),{resolutionId:preview.resolutionId,authorId:preview.input.actor?.id,targetId:updated.id,round:preview.input.round,source:{kind:'critical',ruleId:'L13-0179'}});
        updated=receipt.participant;
        appendCriticalWoundRecords(updated,[critical],{resolutionId:preview.resolutionId,authorId:preview.input.actor?.id,round:preview.input.round,beforeStates:live.states||[],source:'volley-recoil'});
        if(critical.parsed?.reminders?.length)addPending({kind:'critical-follow-up',location:'ARM',reminders:critical.parsed.reminders,source:'L13-0179'});
      }
    } else if(effect.type==='hit-ally'){
      const damage=Math.max(0,Number(effect.damage)||0), toughness=Math.floor((Number(updated.caracs?.E)||0)/10), armour=incidentalArmour(updated,{key:'BODY'});
      updated.hp=Math.max(0,(Number(updated.hp)||0)-Math.max(0,damage+effect.unitsRoll-toughness-armour));
    } else addPending({kind:effect.type,...effect,createdRound:preview.input.round||null});
    nextState.participants=participantListWithUpdate(nextState,updated.id,updated);
  }
  if (preview.weaponReload && preview.input.actor?.id) {
    const actor = participantById(nextState, preview.input.actor.id);
    const equipmentId = preview.weaponReload.equipmentId;
    if (!actor?.equipment?.some(item => item.id === equipmentId))
      return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    const updated = clone(actor);
    updated.equipment = updated.equipment.map(item => item.id === equipmentId ? { ...item,
      extensions: { ...(item.extensions || {}), v5: { ...(item.extensions?.v5 || {}), reloadState: clone(preview.weaponReload.after),
        reloadProgress: preview.weaponReload.after.accumulatedSuccesses, reloadRequiredSuccesses: preview.weaponReload.after.requiredSuccesses??preview.weaponReload.after.reloadSuccesses,
        reloaded: preview.weaponReload.after.requiresReload!==true&&!preview.weaponReload.after.reloading } } } : item);
    nextState.participants = participantListWithUpdate(nextState, updated.id, updated);
  }
  if(preview.consumedCombatEffects?.length&&preview.input.actor?.id){const live=participantById(nextState,preview.input.actor.id);if(live){const updated=clone(live);updated.extensions??={};updated.extensions.v5={...(updated.extensions.v5||{}),combatEffects:(updated.extensions.v5?.combatEffects||[]).filter(row=>!preview.consumedCombatEffects.includes(row.id))};nextState.participants=participantListWithUpdate(nextState,updated.id,updated);}}
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
  const mountedDismountIds = new Set((preview.mountedFall || []).filter(row => row.dismount === true).map(row => row.participantId).filter(Boolean));
  if (preview.tripFall && preview.input.target?.extensions?.v5?.mounted === true) mountedDismountIds.add(preview.input.target.id);
  for (const id of mountedDismountIds) {
    const rider = participantById(nextState, id);
    if (!rider) return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    const updated = clone(rider), extensions = { ...(updated.extensions || {}) }, v5 = { ...(extensions.v5 || {}) };
    delete v5.mountId; v5.mounted = false; extensions.v5 = v5; updated.extensions = extensions;
    nextState.participants = participantListWithUpdate(nextState, id, updated);
  }
  nextState.revision = currentState.revision + 1;
  nextState.appliedResolutionIds = [...appliedIds, preview.resolutionId].slice(-MAX_APPLIED_RESOLUTION_IDS);
  const resolution = clone(preview);
  if(preview.lethalDeath)resolution.lethalDeath={...clone(preview.lethalDeath),application:{hp:0,dead:true}};
  if(preview.tripFall)resolution.tripFall={...clone(preview.tripFall),application:{hpLoss:preview.tripFall.damageLoss+(preview.tripFall.extraCriticalWounds||0),mounted:false,prone:preview.trip?.conditionApplied===true}};
  resolution.application = { status: 'applied', applied: true, revision: nextState.revision };
  return { status: 'applied', state: nextState, resolution };
}
