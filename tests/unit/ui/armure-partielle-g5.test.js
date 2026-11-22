// G5-e (f5-armure, recette du 22/11) : une pièce Partielle (p. 306) sans jet de localisation affiche sa valeur nominale
// marquée conditionnelle (« 2* ») au lieu de « ? ». Coiffe de mailles : tête, 2 PA, Flexible, Partielle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armorSummary, displayedArmorLocations, PARTIAL_ARMOUR_NOTE } from '../../../js/ui/workspace/helpers.js';

const piece = (id, ap, locations, layer, keywords = []) => ({ id, baseId: id, kind: 'armour', name: id, category: '', damage: '', reach: '', range: '', ap, locations, layer, keywords, notes: '', source: '', custom: false });
const coif = piece('coiffe', 2, ['head'], 'chain', [{ id: 'flexible' }, { id: 'partielle' }]);
const pj = removed => ({ id: 'pj', name: 'Wren', armorLocations: { head: 2, body: 1, rightArm: 0, leftArm: 0, rightLeg: 0, leftLeg: 0 },
  equipment: [coif, piece('jaque', 1, ['body'], 'leather')], extensions: removed ? { v5: { removedArmour: removed } } : {} });

test('coiffe de mailles seule, protection recalculée (pièce ôtée ailleurs) : 2 conditionnel, jamais « ? »', () => {
  const shown = displayedArmorLocations(pj(['jaque']));
  assert.equal(shown.head, 2);
  assert.equal(shown.body, 0);
  assert.equal(shown.conditional?.head, PARTIAL_ARMOUR_NOTE);
  assert.equal(shown.conditional?.body, undefined);
  const summary = armorSummary({}, shown);
  assert.match(summary, /T2\*/);
  assert.doesNotMatch(summary, /\?/);
});

test('sans recalcul, la valeur de la fiche est gardée et marquée conditionnelle', () => {
  const shown = displayedArmorLocations(pj());
  assert.deepEqual({ ...shown }, pj().armorLocations, 'valeurs inchangées');
  assert.equal(shown.conditional?.head, PARTIAL_ARMOUR_NOTE);
  assert.match(armorSummary({}, shown), /T2\* C1/);
});

test('aucune pièce Partielle : rien de marqué', () => {
  const p = { ...pj(), equipment: [piece('casque', 2, ['head'], 'rigid')] };
  assert.equal(displayedArmorLocations(p).conditional, undefined);
  assert.doesNotMatch(armorSummary({}, displayedArmorLocations(p)), /\*/);
});
