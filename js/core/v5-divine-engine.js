/** Pure V5 prayer and divine-effect engine. All dice, choices and expiry timing are explicit. */
import { previewV5Test, selectV5Test, normalizeV5Roll } from './v5-roll.js';
import { acquireV5Conditions, healV5Wounds } from './v5-effects.js';
import DIVINE_REGISTRY from '../data/v5-divine-contracts.json' with { type: 'json' };
import {resolveDivineAccess,emptyDivineAccess} from './v5-divine-access.js';
import {applyPrayerSLCaps,getPrayerSLModifiers} from './v5-divine-prayer-caps.js';
import {v5ResourceIdentity} from './v5-resources.js';
import {resolveV5ConditionTestContext} from './v5-test-context.js';
import {campaignDurationSeconds} from './v5-game-time.js';
import {calendarDurationUnits,targetRuleFactFields} from './v5-divine-grammar.js';
import {effectHandler,effectNeeds,isLayerlessEffect,hasImplicitCasterTarget} from './v5-divine-effect-handlers.js';

export const V5_DIVINE_ENGINE_VERSION = 'v5-divine-engine-2026-10-18.1';
const clone = value => structuredClone(value);
const fold = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const stable = value => Array.isArray(value) ? value.map(stable)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const sameCanonical = (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right));
const asParticipants = state => Array.isArray(state?.combat?.participants)
  ? state.combat.participants
  : Array.isArray(state?.participants) ? state.participants : [];
const fail = (status, error, needsInput = []) => ({
  ready: false, status, error, needsInput, preview: null, ruleVersion: V5_DIVINE_ENGINE_VERSION
});
const need = (field, label) => ({ field, label });
const finiteInteger = value => {
  if (typeof value === 'number') return Number.isSafeInteger(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '' && Number.isSafeInteger(Number(value))) return Number(value);
  return null;
};
const objectValue = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));

function sourceError(contract, input = {}) {
  if (!contract || typeof contract.id !== 'string') return 'Contrat divin v1 requis.';
  if (!contract.source || !contract.sourceReceipt) return 'Source et reçu de source requis.';
  // Livre de base V5, ou supplément déclaré par le registre (sourceManifest.supplementBooks) pour un module de miracles.
  const supplement = DIVINE_REGISTRY.sourceManifest?.supplementBooks?.some(book => book.document === contract.source.document && book.fileSha256 === contract.source.fileSha256);
  if (contract.source.document !== 'Livre de base V5 EN v2.pdf' && !supplement) return 'La source V5 EN canonique est requise; le catalogue ou le Livre FR V4 ne confirme pas cette règle.';
  if (input.sourceFingerprint !== DIVINE_REGISTRY.sourceFingerprint) return 'L’empreinte du registre divin canonique est absente ou obsolète.';
  const canonical = DIVINE_REGISTRY.contracts?.find(row => row.id === contract.id);
  // The Store attaches registry envelope metadata to its canonical contract.
  // Those two fields are authenticated independently above; all domain fields
  // still have to match the generated row byte-for-byte after key ordering.
  const { schemaVersion: _schemaVersion, sourceFingerprint: _sourceFingerprint, ...domainContract } = contract;
  if (!canonical || !sameCanonical(domainContract, canonical)) return 'Le contrat ou son reçu ne correspond pas au registre divin canonique.';
  if (contract.source.sourceTextHash && contract.sourceReceipt.sourceTextHash
    && contract.source.sourceTextHash !== contract.sourceReceipt.sourceTextHash) return 'Reçu de source incohérent.';
  if (contract.status === 'blocked') return 'Contrat divin bloqué par une source ou un arbitrage manquant.';
  if (!['blessing', 'miracle'].includes(contract.type)) return 'Type de prière inconnu.';
  if (!['implemented', 'assisted', 'manual'].includes(contract.status)) return 'Statut du contrat divin inconnu.';
  return null;
}

function numericParam(value, actor) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? { value, unit: null } : null;
  if (!objectValue(value)) return null;
  const fixed = finiteInteger(value.value);
  if (['fixed', 'count', undefined].includes(value.kind) && fixed !== null && fixed >= 0) return { value: fixed, unit: value.unit || null };
  if (value.kind === 'instant' || value.unit === 'instant' || /instant/i.test(String(value.value))) return { value: null, unit: 'instant' };
  if (value.kind === 'special' || value.kind === 'self') return { value: null, unit: value.kind };
  if (value.kind === 'touch') return { value: 0, unit: 'touch' };
  // Zone en caractéristique entière (« Fellowship yards »), à la différence de characteristicBonus.
  if (value.kind === 'area' && typeof value.characteristic === 'string') {
    const score = finiteInteger(actor?.caracs?.[value.characteristic] ?? actor?.caracs?.[value.characteristic.toLowerCase()]);
    return score !== null && score >= 0 && score <= 100 ? { value: score, unit: value.unit || null, characteristic: value.characteristic } : null;
  }
  if (value.kind === 'characteristic' && typeof value.characteristic === 'string') {
    const amount = actor?.caracs?.[value.characteristic] ?? actor?.caracs?.[value.characteristic.toLowerCase()];
    const score = finiteInteger(amount);
    return score !== null && score >= 0 && score <= 100 ? { value: score, unit: value.unit || null, characteristic: value.characteristic } : null;
  }
  if (value.kind === 'characteristic-bonus' && typeof value.characteristic === 'string') {
    const amount = actor?.caracs?.[value.characteristic] ?? actor?.caracs?.[value.characteristic.toLowerCase()];
    const score = finiteInteger(amount);
    return score !== null && score >= 0 && score <= 100 ? { value: Math.floor(score / 10), unit: value.unit || null, characteristic: value.characteristic } : null;
  }
  if (value.kind === 'area' && typeof value.characteristicBonus === 'string') {
    const characteristic = value.characteristicBonus;
    const amount = actor?.caracs?.[characteristic] ?? actor?.caracs?.[characteristic.toLowerCase()];
    const score = finiteInteger(amount);
    return score !== null && score >= 0 && score <= 100 ? { value: Math.floor(score / 10), unit: value.unit || null, characteristic } : null;
  }
  if (value.kind === 'instant' || value.kind === 'special') return { value: null, unit: value.kind };
  return null;
}

function strengthValue(source, actor, prayer) {
  if (source.kind === 'success-levels') return Math.max(0, prayer.sl);
  const score = finiteInteger(actor?.caracs?.[source.characteristic] ?? actor?.caracs?.[String(source.characteristic).toLowerCase()]);
  if (score === null || score < 0 || score > 100) return null;
  return source.kind === 'characteristic-bonus' ? Math.floor(score / 10) : score;
}

