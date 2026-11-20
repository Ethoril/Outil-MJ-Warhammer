/**
 * Pièces d'armure retirées pour une rencontre : un PJ peut combattre sans toute son armure (surpris au lit, casque ôté…).
 * Les objets de la fiche ne changent pas ; la liste des pièces ôtées vit sur le participant, dans `extensions.v5.removedArmour`
 * (identifiants d'objets). Son absence vaut « tout est porté », sans réécrire les données. Module sans dépendance (pas de cycle).
 */

/** Identifiants des pièces d'armure ôtées ; une liste absente ou malformée vaut vide. */
export function removedArmourIds(participant) {
  const stored = participant?.extensions?.v5?.removedArmour;
  return Array.isArray(stored) ? stored.filter(id => typeof id === 'string' && id !== '') : [];
}

/** Vrai sauf pour une pièce d'armure (kind « armour ») ôtée ; armes, boucliers et munitions restent toujours comptés. */
export function isArmourWorn(participant, item) {
  return !(item?.kind === 'armour' && removedArmourIds(participant).includes(item.id));
}

/** Équipement réellement porté : l'inventaire sans les pièces d'armure ôtées. */
export function wornEquipment(participant) {
  const equipment = Array.isArray(participant?.equipment) ? participant.equipment : [];
  const removed = removedArmourIds(participant);
  return removed.length ? equipment.filter(item => !(item?.kind === 'armour' && removed.includes(item.id))) : equipment;
}

/** Extensions du participant après avoir mis (worn = true) ou ôté (false) une pièce. Pur ; une liste vide est retirée. */
export function extensionsWithArmourWorn(participant, itemId, worn) {
  const extensions = participant?.extensions && typeof participant.extensions === 'object' ? participant.extensions : {};
  const v5 = extensions.v5 && typeof extensions.v5 === 'object' ? { ...extensions.v5 } : {};
  const removed = removedArmourIds(participant).filter(id => id !== itemId);
  if (!worn) removed.push(itemId);
  if (removed.length) v5.removedArmour = removed; else delete v5.removedArmour;
  return { ...extensions, v5 };
}
