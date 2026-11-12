// Bouclier de Saphery (ARCH-03) : module feuille, sorti pour casser un cycle d'imports.
/**
 * Calcul du seuil de Protection du Bouclier de Saphery.
 * RÈGLE CONFIRMÉE :
 * - Protection de base 9+, améliorée de -1 par sort de Haute Magie supplémentaire maintenu.
 * - Pas de plancher ajouté à sa Protection croissante : un seuil calculé <= 1 réussit automatiquement sur 1d10.
 */
export function calculateSapheryWard(otherSpellsCount = 0, baseWard = 9) {
  const count = Math.max(0, Number(otherSpellsCount) || 0);
  const threshold = baseWard - count;
  const isAutomatic = threshold <= 1;

  return {
    baseWard,
    otherSpellsCount: count,
    threshold,
    automaticSuccess: isAutomatic,
    summary: isAutomatic
      ? `Bouclier de Saphery : seuil ${threshold} ≤ 1 → Réussite automatique de la Protection sur 1d10.`
      : `Bouclier de Saphery : Protection ${threshold}+ sur 1d10.`
  };
}
