import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, input, execute, subject, endTurn } from '../../helpers/lot3-catalogue-fixture.js';
import { resolveV5TestModifiers } from '../../../js/core/v5-test-modifiers.js';
import { previewV5BrokenEscape } from '../../../js/core/v5-broken-escape.js';
import { awakeningLostTurnRound } from '../../../js/core/v5-spell-restrictions.js';

// REGLES-10 (MJ 12/11) : Chant vivifiant (créature dormante : perd son prochain Tour, ni Action, ni Mouvement, ni défense active)
// et Acceptation du Destin (variante ennemie, Calme raté : aucune fuite ; Désengagement et Se cacher permis).

const awaken = async (order = ['mage', 'foe'], dormant = true) => {
  const { store, engine } = await fixture({ foe: { camp: 'pj' } });
  if (order[0] !== 'mage') { const snap = JSON.parse(store.getFullJSON()); snap.combat.order = order; snap.combat.orderMode = 'manual'; await store.loadFromJSON(snap); }
  const i = input('Chant vivifiant', { targetIds: ['foe'] });
  i.targetTests.foe = { ...i.targetTests.foe, plantCreature: true, dormant };
  await execute(store, 'Chant vivifiant', i);
  return { store, engine };
};
const attack = (store, actorId, targetId, id, defense) => store.previewResolution({ resolutionId: id, actorId, targetId, roll: 20,
  action: { type: 'attack', base: 50, attr: 'CC', damage: 2 }, ...(defense ? { defense: { base: 30, attr: 'CC', roll: 80, v5: { kind: 'melee' } } } : {}), v5: { kind: 'melee' } });
const blockedBy = (preview, pattern) => (preview.unresolved || []).some(text => pattern.test(text));

test('REGLES-10 : ordre des Tours, Tour encore à venir → ce Round ; Tour passé → Round suivant', () => {
  assert.equal(awakeningLostTurnRound({ order: ['mage', 'foe'], currentActorId: 'mage', targetId: 'foe', round: 3 }), 3);
  assert.equal(awakeningLostTurnRound({ order: ['foe', 'mage'], currentActorId: 'mage', targetId: 'foe', round: 3 }), 4);
  assert.equal(awakeningLostTurnRound({ order: [], currentActorId: null, targetId: 'foe', round: 3 }), 3);
});

test('REGLES-10 : Chant vivifiant, créature dormante dont le Tour est à venir : Action refusée, puis libre au Round suivant', async () => {
  const { store, engine } = await awaken();
  const foe = subject(store, 'foe');
  assert.equal(foe.extensions.v5.specialStates.cannotActUntilNextRound, true);
  assert.ok(blockedBy(attack(store, 'foe', 'mage', 'a1', true), /Chant vivifiant/), 'attaque de la créature éveillée refusée');
  const common = resolveV5TestModifiers(foe, { characteristic: 'Ag', skill: 'Athlétisme', isAction: true }, {});
  assert.ok(common.blockingRestrictions.some(text => /Chant vivifiant/.test(text)), 'Test d’Action refusé');
  assert.ok(!resolveV5TestModifiers(foe, { characteristic: 'E', skill: 'Résistance', passive: true }, {}).blockingRestrictions.length, 'Test subi permis');
  await endTurn(engine); // fin du Tour du mage : Tour de la créature, perdu
  assert.equal(store.getCombat().currentActorId, 'foe');
  assert.ok(blockedBy(attack(store, 'foe', 'mage', 'a2', true), /Chant vivifiant/), 'son Tour du Round 1 est perdu');
  await endTurn(engine); // fin du Tour perdu
  const after = subject(store, 'foe');
  assert.equal(after.extensions.v5.specialStates?.cannotActUntilNextRound, undefined, 'éveil terminé');
  assert.equal(after.extensions.v5.testModifiers['Tous les Tests'] > 0, true, 'le reste du sort dure');
  assert.ok(!blockedBy(attack(store, 'foe', 'mage', 'a3', true), /Chant vivifiant/));
});

test('REGLES-10 : Chant vivifiant, Tour de la créature déjà passé : elle perd celui du Round suivant', async () => {
  const { store, engine } = await awaken(['foe', 'mage']);
  await endTurn(engine); // fin du Tour du mage → Round 2, Tour de la créature
  assert.equal(store.getCombat().round, 2);
  assert.equal(store.getCombat().currentActorId, 'foe');
  assert.ok(blockedBy(attack(store, 'foe', 'mage', 'b1', true), /Chant vivifiant/), 'Tour du Round 2 perdu');
  await endTurn(engine);
  assert.equal(subject(store, 'foe').extensions.v5.specialStates?.cannotActUntilNextRound, undefined);
});

test('REGLES-10 : Chant vivifiant, défense active interdite ; sans défense, l’attaque se résout sans opposition', async () => {
  const { store } = await awaken();
  assert.ok(blockedBy(attack(store, 'mage', 'foe', 'd1', true), /Chant vivifiant/), 'Parade refusée');
  const open = attack(store, 'mage', 'foe', 'd2', false);
  assert.ok(!blockedBy(open, /Jet de défense requis/), 'aucun jet de défense demandé');
  assert.ok(!blockedBy(open, /Chant vivifiant/));
});

