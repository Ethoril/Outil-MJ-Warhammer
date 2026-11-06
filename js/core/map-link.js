/**
 * Canal de liaison vers RPG Map Display (contrat v1 §2, §7). Le canal est injecté (BroadcastChannel en production, faux
 * canal en test). Le cycle de vie se lit sur les instantanés : un `ref` qui apparaît part en `token.add`, un `ref` qui
 * change en `token.state`, un `ref` non PJ qui disparaît (fin de rencontre, retrait) en `token.remove`. Mort et banc
 * gardent le participant, donc le pion.
 */
import { MAP_LINK_VERSION, tokenStatesOf, diffTokenStates, pjRosterOf, mapRefOf } from './map-link-state.js';
import { DISTANCE_QUERY_TIMEOUT_MS, pendingTokensOf, engagementPairsOf } from './map-link-feedback.js';

export const MAP_LINK_CHANNEL = 'wfrp-map-link';
export const MAP_LINK_PING_MS = 5000;
export const MAP_LINK_TIMEOUT_MS = 15000;
/**
 * Écho du battement (contrat §2.3) : un onglet caché voit ses minuteries ralenties à une par minute, mais reçoit
 * toujours les messages. Il répond donc au battement de l'autre côté s'il n'a pas battu depuis ce délai.
 */
export const MAP_LINK_ECHO_MS = 4000;
/** Remonte (§8.2) : sans réponse de la carte dans ce délai, elle est traitée comme déconnectée et la bascule s'applique. */
export const MOUNT_REQUEST_TIMEOUT_MS = 3000;
export const MOUNT_NOT_ADJACENT_MESSAGE = 'Rapprochez le cavalier de sa monture sur la carte';

/** Démontage (§8.2) : `mount.split` pour chaque cavalier monté qui ne l'est plus (volontaire, chute, monture tuée). */
export function splitsOf(prev = {}, next = {}) {
  return Object.keys(next).filter(ref => prev[ref]?.mounted === true && next[ref].mounted !== true)
    .map(ref => ({ riderRef: ref, mountRef: prev[ref].rider?.ref ?? null }));
}

/**
 * Effets éphémères d'un changement d'état (contrat §9), après le `token.state` qui les porte :
 * `fx.wound` à chaque baisse de PV, `fx.death` au passage à mort. La cause vient de l'état, avec `blood` par défaut. Un pion qui apparaît
 * ne joue rien.
 */
export function effectsOf(prev, next) {
  if (!prev || !next) return [];
  const effects = [];
  const lost = (prev.hp?.current ?? 0) - (next.hp?.current ?? 0);
  if (lost > 0) effects.push(['fx.wound', { ref: next.ref, hpLost: lost, maxHp: next.hp.max, target: 'self' }]);
  if (next.dead && !prev.dead) effects.push(['fx.death', { ref: next.ref, cause: next.deathCause || 'blood' }]);
  return effects;
}

/**
 * `getParticipants()` rend la liste des participants de la scène (vide hors combat) ; `maxHpOf(participant)` résout
 * le maximum d'un PJ persistant ; `colorOf(participant)` rend la couleur du pion d'un PJ (`tokenColor` du profil, §4) ; `onStatus(status)` reçoit 'connected' | 'disconnected' | 'version-mismatch' ; `onRan(ref)` reçoit `map.ran` (palier Course
 * franchi sur la carte, L6) ; `setTimer`/`clearTimer` servent aux délais de `mount.request` et `mj.distanceQuery`.
 * Retours de la carte (§10, L5) : `on('placement', fn)` reçoit `{ connected, placed, pending }` à chaque changement,
 * `on('adjacency', fn)` les paires de `map.adjacency` ; `queryDistance(de, vers)` interroge la carte.
 */
