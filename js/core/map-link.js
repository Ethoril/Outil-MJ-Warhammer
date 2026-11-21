/**
 * Canal de liaison vers RPG Map Display (contrat v1 §2, §7), adaptateur Warhammer. Le protocole (canal, battement,
 * instantané, cycle de vie des pions, montures, distances, Course) est commun à tous les jeux : `map-link-protocol.js`
 * (multi-jeux, lot L1). Ce module construit la projection Warhammer (pions de `map-link-state.js`, engagements de
 * `map-link-feedback.js`, Forme bestiale) et garde ses exports et la signature de `createMapLink`.
 */
import { warhammerMapProjection } from './map-link-state.js';
import { engagementPairsOf } from './map-link-feedback.js';
import { createMapLinkProtocol } from './map-link-protocol.js';

export { MAP_LINK_CHANNEL, MAP_LINK_PING_MS, MAP_LINK_TIMEOUT_MS, MAP_LINK_ECHO_MS, MOUNT_REQUEST_TIMEOUT_MS, MOUNT_NOT_ADJACENT_MESSAGE,
  splitsOf, effectsOf } from './map-link-protocol.js';

/** Forme portée par un participant (`kind:nom`), `''` hors forme : un changement entre deux lectures est une prise ou un retour. */
export function formSignatureOf(participant) {
  const form = participant?.extensions?.v5?.beastForm;
  return form && typeof form === 'object' ? `${form.kind || 'beast'}:${form.name ?? form.beastProfile?.name ?? ''}` : '';
}

/**
 * `getParticipants()` rend la liste des participants de la scène (vide hors combat) ; `getActiveId()` l'identifiant du
 * participant actif ou `null` (`mj.turn`, §10) ; `maxHpOf(participant)` résout
 * le maximum d'un PJ persistant ; `colorOf(participant)` rend la couleur du pion d'un PJ (`tokenColor` du profil, §4) ;
 * `formImageUrlOf(participant)` rend l'image de Forme bestiale (`formImageUrl`, §4) ou `null` ; `onStatus(status)` reçoit 'connected' | 'disconnected' | 'version-mismatch' ; `onRan(ref)` reçoit `map.ran` (palier Course
 * franchi sur la carte, L6) ; `setTimer`/`clearTimer` servent aux délais de `mount.request` et `mj.distanceQuery`.
 * Retours de la carte (§10, L5) : `on('placement', fn)` reçoit `{ connected, placed, pending }` à chaque changement,
 * `on('adjacency', fn)` les paires de `map.adjacency` ; `queryDistance(de, vers)` interroge la carte.
 */
export function createMapLink({ channel, getParticipants, getActiveId = null, maxHpOf = () => null, imageUrlOf = () => null, formImageUrlOf = () => null, colorOf = () => null, now = () => Date.now(), onStatus = () => {},
  onRan = () => {}, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = id => clearTimeout(id) }) {
  const projection = { ...warhammerMapProjection({ maxHpOf, imageUrlOf, formImageUrlOf, colorOf }), engagementPairs: engagementPairsOf, formSignature: formSignatureOf };
  return createMapLinkProtocol({ channel, projection, getParticipants, getActiveId, now, onStatus, onRan, setTimer, clearTimer });
}
