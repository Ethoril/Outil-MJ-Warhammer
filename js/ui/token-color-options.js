import { normalizeTokenColor } from '../core/models.js';

/** Teintes des cinq PJ, avec le cerclage que Map Display choisit pour chacune (médaillons du 06/11). */
export const PJ_TOKEN_COLORS = Object.freeze([
  Object.freeze({ label: 'Elysia', value: '#b3262e' }),
  Object.freeze({ label: 'Hellaya', value: '#2e9e6e' }),
  Object.freeze({ label: 'Wren', value: '#e8846a' }),
  Object.freeze({ label: 'Caelel', value: '#2a4fa8' }),
  Object.freeze({ label: 'Bhelgi', value: '#6fb4e6' }),
]);

/**
 * Options du menu « Couleur du pion » pour une teinte courante : la couleur du camp (valeur vide),
 * les cinq PJ, et « Autre (#xxxxxx) » si la teinte du profil n'est pas dans la liste.
 *
 * @param {unknown} current
 * @returns {{ label: string, value: string }[]}
 */
export function tokenColorOptions(current) {
  const options = [{ label: 'Couleur du camp', value: '' }, ...PJ_TOKEN_COLORS];
  const color = normalizeTokenColor(current);
  if (color && !PJ_TOKEN_COLORS.some(entry => entry.value === color)) options.push({ label: `Autre (${color})`, value: color });
  return options;
}

/**
 * Remplit le menu et le positionne sur la teinte du profil.
 *
 * @param {HTMLSelectElement} select
 * @param {unknown} current
 */
export function syncTokenColorSelect(select, current) {
  const options = tokenColorOptions(current);
  select.replaceChildren(...options.map(entry => {
    const option = select.ownerDocument.createElement('option');
    option.value = entry.value; option.textContent = entry.label;
    return option;
  }));
  select.value = normalizeTokenColor(current) ?? '';
}
