/**
 * Registre des types d'effet divins : {type -> {validate, needs, resolve, applies, buildLayer, applyInstant, receipt, onExpire,
 * inputFields, factFields, layerless}}. Tout est facultatif sauf ce que le type utilise.
 * - validate(effect) -> message d'erreur | null : contrôle du contrat à la génération.
 * - needs(effect, {targets, input, actor}) -> [{field,label}] : faits manquants avant l'aperçu.
 * - resolve(effect, {actor, prayer, input, targets, contract}) -> effet résolu | {error, needs} : appelé UNE fois par effet et par
 *   aperçu (prière réussie, contrat implemented/assisted), après durée, force d'État et perSuccessLevels. Reçoit une copie de l'effet,
 *   renvoie l'effet à utiliser (valeurs dynamiques : Bonus de caractéristique, DR, taille de foule). Il est cloné, figé, puis stocké dans
 *   `preview.effects` : buildLayer, applies, applyInstant et receipt ne voient plus que lui. Rien ne le recalcule à l'application.
 * - applies(effect, participant, ctx) -> false pour exclure ce participant : filtre la couche ET applyInstant. ctx = {actorId, actor,
 *   contract, prayer, input, targets}. Se combine avec `effect.appliesTo`.
 * - buildLayer(effect, ctx) -> champs ajoutés à la couche active (absent ou `layerless` : pas de couche).
 * - applyInstant(participant, effect, ctx) : mutation du participant à l'application ; retourne un résultat.
 * - receipt(effect, ctx, result) -> ligne de reçu | null.
 * - onExpire(participant, layer, transition) : à la fin de la couche.
 * - createParticipants(effect, ctx) -> [participant] : participants ORDINAIRES créés dans la même commande atomique (invocations), appelé
 *   par applyDivineExecution juste après les couches des cibles, avant le reçu. Seuls les effets à couche, portés par le prêtre
 *   (appliesTo 'caster'), l'atteignent. ctx = {contract, executionId, index (rang de l'effet), actorId, actor (prêtre à jour), layer (sa
 *   couche de cet effet), round, expiry, input}. Un participant dont l'id existe déjà n'est pas recréé ; `receipt(effect, ctx, créés)`
 *   reçoit les participants créés ; leurs ids vont dans `receipt.summonedIds`. Ni `combat.order` ni l'acteur courant ne sont touchés.
 * - inputFields(effect, {contract, actor, targets, choices}) -> [champ] : saisies du formulaire (lues par buildDivineForm).
 *   champ = {path, label, kind: 'number'|'text'|'boolean'|'select'|'tri-state', scope: 'effect'|'target', help?, source?, min?, max?, options?}.
 *   `path` : chemin pointé du brouillon, identique dans `input` du moteur (scope 'target' : l'identifiant de la cible s'y ajoute en dernier
 *   segment). `source: true` ajoute « Source : … » à l'aide. `options` (select) : [[valeur, libellé]].
 * - factFields(effect, {contract}) -> [{field, label, help?, required?, custom?}] : faits de cible (tri-état) lus dans
 *   `input.facts.targets[id][field]`, ajoutés à ceux des règles du contrat.
 * - implicitTarget (booléen) : l'effet, porté par le prêtre (appliesTo 'caster'), n'a pas besoin de cible désignée. Quand TOUS les effets
 *   d'un contrat le déclarent (hasImplicitCasterTarget), la prière n'exige ni cible explicite ni fait de portée : le prêtre est la cible.
 * Champ d'effet générique : `effect.appliesTo` 'caster' | 'targets' (défaut 'targets' ; `casterOnly` : alias de 'caster').
 * Durée : `{value, unit}` ou numérique résolue par le moteur `{base?, fromSuccessLevels?: true, unit}` (valeur = base + DR, ≥ 1).
 * Chaque tâche ajoute ses types dans SON module (-tests, -damage, -conditions, -gear, -summon) et dans la grammaire.
 */
import { healV5Wounds, acquireV5Conditions } from './v5-effects.js';
import { knownMovement } from './v5-magic-effects.js';
import { effectTypes, strengthSources, progressionFields } from './v5-divine-grammar.js';
import { REMINDER_FLAGS } from './v5-magic-reminder-flags.js';
import damageHandlers from './v5-divine-effects-damage.js';
import conditionHandlers, { whenProblem, whenNeeds, whenApplies, whenFactFields } from './v5-divine-effects-conditions.js';
import gearHandlers from './v5-divine-effects-gear.js';
import testsHandlers from './v5-divine-effects-tests.js';
import summonHandlers from './v5-divine-effects-summon.js';

