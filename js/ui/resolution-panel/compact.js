/**
 * Refonte de l'interface, lot E4b : lignes compactes de la résolution.
 * - ligne « Distance » d'une attaque à distance (js/ui/combat-distance.js, CA13 à CA15) ;
 * - ligne « Contexte » : circonstances déduites en puces + bouton « autres… » (CA15b) ;
 * - tête du panneau « autres… » : au plus 12 cases pertinentes, chacune avec son effet (CA15a) ;
 * - d100 de déviation du pied, seulement quand le moteur le demande (CA15).
 */
import { node, button } from './dom.js';
import { distanceChoices, distanceToContext } from '../combat-distance.js';
import { deducedCircumstances, pertinentCircumstances } from './circonstances.js';

/**
 * Ligne « Distance » (CA13, G2-f) : « Au contact » à part, puis les bandes ; dessous, en une ligne, ce qui est retenu et d'où
 * (« Courte · 12 m · carte ») et le droit d'esquiver (G2-a) : puce déduite forçable d'un clic, ou question Oui / Non.
 * `dodge` = rangedDodgeRight(…) ; `onDodge(valeur)` écrit la réponse du MJ (true, false, null = rendre la déduction).
 */
export function renderDistanceRow({ draft, plateau = {}, rangeBands = null, handlers, names, mapState = null, dodge = null, onDodge = null }) {
  const row = node('div', 'workspace-resolution-row workspace-distance-row');
  row.dataset.distance = '';
  row.appendChild(node('span', 'workspace-res-label', 'Distance'));
  const line = distanceChoices({ plateau, context: draft.v5Context || {}, rangeBands, mapBand: mapState?.band || null, mapMeters: mapState?.meters ?? null, names });
  const chips = node('div', 'workspace-chip-list workspace-distance-chips');
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'Distance');
  const bands = node('span', 'workspace-distance-bands');
  for (const option of line.options) {
    const item = button(option.label, 'workspace-chip', { 'data-distance-choice': option.key, 'aria-pressed': String(line.selected === option.key) });
    if (option.limit) item.appendChild(node('span', 'workspace-chip-note', ` ${option.limit}`));
    item.title = option.reason || option.title;
    item.disabled = option.disabled || draft.busy === true;
    item.addEventListener('click', () => handlers.select({ v5Context: distanceToContext(option.key, { context: draft.v5Context || {}, plateau }) }));
    if (option.key === 'contact') { item.classList.add('workspace-distance-contact'); chips.appendChild(item); } else bands.appendChild(item);
  }
  chips.appendChild(bands);
  const explain = node('p', 'workspace-distance-explain');
  explain.title = line.explanation;
  const summary = node('span', 'workspace-distance-summary', line.summary);
  summary.dataset.distanceSummary = '';
  explain.appendChild(summary);
  const mapNote = node('span', 'workspace-distance-map');
  explain.appendChild(mapNote);
  if (dodge && dodge.status !== 'contact') explain.appendChild(renderDodge({ dodge, onDodge, busy: draft.busy === true }));
  row.append(chips, explain);
  return { row, explain, line, mapNote };
}

/** G2-a : droit d'esquiver le tir, en ligne. Jamais de texte long dans un bouton : la question est un texte, Oui / Non des boutons. */
function renderDodge({ dodge, onDodge, busy }) {
  const box = node('span', `workspace-dodge is-${dodge.status}`);
  box.dataset.dodge = dodge.status;
  box.title = dodge.title;
  if (dodge.deduced === 'ask') {
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', dodge.label);
    box.dataset.blockingField = 'ranged-opposition';
    box.tabIndex = -1;
    box.appendChild(node('span', 'workspace-dodge-question', dodge.label));
    for (const [key, value, text] of [['oui', true, 'Oui'], ['non', false, 'Non']]) {
      const choice = button(text, 'workspace-chip workspace-dodge-answer', { 'data-dodge-answer': key, 'aria-pressed': String(dodge.answer === value) });
      choice.title = dodge.answer === value ? 'Recliquer pour retirer la réponse' : value ? 'Le tireur est à portée d’esquive : la cible peut opposer son Esquive' : 'Hors de portée d’esquive : tir non opposé (p. 164)';
      choice.disabled = busy;
      choice.addEventListener('click', () => onDodge?.(dodge.answer === value ? null : value));
      box.appendChild(choice);
    }
    return box;
  }
  const allowed = dodge.status === 'allowed';
  const chip = button(dodge.label, `workspace-chip workspace-dodge-chip ${allowed ? 'is-allowed' : 'is-forbidden'}${dodge.forced ? ' is-forced' : ''}`, { 'data-dodge-chip': '', 'aria-pressed': String(allowed) });
  chip.dataset.blockingField = 'ranged-opposition';
  chip.title = `${dodge.title} ${dodge.forced ? 'Un clic rend la déduction.' : 'Un clic force l’inverse (choix du MJ).'}`;
  chip.disabled = busy;
  chip.addEventListener('click', () => onDodge?.(dodge.forced ? null : !allowed));
  box.appendChild(chip);
  return box;
}

