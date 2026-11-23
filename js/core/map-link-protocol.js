/**
 * Protocole de liaison vers RPG Map Display (contrat v1 §2-§10), commun à tous les jeux : canal, battement, instantané,
 * cycle de vie des pions, liste des PJ, engagements, montures, distances, Course. Il ne connaît aucune règle : chaque jeu
 * fournit sa projection participant → pion. Seule dépendance : les constantes partagées de la liaison (multi-jeux, lot L1).
 *
 * Projection fournie par le jeu :
 * - `tokenStates(participants)` → `{ [ref]: TokenState }` (contrat §4) ; obligatoire ;
 * - `refOf(participant)` → `ref` du pion (`pj:<id>` pour un PJ durable, contrat §3) ; obligatoire ;
 * - `engagementPairs(participants)` → `[[ref, ref]]` ; `[]` par défaut (`mj.engagements` part toujours dans l'instantané) ;
 * - `formSignature(participant)` → texte ; `''` par défaut. Un changement entre deux lectures (forme prise ou quittée) n'est
 *   pas une blessure : pas de `fx.wound`.
 *
 * Tour de jeu (`mj.turn`, contrat §10, révision du 21/11/2026) : `getActiveId()` rend l'identifiant du participant actif
 * ou `null`. Un jeu qui ne le fournit pas n'envoie jamais `mj.turn` ; sinon le message part à chaque changement et toujours
 * dans l'instantané, `ref: null` hors tour.
 *
 * Annulation du mouvement du tour sur la carte (`map.turnReset { ref }`, contrat §10, version 2 du 22/11/2026) : transmise
 * telle quelle à `onTurnReset(ref)`, comme `map.ran` à `onRan(ref)` ; le jeu décide de ce qu'elle rend.
 *
 * Point d'impact d'un sort de zone (`mj.impactQuery`, `mj.impactCancel`, `map.impact`, contrat §10.1, version 3 du
 * 23/11/2026) : `queryImpact` envoie la demande et rend `{ queryId, answer }` ; une seule demande à la fois, sans délai
 * d'expiration (c'est un geste du MJ) ; elle est abandonnée à la déconnexion.
 *
 * Le cycle de vie se lit sur les instantanés : un `ref` qui apparaît part en `token.add`, un `ref` qui change en `token.state`,
 * un `ref` non PJ qui disparaît en `token.remove`. Mort et banc gardent le participant, donc le pion.
 */
import { LIAISON_CARTE } from '../data/donnees-communes.js';

export const MAP_LINK_VERSION = LIAISON_CARTE.version;
export const MAP_LINK_CHANNEL = LIAISON_CARTE.canal;
export const MAP_LINK_PING_MS = LIAISON_CARTE.battementMs;
export const MAP_LINK_TIMEOUT_MS = LIAISON_CARTE.delaiDeconnexionMs;
/**
 * Écho du battement (contrat §2.3) : un onglet caché voit ses minuteries ralenties à une par minute, mais reçoit
 * toujours les messages. Il répond donc au battement de l'autre côté s'il n'a pas battu depuis ce délai.
 */
export const MAP_LINK_ECHO_MS = LIAISON_CARTE.echoMs;
/** Remonte (§8.2) : sans réponse de la carte dans ce délai, elle est traitée comme déconnectée et la bascule s'applique. */
export const MOUNT_REQUEST_TIMEOUT_MS = 3000;
export const MOUNT_NOT_ADJACENT_MESSAGE = 'Rapprochez le cavalier de sa monture sur la carte';
/** Délai de réponse à `mj.distanceQuery` : passé ce délai, la distance n'est pas préremplie. */
export const DISTANCE_QUERY_TIMEOUT_MS = 3000;
/** `label` de `mj.impactQuery` (contrat §10.1) : 40 caractères au plus. */
export const IMPACT_LABEL_MAX = 40;

/**
 * Les 16 marqueurs connus de la carte (contrat §5, `STATUS_MARKER_IDS` de Map Display), liste fermée : la carte rejette
 * un marqueur inconnu. Un jeu qui en veut d'autres passe d'abord par un lot dans la carte.
 */
export const MARQUEURS_CARTE = Object.freeze(['prone', 'stunned', 'unconscious', 'blinded', 'deafened', 'bleeding', 'surprised',
  'entangled', 'ablaze', 'broken', 'poisoned', 'fatigued', 'tainted', 'fear', 'terror', 'frenzy']);
const KNOWN_MARKERS = new Set(MARQUEURS_CARTE);