const clone = value => structuredClone(value);
const need = (field, label) => ({ field, label });
const healingAmount = effect => effect.value ?? effect.wounds;

const healing = {
  layerless: true,
  validate: effect => Number.isFinite(healingAmount(effect)) ? null : `${effect.type} exige value.`,
  needs: effect => Number.isFinite(healingAmount(effect)) ? [] : [need('contract.effects.healing', 'Valeur de soin sourcée requise')],
  buildLayer: effect => ({ healing: { value: healingAmount(effect) } }),
  applyInstant(participant, effect) {
    const healed = healV5Wounds(participant, Number(healingAmount(effect)));
    Object.assign(participant, healed.participant || healed);
    return healed;
  },
  receipt: (effect, { targetId }, result) => ({ targetId, type: effect.type, result: clone(result) })
};

const coreHandlers = {
  'characteristic-modifier': {
    validate: effect => typeof effect.characteristic !== 'string' || !Number.isFinite(effect.value) ? 'characteristic-modifier exige characteristic et value.' : null,
    needs(effect, { targets = [] } = {}) {
      const needs = [];
      if (!effect.characteristic || !Number.isFinite(effect.value)) needs.push(need('contract.effects.characteristic', 'Caractéristique et valeur sourcées requises'));
      // Jamais de Mouvement par défaut : une cible sans M connu bloque l'aperçu.
      if (effect.characteristic === 'M') for (const target of targets) if (knownMovement(target) === null)
        needs.push(need(`targets.${target?.id}.caracs.M`, 'Mouvement (M) connu de la cible requis'));
      return needs;
    },
    buildLayer: effect => ({ statModifiers: { [effect.characteristic]: effect.value } })
  },
  'armor-bonus': {
    validate: effect => Number.isFinite(effect.value) ? null : `${effect.type} exige value.`,
    needs: effect => Number.isFinite(effect.value) ? [] : [need('contract.effects.armor', 'Bonus de PA sourcé requis')],
    buildLayer: effect => ({ apModifiers: Object.fromEntries((Array.isArray(effect.locations) ? effect.locations : [effect.locations || 'all']).map(location => [location, effect.value])) })
  },
  condition: {
    validate(effect) {
      if (!effect.key && !effect.name) return 'condition exige key ou name.';
      return whenProblem(effect) ?? strengthError(effect.strengthFrom);
    },
    needs(effect, ctx) {
      const needs = whenNeeds(effect, ctx);
      if (!effect.key && !effect.name) needs.push(need('contract.effects.condition', 'État sourcé requis'));
      if (strengthError(effect.strengthFrom)) needs.push(need('contract.effects.strengthFrom', 'Source de la force de l’État valide requise'));
      return needs;
    },
    applies: whenApplies,
    factFields: whenFactFields,
    buildLayer: effect => ({ conditions: [{ key: effect.key || effect.name, level: effect.level ?? 1 }] }),
    // Acquiert l'État sur la cible et le rattache à sa couche pour que la fin de l'effet le retire.
    applyInstant(participant, effect, { contract, executionId, index, layer, expiry, round }) {
      const beforeIds = new Set((participant.states || []).map(row => row.id));
      const acquired = acquireV5Conditions(participant, [{ name: effect.key || effect.name, level: effect.level ?? 1,
        source: { kind: 'divine', prayerId: contract.id, executionId, ...(effect.strength === undefined ? {} : { strength: effect.strength }) } }], { round: expiry?.round ?? round });
      if (!acquired.ready) throw Object.assign(new Error('Données requises pour appliquer la Condition divine.'), { code: 'DIVINE_CONDITION_INPUT', needsInput: acquired.needsInput });
      Object.assign(participant, acquired.participant);
      const ids = (participant.states || []).filter(row => !beforeIds.has(row.id)).map((row, stateIndex) => {
        row.id = `divine-condition:${executionId}:${participant.id}:${index}:${stateIndex}`;
        return row.id;
      });
      // acquireV5Conditions renvoie une copie du participant : la couche à renseigner est celle de cette copie.
      const live = layer && (participant.extensions?.v5?.divineEffects || []).find(row => row.id === layer.id);
      if (live) {
        live.conditionStateIds = ids;
        participant.states = (participant.states || []).map(row => ids.includes(row.id) ? { ...row, divineEffectId: layer.id, divineExecutionId: executionId, ...(effect.lockConditions ? { divineLock: true } : {}) } : row);
      }
      return null;
    },
    receipt: (effect, { targetId }) => effect.strength === undefined ? null
      : { targetId, type: effect.type, result: { strength: effect.strength, reminder: REMINDER_FLAGS.entangledStrength(effect.strength) } }
  },
  healing,
  'wound-heal': healing
};

