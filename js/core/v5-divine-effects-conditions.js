/**
 * Gestionnaires d'effet divins (T3) : retrait d'États, États posés à la fin d'un effet, Chance temporaire.
 * Registre : v5-divine-effect-handlers.js. Les verrous (`divineLock`) sont lus par recoverV5Condition (v5-effects.js).
 */
import { acquireV5Conditions, recoverV5Condition } from './v5-effects.js';

const clone = value => structuredClone(value);
const need = (field, label) => ({ field, label });
const positive = value => Number.isSafeInteger(value) && value >= 1;
const record = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Condition d'application `when: {fact, label}` (effet `condition`) : fait de cible tri-état saisi par le MJ (ex. « a échoué à son Test »).
// vrai : l'État est posé ; faux : la cible est ignorée (ni couche ni État) ; absent : l'aperçu est bloqué.
const FACT_NAME = /^[A-Za-z][A-Za-z0-9]*$/;
const whenFact = (effect, participant, input) => input?.facts?.targets?.[participant?.id]?.[effect.when.fact];
const whenScope = (effect, { targets = [], actor } = {}) => effect.appliesTo === 'caster' || effect.casterOnly === true ? [actor].filter(Boolean) : targets;

export function whenProblem(effect) {
  if (effect.when === undefined) return null;
  return record(effect.when) && FACT_NAME.test(effect.when.fact ?? '') && typeof effect.when.label === 'string' && effect.when.label.trim()
    ? null : 'condition : when doit déclarer fact (identifiant) et label.';
}
export function whenNeeds(effect, ctx = {}) {
  if (effect.when === undefined || whenProblem(effect)) return [];
  return whenScope(effect, ctx).filter(participant => typeof whenFact(effect, participant, ctx.input) !== 'boolean')
    .map(participant => need(`facts.targets.${participant.id}.${effect.when.fact}`, `${participant.name || participant.id} : ${effect.when.label}`));
}
export const whenApplies = (effect, participant, { input } = {}) => effect.when === undefined || whenFact(effect, participant, input) === true;
export function whenFactFields(effect) {
  if (effect.when === undefined || whenProblem(effect)) return [];
  const label = effect.when.label.trim();
  return [{ field: effect.when.fact, label: label[0].toUpperCase() + label.slice(1), help: label + '.', required: true }];
}

const removalAmount = effect => effect.amount === 'all' ? Number.MAX_SAFE_INTEGER : effect.amount ?? 1;
const removalChoice = (input, targetId) => input?.removals?.[targetId];

// Échéance en fin du prochain Tour de la cible, d'après l'ordre de combat ; null hors combat ou si la cible n'y figure pas.
function nextTurnExpiry(combat, targetId) {
  const order = Array.isArray(combat?.order) ? combat.order : [];
  const current = order.indexOf(combat?.currentActorId), target = order.indexOf(targetId);
  if (current < 0 || target < 0 || !Number.isSafeInteger(combat?.round)) return null;
  return { phase: 'endOfTurn', round: combat.round + (target > current ? 0 : 1), actorId: targetId, moment: 'afterEffects' };
}

function removalProblem(effect) {
  if (Boolean(effect.key) === Boolean(effect.chosen)) return 'remove-condition exige key ou chosen (l’un des deux).';
  if (effect.amount !== undefined && effect.amount !== 'all' && !positive(effect.amount)) return 'remove-condition : amount doit valoir « all » ou un entier positif.';
  if (effect.excludeKeys !== undefined && (!effect.chosen || !Array.isArray(effect.excludeKeys) || !effect.excludeKeys.every(key => typeof key === 'string' && key)))
    return 'remove-condition : excludeKeys exige chosen et une liste de clés d’État.';
  const rested = effect.onAllRemoved;
  if (rested !== undefined && (!record(rested?.testModifiers) || !Object.values(rested.testModifiers).every(Number.isFinite)))
    return 'remove-condition : onAllRemoved exige des testModifiers numériques.';
  return null;
}

