import { casterCaracs } from './creature-abilities.js';

/**
 * Options de surpuissance propres à un sort (V5 p. 236 : « Spells may have additional options in their descriptions ») :
 * « +N DR : … » ou « pour chaque +N DR : … ». Le contrat porte `overcast.specific` ; l'interface envoie `overcastSpecific = { id: pas }`
 * et la dépense totale (`overcastChoices.special`) doit être égale à la somme des coûts.
 *
 * Genres d'option exécutés par le moteur : `trait-rating` (note d'un trait de créature : Peur, Terreur), `ward-improve` (seuil de
 * Protection), `secondary-sl` (modificateur du Test secondaire de la cible), `damage-base` (dégâts de base du projectile).
 * `contract-rule` applique les champs d’option déclaratifs (Tests, exclusions, durée, statistiques et reçus).
 * Tout autre genre (`reminder`) n'est qu'un rappel chiffré pour le MJ : il ne change aucune valeur du moteur.
 */
export const SPECIFIC_OVERCAST_KINDS = Object.freeze(['trait-rating', 'ward-improve', 'secondary-sl', 'damage-base','chain-limit','contract-rule']);

export function resolveSpecificOvercast(contract, selection) {
  const defs = contract?.overcast?.specific || [];
  const chosen = selection && typeof selection === 'object' ? selection : {};
  const errors = [];
  const entries = [];
  for (const [id, raw] of Object.entries(chosen)) {
    const steps = Number(raw);
    if (!steps) continue;
    const def = defs.find(item => item.id === id);
    if (!def) errors.push(`Option de surpuissance inconnue pour ${contract?.name || 'ce sort'} : ${id}.`);
    else if (!Number.isInteger(steps) || steps < 1 || (!def.repeat && steps > 1)) errors.push(`${def.label} : nombre de paliers invalide${def.repeat ? '' : ' (option unique)'}.`);
    else entries.push({ ...def, steps, spent: def.cost * steps });
  }
  return { entries, cost: entries.reduce((sum, entry) => sum + entry.spent, 0), errors };
}

/** Rappel chiffré d'une option : `{pas}` = nombre de paliers, `{bfm}` = Bonus de Force Mentale du lanceur, `{total}` = pas × bfm. */
export function specificOvercastReminder(entry, caster) {
  const bfm = Math.floor((Number(casterCaracs(caster).FM) || 0) / 10);
  const text = entry.reminder || entry.label;
  return text.replaceAll('{pas}', entry.steps).replaceAll('{bfm}', bfm).replaceAll('{total}', entry.steps * bfm);
}

/** Augmente la note d'un trait `Nom (n)` d'une liste (ajoute `Nom (n)` si absent) ; la liste d'origine n'est pas modifiée. */
export function raiseTraitRating(traits, name, amount) {
  const pattern = new RegExp(`^${name}\\s*\\((\\d+)\\)`, 'i');
  const list = [...traits];
  const index = list.findIndex(trait => pattern.test(String(trait)));
  if (index === -1) list.push(`${name} (${amount})`);
  else list[index] = String(list[index]).replace(pattern, (_, rating) => `${name} (${Number(rating) + amount})`);
  return list;
}