/** Retire les marqueurs inconnus de la carte (`markers` et `markerLevels`) ; rend l'objet tel quel s'il n'y en a pas. */
function knownMarkersOnly(holder) {
  if (!holder || typeof holder !== 'object') return holder;
  let out = holder;
  if (Array.isArray(holder.markers) && holder.markers.some(marker => !KNOWN_MARKERS.has(marker))) {
    out = { ...out, markers: holder.markers.filter(marker => KNOWN_MARKERS.has(marker)) };
  }
  const levels = holder.markerLevels;
  if (levels && typeof levels === 'object' && Object.keys(levels).some(marker => !KNOWN_MARKERS.has(marker))) {
    out = { ...out, markerLevels: Object.fromEntries(Object.entries(levels).filter(([marker]) => KNOWN_MARKERS.has(marker))) };
  }
  return out;
}

/** État d'un pion sans marqueur inconnu, pion monté compris (`rider`, §8.1). */
function knownMarkersState(state) {
  const out = knownMarkersOnly(state);
  if (!out?.rider || typeof out.rider !== 'object') return out;
  const rider = knownMarkersOnly(out.rider);
  return rider === out.rider ? out : { ...out, rider };
}

/** `ref` dont l'état a changé, apparu ou disparu entre deux instantanés. */
export function diffTokenStates(prev = {}, next = {}) {
  const refs = new Set([...Object.keys(prev), ...Object.keys(next)]);
  return [...refs].filter(ref => JSON.stringify(prev[ref] ?? null) !== JSON.stringify(next[ref] ?? null));
}

/** Liste des PJ pour la liaison durable (`mj.roster`, §3) : `[{ ref, label }]`, triée par nom. */
export const pjRosterOf = (states = {}) => Object.values(states).filter(state => state.ref.startsWith('pj:'))
  .map(state => ({ ref: state.ref, label: state.label })).sort((a, b) => a.label.localeCompare(b.label, 'fr'));

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

/** Démontage (§8.2) : `mount.split` pour chaque cavalier monté qui ne l'est plus (volontaire, chute, monture tuée). */
export function splitsOf(prev = {}, next = {}) {
  return Object.keys(next).filter(ref => prev[ref]?.mounted === true && next[ref].mounted !== true)
    .map(ref => ({ riderRef: ref, mountRef: prev[ref].rider?.ref ?? null }));
}

/**
 * Effets éphémères d'un changement d'état (contrat §9), après le `token.state` qui les porte :
 * `fx.wound` à chaque baisse de PV, `fx.death` au passage à mort. La cause vient de l'état, avec `blood` par défaut. Un pion
 * qui apparaît ne joue rien. Un pion sans PV (`hp: null`) ne saigne jamais. `formChanged` : le participant prend ou quitte
 * une forme ; ses PV changent sans blessure, pas de `fx.wound` (images des pions, CA40).
 */
export function effectsOf(prev, next, { formChanged = false } = {}) {
  if (!prev || !next) return [];
  const effects = [];
  const lost = (prev.hp?.current ?? 0) - (next.hp?.current ?? 0);
  if (lost > 0 && !formChanged) effects.push(['fx.wound', { ref: next.ref, hpLost: lost, maxHp: next.hp.max, target: 'self' }]);
  if (next.dead && !prev.dead) effects.push(['fx.death', { ref: next.ref, cause: next.deathCause || 'blood' }]);
  return effects;
}

/**
 * `getParticipants()` rend la liste des participants de la scène (vide hors combat) ; `projection` les traduit en pions
 * (voir en tête) ; `onStatus(status)` reçoit 'connected' | 'disconnected' | 'version-mismatch' ; `onRan(ref)` reçoit
 * `map.ran` (palier Course franchi sur la carte, L6) ; `onTurnReset(ref)` reçoit `map.turnReset` (mouvement du tour annulé
 * sur la carte, version 2) ; `setTimer`/`clearTimer` servent aux délais de `mount.request` et
 * `mj.distanceQuery`. Retours de la carte (§10, L5) : `on('placement', fn)` reçoit `{ connected, placed, pending }` à
 * chaque changement, `on('adjacency', fn)` les paires de `map.adjacency` ; `queryDistance(de, vers)` interroge la carte.
 */
