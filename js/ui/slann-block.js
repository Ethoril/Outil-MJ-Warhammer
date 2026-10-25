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
  field.title = 'DR du Test de Perception de Contemplation (Difficile −1 DR)';
  block.appendChild(field);
  // Un zéro se lit selon le Test : +0 réussi (Détaché), −0 échec marginal (Brume de pensée).
  const zero = createElement('select');
  zero.className = 'tiny slann-contemplation-zero';
  zero.title = 'À 0 DR : Test réussi (+0) ou échec marginal (−0)';
  for (const [value, text] of [['', '0 DR : ?'], ['success', '+0 réussi'], ['failure', '−0 échec']]) {
    const option = createElement('option');
    option.value = value;
    option.textContent = text;
    zero.appendChild(option);
  }
  block.appendChild(zero);
  const button = createElement('button');
  button.type = 'button';
  button.className = 'tiny btn-slann-contemplation';
  button.textContent = 'Contemplation';
  button.title = 'Applique le résultat de la table de Contemplation selon les DR saisis (annulable)';
  block.appendChild(button);
  return block;
}

/** Lit les DR de Contemplation saisis (`sl` à `null` si le champ est vide) et, pour un zéro, la réussite ou l'échec du Test (`success`). */
export function readSlannInputs(block) {
  const raw = block?.querySelector('.slann-contemplation-sl')?.value;
  const zero = block?.querySelector('.slann-contemplation-zero')?.value;
  const sl = raw === '' || raw === undefined ? null : Number(raw) + 0; // + 0 : « -0 » devient 0, le signe passe par `success`
  const success = String(raw).trim() === '-0' ? false : zero === 'success' ? true : zero === 'failure' ? false : undefined;
  return success === undefined || sl !== 0 ? { sl } : { sl, success };
}