test('REGLES-10 : Chant vivifiant, ni Désengagement ni Fuite pendant l’éveil ; créature non dormante libre', async () => {
  const { store } = await awaken();
  await store.engageParticipants('foe', 'mage');
  await store.updateParticipant('foe', { camp: 'ennemi' });
  assert.equal(subject(store, 'foe').extensions.v5.hasMomentum, true, 'Élan de la fixture : Désengagement sans Test');
  const disengage = store.previewDisengage('foe');
  assert.equal(disengage.status, 'blocked');
  assert.match(disengage.reason, /Chant vivifiant/);
  await assert.rejects(store.applyFlee('foe'), /Chant vivifiant/);
  const awake = await awaken(['mage', 'foe'], false);
  assert.equal(subject(awake.store, 'foe').extensions.v5.specialStates?.cannotActUntilNextRound, undefined);
  assert.ok(!blockedBy(attack(awake.store, 'foe', 'mage', 'c1', true), /Chant vivifiant/));
});

const accept = async calmRoll => {
  const { store } = await fixture();
  const i = input('Acceptation du Destin', { targetIds: ['foe'], resistanceRoll: calmRoll });
  i.domainFacts = { ...i.domainFacts, mode: 'enemies' };
  i.targetTests.foe = { ...i.targetTests.foe, resistanceRoll: calmRoll, roll: calmRoll };
  await execute(store, 'Acceptation du Destin', i);
  await store.engageParticipants('foe', 'mage');
  return store;
};

test('REGLES-10 : Acceptation du Destin, Calme raté : Fuite refusée, Désengagement permis', async () => {
  const store = await accept(95);
  assert.equal(subject(store, 'foe').extensions.v5.specialStates.cannotFlee, true);
  await assert.rejects(store.applyFlee('foe'), /Acceptation du Destin.*ne peut pas fuir/);
  assert.notEqual(store.previewDisengage('foe').status, 'blocked');
});

test('REGLES-10 : Acceptation du Destin, Calme réussi : la fuite reste possible', async () => {
  const store = await accept(5);
  assert.equal(subject(store, 'foe').extensions.v5.specialStates?.cannotFlee, undefined);
  await store.applyFlee('foe');
});

test('REGLES-10 : Acceptation du Destin, Brisé : Flee et Sprint refusés, Se cacher permis ; champ absent = aucun blocage', () => {
  const actor = { id: 'foe', name: 'Orque', caracs: { M: 4, Ag: 40 }, states: [{ key: 'brise', name: 'Brisé', level: 1 }],
    skills: [{ id: 'hide', name: 'Discrétion', status: 'resolved', total: 40, carac: 'Ag' }],
    extensions: { v5: { specialStates: { cannotFlee: true }, spellEffects: [{ id: 'l1', spellName: 'Acceptation du Destin', specialState: { cannotFlee: true } }] } } };
  const turn = { encounterId: 'e', turnId: 't', round: 1 };
  const flee = previewV5BrokenEscape({ actor, action: 'flee', turn, facts: { visibleToAnyEnemy: true, engagedEnemyIds: [], moveMode: 'run', visibleToAnyEnemyAfter: true } });
  assert.equal(flee.status, 'blocked'); assert.match(flee.error, /Acceptation du Destin/);
  const sprint = previewV5BrokenEscape({ actor, action: 'sprint', turn, roll: 30, facts: { visibleToAnyEnemyAfter: true }, sequence: { fleeCommitted: true, visibleToAnyEnemy: true, moveMode: 'run' } });
  assert.equal(sprint.status, 'blocked'); assert.match(sprint.error, /Acceptation du Destin/);
  const hide = previewV5BrokenEscape({ actor, action: 'hide', turn, roll: 30, facts: { visibleToAnyEnemy: false, skillId: 'hide' } });
  assert.doesNotMatch(String(hide.error || ''), /Acceptation du Destin/);
  const plain = { ...actor, extensions: { v5: {} } };
  const free = previewV5BrokenEscape({ actor: plain, action: 'flee', turn, facts: { visibleToAnyEnemy: true, engagedEnemyIds: [], moveMode: 'run', visibleToAnyEnemyAfter: true } });
  assert.equal(free.ready, true);
});

test('REGLES-10 : la barre d’actions du plateau désactive la Fuite et, pendant l’éveil, les actions, en nommant le sort', async () => {
  const { actionBarModel } = await import('../../../js/ui/workspace/plateau.js');
  const store = await accept(95), active = store.listParticipants(), foe = active.find(row => row.id === 'foe');
  const rows = actionBarModel({ actor: foe, active, previewDisengage: id => store.previewDisengage(id) });
  const flee = rows.find(row => row.id === 'flee');
  assert.equal(flee.disabled, true); assert.match(flee.consequence, /Acceptation du Destin/);
  assert.notEqual(rows.find(row => row.id === 'disengage').disabled, true);
  const awake = (await awaken()).store, people = awake.listParticipants(), plant = people.find(row => row.id === 'foe');
  const blocked = actionBarModel({ actor: plant, active: people, previewDisengage: id => awake.previewDisengage(id) });
  assert.ok(blocked.filter(row => row.id !== 'other').every(row => row.disabled === true && /Chant vivifiant/.test(row.consequence)));
});
