/**
 * Retours de la carte (contrat §10, lot L5) : module pur. Pions « à poser », paires d'engagement envoyées à la carte
 * (`mj.engagements`), suggestions d'engagement tirées de `map.adjacency`, conversion d'une distance en cases (§4, §14 D4).
 * Rien n'est appliqué ici : une suggestion ne devient un engagement que sur le clic du MJ.
 */
import { mapRefOf } from './map-link-state.js';
import { activeEngagements, canBeEngaged, engagedWith } from './engagements.js';
import { outnumberSide } from './outnumbering.js';

/** Délai de réponse à `mj.distanceQuery` : passé ce délai, la distance n'est pas préremplie. */
export const DISTANCE_QUERY_TIMEOUT_MS = 3000;

const pairKeyOf = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Montures fusionnées (§8.1) : `Map` ref de la monture → ref de son cavalier monté. La carte garde la monture
 * en réserve (map.unplaced) et la résout par `rider.ref` dans le pion du cavalier (MAP-03).
 */
export function mergedMountRefsOf(states = {}) {
  const merged = new Map();
  for (const state of Object.values(states)) if (state?.mounted === true && state.rider?.ref) merged.set(state.rider.ref, state.ref);
  return merged;
}

/** Pion posé sur la carte : posé lui-même, ou monture fusionnée dont le cavalier est posé. */
export function isRefPlaced(ref, states = {}, placed = new Set()) {
  if (placed.has(ref)) return true;
  const riderRef = mergedMountRefsOf(states).get(ref);
  return riderRef !== undefined && placed.has(riderRef);
}

/** Pions liés que la carte n'a pas encore posés : `[{ ref, label }]`, triés par nom ; une monture fusionnée suit son cavalier. */
export function pendingTokensOf(states = {}, placed = new Set()) {
  const merged = mergedMountRefsOf(states);
  return Object.values(states).filter(state => state?.ref && !placed.has(state.ref) && !merged.has(state.ref))
    .map(state => ({ ref: state.ref, label: state.label || '' })).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

/** Engagements actifs en `ref` de carte (`mj.engagements { pairs }`), chaque paire et la liste triées. */
export function engagementPairsOf(participants = []) {
  const refOf = new Map(participants.map(person => [person.id, mapRefOf(person)]));
  return activeEngagements({ participants }, participants)
    .filter(row => refOf.has(row.a) && refOf.has(row.b))
    .map(row => [refOf.get(row.a), refOf.get(row.b)].sort())
    .sort((x, y) => (x[0] + '|' + x[1]).localeCompare(y[0] + '|' + y[1]));
}

/**
 * Suggestions d'engagement d'un `map.adjacency { pairs }` : deux combattants distincts de la scène, engageables
 * (en jeu, debout), de camps opposés et pas déjà engagés ensemble ; une paire répétée ou inversée ne compte qu'une fois.
 * Rend `[{ key, aId, bId, aName, bName }]`.
 */
export function engagementSuggestionsOf(pairs, participants = []) {
  const byRef = new Map(participants.map(person => [mapRefOf(person), person]));
  const seen = new Set(), suggestions = [];
  for (const pair of Array.isArray(pairs) ? pairs : []) {
    if (!Array.isArray(pair) || pair.length !== 2) continue;
    const a = byRef.get(pair[0]), b = byRef.get(pair[1]);
    if (!a || !b || a.id === b.id) continue;
    const key = pairKeyOf(a.id, b.id);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!canBeEngaged(a) || !canBeEngaged(b) || outnumberSide(a) === outnumberSide(b)) continue;
    if (engagedWith({ participants }, participants, a.id).includes(b.id)) continue;
    suggestions.push({ key, aId: a.id, bId: b.id, aName: a.name || a.id, bName: b.name || b.id });
  }
  return suggestions;
}

/**
 * Mètres par case selon l'usage (§4) : déplacements et armes à distance 2 m ; sorts, prières et effets de talents 1 m.
 */
export const METERS_PER_CELL = Object.freeze({ ranged: 2, move: 2, spell: 1, prayer: 1, talent: 1 });

/** Distance en mètres d'une mesure en cases (demi-cases comprises, §14 D4) ; `null` si la mesure ou l'usage est invalide. */
export function distanceMetersOf(cells, use) {
  const perCell = METERS_PER_CELL[use];
  if (!perCell || typeof cells !== 'number' || !Number.isFinite(cells) || cells < 0) return null;
  return cells * perCell;
}
