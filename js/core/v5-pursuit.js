// Poursuite selon le Livre de base V5, p. 158-159. Module pur : aucune écriture, aucune mutation des entrées. La règle est
// ici ; le calcul des Tests (poursuite, Obstacle) viendra au-dessus (docs/specs/poursuite-v5).
import { rangeCellsOf } from './map-link-state.js';
import { resolveV5Opposition } from './v5-roll.js';
import { PURSUIT_OBSTACLES } from '../data/v5-pursuit-obstacles.js';

/** Écart de DR au Test opposé qui met fin à la poursuite (le MJ a dit 6 ; la v3 du livre pourrait donner 5). */
export const PURSUIT_CATCH_DR = 6;
export const PURSUIT_SOURCE = 'Livre de base V5, p. 158-159';

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const v5Of = participant => participant?.extensions?.v5 || {};
const known = value => (Number.isFinite(value) ? value : null);
const knownOf = (ids, movement) => (ids || []).map(id => known(movement?.[id])).filter(value => value !== null);

/** Mouvement compté (D14) : Marche courante (États, séquelles), celle de la monture pour un cavalier monté ; null si inconnu. */
export function pursuitMovementOf(participant, participants = []) {
  if (!participant) return null;
  const v5 = v5Of(participant);
  const carrier = v5.mounted === true ? participants.find(row => row?.id === v5.mountId) : participant;
  return carrier ? known(rangeCellsOf(carrier).speedCells) : null;
}

/** Paire du Test opposé (D10) : plus rapide poursuivant contre plus lent fuyard, à égalité le premier de la liste. `override` : correction du MJ. */
export function pickPursuitPair({ preyIds = [], pursuerIds = [], movement = {}, override = null } = {}) {
  if (override?.pursuerId && override?.preyId) return { pursuerId: override.pursuerId, preyId: override.preyId, forced: true };
  const pick = (ids, better) => ids.reduce((best, id) => {
    const value = known(movement[id]);
    if (best === null) return { id, value };
    if (value === null) return best;
    return best.value === null || better(value, best.value) ? { id, value } : best;
  }, null);
  const pursuer = pick(pursuerIds, (a, b) => a > b), prey = pick(preyIds, (a, b) => a < b);
  return pursuer && prey ? { pursuerId: pursuer.id, preyId: prey.id, forced: false } : null;
}

/** Fin d'office (CA3) : le plus lent d'un camp a au moins le double du Mouvement du plus rapide de l'autre. null sinon. */
export function movementVerdict({ preyIds = [], pursuerIds = [], movement = {} } = {}) {
  const prey = knownOf(preyIds, movement), pursuers = knownOf(pursuerIds, movement);
  if (!prey.length || !pursuers.length) return null;
  const doubles = (slow, fast) => Math.min(...slow) > 0 && Math.min(...slow) >= 2 * Math.max(...fast);
  if (doubles(pursuers, prey)) return { kind: 'caught', reason: 'double-movement', label: 'Mouvement double : le plus lent des poursuivants fait au moins le double du plus rapide des fuyards' };
  if (doubles(prey, pursuers)) return { kind: 'escaped', reason: 'double-movement', label: 'Mouvement double : le plus lent des fuyards fait au moins le double du plus rapide des poursuivants' };
  return null;
}

/** Vainqueur du Test de poursuite à partir des DR ; l'égalité va au poursuivant (D16, initiateur). null tant qu'un jet manque. */
export function pursuitOpposition(opposed) {
  const pursuerSl = opposed?.pursuer?.sl, preySl = opposed?.prey?.sl;
  if (!Number.isFinite(pursuerSl) || !Number.isFinite(preySl)) return null;
  const result = resolveV5Opposition({ sl: pursuerSl }, { sl: preySl });
  return { netSl: result.netSl, winner: result.winner === 'initiator' ? 'pursuer' : 'prey' };
}

/** Camp qui franchit les Obstacles (D12) : celui des PJ ; 'none' si les deux côtés en ont (simple Test opposé) ; null sans PJ (le MJ désigne). */
export function pursuitObstacleSide({ preyIds = [], pursuerIds = [], isPlayer = () => false } = {}) {
  const prey = preyIds.some(isPlayer), pursuers = pursuerIds.some(isPlayer);
  return prey && pursuers ? 'none' : prey ? 'prey' : pursuers ? 'pursuers' : null;
}

/**
 * Facteurs favorables déductibles (D13) pour le camp qui franchit les Obstacles : Test de poursuite gagné, et son membre le plus
 * lent plus rapide que le plus rapide d'en face. Le terrain reste au MJ (false). Trois cases booléennes.
 */
