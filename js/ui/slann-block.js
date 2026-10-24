import { isSlann, slannAboard } from '../core/slann.js';

/** Bloc Slann de la carte : palanquin (à bord / au sol) et Contemplation (DR du Test de Perception saisis). `null` hors profil de Slann. */
export function buildSlannBlock(createElement, participant) {
  if (!isSlann(participant)) return null;
  const aboard = slannAboard(participant);
  const block = createElement('div');
  block.className = 'actor-slann';
  const label = createElement('span');
  label.textContent = 'Slann :';
  block.appendChild(label);
  const board = createElement('button');
  board.type = 'button';
  board.className = 'tiny btn-slann-aboard';
  board.dataset.aboard = aboard ? 'true' : 'false';
  board.textContent = aboard ? 'À bord du palanquin' : 'Au sol (−3 aux lancements)';
  board.title = 'Bascule entre le palanquin et le sol (annulable)';
  block.appendChild(board);
  const field = createElement('input');
  field.type = 'number';
  field.className = 'tiny slann-contemplation-sl';
  field.placeholder = 'DR';
  field.title = 'DR du Test de Perception de Contemplation (Difficile −10)';
  block.appendChild(field);
  const button = createElement('button');
  button.type = 'button';
  button.className = 'tiny btn-slann-contemplation';
  button.textContent = 'Contemplation';
  button.title = 'Applique le résultat de la table de Contemplation selon les DR saisis (annulable)';
  block.appendChild(button);
  return block;
}

/** Lit les DR de Contemplation saisis ; `null` si le champ est vide. */
export function readSlannInputs(block) {
  const raw = block?.querySelector('.slann-contemplation-sl')?.value;
  return { sl: raw === '' || raw === undefined ? null : Number(raw) };
}
