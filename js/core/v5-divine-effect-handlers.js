/**
 * Registre des types d'effet divins : {type -> {validate, needs, buildLayer, applyInstant, receipt}}.
 * - validate(effect) -> message d'erreur | null : contrôle du contrat à la génération.
 * - needs(effect, {targets}) -> [{field,label}] : faits manquants avant l'aperçu.
 * - buildLayer(effect, ctx) -> champs ajoutés à la couche active (absent ou `layerless` : pas de couche).
 * - applyInstant(participant, effect, ctx) : mutation du participant à l'application ; retourne un résultat.
 * - receipt(effect, ctx, result) -> ligne de reçu | null.
 * Les types d'effet des tâches suivantes s'ajoutent dans les modules -damage, -conditions et -gear.
 */
import { healV5Wounds, acquireV5Conditions } from './v5-effects.js';
import { knownMovement } from './v5-magic-effects.js';
import { effectTypes, strengthSources, progressionFields } from './v5-divine-grammar.js';
import damageHandlers from './v5-divine-effects-damage.js';
import conditionHandlers from './v5-divine-effects-conditions.js';
import gearHandlers from './v5-divine-effects-gear.js';

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
      return strengthError(effect.strengthFrom);
    },
    needs(effect) {
      const needs = [];
      if (!effect.key && !effect.name) needs.push(need('contract.effects.condition', 'État sourcé requis'));
      if (strengthError(effect.strengthFrom)) needs.push(need('contract.effects.strengthFrom', 'Source de la force de l’État valide requise'));
      return needs;
    },
    buildLayer: effect => ({ conditions: [{ key: effect.key || effect.name, level: effect.level ?? 1 }] }),
    // Acquiert l'État sur la cible et le rattache à sa couche pour que la fin de l'effet le retire.
    applyInstant(participant, effect, { contract, executionId, index, layer, expiry, round }) {
      const beforeIds = new Set((participant.states || []).map(row => row.id));
      const acquired = acquireV5Conditions(participant, [{ name: effect.key || effect.name, level: effect.level ?? 1,
        source: { kind: 'divine', prayerId: contract.id, executionId } }], { round: expiry?.round ?? round });
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
        participant.states = (participant.states || []).map(row => ids.includes(row.id) ? { ...row, divineEffectId: layer.id, divineExecutionId: executionId } : row);
      }
      return null;
    }
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

export const effectHandlers = Object.freeze({ ...coreHandlers, ...damageHandlers, ...conditionHandlers, ...gearHandlers });
for (const type of effectTypes) if (!effectHandlers[type]) throw new Error(`Type d'effet divin sans gestionnaire : ${type}.`);
for (const type of Object.keys(effectHandlers)) if (!effectTypes.has(type)) throw new Error(`Gestionnaire d'effet divin hors grammaire : ${type}.`);

export const effectHandler = type => Object.hasOwn(effectHandlers, type) ? effectHandlers[type] : null;
export const isLayerlessEffect = effect => effectHandler(effect?.type)?.layerless === true;

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
  return effectHandler(effect.type).validate?.(effect) ?? progressionError(effect.perSuccessLevels);
}

/** Faits manquants avant d'appliquer un effet (type inconnu compris). */
export function effectNeeds(effect, ctx = {}) {
  if (!effect || typeof effect !== 'object' || typeof effect.type !== 'string') return [need('contract.effects', 'Effet divin structuré requis')];
  const handler = effectHandler(effect.type);
  if (!handler) return [need('contract.effects', `Effet ${effect.type} à raccorder ou arbitrer`)];
  return handler.needs?.(effect, ctx) ?? [];
}