export function suggestFactors({ opposed = null, movement = {}, preyIds = [], pursuerIds = [], obstacleSide = 'prey' } = {}) {
  const preyCamp = obstacleSide === 'prey';
  const own = knownOf(preyCamp ? preyIds : pursuerIds, movement), other = knownOf(preyCamp ? pursuerIds : preyIds, movement);
  const outcome = pursuitOpposition(opposed);
  return {
    won: outcome !== null && outcome.winner === (preyCamp ? 'prey' : 'pursuer'),
    speed: own.length > 0 && other.length > 0 && Math.min(...own) > Math.max(...other),
    terrain: false
  };
}

/** Réussites exigées (V5 p. 158-159) : aucun facteur, tout le groupe ; un ou deux, la moitié arrondie au supérieur ; trois, un seul. */
export function obstacleCountRequired(groupSize, factorCount) {
  if (!Number.isInteger(groupSize) || groupSize < 1) throw new RangeError('Taille de groupe invalide');
  if (!Number.isInteger(factorCount) || factorCount < 0 || factorCount > 3) throw new RangeError('Les facteurs favorables vont de 0 à 3');
  return factorCount === 0 ? groupSize : factorCount === 3 ? 1 : Math.ceil(groupSize / 2);
}

const copySkills = skills => skills.map(row => ({ ...row }));

/** Obstacle tiré au d10 (injecté, CA8) : { id, label, skills[], free: false }. */
export function drawObstacle(d10, table = PURSUIT_OBSTACLES) {
  if (!Number.isInteger(d10) || d10 < 1 || d10 > table.length) throw new RangeError(`d10 attendu entre 1 et ${table.length}`);
  const row = table[d10 - 1];
  return { id: row.id, label: row.label, skills: copySkills(row.skills), free: false };
}

/** Obstacle libre du MJ (CA9) : intitulé et compétences admises. */
export function freeObstacle({ label, skills } = {}) {
  const text = String(label ?? '').trim();
  const names = (Array.isArray(skills) ? skills : []).map(name => String(name ?? '').trim()).filter(Boolean);
  if (!text) throw new TypeError('Intitulé d’obstacle manquant');
  if (!names.length) throw new TypeError('Au moins une compétence admise');
  return { id: 'libre', label: text, skills: names.map(name => ({ prefix: fold(name), label: name, use: '' })), free: true };
}

/**
 * Issue de la poursuite (CA2, CA3, D12, D15). `state` : { preyIds, pursuerIds, movement, obstacleSide, opposed, factors, obstacles }.
 * Rend { outcome, pending, netSl, winner, required, crossedIds, partial } ; outcome = null tant que rien ne tranche.
 * `outcome` = { kind: 'caught'|'escaped', reason: 'double-movement'|'dr6'|'opposed'|'obstacles', label }.
 */
export function evaluatePursuit(state = {}) {
  const { preyIds = [], pursuerIds = [], movement = {}, obstacleSide = null, opposed = null, factors = {}, obstacles = [] } = state;
  const base = { outcome: null, pending: null, netSl: null, winner: null, required: null, crossedIds: [], partial: null };
  const verdict = movementVerdict({ preyIds, pursuerIds, movement });
  if (verdict) return { ...base, outcome: verdict };
  const result = pursuitOpposition(opposed);
  if (!result) return { ...base, pending: 'opposed' };
  const { netSl, winner } = result;
  const withOpposition = patch => ({ ...base, netSl, winner, ...patch });
  if (Math.abs(netSl) >= PURSUIT_CATCH_DR) {
    const kind = netSl > 0 ? 'caught' : 'escaped';
    return withOpposition({ outcome: { kind, reason: 'dr6', label: `Écart de ${Math.abs(netSl)} DR en faveur des ${kind === 'caught' ? 'poursuivants' : 'fuyards'}` } });
  }
  if (obstacleSide === 'none') {
    return withOpposition({ outcome: { kind: winner === 'pursuer' ? 'caught' : 'escaped', reason: 'opposed', label: 'Test opposé entre joueurs' } });
  }
  if (obstacleSide !== 'prey' && obstacleSide !== 'pursuers') return withOpposition({ pending: 'obstacle-side' });
  const group = obstacleSide === 'prey' ? preyIds : pursuerIds;
  const required = obstacleCountRequired(group.length, ['won', 'speed', 'terrain'].filter(key => factors[key] === true).length);
  const tested = obstacles.filter(row => group.includes(row.participantId) && row.test);
  const crossedIds = tested.filter(row => row.test.success === true).map(row => row.participantId);
  const groupWins = crossedIds.length >= required;
  if (!groupWins && tested.length < group.length) return withOpposition({ pending: 'obstacles', required, crossedIds });
  const preyGroup = obstacleSide === 'prey';
  const kind = groupWins === preyGroup ? 'escaped' : 'caught';
  const label = `${crossedIds.length} Obstacle(s) franchi(s) sur ${required} exigé(s)`;
  const partial = !groupWins && crossedIds.length > 0 ? { crossedIds, canEscapeAnyway: preyGroup, canContinueAlone: !preyGroup } : null;
  return withOpposition({ outcome: { kind, reason: 'obstacles', label }, required, crossedIds, partial });
}
