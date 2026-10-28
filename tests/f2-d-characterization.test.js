import test from 'node:test';
import assert from 'node:assert/strict';
import { activeEngines } from '../js/core/roll-qualities.js';
import { keywordMechanicalStatus } from '../js/core/keywords.js';
import { v5ShieldDefense } from '../js/core/v5-combat-rules.js';

test('F2-D characterization — existing roll engines remain covered and deduplicated', () => {
  for (const id of ['inoffensive', 'percutante', 'devastatrice', 'pointue', 'imprecise', 'defensive', 'desequilibree', 'precise', 'empaleuse', 'dangereuse']) {
    assert.equal(keywordMechanicalStatus(id).status, 'covered', `${id} is an existing mechanical contract`);
  }

  const engines = activeEngines([{ id: 'percutante' }, { id: 'impact' }, { id: 'pointue' }]);
  assert.deepEqual(engines.map(row => row.id), ['percutante', 'pointue']);
});

test('F2-D characterization — legacy Protectrice shield requires explicit held-shield opposition', () => {
  const shield = { id: 'old-shield', kind: 'shield', keywords: [{ id: 'protectrice', parameter: '2' }] };
  const target = { equipment: [shield] };
  const confirmed = v5ShieldDefense({
    target,
    defense: { type: 'test' },
    protectionContext: { shieldId: shield.id, shieldAvailable: true, opposedWithShield: true }
  });
  assert.deepEqual(confirmed, { confirmed: true, rangedDodgeAllowed: true, rating: 2, unresolved: null });

  const notChosen = v5ShieldDefense({
    target,
    defense: { type: 'test' },
    protectionContext: { shieldId: shield.id, shieldAvailable: true, opposedWithShield: false }
  });
  assert.equal(notChosen.confirmed, false);
  assert.equal(notChosen.rating, null);
});

test('F2-D characterization — V5 Bouclier is covered by its resolution flow, separate from legacy Protectrice', () => {
  const status = keywordMechanicalStatus('bouclier');
  assert.equal(status.status, 'covered');
  assert.equal(status.engine.scope, 'resolution-quality');
  assert.equal(status.engine.engine, 'v5-shield');
});
