import { psychologyTraits } from '../core/creature-psychology.js';

/** Traits Peur et Terreur que la créature cause au contact ou à la vue, avec leur indice imprimé. */
export function psychologyCauses(participant) {
  return psychologyTraits(participant).filter(trait => trait.key === 'fear' || trait.key === 'terror')
    .map(trait => ({ key: trait.key, label: `${trait.key === 'fear' ? 'Peur' : 'Terreur'}${trait.detail ? ` (${trait.detail})` : ''}` }));
}

/** Bloc Peur/Terreur de la carte : cible (vide = tous les adversaires actifs) et un bouton par Trait. `null` sans ces Traits. */
export function buildPsychologyBlock(createElement, participant, participants = []) {
  const causes = psychologyCauses(participant);
  if (!causes.length) return null;
  const block = createElement('div');
  block.className = 'actor-psychology';
  const label = createElement('span');
  label.textContent = 'Au contact ou à la vue :';
  block.appendChild(label);
  const select = createElement('select');
  select.className = 'tiny psychology-target';
  select.title = 'Cible du Test de Calme (vide : tous les adversaires actifs)';
  for (const [value, text] of [['', 'tous les adversaires'], ...participants.filter(item => item.zone === 'active' && item.id !== participant.id && item.camp !== participant.camp).map(item => [item.id, item.name || item.id])]) {
    const option = createElement('option');
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
  }
  block.appendChild(select);
  for (const cause of causes) {
    const button = createElement('button');
    button.type = 'button';
    button.className = 'tiny btn-creature-psychology';
    button.dataset.psychology = cause.key;
    button.textContent = cause.label;
    button.title = `${cause.label} : demande le Test de Calme à la cible (annulable)`;
    block.appendChild(button);
  }
  return block;
}

/** Lit la cible choisie dans le bloc ; `null` = tous les adversaires actifs. */
export function readPsychologyInputs(block) {
  const value = block?.querySelector('.psychology-target')?.value;
  return { targetId: value ? value : null };
}
