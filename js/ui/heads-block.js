import { HEAD_STATES, hasManyHeads, headRegistryOf, headStateLabel } from '../core/creature-heads.js';

/** État suivant d'une tête au clic : valide → étourdie → inconsciente → morte → valide. */
export const nextHeadState = state => HEAD_STATES[(HEAD_STATES.indexOf(state) + 1) % HEAD_STATES.length] ?? 'stunned';

/** Bloc des têtes d'un participant (Trait Plusieurs têtes) : un bouton par tête, un clic change son état. `null` sans le Trait. */
export function buildHeadsBlock(createElement, participant) {
  if (!hasManyHeads(participant)) return null;
  const heads = headRegistryOf(participant);
  if (!heads.length) return null;
  const block = createElement('div');
  block.className = 'actor-heads';
  heads.forEach((head, index) => {
    const button = createElement('button');
    button.type = 'button';
    button.className = 'tiny btn-head';
    button.dataset.headId = head.id;
    button.dataset.state = head.state;
    button.textContent = `Tête ${index + 1} : ${headStateLabel(head.state)}`;
    button.title = 'Blessure critique à la tête : cliquer pour changer l’état de la tête';
    block.appendChild(button);
  });
  return block;
}
