import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { listEngagements } from '../../../js/core/engagements.js';

// Engagements durables dans le Store (spec docs/specs/engagements, CA5-CA9, CA12-CA13).
const fighter = (id, camp, extra = {}) => ({ id, name: id, kind: camp === 'ennemi' ? 'PNJ' : 'PJ', camp, zone: 'active', initiative: 50, hp: 20, maxHp: 20,
  caracs: { CC: 50, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, skills: [], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
async function fixture(extra = {}) {
  const store = createStore(); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'gunther', order: ['gunther', 'aldric', 'orc'], participants: [fighter('gunther', 'pj', { initiative: 60 }), fighter('aldric', 'pj', { initiative: 40 }), fighter('orc', 'ennemi', { initiative: 30, ...extra.orc })] } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const pairs = store => listEngagements({ participants: store.listParticipants() }).map(row => row.a + '-' + row.b);
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const meleeAttack = (store, actorId, targetId, id) => store.previewResolution({ resolutionId: id, actorId, targetId, roll: 20,
  action: { type: 'attack', base: 50, attr: 'CC', damage: 2 }, defense: { base: 30, attr: 'CC', roll: 80, v5: { kind: 'melee' } }, v5: { kind: 'melee' } });

test('une attaque de mêlée appliquée engage la paire ; Annuler la retire (CA5, CA9)', async () => {
  const store = await fixture();
  assert.equal((await store.applyResolution(meleeAttack(store, 'gunther', 'orc', 'm1'))).status, 'applied');
  assert.deepEqual(pairs(store), ['gunther-orc']);
  await store.undo();
  assert.deepEqual(pairs(store), []);
});

test('engager et désengager à la main, avec journal (CA6)', async () => {
  const store = await fixture();
  await store.engageParticipants('aldric', 'orc');
  assert.deepEqual(pairs(store), ['aldric-orc']);
  assert.match(store.getLog()[0].text, /aldric et orc sont engagés \(MJ\)/);
  await store.disengageParticipant('orc');
  assert.deepEqual(pairs(store), []);
});

test('fin de Round : la paire sans attaque pendant le Round complet cesse (CA7)', async () => {
  const store = await fixture();
  const engine = createCombatEngine(store);
  await store.engageParticipants('gunther', 'orc');
  for (let i = 0; i < 3; i++) await engine.nextTurn();
  assert.equal(store.getCombat().round, 2);
  assert.deepEqual(pairs(store), ['gunther-orc'], 'engagée au Round 1 : gardée au passage au Round 2');
  for (let i = 0; i < 3; i++) await engine.nextTurn();
  assert.equal(store.getCombat().round, 3);
  assert.deepEqual(pairs(store), [], 'aucune attaque pendant le Round 2 : la paire cesse');
  assert.ok(store.getLog().some(row => /Fin d’engagement/.test(row.text)));
});

test('Désengagement : avec l’Élan, sans Test ; sans Élan, échec = Élan aux adversaires (CA12)', async () => {
  const store = await fixture();
  await store.engageParticipants('gunther', 'orc');
  await store.updateParticipant('gunther', { extensions: { v5: { hasMomentum: true } } });
  assert.equal(store.previewDisengage('gunther').mode, 'momentum');
  await store.applyDisengage('gunther');
  assert.deepEqual(pairs(store), []);
  assert.equal(person(store, 'gunther').extensions.v5.hasMomentum, false);
  await store.engageParticipants('aldric', 'orc');
  assert.equal(store.previewDisengage('aldric').status, 'needs-rolls');
  await store.applyDisengage('aldric', { actorRoll: 95, opponentRoll: 5 });
  assert.deepEqual(pairs(store), ['aldric-orc'], 'échec : toujours engagé');
  assert.equal(person(store, 'orc').extensions.v5.hasMomentum, true);
});

test('Fuite d’un combattant non Brisé : Élan aux engagés, Brisé au fuyard, plus engagé ; En Bon Ordre (CA13)', async () => {
  const store = await fixture();
  await store.engageParticipants('gunther', 'orc');
  await store.applyFlee('gunther');
  assert.deepEqual(pairs(store), []);
  assert.equal(person(store, 'orc').extensions.v5.hasMomentum, true);
  assert.equal(person(store, 'gunther').states.find(row => row.key === 'brise').level, 1);
  const orderly = await fixture();
  await orderly.updateParticipant('aldric', { extensions: { v5: { specialStates: { orderlyDisengage: true } } } });
  await orderly.engageParticipants('aldric', 'orc');
  await orderly.applyFlee('aldric');
  assert.notEqual(person(orderly, 'orc').extensions.v5.hasMomentum, true, 'En Bon Ordre : pas d’Élan pour l’engagé');
  assert.equal(person(orderly, 'aldric').states.find(row => row.key === 'brise').level, 1, 'le Brisé reste dû');
});

test('les engagements survivent à une sauvegarde rechargée (CA9)', async () => {
  const store = await fixture();
  await store.engageParticipants('gunther', 'orc');
  const reloaded = createStore(); await reloaded.ready;
  await reloaded.loadFromJSON(JSON.parse(store.getFullJSON()));
  assert.deepEqual(pairs(reloaded), ['gunther-orc']);
});

test('scène de la rencontre : enregistrée, validée, appliquée par défaut à l’attaque (CA20)', async () => {
  const store = await fixture();
  await store.setSceneCircumstances({ lighting: 'dark', difficultTerrain: true });
  assert.deepEqual(store.getSceneCircumstances(), { lighting: 'dark', difficultTerrain: true });
  assert.throws(() => store.setSceneCircumstances({ lighting: 'lune' }), /invalide/);
  await store.setSceneCircumstances({ lighting: null });
  assert.deepEqual(store.getSceneCircumstances(), { difficultTerrain: true });
  await store.undo();
  assert.equal(store.getSceneCircumstances().lighting, 'dark', 'Annuler restaure la scène');
  await store.setParticipantPosition('gunther', { higherGround: true });
  assert.equal(person(store, 'gunther').extensions.v5.position.higherGround, true);
});
