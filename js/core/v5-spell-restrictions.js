/**
 * REGLES-10 (MJ 12/11) : deux restrictions de sorts appliquées par le moteur, et non plus seulement rappelées.
 *
 * - `cannotActUntilNextRound` (Chant vivifiant, WoM p. 87 : « Les créatures endormies ou en dormance doivent passer 1 Round à
 *   s’éveiller avant de pouvoir agir. ») : la créature dormante perd son prochain Tour. Si son Tour du Round de lancement est
 *   encore à venir, elle perd celui-là ; s’il est déjà passé, elle perd celui du Round suivant (MJ, Q1). Tant qu’elle s’éveille :
 *   ni Action, ni Mouvement, ni défense active (Esquive, Parade, réactions) ; les Tests subis restent résolus contre elle (Q2).
 *   Le blocage vit dans une couche dédiée (`awakening: true`), retirée à la fin du Tour perdu (`expiresAfterTurnOf`) ; le nom du
 *   drapeau est gardé pour rester compatible avec les données existantes.
 * - `cannotFlee` (Acceptation du Destin, variante ennemie, WoM p. 122 : « ne peuvent pas fuir le combat tant que le Sort est
 *   actif ») : la Fuite engagée et la fuite d’un Brisé (Flee, puis Sprint) sont refusées ; le Désengagement par Test ou par Élan
 *   et Se cacher restent permis (MJ, Q3). Le drapeau suit la couche du sort.
 *
 * Un champ absent se lit comme vide : aucune couche, aucun blocage.
 */
import { unsuppressedSpellEffects } from './v5-spell-effects-active.js';

export const AWAKENING_FLAG = 'cannotActUntilNextRound';
export const NO_FLEE_FLAG = 'cannotFlee';

const layers = participant => unsuppressedSpellEffects(participant?.extensions?.v5?.spellEffects);
const nameOf = participant => participant?.name || participant?.id || 'La cible';

/** Couche active qui porte `flag`, ou à défaut le drapeau fusionné (données sans couche) ; `null` sinon. */
function restrictingSpell(participant, flag) {
  const layer = layers(participant).find(effect => effect.specialState?.[flag] === true);
  if (layer) return layer.spellName || 'Un sort';
  return participant?.extensions?.v5?.specialStates?.[flag] === true ? 'Un sort' : null;
}

/** Nom du sort qui tient la créature en éveil (Chant vivifiant), ou `null`. */
export const awakeningSpell = participant => restrictingSpell(participant, AWAKENING_FLAG);
/** Nom du sort qui interdit la fuite (Acceptation du Destin), ou `null`. */
export const noFleeSpell = participant => restrictingSpell(participant, NO_FLEE_FLAG);

/** Message de refus d’une Action, d’un Mouvement ou d’une défense pendant l’éveil. */
export function awakeningMessage(participant, what = 'agir') {
  const spell = awakeningSpell(participant);
  return spell ? `${spell} : ${nameOf(participant)} s’éveille et perd son prochain Tour ; ${what === 'defend' ? 'aucune défense active (Esquive, Parade, réaction)' : what === 'move' ? 'aucun Mouvement' : 'aucune Action ni aucun Mouvement'} avant la fin de ce Tour.` : null;
}

/** Message de refus d’une fuite. */
export function noFleeMessage(participant) {
  const spell = noFleeSpell(participant);
  return spell ? `${spell} : ${nameOf(participant)} ne peut pas fuir le combat tant que le sort est actif (le Désengagement reste permis).` : null;
}

/**
 * Round du Tour perdu par la créature éveillée. `order` : ordre effectif des Tours ; `currentActorId` : acteur du Tour en cours
 * (le lanceur). Tour encore à venir dans ce Round → ce Round ; Tour passé ou en cours → Round suivant. Ordre inconnu : ce Round.
 */
export function awakeningLostTurnRound({ order = [], currentActorId = null, targetId, round = 1 } = {}) {
  const current = order.indexOf(currentActorId), target = order.indexOf(targetId);
  if (current < 0 || target < 0) return round;
  return target > current ? round : round + 1;
}

/**
 * Définition de la couche d’éveil à poser sur la cible, à côté de la couche principale du sort (qui perd le drapeau).
 * Échéance de secours en Rounds : début du Round qui suit le Tour perdu.
 */
export function awakeningLayer({ id, spellId, spellName, castExecutionId, targetId, lostTurnRound, round }) {
  return { id, spellId, spellName, castExecutionId, awakening: true, specialState: { [AWAKENING_FLAG]: true },
    durationRounds: Math.max(1, lostTurnRound + 1 - round), expiresAfterTurnOf: { actorId: targetId, round: lostTurnRound } };
}

/** Couche à retirer à cette transition : Tour perdu terminé, ou Round du Tour perdu dépassé (saut de Round). */
export function awakeningLayerDone(effect, { round, endedTurn = null } = {}) {
  const until = effect?.expiresAfterTurnOf;
  if (!until || typeof until !== 'object' || !Number.isFinite(Number(until.round))) return false;
  if (Number(round) > Number(until.round)) return true;
  return Boolean(endedTurn && endedTurn.actorId === until.actorId && Number(endedTurn.round) >= Number(until.round));
}
