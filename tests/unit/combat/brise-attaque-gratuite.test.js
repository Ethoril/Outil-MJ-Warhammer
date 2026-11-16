// Attaque gratuite à la fuite d'un Brisé engagé (docs/specs/poursuite-v5, lot L4) : CA21, CA22, CA23 côté Store ; D7.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';

const memoryPersistence = () => { let state; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: value }) { state = structuredClone(value); return { ok: true }; } }; };
const fighter = (id, camp, extra = {}) => ({ id, name: id, kind: camp === 'ennemi' ? 'PNJ' : 'PJ', camp, zone: 'active', initiative: 50, hp: 20, maxHp: 20,
  caracs: { CC: 50, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, skills: [], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const broken = [{ id: 'b1', key: 'brise', name: 'Brisé', level: 1 }];
// Ordre du Tour : runner (60, Brisé), foe1 (40), foe2 (30).
async function fixture({ runner = {} } = {}) {
  const store = createStore({ storage: null, persistence: memoryPersistence() }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'combat-l4' } },
    combat: { round: 1, currentActorId: 'runner', order: ['runner', 'foe1', 'foe2'], participants: [fighter('runner', 'pj', { initiative: 60, states: broken, ...runner }),
      fighter('foe1', 'ennemi', { initiative: 40 }), fighter('foe2', 'ennemi', { initiative: 30 })] } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const attack = (store, actorId, targetId, id, v5 = { kind: 'melee', extraAttack: true, context: { freeAttackTalent: 'flee-free-attack' } }) => store.previewResolution({ resolutionId: id, actorId, targetId, roll: 20,
  action: { type: 'attack', base: 50, attr: 'CC', damage: 2 }, defense: { base: 30, attr: 'CC', roll: 80, v5: { kind: 'melee' } }, v5 });
const v5Of = store => JSON.parse(store.getFullJSON()).extensions.v5;
const actionRows = (store, actorId) => (v5Of(store).standardTurnActions || []).filter(row => row.actorId === actorId);
const turnActionQuota = (store, actorId) => (v5Of(store).actionLedger?.quotaUsage || []).filter(row => row.actorId === actorId && row.quotaId === 'system:turn-action');
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const fleeFacts = extra => ({ visibleToAnyEnemy: true, engagedEnemyIds: ['foe1', 'foe2'], engagedEscapeConfirmed: true, moveMode: 'run', visibleToAnyEnemyAfter: false, ...extra });

test('attaque gratuite hors de son Tour : l’Action de l’adversaire reste intacte, aucun Élan exigé (CA21)', async () => {
  const store = await fixture();
  const before = { rows: actionRows(store, 'foe1'), quota: turnActionQuota(store, 'foe1') };
  assert.notEqual(person(store, 'foe1').extensions.v5.hasMomentum, true, 'foe1 n’a pas d’Élan');
  const preview = attack(store, 'foe1', 'runner', 'free-1');
  assert.equal(preview.ready, true, preview.error || JSON.stringify(preview.unresolved));
  assert.deepEqual(preview.actionCosts.paid, [], 'l’Élan n’est pas payé');
  assert.deepEqual(preview.actionCosts.waived.map(row => [row.resource, row.waivedBy]), [['momentum', ['flee-free-attack']]]);
  assert.equal((await store.applyResolution(preview)).status, 'applied');
  assert.deepEqual(actionRows(store, 'foe1'), before.rows, 'aucune Action de Tour inscrite');
  assert.deepEqual(turnActionQuota(store, 'foe1'), before.quota, 'aucun quota d’Action');
  assert.ok(person(store, 'runner').hp < 20, 'l’attaque est résolue');
  assert.deepEqual(store.getFleeFreeAttacks('runner', ['foe1', 'foe2']), { playedIds: ['foe1'], passedIds: [], pendingIds: ['foe2'], complete: false });
  const again = attack(store, 'foe1', 'runner', 'free-1b');
  assert.equal(again.ready, false, 'une seule attaque gratuite par adversaire');
  await store.undo();
  assert.deepEqual(store.getFleeFreeAttacks('runner', ['foe1']).playedIds, [], '↶ rend la liste');
});

test('attaque gratuite refusée hors de son cadre : cible non Brisée, Brisé lui-même, après la fuite', async () => {
  const calm = await fixture({ runner: { states: [] } });
  assert.equal(attack(calm, 'foe1', 'runner', 'x1').ready, false, 'le combattant du Tour n’est pas Brisé');
  const store = await fixture();
  assert.equal(attack(store, 'foe1', 'foe2', 'x2').ready, false, 'la cible doit être le Brisé du Tour');
  assert.equal(attack(store, 'runner', 'foe1', 'x3').ready, false, 'le Brisé n’attaque pas sa propre fuite');
  await store.passFleeFreeAttack('runner', 'foe1');
  await store.passFleeFreeAttack('runner', 'foe2');
  const flee = store.previewBrokenEscape({ actorId: 'runner', action: 'flee', facts: fleeFacts({ freeAttacksResolved: true }) });
  assert.equal((await store.applyBrokenEscape(flee)).status, 'applied');
  assert.equal(attack(store, 'foe1', 'runner', 'x4').ready, false, 'après la fuite, plus d’attaque gratuite');
});

test('liste jouée ou passée, puis fuite engagée appliquée ; Élan dépensé selon la liste (CA22, CA23)', async () => {
  const store = await fixture();
  const preview = attack(store, 'foe1', 'runner', 'free-1');
  assert.equal((await store.applyResolution(preview)).status, 'applied');
  await store.passFleeFreeAttack('runner', 'foe2');
  assert.match(store.getLog()[0].text, /foe2.*passe/);
  await assert.rejects(async () => store.passFleeFreeAttack('runner', 'foe1'), /déjà/);
  const list = store.getFleeFreeAttacks('runner', ['foe1', 'foe2']);
  assert.deepEqual(list, { playedIds: ['foe1'], passedIds: ['foe2'], pendingIds: [], complete: true });
  const flee = store.previewBrokenEscape({ actorId: 'runner', action: 'flee', facts: fleeFacts({ freeAttacksResolved: list.complete, freeAttackSpentMomentumIds: ['foe1'] }) });
  assert.equal(flee.ready, true, flee.error);
  assert.deepEqual(flee.engagedEscapeEffects.freeAttackSpentMomentumIds, ['foe1'], 'le moteur reçoit la liste');
  assert.equal((await store.applyBrokenEscape(flee)).status, 'applied');
  assert.equal(person(store, 'foe1').extensions.v5.hasMomentum, false, 'foe1 a dépensé son Élan');
  assert.equal(person(store, 'foe2').extensions.v5.hasMomentum, true, 'foe2 garde l’Élan gagné');
  await store.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'foe1');
  const own = attack(store, 'foe1', 'runner', 'own-1', { kind: 'melee' });
  assert.equal(own.ready, true, 'foe1 dispose de son Action à son Tour');
});
