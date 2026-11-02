import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpellContract } from '../../../js/core/v5-spell-contracts.js';
import { encounter, inputFor } from '../../helpers/lot3-domain-fixture.js';

// Lot 5 · C52 / G-MAG-2 : Brise-os, offrande de la Grande Gueule à 10 : le lanceur récupère NI Blessures, mais l'aperçu
// ne l'annonçait pas (seuls les effets sur les cibles figuraient dans attributeReceipts).
const preview = async roll => {
  const c = getSpellContract('Brise-os'), { store } = await encounter({ mage: { hp: 4 } });
  return store.previewSpellExecution(c.id, inputFor(c, { attributeActive: true, targetTests: { foe: { roll: 98, wardRoll: 1 }, mage: { mawRoll: roll } } }));
};

test('C52 : offrande à 10, l’aperçu annonce le soin du lanceur', async () => {
  const p = await preview(10);
  assert.equal(p.ready, true, p.error);
  const line = (p.attributeReceipts || []).find(row => row.targetId === 'mage');
  assert.ok(line, 'aucune ligne d’attribut pour le lanceur');
  assert.match(line.effect, /récupère 5 Blessures/);
});

test('C52 : offrande ratée, l’aperçu dit qu’il n’y a aucun soin', async () => {
  const p = await preview(2);
  assert.match((p.attributeReceipts || []).find(row => row.targetId === 'mage')?.effect || '', /aucun soin/);
});
