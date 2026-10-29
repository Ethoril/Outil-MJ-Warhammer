import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const clone = structuredClone;
function memoryPersistence() {
  let saved = null;
  return {
    async load() { return saved && clone(saved); },
    async saveAtomic({ state }) { saved = clone(state); return { ok: true }; }
  };
}
const participant = { id:'j-characterization',name:'PJ test',kind:'PJ',camp:'pj',zone:'active',hp:12,maxHp:12,caracs:{E:30},states:[],extensions:{v5:{untouchedSentinel:{v:1}}} };

test('F2-J caractérisation — extensions inconnues et commandes Store survivent à Undo/Redo et rechargement', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ storage:null,persistence });
  await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:0,currentActorId:null,order:[],participants:[participant]},log:[],diceLines:[],extensions:{v5:{unknownSentinel:{kept:true}}}});
  await store.updateParticipant(participant.id,{hp:11});
  assert.equal(store.listParticipants()[0].hp,11);
  assert.deepEqual(store.listParticipants()[0].extensions.v5.untouchedSentinel,{v:1});
  assert.equal(await store.undo(),true);
  assert.equal(store.listParticipants()[0].hp,12);
  assert.equal(await store.redo(),true);
  const saved = JSON.parse(store.getFullJSON());
  assert.deepEqual(saved.extensions.v5.unknownSentinel,{kept:true});
  const reloaded = createStore({storage:null,persistence});
  await reloaded.ready;
  await reloaded.loadFromJSON(saved);
  assert.equal(reloaded.listParticipants()[0].hp,11);
  assert.deepEqual(reloaded.listParticipants()[0].extensions.v5.untouchedSentinel,{v:1});
});
