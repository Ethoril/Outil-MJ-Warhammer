/**
 * Gestionnaires d'effet divins (T3) : retrait d'États, États posés à la fin d'un effet, Chance temporaire.
 * Registre : v5-divine-effect-handlers.js. Les verrous (`divineLock`) sont lus par recoverV5Condition (v5-effects.js).
 */
import { acquireV5Conditions, recoverV5Condition } from './v5-effects.js';

const clone = value => structuredClone(value);
const need = (field, label) => ({ field, label });
const positive = value => Number.isSafeInteger(value) && value >= 1;
const record = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

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
      const dry = recoverV5Condition(target, choice.stateId, { method: 'divine-removal', amount: removalAmount(effect) });
      if (!dry.removed.length) needs.push(need(field, `État verrouillé ou non récupérable chez ${target.name || target.id} : en choisir un autre`));
    }
    return needs;
  },
  applyInstant(participant, effect, { contract, executionId, targetId, input, combat }) {
    const choice = removalChoice(input, targetId);
    if (effect.chosen && (choice?.none === true || !(participant.states || []).length)) return { removed: [], remaining: (participant.states || []).length };
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

const temporaryFortune = {
  validate: effect => positive(effect.count) ? null : 'temporary-fortune exige count (entier positif).',
  needs: effect => positive(effect.count) ? [] : [need('contract.effects.count', 'Points de Chance temporaires sourcés requis')],
  buildLayer: effect => ({ tempFortunePoints: effect.count, remainingTempFortune: effect.count })
};

export default { 'remove-condition': removeCondition, 'expiry-condition': expiryCondition, 'temporary-fortune': temporaryFortune };