function resolvePrayerChoices(contract, prayer, actor, input, targets = []) {
  const choices = Object.hasOwn(input, 'choices') ? input.choices : {};
  if (!objectValue(choices)) return { error: 'Les choix d’extension doivent être un objet de nombres entiers.',
    needs: [need('choices', 'Choix d’extension structurés')] };
  const allowed = new Set(['range', 'targets', 'duration', 'effect']);
  const invalidKey = Object.keys(choices).find(key => !allowed.has(key));
  if (invalidKey) return { error: `Choix d’extension non pris en charge : ${invalidKey}.`, needs: [need(`choices.${invalidKey}`, 'Choix d’extension déclaré')] };
  const counts = Object.fromEntries([...allowed].map(key => [key, Object.hasOwn(choices, key) ? choices[key] : 0]));
  if (Object.values(counts).some(value => !Number.isSafeInteger(value) || value < 0))
    return { error: 'Les choix d’extension doivent être des nombres entiers positifs ou nuls.', needs: [need('choices', 'Choix entiers explicites')] };
  const extension = (contract.extensions || []).find(row => Number.isSafeInteger(row.everySuccessLevels));
  const budget = Math.floor(Math.max(0, prayer.sl) / (extension?.everySuccessLevels || 2));
  const spent = Object.values(counts).reduce((sum, value) => sum + value, 0);
  if (spent > budget) return { error: `Les extensions choisies coûtent ${spent} paliers; le Test n’en autorise que ${budget}.`, needs: [need('choices', 'Dépenses dans les paliers de DR disponibles')] };
  if (extension?.repeatable !== true && spent > 1) return { error: 'Cette extension n’est pas déclarée répétable.', needs: [need('choices', 'Une seule extension autorisée par tranche')] };
  if (counts.range > 0 && contract.params?.range?.kind === 'touch')
    return { error: 'La Portée Contact ne peut pas être étendue.', needs: [need('choices.range', 'Aucune extension d’une Portée Contact')] };
  const rangeIsYou = contract.params?.range?.kind === 'self';
  const targetIsYou = contract.params?.targets?.kind === 'self';
  if (extension?.restrictions?.youAndYouCannotIncreaseRangeOrTargets
    && ((counts.range > 0 && rangeIsYou) || (counts.targets > 0 && (targetIsYou || contract.params?.targets?.kind === 'special'))))
    return { error: 'La Portée ou la Cible est « Vous » et ne peut pas être étendue selon la règle V5.', needs: [need('choices.range/targets', 'Aucune extension d’une Portée/Cible Soi')] };
  const increments = {};
  for (const [key, count] of Object.entries(counts)) {
    if (!count) continue;
    const declaration = extension?.choices?.find(row => row.param === key || Object.hasOwn(row, key));
    const specification = declaration?.[key];
    const step = declaration?.add ?? specification?.add ?? (typeof specification === 'number' ? specification : null);
    const ruleEffect = extension?.effect || declaration?.effect;
    if (!declaration && !(key === 'effect' && ruleEffect)) return { error: `Le contrat ne déclare pas l’extension ${key}.`, needs: [need(`choices.${key}`, 'Extension autorisée par le contrat')] };
    if (key === 'effect') {
      if ((contract.effects || []).some(effect => effect.perSuccessLevels)) {
        if (count) return { error: 'Cette progression d’effet est automatique par tranche de DR; elle ne peut pas être choisie une seconde fois.', needs: [need('choices.effect', 'Progression automatique du contrat')] };
        continue;
      }
      if (!ruleEffect || !contract.effects?.length) return { error: 'L’extension d’effet ne possède pas de résolution structurée.', needs: [need('choices.effect', 'Effet structuré')] };
      increments.effect = { ...clone(ruleEffect), count };
      continue;
    }
    const base = numericParam(contract.params?.[key], actor);
    if (!base || base.value === null) return { error: `La valeur de base ${key} est inconnue ou spéciale.`, needs: [need(`params.${key}`, 'Fait ou valeur de base requis')] };
    const amount = specification?.addBaseValue === true || declaration?.addBaseValue === true ? base.value : finiteInteger(step);
    if (amount === null || amount < 0) return { error: `Pas d’extension numérique résolue pour ${key}.`, needs: [need(`params.${key}`, 'Valeur de base entière sourcée')] };
    increments[key] = { value: amount * count, unit: declaration?.unit || base.unit || null };
  }
  const resolvedParams = {};
  for (const key of ['range', 'targets', 'duration']) {
    const base = numericParam(contract.params?.[key], actor);
    if (!base && contract.params?.[key] !== undefined && contract.status !== 'manual') return { error: `La valeur de base ${key} ne peut être résolue.`, needs: [need(`params.${key}`, 'Caractéristique ou fait nécessaire')] };
    if (base) resolvedParams[key] = { ...base, value: base.value === null ? null : base.value + (increments[key]?.value || 0), unit: base.unit || increments[key]?.unit || null };
    else if (contract.params?.[key] !== undefined) resolvedParams[key] = { value: null, unit: 'source-text-only', source: clone(contract.params[key]) };
  }
  if (increments.effect) {
    const effect = increments.effect;
    const healingExtension = effect.type === 'wound-heal' && contract.effects[0]?.type === 'wound-heal';
    if (!healingExtension && (effect.type !== 'condition' || effect.key !== contract.effects[0]?.key && effect.name !== contract.effects[0]?.name))
      return { error: 'Cette extension d’effet ne correspond pas à l’effet structuré du contrat.', needs: [need('choices.effect', 'Correspondance explicite de l’effet')] };
  }
  const resolvedEffects = clone(contract.effects || []);
  if (increments.effect?.type === 'wound-heal') resolvedEffects[0].extraHeals = increments.effect.count;
  else if (increments.effect) {
    const amount = Number(increments.effect.add ?? increments.effect.value ?? increments.effect.level ?? 1) * increments.effect.count;
    if (!Number.isSafeInteger(amount) || !resolvedEffects[0] || !Number.isSafeInteger(resolvedEffects[0].level ?? 1))
      return { error: 'L’intensité de l’effet étendu est invalide.', needs: [need('choices.effect', 'Intensité résoluble')] };
    resolvedEffects[0].level = (resolvedEffects[0].level ?? 1) + amount;
  }
  // Les effets ne sont résolus (crochet `handler.resolve`) que s'ils seront appliqués.
  const resolvesEffects = prayer.success && ['implemented', 'assisted'].includes(contract.status);
  for (const [effectIndex, effect] of resolvedEffects.entries()) {
    const declaredDuration = numericParam(contract.params?.duration, actor);
    const durationFollowsParameter = effect.duration?.sourceParameter === 'params.duration'
      || effect.duration?.unit === 'catalogue-duration'
      || (declaredDuration && effect.duration?.unit === declaredDuration.unit && effect.duration?.value === declaredDuration.value);
    if (durationFollowsParameter && resolvedParams.duration?.value !== null && resolvedParams.duration)
      effect.duration = { value: resolvedParams.duration.value, unit: resolvedParams.duration.unit };
    // Durée numérique résolue par le moteur : `{base, fromSuccessLevels:true, unit}` -> `{value: base + DR, unit}` (nulle : échéance à arbitrer).
    if (effect.duration && effect.duration.value === undefined && (effect.duration.fromSuccessLevels === true || effect.duration.base !== undefined)) {
      const value = (effect.duration.base ?? 0) + (effect.duration.fromSuccessLevels === true ? Math.max(0, prayer.sl) : 0);
      if (resolvesEffects && !(Number.isSafeInteger(value) && value >= 1)) return { error: 'La durée de l’effet, calculée depuis les DR, est nulle : échéance à arbitrer.', needs: [need('contract.effects.duration', 'Durée chiffrée par la source ou le MJ')] };
      effect.duration = { value, unit: effect.duration.unit || 'rounds' };
    }
    // Force d'État : la source remplace le niveau de base, la progression par DR s'y ajoute ensuite.
    if (effect.strengthFrom) {
      const strength = strengthValue(effect.strengthFrom, actor, prayer);
      if (strength === null || strength < 1) return { error: 'La force de l’État ne peut pas être résolue ou est nulle.', needs: [need('contract.effects.strengthFrom', 'Caractéristique ou DR donnant une force d’État positive')] };
      // target:'source' : la force est celle de la source de l'État (Enchevêtré), son niveau reste inchangé.
      if (effect.strengthFrom.target === 'source') effect.strength = strength; else effect.level = strength;
    }
    const progression = effect.perSuccessLevels;
    if (progression && Number.isSafeInteger(progression.every) && progression.every > 0 && Number.isSafeInteger(progression.add)) {
      const field = progression.field || 'level';
      const base = Number.isFinite(effect[field]) ? effect[field] : field === 'level' ? 1 : 0;
      effect[field] = base + Math.floor(Math.max(0, prayer.sl) / progression.every) * progression.add;
    }
    // Valeurs dynamiques du gestionnaire (Bonus de caractéristique, DR, taille de foule…) : une fois par effet, résultat figé.
    const resolver = resolvesEffects ? effectHandler(effect.type)?.resolve : null;
    if (resolver) {
      const resolved = resolver(clone(effect), { actor, prayer, input, targets, contract });
      if (resolved?.error) return { error: resolved.error, needs: resolved.needs || [need('contract.effects', 'Valeur de l’effet à résoudre')] };
      if (resolved) resolvedEffects[effectIndex] = freeze(clone(resolved));
    }
  }
  return { resolvedParams, resolvedEffects, choices: counts, spent, budget };
}

