// Poursuite selon le Livre de base V5, p. 158-159. Module pur : aucune écriture, aucune mutation des entrées. La règle est
// ici, avec le calcul des Tests (poursuite, Obstacle) par le calcul commun des Tests secondaires (docs/specs/poursuite-v5).
import { rangeCellsOf } from './map-link-state.js';
import { carriesMovement, planMovement } from './creature-movement.js';
import { resolveV5Opposition } from './v5-roll.js';
import { effectiveSkillScore } from './v5-magic-talents.js';
import { previewV5SecondaryTest, secondaryTestDetail } from './v5-test-modifiers.js';
import { applicableV5TalentTestFields } from './v5-talent-tests.js';
import { getReferenceCatalogue } from './reference-catalog.js';
import { PURSUIT_OBSTACLES } from '../data/v5-pursuit-obstacles.js';
import { CARAC_BY_LOWER } from './carac-keys.js';

/** Écart de DR au Test opposé qui met fin à la poursuite (le MJ a dit 6 ; la v3 du livre pourrait donner 5). */
export const PURSUIT_CATCH_DR = 6;
export const PURSUIT_SOURCE = 'Livre de base V5, p. 158-159';

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const v5Of = participant => participant?.extensions?.v5 || {};
const known = value => (Number.isFinite(value) ? value : null);
const knownOf = (ids, movement) => (ids || []).map(id => known(movement?.[id])).filter(value => value !== null);
const hasState = (participant, key) => (participant?.states || []).some(state => fold(state?.name || state?.key).replace(/[-_]+/g, ' ') === key && Number(state?.level ?? 1) > 0);

/**
 * Mouvement compté (D14) : Marche courante (États, séquelles), celle de la monture pour un cavalier monté ; null si inconnu.
 * La carte arrondit ses cases (`rangeCellsOf`) ; la poursuite compare la moitié exacte (D22) : À terre et Sonné M/2, Vol indice/2.
 * Les États sans Move (Surpris, Enchevêtré, Inconscient) et l'inconnu restent ceux de la carte (0, null).
 */
export function pursuitMovementOf(participant, participants = []) {
  if (!participant) return null;
  const v5 = v5Of(participant);
  const carrier = v5.mounted === true ? participants.find(row => row?.id === v5.mountId) : participant;
  if (!carrier) return null;
  // Sans À terre ni Sonné (qu'elle arrondit), la carte dit encore l'inconnu (null) et l'absence de Move (0).
  const halving = state => ['a terre', 'sonne'].some(key => hasState({ states: [state] }, key));
  const cells = known(rangeCellsOf({ ...carrier, states: (carrier.states || []).filter(state => !halving(state)) }).speedCells);
  if (!cells) return cells;
  const effective = v5Of(carrier).sequelaEffects?.movement?.effective, raw = carrier.movement ?? carrier.caracs?.M;
  const base = Number.isFinite(effective) ? effective : Number(raw);
  if (hasState(carrier, 'a terre')) return base / 2;
  const walk = hasState(carrier, 'sonne') ? base / 2 : base;
  return carriesMovement(carrier, 'fly') ? Math.max(walk, planMovement(carrier, 'fly').movement.rating / 2) : walk;
}

/** Mouvements qui empêchent tout verdict de Mouvement (D22) : inconnus ou nuls, avec le participant et le motif. */
export function pursuitMovementIssues({ preyIds = [], pursuerIds = [], movement = {} } = {}) {
  return [...preyIds, ...pursuerIds].flatMap(id => {
    const value = known(movement?.[id]);
    if (value === null) return [{ participantId: id, reason: 'unknown', label: 'Mouvement inconnu : à saisir par le MJ' }];
    return value > 0 ? [] : [{ participantId: id, reason: 'zero', label: 'Mouvement nul (Surpris, Enchevêtré…) : à corriger par le MJ' }];
  });
}

/**
 * Paire du Test opposé (D10) : plus rapide poursuivant contre plus lent fuyard, à égalité le premier de la liste. `override` : correction du
 * MJ. null tant qu'un Mouvement de la poursuite est inconnu ou nul (D22).
 */
export function pickPursuitPair({ preyIds = [], pursuerIds = [], movement = {}, override = null } = {}) {
  if (override?.pursuerId && override?.preyId) return { pursuerId: override.pursuerId, preyId: override.preyId, forced: true };
  if (!preyIds.length || !pursuerIds.length || pursuitMovementIssues({ preyIds, pursuerIds, movement }).length) return null;
  const pick = (ids, better) => ids.reduce((best, id) => (best === null || better(movement[id], movement[best]) ? id : best), null);
  return { pursuerId: pick(pursuerIds, (a, b) => a > b), preyId: pick(preyIds, (a, b) => a < b), forced: false };
}

