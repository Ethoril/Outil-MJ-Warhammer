import test from 'node:test';
import assert from 'node:assert/strict';
import { describeResolutionDetail } from '../js/core/resolution.js';

test('Journal historique — règle, munition et protection viennent du reçu conservé', () => {
  const detail = { referenceVersion: 'references:ancienne-version', action: { note: 'Arc historique', extensions: { fiche: { equipmentId: 'arc-1' } } }, ammunitionId: 'fleche-1', ammunitionSources: [{ kind: 'ammunition', equipmentId: 'fleche-1', keywordId: 'pointue', parameter: 'texte libre' }], protection: { ap: 2, arbitrated: true, counted: [{ name: 'Maille historique' }], ignored: [{ name: 'Pièce partielle' }], shield: { name: 'Bouclier historique' }, shieldAp: 0 }, mechanics: [{ id: 'precise', name: 'Nom historique de règle', status: 'covered', edition: 'Édition historique', source: 'Ancienne aide p.4', effectVersion: 'version-historique', effect: 'Texte conservé à la date du jet' }] };
  const lines = describeResolutionDetail(detail).join(' | ');
  for (const value of ['ancienne-version', 'Arc historique', 'fleche-1', 'pointue (texte libre)', '2 PA (arbitrage MJ)', 'Maille historique', 'Pièce partielle', 'Bouclier historique', 'Nom historique de règle', 'Édition historique', 'Ancienne aide p.4', 'version-historique', 'Texte conservé à la date du jet']) assert.ok(lines.includes(value), value);
  assert.ok(!lines.includes('[object Object]'));
  assert.deepEqual(describeResolutionDetail({ sl: -2, critical: null }), ['DR : −2']);
});
