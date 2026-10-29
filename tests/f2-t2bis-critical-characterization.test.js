import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const participant = (id, initiative, extra = {}) => ({
  id, name: id.toUpperCase(), kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative,
  hp: 10, maxHp: 10, states: [], extensions: { v5: {}, ...extra }
});

async function runLegacyFumbleOrder(orderMode) {
  let saved;
  const persistence = {
    async load() { return saved && structuredClone(saved); },
    async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; }
  };
  const store = createStore({ persistence, storage: null });
  await store.ready;
  const fixture=orderMode==='manual'
    ?{order:['B','A'],currentActorId:'B',initiativeA:90,initiativeB:50,effectedId:'B',roundTwoActor:'A',roundFourActor:'B',undoActor:'A'}
    :{order:['B','A'],currentActorId:'A',initiativeA:80,initiativeB:60,effectedId:'A',roundTwoActor:'B',roundFourActor:'A',undoActor:'B'};
  await store.loadFromJSON({
    schemaVersion: 3, reserve: [], log: [], diceLines: [],
    combat: {
      round: 1, currentActorId: fixture.currentActorId, order: fixture.order, orderMode,
      participants: [
        participant('A', fixture.initiativeA, fixture.effectedId==='A'?{ v5: { combatEffects: [{ id: 'late', kind: 'acts-last-next-round', round: 2 }] } }:{}),
        participant('B', fixture.initiativeB, fixture.effectedId==='B'?{ v5: { combatEffects: [{ id: 'late', kind: 'acts-last-next-round', round: 2 }] } }: {})
      ]
    },
    extensions: { v5: {} }
  });
  const observed = [];
  for (let i = 0; i < 6; i++) {
    const combat = store.getCombat();
    observed.push(`${combat.round}:${combat.currentActorId}`);
    await store.nextTurn();
  }
  return {store, observed, sourceOrder:orderMode==='automatic'?['A','B']:fixture.order, fixture};
}

test('T2 bis — Store legacy automatic: la projection temporaire ne remplace pas le tri canonique', async () => {
  const {store, observed, sourceOrder}=await runLegacyFumbleOrder('automatic');
  assert.deepEqual(observed, ['1:A', '1:B', '2:B', '2:A', '3:A', '3:B']);
  assert.deepEqual(store.getCombat().order,sourceOrder);
});

test('T2 bis — Store legacy manual: la projection Round 2 ne remplace pas un ordre distinct de l’initiative', async () => {
  const {store, observed, sourceOrder}=await runLegacyFumbleOrder('manual');
  assert.deepEqual(observed, ['1:B', '1:A', '2:A', '2:B', '3:B', '3:A']);
  assert.deepEqual(store.getCombat().order,sourceOrder);
});

for (const orderMode of ['automatic','manual']) {
  test(`T2 bis — reload après le reorder ${orderMode} conserve position et ordre source`, async () => {
    let saved;
    const persistence={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};
    const store=createStore({persistence,storage:null});await store.ready;
    const fixture=orderMode==='manual'?{order:['B','A'],currentActorId:'B',initiativeA:90,initiativeB:50,effectedId:'B',roundTwoActor:'A'}:{order:['B','A'],currentActorId:'A',initiativeA:80,initiativeB:60,effectedId:'A',roundTwoActor:'B'};
    await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:fixture.currentActorId,order:fixture.order,orderMode,participants:[participant('A',fixture.initiativeA,fixture.effectedId==='A'?{v5:{combatEffects:[{id:'late',kind:'acts-last-next-round',round:2}]}}:{}),participant('B',fixture.initiativeB,fixture.effectedId==='B'?{v5:{combatEffects:[{id:'late',kind:'acts-last-next-round',round:2}]}}:{})]},extensions:{v5:{}}});
    await store.nextTurn();await store.nextTurn();
    assert.equal(store.getCombat().round,2);
    assert.equal(store.getCombat().currentActorId,fixture.roundTwoActor);
    assert.deepEqual(store.getCombat().order,fixture.order);
    const reloaded=createStore({persistence,storage:null});await reloaded.ready;
    assert.equal(reloaded.getCombat().round,2);
    assert.equal(reloaded.getCombat().currentActorId,fixture.roundTwoActor);
    assert.deepEqual(reloaded.getCombat().order,fixture.order);
  });
}

for(const orderMode of ['automatic','manual'])test(`T2 bis — Undo/Redo du retour au Round 3 (${orderMode}) conserve l’ordre source`,async()=>{
  const {store,fixture}=await runLegacyFumbleOrder(orderMode);
  assert.equal(store.getCombat().round,4);
  await store.undo();assert.equal(store.getCombat().round,3);assert.equal(store.getCombat().currentActorId,fixture.undoActor);assert.deepEqual(store.getCombat().order,orderMode==='automatic'?['A','B']:fixture.order);
  await store.redo();assert.equal(store.getCombat().round,4);assert.equal(store.getCombat().currentActorId,fixture.roundFourActor);assert.deepEqual(store.getCombat().order,orderMode==='automatic'?['A','B']:fixture.order);
});
