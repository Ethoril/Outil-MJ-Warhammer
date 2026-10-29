import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { v5StoreActionClock } from '../js/core/v5-store-action.js';
import { wrathActionSpent } from '../js/core/v5-divine-prayer-caps.js';
import { previewV5Turn } from '../js/core/v5-turn.js';

const hero = () => ({id:'hero',name:'Héros',kind:'PJ',camp:'pj',zone:'active',initiative:40,hp:20,maxHp:20,
  caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},
  states:[{id:'broken',name:'Brisé',key:'brise',level:1}],skills:[],extensions:{v5:{}}});
const state = () => ({schemaVersion:3,reserve:[],log:[],diceLines:[],
  combat:{round:1,currentActorId:'hero',order:['hero'],participants:[hero()]},
  extensions:{v5:{combatId:'free',combatScopeId:'free-restart',turnIndex:1}}});

test('F2 T1 — les gardes de Prière reconnaissent les Actions enregistrées dans une occurrence redémarrée', () => {
  for (const scene of [null,{id:'scene',encounterId:'encounter',extensions:{v5:{combatScopeId:'scene-restart',turnIndex:1}}}]) {
    const envelope=state();if(scene)envelope.activeScene=scene;
    const clock=v5StoreActionClock(envelope);
    envelope.extensions.v5.standardTurnActions=[{actorId:'hero',actionId:'already-used',kind:'action',...clock}];
    assert.equal(wrathActionSpent(envelope,'hero'),true);
    assert.equal(wrathActionSpent(envelope,'other'),false);
  }
  const legacy=state();legacy.activeScene={id:'saved-scene',encounterId:'saved-encounter',extensions:{v5:{turnIndex:1}}};
  assert.equal(v5StoreActionClock(legacy).turnId,'saved-scene:1:hero','un scope libre ne modifie pas une ancienne scène chargée');
});

test('F2 T1 — Brisé peut finir son vrai Tour après attestation hors vue dans un combat redémarré', async () => {
  for (const scene of [null,{id:'scene',encounterId:'encounter',status:'active',round:1,currentActorId:'hero',order:['hero'],participants:[hero()],extensions:{v5:{combatScopeId:'scene-restart',turnIndex:1}}}]) {
    const store=createStore({storage:null});await store.ready;
    const envelope=state();if(scene)envelope.activeScene=scene;
    await store.loadFromJSON(envelope);
    assert.equal((await store.confirmBrokenEscapeVisibility({actorId:'hero',visibleToAnyEnemy:false})).status,'applied');
    const turn=previewV5Turn(JSON.parse(store.getFullJSON()));
    assert.equal(turn.ready,true,turn.error);
  }
});
