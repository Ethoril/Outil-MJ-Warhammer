import { stateTraits } from '../core/creature-states.js';

const hasKey = (participant, key) => stateTraits(participant).some(trait => trait.key === key);
const adversaries = (participant, participants) => participants.filter(item => item.zone === 'active' && item.id !== participant.id && item.camp !== participant.camp);

/**
 * Bloc des Traits d'état actifs de la carte : Nuée (engagés cochés, bouton de fin de Round) et Venin (cible, bouton).
 * `null` sans l'un de ces Traits.
 */
export function buildCreatureStatesBlock(createElement, participant, participants = []) {
  const swarm = hasKey(participant, 'swarm');
  const venom = hasKey(participant, 'venom');
  if (!swarm && !venom) return null;
  const block = createElement('div');
  block.className = 'actor-creature-states';
  const others = adversaries(participant, participants);
  if (swarm) {
    const label = createElement('span');
    label.textContent = 'Nuée, engagés :';
    block.appendChild(label);
    for (const item of others) {
      const wrap = createElement('label');
      const box = createElement('input');
      box.type = 'checkbox';
      box.className = 'swarm-engaged';
      box.value = item.id;
      wrap.appendChild(box);
      const name = createElement('span');
      name.textContent = item.name || item.id;
      wrap.appendChild(name);
      block.appendChild(wrap);
    }
    const button = createElement('button');
    button.type = 'button';
    button.className = 'tiny btn-swarm-end-round';
    button.textContent = 'Fin de Round : 1 Blessure aux engagés';
    button.title = 'Chaque engagé coché perd 1 Blessure (annulable)';
    block.appendChild(button);
  }
  if (venom) {
    const label = createElement('span');
    label.textContent = 'Venin, cible blessée :';
    block.appendChild(label);
    const select = createElement('select');
    select.className = 'tiny venom-target';
    for (const item of others) {
      const option = createElement('option');
      option.value = item.id;
      option.textContent = item.name || item.id;
      select.appendChild(option);
    }
    block.appendChild(select);
    const button = createElement('button');
    button.type = 'button';
    button.className = 'tiny btn-creature-venom';
    button.textContent = 'Empoisonner';
    button.title = 'Une Blessure infligée : la cible devient Empoisonnée (annulable)';
    block.appendChild(button);
  }
  return block;
}

/** Engagés cochés (Nuée) et cible du Venin lus dans le bloc. */
export function readCreatureStatesInputs(block) {
  const boxes = block?.querySelectorAll ? [...block.querySelectorAll('.swarm-engaged')] : [];
  return { engagedIds: boxes.filter(box => box.checked).map(box => box.value), venomTargetId: block?.querySelector('.venom-target')?.value || null };
}
