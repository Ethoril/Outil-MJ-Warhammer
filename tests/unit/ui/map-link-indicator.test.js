import test from 'node:test';
import assert from 'node:assert/strict';
import { mapLinkIndicatorView, renderMapLinkIndicator } from '../../../js/ui/map-link-indicator.js';

test('statut de liaison → libellé de la barre', () => {
  assert.equal(mapLinkIndicatorView('connected').label, 'Carte connectée');
  assert.equal(mapLinkIndicatorView('disconnected').label, 'Carte déconnectée');
  assert.equal(mapLinkIndicatorView('version-mismatch').label, 'Versions de liaison différentes');
  assert.equal(mapLinkIndicatorView('inconnu'), null);
});

test('le rendu met à jour l’état et le libellé, ignore un statut inconnu', () => {
  const label = { textContent: '' };
  const node = { dataset: {}, querySelector: () => label };
  renderMapLinkIndicator(node, 'connected');
  assert.deepEqual([node.dataset.state, node.dataset.tone, label.textContent], ['connected', 'ok', 'Carte connectée']);
  assert.equal(renderMapLinkIndicator(node, 'x'), null);
  assert.equal(label.textContent, 'Carte connectée');
});
