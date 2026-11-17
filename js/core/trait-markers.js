// Lectures et marqueurs de Traits sans dépendance vers le tour ni la résolution : Inflammable et ouverture du suivi d'Increvable.
// Module feuille (ARCH-03) : `v5-effects`, `v5-test-context` et `v5-critical-aftermath` le lisent sans passer par `trait-effects`,
// qui dépend, lui, du moteur de résolution. `trait-effects` les ré-exporte.
import { stateTraits } from './creature-states.js';

const foldName = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s*\(.*$/, '').trim();
const v5Of = participant => participant?.extensions?.v5 || {};
const bonusOf = value => (Number.isFinite(Number(value)) && value !== null && value !== '' && value !== undefined ? Math.floor(Number(value) / 10) : null);

/** Inflammable (Flammable, L07) : Trait imprimé ou coché, lu dans `traits` et `extensions.traits` (D11). */
export function isFlammable(participant) {
  return [...(Array.isArray(participant?.traits) ? participant.traits : []), ...(Array.isArray(participant?.extensions?.traits) ? participant.extensions.traits : [])]
    .some(trait => ['flammable', 'inflammable'].includes(foldName(typeof trait === 'string' ? trait : trait?.name ?? trait?.nom)));
}

/** Mort d'un porteur d'Increvable à corps intact : Test étendu pendant BE Rounds (D15). Sans la case, sans Trait ou sans Endurance : inchangé. */
export function startDieHard(participant, { round = null, bodyIntact = false } = {}) {
  const rounds = bonusOf(participant?.caracs?.E);
  const copy = structuredClone(participant);
  if (bodyIntact !== true || !stateTraits(participant).some(trait => trait.key === 'diehard') || rounds === null || rounds < 1) return copy;
  return { ...copy, extensions: { ...(copy.extensions || {}), v5: { ...v5Of(copy), dieHard: { total: 0, roundsLeft: rounds, bodyIntact: true, startRound: round, lastRound: round, ended: null } } } };
}
