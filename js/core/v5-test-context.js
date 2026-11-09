import { normalizeState } from './effects.js';
import { resolveV5TestModifiers, finalizeV5TestModifiers } from './v5-test-modifiers.js';

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

/** Identifiants des Désavantages d'États du contexte de Test (`condition:<clé>:<n>`), à partir de ceux du combat. */
const contextDisadvantageId = id => id === 'prone' ? 'condition:aterre:1' : id === 'besmirched' ? 'condition:souille:1'
  : /^blinded-\d+$/.test(id) ? `condition:aveugle:${Number(id.slice(8)) + 1}` : id;

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
  // MJ 09/11 CA14 : seul Surpris dépend de l'Action ; Inconscient interdit tout Test.
  if (levels.surpris) {
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
  // Q6 T1 (MJ 06/11 Q19) : le calcul commun du combat (`resolveV5TestModifiers`, v5-test-modifiers.js) sur les États reconnus ici
  // (alias, niveaux non cumulables) et les réponses ci-dessus ; mêmes exceptions : Endurance de l'anachorète, ignoreFatiguePenalties
  // (Exténué), Clarté d'esprit (Sonné), talents `ignoreConditionPenalty`. Le choix DR ou Désavantage reste arbitré ici (DIV-05,
  // motif exigé) : le calcul commun rend la pénalité et le Désavantage bruts. Il rend aussi les talents génériques du Test
  // (`talents`), que seuls les appelants qui les branchent ajoutent (Prière, Résistance au Courroux : Q6 T1).
  const skill = typeof context.skill === 'string' ? context.skill : '';
  const common = resolveV5TestModifiers(isRecord(actor) ? actor : {}, { characteristic, skill, kind: 'test', levels: new Map(Object.entries(levels)),
    action: { type: 'test', attr: characteristic, label: skill, base: 0, qualities: [], ...(typeof context.skillId === 'string' ? { extensions: { fiche: { skillId: context.skillId } } } : {}) } },
    { ...(isRecord(context.talentContext) ? context.talentContext : {}), involvesMovement: movement, runningOrHiding,
      // Deux yeux perdus (séquelle, CA13) : la réponse de l'appelant sur la vue vaut aussi hors Aveuglé.
      requiresSight: requiresSight ?? (typeof context.requiresSight === 'boolean' ? context.requiresSight : null),
      reliesOnSight: reliesOnSight ?? (typeof context.reliesOnSight === 'boolean' ? context.reliesOnSight : null), usesFellowship,
      festeringWounds: context.festeringWounds, conditionPenaltyMode: undefined });
  const conditionPenalty = common.parts.conditions.penaltyEffects;
  const slPenalty = conditionPenalty.penalty;
  // Désavantages d'un seul État, le plus fort ; à égalité, le premier dans l'ordre À terre, Aveuglé, Souillé.
  const worstDisadvantage = common.parts.conditions.disadvantageRows.map(row => ({ ...row, id: contextDisadvantageId(row.id) }));
  const talentPart = common.parts.talents;
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

  // MJ 09/11 CA13 : séquelles durables du calcul commun (lignes `durable`, qu'aucun plafond n'efface) ; la Caractéristique perdue
  // est rendue en `scoreDelta`, à ajouter au score du Test. Deux yeux perdus : la question de la vue, si l'appelant ne l'a pas tranchée.
  slModifiers.push(...common.slModifiers.filter(row => row.durable));
  advantageSources.push(...common.advantageSources.filter(row => row.durable));
  disadvantageSources.push(...common.disadvantageSources.filter(row => row.durable));
  if (common.parts.sequelae.unresolved.includes('Séquelle : préciser si le Test est influencé par la vue.'))
    addNeed(needsInput, seenNeeds, 'reliesOnSight', 'Préciser si la tâche repose fortement sur la vue.');
  // MJ 09/11 CA22 : circonstance d'une séquelle (zone, parole, deux mains…) demandée au MJ ; réponse dans `talentContext`.
  for (const row of common.parts.sequelae.questions || []) addNeed(needsInput, seenNeeds, row.field, row.label);
  restrictions.push(...common.parts.sequelae.restrictions);
  if (levels.aveugle && requiresSight === true) restrictions.push('Aveuglé : cette tâche exige strictement la vue.');
  if (isAction === true && levels.surpris) restrictions.push('Surpris : aucune Action ne peut être entreprise.');
  // MJ 09/11 CA14 : Inconscient, aucun Test, Action ou non ; CA21 : sauf un Test subi (`passive`, Résistance au Courroux…).
  if (levels.inconscient && context.passive !== true) restrictions.push(context.isAction === true ? 'Inconscient : aucune Action ne peut être entreprise.' : 'Inconscient : aucun Test ne peut être tenté.');

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
    arbitration,
    scoreDelta: common.scoreDelta || 0,
    talents: { slModifiers: talentPart.slModifiers, advantageSources: talentPart.advantageSources, disadvantageSources: talentPart.disadvantageSources,
      ignoreNegative: talentPart.ignoreNegative, forceSuccess: talentPart.forceSuccess, unresolved: talentPart.unresolved }
  };
}

/**
 * Q6 T1 : ajoute aux listes d'un Test les talents génériques rendus par `resolveV5ConditionTestContext` (`result.talents`), puis
 * applique les plafonds de fin de calcul (Distrait, Obstiné V5 p. 127) sur la liste complète, comme au combat. Les lignes sont
 * recopiées : le résultat du contexte n'est pas modifié.
 */
export function withV5TestTalents(actor, result, { slModifiers = [], advantageSources = [], disadvantageSources = [] } = {}) {
  const talents = result?.talents || {};
  const lists = { slModifiers: [...slModifiers, ...(talents.slModifiers || [])].map(row => ({ ...row })),
    advantageSources: [...advantageSources, ...(talents.advantageSources || [])], disadvantageSources: [...disadvantageSources, ...(talents.disadvantageSources || [])] };
  finalizeV5TestModifiers(actor, { ignoreNegative: talents.ignoreNegative === true }, lists);
  return lists;
}
