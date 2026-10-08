import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ficheSnapshot, applyFicheSync } from '../js/core/fiche-sync.js';
const snapshot=ficheSnapshot('caelel',JSON.parse(readFileSync(new URL('./fixtures/fiche-caelel.json',import.meta.url),'utf8')));

for (const legacy of [false,true]) test(`Lot2 fiche — ajustement de scène ${legacy?'legacy en attente de conversion':'V5'} préservé dans toutes les projections`,()=>{
  const sourceAction={id:'epee',type:'attack',note:'Épée',base:50,mod:0,damage:4,qualities:[],extensions:{v5:{slModifier:1},ficheSkill:'Corps à corps (Base)'}};
  const raw={...sourceAction,id:'scene-action',mod:legacy?-20:0,extensions:{profileActionId:'epee',ficheSkill:'Corps à corps (Base)',v5:legacy?{futureLocal:true}:{slModifier:-2,futureLocal:true}}};
  const participant={id:'p',profileId:'profile',name:'Recette',hp:12,maxHp:12,states:[{name:'Hémorragique',level:1,duration:2}],actions:[raw],extensions:{v5:{hasMomentum:true}}};
  const state={reserve:[{id:'profile',name:'Recette',hp:12,caracs:{},diceLines:[sourceAction],extensions:{ficheId:'caelel'}}],combat:{participants:[participant]},
    activeScene:{participants:[participant]},suspendedScenes:[{participants:[participant]}],persistentCharacters:[{...participant,id:'persistent',extensions:{ficheId:'caelel',v5:{hasMomentum:true}}}],diceLines:[{...raw,id:'dice-copy',participantId:'p'}]};
  const before=structuredClone(state);
  const next=applyFicheSync(state,[{profileId:'profile',snapshot,links:{epee:'Corps à corps (Base)'},convert:{epee:false}}]);
  const copies=[next.combat.participants[0].actions[0],next.activeScene.participants[0].actions[0],next.suspendedScenes[0].participants[0].actions[0],next.persistentCharacters[0].actions[0],next.diceLines[0]];
  for(const action of copies){
    assert.equal(action.base,69);
    assert.equal(action.extensions.v5.slModifier,legacy?undefined:-2);
    assert.equal(action.mod,legacy?-20:0);
    assert.equal(action.extensions.v5.futureLocal,true);
  }
  assert.deepEqual(next.combat.participants[0].states,participant.states);
  assert.equal(next.combat.participants[0].extensions.v5.hasMomentum,true);
  assert.deepEqual(state,before);
});