function validateTargetRules(contract, targets, input, resolvedParams = {}, actor = null) {
  const targetIds = targets.map(target => target?.id);
  if (targetIds.some(id => typeof id !== 'string' || !id) || new Set(targetIds).size !== targetIds.length)
    return { error: 'Chaque cible doit être identifiée une seule fois.', needs: [need('targetIds', 'Identifiants de cibles uniques')] };
  const rules = contract.targetRules || (contract.extensions || []).flatMap(row => row.targetRules || []);
  const targetLimit = resolvedParams.targets?.value;
    // Manual effects still obey sourced range/target constraints. A self-target
    // can be implicit in preview; selected targets must always match the source.
    if (resolvedParams.targets?.unit === 'self' && targets.length && (targets.length !== 1 || targets[0]?.id !== actor?.id))
    return { error: 'La prière se cible elle-même; choisissez uniquement le prêtre auteur.', needs: [need('targetIds', 'Cible propre du contrat')] };
    // Tous les effets sont portés par le prêtre (invocations, capteurs) : il est la cible implicite, ni cible explicite ni fait de portée.
    if (hasImplicitCasterTarget(contract)) return null;
    if (!targets.length) {
      if (resolvedParams.targets?.unit === 'self') return null;
      if (rules.length || resolvedParams.range?.unit === 'touch' || resolvedParams.targets?.unit === 'yards' || resolvedParams.targets?.unit === 'allies'
        || Number.isFinite(resolvedParams.range?.value) && resolvedParams.range.value > 0
        || Number.isFinite(targetLimit) && targetLimit > 0)
        return { error: 'Le contrat requiert une ou plusieurs cibles explicites.', needs: [need('targetIds', 'Cibles du miracle')] };
      return null;
    }
  if (resolvedParams.targets?.unit !== 'yards' && Number.isFinite(targetLimit) && targets.length > targetLimit)
    return { error: `Le contrat autorise au plus ${targetLimit} cible(s).`, needs: [need('targetIds', 'Nombre maximal de cibles')] };
  if (!rules.length && !Number.isFinite(resolvedParams.range?.value)) return null;
  if (!targets.length) return { error: 'Le contrat requiert une ou plusieurs cibles explicites.', needs: [need('targetIds', 'Cibles du miracle')] };
  const facts = input.facts?.targets || {};
  const aliases = targetRuleFactFields;
  for (const target of targets) {
    const requiredFacts = [...rules];
    if (Number.isFinite(resolvedParams.range?.value) && resolvedParams.range.value > 0) requiredFacts.push('within-range');
    if (resolvedParams.targets?.unit === 'allies') requiredFacts.push('ally');
    if (resolvedParams.targets?.unit === 'yards') requiredFacts.push('within-range');
    // Portée Contact : la cible doit être touchable, sans quoi la prière est refusée.
    if (resolvedParams.range?.unit === 'touch') requiredFacts.push('withinTouch');
    for (const rule of [...new Set(requiredFacts)]) {
      const field = aliases[rule];
      if (!field) return { error: `Règle de cible non prise en charge : ${rule}.`, needs: [need('targetRules', 'Règle de cible à raccorder')] };
      const fact = facts[target.id]?.[field];
      if (fact === undefined) return { error: `Le fait ${rule} doit être fourni pour ${target.name || target.id}.`, needs: [need(`facts.targets.${target.id}.${field}`, rule)] };
      if (fact !== true) return { error: `${target.name || target.id} ne satisfait pas ${rule}.`, needs: [need(`facts.targets.${target.id}.${field}`, rule)] };
    }
  }
  return null;
}

function readSin(actor) {
  const sin = actor?.extensions?.v5?.divine?.sin;
  return Number.isSafeInteger(sin) && sin >= 0 ? sin : null;
}

function readObjectValueCaseInsensitive(record, key) {
  if (!objectValue(record)) return { found: false, value: undefined, invalid: false };
  const matches = Object.keys(record).filter(candidate => fold(candidate) === fold(key));
  if (!matches.length) return { found: false, value: undefined, invalid: false };
  const values = matches.map(candidate => record[candidate]);
  if (values.some(value => value !== values[0])) return { found: true, value: undefined, invalid: true };
  return { found: true, value: values[0], invalid: false };
}

function readSkillScore(actor) {
  const skillRows = Array.isArray(actor?.skills) ? actor.skills : [];
  const candidates = skillRows.filter(skill => ['pray', 'priere'].includes(fold(skill?.name ?? skill?.nom)));
  if (!candidates.length || candidates.some(skill => skill?.status !== 'resolved')) return null;
  const scores = candidates.map(skill => finiteInteger(skill?.total));
  if (scores.some(score => score === null || score < 0) || new Set(scores).size !== 1) return null;
  const characteristics = new Set(candidates.map(skill => fold(skill?.carac || 'Soc')));
  if (characteristics.size !== 1) return null;
  const key = candidates[0]?.carac || 'Soc';
  const baseStats = actor?.extensions?.v5?.baseCaracs ?? actor?.baseCaracs;
  if (baseStats != null && !objectValue(baseStats) || actor?.caracs != null && !objectValue(actor.caracs)) return null;
    const baseValue = readObjectValueCaseInsensitive(baseStats, key);
    const currentValue = readObjectValueCaseInsensitive(actor?.caracs, key);
    if (baseValue.invalid || currentValue.invalid) return null;
    const hasBase = baseValue.found;
    const hasCurrent = currentValue.found;
  if (hasBase && !hasCurrent) return null;
  let characteristicAdjustment = 0;
  if (hasCurrent) {
      const currentCarac = finiteInteger(currentValue.value);
    if (currentCarac === null || currentCarac < 0 || currentCarac > 100) return null;
    if (hasBase) {
        const baseCarac = finiteInteger(baseValue.value);
      if (baseCarac === null || baseCarac < 0 || baseCarac > 100) return null;
      characteristicAdjustment = currentCarac - baseCarac;
    }
  }

  return Math.max(0, scores[0] + characteristicAdjustment);
}

