/**
 * Imperium Maledictum sur la carte (multi-jeux, lot I5) : projection participant → pion de RPG Map Display, branchée sur le
 * protocole commun `js/core/map-link-protocol.js` (LIAISON_CARTE.version === 3). Aucun module de Warhammer ni de Cthulhu :
 * seuls `imperium/`, le protocole, le chemin d'image de la bibliothèque et le camp (modules communs du chapeau, plan §2).
 *
 * Spécificités Imperium par rapport au contrat :
 * - Blessures : elles montent de 0 à `blessuresMax` (p. 88) ; la carte attend des PV qui descendent, d'où
 *   `hp = { current: max - blessures, max }`.
 * - Taille du pion (p. 201, 313) : `sizeCells` déduit de `taille` (minuscule/petite/moyenne → 1, grande → 2,
 *   enorme → 3, monstrueuse → 4).
 * - Mode Zones par défaut : la Vitesse (p. 202) n'est pas envoyée comme portée (`speedCells`, `runCells` et
 *   `visionDim` à null : la carte garde la portée saisie à la main).
 * - Marqueurs : projection stricte vers les 16 `MARQUEURS_CARTE` du protocole, depuis les Conditions de l'annexe IV
 *   (p. 356-357), `desespere` (PNJ, p. 197) et `surpris` (p. 199). `neutralise` et `surcharge` n'ont pas de marqueur
 *   connu de la carte : rien n'est envoyé. Un mort (`mort`, ou `vaincu` pour une Troupe/Élite hors combat, p. 216, 317)
 *   porte `dead: true` sans marqueur ; un participant qui a fui (`fui`) reste sur la carte, non marqué mort.
 *
 * Réf. (contrat §3) : `pj:<id du profil>` pour un PJ, liaison durable, même hors rencontre ; `p:<id>` pour un PNJ.
 *
 * Posture v3 du protocole (`js/core/map-link-protocol.js`) :
 * - `mj.turn` est servi via `getActiveId` (`acteurCourant(rencontre)?.id ?? null`) pour le halo du participant actif.
 * - `mj.engagements` est servi via `engagementPairs(participants, rencontre)`, construit depuis `rencontre.engages`
 *   (p. 212) quand les deux participants sont présents ; comme le protocole n'appelle `engagementPairs` qu'avec les
 *   participants, la rencontre en cours est lue par `getEngages()` (closure de `creerLiaisonCarte` sur `getEtat()`).
 * - `map.turnReset` est toléré et relayé vers `onTurnReset` si fourni ; `map.impact` reçu est toléré sans erreur.
 */
import { createMapLinkProtocol } from '../js/core/map-link-protocol.js';
import { normalizeLibraryImage } from '../js/core/token-library-path.js';
import { participantCamp } from '../js/core/participant-camp.js';
import { valeursDerivees } from './profils.js';
import { acteurCourant } from './rencontre.js';

/** `ref` stable d'un participant : `pj:<id du profil>` pour un PJ, sinon `p:<id du participant>`. */
export const refCarteDe = participant => (participant?.kind === 'PJ' ? `pj:${participant.profilId ?? participant.id}` : `p:${participant?.id}`);

/** Taille de pion en cases (p. 201, 313) : défaut null, la carte garde la taille saisie à la main. */
const TAILLE_EN_CASES = Object.freeze({ minuscule: 1, petite: 1, moyenne: 1, grande: 2, enorme: 3, monstrueuse: 4 });

/** Niveau de marqueur : 1 = Mineur, 2 = Majeur (p. 356-357). */
const niveauDe = etat => (etat?.niveau === 'majeur' ? 2 : 1);

/**
 * Marqueurs (contrat §5) : projection stricte des Conditions vers les 16 `MARQUEURS_CARTE`. `neutralise` et
 * `surcharge` (p. 357) n'ont pas de marqueur connu : aucun n'est envoyé. Inconscient (condition p. 357 ou état) et
 * Mourant (p. 215) partent comme `unconscious` ; Désespéré (PNJ, p. 197) part comme `broken`.
 */
function marqueursDe(participant) {
  const markers = [];
  const markerLevels = {};
  for (const etat of Array.isArray(participant.etats) ? participant.etats : []) {
    switch (etat?.id) {
      case 'enflamme': markers.push('ablaze'); markerLevels.ablaze = niveauDe(etat); break; // p. 356
      case 'hemorragique': markers.push('bleeding'); markerLevels.bleeding = niveauDe(etat); break; // p. 356
      case 'aveugle': markers.push('blinded'); break; // p. 356
      case 'assourdi': markers.push('deafened'); break; // p. 356
      case 'extenue': markers.push('fatigued'); markerLevels.fatigued = niveauDe(etat); break; // p. 356
      case 'effraye': markers.push(etat?.niveau === 'majeur' ? 'terror' : 'fear'); break; // p. 357
      case 'empoisonne': markers.push('poisoned'); markerLevels.poisoned = niveauDe(etat); break; // p. 357
      case 'a-terre': markers.push('prone'); break; // p. 357
      case 'entrave': markers.push('entangled'); markerLevels.entangled = niveauDe(etat); break; // p. 357
      case 'sonne': markers.push('stunned'); markerLevels.stunned = niveauDe(etat); break; // p. 357
      case 'inconscient': markers.push('unconscious'); break; // p. 357
      case 'surpris': markers.push('surprised'); break; // p. 199
      case 'desespere': markers.push('broken'); break; // p. 197
      default: break; // neutralise, surcharge (p. 357) : aucun marqueur connu de la carte
    }
  }
  if (participant.etat === 'inconscient' || participant.etat === 'mourant') markers.push('unconscious'); // p. 215, 357
  return { markers: [...new Set(markers)], markerLevels };
}