function strengthError(strengthFrom) {
  if (strengthFrom === undefined) return null;
  if (!strengthFrom || typeof strengthFrom !== 'object' || !strengthSources.has(strengthFrom.kind)) return 'strengthFrom doit déclarer une source de force connue.';
  if (strengthFrom.kind.startsWith('characteristic') && (typeof strengthFrom.characteristic !== 'string' || !strengthFrom.characteristic)) return 'strengthFrom exige characteristic.';
  return null;
}

export const effectHandlers = Object.freeze({ ...coreHandlers, ...damageHandlers, ...conditionHandlers, ...gearHandlers, ...testsHandlers, ...summonHandlers });
for (const type of effectTypes) if (!effectHandlers[type]) throw new Error(`Type d'effet divin sans gestionnaire : ${type}.`);
for (const type of Object.keys(effectHandlers)) if (!effectTypes.has(type)) throw new Error(`Gestionnaire d'effet divin hors grammaire : ${type}.`);

export const effectHandler = type => Object.hasOwn(effectHandlers, type) ? effectHandlers[type] : null;
export const isLayerlessEffect = effect => effectHandler(effect?.type)?.layerless === true;
/** Tous les effets du contrat sont portés par le prêtre et se passent de cible désignée (invocations, capteurs). */
export const hasImplicitCasterTarget = contract => Array.isArray(contract?.effects) && contract.effects.length > 0
  && contract.effects.every(effect => (effect.appliesTo === 'caster' || effect.casterOnly === true) && effectHandler(effect.type)?.implicitTarget === true);

/** Progression `perSuccessLevels` : {every, add, field = 'level'} (entiers, `field` dans la grammaire). */
export function progressionError(progression) {
  if (progression === undefined) return null;
  if (!progression || typeof progression !== 'object' || !Number.isSafeInteger(progression.every) || progression.every < 1 || !Number.isSafeInteger(progression.add))
    return 'perSuccessLevels doit déclarer every (entier positif) et add (entier).';
  if (progression.field !== undefined && !progressionFields.has(progression.field)) return `perSuccessLevels.field doit être l’un de ${[...progressionFields].join(', ')}.`;
  return null;
}

/** Contrôle générateur d'un effet de contrat : message d'erreur ou null. */
export function validateEffect(effect) {
  if (!effect || typeof effect !== 'object' || !effectHandler(effect.type)) return `type d’effet non pris en charge par le moteur (attendu : ${[...effectTypes].join(', ')}).`;
  return effectHandler(effect.type).validate?.(effect) ?? progressionError(effect.perSuccessLevels) ?? scopeError(effect) ?? durationError(effect.duration);
}

/** `appliesTo` : 'caster' ou 'targets'. */
function scopeError(effect) {
  return effect.appliesTo === undefined || ['caster', 'targets'].includes(effect.appliesTo) ? null : 'appliesTo doit valoir caster ou targets.';
}

/** Durée numérique résolue par le moteur : {base?: entier, fromSuccessLevels?: true, unit} (sans value). */
function durationError(duration) {
  if (!duration || typeof duration !== 'object' || duration.value !== undefined || (duration.base === undefined && duration.fromSuccessLevels === undefined)) return null;
  if (duration.base !== undefined && !Number.isSafeInteger(duration.base)) return 'duration.base doit être un entier.';
  if (duration.fromSuccessLevels !== undefined && duration.fromSuccessLevels !== true) return 'duration.fromSuccessLevels ne peut valoir que true.';
  return duration.unit === undefined || ['rounds', 'minutes', 'hours', 'days'].includes(duration.unit) ? null : 'duration.unit doit être rounds, minutes, hours ou days.';
}

/** Faits manquants avant d'appliquer un effet (type inconnu compris). */
export function effectNeeds(effect, ctx = {}) {
  if (!effect || typeof effect !== 'object' || typeof effect.type !== 'string') return [need('contract.effects', 'Effet divin structuré requis')];
  const handler = effectHandler(effect.type);
  if (!handler) return [need('contract.effects', `Effet ${effect.type} à raccorder ou arbitrer`)];
  return handler.needs?.(effect, ctx) ?? [];
}
