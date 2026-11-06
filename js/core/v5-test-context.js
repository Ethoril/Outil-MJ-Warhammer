import { normalizeState } from './effects.js';
import { conditionPenaltyEffects, conditionDisadvantageEffects, conditionTestRules, conditionDisadvantageRows } from './condition-effects.js';
import { conditionPenaltyIgnores } from './v5-talents.js';

const CHARACTERISTICS = new Set(['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc', 'M']);
const TALENT_MARKERS = new Set(['talent-active', 'talent-pending']);
const NON_STACKING = new Set(['aterre', 'souille', 'surpris', 'inconscient']);

const fold = value => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '');

const ALIASES = new Map();
const alias = (key, ...names) => names.forEach(name => ALIASES.set(fold(name), key));
alias('enflamme', 'Ablaze', 'Enflammé', 'Enflammée');
alias('souille', 'Besmirched', 'Souillé', 'Souillée');
alias('hemorragique', 'Bleeding', 'Hémorragique');
alias('aveugle', 'Blinded', 'Aveuglé', 'Aveuglée');
alias('brise', 'Broken', 'Brisé', 'Brisée');
alias('assourdi', 'Deafened', 'Assourdi', 'Assourdie');
alias('enchevetre', 'Entangled', 'Enchevêtré', 'Enchevêtrée');
alias('extenue', 'Fatigued', 'Exténué', 'Exténuée');
alias('empoisonne', 'Poisoned', 'Empoisonné', 'Empoisonnée');
alias('aterre', 'Prone', 'À terre', 'A terre', 'A-terre');
alias('sonne', 'Stunned', 'Sonné', 'Sonnée');
alias('surpris', 'Surprised', 'Surpris', 'Surprise');
alias('inconscient', 'Unconscious', 'Inconscient', 'Inconsciente');

const STATE_LABELS = Object.freeze({
  enflamme: 'Enflammé', souille: 'Souillé', hemorragique: 'Hémorragique',
  aveugle: 'Aveuglé', brise: 'Brisé', assourdi: 'Assourdi',
  enchevetre: 'Enchevêtré', extenue: 'Exténué', empoisonne: 'Empoisonné',
  aterre: 'À terre', sonne: 'Sonné', surpris: 'Surpris', inconscient: 'Inconscient'
});

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function canonicalState(raw, normalized) {
  const name = normalized.name;
  const fromName = ALIASES.get(fold(name));
  const fromKey = typeof raw?.key === 'string' ? ALIASES.get(fold(raw.key)) : undefined;
  if (!fromName && !fromKey) return { error: `État non reconnu: ${name || '(sans nom)'}` };
  if (fromName && fromKey && fromName !== fromKey) return { error: `Alias contradictoires pour l’État ${name}` };
  return { key: fromKey || fromName };
}

function addNeed(needsInput, seen, field, label) {
  if (seen.has(field)) return;
  seen.add(field);
  needsInput.push({ field, label });
}

function resolveCharacteristic(context, needsInput, seen) {
  if (typeof context.characteristic !== 'string' || !CHARACTERISTICS.has(context.characteristic)) {
    addNeed(needsInput, seen, 'characteristic', 'Choisir la caractéristique testée.');
    return null;
  }
  return context.characteristic;
}

/**
 * Resolve only condition-derived context for a V5 Test. This pure function
 * does not roll, mutate actor/context, consume resources, or advance a clock.
 */
