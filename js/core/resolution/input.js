import { hasOwn, isRecord } from './describe.js';
import {
  ATTACK_TYPES,
  OPPOSITION_TYPES,
  SKILL_TYPES,
  DEFENSE_TYPES,
  clone,
  ResolutionError,
  attackType,
  foldKey
} from './common.js';
import { actionHasDamage } from '../damage.js';
import { normalizeQualities } from '../quality-normalization.js';
import { planNaturalAttack, inferNaturalAttackKey } from '../creature-combat.js';
import { decorateBestiaryProfileAction, planBestiaryProfileAbility } from '../creature-abilities.js';
import {
  weaponSkillGroupInfo,
  mergeEquipmentQualities,
  ammunitionCompatibility,
  equipmentAttackContext,
  equipmentQualities
} from '../equipment.js';
import { getReferenceCatalogue } from '../reference-catalog.js';
import { noTestV5TalentAction } from '../v5-talent-actions.js';
import { previewV5TalentTestModifiers } from '../v5-talent-tests.js';
import { inferV5Kind } from '../v5-combat-rules.js';
import { previewSupplementalEquipment } from '../v5-supplemental-equipment.js';

export function parseRoll(value) {
  if (typeof value === 'string' && value.trim() === '00') return 100;
  const roll = Number(value);
  if (!Number.isInteger(roll) || roll < 1 || roll > 100) {
    throw new ResolutionError('Le résultat d100 doit être compris entre 1 et 100', 'INVALID_ROLL', { value });
  }
  return roll;
}

export function parseInteger(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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
export const naturalSizes = v5 => ({ actorSize: v5?.context?.actorSize ?? v5?.actorSize, targetSize: v5?.context?.targetSize ?? v5?.targetSize });
/**
 * Décisions du MJ des 23 et 24/10 : l'attaque ordinaire de mêlée d'un profil qui porte le nom d'un Trait d'attaque naturelle (Bite, Tail,
 * Horns, Tentacles…) suit la formule V5 du Trait, avec le bonus de Taille (livres V4). Rien ne s'ajoute à un tir, une attaque gratuite ou
 * une attaque bonus ; les coûts et quotas ne sont pas posés ici. `null` hors de ces cas.
 */
export function inferredNaturalPlan(actor, action, v5) {
  if (!actor || !attackType(action.type)) return null;
  const key = inferNaturalAttackKey(actor, action);
  if (!key) return null;
  const context = v5?.context || {};
  const ordinary = v5?.kind !== 'ranged' && v5?.extraAttack !== true && !context.freeAttackTalent && !action.extensions?.v5?.freeAttack;
  return planNaturalAttack(actor, key, { ordinary, printedValue: /\d+\s*$/.test(String(action?.name ?? '')) || (hasOwn(action, 'damage') && action.damage !== '' && action.damage !== null && Number.isFinite(Number(action.damage))), charged: context.charged ?? v5?.charging, actorSize: naturalSizes(v5).actorSize, targetSize: naturalSizes(v5).targetSize });
}
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
    riposteSpent: input.riposteSpent === true,
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
export function normalizeCriticalRolls(raw) {
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