const removeCondition = {
  validate: removalProblem,
  needs(effect, { targets = [], input } = {}) {
    const problem = removalProblem(effect);
    if (problem) return [need('contract.effects.removal', problem)];
    if (!effect.chosen) return [];
    const needs = [];
    for (const target of targets) {
      if (!(target?.states || []).length) continue;
      const choice = removalChoice(input, target.id), field = `removals.${target.id}.stateId`;
      if (choice?.none === true) continue;
      if (typeof choice?.stateId !== 'string') { needs.push(need(field, `État retiré chez ${target.name || target.id}`)); continue; }
      if (!target.states.some(state => state.id === choice.stateId)) { needs.push(need(field, `État introuvable chez ${target.name || target.id}`)); continue; }
      if ((effect.excludeKeys || []).includes(target.states.find(state => state.id === choice.stateId).key)) { needs.push(need(field, `État exclu chez ${target.name || target.id} : en choisir un autre`)); continue; }
      const dry = recoverV5Condition(target, choice.stateId, { method: 'divine-removal', amount: removalAmount(effect) });
      if (!dry.removed.length) needs.push(need(field, `État verrouillé ou non récupérable chez ${target.name || target.id} : en choisir un autre`));
    }
    return needs;
  },
  applyInstant(participant, effect, { contract, executionId, targetId, input, combat }) {
    const choice = removalChoice(input, targetId);
    if (effect.chosen && (choice?.none === true || !(participant.states || []).length)) return { removed: [], remaining: (participant.states || []).length };
    if (effect.chosen && (effect.excludeKeys || []).includes((participant.states || []).find(row => row.id === choice?.stateId)?.key)) return { removed: [], remaining: (participant.states || []).length };
    const names = new Map((participant.states || []).map(row => [row.id, row.name || row.key]));
    const receipt = recoverV5Condition(participant, effect.chosen ? choice.stateId : effect.key, { method: 'divine-removal', amount: removalAmount(effect) });
    Object.assign(participant, receipt.participant);
    const result = { removed: clone(receipt.removed), removedNames: receipt.removed.map(row => names.get(row.id) || row.key), remaining: (participant.states || []).length };
    if (receipt.reminders.length) result.reminders = clone(receipt.reminders);
    // Dernier État retiré : la couche de repos (ex. +1 DR) n'existe que si le Tour suivant de la cible est calculable.
    if (effect.onAllRemoved && receipt.removed.length && !result.remaining) {
      const expiry = nextTurnExpiry(combat, participant.id);
      if (!expiry) result.restedReminder = 'Tous les États sont retirés : le bonus du prochain Tour est à appliquer à la main (Tour de la cible non calculable).';
      else {
        const layer = { id: `${executionId}:${participant.id}:${contract.id}:rested`, executionId, prayerId: contract.id, casterId: input?.actorId ?? null, targetId: participant.id,
          source: clone(contract.source), sourceReceipt: clone(contract.sourceReceipt), type: effect.type, expiry, testModifiers: clone(effect.onAllRemoved.testModifiers) };
        participant.extensions ||= {}; participant.extensions.v5 ||= {};
        participant.extensions.v5.divineEffects = [...(participant.extensions.v5.divineEffects || []), layer];
        result.rested = { layerId: layer.id, expiry: clone(expiry) };
      }
    }
    return result;
  },
  receipt: (effect, { targetId, targetName, actor }, result) => ({ targetId, type: effect.type, result: clone(result),
    log: `${actor?.name || 'Le prêtre'} · ${targetName || targetId} : ${result.removed.length ? 'État(s) retiré(s) : ' + result.removed.map((row, index) => `${result.removedNames?.[index] || row.key}${row.level > 1 ? ' ×' + row.level : ''}`).join(', ') : 'aucun État retiré'}` })
};

function expiryConditionsProblem(effect) {
  if (!Array.isArray(effect.conditions) || !effect.conditions.length) return 'expiry-condition exige conditions.';
  return effect.conditions.every(row => record(row) && (typeof row.key === 'string' && row.key) && positive(row.level ?? 1) && positive(row.rounds))
    ? null : 'expiry-condition : chaque État exige key, level (entier positif) et rounds (entier positif).';
}

// États posés à la fin de l'effet : la couche porte `conditionsOnExpiry`, onExpire les acquiert (v5-divine-engine.js, expireDivineEffects).
const expiryCondition = {
  validate: expiryConditionsProblem,
  needs: effect => expiryConditionsProblem(effect) ? [need('contract.effects.conditions', 'États de fin d’effet sourcés requis')] : [],
  buildLayer: effect => ({ conditionsOnExpiry: clone(effect.conditions) }),
  onExpire(participant, layer, transition) {
    if (!Array.isArray(layer.conditionsOnExpiry) || !layer.conditionsOnExpiry.length || !Number.isSafeInteger(transition?.round)) return;
    for (const [index, condition] of layer.conditionsOnExpiry.entries()) {
      const beforeIds = new Set((participant.states || []).map(row => row.id));
      const acquired = acquireV5Conditions(participant, [{ name: condition.key, level: condition.level ?? 1, source: { kind: 'divine', prayerId: layer.prayerId, executionId: layer.executionId } }], { round: transition.round });
      Object.assign(participant, acquired.participant);
      const id = `${layer.id}:after:${index}`;
      const added = (participant.states || []).filter(row => !beforeIds.has(row.id));
      if (!added.length) continue;
      added.forEach((row, stateIndex) => { row.id = `${id}:${stateIndex}`; row.divineEffectId = id; row.divineExecutionId = layer.executionId; });
      // L'État suit sa propre couche : durée en Rounds depuis la fin de l'effet, retrait à l'échéance ou à la fin de la prière.
      participant.extensions.v5.divineEffects = [...(participant.extensions.v5.divineEffects || []), {
        id, executionId: layer.executionId, prayerId: layer.prayerId, casterId: layer.casterId, targetId: layer.targetId,
        source: clone(layer.source), sourceReceipt: clone(layer.sourceReceipt), type: layer.type,
        expiry: { phase: 'endOfRound', round: transition.round + condition.rounds, moment: 'afterEffects' }, conditionStateIds: added.map(row => row.id) }];
    }
  }
};

