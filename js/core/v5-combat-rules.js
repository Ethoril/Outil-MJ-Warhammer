/** Common V5 combat context; session resources live in extensions.v5. */
import { previewV5Test } from './v5-roll.js';
import { activeEngines } from './roll-qualities.js';
import { activeV5TalentEffects } from './v5-talents.js';
import { normalizeState } from './effects.js';
import { previewV5TalentTestModifiers, previewV5TalentSLChoices } from './v5-talent-tests.js';
export const V5_COMBAT_RULE_VERSION = 'v5-combat-2026-10-09.24';
export const hasMomentum = actor => actor?.extensions?.v5?.hasMomentum === true;
export const withMomentum = (actor, value) => !value && actor.extensions?.v5?.hasMomentum === undefined ? actor : ({ ...actor, extensions: { ...(actor.extensions || {}), v5: { ...(actor.extensions?.v5 || {}), hasMomentum: Boolean(value) } } });
export const conditionLevels = actor => {
  const levels = new Map();
  for (const [index, raw] of (actor?.states || []).entries()) {
    const state = normalizeState(raw, index);
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
/** A held, available shield explicitly chosen to oppose this attack. */
export function v5ShieldDefense(normalized) {
  const context = normalized.protectionContext || {};
  const shield = normalized.target?.equipment?.find(item => item.kind === 'shield' && item.id === context.shieldId);
  const word = shield?.keywords?.find(item => item.id === 'protectrice');
  const rating = word?.parameter?.trim() === '' ? null : Number(word?.parameter);
  const confirmed = Boolean(normalized.defense && shield && context.shieldAvailable === true && context.opposedWithShield === true
    && !normalized.target?.extensions?.shieldUnavailable?.includes(shield.id) && Number.isSafeInteger(rating) && rating > 0);
  return { confirmed, rangedDodgeAllowed: confirmed && rating >= 2, rating: confirmed ? rating : null };
}
export function buildCombatTest(normalized, role = 'actor') {
  const defending = role === 'defender';
  const actor = defending ? normalized.target : normalized.actor;
  const target = defending ? normalized.actor : normalized.target;
  const action = defending ? normalized.defense : normalized.action;
  const settings = defending ? normalized.defense.v5 || {} : normalized.v5 || {};
  const kind = settings.kind || (defending ? (/^(?:Ag|Esquive|Dodge)$/i.test(action.label) ? 'test' : 'melee') : inferV5Kind(action, normalized.attackContext));
  const levels = conditionLevels(actor), targetLevels = conditionLevels(target);
  const unresolved = [], restrictions = [];
  const modifiers = [...(settings.slModifiers || [])];
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
    const shield = v5ShieldDefense(normalized).confirmed;
    if (defensive || shield) modifiers.push({ id: 'defensive-protection', label: shield ? 'Bouclier V5 (ne cumule pas Défensive)' : 'Défensive', amount: 1 });
    for (const engine of defenseEngines) if (!overriddenDefense.has(engine.id) && engine.params.bonus < 0)
      modifiers.push({ id: `quality-${engine.id}`, label: 'Déséquilibrée', amount: engine.params.bonus });
  }
  const advantages = [...(settings.advantageSources || [])], disadvantages = [...(settings.disadvantageSources || [])];
  if (defending && kind === 'melee' && activeV5TalentEffects(actor).some(effect => effect.restriction === 'cannotOpposeWithMelee'))
    restrictions.push('Battement : la cible ne peut pas opposer Corps à corps ; Esquive reste possible.');
  if (!defending && kind === 'melee' && activeV5TalentEffects(target).some(effect => effect.advantageFilter === 'meleeAttacksAgainstTarget'))
    advantages.push({ id: 'talent-beat-blade', label: 'Battement sur la cible' });
  const charging = !defending && kind === 'melee' && settings.charging === true;
  if (kind === 'melee' && (hasMomentum(actor) || charging)) advantages.push({ id: 'momentum', label: charging ? 'Élan de Charge' : 'Élan' });
  const relevant = new Map(['sonne', 'extenue', 'empoisonne'].map(key => [key, levels.get(key) || 0]));
  const context = settings.context || {};
  const movement = kind === 'melee' ? true : context.involvesMovement;
  if (levels.has('enchevetre')) {
    if (movement == null) unresolved.push('Préciser si le Test implique un mouvement.');
    if (movement) relevant.set('enchevetre', levels.get('enchevetre'));
  }
  if (levels.has('brise')) {
    const escape = kind !== 'test' ? false : context.runningOrHiding;
    if (escape == null) unresolved.push('Préciser si le Test sert à fuir ou se cacher.');
    if (escape === false) relevant.set('brise', levels.get('brise'));
  }
  const penalty = Math.max(0, ...relevant.values());
  const conditionDisadvantages = new Map();
  if (levels.has('aterre')) {
    if (movement == null) unresolved.push('Préciser si le Test implique un mouvement.');
    if (movement) conditionDisadvantages.set('prone', [{ id: 'prone', label: 'À terre' }]);
  }
  if (levels.has('aveugle')) {
    if (kind === 'ranged') restrictions.push('Un combattant Aveuglé ne peut pas effectuer de tir.');
    if (kind === 'melee') conditionDisadvantages.set('blinded', Array.from({ length: levels.get('aveugle') }, (_, i) => ({ id: `blinded-${i}`, label: 'Aveuglé' })));
    if (kind === 'test' && context.requiresSight === true) restrictions.push('Ce Test exige la vue : un combattant Aveuglé ne peut pas l’effectuer.');
    if (kind === 'test' && context.reliesOnSight == null && context.requiresSight !== true) unresolved.push('Préciser si le Test repose sur la vue.');
    if (kind === 'test' && context.reliesOnSight && context.requiresSight !== true) conditionDisadvantages.set('blinded', Array.from({ length: levels.get('aveugle') }, (_, i) => ({ id: `blinded-${i}`, label: 'Aveuglé' })));
  }
  if (levels.has('souille')) {
    const fellowship = kind !== 'test' ? false : action.attr === 'Soc' ? true : context.usesFellowship;
    if (fellowship == null) unresolved.push('Préciser si le Test utilise la Sociabilité.');
    if (fellowship) conditionDisadvantages.set('besmirched', [{ id: 'besmirched', label: 'Souillé' }]);
  }
  if (levels.has('inconscient')) restrictions.push('Un combattant Inconscient ne peut pas agir ou se défendre.');
  if (levels.has('surpris')) restrictions.push('Un combattant Surpris ne peut pas agir ou se défendre.');
  if (!defending && kind === 'melee') {
    if (targetLevels.has('aterre')) advantages.push({ id: 'target-prone', label: 'Cible à terre' });
    if (targetLevels.has('aveugle') && !levels.has('aveugle')) advantages.push({ id: 'target-blinded', label: 'Cible Aveuglée' });
    if (targetLevels.has('surpris')) modifiers.push({ id: 'target-surprised', label: 'Cible Surprise', amount: 2 });
  }
  // Different Condition penalties do not add. Like-for-like penalties select
  // the largest; a DR penalty versus inversion requires an explicit MJ ruling.
  const worstDisadvantage = [...conditionDisadvantages.values()].sort((a, b) => b.length - a.length)[0] || [];
  const mixed = penalty > 0 && worstDisadvantage.length > 0;
  const conditionPenaltyMode = context.conditionPenaltyMode;
  if (mixed && !['sl', 'disadvantage'].includes(conditionPenaltyMode)) unresolved.push('États de pénalités différentes : choisir les DR ou le Désavantage retenu par le MJ.');
  const appliedPenalty = mixed && conditionPenaltyMode === 'disadvantage' ? 0 : penalty;
  if (appliedPenalty) modifiers.push({ id: 'conditions', label: 'Plus forte pénalité d’État', amount: -appliedPenalty });
  if (!mixed || conditionPenaltyMode !== 'sl') disadvantages.push(...worstDisadvantage);
  // V4 descriptions never supply an automatic V5 score conversion.
  const qualityModifiers = (kind === 'test' || defending ? [] : activeEngines(action.qualities || [])).filter(engine => engine.engine === 'attack-sl-bonus');
  const overridden = new Set(qualityModifiers.flatMap(engine => engine.overrides || []));
  for (const engine of qualityModifiers) if (!overridden.has(engine.id) && !engine.params?.onSuccessOnly)
    modifiers.push({ id: `quality-${engine.id}`, label: engine.id, amount: engine.params.bonus });
  const talentRole = defending ? 'defender' : ['attack', 'attaque'].includes(action.type) ? 'attacker' : 'actor';
  const talentModifiers = previewV5TalentTestModifiers(actor, { action, settings, kind, role: talentRole });
  modifiers.push(...talentModifiers.slModifiers); advantages.push(...talentModifiers.advantageSources); disadvantages.push(...talentModifiers.disadvantageSources);
  unresolved.push(...talentModifiers.unresolved);
  let test = previewV5Test({ score: Math.max(0, action.base), roll: defending ? action.roll : normalized.roll, kind,
    slModifiers: modifiers, advantageSources: advantages, disadvantageSources: disadvantages });
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
  const talentSL = previewV5TalentSLChoices(actor, test, { action, settings, kind, role: talentRole });
  test = talentSL.test; unresolved.push(...talentSL.unresolved);
  return { test, talentPlans: [talentModifiers.plan, ...talentSL.plans], talentSLChoices: talentSL.choiceDescriptors, kind, penalty: appliedPenalty, penaltyStates: [...relevant].filter(([, value]) => value).map(([key]) => key),
    unresolved, restrictions, charging, qualityBonus: conditionalBonus };
}
