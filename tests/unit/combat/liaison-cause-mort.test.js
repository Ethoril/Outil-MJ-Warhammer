import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCriticalAftermathRecord, decideImmediateCriticalDeath, decideStateDeath } from '../../../js/core/v5-critical-aftermath.js';
import { expireSpellEffects } from '../../../js/core/v5-magic-effects.js';
import { advanceV5Effects } from '../../../js/core/v5-effects.js';
import { resolveMiscast, applyMiscastToParticipant } from '../../../js/core/v5-magic-miscasts.js';
import { createStore } from '../../../js/core/store.js';

const person = () => ({ id: 'p', name: 'P', hp: 10, maxHp: 10, states: [], caracs: { E: 30 }, extensions: { v5: {} } });
const cond = (name, level = 1) => ({ name, level });
const endRound = { phase: 'endOfRound', round: 3, actorId: 'other', turn: 8 };

test('mort proposée par un état : cause et source selon l’état', () => {
  const dying = states => ({ ...person(), hp: 0, states });
  const bleed = advanceV5Effects(dying([cond('Hémorragique', 10), cond('Inconscient')]), endRound);
  assert.equal(bleed.death, true);
  assert.equal(bleed.deathCause, 'blood');
  assert.equal(bleed.deathSource, 'bleeding');
  const poison = advanceV5Effects(dying([cond('Empoisonné'), cond('Inconscient')]), endRound,
    { poisonDeathDueRound: 3, poisonEnduranceTest: { success: false, sl: -1 } });
  assert.equal(poison.deathCause, 'poison');
  assert.equal(poison.deathSource, 'poison');
  const alive = advanceV5Effects(dying([cond('Hémorragique', 3), cond('Inconscient')]), endRound, { bleedingDeathRoll: 9 });
  assert.equal(alive.death, false);
  assert.equal(alive.deathCause, null);
});

test('décision MJ sur une mort d’état : confirmer pose la mort V5 et sa cause, refuser efface la proposition', () => {
  const pending = { id: 'state-death:p:3', cause: 'poison', source: 'poison', round: 3 };
  const target = { ...person(), extensions: { v5: { pendingStateDeath: pending } } };
  const dead = decideStateDeath(target, { pendingId: pending.id, decision: 'confirm' });
  assert.equal(dead.status, 'dead');
  assert.equal(dead.participant.extensions.v5.dead, true);
  assert.equal(dead.participant.extensions.v5.deathCause, 'poison');
  assert.equal(dead.participant.extensions.v5.pendingStateDeath, undefined);
  const spared = decideStateDeath(target, { pendingId: pending.id, decision: 'decline' });
  assert.equal(spared.status, 'declined');
  assert.notEqual(spared.participant.extensions.v5.dead, true);
  assert.equal(spared.participant.extensions.v5.pendingStateDeath, undefined);
  assert.equal(decideStateDeath(target, { pendingId: 'autre', decision: 'confirm' }).status, 'blocked');
});

test('fin de Round : la mort par Hémorragique attend la décision du MJ, puis arrive à la carte avec sa cause', async () => {
  const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: id === 'a' ? 50 : 30, hp: 10, maxHp: 10,
    caracs: { E: 30, I: 40, Ag: 30 }, states: [], talents: [], extensions: { v5: {} }, ...extra });
  const store = createStore({ storage: null }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], persistentCharacters: [], localRevision: 1, extensions: {}, log: [], diceLines: [],
    combat: { round: 1, currentActorId: 'b', participants: [fighter('a'), fighter('b', { hp: 0, states: [cond('Hémorragique', 10), cond('Inconscient')] })] } });
  const { createCombatEngine } = await import('../../../js/core/combat.js');
  const engine = createCombatEngine(store);
  const result = await engine.nextTurn({ inputs: { b: { toughnessBonus: 3 } } });
  assert.notEqual(result?.status, 'requires-input', JSON.stringify(result?.requests || result));
  const pending = store.listParticipants().find(p => p.id === 'b').extensions.v5.pendingStateDeath;
  assert.equal(pending?.cause, 'blood');
  assert.equal(pending?.source, 'bleeding');
  assert.notEqual(store.listParticipants().find(p => p.id === 'b').extensions.v5.dead, true);
  await store.decideStateDeath('b', pending.id, 'confirm');
  const after = store.listParticipants().find(p => p.id === 'b');
  assert.equal(after.extensions.v5.dead, true);
  assert.equal(after.extensions.v5.deathCause, 'blood');
});

test('Incident Cataclysme : mort V5 magique, visible par la liaison carte', () => {
  const miscast = resolveMiscast({ severity: 'MAJOR', roll: 99, bfm: 5, secondaryRolls: { noOtherTargets: true } });
  assert.equal(miscast.details.headExploded, true);
  const caster = { ...person(), hp: 30, maxHp: 30, caracs: { E: 30, FM: 50 } };
  const after = applyMiscastToParticipant(caster, miscast).participant;
  assert.equal(after.dead, true);
  assert.equal(after.extensions.v5.dead, true);
  assert.equal(after.extensions.v5.deathCause, 'magic');
});

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
