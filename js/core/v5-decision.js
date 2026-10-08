/** Presentation contract: compare consequences through the injected real pure action resolver. */
import { V5_TEST_RULE_VERSION, selectV5Test } from './v5-roll.js';
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export function buildV5RollDecision(preview, { evaluateOutcome, baseRevision } = {}) {
  if (preview?.ruleVersion !== V5_TEST_RULE_VERSION || typeof evaluateOutcome !== 'function'
    || !Number.isInteger(baseRevision) || baseRevision < 0) throw new TypeError('Contexte de décision invalide');
  const options = preview.options.map(option => {
    const test = selectV5Test(preview, option.id);
    const outcome = evaluateOutcome(test);
    if (!outcome || typeof outcome !== 'object' || !['complete', 'partial'].includes(outcome.certainty)) throw new TypeError('Certitude de résultat manquante');
    if (outcome.woundsLost != null && (typeof outcome.woundsLost !== 'number' || !Number.isFinite(outcome.woundsLost) || outcome.woundsLost < 0)) throw new TypeError('Blessures prévisionnelles invalides');
    if (outcome.location != null && typeof outcome.location !== 'string') throw new TypeError('Localisation invalide');
    if (typeof outcome.hit !== 'boolean') throw new TypeError('Résultat de touche manquant');
    return { id: option.id, label: option.reversed ? `Inverser en ${test.roll}` : `Conserver ${test.roll}`,
      summary: { roll: test.roll, sl: test.sl, success: test.success, hit: outcome.hit,
        location: outcome.location ?? null, woundsLost: outcome.woundsLost ?? null, certainty: outcome.certainty,
        costs: structuredClone(outcome.costs || []), importantEffects: structuredClone(outcome.importantEffects || []) },
      details: { test, action: structuredClone(outcome) } };
  });
  const comparable = options.length > 1 && options.every(option => option.summary.certainty === 'complete' && option.summary.woundsLost !== null);
  const greatest = comparable ? Math.max(...options.map(option => option.summary.woundsLost)) : null;
  const winners = comparable ? options.filter(option => option.summary.woundsLost === greatest) : [];
  const recommendation = winners.length === 1 ? { optionId: winners[0].id, criterion: 'knownWoundsLost', label: 'Plus de Blessures' } : null;
  return freeze({ ruleVersion: V5_TEST_RULE_VERSION, baseRevision, choiceRequired: preview.choiceRequired,
    forcedInversion: preview.forcedInversion, options, recommendation, equivalentKnownWounds: comparable && winners.length > 1,
    presentation: { detailsInitiallyCollapsed: true, confirmationRequired: true } });
}
export function selectV5Decision(decision, optionId, { currentRevision } = {}) {
  if (decision?.ruleVersion !== V5_TEST_RULE_VERSION || !Number.isInteger(currentRevision) || currentRevision !== decision.baseRevision) throw new TypeError('Aperçu de décision périmé');
  const selected = decision.options.find(option => option.id === optionId);
  if (!selected) throw new TypeError('Option de décision indisponible');
  return structuredClone({ ruleVersion: decision.ruleVersion, baseRevision: decision.baseRevision,
    optionId, result: selected.details, summary: selected.summary });
}
