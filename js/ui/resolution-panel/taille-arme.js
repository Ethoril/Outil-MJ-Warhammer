/**
 * Passe G, lot G10 (R2, p. 304) : ligne « Taille (arme) » de la résolution (qualité d'arme Taille / Hack, pas la Taille de la
 * créature). Modèle pur : la case de résolution en tire le texte, la liste des pièces et le champ de saisie libre.
 * La qualité se reconnaît par `hasQuality` (alias compris : « Hack », « Taille »), comme le calcul de `js/core/resolution.js`.
 */
import { hasQuality } from '../../core/quality-normalization.js';

export const TAILLE_ARME_LABEL = 'Taille (arme)';

/** L'action est-elle une attaque dont l'arme porte la qualité Taille, contre une cible ? */
export function carriesTailleArme({ action, type, target } = {}) {
  return type === 'attack' && Boolean(target) && hasQuality(action?.qualities, 'taille');
}

/**
 * Ce que la ligne affiche. `hack` = `preview.hack` du calcul (absent avant « Calculer »).
 * - plusieurs pièces possibles : `choices` (liste, la plus forte précochée par le calcul : `selectedId`) ;
 * - une seule pièce, ou aucune : une phrase ; `manual` quand les PA n'ont aucune pièce identifiable (nom libre facultatif).
 */
export function tailleArmeModel({ hack = null, hasPreview = false } = {}) {
  const choices = hack?.candidates || [];
  if (choices.length > 1) {
    return { mode: 'list', label: `${TAILLE_ARME_LABEL} : pièce touchée`, selectedId: hack.struckItemId || choices[0].id,
      choices: choices.map(item => ({ id: item.id, text: `${item.name} · ${item.ap} PA${item.kind === 'shield' ? ' (bouclier)' : ''}` })), manual: false };
  }
  const text = hack?.struckItemName && !hack.manual ? `${TAILLE_ARME_LABEL} : ${hack.struckItemName} perd 1 PA.`
    : hack?.manual ? `${TAILLE_ARME_LABEL} : la protection touchée perd 1 PA.`
    : hasPreview ? `${TAILLE_ARME_LABEL} : rien à abîmer à cette localisation.` : `${TAILLE_ARME_LABEL} : pièce touchée déduite au calcul.`;
  return { mode: 'note', text, manual: hack?.manual === true, manualLabel: `${TAILLE_ARME_LABEL} : pièce frappée (facultatif)` };
}