// Larmes de Shallya : retire du registre (extensions.v5.criticalWounds) les Blessures Critiques choisies ;
// les États liés restent sauf demande explicite du MJ. Instant, sans couche ; count = 1, +1 par tranche de +2 DR (moteur).
// Le plafond dépend des DR : il n'est vérifiable qu'au crochet `resolve`, après la progression par DR.
const CRITICAL_HEAL_SLOTS = ['first', 'second', 'third'];
const HEAL_CRITICAL_REMINDERS = Object.freeze([
  'Prière de (10 − Bonus de Sociabilité) Rounds avant l’effet ; interrompue, aucun effet.',
  'Ne rattache pas les membres amputés.'
]);
const criticalRecords = participant => (participant?.extensions?.v5?.criticalWounds || []).filter(row => typeof row?.id === 'string' && row.id);
const chosenHeals = (input, targetId) => CRITICAL_HEAL_SLOTS.map(slot => input?.criticalHeals?.[slot]?.[targetId]).filter(id => typeof id === 'string' && id);
const healCritical = {
  layerless: true,
  validate: effect => positive(effect.count) ? null : 'heal-critical exige count (entier positif).',
  needs(effect, { targets = [], input } = {}) {
    if (!positive(effect.count)) return [need('contract.effects.count', 'Nombre de Blessures Critiques guéries sourcé requis')];
    const needs = [];
    for (const target of targets) {
      const records = criticalRecords(target);
      if (!records.length) continue;
      const label = target.name || target.id, chosen = chosenHeals(input, target.id);
      if (!chosen.length) { needs.push(need(`criticalHeals.first.${target.id}`, `Blessure Critique guérie chez ${label} : en choisir au moins une`)); continue; }
      if (chosen.some(id => !records.some(row => row.id === id))) { needs.push(need(`criticalHeals.first.${target.id}`, `Blessure Critique introuvable chez ${label} : choisir une Blessure du registre`)); continue; }
      if (new Set(chosen).size !== chosen.length) { needs.push(need(`criticalHeals.second.${target.id}`, `Blessures Critiques guéries distinctes chez ${label} : la même ne peut l’être deux fois`)); }
    }
    return needs;
  },
  resolve(effect, { targets = [], input } = {}) {
    for (const target of targets) {
      const chosen = chosenHeals(input, target.id);
      if (chosen.length && chosen.length > effect.count)
        return { error: `Plus de Blessures Critiques choisies que guéries chez ${target.name || target.id}.`,
          needs: [need(`criticalHeals.third.${target.id}`, `Plus de Blessures Critiques choisies que guéries (${effect.count} au total, +1 par tranche de +2 DR) chez ${target.name || target.id}`)] };
    }
    return effect;
  },
  inputFields(effect, { targets = [] } = {}) {
    const fields = [{ path: 'criticalHealStates', label: 'Retirer aussi les États liés aux Blessures Critiques guéries', kind: 'boolean', scope: 'target' }];
    for (const target of targets) {
      const options = [['', 'Aucune'], ...criticalRecords(target).map(row => [row.id, `${row.name} (${row.location}, Round ${row.round})`])];
      for (const [index, slot] of CRITICAL_HEAL_SLOTS.entries())
        fields.push({ path: `criticalHeals.${slot}`, label: `Blessure Critique guérie n° ${index + 1}/3 (selon les DR)`, kind: 'select', scope: 'target', options });
    }
    return fields;
  },
  applyInstant(participant, effect, { input, targetId } = {}) {
    const chosen = chosenHeals(input, targetId ?? participant.id);
    const wounds = criticalRecords(participant), healed = wounds.filter(row => chosen.includes(row.id));
    const removedStates = [], stateReminders = [];
    if (input?.criticalHealStates?.[targetId ?? participant.id] === true) {
      for (const id of new Set(healed.flatMap(row => row.stateIds || []))) {
        const state = (participant.states || []).find(row => row.id === id);
        if (!state) continue;
        const recovery = recoverV5Condition(participant, id, { method: 'divine-removal', amount: Number.MAX_SAFE_INTEGER });
        Object.assign(participant, recovery.participant);
        removedStates.push(...recovery.removed.map(row => ({ ...row, name: state.name || state.key })));
        stateReminders.push(...recovery.reminders);
      }
    }
    if (healed.length) {
      participant.extensions ||= {}; participant.extensions.v5 ||= {};
      participant.extensions.v5.criticalWounds = wounds.filter(row => !chosen.includes(row.id));
    }
    return { healedIds: healed.map(row => row.id), healed: healed.map(row => row.name), remaining: healed.length ? participant.extensions.v5.criticalWounds.length : wounds.length,
      removedStates, reminders: [...HEAL_CRITICAL_REMINDERS, ...stateReminders] };
  },
  receipt: (effect, { targetId, targetName, actor }, result) => ({ targetId, type: effect.type, result: clone(result),
    log: `${actor?.name || 'Le prêtre'} · ${targetName || targetId} : ${result.healed.length ? 'Blessure(s) Critique(s) guérie(s) : ' + result.healed.join(', ') : 'aucune Blessure Critique guérie'}` })
};

