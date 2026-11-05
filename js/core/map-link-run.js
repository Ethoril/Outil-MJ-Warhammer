/**
 * Course signalée par la carte (`map.ran { ref }`, L6) : proposition au MJ, jamais de décompte sans son clic (décision du 05/11).
 * Module pur : `runProposalOf` dit quoi afficher ; le clic passe par `Store.spendV5RunAction`.
 */
import { mapRefOf } from './map-link-state.js';

/**
 * `participants` : scène ; `currentActorId` : combattant du Tour ; `actionSpent(id)` : Action déjà dépensée ce Tour.
 * Rend `null` (ref inconnu), ou `{ actorId, canSpend, message }`.
 */
export function runProposalOf(ref, { participants = [], currentActorId = null, actionSpent = () => false } = {}) {
  const actor = participants.find(row => mapRefOf(row) === ref);
  if (!actor) return null;
  const name = actor.name || 'Ce combattant';
  if (actor.id !== currentActorId) return { actorId: actor.id, canSpend: false, message: `${name} a couru hors de son Tour : aucune Action à décompter.` };
  if (actionSpent(actor.id)) return { actorId: actor.id, canSpend: false, message: `${name} a couru, mais son Action de ce Tour est déjà dépensée.` };
  return { actorId: actor.id, canSpend: true, message: `${name} a couru : Action utilisée ?` };
}
