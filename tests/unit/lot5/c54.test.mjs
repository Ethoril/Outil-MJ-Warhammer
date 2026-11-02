import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpellContract } from '../../../js/core/v5-spell-contracts.js';
import { encounter, cast } from '../../helpers/lot3-domain-fixture.js';

// Lot 5 · C54 (G-DIV-18) : une invocation en cours de Round doit recevoir son Initiative (d10 + Bonus) et prendre son rang,
// comme un renfort (C27) ; elle appartient au camp du lanceur.
async function round1Cast() {
  const c = getSpellContract('Relever les morts'), { store } = await encounter();
  const state = JSON.parse(store.getFullJSON());
  state.combat.round = 1;
  state.extensions.v5.combatInitiativeInitialized = true;
  state.extensions.v5.combatInitiativeResolution = { order: [...state.combat.order] };
  await store.loadFromJSON(state);
  await cast(store, c, { sl: 0, domainFactsExtra: { minutesToDawn: 5 } });
  return { store, summoned: store.listParticipants().filter(p => p.id.startsWith('aux-' + c.id)) };
}

test('C54 : invocation magique au Round 1, Initiative tirée et rang dans la piste', async () => {
  const { store, summoned } = await round1Cast();
  assert.ok(summoned.length > 0);
  for (const creature of summoned) {
    const initiative = creature.extensions.v5.combatInitiative;
    assert.ok(initiative?.die >= 1 && initiative.die <= 10, 'd10 d’Initiative absent');
    assert.equal(initiative.score, initiative.die + Math.floor(creature.caracs.I / 10));
    assert.ok(store.getCombat().order.includes(creature.id));
  }
});

test('C54 : l’invoqué prend le camp du lanceur', async () => {
  const { summoned } = await round1Cast();
  assert.ok(summoned.every(creature => creature.camp === 'pj'), summoned.map(row => row.camp).join(','));
});

test('C54 : Annuler restitue la piste d’avant l’invocation', async () => {
  const { store, summoned } = await round1Cast();
  assert.ok(summoned.length > 0);
  assert.equal(await store.undo(), true);
  assert.deepEqual(store.getCombat().order, ['mage', 'foe']);
  assert.equal(store.listParticipants().some(p => p.id.startsWith('aux-')), false);
});