export function createMapLinkProtocol({ channel, projection, getParticipants, getActiveId = null, now = () => Date.now(), onStatus = () => {},
  onRan = () => {}, onTurnReset = () => {}, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = id => clearTimeout(id) }) {
  if (typeof projection?.tokenStates !== 'function' || typeof projection?.refOf !== 'function') {
    throw new Error('Liaison carte : la projection du jeu doit fournir tokenStates et refOf.');
  }
  const refOf = participant => projection.refOf(participant);
  const engagementPairsOf = participants => (typeof projection.engagementPairs === 'function' ? projection.engagementPairs(participants) : []);
  const formSignatureOf = participant => (typeof projection.formSignature === 'function' ? projection.formSignature(participant) : '');
  let seq = 0;
  let states = {};
  let forms = {};
  let roster = '[]';
  let lastSeen = 0;
  let lastPing = -Infinity;
  let status = 'disconnected';
  const placed = new Set();
  const pendingMounts = new Map();
  const pendingDistances = new Map();
  let distanceSeq = 0;
  /** Demande de point d'impact en cours (§10.1) : `{ queryId, candidates, resolve }` ou `null`. */
  let impact = null;
  let impactSeq = 0;
  let engagements = '[]';
  let turn = null;
  let placement = '';
  const listeners = { placement: new Set(), adjacency: new Set() };
  const emit = (event, value) => { for (const fn of listeners[event]) fn(value); };
  /** Vue « posé / à poser » ; émise seulement quand elle change. */
  const placementView = () => ({ connected: status === 'connected', placed: [...placed].sort(), pending: pendingTokensOf(states, placed) });
  const emitPlacement = () => {
    const view = placementView(), text = JSON.stringify(view);
    if (text === placement) return;
    placement = text;
    emit('placement', view);
  };
  const setStatus = next => {
    if (next === status) return;
    status = next;
    // Déconnexion ou version différente (§10.1) : la demande de point d'impact en cours est perdue, sans message.
    if (next !== 'connected') settleImpact(impact?.queryId, { ok: false, reason: 'disconnected' });
    onStatus(next);
    emitPlacement();
  };
  const send = (type, payload = {}) => channel.postMessage({ v: MAP_LINK_VERSION, type, seq: ++seq, at: now(), from: 'outil-mj', payload });
  /** États envoyés, sans marqueur inconnu de la carte (CA9). */
  const read = (participants = getParticipants() || []) => Object.fromEntries(Object.entries(projection.tokenStates(participants) || {})
    .map(([ref, state]) => [ref, knownMarkersState(state)]));
  /** Formes par `ref`, gardées à côté des états sans être envoyées (CA40). */
  const formsOf = participants => Object.fromEntries(participants.map(participant => [refOf(participant), formSignatureOf(participant)]));
  /** Relit la scène : états envoyés et formes de chaque pion. */
  const readScene = () => { const participants = getParticipants() || []; return [read(participants), formsOf(participants)]; };
  /** Liste des PJ (`mj.roster`, §3), émise quand elle change ou sur demande. */
  const sendRoster = (force = false) => {
    const characters = pjRosterOf(states), text = JSON.stringify(characters);
    if (!force && text === roster) return;
    roster = text;
    send('mj.roster', { characters });
  };
  /** Engagements actifs (`mj.engagements`, §10), émis quand ils changent ; l'instantané les renvoie toujours, même vides (audit A6). */
  const sendEngagements = (force = false) => {
    const pairs = engagementPairsOf(getParticipants() || []), text = JSON.stringify(pairs);
    if (!force && text === engagements) return;
    engagements = text;
    send('mj.engagements', { pairs });
  };

  /**
   * Participant actif (`mj.turn`, §10) : `ref` de son pion, `null` hors tour ou s'il n'est pas dans la scène. Émis quand il
   * change ; l'instantané le renvoie toujours. Rien sans `getActiveId`.
   */
  const sendTurn = (force = false) => {
    if (typeof getActiveId !== 'function') return;
    const id = getActiveId();
    const actor = id ? (getParticipants() || []).find(participant => participant?.id === id) : null;
    const ref = actor ? refOf(actor) : null;
    if (!force && ref === turn) return;
    turn = ref;
    send('mj.turn', { ref });
  };

  /** Relit la scène et émet les changements (à brancher sur les événements du jeu). */
  function refresh() {
    const [next, nextForms] = readScene();
    for (const split of splitsOf(states, next)) send('mount.split', split);
    for (const ref of diffTokenStates(states, next)) {
      if (!next[ref]) { if (!ref.startsWith('pj:')) { send('token.remove', { ref }); placed.delete(ref); } }
      else {
        send(states[ref] ? 'token.state' : 'token.add', next[ref]);
        const formChanged = (forms[ref] ?? '') !== (nextForms[ref] ?? '');
        for (const [type, payload] of effectsOf(states[ref], next[ref], { formChanged })) send(type, payload);
      }
    }
    states = next;
    forms = nextForms;
    sendRoster();
    sendEngagements();
    sendTurn();
    emitPlacement();
  }

  /** Instantané complet, en réponse à `map.hello`. */
  function snapshot() {
    [states, forms] = readScene();
    send('mj.snapshot', { tokens: Object.values(states) });
    sendRoster(true);
    sendEngagements(true);
    sendTurn(true);
    // Carte rechargée (audit A5) : elle renvoie map.placed pour chaque pion réellement posé après mj.snapshot.
    placed.clear();
    emitPlacement();
  }

  function onMessage(message) {
    if (!message || message.from !== 'map') return;
    if (message.v !== MAP_LINK_VERSION) { setStatus('version-mismatch'); return; }
    lastSeen = now();
    setStatus('connected');
    if (message.type === 'map.hello') snapshot();
    if (message.type === 'map.ping' && now() - lastPing > MAP_LINK_ECHO_MS) ping();
    const payload = message.payload || {};
    if (message.type === 'map.placed' && payload.ref) { placed.add(payload.ref); emitPlacement(); }
    if (message.type === 'map.unplaced' && payload.ref) { placed.delete(payload.ref); emitPlacement(); }
    if (message.type === 'map.adjacency' && Array.isArray(payload.pairs)) emit('adjacency', payload.pairs);
    if (message.type === 'map.distance') settleDistance(payload.queryId, Number.isFinite(payload.cells) && payload.cells >= 0
      ? { ok: true, cells: payload.cells } : { ok: false, reason: 'unmeasurable', message: 'La carte n’a pas pu mesurer la distance.' });
    if (message.type === 'map.impact') answerImpact(payload);
    if (message.type === 'map.ran' && payload.ref) onRan(payload.ref);
    if (message.type === 'map.turnReset' && payload.ref) onTurnReset(payload.ref);
    if (message.type === 'mount.accepted') settleMount(payload.riderRef, { ok: true });
    if (message.type === 'mount.refused') settleMount(payload.riderRef, payload.reason === 'not-adjacent'
      ? { ok: false, reason: 'not-adjacent', message: MOUNT_NOT_ADJACENT_MESSAGE }
      : { ok: false, reason: payload.reason || 'refused', message: 'La carte refuse la mise en selle.' });
  }

  function settleMount(riderRef, answer) {
    const pending = pendingMounts.get(riderRef);
    if (!pending) return;
    pendingMounts.delete(riderRef);
    clearTimer(pending.timer);
    pending.resolve(answer);
  }

  /**
   * Remonte (§8.2) : `mount.request` si la carte est connectée et les deux pions posés, puis attente de `mount.accepted`
   * ou `mount.refused`. Carte déconnectée, pion non posé ou carte muette : `{ ok: true }` sans vérification.
   */
  function requestMount({ rider, mount }) {
    const riderRef = refOf(rider), mountRef = refOf(mount);
    if (status !== 'connected' || !placed.has(riderRef) || !placed.has(mountRef)) return Promise.resolve({ ok: true, checked: false });
    settleMount(riderRef, { ok: false, reason: 'superseded', message: 'Demande de mise en selle remplacée.' });
    return new Promise(resolve => {
      const timer = setTimer(() => settleMount(riderRef, { ok: true, checked: false }), MOUNT_REQUEST_TIMEOUT_MS);
      pendingMounts.set(riderRef, { resolve, timer });
      send('mount.request', { riderRef, mountRef });
    });
  }

  function settleDistance(queryId, answer) {
    const pending = pendingDistances.get(queryId);
    if (!pending) return; // réponse orpheline (délai dépassé ou inconnue) : ignorée
    pendingDistances.delete(queryId);
    clearTimer(pending.timer);
    pending.resolve(answer);
  }

  /**
   * Distance préremplie (§10, §14 D4) : `mj.distanceQuery` entre deux participants posés, réponse `{ ok: true, cells }`
   * (demi-cases possibles). Carte déconnectée, pion non posé ou carte muette : `{ ok: false, reason }`, le MJ saisit.
   */
  function queryDistance(from, to) {
    const fromRef = refOf(from), toRef = refOf(to);
    if (status !== 'connected') return Promise.resolve({ ok: false, reason: 'disconnected', message: 'Carte déconnectée : distance à saisir.' });
    if (!isRefPlaced(fromRef, states, placed) || !isRefPlaced(toRef, states, placed)) return Promise.resolve({ ok: false, reason: 'not-placed', message: 'Pion non posé sur la carte : distance à saisir.' });
    const queryId = `dq-${++distanceSeq}`;
    return new Promise(resolve => {
      const timer = setTimer(() => settleDistance(queryId, { ok: false, reason: 'timeout', message: 'La carte n’a pas répondu : distance à saisir.' }), DISTANCE_QUERY_TIMEOUT_MS);
      pendingDistances.set(queryId, { resolve, timer });
      send('mj.distanceQuery', { fromRef, toRef, queryId });
    });
  }

  /** Règle la demande de point d'impact `queryId` si c'est celle en cours ; sinon rien (réponse périmée ou déjà reçue). */
  function settleImpact(queryId, answer) {
    if (!impact || queryId === undefined || queryId === null || impact.queryId !== queryId) return false;
    const { resolve } = impact;
    impact = null;
    resolve({ ...answer, queryId });
    return true;
  }

  /**
   * `map.impact` (§10.1) : `cancelled` → retour au choix manuel ; sinon `refs` telles que reçues, et `ids` des seuls
   * `candidates` de la demande (participants que le jeu accepte comme cibles) dont la `ref` y figure, sans doublon.
   */
  function answerImpact(payload) {
    if (!impact || payload.queryId !== impact.queryId) return;
    if (payload.cancelled === true) { settleImpact(payload.queryId, { ok: false, reason: 'cancelled' }); return; }
    const refs = Array.isArray(payload.refs) ? payload.refs : [];
    const wanted = new Set(refs);
    const ids = [...new Set(impact.candidates.filter(participant => participant?.id && wanted.has(refOf(participant))).map(participant => participant.id))];
    settleImpact(payload.queryId, { ok: true, levelId: payload.levelId ?? null, cell: payload.cell ?? null, refs, ids });
  }

  /**
   * Point d'impact d'un sort de zone (§10.1) : `mj.impactQuery { queryId, label, radiusCells, casterRef }`. Une demande en
   * cours est d'abord retirée (`mj.impactCancel`, réponse `superseded`). Carte non connectée : aucune demande,
   * `{ queryId: null }` et réponse `disconnected`. `answer` rend `{ ok: true, queryId, levelId, cell, refs, ids }` ou
   * `{ ok: false, queryId, reason }` (`cancelled`, `superseded`, `withdrawn`, `disconnected`).
   */
  function queryImpact({ label = '', radiusCells = 0, caster = null, candidates = [] } = {}) {
    if (status !== 'connected') return { queryId: null, answer: Promise.resolve({ ok: false, queryId: null, reason: 'disconnected' }) };
    if (impact) { const previous = impact.queryId; send('mj.impactCancel', { queryId: previous }); settleImpact(previous, { ok: false, reason: 'superseded' }); }
    const queryId = `iq-${++impactSeq}`;
    const radius = Number(radiusCells);
    const answer = new Promise(resolve => { impact = { queryId, candidates: Array.isArray(candidates) ? candidates : [], resolve }; });
    send('mj.impactQuery', { queryId, label: String(label ?? '').slice(0, IMPACT_LABEL_MAX), radiusCells: Number.isFinite(radius) && radius > 0 ? radius : 0,
      casterRef: caster ? refOf(caster) : null });
    return { queryId, answer };
  }

  /** L'outil n'attend plus (§10.1) : `mj.impactCancel` si `queryId` est la demande en cours ; rend vrai si elle l'était. */
  function cancelImpact(queryId) {
    if (!impact || impact.queryId !== queryId) return false;
    send('mj.impactCancel', { queryId });
    return settleImpact(queryId, { ok: false, reason: 'withdrawn' });
  }

  /** Abonnement aux retours de la carte : 'placement' ou 'adjacency' ; rend la fonction de désabonnement. */
  function on(event, fn) {
    if (!listeners[event]) throw new Error(`Événement de liaison inconnu : ${event}`);
    listeners[event].add(fn);
    return () => listeners[event].delete(fn);
  }

  function ping() {
    lastPing = now();
    send('mj.ping');
  }

  /** Battement : à appeler toutes les `MAP_LINK_PING_MS`. */
  function tick() {
    ping();
    // Déconnexion (audit A5) : plus aucun pion supposé posé ; setStatus émet la vue vidée.
    if (status === 'connected' && now() - lastSeen > MAP_LINK_TIMEOUT_MS) { placed.clear(); setStatus('disconnected'); }
  }

  channel.onmessage = event => onMessage(event?.data ?? event);
  [states, forms] = readScene();
  send('mj.hello');
  return { refresh, snapshot, tick, onMessage, requestMount, queryDistance, queryImpact, cancelImpact, impactPending: () => impact?.queryId ?? null,
    on, placement: placementView,
    isPlaced: participant => isRefPlaced(refOf(participant), states, placed), status: () => status, close: () => channel.close?.() };
}