export function createMapLink({ channel, getParticipants, maxHpOf = () => null, imageUrlOf = () => null, colorOf = () => null, now = () => Date.now(), onStatus = () => {},
  onRan = () => {}, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = id => clearTimeout(id) }) {
  let seq = 0;
  let states = {};
  let roster = '[]';
  let lastSeen = 0;
  let lastPing = -Infinity;
  let status = 'disconnected';
  const placed = new Set();
  const pendingMounts = new Map();
  const pendingDistances = new Map();
  let distanceSeq = 0;
  let engagements = '[]';
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
  const setStatus = next => { if (next !== status) { status = next; onStatus(next); emitPlacement(); } };
  const send = (type, payload = {}) => channel.postMessage({ v: MAP_LINK_VERSION, type, seq: ++seq, at: now(), from: 'outil-mj', payload });
  const read = () => tokenStatesOf(getParticipants() || [], { maxHpOf, imageUrlOf, colorOf });
  /** Liste des PJ (`mj.roster`, §3), émise quand elle change ou sur demande. */
  const sendRoster = (force = false) => {
    const characters = pjRosterOf(states), text = JSON.stringify(characters);
    if (!force && text === roster) return;
    roster = text;
    send('mj.roster', { characters });
  };
  /** Engagements actifs (`mj.engagements`, §10), émis quand ils changent ; l'instantané ne renvoie qu'une liste non vide. */
  const sendEngagements = (force = false) => {
    const pairs = engagementPairsOf(getParticipants() || []), text = JSON.stringify(pairs);
    if (text === engagements && !(force && pairs.length)) return;
    engagements = text;
    send('mj.engagements', { pairs });
  };

  /** Relit la scène et émet les changements (à brancher sur `Bus.on('combat')`). */
  function refresh() {
    const next = read();
    for (const split of splitsOf(states, next)) send('mount.split', split);
    for (const ref of diffTokenStates(states, next)) {
      if (!next[ref]) { if (!ref.startsWith('pj:')) { send('token.remove', { ref }); placed.delete(ref); } }
      else {
        send(states[ref] ? 'token.state' : 'token.add', next[ref]);
        for (const [type, payload] of effectsOf(states[ref], next[ref])) send(type, payload);
      }
    }
    states = next;
    sendRoster();
    sendEngagements();
    emitPlacement();
  }

  /** Instantané complet, en réponse à `map.hello`. */
  function snapshot() {
    states = read();
    send('mj.snapshot', { tokens: Object.values(states) });
    sendRoster(true);
    sendEngagements(true);
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
    if (message.type === 'map.ran' && payload.ref) onRan(payload.ref);
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
   * Reçoit les participants (porte du store, `Store.setMountGate`).
   */
  function requestMount({ rider, mount }) {
    const riderRef = mapRefOf(rider), mountRef = mapRefOf(mount);
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
    const fromRef = mapRefOf(from), toRef = mapRefOf(to);
    if (status !== 'connected') return Promise.resolve({ ok: false, reason: 'disconnected', message: 'Carte déconnectée : distance à saisir.' });
    if (!placed.has(fromRef) || !placed.has(toRef)) return Promise.resolve({ ok: false, reason: 'not-placed', message: 'Pion non posé sur la carte : distance à saisir.' });
    const queryId = `dq-${++distanceSeq}`;
    return new Promise(resolve => {
      const timer = setTimer(() => settleDistance(queryId, { ok: false, reason: 'timeout', message: 'La carte n’a pas répondu : distance à saisir.' }), DISTANCE_QUERY_TIMEOUT_MS);
      pendingDistances.set(queryId, { resolve, timer });
      send('mj.distanceQuery', { fromRef, toRef, queryId });
    });
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
    if (status === 'connected' && now() - lastSeen > MAP_LINK_TIMEOUT_MS) setStatus('disconnected');
  }

  channel.onmessage = event => onMessage(event?.data ?? event);
  states = read();
  send('mj.hello');
  return { refresh, snapshot, tick, onMessage, requestMount, queryDistance, on, placement: placementView,
    isPlaced: participant => placed.has(mapRefOf(participant)), status: () => status, close: () => channel.close?.() };
}
