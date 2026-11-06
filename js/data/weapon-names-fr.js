/**
 * Armes imprimées en anglais dans les profils de bestiaire → nom français du livre de base (affichage seulement :
 * l'identifiant, les calculs et le nom source `extensions.v5.sourceName` restent inchangés).
 * Couvre aussi les armes propres aux créatures et les attaques naturelles (arbitrage du MJ, 06/11).
 */
export const WEAPON_NAMES_FR = Object.freeze({
  'sword': 'Épée', 'bow': 'Arc', 'spear': 'Lance', 'staff': 'Bâton', 'sling': 'Fronde', 'scimitar': 'Cimeterre',
  'javelins': 'Javelots', 'javelin': 'Javelot', 'knives': 'Couteaux', 'knife': 'Couteau', 'dagger': 'Dague',
  'weapon': 'Arme', 'ranged': 'Arme à distance', 'choppa': 'Kikoup’', 'two-handed choppa': 'Kikoup’ à deux mains',
  'stone axe': 'Hache de pierre', 'two-handed stone axe': 'Hache de pierre à deux mains', 'skull-stick': 'Bâton à crânes',
  'spiked club': 'Massue cloutée', 'bite': 'Morsure', 'tusks': 'Défenses', 'fangs': 'Crocs', 'horns': 'Cornes',
  'jaws and claws': 'Mâchoires et griffes', 'tentacles': 'Tentacules', "skarsnik's prodda": 'Le Prodda de Skarsnik', 'the red fang': 'Le Croc Rouge',
  'zweihänder': 'Zweihänder',
  'two-handed warhammer': 'Marteau de guerre à deux mains', 'warhammer': 'Marteau de guerre'
});

/** Nom français d'une arme anglaise, ou le nom reçu s'il n'a pas de traduction. */
export function weaponNameFr(name) {
  const key = String(name ?? '').trim().toLowerCase();
  return Object.hasOwn(WEAPON_NAMES_FR, key) ? WEAPON_NAMES_FR[key] : name;
}
