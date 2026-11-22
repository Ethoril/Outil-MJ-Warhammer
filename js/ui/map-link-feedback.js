/**
 * Retours de la carte dans l'interface (contrat §10, lot L5) : compte « à poser », suggestions d'engagement et distance
 * préremplie. Une suggestion n'engage rien d'elle-même : le bouton « Engager » passe par `Store.engageParticipants`,
 * l'ignorer la laisse expirer. Montage : `mountMapLinkFeedback({ mapLink, store: Store, showToast, pendingNode: qs('#map-link-pending') })`.
 */
import { renderMapLinkPending } from './map-link-indicator.js';
import { engagementSuggestionsOf, distanceMetersOf } from '../core/map-link-feedback.js';
import { publishDecision, withdrawDecision } from './combat-decisions.js';

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

  // Refonte E2b (décision 20, CA7, CA9) : chaque suggestion figure aussi dans la case « À décider » jusqu'au clic du MJ
  // (« Engager » ou « Ignorer », dans la case ou sur le toast), ou jusqu'à ce que la paire ne soit plus au contact.
  const decisionId = key => `engagement-carte:${key}`;
  const published = new Set();
  const withdraw = key => { published.delete(key); withdrawDecision(decisionId(key)); };
  const onAdjacency = pairs => {
    const suggestions = engagementSuggestionsOf(pairs, store.listParticipants());
    for (const suggestion of suggestions) {
      if (lastKeys.has(suggestion.key)) continue;
      const titre = `${suggestion.aName} et ${suggestion.bName} sont au contact : les engager ?`;
      showToast(`🗺️ ${titre}`, 'info', { label: 'Engager', onClick: () => { withdraw(suggestion.key); return accept(suggestion); } }, SUGGESTION_TOAST_MS);
      published.add(suggestion.key);
      publishDecision({ id: decisionId(suggestion.key), kind: 'engagement-carte', participantId: suggestion.aId, titre,
        options: [{ key: 'engage', label: 'Engager' }, { key: 'ignore', label: 'Ignorer' }],
        onChoose: key => { withdraw(suggestion.key); return key === 'engage' ? accept(suggestion) : null; } });
    }
    lastKeys = new Set(suggestions.map(suggestion => suggestion.key));
    for (const key of [...published]) if (!lastKeys.has(key)) withdraw(key);
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

  return { distanceBetween, accept, destroy: () => { offPlacement(); offAdjacency(); [...published].forEach(withdraw); } };
}

/**
 * Refonte E2b (décision 21) : course signalée par la carte (`runProposalOf`), question de la case « À décider ».
 * Rien n'est décompté sans le clic du MJ : « Action utilisée » appelle `spend(actorId)` (Store.spendV5RunAction).
 * Rend `null` quand il n'y a rien à décompter (course hors du Tour, Action déjà dépensée).
 */
export function runDecision(proposal, { spend, showToast = () => {} } = {}) {
  if (!proposal?.canSpend || !proposal.actorId) return null;
  return { id: `course-carte:${proposal.actorId}`, kind: 'course-carte', participantId: proposal.actorId, titre: proposal.message,
    options: [{ key: 'used', label: 'Action utilisée' }, { key: 'ignore', label: 'Pas d’Action' }],
    onChoose: key => {
      withdrawDecision(`course-carte:${proposal.actorId}`);
      if (key !== 'used') return null;
      return Promise.resolve(spend?.(proposal.actorId)).then(result => { if (result?.ok === false) showToast(result.message, 'error'); return result; });
    } };
}