export function resolveV5ConditionTestContext(actor, context = {}) {
  const slModifiers = [];
  const advantageSources = [];
  const disadvantageSources = [];
  const ignoredPenaltySources = [];
  const restrictions = [];
  const needsInput = [];
  const seenNeeds = new Set();
  const levels = {};
  let arbitration = null;

  if (!isRecord(actor)) addNeed(needsInput, seenNeeds, 'actor', 'Fournir le sujet du Test.');
  if (!isRecord(context)) context = {};
  const characteristic = resolveCharacteristic(context, needsInput, seenNeeds);
  for (const [field, label] of [
    ['isAction', 'Préciser si ce Test résout une Action.'],
    ['involvesMovement', 'Préciser si le Test implique un mouvement.'],
    ['runningOrHiding', 'Préciser si le Test sert à courir/fuir ou à se cacher.'],
    ['requiresSight', 'Préciser si la tâche exige strictement la vue.'],
    ['reliesOnSight', 'Préciser si la tâche repose fortement sur la vue.']
  ]) {
    if (hasOwn(context, field) && typeof context[field] !== 'boolean') {
      addNeed(needsInput, seenNeeds, field, label);
    }
  }
  const states = actor?.states === undefined ? [] : actor.states;
  if (!Array.isArray(states)) {
    addNeed(needsInput, seenNeeds, 'states', 'La liste des États doit être valide.');
  } else {
    states.forEach((raw, index) => {
      if (isRecord(raw) && TALENT_MARKERS.has(raw.kind)) return;
      if (!isRecord(raw) && typeof raw !== 'string') {
        addNeed(needsInput, seenNeeds, `states.${index}`, 'État non valide; vérifier son identité.');
        return;
      }
      if (isRecord(raw) && hasOwn(raw, 'level') && (!Number.isSafeInteger(raw.level) || raw.level < 1)) {
        addNeed(needsInput, seenNeeds, `states.${index}.level`, 'Le niveau d’État doit être un entier positif.');
        return;
      }
      let state;
      try {
        state = normalizeState(raw, index);
      } catch {
        addNeed(needsInput, seenNeeds, `states.${index}`, 'État non valide; vérifier son identité.');
        return;
      }
      const normalized = canonicalState(raw, state);
      if (normalized.error) {
        addNeed(needsInput, seenNeeds, `states.${index}`, `${normalized.error}; vérifier la source de l’État.`);
        return;
      }
      const level = state.level;
      const key = normalized.key;
      const amount = NON_STACKING.has(key) ? 1 : level;
      levels[key] = NON_STACKING.has(key) ? Math.max(levels[key] || 0, amount) : (levels[key] || 0) + amount;
    });
  }

  // Endurance de l'anachorète (p. 226) : malus et Désavantages d'États ignorés, restrictions (Inconscient, Surpris, vue exigée) conservées.
  const ignoreConditions = actor?.extensions?.v5?.specialStates?.ignoreConditionPenalties === true;
  const movementKeys = ['aterre', 'enchevetre'];
  const needsBoolean = (field, label) => {
    if (typeof context[field] !== 'boolean') {
      addNeed(needsInput, seenNeeds, field, label);
      return null;
    }
    return context[field];
  };
  let movement = null;
  if (!ignoreConditions && movementKeys.some(key => levels[key])) {
    movement = needsBoolean('involvesMovement', 'Préciser si le Test implique un mouvement.');
  }
  let runningOrHiding = null;
  if (levels.brise && !ignoreConditions) {
    runningOrHiding = needsBoolean('runningOrHiding', 'Préciser si le Test sert à courir/fuir ou à se cacher.');
  }
  let requiresSight = null;
  let reliesOnSight = null;
  if (levels.aveugle) {
    requiresSight = needsBoolean('requiresSight', 'Préciser si la tâche exige strictement la vue.');
    if (requiresSight !== true && !ignoreConditions) reliesOnSight = needsBoolean('reliesOnSight', 'Préciser si la tâche repose fortement sur la vue.');
  }
  // Souillé : Désavantage aux Tests de Sociabilité, ou d'Endurance contre les Plaies purulentes ; sinon le MJ le précise, comme au combat.
  let usesFellowship = null;
  if (levels.souille && !ignoreConditions && characteristic !== 'Soc' && !(characteristic === 'E' && context.festeringWounds === true)) {
    usesFellowship = needsBoolean('usesFellowship', 'Préciser si le Test utilise la Sociabilité.');
  }
  let isAction = null;
  if (levels.surpris || levels.inconscient) {
    isAction = needsBoolean('isAction', 'Préciser si ce Test résout une Action.');
  }

  const mentalCharacteristic = ['Int', 'I', 'FM', 'Soc'].includes(characteristic);
  const clarityOfThought = actor?.extensions?.v5?.specialStates?.clarityOfThought === true;
  const clarityIgnoresStun = mentalCharacteristic && clarityOfThought && levels.sonne > 0;
  // MJ 06/11 : Clarté d'esprit efface Sonné, pas Exténué ; la pénalité d'Exténué reste sur un Test mental.
  if (clarityIgnoresStun) ignoredPenaltySources.push({
    id: 'clarity-of-thought:stunned',
    label: `Clarté d’esprit ignore le malus de Sonné pour un Test mental (${characteristic}); l’État reste actif.`,
    source: { document: 'Livre de base V5 EN v2', printedPage: 251, citation: 'Livre de base V5 EN v2, p. 251', rule: 'Clarity of Thought' }
  });
  if (ignoreConditions && ['sonne', 'extenue', 'empoisonne', 'brise', 'enchevetre', 'aterre', 'souille', 'aveugle'].some(key => levels[key])) ignoredPenaltySources.push({
    id: 'anchorite-endurance:conditions',
    label: 'Endurance de l’anachorète ignore les pénalités causées par les États; ils restent actifs.',
    source: { document: 'Livre de base V5 EN v2', printedPage: 226, citation: 'Livre de base V5 EN v2, p. 226', rule: 'Anchorite’s Endurance' }
  });
  // MJ 06/11 Q19 : le calcul d'États du combat pour ce Test (conditionTestRules, puis le moteur d'effets), mêmes exceptions :
  // Endurance de l'anachorète, ignoreFatiguePenalties (Exténué), Clarté de pensée (Sonné), talents `ignoreConditionPenalty`.
  const flags = actor?.extensions?.v5?.specialStates;
  const conditionRules = conditionTestRules(new Map(Object.entries(levels)), { kind: 'test', attr: characteristic, ignoreAll: ignoreConditions,
    context: { involvesMovement: movement, runningOrHiding, requiresSight, reliesOnSight, usesFellowship, festeringWounds: context.festeringWounds } });
  const conditionPenalty = conditionPenaltyEffects(conditionRules.relevant, { ignoreAll: ignoreConditions, ignoreFatigue: flags?.ignoreFatiguePenalties === true,
    ignoreStun: clarityIgnoresStun, talentIgnores: conditionPenaltyIgnores(actor) });
  const slPenalty = conditionPenalty.penalty;
  // Désavantages d'un seul État, le plus fort ; à égalité, le premier dans l'ordre À terre, Aveuglé, Souillé.
  const worstDisadvantage = conditionDisadvantageEffects(conditionDisadvantageRows(conditionRules.disadvantages, (key, index) => `condition:${key}:${index + 1}`));
  const hasSlPenalty = slPenalty > 0;
  const hasDisadvantage = worstDisadvantage.length > 0;
  const mode = context.conditionPenaltyMode;
  const reason = typeof context.conditionPenaltyReason === 'string' ? context.conditionPenaltyReason.trim() : '';

  if (hasSlPenalty && hasDisadvantage) {
    if (!['sl', 'disadvantage'].includes(mode)) {
      addNeed(needsInput, seenNeeds, 'conditionPenaltyMode', 'Arbitrer les pénalités d’État incomparables selon DIV-05.');
    }
    if (!reason) {
      addNeed(needsInput, seenNeeds, 'conditionPenaltyReason', 'Consigner le motif de l’arbitrage MJ DIV-05.');
    }
    if (['sl', 'disadvantage'].includes(mode) && reason) {
      arbitration = { decisionId: 'DIV-05', mode, reason };
    }
  }

  const applySl = !hasSlPenalty || !hasDisadvantage || mode === 'sl' && Boolean(reason);
  const applyDisadvantage = !hasSlPenalty || !hasDisadvantage || mode === 'disadvantage' && Boolean(reason);
  if (hasSlPenalty && applySl) {
    const label = [...conditionPenalty.levels].filter(([, level]) => level === slPenalty).map(([key]) => key).sort()
      .map(key => STATE_LABELS[key]).join(', ');
    slModifiers.push({ id: 'conditions:highest-sl', label: `Malus d’État maximal (${label})`, amount: -slPenalty });
  }
  if (hasDisadvantage && applyDisadvantage) {
    disadvantageSources.push(...worstDisadvantage);
  }

  if (levels.aveugle && requiresSight === true) restrictions.push('Aveuglé : cette tâche exige strictement la vue.');
  if (isAction === true && levels.surpris) restrictions.push('Surpris : aucune Action ne peut être entreprise.');
  if (isAction === true && levels.inconscient) restrictions.push('Inconscient : aucune Action ne peut être entreprise.');

  return {
    ready: needsInput.length === 0 && restrictions.length === 0,
    levels,
    slModifiers,
    advantageSources,
    disadvantageSources,
    ignoredPenaltySources,
    restrictions,
    needsInput,
    conditionPenaltyMode: hasSlPenalty && hasDisadvantage && ['sl', 'disadvantage'].includes(mode) ? mode : null,
    conditionPenaltyReason: hasSlPenalty && hasDisadvantage && reason ? reason : null,
    arbitration
  };
}
