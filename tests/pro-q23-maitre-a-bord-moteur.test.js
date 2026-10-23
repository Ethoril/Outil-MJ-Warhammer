import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCombatTest } from '../js/core/v5-combat-rules.js';
import { applicableV5TalentTestFields } from '../js/core/v5-talent-tests.js';

// Sea of Claws p. 63 (Q23) : +1 DR par niveau aux Tests de Commandement à bord, appliqué par le moteur de Test.
const COMMAND = 'skill-43_6f_6d_6d_61_6e_64_65_6d_65_6e_74-base';
const captain = rank => ({ id: 'cap', hp: 12, states: [], talents: [{ id: 'talent-master-and-commander', status: 'resolved', rank }] });
const run = (actor, context = {}, label = 'Commandement') => buildCombatTest({
  actor, target: { id: 'b', hp: 12, states: [], talents: [] }, roll: 47,
  action: { type: 'test', label, base: 50, extensions: { fiche: { skillId: COMMAND } } },
  v5: { kind: 'test', context }
});

test('Q23 — 2 niveaux, à bord : +2 DR au Test de Commandement (DR 1 → 3)', () => {
  const built = run(captain(2), { onBoardVessel: true });
  const result = built.test.options[0].result;
  assert.equal(result.sl, 3);
  assert.ok(result.details.modifiers.some(row => row.id === 'master-and-commander' && row.amount === 2));
});

test('Q23 — hors du navire : aucun bonus ; fait non précisé : question posée, pas de bonus', () => {
  assert.equal(run(captain(2), { onBoardVessel: false }).test.options[0].result.sl, 1);
  const unknown = run(captain(2));
  assert.equal(unknown.test.options[0].result.sl, 1);
  assert.ok(unknown.unresolved.some(text => /à bord/i.test(text)));
});

test('Q23 — sans le talent, ou pour une autre compétence : aucun bonus ni question', () => {
  const plain = { id: 'x', hp: 12, states: [], talents: [] };
  assert.equal(run(plain, { onBoardVessel: true }).test.options[0].result.sl, 1);
  assert.equal(run(plain).unresolved.length, 0);
  const other = buildCombatTest({ actor: captain(2), target: plain, roll: 47, action: { type: 'test', label: 'Charme', base: 50 }, v5: { kind: 'test', context: { onBoardVessel: true } } });
  assert.equal(other.test.options[0].result.sl, 1);
});

test('Q23 — l’interface propose le champ « à bord » seulement au porteur, pour Commandement', () => {
  const field = applicableV5TalentTestFields(captain(1), COMMAND).find(row => row.field === 'onBoardVessel');
  assert.equal(field.type, 'boolean');
  assert.equal(applicableV5TalentTestFields(captain(1), 'none').some(row => row.field === 'onBoardVessel'), false);
  assert.equal(applicableV5TalentTestFields({ id: 'x', talents: [] }, COMMAND).some(row => row.field === 'onBoardVessel'), false);
});