const temporaryFortune = {
  validate: effect => positive(effect.count) ? null : 'temporary-fortune exige count (entier positif).',
  needs: effect => positive(effect.count) ? [] : [need('contract.effects.count', 'Points de Chance temporaires sourcés requis')],
  buildLayer: effect => ({ tempFortunePoints: effect.count, remainingTempFortune: effect.count })
};

// Relance gratuite (Bénédiction de Chance) : la couche porte un compteur imbriqué, consommé par la résolution (v5-store-action.js).
// Écraser les faibles (Ulric) : relance d'attaque une fois par Round, compteur rechargé à chaque Round au lieu d'être décrémenté.
const freeReroll = {
  validate: effect => typeof effect.perRound === 'boolean' || effect.perRound === undefined
    ? (typeof effect.attacksOnly === 'boolean' || effect.attacksOnly === undefined ? null : 'free-reroll exige attacksOnly (booléen).')
    : 'free-reroll exige perRound (booléen).',
  buildLayer: effect => ({ freeReroll: { remaining: 1, ...(effect.perRound ? { perRound: true } : {}), ...(effect.attacksOnly ? { attacksOnly: true } : {}) } })
};
export const FREE_REROLL_SOURCE = 'divine-free-reroll';
export const freeRerollLayers = (participant, { round, attack } = {}) => (participant?.extensions?.v5?.divineEffects || []).filter(layer => {
  if (layer?.type !== 'free-reroll' || !layer.freeReroll) return false;
  if (layer.freeReroll.attacksOnly && attack !== true) return false;
  return layer.freeReroll.perRound ? layer.freeReroll.usedRound !== round : layer.freeReroll.remaining > 0;
});
export function consumeFreeReroll(participant, { round, attack } = {}) {
  // La relance rechargée chaque Round passe avant la relance unique (Chance), pour ne pas gaspiller cette dernière.
  const layers = freeRerollLayers(participant, { round, attack }), layer = layers.find(row => row.freeReroll.perRound) || layers[0];
  if (!layer) return false;
  layer.freeReroll = layer.freeReroll.perRound
    ? { ...layer.freeReroll, usedRound: round }
    : { ...layer.freeReroll, remaining: layer.freeReroll.remaining - 1 };
  return true;
}

export const REVERSE_DICE_SOURCE = 'divine-reverse-dice';
const reverseDice = {
  validate: () => null,
  buildLayer: () => ({ reverseDice: { remaining: 1 } })
};
export const reverseDiceLayers = participant => (participant?.extensions?.v5?.divineEffects || []).filter(layer => layer?.type === 'reverse-dice' && layer.reverseDice?.remaining > 0);
export function consumeReverseDice(participant) {
  const layer = reverseDiceLayers(participant)[0];
  if (!layer) return false;
  layer.reverseDice = { ...layer.reverseDice, remaining: layer.reverseDice.remaining - 1 };
  return true;
}
export default { 'remove-condition': removeCondition, 'expiry-condition': expiryCondition, 'heal-critical': healCritical, 'temporary-fortune': temporaryFortune, 'free-reroll': freeReroll, 'reverse-dice': reverseDice };
