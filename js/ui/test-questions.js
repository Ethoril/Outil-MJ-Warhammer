// Q6 · T10 (docs/specs/tests-secondaires-agregateur/) : champs de réponse aux questions que le calcul commun d'un Test pose au MJ
// (`needsInput` : États, circonstances de séquelle, choix DR ou Désavantage), le choix d'Obstiné avant le jet et le détail par
// source. Un écran qui lance un Test le réutilise pour qu'aucune question ne reste sans champ (CA8, CA22) ; la réponse part au
// chemin `answerAt` rendu par le moteur (relatif à l'objet de réponses de l'écran), puis l'écran recalcule.
import { node } from './resolution-panel/dom.js';
import { testQuestionLabel, testQuestionKind } from '../core/v5-test-modifiers.js';
import { hasV5Talent } from '../core/v5-talents.js';

const QUESTION_FIELD = /^(involvesMovement|runningOrHiding|reliesOnSight|requiresSight|usesFellowship|conditionPenaltyMode|sequela(?!NoCircumstanceInput).*)$/;
/** Champ de réponse connu du calcul commun (État ou séquelle). */
export const isQuestionField = field => QUESTION_FIELD.test(String(field || ''));

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
/** Valeur au chemin pointé (`a.b.c`) ; chemin vide : la racine. */
export const getAt = (root, path) => (path ? String(path).split('.').reduce((value, key) => (isRecord(value) ? value[key] : undefined), root) : root);
/** Copie de `root` où le chemin pointé vaut `value` (objets intermédiaires créés). */
export function setAt(root, path, value) {
  if (!path) return value;
  const [head, ...rest] = String(path).split('.');
  const base = isRecord(root) ? root : {};
  return { ...base, [head]: setAt(base[head], rest.join('.'), value) };
}
/** Réponse du MJ rangée dans le contexte au chemin `answerAt` ; `undefined` retire la réponse. */
export function answerTestQuestion(root, answerAt, field, value) {
  const context = { ...(isRecord(getAt(root, answerAt)) ? getAt(root, answerAt) : {}) };
  if (value === undefined) delete context[field]; else context[field] = value;
  return setAt(root, answerAt || '', context);
}

/**
 * Questions rangées par le moteur sous un chemin de réponse (`{ field, label, answerAt, participantId }`), cherchées dans tout
 * l'aperçu (listes `needsInput`), sans doublon. `answerAt` absent : `defaultAt` (questions d'un seul Test).
 */
export function collectTestQuestions(value, { defaultAt = null } = {}) {
  const rows = [], seen = new Set(), visited = new WeakSet();
  const walk = (item, key) => {
    if (!item || typeof item !== 'object' || visited.has(item)) return;
    visited.add(item);
    if (Array.isArray(item)) {
      if (key === 'needsInput') for (const row of item) {
        if (!isRecord(row) || typeof row.label !== 'string') continue;
        const answerAt = typeof row.answerAt === 'string' ? row.answerAt : defaultAt;
        // Chute d'un sort, embuscade : le Store préfixe le champ (`rideCondition:<id>:<champ>`, `rideBlocked:<id>` pour un motif).
        const field = /^rideBlocked:/.test(row.field || '') ? null : /^rideCondition:[^:]+:(.+)$/.exec(row.field || '')?.[1] ?? row.field;
        if (answerAt === null || (field && !isQuestionField(field))) continue;
        const id = `${answerAt}|${field || row.label}`;
        if (!seen.has(id)) { seen.add(id); rows.push({ ...row, field: field || null, answerAt }); }
      }
      for (const entry of item) walk(entry, null);
      return;
    }
    for (const [name, entry] of Object.entries(item)) walk(entry, name);
  };
  walk(value, null);
  return rows;
}

/** Réponses déjà données sous les chemins de contexte de `root` (clé finale en « …Context »), pour que le MJ puisse y revenir. */
function answeredQuestions(root, paths) {
  const rows = [];
  const visit = (value, path, depth) => {
    if (!isRecord(value) || depth > 5) return;
    for (const [key, entry] of Object.entries(value)) {
      const next = path ? `${path}.${key}` : key;
      if (isRecord(entry) && (/context$/i.test(key) || paths.has(next))) {
        for (const [field, answer] of Object.entries(entry)) if (isQuestionField(field) && answer != null) rows.push({ field, answerAt: next });
      }
      if (isRecord(entry)) visit(entry, next, depth + 1);
    }
  };
  visit(root, '', 0);
  for (const path of paths) if (!path && isRecord(root)) for (const [field, answer] of Object.entries(root)) if (isQuestionField(field) && answer != null) rows.push({ field, answerAt: '' });
  return rows;
}

/** Liste « Oui / Non » ou « DR / Désavantage » d'une question ; `onChange(valeur | undefined)`. */
export function questionSelect({ text, field, value, onChange, focusKey }) {
  const label = node('label', 'workspace-type workspace-test-question', text), select = document.createElement('select');
  select.setAttribute('aria-label', text);
  if (focusKey) select.dataset.focusKey = focusKey;
  if (testQuestionKind(field) === 'mode') select.append(new Option('À préciser', ''), new Option('Pénalité en DR', 'sl'), new Option('Désavantage', 'disadvantage'));
  else select.append(new Option('À préciser', ''), new Option('Oui', 'true'), new Option('Non', 'false'));
  select.value = value == null ? '' : String(value);
  select.addEventListener('change', () => onChange(select.value === '' ? undefined : testQuestionKind(field) === 'mode' ? select.value : select.value === 'true'));
  label.append(select);
  return label;
}

