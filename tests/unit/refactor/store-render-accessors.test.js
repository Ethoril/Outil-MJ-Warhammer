// U1 (05/11) : accesseurs légers du rendu. Chaque accesseur doit rendre la même valeur que l'ancienne lecture
// JSON.parse(Store.getFullJSON()) de workspace-view.js, et une copie que le rendu ne peut pas utiliser pour muter le store.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { v5StoreActionClock } from '../../../js/core/v5-store-action.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: key => (data.has(key) ? data.get(key) : null), setItem: (key, value) => { data.set(key, String(value)); }, removeItem: key => { data.delete(key); } };
}

const fighter = (id, camp) => ({ id, name: id, kind: camp === 'pj' ? 'PJ' : 'PNJ', camp, zone: 'active', hp: 10, maxHp: 10, states: [], equipment: [] });

function storeWith(v5, { scene = null, currentActorId = 'hero', round = 2 } = {}) {
  const store = createStore({ storage: memoryStorage() });
  const envelope = JSON.parse(store.getFullJSON());
  envelope.combat = { ...envelope.combat, round, currentActorId, order: ['hero', 'gob'], participants: [fighter('hero', 'pj'), fighter('gob', 'ennemi')] };
  envelope.extensions = { ...(envelope.extensions || {}), v5 };
  if (scene) envelope.activeScene = scene;
  store.loadFromJSON(JSON.stringify(envelope));
  return store;
}

// Anciennes lectures de workspace-view.js, reprises telles quelles.
const legacy = store => JSON.parse(store.getFullJSON());
const legacyRows = (store, actorId) => {
  const envelope = legacy(store);
  const { encounterId, turnId } = v5StoreActionClock({ ...envelope, combat: { ...(envelope.combat || {}), currentActorId: actorId } });
  return (envelope.extensions?.v5?.standardTurnActions || []).filter(row => row.actorId === actorId && row.encounterId === encounterId && row.turnId === turnId);
};

const rows = [
  { actionId: 'a1', actorId: 'hero', encounterId: 'enc-1', turnId: 'enc-1:4:hero', kind: 'action', targetId: 'gob', weaponId: 'sword' },
  { actionId: 'a2', actorId: 'hero', encounterId: 'enc-1', turnId: 'enc-1:3:hero', kind: 'action', targetId: 'gob' },
  { actionId: 'a3', actorId: 'gob', encounterId: 'enc-1', turnId: 'enc-1:4:gob', kind: 'action', targetId: 'hero' },
  { actionId: 'a4', actorId: 'hero', encounterId: 'enc-2', turnId: 'enc-2:4:hero', kind: 'move' }
];

test('getTurnIndex : index global, ou celui de la scène active avec scene:true', () => {
  const store = storeWith({ turnIndex: 4, combatId: 'enc-1' });
  assert.equal(store.getTurnIndex(), legacy(store).extensions.v5.turnIndex);
  assert.equal(store.getTurnIndex({ scene: true }), 4);
  assert.equal(createStore({ storage: memoryStorage() }).getTurnIndex(), null);
});

test('isSuddenDeathEnabled : vrai seulement pour true strict', () => {
  assert.equal(storeWith({ suddenDeathEnabled: true }).isSuddenDeathEnabled(), true);
  assert.equal(storeWith({ suddenDeathEnabled: 'true' }).isSuddenDeathEnabled(), false);
  assert.equal(createStore({ storage: memoryStorage() }).isSuddenDeathEnabled(), false);
});

test('getActionClock : même horloge que v5StoreActionClock sur l’enveloppe complète', () => {
  const store = storeWith({ turnIndex: 4, combatId: 'enc-1', standardTurnActions: rows });
  assert.deepEqual(store.getActionClock(), v5StoreActionClock(legacy(store)));
  assert.deepEqual(store.getActionClock('gob'), v5StoreActionClock({ ...legacy(store), combat: { ...legacy(store).combat, currentActorId: 'gob' } }));
  assert.equal(store.getActionClock().turnId, 'enc-1:4:hero');
});

test('listTurnActions : actions du Tour de l’acteur, identiques à l’ancien filtre', () => {
  const store = storeWith({ turnIndex: 4, combatId: 'enc-1', standardTurnActions: rows });
  assert.deepEqual(store.listTurnActions('hero'), legacyRows(store, 'hero'));
  assert.deepEqual(store.listTurnActions('hero').map(row => row.actionId), ['a1']);
  assert.deepEqual(store.listTurnActions('gob').map(row => row.actionId), ['a3']);
  assert.deepEqual(store.listTurnActions(undefined), []);
});

test('listTurnActions rend une copie : la muter ne change pas le store', () => {
  const store = storeWith({ turnIndex: 4, combatId: 'enc-1', standardTurnActions: rows });
  const [row] = store.listTurnActions('hero');
  row.targetId = 'altered';
  assert.equal(store.listTurnActions('hero')[0].targetId, 'gob');
});

// CAMP-04 (13/11) : l'écran Campagne lisait l'horloge par JSON.parse(Store.getFullJSON()).extensions.v5.gameClock.
test('getCampaignSeconds : mêmes secondes que l’ancienne lecture de l’écran Campagne', async () => {
  const { createGameClock } = await import('../../../js/core/v5-game-time.js');
  const base = createStore({ storage: memoryStorage() });
  const clock = { ...createGameClock(JSON.parse(base.getFullJSON())), campaignSeconds: 90061 };
  const store = storeWith({ gameClock: clock });
  const legacySeconds = legacy(store)?.extensions?.v5?.gameClock?.campaignSeconds;
  assert.equal(legacySeconds, 90061);
  assert.equal(store.getCampaignSeconds(), legacySeconds);
  // Sans horloge : l'ancienne lecture donnait undefined, l'accesseur null ; l'écran affiche le même texte pour les deux.
  const empty = createStore({ storage: memoryStorage() });
  assert.equal(legacy(empty)?.extensions?.v5?.gameClock?.campaignSeconds, undefined);
  assert.equal(empty.getCampaignSeconds(), null);
  const loaded = storeWith({ turnIndex: 1 });
  assert.equal(loaded.getCampaignSeconds(), legacy(loaded)?.extensions?.v5?.gameClock?.campaignSeconds ?? null);
});