/**
 * `token.state` d'un participant (rencontre) ou d'un pseudo-participant (PJ hors rencontre). Blessures montantes
 * converties en PV descendants : `max = max(1, blessuresMax)`, `current = max(0, max - blessures)`.
 */
export function etatPionDe(participant, { imageUrlOf = p => p.image } = {}) {
  const pj = participant.kind === 'PJ';
  const max = Math.max(1, Number(participant.blessuresMax) || 1);
  const blessures = Number(participant.blessures) || 0;
  const courant = Math.max(0, max - blessures);
  // p. 214-215 : Mourant, 0 PV ou <= 1/4 des PV -> critique ; sinon, blessé ; aucune blessure -> indemne
  const health = blessures === 0 ? 'unharmed'
    : (courant <= 0 || courant <= max / 4 || participant.etat === 'mourant' ? 'critical' : 'wounded');
  // p. 216, 317 : mort ou vaincu (Troupe/Élite hors combat) -> dead ; un enfui reste sur la carte, non mort
  const dead = participant.etat === 'mort' || participant.etat === 'vaincu';
  const { markers, markerLevels } = dead ? { markers: [], markerLevels: {} } : marqueursDe(participant);
  return {
    ref: refCarteDe(participant),
    label: participant.nom || '',
    // Le camp du profil est un choix explicite du MJ : un PJ « neutre » reste neutre.
    camp: participantCamp({ camp: participant.camp, kind: participant.kind, extensions: { campExplicit: true } }),
    kind: pj ? 'pc' : 'npc',
    visionSource: pj,
    imageUrl: normalizeLibraryImage(imageUrlOf(participant)) ?? null,
    formImageUrl: null,
    color: null,
    sizeCells: TAILLE_EN_CASES[participant.taille] ?? null,
    // Mode Zones par défaut : la Vitesse (p. 202) n'est pas envoyée comme portée.
    speedCells: null,
    runCells: null,
    visionDim: null,
    hp: { current: courant, max },
    health,
    markers,
    markerLevels,
    mounted: false,
    rider: null,
    dead,
    deathCause: null
  };
}

/**
 * Paires d'engagement (contrat §10, `mj.engagements`) : depuis `rencontre.engages` (p. 212), en `[[refA, refB]]`,
 * uniquement quand les deux participants sont présents dans la liste fournie.
 */
export function engagementPairs(participants, rencontre = null) {
  const presents = new Map((participants ?? []).map(p => [p.id, p]));
  return (rencontre?.engages ?? [])
    .filter(([a, b]) => presents.has(a) && presents.has(b))
    .map(([a, b]) => [refCarteDe(presents.get(a)), refCarteDe(presents.get(b))]);
}

/**
 * Projection d'Imperium pour le protocole commun. `imageUrlOf(participant)` rend le chemin d'image (le champ `image`
 * du profil par défaut) ; un chemin hors de `maps/tokens/` n'est pas envoyé. `getEngages()` rend la rencontre en cours
 * (ou null) pour les engagements : le protocole n'appelle `engagementPairs` qu'avec les participants.
 */
export function imperiumMapProjection({ imageUrlOf, getEngages = null } = {}) {
  return {
    tokenStates: participants => Object.fromEntries(participants.map(participant => {
      const state = etatPionDe(participant, imageUrlOf ? { imageUrlOf } : undefined);
      return [state.ref, state];
    })),
    refOf: refCarteDe,
    engagementPairs: participants => engagementPairs(participants, getEngages ? getEngages() : null)
  };
}

/**
 * Participants vus par la carte pour un état de séance `{ reserve, rencontre }` : ceux de la rencontre, puis les PJ
 * de la réserve qui n'y figurent pas (leur pion reste piloté hors combat, contrat §3), avec les blessures et les
 * conditions de leur suivi.
 */
export function participantsPourLaCarte({ reserve, rencontre } = {}) {
  const enScene = rencontre?.participants ?? [];
  const presents = new Set(enScene.filter(p => p.kind === 'PJ').map(p => p.profilId ?? p.id));
  const horsScene = (reserve?.profils ?? []).filter(profil => profil.kind === 'PJ' && !presents.has(profil.id)).map(profil => {
    const { blessuresMax } = valeursDerivees(profil);
    return {
      ...profil, profilId: profil.id,
      blessures: profil.suivi?.blessures ?? 0, blessuresMax,
      etats: profil.suivi?.etats ?? [], etat: 'actif'
    };
  });
  return [...enScene, ...horsScene];
}

/**
 * Liaison d'Imperium avec la carte : le protocole commun, la projection ci-dessus et la lecture de la séance.
 * `getEtat()` rend `{ reserve, rencontre }` ; le reste est celui de `createMapLinkProtocol` (`refresh`, `snapshot`,
 * `tick`, `on('placement')`, `status`…).
 */
export function creerLiaisonCarte({ channel, getEtat, imageUrlOf, now, onStatus, onRan, onTurnReset, setTimer, clearTimer }) {
  return createMapLinkProtocol({
    channel,
    projection: imperiumMapProjection({ imageUrlOf, getEngages: () => getEtat()?.rencontre ?? null }),
    getParticipants: () => participantsPourLaCarte(getEtat() ?? {}),
    getActiveId: () => { const r = getEtat()?.rencontre; return r ? (acteurCourant(r)?.id ?? null) : null; },
    ...(now ? { now } : {}), ...(onStatus ? { onStatus } : {}), ...(onRan ? { onRan } : {}), ...(onTurnReset ? { onTurnReset } : {}),
    ...(setTimer ? { setTimer } : {}), ...(clearTimer ? { clearTimer } : {})
  });
}
