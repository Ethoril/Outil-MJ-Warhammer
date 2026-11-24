/**
 * Passe G, lot G10 (R11) : entrées du menu ouvert par « Autres actions » (barre du bas), « magie, prière ou Test ».
 * Modèle pur : le panneau de résolution en fait des boutons ; « Test… » a le même effet que le bouton de la ligne Action.
 */
export const OTHER_MENU_MAGIC = Object.freeze([['channelling', 'Focalisation V5'], ['cast', 'Incantation V5'], ['dispel', 'Dissipation persistante V5']]);
export const OTHER_MENU_PANELS = Object.freeze([['prayer', 'Prière'], ['corruption', 'Corruption']]);
export const OTHER_MENU_TEST_LABEL = 'Test…';

/** Entrées dans l'ordre d'affichage : magie, prière et Corruption, puis Test… (grisé sans action préparée, comme son bouton). */
export function otherMenuEntries({ actions = [] } = {}) {
  const none = !actions.length;
  return [
    ...OTHER_MENU_MAGIC.map(([id, label]) => ({ id, label, disabled: none })),
    ...OTHER_MENU_PANELS.map(([id, label]) => ({ id, label, disabled: false })),
    { id: 'test', label: OTHER_MENU_TEST_LABEL, disabled: none }
  ];
}
