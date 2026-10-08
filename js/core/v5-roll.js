/** Pure V5 test previews. No random draw, UI, Store or source-rule conversion. */
export const V5_TEST_RULE_VERSION = 'v5-test-2026-10-08.1';
const KINDS = new Set(['test', 'melee', 'ranged']);
const finite = (value, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${label} invalide`);
  return value;
};
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
export function normalizeV5Roll(value) {
  const roll = value === '00' ? 100 : value;
  if (!Number.isInteger(roll) || roll < 1 || roll > 100) throw new TypeError('Jet d100 invalide');
  return roll;
}
export function reverseV5Roll(value) {
  const roll = normalizeV5Roll(value);
  return roll === 100 ? 100 : (roll % 10) * 10 + Math.floor(roll / 10);
}
function sources(values, label) {
  if (!Array.isArray(values)) throw new TypeError(`${label} invalide`);
  const seen = new Set();
  return values.flatMap(source => {
    if (!source || typeof source.id !== 'string' || !source.id.trim()) throw new TypeError('Origine de modificateur invalide');
    if (seen.has(source.id)) return [];
    seen.add(source.id);
    return [{ id: source.id, label: typeof source.label === 'string' ? source.label : source.id }];
  });
}
export function summarizeV5Advantage({ advantageSources = [], disadvantageSources = [] } = {}) {
  const advantage = sources(advantageSources, 'Avantages');
  const disadvantage = sources(disadvantageSources, 'Désavantages');
  const net = advantage.length - disadvantage.length;
  return freeze({ advantage, disadvantage, cancelledPairs: Math.min(advantage.length, disadvantage.length), net,
    slModifier: Math.sign(net) * Math.max(0, Math.abs(net) - 1),
    inversion: net > 0 ? 'optionalFavourable' : net < 0 ? 'mandatoryUnfavourable' : 'none' });
}
function evaluate({ score, roll, modifiers, advantage, kind }) {
  const baseSl = Math.floor(score / 10) - Math.floor(roll / 10);
  const totalModifier = modifiers.reduce((sum, item) => sum + item.amount, 0) + advantage.slModifier;
  let sl = baseSl + totalModifier;
  let success = sl === 0 ? roll <= score : sl > 0;
  let automatic = null;
  if (roll <= 5) { automatic = 'success'; success = true; sl = Math.max(0, sl); }
  if (roll >= 96) { automatic = 'failure'; success = false; sl = Math.min(0, sl); }
  const beforeCriticalSl = sl;
  const doubled = roll === 100 || roll % 11 === 0;
  const critical = doubled && success;
  const fumble = doubled && !success;
  if (kind === 'test' && critical) sl = Math.max(5, sl);
  if (kind === 'test' && fumble) sl = Math.min(-5, sl);
  const zeroOutcome = sl === 0 ? (success ? 'marginalSuccess' : 'marginalFailure') : null;
  return { ruleVersion: V5_TEST_RULE_VERSION, roll, score, kind, success, sl, zeroOutcome, critical, fumble,
    details: { baseSl, modifiers: modifiers.map(item => ({ ...item })), advantageSl: advantage.slModifier,
      totalModifier, beforeCriticalSl, automatic, doubled } };
}
/** Retain both legal outcomes when favourable inversion is optional; caller must select explicitly. */
export function previewV5Test({ score, roll, kind = 'test', slModifiers = [], advantageSources = [], disadvantageSources = [] } = {}) {
  finite(score, 'Score');
  if (score < 0 || !Number.isInteger(score) || !KINDS.has(kind)) throw new TypeError('Contexte de test invalide');
  const initialRoll = normalizeV5Roll(roll);
  if (!Array.isArray(slModifiers)) throw new TypeError('Modificateurs de DR invalides');
  const modifierIds = new Set();
  const modifiers = slModifiers.map(item => {
    if (!item || typeof item.id !== 'string' || !item.id.trim()) throw new TypeError('Modificateur de DR sans origine');
    if (modifierIds.has(item.id)) throw new TypeError('Origine de modificateur de DR dupliquée');
    modifierIds.add(item.id);
    finite(item.amount, 'Modificateur de DR');
    if (!Number.isInteger(item.amount)) throw new TypeError('Modificateur de DR non entier');
    return { id: item.id, label: item.label || item.id, amount: item.amount };
  });
  const advantage = summarizeV5Advantage({ advantageSources, disadvantageSources });
  const reversed = reverseV5Roll(initialRoll);
  const make = (id, selectedRoll) => ({ id, reversed: id === 'reverse',
    result: evaluate({ score, roll: selectedRoll, modifiers, advantage, kind }) });
  let options = [make('keep', initialRoll)];
  if (advantage.net > 0 && reversed < initialRoll) options.push(make('reverse', reversed));
  if (advantage.net < 0 && reversed > initialRoll) options = [make('reverse', reversed)];
  return freeze({ ruleVersion: V5_TEST_RULE_VERSION, initialRoll, advantage, options, choiceRequired: options.length > 1,
    forcedInversion: advantage.net < 0 && reversed > initialRoll });
}
export function selectV5Test(preview, optionId) {
  if (preview?.ruleVersion !== V5_TEST_RULE_VERSION || !Array.isArray(preview.options)) throw new TypeError('Aperçu V5 invalide');
  const selected = preview.options.find(option => option.id === optionId);
  if (!selected) throw new TypeError('Choix de jet indisponible');
  return freeze({ ...structuredClone(selected.result), initialRoll: preview.initialRoll,
    optionId, reversed: selected.reversed, advantage: structuredClone(preview.advantage) });
}
/** V5 ties belong to the initiator, independently of each participant's own success. */
export function resolveV5Opposition(initiator, opponent) {
  finite(initiator?.sl, 'DR initiateur'); finite(opponent?.sl, 'DR adversaire');
  const netSl = initiator.sl - opponent.sl;
  return freeze({ winner: netSl >= 0 ? 'initiator' : 'opponent', netSl, tie: netSl === 0 });
}
