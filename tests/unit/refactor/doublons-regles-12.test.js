// REGLES-12 : le refus de cumul prière + sort (DIV-05) recopié dans v5-divine-store.js n'est plus exécuté, la table des politiques
// du moteur d'effets trace la paire en « somme » (Q2, Q14). Ce test fige la table ; le signalement d'une paire absente reste celui
// du moteur (CA5, tests/unit/moteur/effect-engine.test.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BETWEEN_GROUPS, betweenGroupsRule } from '../../../js/core/effect-engine.js';

test('REGLES-12 prière et sort se somment, table figée', () => {
  assert.equal(betweenGroupsRule('prayer', 'spell').policy, 'sum');
  assert.equal(betweenGroupsRule('spell', 'prayer').policy, 'sum');
  assert.ok(Object.isFrozen(BETWEEN_GROUPS));
});
