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
