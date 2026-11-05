import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCriticalAftermathRecord, decideImmediateCriticalDeath } from '../../../js/core/v5-critical-aftermath.js';
import { expireSpellEffects } from '../../../js/core/v5-magic-effects.js';

const person = () => ({ id: 'p', name: 'P', hp: 10, maxHp: 10, states: [], caracs: { E: 30 }, extensions: { v5: {} } });

test('mort critique confirmée : cause ordinaire et conservation de la cause antérieure', () => {
  const record = createCriticalAftermathRecord(person(), { table: 'HEAD', effectRoll: 100, resolutionId: 'mort', round: 1 });
  const confirm = target => decideImmediateCriticalDeath(target, { criticalId: record.record.id, decision: 'confirm' }).participant;
  const deceased = confirm(record.participant);
  assert.equal(deceased.extensions.v5.dead, true);
  assert.equal(deceased.extensions.v5.deathCause, 'blood');
  const old = structuredClone(record.participant);
  old.extensions.v5.dead = true;
  old.extensions.v5.deathCause = 'poison';
  assert.equal(confirm(old).extensions.v5.deathCause, 'poison');
});

test('lignes mortelles V5 : membres et corps démembrent, crâne décapité au choix du MJ', () => {
  const confirmOn = (table, options = {}) => {
    const record = createCriticalAftermathRecord(person(), { table, effectRoll: 999, resolutionId: 'mort', round: 1 });
    return decideImmediateCriticalDeath(record.participant, { criticalId: record.record.id, decision: 'confirm', ...options }).participant;
  };
  for (const table of ['ARM', 'BODY', 'LEG']) assert.equal(confirmOn(table).extensions.v5.deathCause, 'dismemberment', table);
  assert.equal(confirmOn('HEAD').extensions.v5.deathCause, 'blood');
  const head = confirmOn('HEAD', { decapitated: true });
  assert.equal(head.extensions.v5.deathCause, 'decapitation');
  assert.equal(head.extensions.v5.criticalAftermath[0].deathDecision.decapitated, true);
  // « Décapité » n'a de sens que sur la tête.
  assert.equal(confirmOn('ARM', { decapitated: true }).extensions.v5.deathCause, 'dismemberment');
});

test('expiration létale : cause magique et première cause conservée', () => {
  const target = person();
  target.extensions.v5.spellEffects = [{ id: 'ending', dieOnExpiry: true }];
  const expire = p => expireSpellEffects(p, { effectId: 'ending' }).participant;
  const deceased = expire(target);
  assert.equal(deceased.extensions.v5.dead, true);
  assert.equal(deceased.extensions.v5.deathCause, 'magic');
  target.extensions.v5.dead = true;
  target.extensions.v5.deathCause = 'poison';
  assert.equal(expire(target).extensions.v5.deathCause, 'poison');
});

 test('étouffement magique : décès existant enregistré comme magique', async () => {
  const { roundSpellEffects } = await import('../../../js/core/v5-magic-turn.js');
  const target = person();
  target.hp = 0;
  target.extensions.v5.spellEffects = [{ id: 'suffocation', casterId: 'p', spellName: 'Ombres', appliedAtRound: 1, suffocationZeroRounds: 2, roundEffect: { phase: 'endOfRound', suffocation: true } }];
  const result = roundSpellEffects([target], 'endOfRound', 2).participants[0];
  assert.equal(result.extensions.v5.dead, true);
  assert.equal(result.extensions.v5.deathCause, 'magic');
});
