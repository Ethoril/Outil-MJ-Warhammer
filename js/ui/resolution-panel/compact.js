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

export function renderDistanceRow({ draft, plateau = {}, rangeBands = null, handlers, names, mapState = null }) {
  const row = node('div', 'workspace-resolution-row workspace-distance-row');
  row.dataset.distance = '';
  row.appendChild(node('span', 'workspace-res-label', 'Distance'));
  const line = distanceChoices({ plateau, context: draft.v5Context || {}, rangeBands, mapBand: mapState?.band || null, mapMeters: mapState?.meters ?? null, names });
  const chips = node('div', 'workspace-chip-list workspace-distance-chips');
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'Distance');
  for (const option of line.options) {
    const item = button(option.label, 'workspace-chip', { 'data-distance-choice': option.key, 'aria-pressed': String(line.selected === option.key) });
    if (option.limit) item.appendChild(node('span', 'workspace-chip-note', ` ${option.limit}`));
    item.title = option.reason || option.title;
    item.disabled = option.disabled || draft.busy === true;
    item.addEventListener('click', () => handlers.select({ v5Context: distanceToContext(option.key, { context: draft.v5Context || {}, plateau }) }));
    chips.appendChild(item);
  }
  const explain = node('p', 'workspace-distance-explain', line.explanation);
  row.append(chips, explain);
  return { row, explain, line };
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
