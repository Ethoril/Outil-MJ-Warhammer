/**
 * Retours de la carte dans l'interface (contrat §10, lot L5) : compte « à poser », suggestions d'engagement et distance
 * préremplie. Une suggestion n'engage rien d'elle-même : le bouton « Engager » passe par `Store.engageParticipants`,
 * l'ignorer la laisse expirer. Montage : `mountMapLinkFeedback({ mapLink, store: Store, showToast, pendingNode: qs('#map-link-pending') })`.
 */
import { renderMapLinkPending } from './map-link-indicator.js';
import { engagementSuggestionsOf, distanceMetersOf } from '../core/map-link-feedback.js';

export const SUGGESTION_TOAST_MS = 15000;

export function mountMapLinkFeedback({ mapLink, store, showToast, pendingNode = null }) {
  // Paires suggérées au dernier `map.adjacency` : une paire restée au contact n'est pas reproposée à chaque déplacement.
  let lastKeys = new Set();

  const accept = suggestion => {
    if ((store.listEngagedWith(suggestion.aId) || []).includes(suggestion.bId)) return null; // engagés entre-temps
    try {
      return Promise.resolve(store.engageParticipants(suggestion.aId, suggestion.bId))
        .then(result => { if (result?.ok === false) showToast(result.message || 'Engagement impossible.', 'error'); return result; },
          error => { showToast(error?.message || 'Engagement impossible.', 'error'); });
    } catch (error) {
      showToast(error?.message || 'Engagement impossible.', 'error');
      return null;
    }
  };

  const onAdjacency = pairs => {
    const suggestions = engagementSuggestionsOf(pairs, store.listParticipants());
    for (const suggestion of suggestions) {
      if (lastKeys.has(suggestion.key)) continue;
      showToast(`🗺️ ${suggestion.aName} et ${suggestion.bName} sont au contact : les engager ?`, 'info',
        { label: 'Engager', onClick: () => accept(suggestion) }, SUGGESTION_TOAST_MS);
    }
    lastKeys = new Set(suggestions.map(suggestion => suggestion.key));
  };

  const offPlacement = mapLink.on('placement', view => renderMapLinkPending(pendingNode, view));
  const offAdjacency = mapLink.on('adjacency', onAdjacency);
  renderMapLinkPending(pendingNode, mapLink.placement());

  /**
   * Distance préremplie entre deux participants, en mètres selon l'usage (`ranged`, `move`, `spell`, `prayer`, `talent`).
   * Rend `{ ok: true, cells, meters }` ou `{ ok: false, reason, message }` : le MJ garde la saisie.
   */
  const distanceBetween = (from, to, use) => mapLink.queryDistance(from, to).then(answer => {
    if (!answer.ok) return answer;
    const meters = distanceMetersOf(answer.cells, use);
    return meters === null ? { ok: false, reason: 'unknown-use', message: `Usage de distance inconnu : ${use}.` } : { ...answer, meters };
  });

  return { distanceBetween, accept, destroy: () => { offPlacement(); offAdjacency(); } };
}