/**
 * Bloc des questions ouvertes (`rows`, avec leur `answerAt`) et des réponses déjà données dans `root`. `onChange(nouvelleRacine)`.
 * `nameOf(id)` : nom d'un participant (pour dire qui teste) ; `subjectOf(id)` : participant (nom de zone d'une séquelle).
 * Une restriction (champ nul) s'affiche comme motif. Rend null quand il n'y a rien à montrer.
 */
export function renderTestQuestions(rows = [], { root = {}, onChange, nameOf = () => null, subjectOf = () => null, title = '', focusPrefix = 'test-question', includeAnswered = true } = {}) {
  const open = rows.filter(row => row.field && isQuestionField(row.field));
  const blocked = rows.filter(row => !row.field || row.restriction);
  const paths = new Set(open.map(row => row.answerAt || ''));
  const keys = new Set(open.map(row => `${row.answerAt || ''}|${row.field}`));
  const answered = includeAnswered ? answeredQuestions(root, paths).filter(row => !keys.has(`${row.answerAt}|${row.field}`)) : [];
  if (!open.length && !blocked.length && !answered.length) return null;
  const box = node('div', 'workspace-test-questions');
  box.setAttribute('role', 'group');
  if (title) box.append(node('p', 'workspace-type', title));
  const who = row => row.participantId ? nameOf(row.participantId) : String(row.answerAt || '').split('.').map(id => nameOf(id)).find(Boolean) || null;
  for (const row of blocked) box.append(node('p', 'workspace-field-error', [who(row), row.label].filter(Boolean).join(' : ')));
  for (const row of [...open, ...answered]) {
    const subject = row.participantId ? subjectOf(row.participantId) : null;
    const question = testQuestionLabel(row.field, subject) || row.label || row.field;
    const text = [who(row), question].filter(Boolean).join(' : ');
    box.append(questionSelect({ text, field: row.field, value: getAt(root, row.answerAt)?.[row.field], focusKey: `${focusPrefix}-${row.answerAt || 'root'}-${row.field}`,
      onChange: value => onChange(answerTestQuestion(root, row.answerAt || '', row.field, value)) }));
  }
  return box;
}

/**
 * Obstiné (`talent-strong-minded`, V5 p. 127) : choix avant le jet (`preRollTalent: 'strong-minded'`), proposé quand le testeur a le
 * talent. `onChange('strong-minded' | 'none')`. Le compte « une fois par séance » n'est tenu que par le panneau de combat.
 */
export function renderObstinateChoice(actor, value, onChange, { focusKey = 'pre-roll-talent', title = 'Talent à choisir avant le jet' } = {}) {
  if (!actor || !hasV5Talent(actor, 'talent-strong-minded')) return null;
  const label = node('label', 'workspace-type workspace-obstinate', title), select = document.createElement('select');
  select.setAttribute('aria-label', title);
  select.dataset.focusKey = focusKey;
  select.append(new Option('Aucun', 'none'), new Option('Obstiné : ignorer les modificateurs négatifs', 'strong-minded'));
  select.value = value === 'strong-minded' ? 'strong-minded' : 'none';
  select.addEventListener('change', () => onChange(select.value));
  label.append(select);
  return label;
}

const sign = value => (value > 0 ? '+' : value < 0 ? '−' : '±') + Math.abs(value);
/**
 * Détail par source d'un Test (CA5) : lignes du calcul commun (`rows` : `{ label, amount?, source, kind, dropped? }`) puis
 * modificateurs propres au Test (`modifiers`, montants après plafonds). Un modificateur écarté est barré (Q9).
 */
export function renderSourceDetail({ rows = [], modifiers = [], title = 'Détail du Test' } = {}) {
  const lines = [];
  const seen = new Set();
  for (const row of modifiers) {
    if (!row || !Number.isFinite(Number(row.amount))) continue;
    seen.add(row.id);
    const source = rows.find(item => item.id === row.id && !item.dropped)?.source;
    lines.push({ text: `${row.label || row.id}${source ? ` (${source})` : ''} ${sign(Number(row.amount))} DR` });
  }
  for (const row of rows) {
    if (row.dropped) { lines.push({ text: `${row.label}${row.amount != null ? ` ${sign(Number(row.amount))} DR` : ''}${row.rule ? ` (écarté : ${row.rule})` : ' (écarté)'}`, dropped: true }); continue; }
    if (row.kind === 'advantage') lines.push({ text: `Avantage : ${row.label || row.id} (${row.source})` });
    else if (row.kind === 'disadvantage') lines.push({ text: `Désavantage : ${row.label || row.id} (${row.source})` });
    else if (!seen.has(row.id) && row.amount != null) lines.push({ text: `${row.label || row.id} (${row.source}) ${sign(Number(row.amount))} DR` });
  }
  if (!lines.length) return null;
  const box = node('div', 'workspace-source-detail');
  box.append(node('p', 'workspace-type', title));
  for (const line of lines) {
    const p = node('p', 'workspace-formula-notes');
    if (line.dropped) { const s = document.createElement('s'); s.textContent = line.text; p.append(s); } else p.textContent = line.text;
    box.append(p);
  }
  return box;
}
