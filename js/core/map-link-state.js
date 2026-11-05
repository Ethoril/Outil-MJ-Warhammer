/**
 * Liaison RPG Map Display (contrat v1, docs/CONTRAT_LIAISON_MAP_DISPLAY.md §4-§5). Module pur : construit l'état
 * `token.state` d'un participant et le diff entre deux instantanés. Pas encore de montures (`rider`, lot 3).
 */
import { creatureSizeOf } from './creature-size.js';
import { carriesSense } from './creature-senses.js';
import { participantCamp } from './encounters.js';
import { carriesMovement, planMovement } from './creature-movement.js';

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

/** Mouvement après séquelles (moteur `v5-sequela-effects`, projeté dans `extensions.v5.sequelaEffects`), sinon M. */
const baseMovementOf = participant => {
  const effective = v5Of(participant).sequelaEffects?.movement?.effective;
  return Number.isFinite(effective) ? effective : movementOf(participant);
};
const hasState = (participant, marker) => (participant?.states || [])
  .some(state => MARKER_BY_STATE[stateKey(state)] === marker && Number(state?.level ?? 1) > 0);
/** Livre de base V5 p.186-187 : Enchevêtré « may not Move », Surpris « no Action or Move », Inconscient « do nothing ». */
const NO_MOVE = ['entangled', 'surprised', 'unconscious'];

/**
 * Marche et Course effectives en cases de 2 m (§4) : Marche M cases, Course 2M (table de Mouvement, V5 p.163).
 * Ordre : séquelles (M effectif), Sonné (M ÷ 2 arrondi au supérieur, p.186), Traits via `planMovement`
 * (Foulée : Course ×1,5, p.361 ; Vol : Move jusqu'à l'indice en mètres, p.358), puis À terre (ramper à la moitié
 * de la Marche, Move seulement, p.186) et les états sans Move. Bond, Grimpant et les Traits aquatiques ne changent
 * pas la Marche ni la Course au sol.
 */
export function rangeCellsOf(participant) {
  const base = baseMovementOf(participant);
  if (base === null) return { speedCells: null, runCells: null };
  if (NO_MOVE.some(marker => hasState(participant, marker))) return { speedCells: 0, runCells: 0 };
  // À terre : le Move ne sert qu'à se relever ou ramper (M mètres, soit M/2 cases) ; pas de Course. États différents :
  // la pénalité la plus forte (p.185), et ramper reste sous la Marche de Sonné.
  if (hasState(participant, 'prone')) { const crawl = Math.floor(base / 2); return { speedCells: crawl, runCells: crawl }; }
  const m = hasState(participant, 'stunned') ? Math.ceil(base / 2) : base;
  let speedCells = m;
  let runCells = 2 * m;
  if (carriesMovement(participant, 'sprinter')) runCells = planMovement(participant, 'sprinter', { baseRun: runCells }).movement.run;
  const fly = carriesMovement(participant, 'fly') ? planMovement(participant, 'fly').movement : null;
  if (fly) { const cells = Math.floor(fly.rating / 2); speedCells = Math.max(speedCells, cells); runCells = Math.max(runCells, cells); }
  return { speedCells, runCells };
}

/** PV max d'un PJ persistant : maximum de Blessures de la fiche importée, sinon `maxHp` du profil (import JSON : null). */
export const persistentMaxHpOf = profile => profile?.ficheSnapshot?.woundsMax ?? profile?.maxHp ?? null;

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

/**
 * PJ hors scène (contrat §3) : la liaison d'un PJ est durable, son pion reste piloté en exploration. Chaque personnage
 * persistant absent de la scène devient un pseudo-participant PJ, fait de son profil (caractéristiques, Mouvement,
 * Traits) et de son état persistant (PV, états, extensions). `profileOf(id)` rend le profil ou `null`.
 */
export function offScenePjParticipants(characters = [], sceneParticipants = [], profileOf = () => null) {
  const inScene = new Set(sceneParticipants.filter(row => row?.kind === 'PJ' && row.persistentCharacterId).map(row => row.persistentCharacterId));
  return characters.filter(character => character?.id && !inScene.has(character.id)).map(character => {
    const profile = (character.profileId && profileOf(character.profileId)) || {};
    return {
      ...profile,
      ...character,
      id: character.id,
      kind: 'PJ',
      camp: 'pj',
      persistentCharacterId: character.id,
      profileId: character.profileId ?? profile.id ?? null,
      name: character.name || profile.name || '',
      caracs: character.caracs ?? profile.caracs,
      extensions: { ...(profile.extensions || {}), ...(character.extensions || {}) }
    };
  });
}

/** Liste des PJ pour la liaison durable (`mj.roster`, §3) : `[{ ref, label }]`, triée par nom. */
export const pjRosterOf = (states = {}) => Object.values(states).filter(state => state.ref.startsWith('pj:'))
  .map(state => ({ ref: state.ref, label: state.label })).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
