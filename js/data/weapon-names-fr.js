/**
 * Armes imprimées en anglais dans les profils de bestiaire → nom français du livre de base (affichage seulement :
 * l'identifiant, les calculs et le nom source `extensions.v5.sourceName` restent inchangés).
 * Seules les armes ayant un équivalent dans le catalogue d'équipement sont listées ; les armes propres à une créature
 * (Choppa, Skull-Stick, Skarsnik's Prodda…) et les attaques naturelles gardent leur nom du livre.
 */
export const WEAPON_NAMES_FR = Object.freeze({
  'sword': 'Épée', 'bow': 'Arc', 'spear': 'Lance', 'staff': 'Bâton', 'sling': 'Fronde', 'scimitar': 'Sabre',
  'javelins': 'Javelots', 'javelin': 'Javelot', 'knives': 'Couteaux', 'knife': 'Couteau', 'dagger': 'Dague',
  'two-handed warhammer': 'Marteau de guerre à deux mains', 'warhammer': 'Marteau de guerre'
});

/** Nom français d'une arme anglaise, ou le nom reçu s'il n'a pas de traduction. */
export function weaponNameFr(name) {
  const key = String(name ?? '').trim().toLowerCase();
  return Object.hasOwn(WEAPON_NAMES_FR, key) ? WEAPON_NAMES_FR[key] : name;
}