/** Fin d'office (CA3) : le plus lent d'un camp a au moins le double du Mouvement du plus rapide de l'autre. null sinon, ou tant qu'un Mouvement est inconnu ou nul (D22). */
export function movementVerdict({ preyIds = [], pursuerIds = [], movement = {} } = {}) {
  const prey = knownOf(preyIds, movement), pursuers = knownOf(pursuerIds, movement);
  if (!prey.length || !pursuers.length || pursuitMovementIssues({ preyIds, pursuerIds, movement }).length) return null;
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
    speed: own.length > 0 && other.length > 0 && !pursuitMovementIssues({ preyIds, pursuerIds, movement }).length && Math.min(...own) > Math.max(...other),
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
 * Rend { outcome, pending, netSl, winner, required, crossedIds, partial, movementIssues } ; outcome = null tant que rien ne tranche ;
 * pending = 'movement' tant qu'un Mouvement est inconnu ou nul (D22), `movementIssues` dit lequel et pourquoi.
 * `outcome` = { kind: 'caught'|'escaped', reason: 'double-movement'|'dr6'|'opposed'|'obstacles', label }.
 */
export function evaluatePursuit(state = {}) {
  const { preyIds = [], pursuerIds = [], movement = {}, obstacleSide = null, opposed = null, factors = {}, obstacles = [] } = state;
  const base = { outcome: null, pending: null, netSl: null, winner: null, required: null, crossedIds: [], partial: null, movementIssues: [] };
  const movementIssues = pursuitMovementIssues({ preyIds, pursuerIds, movement });
  if (movementIssues.length) return { ...base, pending: 'movement', movementIssues };
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

// --- Tests (CA6, CA7, CA10, CA11) ---------------------------------------------------------------------------------------

/** Compétences du Test de poursuite (V5 p. 158) : préfixe replié, libellé, Caractéristique si la fiche ne porte pas la compétence. */
export const PURSUIT_TEST_SKILLS = Object.freeze([
  { prefix: 'athletisme', label: 'Athlétisme', carac: 'Ag' }, { prefix: 'conduite', label: 'Conduite', carac: 'Ag' },
  { prefix: 'chevaucher', label: 'Chevaucher', carac: 'Ag' }, { prefix: 'natation', label: 'Natation', carac: 'F' }
].map(row => Object.freeze(row)));

const waiting = (error, field) => ({ ready: false, error, needsInput: [{ field, label: error }], unresolved: [error] });
const rollError = roll => (Number.isInteger(roll) && roll >= 1 && roll <= 100 ? null : 'Fournir le jet d100 du Test.');
const foldName = value => fold(value).replace(/[’‘`]/g, "'");
/** Compétence du catalogue de l'outil (D23) : nom replié sans spécialité, de base ou avancée, Caractéristique ; null si inconnue. */
function catalogSkillOf(prefix) {
  const generic = getReferenceCatalogue().skills.filter(row => !row.specialization), name = row => foldName(row.nom || row.name);
  const entry = generic.find(row => name(row) === prefix) || generic.find(row => name(row).startsWith(prefix + ' '));
  return entry ? { name: name(entry), basic: entry.basic === true, carac: CARAC_BY_LOWER[String(entry.carac ?? '').toLowerCase()] || null } : null;
}
/**
 * Meilleure ligne de fiche de la compétence `base` : nom exact ou suivi d'une spécialité entre parenthèses (« Résistance » n'attrape pas
 * « Résistance à l'alcool » ; « Corps à corps » prend la meilleure de ses spécialités). null si la fiche ne la porte pas.
 */
const skillRowOf = (actor, base) => (actor?.skills || [])
  .filter(row => row?.status === 'resolved' && Number.isInteger(row.total ?? row.value))
  .filter(row => { const name = foldName(row.name || row.nom); return name === base || name.startsWith(base + ' ('); })
  .reduce((best, row) => (best && (best.total ?? best.value) >= (row.total ?? row.value) ? best : row), null);

/** Bon marcheur (`talent-striding-gait`) : question du terrain de la poursuite, avec la réponse déjà donnée ; null sans le talent. */
function terrainChoice(actor, context) {
  if (context.pursuit !== true) return null;
  const field = applicableV5TalentTestFields(actor).find(row => row.talentId === 'talent-striding-gait' && row.field === 'terrain');
  return field ? { field: 'terrain', talentId: field.talentId, label: 'Bon marcheur : le terrain de la poursuite est-il son terrain de prédilection ?',
    options: [...(field.options || []).map(option => ({ value: option.value, label: 'Oui : ' + option.label })), { value: 'none', label: 'Non' }], value: context.terrain } : null;
}

/**
 * Test calculé par le calcul commun. Les talents de poursuite (Fuite !, Impitoyable, Grandes enjambées) ne sont lus que par leurs
 * contrats, via `context.pursuit` et `context.pursuitRole` : aucun modificateur manuel (CA11). Compétence absente de la fiche (D23) :
 * de base, sa Caractéristique ; avancée, refusée. Bon marcheur : le terrain se demande au MJ (`needsInput`, puis `choices` pour y revenir).
 * Rend le résultat de `previewV5SecondaryTest` (non prêt : `needsInput`, `restrictions`, `blocked`) plus `skill`, `score`, `test`, `detail`.
 */
function pursuitSecondary(actor, { skillName, prefix, roll, context }) {
  const catalog = catalogSkillOf(prefix), skillRow = skillRowOf(actor, catalog?.name ?? prefix);
  if (!skillRow && catalog?.basic !== true) return waiting(catalog ? `Compétence avancée ${skillName} absente de la fiche : choisissez l’autre compétence proposée.`
    : `Compétence ${skillName} absente de la fiche.`, 'skill');
  const carac = skillRow?.carac || catalog.carac;
  const base = skillRow ? skillRow.total ?? skillRow.value : Number(actor?.caracs?.[carac]);
  if (!Number.isFinite(base)) return waiting(`Caractéristique de ${skillName} introuvable sur la fiche.`, 'skill');
  const label = skillRow?.name || skillRow?.nom || skillName;
  const secondary = previewV5SecondaryTest(actor, { score: effectiveSkillScore(actor, base, carac), roll, kind: 'test',
    test: { characteristic: carac, skill: label, isAction: true }, context });
  const choice = terrainChoice(actor, context), choices = choice ? [choice] : [];
  if (secondary.blocked) return { ...secondary, choices };
  if (choice && context.terrain === undefined) return { ...secondary, ready: false, choices, needsInput: [...(secondary.ready ? [] : secondary.needsInput), choice],
    unresolved: [...(secondary.ready ? [] : secondary.unresolved), choice.label] };
  if (!secondary.ready) return { ...secondary, choices };
  return { ...secondary, choices, skill: label, score: secondary.result.score, test: secondary.result, detail: secondaryTestDetail(secondary) };
}

/**
 * Test de poursuite d'un personnage (CA6, CA7). `input` : { skill, roll, role: 'prey'|'pursuer', context? }. La poursuite implique un
 * mouvement ; seule la proie fuit : une proie Brisée n'a pas de pénalité, un poursuivant Brisé subit le malus sans question (MJ 09/11 CA32).
 * Inconscient et Surpris bloquent (`blocked`, `restrictions`) ; une question d'État sans réponse reste dans `needsInput`.
 */
export function previewPursuitTest(actor, { skill: skillName, roll, role, context = {} } = {}) {
  if (role !== 'prey' && role !== 'pursuer') return waiting('Rôle de poursuite : proie ou poursuivant.', 'role');
  const entry = PURSUIT_TEST_SKILLS.find(row => row.prefix === fold(skillName));
  if (!entry) return waiting('Compétence de poursuite : Athlétisme, Conduite, Chevaucher ou Natation.', 'skill');
  const invalidRoll = rollError(roll);
  if (invalidRoll) return waiting(invalidRoll, 'roll');
  return pursuitSecondary(actor, { skillName: entry.label, prefix: entry.prefix, roll,
    context: { ...context, pursuit: true, pursuitRole: role, involvesMovement: true, runningOrHiding: role === 'prey' } });
}

/**
 * Test d'Obstacle d'un personnage (CA10). `input` : { obstacle, skill, roll, role?, context?, allies? }, `skill` parmi celles de
 * l'obstacle. Un Obstacle n'est pas toujours un déplacement : les questions d'État restent posées au MJ (`context`). Une Réussite
 * éclatante (+5 DR, V5 resultTier) rend `astonishing` et `beneficiaryOptions` : les alliés de la poursuite (D11), l'intéressé exclu.
 */
export function previewObstacleTest(actor, { obstacle, skill: skillName, roll, role, context = {}, allies = [] } = {}) {
  const entry = (obstacle?.skills || []).find(row => fold(row.label) === fold(skillName) || row.prefix === fold(skillName));
  if (!entry) return waiting('Compétence non admise pour cet obstacle.', 'skill');
  const invalidRoll = rollError(roll);
  if (invalidRoll) return waiting(invalidRoll, 'roll');
  const out = pursuitSecondary(actor, { skillName: entry.label, prefix: entry.prefix, roll,
    context: { pursuit: true, ...(role ? { pursuitRole: role } : {}), ...context } });
  if (!out.ready) return out;
  const astonishing = out.test.resultTier?.id === 'success-5-plus';
  return { ...out, astonishing, beneficiaryOptions: astonishing ? allies.filter(row => row?.id !== actor?.id).map(row => ({ id: row.id, name: row.name })) : [] };
}
