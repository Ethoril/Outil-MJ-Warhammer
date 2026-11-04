/**
 * Liaison RPG Map Display (contrat v1, docs/CONTRAT_LIAISON_MAP_DISPLAY.md §4-§5). Module pur : construit l'état
 * `token.state` d'un participant et le diff entre deux instantanés. Pas encore de montures (`rider`, lot 3).
 */
import { creatureSizeOf } from './creature-size.js';
import { carriesSense } from './creature-senses.js';
import { participantCamp } from './encounters.js';

export const MAP_LINK_VERSION = 1;

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const v5Of = participant => participant?.extensions?.v5 || {};

/** Cases du pion par taille (§4) : Petite et Moyenne 1, puis +1 par cran. */
const SIZE_CELLS = { small: 1, average: 1, large: 2, enormous: 3, monstrous: 4 };

/** États de l'outil MJ (clé repliée) → marqueur Map Display (§5). Le reste ne part pas vers la carte. */
const MARKER_BY_STATE = {
  'a terre': 'prone', sonne: 'stunned', inconscient: 'unconscious', aveugle: 'blinded', assourdi: 'deafened',
  hemorragique: 'bleeding', surpris: 'surprised', enchevetre: 'entangled', empetre: 'entangled', enflamme: 'ablaze',
  brise: 'broken', empoisonne: 'poisoned', extenue: 'fatigued', souille: 'tainted', peur: 'fear', terreur: 'terror',
  frenesie: 'frenzy'
};
const stateKey = state => fold(state?.name || state?.key).replace(/[-_]+/g, ' ');

/** `ref` stable : `pj:<id persistant>` pour un PJ (liaison durable), sinon `p:<participantId>`. */
export const mapRefOf = participant => (participant?.kind === 'PJ' && participant?.persistentCharacterId
  ? `pj:${participant.persistentCharacterId}` : `p:${participant?.id}`);

/** Mouvement M du participant (champ `movement`, sinon caractéristique M). */
const movementOf = participant => {
  const raw = participant?.movement ?? participant?.caracs?.M;
  return raw !== null && raw !== undefined && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : null;
};

/** Marche et Course en cases de 2 m (§4) : Marche M×2 m = M cases, Course 2M cases ; Enchevêtré = 0. */
export function rangeCellsOf(participant) {
  const m = movementOf(participant);
  if (m === null) return { speedCells: null, runCells: null };
  const stuck = (participant?.states || []).some(state => MARKER_BY_STATE[stateKey(state)] === 'entangled' && Number(state?.level ?? 1) > 0);
  return stuck ? { speedCells: 0, runCells: 0 } : { speedCells: m, runCells: 2 * m };
}

/** Vision dans le noir en cases (§4) : 1 par défaut, 10 Vision nocturne, 20 Vision dans le noir. */
export const visionDimOf = participant => (carriesSense(participant, 'darkVision') ? 20 : carriesSense(participant, 'nightVision') ? 10 : 1);

/** Santé affichée d'un PNJ (§4). */
export function healthOf(current, max) {
  if (!(max > 0) || current >= max) return 'unharmed';
  return current <= 0 || current <= max / 4 ? 'critical' : 'wounded';
}

/** Marqueurs et niveaux (≥ 2 seulement) ; un même marqueur garde le niveau le plus haut. */
export function markersOf(participant) {
  const levels = {};
  for (const state of participant?.states || []) {
    const marker = MARKER_BY_STATE[stateKey(state)];
    const level = Number(state?.level ?? 1);
    if (!marker || !(level > 0)) continue;
    levels[marker] = Math.max(levels[marker] || 0, level);
  }
  const markers = Object.keys(levels);
  const markerLevels = Object.fromEntries(markers.filter(marker => levels[marker] >= 2).map(marker => [marker, levels[marker]]));
  return { markers, markerLevels };
}

/** La monture d'un PJ est `pc` sur la carte (PV visibles), sans être source de vision. */
const isPjMount = (participant, participants) => {
  const riderId = v5Of(participant).mountOf;
  return Boolean(riderId) && participants.some(row => row.id === riderId && row.kind === 'PJ');
};

/**
 * Payload `token.state` d'un participant (§4). `maxHp` doit être résolu par l'appelant pour un PJ persistant
 * (option `maxHp`) ; à défaut, le maximum retombe sur les PV courants.
 */
export function tokenStateOf(participant, participants = [], { maxHp = null, imageUrl = null } = {}) {
  const pj = participant.kind === 'PJ';
  const current = Number(participant.hp) || 0;
  const max = Number(maxHp ?? participant.maxHp) > 0 ? Number(maxHp ?? participant.maxHp) : Math.max(current, 1);
  return {
    ref: mapRefOf(participant),
    label: participant.name || '',
    camp: participantCamp(participant),
    kind: pj || isPjMount(participant, participants) ? 'pc' : 'npc',
    visionSource: pj,
    imageUrl: pj ? null : imageUrl,
    sizeCells: SIZE_CELLS[creatureSizeOf(participant).key] ?? 1,
    ...rangeCellsOf(participant),
    visionDim: visionDimOf(participant),
    hp: { current: Math.max(0, Math.min(current, max)), max },
    health: healthOf(current, max),
    ...markersOf(participant),
    dead: v5Of(participant).dead === true,
    deathCause: v5Of(participant).dead === true ? (v5Of(participant).deathCause ?? null) : null
  };
}

/** Instantané `{ ref: state }` des participants d'une scène. */
export const tokenStatesOf = (participants = [], options = {}) => Object.fromEntries(participants
  .map(participant => tokenStateOf(participant, participants, { maxHp: options.maxHpOf?.(participant) ?? null, imageUrl: options.imageUrlOf?.(participant) ?? null }))
  .map(state => [state.ref, state]));

/** `ref` dont l'état a changé, apparu ou disparu entre deux instantanés. */
export function diffTokenStates(prev = {}, next = {}) {
  const refs = new Set([...Object.keys(prev), ...Object.keys(next)]);
  return [...refs].filter(ref => JSON.stringify(prev[ref] ?? null) !== JSON.stringify(next[ref] ?? null));
}
