/**
 * Canal de liaison vers RPG Map Display (contrat v1 §2, §7). Le canal est injecté (BroadcastChannel en production, faux
 * canal en test). Le cycle de vie se lit sur les instantanés : un `ref` qui apparaît part en `token.add`, un `ref` qui
 * change en `token.state`, un `ref` non PJ qui disparaît (fin de rencontre, retrait) en `token.remove`. Mort et banc
 * gardent le participant, donc le pion.
 */
import { MAP_LINK_VERSION, tokenStatesOf, diffTokenStates, pjRosterOf, mapRefOf } from './map-link-state.js';

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
 * le maximum d'un PJ persistant ; `onStatus(status)` reçoit 'connected' | 'disconnected' | 'version-mismatch' ;
 * `setTimer`/`clearTimer` servent au délai de `mount.request`.
 */
export function createMapLink({ channel, getParticipants, maxHpOf = () => null, imageUrlOf = () => null, now = () => Date.now(), onStatus = () => {},
  setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = id => clearTimeout(id) }) {
  let seq = 0;
  let states = {};
  let roster = '[]';
  let lastSeen = 0;
  let lastPing = -Infinity;
  let status = 'disconnected';
  const placed = new Set();
  const pendingMounts = new Map();
  const setStatus = next => { if (next !== status) { status = next; onStatus(next); } };
  const send = (type, payload = {}) => channel.postMessage({ v: MAP_LINK_VERSION, type, seq: ++seq, at: now(), from: 'outil-mj', payload });
  const read = () => tokenStatesOf(getParticipants() || [], { maxHpOf, imageUrlOf });
  /** Liste des PJ (`mj.roster`, §3), émise quand elle change ou sur demande. */
  const sendRoster = (force = false) => {
    const characters = pjRosterOf(states), text = JSON.stringify(characters);
    if (!force && text === roster) return;
    roster = text;
    send('mj.roster', { characters });
  };

  /** Relit la scène et émet les changements (à brancher sur `Bus.on('combat')`). */
  function refresh() {
    const next = read();
    for (const split of splitsOf(states, next)) send('mount.split', split);
    for (const ref of diffTokenStates(states, next)) {
      if (!next[ref]) { if (!ref.startsWith('pj:')) send('token.remove', { ref }); }
      else {
        send(states[ref] ? 'token.state' : 'token.add', next[ref]);
        for (const [type, payload] of effectsOf(states[ref], next[ref])) send(type, payload);
      }
    }
    states = next;
    sendRoster();
  }

  /** Instantané complet, en réponse à `map.hello`. */
  function snapshot() {
    states = read();
    send('mj.snapshot', { tokens: Object.values(states) });
    sendRoster(true);
  }

  function onMessage(message) {
    if (!message || message.from !== 'map') return;
    if (message.v !== MAP_LINK_VERSION) { setStatus('version-mismatch'); return; }
    lastSeen = now();
    setStatus('connected');
    if (message.type === 'map.hello') snapshot();
    if (message.type === 'map.ping' && now() - lastPing > MAP_LINK_ECHO_MS) ping();
    const payload = message.payload || {};
    if (message.type === 'map.placed' && payload.ref) placed.add(payload.ref);
    if (message.type === 'map.unplaced' && payload.ref) placed.delete(payload.ref);
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
  return { refresh, snapshot, tick, onMessage, requestMount, status: () => status, close: () => channel.close?.() };
}
