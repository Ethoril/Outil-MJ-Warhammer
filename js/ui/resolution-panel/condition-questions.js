// U8 Q19 : questions d'États posées au MJ pour un Test de magie (`preview.conditionNeeds`, produit par prepareMagicOptions).
// La réponse part dans `draft.magicConditionContext` (mêmes champs que le combat : involvesMovement, runningOrHiding, reliesOnSight,
// usesFellowship, conditionPenaltyMode) et le Test se recalcule. Sans réponse, ces États ne pèsent pas en magie.
import { node } from './dom.js';
import { modifierLines } from './modifiers.js';
import { CONDITION_QUESTIONS } from '../../core/condition-effects.js';
import { testQuestionLabel, answeredSequelaFields } from '../../core/v5-test-modifiers.js';

const MIXED_QUESTION = 'États de pénalités différentes : choisir les DR ou le Désavantage retenu par le MJ.';
const BOOLEAN_FIELDS = new Map([[CONDITION_QUESTIONS.movement, 'involvesMovement'], [CONDITION_QUESTIONS.escape, 'runningOrHiding'],
  [CONDITION_QUESTIONS.sight, 'reliesOnSight'], [CONDITION_QUESTIONS.fellowship, 'usesFellowship']]);

/** `[{ field, text, kind: 'boolean' | 'mode' }]` ; une question inconnue est ignorée. */
export function conditionQuestions(needs = []) {
  return needs.flatMap(text => BOOLEAN_FIELDS.has(text) ? [{ field: BOOLEAN_FIELDS.get(text), text, kind: 'boolean' }]
    : text === MIXED_QUESTION ? [{ field: 'conditionPenaltyMode', text, kind: 'mode' }] : []);
}

const FIELD_TEXT = new Map([...[...BOOLEAN_FIELDS].map(([text, field]) => [field, text]), ['conditionPenaltyMode', MIXED_QUESTION]]);

/** Questions ouvertes (`conditionNeeds`) puis celles déjà répondues (`magicConditionContext`), pour que le MJ puisse revenir sur sa réponse. */
export function visibleConditionQuestions(needs = [], context = {}, rows = []) {
  const open = conditionQuestions(needs), seen = new Set(open.map(q => q.field));
  const answered = conditionQuestions([...FIELD_TEXT].filter(([field]) => !seen.has(field) && context?.[field] != null).map(([, text]) => text));
  // MJ 09/11 CA22 : circonstances de séquelle (`sequela…`), posées (`rows`, avec leur champ) ou déjà répondues.
  const sequela = [...new Set([...(rows || []).map(row => row?.field).filter(field => /^sequela/.test(field || '')), ...answeredSequelaFields(context)])]
    .map(field => ({ field, text: (rows || []).find(row => row?.field === field)?.label || testQuestionLabel(field) || field, kind: 'boolean' }));
  return [...open, ...answered, ...sequela];
}

/** Lignes du détail des États appliqués à un Test de magie : `Désavantage : À terre`, pénalité d'État (même format que le combat). */
export function conditionDetailLines(preview) {
  const penalties = (preview?.conditionModifiers || []).filter(row => row.id === 'magic-condition-penalty');
  return [...(preview?.conditionDisadvantages || []).map(row => `Désavantage : ${row.label}`),
    ...modifierLines(penalties).map(line => line.text)];
}

export function renderConditionDetail(preview) {
  const lines = conditionDetailLines(preview);
  if (!lines.length) return null;
  const box = node('div', 'workspace-condition-detail');
  for (const text of lines) box.append(node('p', 'workspace-formula-notes', text));
  return box;
}

export function renderConditionQuestions(preview, draft, handlers) {
  const current = draft.magicConditionContext || {};
  const questions = visibleConditionQuestions(preview?.conditionNeeds, current, preview?.conditionNeedRows);
  if (!questions.length) return null;
  const box = node('div', 'workspace-condition-questions');
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
