/**
 * Canal de liaison vers RPG Map Display (contrat v1 §2, §7). Le canal est injecté (BroadcastChannel en production, faux
 * canal en test). Le cycle de vie se lit sur les instantanés : un `ref` qui apparaît part en `token.add`, un `ref` qui
 * change en `token.state`, un `ref` non PJ qui disparaît (fin de rencontre, retrait) en `token.remove`. Mort et banc
 * gardent le participant, donc le pion.
 */
import { MAP_LINK_VERSION, tokenStatesOf, diffTokenStates } from './map-link-state.js';

export const MAP_LINK_CHANNEL = 'wfrp-map-link';
export const MAP_LINK_PING_MS = 5000;
export const MAP_LINK_TIMEOUT_MS = 15000;

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
 * le maximum d'un PJ persistant ; `onStatus(status)` reçoit 'connected' | 'disconnected' | 'version-mismatch'.
 */
export function createMapLink({ channel, getParticipants, maxHpOf = () => null, imageUrlOf = () => null, now = () => Date.now(), onStatus = () => {} }) {
  let seq = 0;
  let states = {};
  let lastSeen = 0;
  let status = 'disconnected';
  const setStatus = next => { if (next !== status) { status = next; onStatus(next); } };
  const send = (type, payload = {}) => channel.postMessage({ v: MAP_LINK_VERSION, type, seq: ++seq, at: now(), from: 'outil-mj', payload });
  const read = () => tokenStatesOf(getParticipants() || [], { maxHpOf, imageUrlOf });

  /** Relit la scène et émet les changements (à brancher sur `Bus.on('combat')`). */
  function refresh() {
    const next = read();
    for (const ref of diffTokenStates(states, next)) {
      if (!next[ref]) { if (!ref.startsWith('pj:')) send('token.remove', { ref }); }
      else {
        send(states[ref] ? 'token.state' : 'token.add', next[ref]);
        for (const [type, payload] of effectsOf(states[ref], next[ref])) send(type, payload);
      }
    }
    states = next;
  }

  /** Instantané complet, en réponse à `map.hello`. */
  function snapshot() {
    states = read();
    send('mj.snapshot', { tokens: Object.values(states) });
  }

  function onMessage(message) {
    if (!message || message.from !== 'map') return;
    if (message.v !== MAP_LINK_VERSION) { setStatus('version-mismatch'); return; }
    lastSeen = now();
    setStatus('connected');
    if (message.type === 'map.hello') snapshot();
  }

  /** Battement : à appeler toutes les `MAP_LINK_PING_MS`. */
  function tick() {
    send('mj.ping');
    if (status === 'connected' && now() - lastSeen > MAP_LINK_TIMEOUT_MS) setStatus('disconnected');
  }

  channel.onmessage = event => onMessage(event?.data ?? event);
  states = read();
  send('mj.hello');
  return { refresh, snapshot, tick, onMessage, status: () => status, close: () => channel.close?.() };
}