export function renderContextRow({ facts, handlers, toggle }) {
  const row = node('div', 'workspace-resolution-row workspace-context-row');
  row.appendChild(node('span', 'workspace-res-label', 'Contexte'));
  const chips = node('div', 'workspace-chip-list');
  for (const item of deducedCircumstances(facts)) {
    const chip = button(item.label, `workspace-chip workspace-deduced-chip ${item.active ? 'is-on' : 'is-off'}`, { 'data-deduced': item.id, 'aria-pressed': String(item.active) });
    if (item.toggle) {
      chip.title = item.active ? 'Déduit par l’outil : un clic le retire pour cette action' : 'Retiré par le MJ : un clic rend la déduction';
      chip.addEventListener('click', () => handlers.select(item.toggle));
    } else {
      chip.title = 'Déduit par l’outil';
      chip.setAttribute('aria-disabled', 'true');
      chip.classList.add('is-fixed');
    }
    chips.appendChild(chip);
  }
  chips.appendChild(toggle);
  row.appendChild(chips);
  return row;
}

export function renderPertinentCircumstances({ facts, handlers }) {
  const box = node('section', 'workspace-circumstances-pertinent');
  box.appendChild(node('h5', '', 'Circonstances de cette action'));
  const grid = node('div', 'workspace-circumstances-grid');
  const list = pertinentCircumstances(facts);
  for (const option of list) {
    const label = node('label', 'workspace-type workspace-circumstance-option');
    const box2 = document.createElement('input');
    box2.type = 'checkbox';
    box2.checked = option.checked;
    box2.disabled = option.disabled;
    box2.dataset.circumstance = option.id;
    box2.dataset.focusKey = `circumstance-${option.id}`;
    box2.setAttribute('aria-label', option.label);
    box2.addEventListener('change', () => handlers.select(option.set(box2.checked)));
    label.append(box2, option.label);
    grid.appendChild(label);
  }
  if (!list.length) grid.appendChild(node('p', 'workspace-muted', 'Aucune circonstance à ajouter pour cette action.'));
  box.appendChild(grid);
  return { box, ids: new Set(list.map(option => option.id)) };
}

/** Champ d100 du combattant touché, placé dans la ligne « À saisir avant d'appliquer » du pied. */
export function deviationRollField({ draft, handlers }) {
  const wrap = node('span', 'workspace-deviation-roll');
  const input = document.createElement('input');
  input.className = 'workspace-roll-input num';
  input.inputMode = 'numeric';
  input.maxLength = 3;
  input.placeholder = 'd100';
  input.value = draft.v5Context?.engagedTargetRoll ?? '';
  input.dataset.npcRollKey = 'contextValue';
  input.dataset.npcRollField = 'engagedTargetRoll';
  input.dataset.blockingField = 'engaged-roll';
  input.dataset.focusKey = 'engaged-target-roll';
  input.setAttribute('aria-label', 'Jet d100 pour désigner le combattant touché');
  const commit = () => {
    const value = Number(input.value);
    handlers.select({ v5Context: { ...(draft.v5Context || {}), engagedTargetRoll: input.value === '' || !Number.isInteger(value) ? null : value } });
  };
  input.addEventListener('change', commit);
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); commit(); handlers.calculate?.(); } });
  const roll = button('Lancer', 'workspace-secondary');
  roll.addEventListener('click', () => { input.value = String(1 + Math.floor(Math.random() * 100)); commit(); handlers.calculate?.(); });
  wrap.append(input, roll);
  return wrap;
}
