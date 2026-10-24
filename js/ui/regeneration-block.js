import { hasRegeneration } from '../core/creature-regeneration.js';

/** Bloc de Régénération (Trait Régénération) : d10 de début de Round, Blessures de feu non régénérables, bouton « Régénérer ». `null` sans le Trait. */
export function buildRegenerationBlock(createElement, participant) {
  if (!hasRegeneration(participant)) return null;
  const block = createElement('div');
  block.className = 'actor-regeneration';
  const label = createElement('span');
  label.textContent = 'Régénération (début de Round) :';
  block.appendChild(label);
  for (const [name, title, min, max] of [['regen-roll', 'd10 de Régénération (1 à 10)', 1, 10], ['regen-fire', 'Blessures de feu manquantes (non régénérables)', 0, 999]]) {
    const field = createElement('input');
    field.type = 'number';
    field.className = `tiny ${name}`;
    field.min = String(min);
    field.max = String(max);
    field.placeholder = name === 'regen-roll' ? 'd10' : 'feu';
    field.title = title;
    block.appendChild(field);
  }
  const button = createElement('button');
  button.type = 'button';
  button.className = 'tiny btn-regeneration';
  button.textContent = 'Régénérer';
  button.title = 'Applique le soin de Régénération avec le d10 saisi (annulable)';
  block.appendChild(button);
  return block;
}

/** Lit le d10 et les Blessures de feu saisis dans le bloc ; `roll` vaut NaN si le champ est vide. */
export function readRegenerationInputs(block) {
  const read = selector => { const raw = block?.querySelector(selector)?.value; return raw === '' || raw === undefined ? NaN : Number(raw); };
  const fire = read('.regen-fire');
  return { roll: read('.regen-roll'), fireWounds: Number.isInteger(fire) && fire > 0 ? fire : 0 };
}
