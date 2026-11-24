/**
 * Cthulhu sur la carte (multi-jeux, lot C4) : projection participant → pion de RPG Map Display, branchée sur le protocole
 * commun `js/core/map-link-protocol.js`. Aucun module de Warhammer : seuls `cthulhu/`, le protocole, le chemin d'image de la
 * bibliothèque et le camp (modules communs du chapeau, plan §2).
 *
 * Décisions du MJ (spec Q5, Q6) et ce qu'elles donnent :
 * - Q5 = non : la carte ne gagne aucun marqueur. Un investigateur Mourant part comme Inconscient (`unconscious`) ; blessure
 *   grave et folie ne partent pas. Un mort part avec `dead: true`, sans marqueur ni cause de mort (Cthulhu n'en tient pas).
 * - Q6 : le MVT n'est pas envoyé comme portée (`speedCells` et `runCells` à `null` : la carte garde la portée saisie à la main).
 * - Cthulhu ne modélise ni taille de pion ni vision : `sizeCells` et `visionDim` à `null` (la carte garde les siens, sans que
 *   l'outil écrase un pion agrandi à la main). Un PJ reste source de vision (`visionSource`).
 *
 * Réf. (contrat §3) : `pj:<id du profil>` pour un investigateur, liaison durable, même hors rencontre ; `p:<id>` pour un PNJ ou
 * une créature, liaison par rencontre (`goule`, `goule-2`…). Une créature « cachée » part aussi : le MJ prépare sa carte, la
 * visibilité d'un pion se règle sur la carte (`hidden`), que l'outil n'écrit jamais.
 */
import { createMapLinkProtocol } from '../js/core/map-link-protocol.js';
import { normalizeLibraryImage } from '../js/core/token-library-path.js';
import { participantCamp } from '../js/core/participant-camp.js';
import { valeursDerivees } from './profils.js';

/** `ref` stable d'un participant : `pj:<id du profil>` pour un investigateur, sinon `p:<id du participant>`. */
export const refCarteDe = participant => (participant?.kind === 'PJ' ? `pj:${participant.profilId ?? participant.id}` : `p:${participant?.id}`);

/** Santé affichée (contrat §4), même règle que Warhammer : PV max atteints, ≤ ¼ du max ou 0 PV, sinon blessé. */
function santeDe(courant, max) {
  if (!(max > 0) || courant >= max) return 'unharmed';
  return courant <= 0 || courant <= max / 4 ? 'critical' : 'wounded';
}

/** Marqueurs (contrat §5) : Inconscient et Mourant partent comme `unconscious` (Q5 = non), un mort ne porte que `dead`. */
const marqueursDe = participant => (participant.etat === 'inconscient' || participant.etat === 'mourant' ? ['unconscious'] : []);

/** `token.state` d'un participant (rencontre) ou d'un pseudo-participant (investigateur hors rencontre). */
export function etatPionDe(participant, { imageUrlOf = p => p.image } = {}) {
  const pj = participant.kind === 'PJ';
  const pv = Number(participant.pv) || 0;
  const max = Number(participant.pvMax) > 0 ? Number(participant.pvMax) : Math.max(pv, 1);
  const mort = participant.etat === 'mort';
  return {
    ref: refCarteDe(participant),
    label: participant.nom || '',
    // Le camp du profil est un choix explicite du MJ : un investigateur « neutre » reste neutre.
    camp: participantCamp({ camp: participant.camp, kind: participant.kind, extensions: { campExplicit: true } }),
    kind: pj ? 'pc' : 'npc',
    visionSource: pj,
    imageUrl: normalizeLibraryImage(imageUrlOf(participant)) ?? null,
    formImageUrl: null,
    color: null,
    sizeCells: null,
    speedCells: null,
    runCells: null,
    visionDim: null,
    hp: { current: Math.max(0, Math.min(pv, max)), max },
    health: santeDe(pv, max),
    markers: mort ? [] : marqueursDe(participant),
    markerLevels: {},
    mounted: false,
    rider: null,
    dead: mort,
    deathCause: null
  };
}

/**
 * Projection de Cthulhu pour le protocole commun. `imageUrlOf(participant)` rend le chemin d'image (le champ `image` du profil
 * par défaut) ; un chemin hors de `maps/tokens/` n'est pas envoyé. Ni engagements ni forme : valeurs par défaut du protocole.
 */
export function cthulhuMapProjection({ imageUrlOf } = {}) {
  return {
    tokenStates: participants => Object.fromEntries(participants.map(participant => {
      const state = etatPionDe(participant, imageUrlOf ? { imageUrlOf } : undefined);
      return [state.ref, state];
    })),
    refOf: refCarteDe
  };
}

/**
 * Participants vus par la carte pour un état de séance `{ reserve, rencontre }` : ceux de la rencontre, puis les investigateurs
 * de la réserve qui n'y figurent pas (leur pion reste piloté hors combat, contrat §3), avec les PV et l'état de leur suivi.
 */
export function participantsPourLaCarte({ reserve, rencontre } = {}) {
  const enScene = rencontre?.participants ?? [];
  const presents = new Set(enScene.filter(p => p.kind === 'PJ').map(p => p.profilId ?? p.id));
  const horsScene = (reserve?.profils ?? []).filter(profil => profil.kind === 'PJ' && !presents.has(profil.id)).map(profil => {
    const { pvMax } = valeursDerivees(profil);
    return { ...profil, profilId: profil.id, nom: profil.nom, pvMax, pv: profil.suivi?.pv ?? pvMax, etat: profil.suivi?.etat ?? 'actif' };
  });
  return [...enScene, ...horsScene];
}

/**
 * Liaison de Cthulhu avec la carte : le protocole commun, la projection ci-dessus et la lecture de la séance. `getEtat()` rend
 * `{ reserve, rencontre }` ; le reste est celui de `createMapLinkProtocol` (`refresh`, `snapshot`, `tick`, `on('placement')`, `status`…).
 */
export function creerLiaisonCarte({ channel, getEtat, imageUrlOf, now, onStatus, onRan, setTimer, clearTimer }) {
  return createMapLinkProtocol({ channel, projection: cthulhuMapProjection({ imageUrlOf }), getParticipants: () => participantsPourLaCarte(getEtat() ?? {}),
    ...(now ? { now } : {}), ...(onStatus ? { onStatus } : {}), ...(onRan ? { onRan } : {}), ...(setTimer ? { setTimer } : {}), ...(clearTimer ? { clearTimer } : {}) });
}
