/**
 * Matériau d'une pièce d'armure (métal ou non), pour les sorts de Cieux et de Métal (V5 p. 252) et la Focalisation de Chamon.
 * La couche (`rigid`, `flexible`) décrit la rigidité, pas le matériau : le cuir bouilli et les capes sont rigides sans être de métal.
 * Module pur. Réponse : 'metal', 'other' ou 'unknown' (matériau non déterminable : le MJ doit trancher, rien n'est présumé).
 */

const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const METAL = /maille|metal|acier|plaque|plate|\bfer\b|gromril|ithilmar|mithril|bronze|cuivre|\bor\b|argent/;
const OTHER = /cuir|leather|cape|chale|fourrure|peau|tissu|laine|bois|os\b|ecaille|robe|manteau|bouilli/;
// Catégories du catalogue (champ `category`) dont le matériau est connu ; les autres (Magique et Unique…) se décident pièce par pièce.
// Dragon Haut Elfe : métal par décision du MJ (11 octobre) ; le catalogue n'a pas de champ matériau, la catégorie en tient lieu.
const METAL_CATEGORIES = /^(mailles|plates|gromril|ithilmar|mailles naines|plates naines|dragon haut elfe)/;
const OTHER_CATEGORIES = /^(cuir souple|cuir bouilli|cape)/;

/** Un champ `material` explicite du MJ prime ; sinon la catégorie du catalogue, puis le nom de la pièce. */
export function armorMaterial(item) {
  const material = fold(item?.material).trim();
  if (material) return METAL.test(material) ? 'metal' : 'other';
  const category = fold(item?.category).trim();
  if (METAL_CATEGORIES.test(category)) return 'metal';
  if (OTHER_CATEGORIES.test(category)) return 'other';
  const name = fold(item?.name);
  const metal = METAL.test(name), other = OTHER.test(name);
  if (metal !== other) return metal ? 'metal' : 'other';
  return 'unknown';
}

/** Pièces d'armure portées qui protègent (PA > 0, hors couche de sort) : base commune des calculs de métal. */
export function wornArmourPieces(participant, locationId = null) {
  const equipment = Array.isArray(participant?.equipment) ? participant.equipment : [];
  return equipment.filter(item => item && item.kind === 'armour' && item.equipped !== false && item.layer !== 'bonus'
    && (Number(item.ap) || 0) > 0 && (locationId == null || Array.isArray(item.locations) && item.locations.includes(locationId)));
}

/** Pièces dont le matériau est inconnu (nom lisible), pour que le MJ le précise au lieu de le présumer. */
export function unknownArmorMaterials(participant, locationId = null) {
  return wornArmourPieces(participant, locationId).filter(item => armorMaterial(item) === 'unknown').map(item => item.name || item.id || 'armure');
}
