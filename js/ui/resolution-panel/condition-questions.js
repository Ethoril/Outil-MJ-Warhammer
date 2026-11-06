// U8 Q19 : questions d'États posées au MJ pour un Test de magie (`preview.conditionNeeds`, produit par prepareMagicOptions).
// La réponse part dans `draft.magicConditionContext` (mêmes champs que le combat : involvesMovement, runningOrHiding, reliesOnSight,
// usesFellowship, conditionPenaltyMode) et le Test se recalcule. Sans réponse, ces États ne pèsent pas en magie.
import { node } from './dom.js';
import { CONDITION_QUESTIONS } from '../../core/condition-effects.js';

const MIXED_QUESTION = 'États de pénalités différentes : choisir les DR ou le Désavantage retenu par le MJ.';
const BOOLEAN_FIELDS = new Map([[CONDITION_QUESTIONS.movement, 'involvesMovement'], [CONDITION_QUESTIONS.escape, 'runningOrHiding'],
  [CONDITION_QUESTIONS.sight, 'reliesOnSight'], [CONDITION_QUESTIONS.fellowship, 'usesFellowship']]);

/** `[{ field, text, kind: 'boolean' | 'mode' }]` ; une question inconnue est ignorée. */
export function conditionQuestions(needs = []) {
  return needs.flatMap(text => BOOLEAN_FIELDS.has(text) ? [{ field: BOOLEAN_FIELDS.get(text), text, kind: 'boolean' }]
    : text === MIXED_QUESTION ? [{ field: 'conditionPenaltyMode', text, kind: 'mode' }] : []);
}

export function renderConditionQuestions(preview, draft, handlers) {
  const questions = conditionQuestions(preview?.conditionNeeds);
  if (!questions.length) return null;
  const box = node('div', 'workspace-condition-questions');
  const current = draft.magicConditionContext || {};
  for (const question of questions) {
    const label = node('label', 'workspace-type', question.text), select = document.createElement('select');
    select.setAttribute('aria-label', question.text);
    select.dataset.focusKey = `magic-condition-${question.field}`;
    if (question.kind === 'mode') select.append(new Option('À préciser', ''), new Option('Pénalité en DR', 'sl'), new Option('Désavantage', 'disadvantage'));
    else select.append(new Option('À préciser', ''), new Option('Oui', 'true'), new Option('Non', 'false'));
    select.value = current[question.field] == null ? '' : String(current[question.field]);
    select.addEventListener('change', () => {
      const value = select.value === '' ? undefined : question.kind === 'mode' ? select.value : select.value === 'true';
      handlers.select({ magicConditionContext: { ...current, [question.field]: value } });
      handlers.calculate?.();
    });
    label.append(select);
    box.append(label);
  }
  return box;
}
