import {enforceMagicTestRestrictions,activeMagicTalent} from './v5-magic-talents.js';
import {applyScytheOfShyishRules} from './v5-magic-arbitrations.js';
import {transformationRestrictions} from './v5-magic-combat.js';
import {getReferenceCatalogue} from './reference-catalog.js';
import {familiarSupport,withCompanionTalents} from './familiars.js';
import {magicSkillModifiers,magicAdverseModifiers,effectiveSkillScore,magicSkillReplacement,familiarSkillSupport,magicTalentRank} from './v5-magic-talents.js';
/** Common V5 combat context; session resources live in extensions.v5. */
import {situationPlan} from './v5-talent-situations.js';
import {contactWeapon} from './v5-talent-contact.js';
import {psychologyTestRules} from './v5-talent-psychology.js';
import {senseTestRules} from './creature-senses.js';
import {movementTestRules} from './creature-movement.js';
import {outnumberTestRules} from './outnumbering.js';
import {unavailableDisarmedWeapon} from './v5-talent-replacements.js';
import {warLeaderSubstitution} from './v5-talent-situations.js';
import {calculateV5ArmorPenalty,previewV5Parry} from './v5-weapon-qualities.js';
import { pendingCrewSkill,sourceActive } from './v5-talent-actions.js';
import { previewV5Test,reverseV5Roll,refreshV5ResultTier }  from './v5-roll.js';
import { previewV5PistolContact } from './v5-weapon-qualities.js';
import { activeEngines } from './roll-qualities.js';
import { keywordMechanicalStatus } from './keywords.js';
import { activeV5TalentEffects } from './v5-talents.js';
import { applyV5TalentPenaltyRules, applyV5AttackSituationModifiers } from './v5-talent-combat.js';
import { normalizeState } from './effects.js';
import { previewV5TalentTestModifiers, previewV5TalentSLChoices } from './v5-talent-tests.js';
export const V5_COMBAT_RULE_VERSION = 'v5-combat-2026-10-09.24.6';
export const hasMomentum = actor => actor?.extensions?.v5?.hasMomentum === true;
export const withMomentum = (actor, value) => {
  const frenzy=(actor.states||[]).some(s=>s.key==='frenzy'&&sourceActive(s));
  const restricted=(actor.states||[]).some(s=>sourceActive(s)&&(s.restriction==='noMomentumOrAdvantage'||s.restriction==='cannotGainMomentum'&&!frenzy&&actor.extensions?.v5?.hasMomentum!==true));
  if(value&&restricted)return withMomentum(actor,false);
  return !value&&actor.extensions?.v5?.hasMomentum===undefined?actor:({...actor,extensions:{...(actor.extensions||{}),v5:{...(actor.extensions?.v5||{}),hasMomentum:Boolean(value)}}});
};
export const conditionLevels = actor => {
  const levels = new Map();
  for (const [index, raw] of (actor?.states || []).entries()) {
    if (Number(raw?.level) === 0 || (raw?.source?.source?.effectHash && !sourceActive(raw))) continue;
    const state = normalizeState(raw, index);if(['talent-active','talent-pending'].includes(state.kind))continue;
    const key = state.key.replace(/[- ]/g, '');
    levels.set(key, (levels.get(key) || 0) + state.level);
  }
  return levels;
};
/** Only a new instance counts: Prone, Surprised and Unconscious do not stack. */
export function acquiredConditionInstances(actor, proposed = []) {
  const existing = conditionLevels(actor);
  const unique = new Set(['aterre', 'souille', 'surpris', 'inconscient']);
  let count = 0;
  for (const state of proposed) {
    const key = (state.key || normalizeState(state).key).replace(/[- ]/g, '');
    const level = Math.max(1, Number(state.level) || 1);
    if (unique.has(key)) { if (!existing.has(key)) { count++; existing.set(key, 1); } }
    else count += level;
  }
  return count;
}
export function momentumAfterChange(before, after) {
  const previous = conditionLevels(before), current = conditionLevels(after);
  const acquired = [...current].some(([key, level]) => key !== 'blesse' && level > (previous.get(key) || 0));
  return Number(after.hp) < Number(before.hp) || acquired ? withMomentum(after, false) : after;
}
export function inferV5Kind(action = {}, attackContext = {}) {
  return action.extensions?.v5?.kind || (['attack', 'attaque'].includes(action.type)
    ? (typeof attackContext?.ranged === 'boolean' ? attackContext.ranged ? 'ranged' : 'melee' : action.attr === 'CT' ? 'ranged' : 'melee') : 'test');
}
/** A held, available shield explicitly chosen to oppose this attack. `confirmed` is legacy Protectrice; `v5Bonus` is V5 Bouclier. */
export function v5ShieldDefense(normalized, catalogue = getReferenceCatalogue()) {
  const context = normalized.protectionContext || {};
  const shield = normalized.target?.equipment?.find(item => item.kind === 'shield' && item.id === context.shieldId);
  const bouclier = shield?.keywords?.some(item => item.id === 'bouclier') === true;
  const word = shield?.keywords?.find(item => item.id === 'protectrice');
  const rating = bouclier ? Number(shield?.ap) : word?.parameter?.trim() === '' ? null : Number(word?.parameter);
  const source = catalogue.keywords.find(item => item.id === 'bouclier');
  const bouclierSourceCovered = source?.edition === 'V5' && source?.source === 'Livre de base V5 EN p.306'
    && source?.effect === "En s'opposant à une attaque avec Esquive ou Corps à corps, confère +1 DR (sans cumul avec Défensive) et applique ses PA si le coup touche. Avec 2 PA ou plus, permet d'opposer les tirs avec Esquive à toute portée. Un seul bouclier compte. Porté attaché au bras ou en bandoulière, ses PA ne s'appliquent qu'à la Tête, au Corps et au Bras non directeur. En attaque, compte comme Arme improvisée (allonge Personnelle) et perd sa protection jusqu'au début du prochain Tour.";
  const validRating = Number.isSafeInteger(rating) && (bouclier ? rating >= 0 : rating > 0);
  const contextConfirmed = Boolean(normalized.defense && shield && context.shieldAvailable === true && context.opposedWithShield === true
    && !normalized.target?.extensions?.shieldUnavailable?.includes(shield.id) && validRating);
  const sourceCovered = !contextConfirmed || (bouclier
    ? bouclierSourceCovered
    : keywordMechanicalStatus('protectrice').status === 'covered');
  const confirmed = contextConfirmed && sourceCovered;
  const label = normalized.defense?.label || normalized.defense?.note || '';
  const skillId = normalized.defense?.extensions?.fiche?.skillId || normalized.defense?.v5?.context?.skillId;
  const skillName = skillId ? catalogue.skills.find(row => row.id === skillId)?.nom || '' : '';
  const defenseName = `${label} ${skillName}`.normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLowerCase();
  const dodgeDefense = /esquive|dodge/u.test(defenseName);
  const meleeDefense = /corps\s*a\s*corps|melee|^\s*cc\b/u.test(defenseName);
  const rangedAttack = typeof normalized.attackContext?.ranged === 'boolean' ? normalized.attackContext.ranged
    : normalized.v5?.kind === 'ranged' || normalized.action?.attr === 'CT';
  const canUseV5Bonus = (dodgeDefense || meleeDefense) && (!rangedAttack || dodgeDefense && rating >= 2);
  const unresolved = contextConfirmed && !sourceCovered
    ? bouclier ? 'Bouclier V5 : source ou effet modifié ; recalcul et arbitrage MJ requis.'
      : 'Bouclier : source de Protectrice non couverte ; arbitrage MJ requis.'
    : contextConfirmed && bouclier && !canUseV5Bonus
      ? rangedAttack ? 'Bouclier V5 contre un tir : Esquive et 2 PA au moins requis.'
        : 'Bouclier V5 : opposition par Esquive ou Corps à corps requise.' : null;
  const v5Confirmed = confirmed && bouclier && canUseV5Bonus;
  const legacyRanged = !bouclier && rating >= 2;
  return { confirmed: !bouclier && confirmed,
    ...(bouclier ? { v5Bonus: v5Confirmed } : {}),
    rangedDodgeAllowed: bouclier ? v5Confirmed && rangedAttack && rating >= 2 && dodgeDefense
      : confirmed && legacyRanged,
    rating: (bouclier ? v5Confirmed : confirmed) ? rating : null,
    unresolved };
}
// Malice de Ranald : pendant la durée, dans tout Test opposé contre l’adversaire désigné, deux Caractéristiques du prêtre prennent
// la valeur de l’adversaire ; la fiche ne change pas, le score du Test est décalé de l’écart lu au moment du Test.
export function characteristicMatchShift(tester, opponent, action) {
  const carac = action?.attr;
  if (!carac) return 0;
  const matched = (tester?.extensions?.v5?.divineEffects || [])
    .some(layer => layer?.characteristicMatch?.opponentId === opponent?.id && layer.characteristicMatch.characteristics?.includes(carac));
  if (!matched) return 0;
  const delta = Number(opponent?.caracs?.[carac]) - Number(tester?.caracs?.[carac]);
  return Number.isFinite(delta) ? delta : 0;
}
export function buildCombatTest(normalized, role = 'actor') {
  const defending = role === 'defender';
  const actor = defending ? normalized.target : normalized.actor;
  const target = defending ? normalized.actor : normalized.target;
  let action = defending ? normalized.defense : normalized.action;
  const crewSkill=!defending?pendingCrewSkill(actor,action,normalized.v5.context):null;if(crewSkill)action={...action,base:crewSkill.base};
  const settings = defending ? normalized.defense.v5 || {} : normalized.v5 || {};
  const warLeader=warLeaderSubstitution(normalized,actor,action,settings);if(warLeader)action={...action,base:warLeader.commandBase};
  // Test opposé uniquement : la Malice de Ranald décale le score du prêtre contre l’adversaire désigné, la fiche reste intacte.
  if (defending || normalized.defense) {
    const mischief = characteristicMatchShift(actor, target, action);
    if (mischief) action = { ...action, base: action.base + mischief };
  }
  if(!defending&&normalized.noTestAction){
    const test=structuredClone(previewV5Test({score:0,roll:1,kind:'test'})),first=test.options[0];first.result={...first.result,success:true,sl:0,critical:false,fumble:false,automatic:true,noTest:true,details:{...first.result.details,doubled:false}};test.options=[{...first,id:'keep'}];test.choiceRequired=false;test.forcedInversion=false;
    return{test,talentPlans:[],talentSLChoices:[],kind:'test',penalty:0,penaltyStates:[],unresolved:[],restrictions:(actor.states||[]).some(s=>['inconscient','surpris'].includes(s.key))?['Inconscient ou Surpris : ce choix de talent est indisponible.']:[],charging:false,qualityBonus:0};
  }
  const kind = settings.kind || (defending ? (/^(?:Ag|Esquive|Dodge)$/i.test(action.label) ? 'test' : 'melee') : inferV5Kind(action, normalized.attackContext));
  const levels = conditionLevels(actor), targetLevels = conditionLevels(target);
  // Endurance de l'anachorète (p. 226) : malus et Désavantages d'États ignorés ; Inconscient, Surpris et la vue exigée restent des restrictions.
  const ignoreConditions = actor.extensions?.v5?.specialStates?.ignoreConditionPenalties === true;
  const talentRole=defending?'defender':['attack','attaque'].includes(action.type)?'attacker':'actor';
  const contact=contactWeapon(normalized,actor,action,settings);action=contact.action;
  // Talents donnés par les Traits de compagnon d'un familier animal à portée : comptés comme ceux du maître pour ce Test.
  const talentModifiers=previewV5TalentTestModifiers(withCompanionTalents(actor,normalized.v5State?.participants||[]),{action,settings,kind,role:talentRole,opponent:target});
  const unresolved = [...(normalized.weaponSkillUnresolved||[]),...contact.unresolved], restrictions = [];if(unavailableDisarmedWeapon(actor,action))restrictions.push('Cette arme a été désarmée : la récupérer avant de l’employer.');
  if(!defending && target?.extensions?.v5?.specialStates?.tinySwarmCannotAttack && /nu[eé]e|swarm/i.test((actor.traits || []).join(' '))){
    const size=Number(settings.actorSize ?? normalized.attackContext?.actorSize);
    if(!Number.isInteger(size)||size<1||size>7)unresolved.push('Zone de Confort : Taille de la Nuée requise.');
    else if(size<=2)restrictions.push('Zone de Confort (HEPG p. 82) : une Nuée Minuscule/Petite ne peut attaquer cette cible.');
  }
  restrictions.push(...transformationRestrictions(actor,action,{defending,charging:settings.charging===true,momentum:hasMomentum(actor)}));
  const skill=getReferenceCatalogue().skills.find(s=>s.id===(action.extensions?.fiche?.skillId || settings.context?.skillId));
  const selectedSkillId=action.extensions?.fiche?.skillId||settings.context?.skillId;
  const fichaSkills=actor?.skills?.length?actor.skills:actor?.ficheSnapshot?.skills||[];
  const fichaSkill=fichaSkills.find(row=>row.id===selectedSkillId);
  const referenceSkill=skill||fichaSkill;
  const advancedAdvances=settings.context?.advancedSkillAdvances??fichaSkill?.advances;
  const importedSkillAction=action.extensions?.fiche?.bindingVersion===1&&Boolean(actor?.ficheSnapshot);
  const hasSkillProgressContract=Boolean(fichaSkill||importedSkillAction||Object.hasOwn(settings.context||{},'advancedSkillAdvances'));
  if(!['attack','attaque'].includes(String(action.type||'').toLowerCase())&&referenceSkill?.basic===false&&hasSkillProgressContract&&(advancedAdvances===undefined||advancedAdvances===null||advancedAdvances===''||!Number.isFinite(Number(advancedAdvances))||Number(advancedAdvances)<1))
    unresolved.push(advancedAdvances===0||Number(advancedAdvances)===0?'Cette compétence avancée ne peut pas être testée sans au moins une augmentation.':'Les augmentations de cette compétence avancée ne sont pas renseignées : le MJ doit les confirmer avant le Test.');
  const familiar=(normalized.v5State?.participants || []).find(p=>p.id===settings.context?.magicAssistantId);
  const manualSupport=familiarSkillSupport(actor,familiar,skill?.nom || action.label || action.note || '',settings.context);
  const support=manualSupport.modifiers.length||manualSupport.advantages.length?manualSupport:familiarSupport(actor,normalized.v5State?.participants || [],skill?.nom || action.label || action.note || '',settings.context);
  const skillLabel=skill?.nom || action.label || action.note || '';
  const modifiers = [...support.modifiers,...magicSkillModifiers(actor,skillLabel,{...settings.context,carac:settings.context?.carac||skill?.carac||action.attr}),
    // Clés « … adverse » du porteur opposé, et « Défense contre Tir » du défenseur visé par un tir.
    ...(target&&!defending?magicAdverseModifiers(target,skillLabel):[]),...(defending&&kind==='ranged'?magicSkillModifiers(actor,'Défense contre Tir'):[]),...(settings.slModifiers || [])];
  if(defending&&settings.context?.offHandWeapon===true)modifiers.push({id:'quality:offhand-defense',label:'Défense avec la main non directrice',amount:-2});
  const parryDefense=previewV5Parry({qualities:action.qualities||[],defending,offHand:settings.context?.offHandWeapon===true});
  if(parryDefense.defensePenalty===0){const index=modifiers.findIndex(row=>row.id==='quality:offhand-defense');if(index>=0)modifiers.splice(index,1);}
  if(!defending&&['test','skill'].includes(kind)){
    const wornIds=Array.isArray(settings.context?.wornArmorItemIds)?settings.context.wornArmorItemIds:[];
    const worn=actor?.equipment?.filter(item=>wornIds.includes(item.id)&&item.kind==='armour')||[];
    if(worn.length!==new Set(wornIds).size)unresolved.push('Armure portée : sélectionner uniquement des pièces d’armure de l’inventaire actif.');
    const armor=calculateV5ArmorPenalty({worn});
    const foldedLabel=String(skillLabel||'').normalize('NFD').replace(/[\u0300-\u036f]/gu,'').toLowerCase();
    if(armor.stealthDr&&/(?:discretion|furtivite)/u.test(foldedLabel))modifiers.push({id:'armor:stealth',label:'Armure portée (mailles/plates)',amount:armor.stealthDr});
    if(armor.perceptionDr&&/perception/u.test(foldedLabel))modifiers.push({id:'armor:perception',label:'Heaume fermé porté',amount:armor.perceptionDr});
  }
  if(defending&&kind==='melee'&&normalized.action?.qualities?.some(row=>(typeof row==='string'?row:row?.id)==='a-enroulement'))
    modifiers.push({id:'quality:a-enroulement',label:'Arme à enroulement adverse',amount:-1});
  if(!defending){
    const queued=actor?.extensions?.v5?.combatEffects||[],penalty=queued.find(row=>row.kind==='next-action-sl');
    const declaredAction=['attack','attaque'].includes(String(action.type||'').toLowerCase())||settings.context?.isAction===true;
    if(penalty&&declaredAction)modifiers.push({id:'fumble:next-action-sl',label:'Maladresse précédente : pénalité à la prochaine Action',amount:Number(penalty.amount)||-1});
    const ankle=queued.find(row=>row.kind==='twisted-ankle'&&row.location===settings.context?.legUsed
      &&Number.isSafeInteger(Number(settings.round??normalized.round))&&Number(settings.round??normalized.round)<Number(row.createdRound||0)+Number(row.rounds||0));
    if(ankle)modifiers.push({id:`fumble:twisted-ankle:${ankle.id||ankle.location}`,label:'Cheville tordue : Test utilisant la jambe affectée',amount:-1});
    if(!defending&&queued.some(row=>row.kind==='lose-next-action'))restrictions.push('Maladresse précédente : cette Action est perdue ; terminez le Tour sans résoudre d’Action.');
  }
  let extraordinaryShot=null;
  if(!defending&&settings.context?.extraordinaryShot===true){
    const activeSharpshooter=talentModifiers.penaltyRules.some(rule=>rule.origins?.some(origin=>origin.talentId==='talent-sharpshooter'));
    const description=String(settings.context.extraordinaryShotDescription||'').trim(),difficulty=settings.context.extraordinaryShotDifficulty;
    if(kind!=='ranged')unresolved.push('Tir extraordinaire : Test de tir requis.');
    else if(!activeSharpshooter)unresolved.push('Tir extraordinaire : Talent Tireur d’élite acquis et actif requis.');
    if(!description)unresolved.push('Tir extraordinaire : description MJ requise.');
    if(!Number.isSafeInteger(difficulty)||difficulty>0)unresolved.push('Tir extraordinaire : difficulté en DR entière inférieure ou égale à zéro fixée par le MJ requise.');
    if(kind==='ranged'&&activeSharpshooter&&description&&Number.isSafeInteger(difficulty)&&difficulty<=0){
      modifiers.push({id:'talent:sharpshooter-extraordinary',label:'Tir extraordinaire — '+description,amount:difficulty});
      extraordinaryShot={talentId:'talent-sharpshooter',description,difficulty};
    }
  }
  const suffused=magicSkillReplacement(actor,skill?.nom || action.label || action.note || '',settings.context);
  action={...action,base:suffused?.score ?? (action.extensions?.v5?.scoreIsCurrent ? action.base : effectiveSkillScore(actor,action.base,action.attr || skill?.carac))};
  // Traits de sens (Caméléon, Perturbant, Furtif, Pisteur) : appliqués quand le contexte les détermine, sinon rappel de la carte.
  const senses=senseTestRules({actor,opponent:target,participants:normalized.v5State?.participants||[],skillLabel,kind,defending,context:settings.context||{},currentBase:Number(action.base)||0});
  if(senses.base)action={...action,base:senses.base.score};
  modifiers.push(...senses.modifiers);
  modifiers.push(...movementTestRules({actor,skillLabel,kind,defending,context:settings.context||{}}));
  // Surnombre et Encerclement (L06 p. 167, BR-16) : le Test d'attaque de mêlée seulement, sur les engagés cochés par le MJ.
  modifiers.push(...outnumberTestRules({actor,target,participants:normalized.v5State?.participants||[],kind,defending,action,context:settings.context||{}}));
  if(settings.context?.blackpowderBrokenTest===true&&talentModifiers.context.skillId==='skill-43_61_6c_6d_65-base')modifiers.push({id:'quality:blackpowder-calm',label:'Calme Accessible contre À Poudre noire',amount:2});
  // Attraction des flèches : les tireurs adverses gagnent des DR contre la cible.
  if(!defending && kind==='ranged' && Number(target?.extensions?.v5?.specialStates?.incomingRangedBonusSl))modifiers.push({id:'spell-ranged-attraction',label:'Attraction des flèches',amount:Number(target.extensions.v5.specialStates.incomingRangedBonusSl)});
  if(!defending && kind==='ranged' && Number(target?.extensions?.v5?.rangedOpponentPenaltySl))modifiers.push({id:'spell-ranged-protection',label:'Protection magique contre les tirs',amount:Number(target.extensions.v5.rangedOpponentPenaltySl)});
  const rawModifier = settings.slModifier ?? action.extensions?.v5?.slModifier;
  if (rawModifier == null && action.mod) unresolved.push('Ancien modificateur de seuil : saisir explicitement les DR V5.');
  const slModifier = rawModifier ?? 0;
  if (!Number.isInteger(slModifier)) throw new TypeError('Modificateur V5 : nombre entier de DR requis');
  if (!defending && settings.context?.calledShot === true && !settings.calledShotPenaltyIgnored) modifiers.push({ id: 'called-shot', label: 'Coup ciblé V5', amount: -2 });
  if (slModifier) modifiers.push({ id: 'difficulty', label: 'Difficulté V5', amount: slModifier });
  if (defending) {
    const defenseEngines = kind === 'melee' ? activeEngines(action.qualities || []).filter(engine => engine.engine === 'defense-sl-bonus') : [];
    const overriddenDefense = new Set(defenseEngines.flatMap(engine => engine.overrides || []));
    const defensive = defenseEngines.some(engine => engine.id === 'defensive' && !overriddenDefense.has(engine.id));
    const shieldDefense = v5ShieldDefense(normalized);
    if (shieldDefense.unresolved) unresolved.push(shieldDefense.unresolved);
    const shield = shieldDefense.v5Bonus || shieldDefense.confirmed;
    if (defensive || shield) modifiers.push({ id: 'defensive-protection', label: shield ? 'Bouclier V5 (ne cumule pas Défensive)' : 'Défensive', amount: 1 });
    for (const engine of defenseEngines) if (!overriddenDefense.has(engine.id) && engine.params.bonus < 0)
      modifiers.push({ id: `quality-${engine.id}`, label: 'Déséquilibrée', amount: engine.params.bonus });
  }
  if(!defending&&normalized.combatPrelude?.coverPenalty)modifiers.push({id:'talent:entrenchment',label:'Retranchement de la cible',amount:-normalized.combatPrelude.coverPenalty});
  if(!defending&&normalized.combatPrelude?.guardPenalty)modifiers.push({id:'talent:kingsguard',label:'Garde royal proche de la cible',amount:-normalized.combatPrelude.guardPenalty});
  if(defending&&kind==='melee'){const small=normalized.combatPrelude?.small,penalty=small?.active?small.defensePenalty:normalized.combatPrelude?.large?.defensePenalty;if(penalty)modifiers.push({id:small?.active?'talent:small-defense':'talent:large-defense',label:small?.active?'Défense contre créature plus grande (Petit)':'Défense contre Grande taille',amount:-penalty});}
  if(!defending&&normalized.combatPrelude?.small?.scoreBonus)action={...action,base:action.base+normalized.combatPrelude.small.scoreBonus};
  const reachDefense=defending&&kind==='melee'&&settings.context?.longerWeaponDefense===true,contactTalent=reachDefense?situationPlan(normalized.actor,'in-fighter'):null;if(reachDefense&&!contactTalent?.proposals.length)modifiers.push({id:'longer-weapon-defense',label:'Arme plus longue en défense',amount:1});
  const advantages = [...(settings.advantageSources || [])], disadvantages = [...(settings.disadvantageSources || [])];
  if (defending && kind === 'melee' && activeV5TalentEffects(actor).some(effect => effect.restriction === 'cannotOpposeWithMelee'))
    restrictions.push('Battement : la cible ne peut pas opposer Corps à corps ; Esquive reste possible.');
  if (!defending && kind === 'melee' && activeV5TalentEffects(target).some(effect => effect.advantageFilter === 'meleeAttacksAgainstTarget'))
    advantages.push({ id: 'talent-beat-blade', label: 'Battement sur la cible' });
  const charging = !defending && kind === 'melee' && settings.charging === true;
  if (kind === 'melee' && (hasMomentum(actor) || charging || defending&&normalized.combatPrelude?.targetIncomingMomentum)) advantages.push({ id: 'momentum', label: charging ? 'Élan de Charge' : 'Élan' });
  const relevant = new Map(['sonne', 'extenue', 'empoisonne'].map(key => [key, levels.get(key) || 0]));
  // Revigorer et Clarté d'Esprit : les états Exténué restent comptés mais n'infligent plus leur pénalité.
  if(actor.extensions?.v5?.specialStates?.ignoreFatiguePenalties)relevant.set('extenue',0);
  for(const effect of talentModifiers.ignoredPenalties)relevant.set(effect.key,Math.max(0,(relevant.get(effect.key)||0)-effect.amount));
  const context = settings.context || {};
  advantages.push(...support.advantages);
  if(magicTalentRank(actor,'magical-sense') && /perception/i.test(skill?.nom || action.label || action.note || '') && context.magicalNature===true && context.seesWinds===true)advantages.push({id:'magical-sense',label:'Perception de la Magie'});
  const frenzy=(actor.states||[]).some(s=>s.key==='frenzy'&&sourceActive(s));
  if(frenzy&&!defending&&!normalized.noTestAction&&context.mandatoryTest!==true&&!(kind==='melee'&&['attack','attaque'].includes(action.type)))restrictions.push('Frénésie : employer l’Action pour avancer vers l’ennemi le plus proche et l’attaquer.');
  const psychology=psychologyTestRules(normalized,actor,action,settings,{kind,defending});modifiers.push(...psychology.modifiers);advantages.push(...psychology.advantages);restrictions.push(...psychology.restrictions);unresolved.push(...psychology.unresolved);
  const debate=(actor.states||[]).find(s=>s.key==='debate'&&sourceActive(s));
  if(debate&&!['attack','attaque'].includes(normalized.action.type)&&context.importantProblem!==true&&context.talentAction!=='leave-debate'){
    if(typeof context.relatedToDebate!=='boolean')unresolved.push('Ergoteur : préciser si ce Test a un rapport avec la dispute.');
    else if(!context.relatedToDebate)modifiers.push({id:'talent:argumentative',label:'Dispute sans rapport avec le Test',amount:-3,talentOrigins:[debate.source]});
  }
  const movement = kind === 'melee' ? true : context.involvesMovement;
  if (levels.has('enchevetre') && !ignoreConditions) {
    if (movement == null) unresolved.push('Préciser si le Test implique un mouvement.');
    if (movement) relevant.set('enchevetre', levels.get('enchevetre'));
  }
  if (levels.has('brise') && !ignoreConditions) {
    const escape = kind !== 'test' ? false : context.runningOrHiding;
    if (escape == null) unresolved.push('Préciser si le Test sert à fuir ou se cacher.');
    if (escape === false) relevant.set('brise', levels.get('brise'));
  }
  const flags=actor.extensions?.v5?.specialStates, mental=['Int','I','FM','Soc'].includes(action.attr);
  if(kind==='ranged' && flags?.flying && !context.flying)modifiers.push({id:'spell-flight-ranged',label:'Tir en vol',amount:-2});
  if(defending && (normalized.actor?.states || []).some(s=>s.source?.coldBreath && /extenue|fatigued/i.test(s.key || s.name)))modifiers.push({id:'spell-cold-defense',label:'Défense contre le Souffle froid',amount:1});
  if(flags?.clarityOfThought && mental) { relevant.set('sonne',0); for(let i=modifiers.length-1;i>=0;i--) if(modifiers[i].amount<0 && /psychology|mental.?mutation|mutation.?mental/i.test(modifiers[i].id)) modifiers.splice(i,1); }
  if(flags?.blockedSkillFamilies?.includes('language') && /langue|language/i.test(skillLabel) || flags?.blockedSkillFamilies?.includes('lore') && /savoir|lore|connaissance/i.test(skillLabel)) restrictions.push('Forme sauvage : Langues et Savoirs indisponibles.');
  if (ignoreConditions) relevant.clear();
  const penalty = Math.max(0, ...relevant.values());
  const conditionDisadvantages = new Map();
  if (levels.has('aterre') && !ignoreConditions) {
    if (movement == null) unresolved.push('Préciser si le Test implique un mouvement.');
    if (movement) conditionDisadvantages.set('prone', [{ id: 'prone', label: 'À terre' }]);
  }
  if (levels.has('aveugle')) {
    if (kind === 'ranged') restrictions.push('Un combattant Aveuglé ne peut pas effectuer de tir.');
    if (kind === 'melee' && !ignoreConditions) conditionDisadvantages.set('blinded', Array.from({ length: levels.get('aveugle') }, (_, i) => ({ id: `blinded-${i}`, label: 'Aveuglé' })));
    if (kind === 'test' && context.requiresSight === true) restrictions.push('Ce Test exige la vue : un combattant Aveuglé ne peut pas l’effectuer.');
    if (kind === 'test' && context.reliesOnSight == null && context.requiresSight !== true && !ignoreConditions) unresolved.push('Préciser si le Test repose sur la vue.');
    if (kind === 'test' && context.reliesOnSight && context.requiresSight !== true && !ignoreConditions) conditionDisadvantages.set('blinded', Array.from({ length: levels.get('aveugle') }, (_, i) => ({ id: `blinded-${i}`, label: 'Aveuglé' })));
  }
  if (levels.has('souille') && !ignoreConditions) {
    const fellowship = kind !== 'test' ? false : action.attr === 'Soc' ? true : context.usesFellowship;
    if (fellowship == null) unresolved.push('Préciser si le Test utilise la Sociabilité.');
    if (fellowship) conditionDisadvantages.set('besmirched', [{ id: 'besmirched', label: 'Souillé' }]);
  }
  if(!defending&&(actor.states||[]).some(s=>s.key==='glorious-spent'&&sourceActive(s))&&levels.has('sonne')&&context.mandatoryTest!==true&&context.freeAttackTalent!=='glorious-demise')restrictions.push('Fin glorieuse : aucune Action au prochain Tour tant que Sonné.');
  if (levels.has('inconscient')&&!(normalized.combatPrelude?.immediate?.glorious&&!defending)) restrictions.push('Un combattant Inconscient ne peut pas agir ou se défendre.');
  if (levels.has('surpris')) restrictions.push('Un combattant Surpris ne peut pas agir ou se défendre.');
  if (!defending && kind === 'melee') {
    if (targetLevels.has('aterre')&&!normalized.combatPrelude?.suppressProneBonus) advantages.push({ id: 'target-prone', label: 'Cible à terre' });
    if (targetLevels.has('aveugle') && !levels.has('aveugle')) advantages.push({ id: 'target-blinded', label: 'Cible Aveuglée' });
    if (targetLevels.has('surpris')) modifiers.push({ id: 'target-surprised', label: 'Cible Surprise', amount: 2 });
  }
  const pistolContact=previewV5PistolContact({qualities:action.qualities||[],attack:!defending,engaged:settings.context?.targetEngaged===true,ranged:kind==='ranged'});
  if(!defending&&kind==='ranged'&&settings.context?.targetEngaged===true&&!pistolContact.allowed)disadvantages.push({id:'target-engaged',label:'Tir sur une cible engagée'});
  if(!defending&&kind==='test'&&action.attr==='F'&&context.entanglementTest===true){
    const weaponId=context.entanglementWeaponId||action.extensions?.fiche?.equipmentId||action.extensions?.equipment?.id;
    const entanglingWeapon=actor?.equipment?.find(row=>row.id===weaponId);
    const entanglementKind=entanglingWeapon?.extensions?.v5?.entanglementKind
      ||(entanglingWeapon?.baseId==='weapon-armes-corps-a-corps-armes-d-hast-mancatcher-2m'?'mancatcher':null);
    if(!entanglingWeapon||entanglementKind!=='mancatcher')unresolved.push('Entrave : choisir un Mancatcher typé pour ce Test de Force.');
    else if(context.springLoaded===true||entanglingWeapon.extensions?.v5?.springLoaded===true)modifiers.push({id:'quality:mancatcher-spring-loaded',label:'Mancatcher à ressort : +20 au Test de Force pour entraver',amount:2});
  }
  // Different Condition penalties do not add. Like-for-like penalties select
  // the largest; a DR penalty versus inversion requires an explicit MJ ruling.
  const worstDisadvantage = [...conditionDisadvantages.values()].sort((a, b) => b.length - a.length)[0] || [];
  const mixed = !talentModifiers.ignoreNegative && penalty > 0 && worstDisadvantage.length > 0;
  const conditionPenaltyMode = context.conditionPenaltyMode;
  if (mixed && !['sl', 'disadvantage'].includes(conditionPenaltyMode)) unresolved.push('États de pénalités différentes : choisir les DR ou le Désavantage retenu par le MJ.');
  const appliedPenalty = talentModifiers.ignoreNegative || mixed && conditionPenaltyMode === 'disadvantage' ? 0 : penalty;
  if (appliedPenalty) modifiers.push({ id: 'conditions', label: 'Plus forte pénalité d’État', amount: -appliedPenalty });
  if (!mixed || conditionPenaltyMode !== 'sl') disadvantages.push(...worstDisadvantage);
  // V4 descriptions never supply an automatic V5 score conversion.
  const qualityModifiers = (kind === 'test' || defending ? [] : activeEngines(action.qualities || [])).filter(engine => engine.engine === 'attack-sl-bonus');
  const overridden = new Set(qualityModifiers.flatMap(engine => engine.overrides || []));
  for (const engine of qualityModifiers) if (!overridden.has(engine.id) && !engine.params?.onSuccessOnly)
    modifiers.push({ id: `quality-${engine.id}`, label: engine.id, amount: engine.params.bonus });
  modifiers.push(...talentModifiers.slModifiers); advantages.push(...talentModifiers.advantageSources); disadvantages.push(...talentModifiers.disadvantageSources);
  unresolved.push(...talentModifiers.unresolved);
  applyV5TalentPenaltyRules(modifiers,talentModifiers.penaltyRules,{kind,role:talentRole,context:settings.context||{},advantage:advantages.length-disadvantages.length,aimed:settings.aimed});
  if(defending&&settings.context?.combatDefensiveActionBonus===2)modifiers.push({id:'combat:defensive-action',label:'Action Défensive choisie',amount:2});
  unresolved.push(...applyV5AttackSituationModifiers(modifiers,{role:talentRole,kind,actionType:action.type,actor,target,context:settings.context||{},actorSize:settings.actorSize,targetSize:settings.targetSize,talentRules:talentModifiers.penaltyRules,advantage:advantages.length-disadvantages.length,aimed:settings.aimed}));
  if((actor.states||[]).some(s=>s.restriction==='noMomentumOrAdvantage'&&sourceActive(s)))advantages.length=0;
  // Faux de Shyish (V5 p. 247) : un Mort-vivant engagé avec le porteur n'a pas d'Avantage ; son Élan (hasMomentum) n'est pas touché.
  if(kind==='melee'&&target?.extensions?.v5?.specialStates?.scytheOfShyish){const scythe=applyScytheOfShyishRules({target:actor,isEngagedWithWielder:true,advantageSources:advantages,hasMomentum:hasMomentum(actor)});if(scythe.advantageSuppressed)advantages.splice(0,advantages.length,...scythe.allowedAdvantages);}
  if(talentModifiers.ignoreNegative){for(const row of modifiers)if(row.amount<0)row.amount=0;disadvantages.length=0;}
  const ignoreCritical=context.extendedTest===true && activeMagicTalent(actor,'mind-over-body')?.ignoreCriticalPenalties;
  if(Number(context.magicCriticalPenalty)<0 && !ignoreCritical)modifiers.push({id:'critical-wounds',label:'Blessures Critiques précisées par le MJ',amount:Number(context.magicCriticalPenalty)});
  if(ignoreCritical)for(const modifier of modifiers)if(modifier.id==='critical-wounds' || modifier.source?.kind==='critical')modifier.amount=0;
  let test = previewV5Test({ score: Math.max(0, action.base), roll: defending ? action.roll : normalized.roll, kind,
    slModifiers: modifiers, advantageSources: advantages, disadvantageSources: disadvantages });
  const dualWhirlwind=!defending&&context.specialAttack==='whirlwind-of-death'&&context.dualWielding===true?situationPlan(actor,'dual-whirlwind'):null;
  if(dualWhirlwind?.proposals.length){const preview=structuredClone(test),preserved=preview.advantage.slModifier,mods=[...modifiers,...(preserved?[{id:'talent:dual-whirlwind-preserved-advantage',label:'Équilibre Avantage V5',amount:preserved}]:[])];const make=(id,roll)=>({id,reversed:id==='reverse',result:previewV5Test({score:Math.max(0,action.base),roll,kind,slModifiers:mods}).options[0].result});preview.options=[make('keep',normalized.roll),make('reverse',reverseV5Roll(normalized.roll))];preview.choiceRequired=normalized.roll!==reverseV5Roll(normalized.roll);preview.forcedInversion=false;test=preview;}
  // Pointue is conditional on success after all unconditional DR modifiers.
  const conditionalBonus = qualityModifiers.filter(engine => !overridden.has(engine.id) && engine.params?.onSuccessOnly).reduce((sum, engine) => sum + engine.params.bonus, 0);
  if (conditionalBonus) {
    test = structuredClone(test);
    for (const option of test.options) if (option.result.success) {
      option.result.sl += conditionalBonus;
      option.result.details.modifiers.push({ id: 'quality-success', label: 'Pointue', amount: conditionalBonus });
      option.result.details.totalModifier += conditionalBonus;
    }
  }
  if(talentModifiers.forceSuccess||!defending&&normalized.noTestAction){test=structuredClone(test);const first=test.options[0];first.result={...first.result,roll:1,success:true,sl:0,critical:false,fumble:false,zeroOutcome:'marginalSuccess',automatic:true,noTest:!defending&&normalized.noTestAction===true,details:{...first.result.details,doubled:false}};test.options=[{...first,id:'keep'}];test.choiceRequired=false;test.forcedInversion=false;}
  if(frenzy&&!defending&&kind==='melee'&&['attack','attaque'].includes(action.type)){const enemies=(normalized.v5State?.participants||[]).filter(p=>p.id!==actor.id&&p.camp!==actor.camp&&Number(p.hp)>0&&p.zone==='active'),nearest=context.nearestEnemyId||(enemies.length===1?enemies[0].id:null);if(!nearest||!enemies.some(p=>p.id===nearest)||normalized.target?.id!==nearest)restrictions.push('Frénésie : désigner et attaquer l’ennemi le plus proche.');}
  const talentSL = previewV5TalentSLChoices(withCompanionTalents(actor,normalized.v5State?.participants||[]), test, { action, settings, kind, role: talentRole, opponent: target });
  test = talentSL.test; unresolved.push(...talentSL.unresolved);
  test={...test,options:test.options.map(o=>({...o,result:refreshV5ResultTier(enforceMagicTestRestrictions(actor,o.result,{magical:false}))}))};
  return { test, crewSkill,talentPlans: [talentModifiers.plan, ...talentSL.plans,...psychology.plans,...contact.plans,...(contactTalent?[contactTalent]:[]),...(dualWhirlwind?[dualWhirlwind]:[]),...(warLeader?[{proposals:[{origins:[warLeader.source]}]}]:[])], talentSLChoices: talentSL.choiceDescriptors, kind, penalty: appliedPenalty, penaltyStates: [...relevant].filter(([, value]) => value).map(([key]) => key),
    unresolved, restrictions, charging, qualityBonus: conditionalBonus,extraordinaryShot };
}