function readPrayerModifiers(actor) {
  const modifiers = actor?.extensions?.v5?.testModifiers || {};
  if (!objectValue(modifiers)) return null;
  const relevant = Object.entries(modifiers).filter(([key]) => {
    const normalized = fold(key);
    return ['all', 'tous les tests', 'pray', 'prayer', 'priere'].includes(normalized);
  });
  if (Object.keys(modifiers).some(key => /^(pray|prayer|priere)\s*\(/i.test(fold(key)))) return null;
  if (relevant.some(([, value]) => !Number.isSafeInteger(value))) return null;
  return relevant.map(([key, amount]) => ({ id: `divine-test:${key}`, label: `Modificateur de Test : ${key}`, amount }));
}

function prayerStateBlocker(actor) {
  if (actor?.states != null && !Array.isArray(actor.states)) return 'La liste d’États du personnage est invalide.';
  const uncertain = new Set(['sonne', 'stunned', 'extenue', 'fatigued', 'empoisonne', 'poisoned']);
  const active = (actor?.states || []).filter(state => uncertain.has(fold(state?.key || state?.name || state?.nom)));
  if (!active.length) return null;
  const invalid = active.some(state => state.level !== undefined && (finiteInteger(state.level) === null || finiteInteger(state.level) < 0));
  if (invalid) return 'Le niveau d’un État pouvant modifier le Test de Prière est invalide.';
  return 'Sonné, Exténué ou Empoisonné est présent; le modificateur applicable au Test de Prière doit être résolu avant de lancer.';
}

function accessError(actor, contract) {
  const required = contract.requiredTalent;
  if (!required?.id || !required?.specialization) return 'Le contrat ne déclare pas le talent d’accès et son culte.';
  // Character sheets use the normalized talent id; reference snapshots keep
  // the fully-specialized catalogue id. Both are registry-pinned aliases.
  const talentIds = new Set([required.id, required.catalogueTalentId].filter(Boolean));
  const acquired = (actor?.talents || []).some(row => row?.status === 'resolved'
    && talentIds.has(row.id) && Number.isSafeInteger(Number(row.rank)) && Number(row.rank) >= 1
    && fold(row.specialization ?? row.specialty ?? required.specialization) === fold(required.specialization));
  if (!acquired) return `Talent d’accès ${required.name || required.id} (${required.specialization}) non acquis.`;
  if (contract.type === 'miracle') {
    const knownName = fold(contract.catalogueName || contract.labels?.canonicalName || contract.name);
    const known = (actor?.prayers || []).some(row => !['unresolved', 'open', 'blocked'].includes(row?.status)
      && fold(row?.nom || row?.name) === knownName);
    if (!known) return 'L’acquisition de ce miracle par le personnage n’est pas établie.';
  }
  return null;
}

// Durée en secondes de campagne d'une durée minutes/heures/jours entière ; null sinon (jamais d'échéance inventée).
function calendarSeconds(duration) {
  if (!duration || !calendarDurationUnits.has(duration.unit) || !Number.isSafeInteger(duration.value) || duration.value < 1) return null;
  try { return campaignDurationSeconds(duration.value, duration.unit); } catch { return null; }
}
const hasClockAnchor = anchor => Boolean(anchor) && Number.isSafeInteger(anchor.campaignSeconds) && anchor.campaignSeconds >= 0;
// Durée chiffrée d'un effet (hors instantané), ou null.
function timedDuration(effect) {
  if (effect?.duration?.unit === 'instant') return null;
  if (Number.isSafeInteger(effect?.duration?.value)) return effect.duration;
  return Number.isSafeInteger(effect?.durationRounds) ? { value: effect.durationRounds, unit: 'rounds' } : null;
}
const isCalendarEffect = effect => calendarSeconds(timedDuration(effect)) !== null;

// Portée d'un effet : `appliesTo` ('caster' | 'targets', défaut 'targets'; `casterOnly` en alias), puis le prédicat `applies` du gestionnaire.
// Filtre à la fois la couche et `applyInstant` d'un participant visé ; ctx = {actorId, actor, contract, prayer, input, targets}.
const effectApplies = (effect, participant, ctx) => {
  const scope = effect.appliesTo ?? (effect.casterOnly === true ? 'caster' : 'targets');
  if (scope === 'caster' && participant?.id !== ctx.actorId) return false;
  if (scope === 'targets' && ctx.designated && !ctx.designated.some(row => row.id === participant?.id)) return false;
  return effectHandler(effect.type)?.applies?.(effect, participant, ctx) !== false;
};

// Identifiant stable d'une couche ; un 2e effet du même type dans un contrat reçoit un suffixe d'ordre.
const layerId = (executionId, targetId, contract, effect, ordinal = 0) =>
  `${executionId}:${targetId}:${contract.id}:${effect.type}${ordinal ? ':' + (ordinal + 1) : ''}`;
const sameTypeOrdinal = (effects, index) => effects.slice(0, index).filter(row => row.type === effects[index].type).length;

function effectLayer(effect, { contract, actorId, targetId, executionId, expiry, clockAnchor, ordinal = 0, input }) {
  const layer = {
    id: layerId(executionId, targetId, contract, effect, ordinal),
    executionId, prayerId: contract.id, casterId: actorId, targetId,
    source: clone(contract.source), sourceReceipt: clone(contract.sourceReceipt),
    type: effect.type, expiry: clone(expiry)
  };
  Object.assign(layer, effectHandler(effect.type)?.buildLayer?.(effect, { contract, actorId, targetId, executionId, input }));
  if (effect.duration) layer.duration = clone(effect.duration);
  else if (Number.isSafeInteger(effect.durationRounds)) layer.duration = { value: effect.durationRounds, unit: 'rounds' };
  // Durée en minutes/heures/jours : échéance calendaire absolue ancrée sur l'horloge de l'aperçu, sans échéance de Round.
  const seconds = calendarSeconds(timedDuration(effect));
  if (seconds !== null) {
    if (!hasClockAnchor(clockAnchor)) throw new TypeError('Ancre d’horloge requise pour dater une durée calendaire.');
    layer.expiry = null;
    layer.clockAnchor = clone(clockAnchor);
    layer.deadline = { kind: 'campaign-time', atSeconds: clockAnchor.campaignSeconds + seconds };
  }
  return layer;
}

/** Preview a known divine action; no state or source object is mutated. */
export function previewDivineExecution(actor, contract, targets = [], input = {}) {
  const contractProblem = sourceError(contract, input);
  if (contractProblem) return fail(contract?.status === 'blocked' || /V5 EN canonique|incohérent|registre divin canonique|correspond pas au registre/.test(contractProblem) ? 'blocked' : 'needs-input', contractProblem,
    contract?.needsInput || [need('contract.sourceReceipt', 'Reçu de source V5 requis')]);
  let accessDecision=null;
  if(input.divineAccessState!==undefined){
    accessDecision=resolveDivineAccess(input.divineAccessState,{actor,subjectKey:input.divineSubjectKey,contract,activeScene:input.divineActiveScene,executionId:input.executionId});
    if(!accessDecision.allowed)return fail('blocked',accessDecision.reason,[need('actor.talents',accessDecision.reason)]);
  }else{
    const accessProblem=accessError(actor,contract);if(accessProblem)return fail('blocked',accessProblem,[need('actor.talents',accessProblem)]);
  }
  const cannotSpeak = actor?.extensions?.v5?.specialStates?.cannotSpeak === true
    || (Array.isArray(actor?.states) && actor.states.some(state => ['inconscient', 'unconscious'].includes(fold(state?.key || state?.name || state?.nom))));
  if (cannotSpeak) return fail('blocked', 'Le personnage ne peut pas parler pour prier.', [need('canSpeak', 'Capacité à parler selon l’état actuel')]);
  if (input.canSpeak !== true) return fail('needs-input', 'Le personnage doit pouvoir parler pour prier.', [need('canSpeak', 'Capacité à parler')]);
  const skillScore = readSkillScore(actor);
  if (skillScore === null) return fail('needs-input', 'Compétence Prière/Pray et caractéristique associée requises sur la fiche.', [need('actor.skills.Pray', 'Compétence Prière/Pray acquise et score courant')]);
  const conditionOverrides=input.conditionContext===undefined?{}:input.conditionContext;
  if(!objectValue(conditionOverrides))return fail('needs-input','Le contexte des États de la Prière doit être un objet.',[need('conditionContext','Arbitrage DIV-05 structuré')]);
  const conditionTestContext=resolveV5ConditionTestContext(actor,{
    characteristic:'Soc',isAction:true,involvesMovement:false,runningOrHiding:false,requiresSight:false,reliesOnSight:false,
    conditionPenaltyMode:conditionOverrides.conditionPenaltyMode,
    conditionPenaltyReason:conditionOverrides.conditionPenaltyReason
  });
  if(!conditionTestContext.ready){
    const status=conditionTestContext.restrictions.length?'blocked':'needs-input';
    const needs=conditionTestContext.needsInput.map(row=>need(`conditionContext.${row.field}`,row.label));
    return {...fail(status,conditionTestContext.restrictions.join(' ')||conditionTestContext.needsInput.map(row=>row.label).join(' '),needs),conditionTestContext:clone(conditionTestContext)};
  }
  const sheetModifiers = readPrayerModifiers(actor);
  if (sheetModifiers === null) return fail('needs-input', 'Modificateur de Test de Prière invalide sur la fiche.', [need('actor.extensions.v5.testModifiers', 'DR entiers issus des couches actives')]);
  const prayerModifiers=getPrayerSLModifiers(actor,input.prayerSLContext||{});
  if(!prayerModifiers.ok)return fail('needs-input','Le malus de Prière du Courroux doit être vérifié avant ce Test.',prayerModifiers.needsInput.map(row=>need(row.path,row.message)));
  const slModifiers=[...sheetModifiers,...conditionTestContext.slModifiers,...prayerModifiers.modifiers];
  const sin = readSin(actor);
  if (sin === null) return fail('needs-input', 'Le score de Péché doit être enregistré dans la fiche.', [need('actor.extensions.v5.divine.sin', 'Péché courant')]);
  if (input.roll === undefined) return fail('needs-input', 'Jet de Prière d100 explicite requis.', [need('roll', 'Résultat du jet d100')]);
  const activePrayer = [actor, ...(input.participants || [])].some(participant =>
    (participant?.extensions?.v5?.divineEffects || []).some(effect => effect.prayerId === contract.id && effect.casterId === actor.id));
  if (activePrayer) return fail('blocked', 'Cette prière est déjà active; attendre sa fin avant de la réutiliser.', [need('prayerExpiry', 'Expiration de la prière déjà active')]);
  let testPreview;
  try {
    testPreview = previewV5Test({ score: skillScore, roll: normalizeV5Roll(input.roll), kind: 'test', slModifiers,
      advantageSources:conditionTestContext.advantageSources,disadvantageSources:conditionTestContext.disadvantageSources });
  } catch (error) { return fail('invalid', error.message, [need('roll', 'Résultat d100 entre 1 et 100')]); }
  let prayer;
  if (testPreview.choiceRequired && !input.testOptionId) {
    return {...fail('needs-input', 'Le choix de l’issue du Test de Prière est requis.', [need('testOptionId', 'Option du Test de Prière')]),
      preview:freeze({contractId:contract.id,actorId:actor?.id||null,testOptions:clone(testPreview.options),testSummary:clone(testPreview.advantage),conditionTestContext:clone(conditionTestContext)})};
  }
  try { prayer = selectV5Test(testPreview, input.testOptionId || (testPreview.forcedInversion?'reverse':'keep')); }
  catch (error) { return fail('invalid', error.message, [need('testOptionId', 'Option du Test de Prière')]); }
  const rawPrayerSL=prayer.sl;
  const cappedPrayer=applyPrayerSLCaps(actor,prayer);
  if(!cappedPrayer.ok)return fail('needs-input','La sanction calendaire de Prière est invalide.',cappedPrayer.needsInput);
  prayer=cappedPrayer.test;
  const resultRoll = prayer.roll;
  const unit = resultRoll % 10;
  const sinTrigger = unit <= sin;
  const wrathTriggered = prayer.fumble || sinTrigger;
  // `contract.reminders` : rappels permanents du culte ou de la prière (ex. Solkan : aucun Péché ni Corruption toléré).
  const reminders = [...(contract.reminders || [])];
  if (contract.status === 'manual') reminders.push('Prière résolue; effet laissé au rappel MJ selon le contrat source.');
  // assisted : les effets structurés sont appliqués, les clauses non automatisées sortent en rappels MJ.
  const appliesEffects = ['implemented', 'assisted'].includes(contract.status);
  if (contract.status === 'assisted' && prayer.success) reminders.push('Effets structurés appliqués; clauses restantes laissées au rappel MJ.',
    ...(contract.clauses || []).filter(clause => clause.mode !== 'engine' && clause.text).map(clause => clause.text));
  const effects = prayer.success && appliesEffects ? (contract.effects || []) : [];
  const effectTargets = targets?.length ? targets : [actor];
  const unresolvedEffects = effects.flatMap(effect => effectNeeds(effect, { targets: effectTargets, input, actor }));
  const choiceResult = resolvePrayerChoices(contract, prayer, actor, input, effectTargets);
  if (choiceResult.error) return { ...fail('needs-input', choiceResult.error, choiceResult.needs), preview: freeze({ prayer, success: prayer.success, contractId: contract.id, source: clone(contract.source), sourceReceipt: clone(contract.sourceReceipt) }) };
  const targetProblem = validateTargetRules(contract, targets || [], input, choiceResult.resolvedParams, actor);
  if (targetProblem) return { ...fail('needs-input', targetProblem.error, targetProblem.needs), preview: freeze({ prayer, success: prayer.success, contractId: contract.id, source: clone(contract.source), sourceReceipt: clone(contract.sourceReceipt), resolvedParams: clone(choiceResult.resolvedParams) }) };
  const resolvedEffects = prayer.success && appliesEffects ? choiceResult.resolvedEffects : [];
  let wrathRoll = null;
  let wrathResult = null;
  let wrathConsequences = null;
  if (wrathTriggered && input.wrathRoll !== undefined) {
    try { wrathRoll = normalizeV5Roll(input.wrathRoll); }
    catch (error) { return fail('invalid', error.message, [need('wrathRoll', 'Résultat du jet de Courroux d100')]); }
  }
  if (wrathTriggered && wrathRoll !== null) {
    const modifiedRoll = wrathRoll + 10 * sin;
    wrathResult = (DIVINE_REGISTRY.wrathTable || []).find(row => modifiedRoll >= row.min
      && (row.max === undefined || row.max === null || modifiedRoll <= row.max)) || null;
  }
  if (wrathTriggered && typeof input.wrathConsequences === 'string' && input.wrathConsequences.trim()) {
    wrathConsequences = input.wrathConsequences.trim();
  }
  if (wrathTriggered && (!wrathRoll || !wrathResult || !wrathConsequences)) reminders.push('Courroux divin déclenché; le résultat du Courroux reste à résoudre selon la table V5.');
  const preview = freeze({
    ruleVersion: V5_DIVINE_ENGINE_VERSION,
    contractId: contract.id, contractType: contract.type, source: clone(contract.source), sourceReceipt: clone(contract.sourceReceipt),
    actorId: actor?.id || null, targetIds: (targets || []).map(target => target?.id).filter(Boolean),
    skill: 'Pray', skillScore, slModifiers, sinAtTest: sin,
    prayer, prayerSLAdjustment:cappedPrayer.status==='applied'?{rawSL:rawPrayerSL,effectiveSL:prayer.sl,caps:clone(cappedPrayer.caps)}:null,
    unit, success: prayer.success, conditionTestContext:clone(conditionTestContext),
    wrath: { triggered: wrathTriggered, reason: prayer.fumble ? 'fumble' : sinTrigger ? 'sin-threshold' : null,
      sinTrigger, sinAtTest: sin, sinAfter: wrathTriggered && wrathRoll && wrathResult && wrathConsequences ? Math.max(0, sin - 1) : sin,
      unit, roll: wrathRoll, modifiedRoll: wrathRoll === null ? null : wrathRoll + 10 * sin,
      outcome: wrathResult ? { ...clone(wrathResult), resultId: wrathResult.id } : null, consequences: wrathConsequences },
    effects: clone(resolvedEffects), unresolvedEffects, reminders,
    limitations: ['Avantage, Désavantage et dépense de Chance ne sont pas résolus par ce moteur; le d100 fourni est traité tel quel.'],
    params: clone(contract.params || {}), resolvedParams: clone(choiceResult.resolvedParams),
    choices: clone(choiceResult.choices), extensionBudget: { available: choiceResult.budget, spent: choiceResult.spent },
    expiry: input.expiry ? clone(input.expiry) : null
  });
  if (unresolvedEffects.length) return { ...fail('needs-input', 'Un ou plusieurs effets demandent un fait ou un raccordement explicite.', unresolvedEffects), preview, sourceReceipt: clone(contract.sourceReceipt) };
  if (wrathTriggered && (!wrathRoll || !wrathResult || !wrathConsequences)) {
    const missing = [];
    if (!wrathRoll) missing.push(need('wrathRoll', 'Jet de Courroux d100'));
    if (wrathRoll && !wrathResult) missing.push(need('wrathRoll', 'Résultat dans la plage de la table de Courroux'));
    if (!wrathConsequences) missing.push(need('wrathConsequences', 'Conséquences de Courroux traitées par le MJ'));
    return { ...fail('needs-wrath-resolution', 'Le Test est visible, mais le Courroux doit être résolu depuis sa table avant application.', missing), preview, sourceReceipt: clone(contract.sourceReceipt) };
  }
  const duration = choiceResult.resolvedParams.duration;
  const timedEffects = resolvedEffects.filter(effect => timedDuration(effect));
  const hasTimedManualPrayer = contract.status === 'manual' && duration && duration.value !== null && duration.unit !== 'instant';
  const manualCalendar = hasTimedManualPrayer && calendarSeconds(duration) !== null;
  // Minutes/heures/jours : échéance calendaire sur l'horloge de jeu, jamais devinée sans elle.
  if (prayer.success && (timedEffects.some(isCalendarEffect) || manualCalendar) && !hasClockAnchor(input.clockAnchor))
    return { ...fail('needs-input', 'Horloge de jeu requise pour dater cette durée en minutes, heures ou jours.', [need('clockAnchor', 'Horloge de jeu de la partie')]), preview, sourceReceipt: clone(contract.sourceReceipt) };
  // Durées en Rounds (ou non résolues) : échéance de Round explicite, alignée sur chaque durée sourcée.
  const roundDurations = [...timedEffects.filter(effect => !isCalendarEffect(effect)).map(timedDuration), ...(hasTimedManualPrayer && !manualCalendar ? [duration] : [])];
  if (prayer.success && roundDurations.length && !input.expiry)
    return { ...fail('needs-input', 'Échéance explicite requise pour suivre cette prière active.', [need('expiry', 'Fin du Tour auteur ou fin de Round choisie par le MJ')]), preview, sourceReceipt: clone(contract.sourceReceipt) };
  if (prayer.success && roundDurations.length) {
    const expiryError = validateExpiry(input.expiry);
    const durationError = roundDurations.map(row => validateDurationDeadline(input.expiry, row, input.round, actor.id)).find(Boolean);
    if (expiryError || durationError) return { ...fail('needs-input', expiryError || durationError, [need('expiry', 'Échéance alignée sur la durée sourcée')]), preview, sourceReceipt: clone(contract.sourceReceipt) };
  }
  return { ready: true, status: contract.status === 'manual' ? 'reminder' : 'ready', preview, sourceReceipt: clone(contract.sourceReceipt), needsInput: [], ruleVersion: V5_DIVINE_ENGINE_VERSION };
}

/** Append an explicitly resolved prayer and its supported effect layers atomically. */
export function applyDivineExecution(state, contract, input = {}) {
  if (!state || typeof state !== 'object') return fail('invalid', 'État requis.');
  if (typeof input.executionId !== 'string' || !input.executionId.trim()) return fail('needs-input', 'Identifiant d’exécution stable requis.', [need('executionId', 'Identifiant idempotent')]);
  const currentExecutions = state.extensions?.v5?.divineExecutions || [];
  if (currentExecutions.some(row => row.executionId === input.executionId)) {
    return { ready: false, status: 'duplicate', error: 'Cette prière a déjà été appliquée.', needsInput: [], state: clone(state), receipt: null, executionId: input.executionId };
  }
  const participants = asParticipants(state);
  const actorId = input.actorId || state.combat?.currentActorId;
  const actor = participants.find(row => row.id === actorId);
  const subjectKey=v5ResourceIdentity(state,actor)||(actor?.extensions?.v5?.divineSubjectId?'divine-local:'+actor.extensions.v5.divineSubjectId:'instance:'+actorId);
  const canonicalAccess=state.extensions?.v5?.divineAccess||emptyDivineAccess();
  const canonicalScene=state.activeScene||null;
  if (!actor) return fail('needs-input', 'Personnage priant introuvable.', [need('actorId', 'Personnage priant')]);
  const targetIds = input.targetIds || [];
  const targets = targetIds.map(id => participants.find(row => row.id === id)).filter(Boolean);
  if (targets.length !== targetIds.length) return fail('needs-input', 'Une ou plusieurs cibles sont introuvables.', [need('targetIds', 'Cibles du contrat')]);
  const applyAccess=resolveDivineAccess(canonicalAccess,{actor,subjectKey,contract,activeScene:canonicalScene,executionId:input.executionId});
  const previewResult = previewDivineExecution(actor, contract, targets, { ...input, participants,divineAccessState:canonicalAccess,divineSubjectKey:subjectKey,divineActiveScene:canonicalScene });
  if (!previewResult.ready) return { ...previewResult, state: clone(state), receipt: null, executionId: input.executionId };
  const preview = previewResult.preview;
  if (preview.success && preview.effects.length && !targets.length && preview.resolvedParams.targets?.unit !== 'self' && !hasImplicitCasterTarget(contract))
    return { ...fail('needs-input', 'Choisissez les cibles avant application.', [need('targetIds', 'Cibles explicites du contrat')]), state: clone(state), receipt: null, executionId: input.executionId, preview };
  let next = clone(state);
  const designated = preview.success && (['implemented', 'assisted'].includes(contract.status) || contract.status === 'manual' && previewResult.status === 'reminder') ? (targets.length ? targets : [actor]) : [];
  // Un effet réservé au prêtre (appliesTo 'caster') l'atteint même s'il n'est pas désigné ; les effets de cibles ne touchent que les désignées.
  const casterScoped = preview.effects.some(effect => (effect.appliesTo ?? (effect.casterOnly === true ? 'caster' : 'targets')) === 'caster');
  const appliedTargets = designated.length && casterScoped && !designated.some(row => row.id === actor.id) ? [...designated, actor] : designated;
  const layerEffects = preview.effects.filter(effect => !isLayerlessEffect(effect)
    && !(effect.duration?.unit === 'instant' || effect.durationRounds === 0));
  const effectReceipts = [];
  const activeDuration = contract.params?.duration ?? contract.duration;
  const timedManual = preview.success && contract.status === 'manual' && activeDuration !== undefined && activeDuration !== null
    && !/instant/i.test(typeof activeDuration === 'string' ? activeDuration : JSON.stringify(activeDuration));
  // Durée manuelle en minutes/heures/jours : la couche de rappel porte l'échéance calendaire de la durée résolue.
  const manualCalendarDuration = timedManual && calendarSeconds(preview.resolvedParams.duration) !== null ? { value: preview.resolvedParams.duration.value, unit: preview.resolvedParams.duration.unit } : null;
  const calendarLayerEffects = layerEffects.filter(isCalendarEffect);
  const appliesContext = { actorId, actor, contract, prayer: preview.prayer, input, targets: appliedTargets, designated };
  if ((preview.effects.length || timedManual) && appliedTargets.length) {
    if ((calendarLayerEffects.length || manualCalendarDuration) && !hasClockAnchor(input.clockAnchor))
      return { ...fail('needs-input', 'Horloge de jeu requise pour dater cette durée en minutes, heures ou jours.', [need('clockAnchor', 'Horloge de jeu de la partie')]), state: clone(state), receipt: null, executionId: input.executionId };
    if (!input.expiry && layerEffects.some(effect => !isCalendarEffect(effect) && ((effect.duration && !['instant', 'session'].includes(effect.duration.unit)) || Number.isSafeInteger(effect.durationRounds))))
      return { ...fail('needs-input', 'Échéance explicite requise pour une prière temporaire.', [need('expiry', 'Instant d’expiration choisi')]), state: clone(state), receipt: null, executionId: input.executionId };
    if (timedManual && !manualCalendarDuration && !input.expiry) return { ...fail('needs-input', 'Échéance explicite requise pour suivre cette prière manuelle active.', [need('expiry', 'Instant d’expiration choisi')]), state: clone(state), receipt: null, executionId: input.executionId };
    const expiryError = validateExpiry(input.expiry);
    if (input.expiry && expiryError) return { ...fail('invalid', expiryError, [need('expiry', 'Échéance explicite valide')]), state: clone(state), receipt: null, executionId: input.executionId };
    next = replaceParticipants(next, participants.map(participant => {
      // `participants` comes from the caller's preview snapshot. Reinsert only
      // clones into `next`; otherwise resolving Wrath below can mutate the
      // original caster when a different participant is the prayer's target.
      if (!appliedTargets.some(target => target.id === participant.id)) return clone(participant);
      // L'ordinal reste calculé sur tous les effets à couche : l'identifiant d'une couche ne dépend pas du filtre de portée.
      const layered = layerEffects.map((effect, index) => ({ effect, index })).filter(({ effect }) => effectApplies(effect, participant, appliesContext));
      const layers = layered.map(({ effect, index }) => effectLayer(effect, { contract, actorId, targetId: participant.id, executionId: input.executionId, expiry: input.expiry || null, clockAnchor: input.clockAnchor, ordinal: sameTypeOrdinal(layerEffects, index), input }));
      if (timedManual && !layers.length) layers.push(effectLayer({ type: 'manual-prayer-reminder', duration: manualCalendarDuration || clone(activeDuration) }, { contract, actorId, targetId: participant.id, executionId: input.executionId, expiry: input.expiry, clockAnchor: input.clockAnchor }));
      const updated = clone(participant);
      updated.extensions ||= {}; updated.extensions.v5 ||= {};
      updated.extensions.v5.divineEffects = [...(updated.extensions.v5.divineEffects || []), ...layers];
      for (const [index, effect] of preview.effects.entries()) {
        const handler = effectHandler(effect.type);
        if (!handler?.applyInstant || !effectApplies(effect, participant, appliesContext)) continue;
        const layer = layers[layered.findIndex(row => row.effect === effect)];
        const context = { contract, executionId: input.executionId, targetId: participant.id, targetName: participant.name, index, layer, expiry: input.expiry, round: input.round, input, actor, prayer: preview.prayer, combat: state.combat };
        const result = handler.applyInstant(updated, effect, context);
        const row = handler.receipt?.(effect, context, result);
        if (row) effectReceipts.push(row);
      }
      return updated;
    }));
  }
  // Crochet `createParticipants` (invocations) : de vrais participants créés dans la même commande, après les couches du prêtre, sans
  // toucher à l'ordre ni à l'acteur courant. Un identifiant déjà présent n'est pas recréé (la protection principale reste `duplicate`).
  const summonedIds = [];
  for (const [index, effect] of preview.effects.entries()) {
    const handler = effectHandler(effect.type);
    const layerIndex = layerEffects.indexOf(effect);
    const owner = asParticipants(next).find(row => row.id === actorId);
    if (!handler?.createParticipants || layerIndex < 0 || !owner || !effectApplies(effect, owner, appliesContext)) continue;
    const layerKey = layerId(input.executionId, actorId, contract, effect, sameTypeOrdinal(layerEffects, layerIndex));
    const layer = (owner.extensions?.v5?.divineEffects || []).find(row => row.id === layerKey);
    const context = { contract, executionId: input.executionId, targetId: actorId, actorId, actor: owner, index, layer, expiry: input.expiry, round: input.round, input, participants: asParticipants(next) };
    const created = (handler.createParticipants(effect, context) || []).filter(row => !asParticipants(next).some(existing => existing.id === row.id));
    if (!created.length) continue;
    next = replaceParticipants(next, [...asParticipants(next), ...created.map(clone)]);
    summonedIds.push(...created.map(row => row.id));
    const row = handler.receipt?.(effect, context, created);
    if (row) effectReceipts.push(row);
  }
  const afterActor = asParticipants(next).find(row => row.id === actorId);
  if (preview.wrath.triggered) {
    afterActor.extensions ||= {}; afterActor.extensions.v5 ||= {}; afterActor.extensions.v5.divine ||= {};
    afterActor.extensions.v5.divine.sin = preview.wrath.sinAfter;
  }
  const receipt = {
    executionId: input.executionId, contractId: contract.id, actorId,
    source: clone(contract.source), sourceReceipt: clone(contract.sourceReceipt),
    prayer: clone(preview.prayer), prayerSLAdjustment:clone(preview.prayerSLAdjustment), testContext:clone(preview.conditionTestContext), wrath: clone(preview.wrath),
    wrathResolution: preview.wrath.triggered ? { status: input.wrathResult?.resolvedBy==='source-contract'?'resolved-by-source-contract':'resolved-by-mj', trigger: preview.wrath.reason,
      sinBefore: preview.wrath.sinAtTest, sinAfter: preview.wrath.sinAfter,
      roll: preview.wrath.roll, modifiedRoll: preview.wrath.modifiedRoll, result: clone(preview.wrath.outcome),
      consequences: preview.wrath.consequences } : null,
    appliedEffectIds: appliedTargets.flatMap(target => layerEffects.flatMap((effect, index) => effectApplies(effect, target, appliesContext)
      ? [layerId(input.executionId, target.id, contract, effect, sameTypeOrdinal(layerEffects, index))] : [])),
    effectReceipts, ...(summonedIds.length ? { summonedIds } : {}),
    reminders: clone(preview.reminders), status: preview.status || previewResult.status
  };
  next.extensions ||= {}; next.extensions.v5 ||= {};
  next.extensions.v5.divineExecutions = [...(next.extensions.v5.divineExecutions || []), receipt];
  return { ready: true, status: previewResult.status, state: next, receipt, executionId: input.executionId, preview };
}


const EXPIRY_PHASES = new Set(['startOfTurn', 'endOfTurn', 'endOfRound', 'attackAttempt']);
function validateExpiry(expiry) {
  if (!expiry || typeof expiry !== 'object') return 'Échéance explicite invalide.';
  if (!['endOfTurn', 'endOfRound'].includes(expiry.phase) || !Number.isSafeInteger(expiry.round) || expiry.round < 1) return 'Phase ou Round d’expiration invalide.';
  if (['startOfTurn', 'endOfTurn'].includes(expiry.phase)
    && (typeof expiry.actorId !== 'string' || !expiry.actorId)) return 'Auteur requis pour cette échéance.';
  if (expiry.turn !== undefined && (!Number.isSafeInteger(expiry.turn) || expiry.turn < 0)) return 'Numéro du Tour invalide.';
  if (expiry.moment !== undefined && !['beforeEffects', 'afterEffects'].includes(expiry.moment)) return 'Instant d’expiration invalide.';
  return null;
}

function validateDurationDeadline(expiry, duration, currentRound, casterId) {
  if (!duration || duration.value === null || duration.unit === 'instant') return null;
  // Minutes/heures/jours : pas d'échéance de Round, la couche porte une échéance calendaire.
  if (calendarSeconds(duration) !== null) return null;
  if (duration.unit !== 'rounds' || !Number.isSafeInteger(duration.value) || duration.value < 1) return 'Durée sourcée non résolue : échéance à arbitrer.';
  const startRound = Number.isSafeInteger(currentRound) && currentRound > 0 ? currentRound : 1;
  if (expiry.round !== startRound + duration.value - 1) return `L’échéance doit suivre la durée sourcée de ${duration.value} Round(s).`;
  if (expiry.phase === 'endOfTurn' && expiry.actorId !== casterId) return 'Une expiration en fin de Tour doit suivre le Tour du prêtre auteur.';
  return null;
}

/** Build a divine layer only after its source, target and expiry have been resolved. */
export function createDivineEffectLayer(effect, context = {}) {
  const { contract, actorId, targetId, executionId, expiry, clockAnchor } = context;
  if (!contract?.source || !contract?.sourceReceipt || !actorId || !targetId || !executionId) throw new TypeError('Provenance et identifiants de couche divine requis.');
  const error = validateExpiry(expiry);
  if (error) throw new TypeError(error);
  const missing = effectNeeds(effect);
  if (missing.length) throw new TypeError(missing.map(item => item.label).join('; '));
  return freeze(effectLayer(effect, { contract, actorId, targetId, executionId, expiry: { ...expiry, moment: expiry.moment || 'afterEffects' }, clockAnchor }));
}

/** Expire only divine layers whose explicit, absolute deadline has passed. */
export function expireDivineEffects(participant, transition = {}) {
  const next = clone(participant);
  const layers = next?.extensions?.v5?.divineEffects || [];
  const removed = [];
  const expiredLayers = [];
  const expiredConditionStateIds = new Set();
  const keep = layers.filter(layer => {
    // Calendar deadlines are handled only by their explicit source-backed clock adapter.
    if(layer?.deadline?.kind==='campaign-time')return true;
    // The 11–15 Prayer sanction is removed only after a clock receipt attests
    // its end-of-Round phase; callers with a raw phase list cannot expire it.
    if(layer?.type==='prayer-sl-modifier')return true;
    const expiry = layer.expiry;
    if (!expiry || expiry.phase !== transition.phase || (expiry.moment || 'afterEffects') !== (transition.moment || 'afterEffects')) return true;
    if (expiry.actorId && expiry.actorId !== transition.actorId) return true;
    if (!Number.isSafeInteger(transition.round) || transition.round < expiry.round) return true;
    if (transition.round === expiry.round && expiry.turn !== undefined
      && (!Number.isSafeInteger(transition.turn) || transition.turn < expiry.turn)) return true;
    removed.push(layer.id);
    expiredLayers.push(layer);
      if (Array.isArray(layer.conditionStateIds)) layer.conditionStateIds.forEach(id => expiredConditionStateIds.add(id));
    return false;
  });
  const retainedConditionStateIds = new Set(keep.flatMap(layer => Array.isArray(layer.conditionStateIds) ? layer.conditionStateIds : []));
  const unreferencedExpiredStateIds = new Set([...expiredConditionStateIds].filter(id => !retainedConditionStateIds.has(id)));
  if (unreferencedExpiredStateIds.size) next.states = (next.states || []).filter(state => !unreferencedExpiredStateIds.has(state.id));
  if (next?.extensions?.v5) next.extensions.v5.divineEffects = keep;
  // Fin d'effet : certains types posent un État de suite (conditionsOnExpiry).
  for (const layer of expiredLayers) effectHandler(layer.type)?.onExpire?.(next, layer, transition);
  return { participant: next, removed, status: removed.length ? 'expired' : 'unchanged' };
}

function replaceParticipants(state, participants) {
  if (Array.isArray(state?.combat?.participants)) return { ...state, combat: { ...state.combat, participants } };
  return { ...state, participants };
}




