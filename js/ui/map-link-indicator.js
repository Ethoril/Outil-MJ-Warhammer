// Indicateur durable de la liaison RPG Map Display (barre du haut). Statuts : ceux de createMapLink.onStatus.
export const MAP_LINK_VIEW = Object.freeze({
  connected: Object.freeze({ label: 'Carte connectée', tone: 'ok' }),
  disconnected: Object.freeze({ label: 'Carte déconnectée', tone: 'neutral' }),
  'version-mismatch': Object.freeze({ label: 'Versions de liaison différentes', tone: 'danger' })
});

export function mapLinkIndicatorView(status) {
  return MAP_LINK_VIEW[status] ?? null;
}

export function renderMapLinkIndicator(node, status) {
  const view = mapLinkIndicatorView(status);
  if (!node || !view) return null;
  node.dataset.state = status;
  node.dataset.tone = view.tone;
  const label = node.querySelector('.map-link-label');
  if (label) label.textContent = view.label;
  return view;
}

/**
 * Compte « À poser (N) » (contrat §10) à côté de l'indicateur : pions liés que la carte n'a pas posés. Caché quand la
 * carte est déconnectée ou que tout est posé ; le titre liste les noms. `view` : `mapLink.placement()`.
 */
export function mapLinkPendingView(view) {
  const pending = view?.connected ? view.pending || [] : [];
  if (!pending.length) return null;
  return { label: `À poser (${pending.length})`, title: `À poser sur la carte : ${pending.map(row => row.label).join(', ')}` };
}

export function renderMapLinkPending(node, view) {
  if (!node) return null;
  const shown = mapLinkPendingView(view);
  node.hidden = !shown;
  node.textContent = shown ? shown.label : '';
  if (shown) node.title = shown.title; else node.removeAttribute?.('title');
  return shown;
}
